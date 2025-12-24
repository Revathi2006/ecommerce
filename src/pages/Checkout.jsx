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

// AI Gift Suggestions Data
const AI_GIFT_SUGGESTIONS = {
  birthday: {
    title: "🎂 Birthday Special",
    suggestions: [
      "Add a birthday card with custom message",
      "Premium gift wrapping with birthday theme",
      "Include a surprise discount coupon for next purchase",
      "Add a personalized birthday video message"
    ],
    themes: ["Party", "Elegant", "Fun", "Surprise"]
  },
  anniversary: {
    title: "💖 Anniversary Celebration",
    suggestions: [
      "Romantic gift wrapping with heart theme",
      "Include a love letter template",
      "Add rose petals in packaging",
      "Personalized couple's photo frame option"
    ],
    themes: ["Romantic", "Luxury", "Memorable", "Elegant"]
  },
  wedding: {
    title: "💒 Wedding Gift",
    suggestions: [
      "Elegant white & gold gift wrapping",
      "Include congratulatory message card",
      "Add a custom wedding wish voice note",
      "Premium packaging with satin ribbons"
    ],
    themes: ["Elegant", "Traditional", "Modern", "Luxury"]
  },
  congratulations: {
    title: "🎉 Congratulations",
    suggestions: [
      "Festive gift wrapping",
      "Include achievement certificate template",
      "Add celebratory confetti in package",
      "Personalized success message card"
    ],
    themes: ["Festive", "Professional", "Joyful", "Colorful"]
  }
};

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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Smart Gifting States
  const [showGiftingOptions, setShowGiftingOptions] = useState(false);
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [voiceNote, setVoiceNote] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [occasion, setOccasion] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [giftSuggestions, setGiftSuggestions] = useState([]);

  const totalSelectedItems = cartItems.length;

  const calculateDeliveryCharge = (item) => {
    const originalDelivery = item.price > 1000 ? 0 : Math.ceil(item.price * 0.05);
    let discountedDelivery = originalDelivery;
    if (totalSelectedItems > 2 && originalDelivery > 0) {
      discountedDelivery = Math.ceil(originalDelivery * 0.5);
    }
    return { original: originalDelivery, discounted: discountedDelivery };
  };

  // Gift wrapping charge
  const giftWrappingCharge = giftWrapping ? 99 : 0;

  // Calculate subtotal (items + delivery)
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const delivery = calculateDeliveryCharge(item);
      return sum + item.price * item.quantity + delivery.discounted;
    }, 0);
  }, [cartItems, totalSelectedItems]);

  const total = subtotal + giftWrappingCharge;

  // FIXED: Points calculation - 1 point = ₹1 discount
  const POINTS_LIMIT = 10; // Maximum points allowed to use
  const POINT_VALUE = 1; // 1 point = ₹1
  
  const pointsAvailable = pointsFromState || 0;
  const canUsePoints = total > 1000 && pointsAvailable > 0;
  
  // Maximum points user can use (limited by available points and POINTS_LIMIT)
  const maxPointsAllowed = canUsePoints ? Math.min(pointsAvailable, POINTS_LIMIT) : 0;
  
  // Points discount amount (in rupees)
  const pointsDiscount = applyPoints ? Math.min(pointsToUse, maxPointsAllowed) * POINT_VALUE : 0;
  
  // Final total after points discount
  const discountedTotal = Math.max(0, total - pointsDiscount);

  // Voice Recording Logic
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // In a real app, you would integrate with Web Audio API or a library here
    Swal.fire("Info", "Voice recording would start here. This is a demo implementation.", "info");
  };

  const stopRecording = () => {
    setIsRecording(false);
    setVoiceNote({
      url: "demo-voice-note", // This would be the actual audio blob in real implementation
      duration: recordingTime
    });
  };

  const handleOccasionChange = (selectedOccasion) => {
    setOccasion(selectedOccasion);
    if (selectedOccasion && AI_GIFT_SUGGESTIONS[selectedOccasion]) {
      setGiftSuggestions(AI_GIFT_SUGGESTIONS[selectedOccasion].suggestions);
      setSelectedTheme(AI_GIFT_SUGGESTIONS[selectedOccasion].themes[0]);
    } else {
      setGiftSuggestions([]);
      setSelectedTheme("");
    }
  };

  const addSuggestionToMessage = (suggestion) => {
    setGiftMessage(prev => prev ? `${prev}\n${suggestion}` : suggestion);
  };

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

  // FIXED: Updated saveOrder function to match OrderTracking requirements
  const saveOrder = async (paymentId = null) => {
    try {
      const earnedPoints = Math.floor(discountedTotal / 100);
      const user = auth.currentUser;

      // Create order data structure that matches OrderTracking expectations
      const orderData = {
        // Required fields for OrderTracking
        userId: user?.uid || "anonymous", // This is crucial - OrderTracking filters by userId
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || item.imageUrl,
          category: item.category,
          // Include sellerId if available in cart items
          sellerId: item.sellerId || "default-seller"
        })),
        status: 'confirmed', // Initial status - required for OrderTracking
        totalAmount: discountedTotal, // Required for OrderTracking
        paymentMethod: 'razorpay', // Required for OrderTracking
        paymentStatus: 'paid', // Required for OrderTracking
        paymentId: paymentId,
        
        // Shipping information in the format OrderTracking expects
        shippingAddress: {
          fullName: name,
          address: address,
          city: "Unknown", // You can collect these separately if needed
          state: "Unknown", 
          pincode: "000000",
          phone: "0000000000" // You can collect this separately
        },
        
        // Your existing data
        name,
        email,
        address,
        pointsUsed: applyPoints ? pointsToUse : 0,
        pointsEarned: earnedPoints,
        totalPaid: discountedTotal,
        
        // Gifting data
        giftWrapping,
        giftMessage: giftMessage || null,
        voiceNote: voiceNote ? true : false,
        occasion: occasion || null,
        giftTheme: selectedTheme || null,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save order to Firestore
      const orderRef = await addDoc(collection(db, "orders"), orderData);
      const orderId = orderRef.id;

      // Update buyer points (your existing logic)
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

        // Enhanced success message with order tracking
        Swal.fire({
          title: "Order Placed Successfully! 🎉",
          html: `
            <div>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p>You earned <strong>${earnedPoints} points</strong>. Total points: <strong>${newPoints}</strong></p>
              <p>Track your order status in "My Orders" section.</p>
            </div>
          `,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "View My Orders",
          cancelButtonText: "Continue Shopping"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/orders");
          } else {
            navigate("/");
          }
        });
      } else {
        await addDoc(buyersRef, {
          fullName: name,
          email,
          address,
          points: earnedPoints - (applyPoints ? pointsToUse : 0),
          role: "buyer",
          createdAt: serverTimestamp(),
        });

        Swal.fire({
          title: "Order Placed Successfully! 🎉",
          html: `
            <div>
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p>You earned <strong>${earnedPoints} points</strong>.</p>
              <p>Track your order status in "My Orders" section.</p>
            </div>
          `,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "View My Orders",
          cancelButtonText: "Continue Shopping"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/orders");
          } else {
            navigate("/");
          }
        });
      }

    } catch (err) {
      console.error("Error saving order:", err);
      Swal.fire("Error", "Failed to save order details. Please contact support.", "error");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Updated handlePayment to pass payment ID
  const handlePayment = async () => {
    if (!name || !email || !address) {
      return Swal.fire("Error", "Please fill all details", "warning");
    }
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
          body: JSON.stringify({ amount: discountedTotal * 100 }), // Razorpay expects amount in paise
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
        handler: function (response) {
          // Pass payment ID to saveOrder
          saveOrder(response.razorpay_payment_id);
        },
        prefill: { name, email, contact: "9999999999" },
        theme: { color: "#3399cc" },
        modal: {
          ondismiss: function() {
            setLoading(false);
            Swal.fire("Info", "Payment was cancelled", "info");
          }
        }
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
        {/* Customer Information */}
        <div className="form-section">
          <h3>Shipping Information</h3>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <textarea placeholder="Delivery Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        {/* Order Summary */}
        <div className="form-section">
          <h3>Order Summary</h3>
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
            {giftWrapping && (
              <div className="checkout-item gift-charge">
                🎀 Premium Gift Wrapping - ₹99
              </div>
            )}
          </div>

          <div className="total">
            <strong>Subtotal: ₹{subtotal.toFixed(2)}</strong> <br />
            {giftWrapping && <span>Gift Wrapping: ₹99</span>} <br />
            {pointsDiscount > 0 && (
              <>
                <span>Points Discount: -₹{pointsDiscount.toFixed(2)}</span> <br />
                <small>(Used {pointsToUse} points)</small> <br />
              </>
            )}
            <strong>Final Total: ₹{discountedTotal.toFixed(2)}</strong>
          </div>
        </div>

        {/* Points Section */}
        {canUsePoints && (
          <div className="points-section">
            <label>
              <input
                type="checkbox"
                checked={applyPoints}
                onChange={(e) => setApplyPoints(e.target.checked)}
              />{" "}
              Apply points (max {maxPointsAllowed} points = ₹{maxPointsAllowed} off)
            </label>
            {applyPoints && (
              <div className="points-input-container">
                <label>Points to use (1 point = ₹1):</label>
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
                <small>You'll get ₹{pointsToUse} discount</small>
              </div>
            )}
          </div>
        )}

        {/* Payment Button */}
        <button onClick={handlePayment} disabled={loading || cartItems.length === 0 || !isScriptLoaded}>
          {loading ? "Processing Payment..." : `Pay ₹${discountedTotal.toFixed(2)} & Place Order ${giftWrapping ? 'with 🎁' : ''}`}
        </button>

        {/* Magic Gift Button - Moved Down */}
        {!showGiftingOptions && (
          <div className="magic-gift-button-container">
            <button 
              className="magic-gift-btn"
              onClick={() => setShowGiftingOptions(true)}
            >
              🎁 Make This Special! Add Magic Gifting ✨
            </button>
            <p className="gift-subtext">Surprise your loved ones with personalized gifts!</p>
          </div>
        )}
      </div>

      {/* Smart Gifting System - Moved to Bottom */}
      {showGiftingOptions && (
        <div className="gifting-section">
          <h2>🎀 Smart Gifting Options</h2>
          
          {/* Gift Wrapping */}
          <div className="gift-option">
            <label className="gift-label">
              <input
                type="checkbox"
                checked={giftWrapping}
                onChange={(e) => setGiftWrapping(e.target.checked)}
              />
              <span className="gift-emoji">🎀</span>
              Premium Gift Wrapping - ₹99
            </label>
            <p className="gift-description">Elegant packaging with premium materials</p>
          </div>

          {/* Occasion Selection */}
          <div className="gift-option">
            <label className="gift-label">Select Occasion:</label>
            <select 
              value={occasion} 
              onChange={(e) => handleOccasionChange(e.target.value)}
              className="occasion-select"
            >
              <option value="">Choose an occasion</option>
              <option value="birthday">🎂 Birthday</option>
              <option value="anniversary">💖 Anniversary</option>
              <option value="wedding">💒 Wedding</option>
              <option value="congratulations">🎉 Congratulations</option>
            </select>
          </div>

          {/* AI Gift Suggestions */}
          {giftSuggestions.length > 0 && (
            <div className="ai-suggestions">
              <h4>✨ AI Gift Suggestions:</h4>
              <div className="suggestions-list">
                {giftSuggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    {suggestion}
                    <button 
                      onClick={() => addSuggestionToMessage(suggestion)}
                      className="add-suggestion-btn"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Theme Selection */}
              {AI_GIFT_SUGGESTIONS[occasion]?.themes && (
                <div className="theme-selection">
                  <label>Select Gift Theme:</label>
                  <div className="theme-buttons">
                    {AI_GIFT_SUGGESTIONS[occasion].themes.map((theme) => (
                      <button
                        key={theme}
                        className={`theme-btn ${selectedTheme === theme ? 'active' : ''}`}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Personalized Message */}
          <div className="gift-option">
            <label className="gift-label">
              <span className="gift-emoji">💌</span>
              Personalized Message:
            </label>
            <textarea
              placeholder="Write your heartfelt message here..."
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              className="gift-message-textarea"
              rows="4"
            />
          </div>

          {/* Voice Note */}
          <div className="gift-option">
            <label className="gift-label">
              <span className="gift-emoji">🎤</span>
              Add Voice Note:
            </label>
            <div className="voice-note-controls">
              {!voiceNote ? (
                <>
                  <button 
                    onClick={startRecording}
                    disabled={isRecording}
                    className="voice-btn record"
                  >
                    {isRecording ? `Recording... ${recordingTime}s` : 'Start Recording'}
                  </button>
                  {isRecording && (
                    <button 
                      onClick={stopRecording}
                      className="voice-btn stop"
                    >
                      Stop
                    </button>
                  )}
                </>
              ) : (
                <div className="voice-note-preview">
                  <span>✅ Voice note recorded ({voiceNote.duration}s)</span>
                  <button 
                    onClick={() => setVoiceNote(null)}
                    className="voice-btn remove"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;