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

  const [experience, setExperience] = useState({
    heroTitle: 'The Experience',
    heroSubtitle: 'More than just a restaurant — a destination for every occasion',
    heroBadge: 'Discover',
    diningTitle: 'Dining',
    diningSubtitle: 'Rustic Outdoor Restaurant',
    diningDescription: 'Experience authentic outdoor dining beneath our signature thatched roof.',
    diningHighlights: 'Thatched roof ambiance, Open-air seating, Fresh local ingredients, Cozy firepits',
    diningImage: '/hero/hero-experience.jpg',
    diningCta: 'View Menu',
    diningCtaLink: '/menu',
    puffTitle: 'Bisou El Patrona',
    puffSubtitle: 'A Different Vibe',
    puffDescription: 'A separate lounge area with a distinct atmosphere from our main restaurant.',
    puffHighlights: 'Separate lounge area, Curated music selection, Relaxed social vibe, Intimate setting',
    puffImage: '/hero/hero-experience.jpg',
    puffCta: 'Learn More',
    puffCtaLink: '/contact',
    familyTitle: 'Family & Activities',
    familySubtitle: 'Fun for All Ages',
    familyDescription: 'A welcoming destination for families.',
    familyHighlights: 'Kiddies play area, Clay painting activity, Family-friendly atmosphere',
    familyImage: '/hero/hero-experience.jpg',
    familyCta: 'Plan Your Visit',
    familyCtaLink: '/contact',
    weekendTitle: 'Weekend Buffet',
    weekendDescription: 'Join us on weekends for our signature buffet experience.',
    weekendCta: 'View Menu',
    weekendCtaLink: '/menu',
    videoEnabled: true,
    videoPath: '/videos/gallery.mp4',
    videoTitle: 'Experience The Boma Café',
    videoSubtitle: 'Book your table today'
  });

  const [entertainment, setEntertainment] = useState({
    heroTitle: 'Live Entertainment',
    heroSubtitle: 'Thursday to Sunday — music, energy, and unforgettable evenings',
    heroBadge: 'Entertainment',
    introTitle: 'Every Weekend is a Celebration',
    introDescription: 'The Boma Café comes alive from Thursday to Sunday with a vibrant lineup of entertainment.',
    djTitle: 'Live DJs',
    djDescription: 'Feel the rhythm with our talented DJs spinning curated tracks.',
    karaokeTitle: 'Karaoke',
    karaokeDescription: 'Step into the spotlight and showcase your vocals.',
    liveTitle: 'Live Performances',
    liveDescription: 'Experience passionate performances from local artists.',
    vibeTitle: 'Weekend Evenings',
    vibeDescription: 'The Boma Café transforms into the ultimate weekend destination.',
    vibeImage: '/hero/hero-entertainment.jpg',
    ctaBook: 'Book a Table',
    ctaFollow: 'Follow Us'
  });

  const [venueHire, setVenueHire] = useState({
    heroTitle: 'Events & Venue Hire',
    heroSubtitle: 'Host your special occasions at The Boma Café',
    heroBadge: 'Celebrate',
    introTitle: 'Host Your Special Occasion',
    introDescription: 'From intimate gatherings to grand celebrations.',
    meetingTitle: 'Meetings',
    meetingDesc: 'Professional spaces for corporate gatherings',
    yearEndTitle: 'Year-End Functions',
    yearEndDesc: 'Celebrate achievements in style',
    weddingTitle: 'Weddings',
    weddingDesc: 'Create magical moments in our rustic setting',
    privateTitle: 'Private Functions',
    privateDesc: 'Birthdays, anniversaries, and more',
    ctaTitle: 'Ready to Host?',
    ctaDescription: 'From corporate functions to private celebrations.',
    cta: 'Enquire Now',
    ctaLink: '/contact',
    slideshowEnabled: true,
    slideshowImages: [
      '/gallery/events/events-slideshow/slide1.webp',
      '/gallery/events/events-slideshow/slide2.webp',
      '/gallery/events/events-slideshow/slide3.webp',
      '/gallery/events/events-slideshow/slide4.webp',
      '/gallery/events/events-slideshow/slide5.webp',
      '/gallery/events/events-slideshow/slide6.webp',
      '/gallery/events/events-slideshow/slide7.jpg',
      '/gallery/events/events-slideshow/slide.webp'
    ]
  });

  const [contact, setContact] = useState({
    address: 'Sandton, Johannesburg, South Africa',
    phone: '072 996 2212',
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
        setExperience({ ...settings.experience });
        setEntertainment({ ...settings.entertainment });
        setVenueHire({ ...settings.venueHire });
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
      const allSettings = { homepage, about, experience, entertainment, venueHire, contact, promoBar, branding, seo };
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
    { id: 'experience', label: 'Experience', icon: '🌿' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎵' },
    { id: 'venueHire', label: 'Venue Hire', icon: '🏟️' },
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

      {/* Experience Tab */}
      {activeTab === 'experience' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Experience Page Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Hero Title</label>
              <input type="text" value={experience.heroTitle} onChange={e => setExperience({...experience, heroTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hero Subtitle</label>
              <input type="text" value={experience.heroSubtitle} onChange={e => setExperience({...experience, heroSubtitle: e.target.value})} style={inputStyle} />
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)' }}>Dining Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input type="text" value={experience.diningTitle} onChange={e => setExperience({...experience, diningTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subtitle</label>
                <input type="text" value={experience.diningSubtitle} onChange={e => setExperience({...experience, diningSubtitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={experience.diningDescription} onChange={e => setExperience({...experience, diningDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Highlights (comma separated)</label>
              <input type="text" value={experience.diningHighlights} onChange={e => setExperience({...experience, diningHighlights: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Image URL</label>
              <input type="text" value={experience.diningImage} onChange={e => setExperience({...experience, diningImage: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={experience.diningCta} onChange={e => setExperience({...experience, diningCta: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input type="text" value={experience.diningCtaLink} onChange={e => setExperience({...experience, diningCtaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)' }}>Bisou El Patrona Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input type="text" value={experience.puffTitle} onChange={e => setExperience({...experience, puffTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subtitle</label>
                <input type="text" value={experience.puffSubtitle} onChange={e => setExperience({...experience, puffSubtitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={experience.puffDescription} onChange={e => setExperience({...experience, puffDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Highlights (comma separated)</label>
              <input type="text" value={experience.puffHighlights} onChange={e => setExperience({...experience, puffHighlights: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Image URL</label>
              <input type="text" value={experience.puffImage} onChange={e => setExperience({...experience, puffImage: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={experience.puffCta} onChange={e => setExperience({...experience, puffCta: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input type="text" value={experience.puffCtaLink} onChange={e => setExperience({...experience, puffCtaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)' }}>Family & Activities Section</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input type="text" value={experience.familyTitle} onChange={e => setExperience({...experience, familyTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Subtitle</label>
                <input type="text" value={experience.familySubtitle} onChange={e => setExperience({...experience, familySubtitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={experience.familyDescription} onChange={e => setExperience({...experience, familyDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Highlights (comma separated)</label>
              <input type="text" value={experience.familyHighlights} onChange={e => setExperience({...experience, familyHighlights: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Image URL</label>
              <input type="text" value={experience.familyImage} onChange={e => setExperience({...experience, familyImage: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={experience.familyCta} onChange={e => setExperience({...experience, familyCta: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input type="text" value={experience.familyCtaLink} onChange={e => setExperience({...experience, familyCtaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)' }}>Weekend Buffet Section</h3>
            <div>
              <label style={labelStyle}>Title</label>
              <input type="text" value={experience.weekendTitle} onChange={e => setExperience({...experience, weekendTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={experience.weekendDescription} onChange={e => setExperience({...experience, weekendDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={experience.weekendCta} onChange={e => setExperience({...experience, weekendCta: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input type="text" value={experience.weekendCtaLink} onChange={e => setExperience({...experience, weekendCtaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Video Showcase</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Enable Video Section</label>
                  <select value={experience.videoEnabled ? 'true' : 'false'} onChange={e => setExperience({...experience, videoEnabled: e.target.value === 'true'})} style={inputStyle}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Video Path</label>
                  <input type="text" value={experience.videoPath || '/videos/gallery.mp4'} onChange={e => setExperience({...experience, videoPath: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={labelStyle}>Video Title</label>
                  <input type="text" value={experience.videoTitle || ''} onChange={e => setExperience({...experience, videoTitle: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Video Subtitle</label>
                  <input type="text" value={experience.videoSubtitle || ''} onChange={e => setExperience({...experience, videoSubtitle: e.target.value})} style={inputStyle} />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('experience')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Experience Settings'}
          </button>
        </div>
      )}

      {/* Entertainment Tab */}
      {activeTab === 'entertainment' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Entertainment Page Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Hero Title</label>
              <input type="text" value={entertainment.heroTitle} onChange={e => setEntertainment({...entertainment, heroTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hero Subtitle</label>
              <input type="text" value={entertainment.heroSubtitle} onChange={e => setEntertainment({...entertainment, heroSubtitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Title</label>
              <input type="text" value={entertainment.introTitle} onChange={e => setEntertainment({...entertainment, introTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Description</label>
              <textarea value={entertainment.introDescription} onChange={e => setEntertainment({...entertainment, introDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>DJ Card Title</label>
                <input type="text" value={entertainment.djTitle} onChange={e => setEntertainment({...entertainment, djTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Karaoke Card Title</label>
                <input type="text" value={entertainment.karaokeTitle} onChange={e => setEntertainment({...entertainment, karaokeTitle: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>DJ Description</label>
              <textarea value={entertainment.djDescription} onChange={e => setEntertainment({...entertainment, djDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Karaoke Description</label>
              <textarea value={entertainment.karaokeDescription} onChange={e => setEntertainment({...entertainment, karaokeDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Live Performance Title</label>
              <input type="text" value={entertainment.liveTitle} onChange={e => setEntertainment({...entertainment, liveTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Live Performance Description</label>
              <textarea value={entertainment.liveDescription} onChange={e => setEntertainment({...entertainment, liveDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vibe Section Title</label>
              <input type="text" value={entertainment.vibeTitle} onChange={e => setEntertainment({...entertainment, vibeTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vibe Section Description</label>
              <textarea value={entertainment.vibeDescription} onChange={e => setEntertainment({...entertainment, vibeDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vibe Image URL</label>
              <input type="text" value={entertainment.vibeImage} onChange={e => setEntertainment({...entertainment, vibeImage: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA: Book a Table</label>
                <input type="text" value={entertainment.ctaBook} onChange={e => setEntertainment({...entertainment, ctaBook: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA: Follow Us</label>
                <input type="text" value={entertainment.ctaFollow} onChange={e => setEntertainment({...entertainment, ctaFollow: e.target.value})} style={inputStyle} />
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('entertainment')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Entertainment Settings'}
          </button>
        </div>
      )}

      {/* Venue Hire Tab */}
      {activeTab === 'venueHire' && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Events & Venue Hire Settings</h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Hero Title</label>
              <input type="text" value={venueHire.heroTitle} onChange={e => setVenueHire({...venueHire, heroTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hero Subtitle</label>
              <input type="text" value={venueHire.heroSubtitle} onChange={e => setVenueHire({...venueHire, heroSubtitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Title</label>
              <input type="text" value={venueHire.introTitle} onChange={e => setVenueHire({...venueHire, introTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Intro Description</label>
              <textarea value={venueHire.introDescription} onChange={e => setVenueHire({...venueHire, introDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Meetings Title</label>
                <input type="text" value={venueHire.meetingTitle} onChange={e => setVenueHire({...venueHire, meetingTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Meetings Description</label>
                <input type="text" value={venueHire.meetingDesc} onChange={e => setVenueHire({...venueHire, meetingDesc: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Year-End Title</label>
                <input type="text" value={venueHire.yearEndTitle} onChange={e => setVenueHire({...venueHire, yearEndTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Year-End Description</label>
                <input type="text" value={venueHire.yearEndDesc} onChange={e => setVenueHire({...venueHire, yearEndDesc: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Weddings Title</label>
                <input type="text" value={venueHire.weddingTitle} onChange={e => setVenueHire({...venueHire, weddingTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weddings Description</label>
                <input type="text" value={venueHire.weddingDesc} onChange={e => setVenueHire({...venueHire, weddingDesc: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Private Functions Title</label>
                <input type="text" value={venueHire.privateTitle} onChange={e => setVenueHire({...venueHire, privateTitle: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Private Functions Description</label>
                <input type="text" value={venueHire.privateDesc} onChange={e => setVenueHire({...venueHire, privateDesc: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--cream)', margin: '1rem 0' }} />
            <div>
              <label style={labelStyle}>CTA Title</label>
              <input type="text" value={venueHire.ctaTitle} onChange={e => setVenueHire({...venueHire, ctaTitle: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CTA Description</label>
              <textarea value={venueHire.ctaDescription} onChange={e => setVenueHire({...venueHire, ctaDescription: e.target.value})} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>CTA Button Text</label>
                <input type="text" value={venueHire.cta} onChange={e => setVenueHire({...venueHire, cta: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA Link</label>
                <input type="text" value={venueHire.ctaLink} onChange={e => setVenueHire({...venueHire, ctaLink: e.target.value})} style={inputStyle} />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Events Slideshow</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                The slideshow automatically uses images from the public/gallery/events/events-slideshow folder. 
                Add or remove images from that folder to manage slideshow content.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Enable Slideshow</label>
                  <select value={venueHire.slideshowEnabled ? 'true' : 'false'} onChange={e => setVenueHire({...venueHire, slideshowEnabled: e.target.value === 'true'})} style={inputStyle}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Note</label>
                  <input type="text" value="Use folder: /gallery/events/events-slideshow" disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => handleSave('venueHire')} disabled={isSaving} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            {isSaving ? 'Saving...' : 'Save Venue Hire Settings'}
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