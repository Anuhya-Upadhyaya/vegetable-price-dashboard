
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPriceEntry,
  createPriceCorrectionRequest,
  getMyCorrectionRequests,
  getActiveVegetables,
  getCurrentUser,
  getMyPriceEntries,
  getMyPriceTrends,
  logout,
} from "../services/api";

const formatTimestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const money = (value) => `₹${Number(value).toFixed(2)}`;

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      )
    : "—";

const css = `
  * { box-sizing: border-box; }

  .entry-page {
    min-height: 100vh;
    background: #f3f6f1;
    color: #20382a;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 28px;
  }

  .entry-shell { max-width: 1120px; margin: 0 auto; }

  .entry-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 26px;
  }

  .entry-brand { display: flex; align-items: center; gap: 12px; }

  .entry-logo {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    color: #fff;
    background: #1d5638;
    font-weight: 900;
    letter-spacing: -1px;
  }

  .entry-brand-name {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1.5px;
  }

  .entry-brand-sub {
    color: #7a897c;
    font-size: 12px;
    margin-top: 4px;
  }

  .entry-logout {
    border: 1px solid #d7e1d4;
    background: #fff;
    color: #31563c;
    border-radius: 10px;
    padding: 10px 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .entry-logout:disabled { opacity: .6; cursor: not-allowed; }

  .entry-heading { margin-bottom: 22px; }

  .entry-eyebrow {
    color: #5d805f;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.6px;
  }

  .entry-heading h1 {
    margin: 8px 0;
    font-size: clamp(26px, 4vw, 36px);
    letter-spacing: -1.1px;
  }

  .entry-heading p {
    margin: 0;
    color: #718073;
    font-size: 14px;
    line-height: 1.6;
  }

  .entry-grid {
    display: grid;
    grid-template-columns: minmax(300px, .85fr) minmax(0, 1.15fr);
    gap: 20px;
    align-items: start;
  }

  .entry-card {
    background: #fff;
    border: 1px solid #e3eae0;
    border-radius: 18px;
    box-shadow: 0 10px 35px #24492b0b;
    overflow: hidden;
  }

  .entry-card-head {
    padding: 21px 22px 16px;
    border-bottom: 1px solid #edf1eb;
  }

  .entry-card-head h2 { margin: 0; font-size: 17px; }

  .entry-card-head p {
    margin: 6px 0 0;
    color: #839084;
    font-size: 12px;
    line-height: 1.5;
  }

  .entry-form {
    padding: 22px;
    display: grid;
    gap: 17px;
  }

  .entry-field { display: grid; gap: 7px; }

  .entry-field label {
    font-size: 12px;
    color: #425747;
    font-weight: 800;
  }

  .entry-field input,
  .entry-field select,
  .entry-field textarea {
    width: 100%;
    border: 1px solid #dce5d9;
    border-radius: 10px;
    padding: 12px 13px;
    background: #fbfcfa;
    color: #20382a;
    font: inherit;
    font-size: 14px;
    outline: none;
  }

  .entry-field input:focus,
  .entry-field select:focus,
  .entry-field textarea:focus {
    border-color: #57966a;
    box-shadow: 0 0 0 3px #57966a1a;
  }

  .entry-units { display: flex; gap: 10px; }

  .entry-unit {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #dce5d9;
    border-radius: 10px;
    padding: 11px 12px;
    cursor: pointer;
    font-size: 13px;
  }

  .entry-unit input { accent-color: #267143; }

  .entry-submit {
    border: 0;
    border-radius: 11px;
    background: #1e5b38;
    color: white;
    padding: 13px 16px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: transform .15s, background .15s;
  }

  .entry-submit:hover {
    background: #17492d;
    transform: translateY(-1px);
  }

  .entry-submit:disabled {
    opacity: .6;
    cursor: wait;
    transform: none;
  }

  .entry-message {
    padding: 11px 13px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.5;
  }

  .entry-message.success { background: #eaf7ed; color: #216337; }
  .entry-message.error { background: #fff0ee; color: #a0372b; }

  .entry-list-wrap { overflow-x: auto; }

  .entry-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 480px;
  }

  .entry-table th {
    text-align: left;
    padding: 13px 16px;
    background: #f8faf7;
    color: #829082;
    font-size: 10px;
    letter-spacing: .8px;
  }

  .entry-table td {
    padding: 15px 16px;
    border-top: 1px solid #edf1eb;
    font-size: 13px;
    white-space: nowrap;
  }

  .entry-table .entry-veg { font-weight: 800; }
  .entry-table .entry-price { font-weight: 900; color: #245e39; }

  .entry-updated-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 999px;
    background: #eaf7ed;
    color: #216337;
    font-size: 11px;
    font-weight: 800;
  }

  .entry-original-time { color: #536a57; white-space: nowrap; }

  .entry-updated-time {
    display: block;
    color: #216337;
    font-size: 11px;
    margin-top: 5px;
    white-space: nowrap;
  }

  .entry-empty {
    padding: 40px 24px;
    text-align: center;
    color: #839084;
    font-size: 13px;
    line-height: 1.6;
  }

  .entry-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #edf6ed;
    color: #28633b;
    font-size: 12px;
    font-weight: 900;
    margin-left: 8px;
  }

  .entry-footnote {
    color: #879287;
    font-size: 11px;
    line-height: 1.6;
    padding: 0 22px 18px;
  }

  .activity-chart { padding: 20px 22px 24px; }
  .activity-chart svg { width: 100%; height: 240px; overflow: visible; }
  .activity-legend { color: #718073; font-size: 12px; line-height: 1.6; }

  @media (max-width: 800px) {
    .entry-page { padding: 18px 13px; }
    .entry-grid { grid-template-columns: 1fr; }
    .entry-topbar { align-items: flex-start; }
  }
`;

