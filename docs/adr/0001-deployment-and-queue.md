# ADR 0001: Deployment dan Queue

Status: accepted
Tanggal: 2026-10-17

## Konteks

Repo sudah berjalan di Cloudflare Workers lewat OpenNext (`wrangler.toml`, `open-next.config.ts`) dengan cron trigger tiap menit yang memanggil `/api/cron/publish-scheduled`. Publish Threads saat ini berjalan sinkron di dalam request: polling container sampai 30 detik per post ditambah jeda 3 detik antar post (`lib/threads/publish.ts`). Chain 15 post bisa melewati time budget serverless.

Produk akan menjadi platform manajemen media sosial berbayar. Artinya:

- Trafik tidak lagi bisa dianggap kecil.
- Publish harus tahan retry dan tidak boleh dobel.
- Deployment gratis non-komersial tidak memenuhi syarat.

## Keputusan

1. **Cloudflare Workers Paid ($5/bulan)** sebagai runtime produksi.
2. **Postgres queue** di Supabase sebagai queue MVP, bukan layanan queue terpisah.
3. Semua akses queue melewati interface `QueueAdapter` (`lib/queue/types.ts`) agar penggantian backend tidak menyentuh domain logic.

### Bentuk queue MVP

`post_targets` berperan sebagai antrian. Cron tiap menit memanggil `/api/cron/tick`, yang mengklaim baris siap kirim secara atomik:

```sql
update post_targets
set status = 'publishing', locked_at = now(), attempts = attempts + 1
where id in (
  select id from post_targets
  where status = 'scheduled' and scheduled_for <= now()
  order by scheduled_for
  limit 10
  for update skip locked
)
returning *;
```

Kolom yang wajib ada di setiap target:

| Kolom | Fungsi |
|---|---|
| `idempotency_key` (unik) | Mencegah dua worker memproses target yang sama |
| `attempts`, `next_attempt_at` | Retry dengan exponential backoff dan jitter |
| `locked_at` | Deteksi worker mati (lease timeout) |
| `checkpoint` | Index segmen terakhir yang berhasil, untuk resume thread |
| `provider_state` | Data sementara provider (container id, upload id) |

Aturan eksekusi:

- Satu invocation cron mengerjakan maksimal 10 target dan berhenti sebelum 25 detik.
- Thread dipublish bertahap. Setiap segmen sukses menaikkan `checkpoint`, sehingga retry melanjutkan dari segmen gagal, bukan dari awal.
- Retry maksimal 5 kali. Setelah itu `status='failed'` dengan `error_code`, dan user melihat tombol retry manual.
- Semua waktu disimpan UTC.

## Konsekuensi

Positif:

- Tidak ada layanan baru untuk dioperasikan di MVP.
- Idempotency, retry, dan status bisa diperiksa langsung lewat SQL.
- Biaya infrastruktur awal sekitar $5/bulan.

Negatif:

- Throughput dibatasi oleh satu cron per menit. Untuk MVP (target < 100 publish/hari) ini cukup.
- Beban baca tulis tambahan ke Postgres.
- Perlu monitoring backlog: jika jumlah `scheduled` yang lewat waktu terus naik, pindah backend.

## Kapan pindah ke Cloudflare Queues

Pindah jika salah satu terpenuhi:

- Lebih dari 10.000 operasi queue per hari (batas nyaman free tier Queues).
- Backlog `scheduled` yang sudah lewat waktu konsisten di atas 2 menit.
- Butuh lebih dari 10 publish paralel per menit.
- Butuh retry lebih dari 24 jam (retensi pesan Queues).

Saat itu terjadi, buat implementasi `CloudflareQueueAdapter` dan ganti binding di composition root. Skema `post_targets` tetap dipakai sebagai sumber status.

## Alternatif yang ditolak

| Opsi | Alasan ditolak |
|---|---|
| Workers Free | CPU 10 ms per invocation, Next.js SSR akan gagal intermiten |
| Vercel Hobby | Lisensi Hobby hanya untuk proyek personal non-komersial |
| Vercel Pro ($20/bulan) | Empat kali biaya Workers tanpa keuntungan untuk stack ini |
| Inngest / Trigger.dev | Menambah vendor dan biaya sebelum ada trafik |
| BullMQ di VPS | Perlu server, Redis, dan operasi sendiri |
| Cloudflare Queues sekarang | Menambah sistem kedua padahal volume MVP masih kecil |
