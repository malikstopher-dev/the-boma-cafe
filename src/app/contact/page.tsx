'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService, generateId } from '@/lib/data';
import { siteSettingsService } from '@/lib/siteSettings';

export default function ContactPage() {
  const [settings, setSettings] = useState<any>(null);
  const [contactSettings, setContactSettings] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setSettings(dataService.getSettings());
    setContactSettings(siteSettingsService.getContactSettings());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = formData.subject ? `[The Boma Cafe] ${formData.subject}` : '[The Boma Cafe] New Inquiry';
    const body = `Name: ${formData.name}%0D%0AEmail: ${formData.email}%0D%0APhone: ${formData.phone}%0D%0A%0D%0AMessage:%0D%0A${formData.message}`;
    window.location.href = `mailto:info@thebomacafe.co.za?subject=${subject}&body=${body}`;
    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  const contact = contactSettings || {};

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        {/* Hero - Premium Design */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: 'var(--space-3xl) 5%',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(244, 164, 96, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(244, 164, 96, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
             Contact Us
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--white)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Get in Touch
            </h1>
            <p style={{ color: 'var(--cream)', fontSize: 'clamp(1rem, 2vw, 1.15rem)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              We&apos;d love to hear from you. Send us a message or visit us
            </p>
          </div>
        </section>

        {/* Contact Info & Form - Premium Design */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
              {/* Info */}
              <div>
                <h2 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '2rem', fontFamily: 'var(--font-display)' }}>Contact Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {contact.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--white)', 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                      }}>📍</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Address</strong>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{contact.address}</span>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--white)', 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                      }}>📞</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Phone</strong>
                        <a href={`tel:${contact.phone}`} style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{contact.phone}</a>
                        {contact.phone2 && <span style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>, {contact.phone2}</span>}
                      </div>
                    </div>
                  )}
                  {contact.email && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--white)', 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                      }}>✉️</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Email</strong>
                        <a href={`mailto:${contact.email}`} style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{contact.email}</a>
                      </div>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        background: 'linear-gradient(135deg, #25D366, #20BD5A)',
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--white)', 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                      }}>💬</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem', marginBottom: '0.25rem' }}>WhatsApp</strong>
                        <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>Chat with us</a>
                      </div>
                    </div>
                  )}
                  {contact.openingHours && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--white)', 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                      }}>🕐</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Opening Hours</strong>
                        <span style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{contact.openingHours}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map */}
                {contact.mapEmbedUrl && (
                  <div style={{ marginTop: '2.5rem', borderRadius: '20px', overflow: 'hidden', height: '220px', background: 'var(--cream)', boxShadow: 'var(--shadow-md)' }}>
                    <iframe 
                      src={contact.mapEmbedUrl}
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen 
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Form - Premium */}
              <div style={{ background: 'var(--cream)', borderRadius: '24px', padding: '2.75rem', boxShadow: 'var(--shadow-md)' }}>
                <h2 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '1.75rem', fontFamily: 'var(--font-display)' }}>Send us a Message</h2>
                
                {isSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 1.5rem',
                      fontSize: '2.5rem'
                    }}>✓</div>
                    <h3 style={{ color: 'var(--dark-brown)', marginBottom: '0.75rem', fontSize: '1.5rem' }}>Message Sent!</h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>Thank you for reaching out. We&apos;ll get back to you soon.</p>
                    <button onClick={() => setIsSubmitted(false)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.95rem', fontWeight: 600 }}>
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Your Name *" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      />
                      <input 
                        type="email" 
                        placeholder="Your Email *" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <input 
                        type="tel" 
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      />
                      <select 
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      >
                        <option value="">Select Subject</option>
                        <option value="reservation">Table Reservation</option>
                        <option value="event">Event Inquiry</option>
                        <option value="feedback">Feedback</option>
                        <option value="general">General Inquiry</option>
                      </select>
                    </div>
                    <textarea 
                      placeholder="Your Message *" 
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      style={{ padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', resize: 'vertical', transition: 'border-color 0.2s ease' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem 2rem' }}>
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}