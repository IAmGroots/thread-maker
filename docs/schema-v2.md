# Skema v2

Rancangan database untuk platform multi-akun. Dokumen ini adalah acuan untuk migrasi di Phase 1, bukan migrasi yang sudah dijalankan.

> **Status Phase 1–3:** sudah ada di migrasi: `workspaces`, `workspace_members`, `social_accounts`, `content_items`, `content_segments`, `media_assets`, `post_targets`, `post_target_media`, `publish_attempts` (0004), `analytics_snapshots`, `notifications`, `usage_counters` (0005), serta `subscriptions`, `invoices`, `payment_events` (0006). Tabel `workspace_invites` dan `audit_logs` belum dibuat; itu masuk Phase 7.

Konvensi:

- Semua primary key `uuid` dengan `gen_random_uuid()`.
- Semua timestamp `timestamptz`, disimpan UTC.
- Semua tabel konten memiliki `workspace_id` dan RLS.
- Uang disimpan sebagai integer rupiah, tanpa desimal.
- Status memakai `text` dengan `check` constraint, bukan enum Postgres, agar penambahan nilai tidak butuh migrasi tipe.

## Identitas dan tenancy

```sql
workspaces (
  id uuid pk,
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Jakarta',
  plan text not null default 'free' check (plan in ('free','starter','creator','pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

workspace_members (
  workspace_id uuid fk workspaces on delete cascade,
  user_id uuid fk auth.users on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  pk (workspace_id, user_id)
)

workspace_invites (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  email citext not null,
  role text not null check (role in ('admin','editor','viewer')),
  token text not null unique,
  invited_by uuid fk auth.users,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
)
```

Invite belum dipakai di MVP. Tabel disiapkan agar Phase 7 tidak perlu mengubah tabel lain.

## Akun sosial

```sql
social_accounts (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  provider text not null check (provider in ('threads','instagram','facebook','pinterest','tiktok')),
  provider_account_id text not null,
  username text not null,
  display_name text,
  avatar_url text,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','expired','revoked','error')),
  metadata jsonb not null default '{}',
  connected_by uuid fk auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id)
)

create index social_accounts_workspace_idx on social_accounts (workspace_id, provider);
create index social_accounts_refresh_idx on social_accounts (status, token_expires_at)
  where status = 'active';
```

Token disimpan terenkripsi AES-GCM. `metadata` menampung data khusus provider (page id, board list, business id) dan tidak pernah dikirim ke client tanpa filter.

## Konten

```sql
content_items (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  created_by uuid fk auth.users,
  title text not null default '',
  base_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft','scheduled','published','partial','failed')),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  legacy_saved_thread_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

content_segments (
  id uuid pk,
  content_item_id uuid fk content_items on delete cascade,
  position int not null,
  text text not null,
  created_at timestamptz not null default now(),
  unique (content_item_id, position)
)

media_assets (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  storage_path text not null,
  mime_type text not null,
  width int,
  height int,
  duration_ms int,
  size_bytes bigint not null,
  alt_text text,
  checksum text,
  created_by uuid fk auth.users,
  created_at timestamptz not null default now()
)
```

`content_items.status` adalah ringkasan. Status sebenarnya ada di `post_targets`. Nilai ringkasan dihitung ulang setelah setiap perubahan target.

## Target publish (queue)

```sql
post_targets (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  content_item_id uuid fk content_items on delete cascade,
  social_account_id uuid fk social_accounts on delete cascade,
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Jakarta',
  status text not null default 'scheduled'
    check (status in ('draft','scheduled','publishing','published','partial','failed','canceled')),
  content_override jsonb not null default '{}',
  idempotency_key text not null unique,
  provider_post_id text,
  provider_url text,
  provider_state jsonb not null default '{}',
  checkpoint int not null default 0,
  attempts int not null default 0,
  next_attempt_at timestamptz,
  locked_at timestamptz,
  error_code text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

create index post_targets_due_idx
  on post_targets (scheduled_for)
  where status = 'scheduled';

create index post_targets_workspace_idx
  on post_targets (workspace_id, scheduled_for desc);

post_target_media (
  post_target_id uuid fk post_targets on delete cascade,
  media_asset_id uuid fk media_assets on delete cascade,
  position int not null default 0,
  pk (post_target_id, media_asset_id)
)

publish_attempts (
  id uuid pk,
  post_target_id uuid fk post_targets on delete cascade,
  attempt int not null,
  status text not null check (status in ('started','succeeded','failed')),
  request_id text,
  response jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
)
```

