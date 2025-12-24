// src/pages/Seller/AddProduct.jsx
import { useState } from "react";
import { db, storage, auth } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

export default function AddProduct() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState("In Stock");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [sellerName, setSellerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const seller = auth.currentUser;
  const sellerId = seller?.uid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!sellerId) {
      setError("Seller not logged in!");
      setLoading(false);
      return;
    }

    try {
      let imageUrl = "";

      if (image) {
        // ✅ Upload image to Firebase Storage
        const imgRef = ref(storage, `products/${sellerId}/${Date.now()}-${image.name}`);
        const uploadTask = await uploadBytesResumable(imgRef, image);
        imageUrl = await getDownloadURL(uploadTask.ref); // ✅ always wait
      }

      // ✅ Save product with imageUrl
      await addDoc(collection(db, "products"), {
        sellerId,
        sellerName: sellerName || seller.displayName || seller.email || "Unknown Seller",
        name,
        price: Number(price),
        availability,
        description,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      alert("✅ Product added successfully!");
      navigate("/seller/dashboard");
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">Add Product</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option>In Stock</option>
            <option>Out of Stock</option>
          </select>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
          <input
            type="text"
            placeholder="Seller Name"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
          >
            {loading ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
