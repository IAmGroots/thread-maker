# Paket dan Harga

Keputusan MVP. Semua harga dalam rupiah, ditagih bulanan lewat Pakasir.

## Paket

| | Free | Starter | Creator | Pro |
|---|---|---|---|---|
| Harga per bulan | 0 | 49.000 | 89.000 | 149.000 |
| Akun Threads | 1 | 2 | 4 | 8 |
| Post terjadwal per bulan | 10 | 60 | 200 | 600 |
| AI credits per bulan | 30 | 150 | 400 | 900 |
| Media storage | 100 MB | 1 GB | 3 GB | 8 GB |
| Retensi analytics | 7 hari | 30 hari | 90 hari | 180 hari |
| Anggota tim | 1 | 1 | 1 | 1 |
| Metode bayar | tidak ada | QRIS | QRIS, VA | QRIS, VA |
| Dukungan | komunitas | email | email | email prioritas |

Paket Studio (299.000) ditampilkan sebagai "segera hadir" di halaman harga dan baru diaktifkan bersama fitur tim di Phase 7.

Paket 6 bulan disiapkan di skema (`billing_period`) tetapi tidak masuk MVP.

## Aturan penegakan

- Limit diperiksa di API, bukan hanya di UI.
- `scheduled_posts` dihitung saat target masuk status `scheduled`, bukan saat publish.
- `ai_credits` dipotong per request yang berhasil. Request gagal karena kesalahan penyedia tidak memotong credit.
- Saran topik tidak memotong credit: composer memanggilnya sendiri saat dibuka. Route itu tetap kena rate limit dan wajib login.
- `scheduled_posts` dipotong saat target dibuat. Bila target gagal **sebelum satu post pun terkirim**, slot dikembalikan otomatis (`fail_post_target`, migrasi `0014`). Publish sebagian dan pembatalan manual tidak me-refund karena konten sudah tayang atau slot sudah terpakai.
- Storage dihitung dari total `media_assets.size_bytes` per workspace.
- Saat limit tercapai, API mengembalikan 402 dengan pesan yang menyebut paket yang dibutuhkan.

### Sumber kebenaran limit

Limit didefinisikan di dua tempat yang harus tetap sama:

- `lib/billing/credits.ts`, untuk tampilan dan pemeriksaan di UI.
- `public.plan_limit(plan, metric)` di migrasi `0008_analytics_notifications_usage.sql`, untuk penegakan.

`consume_usage` mengambil limit dari `plan_limit` berdasarkan paket workspace, bukan dari parameter pemanggil, sehingga client tidak bisa menaikkan batasnya sendiri. Penambahan paket baru harus mengubah keduanya.

## Kalibrasi AI credits

Angka credit di atas masih placeholder. Sebelum launch Phase 3:

1. Catat `prompt_tokens` dan `completion_tokens` dari setiap respons gateway.
2. Hitung biaya rata-rata per generate, transform, adjust, regenerate, dan suggest-topics.
3. Tetapkan 1 credit setara satu operasi generate standar.
4. Pastikan harga paket menutup biaya AI pada pemakaian 80% kuota.

Jangan mengunci angka credit sebelum langkah ini selesai. Lebih aman mulai konservatif.

## Siklus pembayaran

- Invoice dibuat 7 hari sebelum periode berakhir.
- Reminder in-app H-7 dan H-1.
- Grace period 3 hari setelah periode berakhir.
- Setelah grace, workspace turun ke Free. Konten dan akun tidak dihapus.
- Tidak ada auto-charge. Pembayaran selalu manual lewat link Pakasir.

## Implementasi billing

- `subscriptions` menyimpan paket aktif, status, periode, dan `grace_until`.
- `invoices` menyimpan `order_id` unik, nominal, status, dan link pembayaran.
- `payment_events` menyimpan `txn_id` unik agar webhook yang diulang tidak menambah periode dua kali.
- `apply_paid_invoice()` idempoten: order yang sudah `paid` tidak memperpanjang periode lagi.
- Perpanjangan dihitung dari `current_period_end` terakhir, bukan dari tanggal bayar, sehingga membayar lebih awal tidak memotong hari.
- `expire_due_subscriptions()` dijalankan dari cron dan menurunkan paket ke Free setelah grace.
- `create_expiry_reminders()` mengirim notifikasi in-app H-7 dan H-1 sebelum periode berakhir. Email belum dikirim karena belum ada penyedia email.
- Trial Creator 7 hari, satu kali per workspace, dengan grace 3 hari.
- Pembatalan mempertahankan akses sampai akhir periode dan grace.
- Harga dan limit diambil dari database (`plan_price`, `plan_limit`), bukan dari body request.

## Fee

Fee ditanggung merchant.

| Paket | Fee QRIS | Bersih QRIS | Fee VA | Bersih VA |
|---|---|---|---|---|
| Starter | 653 | 48.347 | 3.500 | 45.500 |
| Creator | 933 | 88.067 | 3.500 | 85.500 |
| Pro | 1.490 | 147.510 | 3.500 | 145.500 |

VA tidak ditampilkan untuk Starter karena fee flat memakan 7,1% margin.
