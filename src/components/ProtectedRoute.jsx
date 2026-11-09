
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  getToken,
  getCurrentUser,
  sendHeartbeat,
  logout,
} from "../services/api";

// Get the user's role safely from the API response.
function getRoleName(user) {
  const role = user?.role;

  if (typeof role === "string") {
    return role.toLowerCase();
  }

  if (role && typeof role.name === "string") {
    return role.name.toLowerCase();
  }

  if (typeof user?.role_name === "string") {
    return user.role_name.toLowerCase();
  }

  return "";
}

function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
  let isMounted = true;
  let heartbeatInterval;

  const verifyAuthentication = async () => {
    const token = getToken();

    if (!token) {
      if (isMounted) {
        setUser(null);
        setLoading(false);
      }
      return;
    }

    try {
      const currentUser = await getCurrentUser();

      if (!isMounted) return;

      setUser(currentUser);

      // Record activity immediately.
      sendHeartbeat().catch((error) => {
        console.error("Initial heartbeat failed:", error.message);
      });

      // Record activity every 60 seconds.
      heartbeatInterval = setInterval(() => {
        sendHeartbeat().catch((error) => {
          console.error("Heartbeat failed:", error.message);
        });
      }, 60 * 1000);

    } catch (error) {
      console.error("Authentication verification failed:", error.message);

      logout();

      if (isMounted) {
        setUser(null);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  verifyAuthentication();

  return () => {
    isMounted = false;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  };
}, []);

  // Display a loading screen while authentication is checked.
  if (loading) {
    return (
      <div className="protected-route-loading">
        <p>Verifying your account...</p>
      </div>
    );
  }

  // Redirect unauthenticated users to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verify the user's role.
  const userRole = getRoleName(user);
  const requiredRole =
    typeof allowedRole === "string"
      ? allowedRole.toLowerCase()
      : "";

  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "admin") {
      return <Navigate to="/admin" replace />;
    }

    if (userRole === "user") {
      return <Navigate to="/user" replace />;
    }

    logout();
    return <Navigate to="/login" replace />;
  }

  // Authentication and role verification passed.
  return children;
}

export default ProtectedRoute;
