// src/pages/OrderTracking.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../assets/css/orderTracking.css';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && orderId) {
        const orderUnsubscribe = fetchOrder(user.uid, orderId);
        return () => {
          if (orderUnsubscribe) orderUnsubscribe();
        };
      } else if (!user) {
        setError('Please login to view order details');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [orderId, auth]);

  const fetchOrder = (userId, orderId) => {
    try {
      setLoading(true);
      
      const orderRef = doc(db, 'orders', orderId);
      
      // Real-time listener for order updates
      const unsubscribe = onSnapshot(orderRef, (docSnap) => {
        if (docSnap.exists()) {
          const orderData = docSnap.data();
          
          // Verify the order belongs to the current user
          if (orderData.userId === userId) {
            setOrder({
              id: docSnap.id,
              ...orderData
            });
            setError('');
          } else {
            setError('Order not found or access denied');
          }
        } else {
          setError('Order not found');
        }
        setLoading(false);
      }, (err) => {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
        setLoading(false);
      });

      // Return unsubscribe function to clean up listener
      return unsubscribe;
    } catch (err) {
      console.error('Error setting up order listener:', err);
      setError('Failed to load order details');
      setLoading(false);
    }
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

  const getStatusSteps = (currentStatus) => {
    const allSteps = [
      { id: 'confirmed', label: 'Order Confirmed', description: 'Your order has been confirmed' },
      { id: 'processing', label: 'Processing', description: 'Seller is preparing your order' },
      { id: 'shipped', label: 'Shipped', description: 'Your order has been shipped' },
      { id: 'out-for-delivery', label: 'Out for Delivery', description: 'Your order is out for delivery' },
      { id: 'delivered', label: 'Delivered', description: 'Your order has been delivered' }
    ];

    const currentIndex = allSteps.findIndex(step => step.id === currentStatus);
    
    return allSteps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return new Date(timestamp).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="order-tracking-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-tracking-container">
        <div className="error-container">
          <h2>Order Not Found</h2>
          <p>{error}</p>
          <div className="action-buttons">
            <button onClick={() => navigate('/orders')} className="primary-btn">
              View All Orders
            </button>
            <button onClick={() => navigate('/')} className="secondary-btn">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-tracking-container">
        <div className="error-container">
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/orders')} className="primary-btn">
            View All Orders
          </button>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status);
  const totalAmount = order.items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;

  return (
    <div className="order-tracking-container">
      <div className="order-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>Order Tracking</h1>
        <div className="order-meta">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Order Date:</strong> {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="order-content">
        {/* Order Status Timeline */}
        <div className="status-timeline-section">
          <h2>Order Status</h2>
          <div className="timeline">
            {statusSteps.map((step, index) => (
              <div key={step.id} className={`timeline-step ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}`}>
                <div className="step-indicator">
                  <div className="step-icon">
                    {step.completed ? '✓' : index + 1}
                  </div>
                </div>
                <div className="step-content">
                  <h3 className="step-title">{step.label}</h3>
                  <p className="step-description">{step.description}</p>
                  {step.active && order.updatedAt && (
                    <p className="step-time">Last updated: {formatDate(order.updatedAt)}</p>
                  )}
                </div>
                {index < statusSteps.length - 1 && (
                  <div className="step-connector"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order Details */}
        <div className="order-details-section">
          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Order Status:</span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status?.replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Total Amount:</span>
                <span className="value">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Payment Method:</span>
                <span className="value">{order.paymentMethod || 'Credit Card'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Payment Status:</span>
                <span className="value">{order.paymentStatus || 'Paid'}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="shipping-address">
              <h2>Shipping Address</h2>
              <div className="address-card">
                <p><strong>{order.shippingAddress.fullName}</strong></p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p>Phone: {order.shippingAddress.phone}</p>
                {order.shippingAddress.landmark && (
                  <p>Landmark: {order.shippingAddress.landmark}</p>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="order-items">
            <h2>Order Items</h2>
            <div className="items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-image">
                    <img 
                      src={item.image || item.imageUrl || 'https://via.placeholder.com/80x80?text=No+Image'} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/80x80/AAA/666666?text=No+Image';
                      }}
                    />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-category">{item.category}</p>
                    <p className="item-quantity">Quantity: {item.quantity}</p>
                  </div>
                  <div className="item-price">
                    <p className="price">₹{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="unit-price">₹{item.price} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Information */}
          {order.trackingNumber && (
            <div className="delivery-info">
              <h2>Delivery Information</h2>
              <div className="info-card">
                <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
                {order.carrier && <p><strong>Carrier:</strong> {order.carrier}</p>}
                {order.estimatedDelivery && (
                  <p><strong>Estimated Delivery:</strong> {formatDate(order.estimatedDelivery)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={() => navigate('/orders')} className="secondary-btn">
          View All Orders
        </button>
        <button onClick={() => navigate('/')} className="primary-btn">
          Continue Shopping
        </button>
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <button className="support-btn">
            Contact Support
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;