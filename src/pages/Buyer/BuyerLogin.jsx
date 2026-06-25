// src/pages/Buyer/BuyerLogin.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaSpinner } from "react-icons/fa";

import "../../assets/css/BuyerSignup.css"; // ✅ reuse same CSS

export default function BuyerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/buyer/shop"); // make sure route exists
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buyer-signup-container">
      <div className="signup-card">
        <h1 className="title">Buyer Login</h1>
        <p className="subtitle">Welcome back, please login</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="field">
            <FaEnvelope />
            <input
              type="email"
              className="input-field"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <FaLock />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn submit-btn" disabled={loading}>
            {loading ? <FaSpinner className="spin" /> : "Login"}
          </button>
        </form>

        <p className="login-text">
          Don’t have an account?
          <span onClick={() => navigate("/buyer/signup")}> Sign Up</span>
        </p>
      </div>
    </div>
  );
}
