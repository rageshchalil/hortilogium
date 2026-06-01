import React, { useState, useEffect, useCallback } from 'react';
import { fetchPlants, upsertPlant, deletePlantDb, fetchJournal, insertJournalEntry, deleteJournalEntry, uploadPhoto } from './db';
import './App.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EMOJIS = ['🌱','🌿','🍀','🌺','🌸','🌼','🌻','🌹','🌷','🍎','🍊','🍋','🌳','🌲','🎋','🪴','💜','🌾','🎍','🍃','🫚','🌵','🍇','🫐','🍓'];
const PLANT_TYPES = ['Shrub','Tree','Perennial','Annual','Bulb','Herb','Climber','Fruit','Vegetable','Other'];

const SAMPLE_PLANTS = [
  { id:'sample-1', name:'Rose', latin:'Rosa', emoji:'🌹', type:'Shrub', location:'Front border', notes:'Old English rose, very fragrant. Prefers full sun.', water:{ freq:'Twice weekly', months:[2,3,4,5,6,7,8,9] }, feed:{ freq:'Monthly spring–summer', months:[2,3,4,5,6,7,8] }, prune:{ months:[1,2,8] }, photos:[], created_at: new Date().toISOString() },
  { id:'sample-2', name:'Lavender', latin:'Lavandula angustifolia', emoji:'💜', type:'Perennial', location:'South bed', notes:'Great for bees and butterflies. Drought tolerant once established.', water:{ freq:'Weekly in dry spells', months:[3,4,5,6,7,8,9] }, feed:{ freq:'Once in spring', months:[2,3] }, prune:{ months:[7,8] }, photos:[], created_at: new Date().toISOString() },
  { id:'sample-3', name:'Apple Tree', latin:'Malus domestica', emoji:'🍎', type:'Tree', location:'Back garden', notes:'Cox variety, planted 2020. Net over fruit in summer.', water:{ freq:'Weekly in dry spells', months:[4,5,6,7,8] }, feed:{ freq:'Early spring', months:[1,2] }, prune:{ months:[0,1,11] }, photos:[], created_at: new Date().toISOString() },
];

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return d; }
}

function typeColor(type) {
  return { Shrub:'green', Tree:'teal', Perennial:'blue', Annual:'amber', Bulb:'purple', Herb:'herb', Climber:'coral', Fruit:'fruit', Vegetable:'veg', Other:'gray' }[type] || 'gray';
}

// ─────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('plants');
  const [plants, setPlants] = useState([]);
  const [journal, setJournal] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'addPlant' | 'editPlant' | 'addJournal'
  const [viewingPlant, setViewingPlant] = useState(null);
  const [plantTab, setPlantTab] = useState('info');
  const [editingPlant, setEditingPlant] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, j] = await Promise.all([fetchPlants(), fetchJournal()]);
      setPlants(p.length ? p : SAMPLE_PLANTS);
      setJournal(j);
    } catch (e) {
      setPlants(SAMPLE_PLANTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const now = new Date();
  const cm = now.getMonth();

  const savePlant = async (plant) => {
    try {
      const saved = await upsertPlant(plant);
      setPlants(prev => prev.some(p => p.id === plant.id)
        ? prev.map(p => p.id === plant.id ? saved : p)
        : [...prev, saved]);
      setModal(null);
      setEditingPlant(null);
      if (viewingPlant === plant.id) setPlantTab('info');
      showToast(`${plant.name} saved!`);
    } catch (e) {
      showToast('Could not save plant.', 'error');
    }
  };

  const removePlant = async (id) => {
    if (!window.confirm('Delete this plant and all its journal entries?')) return;
    try {
      await deletePlantDb(id);
      setPlants(prev => prev.filter(p => p.id !== id));
      setJournal(prev => prev.filter(e => e.plant_id !== id));
      setViewingPlant(null);
      showToast('Plant deleted.');
    } catch (e) {
      showToast('Could not delete plant.', 'error');
    }
  };

  const saveJournal = async (entry) => {
    try {
      const saved = await insertJournalEntry(entry);
      setJournal(prev => [saved, ...prev]);
      setModal(null);
      showToast('Journal entry saved!');
    } catch (e) {
      showToast('Could not save entry.', 'error');
    }
  };

  const removeJournalEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    try {
      await deleteJournalEntry(id);
      setJournal(prev => prev.filter(e => e.id !== id));
      showToast('Entry deleted.');
    } catch (e) {
      showToast('Could not delete entry.', 'error');
    }
  };

  const addPhoto = async (plantId, file) => {
    try {
      showToast('Uploading photo…', 'info');
      const url = await uploadPhoto(file, plantId);
      const plant = plants.find(p => p.id === plantId);
      const updated = { ...plant, photos: [...(plant.photos || []), url] };
      await savePlant(updated);
      showToast('Photo added!');
    } catch (e) {
      showToast('Photo upload failed. Check Cloudinary config.', 'error');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="header-title">🌿 My Garden</div>
          <div className="header-sub">{plants.length} plants · {MONTHS_FULL[cm]} {now.getFullYear()}</div>
        </div>
        {(tab === 'plants' || tab === 'journal') && !viewingPlant && (
          <button className="btn-add" onClick={() => setModal(tab === 'journal' ? 'addJournal' : 'addPlant')} aria-label="Add">+</button>
        )}
      </header>

      <main className="content">
        {loading ? (
          <div className="empty-state"><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }}></i><p>Loading your garden…</p></div>
        ) : viewingPlant ? (
          <PlantDetail
            plant={plants.find(p => p.id === viewingPlant)}
            journal={journal.filter(e => e.plant_id === viewingPlant)}
            plantTab={plantTab}
            setPlantTab={setPlantTab}
            onBack={() => { setViewingPlant(null); setPlantTab('info'); }}
            onEdit={(p) => { setEditingPlant(p); setModal('editPlant'); }}
            onDelete={removePlant}
            onAddPhoto={addPhoto}
            onAddJournal={() => setModal('addJournal')}
            onDeleteJournal={removeJournalEntry}
            cm={cm}
          />
        ) : tab === 'plants' ? (
          <PlantsTab plants={plants} search={search} setSearch={setSearch} onView={id => { setViewingPlant(id); setPlantTab('info'); }} cm={cm} />
        ) : tab === 'calendar' ? (
          <CalendarTab plants={plants} cm={cm} />
        ) : tab === 'journal' ? (
          <JournalTab journal={journal} plants={plants} onDelete={removeJournalEntry} />
        ) : (
          <DashboardTab plants={plants} journal={journal} cm={cm} onViewPlant={id => { setViewingPlant(id); setTab('plants'); setPlantTab('info'); }} />
        )}
      </main>

      <nav className="nav">
        {[['plants','ti-leaf','Plants'],['calendar','ti-calendar','Calendar'],['journal','ti-notebook','Journal'],['dashboard','ti-layout-dashboard','Overview']].map(([t,icon,label]) => (
          <button key={t} className={`nav-btn${tab === t && !viewingPlant ? ' active' : ''}`} onClick={() => { setTab(t); setViewingPlant(null); }}>
            <i className={`ti ${icon}`} aria-hidden="true"></i>{label}
          </button>
        ))}
      </nav>

      {modal === 'addPlant' && <PlantModal onSave={savePlant} onClose={() => setModal(null)} />}
      {modal === 'editPlant' && editingPlant && <PlantModal plant={editingPlant} onSave={savePlant} onClose={() => { setModal(null); setEditingPlant(null); }} />}
      {modal === 'addJournal' && <JournalModal plants={plants} defaultPlantId={viewingPlant} onSave={saveJournal} onClose={() => setModal(null)} />}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ─── Plants Tab ───────────────────────────────────────────
function PlantsTab({ plants, search, setSearch, onView }) {
  const q = search.toLowerCase();
  const filtered = plants.filter(p => p.name.toLowerCase().includes(q) || (p.latin || '').toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q));
  return (
    <>
      <div className="search-bar">
        <i className="ti ti-search" aria-hidden="true" style={{ color:'var(--text-muted)', fontSize:18 }}></i>
        <input placeholder="Search plants…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="clear-search" onClick={() => setSearch('')}><i className="ti ti-x"></i></button>}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><i className="ti ti-plant-2"></i><p>No plants found.<br />Tap + to add your first plant!</p></div>
      ) : (
        <>
          <div className="section-title">My Plants ({filtered.length})</div>
          <div className="plant-grid">
            {filtered.map(p => <PlantCard key={p.id} plant={p} onClick={() => onView(p.id)} />)}
          </div>
        </>
      )}
    </>
  );
}

function PlantCard({ plant, onClick }) {
  const tc = typeColor(plant.type);
  const pillClass = { green:'pill-green', teal:'pill-teal', blue:'pill-blue', amber:'pill-amber', purple:'pill-purple', herb:'pill-green', coral:'pill-coral', fruit:'pill-amber', veg:'pill-green', gray:'pill-gray' }[tc] || 'pill-gray';
  return (
    <div className="plant-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="plant-img">{plant.photos?.length ? <img src={plant.photos[0]} alt={plant.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:44 }}>{plant.emoji || '🌱'}</span>}</div>
      <div className="plant-card-body">
        <div className="plant-name">{plant.name}</div>
        {plant.latin && <div className="plant-latin">{plant.latin}</div>}
        <span className={`pill ${pillClass}`}>{plant.type || 'Plant'}</span>
      </div>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────
function CalendarTab({ plants, cm }) {
  const taskList = [];
  plants.forEach(p => {
    if ((p.water?.months || []).includes(cm)) taskList.push({ plant: p, task:'Water', freq: p.water?.freq, cls:'water' });
    if ((p.feed?.months || []).includes(cm)) taskList.push({ plant: p, task:'Fertilise', freq: p.feed?.freq, cls:'feed' });
    if ((p.prune?.months || []).includes(cm)) taskList.push({ plant: p, task:'Prune', freq:'This month', cls:'prune' });
  });
  const iconMap = { water:'ti-droplet', feed:'ti-flask', prune:'ti-cut' };
  return (
    <>
      <div className="section-title">This month — {MONTHS_FULL[cm]}</div>
      {taskList.length === 0
        ? <div className="empty-state" style={{ padding:'24px 0' }}><i className="ti ti-calendar-off"></i><p>Nothing scheduled this month.</p></div>
        : taskList.map((t, i) => (
          <div key={i} className="upcoming-item">
            <div className={`task-icon task-${t.cls}`}><i className={`ti ${iconMap[t.cls]}`} aria-hidden="true"></i></div>
            <div className="upcoming-info">
              <div className="upcoming-title">{t.plant.name}</div>
              <div className="upcoming-sub">{t.freq || t.task}</div>
            </div>
            <div className={`upcoming-tag tag-${t.cls}`}>{t.task}</div>
          </div>
        ))
      }
      <div style={{ height:20 }}></div>
      <div className="section-title">Full year overview</div>
      <div className="legend">
        <span className="legend-item"><span className="dot dot-water"></span>Water</span>
        <span className="legend-item"><span className="dot dot-feed"></span>Fertilise</span>
        <span className="legend-item"><span className="dot dot-prune"></span>Prune</span>
      </div>
      <div className="cal-grid">
        {MONTHS.map((m, i) => {
          const w = plants.filter(p => (p.water?.months || []).includes(i)).length;
          const f = plants.filter(p => (p.feed?.months || []).includes(i)).length;
          const pr = plants.filter(p => (p.prune?.months || []).includes(i)).length;
          return (
            <div key={i} className={`cal-month${i === cm ? ' cal-now' : ''}`}>
              <div className="cal-month-name">{m}</div>
              <div className="cal-dots">
                {Array(w).fill(0).map((_, j) => <span key={`w${j}`} className="dot dot-water"></span>)}
                {Array(f).fill(0).map((_, j) => <span key={`f${j}`} className="dot dot-feed"></span>)}
                {Array(pr).fill(0).map((_, j) => <span key={`p${j}`} className="dot dot-prune"></span>)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Journal Tab ──────────────────────────────────────────
function JournalTab({ journal, plants, onDelete }) {
  if (journal.length === 0) return (
    <div className="empty-state"><i className="ti ti-notebook"></i><p>No journal entries yet.<br />Tap + to add your first note!</p></div>
  );
  return (
    <>
      <div className="section-title">Journal ({journal.length})</div>
      {[...journal].sort((a,b) => b.date.localeCompare(a.date)).map(e => {
        const plant = plants.find(p => p.id === e.plant_id);
        return (
          <div key={e.id} className="journal-entry">
            <div className="journal-header">
              <div className="journal-date">{formatDate(e.date)}</div>
              <button className="icon-btn danger" onClick={() => onDelete(e.id)} aria-label="Delete"><i className="ti ti-trash"></i></button>
            </div>
            <div className="journal-text">{e.text}</div>
            {plant && <div className="journal-plant"><i className="ti ti-leaf" aria-hidden="true"></i>{plant.name}</div>}
          </div>
        );
      })}
    </>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────
function DashboardTab({ plants, journal, cm, onViewPlant }) {
  const wCount = plants.filter(p => (p.water?.months || []).includes(cm)).length;
  const fCount = plants.filter(p => (p.feed?.months || []).includes(cm)).length;
  const prCount = plants.filter(p => (p.prune?.months || []).includes(cm)).length;
  const tasks = [];
  plants.forEach(p => {
    if ((p.water?.months || []).includes(cm)) tasks.push({ p, task:'Water', cls:'water', icon:'ti-droplet' });
    if ((p.feed?.months || []).includes(cm)) tasks.push({ p, task:'Fertilise', cls:'feed', icon:'ti-flask' });
    if ((p.prune?.months || []).includes(cm)) tasks.push({ p, task:'Prune', cls:'prune', icon:'ti-cut' });
  });
  const typeGroups = {};
  plants.forEach(p => { typeGroups[p.type || 'Other'] = (typeGroups[p.type || 'Other'] || 0) + 1; });
  return (
    <>
      <div className="section-title">Overview</div>
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{plants.length}</div><div className="stat-lbl">Total plants</div></div>
        <div className="stat-card"><div className="stat-val">{journal.length}</div><div className="stat-lbl">Journal entries</div></div>
        <div className="stat-card"><div className="stat-val">{wCount}</div><div className="stat-lbl">Watering this month</div></div>
        <div className="stat-card"><div className="stat-val">{fCount + prCount}</div><div className="stat-lbl">Other tasks this month</div></div>
      </div>
      <div className="section-title" style={{ marginTop:8 }}>Tasks this month — {MONTHS_FULL[cm]}</div>
      {tasks.length === 0
        ? <p style={{ color:'var(--text-muted)', fontSize:14 }}>Nothing scheduled for {MONTHS_FULL[cm]}.</p>
        : tasks.slice(0, 8).map((t, i) => (
          <div key={i} className="upcoming-item" style={{ cursor:'pointer' }} onClick={() => onViewPlant(t.p.id)}>
            <div className={`task-icon task-${t.cls}`}><i className={`ti ${t.icon}`} aria-hidden="true"></i></div>
            <div className="upcoming-info">
              <div className="upcoming-title">{t.p.name}</div>
              <div className="upcoming-sub">{t.p.location || ''}</div>
            </div>
            <div className={`upcoming-tag tag-${t.cls}`}>{t.task}</div>
          </div>
        ))
      }
      {Object.keys(typeGroups).length > 0 && (
        <>
          <div className="section-title" style={{ marginTop:16 }}>Plant types</div>
          <div className="type-grid">
            {Object.entries(typeGroups).map(([type, count]) => (
              <div key={type} className="type-pill"><span className="type-emoji">{count}</span><span className="type-name">{type}</span></div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── Plant Detail ─────────────────────────────────────────
function PlantDetail({ plant, journal, plantTab, setPlantTab, onBack, onEdit, onDelete, onAddPhoto, onAddJournal, onDeleteJournal, cm }) {
  const fileRef = React.useRef();
  if (!plant) return null;
  return (
    <>
      <button className="back-btn" onClick={onBack}><i className="ti ti-arrow-left" aria-hidden="true"></i> Back to plants</button>
      <div className="plant-hero">
        <div className="plant-hero-emoji">{plant.emoji || '🌱'}</div>
        <div>
          <div className="plant-hero-name">{plant.name}</div>
          {plant.latin && <div className="plant-hero-latin">{plant.latin}</div>}
          <div className="plant-hero-meta">{[plant.type, plant.location].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="tabs">
        {[['info','Info'],['calendar','Calendar'],['photos','Photos'],['journal','Journal']].map(([t,label]) => (
          <div key={t} className={`tab${plantTab === t ? ' active' : ''}`} onClick={() => setPlantTab(t)}>{label}{t === 'journal' && journal.length > 0 ? ` (${journal.length})` : ''}</div>
        ))}
      </div>
      {plantTab === 'info' && (
        <div>
          {[['Location', plant.location],['Added', formatDate(plant.created_at || plant.added)],['Watering', plant.water?.freq],['Fertilising', plant.feed?.freq]].map(([label, val]) => val && (
            <div key={label} className="info-row">
              <div className="info-label">{label}</div>
              <div className="info-val">{val}</div>
            </div>
          ))}
          {plant.water?.months?.length > 0 && <div className="info-row"><div className="info-label">Water months</div><div className="info-val">{plant.water.months.map(m => MONTHS[m]).join(', ')}</div></div>}
          {plant.feed?.months?.length > 0 && <div className="info-row"><div className="info-label">Fertilise months</div><div className="info-val">{plant.feed.months.map(m => MONTHS[m]).join(', ')}</div></div>}
          {plant.prune?.months?.length > 0 && <div className="info-row"><div className="info-label">Prune months</div><div className="info-val">{plant.prune.months.map(m => MONTHS_FULL[m]).join(', ')}</div></div>}
          {plant.notes && <div className="info-row"><div className="info-label">Notes</div><div className="info-val">{plant.notes}</div></div>}
          <div className="btn-row" style={{ marginTop:16 }}>
            <button className="btn-secondary" onClick={() => onEdit(plant)}><i className="ti ti-edit" aria-hidden="true"></i> Edit</button>
            <button className="btn-danger" onClick={() => onDelete(plant.id)}><i className="ti ti-trash" aria-hidden="true"></i> Delete</button>
          </div>
        </div>
      )}
      {plantTab === 'calendar' && (
        <div>
          <div className="legend">
            <span className="legend-item"><span className="dot dot-water"></span>Water</span>
            <span className="legend-item"><span className="dot dot-feed"></span>Fertilise</span>
            <span className="legend-item"><span className="dot dot-prune"></span>Prune</span>
          </div>
          <div className="cal-grid">
            {MONTHS.map((m, i) => {
              const w = (plant.water?.months || []).includes(i);
              const f = (plant.feed?.months || []).includes(i);
              const pr = (plant.prune?.months || []).includes(i);
              return (
                <div key={i} className={`cal-month${i === cm ? ' cal-now' : ''}`}>
                  <div className="cal-month-name">{m}</div>
                  <div className="cal-dots">
                    {w && <span className="dot dot-water"></span>}
                    {f && <span className="dot dot-feed"></span>}
                    {pr && <span className="dot dot-prune"></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {plantTab === 'photos' && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files[0] && onAddPhoto(plant.id, e.target.files[0])} />
          <button className="btn-primary" onClick={() => fileRef.current.click()} style={{ marginBottom:12 }}><i className="ti ti-camera" aria-hidden="true"></i> Add photo</button>
          {(!plant.photos || plant.photos.length === 0)
            ? <div className="empty-state" style={{ padding:'24px 0' }}><i className="ti ti-photo"></i><p>No photos yet.<br />Tap above to add one!</p></div>
            : <div className="photo-grid">{plant.photos.map((url, i) => <img key={i} src={url} alt={`${plant.name} ${i+1}`} className="photo-thumb" />)}</div>
          }
        </div>
      )}
      {plantTab === 'journal' && (
        <div>
          <button className="btn-primary" onClick={onAddJournal} style={{ marginBottom:12 }}><i className="ti ti-plus" aria-hidden="true"></i> Add entry</button>
          {journal.length === 0
            ? <div className="empty-state" style={{ padding:'24px 0' }}><i className="ti ti-notebook"></i><p>No entries for this plant yet.</p></div>
            : [...journal].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id} className="journal-entry">
                <div className="journal-header">
                  <div className="journal-date">{formatDate(e.date)}</div>
                  <button className="icon-btn danger" onClick={() => onDeleteJournal(e.id)}><i className="ti ti-trash"></i></button>
                </div>
                <div className="journal-text">{e.text}</div>
              </div>
            ))
          }
        </div>
      )}
    </>
  );
}

// ─── Plant Modal ──────────────────────────────────────────
function PlantModal({ plant, onSave, onClose }) {
  const [form, setForm] = useState({
    name: plant?.name || '',
    latin: plant?.latin || '',
    type: plant?.type || 'Shrub',
    emoji: plant?.emoji || '🌱',
    location: plant?.location || '',
    notes: plant?.notes || '',
    wfreq: plant?.water?.freq || '',
    wmonths: plant?.water?.months || [],
    ffreq: plant?.feed?.freq || '',
    fmonths: plant?.feed?.months || [],
    pmonths: plant?.prune?.months || [],
  });
  const toggle = (field, idx) => setForm(f => ({ ...f, [field]: f[field].includes(idx) ? f[field].filter(x => x !== idx) : [...f[field], idx].sort((a,b) => a-b) }));
  const handleSave = () => {
    if (!form.name.trim()) { alert('Please enter a plant name.'); return; }
    onSave({
      id: plant?.id || Date.now().toString(),
      name: form.name.trim(),
      latin: form.latin.trim(),
      type: form.type,
      emoji: form.emoji,
      location: form.location.trim(),
      notes: form.notes.trim(),
      water: { freq: form.wfreq.trim(), months: form.wmonths },
      feed: { freq: form.ffreq.trim(), months: form.fmonths },
      prune: { months: form.pmonths },
      photos: plant?.photos || [],
      created_at: plant?.created_at || new Date().toISOString(),
    });
  };
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle"></div>
        <div className="modal-title">{plant ? 'Edit Plant' : 'Add Plant'}</div>
        <div className="form-group"><label className="form-label">Plant name *</label><input className="form-input" placeholder="e.g. Rose" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">Latin / variety</label><input className="form-input" placeholder="e.g. Rosa gallica" value={form.latin} onChange={e => setForm(f => ({...f, latin: e.target.value}))} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div className="form-group"><label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
              {PLANT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Emoji</label>
            <select className="form-input" value={form.emoji} onChange={e => setForm(f => ({...f, emoji: e.target.value}))}>
              {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="e.g. South border" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">Watering frequency</label><input className="form-input" placeholder="e.g. Twice weekly" value={form.wfreq} onChange={e => setForm(f => ({...f, wfreq: e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">Watering months</label><MonthPicker selected={form.wmonths} onToggle={i => toggle('wmonths', i)} /></div>
        <div className="form-group"><label className="form-label">Fertilising frequency</label><input className="form-input" placeholder="e.g. Monthly in spring" value={form.ffreq} onChange={e => setForm(f => ({...f, ffreq: e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">Fertilising months</label><MonthPicker selected={form.fmonths} onToggle={i => toggle('fmonths', i)} /></div>
        <div className="form-group"><label className="form-label">Pruning months</label><MonthPicker selected={form.pmonths} onToggle={i => toggle('pmonths', i)} /></div>
        <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input form-textarea" placeholder="Care notes, observations…" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
        <button className="btn-primary" onClick={handleSave}>{plant ? 'Save changes' : 'Add plant'}</button>
        <button className="btn-secondary" style={{ width:'100%', marginTop:8 }} onClick={onClose}>Cancel</button>
        <div style={{ height:20 }}></div>
      </div>
    </div>
  );
}

function MonthPicker({ selected, onToggle }) {
  return (
    <div className="month-picker">
      {MONTHS.map((m, i) => (
        <button key={i} className={`month-btn${selected.includes(i) ? ' selected' : ''}`} onClick={() => onToggle(i)}>{m}</button>
      ))}
    </div>
  );
}

// ─── Journal Modal ────────────────────────────────────────
function JournalModal({ plants, defaultPlantId, onSave, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [plantId, setPlantId] = useState(defaultPlantId || '');
  const [text, setText] = useState('');
  const handleSave = () => {
    if (!text.trim()) { alert('Please write something!'); return; }
    onSave({ id: Date.now().toString(), date, plant_id: plantId || null, text: text.trim() });
  };
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle"></div>
        <div className="modal-title">New journal entry</div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Plant (optional)</label>
          <select className="form-input" value={plantId} onChange={e => setPlantId(e.target.value)}>
            <option value="">— General entry —</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Notes *</label><textarea className="form-input form-textarea" placeholder="What did you observe, do, or notice?" value={text} onChange={e => setText(e.target.value)} style={{ minHeight:120 }} /></div>
        <button className="btn-primary" onClick={handleSave}>Save entry</button>
        <button className="btn-secondary" style={{ width:'100%', marginTop:8 }} onClick={onClose}>Cancel</button>
        <div style={{ height:20 }}></div>
      </div>
    </div>
  );
}
