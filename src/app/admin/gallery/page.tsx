'use client';

import { useState, useEffect, useRef } from 'react';
import { cmsService, generateId } from '@/lib/client-cms';

const categories = ['Events', 'Food', 'Venue', 'People', 'Promotions'];
const categoryFolders: Record<string, string> = {
  'Events': 'events',
  'Food': 'food',
  'Venue': 'venue',
  'People': 'people',
  'Promotions': 'promotions',
};

interface LocalImage {
  name: string;
  url: string;
  folder: string;
}

export default function AdminGallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false });
  const [activeTab, setActiveTab] = useState<'main' | 'local'>('main');
  const [localCategory, setLocalCategory] = useState('Events');
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        const data = await cmsService.getGallery();
        setGallery(data);
      } catch (error) {
        console.error('Error loading gallery:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGallery();
    loadLocalImages('Events');
  }, []);

  const loadLocalImages = async (category: string) => {
    const folder = categoryFolders[category];
    try {
      const response = await fetch(`/api/gallery/${folder}`);
      if (response.ok) {
        const data = await response.json();
        setLocalImages(data.images.map((url: string) => ({
          name: url.split('/').pop() || '',
          url,
          folder,
        })));
      }
    } catch (error) {
      console.error('Failed to load local images:', error);
      setLocalImages([]);
    }
  };

  const handleCategoryChange = (category: string) => {
    setLocalCategory(category);
    loadLocalImages(category);
  };

  const handleDeleteLocalImage = async (imageName: string) => {
    if (!confirm(`Delete ${imageName}? This will remove the file from the server.`)) return;
    
    const folder = categoryFolders[localCategory];
    try {
      const response = await fetch(`/api/gallery/${folder}/${imageName}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadLocalImages(localCategory);
      } else {
        alert('Failed to delete image. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const folder = categoryFolders[localCategory];
    
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      try {
        const response = await fetch('/api/upload/gallery', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          console.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setIsUploading(false);
    loadLocalImages(localCategory);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        const updated = gallery.map((item: any) => item.id === editItem.id ? { ...item, ...formData } : item);
        await cmsService.reorderGallery(updated);
        setGallery(updated);
      } else {
        const newItem = { ...formData, id: generateId(), order: gallery.length + 1, isFeatured: formData.isFeatured } as any;
        const result = await cmsService.saveGalleryItem(newItem);
        setGallery([...gallery, result.data]);
      }
      setIsEditing(false);
      setEditItem(null);
      setFormData({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false });
    } catch (error) {
      console.error('Error saving gallery item:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData({ type: item.type || 'image', url: item.url, title: item.title || '', category: item.category, isFeatured: item.isFeatured });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this item?')) {
      try {
        await cmsService.deleteGalleryItem(id);
        setGallery(gallery.filter((item: any) => item.id !== id));
      } catch (error) {
        console.error('Error deleting gallery item:', error);
      }
    }
  };

  const toggleFeatured = async (id: string) => {
    const item = gallery.find((item: any) => item.id === id);
    if (item) {
      const updated = { ...item, isFeatured: !item.isFeatured } as any;
      try {
        await cmsService.saveGalleryItem(updated);
        setGallery(gallery.map((i: any) => i.id === id ? updated : i));
      } catch (error) {
        console.error('Error toggling featured:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Gallery</h1>
          <p style={{ color: 'var(--text-light)' }}>{gallery.length} items</p>
        </div>
        <button onClick={() => { setActiveTab('main'); setIsEditing(true); setEditItem(null); setFormData({ type: 'image', url: '', title: '', category: 'Events', isFeatured: false }); }} className="btn btn-primary">+ Add Item</button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--cream-dark)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('main')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: activeTab === 'main' ? 'var(--primary)' : 'var(--cream)',
            color: activeTab === 'main' ? 'var(--white)' : 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Main Gallery
        </button>
        <button
          onClick={() => setActiveTab('local')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: activeTab === 'local' ? 'var(--primary)' : 'var(--cream)',
            color: activeTab === 'local' ? 'var(--white)' : 'var(--text)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Local Boards Gallery
        </button>
      </div>

      {/* Main Gallery Tab */}
      {activeTab === 'main' && (
        <>
          {isEditing && (
            <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{editItem ? 'Edit Item' : 'Add New Item'}</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <input type="text" placeholder="Image/Video URL *" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
                <input type="text" placeholder="Title (optional)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }} />
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--cream)' }}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} /> Featured on Homepage</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" onClick={() => { setIsEditing(false); setEditItem(null); }} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {gallery.map((item: any) => (
              <div key={item.id} style={{ background: 'var(--white)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ height: '150px', background: item.url ? `url(${item.url}) center/cover` : 'var(--cream)', position: 'relative' }}>
                  {item.isFeatured && <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--gold)', padding: '0.2rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem' }}>★</span>}
                  {item.type === 'video' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: 'var(--white)', fontSize: '2rem' }}>▶</div>}
                </div>
                <div style={{ padding: '1rem' }}>
                  <p style={{ fontWeight: 600, color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{item.title || 'Untitled'}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>{item.category}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => toggleFeatured(item.id)} style={{ padding: '0.25rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>{item.isFeatured ? 'Unfeature' : 'Feature'}</button>
                    <button onClick={() => handleEdit(item)} style={{ padding: '0.25rem 0.5rem', background: 'var(--cream)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '0.25rem 0.5rem', background: '#fee2e2', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626' }}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Local Gallery Boards Tab */}
      {activeTab === 'local' && (
        <>
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '20px',
                  background: localCategory === cat ? 'var(--primary)' : 'var(--cream)',
                  color: localCategory === cat ? 'var(--white)' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Upload Section */}
          <div style={{ background: 'var(--cream)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--dark-brown)', marginBottom: '1rem' }}>Upload Images to {localCategory} Folder</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
              Upload images to <code style={{ background: 'var(--white)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>public/gallery/{categoryFolders[localCategory]}</code>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--primary)',
                color: 'var(--white)',
                border: 'none',
                borderRadius: '8px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: isUploading ? 0.7 : 1,
              }}
            >
              {isUploading ? 'Uploading...' : '+ Upload Images'}
            </button>
          </div>

          {/* Images Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {localImages.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'var(--cream)', borderRadius: '12px', color: 'var(--text-light)' }}>
                No images in this folder. Upload some to get started.
              </div>
            ) : (
              localImages.map((img, idx) => (
                <div key={idx} style={{ background: 'var(--white)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                  <div style={{ height: '150px', background: `url(${img.url}) center/cover` }} />
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', wordBreak: 'break-all', marginBottom: '0.5rem' }}>{img.name}</p>
                    <button
                      onClick={() => handleDeleteLocalImage(img.name)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: '#dc2626',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}