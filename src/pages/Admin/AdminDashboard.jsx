//AdminDashboard
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";

export default function AdminApprove() {
  const [pendingSellers, setPendingSellers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "sellers"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingSellers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe(); // cleanup on unmount
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
        pendingSellers.map(seller => (
          <div key={seller.id} className="border p-3 mb-2 rounded-lg flex justify-between items-center">
            <div>
              <p><b>Name:</b> {seller.firstName} {seller.lastName}</p>
              <p><b>Shop:</b> {seller.shopName}</p>
              <p><b>Email:</b> {seller.email}</p>
              <p><b>Address:</b> {seller.address}</p>
              <p><b>Phone:</b> {seller.phone}</p>
              <p><b>Email:</b> {seller.email}</p>
              <p><b>Shop Name:</b> {seller.shopName}</p>
              <p><b>Shop Location:</b> {seller.shopLocation}</p>
              <p><b>Category:</b> {seller.category}</p>
              <p><b>Description:</b> {seller.description || "—"}</p>
              <p><b>Status:</b> {seller.status}</p>
              <p><b>Role:</b> {seller.role}</p>
            </div>
            <div>
              <button onClick={() => handleApprove(seller.id)} className="bg-green-500 text-white px-3 py-1 rounded mr-2">Approve</button>
              <button onClick={() => handleReject(seller.id)} className="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}