function PriceTrendChart({ points }) {
  const width = 760;
  const height = 240;
  const padX = 60;
  const padY = 30;

  if (!points.length) {
    return (
      <div className="entry-empty">
        No valid prices are available for this vegetable yet.
        Submit a price entry to begin tracking its trend.
      </div>
    );
  }

  const visiblePoints = points.slice(-14);
  const prices = visiblePoints.map((point) =>
    Number(point.average_price)
  );
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const coords = visiblePoints.map((point, index) => {
    const x =
      visiblePoints.length === 1
        ? width / 2
        : padX +
          (index * (width - padX * 2)) /
            (visiblePoints.length - 1);

    const y =
      height -
      padY -
      ((Number(point.average_price) - minPrice) / priceRange) *
        (height - padY * 2);

    return { ...point, x, y };
  });

  const line = coords
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const firstDate = visiblePoints[0]?.date;
  const lastDate = visiblePoints[visiblePoints.length - 1]?.date;

  return (
    <div className="activity-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily average vegetable price trend"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padY + ratio * (height - padY * 2);
          const price = maxPrice - ratio * (maxPrice - minPrice);

          return (
            <g key={ratio}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#edf1eb"
                strokeDasharray="4 4"
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                fill="#718073"
                fontSize="11"
              >
                ₹{price.toFixed(2)}
              </text>
            </g>
          );
        })}

        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#dce5d9"
        />

        {coords.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke="#287346"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((point) => (
          <g key={`${point.date}-${point.unit}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#287346"
            />
            <title>
              {point.date}: ₹
              {Number(point.average_price).toFixed(2)} per{" "}
              {point.unit}; {point.submission_count} valid{" "}
              {point.submission_count === 1 ? "entry" : "entries"}
            </title>
          </g>
        ))}

        {coords.map((point, index) => {
          const shouldLabel =
            coords.length <= 7 ||
            index === 0 ||
            index === Math.floor((coords.length - 1) / 2) ||
            index === coords.length - 1;

          if (!shouldLabel) return null;

          return (
            <text
              key={`label-${point.date}`}
              x={point.x}
              y={height - 7}
              textAnchor="middle"
              fill="#718073"
              fontSize="11"
            >
              {new Date(`${point.date}T00:00:00`).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short" }
              )}
            </text>
          );
        })}
      </svg>

      <div className="activity-legend">
        {firstDate === lastDate
          ? formatDate(firstDate)
          : `${formatDate(firstDate)} — ${formatDate(lastDate)}`}
        {" · "}
        Daily average price
        {" · "}
        Latest {visiblePoints.length}{" "}
        {visiblePoints.length === 1 ? "date" : "dates"}
      </div>
    </div>
  );
}

function UserPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [vegetables, setVegetables] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    vegetable: "",
    price: "",
    unit: "kg",
    notes: "",
  });

  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [selectedCorrectionEntry, setSelectedCorrectionEntry] =
    useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    proposed_price: "",
    proposed_notes: "",
    reason: "",
  });
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  const [selectedTrendVegetable, setSelectedTrendVegetable] =
    useState("");
  const [trendPoints, setTrendPoints] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendError, setTrendError] = useState("");

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setError("");

    try {
      const [
        currentUser,
        records,
        activeVegetables,
        requests,
      ] = await Promise.all([
        getCurrentUser(),
        getMyPriceEntries(),
        getActiveVegetables(),
        getMyCorrectionRequests(),
      ]);

      setUser(currentUser);
      setEntries(Array.isArray(records) ? records : []);
      setCorrectionRequests(Array.isArray(requests) ? requests : []);

      const available = Array.isArray(activeVegetables)
        ? activeVegetables
        : [];

      setVegetables(available);

      setSelectedTrendVegetable((current) =>
        current && available.some((item) => item.name === current)
          ? current
          : available[0]?.name || ""
      );

      setForm((current) => ({
        ...current,
        vegetable:
          current.vegetable &&
          available.some((item) => item.name === current.vegetable)
            ? current.vegetable
            : available[0]?.name || "",
        unit:
          available.find((item) => item.name === current.vegetable)?.unit ||
          available[0]?.unit ||
          "kg",
      }));
    } catch (err) {
      const message = err?.message || "Unable to load your entries.";
      setError(message);

      if (
        /token|unauthorized|authentication|credentials/i.test(message)
      ) {
        logout();
        navigate("/", { replace: true });
      }
    } finally {
      setLoadingEntries(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
    [entries]
  );

  const updateField = (key, value) =>
    setForm((current) => {
      if (key === "vegetable") {
        return {
          ...current,
          vegetable: value,
          unit:
            vegetables.find((item) => item.name === value)?.unit || "kg",
        };
      }

      return { ...current, [key]: value };
    });

  useEffect(() => {
    if (!selectedTrendVegetable) {
      setTrendPoints([]);
      setTrendError("");
      setLoadingTrends(false);
      return undefined;
    }

    let cancelled = false;

    const loadTrends = async () => {
      setLoadingTrends(true);
      setTrendError("");

      try {
        const result = await getMyPriceTrends(selectedTrendVegetable);

        if (!Array.isArray(result)) {
          throw new Error("Unexpected price-trend response.");
        }

        if (!cancelled) {
          const sorted = [...result].sort((a, b) =>
            String(a.date).localeCompare(String(b.date))
          );
          setTrendPoints(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setTrendPoints([]);
          setTrendError(
            err?.message || "Unable to load price trends."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTrends(false);
        }
      }
    };

    loadTrends();

    return () => {
      cancelled = true;
    };
  }, [selectedTrendVegetable, entries]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(form.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a price greater than zero.");
      return;
    }

    if (!form.vegetable) {
      setError(
        "No vegetables are currently available. Contact your administrator."
      );
      return;
    }

    setSaving(true);

    try {
      const created = await createPriceEntry({
        vegetable: form.vegetable,
        unit: form.unit,
        price: amount.toFixed(2),
        notes: form.notes.trim() || null,
      });

      setEntries((current) => [
        created,
        ...current.filter((entry) => entry.id !== created.id),
      ]);

      setForm((current) => ({
        ...current,
        price: "",
        notes: "",
      }));

      setSuccess(`${created.vegetable} price saved successfully.`);

      try {
        const savedEntries = await getMyPriceEntries();

        if (!Array.isArray(savedEntries)) {
          throw new Error(
            "The server returned an unexpected entry-history response."
          );
        }

        setEntries(savedEntries);
      } catch (refreshError) {
        console.error(
          "Entry was saved, but history refresh failed:",
          refreshError
        );
        setError(
          "Your entry was saved, but the full history could not be refreshed. Please reload the page."
        );
      }
    } catch (err) {
      setError(
        err?.message || "Unable to save this entry. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const openCorrectionForm = (entry) => {
    setSelectedCorrectionEntry(entry);
    setCorrectionForm({
      proposed_price: String(entry.price),
      proposed_notes: entry.notes || "",
      reason: "",
    });
    setCorrectionError("");
    setCorrectionMessage("");
  };

  const submitCorrectionRequest = async (event) => {
    event.preventDefault();

    if (!selectedCorrectionEntry) return;

    setCorrectionError("");
    setCorrectionMessage("");

    const proposedPrice = Number(correctionForm.proposed_price);

    if (!Number.isFinite(proposedPrice) || proposedPrice <= 0) {
      setCorrectionError("Enter a proposed price greater than zero.");
      return;
    }

    if (correctionForm.reason.trim().length < 5) {
      setCorrectionError(
        "Explain the reason for the correction in at least 5 characters."
      );
      return;
    }

    setSavingCorrection(true);

    try {
      const created = await createPriceCorrectionRequest(
        selectedCorrectionEntry.id,
        {
          proposed_price: proposedPrice.toFixed(2),
          proposed_notes: correctionForm.proposed_notes.trim() || null,
          reason: correctionForm.reason.trim(),
        }
      );

      setCorrectionRequests((current) => [
        created,
        ...current.filter((item) => item.id !== created.id),
      ]);

      setSelectedCorrectionEntry(null);
      setCorrectionMessage(
        "Correction request submitted. The original entry will remain unchanged until an administrator reviews it."
      );
    } catch (err) {
      setCorrectionError(
        err?.message || "Unable to submit the correction request."
      );
    } finally {
      setSavingCorrection(false);
    }
  };

  const latestCorrectionByEntry = useMemo(() => {
    const result = new Map();

    [...correctionRequests]
      .sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      )
      .forEach((request) => {
        if (!result.has(request.entry_id)) {
          result.set(request.entry_id, request);
        }
      });

    return result;
  }, [correctionRequests]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <style>{css}</style>

      <main className="entry-page">
        <div className="entry-shell">
          <header className="entry-topbar">
            <div className="entry-brand">
              <div className="entry-logo">VG</div>
              <div>
                <div className="entry-brand-name">
                  VEEGRONEX GLOBAL TRADE
                </div>
                <div className="entry-brand-sub">
                  FreshFlow · Price Entry Portal
                </div>
              </div>
            </div>

            <button
              className="entry-logout"
              type="button"
              onClick={handleLogout}
            >
              Sign out ↗
            </button>
          </header>

          <section className="entry-heading">
            <div className="entry-eyebrow">
              {user
                ? `Welcome, ${user.full_name || user.username}`
                : "User workspace"}
            </div>
            <h1>Daily Vegetable Price Entry</h1>
            <p>
              Record one vegetable price at a time. Your entries are saved
              to your account and can be reviewed by the administrator.
            </p>
          </section>

          <div className="entry-grid">
            <section className="entry-card">
              <div className="entry-card-head">
                <h2>Add a price entry</h2>
                <p>Complete the fields below and save your daily price.</p>
              </div>

              <form className="entry-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="entry-message error" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="entry-message success" role="status">
                    {success}
                  </div>
                )}

                <div className="entry-field">
                  <label htmlFor="vegetable">Vegetable</label>
                  <select
                    id="vegetable"
                    value={form.vegetable}
                    onChange={(event) =>
                      updateField("vegetable", event.target.value)
                    }
                    required
                    disabled={vegetables.length === 0}
                  >
                    {vegetables.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  {vegetables.length === 0 && (
                    <small>
                      No active vegetables. Ask an administrator to add or
                      enable one.
                    </small>
                  )}
                </div>

                <div className="entry-field">
                  <label htmlFor="price">Price (₹ per unit)</label>
                  <input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    placeholder="e.g. 34.00"
                    required
                  />
                </div>

                <div className="entry-field">
                  <label>Price unit</label>
                  <div className="entry-units">
                    <label className="entry-unit">
                      <input
                        type="radio"
                        name="unit"
                        value="kg"
                        checked={form.unit === "kg"}
                        readOnly
                        disabled
                      />
                      Per kg
                    </label>

                    <label className="entry-unit">
                      <input
                        type="radio"
                        name="unit"
                        value="piece"
                        checked={form.unit === "piece"}
                        readOnly
                        disabled
                      />
                      Per piece
                    </label>
                  </div>
                </div>

                <div className="entry-field">
                  <label htmlFor="notes">Notes (optional)</label>
                  <textarea
                    id="notes"
                    rows="3"
                    maxLength="2000"
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    placeholder="Optional observations about this price"
                  />
                </div>

                <button
                  className="entry-submit"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving entry…" : "Save price entry →"}
                </button>
              </form>

              <div className="entry-footnote">
                Entries are associated with your signed-in account
                automatically. Do not enter another user's prices.
              </div>
            </section>

            <section className="entry-card">
              <div className="entry-card-head">
                <h2>
                  Your previous entries{" "}
                  <span className="entry-count">{entries.length}</span>
                </h2>
                <p>Your saved prices, newest submissions first.</p>
              </div>

              {loadingEntries ? (
                <div className="entry-empty">Loading your entries…</div>
              ) : sortedEntries.length === 0 ? (
                <div className="entry-empty">
                  No price entries yet.
                  <br />
                  Submit your first vegetable price using the form.
                </div>
              ) : (
                <div className="entry-list-wrap">
                  <table
                    className="entry-table"
                    style={{ minWidth: 760 }}
                  >
                    <thead>
                      <tr>
                        <th>VEGETABLE</th>
                        <th>PRICE</th>
                        <th>SUBMITTED AT</th>
                        <th>ENTRY STATUS</th>
                        <th>NOTES</th>
                        <th>CORRECTION</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedEntries.map((entry) => {
                        const request = latestCorrectionByEntry.get(
                          entry.id
                        );

                        return (
                          <tr key={entry.id}>
                            <td className="entry-veg">
                              {entry.vegetable}
                            </td>
                            <td className="entry-price">
                              {money(entry.price)} / {entry.unit}
                            </td>
                            <td className="entry-time">
                              <span className="entry-original-time">
                                {formatTimestamp(entry.created_at)}
                              </span>
                              {entry.is_updated &&
                                entry.last_updated_at && (
                                  <span className="entry-updated-time">
                                    Updated:{" "}
                                    {formatTimestamp(entry.last_updated_at)}
                                  </span>
                                )}
                            </td>
                            <td>
                              {entry.is_updated ? (
                                <span className="entry-updated-badge">
                                  Updated
                                </span>
                              ) : (
                                <span style={{ color: "#78877a" }}>
                                  Original entry
                                </span>
                              )}
                            </td>
                            <td>{entry.notes || "—"}</td>
                            <td>
                              {request?.status === "pending" ? (
                                <span
                                  style={{
                                    color: "#9a6500",
                                    fontWeight: 800,
                                  }}
                                >
                                  Pending review
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="entry-logout"
                                  onClick={() => openCorrectionForm(entry)}
                                >
                                  {request
                                    ? "Request again"
                                    : "Request correction"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {correctionMessage && (
            <div
              className="entry-message success"
              role="status"
              style={{ marginTop: 16 }}
            >
              {correctionMessage}
            </div>
          )}

          {selectedCorrectionEntry && (
            <section className="entry-card" style={{ marginTop: 20 }}>
              <div className="entry-card-head">
                <h2>
                  Request a correction —{" "}
                  {selectedCorrectionEntry.vegetable}
                </h2>
                <p>
                  Original entry: {money(selectedCorrectionEntry.price)} /{" "}
                  {selectedCorrectionEntry.unit}. The original will not
                  change unless an administrator approves your request.
                </p>
              </div>

              <form
                className="entry-form"
                onSubmit={submitCorrectionRequest}
              >
                {correctionError && (
                  <div className="entry-message error" role="alert">
                    {correctionError}
                  </div>
                )}

                <div className="entry-field">
                  <label htmlFor="correction-price">
                    Correct price (₹ per {selectedCorrectionEntry.unit})
                  </label>
                  <input
                    id="correction-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={correctionForm.proposed_price}
                    onChange={(event) =>
                      setCorrectionForm((current) => ({
                        ...current,
                        proposed_price: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="entry-field">
                  <label htmlFor="correction-notes">
                    Correct notes (optional)
                  </label>
                  <textarea
                    id="correction-notes"
                    rows="3"
                    maxLength="2000"
                    value={correctionForm.proposed_notes}
                    onChange={(event) =>
                      setCorrectionForm((current) => ({
                        ...current,
                        proposed_notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="entry-field">
                  <label htmlFor="correction-reason">
                    Reason for correction (required)
                  </label>
                  <textarea
                    id="correction-reason"
                    rows="3"
                    minLength="5"
                    maxLength="2000"
                    required
                    value={correctionForm.reason}
                    onChange={(event) =>
                      setCorrectionForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Explain what was incorrect and why this change is needed."
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="entry-submit"
                    type="submit"
                    disabled={savingCorrection}
                  >
                    {savingCorrection
                      ? "Submitting request…"
                      : "Submit correction request"}
                  </button>

                  <button
                    className="entry-logout"
                    type="button"
                    onClick={() => setSelectedCorrectionEntry(null)}
                    disabled={savingCorrection}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {correctionRequests.length > 0 && (
            <section className="entry-card" style={{ marginTop: 20 }}>
              <div className="entry-card-head">
                <h2>Correction request history</h2>
                <p>
                  Review status and administrator feedback for your
                  requests.
                </p>
              </div>

              <div className="entry-list-wrap">
                <table
                  className="entry-table"
                  style={{ minWidth: 650 }}
                >
                  <thead>
                    <tr>
                      <th>VEGETABLE</th>
                      <th>ORIGINAL</th>
                      <th>PROPOSED</th>
                      <th>STATUS</th>
                      <th>ADMIN NOTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctionRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.vegetable}</td>
                        <td>
                          {money(request.original_price)} / {request.unit}
                        </td>
                        <td>
                          {money(request.proposed_price)} / {request.unit}
                        </td>
                        <td
                          style={{
                            fontWeight: 800,
                            textTransform: "capitalize",
                          }}
                        >
                          {request.status}
                        </td>
                        <td>{request.admin_note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="entry-card" style={{ marginTop: 20 }}>
            <div className="entry-card-head">
              <h2>Vegetable Price Trends</h2>
              <p>
                Daily average prices from your own valid entries.
                Multiple entries for the same date are averaged.
              </p>
            </div>

            <div className="entry-form">
              <div className="entry-field">
                <label htmlFor="trend-vegetable">
                  Select vegetable
                </label>
                <select
                  id="trend-vegetable"
                  value={selectedTrendVegetable}
                  onChange={(event) =>
                    setSelectedTrendVegetable(event.target.value)
                  }
                  disabled={vegetables.length === 0}
                >
                  {vegetables.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {trendError && (
                <div className="entry-message error" role="alert">
                  {trendError}
                </div>
              )}

              {loadingTrends ? (
                <div className="entry-empty">
                  Loading price trends…
                </div>
              ) : (
                <PriceTrendChart points={trendPoints} />
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default UserPage;
