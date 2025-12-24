// src/pages/Home.jsx
import React, { useState, useEffect, useCallback } from "react"; 
import { useNavigate } from "react-router-dom"; 
import "../assets/css/home.css"; 
import { initializeApp } from "firebase/app"; 
import { getFirestore, doc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore"; 
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"; 
import { getStorage, ref, getDownloadURL } from "firebase/storage"; 

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
        imageUrl: doc.data().imageUrl || doc.data().image || doc.data().img || "https://via.placeholder.com/300x200?text=No+Image", 
        price: doc.data().price || doc.data().productPrice || 0, 
        category: doc.data().category || doc.data().productCategory || "General", 
        name: doc.data().name || doc.data().productName || "Unnamed Product" 
      })); 
       
      const products = productsSnap.docs.map(doc => ({  
        id: doc.id,  
        ...doc.data(), 
        imageUrl: doc.data().imageUrl || doc.data().image || doc.data().img || "https://via.placeholder.com/300x200?text=No+Image", 
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
          imageUrl: product.imageUrl || "https://via.placeholder.com/300x200?text=No+Image" 
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
        imageUrl: product.imageUrl || "https://via.placeholder.com/300x200?text=No+Image", 
        category: product.category || "General" 
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
                description: data.description || "" 
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
      alert("Logged out successfully"); 
    } catch (error) { 
      console.error("Logout error:", error); 
      alert("Error during logout"); 
    } 
  }; 

  const handleVendorClick = () => setShowVendorChoice(true); 
  const handleAdminClick = () => setShowAdminChoice(true); 

  const handleProductClick = (product) => {
    console.log('Product clicked:', product);
    console.log('Product ID:', product.id);
    
    if (!product || !product.id) {
      console.error('Invalid product data:', product);
      alert('Product information is not available');
      return;
    }

    // Navigate to product detail page
    navigate(`/product/${product.id}`);
  };

  const handleBrowseProducts = () => { 
    navigate("/products"); 
  }; 

  const handleImageError = (e) => { 
    e.target.src = "https://via.placeholder.com/300x200/AAA/666666?text=No+Image"; 
  }; 

  const goToNextOffer = () => { 
    setCurrentIndex((prev) => (prev + 1) % offersList.length); 
  }; 

  const goToPrevOffer = () => { 
    setCurrentIndex((prev) => (prev - 1 + offersList.length) % offersList.length); 
  }; 

  return ( 
    <div className="home-container"> 
      <header className="home-header"> 
        <h1>Cartify</h1> 
        <p className="tagline">Smart shopping, better rewards</p> 
      </header> 

      <nav className="navbar"> 
        <button onClick={() => navigate("/")} className="nav-btn">Home</button> 
        <button onClick={handleBrowseProducts} className="nav-btn">Products</button> 

        {user ? ( 
          <> 
            <button className="nav-btn" onClick={() => navigate("/buyer/cart")}>Cart</button> 
            <button className="nav-btn" onClick={() => navigate("/buyer/wishlist")}>Wish List</button> 
            <button className="nav-btn" onClick={() => navigate("/orders")}>
              My Orders {ordersCount > 0 && <span className="orders-badge">{ordersCount}</span>}
            </button> 
            <button id="logout-btn" className="nav-btn" onClick={handleLogout}>Logout</button> 
          </> 
        ) : ( 
          <> 
            <button className="nav-btn" onClick={() => navigate("/buyer/signup")}>Sign Up</button> 
            <button className="nav-btn" onClick={() => navigate("/buyer/login")}>Login</button> 
          </> 
        )} 

        <button className="start-btn" onClick={handleVendorClick}>Become a Vendor</button> 
        <button className="start-btn" onClick={handleAdminClick}>Admin Login</button> 
        <button className="start-btn" onClick={handleBrowseProducts}>Start shopping</button> 
      </nav> 

      {showVendorChoice && ( 
        <div className="popup-overlay"> 
          <div className="popup"> 
            <h3>Become a Vendor</h3> 
            <p>Please choose an option:</p> 
            <div className="popup-actions"> 
              <button className="popup-btn" onClick={() => navigate("/seller/signup")}>Seller Sign Up</button> 
              <button className="popup-btn" onClick={() => navigate("/seller/login")}>Seller Login</button> 
              <button className="popup-btn cancel" onClick={() => setShowVendorChoice(false)}>Cancel</button> 
            </div> 
          </div> 
        </div> 
      )} 

      {showAdminChoice && ( 
        <div className="popup-overlay"> 
          <div className="popup"> 
            <h3>Admin Login</h3> 
            <p>Proceed to admin login page:</p> 
            <div className="popup-actions"> 
              <button className="popup-btn" onClick={() => navigate("/admin/login")}>Login as Admin</button> 
              <button className="popup-btn cancel" onClick={() => setShowAdminChoice(false)}>Cancel</button> 
            </div> 
          </div> 
        </div> 
      )} 

      {buyer && ( 
        <section className="profile-card"> 
          <h2>My Profile</h2> 
          <div className="profile-details"> 
            <p><strong>Name:</strong> {buyer.fullName}</p> 
            <p><strong>Email:</strong> {buyer.email}</p> 
            <p><strong>Phone:</strong> {buyer.phone || "Not provided"}</p> 
            <p><strong>Address:</strong> {buyer.address || "Not provided"}</p> 
            <p><strong>Location Verified:</strong> {buyer.isLocationVerified ? " Yes" : " No"}</p> 
            <p><strong>Reward Points:</strong> {points} </p> 
            <p><strong>Total Orders:</strong> {ordersCount} </p> 
          </div> 
        </section> 
      )} 

      <section className="offers-section"> 
        <h2>Special Offers</h2> 
        {loadingOffers ? ( 
          <div className="loading-offers">Loading offers...</div> 
        ) : offersList.length === 0 ? ( 
          <p className="no-offers">No offers available right now.</p> 
        ) : ( 
          <div className="carousel-wrapper"> 
            {offersList.length > 1 && ( 
              <button 
                className="arrow left-arrow" 
                onClick={goToPrevOffer} 
                aria-label="Previous offer" 
              > 
                ❮ 
              </button> 
            )} 
             
            <div className="offer-slide"> 
              <img  
                src={offersList[currentIndex]?.imageUrl}  
                alt={offersList[currentIndex]?.title || `Offer ${currentIndex + 1}`}  
                className="offer-img" 
                onError={handleImageError} 
              /> 
              <div className="offer-info"> 
                <h3>{offersList[currentIndex]?.title}</h3> 
                <p>{offersList[currentIndex]?.description}</p> 
              </div> 
            </div> 
             
            {offersList.length > 1 && ( 
              <button 
                className="arrow right-arrow" 
                onClick={goToNextOffer} 
                aria-label="Next offer" 
              > 
                ❯ 
              </button> 
            )} 
             
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

      <section className="featured-products"> 
        <div className="recommendations-header"> 
          <h2>{user ? "Recommended For You" : "Featured Products"}</h2> 
          {user && ( 
            <span className="recommendation-badge"> 
              Based on your interests 
            </span> 
          )} 
        </div> 
         
        {loadingRecommendations ? ( 
          <div className="loading-products"> 
            <div className="loading-spinner"></div> 
            <p>Loading personalized recommendations...</p> 
          </div> 
        ) : recommendedProducts.length > 0 ? ( 
          <> 
            <div className="recommended-products"> 
              {recommendedProducts.map(product => ( 
                <div  
                  key={product.id}  
                  className="recommended-product" 
                  onClick={() => handleProductClick(product)}
                  style={{ cursor: 'pointer' }} 
                > 
                  <div className="product-image-container">
                    <img  
                      src={product.imageUrl}  
                      alt={product.name} 
                      onError={handleImageError} 
                    /> 
                    {product.category && ( 
                      <span className="category-badge">{product.category}</span> 
                    )} 
                  </div> 
                  <div className="product-info"> 
                    <h3>{product.name}</h3> 
                    <p className="product-price">₹{product.price}</p> 
                    <p className="product-category">Category: {product.category}</p> 
                     
                    <button  
                      className="view-details-btn" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent click
                        handleProductClick(product);
                      }} 
                    > 
                      View Details 
                    </button> 
                  </div> 
                </div> 
              ))} 
            </div> 
             
            <div className="browse-more-container"> 
              <button  
                className="browse-more-btn" 
                onClick={handleBrowseProducts} 
              > 
                Browse All Products → 
              </button> 
            </div> 
          </> 
        ) : ( 
          <p className="no-recommendations">No products found. Please check back later.</p> 
        )} 
      </section> 

      <footer className="home-footer"> 
        <p>© {new Date().getFullYear()} Cartify. All rights reserved.</p> 
      </footer> 
    </div> 
  ); 
}; 

export default Home;