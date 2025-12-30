import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  updateDoc,
  increment,
  getDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";
import "../assets/css/cart.css";

// Icons
import {
  FaTrash,
  FaShoppingCart,
  FaArrowLeft,
  FaHome,
  FaShoppingBag,
  FaPlus,
  FaMinus,
  FaCheck,
  FaTimes,
  FaEye,
  FaShareAlt,
  FaTag,
  FaCoins,
  FaTruck,
  FaShieldAlt,
  FaGift,
  FaCreditCard,
  FaArrowRight,
  FaExclamationTriangle,
  FaHeart,
  FaShoppingBasket,
  FaPercentage,
  FaUndo,
  FaSyncAlt,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
  FaLink,
  FaCopy,
  FaCheckCircle,
  FaShareSquare,
} from "react-icons/fa";

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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [removingItem, setRemovingItem] = useState(null);
  const [points, setPoints] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState("item"); // 'item' or 'cart'
  const [itemToShare, setItemToShare] = useState(null);
  const [showSelectedItemsPanel, setShowSelectedItemsPanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchUserPoints(u.uid);
      } else {
        setPoints(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user points
  const fetchUserPoints = async (uid) => {
    try {
      const buyerRef = doc(db, "buyers", uid);
      const buyerSnap = await getDoc(buyerRef);
      if (buyerSnap.exists()) {
        setPoints(buyerSnap.data().points || 0);
      }
    } catch (err) {
      console.error("Error fetching points:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "cart"), where("userId", "==", user.uid));
        const cartSnap = await getDocs(q);
        const userCart = await Promise.all(
          cartSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            
            // Try to fetch additional product details
            let productDetails = {};
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
              id: docSnap.id,
              ...data,
              ...productDetails,
              image: data.image || productDetails.image || "https://via.placeholder.com/150",
              quantity: data.quantity || 1,
              addedAt: data.createdAt?.toDate() || new Date(),
              selected: false
            };
          })
        );

        // Sort by most recently added
        userCart.sort((a, b) => b.addedAt - a.addedAt);
        setCartItems(userCart);
      } catch (err) {
        console.error("Error fetching cart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  // Toggle select item
  const toggleSelect = (id) => {
    const item = cartItems.find(item => item.id === id);
    setSelectedItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        // Show success message when selecting for checkout
        if (item) {
          Swal.fire({
            title: "Selected for Checkout!",
            text: `${item.name} added to checkout selection`,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        }
        return [...prev, id];
      }
    });
  };

  // Select all items
  const selectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
      Swal.fire({
        title: "Deselected All!",
        text: "All items removed from checkout selection",
        icon: "info",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      setSelectedItems(cartItems.map(item => item.id));
      Swal.fire({
        title: "Selected All!",
        text: "All items added to checkout selection",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  // Update quantity
  const updateQuantity = async (id, change) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    const newQuantity = Math.max(1, (item.quantity || 1) + change);
    
    try {
      await setDoc(doc(db, "cart", id), {
        ...item,
        quantity: newQuantity,
        updatedAt: new Date()
      }, { merge: true });

      setCartItems(prev => prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  };

  // Remove item with animation
  const removeItem = async (id, productName) => {
    setRemovingItem(id);
    setTimeout(async () => {
      try {
        await deleteDoc(doc(db, "cart", id));
        setCartItems(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
        
        Swal.fire({
          title: "Removed!",
          text: `"${productName}" removed from cart`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Error removing item:", err);
      } finally {
        setRemovingItem(null);
      }
    }, 300);
  };

  // Remove selected items
  const removeSelected = async () => {
    if (selectedItems.length === 0) return;
    
    Swal.fire({
      title: "Remove Selected Items?",
      text: `Are you sure you want to remove ${selectedItems.length} selected items?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove them!",
      cancelButtonText: "Cancel"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const removingItems = [...selectedItems];
        setSelectedItems([]);
        
        for (const id of removingItems) {
          const item = cartItems.find(item => item.id === id);
          if (item) {
            await deleteDoc(doc(db, "cart", id));
          }
        }
        
        setCartItems(prev => prev.filter(item => !removingItems.includes(item.id)));
        
        Swal.fire({
          title: "Removed!",
          text: `${removingItems.length} items removed from cart`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  // Move to wishlist
  const moveToWishlist = async (item) => {
    if (!user) {
      Swal.fire({
        title: "Login Required",
        text: "Please login to add items to wishlist",
        icon: "warning",
        confirmButtonText: "Login",
      }).then(() => {
        navigate("/buyer/login");
      });
      return;
    }

    try {
      const wishId = `wish_${item.productId}_${user.uid}`;
      await setDoc(doc(db, "wishlist", wishId), {
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        size: item.size || "M",
        color: item.color || "",
        createdAt: new Date(),
        userId: user.uid,
        userEmail: user.email,
      });

      // Remove from cart
      await deleteDoc(doc(db, "cart", item.id));
      setCartItems(prev => prev.filter(cartItem => cartItem.id !== item.id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== item.id));
      
      Swal.fire({
        title: "Moved to Wishlist!",
        text: `"${item.name}" added to your wishlist`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error moving to wishlist:", err);
      Swal.fire("Error", "Failed to add to wishlist", "error");
    }
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Swal.fire("Error", "Please enter a coupon code", "warning");
      return;
    }
    
    setApplyingCoupon(true);
    // Simulate API call
    setTimeout(() => {
      const validCoupons = {
        "WELCOME10": 10,
        "SAVE20": 20,
        "FLASH30": 30,
        "FREESHIP": 99, // Free shipping
      };
      
      const code = couponCode.toUpperCase();
      if (validCoupons[code]) {
        const discount = validCoupons[code];
        setCouponApplied(true);
        setCouponDiscount(discount);
        Swal.fire({
          title: "Coupon Applied!",
          text: `You got ${discount}% discount`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Invalid Coupon", "The coupon code is invalid or expired", "error");
      }
      setApplyingCoupon(false);
    }, 1000);
  };

  // Calculate totals
  const calculateTotals = () => {
    const selected = cartItems.filter(item => selectedItems.includes(item.id));
    const subtotal = selected.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const shipping = selected.length > 0 ? (couponCode === "FREESHIP" ? 0 : 99) : 0;
    const couponAmount = couponApplied ? (subtotal * couponDiscount) / 100 : 0;
    const total = Math.max(0, subtotal + shipping - couponAmount);
    
    return {
      subtotal,
      shipping,
      couponDiscount: couponAmount,
      total,
      itemsCount: selected.length,
      selectedItems: selected
    };
  };

  const totals = calculateTotals();

  // Handle checkout
  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "No Items Selected",
        text: "Please select items to proceed to checkout",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const itemsToCheckout = cartItems.filter(item => selectedItems.includes(item.id));

    try {
      // Fetch buyer info
      let buyerInfo = {
        fullName: "",
        email: user?.email || "",
        address: "",
      };

      if (user?.uid) {
        const buyerRef = doc(db, "buyers", user.uid);
        const buyerSnap = await getDoc(buyerRef);
        if (buyerSnap.exists()) {
          const data = buyerSnap.data();
          buyerInfo = {
            fullName: data.fullName || user.displayName || "",
            email: data.email || user.email || "",
            address: data.address || "",
            phone: data.phone || ""
          };
        }
      }

      navigate("/checkout", {
        state: {
          items: itemsToCheckout,
          points: points,
          couponDiscount: couponApplied ? couponDiscount : 0,
          totals: totals,
          buyerInfo
        },
      });
    } catch (err) {
      console.error("Error during checkout:", err);
      Swal.fire("Error", "Failed to proceed to checkout", "error");
    }
  };

  // Open share modal for individual item
  const openShareModal = (item) => {
    setItemToShare(item);
    setShareType("item");
    setShowShareModal(true);
  };

  // Open share modal for entire cart
  const openShareCart = () => {
    setShareType("cart");
    setShowShareModal(true);
  };

  // Close share modal
  const closeShareModal = () => {
    setShowShareModal(false);
    setItemToShare(null);
    setCopied(false);
  };
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
  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    let message = "";
    if (shareType === "item" && itemToShare) {
      message = `Check out this product: ${itemToShare.name} - ₹${itemToShare.price}\n`;
      message += `${window.location.origin}/shop`;
    } else {
      message = `Check out my cart! Total: ₹${totals.total}\n`;
      message += `Items: ${selectedItems.length}\n`;
      message += `${window.location.origin}/cart`;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    closeShareModal();
  };

  // Share via Facebook
  const shareViaFacebook = () => {
    const url = shareType === "item" 
      ? `${window.location.origin}/shop` 
      : `${window.location.origin}/cart`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    closeShareModal();
  };

  // Share via Twitter
  const shareViaTwitter = () => {
    let text = "";
    if (shareType === "item" && itemToShare) {
      text = `Check out "${itemToShare.name}" - ₹${itemToShare.price} #Shopping`;
    } else {
      text = `My cart total: ₹${totals.total} #ShoppingCart`;
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    closeShareModal();
  };

  // Copy link to clipboard
  const copyToClipboard = () => {
    const url = shareType === "item" 
      ? `${window.location.origin}/shop` 
      : `${window.location.origin}/cart`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Open image modal
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowModal(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setShowModal(false);
    setSelectedImage("");
  };

  // Continue shopping
  const continueShopping = () => {
    navigate("/shop");
  };

  // Calculate savings
  const calculateSavings = () => {
    return cartItems.reduce((sum, item) => {
      const saving = item.originalPrice && item.originalPrice > item.price 
        ? (item.originalPrice - item.price) * (item.quantity || 1)
        : 0;
      return sum + saving;
    }, 0);
  };

  // Toggle selected items panel
  const toggleSelectedItemsPanel = () => {
    setShowSelectedItemsPanel(!showSelectedItemsPanel);
  };

  if (loading) {
    return (
      <div className="cart-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="cart-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/shop")}>
            <FaArrowLeft /> Back to Shop
          </button>
          <h1 className="cart-title">
            <FaShoppingCart className="title-icon" />
            Shopping Cart
            <span className="cart-count">{cartItems.length} items</span>
          </h1>
        </div>
        <div className="header-right">
          <button className="home-btn" onClick={() => navigate("/shop")}>
            <FaHome /> Home
          </button>
          <button className="wishlist-btn" onClick={() => navigate("/wishlist")}>
            <FaHeart /> Wishlist
          </button>
        </div>
      </div>

      {/* Selected Items Indicator */}
      {selectedItems.length > 0 && (
        <div className="selected-indicator">
          <div className="indicator-content">
            <FaCheckCircle className="indicator-icon" />
            <span className="indicator-text">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected for checkout
            </span>
            <button className="indicator-toggle" onClick={toggleSelectedItemsPanel}>
              {showSelectedItemsPanel ? "Hide" : "Show"} Details
            </button>
          </div>
        </div>
      )}

      {/* Selected Items Panel */}
      {showSelectedItemsPanel && selectedItems.length > 0 && (
        <div className="selected-items-panel">
          <div className="panel-header">
            <h3>Items Selected for Checkout ({selectedItems.length})</h3>
            <button className="panel-close" onClick={toggleSelectedItemsPanel}>
              <FaTimes />
            </button>
          </div>
          <div className="selected-items-list">
            {totals.selectedItems.map((item) => (
              <div key={item.id} className="selected-item-card">
                <img src={item.image} alt={item.name} className="selected-item-image" />
                <div className="selected-item-details">
                  <h4>{item.name}</h4>
                  <p>Quantity: {item.quantity || 1}</p>
                  <p className="item-price">₹{(item.price * (item.quantity || 1)).toLocaleString()}</p>
                </div>
                <button 
                  className="remove-selected-item"
                  onClick={() => toggleSelect(item.id)}
                >
                  <FaTimes /> Remove
                </button>
              </div>
            ))}
          </div>
          <div className="panel-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>{totals.shipping === 0 ? "FREE" : `₹${totals.shipping}`}</span>
            </div>
            {couponApplied && (
              <div className="summary-row discount">
                <span>Coupon Discount:</span>
                <span>-₹{totals.couponDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{totals.total.toLocaleString()}</span>
            </div>
            <button className="proceed-checkout-btn" onClick={handleCheckout}>
              <FaCreditCard /> Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* Cart Stats */}
      {cartItems.length > 0 && (
        <div className="cart-stats">
          <div className="stat-item">
            <div className="stat-icon items">
              <FaShoppingCart />
            </div>
            <div className="stat-info">
              <span className="stat-value">{cartItems.length}</span>
              <span className="stat-label">Total Items</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon selected">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{selectedItems.length}</span>
              <span className="stat-label">Selected for Checkout</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon savings">
              <FaPercentage />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                ₹{calculateSavings().toLocaleString()}
              </span>
              <span className="stat-label">Total Savings</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon points">
              <FaCoins />
            </div>
            <div className="stat-info">
              <span className="stat-value">{points.toLocaleString()}</span>
              <span className="stat-label">Reward Points</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="cart-content">
        {/* Cart Items Section */}
        <div className="cart-items-section">
          {/* Cart Actions */}
          {cartItems.length > 0 && (
            <div className="cart-actions-top">
              <div className="select-all">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                  onChange={selectAll}
                />
                <label htmlFor="select-all">
                  Select All ({selectedItems.length} selected)
                </label>
              </div>
              <div className="action-buttons">
                <button 
                  className="action-btn remove-selected"
                  onClick={removeSelected}
                  disabled={selectedItems.length === 0}
                >
                  <FaTrash /> Remove Selected
                </button>
                <button 
                  className="action-btn share-cart"
                  onClick={openShareCart}
                  disabled={selectedItems.length === 0}
                >
                  <FaShareSquare /> Share Cart
                </button>
                <button className="action-btn continue-shopping" onClick={continueShopping}>
                  <FaShoppingBag /> Continue Shopping
                </button>
              </div>
            </div>
          )}

          {/* Empty Cart */}
          {cartItems.length === 0 && !loading && (
            <div className="empty-cart">
              <div className="empty-icon">
                <FaShoppingCart />
              </div>
              <h2>Your cart is empty</h2>
              <p>Add items to your cart to see them here</p>
              <div className="empty-actions">
                <button className="browse-btn" onClick={() => navigate("/shop")}>
                  <FaShoppingBag /> Browse Products
                </button>
                <button className="trending-btn" onClick={() => navigate("/shop?filter=trending")}>
                  <FaShoppingBasket /> View Trending
                </button>
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div className="cart-items-grid">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className={`cart-item ${removingItem === item.id ? 'removing' : ''} ${selectedItems.includes(item.id) ? 'selected-for-checkout' : ''}`}
              >
                {/* Select Checkbox with Label */}
                <div className="item-select">
                  <input
                    type="checkbox"
                    id={`item-${item.id}`}
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                  <label htmlFor={`item-${item.id}`}>
                    {selectedItems.includes(item.id) ? (
                      <>
                        <FaCheckCircle className="check-icon" />
                        <span className="select-label">Selected for Checkout</span>
                      </>
                    ) : (
                      "Select for Checkout"
                    )}
                  </label>
                </div>

                {/* Product Image */}
                <div className="item-image-container">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="item-image"
                    onClick={() => openImageModal(item.image)}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x300?text=No+Image";
                    }}
                  />
                  {item.stock !== undefined && item.stock < 5 && (
                    <div className="stock-badge">
                      <FaExclamationTriangle /> Only {item.stock} left
                    </div>
                  )}
                  {selectedItems.includes(item.id) && (
                    <div className="selected-badge">
                      <FaCheckCircle /> Selected
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-category">{item.category || "General"}</p>
                  
                  {item.size && (
                    <div className="item-size">
                      <span className="label">Size:</span>
                      <span className="value">{item.size}</span>
                    </div>
                  )}
                  
                  {item.color && (
                    <div className="item-color">
                      <span className="label">Color:</span>
                      <span className="value">{item.color}</span>
                    </div>
                  )}

                  <div className="item-price">
                    <span className="current-price">₹{(item.price * (item.quantity || 1)).toLocaleString()}</span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="original-price">
                        <s>₹{item.originalPrice.toLocaleString()}</s>
                        <span className="discount">
                          Save ₹{(item.originalPrice - item.price).toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="item-quantity">
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn minus"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span className="quantity-value">{item.quantity || 1}</span>
                    <button 
                      className="quantity-btn plus"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <div className="quantity-price">
                    ₹{(item.price * (item.quantity || 1)).toLocaleString()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="item-actions">
                  <button
                    className="action-btn wishlist"
                    onClick={() => moveToWishlist(item)}
                    title="Move to Wishlist"
                  >
                    <FaHeart />
                  </button>
                  <button
                    className="action-btn share"
                    onClick={() => openShareModal(item)}
                    title="Share Product"
                  >
                    <FaShareAlt />
                  </button>
                  <button
                    className={`action-btn remove ${removingItem === item.id ? 'animating' : ''}`}
                    onClick={() => removeItem(item.id, item.name)}
                    disabled={removingItem === item.id}
                    title="Remove Item"
                  >
                    <FaTrash />
                  </button>
                </div>

                {/* Remove Animation Overlay */}
                {removingItem === item.id && (
                  <div className="remove-overlay">
                    <div className="remove-pulse"></div>
                    <FaTimes className="remove-icon" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        {cartItems.length > 0 && (
          <div className="order-summary">
            <h3 className="summary-title">
              <FaCreditCard /> Order Summary
            </h3>
            
            {/* Selection Summary */}
            <div className="selection-summary">
              <div className="summary-header">
                <FaCheckCircle className="summary-icon" />
                <span className="summary-text">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              {selectedItems.length === 0 && (
                <p className="summary-hint">Select items above to proceed to checkout</p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span className="label">Subtotal ({totals.itemsCount} items)</span>
                <span className="value">₹{totals.subtotal.toLocaleString()}</span>
              </div>
              
              <div className="price-row">
                <span className="label">Shipping</span>
                <span className="value">
                  {totals.shipping === 0 ? "FREE" : `₹${totals.shipping}`}
                </span>
              </div>
              
              {couponApplied && (
                <div className="price-row discount">
                  <span className="label">Coupon Discount ({couponDiscount}%)</span>
                  <span className="value">-₹{totals.couponDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="price-row total">
                <span className="label">Total</span>
                <span className="value">₹{totals.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Points Info */}
            <div className="points-info">
              <FaCoins className="points-icon" />
              <div className="points-details">
                <span className="points-label">You have {points.toLocaleString()} reward points</span>
                <span className="points-value">= ₹{(points * 0.1).toLocaleString()} discount available</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              <FaCreditCard />
              {selectedItems.length === 0 ? (
                "Select Items to Checkout"
              ) : (
                <>
                  Proceed to Checkout ({selectedItems.length} items)
                  <span className="checkout-total">₹{totals.total.toLocaleString()}</span>
                  <FaArrowRight className="arrow" />
                </>
              )}
            </button>

            {/* Security Badges */}
            <div className="security-badges">
              <div className="badge">
                <FaShieldAlt />
                <span>Secure Payment</span>
              </div>
              <div className="badge">
                <FaTruck />
                <span>Free Shipping*</span>
              </div>
              <div className="badge">
                <FaUndo />
                <span>Easy Returns</span>
              </div>
            </div>

            {/* Continue Shopping */}
            <button className="continue-btn" onClick={continueShopping}>
              <FaShoppingBag /> Continue Shopping
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-backdrop share-modal-backdrop" onClick={closeShareModal}>
          <div className="share-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeShareModal}>
              <FaTimes />
            </button>
            
            <div className="share-modal-header">
              <FaShareAlt className="share-icon" />
              <h3>
                {shareType === 'item' ? 'Share Product' : 'Share Cart'}
              </h3>
              <p className="share-description">
                {shareType === 'item' && itemToShare
                  ? `Share "${itemToShare.name}" with your friends`
                  : 'Share your cart with friends and family'}
              </p>
            </div>

            <div className="share-options">
              <button className="share-option-btn whatsapp" onClick={shareViaWhatsApp}>
                <FaWhatsapp className="option-icon" />
                <span>WhatsApp</span>
              </button>
              
              <button className="share-option-btn facebook" onClick={shareViaFacebook}>
                <FaFacebook className="option-icon" />
                <span>Facebook</span>
              </button>
              
              <button className="share-option-btn twitter" onClick={shareViaTwitter}>
                <FaTwitter className="option-icon" />
                <span>Twitter</span>
              </button>
              
              <button className="share-option-btn copy" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <FaCheckCircle className="option-icon" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <FaCopy className="option-icon" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {shareType === 'item' && itemToShare && (
              <div className="share-item-preview">
                <img src={itemToShare.image} alt={itemToShare.name} />
                <div className="preview-details">
                  <h4>{itemToShare.name}</h4>
                  <p className="price">₹{itemToShare.price.toLocaleString()}</p>
                </div>
              </div>
            )}

            {shareType === 'cart' && (
              <div className="share-cart-preview">
                <h4>Cart Summary</h4>
                <div className="cart-preview-stats">
                  <div className="stat">
                    <span className="stat-label">Items:</span>
                    <span className="stat-value">{selectedItems.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">₹{totals.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeImageModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeImageModal}>
              <FaTimes />
            </button>
            <img src={selectedImage} alt="Product" className="modal-image" />
          </div>
        </div>
      )}

      {/* Floating Actions */}
      {cartItems.length > 0 && (
        <div className="floating-actions">
          <button 
            className="floating-btn selected-summary" 
            onClick={toggleSelectedItemsPanel}
            data-count={selectedItems.length}
          >
            <FaCheckCircle />
            <span className="tooltip">
              Selected Items ({selectedItems.length})
            </span>
            {selectedItems.length > 0 && (
              <span className="floating-count">{selectedItems.length}</span>
            )}
          </button>
          <button 
            className="floating-btn cart-summary" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            <FaShoppingCart />
            <span className="tooltip">Cart Summary</span>
            <span className="floating-count">{cartItems.length}</span>
          </button>
          <button 
            className="floating-btn checkout-float" 
            onClick={handleCheckout} 
            disabled={selectedItems.length === 0}
          >
            <FaCreditCard />
            <span className="tooltip">
              Checkout {selectedItems.length > 0 ? `(${selectedItems.length} items)` : ''}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;