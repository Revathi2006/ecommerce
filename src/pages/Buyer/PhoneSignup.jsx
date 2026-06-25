// src/pages/Buyer/PhoneSignup.jsx
import { useState } from "react";
import { setUpRecaptcha } from "../../firebase"; // only import what you use

function PhoneSignup() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState("");

  // Send OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    try {
      let cleanPhone = phone.replace(/\s+/g, "").trim();
      if (!cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone;

      const confirmation = await setUpRecaptcha(cleanPhone);
      setConfirmationResult(confirmation);
      setMessage("OTP sent successfully ✅");
    } catch (error) {
      console.error(error);
      setMessage("Error sending OTP ❌ " + error.message);
    }
  };

  // Verify OTP
  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!confirmationResult) return;
    try {
      await confirmationResult.confirm(otp);
      setMessage("Phone number verified 🎉");
    } catch (error) {
      console.error(error);
      setMessage("Invalid OTP ❌ " + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-96">
        <h2 className="text-2xl font-bold text-center mb-4">📱 Phone Signup</h2>

        {!confirmationResult ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <input
              type="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
              className="border p-2 rounded-lg"
              required
            />
            <button type="submit" className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border p-2 rounded-lg"
              required
            />
            <button type="submit" className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">
              Verify OTP
            </button>
          </form>
        )}

        <div id="recaptcha-container"></div>
        {message && <p className="text-center mt-4 text-sm">{message}</p>}
      </div>
    </div>
  );
}

export default PhoneSignup;
