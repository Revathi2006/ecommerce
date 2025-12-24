import React from "react";
import { Link } from "react-router-dom";

export default function Nav() {
  return (
    <>
      <style>
        {`
          .navbar {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #ddd;
            font-family: Arial, sans-serif;
          }

          .nav-link {
            margin-right: 16px;
            text-decoration: none;
            color: #333;
            font-weight: 500;
            transition: color 0.3s ease, border-bottom 0.3s ease;
          }

          .nav-link:hover {
            color: #007bff;
            border-bottom: 2px solid #007bff;
            padding-bottom: 2px;
          }

          .nav-link:active {
            color: #0056b3;
          }
        `}
      </style>

      <nav className="navbar">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/seller-signup" className="nav-link">Seller Signup</Link>
        <Link to="/seller-dashboard" className="nav-link">Seller Dashboard</Link>
        <Link to="/add-product" className="nav-link">Add Product</Link>
        <Link to="/admin-signup" className="nav-link">Admin Signup</Link>
        <Link to="/admin-approve" className="nav-link">Admin Approve</Link>
      </nav>
    </>
  );
}
