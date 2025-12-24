import React from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to MV E-Commerce</h1>
      <div className="flex gap-4">
        <Link
          to="/buyer/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Buyer
        </Link>
        <Link
          to="/seller/login"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Seller
        </Link>
        <Link
  to="/seller/signup" // <-- point to signup page
  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
>
  Seller
</Link>

        <Link
          to="/admin/login"
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Admin
        </Link>
      </div>
    </div>
  );
};

export default Landing;
