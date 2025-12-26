import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/BuyerSellerChatbot.css";

/* ===============================
   RULE BASED GUIDES
================================= */

const guides = {
  buyer: {
    login: {
      steps: [
        "✨ Go to Login page",
        "📧 Enter your registered email",
        "🔑 Enter your password",
        "✅ Click Login button",
        "🎉 Welcome to your dashboard!",
      ],
      page: "/buyer/login",
    },
    signup: {
      steps: [
        "🌟 Click Sign Up button",
        "📝 Fill in your personal details",
        "📧 Verify your email address",
        "🔐 Create a secure password",
        "🎊 Your account is ready!",
      ],
      page: "/buyer/signup",
    },
    payment: {
      steps: [
        "🛒 Add items to your cart",
        "💳 Proceed to checkout",
        "🏠 Enter shipping address",
        "💵 Select payment method",
        "✅ Review and confirm order",
        "🎯 Payment successful!",
      ],
      page: "/cart",
    },
    trackOrder: {
      steps: [
        "📦 Go to 'My Orders'",
        "🔍 Click on your order",
        "📍 View real-time tracking",
        "📱 Get delivery updates",
        "🏁 Package delivered!",
      ],
      page: "/orders",
    },
    wishlist: {
      steps: [
        "❤️ Browse products",
        "⭐ Click heart icon on any product",
        "📋 View your wishlist",
        "🔄 Move to cart when ready",
      ],
      page: "/wishlist",
    },
  },
  seller: {
    login: {
      steps: [
        "🏪 Go to Seller Login",
        "📧 Enter seller credentials",
        "🔑 Enter password",
        "🚀 Access seller dashboard",
      ],
      page: "/seller/login",
    },
    addProduct: {
      steps: [
        "➕ Click 'Add Product'",
        "📝 Fill product details",
        "🖼️ Upload high-quality images",
        "💰 Set pricing & inventory",
        "🌐 Choose category & tags",
        "🚀 Publish product live!",
      ],
      page: "/seller/add-product",
    },
    orderConfirm: {
      steps: [
        "📋 Open pending orders",
        "✅ Click 'Confirm Order'",
        "📦 Prepare shipment",
        "📮 Update shipping details",
        "📧 Customer notified",
      ],
      page: "/seller/orders",
    },
  },
};

/* ===============================
   RULE MATCHING WITH ENHANCED NLP
================================= */

function getGuide(role, query) {
  const q = query.toLowerCase().trim();

  // Enhanced greeting detection
  const greetings = ["hi", "hello", "hey", "hola", "namaste", "good morning", "good evening"];
  if (greetings.some(greet => q.includes(greet))) {
    return {
      steps: [
        "✨ Hi there! I'm **Carty**, your AI shopping assistant 🤖",
        "Ready to make your Cartify experience amazing?",
        "Ask me about shopping, orders, payments, or seller tools!",
      ],
      page: null,
    };
  }

  if (q.includes("bye") || q.includes("goodbye")) {
    return {
      steps: ["👋 Happy shopping! Come back anytime 🛍️"],
      page: null,
    };
  }

  if (q.includes("thank") || q.includes("thanks")) {
    return {
      steps: ["🌟 You're welcome! Always here to help 😊"],
      page: null,
    };
  }

  if (q.includes("who built") || q.includes("developer") || q.includes("team")) {
    return {
      steps: [
        "👨‍💻 **The Cartify Dream Team:**",
        "✨ Rattish Kumar - Visionary Leader",
        "💫 Revathi - Design & UX Expert",
        "🚀 Harini - Backend Specialist",
        "🎯 Sanjay Kumar - Frontend Wizard",
        "Together we build amazing experiences! 💙",
      ],
      page: null,
    };
  }

  if (q.includes("about") || q.includes("what is cartify")) {
    return {
      steps: [
        "🛒 **Cartify - Revolutionizing E-commerce**",
        "⚡ Smart shopping powered by AI",
        "🔐 Military-grade security for payments",
        "🚀 Lightning-fast delivery network",
        "🌟 Personalized recommendations",
        "Join the shopping revolution!",
      ],
      page: null,
    };
  }

  // Buyer intent matching with synonyms
  if (role === "buyer") {
    const loginSynonyms = ["login", "sign in", "log in", "access account", "enter"];
    if (loginSynonyms.some(syn => q.includes(syn))) return guides.buyer.login;
    
    const signupSynonyms = ["signup", "register", "create account", "join", "new account"];
    if (signupSynonyms.some(syn => q.includes(syn))) return guides.buyer.signup;
    
    const paymentSynonyms = ["payment", "pay", "checkout", "buy", "purchase", "order"];
    if (paymentSynonyms.some(syn => q.includes(syn))) return guides.buyer.payment;
    
    const trackSynonyms = ["track", "delivery", "status", "where is", "package"];
    if (trackSynonyms.some(syn => q.includes(syn))) return guides.buyer.trackOrder;
    
    const wishlistSynonyms = ["wishlist", "save", "favorite", "bookmark", "wish"];
    if (wishlistSynonyms.some(syn => q.includes(syn))) return guides.buyer.wishlist;
  }

  // Seller intent matching
  if (role === "seller") {
    if (q.includes("login")) return guides.seller.login;
    if (q.includes("add") || q.includes("new product") || q.includes("list")) return guides.seller.addProduct;
    if (q.includes("confirm") || q.includes("order process") || q.includes("seller order")) return guides.seller.orderConfirm;
  }

  return null;
}

