
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getAllUsers,
  approveUser,
  deleteUser,
  getEntrySummary,
  getUserPriceEntries,
  logout,
} from "../services/api";
import FreshFlowChatbot from "../components/FreshFlowChatbot";

const styles = `
  * { box-sizing: border-box; }

  .admin-dashboard {
    min-height: 100vh;
    display: flex;
    background: #f5f7f4;
    color: #243328;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .admin-sidebar {
    width: 250px;
    flex-shrink: 0;
    background: #173d2b;
    color: white;
    padding: 26px 18px;
    display: flex;
    flex-direction: column;
  }

  .admin-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 10px 25px;
    border-bottom: 1px solid #ffffff25;
  }

  .admin-brand-logo {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: #e4efe2;
    color: #173d2b;
    font-weight: 800;
    font-size: 17px;
  }

  .admin-brand h2 { margin: 0; font-size: 16px; }
  .admin-brand p {
    margin: 5px 0 0;
    font-size: 10px;
    letter-spacing: 1.2px;
    color: #c5d9ca;
  }

  .admin-nav-label {
    margin: 27px 10px 12px;
    color: #a9c1af;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }

  .admin-nav-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 14px;
    margin: 3px 0;
    border: 0;
    border-radius: 10px;
    text-align: left;
    color: #dce9df;
    background: transparent;
    font-size: 13px;
    cursor: pointer;
  }

  .admin-nav-button.active,
  .admin-nav-button:hover { color: white; background: #ffffff20; }

  .admin-nav-icon { width: 20px; text-align: center; font-size: 17px; }
  .admin-sidebar-bottom { margin-top: auto; padding: 20px 8px 0; }

  .admin-sidebar-note {
    padding: 14px;
    border-radius: 12px;
    background: #ffffff12;
    font-size: 11px;
    line-height: 1.6;
    color: #d4e2d7;
  }

  .admin-sidebar-note strong {
    display: block;
    margin-bottom: 4px;
    color: white;
  }

  .admin-logout {
    width: 100%;
    margin-top: 15px;
    padding: 11px;
    border: 1px solid #ffffff35;
    border-radius: 9px;
    background: transparent;
    color: white;
    cursor: pointer;
  }

  .admin-main { flex: 1; min-width: 0; padding: 30px 36px; }

  .admin-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 32px;
  }

  .admin-breadcrumb { color: #758176; font-size: 12px; margin-bottom: 7px; }
  .admin-page-title { margin: 0; font-size: clamp(24px, 3vw, 31px); color: #203d2b; }
  .admin-page-subtitle { margin: 8px 0 0; font-size: 13px; line-height: 1.6; color: #7b857c; }

  .admin-profile {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 13px;
    border: 1px solid #e5eae3;
    border-radius: 12px;
    background: white;
    max-width: 280px;
  }

  .admin-avatar {
    width: 39px;
    height: 39px;
    flex-shrink: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #e1ede0;
    color: #28573a;
    font-weight: 800;
  }

  .admin-profile-name { overflow-wrap: anywhere; font-size: 12px; font-weight: 700; }
  .admin-profile-role { margin-top: 4px; font-size: 11px; color: #7c887d; overflow-wrap: anywhere; }
  .admin-eyebrow { margin: 0 0 14px; color: #798579; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }

  .admin-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .admin-stat-card { padding: 21px; border: 1px solid #e7ebe5; border-radius: 15px; background: white; min-width: 0; }
  .admin-stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .admin-stat-icon { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 12px; background: #e9f2e8; font-size: 18px; }
  .admin-stat-number { margin: 20px 0 5px; color: #213c2b; font-size: 30px; font-weight: 750; overflow-wrap: anywhere; }
  .admin-stat-label { color: #758075; font-size: 12px; }
  .admin-stat-caption { margin-top: 12px; color: #89938a; font-size: 10px; line-height: 1.5; }

  .admin-panel { overflow: hidden; border: 1px solid #e5eae3; border-radius: 15px; background: white; }
  .admin-panel-header { padding: 22px 23px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid #edf0eb; }
  .admin-panel-header h2 { margin: 0; color: #233c2b; font-size: 16px; }
  .admin-panel-header p { margin: 6px 0 0; color: #828c82; font-size: 12px; line-height: 1.5; }
  .admin-panel-actions { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }

  .admin-select, .admin-search {
    min-height: 38px;
    padding: 9px 11px;
    border: 1px solid #dfe6dd;
    border-radius: 8px;
    color: #344437;
    background: white;
    font-size: 12px;
    outline-color: #6e9a74;
  }

  .admin-search { width: 190px; max-width: 100%; }

  .admin-refresh-button {
    min-height: 38px;
    padding: 9px 13px;
    border: 1px solid #dfe6dd;
    border-radius: 8px;
    background: white;
    color: #315a3b;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .admin-refresh-button:disabled,
  .admin-approve-button:disabled,
  .admin-delete-button:disabled { opacity: .55; cursor: not-allowed; }

  .admin-table-wrap { overflow-x: auto; }
  .admin-table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
  .admin-table th { padding: 14px 20px; color: #7b877b; background: #fafbf9; font-size: 10px; letter-spacing: .8px; }
  .admin-table td { padding: 16px 20px; border-top: 1px solid #f0f2ee; color: #4b594c; font-size: 12px; }
  .admin-table tbody tr:hover { background: #fcfdfb; }

  .admin-user-cell { display: flex; align-items: center; gap: 10px; }
  .admin-user-avatar { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: #edf3eb; color: #315d3b; font-weight: 800; }
  .admin-user-name { color: #293d2e; font-weight: 700; }
  .admin-user-username { margin-top: 4px; color: #8a948a; font-size: 11px; }

  .admin-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 30px;
    font-size: 10px;
    font-weight: 750;
    text-transform: capitalize;
  }

  .admin-status.approved { background: #e7f4e8; color: #28683a; }
  .admin-status.pending { background: #fff3dc; color: #93651b; }
  .admin-status.other { background: #eef0ee; color: #59645a; }
  .admin-role-badge { text-transform: capitalize; color: #5f6c60; }

  .admin-approve-button {
    border: 0;
    border-radius: 8px;
    padding: 9px 12px;
    background: #245638;
    color: white;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .admin-approved-label { color: #39804b; font-size: 11px; font-weight: 700; }

  .admin-row-actions { display: flex; align-items: center; gap: 10px; }
  .admin-delete-button {
    border: 1px solid #f0d0cc;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fff5f3;
    color: #a53d32;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .admin-message { margin: 18px 22px; padding: 13px 15px; border-radius: 9px; font-size: 12px; line-height: 1.6; }
  .admin-message.error { background: #fff0ee; color: #a53d32; border: 1px solid #f4d2cd; }
  .admin-message.success { background: #edf7ed; color: #28633b; border: 1px solid #d4ead5; }

  .admin-table-state { padding: 42px 20px; text-align: center; color: #7d887e; font-size: 13px; }
  .admin-table-state strong { display: block; margin-bottom: 7px; color: #405443; }
  .admin-footer { margin-top: 20px; display: flex; justify-content: space-between; gap: 12px; color: #899389; font-size: 11px; }


  .admin-user-name-button {
    display: block;
    padding: 0;
    border: 0;
    background: transparent;
    color: #245a38;
    text-align: left;
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }
  .admin-user-name-button:hover { text-decoration: underline; }
  .admin-detail-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(16, 32, 22, 0.56);
    overflow-y: auto;
  }
  .admin-detail-modal {
    width: min(820px, 100%);
    max-height: min(90vh, 900px);
    overflow-y: auto;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 24px 80px #10201640;
  }
  .admin-detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 26px;
    background: #f0f6ef;
    border-bottom: 1px solid #e0e9df;
  }
  .admin-detail-title { margin: 0; color: #203d2b; font-size: 23px; }
  .admin-detail-subtitle { margin: 7px 0 0; color: #758176; font-size: 13px; }
  .admin-detail-close {
    width: 38px; height: 38px; border: 1px solid #dce6da;
    border-radius: 10px; background: white; color: #34513b;
    font-size: 22px; cursor: pointer; flex-shrink: 0;
  }
  .admin-detail-content { padding: 24px 26px 28px; }
  .admin-detail-section { margin-bottom: 25px; }
  .admin-detail-section:last-child { margin-bottom: 0; }
  .admin-detail-section h3 { margin: 0 0 14px; color: #2d4733; font-size: 14px; }
  .admin-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .admin-detail-field { min-width: 0; padding: 13px 14px; border: 1px solid #e7ece5; border-radius: 11px; background: #fbfcfa; }
  .admin-detail-label { margin-bottom: 6px; color: #7d897e; font-size: 10px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; }
  .admin-detail-value { color: #273b2c; font-size: 13px; overflow-wrap: anywhere; }
  .admin-entry-empty { padding: 22px; border: 1px dashed #ccd9ca; border-radius: 12px; background: #fafcf9; color: #748075; font-size: 13px; line-height: 1.65; }
  .admin-entry-empty strong { display: block; margin-bottom: 5px; color: #385440; }
  @media (max-width: 640px) {
    .admin-detail-backdrop { padding: 10px; }
    .admin-detail-header, .admin-detail-content { padding: 18px; }
    .admin-detail-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 1100px) {
    .admin-main { padding: 25px 22px; }
    .admin-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .admin-panel-header { align-items: flex-start; flex-direction: column; }
    .admin-panel-actions { width: 100%; }
  }

  @media (max-width: 720px) {
    .admin-dashboard { flex-direction: column; }
    .admin-sidebar { width: auto; padding: 16px; }
    .admin-brand { padding-bottom: 15px; }
    .admin-nav-label { margin-top: 17px; }
    .admin-sidebar .admin-nav-button { width: auto; display: inline-flex; margin-right: 5px; }
    .admin-sidebar-bottom { padding-top: 12px; }
    .admin-sidebar-note { display: none; }
    .admin-logout { margin-top: 10px; }
    .admin-main { padding: 23px 14px; }
    .admin-topbar { align-items: flex-start; flex-direction: column; margin-bottom: 25px; }
    .admin-profile { max-width: 100%; }
    .admin-stat-grid { gap: 10px; }
    .admin-stat-card { padding: 15px; }
    .admin-stat-number { font-size: 25px; }
    .admin-search { flex: 1; width: auto; }
    .admin-footer { flex-direction: column; }
  }
`;

