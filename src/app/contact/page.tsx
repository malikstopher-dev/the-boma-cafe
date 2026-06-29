'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import { siteSettingsService } from '@/lib/siteSettings';
import { businessInfo, getReservationLink, getEventEnquiryLink } from '@/data/businessInfo';
import OptimizedHero from '@/components/ui/OptimizedHero';

export default function ContactPage() {
  const [settings, setSettings] = useState<any>(null);
  const [contactSettings, setContactSettings] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setSettings(dataService.getSettings());
    setContactSettings(siteSettingsService.getContactSettings());
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!formData.message.trim()) errors.message = 'Message is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/supabase/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          subject: formData.subject.trim() || null,
          message: formData.message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setValidationErrors({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const contact = contactSettings || {};

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        <div style={isMobile ? { marginTop: '-60px' } : undefined}>
          <OptimizedHero
            poster="/hero/hero-contact.jpg"
            videoSrc="/videos/contact-hero.mp4"
            mobileVideoSrc="/videos/contact-mobile.mp4"
            contentAlign={isMobile ? 'center' : 'bottom'}
          >
            {!isMobile && (
              <>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
                  padding: '0.4rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--dark-brown)',
                  marginBottom: '1rem',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}>
                  Contact Us
                </div>
                <h1 style={{
                  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                  color: 'var(--white)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  textShadow: '0 3px 25px rgba(0,0,0,0.35)',
                  letterSpacing: '-0.5px',
                }}>
                  Get in Touch
                </h1>
                <p style={{
                  color: 'rgba(253, 248, 243, 0.92)',
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  maxWidth: '650px',
                  margin: '0 auto',
                  lineHeight: 1.65,
                  textShadow: '0 2px 15px rgba(0,0,0,0.25)',
                }}>
                  We'd love to hear from you. Send us a message or visit us
                </p>
              </>
            )}
          </OptimizedHero>
        </div>

        {isMobile && (
          <div style={{
            background: '#1a0f0a',
            padding: '2rem 5% 3rem',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            }}>
              Contact Us
            </div>
            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              color: 'var(--white)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}>
              Get in Touch
            </h1>
            <p style={{
              color: 'rgba(253, 248, 243, 0.92)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.65,
            }}>
              We'd love to hear from you. Send us a message or visit us
            </p>
          </div>
        )}

        <div>
        {/* Contact Info & Form - Premium Design */}
        </div>
        
        {/* Quick Action Cards */}
        <section style={{ padding: '2rem 5%', background: 'var(--cream)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1rem' 
            }}>
              <motion.a 
                href={getReservationLink()}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(139, 69, 19, 0.35)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(139, 69, 19, 0.25)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>🍽️</span>
                <div>
                  <strong style={{ color: 'var(--white)', display: 'block', fontSize: '1.1rem' }}>Reserve a Table</strong>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>Book your spot via WhatsApp</span>
                </div>
              </motion.a>
              
              <motion.a 
                href={getEventEnquiryLink()}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(26, 15, 10, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: 'var(--white)',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(26, 15, 10, 0.08)',
                  border: '2px solid var(--beige-dark)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.1rem' }}>Plan an Event</strong>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Private functions & parties</span>
                </div>
              </motion.a>
              
              <motion.a 
                href={`https://wa.me/${businessInfo.phoneRaw}?text=${encodeURIComponent('Hello! I would like to order from The Boma Café')}`}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(37, 211, 102, 0.35)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>💬</span>
                <div>
                  <strong style={{ color: 'var(--white)', display: 'block', fontSize: '1.1rem' }}>Order / Chat</strong>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>Start an order via WhatsApp</span>
                </div>
              </motion.a>
            </div>
          </div>
        </section>
        
        <style>{`
          @media (max-width: 768px) {
            .contact-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
            .contact-form-card { padding: 1.5rem !important; border-radius: 16px !important; }
            .contact-form-inputs { grid-template-columns: 1fr !important; }
            .contact-map-container { height: 220px !important; margin-top: 1.5rem !important; }
            .contact-section { padding: 3rem 4% !important; }
            .contact-form-card input, .contact-form-card textarea, .contact-form-card select { width: 100% !important; box-sizing: border-box !important; font-size: 16px !important; }
            .contact-info-item { flex-direction: row !important; align-items: flex-start !important; }
            .contact-info-icon { width: 44px !important; height: 44px !important; border-radius: 12px !important; font-size: 1.25rem !important; }
            .contact-info-title { font-size: 0.95rem !important; }
            .contact-info-text { font-size: clamp(0.82rem, 3vw, 0.9rem) !important; }
            .contact-section h2 { font-size: clamp(1.3rem, 5vw, 1.5rem) !important; }
            .contact-cta-btn { padding: 0.85rem 1.25rem !important; font-size: clamp(0.85rem, 3vw, 0.95rem) !important; min-height: 48px !important; }
          }
        `}</style>
        <section className="contact-section" style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', alignItems: 'start' }}>
              {/* Info */}
              <div>
                <h2 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '2rem', fontFamily: 'var(--font-display)' }}>Contact Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Address - NAP Consistent */}
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
                      <span style={{ color: 'var(--text-light)', fontSize: '0.95rem', display: 'block' }}>{businessInfo.address.street}</span>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.95rem', display: 'block' }}>{businessInfo.address.suburb}, {businessInfo.address.city}, {businessInfo.address.postalCode}</span>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.95rem', display: 'block' }}>{businessInfo.address.country}</span>
                    </div>
                  </div>
                  
                  {/* Phone - NAP Consistent */}
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
                      <a href={`tel:${businessInfo.phone}`} style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{businessInfo.phone}</a>
                    </div>
                  </div>
                  
                  {/* Email */}
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
                      <a href={`mailto:${businessInfo.email}`} style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>{businessInfo.email}</a>
                    </div>
                  </div>
                  
                  {/* Opening Hours */}
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
                      <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                        {businessInfo.openingHoursArray.map(h => (
                          <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '200px' }}>
                            <span>{h.day}</span>
                            <span>{h.hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="contact-map-container" style={{ marginTop: '2.5rem', borderRadius: '20px', overflow: 'hidden', height: '250px', background: 'var(--cream)', boxShadow: 'var(--shadow-md)' }}>
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3580.096099327458!2d28.05762037431698!3d-26.045961999999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e957fcb4e722a79%3A0xc8e2d31c9e14a19e!2sThe%20Boma%20Cafe!5e0!3m2!1sen!2sza!4v1700000000000!5m2!1sen!2sza"
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="The Boma Café Location"
                  />
                </div>

                {/* Directions Button */}
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(businessInfo.address.full)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: 'var(--white)',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)',
                  }}
                >
                  <i className="fas fa-directions" /> Get Directions
                </a>

                {/* WhatsApp CTA */}
                <a 
                  href={`https://wa.me/${businessInfo.phoneRaw}?text=${encodeURIComponent('Hello! I would like to inquire about The Boma Café')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: 'var(--white)',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <i className="fab fa-whatsapp" /> Chat on WhatsApp
                </a>
              </div>

              {/* Form - Premium */}
              <div className="contact-form-card" style={{ background: 'var(--cream)', borderRadius: '24px', padding: '2.75rem', boxShadow: 'var(--shadow-md)' }}>
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
                    <div className="contact-form-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Your Name *" 
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', borderRadius: '14px', border: `2px solid ${validationErrors.name ? '#ef4444' : 'transparent'}`, background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                        />
                        {validationErrors.name && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{validationErrors.name}</span>}
                      </div>
                      <div>
                        <input 
                          type="email" 
                          placeholder="Your Email *" 
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', borderRadius: '14px', border: `2px solid ${validationErrors.email ? '#ef4444' : 'transparent'}`, background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                        />
                        {validationErrors.email && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{validationErrors.email}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <input 
                        type="tel" 
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      />
                      <select 
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', borderRadius: '14px', border: '2px solid transparent', background: 'var(--white)', fontSize: '1rem', transition: 'border-color 0.2s ease' }}
                      >
                        <option value="">Select Subject</option>
                        <option value="reservation">Table Reservation</option>
                        <option value="event">Event Inquiry</option>
                        <option value="feedback">Feedback</option>
                        <option value="general">General Inquiry</option>
                      </select>
                    </div>
                    <div>
                      <textarea 
                        placeholder="Your Message *" 
                        rows={5}
                        value={formData.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', borderRadius: '14px', border: `2px solid ${validationErrors.message ? '#ef4444' : 'transparent'}`, background: 'var(--white)', fontSize: '1rem', resize: 'vertical', transition: 'border-color 0.2s ease' }}
                      />
                      {validationErrors.message && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{validationErrors.message}</span>}
                    </div>
                    {submitError && (
                      <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{submitError}</p>
                    )}
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem 2rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                      {isSubmitting ? 'Sending...' : 'Send Message'}
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