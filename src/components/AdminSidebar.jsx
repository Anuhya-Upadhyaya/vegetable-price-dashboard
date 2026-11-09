
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../services/api";

const navigationItems = [
  {
    label: "User management",
    icon: "♙",
    path: "/admin",
    end: true,
  },
  {
    label: "Vegetable management",
    icon: "♧",
    path: "/admin/vegetables",
  },
  {
    label: "Price corrections",
    icon: "↺",
    path: "/admin/corrections",
  },
  {
    label: "Price analytics",
    icon: "▥",
    path: "/admin/analytics",
  },
  {
    label: "Customer Information",
    icon: "♙",
    path: "/admin/customers",
  },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{`
        .freshflow-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 1000;
          width: 245px;
          height: 100vh;
          padding: 25px 17px;
          display: flex;
          flex-direction: column;
          background: #173d2b;
          color: #fff;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .freshflow-sidebar * {
          box-sizing: border-box;
        }

        .freshflow-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 24px;
          border-bottom: 1px solid #ffffff25;
        }

        .freshflow-sidebar-logo {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 13px;
          background: #e4efe2;
          color: #173d2b;
          font-size: 15px;
          font-weight: 800;
        }

        .freshflow-sidebar-brand h2 {
          margin: 0;
          font-size: 16px;
        }

        .freshflow-sidebar-brand p {
          margin: 5px 0 0;
          color: #c5d9ca;
          font-size: 10px;
          letter-spacing: 1.2px;
        }

        .freshflow-sidebar-label {
          margin: 27px 10px 12px;
          color: #a9c1af;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        .freshflow-sidebar-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          margin: 3px 0;
          border-radius: 10px;
          color: #dce9df;
          text-decoration: none;
          font-size: 13px;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .freshflow-sidebar-link:hover,
        .freshflow-sidebar-link.active {
          color: #fff;
          background: #ffffff20;
        }

        .freshflow-sidebar-icon {
          width: 20px;
          flex-shrink: 0;
          text-align: center;
          font-size: 17px;
        }

        .freshflow-sidebar-bottom {
          margin-top: auto;
          padding: 20px 8px 0;
        }

        .freshflow-sidebar-logout {
          width: 100%;
          padding: 11px;
          border: 1px solid #ffffff35;
          border-radius: 9px;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 13px;
        }

        .freshflow-sidebar-logout:hover {
          background: #ffffff15;
        }

        @media (max-width: 760px) {
          .freshflow-sidebar {
            width: 205px;
            padding: 20px 12px;
          }
        }
      `}</style>

      <aside className="freshflow-sidebar">
        <div className="freshflow-sidebar-brand">
          <div className="freshflow-sidebar-logo">VG</div>

          <div>
            <h2>Veegronex</h2>
            <p>FRESHFLOW PORTAL</p>
          </div>
        </div>

        <div className="freshflow-sidebar-label">
          WORKSPACE
        </div>

        <nav aria-label="Admin workspace navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `freshflow-sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className="freshflow-sidebar-icon">
                {item.icon}
              </span>

              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="freshflow-sidebar-bottom">
          <button
            type="button"
            className="freshflow-sidebar-logout"
            onClick={handleLogout}
          >
            ↪ &nbsp; Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
