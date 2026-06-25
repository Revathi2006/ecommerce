// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 🔹 Buyer pages (directly inside /pages)
import Home from "./pages/home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Wishlist from "./pages/wishlist";
import Reviews from "./pages/Reviews";
import ProductDetail from "./pages/ProductDetail";
import Orders from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";

// 🔹 Buyer Auth pages (inside /pages/Buyer/)
import BuyerSignup from "./pages/Buyer/BuyerSignup";
import BuyerLogin from "./pages/Buyer/BuyerLogin";

// 🔹 Seller pages (inside /pages/Seller/)
import SellerDashboard from "./pages/Seller/SellerDashboard";
import AddProduct from "./pages/Seller/AddProduct";
import SellerLogin from "./pages/Seller/SellerLogin";
import SellerSignup from "./pages/Seller/SellerSignup";

// 🔹 Admin pages (inside /pages/Admin/)
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminApprove from "./pages/Admin/AdminApprove";
import AdminLogin from "./pages/Admin/AdminLogin";

// 🔹 Chatbot component
import BuyerSellerChatbot from "./components/BuyerSellerChatbot";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/TermsAndConditions";
import Contact from "./pages/Contact";

function App() {
  return (
    <Router>
    

      <Routes>
        {/* -------------------- Buyer Routes -------------------- */}
        <Route path="/" element={<Home />} />
        <Route path="/buyer/shop" element={<Shop />} />
        <Route path="/buyer/cart" element={<Cart />} />
        <Route path="/buyer/wishlist" element={<Wishlist />} />
        <Route path="/buyer/signup" element={<BuyerSignup />} />
        <Route path="/buyer/login" element={<BuyerLogin />} />
        <Route path="/buyer/checkout" element={<Checkout />} />
        <Route path="/buyer/product/:productId" element={<ProductDetail />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/orders" element={<Orders />} />
<Route path="/order-tracking/:orderId" element={<OrderTracking />} />

        <Route
          path="/buyer/reviews/:productId/:productName"
          element={<Reviews />}
        />
        {/* 🔹 NEW: Chatbot Route */}
        <Route path="/chatbot" element={<BuyerSellerChatbot />} />

        {/* Optional shortcut routes */}
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/signup" element={<BuyerSignup />} />
        <Route path="/login" element={<BuyerLogin />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/products" element={<Shop />} />

        {/* -------------------- Seller Routes -------------------- */}
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/seller/add-product" element={<AddProduct />} />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/signup" element={<SellerSignup />} />

        {/* -------------------- Admin Routes -------------------- */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/approve" element={<AdminApprove />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      
<Route path="/contact" element={<Contact />} />

<Route path="/privacy-policy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<Terms />} />



      </Routes>
    </Router>
  );
}

export default App;