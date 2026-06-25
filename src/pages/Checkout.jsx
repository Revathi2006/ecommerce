// Checkout.jsx - Without framer-motion and react-confetti
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const totalSelectedItems = cartItems.length;

  const calculateDeliveryCharge = (item) => {
    const originalDelivery = item.price > 1000 ? 0 : Math.ceil(item.price * 0.05);
    let discountedDelivery = originalDelivery;
    if (totalSelectedItems > 2 && originalDelivery > 0) {
      discountedDelivery = Math.ceil(originalDelivery * 0.5);
    }
    return { original: originalDelivery, discounted: discountedDelivery };
  };

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

  const saveOrder = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Swal.fire("Error", "You must be logged in to place an order", "error");
        setLoading(false);
        return;
      }

      const earnedPoints = Math.floor(total / 100);

      const orderData = {
        items: cartItems,
        name,
        email,
        address,
        pointsUsed: applyPoints ? pointsToUse : 0,
        pointsEarned: earnedPoints,
        totalPaid: discountedTotal,
        paymentMethod: "Razorpay",
        paymentStatus: "Paid",
        status: "confirmed",
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

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
      } else {
        await addDoc(buyersRef, {
          fullName: name,
          email,
          address,
          points: earnedPoints,
          role: "buyer",
          createdAt: serverTimestamp(),
        });
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        Swal.fire({
          title: "🎉 Order Placed Successfully!",
          text: `You earned ${earnedPoints} bonus points!`,
          icon: "success",
          confirmButtonText: "Continue Shopping",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          navigate("/shop");
        });
      }, 2000);

    } catch (err) {
      console.error("Error saving order:", err);
      Swal.fire("Error", "Failed to save order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!name || !email || !address) {
      Swal.fire({
        title: "Missing Information",
        text: "Please fill all details",
        icon: "warning",
        confirmButtonColor: "#d4af37",
      });
      return;
    }

    if (!isScriptLoaded) {
      Swal.fire({
        title: "Payment System Loading",
        text: "Please wait a moment...",
        icon: "info",
        confirmButtonColor: "#d4af37",
      });
      return;
    }

    setLoading(true);
    setStep(3);

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
        name: "Cartify!!",
        description: "Premium Order Payment",
        order_id: order.id,
        handler: function () {
          setStep(4);
          setTimeout(() => {
            saveOrder();
          }, 1500);
        },
        prefill: { name, email, contact: "9999999999" },
        theme: { color: "#d4af37" },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setStep(2);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      Swal.fire({
        title: "Payment Failed",
        text: "Please try again",
        icon: "error",
        confirmButtonColor: "#d4af37",
      });
      setLoading(false);
      setStep(2);
    }
  };

  const steps = [
    { number: 1, label: "Details", icon: "✍️" },
    { number: 2, label: "Review", icon: "📋" },
    { number: 3, label: "Payment", icon: "💳" },
    { number: 4, label: "Complete", icon: "🎉" },
  ];

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Animated Header */}
        <div className="checkout-header">
          <div className="crown-icon">👑</div>
          <h1>Checkout</h1>
          <p>Complete your purchase with cartify!!</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((stepItem) => (
            <div
              key={stepItem.number}
              className={`step ${step >= stepItem.number ? 'active' : ''} ${step > stepItem.number ? 'completed' : ''}`}
            >
              <div className="step-circle">
                {step > stepItem.number ? (
                  <span className="check-icon">✓</span>
                ) : (
                  <span className="step-icon">{stepItem.icon}</span>
                )}
              </div>
              <span className="step-label">{stepItem.label}</span>
              <div className="step-line"></div>
            </div>
          ))}
        </div>

        <div className="checkout-content">
          {/* Left Column - Form */}
          <div className="checkout-form-section">
            <div className="form-card">
              <h3>
                <span className="form-icon">🛒</span>
                Shipping Details
              </h3>
              
              <div className="input-group floating-label">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <label>Full Name</label>
                <div className="input-underline"></div>
              </div>

              <div className="input-group floating-label">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <label>Email Address</label>
                <div className="input-underline"></div>
              </div>

              <div className="input-group floating-label">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows="4"
                />
                <label>Delivery Address</label>
                <div className="input-underline"></div>
              </div>
            </div>

            {/* Cart Items Preview */}
            {cartItems.length > 0 && (
              <div className="cart-preview-card">
                <h3>
                  <span className="form-icon">📦</span>
                  Your Order
                </h3>
                <div className="cart-items-list">
                  {cartItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="cart-item"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animation: 'slideInLeft 0.5s ease forwards',
                        opacity: 0
                      }}
                    >
                      <div className="item-image">
                        🎁
                      </div>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <div className="item-meta">
                          <span className="quantity">Qty: {item.quantity}</span>
                          <span className="price">₹{item.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="checkout-summary">
            <div className="summary-card">
              <h3>
                <span className="form-icon">💰</span>
                Order Summary
              </h3>

              {/* Price Breakdown */}
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                
                {canUsePoints && (
                  <div className="price-row points-row">
                    <div className="points-control">
                      <label className="points-toggle">
                        <input
                          type="checkbox"
                          checked={applyPoints}
                          onChange={(e) => setApplyPoints(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        Use Points ({pointsAvailable} available)
                      </label>
                      
                      {applyPoints && (
                        <div className="points-slider">
                          <input
                            type="range"
                            min="0"
                            max={maxPointsAllowed}
                            value={pointsToUse}
                            onChange={(e) => setPointsToUse(Number(e.target.value))}
                          />
                          <div className="points-display">
                            <span className="star-icon">⭐</span>
                            <span>{pointsToUse} points ({discountPercent}% off)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="discount">-₹{(total - discountedTotal).toFixed(2)}</span>
                  </div>
                )}

                <div className="price-row delivery-row">
                  <span>
                    <span className="delivery-icon">🚚</span>
                    Delivery
                  </span>
                  <span>₹{
                    cartItems.reduce((sum, item) => {
                      const delivery = calculateDeliveryCharge(item);
                      return sum + delivery.discounted;
                    }, 0).toFixed(2)
                  }</span>
                </div>

                <div className="price-row total-row">
                  <span>Total Amount</span>
                  <span className="total-amount">₹{discountedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="security-badge">
                <span className="lock-icon">🔒</span>
                <span>Secure 256-bit SSL Encryption</span>
              </div>

              {/* Payment Button */}
              <button
                className="pay-button"
                onClick={handlePayment}
                disabled={loading || cartItems.length === 0 || !isScriptLoaded}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <span className="payment-icon">💳</span>
                    Pay ₹{discountedTotal.toFixed(2)}
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="trust-badges">
                <div className="badge">
                  <span>✅</span>
                  <span>100% Secure</span>
                </div>
                <div className="badge">
                  <span>🚚</span>
                  <span>Fast Delivery</span>
                </div>
                <div className="badge">
                  <span>⭐</span>
                  <span>Easy Returns</span>
                </div>
              </div>
            </div>

            {/* Bonus Offers */}
            <div className="bonus-offer">
              <span className="offer-icon">🎁</span>
              <div className="offer-content">
                <h4>Earn Bonus Points!</h4>
                <p>Get {Math.floor(total / 100)} points on this order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Placed Success Modal */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-card">
              <div className="success-icon">🎉</div>
              <h2>Order Confirmed!</h2>
              <p>Your order has been placed successfully</p>
              <div className="success-details">
                <span>Order Total: ₹{discountedTotal.toFixed(2)}</span>
                <span>Items: {cartItems.length}</span>
              </div>
              <button 
                className="continue-shopping"
                onClick={() => navigate("/shop")}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;