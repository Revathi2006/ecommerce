import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import emailjs from "../emailjs"; // optional file

const db = getFirestore();

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const snap = await getDocs(collection(db, "orders"));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchOrders();
  }, []);

  const markAsDelivered = async (order) => {
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "delivered" });

      await emailjs.send(
        "service_uo7n33o",
        "template_0l5vs1j",
        {
          to_email: order.email,
          order_id: order.id,
          message: "Your order has been delivered successfully 🎉"
        }
      );

      alert("Order delivered & email sent ✅");

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "delivered" } : o));

    } catch (err) {
      console.error(err);
      alert("Something went wrong ❌");
    }
  };

  return (
    <div>
      <h2>Admin Orders</h2>
      {orders.map(order => (
        <div key={order.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          <p><b>Order ID:</b> {order.id}</p>
          <p><b>Email:</b> {order.email}</p>
          <p><b>Status:</b> {order.status}</p>
          {order.status !== "delivered" && (
            <button onClick={() => markAsDelivered(order)}>Mark as Delivered</button>
          )}
        </div>
      ))}
    </div>
  );
}
