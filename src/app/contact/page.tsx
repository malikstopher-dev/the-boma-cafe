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
    const inquiries = dataService.getInquiries();
    const newInquiry = {
      id: generateId(),
      ...formData,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    dataService.saveInquiries([...inquiries, newInquiry]);
    setIsSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  const contact = contactSettings || {};

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '6rem 5%',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>Get in Touch</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            We&apos;d love to hear from you. Send us a message or visit us
          </p>
        </section>

        {/* Contact Info & Form */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
              {/* Info */}
              <div>
                <h2 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '2rem' }}>Contact Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {contact.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', flexShrink: 0 }}>📍</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>Address</strong>
                        <span style={{ color: 'var(--text-light)' }}>{contact.address}</span>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', flexShrink: 0 }}>📞</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>Phone</strong>
                        <a href={`tel:${contact.phone}`} style={{ color: 'var(--text-light)' }}>{contact.phone}</a>
                        {contact.phone2 && <span style={{ color: 'var(--text-light)' }}>, {contact.phone2}</span>}
                      </div>
                    </div>
                  )}
                  {contact.email && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', flexShrink: 0 }}>✉️</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>Email</strong>
                        <a href={`mailto:${contact.email}`} style={{ color: 'var(--text-light)' }}>{contact.email}</a>
                      </div>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '50px', height: '50px', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', flexShrink: 0 }}>💬</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>WhatsApp</strong>
                        <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-light)' }}>Chat with us</a>
                      </div>
                    </div>
                  )}
                  {contact.openingHours && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', flexShrink: 0 }}>🕐</div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>Opening Hours</strong>
                        <span style={{ color: 'var(--text-light)' }}>{contact.openingHours}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map */}
                {contact.mapEmbedUrl && (
                  <div style={{ marginTop: '2rem', borderRadius: '16px', overflow: 'hidden', height: '200px', background: 'var(--cream)' }}>
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

              {/* Form */}
              <div style={{ background: 'var(--cream)', borderRadius: '20px', padding: '2.5rem' }}>
                <h2 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '1.5rem' }}>Send us a Message</h2>
                
                {isSubmitted ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h3 style={{ color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>Message Sent!</h3>
                    <p style={{ color: 'var(--text-light)' }}>Thank you for reaching out. We&apos;ll get back to you soon.</p>
                    <button onClick={() => setIsSubmitted(false)} style={{ marginTop: '1.5rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Send another message</button>
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
                        style={{ padding: '1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem' }}
                      />
                      <input 
                        type="email" 
                        placeholder="Your Email *" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        style={{ padding: '1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <input 
                        type="tel" 
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        style={{ padding: '1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem' }}
                      />
                      <select 
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        style={{ padding: '1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem' }}
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
                      style={{ padding: '1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', resize: 'vertical' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
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