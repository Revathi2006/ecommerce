// src/pages/Admin/AdminApprove.jsx
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";

// fetch PlaceId from Google
const fetchPlaceId = async (shopName, address) => {
  const queryText = encodeURIComponent(`${shopName} ${address}`);
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${queryText}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].place_id;
    }
    return null;
  } catch (err) {
    console.error("Error fetching PlaceId:", err);
    return null;
  }
};

// fetch shop details using PlaceId
const fetchPlaceDetails = async (placeId) => {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  const fields =
    "name,formatted_address,rating,user_ratings_total,reviews";

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.result || null;
  } catch (err) {
    console.error("Error fetching Place Details:", err);
    return null;
  }
};

export default function AdminApprove() {
  const [pendingSellers, setPendingSellers] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "sellers"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sellerList = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          let googleData = null;

          if (data.shopName && data.address) {
            const placeId = await fetchPlaceId(data.shopName, data.address);
            if (placeId) {
              googleData = await fetchPlaceDetails(placeId);
            }
          }

          return { id: d.id, ...data, googleData };
        })
      );
      setPendingSellers(sellerList);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (id) => {
    await updateDoc(doc(db, "sellers", id), { status: "approved" });
  };

  const handleReject = async (id) => {
    await updateDoc(doc(db, "sellers", id), { status: "rejected" });
  };

  return (
    <div className="min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Pending Seller Requests</h2>
      {pendingSellers.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        pendingSellers.map((seller) => (
          <div
            key={seller.id}
            className="border p-3 mb-2 rounded-lg shadow bg-white"
          >
            <div className="mb-3 space-y-1">
              <p><b>UID:</b> {seller.id}</p>
              <p><b>Full Name:</b> {seller.fullName}</p>
              <p><b>Email:</b> {seller.email}</p>
              <p><b>Phone:</b> {seller.phone}</p>
              <p><b>Shop Name:</b> {seller.shopName}</p>
              <p><b>Shop Location:</b> {seller.shopLocation}</p>
              <p><b>Address:</b> {seller.address}</p>
              <p><b>Category:</b> {seller.category}</p>
              <p><b>Description:</b> {seller.description || "—"}</p>
              <p><b>Status:</b> {seller.status}</p>
              <p><b>Role:</b> {seller.role}</p>
              <p>
                <b>Created At:</b>{" "}
                {seller.createdAt?.toDate
                  ? seller.createdAt.toDate().toLocaleString()
                  : "N/A"}
              </p>
            </div>

            {/* Google Places Data */}
            {seller.googleData ? (
              <div className="bg-gray-50 p-3 rounded-md mt-3">
                <p>
                  ⭐ <b>{seller.googleData.rating}</b> (
                  {seller.googleData.user_ratings_total} reviews)
                </p>
                <p>📍 {seller.googleData.formatted_address}</p>
                <h4 className="font-semibold mt-2">Recent Reviews:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {seller.googleData.reviews?.slice(0, 2).map((r, i) => (
                    <li key={i}>
                      <b>{r.author_name}:</b> {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-red-500 mt-2">
                ⚠ No Google data found for this shop
              </p>
            )}

            <div className="mt-4">
              <button
                onClick={() => handleApprove(seller.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mr-2"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(seller.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
