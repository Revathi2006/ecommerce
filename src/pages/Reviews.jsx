// src/pages/Reviews.jsx
import React, { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";
import "../assets/css/reviews.css";

// 🔹 Firebase config
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

// 🔹 Render stars
const renderStars = (rating) => (
  <span className="stars">
    {Array.from({ length: 5 }, (_, i) => (i < rating ? "★" : "☆")).join("")}
  </span>
);

// 🔹 Dummy reviews for fallback
const dummyReviews = [
  { id: "d1", name: "Alice", review: "Great product, highly recommend!", rating: 5 },
  { id: "d2", name: "Bob", review: "Decent quality, but a bit pricey.", rating: 3 },
  { id: "d3", name: "Charlie", review: "Fast delivery and good packaging.", rating: 4 },
];

const Reviews = () => {
  const { productId } = useParams();
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // 🔹 Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Fetch reviews with buyer fullName
  const fetchReviews = useCallback(async () => {
    if (!currentUser) return; // wait until currentUser is set
    setLoading(true);
    try {
      const reviewsRef = collection(db, "reviews");
      const q = query(
        reviewsRef,
        where("productId", "==", productId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      const firestoreReviews = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let userName = "User";

          if (data.userId) {
            const buyerRef = doc(db, "buyers", data.userId);
            const buyerSnap = await getDoc(buyerRef);
            if (buyerSnap.exists()) {
              const buyerData = buyerSnap.data();
              userName =
                buyerData.fullName ||
                `${buyerData.firstName || ""} ${buyerData.lastName || ""}`.trim() ||
                "User";
            }
          }

          return {
            id: docSnap.id,
            name: data.userId === currentUser.uid ? "You" : userName,
            review: data.review,
            rating: data.rating,
          };
        })
      );

      // 🔹 Merge with dummy reviews if none exist
      if (firestoreReviews.length === 0) {
        setReviews(dummyReviews);
      } else {
        setReviews(firestoreReviews);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviews(dummyReviews); // fallback to dummy reviews on error
    } finally {
      setLoading(false);
    }
  }, [productId, currentUser]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews, currentUser]);

  // 🔹 Add new review (optimistic update)
  const handleAddReview = async () => {
    if (!currentUser) {
      alert("You must be logged in to add a review.");
      return;
    }
    if (!newReview.trim()) {
      alert("Review cannot be empty.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "reviews"), {
        productId,
        review: newReview.trim(),
        rating: newRating,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // ✅ Optimistic update in UI
      setReviews((prev) => [
        {
          id: docRef.id,
          name: "You",
          review: newReview.trim(),
          rating: newRating,
        },
        ...prev,
      ]);

      setNewReview("");
      setNewRating(5);
    } catch (err) {
      console.error("Error adding review:", err);
    }
  };

  return (
    <div className="reviews-page">
      <h2>Product Reviews</h2>

      {currentUser && (
        <div className="add-review">
          <textarea
            placeholder="Write your review..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
          />
          <div className="rating-row">
            <label>Rating: </label>
            <select
              value={newRating}
              onChange={(e) => setNewRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-add-review" onClick={handleAddReview}>
            Add Review
          </button>
        </div>
      )}

      <div className="reviews-list">
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="review-card">
              <strong>{r.name}</strong>
              <br />
              <strong>Rating:</strong> {renderStars(r.rating)}
              <p>{r.review}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
