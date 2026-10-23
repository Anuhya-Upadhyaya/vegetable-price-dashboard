import logging
import re
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.price_query_service import get_latest_price, get_price_history

logger = logging.getLogger(__name__)
INDIA_TZ = ZoneInfo("Asia/Kolkata")

SYSTEM_PROMPT = """
You are Veegronex FreshFlow, an India-focused vegetable price assistant.
- Use Indian context and INR (₹).
- Never invent prices, dates, units, or database records.
- Treat supplied FreshFlow records as authoritative for saved prices.
- Do not claim to search the web or provide external market prices.
- Be concise and answer directly.
- Never reveal credentials, tokens, or private account information.
"""

_ollama_client: httpx.AsyncClient | None = None

VEGETABLES = (
    "spring onion", "sweet potato", "coriander", "capsicum", "cabbage",
    "cauliflower", "cucumber", "drumstick", "green chilli", "green peas",
    "lady finger", "okra", "brinjal", "tomato", "carrot", "radish",
    "spinach", "coconut", "onion", "potato", "garlic", "ginger", "lemon",
)


def get_ollama_client() -> httpx.AsyncClient:
    global _ollama_client
    if _ollama_client is None or _ollama_client.is_closed:
        _ollama_client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=3.0,
                read=settings.OLLAMA_TIMEOUT_SECONDS,
                write=5.0,
                pool=3.0,
            ),
            limits=httpx.Limits(
                max_connections=10,
                max_keepalive_connections=5,
                keepalive_expiry=30.0,
            ),
        )
    return _ollama_client


def _today_india() -> date:
    return datetime.now(INDIA_TZ).date()


def _find_vegetable(message: str) -> str | None:
    text = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", message.lower())).strip()
    for vegetable in sorted(VEGETABLES, key=len, reverse=True):
        if re.search(rf"\b{re.escape(vegetable)}\b", text):
            return vegetable
    return None


def _requested_date_range(message: str) -> tuple[date, date] | None:
    """Recognize today, yesterday, recent periods, and ISO dates."""
    text = message.lower()
    today = _today_india()

    if re.search(r"\byesterday\b|\blast\s+day\b", text):
        day = today - timedelta(days=1)
        return day, day
    if re.search(r"\btoday\b|\bcurrent\s+day\b", text):
        return today, today
    if re.search(r"\blast\s+7\s+days\b|\bpast\s+7\s+days\b", text):
        return today - timedelta(days=6), today
    if re.search(r"\blast\s+30\s+days\b|\bpast\s+30\s+days\b", text):
        return today - timedelta(days=29), today

    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if match:
        try:
            requested = date.fromisoformat(match.group(1))
            return requested, requested
        except ValueError:
            return None
    return None


def _is_price_question(message: str) -> bool:
    text = message.lower()
    indicators = (
        "price", "cost", "how much", "rate", "trend", "history",
        "historical", "yesterday", "today", "last 7 days", "past 7 days",
        "last 30 days", "past 30 days", "cheaper", "expensive",
    )
    return any(term in text for term in indicators)


def _format_date(value) -> str:
    if value is None:
        return "Date not available"
    if isinstance(value, (datetime, date)):
        return value.strftime("%d %b %Y")
    try:
        return date.fromisoformat(str(value)[:10]).strftime("%d %b %Y")
    except ValueError:
        return str(value)


def _format_price(value) -> str:
    try:
        return f"{float(value):,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _format_record(record: dict) -> str:
    name = record.get("vegetable", "Vegetable")
    price = _format_price(record.get("price"))
    unit = record.get("unit") or "unit not specified"
    entry_date = _format_date(record.get("entry_date"))
    return f"• {name}: ₹{price} per {unit} — {entry_date}"


def _database_answer(
    vegetable: str,
    records: list[dict],
    start_date: date,
    end_date: date,
) -> str:
    if not records:
        period = (
            _format_date(start_date)
            if start_date == end_date
            else f"{_format_date(start_date)} to {_format_date(end_date)}"
        )
        return (
            f"No saved FreshFlow price records were found for "
            f"{vegetable.title()} for {period}."
        )

    title = (
        f"Saved FreshFlow price for {vegetable.title()}:"
        if start_date == end_date
        else f"Saved FreshFlow price records for {vegetable.title()}:"
    )
    return title + "\n" + "\n".join(_format_record(record) for record in records)


async def generate_chat_response(message: str, db: Session) -> str:
    message = message.strip()
    if not message:
        return "Please enter a question."

    started = time.perf_counter()
    vegetable = _find_vegetable(message)

    # Answer recognized price questions from the database only.
    if vegetable and _is_price_question(message):
        requested_range = _requested_date_range(message)
        try:
            if requested_range:
                start_date, end_date = requested_range
                records = get_price_history(
                    db=db,
                    vegetable=vegetable,
                    start_date=start_date,
                    end_date=end_date,
                    limit=100,
                )
            else:
                record = get_latest_price(db, vegetable)
                records = [record] if record else []
                start_date = end_date = (
                    date.fromisoformat(str(record["entry_date"])[:10])
                    if record and record.get("entry_date")
                    else _today_india()
                )
        except Exception as exc:
            logger.exception("FreshFlow database lookup failed")
            raise RuntimeError(
                "I couldn't access FreshFlow price records right now. "
                "Please try again shortly."
            ) from exc

        logger.info(
            "Database price lookup completed in %.3fs",
            time.perf_counter() - started,
        )
        if records:
            return _database_answer(vegetable, records, start_date, end_date)

        period = (
            _format_date(start_date)
            if start_date == end_date
            else f"{_format_date(start_date)} to {_format_date(end_date)}"
        )
        return (
            f"No saved FreshFlow price records were found for "
            f"{vegetable.title()} for {period}. External web search is disabled."
        )

    # Use Ollama for general explanations only.
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "stream": False,
        "keep_alive": "10m",
        "options": {"num_predict": 250, "temperature": 0.2},
    }

    client = get_ollama_client()
    ollama_started = time.perf_counter()
    try:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
    except httpx.TimeoutException as exc:
        logger.warning(
            "Ollama timed out after %.2fs",
            time.perf_counter() - ollama_started,
        )
        raise RuntimeError(
            "The AI assistant took too long to respond. Please try again."
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("Ollama request failed")
        raise RuntimeError(
            "The AI assistant is temporarily unavailable."
        ) from exc

    logger.info(
        "Ollama completed in %.2fs; model total duration=%s ns; "
        "model load duration=%s ns; generated tokens=%s",
        time.perf_counter() - ollama_started,
        data.get("total_duration", "unknown"),
        data.get("load_duration", "unknown"),
        data.get("eval_count", "unknown"),
    )

    answer = data.get("message", {}).get("content", "").strip()
    if not answer:
        raise RuntimeError("Ollama returned an empty response.")
    return answer
