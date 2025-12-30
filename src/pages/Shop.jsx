// src/pages/Shop.jsx
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
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../assets/css/shop.css";

// Icons
import {
  FaSearch,
  FaMicrophone,
  FaShoppingCart,
  FaHeart,
  FaStar,
  FaRegStar,
  FaFilter,
  FaTshirt,
  FaLaptop,
  FaGem,
  FaShoePrints,
  FaHome,
  FaChevronRight,
  FaChevronLeft,
  FaTimes,
  FaShoppingBag,
  FaCheck,
  FaCoins,
  FaRobot,
  FaBolt,
  FaFire,
  FaTag,
  FaEye,
  FaExclamationTriangle,
} from "react-icons/fa";

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

// Improved category structure with better mapping
const CATEGORY_STRUCTURE = {
  "men-fashion": {
    label: "Men's Fashion",
    icon: FaTshirt,
    keywords: ["shirt", "t-shirt", "tshirt", "jeans", "jacket", "suit", "pant", "trouser", "men", "man", "mens", "formal", "casual", "shorts", "sweater", "hoodie", "blazer", "tie"]
  },
  "women-fashion": {
    label: "Women's Fashion",
    icon: FaGem,
    keywords: ["dress", "skirt", "top", "legging", "saree", "kurta", "women", "woman", "womens", "sari", "lehenga", "blouse", "gown", "jumpsuit"]
  },
  "electronics": {
    label: "Electronics",
    icon: FaLaptop,
    keywords: ["phone", "laptop", "headphone", "electronic", "mobile", "tablet", "smartwatch", "charger", "cable", "powerbank", "speaker", "earphone", "smartphone", "computer"]
  },
  "accessories": {
    label: "Accessories",
    icon: FaGem,
    keywords: ["watch", "bag", "jewelry", "sunglass", "accessory", "belt", "wallet", "jewellery", "necklace", "bracelet", "ring", "earing", "earring", "pendant", "handbag"]
  },
  "footwear": {
    label: "Footwear",
    icon: FaShoePrints,
    keywords: ["shoe", "sneaker", "footwear", "sandal", "boot", "slipper", "loafer", "heel", "flats"]
  },
  "home-appliances": {
    label: "Home Appliances",
    icon: FaHome,
    keywords: ["home", "kitchen", "appliance", "clean", "tv", "furniture", "refrigerator", "fridge", "washing", "machine", "microwave", "oven"]
  }
};
const CATEGORY_MAP = {
  "men-fashion": ["mens", "men fashion", "mens fashion","tshirt"],
  "women-fashion": ["women", "womens", "women fashion", "womens fashion","saree","sarees","silk sarees"],
  electronics: ["electronics", "electronic"],
  accessories: ["accessories", "accessory"],
  footwear: ["footwear", "shoe", "shoes"],
  "home-appliances": ["home-appliance", "home appliance"]

  };




const CATEGORY_ICONS = {
  "men-fashion": FaTshirt,
  "women-fashion": FaGem,
  "electronics": FaLaptop,
  "accessories": FaGem,
  "footwear": FaShoePrints,
  "home-appliances": FaHome,
};

