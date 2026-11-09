
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCustomerProfiles } from "../services/api";
import "./CustomerInformationPage.css";

export default function CustomerInformationPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // =========================================
  // LOAD CUSTOMER INFORMATION
  // =========================================

  const loadCustomers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getAllCustomerProfiles();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid customer list.");
      }

      setCustomers(data);
    } catch (err) {
      setError(
        err?.message || "Unable to load customer information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // =========================================
  // CUSTOMER LOCATION
  // =========================================

  const getCustomerLocation = (customer) => {
    return [
      customer.street_address,
      customer.locality,
      customer.city,
      customer.state,
      customer.country,
      customer.postal_code,
    ]
      .filter(
        (value) =>
          value &&
          String(value).trim() !== "" &&
          String(value).trim() !== "Not provided"
      )
      .join(", ");
  };

  // =========================================
  // SEARCH FILTER
  // =========================================

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      const searchableFields = [
        customer.contact_name,
        customer.organization,
        customer.customer_type,
        customer.phone,
        customer.alternate_phone,
        customer.email,
        customer.user_email,
        customer.user_full_name,
        getCustomerLocation(customer),
      ];

      return searchableFields.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  // =========================================
  // DATE FORMATTING
  // =========================================

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================
  // CUSTOMER DETAILS
  // Hide fields with missing values
  // =========================================

  const detailRows = selectedCustomer
    ? [
        ["Contact Name", selectedCustomer.contact_name],
        ["Organization", selectedCustomer.organization],
        ["Customer Type", selectedCustomer.customer_type],
        ["Designation", selectedCustomer.designation],
        ["Registered Phone", selectedCustomer.phone],
        ["Alternate Phone", selectedCustomer.alternate_phone],
        ["Customer Email", selectedCustomer.email],
        ["Submitting User", selectedCustomer.user_full_name],
        ["User Account Email", selectedCustomer.user_email],
        ["Country", selectedCustomer.country],
        ["State", selectedCustomer.state],
        ["City", selectedCustomer.city],
        ["Locality", selectedCustomer.locality],
        ["Street Address", selectedCustomer.street_address],
        ["Postal Code", selectedCustomer.postal_code],
        ["Vegetables Required", selectedCustomer.vegetables],
        ["Expected Quantity", selectedCustomer.expected_quantity],
        ["Purchase Frequency", selectedCustomer.purchasing_frequency],
        ["Delivery Instructions", selectedCustomer.delivery_instructions],
        ["Additional Requirements", selectedCustomer.additional_notes],
        ["Submitted On", formatDate(selectedCustomer.created_at)],
      ].filter(([, value]) => {
        if (value === null || value === undefined) return false;

        const cleanedValue = String(value).trim();

        return cleanedValue !== "" && cleanedValue !== "—";
      })
    : [];

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="admin-dashboard customer-directory">
      <main className="admin-main customer-directory-main">

        {/* TOP NAVIGATION */}

        <div className="customer-directory-topline">
          <div className="customer-breadcrumb">
            <button
              type="button"
              className="customer-back-button"
              onClick={() => navigate("/admin")}
            >
              ← Back to Admin Dashboard
            </button>

            <span className="breadcrumb-divider">/</span>
            <strong>Customer Information</strong>
          </div>

          <span className="customer-live-indicator">
            <span className="live-dot" />
            Customer directory
          </span>
        </div>

        {/* HERO SECTION */}

        <section className="customer-hero">
          <div className="customer-hero-content">
            <span className="customer-eyebrow">
              FRESHFLOW · ADMIN WORKSPACE
            </span>

            <h1>Customer Information</h1>

            <p>
              Get a clear view of your registered customers, their
              business details, and contact information — all in one place.
            </p>
          </div>

          <div className="customer-hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-leaf">✦</div>

            <div className="hero-art-card">
              <span className="hero-art-icon">♧</span>
              <span>
                Growing
                <br />
                Together
              </span>
            </div>

            <span className="hero-spark spark-one">✧</span>
            <span className="hero-spark spark-two">✦</span>
          </div>
        </section>

        {/* SUMMARY */}

        <section className="customer-summary-row">
          <div className="customer-summary-card">
            <div className="summary-icon">♙</div>

            <div>
              <span className="summary-label">
                Total registered customers
              </span>

              <strong className="summary-value">
                {loading ? "—" : customers.length}
              </strong>

              <span className="summary-caption">
                Customer submissions and profiles
              </span>
            </div>
          </div>

          <div className="customer-summary-note">
            <span className="summary-note-icon">✧</span>

            <div>
              <strong>Your customer network</strong>
              <p>
                Customer details submitted through the User Portal.
              </p>
            </div>
          </div>
        </section>

        {/* CUSTOMER DIRECTORY */}

        <section className="customer-directory-panel">
          <div className="customer-panel-heading">
            <div>
              <span className="customer-section-label">
                DIRECTORY
              </span>

              <h2>Registered Customers</h2>

              <p>
                Browse and search customer contact and business details.
              </p>
            </div>

            <span className="customer-record-count">
              {loading
                ? "Loading..."
                : `${filteredCustomers.length} records`}
            </span>
          </div>

          {/* SEARCH AND REFRESH */}

          <div className="customer-toolbar">
            <div className="customer-search-box">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, company, mobile, email or location..."
                aria-label="Search customers"
              />

              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className="customer-back-button"
              onClick={() => loadCustomers(true)}
              disabled={loading || refreshing}
              style={{
                cursor: loading || refreshing ? "not-allowed" : "pointer",
                opacity: loading || refreshing ? 0.65 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {refreshing ? "↻ Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {/* LOADING / ERROR / TABLE */}

          {loading ? (
            <div className="customer-state">
              <div className="customer-spinner" />
              <strong>Loading customer directory</strong>
              <p>
                Please wait while customer information is retrieved.
              </p>
            </div>
          ) : error ? (
            <div className="customer-state customer-error">
              <span className="state-symbol">!</span>
              <strong>Unable to load customers</strong>
              <p>{error}</p>

              <button
                type="button"
                className="customer-back-button"
                onClick={() => loadCustomers(true)}
                disabled={refreshing}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="customer-table-scroll">
              <table className="customer-directory-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Company / Shop</th>
                    <th>Mobile Number</th>
                    <th>Customer Email</th>
                    <th>Location</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => {
                    const location = getCustomerLocation(customer);

                    return (
                      <tr key={`${customer.id}-${customer.created_at}`}>
                        <td>
                          <div className="customer-identity">
                            <span className="customer-avatar">
                              {(customer.contact_name || "C")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="customer-name">
                              {customer.contact_name || "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="customer-company">
                            {customer.organization || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="customer-contact">
                            {customer.phone ||
                              customer.alternate_phone ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span className="customer-email">
                            {customer.email || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="customer-location">
                            {location || "—"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            style={{
                              border: "1px solid #b7d2c1",
                              background: "#edf6ef",
                              color: "#24583a",
                              borderRadius: "8px",
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan="6">
                        <div className="customer-empty-state">
                          <span className="empty-state-icon">⌕</span>

                          <strong>
                            {search
                              ? "No matching customers"
                              : "No customer profiles yet"}
                          </strong>

                          <p>
                            {search
                              ? "Try another name, company, phone number, email, or location."
                              : "Customer submissions will appear here when users submit their information."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* FOOTER */}

          <div className="customer-panel-footer">
            <span>
              Showing {loading ? 0 : filteredCustomers.length} of{" "}
              {loading ? 0 : customers.length} customers
            </span>

            <span className="footer-status">
              <span className="footer-status-dot" />
              Directory overview
            </span>
          </div>
        </section>
      </main>

      {/* =========================================
          CUSTOMER DETAILS MODAL
      ========================================= */}

      {selectedCustomer && (
        <div
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(10, 25, 17, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-detail-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 20px 70px rgba(0,0,0,0.25)",
            }}
          >
            {/* MODAL HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "22px",
              }}
            >
              <div>
                <span className="customer-section-label">
                  CUSTOMER PROFILE
                </span>

                <h2
                  id="customer-detail-title"
                  style={{ margin: "8px 0" }}
                >
                  {selectedCustomer.contact_name || "Customer Details"}
                </h2>

                <p style={{ margin: 0, color: "#64746a" }}>
                  {selectedCustomer.organization || "Organization not provided"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close customer details"
                style={{
                  border: "none",
                  background: "#edf2ee",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  fontSize: "22px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* ONLY POPULATED DETAILS ARE DISPLAYED */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {detailRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: "13px",
                    background: "#f5f8f5",
                    borderRadius: "10px",
                    border: "1px solid #e5ede6",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#718078",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {label}
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#233b2d",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* MODAL FOOTER */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                className="customer-back-button"
                onClick={() => setSelectedCustomer(null)}
              >
                Close Details
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
