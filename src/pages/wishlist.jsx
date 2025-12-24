// src/pages/Wishlist.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase"; // centralized firebase.js
import { onAuthStateChanged } from "firebase/auth";
import "../assets/css/Wishlist.css";

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);

  // Listen to auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchWishlist(u.uid);
      else setWishlist([]);
    });
    return () => unsub();
  }, []);

  // Fetch wishlist items for the current user
  const fetchWishlist = async (uid) => {
    try {
      const q = query(collection(db, "wishlist"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setWishlist(items);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    }
  };

  // Remove product from wishlist
  const removeFromWishlist = async (id) => {
    try {
      await deleteDoc(doc(db, "wishlist", id));
      if (user) fetchWishlist(user.uid);
    } catch (err) {
      console.error("Error removing wishlist:", err);
    }
  };

  return (
    <div className="wishlist-container p-4">
      <h2 className="text-xl font-bold mb-4">My Wishlist</h2>

      {wishlist.length === 0 ? (
        <p>No items in wishlist yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 shadow-md flex flex-col items-center"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-32 h-32 object-cover mb-2"
              />
              <h3 className="font-semibold">{item.name}</h3>
              <p>₹{item.price}</p>
              <button
                onClick={() => removeFromWishlist(item.id)}
                className="mt-2 bg-red-500 text-white px-3 py-1 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
