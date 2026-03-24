# SETUP Supabase — AMDG

## 1. Crea account e progetto su supabase.com (gratis)

## 2. Disabilita conferma email
Settings → Authentication → Email → **Disable email confirmations** ✓

Questo permette l'accesso diretto senza mail di conferma.

## 3. SQL Editor → New query → incolla ed esegui:

```sql
-- Intenzioni
create table intentions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  text text not null check (char_length(text) <= 500),
  done boolean default false,
  created_at timestamptz default now()
);
alter table intentions enable row level security;
create policy "own" on intentions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Appunti
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;
create policy "own" on notes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Preghiere personalizzate
create table settings (
  user_id uuid primary key references auth.users,
  prayers jsonb,
  updated_at timestamptz default now()
);
alter table settings enable row level security;
create policy "own" on settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Streak
create table streak (
  user_id uuid primary key references auth.users,
  visits text[] default '{}',
  updated_at timestamptz default now()
);
alter table streak enable row level security;
create policy "own" on streak for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
```

## 4. Settings → API → copia in config.js:
- Project URL → SUPABASE_URL
- anon/public key → SUPABASE_KEY

## 5. Opzionale: blocca nuove registrazioni dopo aver creato il tuo account
Settings → Authentication → Email → **Disable Signups**
