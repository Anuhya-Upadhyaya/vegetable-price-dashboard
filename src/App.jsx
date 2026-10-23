
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// Load pages only when their routes are visited.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const UserPage = lazy(() => import("./pages/UserPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminVegetablesPage = lazy(
  () => import("./pages/AdminVegetablesPage")
);
const AdminCorrectionRequestsPage = lazy(
  () => import("./pages/AdminCorrectionRequestsPage")
);
const AdminAnalyticsPage = lazy(
  () => import("./pages/AdminAnalyticsPage")
);

function App() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            fontFamily: "Arial, sans-serif",
            color: "#173c2a",
          }}
        >
          Loading FreshFlow...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRole="user">
              <UserPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/vegetables"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminVegetablesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/corrections"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminCorrectionRequestsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
