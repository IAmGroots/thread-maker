# Rencana Migrasi ke Skema v2

> **Status Phase 1–3:** langkah 1 sampai 4 sudah diimplementasikan di `supabase/migrations/0004_workspace_schema_v2.sql` (tabel, RLS, helper workspace, backfill, mirror trigger, queue functions, storage bucket). Migrasi `0008_analytics_notifications_usage.sql` menambahkan analytics, notifikasi, usage counters, dan pencarian library di SQL. Migrasi `0006_billing.sql` menambahkan subscriptions, invoices, payment events, dan fungsi billing. Dual-write dan cutover penuh belum dijalankan: `saved_threads` masih menjadi sumber pustaka dan dicerminkan ke `content_items` lewat trigger, sementara jadwal, publish, analitik, dan billing sudah memakai tabel baru. Langkah 6 sampai 8 di bawah tetap menjadi acuan untuk fase berikutnya.

Migrasi dijalankan di Phase 1, setelah Phase 0 selesai. Setiap langkah punya rollback. Tidak ada langkah yang menghapus data lama sampai cutover dinyatakan stabil.

## Prasyarat

- Backup penuh database sebelum mulai (`pg_dump` ke storage terpisah).
- Migrasi baru bernomor lanjut dari `0003_schedule_saved_link.sql`.
- Feature flag `SCHEMA_V2_READ` dan `SCHEMA_V2_WRITE` untuk dual-read dan dual-write.
- Test lintas tenant tersedia dan lulus sebelum migrasi dijalankan di produksi.

## Langkah

### 1. Tambah skema baru (tanpa mengubah data lama)

Buat semua tabel v2, index, dan policy RLS. Tidak ada perubahan pada tabel lama. Aplikasi masih membaca dan menulis ke skema lama.

Rollback: drop tabel baru.

### 2. Backfill workspace

Untuk setiap baris `auth.users` atau `profiles`:

- Buat satu baris `workspaces` dengan `name` = nama profil, `slug` = slug unik dari email.
- Buat `workspace_members` dengan role `owner`.
- Simpan pemetaan `user_id -> workspace_id` di tabel sementara `migration_user_workspace`.

Catat jumlah user sebelum dan sesudah. Jumlah harus sama.

Rollback: truncate tabel v2.

### 3. Backfill akun sosial

Pindahkan `threads_accounts` ke `social_accounts`:

| Lama | Baru |
|---|---|
| `user_id` | `workspace_id` lewat pemetaan |
| `threads_user_id` | `provider_account_id` |
| `username` | `username` |
| `access_token` | `access_token_enc` (sudah terenkripsi, salin apa adanya) |
| `token_expires_at` | `token_expires_at` |
| `is_active` | `status` (`active` atau `revoked`) |

Verifikasi: jumlah baris `social_accounts` dengan `provider='threads'` sama dengan jumlah `threads_accounts`.

Catatan: token yang disalin tetap bisa didekripsi karena kunci tidak berubah. Jangan pernah men-dekripsi lalu menyimpan ulang dalam bentuk plaintext selama migrasi.

### 4. Backfill konten

Untuk setiap `saved_threads`:

- Buat `content_items` dengan `legacy_saved_thread_id` diisi.
- `base_text` = gabungan teks segmen dengan pemisah baris kosong.
- Pecah `tweets` (JSONB) menjadi baris `content_segments`, urut berdasarkan `order`.
- `tags`, `is_favorite`, dan `notes` dipindahkan ke `tags` dan `metadata`.

Validasi per baris:

- Jumlah `content_segments` harus sama dengan panjang array `tweets` setelah filter teks kosong.
- Jumlah karakter total harus sama dengan `total_chars` lama, kecuali baris lama yang sudah tidak konsisten. Baris tidak konsisten dicatat di `migration_report`.

Rollback: hapus `content_items` yang punya `legacy_saved_thread_id`, lalu kosongkan `content_segments`.

### 5. Backfill target dan riwayat

`scheduled_posts` menjadi `post_targets`:

| Lama | Baru |
|---|---|
| `user_id` | `workspace_id` lewat pemetaan |
| `threads_account_id` | `social_account_id` lewat pemetaan akun |
| `reply_chain` (array teks) | `content_override.segments` selama migrasi |
| `scheduled_for` | `scheduled_for` |
| `status` | `status`, dengan `draft` dipetakan ke `draft` |
| `threads_post_id` | `provider_post_id` |
| `attempts` | `attempts` |

`scheduled_posts` tidak punya `content_item_id`. Buat satu `content_item` per baris dengan `legacy_saved_thread_id` null dan `metadata.migrated_from = 'scheduled_posts'`, lalu hubungkan.

`thread_publishes` menjadi `publish_attempts` dengan `status='succeeded'`, ditambah pengisian `post_targets.provider_post_id` bila target terkait ditemukan.

Verifikasi: jumlah `post_targets` sama dengan jumlah `scheduled_posts`. Jumlah `publish_attempts` sama dengan jumlah `thread_publishes`.

### 6. Dual-write

Aplikasi menulis ke skema lama dan baru. Skema lama tetap sumber kebenaran untuk pembacaan. Setiap penulisan baru memeriksa hasilnya di skema baru lewat job rekonsiliasi per jam.

Durasi: minimal 7 hari tanpa selisih.

Rollback: matikan flag `SCHEMA_V2_WRITE`. Skema lama tidak pernah berhenti ditulis selama tahap ini.

### 7. Cutover baca

Aktifkan `SCHEMA_V2_READ`. Skema baru menjadi sumber kebenaran. Skema lama berhenti ditulis.

Pemeriksaan setelah cutover:

- Publish Threads berhasil minimal 20 kali berturut-turut.
- Tidak ada error 500 pada endpoint konten.
- Jumlah konten, target, dan akun cocok dengan laporan rekonsiliasi terakhir.

Rollback: matikan `SCHEMA_V2_READ` dan `SCHEMA_V2_WRITE`, kembali ke skema lama. Data yang ditulis selama jendela cutover disalin balik lewat job rekonsiliasi terbalik.

### 8. Pensiunkan tabel lama

Setelah 30 hari stabil:

- Rename tabel lama dengan akhiran `_legacy`.
- Cabut akses tulis.
- Hapus setelah satu siklus backup penuh.

## Yang tidak dimigrasi

- Analytics historis: platform tidak menyediakan data sebelum integrasi. Snapshot dimulai dari post baru.
- Riwayat login dan audit: belum ada di skema lama.
- Preferensi tema dan bahasa: tetap di perangkat pengguna.

## Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Segmen hilang saat pemecahan JSONB | Hitung ulang jumlah segmen dan total karakter per baris, laporkan selisih |
| Token tidak bisa didekripsi | Uji dekripsi sampel 5 token sebelum backfill |
| Target ganda akibat `idempotency_key` | Bentuk kunci dari kombinasi kolom, tangani konflik dengan `on conflict do nothing` lalu laporkan |
| Downtime | Tidak perlu downtime; semua langkah aditif sampai cutover |
| Rollback setelah data baru ditulis | Job rekonsiliasi dua arah disiapkan sebelum cutover |

## Laporan migrasi

Setiap eksekusi menulis `migration_report` berisi:

- Jumlah baris sumber dan hasil per tabel.
- Baris yang dilewati beserta alasannya.
- Selisih karakter dan segmen.
- Waktu mulai dan selesai per langkah.

Laporan disimpan di tabel `migration_report` dan diekspor ke `docs/migration-runs/` setelah dijalankan.
