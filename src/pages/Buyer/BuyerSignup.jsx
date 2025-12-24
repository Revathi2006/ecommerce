// src/pages/Buyer/BuyerSignup.jsx
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

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function BuyerSignup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [latLng, setLatLng] = useState(null);
  const [error, setError] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const navigate = useNavigate();

  // ✅ Setup reCAPTCHA
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );
      window.recaptchaVerifier.render();
    }
  }, []);

  // 🔹 Reverse Geocoding
  useEffect(() => {
    const fetchAddress = async () => {
      if (latLng) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latLng.lat}&lon=${latLng.lng}`
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch (err) {
          console.error("Failed to fetch address:", err);
        }
      }
    };
    fetchAddress();
  }, [latLng]);

  // 🔹 OTP Send
  const handleSendOTP = async () => {
    setError("");
    if (!phone) return setError("Enter a valid phone number first.");

    try {
      let cleanPhone = phone.replace(/\s+/g, "").trim();
      if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        cleanPhone,
        appVerifier
      );
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      alert("OTP sent to your phone number!");
    } catch (err) {
      setError("Failed to send OTP: " + err.message);
    }
  };

  // 🔹 OTP Verify
  const handleVerifyOTP = async () => {
    setError("");
    if (!otp) return setError("Enter OTP to verify.");
    try {
      await window.confirmationResult.confirm(otp);
      setOtpVerified(true);
      alert("Phone OTP verified successfully!");
    } catch {
      setError("Invalid OTP. Try again.");
    }
  };

  // 🔹 Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!otpVerified) return setError("Please verify your phone OTP first.");
    if (!latLng) return setError("Please set your location on the map.");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      let cleanPhone = phone.replace(/\s+/g, "").trim();
      if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

      await setDoc(doc(db, "buyers", uid), {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        address,
        phone: cleanPhone,
        email,
        latLng,
        role: "buyer",
        isLocationVerified: !!latLng,
        createdAt: serverTimestamp(),
      });

      alert("Signup successful! Please login.");
      navigate("/buyer/login");
    } catch (err) {
      setError(err.message);
    }
  };

  // 🔹 Geolocation
  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setLatLng({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setError("Failed to get current location. Please allow access.")
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-blue-700">
          Buyer Signup
        </h2>
        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
            {error}
          </p>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* Address */}
          <textarea
            placeholder="Full Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {/* Phone */}
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
            required
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {/* Recaptcha */}
          <div id="recaptcha-container"></div>

          {/* OTP Section */}
          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOTP}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold transition"
            >
              Send OTP
            </button>
          ) : (
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-green-400 outline-none"
              />
              <button
                type="button"
                onClick={handleVerifyOTP}
                className="bg-green-500 hover:bg-green-600 text-white px-5 rounded-lg font-semibold transition"
              >
                Verify
              </button>
            </div>
          )}
          {otpVerified && (
            <p className="text-green-600 text-sm text-center">
              ✅ Phone OTP Verified
            </p>
          )}

          {/* Map */}
          {latLng && (
            <div className="rounded-lg overflow-hidden border shadow-md">
              <MapContainer
                center={latLng}
                zoom={16}
                style={{ height: "250px", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={latLng}
                  icon={markerIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const newLatLng = e.target.getLatLng();
                      setLatLng({ lat: newLatLng.lat, lng: newLatLng.lng });
                    },
                  }}
                >
                  <Popup>Drag to adjust your location</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          {/* Location Button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-semibold transition"
          >
            Use My Current Location
          </button>

          {/* Submit */}
          <button
            type="submit"
            disabled={!otpVerified}
            className={`w-full py-3 rounded-lg text-white font-bold transition ${
              otpVerified
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
