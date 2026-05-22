import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { MapPin, Trash2, Plus } from 'lucide-react';

// Fix Leaflet default icon broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const US_CENTER = [39.5, -98.35];

export default function MapView() {
  const { user, currentProject, nodes } = useApp();
  const [pins, setPins] = useState([]);
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [editingPin, setEditingPin] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'location' });
  const mapRef = useRef(null);

  const scenes = nodes.filter((n) => n.type === 'scene');

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(
      collection(db, 'users', user.uid, 'mapPins'),
      where('projectId', '==', currentProject.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, currentProject]);

  async function savePin() {
    if (!form.title.trim()) return;
    if (editingPin?.id) {
      await updateDoc(doc(db, 'users', user.uid, 'mapPins', editingPin.id), {
        ...form,
        updatedAt: serverTimestamp(),
      });
    } else if (pendingLatLng) {
      await addDoc(collection(db, 'users', user.uid, 'mapPins'), {
        projectId: currentProject.id,
        lat: pendingLatLng.lat,
        lng: pendingLatLng.lng,
        ...form,
        linkedSceneIds: [],
        createdAt: serverTimestamp(),
      });
    }
    closeModal();
  }

  async function deletePin(pinId) {
    if (!window.confirm('Remove this pin?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'mapPins', pinId));
  }

  function openAddModal(latlng) {
    setPendingLatLng(latlng);
    setForm({ title: '', description: '', type: 'location' });
    setEditingPin(null);
  }

  function openEditModal(pin) {
    setEditingPin(pin);
    setForm({ title: pin.title, description: pin.description || '', type: pin.type || 'location' });
    setPendingLatLng(null);
  }

  function closeModal() {
    setPendingLatLng(null);
    setEditingPin(null);
    setForm({ title: '', description: '', type: 'location' });
  }

  function flyToPin(pin) {
    if (mapRef.current) {
      mapRef.current.flyTo([pin.lat, pin.lng], 8, { duration: 0.8 });
    }
  }

  const showModal = pendingLatLng !== null || editingPin !== null;

  return (
    <div className="map-wrap">
      <div className="map-toolbar">
        <MapPin size={14} style={{ color: 'var(--accent)' }} />
        <span className="plot-grid-toolbar-title">Story Map</span>
        <span className="map-hint">Click the map to drop a pin</span>
      </div>

      <div className="map-container">
        <MapContainer
          center={US_CENTER}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={openAddModal} />
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]}>
              <Popup>
                <div style={{ fontFamily: 'var(--font)', minWidth: 160 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>{pin.title}</strong>
                  {pin.description && (
                    <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: 6 }}>{pin.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      style={{ fontSize: '0.75rem', background: 'none', border: '1px solid #ccc', borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}
                      onClick={() => openEditModal(pin)}
                    >
                      Edit
                    </button>
                    <button
                      style={{ fontSize: '0.75rem', background: 'none', border: '1px solid #ccc', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#b04040' }}
                      onClick={() => deletePin(pin.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {pins.length > 0 && (
          <div className="map-pin-list">
            <div className="map-pin-list-title">Pins ({pins.length})</div>
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="map-pin-item"
                onClick={() => flyToPin(pin)}
              >
                <div className="map-pin-item-title">{pin.title}</div>
                {pin.description && (
                  <div className="map-pin-item-desc">{pin.description.slice(0, 60)}{pin.description.length > 60 ? '...' : ''}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editingPin ? 'Edit Pin' : 'New Pin'}
            </div>
            <div className="modal-field">
              <label className="modal-label">Title *</label>
              <input
                className="modal-input"
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Location name..."
                onKeyDown={(e) => { if (e.key === 'Enter') savePin(); }}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Type</label>
              <select
                className="wiki-category-select"
                style={{ width: '100%' }}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="location">Location</option>
                <option value="clue">Clue</option>
                <option value="event">Event</option>
                <option value="character">Character base</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <textarea
                className="modal-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes about this location..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={savePin} disabled={!form.title.trim()}>
                {editingPin ? 'Save' : 'Add Pin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}
