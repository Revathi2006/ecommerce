import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import ProductCard from '../components/ProductCard';
import './RecommendationSystem.css';

const RecommendationSystem = () => {
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRecommendations(currentUser.uid);
      } else {
        fetchPopularProducts();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId, collectionName) => {
    try {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return [];
    }
  };

  const fetchProductDetails = async (productId) => {
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        return { id: productSnap.id, ...productSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  };

  const fetchPopularProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('rating', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecommendedProducts(products);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular products:', error);
      setLoading(false);
    }
  };

  const fetchRecommendations = async (userId) => {
    try {
      setLoading(true);
      
      // Get user's cart and wishlist
      const [cartItems, wishlistItems] = await Promise.all([
        fetchUserData(userId, 'cart'),
        fetchUserData(userId, 'wishlist')
      ]);

      // Extract product IDs
      const cartProductIds = cartItems.map(item => item.productId);
      const wishlistProductIds = wishlistItems.map(item => item.productId);
      
      // Unique product IDs
      const userProductIds = [...new Set([...cartProductIds, ...wishlistProductIds])];
      const userProducts = await Promise.all(
        userProductIds.map(id => fetchProductDetails(id))
      );
      
      // Unique categories
      const userCategories = [
        ...new Set(userProducts.filter(p => p).map(p => p.category))
      ];
      
      // Collect recommendations
      let recommendedIds = new Set();
      
      // 1. Same category products
      if (userCategories.length > 0) {
        const categoryPromises = userCategories.slice(0, 5).map(category => {
          const categoryQuery = query(
            collection(db, 'products'),
            where('category', '==', category),
            limit(3)
          );
          return getDocs(categoryQuery);
        });
        
        const categoryResults = await Promise.all(categoryPromises);
        categoryResults.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            recommendedIds.add(doc.id);
          });
        });
      }
      
      // 2. Fill with popular products if needed
      if (recommendedIds.size < 6) {
        const popularQuery = query(
          collection(db, 'products'),
          orderBy('rating', 'desc'),
          limit(10 - recommendedIds.size)
        );
        const popularSnapshot = await getDocs(popularQuery);
        popularSnapshot.docs.forEach(doc => {
          recommendedIds.add(doc.id);
        });
      }
      
      // Fetch full product details
      const recommendedProductsData = await Promise.all(
        Array.from(recommendedIds).map(id => fetchProductDetails(id))
      );
      
      setRecommendedProducts(recommendedProductsData.filter(p => p));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      await fetchPopularProducts();
    }
  };

  if (loading) {
    return <div className="recommendation-loading">Loading recommendations...</div>;
  }

  if (recommendedProducts.length === 0) {
    return <div className="no-recommendations">No recommendations available</div>;
  }

  return (
    <div className="recommendation-system">
      <h2>Recommended For You</h2>
      <div className="recommended-products-grid">
        {recommendedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationSystem;
