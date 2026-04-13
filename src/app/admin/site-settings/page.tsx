'use client';

import { useState, useEffect } from 'react';
import { cmsService } from '@/lib/client-cms';

export default function AdminSiteSettings() {
  const [activeTab, setActiveTab] = useState('homepage');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [homepage, setHomepage] = useState({
    heroTitle: 'The Boma Cafe',
    heroSubtitle: 'Where the Rustic Meets the Soulful!',
    heroBackgroundImage: '/hero/slide1.jpg',
    welcomeTitle: 'More than just a place to eat',
    welcomeDescription: 'The Boma Cafe is a place to experience!',
    ctaText: 'Book a Table',
    ctaLink: '/contact',
    featuredSectionTitle: 'Signature Dishes',
    featuredSectionSubtitle: "Explore our chef's recommended selections"
  });

  const [about, setAbout] = useState({
    heroTitle: 'Our Story',
    heroSubtitle: 'Discover the passion and tradition behind The Boma Cafe',
    heroImage: '/images/about.jpg',
    introTitle: 'Rustic Elegance in the Heart of Sandton',
    introDescription: 'Welcome to The Boma Cafe, where we believe dining should be an experience, not just a meal.',
    fullDescription: 'Nestled in the vibrant area of Sandton, our open-air restaurant offers a unique escape from the hustle and bustle of city life.',
    missionTitle: 'Our Mission',
    missionDescription: 'To provide an unforgettable dining experience that celebrates the warmth of African hospitality.',
    valuesTitle: 'Our Values',
    valuesDescription: 'Quality, Warmth, Nature, and Soul',
    additionalImage1: '/images/about.jpg',
    additionalImage2: '/images/about.jpg'
  });

  const [contact, setContact] = useState({
    address: 'Sandton, Johannesburg, South Africa',
    phone: '071 592 1190',
    phone2: '072 996 2212',
    email: 'info@thebomacafe.co.za',
    whatsapp: '',
    openingHours: 'Mon-Sun: 8:00 AM - 10:00 PM',
    mapEmbedUrl: ''
  });

  const [promoBar, setPromoBar] = useState({
    isEnabled: true,
    message: '🎉 Join us for Live Music every Friday & Saturday evening!',
    buttonText: 'View Events',
    buttonLink: '/events'
  });

  const [branding, setBranding] = useState({
    siteName: 'The Boma Cafe',
    siteTagline: 'Where the Rustic Meets the Soulful',
    logo: '/logo.png',
    favicon: '/favicon.ico',
    footerText: '© {year} The Boma Cafe. All rights reserved.',
    facebook: 'https://facebook.com/thebomacafe',
    instagram: 'https://instagram.com/thebomacafe',
    twitter: '',
    youtube: ''
  });

  const [seo, setSeo] = useState({
    homepageTitle: 'The Boma Cafe | Sandton - Where the Rustic Meets the Soulful',
    homepageDescription: 'Experience authentic rustic charm at The Boma Cafe in Sandton.',
    homepageKeywords: 'restaurant Sandton, Boma Cafe, outdoor dining Johannesburg',
    ogImage: '/og-image.jpg',
    aboutTitle: 'About Us | The Boma Cafe',
    aboutDescription: 'Learn about The Boma Cafe story and our mission.',
    contactTitle: 'Contact Us | The Boma Cafe',
    contactDescription: 'Get in touch with The Boma Cafe.'
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await cmsService.getAllSettings();
        setHomepage({ ...settings.homepage });
        setAbout({ ...settings.about });
        setContact({ ...settings.contact, phone2: settings.contact.phone2 || '', whatsapp: settings.contact.whatsapp || '' });
        setPromoBar({ ...settings.promoBar });
        setBranding({ 
          ...settings.branding, 
          facebook: settings.branding.facebook || '',
          instagram: settings.branding.instagram || '',
          twitter: settings.branding.twitter || '',
          tiktok: settings.branding.tiktok || '',
          youtube: settings.branding.youtube || ''
        });
        setSeo({ ...settings.seo });
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (section: string) => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const allSettings = { homepage, about, contact, promoBar, branding, seo };
      await cmsService.saveAllSettings(allSettings);
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings');
    }
    setIsSaving(false);
  };

  const tabs = [
    { id: 'homepage', label: 'Homepage', icon: '🏠' },
    { id: 'about', label: 'About', icon: '📖' },
    { id: 'contact', label: 'Contact', icon: '📞' },
    { id: 'promoBar', label: 'Promo Bar', icon: '📢' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'seo', label: 'SEO', icon: '🔍' }
  ];

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--cream)',
    background: 'var(--cream)',
    fontSize: '0.95rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: 'var(--dark-brown)',
    fontWeight: 500
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Site Settings</h1>
        <p style={{ color: 'var(--text-light)' }}>Manage all website content from here</p>
      </div>

      {saveMessage && (
        <div style={{ 
          background: saveMessage.includes('Error') ? '#fee2e2' : '#dcfce7', 
          color: saveMessage.includes('Error') ? '#dc2626' : '#16a34a',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--white)',
              color: activeTab === tab.id ? 'var(--white)' : 'var(--text)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Homepage Tab */}
      {activeTab === 'homepage' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Homepage Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Hero Title</label>
              <input type="text" value={homepage.heroTitle} onChange={e => setHomepage({...homepage, heroTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hero Subtitle</label>
              <input type="text" value={homepage.heroSubtitle} onChange={e => setHomepage({...homepage, heroSubtitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hero Background Image URL</label>
              <input type="text" value={homepage.heroBackgroundImage} onChange={e => setHomepage({...homepage, heroBackgroundImage: e.target.value})} style={inputStyle} placeholder="/hero/slide1.jpg" />
            </div>
            <div>
              <label style={labelStyle}>Welcome Title</label>
              <input type="text" value={homepage.welcomeTitle} onChange={e => setHomepage({...homepage, welcomeTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Welcome Description</label>
              <textarea value={homepage.welcomeDescription} onChange={e => setHomepage({...homepage, welcomeDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={homepage.ctaText} onChange={e => setHomepage({...homepage, ctaText: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Button Link</label>
                <input type="text" value={homepage.ctaLink} onChange={e => setHomepage({...homepage, ctaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Featured Section Title</label>
                <input type="text" value={homepage.featuredSectionTitle} onChange={e => setHomepage({...homepage, featuredSectionTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Featured Section Subtitle</label>
                <input type="text" value={homepage.featuredSectionSubtitle} onChange={e => setHomepage({...homepage, featuredSectionSubtitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('homepage')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Homepage Settings'}
          </button>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>About Page Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Hero Title</label>
                <input type="text" value={about.heroTitle} onChange={e => setAbout({...about, heroTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hero Subtitle</label>
                <input type="text" value={about.heroSubtitle} onChange={e => setAbout({...about, heroSubtitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Hero Image URL</label>
              <input type="text" value={about.heroImage} onChange={e => setAbout({...about, heroImage: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Title</label>
              <input type="text" value={about.introTitle} onChange={e => setAbout({...about, introTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Description</label>
              <textarea value={about.introDescription} onChange={e => setAbout({...about, introDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Full Description</label>
              <textarea value={about.fullDescription} onChange={e => setAbout({...about, fullDescription: e.target.value})} rows={4} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Mission Title</label>
                <input type="text" value={about.missionTitle} onChange={e => setAbout({...about, missionTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mission Description</label>
                <input type="text" value={about.missionDescription} onChange={e => setAbout({...about, missionDescription: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Values Title</label>
              <input type="text" value={about.valuesTitle} onChange={e => setAbout({...about, valuesTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Values Description</label>
              <textarea value={about.valuesDescription} onChange={e => setAbout({...about, valuesDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Additional Image 1 URL</label>
                <input type="text" value={about.additionalImage1} onChange={e => setAbout({...about, additionalImage1: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Additional Image 2 URL</label>
                <input type="text" value={about.additionalImage2} onChange={e => setAbout({...about, additionalImage2: e.target.value})} style={inputStyle} />
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('about')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save About Settings'}
          </button>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Contact Page Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Address</label>
              <input type="text" value={contact.address} onChange={e => setContact({...contact, address: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="text" value={contact.phone} onChange={e => setContact({...contact, phone: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Secondary Phone (Optional)</label>
                <input type="text" value={contact.phone2 || ''} onChange={e => setContact({...contact, phone2: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp Link (Optional)</label>
                <input type="text" value={contact.whatsapp || ''} onChange={e => setContact({...contact, whatsapp: e.target.value})} style={inputStyle} placeholder="https://wa.me/..." />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Opening Hours</label>
              <input type="text" value={contact.openingHours} onChange={e => setContact({...contact, openingHours: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Google Maps Embed URL</label>
              <textarea value={contact.mapEmbedUrl} onChange={e => setContact({...contact, mapEmbedUrl: e.target.value})} rows={3} style={inputStyle} placeholder="Paste Google Maps embed iframe code" />
            </div>
          </div>
          <button onClick={() => handleSave('contact')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Contact Settings'}
          </button>
        </div>
      )}

      {/* Promo Bar Tab */}
      {activeTab === 'promoBar' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Promo Bar Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={promoBar.isEnabled} 
                onChange={e => setPromoBar({...promoBar, isEnabled: e.target.checked})}
                style={{ width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: 600 }}>Enable Announcement Bar</span>
            </label>
            <div>
              <label style={labelStyle}>Message Text</label>
              <textarea value={promoBar.message} onChange={e => setPromoBar({...promoBar, message: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Button Text</label>
                <input type="text" value={promoBar.buttonText} onChange={e => setPromoBar({...promoBar, buttonText: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Button Link</label>
                <input type="text" value={promoBar.buttonLink} onChange={e => setPromoBar({...promoBar, buttonLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('promoBar')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Promo Bar Settings'}
          </button>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Branding Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Site Name</label>
                <input type="text" value={branding.siteName} onChange={e => setBranding({...branding, siteName: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Site Tagline</label>
                <input type="text" value={branding.siteTagline} onChange={e => setBranding({...branding, siteTagline: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Logo URL</label>
                <input type="text" value={branding.logo} onChange={e => setBranding({...branding, logo: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Favicon URL</label>
                <input type="text" value={branding.favicon} onChange={e => setBranding({...branding, favicon: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Footer Text (use {'{year}'} for current year)</label>
              <input type="text" value={branding.footerText} onChange={e => setBranding({...branding, footerText: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Facebook URL</label>
                <input type="text" value={branding.facebook || ''} onChange={e => setBranding({...branding, facebook: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Instagram URL</label>
                <input type="text" value={branding.instagram || ''} onChange={e => setBranding({...branding, instagram: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Twitter URL (Optional)</label>
                <input type="text" value={branding.twitter || ''} onChange={e => setBranding({...branding, twitter: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>YouTube URL (Optional)</label>
                <input type="text" value={branding.youtube || ''} onChange={e => setBranding({...branding, youtube: e.target.value})} style={inputStyle} />
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('branding')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Branding Settings'}
          </button>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>SEO Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--dark-brown)' }}>Homepage SEO</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Meta Title</label>
                  <input type="text" value={seo.homepageTitle} onChange={e => setSeo({...seo, homepageTitle: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Meta Description</label>
                  <textarea value={seo.homepageDescription} onChange={e => setSeo({...seo, homepageDescription: e.target.value})} rows={3} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Keywords (comma separated)</label>
                  <input type="text" value={seo.homepageKeywords} onChange={e => setSeo({...seo, homepageKeywords: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Open Graph Image URL</label>
                  <input type="text" value={seo.ogImage} onChange={e => setSeo({...seo, ogImage: e.target.value})} style={inputStyle} />
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--dark-brown)' }}>About Page SEO</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Page Title</label>
                  <input type="text" value={seo.aboutTitle} onChange={e => setSeo({...seo, aboutTitle: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Meta Description</label>
                  <textarea value={seo.aboutDescription} onChange={e => setSeo({...seo, aboutDescription: e.target.value})} rows={2} style={inputStyle} />
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--dark-brown)' }}>Contact Page SEO</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Page Title</label>
                  <input type="text" value={seo.contactTitle} onChange={e => setSeo({...seo, contactTitle: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Meta Description</label>
                  <textarea value={seo.contactDescription} onChange={e => setSeo({...seo, contactDescription: e.target.value})} rows={2} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('seo')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save SEO Settings'}
          </button>
        </div>
      )}
    </div>
  );
}