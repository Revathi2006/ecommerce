// src/pages/Seller/SellerSignup.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Swal from "sweetalert2";
import "../../assets/css/SellerSignup.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function SellerSignup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [latLng, setLatLng] = useState({ lat: 12.9716, lng: 77.5946 });
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const categories = [
    "Clothing",
    "Electronics",
    "Groceries",
    "Books",
    "Footwear",
    "Home Appliances",
    "Others",
  ];

  // Reverse geocode
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latLng.lat}&lon=${latLng.lng}`
        );
        const data = await res.json();
        if (data?.display_name) setShopAddress(data.display_name);
      } catch {}
    };
    fetchAddress();
  }, [latLng]);

  // OTP timer
  useEffect(() => {
    if (otpSent && timer > 0) {
      const i = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(i);
    }
  }, [otpSent, timer]);

  const handleSendOTP = () => {
    if (!phone) return Swal.fire("Error", "Enter phone number", "error");
    setOtpSent(true);
    setTimer(60);
    Swal.fire("OTP Sent", "Use demo OTP: 170607", "success");
  };

  const handleVerifyOTP = () => {
    if (otp === "170607") {
      setOtpVerified(true);
      Swal.fire("Verified", "Phone verified successfully", "success");
    } else {
      Swal.fire("Wrong OTP", "Invalid OTP", "error");
    }
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLatLng({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setError("Allow location access")
    );
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!otpVerified) return setError("Verify OTP first");

    const user = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "sellers", user.user.uid), {
      firstName,
      lastName,
      address,
      phone,
      email,
      shopName,
      shopAddress,
      latLng,
      category,
      description,
      role: "seller",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    Swal.fire(
      "Success",
      "Signup request sent! Wait for admin approval",
      "success"
    );
    navigate("/seller/login");
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h2>Seller Signup</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSignup}>
          <input placeholder="First Name" onChange={(e) => setFirstName(e.target.value)} required />
          <input placeholder="Last Name" onChange={(e) => setLastName(e.target.value)} required />
          <textarea placeholder="Your Address" onChange={(e) => setAddress(e.target.value)} required />
          <input placeholder="Phone" onChange={(e) => setPhone(e.target.value)} required />
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />

          {!otpSent ? (
            <button type="button" className="btn yellow" onClick={handleSendOTP}>
              Send OTP
            </button>
          ) : (
            <div className="otp-row">
              <input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="button" className="btn green" onClick={handleVerifyOTP}>
                Verify
              </button>
            </div>
          )}

          <input placeholder="Shop Name" onChange={(e) => setShopName(e.target.value)} required />
          <input placeholder="Shop Address" value={shopAddress} readOnly />

          <MapContainer center={latLng} zoom={16} className="map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker
              position={latLng}
              draggable
              icon={markerIcon}
              eventHandlers={{
                dragend: (e) => setLatLng(e.target.getLatLng()),
              }}
            >
              <Popup>Drag location</Popup>
            </Marker>
          </MapContainer>

          <button type="button" className="btn purple" onClick={handleUseMyLocation}>
            Use My Current Location
          </button>

          <select onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <textarea placeholder="Description" onChange={(e) => setDescription(e.target.value)} />

          <button type="submit" className="btn blue" disabled={!otpVerified}>
            Request Signup
          </button>
        </form>
      </div>
    </div>
  );
}
