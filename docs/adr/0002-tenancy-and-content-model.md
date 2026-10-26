# ADR 0002: Tenancy dan Model Konten

Status: accepted
Tanggal: 2026-10-17

## Konteks

Skema saat ini mengikat semua data ke `user_id`:

- `saved_threads.tweets` menyimpan array JSONB berisi segmen thread.
- `scheduled_posts` menyimpan satu `threads_account_id` dan satu `reply_chain` berupa array teks.
- `threads_accounts` hanya untuk provider Threads.

Target produk adalah pengelolaan banyak akun dan banyak platform, dengan jalur dari solo creator menuju agency. Model sekarang tidak bisa menyatakan "satu konten dipublikasikan ke beberapa akun" tanpa menduplikasi baris konten.

## Keputusan

1. **Workspace-first.** Setiap baris konten dimiliki `workspace_id`, bukan `user_id`. Setiap user mendapat satu personal workspace saat migrasi.
2. **Konten dan target dipisah.** `content_items` menyimpan ide dan teks dasar, `post_targets` menyimpan satu baris per akun tujuan.
3. **Segmen disimpan relasional** di `content_segments`, bukan JSONB, agar bisa di-query dan divalidasi per platform.
4. **Media sebagai entitas** di `media_assets`, dihubungkan ke target lewat `post_target_media`.

### Bentuk inti

```text
workspaces
  id, name, slug, timezone, plan

workspace_members
  workspace_id, user_id, role

content_items
  id, workspace_id, created_by, title, base_text, status, tags, metadata

content_segments
  id, content_item_id, position, text

social_accounts
  id, workspace_id, provider, provider_account_id, username,
  access_token_enc, refresh_token_enc, token_expires_at, scopes, status

post_targets
  id, workspace_id, content_item_id, social_account_id,
  scheduled_for, timezone, status, content_override,
  idempotency_key, provider_post_id, provider_state, checkpoint,
  attempts, next_attempt_at, locked_at, error_code, error_message

media_assets
  id, workspace_id, storage_path, mime_type, width, height,
  size_bytes, alt_text, checksum

post_target_media
  post_target_id, media_asset_id, position
```

### Aturan yang mengikat

- `content_items` tidak menyimpan teks per platform. Perbedaan teks per platform disimpan di `post_targets.content_override` (JSONB) selama MVP.
- `content_override` divalidasi Zod saat dibaca dan ditulis. Jika varian per platform tumbuh melebihi teks dan media, pecah menjadi `post_variants`.
- Satu `content_item` boleh punya banyak `post_targets`, termasuk beberapa target di platform yang sama.
- `post_targets.idempotency_key` unik, dibentuk dari `content_item_id + social_account_id + scheduled_for`.
- Semua waktu UTC. `timezone` hanya untuk tampilan dan perhitungan slot.

### RLS

Semua tabel konten memakai helper `security definer`:

```sql
create function public.is_workspace_member(ws uuid, min_role text default 'viewer')
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and case min_role
            when 'viewer' then true
            when 'editor' then m.role in ('owner','admin','editor')
            when 'admin'  then m.role in ('owner','admin')
            when 'owner'  then m.role = 'owner'
          end
  );
$$;
```

Policy standar per tabel: `select` untuk member, `insert/update/delete` untuk editor ke atas, kecuali `workspaces` dan `workspace_members` yang butuh admin/owner. Service role hanya dipakai worker server, tidak pernah dikirim ke client.

## Konsekuensi

Positif:

- Satu konten bisa difan-out ke beberapa akun tanpa duplikasi.
- Query analytics per segmen dan per target menjadi mungkin.
- Jalur ke team/agency terbuka tanpa migrasi besar lagi.

Negatif:

- Migrasi data lama perlu backfill dan masa dual-read.
- RLS menjadi lebih kompleks, wajib ada test lintas tenant.
- UI harus selalu menyertakan workspace aktif, termasuk di endpoint API.

## Alternatif yang ditolak

| Opsi | Alasan ditolak |
|---|---|
| Tetap `user_id` + tabel target baru | Tidak mendukung team, dan tetap memaksa duplikasi konten |
| Menyimpan segmen sebagai JSONB di `content_items` | Tidak bisa di-join, sulit divalidasi, rawan drift |
| Workspace opsional | Dua jalur data yang harus diuji selamanya |
