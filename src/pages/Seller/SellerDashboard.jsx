// SellerDashboard.js
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
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [sellerCategory, setSellerCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Product form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");
  const [warranty, setWarranty] = useState("");
  const [expiry, setExpiry] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  // Bank account form state
  const [accName, setAccName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [pan, setPan] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 1) Track auth state + fetch seller category & bank accounts
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const sellerRef = doc(db, "sellers", u.uid);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          setSellerCategory(sellerSnap.data().category);
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
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => setErr(e.message)
    );
    return () => unsub();
  }, [user]);

  // Helper: upload product image
  const uploadImage = async (file, uid) => {
    const fileRef = ref(storage, `products/${uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, path: fileRef.fullPath };
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setErr("");
    if (!user) return setErr("Please login first.");
    if (!name.trim() || !price) return setErr("Please fill product name and price.");

    try {
      setLoading(true);
      let url = "";
      let path = "";

      if (imageFile) {
        const res = await uploadImage(imageFile, user.uid);
        url = res.url;
        path = res.path;
      } else if (imageUrl.trim()) {
        url = imageUrl.trim();
      }

      const productData = {
        sellerId: user.uid,
        name: name.trim(),
        price: Number(price),
        stock: Number(stock) || 0,
        category: sellerCategory,
        imageUrl: url,
        imagePath: path,
        createdAt: serverTimestamp(),
      };

      if (sellerCategory === "Clothing") {
        productData.colors = colors.split(",").map((c) => c.trim()).filter(Boolean);
        productData.sizes = sizes.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (sellerCategory === "Electronics") productData.warranty = warranty.trim();
      if (sellerCategory === "Food") productData.expiryDate = expiry;

      await addDoc(collection(db, "products"), productData);

      // Reset form
      setName(""); setPrice(""); setStock(""); setColors("");
      setSizes(""); setWarranty(""); setExpiry(""); setImageFile(null); setImageUrl("");
    } catch (e) {
      setErr(e.message || "Failed to add product.");
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDelete = async (id, imagePath) => {
    try {
      await deleteDoc(doc(db, "products", id));
      if (imagePath) await deleteObject(ref(storage, imagePath));
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

      setAccName(""); setAccNumber(""); setIfsc(""); setBankName(""); setPan("");
      alert("Bank account added successfully!");
    } catch (e) {
      setErr(e.message || "Failed to save bank account.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Seller Dashboard</h2>
        <p>Please log in as a seller.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Seller Dashboard</h2>

      {err && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {err}
        </div>
      )}

      {/* Bank Accounts */}
      <h3 className="text-xl font-semibold mb-3">Bank Accounts</h3>
      {bankAccounts.length > 0 && (
        <div className="mb-4">
          {bankAccounts.map((acc) => (
            <div key={acc.id} className="border p-3 rounded mb-2 shadow-sm">
              <p>
                {acc.accountHolder} — ****{acc.accountNumber.slice(-4)}
              </p>
              <p className="text-sm text-gray-500">
                {acc.bankName} | IFSC: {acc.ifsc}
              </p>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSaveBankDetails}
        className="space-y-3 mb-8 border p-4 rounded-lg shadow"
      >
        <p className="text-gray-600 text-sm">
          {bankAccounts.length > 0 ? "Add another account" : "Add your bank account"}
        </p>
        <input
          type="text"
          placeholder="Account Holder Name"
          value={accName}
          onChange={(e) => setAccName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          placeholder="Account Number"
          value={accNumber}
          onChange={(e) => setAccNumber(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          placeholder="IFSC Code"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          placeholder="Bank Name"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          placeholder="PAN (optional)"
          value={pan}
          onChange={(e) => setPan(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-green-300" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Saving..." : "Save Bank Account"}
        </button>
      </form>

      {/* Product Form */}
      <form
        onSubmit={handleAddProduct}
        className="space-y-3 mb-8 border p-4 rounded-lg shadow"
      >
        <p className="text-gray-600 text-sm">
          You can only add products in: <span className="font-semibold">{sellerCategory}</span>
        </p>

        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="number"
          min="0"
          placeholder="Stock Quantity"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="border p-2 rounded w-full"
        />

        {sellerCategory === "Clothing" && (
          <>
            <input
              type="text"
              placeholder="Available Colors (comma separated)"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              placeholder="Available Sizes (comma separated)"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </>
        )}

        {sellerCategory === "Electronics" && (
          <input
            type="text"
            placeholder="Warranty Period (e.g. 1 year)"
            value={warranty}
            onChange={(e) => setWarranty(e.target.value)}
            className="border p-2 rounded w-full"
          />
        )}

        {sellerCategory === "Food" && (
          <input
            type="date"
            placeholder="Expiry Date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="border p-2 rounded w-full"
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Or paste Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Uploading..." : "Add Product"}
        </button>
      </form>

      {/* Products */}
      <h3 className="text-xl font-semibold mb-3">Your Products</h3>
      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 shadow">
              {p.imageUrl && (
                <div className="w-32 h-32 mx-auto mb-3 overflow-hidden rounded">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                </div>
              )}
              <h4 className="font-semibold">{p.name}</h4>
              <p>₹{p.price}</p>
              <p>Stock: {p.stock}</p>
              {p.category && <p className="text-sm">Category: {p.category}</p>}
              {p.colors?.length > 0 && <p className="text-sm">Colors: {p.colors.join(", ")}</p>}
              {p.sizes?.length > 0 && <p className="text-sm">Sizes: {p.sizes.join(", ")}</p>}
              {p.warranty && <p className="text-sm">Warranty: {p.warranty}</p>}
              {p.expiryDate && <p className="text-sm">Expiry: {p.expiryDate}</p>}
              <button
                onClick={() => handleDelete(p.id, p.imagePath)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded mt-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
