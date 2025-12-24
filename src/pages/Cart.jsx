import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../assets/css/cart.css";

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

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      return;
    }

    const fetchCart = async () => {
      try {
        const cartSnap = await getDocs(collection(db, "cart"));
        const userCart = cartSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((item) => item.userId === user.uid);

        const enrichedCart = userCart.map((item) => ({
          ...item,
          image: item.image || "https://via.placeholder.com/150",
        }));

        setCartItems(enrichedCart);
      } catch (err) {
        console.error("Error fetching cart:", err);
      }
    };

    fetchCart();
  }, [user]);

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const removeSelected = async () => {
    if (!window.confirm("Remove selected items?")) return;
    for (const id of selectedItems) {
      await deleteDoc(doc(db, "cart", id));
    }
    setCartItems((prev) => prev.filter((item) => !selectedItems.includes(item.id)));
    setSelectedItems([]);
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      alert("Select items to checkout.");
      return;
    }

    const itemsToCheckout = cartItems.filter((item) => selectedItems.includes(item.id));

    // Fetch user points from Firestore
    let userPoints = 0;
    if (user?.email) {
      try {
        const buyersRef = collection(db, "buyers");
        const q = query(buyersRef, where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userPoints = snap.docs[0].data().points || 0;
        }
      } catch (err) {
        console.error("Error fetching user points:", err);
      }
    }

    // Pass buyer info if available
    const buyerInfo = {
      fullName: user?.displayName || "",
      email: user?.email || "",
      address: "",
    };

    navigate("/checkout", {
      state: {
        items: itemsToCheckout,
        points: userPoints, // ✅ Now points are correct
        buyerInfo,
      },
    });
  };

  return (
    <div className="cart-page">
      <header>
        <h1>Your Cart</h1>
        <button onClick={() => navigate("/products")} className="back-btn">
          ⬅ Back to Shop
        </button>
      </header>

      <main>
        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <div id="cart-container">
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                />
                <img src={item.image} alt={item.name} className="cart-img" />
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  {item.size && <p>Size: {item.size}</p>}
                  <p>₹{item.price}</p>
                  {item.description && <p>{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="cart-actions">
            <button className="clear-btn" onClick={removeSelected}>
              Remove Selected
            </button>
            <button className="checkout-btn" onClick={handleCheckout}>
              Checkout Selected
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
