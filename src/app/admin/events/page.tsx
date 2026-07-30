'use client';

import { useState, useEffect } from 'react';
import AdminPage from '@/components/admin/design-system/AdminPage';
import Button from '@/components/admin/design-system/Button';
import { Input, Textarea, Select } from '@/components/admin/design-system/Input';
import Badge from '@/components/admin/design-system/Badge';
import { SkeletonCard } from '@/components/admin/design-system/Skeleton';
import EmptyState from '@/components/admin/design-system/EmptyState';
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog';
import { useToast } from '@/components/admin/design-system/Toast';
import { cmsService, generateId } from '@/lib/client-cms';
import MediaPicker from '@/components/admin/MediaPicker';
import ImageUpload from '@/components/admin/ImageUpload';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [lastWeek, setLastWeek] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'highlight'>('upcoming');
  const [isEditing, setIsEditing] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [galleryInput, setGalleryInput] = useState('');
  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    title: '', description: '', date: '', time: '', location: '', category: '',
    status: 'upcoming', showOnHomepage: false, ctaLabel: 'Book Now', ctaLink: '',
    coverImage: '', galleryImages: [] as string[], visible: true,
  });

  const [highlightForm, setHighlightForm] = useState({
    title: '', description: '', videoSrc: '', posterImage: '',
    ctaLabel: 'Book This Weekend', ctaLink: '/contact',
    visible: true, autoplay: true, muted: true, loop: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [evts, hlw] = await Promise.all([
          cmsService.getEvents(),
          cmsService.getLastWeekHighlight(),
        ]);
        setEvents(evts);
        setLastWeek(hlw);
        if (hlw) {
          setHighlightForm({
            title: hlw.title || '', description: hlw.description || '',
            videoSrc: hlw.videoSrc || '', posterImage: hlw.posterImage || '',
            ctaLabel: hlw.ctaLabel || 'Book This Weekend', ctaLink: hlw.ctaLink || '/contact',
            visible: hlw.visible !== false, autoplay: hlw.autoplay !== false,
            muted: hlw.muted !== false, loop: hlw.loop !== false,
          });
        }
      } catch {
        showError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { showError('Event title is required'); return; }
    setIsSaving(true);
    try {
      const eventData = {
        ...formData,
        status: formData.status === 'featured' ? 'featured' : formData.status,
        isFeatured: formData.status === 'featured',
        isUpcoming: formData.status === 'upcoming',
        updatedAt: new Date().toISOString(),
      };
      if (editEvent) {
        const updated = { ...editEvent, ...eventData };
        await cmsService.saveEvent(updated);
        setEvents(events.map((e: any) => e.id === editEvent.id ? updated : e));
        success('Event updated');
      } else {
        const newEvent = { ...eventData, id: generateId(), order: events.length + 1, createdAt: new Date().toISOString() };
        const result = await cmsService.saveEvent(newEvent);
        setEvents([...events, result?.data || newEvent]);
        success('Event created');
      }
      resetForm();
    } catch (err) {
      showError('Failed to save event', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cmsService.deleteEvent(deleteTarget.id);
      setEvents(events.filter((e: any) => e.id !== deleteTarget.id));
      success('Event deleted');
    } catch {
      showError('Failed to delete event');
    }
    setDeleteTarget(null);
  };

  const handleSaveHighlight = async () => {
    setIsSaving(true);
    try {
      await cmsService.saveLastWeekHighlight({ ...highlightForm, id: lastWeek?.id || 'hlw-1' });
      setLastWeek({ ...highlightForm, id: lastWeek?.id || 'hlw-1' });
      success('Highlight saved');
    } catch (err) {
      showError('Failed to save highlight', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditEvent(null);
    setFormData({ title: '', description: '', date: '', time: '', location: '', category: '', status: 'upcoming', showOnHomepage: false, ctaLabel: 'Book Now', ctaLink: '', coverImage: '', galleryImages: [], visible: true });
    setGalleryInput('');
  };

  const openEdit = (event: any) => {
    setEditEvent(event);
    setFormData({
      title: event.title || '', description: event.description || '',
      date: event.date || '', time: event.time || '', location: event.location || '',
      category: event.category || '',
      status: event.isFeatured ? 'featured' : event.isUpcoming ? 'upcoming' : 'past',
      showOnHomepage: event.showOnHomepage || false, ctaLabel: event.ctaLabel || 'Book Now',
      ctaLink: event.ctaLink || '', coverImage: event.coverImage || event.image || '',
      galleryImages: event.galleryImages || [], visible: event.visible !== false,
    });
    setGalleryInput(event.galleryImages?.join('\n') || '');
    setIsEditing(true);
  };

  const upcomingEvents = events.filter((e: any) => e.isUpcoming && e.visible !== false);
  const pastEvents = events.filter((e: any) => !e.isUpcoming && e.visible !== false);

  const tabs = [
    { key: 'upcoming' as const, label: `Upcoming (${upcomingEvents.length})` },
    { key: 'past' as const, label: `Past (${pastEvents.length})` },
    { key: 'highlight' as const, label: 'Highlight' },
  ];

  return (
    <AdminPage title="Events" description={`${events.length} total events`}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F1F3F7', borderRadius: 10, padding: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); resetForm(); }}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === tab.key ? '#FFFFFF' : 'transparent',
              color: activeTab === tab.key ? '#0F172A' : '#94A3B8',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: 14, cursor: 'pointer',
              boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 20 }}>
            {editEvent ? 'Edit Event' : 'Add New Event'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Event Title" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Live Jazz Night" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe this event..." />
            </div>
            <Input label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            <Input label="Time" type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
            <Input label="Location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Main Deck" />
            <Input label="Category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Live Music" />
            <Select label="Status" options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'featured', label: 'Featured' }, { value: 'past', label: 'Past' }]} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} />
            <Input label="CTA Label" value={formData.ctaLabel} onChange={e => setFormData({ ...formData, ctaLabel: e.target.value })} placeholder="Book Now" />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="CTA Link" value={formData.ctaLink} onChange={e => setFormData({ ...formData, ctaLink: e.target.value })} placeholder="/contact" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <ImageUpload module="events" value={formData.coverImage} onChange={url => setFormData({ ...formData, coverImage: url })} label="Cover Image" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <MediaPicker module="events" type="campaign_image" value={formData.coverImage} onChange={url => setFormData({ ...formData, coverImage: url })} />
                </div>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.showOnHomepage} onChange={e => setFormData({ ...formData, showOnHomepage: e.target.checked })} />
                Show on Homepage
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.visible} onChange={e => setFormData({ ...formData, visible: e.target.checked })} />
                Visible
              </label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" loading={isSaving}>{editEvent ? 'Save Changes' : 'Add Event'}</Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Event List */}
      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : activeTab === 'highlight' ? (
        /* Last Week Highlight */
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Last Week Highlight</h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 20 }}>Video section displayed on the Events page</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Section Title" value={highlightForm.title} onChange={e => setHighlightForm({ ...highlightForm, title: e.target.value })} placeholder="Last Week at The Boma Café" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea label="Description" value={highlightForm.description} onChange={e => setHighlightForm({ ...highlightForm, description: e.target.value })} placeholder="Missed the action? Here's what went down..." />
            </div>
            <Input label="Video URL" value={highlightForm.videoSrc} onChange={e => setHighlightForm({ ...highlightForm, videoSrc: e.target.value })} placeholder="/videos/gallery.mp4" />
            <Input label="Poster Image" value={highlightForm.posterImage} onChange={e => setHighlightForm({ ...highlightForm, posterImage: e.target.value })} placeholder="/gallery/events/poster.webp" />
            <Input label="CTA Label" value={highlightForm.ctaLabel} onChange={e => setHighlightForm({ ...highlightForm, ctaLabel: e.target.value })} />
            <Input label="CTA Link" value={highlightForm.ctaLink} onChange={e => setHighlightForm({ ...highlightForm, ctaLink: e.target.value })} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(['visible', 'autoplay', 'muted', 'loop'] as const).map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={highlightForm[key]} onChange={e => setHighlightForm({ ...highlightForm, [key]: e.target.checked })} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              ))}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Button variant="primary" onClick={handleSaveHighlight} loading={isSaving}>Save Highlight</Button>
            </div>
          </div>
        </div>
      ) : (
        /* Event Cards */
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button variant="primary" onClick={() => { resetForm(); setIsEditing(true); }}>+ Add Event</Button>
          </div>
          {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).length === 0 ? (
            <EmptyState
              icon="📅"
              title={activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
              description={activeTab === 'upcoming' ? 'Create an event to get started' : 'Past events will appear here'}
              action={activeTab === 'upcoming' ? 'Add Event' : undefined}
              onAction={() => { resetForm(); setIsEditing(true); }}
            />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).map((event: any) => (
                <div key={event.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 16px', background: '#FFFFFF',
                  border: '1px solid #E5E7EB', borderRadius: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{event.title}</span>
                      <Badge variant={event.status === 'featured' ? 'accent' : event.isUpcoming ? 'success' : 'default'}>
                        {event.status || (event.isUpcoming ? 'upcoming' : 'past')}
                      </Badge>
                      {event.category && <Badge variant="default">{event.category}</Badge>}
                    </div>
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>
                      {event.date} · {event.time} · {event.location}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(event)} style={{ color: '#EF4444' }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminPage>
  );
}
