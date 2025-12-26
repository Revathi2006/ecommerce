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
  serverTimestamp
} from "firebase/firestore";
import emailjs from "@emailjs/browser";

export default function AdminDashboard() {
  const [pendingSellers, setPendingSellers] = useState([]);
  const [orders, setOrders] = useState([]);

  // Fetch pending sellers
  useEffect(() => {
    const q = query(collection(db, "sellers"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingSellers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Fetch all orders
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleApproveSeller = async (id) => {
    await updateDoc(doc(db, "sellers", id), { status: "approved" });
  };

  const handleRejectSeller = async (id) => {
    await updateDoc(doc(db, "sellers", id), { status: "rejected" });
  };

  // ✅ Send email to customer on delivered status
  const handleOrderStatusChange = async (id, status, userId, userEmail) => {
    await updateDoc(doc(db, "orders", id), { status });

    if (status === "delivered" && userId) {
      // Add notification for the user
      await addDoc(collection(db, "notifications", userId, "userNotifications"), {
        message: `Your order #${id.slice(-8).toUpperCase()} has been delivered!`,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Send delivery email via EmailJS
      if (userEmail) {
        try {
          console.log("Sending delivery email to:", userEmail);
          const result = await emailjs.send(
            "service_uo7n33o",       // Service ID
            "template_0l5vs1j",      // Template ID
            {
              to_email: userEmail,   // dynamic recipient
              order_id: `#${id.slice(-8).toUpperCase()}`,
            },
            "OQ3pooGZlDi33B5z1"      // Public Key
          );
          console.log("EmailJS result:", result);
          alert(`Delivery email sent successfully to ${userEmail}!`);
        } catch (err) {
          console.error("Failed to send delivery email:", err);
          alert("Failed to send delivery email. Check console for details.");
        }
      }
    }
  };

  const statusOptions = [
    "confirmed",
    "processing",
    "shipped",
    "out-for-delivery",
    "delivered",
    "cancelled"
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "shipped": return "bg-indigo-500";
      case "out-for-delivery": return "bg-orange-500";
      case "delivered": return "bg-teal-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Pending Sellers */}
      <div>
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
                <p><b>Phone:</b> {seller.phone}</p>
                <p><b>Shop Location:</b> {seller.shopLocation}</p>
                <p><b>Category:</b> {seller.category}</p>
                <p><b>Description:</b> {seller.description || "—"}</p>
                <p><b>Status:</b> {seller.status}</p>
                <p><b>Role:</b> {seller.role}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleApproveSeller(seller.id)} className="bg-green-500 text-white px-3 py-1 rounded">Approve</button>
                <button onClick={() => handleRejectSeller(seller.id)} className="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Orders</h2>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="border p-3 mb-2 rounded-lg flex justify-between items-center">
              <div>
                <p><b>Order ID:</b> {order.id.slice(-8).toUpperCase()}</p>
                <p><b>User ID:</b> {order.userId}</p>
                <p><b>Email:</b> {order.email}</p>
                <p><b>Total:</b> ₹{order.totalPaid}</p>
                <p><b>Status:</b> {order.status}</p>
                <p><b>Created At:</b> {order.createdAt?.toDate().toLocaleString()}</p>
              </div>
              <div className="flex flex-col gap-2">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    onClick={() => handleOrderStatusChange(order.id, status, order.userId, order.email)}
                    className={`px-3 py-1 rounded text-white ${getStatusColor(status)}`}
                  >
                    {status.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
