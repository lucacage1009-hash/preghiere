# Configurazione Cappella delle Intenzioni

Segui questi 5 passi per attivare le intenzioni condivise.

---

## Passo 1 — Crea un account Supabase gratuito

Vai su https://supabase.com e clicca "Start your project" (gratis, no carta di credito).

---

## Passo 2 — Crea un nuovo progetto

- Clicca "New project"
- Dagli un nome (es. `amdg-preghiere`)
- Scegli una password per il database
- Scegli la regione `Europe West` (Frankfurt)
- Clicca "Create new project" e aspetta 1-2 minuti

---

## Passo 3 — Crea la tabella `intentions`

Nel pannello Supabase, clicca su **SQL Editor** nel menu a sinistra, poi incolla e lancia questo codice:

```sql
-- Crea la tabella
create table intentions (
  id         uuid default gen_random_uuid() primary key,
  testo      text not null check (char_length(testo) <= 400),
  created_at timestamptz default now()
);

-- Permetti a chiunque di leggere e scrivere (anonimo)
alter table intentions enable row level security;

create policy "Lettura pubblica"
  on intentions for select
  using (true);

create policy "Scrittura pubblica"
  on intentions for insert
  with check (true);
```

Clicca **Run**.

---

## Passo 4 — Copia le tue credenziali

Nel pannello Supabase:
1. Clicca su **Project Settings** (ingranaggio in basso a sinistra)
2. Clicca **API**
3. Copia:
   - **Project URL** (es. `https://abcxyzabc.supabase.co`)
   - **anon / public** key (la chiave lunga)

---

## Passo 5 — Incollali in app.js

Apri `app.js` nel repository GitHub e modifica le prime due righe:

```javascript
var SUPABASE_URL = 'https://TUOURL.supabase.co';   // <-- incolla qui
var SUPABASE_KEY = 'eyJhbGci...';                   // <-- incolla qui
```

Salva (Commit changes). Fatto!

---

## Risultato

- Chiunque visiti il sito potra' scrivere la propria intenzione di preghiera
- Le intenzioni di tutti appaiono nella "Cappella comune"
- Il piano gratuito di Supabase supporta fino a 50.000 righe e 500 MB
