import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  getToken,
  getCurrentUser,
  logout,
} from "../services/api";

function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyAuthentication = async () => {
      const token = getToken();

      // No JWT token means the user is not logged in
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Ask FastAPI who the logged-in user actually is
        const currentUser = await getCurrentUser();

        setUser(currentUser);
      } catch (error) {
        console.error(
          "Authentication verification failed:",
          error
        );

        // Invalid/expired token or unauthorized account
        logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuthentication();
  }, []);

  // While checking the backend
  if (loading) {
    return (
      <div className="protected-route-loading">
        <p>Verifying your account...</p>
      </div>
    );
  }

  // No authenticated user
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated but does not have
  // permission for this particular portal
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/user" replace />;
  }

  // Authentication and role verification passed
  return children;
}

export default ProtectedRoute;