import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Plants ──────────────────────────────────────────────
export async function fetchPlants() {
  if (!supabase) return getLocal('gj_plants', []);
  const { data, error } = await supabase.from('plants').select('*').order('created_at');
  if (error) { console.error(error); return getLocal('gj_plants', []); }
  return data;
}

export async function upsertPlant(plant) {
  if (!supabase) { saveLocal('gj_plants', p => p.map(x => x.id === plant.id ? plant : x).concat(p.some(x => x.id === plant.id) ? [] : [plant])); return plant; }
  const { data, error } = await supabase.from('plants').upsert(plant).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlantDb(id) {
  if (!supabase) { saveLocal('gj_plants', p => p.filter(x => x.id !== id)); return; }
  await supabase.from('plants').delete().eq('id', id);
}

// ── Journal ──────────────────────────────────────────────
export async function fetchJournal() {
  if (!supabase) return getLocal('gj_journal', []);
  const { data, error } = await supabase.from('journal').select('*').order('date', { ascending: false });
  if (error) { console.error(error); return getLocal('gj_journal', []); }
  return data;
}

export async function insertJournalEntry(entry) {
  if (!supabase) { saveLocal('gj_journal', j => [...j, entry]); return entry; }
  const { data, error } = await supabase.from('journal').insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id) {
  if (!supabase) { saveLocal('gj_journal', j => j.filter(x => x.id !== id)); return; }
  await supabase.from('journal').delete().eq('id', id);
}

// ── Photos via Cloudinary ────────────────────────────────
export async function uploadPhoto(file, plantId) {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary not configured');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', `garden-journal/${plantId}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.secure_url;
}

// ── Local storage helpers (fallback when Supabase not set up) ──
function getLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function saveLocal(key, updater) {
  try {
    const current = getLocal(key, []);
    localStorage.setItem(key, JSON.stringify(updater(current)));
  } catch(e) { console.error(e); }
}
