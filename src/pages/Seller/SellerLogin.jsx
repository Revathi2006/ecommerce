// src/pages/Seller/SellerLogin.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import "../../assets/css/SellerLogin.css";
export default function SellerLogin() {
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
      const uid = userCredential.user.uid;

      const sellerRef = doc(db, "sellers", uid);
      const snap = await getDoc(sellerRef);

      if (!snap.exists()) {
        setError("Seller account not found. Please sign up first.");
        setLoading(false);
        return;
      }

      const data = snap.data();

      if (data.status === "pending") {
        setError("⏳ Your application is pending admin approval.");
      } else if (data.status === "rejected") {
        setError("❌ Your application was rejected. Contact admin.");
      } else if (data.status === "approved") {
        navigate("/seller/dashboard");
      } else {
        setError("Unknown account status.");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Seller Login</h2>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="signup-link">
          Don’t have an account?
          <a href="/seller/signup"> Sign up</a>
        </p>
      </div>
    </div>
  );
}
