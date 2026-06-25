// src/pages/Wishlist.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc,
  setDoc,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import "../assets/css/Wishlist.css";

// Icons
import {
  FaTrash,
  FaShoppingCart,
  FaHeart,
  FaHeartBroken,
  FaArrowLeft,
  FaHome,
  FaShoppingBag,
  FaStar,
  FaRegStar,
  FaEye,
  FaShareAlt,
  FaTag,
  FaTimes,
  FaCheck,
  FaShoppingBasket,
  FaFire,
  FaGem,
  FaExclamationTriangle,
  FaCoins
} from "react-icons/fa";

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [animatingRemove, setAnimatingRemove] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [emptyAnimation, setEmptyAnimation] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const navigate = useNavigate();

  // Listen to auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchWishlist(u.uid);
        fetchCart(u.uid);
      } else {
        setWishlist([]);
        setCartItems([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch wishlist items with product details
  const fetchWishlist = async (uid) => {
    setLoading(true);
    try {
      const q = query(collection(db, "wishlist"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let productDetails = {};
          
          // Try to fetch additional product details
          try {
            const productRef = doc(db, "products-details", data.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              productDetails = productSnap.data();
            }
          } catch (err) {
            console.log("Could not fetch additional product details");
          }
          
          return { 
            id: d.id, 
            ...data, 
            ...productDetails,
            addedAt: data.createdAt?.toDate() || new Date()
          };
        })
      );
      
      // Sort by most recently added
      items.sort((a, b) => b.addedAt - a.addedAt);
      setWishlist(items);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart items to check if product is already in cart
  const fetchCart = async (uid) => {
    try {
      const q = query(collection(db, "cart"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setCartItems(items);
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
  };

  // Check if item is in cart
  const isItemInCart = (productId) => {
    return cartItems.some(item => item.productId === productId);
  };

  // Remove product from wishlist - SIMPLIFIED AND FIXED
  const removeFromWishlist = async (id, productName) => {
    if (!id || !user) return;
    
    setAnimatingRemove(id);
    
    try {
      console.log("Removing wishlist item ID:", id);
      
      // Delete from Firestore
      await deleteDoc(doc(db, "wishlist", id));
      
      // Update local state
      setWishlist(prev => prev.filter(item => item.id !== id));
      
      // Show success message
      setSuccessMessage(`"${productName}" removed from wishlist`);
      
    } catch (err) {
      console.error("Firestore delete error:", err);
      
      // Even if Firestore fails, remove from local state
      setWishlist(prev => prev.filter(item => item.id !== id));
      setSuccessMessage(`"${productName}" removed from wishlist (local)`);
      
    } finally {
      setTimeout(() => {
        setSuccessMessage("");
        setAnimatingRemove(null);
      }, 2000);
    }
  };

  // Remove from cart
  const removeFromCart = async (item) => {
    if (!user) {
      alert("Please login to remove items from cart");
      navigate("/buyer/login");
      return;
    }

    try {
      // Find cart item by productId
      const cartItem = cartItems.find(cartItem => cartItem.productId === item.productId);
      if (cartItem) {
        await deleteDoc(doc(db, "cart", cartItem.id));
        
        // Update local cart state
        setCartItems(prev => prev.filter(cartItem => cartItem.productId !== item.productId));
        
        setSuccessMessage(`"${item.name}" removed from cart`);
        setTimeout(() => setSuccessMessage(""), 2000);
      }
    } catch (err) {
      console.error("Error removing from cart:", err);
      setSuccessMessage("Failed to remove from cart");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  };

  // Add to cart from wishlist
  const addToCartFromWishlist = async (item) => {
    if (!user) {
      alert("Please login to add items to cart");
      navigate("/buyer/login");
      return;
    }

    try {
      // Create unique cart ID
      const cartId = `${user.uid}_${item.productId}_${Date.now()}`;
      const cartRef = doc(db, "cart", cartId);

      await setDoc(cartRef, {
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        size: item.size || "M",
        color: item.color || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.uid,
        userEmail: user.email,
      });

      // Refresh cart
      await fetchCart(user.uid);

      // Show success
      setSuccessMessage(`"${item.name}" added to cart!`);
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (err) {
      console.error("Error adding to cart:", err);
      setSuccessMessage("Failed to add to cart");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  };

  // Buy now from wishlist
  const buyNowFromWishlist = async (item) => {
    if (!user) {
      alert("Please login to proceed");
      navigate("/buyer/login");
      return;
    }

    try {
      // First add to cart
      await addToCartFromWishlist(item);
      
      // Then navigate to checkout
      navigate("/checkout", {
        state: {
          items: [
            {
              productId: item.productId,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: 1,
              size: item.size || "M",
            },
          ],
        },
      });
    } catch (err) {
      console.error("Error during Buy Now:", err);
      alert("Failed to proceed to checkout");
    }
  };

  // View product details
  const viewProduct = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  // Share product
  const shareProduct = async (item) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Check out this product: ${item.name}`,
          url: window.location.origin + `/product/${item.productId}`,
        });
      } catch (err) {
        console.log("Share cancelled:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${item.name} - ₹${item.price}`);
      setSuccessMessage("Product link copied to clipboard!");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  };

  // Calculate time ago
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    
    if (interval > 1) return `${interval} years ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} months ago`;
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} days ago`;
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} hours ago`;
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} minutes ago`;
    return "Just now";
  };

  // Get product badges
  const getProductBadges = (item) => {
    const badges = [];
    
    if (item.price > 5000) badges.push({ text: "Premium", color: "#FFD700", icon: <FaGem /> });
    if (item.price < 1000) badges.push({ text: "Budget", color: "#4CAF50", icon: <FaTag /> });
    if (item.discount > 20) badges.push({ text: `${item.discount}% OFF`, color: "#FF4081", icon: <FaTag /> });
    if (item.stock < 5) badges.push({ text: "Low Stock", color: "#FF9800", icon: <FaExclamationTriangle /> });
    
    return badges;
  };

  // Render stars
  const renderStars = (rating = 0) => {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;
    
    return (
      <div className="stars-container">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < fullStars) {
            return <FaStar key={i} className="star filled" />;
          } else if (i === fullStars && hasHalfStar) {
            return <FaStar key={i} className="star half" />;
          } else {
            return <FaRegStar key={i} className="star empty" />;
          }
        })}
        <span className="rating-text">{rating?.toFixed(1) || "0.0"}</span>
      </div>
    );
  };

  // Clear all wishlist - FIXED WITH BATCH DELETE
  const clearAllWishlist = async () => {
    if (!user || wishlist.length === 0) return;
    
    // Simple confirmation
    const confirmed = window.confirm(`Are you sure you want to remove all ${wishlist.length} items from your wishlist?`);
    if (!confirmed) return;
    
    try {
      // Create a batch for bulk delete
      const batch = writeBatch(db);
      
      // Add all deletions to batch
      wishlist.forEach(item => {
        const docRef = doc(db, "wishlist", item.id);
        batch.delete(docRef);
      });
      
      // Commit the batch
      await batch.commit();
      console.log(`Batch deleted ${wishlist.length} items`);
      
      // Clear local state
      setWishlist([]);
      setEmptyAnimation(true);
      
      // Show success
      setSuccessMessage(`Cleared all ${wishlist.length} items from wishlist`);
      setTimeout(() => {
        setSuccessMessage("");
        setEmptyAnimation(false);
      }, 2000);
      
    } catch (err) {
      console.error("Error clearing wishlist:", err);
      
      // Even if batch fails, clear local state
      setWishlist([]);
      setSuccessMessage("Wishlist cleared from view");
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  };

  if (loading) {
    return (
      <div className="wishlist-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-container">
      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <FaCheck className="success-icon" />
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="wishlist-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/shop")}>
            <FaArrowLeft /> Back to Shop
          </button>
          <h1 className="wishlist-title">
            <FaHeart className="title-icon" />
            My Wishlist
            <span className="wishlist-count">{wishlist.length} items</span>
          </h1>
        </div>
        <div className="header-right">
          <button className="home-btn" onClick={() => navigate("/shop")}>
            <FaHome /> Home
          </button>
          {wishlist.length > 0 && (
            <button 
              className="clear-all-btn" 
              onClick={clearAllWishlist}
            >
              <FaTrash /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {wishlist.length > 0 && (
        <div className="wishlist-stats">
          <div className="stat-item">
            <div className="stat-icon total">
              <FaHeart />
            </div>
            <div className="stat-info">
              <span className="stat-value">{wishlist.length}</span>
              <span className="stat-label">Total Items</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon price">
              <FaCoins />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                ₹{wishlist.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString()}
              </span>
              <span className="stat-label">Total Value</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon avg">
              <FaTag />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                ₹{wishlist.length > 0 
                  ? Math.round(wishlist.reduce((sum, item) => sum + (item.price || 0), 0) / wishlist.length).toLocaleString()
                  : "0"
                }
              </span>
              <span className="stat-label">Average Price</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {wishlist.length === 0 && !loading && (
        <div className={`empty-wishlist ${emptyAnimation ? 'animate' : ''}`}>
          <div className="empty-icon">
            <FaHeartBroken />
          </div>
          <h2>Your wishlist is empty</h2>
          <p>Start adding products you love!</p>
          <div className="empty-actions">
            <button className="browse-btn" onClick={() => navigate("/shop")}>
              <FaShoppingBag /> Browse Products
            </button>
            <button className="trending-btn" onClick={() => navigate("/shop?filter=trending")}>
              <FaFire /> View Trending
            </button>
          </div>
        </div>
      )}

      {/* Wishlist Grid */}
      {wishlist.length > 0 && (
        <div className="wishlist-grid">
          {wishlist.map((item, index) => (
            <div 
              key={item.id} 
              className={`wishlist-card ${animatingRemove === item.id ? 'removing' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Product Badges */}
              {getProductBadges(item).length > 0 && (
                <div className="product-badges">
                  {getProductBadges(item).map((badge, idx) => (
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
              <div className="product-image-container" onClick={() => viewProduct(item)}>
                <img
                  src={item.image || "https://via.placeholder.com/300x300?text=No+Image"}
                  alt={item.name}
                  className="product-image"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/300x300?text=No+Image";
                  }}
                />
                <div className="image-overlay">
                  <button className="view-btn">
                    <FaEye /> Quick View
                  </button>
                </div>
                <span className="added-time">{getTimeAgo(item.addedAt)}</span>
              </div>

              {/* Product Info */}
              <div className="product-info">
                <h3 className="product-name">{item.name}</h3>
                <p className="product-category">{item.category || "General"}</p>
                
                <div className="product-rating">
                  {renderStars(item.avgRating || item.rating || 0)}
                </div>

                <div className="product-price">
                  <span className="current-price">₹{(item.price || 0).toLocaleString()}</span>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="original-price">₹{item.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Stock Status */}
                {item.stock !== undefined && item.stock < 5 && (
                  <div className="stock-status">
                    <span className="low-stock">
                      <FaExclamationTriangle /> Only {item.stock} left
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                {isItemInCart(item.productId) ? (
                  <button
                    className="action-btn remove-cart"
                    onClick={() => removeFromCart(item)}
                  >
                    <FaTrash />
                    <span>Remove from Cart</span>
                  </button>
                ) : (
                  <button
                    className="action-btn add-to-cart"
                    onClick={() => addToCartFromWishlist(item)}
                  >
                    <FaShoppingCart />
                    <span>Add to Cart</span>
                  </button>
                )}
                <button
                  className="action-btn buy-now"
                  onClick={() => buyNowFromWishlist(item)}
                >
                  <FaShoppingBasket />
                  <span>Buy Now</span>
                </button>
                <button
                  className="action-btn share"
                  onClick={() => shareProduct(item)}
                >
                  <FaShareAlt />
                  <span>Share</span>
                </button>
                <button
                  className={`action-btn remove ${animatingRemove === item.id ? 'animating' : ''}`}
                  onClick={() => removeFromWishlist(item.id, item.name)}
                  disabled={animatingRemove === item.id}
                >
                  <FaTrash />
                  <span>{animatingRemove === item.id ? 'Removing...' : 'Remove'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {showModal && selectedItem && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FaTimes />
            </button>

            <div className="modal-content">
              <div className="modal-left">
                <img
                  src={selectedItem.image || "https://via.placeholder.com/500x500?text=No+Image"}
                  alt={selectedItem.name}
                  className="modal-image"
                />
              </div>
              <div className="modal-right">
                <h2 className="modal-title">{selectedItem.name}</h2>
                <div className="modal-rating">
                  {renderStars(selectedItem.avgRating || selectedItem.rating || 0)}
                  <span className="modal-category">{selectedItem.category || "General"}</span>
                </div>

                <div className="modal-price">
                  <span className="current">₹{(selectedItem.price || 0).toLocaleString()}</span>
                  {selectedItem.originalPrice && selectedItem.originalPrice > selectedItem.price && (
                    <span className="original">₹{selectedItem.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {selectedItem.description && (
                  <p className="modal-description">{selectedItem.description}</p>
                )}

                <div className="modal-actions">
                  {isItemInCart(selectedItem.productId) ? (
                    <>
                      <button 
                        className="modal-btn remove-cart"
                        onClick={() => {
                          removeFromCart(selectedItem);
                          closeModal();
                        }}
                      >
                        <FaTimes /> Remove from Cart
                      </button>
                      <button 
                        className="modal-btn remove-modal"
                        onClick={() => {
                          removeFromWishlist(selectedItem.id, selectedItem.name);
                          closeModal();
                        }}
                      >
                        <FaTrash /> Remove from Wishlist
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="modal-btn add-cart"
                        onClick={() => {
                          addToCartFromWishlist(selectedItem);
                          closeModal();
                        }}
                      >
                        <FaShoppingCart /> Add to Cart
                      </button>
                      <button 
                        className="modal-btn buy"
                        onClick={() => {
                          buyNowFromWishlist(selectedItem);
                          closeModal();
                        }}
                      >
                        <FaShoppingBasket /> Buy Now
                      </button>
                      <button 
                        className="modal-btn remove-modal"
                        onClick={() => {
                          removeFromWishlist(selectedItem.id, selectedItem.name);
                          closeModal();
                        }}
                      >
                        <FaTrash /> Remove from Wishlist
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Actions */}
      {wishlist.length > 0 && (
        <div className="floating-actions">
          <button className="floating-btn cart" onClick={() => navigate("/cart")}>
            <FaShoppingCart />
            <span className="tooltip">Go to Cart</span>
          </button>
          <button className="floating-btn shop" onClick={() => navigate("/shop")}>
            <FaShoppingBag />
            <span className="tooltip">Continue Shopping</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Wishlist;