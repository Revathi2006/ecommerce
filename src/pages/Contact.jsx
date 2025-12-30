import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";


export default function Contact() {
  return (
    <div className="contact-section royal-card">
      <h2 className="section-title">
        Contact Us
      </h2>

      <p className="contact-intro">
        We’re here to help! Reach out to the Cartify!! team for any questions,
        support, or feedback.
      </p>

      <div className="contact-details">
        <div className="contact-item">
          <FaEnvelope className="contact-icon" />
          <div>
            <h4>Email</h4>
            <p>
              <a href="mailto:cartifyteam2026@gmail.com">
                cartifyteam2026@gmail.com
              </a>
            </p>
          </div>
        </div>

        <div className="contact-item">
          <FaPhoneAlt className="contact-icon" />
          <div>
            <h4>Support</h4>
            <p>Available via email (24/7)</p>
          </div>
        </div>

        <div className="contact-item">
          <FaMapMarkerAlt className="contact-icon" />
          <div>
            <h4>Platform</h4>
            <p>Online E-Commerce Service (India)</p>
          </div>
        </div>
      </div>

      <div className="contact-footer">
        <p>
          <strong>Cartify!!</strong> — Developed & owned by <br />
          Revathi S, RattishKumar SS, Harini S, SanjayKumar B
        </p>
      </div>
    </div>
  );
}
