const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "cartifyteam2026@gmail.com",      // your Gmail
    pass: "kajtfworkjkzvyqn",         // 16-char App Password
  }
});

exports.sendOrderDeliveredEmail = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orderId = event.params.orderId;

    if (before.status === "delivered" || after.status !== "delivered") {
      console.log("Order already delivered or not updated to delivered.");
      return;
    }

    const userEmail = after.email;
    if (!userEmail) return;

    // Email content
    const mailOptions = {
  from: '"Cartify Team" <cartifyteam2025@gmail.com>',
  to: userEmail,
  subject: "🎉 Your Cartify Order Has Been Delivered!",
  text: `
Hello 👋,

Great news! 🚚✨

Your order with ID: ${orderId} has been successfully delivered to your address.

We hope you enjoy your purchase and had a smooth shopping experience with Cartify 🛒💙

If you have any questions, feedback, or need support, feel free to reply to this email — we're always happy to help!

Thank you for choosing Cartify.
We look forward to serving you again 😊

Warm regards,
Cartify Team
`
};


    try {
      // Send email
      await transporter.sendMail(mailOptions);

      // Log success
      await admin.firestore().collection("emailLogs").add({
        orderId,
        email: userEmail,
        status: "sent",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("Email sent successfully to", userEmail);

    } catch (err) {
      console.error("Failed to send email:", err.message);
      await admin.firestore().collection("emailLogs").add({
        orderId,
        email: userEmail,
        status: "failed",
        error: err.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);