`post_targets_due_idx` adalah index utama worker. `idempotency_key` dibentuk dari `content_item_id + social_account_id + scheduled_for` sehingga klik ganda pada waktu yang sama tidak menghasilkan dua target.

## Analytics

```sql
analytics_snapshots (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  social_account_id uuid fk social_accounts on delete cascade,
  provider_post_id text not null,
  captured_at timestamptz not null default now(),
  impressions bigint,
  reach bigint,
  likes int,
  comments int,
  shares int,
  saves int,
  clicks int,
  video_views bigint,
  engagement_rate numeric(6,4),
  raw jsonb not null default '{}',
  unique (social_account_id, provider_post_id, captured_at)
)

create index analytics_snapshots_lookup_idx
  on analytics_snapshots (workspace_id, captured_at desc);
```

Snapshot disimpan per pengambilan, bukan di-upsert. Dashboard membaca agregat dari rentang tanggal. Retensi data mengikuti paket dan dihapus oleh job harian.

## Billing

```sql
subscriptions (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade unique,
  provider text not null default 'pakasir',
  plan text not null check (plan in ('free','starter','creator','pro')),
  billing_period text not null default 'monthly'
    check (billing_period in ('monthly','semiannual')),
  status text not null default 'active'
    check (status in ('active','past_due','canceled','expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  grace_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

invoices (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  order_id text not null unique,
  plan text not null,
  billing_period text not null default 'monthly',
  amount int not null,
  status text not null default 'pending'
    check (status in ('pending','paid','expired','canceled')),
  provider text not null default 'pakasir',
  provider_txn_id text,
  payment_link text,
  qr_string text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
)

create index invoices_workspace_idx on invoices (workspace_id, created_at desc);

payment_events (
  id uuid pk,
  provider text not null,
  provider_txn_id text not null unique,
  order_id text not null,
  amount int not null,
  status text not null,
  is_sandbox boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz not null default now()
)

usage_counters (
  workspace_id uuid fk workspaces on delete cascade,
  period text not null,
  metric text not null check (metric in ('scheduled_posts','ai_credits','storage_bytes')),
  value bigint not null default 0,
  updated_at timestamptz not null default now(),
  pk (workspace_id, period, metric)
)
```

`usage_counters` di-increment dengan `insert ... on conflict do update set value = value + excluded.value`, sehingga aman terhadap request bersamaan.

## Notifikasi dan audit

```sql
notifications (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  user_id uuid fk auth.users on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  params jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
)

create index notifications_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

audit_logs (
  id uuid pk,
  workspace_id uuid fk workspaces on delete cascade,
  actor_id uuid fk auth.users,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
)
```

`audit_logs` hanya insert. Tidak ada policy update atau delete.

## RLS ringkas

| Tabel | select | insert/update/delete |
|---|---|---|
| `workspaces` | member | admin/owner |
| `workspace_members` | member | admin/owner |
| `workspace_invites` | admin/owner | admin/owner |
| `social_accounts` | member | admin/owner |
| `content_items`, `content_segments` | member | editor ke atas |
| `media_assets` | member | editor ke atas |
| `post_targets`, `post_target_media` | member | editor ke atas |
| `publish_attempts` | member | service role saja |
| `analytics_snapshots` | member | service role saja |
| `subscriptions`, `invoices`, `payment_events`, `usage_counters` | member (read) | service role saja |
| `notifications` | milik user | milik user |
| `audit_logs` | admin/owner | service role saja |

Semua policy memakai `public.is_workspace_member(workspace_id, '<role>')`.

## Tabel lama selama migrasi

`saved_threads`, `scheduled_posts`, `thread_publishes`, `threads_accounts` dipertahankan read-only setelah cutover, minimal 30 hari, untuk rollback dan audit. Kolom `legacy_*` di skema baru menyimpan id asal.
