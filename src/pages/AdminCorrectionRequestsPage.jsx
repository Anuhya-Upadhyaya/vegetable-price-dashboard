import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  decideCorrectionRequest,
  getCorrectionRequests,
  getCurrentUser,
  logout,
} from "../services/api";

const money = (value) => `₹${Number(value).toFixed(2)}`;
const dateTime = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "—";

const css = `
  * { box-sizing: border-box; }
  .correction-admin { min-height:100vh; padding:28px; background:#f5f7f4; color:#243328; font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .correction-shell { max-width:1100px; margin:0 auto; }
  .correction-top { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px; }
  .correction-back,.correction-refresh { border:1px solid #d8e3d6; border-radius:10px; background:#fff; color:#28583a; padding:10px 14px; font-weight:750; cursor:pointer; }
  .correction-title { margin:0; font-size:clamp(25px,4vw,34px); color:#203d2b; }
  .correction-subtitle { color:#718073; line-height:1.6; font-size:13px; }
  .correction-tabs { display:flex; flex-wrap:wrap; gap:8px; margin:20px 0; }
  .correction-tab { border:1px solid #dce5d9; border-radius:999px; background:white; color:#526453; padding:9px 15px; cursor:pointer; font-weight:750; }
  .correction-tab.active { background:#1e5b38; color:white; border-color:#1e5b38; }
  .correction-card { background:white; border:1px solid #e3eae0; border-radius:16px; padding:22px; margin-bottom:16px; box-shadow:0 8px 28px #24492b0b; }
  .correction-card-head { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:start; }
  .correction-card h2 { margin:0; font-size:18px; color:#24442e; }
  .correction-meta { color:#788578; font-size:12px; margin-top:7px; line-height:1.6; }
  .correction-values { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:18px 0; }
  .correction-value { padding:14px; border:1px solid #e7ece5; border-radius:12px; background:#fbfcfa; }
  .correction-label { color:#788578; font-size:10px; letter-spacing:.8px; font-weight:850; text-transform:uppercase; margin-bottom:7px; }
  .correction-price { font-size:23px; font-weight:850; color:#245e39; }
  .correction-reason { background:#f8faf7; border-left:3px solid #8cab8e; padding:12px 14px; border-radius:0 8px 8px 0; font-size:13px; line-height:1.6; white-space:pre-wrap; overflow-wrap:anywhere; }
  .correction-note { width:100%; margin:12px 0; padding:11px 12px; border:1px solid #dce5d9; border-radius:9px; font:inherit; min-height:70px; resize:vertical; }
  .correction-actions { display:flex; gap:9px; flex-wrap:wrap; }
  .correction-action { border:0; border-radius:9px; padding:11px 15px; font-weight:800; cursor:pointer; }
  .correction-action:disabled { opacity:.55; cursor:wait; }
  .correction-approve { background:#1e5b38; color:white; }
  .correction-reject { background:#fff0ee; color:#9b352b; border:1px solid #f0d2ce; }
  .correction-state { padding:32px 20px; text-align:center; color:#718073; background:white; border:1px dashed #d6e1d3; border-radius:14px; line-height:1.6; }
  .correction-alert { margin:14px 0; padding:12px 14px; border-radius:10px; font-size:13px; line-height:1.5; }
  .correction-alert.error { background:#fff0ee; color:#a0372b; }
  .correction-alert.success { background:#eaf7ed; color:#216337; }
  .correction-status { padding:6px 10px; border-radius:999px; background:#fff5d9; color:#8a6200; font-size:11px; font-weight:850; text-transform:uppercase; }
  @media(max-width:640px) { .correction-admin{padding:18px 12px;} .correction-top{align-items:flex-start; flex-direction:column;} .correction-values{grid-template-columns:1fr;} .correction-card{padding:16px;} }
`;

