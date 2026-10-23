import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createVegetable,
  getAllVegetables,
  getCurrentUser,
  getVegetableTrends,
  logout,
  setVegetableActive,
} from "../services/api";

const money = (value) => `₹${Number(value).toFixed(2)}`;

const stamp = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDifference = (difference) => {
  if (difference === null || difference === undefined) {
    return "—";
  }

  const value = Number(difference);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value > 0) return `+${money(value)}`;
  if (value < 0) return `−${money(Math.abs(value))}`;

  return money(0);
};

function LineChart({ points, label }) {
  const values = points
    .map((point) => Number(point.price))
    .filter(Number.isFinite);

  const width = 720;
  const height = 260;
  const pad = 38;

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  const validPoints = points.filter((point) =>
    Number.isFinite(Number(point.price))
  );

  const coords = validPoints.map((point, index) => ({
    ...point,
    x:
      pad +
      index * ((width - pad * 2) / Math.max(1, validPoints.length - 1)),
    y:
      height -
      pad -
      ((Number(point.price) - min) / range) * (height - pad * 2),
  }));

  return (
    <div className="fv-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} price trend line chart`}
      >
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#dce6dc"
        />

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={pad}
            y1={height - pad - ratio * (height - pad * 2)}
            x2={width - pad}
            y2={height - pad - ratio * (height - pad * 2)}
            stroke="#edf1ec"
            strokeDasharray="4 4"
          />
        ))}

        {coords.length > 1 && (
          <polyline
            points={coords.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="#247344"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {coords.map((point, index) => (
          <g key={`${point.id ?? point.timestamp}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#247344"
            />
            <title>
              {stamp(point.timestamp)} · {money(point.price)} / {point.unit}
            </title>
          </g>
        ))}
      </svg>

      <div className="fv-chart-range">
        {validPoints.length
          ? `${stamp(validPoints[0].timestamp)} — ${stamp(
              validPoints[validPoints.length - 1].timestamp
            )}`
          : "No recorded prices"}
      </div>
    </div>
  );
}

export default function AdminVegetablesPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [vegetables, setVegetables] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "kg",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [me, list] = await Promise.all([
        getCurrentUser(),
        getAllVegetables(),
      ]);

      const role =
        typeof me?.role === "string"
          ? me.role.toLowerCase()
          : String(me?.role?.name || "").toLowerCase();

      if (role !== "admin") {
        logout();
        navigate("/", { replace: true });
        return;
      }

      const safeList = Array.isArray(list) ? list : [];

      setAdmin(me);
      setVegetables(safeList);

      setSelectedId((previous) =>
        previous &&
        safeList.some(
          (vegetable) => String(vegetable.id) === String(previous)
        )
          ? previous
          : safeList[0]
            ? String(safeList[0].id)
            : ""
      );
    } catch (e) {
      setError(e?.message || "Unable to load vegetables.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedId) {
      setTrend(null);
      setTrendLoading(false);
      return undefined;
    }

    const loadTrend = async () => {
      setTrendLoading(true);
      setError("");

      try {
        const data = await getVegetableTrends(selectedId);

        if (!cancelled) {
          setTrend(data);
        }
      } catch (e) {
        if (!cancelled) {
          setTrend(null);
          setError(e?.message || "Unable to load price trends.");
        }
      } finally {
        if (!cancelled) {
          setTrendLoading(false);
        }
      }
    };

    loadTrend();

    return () => {
      cancelled = true;
    };
  }, [selectedId, vegetables]);

  const selected = useMemo(
    () =>
      vegetables.find(
        (vegetable) => String(vegetable.id) === String(selectedId)
      ),
    [vegetables, selectedId]
  );

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await createVegetable(form);

      setVegetables((previous) =>
        [...previous, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSelectedId(String(created.id));
      setForm({ name: "", category: "", unit: "kg" });
      setSuccess(
        `${created.name} was added and is now available for price entries.`
      );
    } catch (e) {
      setError(e?.message || "Unable to add this vegetable.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (vegetable) => {
    setError("");
    setSuccess("");

    try {
      const updated = await setVegetableActive(
        vegetable.id,
        !vegetable.is_active
      );

      setVegetables((previous) =>
        previous.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setSuccess(
        `${updated.name} is now ${
          updated.is_active ? "available" : "disabled"
        } for new entries.`
      );
    } catch (e) {
      setError(e?.message || "Unable to update vegetable status.");
    }
  };

  const signOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Chart points should remain in chronological order.
  const chartPoints = trend?.points ?? [];

  // The backend may provide a newest-first list separately.
  const tablePoints = trend?.latest_points ?? [...chartPoints].reverse();

  return (
    <div className="fv-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .fv-page {
          min-height: 100vh;
          background: #f3f6f1;
          color: #20382a;
          padding: 26px;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .fv-shell {
          max-width: 1240px;
          margin: auto;
        }

        .fv-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
        }

        .fv-brand {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .fv-logo {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: #1d5638;
          color: white;
          border-radius: 13px;
          font-weight: 900;
        }

        .fv-brand b {
          letter-spacing: 1.1px;
          font-size: 12px;
        }

        .fv-muted {
          color: #78877a;
          font-size: 12px;
          margin-top: 5px;
        }

        .fv-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .fv-btn {
          border: 1px solid #d7e2d5;
          background: white;
          color: #31563c;
          border-radius: 10px;
          padding: 10px 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .fv-btn.primary {
          background: #1e5b38;
          color: white;
          border-color: #1e5b38;
        }

        .fv-btn:disabled {
          opacity: .55;
          cursor: wait;
        }

        .fv-heading {
          margin: 22px 0;
        }

        .fv-heading small {
          color: #5d805f;
          letter-spacing: 1.5px;
          font-weight: 900;
        }

        .fv-heading h1 {
          font-size: clamp(27px, 4vw, 38px);
          margin: 7px 0;
        }

        .fv-heading p {
          color: #758276;
          line-height: 1.6;
        }

        .fv-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .fv-tab {
          border: 1px solid #dce5d9;
          background: white;
          color: #536a57;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 800;
        }

        .fv-tab.active {
          background: #1e5b38;
          color: white;
        }

        .fv-grid {
          display: grid;
          grid-template-columns: minmax(300px, .8fr) minmax(0, 1.2fr);
          gap: 18px;
          align-items: start;
        }

        .fv-card {
          background: #fff;
          border: 1px solid #e3eae0;
          border-radius: 17px;
          overflow: hidden;
          box-shadow: 0 10px 30px #24492b0a;
          min-width: 0;
        }

        .fv-card-head {
          padding: 20px 22px;
          border-bottom: 1px solid #edf1eb;
        }

        .fv-card-head h2 {
          font-size: 17px;
          margin: 0;
        }

        .fv-card-head p {
          font-size: 12px;
          color: #829082;
          line-height: 1.5;
          margin: 6px 0 0;
        }

        .fv-form {
          padding: 22px;
          display: grid;
          gap: 14px;
        }

        .fv-field {
          display: grid;
          gap: 7px;
        }

        .fv-field label {
          font-size: 12px;
          font-weight: 800;
          color: #425747;
        }

        .fv-field input,
        .fv-field select {
          width: 100%;
          border: 1px solid #dce5d9;
          border-radius: 10px;
          padding: 12px;
          background: #fbfcfa;
          color: #20382a;
          font: inherit;
        }

        .fv-list {
          padding: 8px 18px;
          max-height: 420px;
          overflow-y: auto;
        }

        .fv-veg-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 5px;
          border-bottom: 1px solid #edf1eb;
        }

        .fv-veg-row:last-child {
          border-bottom: 0;
        }

        .fv-veg-row button {
          font-size: 11px;
        }

        .fv-status {
          display: inline-block;
          font-size: 11px;
          border-radius: 20px;
          padding: 4px 8px;
          margin-top: 7px;
          background: #eaf7ed;
          color: #216337;
        }

        .fv-status.off {
          background: #f5eeee;
          color: #9b4037;
        }

        .fv-message {
          padding: 12px 14px;
          border-radius: 10px;
          margin: 12px 0;
          font-size: 13px;
        }

        .fv-message.error {
          background: #fff0ee;
          color: #a0372b;
        }

        .fv-message.success {
          background: #eaf7ed;
          color: #216337;
        }

        .fv-chart {
          padding: 18px 20px 22px;
        }

        .fv-chart svg {
          width: 100%;
          height: auto;
          min-height: 190px;
        }

        .fv-chart-range {
          font-size: 11px;
          color: #7d897e;
          margin-top: 8px;
        }

        .fv-empty {
          padding: 34px 22px;
          text-align: center;
          color: #839084;
          font-size: 13px;
          line-height: 1.6;
        }

        /* The price-entry table now scrolls vertically and horizontally. */
        .fv-table-wrap {
          max-height: 420px;
          overflow: auto;
          border-top: 1px solid #edf1eb;
          overscroll-behavior: contain;
        }

        .fv-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 570px;
        }

        .fv-table th,
        .fv-table td {
          text-align: left;
          padding: 12px 15px;
          border-bottom: 1px solid #edf1eb;
          font-size: 12px;
          white-space: nowrap;
        }

        .fv-table th {
          position: sticky;
          top: 0;
          z-index: 2;
          font-size: 10px;
          letter-spacing: .7px;
          color: #829082;
          background: #f8faf7;
          box-shadow: 0 1px 0 #edf1eb;
        }

        .fv-difference {
          font-weight: 800;
        }

        .fv-difference.up {
          color: #216337;
        }

        .fv-difference.down {
          color: #a0372b;
        }

        .fv-difference.same {
          color: #78877a;
        }

        @media (max-width: 850px) {
          .fv-page {
            padding: 16px 12px;
          }

          .fv-grid {
            grid-template-columns: 1fr;
          }

          .fv-top {
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .fv-top {
            flex-direction: column;
          }

          .fv-actions {
            width: 100%;
          }

          .fv-actions .fv-btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="fv-shell">
        <header className="fv-top">
          <div className="fv-brand">
            <div className="fv-logo">VG</div>
            <div>
              <b>VEEGRONEX GLOBAL TRADE</b>
              <div className="fv-muted">FreshFlow · Administrator</div>
            </div>
          </div>

          <div className="fv-actions">
            <button
              className="fv-btn"
              type="button"
              onClick={() => navigate("/admin")}
            >
              ← User Management
            </button>

            <button
              className="fv-btn"
              type="button"
              onClick={signOut}
            >
              Sign out ↗
            </button>
          </div>
        </header>

        <div className="fv-heading">
          <small>ADMIN WORKSPACE / VEGETABLE MANAGEMENT</small>
          <h1>Vegetable Management</h1>
          <p>
            Add vegetables to the portal, control which ones users can submit,
            and review recorded price trends.
          </p>
        </div>

        <nav className="fv-tabs">
          <button className="fv-tab active" type="button">
            Vegetables &amp; price trends
          </button>
        </nav>

        {error && (
          <div className="fv-message error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="fv-message success" role="status">
            {success}
          </div>
        )}

        <div className="fv-grid">
          <section className="fv-card">
            <div className="fv-card-head">
              <h2>Add a vegetable</h2>
              <p>
                Only administrators can add vegetables to the selectable list.
              </p>
            </div>

            <form className="fv-form" onSubmit={handleCreate}>
              <div className="fv-field">
                <label htmlFor="veg-name">Vegetable name</label>
                <input
                  id="veg-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Tomato"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div className="fv-field">
                <label htmlFor="veg-category">Category (optional)</label>
                <input
                  id="veg-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  placeholder="e.g. Fruit vegetable"
                  maxLength={100}
                />
              </div>

              <div className="fv-field">
                <label htmlFor="veg-unit">Default price unit</label>
                <select
                  id="veg-unit"
                  value={form.unit}
                  onChange={(event) =>
                    setForm({ ...form, unit: event.target.value })
                  }
                >
                  <option value="kg">Per kilogram (kg)</option>
                  <option value="piece">Per piece</option>
                </select>
              </div>

              <button
                className="fv-btn primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Adding…" : "+ Add vegetable"}
              </button>
            </form>

            <div className="fv-card-head">
              <h2>
                Available vegetables (
                {vegetables.filter((vegetable) => vegetable.is_active).length})
              </h2>
            </div>

            <div className="fv-list">
              {loading ? (
                <div className="fv-empty">Loading vegetables…</div>
              ) : vegetables.length === 0 ? (
                <div className="fv-empty">
                  No vegetables have been added yet.
                </div>
              ) : (
                vegetables.map((vegetable) => (
                  <div className="fv-veg-row" key={vegetable.id}>
                    <div>
                      <strong>{vegetable.name}</strong>
                      <div className="fv-muted">
                        {vegetable.category || "Uncategorised"} · per{" "}
                        {vegetable.unit}
                      </div>
                      <span
                        className={`fv-status ${
                          vegetable.is_active ? "" : "off"
                        }`}
                      >
                        {vegetable.is_active ? "Available" : "Disabled"}
                      </span>
                    </div>

                    <button
                      className="fv-btn"
                      type="button"
                      onClick={() => toggleActive(vegetable)}
                    >
                      {vegetable.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="fv-card">
            <div className="fv-card-head">
              <h2>Vegetable price trends</h2>
              <p>
                Select a vegetable to review recorded price submissions over
                time.
                {trend
                  ? ` Total saved entries: ${
                      trend.total_entries ?? chartPoints.length
                    }.`
                  : ""}
              </p>
            </div>

            <div className="fv-form">
              <div className="fv-field">
                <label htmlFor="trend-veg">Vegetable</label>
                <select
                  id="trend-veg"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  disabled={loading || vegetables.length === 0}
                >
                  {vegetables.map((vegetable) => (
                    <option key={vegetable.id} value={vegetable.id}>
                      {vegetable.name}
                      {vegetable.is_active ? "" : " (disabled)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selected ? (
              <div className="fv-empty">
                Add a vegetable to begin managing the list.
              </div>
            ) : trendLoading ? (
              <div className="fv-empty">Loading price trends…</div>
            ) : !trend || !chartPoints.length ? (
              <div className="fv-empty">
                No saved price records for {selected.name} yet. The trend chart
                will appear as users submit prices.
              </div>
            ) : (
              <>
                <LineChart points={chartPoints} label={selected.name} />

                <div className="fv-card-head">
                  <h2>Price submission history</h2>
                  <p>
                    Showing {tablePoints.length} entries returned by the
                    server. Scroll within the table to view older entries.
                  </p>
                </div>

                <div
                  className="fv-table-wrap"
                  role="region"
                  aria-label={`${selected.name} price submission history`}
                  tabIndex={0}
                >
                  <table className="fv-table">
                    <thead>
                      <tr>
                        <th>SUBMITTED AT</th>
                        <th>PRICE</th>
                        <th>DIFFERENCE</th>
                        <th>SUBMITTED BY</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tablePoints.map((point, index) => {
                        const difference = point.difference;
                        const numericDifference =
                          difference == null ? null : Number(difference);

                        const differenceClass =
                          numericDifference == null ||
                          !Number.isFinite(numericDifference)
                            ? "same"
                            : numericDifference > 0
                              ? "up"
                              : numericDifference < 0
                                ? "down"
                                : "same";

                        return (
                          <tr
                            key={`${point.id ?? point.timestamp}-${index}`}
                          >
                            <td>{stamp(point.timestamp)}</td>
                            <td>
                              {money(point.price)} / {point.unit}
                            </td>
                            <td
                              className={`fv-difference ${differenceClass}`}
                            >
                              {formatDifference(difference)}
                            </td>
                            <td>
                              {point.submitter_name || "Unknown user"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="fv-muted" style={{ marginTop: 20 }}>
          Signed in as{" "}
          {admin?.full_name || admin?.username || "Administrator"}. Vegetable
          actions are validated by the backend.
        </div>
      </div>
    </div>
  );
}
