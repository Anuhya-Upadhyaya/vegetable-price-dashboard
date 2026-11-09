import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approveCorrection, getCorrections, getCurrentUser, logout, rejectCorrection } from "../services/api";

const money = (n) => `₹${Number(n).toFixed(2)}`;
const stamp = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function Change({ from, to }) {
  const pct = Number(from) ? ((Number(to) - Number(from)) / Number(from)) * 100 : 0;
  const up = pct >= 0;
  return (
    <span className="ac-change">
      <s>{money(from)}</s> → <strong>{money(to)}</strong>{" "}
      <span className={`ac-pct ${up ? "up" : "down"}`}>{up ? "+" : ""}{pct.toFixed(1)}%</span>
    </span>
  );
}

export default function AdminCorrectionsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, list] = await Promise.all([getCurrentUser(), getCorrections()]);
      const role = typeof me?.role === "string" ? me.role.toLowerCase() : String(me?.role?.name || "").toLowerCase();
      if (role !== "admin") { logout(); navigate("/login", { replace: true }); return; }
      setAdmin(me);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || "Unable to load correction requests.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: items.length };
    items.forEach((i) => { if (c[i.status] !== undefined) c[i.status] += 1; });
    return c;
  }, [items]);
  const visible = useMemo(() => (tab === "all" ? items : items.filter((i) => i.status === tab)), [items, tab]);

  const decide = async (item, decision) => {
    const note = (notes[item.id] || "").trim();
    setErrors((e) => ({ ...e, [item.id]: "" }));
    setError(""); setSuccess("");
    if (decision === "reject" && note.length < 3) {
      setErrors((e) => ({ ...e, [item.id]: "Please give a reason for rejecting this request." }));
      return;
    }
    setBusyId(item.id);
    try {
      const updated = decision === "approve" ? await approveCorrection(item.id, note) : await rejectCorrection(item.id, note);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSuccess(decision === "approve"
        ? `Approved: ${updated.vegetable} is now ${money(updated.proposed_price)} / ${updated.unit}. The original ${money(updated.original_price)} is kept in the history.`
        : `Rejected the request for ${updated.vegetable}. The entry was not changed.`);
    } catch (e) {
      setErrors((prev) => ({ ...prev, [item.id]: e?.message || "Could not save your decision." }));
      load(); // another admin may have decided it already — show the current state
    } finally {
      setBusyId(null);
    }
  };

  const signOut = () => { logout(); navigate("/login", { replace: true }); };

  return (
    <div className="ac-page">
      <style>{`
        *{box-sizing:border-box}.ac-page{min-height:100vh;background:#f3f6f1;color:#20382a;padding:26px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ac-shell{max-width:980px;margin:auto}
        .ac-top{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:24px}.ac-brand{display:flex;gap:12px;align-items:center}.ac-logo{width:44px;height:44px;display:grid;place-items:center;background:#1d5638;color:#fff;border-radius:13px;font-weight:900}.ac-brand b{letter-spacing:1.1px;font-size:12px}.ac-muted{color:#78877a;font-size:12px;margin-top:5px;line-height:1.5}
        .ac-actions{display:flex;gap:9px;flex-wrap:wrap}.ac-btn{border:1px solid #d7e2d5;background:#fff;color:#31563c;border-radius:10px;padding:10px 13px;font-weight:750;cursor:pointer;font:inherit;font-size:13px}.ac-btn.primary{background:#1e5b38;color:#fff;border-color:#1e5b38}.ac-btn.danger{background:#fff;color:#a0372b;border-color:#efc9c4}.ac-btn:disabled{opacity:.55;cursor:wait}
        .ac-heading small{color:#5d805f;letter-spacing:1.5px;font-weight:900;font-size:11px}.ac-heading h1{font-size:clamp(26px,4vw,36px);margin:7px 0}.ac-heading p{color:#758276;line-height:1.6;margin:0 0 20px}
        .ac-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}.ac-tab{border:1px solid #dce5d9;background:#fff;color:#536a57;padding:9px 14px;border-radius:10px;cursor:pointer;font-weight:800;font:inherit;font-size:13px}.ac-tab.active{background:#1e5b38;color:#fff;border-color:#1e5b38}.ac-tab span{opacity:.75;margin-left:6px}
        .ac-message{padding:12px 14px;border-radius:10px;margin:0 0 14px;font-size:13px;line-height:1.5}.ac-message.error{background:#fff0ee;color:#a0372b}.ac-message.success{background:#eaf7ed;color:#216337}
        .ac-card{background:#fff;border:1px solid #e3eae0;border-radius:16px;padding:18px 20px;margin-bottom:14px;box-shadow:0 8px 24px #24492b0a}.ac-row{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}.ac-veg{font-size:17px;font-weight:850}.ac-change{font-size:15px}.ac-change s{color:#8a968b}.ac-pct{font-size:12px;font-weight:800;border-radius:20px;padding:3px 8px;margin-left:4px}.ac-pct.up{background:#eaf7ed;color:#216337}.ac-pct.down{background:#fff0ee;color:#a0372b}
        .ac-badge{font-size:11px;font-weight:800;border-radius:20px;padding:4px 10px}.ac-badge.pending{background:#fff6e0;color:#8a6410}.ac-badge.approved{background:#eaf7ed;color:#216337}.ac-badge.rejected{background:#fff0ee;color:#a0372b}
        .ac-reason{background:#f8faf7;border-radius:10px;padding:11px 13px;margin:12px 0;font-size:13px;line-height:1.55}.ac-reason b{display:block;font-size:11px;letter-spacing:.7px;color:#829082;margin-bottom:3px}
        .ac-review{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;margin-top:6px}.ac-review input{flex:1;min-width:200px;border:1px solid #dce5d9;border-radius:10px;padding:10px 12px;font:inherit;font-size:13px;background:#fbfcfa}.ac-inline-error{color:#a0372b;font-size:12px;margin-top:8px}
        .ac-empty{background:#fff;border:1px dashed #d7e2d5;border-radius:16px;padding:42px 22px;text-align:center;color:#839084;font-size:13px;line-height:1.6}
        @media(max-width:700px){.ac-page{padding:16px 12px}.ac-top{align-items:flex-start}}
      `}</style>
      <div className="ac-shell">
        <header className="ac-top">
          <div className="ac-brand"><div className="ac-logo">VG</div><div><b>VEEGRONEX GLOBAL TRADE</b><div className="ac-muted">FreshFlow · Administrator</div></div></div>
          <div className="ac-actions">
            <button className="ac-btn" onClick={() => navigate("/admin")}>← User Management</button>
            <button className="ac-btn" onClick={() => navigate("/admin/vegetables")}>Vegetables</button>
            <button className="ac-btn" onClick={signOut}>Sign out ↗</button>
          </div>
        </header>

        <div className="ac-heading">
          <small>ADMIN WORKSPACE / PRICE CORRECTIONS</small>
          <h1>Price Correction Requests</h1>
          <p>Users cannot edit submitted prices. They send a request with a reason, and the price only changes if you approve it. The original value is always kept in the history.</p>
        </div>

        <nav className="ac-tabs" aria-label="Filter requests">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`ac-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}<span>{counts[t.key]}</span>
            </button>
          ))}
          <button type="button" className="ac-btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
        </nav>

        {error && <div className="ac-message error" role="alert">{error}</div>}
        {success && <div className="ac-message success" role="status">{success}</div>}

        {loading && items.length === 0 ? <div className="ac-empty">Loading correction requests…</div>
          : visible.length === 0 ? <div className="ac-empty">{tab === "pending" ? "No pending correction requests. 🎉" : "Nothing to show here yet."}</div>
          : visible.map((item) => (
            <article className="ac-card" key={item.id}>
              <div className="ac-row">
                <div>
                  <div className="ac-veg">{item.vegetable} <span className="ac-muted">per {item.unit}</span></div>
                  <Change from={item.original_price} to={item.proposed_price} />
                  <div className="ac-muted">Entry recorded {stamp(item.entry_created_at)} · requested by <strong>{item.requester_name}</strong>{item.requested_by_user_id === null ? " (account removed)" : ""} · {stamp(item.created_at)}</div>
                </div>
                <span className={`ac-badge ${item.status}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
              </div>
              <div className="ac-reason"><b>USER'S REASON</b>{item.reason}</div>

              {item.status === "pending" ? (
                <>
                  <div className="ac-review">
                    <input
                      type="text" maxLength={1000} placeholder="Note to the user (required if rejecting)"
                      aria-label={`Review note for request ${item.id}`}
                      value={notes[item.id] || ""} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                    />
                    <button className="ac-btn primary" disabled={busyId === item.id} onClick={() => decide(item, "approve")}>{busyId === item.id ? "Saving…" : "Approve & apply"}</button>
                    <button className="ac-btn danger" disabled={busyId === item.id} onClick={() => decide(item, "reject")}>Reject</button>
                  </div>
                  {errors[item.id] && <div className="ac-inline-error" role="alert">{errors[item.id]}</div>}
                </>
              ) : (
                <div className="ac-muted">{item.status === "approved" ? "Approved" : "Rejected"} by <strong>{item.reviewer_name || "an administrator"}</strong> · {stamp(item.reviewed_at)}{item.review_note ? ` · “${item.review_note}”` : ""}</div>
              )}
            </article>
          ))}

        <div className="ac-muted" style={{ marginTop: 20 }}>Signed in as {admin?.full_name || admin?.username || "Administrator"}. Decisions are validated and saved by the backend.</div>
      </div>
    </div>
  );
}
