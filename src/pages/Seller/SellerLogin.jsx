// src/pages/Seller/SellerLogin.jsx
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

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
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Check seller document in Firestore
      const sellerRef = doc(db, "sellers", uid);
      const snap = await getDoc(sellerRef);

      if (!snap.exists()) {
        setError("Seller account not found. Please sign up first.");
        setLoading(false);
        return;
      }

      const data = snap.data();

      if (data.status === "pending") {
        setError("⏳ Your application is still pending admin approval.");
      } else if (data.status === "rejected") {
        setError("❌ Your application was rejected. Contact admin.");
      } else if (data.status === "approved") {
        // Redirect seller to dashboard
        navigate("/seller/dashboard");
      } else {
        setError("Unknown account status. Contact support.");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">Seller Login</h2>
        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}