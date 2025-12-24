import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  addDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../assets/css/shop.css";

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

const CATEGORY_MAP = {
  dresses: ["mens-dresses", "womens-dresses"],
  electronics: [],
  accessories: ["men", "women"],
  footwear: ["men", "women"],
  "home-appliances": [],
};

const formatLabel = (text = "") =>
  text.toString().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const renderStars = (rating) => (
  <span className="stars">
    {Array.from({ length: 5 }, (_, i) => (i < rating ? "★" : "☆")).join("")}
  </span>
);

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0); // Reward points
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);

  const navigate = useNavigate();

  // 🔹 Track logged-in user and fetch points in real time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const buyerRef = doc(db, "buyers", u.uid);

        // Live listener for buyer points
        const unsubscribeBuyer = onSnapshot(buyerRef, (buyerSnap) => {
          if (buyerSnap.exists()) {
            setPoints(buyerSnap.data().points || 0);
          }
        });

        return () => unsubscribeBuyer();
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch products and ratings
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap1 = await getDocs(collection(db, "products-details"));
        const items1 = snap1.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          image: docSnap.data().image || "",
        }));

        const snap2 = await getDocs(collection(db, "products"));
        const items2 = snap2.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          image: docSnap.data().imageUrl || "",
        }));

        const allProducts = [...items1, ...items2];

        // Fetch all reviews and attach average rating
        const reviewSnap = await getDocs(collection(db, "reviews"));
        const reviewsData = reviewSnap.docs.map((d) => d.data());

        const productRatings = {};
        reviewsData.forEach((r) => {
          if (!productRatings[r.productId]) productRatings[r.productId] = [];
          productRatings[r.productId].push(r.rating);
        });

        const productsWithRating = allProducts.map((p) => {
          const ratings = productRatings[p.id] || [];
          const avgRating =
            ratings.length > 0
              ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
              : 0;
          return { ...p, avgRating };
        });

        setProducts(productsWithRating);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, []);

  // Voice search
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support voice search.");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = event.results[0][0].transcript.replace(/[.,!?]$/, "").trim();
      setSearchTerm(transcript);
    };
    recognition.onerror = (event) => console.error("Speech recognition error", event.error);
    recognition.start();
  };

  // Fetch reviews for one product (Quick view)
  const fetchReviews = async (productId) => {
    try {
      const q = query(collection(db, "reviews"), where("productId", "==", productId));
      const snapshot = await getDocs(q);

      const list = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          let userName = "User";
          if (data.userId) {
            const buyerRef = doc(db, "buyers", data.userId);
            const buyerSnap = await getDoc(buyerRef);
            if (buyerSnap.exists()) {
              const buyerData = buyerSnap.data();
              userName =
                data.userId === user?.uid
                  ? "You"
                  : buyerData.fullName ||
                    `${buyerData.firstName || ""} ${buyerData.lastName || ""}`.trim() ||
                    "User";
            }
          }
          return {
            id: d.id,
            review: data.review,
            rating: data.rating,
            userName,
          };
        })
      );

      setReviews(list);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const addReview = async () => {
    if (!user) return alert("Login to add review");
    if (!newReview.trim()) return alert("Review cannot be empty");

    try {
      await addDoc(collection(db, "reviews"), {
        productId: activeProduct.id,
        review: newReview,
        rating: newRating,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewReview("");
      setNewRating(5);
      fetchReviews(activeProduct.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering and sorting
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.subcategory?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) list = list.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (selectedSubCategory && CATEGORY_MAP[selectedCategory]?.length > 0)
      list = list.filter((p) => p.subcategory?.toLowerCase() === selectedSubCategory.toLowerCase());
    if (ratingFilter) list = list.filter((p) => p.avgRating === Number(ratingFilter));
    if (sortOption === "low-high") list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortOption === "high-low") list.sort((a, b) => (b.price || 0) - (a.price || 0));
    return list;
  }, [products, searchTerm, selectedCategory, selectedSubCategory, sortOption, ratingFilter]);

  // Cart, Wishlist, Buy Now...
  const addToCart = async (product) => {
    if (!user) return alert("Login first") && navigate("/login");

    try {
      const cartId = `${product.id}_${Date.now()}`;
      await setDoc(doc(db, "cart", cartId), {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        size: selectedSize || null,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      alert("Added to cart!");
    } catch (err) {
      console.error(err);
    }
  };

  const addToWishlist = async (product) => {
    if (!user) return alert("Login first") && navigate("/login");

    try {
      const wishId = `${product.id}_${user.uid}`;
      await setDoc(doc(db, "wishlist", wishId), {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize || null,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      alert("Added to wishlist!");
    } catch (err) {
      console.error(err);
    }
  };

  // Buy Now with reward points
  const buyNow = async (product) => {
    if (!user) return alert("Login first") && navigate("/login");

    try {
      // Fetch buyer info from Firestore
      const buyerRef = doc(db, "buyers", user.uid);
      const buyerSnap = await getDoc(buyerRef);
      let buyerData = {};
      if (buyerSnap.exists()) {
        buyerData = buyerSnap.data(); // contains fullName, email, address, points, etc.
      }

      navigate("/checkout", {
        state: {
          items: [
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              quantity: 1,
              size: selectedSize || null,
            },
          ],
          buyerInfo: {
            fullName: buyerData.fullName || "",
            email: buyerData.email || "",
            address: buyerData.address || "",
          },
          points: buyerData.points || 0, // pass available points
        },
      });
    } catch (err) {
      console.error("Error during Buy Now:", err);
    }
  };

  const openQuickView = (product) => {
    setActiveProduct(product);
    setActiveImageIndex(0);
    setSelectedSize("");
    setShowModal(true);
    fetchReviews(product.id);
  };

  const closeQuickView = () => {
    setShowModal(false);
    setActiveProduct(null);
    setSelectedSize("");
    setActiveImageIndex(0);
    setReviews([]);
  };

  const galleryImages = (p) => {
    if (!p) return [];
    if (Array.isArray(p.images) && p.images.length) return p.images;
    return [p.image || "https://via.placeholder.com/600x600?text=No+Image"];
  };

  return (
    <div className="shop-container">
      <aside id="categories">
        <h3>Categories</h3>
        <ul>
          {Object.keys(CATEGORY_MAP).map((cat) => (
            <li
              key={cat}
              className={selectedCategory === cat ? "active" : ""}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedSubCategory("");
              }}
            >
              {formatLabel(cat)}
            </li>
          ))}
        </ul>
        {selectedCategory && CATEGORY_MAP[selectedCategory].length > 0 && (
          <>
            <h4>Subcategories</h4>
            <ul>
              {CATEGORY_MAP[selectedCategory].map((sub) => (
                <li
                  key={sub}
                  className={selectedSubCategory === sub ? "active" : ""}
                  onClick={() => setSelectedSubCategory(sub)}
                >
                  {formatLabel(sub)}
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <main className="main-content">
        <header className="shop-header">
          <h1>Shop</h1>
          <div className="actions">
            <div className="voice-search-wrapper">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button" className="voice-btn" onClick={startVoiceSearch}>
                🎤
              </button>
            </div>

            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="">Sort By</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>

            <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="">Filter by Rating</option>
              <option value="5">★★★★★ (5 Stars)</option>
              <option value="4">★★★★☆ (4 Stars)</option>
              <option value="3">★★★☆☆ (3 Stars)</option>
              <option value="2">★★☆☆☆ (2 Stars)</option>
              <option value="1">★☆☆☆☆ (1 Star)</option>
            </select>

            <div className="points-display">Points: {points}</div>

            <button onClick={() => navigate("/cart")} className="cart-btn">
              Cart
            </button>
          </div>
        </header>

        <section id="products">
          {filteredProducts.length === 0 ? (
            <p>No products found</p>
          ) : (
            filteredProducts.map((p) => (
              <div key={p.id} className="product-card">
                <div className="img-wrap" onClick={() => openQuickView(p)}>
                  <img src={p.image || "https://via.placeholder.com/300"} alt={p.name} />
                </div>
                <h4>{p.name}</h4>
                <p>₹{p.price}</p>
                <div>{renderStars(p.avgRating || 0)}</div>
                <div className="product-actions">
                  <button onClick={() => addToCart(p)}>Add to Cart</button>
                  <button onClick={() => buyNow(p)}>Buy Now</button>
                  <button onClick={() => addToWishlist(p)}>♥ Wishlist</button>
                  <button onClick={() => openQuickView(p)}>View Reviews</button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {showModal && activeProduct && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target.classList.contains("modal-backdrop")) closeQuickView();
          }}
        >
          <div className="modal">
            <div className="modal-body">
              <div className="modal-main-image">
                <img src={galleryImages(activeProduct)[activeImageIndex]} alt={activeProduct.name} />
              </div>
              <div className="modal-right">
                <h2>{activeProduct.name}</h2>
                <div>₹{activeProduct.price ?? "—"}</div>
                <div>{renderStars(activeProduct.avgRating || 0)}</div>

                <div className="reviews-section">
                  <h3>Reviews</h3>
                  {user && (
                    <div className="add-review">
                      <textarea
                        placeholder="Write your review..."
                        value={newReview}
                        onChange={(e) => setNewReview(e.target.value)}
                      />
                      <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))}>
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button onClick={addReview}>Submit Review</button>
                    </div>
                  )}
                  <div className="reviews-list">
                    {reviews.map((r) => (
                      <div key={r.id} className="review-card">
                        <strong>{r.userName}</strong>
                        <div>{renderStars(r.rating)}</div>
                        <p>{r.review}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
