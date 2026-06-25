// src/pages/Admin/AdminLogin.jsx
import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaSpinner } from "react-icons/fa";

import "../../assets/css/BuyerSignup.css"; // ✅ reuse same CSS

export default function AdminLogin() {
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const adminEmails = ["harinis0001@gmail.com"]; // ✅ admin list

      if (!adminEmails.includes(user.email)) {
        setError("Access denied. You are not an admin.");
        setLoading(false);
        return;
      }

      navigate("/admin/dashboard");
    } catch (err) {
      setError("Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buyer-signup-container">
      <div className="signup-card">
        <h1 className="title">Admin Login</h1>
        <p className="subtitle">Authorized access only</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="field">
            <FaEnvelope />
            <input
              type="email"
              className="input-field"
              placeholder="Admin Email"
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
      </div>
    </div>
  );
}
