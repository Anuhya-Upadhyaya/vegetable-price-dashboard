
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.services.ollama_service import generate_chat_response


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["AI Chat"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    answer: str


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty.",
        )

    try:
        answer = await generate_chat_response(message, db)
        return ChatResponse(answer=answer)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI model took too long to respond. Please try again.",
        )

    except httpx.HTTPStatusError:
        logger.exception("Ollama returned an HTTP error.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The local AI service returned an error.",
        )

    except httpx.RequestError:
        logger.exception("Could not connect to Ollama.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Ollama. Check that it is running.",
        )

    except RuntimeError as exc:
        logger.exception("Chat service failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
