import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../App.css";
import heroImage from "../assets/hero.jpg";

import {
  loginUser,
  saveToken,
  getCurrentUser,
} from "../services/api";

function Login() {
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // ==========================================
  // CLEAR LOGIN FORM
  // ==========================================

  const clearLoginFields = () => {
    setEmail("");
    setPassword("");
    setErrorMessage("");
  };

  // ==========================================
  // HANDLE LOGIN
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setLoading(true);

    try {
      // STEP 1: LOGIN THROUGH FASTAPI

      const loginData = await loginUser(
        email.trim(),
        password
      );

      if (!loginData.access_token) {
        throw new Error(
          "Login was successful, but no access token was received."
        );
      }

      // STEP 2: STORE JWT TOKEN

      saveToken(loginData.access_token);

      // STEP 3: GET CURRENT USER FROM BACKEND

      const currentUser = await getCurrentUser();

      // STEP 4: CLEAR PASSWORD

      setPassword("");

      // STEP 5: REDIRECT BASED ON BACKEND ROLE

      if (currentUser.role === "admin") {
        localStorage.setItem("portal_role", "admin");

        setEmail("");
        navigate("/admin");
      } else if (currentUser.role === "user") {
        localStorage.setItem("portal_role", "user");

        setEmail("");
        navigate("/user");
      } else {
        throw new Error(
          "Your account has an invalid role. Please contact the administrator."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      // REMOVE AUTH DATA IF LOGIN FAILED

      localStorage.removeItem("access_token");
      localStorage.removeItem("portal_role");

      setPassword("");

      // USER-FRIENDLY ERROR MESSAGES

      const errorText =
        error?.message?.toLowerCase() || "";

      if (
        errorText.includes("incorrect email") ||
        errorText.includes("password")
      ) {
        setErrorMessage(
          "Invalid email or password, or your account is not approved."
        );
      } else if (
        errorText.includes("connect") ||
        errorText.includes("failed to fetch")
      ) {
        setErrorMessage(
          "Unable to connect to the server. Please make sure the FastAPI backend is running."
        );
      } else {
        setErrorMessage(
          error?.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* BACK TO HOME BUTTON */}

      <button
        type="button"
        className="back-to-home"
        onClick={() => navigate("/")}
        aria-label="Back to Veegronex home page"
      >
        <span aria-hidden="true">←</span>
        Back to Home
      </button>

      {/* LEFT HERO */}

      <section
        className="login-hero"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(10, 45, 25, 0.05) 0%,
              rgba(5, 60, 32, 0.12) 30%,
              rgba(3, 58, 32, 0.35) 55%,
              rgba(2, 50, 28, 0.72) 78%,
              rgba(2, 43, 25, 0.96) 100%
            ),
            url(${heroImage})
          `,
        }}
      >
        <div className="hero-overlay">
          <div className="hero-content">

            <span className="hero-label">
              <span className="hero-dot"></span>
              DIRECT FROM SOURCE
            </span>

            <h1>
              Fresh prices,
              <br />
              straight from
              <br />
              the field.
            </h1>

            <p>
              A smarter way to manage daily vegetable prices,
              monitor market trends, and keep your business
              connected to fresh produce.
            </p>

            <div className="hero-bottom-line">
              <span></span>
              LIVE VEGETABLE PRICE MANAGEMENT
            </div>

          </div>
        </div>
      </section>

      {/* RIGHT LOGIN SECTION */}

      <section className="login-section">
        <div className="login-container">

          {/* COMPANY LOGO */}

          <div className="logo-placeholder">
            VG
          </div>

          <h2 className="company-name">
            Veegronex FreshFlow
          </h2>

          {/* LOGIN CARD */}

          <div className="login-card">

            <h3>
              Welcome back
            </h3>

            <p className="login-description">
              Sign in to access the vegetable price management portal.
            </p>

            {/* ROLE TOGGLE */}

            <div className="role-toggle">

              <button
                type="button"
                className={
                  role === "user" ? "active" : ""
                }
                onClick={() => {
                  setRole("user");
                  clearLoginFields();
                }}
                disabled={loading}
              >
                Portal User
              </button>

              <button
                type="button"
                className={
                  role === "admin" ? "active" : ""
                }
                onClick={() => {
                  setRole("admin");
                  clearLoginFields();
                }}
                disabled={loading}
              >
                Admin
              </button>

            </div>

            {/* ERROR MESSAGE */}

            {errorMessage && (
              <div
                className="login-error"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {/* LOGIN FORM */}

            <form
              onSubmit={handleLogin}
              autoComplete="off"
            >

              {/* EMAIL */}

              <div className="input-group">
                <label htmlFor="login-email">
                  EMAIL
                </label>

                <input
                  id="login-email"
                  name="login-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage("");
                  }}
                  required
                  disabled={loading}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              {/* PASSWORD */}

              <div className="input-group">
                <label htmlFor="login-password">
                  PASSWORD
                </label>

                <input
                  id="login-password"
                  name="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {/* FORGOT PASSWORD */}

              <div className="forgot-password">
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Password recovery will be implemented later."
                    )
                  }
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : "Sign in to Portal"}
              </button>

            </form>

            {/* REGISTRATION LINK */}

            {role === "user" && (
              <div className="register-link">
                <span>
                  Don't have an account?
                </span>

                <Link to="/register">
                  Create an account
                </Link>
              </div>
            )}

            {/* LOGIN INFORMATION */}

            <div className="demo-box">
              <strong>
                PORTAL ACCESS
              </strong>

              <p>
                Use your approved Veegronex FreshFlow account
                credentials to access the selected portal.
              </p>
            </div>

          </div>

          {/* SECURITY INFORMATION */}

          <div className="security-info">
            <span>
              🔒 Secure connection
            </span>

            <span className="system-status">
              ● System operational
            </span>
          </div>

        </div>
      </section>

    </div>
  );
}

export default Login;