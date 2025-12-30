import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaPaperPlane,
  FaLocationArrow,
  FaSpinner,
} from "react-icons/fa";

import "../../assets/css/BuyerSignup.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function BuyerSignup() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState(""); // ✅ FIX
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [latLng, setLatLng] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
      window.recaptchaVerifier.render();
    }
  }, []);

  const handleSendOTP = async () => {
    if (!phone) return setError("Enter phone number");
    setOtpLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        "+91" + phone,
        window.recaptchaVerifier
      );
      window.confirmationResult = confirmation;
      setOtpSent(true);
      setSuccess("OTP sent successfully");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      await window.confirmationResult.confirm(otp);
      setOtpVerified(true);
      setSuccess("Phone verified");
      setError("");
    } catch {
      setError("Invalid OTP");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!otpVerified) return setError("Verify OTP first");
    if (!latLng) return setError("Select location");

    setLoading(true);
    try {
      const user = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "buyers", user.user.uid), {
        firstName,
        lastName,
        email,
        phone,
        address,        // ✅ FIX
        latLng,
        createdAt: serverTimestamp(),
      });

      setSuccess("Signup successful");
      setTimeout(() => navigate("/buyer/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
const handleLocation = async () => {
  if (!navigator.geolocation) {
    setError("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;

      // ✅ Map location
      setLatLng({
        lat: latitude,
        lng: longitude,
      });

      // ✅ Convert lat/lng to address
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();

        setAddress(data.display_name || "");
      } catch (err) {
        setError("Unable to fetch address");
      }
    },
    () => {
      setError("Location permission denied");
    }
  );
};


  return (
    <div className="buyer-signup-container">
      <div className="signup-card">
        <h1 className="title">Join Buyer Community</h1>
        <p className="subtitle">Create account & explore deals</p>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <form onSubmit={handleSignup}>
          <div className="row">
            <div className="field">
              <FaUser />
              <input
                className="input-field"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <FaUser />
              <input
                className="input-field"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <FaEnvelope />
            <input
              className="input-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <FaPhone />
            <input
              className="input-field"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <FaLock />
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!otpSent ? (
            <button type="button" className="btn otp-btn" onClick={handleSendOTP}>
              {otpLoading ? <FaSpinner className="spin" /> : <FaPaperPlane />}
              Send OTP
            </button>
          ) : (
            <div className="otp-box">
              <input
                className="otp-input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="button" className="btn verify-btn" onClick={handleVerifyOTP}>
                Verify
              </button>
            </div>
          )}

          {/* ✅ Address */}
          <textarea
            placeholder="Full Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="address-box"
          />

          <button type="button" className="btn location-btn" onClick={handleLocation}>
            <FaLocationArrow /> Use My Location
          </button>

          {latLng && (
            <div className="map-container">
              <MapContainer center={latLng} zoom={15} style={{ height: "250px" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={latLng} icon={markerIcon}>
                  <Popup>Your location</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          <div id="recaptcha-container"></div>

          <button className="btn submit-btn" disabled={loading}>
            {loading ? <FaSpinner className="spin" /> : "Create Account"}
          </button>

          <p className="login-text">
            Already have account?
            <span onClick={() => navigate("/buyer/login")}> Login</span>
          </p>
        </form>
      </div>
    </div>
  );
}
