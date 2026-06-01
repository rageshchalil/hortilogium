# 🌿 My Garden Journal — Setup Guide

A mobile-first PWA to track your plants, care schedules, photos, and journal entries.
Works on phone, tablet, and laptop. Installs to your home screen like a native app.
Protected by magic link login — only people you invite can access it.

---

## What you'll need (all free)

| Service | Purpose | Cost |
|---------|---------|------|
| [Vercel](https://vercel.com) | Hosting | Free |
| [Supabase](https://supabase.com) | Database + Auth | Free |
| [Cloudinary](https://cloudinary.com) | Photo storage | Free (25 GB) |
| [GitHub](https://github.com) | Deploy source | Free |

---

## Step 1 — Set up Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub
2. Click **New project**, give it a name (e.g. `garden-journal`), choose a region close to you (e.g. Europe West)
3. Once created, go to **SQL Editor** (left sidebar) and run this SQL:

```sql
-- Plants table (shared by whole household)
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

-- Journal table (shared by whole household)
create table journal (
  id text primary key,
  date date not null,
  plant_id text references plants(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- Require login to read/write (auth gate)
alter table plants enable row level security;
alter table journal enable row level security;

create policy "Authenticated users only" on plants
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated users only" on journal
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

4. Go to **Authentication → Settings** in Supabase and make sure **Enable email confirmations** is OFF (magic links handle this themselves).

5. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

---

## Step 2 — Invite household members

Only people with a Supabase account linked to your project can log in. To invite someone:

1. Go to **Authentication → Users** in Supabase
2. Click **Invite user** and enter their email
3. They'll receive an invite email — once accepted, they can use magic link login

Alternatively, just share the app URL — when they enter their email on the login screen,
Supabase will send them a magic link automatically (as long as their email is in your Users list).

---

## Step 3 — Set up Cloudinary (photos)

1. Go to [cloudinary.com](https://cloudinary.com) → **Sign up free**
2. From your dashboard, note your **Cloud name**
3. Go to **Settings → Upload → Upload presets** → click **Add upload preset**
4. Set:
   - Preset name: `garden-journal`
   - Signing mode: **Unsigned**
   - Folder: `garden-journal`
5. Click **Save**

---

## Step 4 — Deploy to Vercel

1. Push this folder to a new GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
3. In the **Environment Variables** section, add these four:

```
REACT_APP_SUPABASE_URL              = https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY         = your-anon-key
REACT_APP_CLOUDINARY_CLOUD_NAME     = your-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET  = garden-journal
```

4. Click **Deploy** — done!

---

## Step 5 — Install on your devices

### On your phone (iOS)
1. Open the app URL in **Safari**
2. Tap the **Share** button → **Add to Home Screen**

### On your phone (Android)
1. Open the URL in **Chrome**
2. Tap the **three-dot menu** → **Add to Home screen**

### On your laptop
1. Open the URL in **Chrome** or **Edge**
2. Click the install icon (⊕) in the address bar

---

## How login works

- Anyone who visits the app sees a login screen
- They enter their email address and tap "Send magic link"
- Supabase emails them a one-click link — no password needed
- Clicking the link signs them in and redirects back to the app
- They stay signed in on that device until they tap the sign-out button
- All household members share the same plants and journal — nothing is private per-user
