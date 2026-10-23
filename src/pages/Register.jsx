import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

import { registerUser } from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ============================================================
  // HANDLE INPUT CHANGES
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  // ============================================================
  // HANDLE REGISTRATION
  // ============================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const {
      full_name,
      username,
      email,
      phone,
      password,
      confirmPassword,
    } = formData;

    // ==========================================================
    // BASIC VALIDATION
    // ==========================================================

    if (
      !full_name.trim() ||
      !username.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage("Please fill in all the fields.");
      return;
    }

    // ==========================================================
    // PASSWORD LENGTH
    // ==========================================================

    if (password.length < 8) {
      setErrorMessage(
        "Your password must contain at least 8 characters."
      );
      return;
    }

    // ==========================================================
    // PASSWORD MATCH
    // ==========================================================

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    // ==========================================================
    // EMAIL VALIDATION
    // ==========================================================

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    // ==========================================================
    // PHONE VALIDATION
    // ==========================================================

    if (!/^\+?[0-9\s()-]{7,20}$/.test(phone.trim())) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // SEND REGISTRATION DATA TO FASTAPI
      // ========================================================

      const response = await registerUser({
        full_name: full_name.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password,
        confirm_password: confirmPassword,
      });

      // ========================================================
      // REGISTRATION SUCCESS
      // ========================================================

      setSuccessMessage(
        response?.message ||
          "Registration submitted successfully. Awaiting administrator approval."
      );

      // Clear the form after successful registration
      setFormData({
        full_name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Registration error:", error);

      // ========================================================
      // REGISTRATION ERROR
      // ========================================================

      setErrorMessage(
        error?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">

      {/* ======================================================
          REGISTRATION CARD
      ====================================================== */}

      <section className="register-card">

        {/* ====================================================
            BRAND
        ==================================================== */}

        <div className="register-brand">

          <div className="register-logo">
            VG
          </div>

          <div>
            <h1>Veegronex FreshFlow</h1>
            <p>Fresh produce. Smarter decisions.</p>
          </div>

        </div>


        {/* ====================================================
            HEADING
        ==================================================== */}

        <div className="register-heading">

          <span className="register-eyebrow">
            CREATE YOUR ACCOUNT
          </span>

          <h2>Join FreshFlow</h2>

          <p>
            Create your account to access the vegetable
            price management platform.
          </p>

        </div>


        {/* ====================================================
            ERROR MESSAGE
        ==================================================== */}

        {errorMessage && (
          <div
            className="register-error"
            role="alert"
          >
            <span aria-hidden="true">
              !
            </span>

            <p>
              {errorMessage}
            </p>
          </div>
        )}


        {/* ====================================================
            SUCCESS MESSAGE
        ==================================================== */}

        {successMessage && (
          <div
            className="register-success"
            role="status"
            aria-live="polite"
          >

            <span aria-hidden="true">
              ✓
            </span>

            <div>

              <strong>
                Registration submitted!
              </strong>

              <p>
                {successMessage}
              </p>

              <p>
                Your account will be available after an
                administrator approves it.
              </p>

              <button
                type="button"
                className="register-return-button"
                onClick={() => navigate("/")}
              >
                Return to Login
              </button>

            </div>

          </div>
        )}


        {/* ====================================================
            REGISTRATION FORM
        ==================================================== */}

        {!successMessage && (
          <form
            className="register-form"
            onSubmit={handleRegister}
          >

            {/* ==================================================
                FULL NAME
            ================================================== */}

            <div className="register-field">

              <label htmlFor="full_name">
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={100}
                required
                disabled={loading}
              />

            </div>


            {/* ==================================================
                USERNAME
            ================================================== */}

            <div className="register-field">

              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                maxLength={50}
                required
                disabled={loading}
              />

            </div>


            {/* ==================================================
                EMAIL
            ================================================== */}

            <div className="register-field">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={254}
                required
                disabled={loading}
              />

            </div>


            {/* ==================================================
                PHONE
            ================================================== */}

            <div className="register-field">

              <label htmlFor="phone">
                Phone Number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                maxLength={20}
                required
                disabled={loading}
              />

            </div>


            {/* ==================================================
                PASSWORD
            ================================================== */}

            <div className="register-field">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />

              <small>
                Use at least 8 characters.
              </small>

            </div>


            {/* ==================================================
                CONFIRM PASSWORD
            ================================================== */}

            <div className="register-field">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />

            </div>


            {/* ==================================================
                CREATE ACCOUNT BUTTON
            ================================================== */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading
                ? "Submitting Registration..."
                : "Create Account"}
            </button>

          </form>
        )}


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="register-footer">

          <p>
            Already have an account?{" "}
            <Link to="/">
              Sign in
            </Link>
          </p>


          {/* ==================================================
              SECURITY INFORMATION
          ================================================== */}

          <div className="register-security">

            <span aria-hidden="true">
              🔒
            </span>

            <span>
              Your account requires administrator approval.
            </span>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Register;