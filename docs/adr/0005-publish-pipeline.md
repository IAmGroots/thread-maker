# ADR 0005: Publish Pipeline

Status: accepted
Tanggal: 2026-10-18

## Konteks

Publish Threads berjalan sebagai rantai balasan: satu container per post, lalu
`threads_publish`, dengan jeda dan polling di antara post. Satu rantai 15 post
bisa memakan beberapa menit.

Versi pertama menjalankan rantai di dalam request HTTP "publish now". Itu punya
tiga masalah:

1. Request bisa putus sebelum rantai selesai, dan pengguna tidak tahu hasilnya.
2. Cron bisa mengklaim target yang sama lebih dulu, sehingga route membalas
   gagal padahal post sedang atau sudah terbit.
3. Tidak ada progres; UI diam sampai seluruh rantai selesai.

## Keputusan

1. **Publish now bersifat asinkron.** Route membuat target, mengembalikan `202`
   dengan `targetId`, lalu worker mengerjakannya di latar belakang.
2. **Klien memantau lewat polling** `GET /api/targets/[id]` setiap 2 detik,
   maksimal 3 menit. Setelah itu UI menampilkan "masih diproses" dengan tautan
   ke antrean, bukan error.
3. **Klaim target atomik** tetap di `claim_post_target` / `claim_post_targets`.
   Hanya satu worker yang bisa memegang target.
4. **Checkpoint per post.** Setiap post yang berhasil menaikkan `checkpoint` dan
   memperbarui `locked_at` (heartbeat), sehingga retry melanjutkan dari post
   yang gagal, bukan dari awal.
5. **Kuota dikembalikan saat gagal total.** `fail_post_target` me-refund satu
   slot bila target berakhir `failed` dengan `checkpoint = 0`. Partial publish
   tidak di-refund karena sebagian konten sudah tayang.
6. **Token mati berhenti lebih awal.** Status akun `expired`/`revoked`
   menghasilkan kode `account_expired` tanpa retry, karena menunggu tidak akan
   memperbaikinya.
7. **Dua jadwal cron.** Setiap menit untuk antrean dan perawatan akun; setiap
   lima menit untuk insights. Dipisah agar sync analitik tidak menunda publish.

## Konsekuensi

Positif:

- Request publish selesai dalam hitungan detik, apa pun panjang rantainya.
- Tidak ada lagi balapan antara tombol publish dan cron.
- Retry tidak menduplikasi post yang sudah terbit.
- Pengguna melihat progres nyata.

Negatif:

- Butuh satu endpoint status tambahan dan polling di klien.
- Bila `ctx.waitUntil` tidak tersedia (mis. bukan Cloudflare), publish menunggu
  cron berikutnya, jadi hingga sekitar 60 detik.
- Kuota refund menambah satu operasi tulis pada jalur gagal.

## Alternatif yang ditolak

| Opsi | Alasan ditolak |
|---|---|
| Tetap sinkron dengan batas 5 post | Rantai panjang tetap memblokir request |
| WebSocket/SSE untuk progres | Infrastruktur tambahan untuk kebutuhan yang jarang |
| Satu task queue per post | Perubahan model data besar; ditunda sampai volume menuntut |
