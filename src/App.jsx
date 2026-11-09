
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import "./App.css";

// Load each page only when its route is visited.
const LandingPage = lazy(() => import("./pages/LandingPage"));
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

const CustomerInformationPage = lazy(
  () => import("./pages/CustomerInformationPage")
);

function PageLoader() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <h2>FreshFlow</h2>
      <p>Preparing your dashboard...</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User page */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRole="user">
              <UserPage />
            </ProtectedRoute>
          }
        />

        {/* Shared protected admin layout */}
        <Route
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin user management */}
          <Route
            path="/admin"
            element={<AdminPage />}
          />

          {/* Vegetable management */}
          <Route
            path="/admin/vegetables"
            element={<AdminVegetablesPage />}
          />

          {/* Price correction requests */}
          <Route
            path="/admin/corrections"
            element={<AdminCorrectionRequestsPage />}
          />

          {/* Price analytics */}
          <Route
            path="/admin/analytics"
            element={<AdminAnalyticsPage />}
          />

          {/* Customer information */}
          <Route
            path="/admin/customers"
            element={<CustomerInformationPage />}
          />
        </Route>

        {/* Redirect unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Suspense>
  );
}

export default App;
