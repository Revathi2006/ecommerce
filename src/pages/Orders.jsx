// src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../assets/css/orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchOrders(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  const fetchOrders = (userId) => {
    setLoading(true);
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Real-time listener for order updates
    const unsubscribe = onSnapshot(ordersQuery, 
      (querySnapshot) => {
        const ordersData = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'processing': return '#17a2b8';
      case 'shipped': return '#007bff';
      case 'out-for-delivery': return '#fd7e14';
      case 'delivered': return '#20c997';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-IN');
    }
    
    return new Date(timestamp).toLocaleDateString('en-IN');
  };

  const calculateTotal = (items) => {
    return items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back to Home
        </button>
        <h1>My Orders</h1>
        <p>Track and manage your purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No Orders Found</h2>
          <p>You haven't placed any orders yet.</p>
          <button onClick={() => navigate('/')} className="primary-btn">
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.id.slice(-8).toUpperCase()}</h3>
                  <p className="order-date">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status?.replace(/-/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="order-items-preview">
                {order.items?.slice(0, 3).map((item, index) => (
                  <div key={index} className="preview-item">
                    <img 
                      src={item.image || item.imageUrl || 'https://via.placeholder.com/50x50?text=No+Image'} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/50x50/AAA/666666?text=No+Image';
                      }}
                    />
                    <span className="item-name">{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="item-quantity">x{item.quantity}</span>
                    )}
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <div className="more-items">+{order.items.length - 3} more items</div>
                )}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  Total: ₹{calculateTotal(order.items).toFixed(2)}
                </div>
                <div className="order-actions">
                  <button 
                    onClick={() => navigate(`/order-tracking/${order.id}`)}
                    className="track-order-btn"
                  >
                    Track Order
                  </button>
                  {/* Show Delivered info if status is delivered */}
                  {order.status === 'delivered' && (
                    <span className="delivered-info">
                      Delivered on {formatDate(order.deliveredAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
