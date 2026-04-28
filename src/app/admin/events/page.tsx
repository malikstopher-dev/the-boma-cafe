'use client';

import { useState, useEffect } from 'react';
import { cmsService, generateId } from '@/lib/client-cms';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [lastWeek, setLastWeek] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'highlight'>('upcoming');
  const [isEditing, setIsEditing] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryInput, setGalleryInput] = useState('');
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    date: '', 
    time: '', 
    location: '', 
    category: '',
    status: 'upcoming', 
    showOnHomepage: false, 
    ctaLabel: 'Book Now',
    ctaLink: '',
    coverImage: '',
    galleryImages: [] as string[],
    visible: true
  });

  const [highlightForm, setHighlightForm] = useState({
    title: '',
    description: '',
    videoSrc: '',
    posterImage: '',
    ctaLabel: 'Book This Weekend',
    ctaLink: '/contact',
    visible: true,
    autoplay: true,
    muted: true,
    loop: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evts, hlw] = await Promise.all([
          cmsService.getEvents(),
          cmsService.getLastWeekHighlight()
        ]);
        setEvents(evts);
        setLastWeek(hlw);
        if (hlw) {
          setHighlightForm({
            title: hlw.title || '',
            description: hlw.description || '',
            videoSrc: hlw.videoSrc || '',
            posterImage: hlw.posterImage || '',
            ctaLabel: hlw.ctaLabel || 'Book This Weekend',
            ctaLink: hlw.ctaLink || '/contact',
            visible: hlw.visible !== false,
            autoplay: hlw.autoplay !== false,
            muted: hlw.muted !== false,
            loop: hlw.loop !== false
          });
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventData = { 
      ...formData, 
      coverImage: formData.coverImage,
      updatedAt: new Date().toISOString(),
      status: formData.status === 'featured' ? 'featured' : formData.status,
      isFeatured: formData.status === 'featured',
      isUpcoming: formData.status === 'upcoming'
    };
    
    try {
      if (editEvent) {
        const updated = events.map((e: any) => e.id === editEvent.id ? { ...e, ...eventData } : e);
        await cmsService.reorderEvents(updated);
        setEvents(updated);
      } else {
        const newEvent = { 
          ...eventData, 
          id: generateId(), 
          order: events.length + 1, 
          createdAt: new Date().toISOString()
        };
        const result = await cmsService.saveEvent(newEvent);
        setEvents([...events, result.data]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEdit = (event: any) => {
    setEditEvent(event);
    setFormData({ 
      title: event.title || '', 
      description: event.description || '', 
      date: event.date || '', 
      time: event.time || '', 
      location: event.location || '', 
      category: event.category || '',
      status: event.isFeatured ? 'featured' : event.isUpcoming ? 'upcoming' : 'past', 
      showOnHomepage: event.showOnHomepage || false, 
      ctaLabel: event.ctaLabel || 'Book Now',
      ctaLink: event.ctaLink || '',
      coverImage: event.coverImage || event.image || '',
      galleryImages: event.galleryImages || [],
      visible: event.visible !== false
    });
    setGalleryInput(event.galleryImages?.join('\n') || '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this event?')) {
      try {
        await cmsService.deleteEvent(id);
        setEvents(events.filter((e: any) => e.id !== id));
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleSaveHighlight = async () => {
    try {
      await cmsService.saveLastWeekHighlight({
        ...highlightForm,
        id: lastWeek?.id || 'hlw-1'
      });
      setLastWeek({ ...highlightForm, id: lastWeek?.id || 'hlw-1' });
      alert('Last Week Highlight saved!');
    } catch (error) {
      console.error('Error saving highlight:', error);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditEvent(null);
    setFormData({ 
      title: '', description: '', date: '', time: '', location: '', 
      category: '', status: 'upcoming', showOnHomepage: false, 
      ctaLabel: 'Book Now', ctaLink: '', coverImage: '', galleryImages: [], visible: true 
    });
    setGalleryInput('');
  };

  const addGalleryImage = () => {
    if (galleryInput.trim()) {
      const images = galleryInput.split('\n').filter(img => img.trim());
      setFormData({...formData, galleryImages: images});
    }
  };

  const upcomingEvents = events.filter((e: any) => e.isUpcoming && e.visible !== false);
  const pastEvents = events.filter((e: any) => !e.isUpcoming && e.visible !== false);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Events</h1>
          <p style={{ color: 'var(--text-light)' }}>{events.length} total events</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--cream)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => { setActiveTab('upcoming'); resetForm(); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'upcoming' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'upcoming' ? 'var(--white)' : 'var(--text)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => { setActiveTab('past'); resetForm(); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'past' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'past' ? 'var(--white)' : 'var(--text)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Past ({pastEvents.length})
        </button>
        <button
          onClick={() => { setActiveTab('highlight'); resetForm(); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'highlight' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'highlight' ? 'var(--white)' : 'var(--text)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Last Week Highlight
        </button>
      </div>

      {/* Upcoming Events Tab */}
      {activeTab === 'upcoming' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)' }}>Upcoming Events</h2>
            <button 
              onClick={() => { setIsEditing(true); setEditEvent(null); resetForm(); }} 
              className="btn btn-primary"
            >
              + Add Event
            </button>
          </div>

          {isEditing && (
            <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--dark-brown)' }}>
                {editEvent ? 'Edit Event' : 'Add New Event'}
              </h3>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  placeholder="Event Title *" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  required 
                  style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <textarea 
                  placeholder="Description" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '80px' }} 
                />
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <input 
                  type="time" 
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <input 
                  type="text" 
                  placeholder="Location (e.g., Main Deck)" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <input 
                  type="text" 
                  placeholder="Category (e.g., Live Music, Buffet)" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="featured">Featured</option>
                  <option value="past">Past</option>
                </select>
                <input 
                  type="text" 
                  placeholder="CTA Label (e.g., Book Now)" 
                  value={formData.ctaLabel} 
                  onChange={e => setFormData({...formData, ctaLabel: e.target.value})} 
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <input 
                  type="text" 
                  placeholder="CTA Link (e.g., /contact)" 
                  value={formData.ctaLink} 
                  onChange={e => setFormData({...formData, ctaLink: e.target.value})}
                  style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Cover Image URL</label>
                  <input 
                    type="text" 
                    placeholder="/images/your-image.jpg" 
                    value={formData.coverImage} 
                    onChange={e => setFormData({...formData, coverImage: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                  />
                  {formData.coverImage && (
                    <img src={formData.coverImage} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />
                  )}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Gallery Images (one per line)</label>
                  <textarea 
                    placeholder="/images/gallery1.jpg&#10;/images/gallery2.jpg" 
                    value={galleryInput} 
                    onChange={e => setGalleryInput(e.target.value)}
                    onBlur={addGalleryImage}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '60px' }} 
                  />
                  {formData.galleryImages?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {formData.galleryImages.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt={`Gallery ${idx + 1}`} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      ))}
                    </div>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 2' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.showOnHomepage} 
                    onChange={e => setFormData({...formData, showOnHomepage: e.target.checked})} 
                  />
                  Show on Homepage
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.visible} 
                    onChange={e => setFormData({...formData, visible: e.target.checked})} 
                  />
                  Visible (show on site)
                </label>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary">Save Event</button>
                  <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {upcomingEvents.map((event: any) => (
              <div key={event.id} style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--dark-brown)', fontWeight: 600 }}>{event.title}</h4>
                    <span style={{ background: event.status === 'featured' ? '#fef3c7' : '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem', textTransform: 'capitalize' }}>{event.status}</span>
                    {event.category && <span style={{ background: 'var(--cream)', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem' }}>{event.category}</span>}
                  </div>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{event.date} • {event.time} • {event.location}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(event)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                  <button onClick={() => handleDelete(event.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Events Tab */}
      {activeTab === 'past' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)' }}>Past Events</h2>
            <button 
              onClick={() => { setIsEditing(true); setEditEvent(null); setFormData({ ...formData, status: 'past' }); }} 
              className="btn btn-primary"
            >
              + Add Past Event
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {pastEvents.map((event: any) => (
              <div key={event.id} style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)', opacity: 0.85 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--dark-brown)', fontWeight: 600 }}>{event.title}</h4>
                    {event.category && <span style={{ background: 'var(--cream)', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem' }}>{event.category}</span>}
                  </div>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{event.date}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(event)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                  <button onClick={() => handleDelete(event.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Week Highlight Tab */}
      {activeTab === 'highlight' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '1rem' }}>Last Week Highlights</h2>
          <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>Video section displayed at the top of the Events page</p>
          
          <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Section Title</label>
                <input 
                  type="text" 
                  placeholder="Last Week at The Boma Café" 
                  value={highlightForm.title} 
                  onChange={e => setHighlightForm({...highlightForm, title: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Description</label>
                <textarea 
                  placeholder="Missed the action? Here's what went down last week..." 
                  value={highlightForm.description} 
                  onChange={e => setHighlightForm({...highlightForm, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '60px' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Video URL</label>
                <input 
                  type="text" 
                  placeholder="/videos/gallery.mp4" 
                  value={highlightForm.videoSrc} 
                  onChange={e => setHighlightForm({...highlightForm, videoSrc: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 500 }}>Poster Image (fallback)</label>
                <input 
                  type="text" 
                  placeholder="/gallery/events/2025-04-23.webp" 
                  value={highlightForm.posterImage} 
                  onChange={e => setHighlightForm({...highlightForm, posterImage: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
                />
              </div>
              <input 
                type="text" 
                placeholder="CTA Label" 
                value={highlightForm.ctaLabel} 
                onChange={e => setHighlightForm({...highlightForm, ctaLabel: e.target.value})}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
              />
              <input 
                type="text" 
                placeholder="CTA Link" 
                value={highlightForm.ctaLink} 
                onChange={e => setHighlightForm({...highlightForm, ctaLink: e.target.value})}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} 
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={highlightForm.visible} onChange={e => setHighlightForm({...highlightForm, visible: e.target.checked})} />
                Show Section
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={highlightForm.autoplay} onChange={e => setHighlightForm({...highlightForm, autoplay: e.target.checked})} />
                Autoplay Video
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={highlightForm.muted} onChange={e => setHighlightForm({...highlightForm, muted: e.target.checked})} />
                Muted
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={highlightForm.loop} onChange={e => setHighlightForm({...highlightForm, loop: e.target.checked})} />
                Loop Video
              </label>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={handleSaveHighlight} className="btn btn-primary">Save Highlight</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}