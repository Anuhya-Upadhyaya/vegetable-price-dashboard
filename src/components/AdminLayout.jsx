
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="freshflow-admin-layout">
      <AdminSidebar />

      <div className="freshflow-admin-content">
        <Outlet />
      </div>

      <style>{`
        .freshflow-admin-content {
          min-height: 100vh;
          min-width: 0;
          margin-left: 245px;
          width: calc(100% - 245px);
        }

        @media (max-width: 760px) {
          .freshflow-admin-content {
            margin-left: 205px;
            width: calc(100% - 205px);
          }
        }
      `}</style>
    </div>
  );
}
