import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaUpload,
  FaRupeeSign,
  FaBoxOpen,
  FaWarehouse,
  FaTag,
  FaCalendar,
  FaPalette,
  FaRuler,
  FaShieldAlt,
  FaImage,
  FaLink,
  FaUserTie,
  FaCreditCard,
  FaBuilding,
  FaIdCard,
  FaCheckCircle,
  FaSpinner,
  FaChartLine,
  FaShoppingBag,
  FaMoneyBillWave,
  FaStore,
  FaBell,
  FaSync,
} from "react-icons/fa";
import "../../assets/css/SellerDashboard.css";

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [sellerData, setSellerData] = useState(null);
  const [products, setProducts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    outOfStock: 0,
  });

  // Product form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");
  const [warranty, setWarranty] = useState("");
  const [expiry, setExpiry] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Bank account form state
  const [accName, setAccName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [pan, setPan] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [isEditing, setIsEditing] = useState(false);
  const [editProductId, setEditProductId] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // 1) Track auth state + fetch seller category & bank accounts
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const sellerRef = doc(db, "sellers", u.uid);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          const data = sellerSnap.data();
          setSellerData(data);
        }

        // Fetch seller bank accounts
        const q = query(collection(db, `sellers/${u.uid}/bankaccounts`));
        onSnapshot(q, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBankAccounts(list);
        });
      }
    });
    return () => unsub();
  }, []);

  // 2) Listen to this seller's products in real-time
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const productsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(productsList);
        
        // Calculate stats
        const totalProducts = productsList.length;
        const totalStock = productsList.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalValue = productsList.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
        const outOfStock = productsList.filter(p => (p.stock || 0) <= 0).length;
        
        setStats({
          totalProducts,
          totalStock,
          totalValue,
          outOfStock
        });
      },
      (e) => setErr(e.message)
    );
    return () => unsub();
  }, [user]);

  // Load product for editing
  const loadProductForEdit = (product) => {
    setName(product.name || "");
    setDescription(product.description || "");
    setPrice(product.price || "");
    setStock(product.stock || "");
    setColors(product.colors?.join(", ") || "");
    setSizes(product.sizes?.join(", ") || "");
    setWarranty(product.warranty || "");
    setExpiry(product.expiryDate || "");
    setImageUrl(product.imageUrl || "");
    setImagePreview(product.imageUrl || "");
    setIsEditing(true);
    setEditProductId(product.id);
  };

  // Reset product form
  const resetProductForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setColors("");
    setSizes("");
    setWarranty("");
    setExpiry("");
    setImageFile(null);
    setImageUrl("");
    setImagePreview("");
    setIsEditing(false);
    setEditProductId(null);
  };

  // Image preview handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper: upload product image
  const uploadImage = async (file, uid) => {
    const fileRef = ref(storage, `products/${uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, path: fileRef.fullPath };
  };

  // Add/Update product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");
    
    if (!user) return setErr("Please login first.");
    if (!name.trim() || !price) return setErr("Please fill product name and price.");

    try {
      setLoading(true);
      let url = imagePreview;
      let path = "";

      if (imageFile) {
        const res = await uploadImage(imageFile, user.uid);
        url = res.url;
        path = res.path;
      } else if (imageUrl.trim() && !imagePreview.startsWith("data:")) {
        url = imageUrl.trim();
      }

      const productData = {
        sellerId: user.uid,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
        category: sellerData?.category || "General",
        imageUrl: url,
        imagePath: path,
        updatedAt: serverTimestamp(),
      };

      if (sellerData?.category === "Clothing") {
        productData.colors = colors.split(",").map((c) => c.trim()).filter(Boolean);
        productData.sizes = sizes.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (sellerData?.category === "Electronics") productData.warranty = warranty.trim();
      if (sellerData?.category === "Food") productData.expiryDate = expiry;

      if (isEditing && editProductId) {
        // Update existing product
        await updateDoc(doc(db, "products", editProductId), productData);
        setSuccess("Product updated successfully!");
      } else {
        // Add new product
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, "products"), productData);
        setSuccess("Product added successfully!");
      }

      resetProductForm();
      
      // Auto-hide success message
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDelete = async (id, imagePath) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await deleteDoc(doc(db, "products", id));
      if (imagePath) await deleteObject(ref(storage, imagePath));
      setSuccess("Product deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to delete product.");
    }
  };

  // Save bank account
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    setErr("");
    if (!user) return setErr("Please login first.");
    if (!accName.trim() || !accNumber.trim() || !ifsc.trim() || !bankName.trim())
      return setErr("Please fill all bank details.");

    try {
      setLoading(true);
      const bankData = {
        sellerId: user.uid,
        accountHolder: accName.trim(),
        accountNumber: accNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        bankName: bankName.trim(),
        createdAt: serverTimestamp(),
      };
      if (pan.trim()) bankData.pan = pan.trim().toUpperCase();

      await addDoc(collection(db, `sellers/${user.uid}/bankaccounts`), bankData);

      // Reset form
      setAccName(""); setAccNumber(""); setIfsc(""); setBankName(""); setPan("");
      setSuccess("Bank account added successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to save bank account.");
    } finally {
      setLoading(false);
    }
  };

  // Delete bank account
  const handleDeleteBankAccount = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bank account?")) return;
    
    try {
      await deleteDoc(doc(db, `sellers/${user.uid}/bankaccounts`, id));
      setSuccess("Bank account deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to delete bank account.");
    }
  };

  if (!user) {
    return (
      <div className="seller-dashboard">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Please log in as a seller.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      {/* Notification Toast */}
      {success && (
        <div className="notification-toast success">
          <div className="toast-content">
            <FaCheckCircle />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")}>
            &times;
          </button>
        </div>
      )}

      {err && (
        <div className="notification-toast error">
          <div className="toast-content">
            <FaBell />
            <span>{err}</span>
          </div>
          <button onClick={() => setErr("")}>
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="seller-info">
            <div className="seller-avatar">
              {sellerData?.shopName?.charAt(0) || "S"}
            </div>
            <div className="seller-details">
              <h1>Seller Dashboard</h1>
              <p className="shop-name">{sellerData?.shopName || "My Shop"}</p>
              <p className="seller-category">
                <FaTag /> {sellerData?.category || "General Seller"}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={() => window.location.reload()}>
              <FaSync />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: "0.1s" }}>
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.2s" }}>
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)" }}>
            <FaWarehouse />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStock}</h3>
            <p>Total Stock</p>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.3s" }}>
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #4facfe, #00f2fe)" }}>
            <FaRupeeSign />
          </div>
          <div className="stat-info">
            <h3>₹{stats.totalValue.toLocaleString()}</h3>
            <p>Inventory Value</p>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.4s" }}>
          <div className="stat-icon" style={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)" }}>
            <FaBoxOpen />
          </div>
          <div className="stat-info">
            <h3>{stats.outOfStock}</h3>
            <p>Out of Stock</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <FaShoppingBag className="tab-icon" />
          <span>Products</span>
          {products.length > 0 && (
            <span className="tab-badge">{products.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === "bank" ? "active" : ""}`}
          onClick={() => setActiveTab("bank")}
        >
          <FaCreditCard className="tab-icon" />
          <span>Bank Accounts</span>
          {bankAccounts.length > 0 && (
            <span className="tab-badge">{bankAccounts.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === "add" ? "active" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          <FaPlus className="tab-icon" />
          <span>{isEditing ? "Edit Product" : "Add Product"}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === "products" && (
          <section className="products-section">
            <div className="section-header">
              <h2>
                <FaShoppingBag />
                My Products
              </h2>
              <p className="section-subtitle">Manage your product inventory</p>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaBoxOpen />
                </div>
                <h3>No Products Yet</h3>
                <p>Start by adding your first product!</p>
                <button className="empty-action-btn" onClick={() => setActiveTab("add")}>
                  <FaPlus /> Add Product
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="product-card glass-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="product-image">
                      <img src={product.imageUrl || "https://via.placeholder.com/300x300?text=No+Image"} 
                           alt={product.name}
                           onError={(e) => e.target.src = "https://via.placeholder.com/300x300?text=No+Image"} />
                      {product.stock <= 0 && (
                        <div className="out-of-stock-badge">Out of Stock</div>
                      )}
                      <div className="product-overlay">
                        <button className="overlay-btn edit" onClick={() => {
                          loadProductForEdit(product);
                          setActiveTab("add");
                        }}>
                          <FaEdit />
                        </button>
                        <button className="overlay-btn delete" onClick={() => handleDelete(product.id, product.imagePath)}>
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-title">{product.name}</h3>
                      {product.description && (
                        <p className="product-description">{product.description}</p>
                      )}
                      <div className="product-price">
                        <FaRupeeSign />
                        <span>{product.price.toLocaleString()}</span>
                      </div>
                      <div className="product-meta">
                        <span className="stock-badge">
                          <FaWarehouse /> {product.stock || 0} in stock
                        </span>
                        {product.category && (
                          <span className="category-badge">
                            <FaTag /> {product.category}
                          </span>
                        )}
                      </div>
                      {product.colors?.length > 0 && (
                        <div className="product-attributes">
                          <FaPalette /> Colors: {product.colors.join(", ")}
                        </div>
                      )}
                      {product.sizes?.length > 0 && (
                        <div className="product-attributes">
                          <FaRuler /> Sizes: {product.sizes.join(", ")}
                        </div>
                      )}
                      {product.warranty && (
                        <div className="product-attributes">
                          <FaShieldAlt /> {product.warranty}
                        </div>
                      )}
                      {product.expiryDate && (
                        <div className="product-attributes">
                          <FaCalendar /> Expires: {product.expiryDate}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "bank" && (
          <section className="bank-section">
            <div className="section-header">
              <h2>
                <FaCreditCard />
                Bank Accounts
              </h2>
              <p className="section-subtitle">Manage your payout accounts</p>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaCreditCard />
                </div>
                <h3>No Bank Accounts</h3>
                <p>Add a bank account to receive payments</p>
              </div>
            ) : (
              <div className="bank-accounts-grid">
                {bankAccounts.map((account, index) => (
                  <div 
                    key={account.id} 
                    className="bank-card glass-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="bank-card-header">
                      <div className="bank-icon">
                        <FaBuilding />
                      </div>
                      <div className="bank-info">
                        <h3>{account.bankName}</h3>
                        <p className="account-number">
                          **** **** **** {account.accountNumber.slice(-4)}
                        </p>
                      </div>
                      <button 
                        className="delete-account-btn"
                        onClick={() => handleDeleteBankAccount(account.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <div className="bank-card-body">
                      <div className="bank-detail">
                        <FaUserTie />
                        <span>{account.accountHolder}</span>
                      </div>
                      <div className="bank-detail">
                        <FaIdCard />
                        <span>IFSC: {account.ifsc}</span>
                      </div>
                      {account.pan && (
                        <div className="bank-detail">
                          <FaIdCard />
                          <span>PAN: {account.pan}</span>
                        </div>
                      )}
                      <div className="bank-detail">
                        <FaCalendar />
                        <span>Added: {new Date(account.createdAt?.toDate()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Bank Account Form */}
            <div className="add-bank-form glass-card">
              <h3>
                <FaPlus />
                Add New Bank Account
              </h3>
              <form onSubmit={handleSaveBankDetails}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <FaUserTie /> Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaCreditCard /> Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234567890"
                      value={accNumber}
                      onChange={(e) => setAccNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaBuilding /> Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="State Bank of India"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaIdCard /> IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="SBIN0001234"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaIdCard /> PAN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" disabled={loading} className="save-btn">
                    {loading ? <FaSpinner className="spin" /> : <FaCheckCircle />}
                    {loading ? "Saving..." : "Save Bank Account"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {activeTab === "add" && (
          <section className="add-product-section">
            <div className="section-header">
              <h2>
                {isEditing ? <FaEdit /> : <FaPlus />}
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="section-subtitle">
                {sellerData?.category ? `Category: ${sellerData.category}` : "Add product details"}
              </p>
              {isEditing && (
                <button className="cancel-edit-btn" onClick={resetProductForm}>
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="product-form-container glass-card">
              <form onSubmit={handleSaveProduct}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>
                      <FaTag /> Product Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter product name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>
                      <FaBoxOpen /> Description (Optional)
                    </label>
                    <textarea
                      placeholder="Enter product description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaRupeeSign /> Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaWarehouse /> Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>

                  {/* Category-specific fields */}
                  {sellerData?.category === "Clothing" && (
                    <>
                      <div className="form-group">
                        <label>
                          <FaPalette /> Colors (comma separated)
                        </label>
                        <input
                          type="text"
                          placeholder="Red, Blue, Black"
                          value={colors}
                          onChange={(e) => setColors(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          <FaRuler /> Sizes (comma separated)
                        </label>
                        <input
                          type="text"
                          placeholder="S, M, L, XL"
                          value={sizes}
                          onChange={(e) => setSizes(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {sellerData?.category === "Electronics" && (
                    <div className="form-group full-width">
                      <label>
                        <FaShieldAlt /> Warranty Period
                      </label>
                      <input
                        type="text"
                        placeholder="1 year manufacturer warranty"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                      />
                    </div>
                  )}

                  {sellerData?.category === "Food" && (
                    <div className="form-group full-width">
                      <label>
                        <FaCalendar /> Expiry Date
                      </label>
                      <input
                        type="date"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Image Upload Section */}
                  <div className="form-group full-width">
                    <label>
                      <FaImage /> Product Image
                    </label>
                    <div className="image-upload-container">
                      {imagePreview ? (
                        <div className="image-preview">
                          <img src={imagePreview} alt="Preview" />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => {
                              setImagePreview("");
                              setImageFile(null);
                              setImageUrl("");
                            }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload className="upload-icon" />
                          <p>Upload product image</p>
                        </div>
                      )}
                      <div className="upload-options">
                        <div className="upload-option">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            id="image-upload"
                            className="file-input"
                          />
                          <label htmlFor="image-upload" className="upload-btn">
                            <FaUpload /> Upload File
                          </label>
                        </div>
                        <div className="upload-option">
                          <label>
                            <FaLink /> Or paste URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            value={imageUrl}
                            onChange={(e) => {
                              setImageUrl(e.target.value);
                              setImagePreview(e.target.value);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading} className="save-btn">
                    {loading ? <FaSpinner className="spin" /> : <FaCheckCircle />}
                    {loading ? "Saving..." : (isEditing ? "Update Product" : "Add Product")}
                  </button>
                  {!isEditing && (
                    <button type="button" className="reset-btn" onClick={resetProductForm}>
                      Reset Form
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={() => {
          resetProductForm();
          setActiveTab("add");
        }}
      >
        <FaPlus />
      </button>
    </div>
  );
}