/* ===============================
   CHATBOT COMPONENT
================================= */

const BuyerSellerChatbot = () => {
  const [role, setRole] = useState("buyer");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Quick responses based on role
  const quickResponses = {
    buyer: [
      "How to login? 🔐",
      "Payment process 💳",
      "Track my order 📦",
      "Save to wishlist ❤️",
      "About Cartify ℹ️",
    ],
    seller: [
      "Seller login 🏪",
      "Add new product ➕",
      "Confirm orders ✅",
      "View sales 📊",
      "Seller help ❓",
    ],
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    if (open && showWelcome) {
      setTimeout(() => {
        setMessages([
          {
            id: 1,
            text: "👋 Hi! I'm **Carty**, your AI shopping assistant!",
            sender: "bot",
            timestamp: new Date(),
          },
          {
            id: 2,
            text: "I can help you shop, track orders, or manage your seller account. How can I assist you today?",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        setShowWelcome(false);
      }, 500);
    }
  }, [open, showWelcome]);

  const handleQuery = async () => {
    if (!query.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: query,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    const userQuery = query;
    setQuery("");
    setIsTyping(true);

    // Check guide
    const guide = getGuide(role, userQuery);

    setTimeout(() => {
      if (guide) {
        // Add guide steps as separate messages
        guide.steps.forEach((step, index) => {
          setTimeout(() => {
            const botMessage = {
              id: Date.now() + index,
              text: step,
              sender: "bot",
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
          }, index * 400);
        });

        // Navigate if there's a page
        if (guide.page) {
          setTimeout(() => {
            const navigateMessage = {
              id: Date.now() + 1000,
              text: `🚀 Taking you there now...`,
              sender: "bot",
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, navigateMessage]);
            setTimeout(() => navigate(guide.page), 1500);
          }, guide.steps.length * 400 + 500);
        }
      } else {
        // AI fallback response
        const fallbackResponses = [
          "🤔 Hmm, let me think about that...",
          "🌟 Here's what I suggest:",
          `As a ${role}, you might want to know about:`,
          role === "buyer" 
            ? "• Login/Signup • Payments • Order Tracking • Wishlist"
            : "• Seller Dashboard • Add Products • Order Management • Reports",
          "Try asking more specifically! 😊",
        ];

        fallbackResponses.forEach((response, index) => {
          setTimeout(() => {
            const botMessage = {
              id: Date.now() + index,
              text: response,
              sender: "bot",
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
          }, index * 500);
        });
      }
      setIsTyping(false);
    }, 800);
  };

  const handleQuickResponse = (response) => {
    setQuery(response);
    setTimeout(() => handleQuery(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div className="chatbot-container">
      {/* Floating Toggle Button */}
      {!open && (
        <button 
          className="chatbot-toggle-btn"
          onClick={() => setOpen(true)}
        >
          <span className="pulse-dot"></span>
          <span className="icon">💬</span>
          <span className="tooltip">Chat with Carty</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="header-left">
              <div className="avatar">
                <span className="avatar-icon">🤖</span>
                <div className="status-dot online"></div>
              </div>
              <div className="header-info">
                <h3>Carty AI Assistant</h3>
                <p className="status">Online • Ready to help</p>
              </div>
            </div>
            <div className="header-right">
              <button 
                className="minimize-btn"
                onClick={() => setOpen(false)}
                title="Minimize"
              >
                <span>−</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="chatbot-tabs">
            <button 
              className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 Chat
            </button>
            <button 
              className={`tab-btn ${activeTab === "help" ? "active" : ""}`}
              onClick={() => setActiveTab("help")}
            >
              ❓ Help
            </button>
            <button 
              className={`tab-btn ${activeTab === "about" ? "active" : ""}`}
              onClick={() => setActiveTab("about")}
            >
              ℹ️ About
            </button>
          </div>

          {/* Chat Body */}
          <div className="chatbot-body">
            {activeTab === "chat" && (
              <>
                {/* Messages Container */}
                <div className="messages-container">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`message ${msg.sender}`}
                    >
                      <div className="message-content">
                        <div className="message-text">{msg.text}</div>
                        <div className="message-time">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="message bot typing">
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Responses */}
                <div className="quick-responses">
                  <p className="quick-title">Quick questions:</p>
                  <div className="quick-buttons">
                    {quickResponses[role].map((response, index) => (
                      <button
                        key={index}
                        className="quick-btn"
                        onClick={() => handleQuickResponse(response)}
                      >
                        {response}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Selector */}
                <div className="role-selector">
                  <div className="role-label">I am a:</div>
                  <div className="role-buttons">
                    <button
                      className={`role-btn ${role === "buyer" ? "active" : ""}`}
                      onClick={() => setRole("buyer")}
                    >
                      👤 Buyer
                    </button>
                    <button
                      className={`role-btn ${role === "seller" ? "active" : ""}`}
                      onClick={() => setRole("seller")}
                    >
                      🏪 Seller
                    </button>
                  </div>
                </div>

                {/* Input Area */}
                <div className="input-area">
                  <div className="input-wrapper">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask Carty anything as a ${role}...`}
                      className="chat-input"
                    />
                    <button 
                      onClick={handleQuery}
                      disabled={!query.trim() || isTyping}
                      className="send-btn"
                    >
                      {isTyping ? (
                        <span className="sending">⏳</span>
                      ) : (
                        <span className="send-icon">🚀</span>
                      )}
                    </button>
                  </div>
                  <div className="input-hints">
                    <span className="hint">💡 Press Enter to send</span>
                    <span className="hint">✨ Try: "how to pay" or "track order"</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === "help" && (
              <div className="help-tab">
                <div className="help-section">
                  <h4>🛒 Buyer Help</h4>
                  <ul>
                    <li>• Login & Account Setup</li>
                    <li>• Secure Payments</li>
                    <li>• Order Tracking</li>
                    <li>• Wishlist Management</li>
                    <li>• Returns & Refunds</li>
                  </ul>
                </div>
                <div className="help-section">
                  <h4>🏪 Seller Help</h4>
                  <ul>
                    <li>• Seller Dashboard</li>
                    <li>• Product Management</li>
                    <li>• Order Processing</li>
                    <li>• Sales Reports</li>
                    <li>• Payment Settlements</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="about-tab">
                <div className="about-card">
                  <div className="about-icon">🌟</div>
                  <h4>Cartify Assistant</h4>
                  <p>Your intelligent shopping companion powered by AI</p>
                </div>
                <div className="team-section">
                  <h5>👨‍💻 Built by The Dream Team</h5>
                  <div className="team-members">
                    <div className="member">Rattish Kumar</div>
                    <div className="member">Revathi</div>
                    <div className="member">Harini</div>
                    <div className="member">Sanjay Kumar</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerSellerChatbot;