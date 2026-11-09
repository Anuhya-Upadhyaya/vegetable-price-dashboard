
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getPriceAnalytics,
  getAllVegetables,
  logout,
} from "../services/api";

const styles = `
  * { box-sizing: border-box; }

  .analytics-page {
    width: 100%;
    min-width: 0;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    background: #f5f7f4;
    color: #243328;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* The sidebar is now supplied by AdminLayout.jsx.
     Do not add another sidebar or reserve space for one here. */

  .analytics-content {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0;
    padding: 30px 34px;
    box-sizing: border-box;
  }

  .analytics-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 28px;
  }

  .analytics-breadcrumb {
    color: #758176;
    font-size: 12px;
    margin-bottom: 7px;
  }

  .analytics-title {
    margin: 0;
    color: #203d2b;
    font-size: clamp(24px, 3vw, 31px);
  }

  .analytics-subtitle {
    margin: 8px 0 0;
    color: #7b857c;
    font-size: 13px;
    line-height: 1.6;
  }

  .analytics-profile {
    padding: 10px 13px;
    border: 1px solid #e5eae3;
    border-radius: 12px;
    background: white;
    color: #34513b;
    font-size: 12px;
  }

  .analytics-filter-panel,
  .analytics-panel {
    margin-bottom: 22px;
    border: 1px solid #e5eae3;
    border-radius: 15px;
    background: white;
    overflow: hidden;
  }

  .analytics-filter-panel { padding: 21px; }

  .analytics-filter-title {
    margin: 0 0 15px;
    color: #233c2b;
    font-size: 15px;
  }

  .analytics-filter-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 13px;
    align-items: end;
  }

  .analytics-field label {
    display: block;
    margin-bottom: 7px;
    color: #6e7c70;
    font-size: 11px;
    font-weight: 700;
  }

  .analytics-input {
    width: 100%;
    min-height: 40px;
    padding: 9px 11px;
    border: 1px solid #dfe6dd;
    border-radius: 8px;
    color: #344437;
    background: white;
    font-size: 12px;
  }

  .analytics-button {
    min-height: 40px;
    padding: 10px 14px;
    border: 1px solid #245638;
    border-radius: 8px;
    background: #245638;
    color: white;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .analytics-button.secondary {
    border-color: #dfe6dd;
    background: white;
    color: #315a3b;
  }

  .analytics-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .analytics-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 15px;
  }

  .analytics-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 22px;
  }

  .analytics-stat-card {
    min-width: 0;
    padding: 20px;
    border: 1px solid #e7ebe5;
    border-radius: 15px;
    background: white;
  }

  .analytics-stat-label {
    color: #758075;
    font-size: 12px;
  }

  .analytics-stat-number {
    margin: 17px 0 6px;
    color: #213c2b;
    font-size: clamp(22px, 2.5vw, 30px);
    font-weight: 750;
    overflow-wrap: anywhere;
  }

  .analytics-stat-caption {
    color: #89938a;
    font-size: 10px;
    line-height: 1.5;
  }

  .analytics-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 22px;
    border-bottom: 1px solid #edf0eb;
  }

  .analytics-panel-header h2 {
    margin: 0;
    color: #233c2b;
    font-size: 16px;
  }

  .analytics-panel-header p {
    margin: 6px 0 0;
    color: #828c82;
    font-size: 12px;
    line-height: 1.5;
  }

  .analytics-table-wrap {
    width: 100%;
    max-height: 420px;
    overflow: auto;
    position: relative;
    scrollbar-width: thin;
    scrollbar-color: #9bb5a0 #f3f6f1;
  }

  .analytics-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
  }

  .analytics-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fafbf9;
  }

  .analytics-table th {
    padding: 13px 17px;
    color: #7b877b;
    font-size: 10px;
    letter-spacing: .6px;
  }

  .analytics-table td {
    padding: 15px 17px;
    border-top: 1px solid #f0f2ee;
    color: #4b594c;
    font-size: 12px;
  }

  .analytics-table tbody tr:hover {
    background: #fcfdfb;
  }

  .analytics-table-empty {
    padding: 35px 20px;
    text-align: center;
    color: #7d887e;
    font-size: 13px;
    line-height: 1.6;
  }

  .analytics-message {
    margin-bottom: 18px;
    padding: 13px 15px;
    border-radius: 9px;
    font-size: 12px;
    line-height: 1.6;
  }

  .analytics-error {
    background: #fff0ee;
    color: #a53d32;
    border: 1px solid #f4d2cd;
  }

  .analytics-notice {
    background: #edf7ed;
    color: #28633b;
    border: 1px solid #d4ead5;
  }

  .analytics-chart-wrap { padding: 20px; }

  .analytics-chart-legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    font-size: 11px;
    color: #526253;
  }

  .analytics-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .analytics-legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #3c8050;
  }

  .analytics-chart-svg {
    display: block;
    width: 100%;
    height: auto;
    min-height: 210px;
  }

  .analytics-chart-note {
    margin-top: 12px;
    color: #7b857c;
    font-size: 11px;
    line-height: 1.6;
  }

  .analytics-footer {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
    color: #899389;
    font-size: 11px;
  }

  @media (max-width: 1100px) {
    .analytics-content { padding: 25px 22px; }
    .analytics-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .analytics-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 720px) {
    .analytics-content { padding: 22px 14px; }

    .analytics-topbar {
      align-items: flex-start;
      flex-direction: column;
      margin-bottom: 23px;
    }

    .analytics-filter-grid { grid-template-columns: 1fr; }
    .analytics-stat-grid { gap: 10px; }
    .analytics-stat-card { padding: 15px; }
  }
`;

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const moneyFormat = (value) => `₹${numberFormat(value)}`;

