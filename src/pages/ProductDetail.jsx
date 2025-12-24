import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../assets/css/productDetails.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching product with ID:', id, 'Type:', typeof id);
        
        // Convert ID to number for comparison (since your IDs are numbers)
        const numericId = Number(id);
        console.log('🔍 Converted numeric ID:', numericId);

        // Try both collections
        const collections = ['products-details', 'products'];
        let productData = null;

        for (const collectionName of collections) {
          try {
            console.log(`📂 Searching in collection: ${collectionName}`);
            
            // METHOD 1: Try direct document access with string ID
            try {
              const productRef = doc(db, collectionName, id);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                productData = {
                  id: productSnap.id,
                  ...productSnap.data(),
                  collection: collectionName,
                  foundBy: 'direct_id'
                };
                console.log('✅ Product found by direct ID in:', collectionName);
                break;
              }
            } catch (directError) {
              console.log(`❌ Direct ID access failed for ${collectionName}:`, directError.message);
            }

            // METHOD 2: Query by numeric ID field
            try {
              console.log(`🔎 Querying ${collectionName} for id field = ${numericId}`);
              const q = query(
                collection(db, collectionName), 
                where('id', '==', numericId)
              );
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                productData = {
                  id: docSnap.id,
                  ...docSnap.data(),
                  collection: collectionName,
                  foundBy: 'id_field_query'
                };
                console.log('✅ Product found by id field query in:', collectionName);
                break;
              }
            } catch (queryError) {
              console.log(`❌ ID field query failed for ${collectionName}:`, queryError.message);
            }

            // METHOD 3: Search all documents in the collection
            try {
              console.log(`🔍 Searching all documents in ${collectionName}...`);
              const querySnapshot = await getDocs(collection(db, collectionName));
              let foundDoc = null;
              
              for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                
                // Check if document ID matches (as string)
                if (docSnap.id === id) {
                  foundDoc = docSnap;
                  console.log('✅ Found by document ID match');
                  break;
                }
                
                // Check if id field matches (as number)
                if (data.id === numericId) {
                  foundDoc = docSnap;
                  console.log('✅ Found by id field match');
                  break;
                }
                
                // Check if there's a productId field that matches
                if (data.productId && data.productId.toString() === id) {
                  foundDoc = docSnap;
                  console.log('✅ Found by productId field match');
                  break;
                }
              }
              
              if (foundDoc) {
                productData = {
                  id: foundDoc.id,
                  ...foundDoc.data(),
                  collection: collectionName,
                  foundBy: 'full_collection_scan'
                };
                break;
              }
            } catch (scanError) {
              console.log(`❌ Full collection scan failed for ${collectionName}:`, scanError.message);
            }

          } catch (collectionError) {
            console.error(`🚨 Error accessing ${collectionName}:`, collectionError);
          }
        }

        if (productData) {
          console.log('🎉 Product found successfully:', productData);
          setProduct(productData);
        } else {
          setError(`Product with ID "${id}" not found in any collection. The product may have been removed or the ID might be incorrect.`);
          console.log('❌ Product not found after all search methods');
        }
      } catch (err) {
        console.error('🚨 Error fetching product:', err);
        setError('Failed to load product details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    } else {
      setError('No product ID provided');
      setLoading(false);
    }
  }, [id, db]);

  const handleAddToCart = () => {
    if (!auth.currentUser) {
      navigate('/buyer/login');
      return;
    }
    console.log('Add to cart:', product);
    alert('Product added to cart!');
  };

  const handleAddToWishlist = () => {
    if (!auth.currentUser) {
      navigate('/buyer/login');
      return;
    }
    console.log('Add to wishlist:', product);
    alert('Product added to wishlist!');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Product Not Found</h2>
        <p>{error}</p>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/products')} className="back-btn">
            Browse All Products
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="back-btn"
            style={{ marginLeft: '10px', background: '#6c757d' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-container">
        <h2>Product Not Found</h2>
        <p>The product you're looking for doesn't exist or may have been removed.</p>
        <button onClick={() => navigate('/products')} className="back-btn">
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate(-1)} className="back-button">
        ← Back to Previous Page
      </button>
      
      <div className="product-detail-content">
        <div className="product-image-section">
          <img 
            src={product.imageUrl || product.image || product.img || 'https://via.placeholder.com/500x500?text=No+Image'} 
            alt={product.name || product.productName}
            className="product-main-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/500x500/AAA/666666?text=No+Image';
            }}
          />
        </div>
        
        <div className="product-info-section">
          <h1 className="product-title">
            {product.name || product.productName || 'Unnamed Product'}
          </h1>
          
          <div className="product-price-section">
            <span className="product-price">
              ₹{product.price || product.productPrice || 0}
            </span>
          </div>
          
          <div className="product-meta-info">
            <p><strong>Category:</strong> {product.category || product.productCategory || 'General'}</p>
            {product.subcategory && <p><strong>Subcategory:</strong> {product.subcategory}</p>}
            {product.brand && <p><strong>Brand:</strong> {product.brand}</p>}
            
          </div>
          
          {product.description && (
            <div className="product-description">
              <h3>Product Description</h3>
              <p>{product.description}</p>
            </div>
          )}
          
          <div className="product-actions">
            <button 
              className="add-to-cart-btn primary-btn"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
            <button 
              className="wishlist-btn secondary-btn"
              onClick={handleAddToWishlist}
            >
              ♡ Add to Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;