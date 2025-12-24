// Checkout.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Swal from "sweetalert2";
import "../assets/css/checkout.css";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDCTrKSp9EGxfbkLhIWgwm5mm-iqhqL7mU",
  authDomain: "e-commerce-fc903.firebaseapp.com",
  projectId: "e-commerce-fc903",
  storageBucket: "e-commerce-fc903.appspot.com",
  messagingSenderId: "301188455783",
  appId: "1:301188455783:web:b88034dd81f190c911a3c2",
  measurementId: "G-J5191W2L36",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const cartItems = location.state?.items || [];
  const pointsFromState = location.state?.points || 0;
  const buyerInfo = useMemo(() => location.state?.buyerInfo || {}, [location.state]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyPoints, setApplyPoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // 🔹 State to track if the Razorpay script is loaded
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const totalSelectedItems = cartItems.length;

  // 🔹 Calculate delivery charges
  const calculateDeliveryCharge = (item) => {
    const originalDelivery = item.price > 1000 ? 0 : Math.ceil(item.price * 0.05);
    let discountedDelivery = originalDelivery;
    if (totalSelectedItems > 2 && originalDelivery > 0) {
      discountedDelivery = Math.ceil(originalDelivery * 0.5);
    }
    return { original: originalDelivery, discounted: discountedDelivery };
  };

  // 🔹 Total price
  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const delivery = calculateDeliveryCharge(item);
      return sum + item.price * item.quantity + delivery.discounted;
    }, 0);
  }, [cartItems, totalSelectedItems]);

  const POINTS_LIMIT = 10;
  const pointsAvailable = pointsFromState || 0;
  const canUsePoints = total > 1000 && pointsAvailable > 0;
  const maxPointsAllowed = canUsePoints ? Math.min(pointsAvailable, POINTS_LIMIT) : 0;

  const discountPercent = applyPoints ? Math.min(pointsToUse, maxPointsAllowed) : 0;
  const discountedTotal = total * (1 - discountPercent / 100);

  // 🔹 UseEffect to dynamically load the Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 🔹 Fetch buyer info from Firestore
  useEffect(() => {
    const fetchBuyerInfo = async () => {
      let userEmail = buyerInfo.email;
      const user = auth.currentUser;
      if (user?.email) userEmail = user.email;
      if (!userEmail) return;

      const buyersRef = collection(db, "buyers");
      const q = query(buyersRef, where("email", "==", userEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0].data();
        setName(data.fullName || "");
        setEmail(data.email || "");
        setAddress(data.address || "");
      } else {
        setName(buyerInfo.fullName || "");
        setEmail(buyerInfo.email || "");
        setAddress(buyerInfo.address || "");
      }
    };

    fetchBuyerInfo();
  }, [buyerInfo]);

  useEffect(() => {
    if (applyPoints) setPointsToUse(maxPointsAllowed);
    else setPointsToUse(0);
  }, [applyPoints, maxPointsAllowed]);

  // 🔹 Save order in Firestore
  const saveOrder = async () => {
    try {
      const earnedPoints = Math.floor(total / 100);

      await addDoc(collection(db, "orders"), {
        items: cartItems,
        name,
        email,
        address,
        pointsUsed: applyPoints ? pointsToUse : 0,
        pointsEarned: earnedPoints,
        totalPaid: discountedTotal,
        createdAt: serverTimestamp(),
      });

      const buyersRef = collection(db, "buyers");
      const q = query(buyersRef, where("email", "==", email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const buyerDoc = snap.docs[0];
        const currentPoints = buyerDoc.data().points || 0;
        const newPoints = currentPoints + earnedPoints - (applyPoints ? pointsToUse : 0);

        await updateDoc(buyerDoc.ref, {
          points: newPoints,
          lastPurchaseAt: serverTimestamp(),
        });

        Swal.fire(
          "Success",
          `Order placed! You earned ${earnedPoints} points. Total points: ${newPoints}`,
          "success"
        );
      } else {
        await addDoc(buyersRef, {
          fullName: name,
          email,
          address,
          points: earnedPoints,
          role: "buyer",
          createdAt: serverTimestamp(),
        });

        Swal.fire("Success", `Order placed! You earned ${earnedPoints} points.`, "success");
      }

      navigate("/shop");
    } catch (err) {
      console.error("Error saving order:", err);
      Swal.fire("Error", "Failed to save order", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle payment with Razorpay
  const handlePayment = async () => {
    if (!name || !email || !address) {
      return Swal.fire("Error", "Please fill all details", "warning");
    }
    // Check if the script is loaded before proceeding
    if (!isScriptLoaded) {
      return Swal.fire("Error", "Payment system is not ready. Please try again.", "error");
    }

    setLoading(true);

    try {
      const response = await fetch(
        "https://us-central1-e-commerce-fc903.cloudfunctions.net/app/createOrder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: discountedTotal }),
        }
      );

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const order = await response.json();

      const options = {
        key: "rzp_test_RGXiWE8LvjsO0j",
        amount: order.amount,
        currency: order.currency,
        name: "E-Commerce App",
        description: "Order Payment",
        order_id: order.id,
        handler: function () {
          Swal.fire("Success", "Payment Successful!", "success").then(saveOrder);
        },
        prefill: { name, email, contact: "9999999999" },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      Swal.fire("Error", "Payment failed, try again", "error");
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      <div className="checkout-form">
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <textarea placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />

        <div className="cart-summary">
          {cartItems.map((item) => {
            const delivery = calculateDeliveryCharge(item);
            return (
              <div key={item.id} className="checkout-item">
                {item.name} x {item.quantity} - ₹{item.price * item.quantity} <br />
                Delivery: ₹{delivery.discounted}{" "}
                {delivery.discounted < delivery.original && (
                  <span style={{ color: "green" }}>
                    (Saved ₹{delivery.original - delivery.discounted})
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="total">
          <strong>Total: ₹{total}</strong> <br />
          {discountPercent > 0 && <span>Points Discount: {discountPercent} %</span>} <br />
          <strong>Final Total: ₹{discountedTotal.toFixed(2)}</strong>
        </div>

        {canUsePoints && (
          <div className="points-section">
            <label>
              <input
                type="checkbox"
                checked={applyPoints}
                onChange={(e) => setApplyPoints(e.target.checked)}
              />{" "}
              Apply points (max {maxPointsAllowed})
            </label>
            {applyPoints && (
              <input
                type="number"
                min="1"
                max={maxPointsAllowed}
                value={pointsToUse}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (val > maxPointsAllowed) val = maxPointsAllowed;
                  if (val < 1) val = 1;
                  setPointsToUse(val);
                }}
              />
            )}
          </div>
        )}

        <button onClick={handlePayment} disabled={loading || cartItems.length === 0 || !isScriptLoaded}>
          {loading ? "Processing Payment..." : "Pay & Place Order"}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