const dateFormat = (value) => {
  if (!value) return "—";

  const parsed = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const dateTimeFormat = (value) => {
  if (!value) return "—";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const csvCell = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(entries, filename = "freshflow-price-analytics.csv") {
  const headers = [
    "Entry ID",
    "Vegetable",
    "Price",
    "Unit",
    "Entry Date",
    "Submitted At",
    "Submitter",
    "Notes",
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.vegetable,
    entry.price,
    entry.unit,
    entry.entry_date,
    entry.created_at,
    entry.submitter_name,
    entry.notes,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PriceTrendChart({ observations, vegetable }) {
  const sorted = useMemo(
    () =>
      [...observations].sort(
        (a, b) =>
          new Date(a.created_at || a.date) -
          new Date(b.created_at || b.date)
      ),
    [observations]
  );

  if (!sorted.length) {
    return (
      <div className="analytics-table-empty">
        No price observations are available for this vegetable and date range.
      </div>
    );
  }

  const width = 760;
  const height = 300;
  const left = 66;
  const right = 24;
  const top = 25;
  const bottom = 50;

  const values = sorted.map((item) => Number(item.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = spread === 0 ? Math.max(max * 0.1, 1) : spread * 0.12;
  const low = Math.max(0, min - padding);
  const high = max + padding || 1;

  const x = (index) =>
    sorted.length === 1
      ? (left + width - right) / 2
      : left + (index / (sorted.length - 1)) * (width - left - right);

  const y = (value) =>
    top +
    ((high - value) / (high - low || 1)) * (height - top - bottom);

  const points = sorted
    .map((item, index) => `${x(index)},${y(Number(item.price))}`)
    .join(" ");

  const ticks = Array.from({ length: 5 }, (_, index) =>
    high - (index / 4) * (high - low)
  );

  const labelIndices = [
    ...new Set([
      0,
      Math.floor((sorted.length - 1) / 2),
      sorted.length - 1,
    ]),
  ];

  return (
    <div className="analytics-chart-wrap">
      <div className="analytics-chart-legend">
        <span className="analytics-legend-item">
          <span className="analytics-legend-dot" />
          {vegetable} price
        </span>
        <span>
          {sorted.length} observation{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      <svg
        className="analytics-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Price trend chart for ${vegetable}`}
      >
        {ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={left}
              x2={width - right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e8eee7"
              strokeDasharray="4 4"
            />
            <text
              x={left - 10}
              y={y(tick) + 4}
              fontSize="11"
              fill="#778477"
              textAnchor="end"
            >
              {numberFormat(tick)}
            </text>
          </g>
        ))}

        <line
          x1={left}
          x2={left}
          y1={top}
          y2={height - bottom}
          stroke="#ccd8cb"
        />

        <line
          x1={left}
          x2={width - right}
          y1={height - bottom}
          y2={height - bottom}
          stroke="#ccd8cb"
        />

        {sorted.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="#3c8050"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {sorted.map((item, index) => (
          <circle
            key={`${item.created_at || item.date}-${index}`}
            cx={x(index)}
            cy={y(Number(item.price))}
            r="4"
            fill="#3c8050"
            stroke="white"
            strokeWidth="2"
          >
            <title>
              {dateTimeFormat(item.created_at || item.date)}:{" "}
              {moneyFormat(item.price)}
            </title>
          </circle>
        ))}

        {labelIndices.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - bottom + 22}
            fontSize="10"
            fill="#778477"
            textAnchor={
              index === 0
                ? "start"
                : index === sorted.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {dateFormat(sorted[index].date)}
          </text>
        ))}

        <text
          x="17"
          y={height / 2}
          transform={`rotate(-90 17 ${height / 2})`}
          fontSize="11"
          fill="#778477"
          textAnchor="middle"
        >
          Price (₹)
        </text>
      </svg>

      <p className="analytics-chart-note">
        Each point represents a saved price entry. Prices are shown in the
        configured unit for this vegetable. Multiple entries on the same date
        may appear separately.
      </p>
    </div>
  );
}

function AdminAnalyticsPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [vegetables, setVegetables] = useState([]);
  const [data, setData] = useState({
    summary: {
      total_entries: 0,
      average_price: 0,
      minimum_price: 0,
      maximum_price: 0,
    },
    comparisons: [],
    entries: [],
  });

  const [dateMode, setDateMode] = useState("range");
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vegetable, setVegetable] = useState("");
  const [chartVegetable, setChartVegetable] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    if (dateMode === "single" && !selectedDate) {
      setError("Please select a day before applying the filters.");
      setLoading(false);
      return;
    }

    try {
      const [analytics, currentAdmin, vegetableList] = await Promise.all([
        getPriceAnalytics({
          start_date: dateMode === "single" ? selectedDate : startDate,
          end_date: dateMode === "single" ? selectedDate : endDate,
          vegetable,
        }),
        getCurrentUser(),
        getAllVegetables(),
      ]);

      if (
        String(
          typeof currentAdmin?.role === "string"
            ? currentAdmin.role
            : currentAdmin?.role?.name || ""
        ).toLowerCase() !== "admin"
      ) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setAdmin(currentAdmin);
      setData({
        summary: analytics?.summary || {
          total_entries: 0,
          average_price: 0,
          minimum_price: 0,
          maximum_price: 0,
        },
        comparisons: Array.isArray(analytics?.comparisons)
          ? analytics.comparisons
          : [],
        entries: Array.isArray(analytics?.entries) ? analytics.entries : [],
      });

      setVegetables(Array.isArray(vegetableList) ? vegetableList : []);

      const availableNames = (analytics?.comparisons || []).map(
        (item) => item.vegetable
      );

      setChartVegetable((current) =>
        availableNames.includes(current)
          ? current
          : availableNames[0] || ""
      );
    } catch (err) {
      const message = err?.message || "Unable to load price analytics.";
      const lower = message.toLowerCase();

      if (
        lower.includes("token") ||
        lower.includes("unauthorized") ||
        lower.includes("authentication") ||
        lower.includes("credentials")
      ) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateMode, selectedDate, startDate, endDate, vegetable, navigate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartComparison = useMemo(
    () =>
      data.comparisons.find(
        (item) => item.vegetable === chartVegetable
      ),
    [data.comparisons, chartVegetable]
  );

  const chartObservations = chartComparison?.observations || [];

  const resetFilters = () => {
    setDateMode("range");
    setSelectedDate("");
    setStartDate("");
    setEndDate("");
    setVegetable("");
  };

  const exportFilename =
    dateMode === "single"
      ? `freshflow-price-analytics-${selectedDate || "all-dates"}.csv`
      : startDate || endDate
        ? `freshflow-price-analytics-${startDate || "start"}-to-${endDate || "end"}.csv`
        : "freshflow-price-analytics-all-dates.csv";

  return (
    <>
      <style>{styles}</style>

      <div className="analytics-page">
        {/* Shared sidebar is rendered by AdminLayout.jsx */}

        <main className="analytics-content">
          <header className="analytics-topbar">
            <div>
              <div className="analytics-breadcrumb">
                Workspace / Price Analytics
              </div>
              <h1 className="analytics-title">Price Analytics</h1>
              <p className="analytics-subtitle">
                Explore submitted vegetable prices, compare observations, and
                track price movement over time.
              </p>
            </div>

            <div className="analytics-profile">
              Administrator:{" "}
              <strong>
                {admin?.full_name || admin?.username || "Admin"}
              </strong>
            </div>
          </header>

          {error && (
            <div className="analytics-message analytics-error" role="alert">
              <strong>Unable to load analytics.</strong>
              <div>{error}</div>
            </div>
          )}

          <section className="analytics-filter-panel">
            <h2 className="analytics-filter-title">Filter price records</h2>

            <div className="analytics-filter-grid">
              <div className="analytics-field">
                <label htmlFor="analytics-date-mode">Date selection</label>
                <select
                  id="analytics-date-mode"
                  className="analytics-input"
                  value={dateMode}
                  onChange={(event) => setDateMode(event.target.value)}
                >
                  <option value="single">Single day</option>
                  <option value="range">Date range</option>
                </select>
              </div>

              {dateMode === "single" ? (
                <div className="analytics-field">
                  <label htmlFor="analytics-single-date">Select day</label>
                  <input
                    id="analytics-single-date"
                    className="analytics-input"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="analytics-field">
                    <label htmlFor="analytics-start-date">Start date</label>
                    <input
                      id="analytics-start-date"
                      className="analytics-input"
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>

                  <div className="analytics-field">
                    <label htmlFor="analytics-end-date">End date</label>
                    <input
                      id="analytics-end-date"
                      className="analytics-input"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="analytics-field">
                <label htmlFor="analytics-vegetable">Vegetable</label>
                <select
                  id="analytics-vegetable"
                  className="analytics-input"
                  value={vegetable}
                  onChange={(event) => setVegetable(event.target.value)}
                >
                  <option value="">All vegetables</option>
                  {vegetables.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                      {item.unit ? ` (${item.unit})` : ""}
                      {item.is_active === false ? " — inactive" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="analytics-button"
                onClick={loadAnalytics}
                disabled={loading}
              >
                {loading ? "Loading..." : "Apply filters"}
              </button>
            </div>

            <div className="analytics-actions">
              <button
                type="button"
                className="analytics-button secondary"
                onClick={resetFilters}
                disabled={loading}
              >
                Reset filters
              </button>

              <button
                type="button"
                className="analytics-button secondary"
                onClick={() => downloadCsv(data.entries, exportFilename)}
                disabled={loading || data.entries.length === 0}
              >
                Export filtered CSV
              </button>

              <button
                type="button"
                className="analytics-button secondary"
                onClick={loadAnalytics}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>
          </section>

          <section
            className="analytics-stat-grid"
            aria-label="Price analytics summary"
          >
            <article className="analytics-stat-card">
              <div className="analytics-stat-label">Total entries</div>
              <div className="analytics-stat-number">
                {numberFormat(data.summary.total_entries)}
              </div>
              <div className="analytics-stat-caption">
                Records matching the selected filters
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-label">Average price</div>
              <div className="analytics-stat-number">
                {moneyFormat(data.summary.average_price)}
              </div>
              <div className="analytics-stat-caption">
                Across all filtered entries
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-label">Minimum price</div>
              <div className="analytics-stat-number">
                {moneyFormat(data.summary.minimum_price)}
              </div>
              <div className="analytics-stat-caption">
                Lowest filtered record
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="analytics-stat-label">Maximum price</div>
              <div className="analytics-stat-number">
                {moneyFormat(data.summary.maximum_price)}
              </div>
              <div className="analytics-stat-caption">
                Highest filtered record
              </div>
            </article>
          </section>

          <section className="analytics-panel">
            <header className="analytics-panel-header">
              <div>
                <h2>Price trend</h2>
                <p>Review recorded prices for one vegetable at a time.</p>
              </div>

              <div className="analytics-field">
                <label htmlFor="analytics-chart-vegetable">
                  Chart vegetable
                </label>
                <select
                  id="analytics-chart-vegetable"
                  className="analytics-input"
                  value={chartVegetable}
                  onChange={(event) => setChartVegetable(event.target.value)}
                  disabled={data.comparisons.length === 0}
                >
                  {data.comparisons.length === 0 && (
                    <option value="">No data available</option>
                  )}

                  {data.comparisons.map((item) => (
                    <option
                      key={`${item.vegetable}-${item.unit}`}
                      value={item.vegetable}
                    >
                      {item.vegetable} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>
            </header>

            {loading ? (
              <div className="analytics-table-empty">
                Loading price trends...
              </div>
            ) : chartComparison ? (
              <>
                <PriceTrendChart
                  observations={chartObservations}
                  vegetable={chartComparison.vegetable}
                />
                <div
                  style={{
                    padding: "0 20px 20px",
                    color: "#718072",
                    fontSize: 12,
                  }}
                >
                  Unit: <strong>{chartComparison.unit}</strong>
                  {" · "}Average:{" "}
                  <strong>{moneyFormat(chartComparison.average_price)}</strong>
                  {" · "}Range:{" "}
                  <strong>
                    {moneyFormat(chartComparison.minimum_price)} –{" "}
                    {moneyFormat(chartComparison.maximum_price)}
                  </strong>
                </div>
              </>
            ) : (
              <div className="analytics-table-empty">
                No trend data is available for the selected filters.
              </div>
            )}
          </section>

          <section className="analytics-panel">
            <header className="analytics-panel-header">
              <div>
                <h2>Vegetable comparison</h2>
                <p>
                  Statistics are grouped by vegetable and configured unit.
                </p>
              </div>
            </header>

            {loading ? (
              <div className="analytics-table-empty">
                Loading comparison data...
              </div>
            ) : data.comparisons.length === 0 ? (
              <div className="analytics-table-empty">
                <strong>No matching records</strong>
                <div>
                  Try another date range or select a different vegetable.
                </div>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>VEGETABLE</th>
                      <th>UNIT</th>
                      <th>ENTRIES</th>
                      <th>AVERAGE PRICE</th>
                      <th>MINIMUM</th>
                      <th>MAXIMUM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.comparisons.map((item) => (
                      <tr key={`${item.vegetable}-${item.unit}`}>
                        <td><strong>{item.vegetable}</strong></td>
                        <td>{item.unit}</td>
                        <td>{numberFormat(item.entry_count)}</td>
                        <td>{moneyFormat(item.average_price)}</td>
                        <td>{moneyFormat(item.minimum_price)}</td>
                        <td>{moneyFormat(item.maximum_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="analytics-panel">
            <header className="analytics-panel-header">
              <div>
                <h2>Filtered price records</h2>
                <p>
                  {numberFormat(data.entries.length)} record(s) included in the
                  current results and CSV export.
                </p>
              </div>
            </header>

            {loading ? (
              <div className="analytics-table-empty">
                Loading price records...
              </div>
            ) : data.entries.length === 0 ? (
              <div className="analytics-table-empty">
                No price entries match the current filters.
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>VEGETABLE</th>
                      <th>PRICE</th>
                      <th>SUBMITTED BY</th>
                      <th>SUBMITTED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{dateFormat(entry.entry_date)}</td>
                        <td>{entry.vegetable}</td>
                        <td>
                          {moneyFormat(entry.price)} / {entry.unit}
                        </td>
                        <td>{entry.submitter_name || "—"}</td>
                        <td>{dateTimeFormat(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="analytics-footer">
            <span>Veegronex FreshFlow · Price Analytics</span>
            <span>Data supplied by the authenticated backend API</span>
          </footer>
        </main>
      </div>
    </>
  );
}

export default AdminAnalyticsPage;
