'use client';

import { useState, useEffect } from 'react';
import { dataService, generateId } from '@/lib/data';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', time: '', location: '', status: 'upcoming', showOnHomepage: false, ctaLink: '' });

  useEffect(() => {
    setEvents(dataService.getEvents());
  }, []);

  const saveEvents = (evts: any[]) => {
    dataService.saveEvents(evts);
    setEvents(evts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editEvent) {
      const updated = events.map((e: any) => e.id === editEvent.id ? { ...e, ...formData, updatedAt: new Date().toISOString() } : e);
      saveEvents(updated);
    } else {
      const newEvent = { ...formData, id: generateId(), coverImage: '', galleryImages: [], ticketLink: '', order: events.length + 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      saveEvents([...events, newEvent]);
    }
    setIsEditing(false);
    setEditEvent(null);
    setFormData({ title: '', description: '', date: '', time: '', location: '', status: 'upcoming', showOnHomepage: false, ctaLink: '' });
  };

  const handleEdit = (event: any) => {
    setEditEvent(event);
    setFormData({ title: event.title, description: event.description, date: event.date, time: event.time, location: event.location, status: event.status, showOnHomepage: event.showOnHomepage, ctaLink: event.ctaLink || '' });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this event?')) {
      saveEvents(events.filter((e: any) => e.id !== id));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Events</h1>
          <p style={{ color: 'var(--text-light)' }}>{events.length} events</p>
        </div>
        <button onClick={() => { setIsEditing(true); setEditEvent(null); setFormData({ title: '', description: '', date: '', time: '', location: '', status: 'upcoming', showOnHomepage: false, ctaLink: '' }); }} className="btn btn-primary">+ Add Event</button>
      </div>

      {isEditing && (
        <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editEvent ? 'Edit Event' : 'Add New Event'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Event Title *" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ gridColumn: 'span 2', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)', minHeight: '80px' }} />
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <input type="text" placeholder="Location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="featured">Featured</option>
            </select>
            <input type="text" placeholder="CTA Link" value={formData.ctaLink} onChange={e => setFormData({...formData, ctaLink: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.showOnHomepage} onChange={e => setFormData({...formData, showOnHomepage: e.target.checked})} /> Show on Homepage</label>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" onClick={() => { setIsEditing(false); setEditEvent(null); }} className="btn btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {events.map((event: any) => (
          <div key={event.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)' }}>{event.title}</h3>
                <span style={{ background: event.status === 'upcoming' ? '#dcfce7' : event.status === 'featured' ? '#fef3c7' : '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', textTransform: 'capitalize' }}>{event.status}</span>
                {event.showOnHomepage && <span style={{ background: 'var(--primary)', color: 'var(--white)', padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem' }}>Homepage</span>}
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>{event.date} • {event.time} • {event.location}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleEdit(event)} style={{ padding: '0.5rem 1rem', background: 'var(--cream)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDelete(event.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}