const normalizeStatus = (status) =>
  String(status ?? "").trim().toLowerCase();

const normalizeUser = (user) => ({
  ...user,
  status: normalizeStatus(user.status),
});

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (
    parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "VG"
  );
};

const getRoleName = (user) => {
  const role = user?.role;
  if (typeof role === "string") return role.toLowerCase();
  return String(role?.name || role?.role_name || "").toLowerCase();
};

function AdminPage() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");

  const loadDashboard = useCallback(
    async ({ initial = false } = {}) => {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      try {
        const [currentAdmin, userList, entrySummary] = await Promise.all([
          getCurrentUser(),
          getAllUsers(),
          getEntrySummary(),
        ]);

        if (getRoleName(currentAdmin) !== "admin") {
          logout();
          navigate("/", { replace: true });
          return;
        }

        setAdmin(currentAdmin);

        const normalizedUsers = Array.isArray(userList)
          ? userList.map(normalizeUser)
          : [];

        setUsers(normalizedUsers);
        setTotalEntries(Number(entrySummary?.total_entries || 0));
      } catch (error) {
        console.error("Failed to load user management:", error);

        const message = error?.message || "Unable to load user data.";
        const lowerMessage = message.toLowerCase();

        if (
          lowerMessage.includes("token") ||
          lowerMessage.includes("unauthorized") ||
          lowerMessage.includes("authentication") ||
          lowerMessage.includes("credentials")
        ) {
          logout();
          navigate("/", { replace: true });
          return;
        }

        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadDashboard({ initial: true });
  }, [loadDashboard]);

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setSelectedEntries([]);
    setEntriesError("");
    setEntriesLoading(true);
    try {
      const records = await getUserPriceEntries(user.id);
      setSelectedEntries(Array.isArray(records) ? records : []);
    } catch (error) {
      setEntriesError(error?.message || "Unable to load this user's entries.");
    } finally {
      setEntriesLoading(false);
    }
  };

  const portalUsers = useMemo(
    () => users.filter((user) => getRoleName(user) !== "admin"),
    [users]
  );

  const userStats = useMemo(() => {
    const statuses = portalUsers.map((user) => normalizeStatus(user.status));
    return {
      totalUsers: portalUsers.length,
      pending: statuses.filter((status) => status === "pending").length,
      approved: statuses.filter((status) => status === "approved").length,
      active: portalUsers.filter(
        (user) => user.is_active === true || normalizeStatus(user.status) === "active"
      ).length,
    };
  }, [portalUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return portalUsers.filter((user) => {
      const status = normalizeStatus(user.status);

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && status === "pending") ||
        (filter === "approved" && status === "approved") ||
        (filter === "other" && status !== "pending" && status !== "approved");

      const searchableValues = [
        user.full_name,
        user.username,
        user.email,
        user.phone,
        getRoleName(user),
        status,
      ];

      const matchesSearch =
        !term ||
        searchableValues
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesFilter && matchesSearch;
    });
  }, [portalUsers, filter, search]);

  const handleApprove = async (user) => {
    const userId = user.id;

    // Only pending accounts can be approved.
    if (
      !userId ||
      normalizeStatus(user.status) !== "pending" ||
      approvingId !== null
    ) {
      return;
    }

    setApprovingId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Wait for the backend to confirm the approval.
      await approveUser(userId);

      // Update the UI only after the API call succeeds.
      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.id === userId
            ? { ...item, status: "approved" }
            : item
        )
      );

      setSuccessMessage(
        `${user.full_name || user.username || "User"} has been approved successfully.`
      );

      // Do not reload immediately here; the successful API response
      // and the local update are sufficient for this row.
    } catch (error) {
      console.error("User approval failed:", error);
      setErrorMessage(error?.message || "Unable to approve this user.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (user) => {
    const userId = user?.id;
    if (!userId || deletingId !== null || approvingId !== null) return;

    const displayName = user.full_name || user.username || user.email || "this user";
    const confirmed = window.confirm(
      `Remove ${displayName} from FreshFlow? This permanently deletes the account and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteUser(userId);
      setUsers((previousUsers) => previousUsers.filter((item) => item.id !== userId));
      setSuccessMessage(`${displayName} was removed successfully.`);
    } catch (error) {
      console.error("User removal failed:", error);
      setErrorMessage(error?.message || "Unable to remove this user.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const scrollToUsers = (nextFilter) => {
    setFilter(nextFilter);
    document
      .getElementById("admin-user-management")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{styles}</style>

      <div className="admin-dashboard">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-logo">VG</div>
            <div>
              <h2>Veegronex</h2>
              <p>FRESHFLOW PORTAL</p>
            </div>
          </div>

          <div className="admin-nav-label">WORKSPACE</div>

          <button
            type="button"
            className="admin-nav-button active"
            onClick={() => scrollToUsers("all")}
          >
            <span className="admin-nav-icon">♙</span>
            User management
          </button>

          <button
            type="button"
            className="admin-nav-button"
            onClick={() => navigate("/admin/vegetables")}
          >
            <span className="admin-nav-icon">♧</span>
            Vegetable management
          </button>

          <button
            type="button"
            className="admin-nav-button"
            onClick={() => navigate("/admin/corrections")}
          >
            <span className="admin-nav-icon">↺</span>
            Price corrections
          </button>

          
          <button
            type="button"
            className="admin-nav-button"
            onClick={() => navigate("/admin/analytics")}
          >
            <span className="admin-nav-icon">▥</span>
            Price analytics
          </button>



          <div className="admin-sidebar-bottom">
            <div className="admin-sidebar-note">
              <strong>Secure administration</strong>
              Admin actions are protected by your authenticated backend session.
            </div>

            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
            >
              ↪ &nbsp; Sign out
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <div className="admin-breadcrumb">
                Workspace / User Management
              </div>
              <h1 className="admin-page-title">User Management</h1>
              <p className="admin-page-subtitle">
                View user profiles, review their records, and manage account access.
              </p>
            </div>

            <div className="admin-profile">
              <div className="admin-avatar">
                {getInitials(admin?.full_name || admin?.username)}
              </div>
              <div>
                <div className="admin-profile-name">
                  {admin?.full_name || admin?.username || "Administrator"}
                </div>
                <div className="admin-profile-role">
                  {admin?.email || "Administrator account"}
                </div>
              </div>
            </div>
          </header>

          <section className="admin-stat-grid" aria-label="User management summary">
            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon">▤</span>
                <span className="admin-stat-label">Total Entries</span>
              </div>
              <div className="admin-stat-number">{totalEntries}</div>
              <div className="admin-stat-caption">Saved vegetable price entries</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon">◷</span>
                <span className="admin-stat-label">Total Pending</span>
              </div>
              <div className="admin-stat-number">{userStats.pending}</div>
              <div className="admin-stat-caption">Accounts awaiting approval</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon">✓</span>
                <span className="admin-stat-label">Total Approved</span>
              </div>
              <div className="admin-stat-number">{userStats.approved}</div>
              <div className="admin-stat-caption">Approved portal accounts</div>
            </article>

            <article className="admin-stat-card">
              <div className="admin-stat-top">
                <span className="admin-stat-icon">●</span>
                <span className="admin-stat-label">Total Active</span>
              </div>
              <div className="admin-stat-number">{userStats.active}</div>
              <div className="admin-stat-caption">Accounts marked active</div>
            </article>
          </section>

          <section
            className="admin-panel"
            id="admin-user-management"
            aria-labelledby="users-heading"
          >
            <div className="admin-panel-header">
              <div>
                <h2 id="users-heading">User management</h2>
                <p>
                  Select a user to view their profile details and available entries.
                </p>
              </div>

              <div className="admin-panel-actions">
                <input
                  className="admin-search"
                  type="search"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search accounts"
                />

                <select
                  className="admin-select"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  aria-label="Filter users by status"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="other">Other statuses</option>
                </select>

                <button
                  type="button"
                  className="admin-refresh-button"
                  onClick={() => loadDashboard()}
                  disabled={refreshing || loading || approvingId !== null || deletingId !== null}
                >
                  {refreshing ? "Refreshing..." : "↻ Refresh"}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="admin-message error" role="alert">
                <strong>Could not complete the request.</strong>
                <div>{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="admin-message success" role="status">
                {successMessage}
              </div>
            )}

            {loading ? (
              <div className="admin-table-state">
                <strong>Loading users...</strong>
                Retrieving user records.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>CONTACT</th>
                      <th>ROLE</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {
                      const status = normalizeStatus(user.status);
                      const statusClass =
                        status === "approved"
                          ? "approved"
                          : status === "pending"
                            ? "pending"
                            : "other";

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar">
                                {getInitials(user.full_name || user.username)}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  className="admin-user-name-button"
                                  onClick={() => openUserDetails(user)}
                                  aria-label={`View details for ${user.full_name || user.username || "user"}`}
                                >
                                  {user.full_name || "—"}
                                </button>
                                <div className="admin-user-username">
                                  @{user.username || "unknown"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div>{user.email || "—"}</div>
                            <div
                              style={{
                                marginTop: 5,
                                color: "#899389",
                                fontSize: 11,
                              }}
                            >
                              {user.phone || "No phone listed"}
                            </div>
                          </td>

                          <td>
                            <span className="admin-role-badge">
                              {getRoleName(user) || "user"}
                            </span>
                          </td>

                          <td>
                            <span className={`admin-status ${statusClass}`}>
                              <span aria-hidden="true">●</span>
                              {status || "unknown"}
                            </span>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              {status === "pending" ? (
                                <button
                                  type="button"
                                  className="admin-approve-button"
                                  onClick={() => handleApprove(user)}
                                  disabled={approvingId !== null || deletingId !== null}
                                >
                                  {approvingId === user.id ? "Approving..." : "Approve"}
                                </button>
                              ) : status === "approved" ? (
                                <span className="admin-approved-label">✓ Approved</span>
                              ) : (
                                <span style={{ color: "#899389" }}>—</span>
                              )}
                              <button
                                type="button"
                                className="admin-delete-button"
                                onClick={() => handleDelete(user)}
                                disabled={deletingId !== null || approvingId !== null}
                                aria-label={`Remove ${user.full_name || user.username || "user"}`}
                              >
                                {deletingId === user.id ? "Removing..." : "Remove"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="admin-table-state">
                    <strong>No accounts found</strong>
                    {search
                      ? "Try another search term."
                      : filter === "pending"
                        ? "There are no accounts awaiting approval."
                        : "No accounts match the selected filter."}
                  </div>
                )}
              </div>
            )}
          </section>

          {selectedUser && (
            <div
              className="admin-detail-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedUser(null);
              }}
            >
              <section
                className="admin-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="selected-user-title"
              >
                <header className="admin-detail-header">
                  <div>
                    <h2 id="selected-user-title" className="admin-detail-title">
                      {selectedUser.full_name || selectedUser.username || "User details"}
                    </h2>
                    <p className="admin-detail-subtitle">
                      @{selectedUser.username || "unknown"} · Account ID {selectedUser.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-detail-close"
                    onClick={() => setSelectedUser(null)}
                    aria-label="Close user details"
                  >
                    ×
                  </button>
                </header>

                <div className="admin-detail-content">
                  <section className="admin-detail-section">
                    <h3>Profile information</h3>
                    <div className="admin-detail-grid">
                      {[
                        ["Full name", selectedUser.full_name],
                        ["Username", selectedUser.username],
                        ["Email address", selectedUser.email],
                        ["Phone number", selectedUser.phone],
                        ["Role", getRoleName(selectedUser) || "user"],
                        ["Account status", normalizeStatus(selectedUser.status) || "unknown"],
                        ["Email verified", selectedUser.email_verified ? "Yes" : "No"],
                        ["Multi-factor authentication", selectedUser.mfa_enabled ? "Enabled" : "Disabled"],
                        ["Registered on", formatDate(selectedUser.created_at)],
                        ["Approved on", formatDate(selectedUser.approved_at)],
                        ["Approved by admin ID", selectedUser.approved_by ?? "—"],
                      ].map(([label, value]) => (
                        <div className="admin-detail-field" key={label}>
                          <div className="admin-detail-label">{label}</div>
                          <div className="admin-detail-value">
                            {value === null || value === undefined || value === "" ? "—" : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="admin-detail-section">
                    <h3>User entries ({selectedEntries.length})</h3>
                    {entriesLoading ? (
                      <div className="admin-entry-empty">Loading this user's price entries…</div>
                    ) : entriesError ? (
                      <div className="admin-entry-empty"><strong>Could not load entries</strong>{entriesError}</div>
                    ) : selectedEntries.length === 0 ? (
                      <div className="admin-entry-empty">This user has not submitted any vegetable price entries yet.</div>
                    ) : (
                      <div style={{ overflowX: "auto", border: "1px solid #e7ece5", borderRadius: 10 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 440 }}>
                          <thead><tr style={{ background: "#f7faf6", color: "#758176", textAlign: "left" }}>
                            <th style={{ padding: 11 }}>VEGETABLE</th><th style={{ padding: 11 }}>PRICE</th><th style={{ padding: 11 }}>SUBMITTED AT</th><th style={{ padding: 11 }}>NOTES</th>
                          </tr></thead>
                          <tbody>{selectedEntries.map((entry) => (
                            <tr key={entry.id} style={{ borderTop: "1px solid #edf1eb" }}>
                              <td style={{ padding: 11, fontWeight: 700 }}>{entry.vegetable}</td>
                              <td style={{ padding: 11, whiteSpace: "nowrap" }}>₹{Number(entry.price).toFixed(2)} / {entry.unit}</td>
                              <td style={{ padding: 11, whiteSpace: "nowrap" }}>{formatDateTime(entry.created_at || entry.entry_date)}</td>
                              <td style={{ padding: 11 }}>{entry.notes || "—"}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              </section>
            </div>
          )}

          <footer className="admin-footer">
            <span>Veegronex FreshFlow · Administration</span>
            <span>Account information supplied by the API</span>
          </footer>
        </main>
      </div>
      <FreshFlowChatbot />
    </>
  );
}

export default AdminPage;