export default function AdminCorrectionRequestsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextFilter = filter) => {
    setLoading(true);
    setError("");
    try {
      const [current, rows] = await Promise.all([
        getCurrentUser(),
        getCorrectionRequests(nextFilter === "all" ? "" : nextFilter),
      ]);
      const role = typeof current?.role === "string" ? current.role.toLowerCase() : current?.role?.name?.toLowerCase();
      if (role !== "admin") {
        logout();
        navigate("/", { replace: true });
        return;
      }
      setAdmin(current);
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const text = err?.message || "Unable to load correction requests.";
      setError(text);
      if (/token|unauthorized|authentication|credentials/i.test(text)) {
        logout();
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => { load(filter); }, [load, filter]);

  const decide = async (request, decision) => {
    setBusyId(request.id);
    setError("");
    setMessage("");
    try {
      const result = await decideCorrectionRequest(request.id, decision, notes[request.id] || "");
      setMessage(result?.message || `Request ${decision}.`);
      await load(filter);
    } catch (err) {
      setError(err?.message || `Unable to ${decision} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <style>{css}</style>
      <main className="correction-admin">
        <div className="correction-shell">
          <header className="correction-top">
            <div>
              <button className="correction-back" type="button" onClick={() => navigate("/admin")}>← Back to user management</button>
              <h1 className="correction-title" style={{ marginTop: 18 }}>Price correction requests</h1>
              <p className="correction-subtitle">Review proposed changes before they affect saved price records. Original values are stored with every request.</p>
              {admin && <p className="correction-meta">Signed in as {admin.full_name || admin.username || "administrator"}</p>}
            </div>
            <button className="correction-refresh" type="button" onClick={() => load(filter)} disabled={loading}>↻ Refresh</button>
          </header>

          {error && <div className="correction-alert error" role="alert">{error}</div>}
          {message && <div className="correction-alert success" role="status">{message}</div>}

          <nav className="correction-tabs" aria-label="Correction request filters">
            {[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All requests"]].map(([value, label]) => (
              <button key={value} type="button" className={`correction-tab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </nav>

          {loading ? <div className="correction-state">Loading correction requests…</div>
            : requests.length === 0 ? <div className="correction-state">No {filter === "all" ? "" : `${filter} `}correction requests found.</div>
            : requests.map((request) => (
              <article className="correction-card" key={request.id}>
                <div className="correction-card-head">
                  <div>
                    <h2>{request.vegetable} · Entry #{request.entry_id}</h2>
                    <div className="correction-meta">
                      Submitted by {request.submitter_name} · Request #{request.id}<br />
                      Submitted {dateTime(request.created_at)} · Unit: {request.unit}
                    </div>
                  </div>
                  <span className="correction-status">{request.status}</span>
                </div>

                <div className="correction-values">
                  <div className="correction-value">
                    <div className="correction-label">Original saved value</div>
                    <div className="correction-price">{money(request.original_price)} / {request.unit}</div>
                    <div className="correction-meta">Notes: {request.original_notes || "—"}</div>
                  </div>
                  <div className="correction-value">
                    <div className="correction-label">Proposed value</div>
                    <div className="correction-price">{money(request.proposed_price)} / {request.unit}</div>
                    <div className="correction-meta">Notes: {request.proposed_notes || "—"}</div>
                  </div>
                </div>

                <div className="correction-label">User's reason</div>
                <div className="correction-reason">{request.reason}</div>

                {request.status === "pending" ? (
                  <>
                    <label className="correction-label" htmlFor={`admin-note-${request.id}`} style={{ display: "block", marginTop: 17 }}>Admin note (optional)</label>
                    <textarea id={`admin-note-${request.id}`} className="correction-note" maxLength={2000} value={notes[request.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Optional explanation for the decision" />
                    <div className="correction-actions">
                      <button type="button" className="correction-action correction-approve" disabled={busyId !== null} onClick={() => decide(request, "approved")}>{busyId === request.id ? "Processing…" : "Approve correction"}</button>
                      <button type="button" className="correction-action correction-reject" disabled={busyId !== null} onClick={() => decide(request, "rejected")}>{busyId === request.id ? "Processing…" : "Reject correction"}</button>
                    </div>
                  </>
                ) : (
                  <div className="correction-meta" style={{ marginTop: 14 }}>
                    Reviewed {dateTime(request.reviewed_at)} · Admin note: {request.admin_note || "—"}
                  </div>
                )}
              </article>
            ))}
        </div>
      </main>
    </>
  );
}
