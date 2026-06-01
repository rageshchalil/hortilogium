# 🌿 My Garden Journal — Setup Guide

A mobile-first PWA to track your plants, care schedules, photos, and journal entries.
Works on phone, tablet, and laptop. Installs to your home screen like a native app.

---

## What you'll need (all free)

| Service | Purpose | Cost |
|---------|---------|------|
| [Vercel](https://vercel.com) | Hosting | Free |
| [Supabase](https://supabase.com) | Database (sync across devices) | Free |
| [Cloudinary](https://cloudinary.com) | Photo storage | Free (25 GB) |
| [GitHub](https://github.com) | Deploy source | Free |

---

## Step 1 — Set up Supabase (database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub
2. Click **New project**, give it a name (e.g. `garden-journal`), choose a region close to you (e.g. Europe West)
3. Once created, go to **SQL Editor** (left sidebar) and run this SQL:

```sql
-- Plants table
create table plants (
  id text primary key,
  name text not null,
  latin text,
  type text,
  emoji text,
  location text,
  notes text,
  water jsonb,
  feed jsonb,
  prune jsonb,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Journal table
create table journal (
  id text primary key,
  date date not null,
  plant_id text references plants(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- Allow public read/write (personal app — you can add auth later)
alter table plants enable row level security;
alter table journal enable row level security;

create policy "Allow all" on plants for all using (true) with check (true);
create policy "Allow all" on journal for all using (true) with check (true);
```

4. Go to **Project Settings → API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon public** key → this is your `SUPABASE_ANON_KEY`

---

## Step 2 — Set up Cloudinary (photos)

1. Go to [cloudinary.com](https://cloudinary.com) → **Sign up free**
2. From your dashboard, note your **Cloud name**
3. Go to **Settings → Upload → Upload presets** → click **Add upload preset**
4. Set:
   - Preset name: `garden-journal`
   - Signing mode: **Unsigned**
   - Folder: `garden-journal`
5. Click **Save**

---

## Step 3 — Deploy to Vercel

1. Push this folder to a new GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
3. In the **Environment Variables** section, add these four variables:

```
REACT_APP_SUPABASE_URL         = https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY    = your-anon-key
REACT_APP_CLOUDINARY_CLOUD_NAME = your-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET = garden-journal
```

4. Click **Deploy** — done! Vercel gives you a URL like `https://garden-journal-abc123.vercel.app`

---

## Step 4 — Install on your devices

### On your phone (iOS)
1. Open the app URL in **Safari**
2. Tap the **Share** button → **Add to Home Screen**
3. The app icon appears on your home screen — it works like a native app!

### On your phone (Android)
1. Open the URL in **Chrome**
2. Tap the **three-dot menu** → **Add to Home screen** (or Chrome may show a banner)

### On your laptop
1. Open the URL in **Chrome** or **Edge**
2. Look for the **install icon** (⊕) in the address bar → click it
3. The app opens in its own window, with no browser chrome

---

## Using the app

### Plants tab
- Browse all your plants in a grid
- Search by name, type, or latin name
- Tap any plant to see its full profile

### Plant detail
- **Info** — all care details, edit or delete
- **Calendar** — visual month-by-month care schedule
- **Photos** — add photos from camera or gallery (requires Cloudinary)
- **Journal** — entries specific to this plant

### Calendar tab
- See everything due this month at a glance
- Full year overview with colour-coded dots (blue = water, amber = fertilise, red = prune)

### Journal tab
- Free-text notes, optionally linked to a plant
- All entries across all plants in one timeline

### Overview tab
- Summary stats and today's tasks

---

## Optional — Running locally

```bash
cd garden-journal
cp .env.example .env.local
# fill in your values in .env.local
npm install
npm start
```

App opens at http://localhost:3000

---

## Note on security

This app uses Supabase Row Level Security with open policies (anyone with the URL can read/write).
This is fine for a personal app. If you want to add login/password protection later,
Supabase has built-in Auth — just let me know and I can add it.