const formatLabel = (text = "") =>
  text.toString().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const renderStars = (rating, size = 16) => {
  const fullStars = Math.floor(rating || 0);
  const hasHalfStar = (rating || 0) % 1 >= 0.5;
  
  return (
    <div className="stars-container">
      {Array.from({ length: 5 }, (_, i) => {
        if (i < fullStars) {
          return <FaStar key={i} className="star filled" size={size} />;
        } else if (i === fullStars && hasHalfStar) {
          return <FaStar key={i} className="star half" size={size} />;
        } else {
          return <FaRegStar key={i} className="star empty" size={size} />;
        }
      })}
      <span className="rating-text">{(rating || 0).toFixed(1)}</span>
    </div>
  );
};

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
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
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Track user authentication and points
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const buyerRef = doc(db, "buyers", u.uid);
        const unsubscribeBuyer = onSnapshot(buyerRef, (buyerSnap) => {
          if (buyerSnap.exists()) {
            setPoints(buyerSnap.data().points || 0);
          }
        });

        // Fetch cart count
        const cartQuery = query(collection(db, "cart"), where("userId", "==", u.uid));
        const cartUnsubscribe = onSnapshot(cartQuery, (snapshot) => {
          setCartCount(snapshot.size);
        });

        // Fetch wishlist count
        const wishlistQuery = query(collection(db, "wishlist"), where("userId", "==", u.uid));
        const wishlistUnsubscribe = onSnapshot(wishlistQuery, (snapshot) => {
          setWishlistCount(snapshot.size);
        });

        return () => {
          unsubscribeBuyer();
          cartUnsubscribe();
          wishlistUnsubscribe();
        };
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to fetch from all product collections
        const productCollections = ["products-details", "products"];
        let allProducts = [];

        for (const collectionName of productCollections) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            const items = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              
              // Normalize product data
              return {
                id: docSnap.id,
                name: data.name || data.productName || "Unnamed Product",
                description: data.description || data.productDescription || "",
                price: Number(data.price) || Number(data.productPrice) || 0,
                category: (data.category || data.productCategory || "general").toLowerCase(),
                image: data.image || data.imageUrl || data.productImage || "https://via.placeholder.com/300x300?text=No+Image",
                images: data.images || [data.image || data.imageUrl || ""].filter(Boolean),
                brand: data.brand || "",
                sizes: data.sizes || data.size || [],
                colors: data.colors || data.color || [],
                stock: data.stock || data.quantity || 0,
                createdAt: data.createdAt || data.timestamp || new Date(),
                originalPrice: data.originalPrice || data.mrp || null,
                discount: data.discount || 0,
              };
            });
            allProducts = [...allProducts, ...items];
          } catch (err) {
            console.warn(`Failed to fetch from ${collectionName}:`, err);
          }
        }

        // Remove duplicates based on ID
        const uniqueProducts = allProducts.filter((product, index, self) =>
          index === self.findIndex((p) => p.id === product.id)
        );

        console.log(`Fetched ${uniqueProducts.length} unique products`);

        // Fetch reviews for ratings
        try {
          const reviewSnap = await getDocs(collection(db, "reviews"));
          const reviewsData = reviewSnap.docs.map((d) => d.data());

          const productRatings = {};
          const productReviewCounts = {};
          
          reviewsData.forEach((r) => {
            if (r.productId) {
              if (!productRatings[r.productId]) {
                productRatings[r.productId] = [];
                productReviewCounts[r.productId] = 0;
              }
              productRatings[r.productId].push(r.rating || 0);
              productReviewCounts[r.productId]++;
            }
          });

          // Attach average rating to products
          const productsWithRating = uniqueProducts.map((p) => {
            const ratings = productRatings[p.id] || [];
            const avgRating = ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
              : 0;
            
            return {
              ...p,
              avgRating,
              reviewCount: productReviewCounts[p.id] || 0,
            };
          });

          setProducts(productsWithRating);
        } catch (reviewErr) {
          console.warn("Failed to fetch reviews, continuing without ratings:", reviewErr);
          setProducts(uniqueProducts.map(p => ({ ...p, avgRating: 0, reviewCount: 0 })));
        }

      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Voice search - FIXED: Removes punctuation
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert("Your browser doesn't support voice recognition. Please try Chrome, Edge, or Safari.");
      return;
    }

    setIsListening(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice recognition result:", transcript);
      
      // Remove punctuation (.,!?) from the transcript
      const cleanedTranscript = transcript.replace(/[.,!?]/g, '').trim();
      console.log("Cleaned transcript:", cleanedTranscript);
      
      setSearchTerm(cleanedTranscript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please allow microphone access in your browser settings.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
    }
  };

  // Fetch reviews for a product
    // Fetch reviews for a product
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
            timestamp: data.createdAt?.toDate() || new Date(),
          };
        })
      );

      // Sort by most recent
      list.sort((a, b) => b.timestamp - a.timestamp);
      setReviews(list);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const addReview = async () => {
    if (!user) {
      alert("Please login to add a review");
      navigate("/buyer/login");
      return;
    }
    if (!newReview.trim()) {
      alert("Review cannot be empty");
      return;
    }

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

  // Filtering and sorting - COMPLETELY FIXED
  const filteredProducts = useMemo(() => {
    let list = [...products];
    
    console.log("Total products:", list.length);
    
    // 1. Apply category filter - FIXED
 if (selectedCategory) {
  const allowed = CATEGORY_MAP[selectedCategory] || [];

  list = list.filter((p) => {
    const text = `
      ${(p.category || "")}
      ${(p.name || "")}
      ${(p.description || "")}
    `.toLowerCase();

    const hasWord = (word) =>
      new RegExp(`\\b${word}\\b`, "i").test(text);

    // 🚫 Block women-only items when MEN selected
    if (
      selectedCategory === "men-fashion" &&
      (hasWord("women") || hasWord("ladies") || hasWord("female"))
    ) {
      return false;
    }

    // 🚫 Block men-only items when WOMEN selected
    if (
      selectedCategory === "women-fashion" &&
      (hasWord("men") || hasWord("mens") || hasWord("male"))
    ) {
      return false;
    }

    // ✅ Allow only matching category keywords
    return allowed.some((c) => text.includes(c));
  });
}

    // 2. Apply search filter - FIXED
    if (searchTerm.trim()) {
      const searchQuery = searchTerm.toLowerCase().trim();
      list = list.filter((p) => {
        const searchFields = [
          p.name?.toLowerCase(),
          p.description?.toLowerCase(),
          p.category?.toLowerCase(),
          p.brand?.toLowerCase(),
        ].filter(Boolean);
        
        return searchFields.some(field => field.includes(searchQuery));
      });
      console.log(`After search filter (${searchTerm}):`, list.length);
    }
    
    // 3. Apply rating filter - FIXED
    if (ratingFilter) {
      const minRating = parseInt(ratingFilter);
      list = list.filter((p) => Math.floor(p.avgRating || 0) >= minRating);
      console.log(`After rating filter (${minRating}+):`, list.length);
    }
    
    // 4. Apply sorting - FIXED
    if (sortOption === "low-high") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === "high-low") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === "rating") {
      list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    } else if (sortOption === "new") {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    
    console.log("Final filtered products:", list.length);
    return list;
  }, [products, selectedCategory, searchTerm, sortOption, ratingFilter]);

  // Cart operations
  const addToCart = async (product) => {
    if (!user) {
      alert("Please login to add items to cart");
      navigate("/buyer/login");
      return;
    }

    try {
      const cartId = `cart_${product.id}_${user.uid}`;
      const cartRef = doc(db, "cart", cartId);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const currentData = cartSnap.data();
        await setDoc(cartRef, {
          ...currentData,
          quantity: (currentData.quantity || 1) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(cartRef, {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
          size: selectedSize || (product.sizes?.[0] || "M"),
          color: product.colors?.[0] || "",
          createdAt: serverTimestamp(),
          userId: user.uid,
          userEmail: user.email,
        });
      }

      // Show success feedback
      const btn = document.getElementById(`cart-btn-${product.id}`);
      if (btn) {
        btn.classList.add("success");
        setTimeout(() => btn.classList.remove("success"), 2000);
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add to cart. Please try again.");
    }
  };

  // Add to wishlist
  const addToWishlist = async (product) => {
    if (!user) {
      alert("Please login to add to wishlist");
      navigate("/buyer/login");
      return;
    }

    try {
      const wishId = `wish_${product.id}_${user.uid}`;
      await setDoc(doc(db, "wishlist", wishId), {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize || (product.sizes?.[0] || "M"),
        color: product.colors?.[0] || "",
        createdAt: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email,
      });

      // Show success feedback
      const btn = document.getElementById(`wishlist-btn-${product.id}`);
      if (btn) {
        btn.classList.add("success");
        setTimeout(() => btn.classList.remove("success"), 2000);
      }
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      alert("Failed to add to wishlist. Please try again.");
    }
  };

  // Buy Now functionality
  const buyNow = async (product) => {
    if (!user) {
      alert("Please login to proceed");
      navigate("/buyer/login");
      return;
    }

    try {
      // First add to cart
      await addToCart(product);
      
      // Then navigate to checkout
      navigate("/checkout", {
        state: {
          items: [
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              quantity: 1,
              size: selectedSize || (product.sizes?.[0] || "M"),
            },
          ],
        },
      });
    } catch (err) {
      console.error("Error during Buy Now:", err);
      alert("Failed to proceed to checkout");
    }
  };

  // Quick view modal
  const openQuickView = (product) => {
    setActiveProduct(product);
    setActiveImageIndex(0);
    setSelectedSize(product.sizes?.[0] || "");
    setShowModal(true);
    fetchReviews(product.id);
  };

  const closeQuickView = () => {
    setShowModal(false);
    setActiveProduct(null);
    setSelectedSize("");
    setActiveImageIndex(0);
    setReviews([]);
    setNewReview("");
    setNewRating(5);
  };

  // Product image gallery
  const galleryImages = (p) => {
    if (!p) return ["https://via.placeholder.com/600x600?text=No+Image"];
    
    if (Array.isArray(p.images) && p.images.length > 0) {
      return p.images.filter(img => img && img.trim() !== "");
    }
    
    if (p.image && p.image.trim() !== "") {
      return [p.image];
    }
    
    return ["https://via.placeholder.com/600x600?text=No+Image"];
  };

  const nextImage = () => {
    const images = galleryImages(activeProduct);
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = galleryImages(activeProduct);
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Product badges - FIXED: No "0 left in stock"
  const getProductBadges = (product) => {
    const badges = [];
    
    if (product.price > 5000) {
      badges.push({ text: "Premium", color: "#FFD700", icon: <FaGem /> });
    }
    if (product.avgRating >= 4.5) {
      badges.push({ text: "Top Rated", color: "#FF6B6B", icon: <FaFire /> });
    }
    if (product.price < 1000) {
      badges.push({ text: "Budget", color: "#4CAF50", icon: <FaTag /> });
    }
    if (product.discount > 20) {
      badges.push({ text: `${product.discount}% OFF`, color: "#FF4081", icon: <FaTag /> });
    }
    // Only show low stock if stock is between 1-9
    if (product.stock > 0 && product.stock < 10) {
      badges.push({ text: "Low Stock", color: "#FF9800", icon: <FaExclamationTriangle /> });
    }
    
    return badges;
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Handle category click
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory("");
    setRatingFilter("");
    setSortOption("");
    setSearchTerm("");
  };

  return (
    <div className="shop-container">
      {/* AI Assistant Button */}
      <div className="ai-assistant-btn" onClick={() => navigate("/chatbot")}>
        <FaRobot className="ai-icon" />
        <span className="ai-text">AI Assistant</span>
      </div>

      {/* Sidebar - NO SUBCATEGORIES */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>
            <FaFilter className="sidebar-icon" />
            Filters
          </h2>
          <button 
            className="clear-filters" 
            onClick={clearAllFilters}
          >
            Clear All
          </button>
        </div>

        <div className="categories-section">
          <h3>Categories</h3>
          <div className="categories-list">
            {Object.entries(CATEGORY_STRUCTURE).map(([catKey, catData]) => {
              const Icon = catData.icon;
              return (
                <div
                  key={catKey}
                  className={`category-item ${selectedCategory === catKey ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(catKey)}
                >
                  <Icon className="category-icon" />
                  <span className="category-name">{catData.label}</span>
                  <FaChevronRight className="category-arrow" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="points-card">
          <div className="points-header">
            <FaCoins className="points-icon" />
            <h3>Your Rewards</h3>
          </div>
          <div className="points-value">{points.toLocaleString()} Points</div>
          <p className="points-info">Earn 10 points for every ₹100 spent</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="shop-header">
          <div className="header-left">
            <h1 className="shop-title">Premium Shopping</h1>
            <p className="shop-subtitle">Discover amazing products</p>
          </div>

          <div className="header-right">
            <div className="user-stats">
              <div className="stat-item" onClick={() => navigate("/cart")} style={{ cursor: "pointer" }}>
                <FaShoppingCart className="stat-icon" />
                <span className="stat-count">{cartCount}</span>
                <span className="stat-label">Cart</span>
              </div>
              <div className="stat-item" onClick={() => navigate("/wishlist")} style={{ cursor: "pointer" }}>
                <FaHeart className="stat-icon" />
                <span className="stat-count">{wishlistCount}</span>
                <span className="stat-label">Wishlist</span>
              </div>
              <div className="stat-item points">
                <FaCoins className="stat-icon" />
                <span className="stat-count">{points}</span>
                <span className="stat-label">Points</span>
              </div>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search products, brands, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && console.log("Search triggered:", searchTerm)}
            />
            <button
              className={`voice-search-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceSearch}
              title="Voice Search"
              type="button"
              disabled={isListening}
            >
              <FaMicrophone className="voice-icon" />
              {isListening && <span className="listening-pulse"></span>}
            </button>
            {searchTerm && (
              <button className="search-clear-btn" onClick={clearSearch}>
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filter Options */}
          <div className="filter-options">
            <select 
              className="filter-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="">Sort By</option>
              <option value="new">Newest First</option>
              <option value="rating">Top Rated</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>

            <select 
              className="filter-select"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="">Filter by Rating</option>
              <option value="5">★★★★★ 5 Stars</option>
              <option value="4">★★★★☆ 4+ Stars</option>
              <option value="3">★★★☆☆ 3+ Stars</option>
              <option value="2">★★☆☆☆ 2+ Stars</option>
              <option value="1">★☆☆☆☆ 1+ Stars</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedCategory || searchTerm || ratingFilter) && (
          <div className="active-filters">
            <span className="filters-label">Active Filters:</span>
            {selectedCategory && (
              <span className="filter-tag">
                {CATEGORY_STRUCTURE[selectedCategory]?.label || formatLabel(selectedCategory)}
                <button onClick={() => setSelectedCategory("")} className="filter-remove">
                  <FaTimes />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="filter-tag">
                Search: "{searchTerm}"
                <button onClick={clearSearch} className="filter-remove">
                  <FaTimes />
                </button>
              </span>
            )}
            {ratingFilter && (
              <span className="filter-tag">
                Rating: {ratingFilter}+ Stars
                <button onClick={() => setRatingFilter("")} className="filter-remove">
                  <FaTimes />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Products Grid */}
        <section className="products-section">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>{error}</h3>
              <button 
                className="error-retry-btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No products found</h3>
              <p>Try adjusting your search or filters</p>
              <button 
                className="empty-action-btn"
                onClick={clearAllFilters}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {filteredProducts.map((product) => {
                  const badges = getProductBadges(product);
                  const images = galleryImages(product);
                  
                  return (
                    <div
                      key={product.id}
                      className="product-card"
                      onMouseEnter={() => setHoveredProduct(product.id)}
                      onMouseLeave={() => setHoveredProduct(null)}
                    >
                      {/* Product Badges */}
                      {badges.length > 0 && (
                        <div className="product-badges">
                          {badges.map((badge, idx) => (
                            <span
                              key={idx}
                              className="badge"
                              style={{ backgroundColor: badge.color }}
                            >
                              {badge.icon}
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Product Image */}
                      <div className="product-image-container">
                        <img
                          src={images[0]}
                          alt={product.name}
                          className="product-image"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/300x300?text=No+Image";
                          }}
                        />
                        <div className={`product-overlay ${hoveredProduct === product.id ? 'visible' : ''}`}>
                          <button 
                            className="quick-view-btn"
                            onClick={() => openQuickView(product)}
                          >
                            <FaEye /> Quick View
                          </button>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="product-info">
                        <h3 className="product-name" title={product.name}>
                          {product.name.length > 50 ? `${product.name.substring(0, 50)}...` : product.name}
                        </h3>
                        <p className="product-category">
                          {formatLabel(product.category || "General")}
                        </p>
                        
                        <div className="product-rating">
                          {renderStars(product.avgRating || 0, 14)}
                          <span className="review-count">({product.reviewCount})</span>
                        </div>

                        <div className="product-price">
                          <span className="current-price">₹{(product.price || 0).toLocaleString()}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <>
                              <span className="original-price">₹{product.originalPrice.toLocaleString()}</span>
                              <span className="discount-percent">
                                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                              </span>
                            </>
                          )}
                        </div>

                        {/* Stock Status - Only show if stock is low but greater than 0 */}
                        {product.stock > 0 && product.stock < 10 && (
                          <div className="stock-status">
                            <span className="low-stock">Only {product.stock} left in stock</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="product-actions">
                          <button
                            id={`cart-btn-${product.id}`}
                            className="action-btn cart-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                          >
                            <FaShoppingCart />
                            <span>Add to Cart</span>
                            <FaCheck className="success-icon" />
                          </button>
                          <button
                            id={`wishlist-btn-${product.id}`}
                            className="action-btn wishlist-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToWishlist(product);
                            }}
                          >
                            <FaHeart />
                            <span>Wishlist</span>
                            <FaCheck className="success-icon" />
                          </button>
                          <button
                            className="action-btn buy-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              buyNow(product);
                            }}
                          >
                            <FaShoppingBag />
                            <span>Buy Now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Results Info */}
              <div className="results-info">
                Showing {filteredProducts.length} of {products.length} products
                {selectedCategory && ` in "${CATEGORY_STRUCTURE[selectedCategory]?.label || formatLabel(selectedCategory)}"`}
                {searchTerm && ` for "${searchTerm}"`}
                {ratingFilter && ` with ${ratingFilter}+ star rating`}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Product Quick View Modal */}
      {showModal && activeProduct && (
        <div className="modal-backdrop" onClick={closeQuickView}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeQuickView}>
              <FaTimes />
            </button>

            <div className="modal-content">
              {/* Left Side - Images */}
              <div className="modal-left">
                <div className="main-image-container">
                  <img
                    src={galleryImages(activeProduct)[activeImageIndex]}
                    alt={activeProduct.name}
                    className="main-image"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/600x600?text=No+Image";
                    }}
                  />
                  <button className="image-nav prev" onClick={prevImage}>
                    <FaChevronLeft />
                  </button>
                  <button className="image-nav next" onClick={nextImage}>
                    <FaChevronRight />
                  </button>
                </div>

                <div className="thumbnail-container">
                  {galleryImages(activeProduct).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${activeProduct.name} ${idx + 1}`}
                      className={`thumbnail ${idx === activeImageIndex ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80x80?text=No+Image";
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Right Side - Details */}
              <div className="modal-right">
                <div className="modal-header">
                  <h2 className="modal-title">{activeProduct.name}</h2>
                  <div className="modal-rating">
                    {renderStars(activeProduct.avgRating || 0, 18)}
                    <span className="modal-review-count">({activeProduct.reviewCount} reviews)</span>
                  </div>
                </div>

                <div className="modal-price">
                  <span className="current">₹{(activeProduct.price || 0).toLocaleString()}</span>
                  {activeProduct.originalPrice && activeProduct.originalPrice > activeProduct.price && (
                    <>
                      <span className="original">₹{activeProduct.originalPrice.toLocaleString()}</span>
                      <span className="modal-discount">
                        Save ₹{(activeProduct.originalPrice - activeProduct.price).toLocaleString()} ({Math.round(((activeProduct.originalPrice - activeProduct.price) / activeProduct.originalPrice) * 100)}% off)
                      </span>
                    </>
                  )}
                </div>

                <p className="modal-description">
                  {activeProduct.description || "No description available"}
                </p>

                {/* Brand & Stock */}
                <div className="modal-details">
                  {activeProduct.brand && (
                    <div className="detail-item">
                      <strong>Brand:</strong> {activeProduct.brand}
                    </div>
                  )}
                  <div className="detail-item">
                    <strong>Stock:</strong> 
                    <span className={activeProduct.stock > 0 ? "in-stock" : "out-of-stock"}>
                      {activeProduct.stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                </div>

                {/* Size Selection */}
                {activeProduct.sizes && activeProduct.sizes.length > 0 && (
                  <div className="size-section">
                    <h4>Select Size</h4>
                    <div className="size-options">
                      {activeProduct.sizes.map((size) => (
                        <button
                          key={size}
                          className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                          onClick={() => setSelectedSize(size)}
                          disabled={activeProduct.stock <= 0}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="modal-actions">
                  <button
                    className="modal-action-btn primary"
                    onClick={() => {
                      addToCart(activeProduct);
                    }}
                    disabled={activeProduct.stock <= 0}
                  >
                    <FaShoppingCart />
                    Add to Cart
                  </button>
                  <button
                    className="modal-action-btn secondary"
                    onClick={() => buyNow(activeProduct)}
                    disabled={activeProduct.stock <= 0}
                  >
                    <FaShoppingBag />
                    Buy Now
                  </button>
                  <button
                    className="modal-action-btn outline"
                    onClick={() => addToWishlist(activeProduct)}
                  >
                    <FaHeart />
                    Add to Wishlist
                  </button>
                </div>

                {/* Reviews Section */}
                <div className="reviews-section">
                  <div className="reviews-header">
                    <h3>Customer Reviews ({activeProduct.reviewCount})</h3>
                    <button 
                      className="write-review-btn" 
                      onClick={() => {
                        if (!user) {
                          alert("Please login to write a review");
                          navigate("/buyer/login");
                          return;
                        }
                        document.querySelector('.review-textarea')?.focus();
                      }}
                    >
                      Write a Review
                    </button>
                  </div>

                  {/* Add Review Form */}
                  {user && (
                    <div className="add-review-form">
                      <textarea
                        className="review-textarea"
                        placeholder="Share your experience with this product..."
                        value={newReview}
                        onChange={(e) => setNewReview(e.target.value)}
                        rows="3"
                      />
                      <div className="review-form-footer">
                        <div className="rating-selector">
                          <span>Your Rating:</span>
                          <div className="star-selector">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar
                                key={star}
                                className={`selector-star ${star <= newRating ? 'selected' : ''}`}
                                onClick={() => setNewRating(star)}
                                size={20}
                              />
                            ))}
                          </div>
                        </div>
                        <button 
                          className="submit-review-btn" 
                          onClick={addReview}
                          disabled={!newReview.trim()}
                        >
                          Submit Review
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="reviews-list">
                    {reviews.length === 0 ? (
                      <p className="no-reviews">No reviews yet. Be the first to review!</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <div className="reviewer-name">{review.userName}</div>
                              <div className="review-date">
                                {review.timestamp.toLocaleDateString()}
                              </div>
                            </div>
                            <div className="review-rating">
                              {renderStars(review.rating, 14)}
                            </div>
                          </div>
                          <p className="review-content">{review.review}</p>
                        </div>
                      ))
                    )}
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