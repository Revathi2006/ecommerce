// src/pages/Home.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { FaRobot, FaCoins, FaShoppingCart, FaHeart, FaShoppingBag, FaStar, FaFire, FaGem, FaBolt, FaTag, FaChevronLeft, FaChevronRight, FaUser, FaHome, FaBox, FaList, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaStore, FaUserShield, FaCrown, FaTimes, FaCheck, FaExclamationCircle, FaSearch } from "react-icons/fa";
import "../assets/css/home.css";

// Firebase Config
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
const storage = getStorage(app);

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [points, setPoints] = useState(0);
  const [offersList, setOffersList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showVendorChoice, setShowVendorChoice] = useState(false);
  const [showAdminChoice, setShowAdminChoice] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [ordersCount, setOrdersCount] = useState(0);
  const [isChatbotHovered, setIsChatbotHovered] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  // Get all products from both collections
  const getAllProducts = useCallback(async () => {
    try {
      const [productsDetailsSnap, productsSnap] = await Promise.all([
        getDocs(collection(db, 'products-details')),
        getDocs(collection(db, 'products'))
      ]);
        
      const productsDetails = productsDetailsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        imageUrl: doc.data().imageUrl || doc.data().image || doc.data().img || "https://via.placeholder.com/300x300?text=No+Image",
        price: doc.data().price || doc.data().productPrice || 0,
        category: doc.data().category || doc.data().productCategory || "General",
        name: doc.data().name || doc.data().productName || "Unnamed Product"
      }));
        
      const products = productsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        imageUrl: doc.data().imageUrl || doc.data().image || doc.data().img || "https://via.placeholder.com/300x300?text=No+Image",
        price: doc.data().price || doc.data().productPrice || 0,
        category: doc.data().category || doc.data().productCategory || "General",
        name: doc.data().name || doc.data().productName || "Unnamed Product"
      }));
        
      return [...productsDetails, ...products];
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }, []);

  // Find similar products based on category and price range
  const findSimilarProducts = useCallback((baseProducts, allProducts, maxResults = 4) => {
    if (baseProducts.length === 0) return [];
      
    const similarProducts = new Set();
      
    baseProducts.forEach(baseProduct => {
      const baseCategory = baseProduct.category;
      const basePrice = baseProduct.price;
        
      const priceRange = [basePrice * 0.7, basePrice * 1.3];
        
      const similar = allProducts.filter(product => 
        product.id !== baseProduct.id &&
        product.category === baseCategory &&
        product.price >= priceRange[0] && 
        product.price <= priceRange[1]
      );
        
      similar.forEach(product => similarProducts.add(product));
        
      if (similarProducts.size < maxResults) {
        const sameCategory = allProducts.filter(product => 
          product.id !== baseProduct.id &&
          product.category === baseCategory
        );
        sameCategory.forEach(product => similarProducts.add(product));
      }
    });
      
    return Array.from(similarProducts).slice(0, maxResults);
  }, []);

  // Fetch popular products for non-logged in users
  const fetchPopularProducts = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      const allProducts = await getAllProducts();
      const popularProducts = allProducts
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 15)
        .sort(() => 0.5 - Math.random())
        .slice(0, 12)
        .map(product => ({
          ...product,
          imageUrl: product.imageUrl || "https://via.placeholder.com/300x300?text=No+Image"
        }));

      setRecommendedProducts(popularProducts);
    } catch (error) {
      console.error("Error fetching popular products:", error);
      setRecommendedProducts([]);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [getAllProducts]);

  // Fetch recommendations based on multiple factors
  const fetchRecommendations = useCallback(async (userId) => {
    setLoadingRecommendations(true);
    try {
      const allProducts = await getAllProducts();
      if (allProducts.length === 0) {
        setRecommendedProducts([]);
        return;
      }

      const wishlistSnap = await getDocs(
        query(collection(db, 'wishlist'), where('userId', '==', userId))
      );
      const wishlistItems = wishlistSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const cartSnap = await getDocs(
        query(collection(db, 'cart'), where('userId', '==', userId))
      );
      const cartItems = cartSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let recommendedProducts = [];

      if (wishlistItems.length > 0) {
        const wishlistProductIds = wishlistItems.map(item => item.productId);
        const wishlistProducts = allProducts.filter(product => 
          wishlistProductIds.includes(product.id)
        );
        recommendedProducts = [...recommendedProducts, ...wishlistProducts];
          
        const similarToWishlist = findSimilarProducts(wishlistProducts, allProducts, 3);
        recommendedProducts = [...recommendedProducts, ...similarToWishlist];
      }

      if (cartItems.length > 0) {
        const cartProductIds = cartItems.map(item => item.productId);
        const cartProducts = allProducts.filter(product => 
          cartProductIds.includes(product.id)
        );
        recommendedProducts = [...recommendedProducts, ...cartProducts];
          
        const similarToCart = findSimilarProducts(cartProducts, allProducts, 3);
        recommendedProducts = [...recommendedProducts, ...similarToCart];
      }

      if (recommendedProducts.length > 0 && recommendedProducts.length < 12) {
        const remainingSlots = 12 - recommendedProducts.length;
        const recommendedIds = new Set(recommendedProducts.map(p => p.id));
          
        const popularProducts = allProducts
          .filter(product => !recommendedIds.has(product.id))
          .sort(() => 0.5 - Math.random())
          .slice(0, remainingSlots);
          
        recommendedProducts = [...recommendedProducts, ...popularProducts];
      }

      if (recommendedProducts.length === 0) {
        recommendedProducts = allProducts
          .sort((a, b) => (b.price || 0) - (a.price || 0))
          .slice(0, 12)
          .sort(() => 0.5 - Math.random());
      }

      const uniqueProducts = Array.from(
        new Map(recommendedProducts.map(product => [product.id, product])).values()
      ).map(product => ({
        ...product,
        name: product.name || "Unnamed Product",
        price: product.price || 0,
        imageUrl: product.imageUrl || "https://via.placeholder.com/300x300?text=No+Image",
        category: product.category || "General",
        // Ensure consistent dimensions
        imageHeight: "200px",
        maxLines: 2,
        priceFormatted: `₹${(product.price || 0).toLocaleString()}`
      }));

      const finalProducts = uniqueProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, 12);

      setRecommendedProducts(finalProducts);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      await fetchPopularProducts();
    } finally {
      setLoadingRecommendations(false);
    }
  }, [getAllProducts, findSimilarProducts, fetchPopularProducts]);

  // Fetch user orders count
  const fetchOrdersCount = useCallback((userId) => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
      setOrdersCount(querySnapshot.size);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let ordersUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "buyers", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBuyer(data);
            setPoints(data.points || 0);
          }
          await fetchRecommendations(u.uid);
          ordersUnsubscribe = fetchOrdersCount(u.uid);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setBuyer(null);
        setPoints(0);
        setOrdersCount(0);
        await fetchPopularProducts();
      }
    });
    return () => {
      unsubscribe();
      if (ordersUnsubscribe) ordersUnsubscribe();
    };
  }, [fetchRecommendations, fetchPopularProducts, fetchOrdersCount]);

  useEffect(() => {
    const loadOffers = async () => {
      setLoadingOffers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "offers"));
        const offers = [];
          
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          if (data.imgurl) {
            try {
              let imageUrl = data.imgurl;
                
              if (!data.imgurl.startsWith("http")) {
                const storageRef = ref(storage, data.imgurl);
                imageUrl = await getDownloadURL(storageRef);
              }
                
              offers.push({
                id: docSnap.id,
                imageUrl: imageUrl,
                title: data.title || "Special Offer",
                description: data.description || "",
                discount: data.discount || "50% OFF"
              });
            } catch (err) {
              console.error("Failed to load image from storage:", err);
            }
          }
        }

        setOffersList(offers);
      } catch (err) {
        console.error("Error fetching offers:", err);
      } finally {
        setLoadingOffers(false);
      }
    };
    loadOffers();
  }, []);

  useEffect(() => {
    if (offersList.length <= 1) return;
      
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offersList.length);
    }, 4000);
      
    return () => clearInterval(interval);
  }, [offersList]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleVendorClick = () => setShowVendorChoice(true);
  const handleAdminClick = () => setShowAdminChoice(true);
  
  const handleChatbotClick = () => {
    navigate("/chatbot");
  };

  const handleProductClick = (product) => {
    if (!product || !product.id) {
      console.error('Invalid product data:', product);
      return;
    }

    navigate(`/product/${product.id}`, {
      state: { fromRecommendation: true }
    });
  };

  const handleBrowseProducts = () => {
    if (user) {
      navigate("/shop");
    } else {
      navigate("/products");
    }
  };

  const handleImageError = (e) => {
    e.target.src = "https://via.placeholder.com/300x300/AAA/666666?text=No+Image";
  };

  const goToNextOffer = () => {
    setCurrentIndex((prev) => (prev + 1) % offersList.length);
  };

  const goToPrevOffer = () => {
    setCurrentIndex((prev) => (prev - 1 + offersList.length) % offersList.length);
  };

  const getProductBadges = (product) => {
    const badges = [];
    if (product.price > 5000) badges.push({ text: "Premium", color: "#FFD700", icon: <FaGem /> });
    if (Math.random() > 0.5) badges.push({ text: "Trending", color: "#FF6B6B", icon: <FaFire /> });
    if (product.price < 1000) badges.push({ text: "Budget", color: "#4CAF50", icon: <FaTag /> });
    if (Math.random() > 0.7) badges.push({ text: "New", color: "#2196F3", icon: <FaBolt /> });
    return badges;
  };

  const categories = [
    { id: "all", name: "All Products", icon: <FaBox /> },
    { id: "electronics", name: "Electronics", icon: <FaBolt /> },
    { id: "fashion", name: "Fashion", icon: <FaGem /> },
    { id: "home", name: "Home", icon: <FaHome /> },
    { id: "accessories", name: "Accessories", icon: <FaTag /> }
  ];

 const filteredProducts = recommendedProducts
  .filter(product => {
    if (activeCategory === "all") return true;
    if (activeCategory === "electronics") return product.category?.toLowerCase().includes("electronic");
    if (activeCategory === "fashion") return product.category?.toLowerCase().includes("clothing") || product.category?.toLowerCase().includes("fashion");
    if (activeCategory === "home") return product.category?.toLowerCase().includes("home");
    if (activeCategory === "accessories") return product.category?.toLowerCase().includes("accessory");
    return true;
  })
  .slice(0, 8); // 👈 HOME PAGE LIMIT


  const renderStars = (rating = 4.5, size = 14) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="stars-container">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < fullStars) {
            return <FaStar key={i} className="star filled" size={size} />;
          } else if (i === fullStars && hasHalfStar) {
            return <FaStar key={i} className="star half" size={size} />;
          } else {
            return <FaStar key={i} className="star empty" size={size} />;
          }
        })}
        <span className="rating-text">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="home-container">
      {/* AI Chatbot Button */}
      <div
        className="ai-chatbot-btn"
        onClick={handleChatbotClick}
        onMouseEnter={() => setIsChatbotHovered(true)}
        onMouseLeave={() => setIsChatbotHovered(false)}
      >
        <FaRobot className="ai-icon" />
        {isChatbotHovered && <span className="chatbot-text">AI Assistant</span>}
        {isChatbotHovered && (
          <div className="chatbot-tooltip">
            <h4>Carty AI Assistant</h4>
            <p>Get instant help with shopping, orders, and payments</p>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo-container" onClick={() => navigate("/")}>
            <div className="logo-icon">
              <FaCrown />
            </div>
            <div className="logo-text">
              <h1>Cartify!!</h1>
              <p className="tagline">Premium Shopping Experience</p>
            </div>
          </div>
          
          <div className="header-actions">
            {user ? (
              <div className="user-stats">
                <div className="stat-item">
                  <FaCoins className="stat-icon" />
                  <span className="stat-value">{points}</span>
                  <span className="stat-label">Points</span>
                </div>
                <div className="stat-item">
                  <FaShoppingBag className="stat-icon" />
                  <span className="stat-value">{ordersCount}</span>
                  <span className="stat-label">Orders</span>
                </div>
                <div className="user-profile" onClick={() => navigate("/profile")}>
                  <FaUser className="user-icon" />
                  <span className="user-name">{buyer?.fullName?.split(" ")[0] || "User"}</span>
                </div>
              </div>
            ) : (
              <div className="guest-message">
                <span className="welcome-text">Welcome to Cartify!</span>
                <span className="welcome-subtext">Sign in for personalized experience</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="navbar">
        <div className="nav-main">
          <button onClick={() => navigate("/")} className="nav-btn home-btn active">
            <FaHome className="nav-icon" />
            <span className="nav-text">Home</span>
          </button>
          <button onClick={handleBrowseProducts} className="nav-btn products-btn">
            <FaBox className="nav-icon" />
            <span className="nav-text">Products</span>
          </button>

          {user && (
            <>
              <button className="nav-btn cart-btn" onClick={() => navigate("/buyer/cart")}>
                <FaShoppingCart className="nav-icon" />
                <span className="nav-text">Cart</span>
                {ordersCount > 0 && (
                  <span className="order-badge">
                    {ordersCount}
                  </span>
                )}
              </button>
              <button className="nav-btn wishlist-btn" onClick={() => navigate("/buyer/wishlist")}>
                <FaHeart className="nav-icon" />
                <span className="nav-text">Wishlist</span>
              </button>
              <button className="nav-btn orders-btn" onClick={() => navigate("/orders")}>
                <FaList className="nav-icon" />
                <span className="nav-text">Orders</span>
              </button>
            </>
          )}
        </div>
        
        <div className="nav-secondary">
          {user ? (
            <button id="logout-btn" className="nav-btn logout-btn" onClick={handleLogout}>
              <FaSignOutAlt className="nav-icon" />
              <span className="nav-text">Logout</span>
            </button>
          ) : (
            <>
              <button className="nav-btn signup-btn" onClick={() => navigate("/buyer/signup")}>
                <FaUserPlus className="nav-icon" />
                <span className="nav-text">Sign Up</span>
              </button>
              <button className="nav-btn login-btn" onClick={() => navigate("/buyer/login")}>
                <FaSignInAlt className="nav-icon" />
                <span className="nav-text">Login</span>
              </button>
            </>
          )}

          <button className="nav-btn vendor-btn" onClick={handleVendorClick}>
            <FaStore className="nav-icon" />
            <span className="nav-text">Vendor</span>
          </button>
          <button className="nav-btn admin-btn" onClick={handleAdminClick}>
            <FaUserShield className="nav-icon" />
            <span className="nav-text">Admin</span>
          </button>
        </div>
      </nav>

      {/* Vendor Choice Popup */}
      {showVendorChoice && (
        <div className="popup-overlay">
          <div className="popup royal-popup">
            <div className="popup-header">
              <FaCrown className="popup-crown" />
              <h3>Become a Vendor</h3>
            </div>
            <p className="popup-description">Join our premium vendor community</p>
            <div className="popup-actions">
              <button className="popup-btn vendor-signup-btn" onClick={() => navigate("/seller/signup")}>
                <span className="btn-icon">+</span>
                <span className="btn-text">Seller Sign Up</span>
              </button>
              <button className="popup-btn vendor-login-btn" onClick={() => navigate("/seller/login")}>
                <span className="btn-icon">→</span>
                <span className="btn-text">Seller Login</span>
              </button>
              <button className="popup-btn cancel-btn" onClick={() => setShowVendorChoice(false)}>
                <FaTimes className="btn-icon" />
                <span className="btn-text">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Choice Popup */}
      {showAdminChoice && (
        <div className="popup-overlay">
          <div className="popup royal-popup">
            <div className="popup-header">
              <FaCrown className="popup-crown" />
              <h3>Admin Portal</h3>
            </div>
            <p className="popup-description">Access the royal administration panel</p>
            <div className="popup-actions">
              <button className="popup-btn admin-login-btn" onClick={() => navigate("/admin/login")}>
                <span className="btn-icon">→</span>
                <span className="btn-text">Login as Admin</span>
              </button>
              <button className="popup-btn cancel-btn" onClick={() => setShowAdminChoice(false)}>
                <FaTimes className="btn-icon" />
                <span className="btn-text">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Section */}
      {buyer && (
        <section className="profile-section royal-card">
          <div className="profile-header">
            <h2 className="section-title">
              <FaUser className="title-icon" />
              My Profile
            </h2>
            <div className="profile-stats">
              <div className="stat-item">
                <FaCoins className="stat-icon" />
                <span className="stat-label">Points</span>
                <span className="stat-value">{points}</span>
              </div>
              <div className="stat-item">
                <FaShoppingBag className="stat-icon" />
                <span className="stat-label">Orders</span>
                <span className="stat-value">{ordersCount}</span>
              </div>
            </div>
          </div>
          <div className="profile-details">
            <div className="detail-item">
              <div className="detail-label">
                <FaUser className="label-icon" />
                <strong>Name</strong>
              </div>
              <div className="detail-value">{buyer.fullName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">
                <FaUser className="label-icon" />
                <strong>Email</strong>
              </div>
              <div className="detail-value">{buyer.email}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">
                <FaUser className="label-icon" />
                <strong>Verified</strong>
              </div>
              <div className={`detail-value ${buyer.isLocationVerified ? "verified" : "not-verified"}`}>
                {buyer.isLocationVerified ? <><FaCheck /> Verified</> : <><FaExclamationCircle /> Not Verified</>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Offers Section */}
      <section className="offers-section royal-card">
        <div className="section-header">
          <h2 className="section-title">
            <FaFire className="title-icon" />
            Special Offers
          </h2>
          {offersList.length > 0 && (
            <div className="offer-counter">
              <span className="counter-text">{currentIndex + 1} / {offersList.length}</span>
            </div>
          )}
        </div>
        
        {loadingOffers ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading offers...</p>
          </div>
        ) : offersList.length === 0 ? (
          <div className="empty-state">
            <FaFire className="empty-icon" />
            <p className="empty-text">No offers available</p>
            <p className="empty-subtext">Check back soon for exclusive deals!</p>
          </div>
        ) : (
          <div className="carousel-wrapper">
            <div className="carousel-controls">
              {offersList.length > 1 && (
                <button
                  className="carousel-arrow left-arrow"
                  onClick={goToPrevOffer}
                  aria-label="Previous offer"
                >
                  <FaChevronLeft />
                </button>
              )}
               
              <div className="offer-slide">
                <div className="offer-image">
                  <img
                    src={offersList[currentIndex]?.imageUrl}
                    alt={offersList[currentIndex]?.title || `Offer ${currentIndex + 1}`}
                    className="offer-img"
                    onError={handleImageError}
                  />
                  <div className="offer-overlay"></div>
                  <div className="offer-badge">{offersList[currentIndex]?.discount}</div>
                </div>
                <div className="offer-content">
                  <h3 className="offer-title">{offersList[currentIndex]?.title}</h3>
                  <p className="offer-description">{offersList[currentIndex]?.description}</p>
                 <button
  className="offer-btn"
  onClick={handleBrowseProducts}
>
  Shop Now <FaChevronRight />
</button>

                </div>
              </div>
               
              {offersList.length > 1 && (
                <button
                  className="carousel-arrow right-arrow"
                  onClick={goToNextOffer}
                  aria-label="Next offer"
                >
                  <FaChevronRight />
                </button>
              )}
            </div>
             
            {offersList.length > 1 && (
              <div className="carousel-indicators">
                {offersList.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Go to offer ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Categories Filter */}
      <section className="categories-section royal-card">
        <h2 className="section-title">
          <FaBox className="title-icon" />
          Browse Categories
        </h2>
        <div className="categories-list">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products royal-card">
        <div className="section-header">
          <h2 className="section-title">
            {user ? (
              <>
                <FaStar className="title-icon" />
                Recommended For You
              </>
            ) : (
              <>
                <FaStar className="title-icon" />
                Featured Products
              </>
            )}
          </h2>
          <button className="browse-all-btn" onClick={handleBrowseProducts}>
            <span className="browse-text">Browse All</span>
            <FaChevronRight className="browse-icon" />
          </button>
        </div>
          
        {loadingRecommendations ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading products...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => {
              const badges = getProductBadges(product);
              return (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="product-image">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      onError={handleImageError}
                      className="product-img"
                    />
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
                    <div className="product-overlay">
                      <button className="quick-view-btn">Quick View</button>
                    </div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <div className="product-meta">
                      <span className="product-category">{product.category}</span>
                      {renderStars()}
                    </div>
                    <div className="price-section">
                      <span className="product-price">₹{product.price?.toLocaleString() || "0"}</span>
                    </div>
                    <div className="product-actions">
                      
                      <button className="action-btn wishlist-btn">
                        <FaHeart />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <FaBox className="empty-icon" />
            <p className="empty-text">No products found</p>
            <p className="empty-subtext">Please check back later!</p>
          </div>
        )}
         
        <div className="section-footer">
          <button className="see-more-btn" onClick={handleBrowseProducts}>
            <span>See More Products</span>
            <FaChevronRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <FaCrown className="footer-icon" />
            <span className="footer-title">Cartify!!</span>
          </div>
          <p className="footer-text">Premium shopping experience since 2026</p>
          <div className="footer-links">
  <a href="/privacy-policy" className="footer-link">Privacy</a>
  <a href="/terms" className="footer-link">Terms</a>
  <a href="/contact" className="footer-link">Contact</a>

</div>
          <p className="copyright">© {new Date().getFullYear()} Cartify Royal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;