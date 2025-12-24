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
  const [latLng, setLatLng] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [timer, setTimer] = useState(0);

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

  // Reverse Geocoding for shop address
  useEffect(() => {
    const fetchAddress = async () => {
      if (latLng) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latLng.lat}&lon=${latLng.lng}`
          );
          const data = await res.json();
          if (data && data.display_name) setShopAddress(data.display_name);
        } catch (err) {
          console.error("Failed to fetch address:", err);
        }
      }
    };
    fetchAddress();
  }, [latLng]);

  // OTP Countdown
  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Send OTP (test number shortcut)
  const handleSendOTP = () => {
    setError("");
    if (!phone)
      return Swal.fire("Error", "Enter a valid phone number first!", "error");

    let cleanPhone = phone.replace(/\s+/g, "").trim();
    if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

    // Test number shortcut
    if (cleanPhone === "+919551229470") {
      setOtpSent(true);
      setTimer(60);
      Swal.fire("OTP Sent", "Use default OTP: 170607", "success");
      return;
    }

    Swal.fire(
      "Info",
      "OTP sending only works for test number in this demo",
      "info"
    );
  };

  // Verify OTP
  const handleVerifyOTP = () => {
    if (!otp || otp.length !== 6) {
      Swal.fire("Invalid", "Please enter a 6-digit OTP.", "warning");
      return;
    }

    if (timer <= 0) {
      Swal.fire("Expired", "Your OTP has expired. Please resend.", "error");
      return;
    }

    let cleanPhone = phone.replace(/\s+/g, "").trim();
    if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

    if (cleanPhone === "+919551229470" && otp === "170607") {
      setOtpVerified(true);
      Swal.fire({
        icon: "success",
        title: "Verified!",
        text: "Phone OTP verified successfully 🎉",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    Swal.fire("Wrong OTP", "The OTP you entered is incorrect.", "error");
  };

  // Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!otpVerified) return setError("Please verify your phone OTP first.");
    if (!latLng) return setError("Please set your shop location on the map.");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      let cleanPhone = phone.replace(/\s+/g, "").trim();
      if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

      await setDoc(doc(db, "sellers", uid), {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        address,
        phone: cleanPhone,
        email,
        shopName,
        shopAddress,
        latLng,
        category,
        description,
        role: "seller",
        isLocationVerified: !!latLng,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Swal.fire(
        "Success",
        "Signup request sent! Wait for admin approval.",
        "success"
      );
      navigate("/seller/login");
    } catch (err) {
      setError(err.message);
    }
  };

  // Use Current Location
  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatLng({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () =>
          setError(
            "Failed to get current location. Please allow location access."
          )
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">Seller Signup</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <textarea
            placeholder="Full Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="email"
            placeholder="Email ID"
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

          {/* OTP Section */}
          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOTP}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg"
            >
              Send OTP
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 border rounded-lg p-2 text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 rounded-lg"
                >
                  Verify
                </button>
              </div>

              {timer > 0 && (
                <p className="text-sm text-gray-600 text-center">
                  ⏳ OTP valid for <span className="font-semibold">{timer}s</span>
                </p>
              )}

              {otpVerified && (
                <p className="text-green-600 text-sm">✅ Phone OTP Verified</p>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Shop Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="text"
            placeholder="Shop Address"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />

          {/* Map */}
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
              <Popup>Drag to adjust shop location</Popup>
            </Marker>
          </MapContainer>

          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg"
          >
            Use My Current Location
          </button>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          >
            <option value="">Select Category</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Description for your profile"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg p-2"
          />

          <button
            type="submit"
            disabled={!otpVerified}
            className={`w-full py-2 rounded-lg text-white ${
              otpVerified
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Request Signup
          </button>
        </form>
      </div>
    </div>
  );
}
