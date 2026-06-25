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
  onSnapshot,
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
  FaShareAlt,
  FaCoins,
  FaTruck,
  FaShieldAlt,
  FaCreditCard,
  FaArrowRight,
  FaExclamationTriangle,
  FaHeart,
  FaShoppingBasket,
  FaPercentage,
  FaUndo,
  FaWhatsapp,
  FaFacebook,
  FaTwitter,
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
  const [removingItem, setRemovingItem] = useState(null);
  const [points, setPoints] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState("item");
  const [itemToShare, setItemToShare] = useState(null);
  const [showSelectedItemsPanel, setShowSelectedItemsPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isRemovingSelected, setIsRemovingSelected] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchUserPoints(u.uid);
        fetchCart(u.uid);
      } else {
        setPoints(0);
        setCartItems([]);
        setSelectedItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Clean up invalid selected items
  useEffect(() => {
    if (!loading && cartItems.length > 0) {
      cleanupSelectedItems();
    }
  }, [loading, cartItems]);

  const cleanupSelectedItems = () => {
    const validIds = cartItems.map(item => item.id);
    const invalidSelections = selectedItems.filter(id => !validIds.includes(id));
    
    if (invalidSelections.length > 0) {
      console.log("Cleaning up invalid selections:", invalidSelections);
      setSelectedItems(prev => prev.filter(id => validIds.includes(id)));
    }
  };

  // Fetch cart data - UPDATED to handle cart_ prefix
  const fetchCart = async (uid) => {
    setLoading(true);
    try {
      const q = query(collection(db, "cart"), where("userId", "==", uid));
      const cartSnap = await getDocs(q);
      
      console.log("Firestore cart documents found:", cartSnap.docs.length);
      
      const userCart = [];
      const validCartItemIds = [];
      
      for (const docSnap of cartSnap.docs) {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        console.log("Processing Firestore document:", {
          docId: docId,
          productId: data.productId,
          name: data.name || "No name"
        });
        
        // Validate document ID
        if (!docId || docId.trim() === '') {
          console.warn("Skipping cart item with empty ID");
          continue;
        }
        
        validCartItemIds.push(docId);

        let productDetails = {};
        try {
          if (data.productId) {
            const productRef = doc(db, "products-details", data.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              productDetails = productSnap.data();
            }
          }
        } catch (err) {
          console.log("Could not fetch product details:", err);
        }

        userCart.push({
          id: docId, // Use the exact Firestore document ID (with cart_ prefix)
          firestoreId: docId, // Store exact ID for reference
          productId: data.productId,
          ...data,
          ...productDetails,
          image: data.image || productDetails.image || "https://via.placeholder.com/150",
          quantity: data.quantity || 1,
          addedAt: data.createdAt?.toDate() || new Date(),
          selected: false,
          checkoutQuantity: data.quantity || 1
        });
      }

      // Sort by most recently added
      userCart.sort((a, b) => b.addedAt - a.addedAt);
      
      console.log("Final cart items in state:", userCart.map(item => ({
        id: item.id,
        firestoreId: item.firestoreId,
        productId: item.productId,
        name: item.name
      })));
      
      setCartItems(userCart);
      
      // Clean up selected items - use firestoreId for comparison
      const cleanedSelectedItems = selectedItems.filter(id => 
        validCartItemIds.includes(id)
      );
      
      if (selectedItems.length !== cleanedSelectedItems.length) {
        console.log("Cleaned selected items:", {
          before: selectedItems.length,
          after: cleanedSelectedItems.length,
          removed: selectedItems.filter(id => !validCartItemIds.includes(id))
        });
      }
      
      setSelectedItems(cleanedSelectedItems);
      
    } catch (err) {
      console.error("Error fetching cart:", err);
      Swal.fire("Error", "Failed to load cart items", "error");
    } finally {
      setLoading(false);
    }
  };

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

  // Refresh cart data
  const refreshCart = async () => {
    if (user) {
      await fetchCart(user.uid);
    }
  };

  // Toggle select item with quantity selection
  const toggleSelect = (item) => {
    if (item.quantity > 1 && !selectedItems.includes(item.id)) {
      setSelectedItemForQuantity(item);
      setSelectedQuantity(item.quantity || 1);
      setShowQuantitySelector(true);
      return;
    }
    
    setSelectedItems((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((i) => i !== item.id);
      } else {
        Swal.fire({
          title: "Selected for Checkout!",
          text: `${item.name} added to checkout selection`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        return [...prev, item.id];
      }
    });
  };

  // Handle quantity selection for checkout
  const handleQuantitySelect = () => {
    if (!selectedItemForQuantity) return;
    
    const maxQuantity = selectedItemForQuantity.quantity || 1;
    if (selectedQuantity < 1 || selectedQuantity > maxQuantity) {
      Swal.fire("Error", `Quantity must be between 1 and ${maxQuantity}`, "error");
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.id === selectedItemForQuantity.id 
        ? { ...item, checkoutQuantity: selectedQuantity }
        : item
    ));

    setSelectedItems(prev => [...prev, selectedItemForQuantity.id]);
    
    Swal.fire({
      title: "Selected for Checkout!",
      text: `${selectedItemForQuantity.name} (${selectedQuantity} items) added to checkout selection`,
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });

    setShowQuantitySelector(false);
    setSelectedItemForQuantity(null);
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
      const updatedCartItems = cartItems.map(item => ({
        ...item,
        checkoutQuantity: item.quantity || 1
      }));
      setCartItems(updatedCartItems);
      
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

  // Update quantity in cart
  const updateQuantity = async (id, change) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    const newQuantity = Math.max(1, (item.quantity || 1) + change);
    
    try {
      const cartItemRef = doc(db, "cart", id);
      await updateDoc(cartItemRef, {
        quantity: newQuantity,
        updatedAt: new Date()
      });

      // Update local state
      setCartItems(prev => prev.map(item => {
        if (item.id === id) {
          return { 
            ...item, 
            quantity: newQuantity,
            checkoutQuantity: Math.min(item.checkoutQuantity || 1, newQuantity)
          };
        }
        return item;
      }));

    } catch (err) {
      console.error("Error updating quantity:", err);
      Swal.fire("Error", "Failed to update quantity", "error");
    }
  };

  // Remove item with animation - UPDATED
  const removeItem = async (id, productName) => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      Swal.fire("Error", "Invalid item ID", "error");
      return;
    }

    setRemovingItem(id);
    
    try {
      // Find the item to get the exact Firestore ID
      const itemToRemove = cartItems.find(item => item.id === id);
      if (!itemToRemove) {
        console.log("Item not found in local state:", id);
        setCartItems(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
        Swal.fire("Info", "Item not found in cart", "info");
        return;
      }
      
      // Use the exact Firestore document ID
      const documentIdToDelete = itemToRemove.firestoreId || itemToRemove.id;
      
      console.log("Removing item with Firestore ID:", documentIdToDelete);
      
      const cartItemRef = doc(db, "cart", documentIdToDelete);
      
      // Try to get document first
      const docSnap = await getDoc(cartItemRef);
      
      if (!docSnap.exists()) {
        console.log("Document doesn't exist in Firestore:", documentIdToDelete);
        // Update local state anyway
        setCartItems(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
        Swal.fire("Info", "Item was already removed", "info");
        return;
      }
      
      // Delete from Firestore
      await deleteDoc(cartItemRef);
      
      // Update local state
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
      
      if (err.code === 'not-found') {
        // Document doesn't exist, update local state
        setCartItems(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => prev.filter(itemId => itemId !== id));
        Swal.fire("Info", "Item was already removed", "info");
      } else {
        Swal.fire("Error", "Failed to remove item", "error");
        // Refresh cart on other errors
        setTimeout(() => {
          refreshCart();
        }, 500);
      }
    } finally {
      setTimeout(() => setRemovingItem(null), 300);
    }
  };

  // Remove selected items - WORKING WITH CART_ PREFIX
  const removeSelected = async () => {
    if (!user || selectedItems.length === 0 || isRemovingSelected) return;

    const result = await Swal.fire({
      title: "Remove Selected Items?",
      text: `Are you sure you want to remove ${selectedItems.length} selected items from cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove them!",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    setIsRemovingSelected(true);
    
    try {
      // Get items to remove details
      const itemsToRemove = cartItems.filter(item => selectedItems.includes(item.id));
      console.log("Items to remove from local state:", itemsToRemove.map(item => ({
        id: item.id,
        firestoreId: item.firestoreId,
        productId: item.productId,
        name: item.name
      })));
      
      // First update UI for better UX
      const newCartItems = cartItems.filter(item => !selectedItems.includes(item.id));
      setCartItems(newCartItems);
      setSelectedItems([]);
      
      // Now delete from Firestore
      let successCount = 0;
      let failedItems = [];
      
      for (const item of itemsToRemove) {
        try {
          // Use the exact Firestore document ID
          const documentIdToDelete = item.firestoreId || item.id;
          
          console.log("Attempting to delete document:", documentIdToDelete);
          
          const cartItemRef = doc(db, "cart", documentIdToDelete);
          await deleteDoc(cartItemRef);
          
          successCount++;
          console.log("Successfully deleted:", documentIdToDelete);
          
        } catch (err) {
          console.error(`Failed to delete ${item.id}:`, err);
          failedItems.push({
            id: item.id,
            name: item.name,
            error: err.message
          });
        }
      }
      
      if (failedItems.length === 0) {
        // All deletions successful
        Swal.fire({
          title: "Success!",
          text: `${successCount} items removed from cart`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        // Partial success
        Swal.fire({
          title: "Partial Success",
          html: `
            <p>${successCount} items removed successfully</p>
            <p>${failedItems.length} items failed to remove</p>
            <small>Failed items: ${failedItems.map(f => f.name).join(', ')}</small>
          `,
          icon: "warning",
          timer: 4000,
        });
        
        // Refresh cart to sync with actual Firestore state
        setTimeout(() => {
          refreshCart();
        }, 1000);
      } else {
        // All failed
        Swal.fire({
          title: "Failed",
          text: "Could not remove any items. Cart has been refreshed.",
          icon: "error",
          timer: 3000,
        });
        
        // Refresh cart
        await refreshCart();
      }
      
    } catch (err) {
      console.error("Error in removeSelected:", err);
      
      // Refresh cart on error
      await refreshCart();
      
      Swal.fire({
        title: "Error",
        text: "Failed to remove items. Cart has been refreshed.",
        icon: "error",
        timer: 3000,
      });
    } finally {
      setIsRemovingSelected(false);
    }
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
      const productId = item.productId ? String(item.productId).trim() : '';
      if (!productId) {
        throw new Error("Invalid product ID");
      }

      const wishId = `${user.uid}_${productId}_${Date.now()}`;
      
      const wishlistData = {
        productId: productId,
        name: item.name || "Unnamed Product",
        price: item.price || 0,
        image: item.image || "https://via.placeholder.com/150",
        size: item.size || "M",
        color: item.color || "",
        createdAt: new Date(),
        userId: user.uid,
        userEmail: user.email || "",
      };

      await setDoc(doc(db, "wishlist", wishId), wishlistData);

      // Remove from cart
      if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
        await removeItem(item.id, item.name);
      }

      Swal.fire({
        title: "Moved to Wishlist!",
        text: `"${item.name || 'Item'}" added to your wishlist`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error moving to wishlist:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to add to wishlist. Please try again.",
        icon: "error",
      });
    }
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Swal.fire("Error", "Please enter a coupon code", "warning");
      return;
    }
    
    const validCoupons = {
      "WELCOME10": 10,
      "SAVE20": 20,
      "FLASH30": 30,
      "FREESHIP": 99,
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
  };

  // Calculate totals with checkout quantities
  const calculateTotals = () => {
    const selected = cartItems
      .filter(item => selectedItems.includes(item.id))
      .map(item => ({
        ...item,
        checkoutQuantity: item.checkoutQuantity || 1
      }));
    
    const subtotal = selected.reduce((sum, item) => 
      sum + (item.price * (item.checkoutQuantity || 1)), 0);
    
    const shipping = selected.length > 0 ? (couponCode === "FREESHIP" ? 0 : 99) : 0;
    const couponAmount = couponApplied ? (subtotal * couponDiscount) / 100 : 0;
    const total = Math.max(0, subtotal + shipping - couponAmount);
    
    return {
      subtotal,
      shipping,
      couponDiscount: couponAmount,
      total,
      itemsCount: selected.reduce((sum, item) => sum + (item.checkoutQuantity || 1), 0),
      selectedItems: selected,
      uniqueItemsCount: selected.length
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

    const itemsToCheckout = totals.selectedItems;

    try {
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

  // Share functions
  const openShareModal = (item) => {
    setItemToShare(item);
    setShareType("item");
    setShowShareModal(true);
  };

  const openShareCart = () => {
    setShareType("cart");
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setItemToShare(null);
    setCopied(false);
  };

  const shareViaWhatsApp = () => {
    let message = "";
    if (shareType === "item" && itemToShare) {
      message = `Check out this product: ${itemToShare.name} - ₹${itemToShare.price}\n`;
      message += `${window.location.origin}/shop`;
    } else {
      message = `Check out my cart! Total: ₹${totals.total}\n`;
      message += `Items: ${totals.itemsCount}\n`;
      message += `${window.location.origin}/cart`;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    closeShareModal();
  };

  const shareViaFacebook = () => {
    const url = shareType === "item" 
      ? `${window.location.origin}/shop` 
      : `${window.location.origin}/cart`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    closeShareModal();
  };

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

  const copyToClipboard = () => {
    const url = shareType === "item" 
      ? `${window.location.origin}/shop` 
      : `${window.location.origin}/cart`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowModal(true);
  };

  const closeImageModal = () => {
    setShowModal(false);
    setSelectedImage("");
  };

  const continueShopping = () => {
    navigate("/shop");
  };

  const calculateSavings = () => {
    return cartItems.reduce((sum, item) => {
      const saving = item.originalPrice && item.originalPrice > item.price 
        ? (item.originalPrice - item.price) * (item.quantity || 1)
        : 0;
      return sum + saving;
    }, 0);
  };

  const toggleSelectedItemsPanel = () => {
    setShowSelectedItemsPanel(!showSelectedItemsPanel);
  };

  const getCheckoutQuantity = (item) => {
    return item.checkoutQuantity || 1;
  };

  // Debug function to check cart IDs
  const debugCartIds = () => {
    console.log("=== CART ID DEBUG ===");
    
    // Check if any IDs don't start with 'cart_'
    const nonStandardIds = cartItems.filter(item => !item.id.startsWith('cart_'));
    
    console.log("Total cart items:", cartItems.length);
    console.log("Items with non-standard IDs:", nonStandardIds.length);
    
    if (nonStandardIds.length > 0) {
      console.log("Non-standard IDs:", nonStandardIds.map(item => ({
        id: item.id,
        name: item.name
      })));
    }
    
    // Check selected items
    console.log("Selected items:", selectedItems);
    console.log("Selected items in cart:", cartItems.filter(item => selectedItems.includes(item.id)).map(item => item.name));
    
    Swal.fire({
      title: "Cart ID Check",
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Total Items:</strong> ${cartItems.length}</p>
          <p><strong>Selected Items:</strong> ${selectedItems.length}</p>
          <p><strong>Non-standard IDs:</strong> ${nonStandardIds.length}</p>
          <p><strong>Sample IDs:</strong></p>
          <ul style="max-height: 100px; overflow-y: auto;">
            ${cartItems.slice(0, 3).map(item => `<li>${item.id.substring(0, 20)}... - ${item.name.substring(0, 20)}...</li>`).join('')}
          </ul>
        </div>
      `,
      width: 500
    });
  };

  // Debug function to check Firestore connection
  const debugFirestoreConnection = async () => {
    if (!user) {
      console.log("No user logged in");
      return;
    }
    
    try {
      // Get all cart items
      const q = query(collection(db, "cart"), where("userId", "==", user.uid));
      const cartSnap = await getDocs(q);
      
      console.log("=== FIRESTORE DEBUG INFO ===");
      console.log("User ID:", user.uid);
      console.log("Total cart items in Firestore:", cartSnap.docs.length);
      
      // List all cart items
      cartSnap.docs.forEach((docSnap, index) => {
        const data = docSnap.data();
        console.log(`Item ${index + 1}:`, {
          documentId: docSnap.id,
          productId: data.productId,
          name: data.name || "No name",
          userId: data.userId
        });
      });
      
      // Compare with local state
      console.log("=== LOCAL STATE INFO ===");
      console.log("Local cart items:", cartItems.length);
      cartItems.forEach((item, index) => {
        console.log(`Local Item ${index + 1}:`, {
          id: item.id,
          firestoreId: item.firestoreId,
          productId: item.productId,
          name: item.name,
          matchesFirestore: cartSnap.docs.some(doc => doc.id === item.id)
        });
      });
      
      Swal.fire({
        title: "Debug Info",
        html: `
          <div style="text-align: left; font-size: 12px;">
            <p><strong>Firestore Items:</strong> ${cartSnap.docs.length}</p>
            <p><strong>Local Items:</strong> ${cartItems.length}</p>
            <p><strong>Selected Items:</strong> ${selectedItems.length}</p>
            <p><strong>Matching IDs:</strong> ${cartItems.filter(item => cartSnap.docs.some(doc => doc.id === item.id)).length}</p>
          </div>
        `,
        icon: "info"
      });
      
    } catch (err) {
      console.error("Debug error:", err);
      Swal.fire("Debug Error", err.message, "error");
    }
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
      {/* Quantity Selector Modal */}
      {showQuantitySelector && selectedItemForQuantity && (
        <div className="modal-backdrop">
          <div className="quantity-selector-modal">
            <div className="quantity-selector-header">
              <h3>Select Quantity for Checkout</h3>
              <button className="modal-close" onClick={() => setShowQuantitySelector(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="quantity-selector-content">
              <div className="product-info-quantity">
                <img src={selectedItemForQuantity.image} alt={selectedItemForQuantity.name} />
                <div>
                  <h4>{selectedItemForQuantity.name}</h4>
                  <p>Available: {selectedItemForQuantity.quantity || 1}</p>
                </div>
              </div>
              <div className="quantity-controls-modal">
                <button 
                  className="quantity-btn minus"
                  onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                  disabled={selectedQuantity <= 1}
                >
                  <FaMinus />
                </button>
                <span className="quantity-value">{selectedQuantity}</span>
                <button 
                  className="quantity-btn plus"
                  onClick={() => setSelectedQuantity(prev => 
                    Math.min(selectedItemForQuantity.quantity || 1, prev + 1)
                  )}
                  disabled={selectedQuantity >= (selectedItemForQuantity.quantity || 1)}
                >
                  <FaPlus />
                </button>
              </div>
              <div className="quantity-total">
                <span>Total: </span>
                <span className="total-price">
                  ₹{(selectedItemForQuantity.price * selectedQuantity).toLocaleString()}
                </span>
              </div>
              <div className="quantity-selector-actions">
                <button 
                  className="btn-cancel"
                  onClick={() => setShowQuantitySelector(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-confirm"
                  onClick={handleQuantitySelect}
                >
                  <FaCheck /> Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {/* Debug/Refresh button */}
          <button 
            className="refresh-btn" 
            onClick={() => user && fetchCart(user.uid)}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <FaCheckCircle /> Refresh Cart
          </button>
          {/* Debug Cart IDs Button */}
          <button 
            onClick={debugCartIds}
            style={{
              background: "#9c27b0",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginLeft: "10px"
            }}
          >
            <FaCheckCircle /> Debug IDs
          </button>
          {/* Debug Firestore Button */}
          <button 
            onClick={debugFirestoreConnection}
            style={{
              background: "#ff9800",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginLeft: "10px"
            }}
          >
            <FaCheckCircle /> Debug DB
          </button>
        </div>
      </div>

      {/* Selected Items Indicator */}
      {selectedItems.length > 0 && (
        <div className="selected-indicator">
          <div className="indicator-content">
            <FaCheckCircle className="indicator-icon" />
            <span className="indicator-text">
              {totals.itemsCount} item{totals.itemsCount !== 1 ? 's' : ''} selected for checkout
              {totals.uniqueItemsCount !== totals.itemsCount && (
                <span className="indicator-detail">
                  ({totals.uniqueItemsCount} unique products)
                </span>
              )}
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
            <h3>Items Selected for Checkout ({totals.itemsCount} items)</h3>
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
                  <p>Quantity for checkout: {getCheckoutQuantity(item)} of {item.quantity}</p>
                  <p className="item-price">
                    ₹{(item.price * getCheckoutQuantity(item)).toLocaleString()}
                  </p>
                </div>
                <button 
                  className="remove-selected-item"
                  onClick={() => toggleSelect(item)}
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
              <span className="stat-value">{totals.itemsCount}</span>
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
                  disabled={selectedItems.length === 0 || isRemovingSelected}
                >
                  <FaTrash /> 
                  {isRemovingSelected ? "Removing..." : "Remove Selected"}
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
            {cartItems.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              const checkoutQuantity = getCheckoutQuantity(item);
              
              return (
                <div 
                  key={item.id} 
                  className={`cart-item ${removingItem === item.id ? 'removing' : ''} ${isSelected ? 'selected-for-checkout' : ''}`}
                >
                  {/* Select Checkbox with Label */}
                  <div className="item-select">
                    <input
                      type="checkbox"
                      id={`item-${item.id}`}
                      checked={isSelected}
                      onChange={() => toggleSelect(item)}
                    />
                    <label htmlFor={`item-${item.id}`}>
                      {isSelected ? (
                        <>
                          <FaCheckCircle className="check-icon" />
                          <span className="select-label">
                            Selected for Checkout ({checkoutQuantity} of {item.quantity})
                          </span>
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
                    {isSelected && (
                      <div className="selected-badge">
                        <FaCheckCircle /> Selected ({checkoutQuantity})
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
                    {!isSelected ? (
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
                    ) : (
                      <div className="checkout-locked">
                        <FaCheckCircle />
                        <span>
                          {checkoutQuantity} selected for checkout
                        </span>
                      </div>
                    )}

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
              );
            })}
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
                  {totals.itemsCount} item{totals.itemsCount !== 1 ? 's' : ''} selected
                  {totals.uniqueItemsCount !== totals.itemsCount && (
                    <span className="summary-detail">
                      ({totals.uniqueItemsCount} unique products)
                    </span>
                  )}
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
                  Proceed to Checkout ({totals.itemsCount} items)
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
                    <span className="stat-value">{totals.itemsCount}</span>
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
              Selected Items ({totals.itemsCount})
            </span>
            {selectedItems.length > 0 && (
              <span className="floating-count">{totals.itemsCount}</span>
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
              Checkout {selectedItems.length > 0 ? `(${totals.itemsCount} items)` : ''}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;