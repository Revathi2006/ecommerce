// src/pages/Admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import {
  FaUsers,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaTruck,
  FaBoxOpen,
  FaCog,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaChartLine,
  FaBell,
  FaEnvelope,
  FaPhone,
  FaStore,
  FaTag,
  FaClock,
  FaExclamationTriangle,
  FaCheckDouble,
  FaArrowRight,
  FaSync,
  FaTrash,
} from "react-icons/fa";
import "../../assets/css/AdminDashboard.css";
import Swal from "sweetalert2";

export default function AdminDashboard() {
  const [pendingSellers, setPendingSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingSellers: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });
  const [activeTab, setActiveTab] = useState("sellers");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "sellers"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sellers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingSellers(sellers);
      setStats(prev => ({ ...prev, pendingSellers: sellers.length }));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(ordersData);
      
      // Calculate stats
      const totalRevenue = ordersData.reduce((sum, order) => sum + (parseFloat(order.totalPaid) || 0), 0);
      const avgOrderValue = ordersData.length > 0 ? totalRevenue / ordersData.length : 0;
      
      setStats(prev => ({
        ...prev,
        totalOrders: ordersData.length,
        totalRevenue,
        avgOrderValue,
      }));
    });
    return unsubscribe;
  }, []);

  const handleApproveSeller = async (id, sellerData) => {
    try {
      await updateDoc(doc(db, "sellers", id), { 
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: "Admin"
      });
      
      // Send email notification
      await emailjs.send(
        "service_uo7n33o",
        "template_0l5vs1j",
        {
          to_email: sellerData.email,
          seller_name: `${sellerData.firstName} ${sellerData.lastName}`,
          shop_name: sellerData.shopName,
          message: "Congratulations! Your seller account has been approved."
        },
        "OQ3pooGZlDi33B5z1"
      );
    } catch (error) {
      console.error("Error approving seller:", error);
    }
  };

  const handleRejectSeller = async (id, sellerData) => {
    try {
      await updateDoc(doc(db, "sellers", id), { 
        status: "rejected",
        rejectedAt: serverTimestamp(),
        reason: "Does not meet requirements"
      });
      
      // Send rejection email
      await emailjs.send(
        "service_uo7n33o",
        "template_0l5vs1j",
        {
          to_email: sellerData.email,
          seller_name: `${sellerData.firstName} ${sellerData.lastName}`,
          shop_name: sellerData.shopName,
          message: "Your seller account application has been reviewed and unfortunately rejected."
        },
        "OQ3pooGZlDi33B5z1"
      );
    } catch (error) {
      console.error("Error rejecting seller:", error);
    }
  };

  const handleOrderStatusChange = async (id, status, userId, userEmail) => {
    try {
      await updateDoc(doc(db, "orders", id), { 
        status,
        updatedAt: serverTimestamp()
      });

     if (status === "delivered" && userId) {

  // 🔔 Show popup immediately
  Swal.fire({
    icon: "success",
    title: "Delivered ✅",
    text: `Order delivered successfully. Email sent to ${userEmail}`,
    timer: 2000,
    showConfirmButton: false
  });

        // Send email notification
        if (userEmail) {
          await emailjs.send(
            "service_uo7n33o",
            "template_0l5vs1j",
            {
              to_email: userEmail,
              order_id: `#${id.slice(-8).toUpperCase()}`,
              status: "delivered",
              message: "Your order has been successfully delivered!"
            },
            "OQ3pooGZlDi33B5z1"
          );
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const statusOptions = [
    { value: "confirmed", label: "Confirmed", icon: <FaCheckCircle />, color: "#10b981" },
    { value: "processing", label: "Processing", icon: <FaCog />, color: "#3b82f6" },
    { value: "shipped", label: "Shipped", icon: <FaTruck />, color: "#8b5cf6" },
    { value: "out-for-delivery", label: "Out for Delivery", icon: <FaBoxOpen />, color: "#f59e0b" },
    { value: "delivered", label: "Delivered", icon: <FaCheckDouble />, color: "#14b8a6" },
    { value: "cancelled", label: "Cancelled", icon: <FaTimesCircle />, color: "#ef4444" },
  ];

  const getStatusColor = (status) => {
    const statusMap = {
      pending: "#f59e0b",
      confirmed: "#10b981",
      processing: "#3b82f6",
      shipped: "#8b5cf6",
      "out-for-delivery": "#f59e0b",
      delivered: "#14b8a6",
      cancelled: "#ef4444",
      approved: "#10b981",
      rejected: "#ef4444"
    };
    return statusMap[status] || "#6b7280";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="admin-dashboard">
      {/* Animated Background Elements */}
      <div className="background-elements">
        <div className="bg-circle bg-1"></div>
        <div className="bg-circle bg-2"></div>
        <div className="bg-circle bg-3"></div>
        <div className="bg-blur"></div>
      </div>

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="title-text">Admin Dashboard</span>
            <span className="title-badge">Premium</span>
          </h1>
          <p className="dashboard-subtitle">Manage sellers, orders, and platform operations</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <FaShoppingCart />
            </div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
              <FaUsers />
            </div>
            <div className="stat-info">
              <h3>{stats.pendingSellers}</h3>
              <p>Pending Sellers</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
              <FaMoneyBillWave />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.totalRevenue)}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
              <FaChartLine />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.avgOrderValue)}</h3>
              <p>Avg. Order Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === "sellers" ? "active" : ""}`}
          onClick={() => setActiveTab("sellers")}
        >
          <FaUsers className="tab-icon" />
          <span>Seller Requests</span>
          {stats.pendingSellers > 0 && (
            <span className="tab-badge">{stats.pendingSellers}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          <FaShoppingCart className="tab-icon" />
          <span>All Orders</span>
          {stats.totalOrders > 0 && (
            <span className="tab-badge">{stats.totalOrders}</span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === "sellers" && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <FaUsers className="title-icon" />
                Pending Seller Requests
                <span className="section-badge">{pendingSellers.length}</span>
              </h2>
              <p className="section-subtitle">Review and approve new seller applications</p>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading seller requests...</p>
              </div>
            ) : pendingSellers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaCheckCircle />
                </div>
                <h3>No Pending Requests</h3>
                <p>All seller applications have been processed</p>
              </div>
            ) : (
              <div className="seller-grid">
                {pendingSellers.map((seller, index) => (
                  <div 
                    key={seller.id} 
                    className="seller-card glass-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="card-header">
                      <div className="seller-avatar">
                        {seller.firstName?.charAt(0)}{seller.lastName?.charAt(0)}
                      </div>
                      <div className="seller-info">
                        <h3>{seller.firstName} {seller.lastName}</h3>
                        <p className="seller-email">
                          <FaEnvelope /> {seller.email}
                        </p>
                      </div>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(seller.status) }}
                      >
                        {seller.status}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="info-grid">
                        <div className="info-item">
                          <FaStore className="info-icon" />
                          <div>
                            <label>Shop Name</label>
                            <p>{seller.shopName}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <FaPhone className="info-icon" />
                          <div>
                            <label>Phone</label>
                            <p>{seller.phone}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <FaTag className="info-icon" />
                          <div>
                            <label>Category</label>
                            <p>{seller.category}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <FaCalendarAlt className="info-icon" />
                          <div>
                            <label>Applied On</label>
                            <p>{formatDate(seller.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button 
                        className="action-btn approve-btn"
                        onClick={() => handleApproveSeller(seller.id, seller)}
                      >
                        <FaCheckCircle />
                        <span>Approve</span>
                      </button>
                      <button 
                        className="action-btn reject-btn"
                        onClick={() => handleRejectSeller(seller.id, seller)}
                      >
                        <FaTimesCircle />
                        <span>Reject</span>
                      </button>
                      <button className="action-btn details-btn">
                        <FaArrowRight />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "orders" && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <FaShoppingCart className="title-icon" />
                All Orders
                <span className="section-badge">{orders.length}</span>
              </h2>
              <p className="section-subtitle">Manage and update order status</p>
            </div>

            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Email</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr 
                      key={order.id}
                      className={`order-row ${selectedOrder === order.id ? 'selected' : ''}`}
                      onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
                    >
                      <td className="order-id">
                        <span className="order-id-text">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="order-email">
                        <FaEnvelope className="email-icon" />
                        {order.email}
                      </td>
                      <td className="order-amount">
                        <span className="amount-text">
                          ₹{parseFloat(order.totalPaid).toLocaleString()}
                        </span>
                      </td>
                      <td className="order-status">
                        <span 
                          className="status-indicator"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        ></span>
                        <span className="status-text">
                          {order.status.replace(/-/g, " ")}
                        </span>
                      </td>
                      <td className="order-date">
                        <FaClock className="date-icon" />
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="order-actions">
                        <div className="status-dropdown">
                          <select 
                            value={order.status}
                            onChange={(e) => handleOrderStatusChange(
                              order.id, 
                              e.target.value, 
                              order.userId, 
                              order.email
                            )}
                            className="status-select"
                            style={{ borderColor: getStatusColor(order.status) }}
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="status-actions">
                            {statusOptions.map(option => (
                              <button
                                key={option.value}
                                className="status-action-btn"
                                style={{ backgroundColor: option.color }}
                                onClick={() => handleOrderStatusChange(
                                  order.id,
                                  option.value,
                                  order.userId,
                                  order.email
                                )}
                                title={`Mark as ${option.label}`}
                              >
                                {option.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <FaShoppingCart />
                  </div>
                  <h3>No Orders Yet</h3>
                  <p>Orders will appear here when customers make purchases</p>
                </div>
              )}
            </div>

            {/* Order Status Legend */}
            <div className="status-legend">
              <h4>Status Legend</h4>
              <div className="legend-items">
                {statusOptions.map(status => (
                  <div key={status.value} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: status.color }}
                    ></span>
                    <span className="legend-label">{status.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={() => window.location.reload()}>
        <FaSync />
      </button>
    </div>
  );
}