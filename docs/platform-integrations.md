# Integrasi Platform

Status per Oktober 2026. Angka batas dan ketentuan review berubah tanpa pemberitahuan, jadi setiap baris yang ditandai **verifikasi** harus dicek ke dokumentasi resmi sebelum implementasi dimulai.

Legenda keyakinan: **T** tinggi (dokumentasi stabil), **S** sedang (perlu dicek), **R** rendah (sering berubah).

## Ringkasan

| Platform | Teks | Gambar | Video | Carousel | Thread | Analytics | Media wajib |
|---|---|---|---|---|---|---|---|
| Threads | ya | ya | ya | ya | ya | ya | tidak |
| Instagram | tidak | ya | ya | ya | tidak | ya | ya |
| Facebook Pages | ya | ya | ya | tidak | tidak | ya | tidak |
| Pinterest | tidak | ya | ya | tidak | tidak | ya | ya |
| TikTok | tidak | ya (foto) | ya | ya | tidak | ya | ya |

## Threads

| Aspek | Detail | Keyakinan |
|---|---|---|
| Publish | Dua langkah: buat container, lalu `threads_publish`. Chain memakai `reply_to_id`. | T |
| Auth | OAuth 2.0 lewat Meta. Scope `threads_basic`, `threads_content_publish`, `threads_manage_insights` untuk analytics. | T |
| Token | Long-lived sekitar 60 hari, bisa di-refresh. | T |
| Media | Gambar dan video, diproses sebagai container. | T |
| Batas teks | 500 karakter per post. | T |
| Batas chain | Maksimal 15 post per chain di implementasi saat ini. | S |
| Rate limit | Sekitar 250 post per 24 jam per akun. | S |
| Review | Content publishing butuh Meta app review. | S |
| Catatan | Teks, satu gambar per thread, dan insights (views, likes, replies, reposts, quotes) sudah diimplementasikan. Publish berjalan asinkron lewat antrean; klien memantau target. Media hanya JPEG/PNG karena Threads menolak WebP sebagai `image_url`. Insights butuh scope `threads_manage_insights`, jadi akun lama harus dihubungkan ulang. | T |

## Instagram

| Aspek | Detail | Keyakinan |
|---|---|---|
| Publish | Container lalu `media_publish`. | T |
| Auth | Instagram Business atau Creator, terhubung ke Facebook Page. Scope `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`. | T |
| Token | Sekitar 60 hari, refresh lewat long-lived token. | S |
| Media | JPEG untuk gambar, MP4/MOV untuk video. Rasio aspek dan ukuran punya aturan per tipe. | T |
| Teks | Caption wajib disertai media. Tidak ada post teks saja. | T |
| Rate limit | Sekitar 25 post per 24 jam per akun. | S |
| Review | Meta app review dan business verification. | S |
| Catatan | Media pipeline harus ada sebelum adapter ini dikerjakan. | T |

## Facebook Pages

| Aspek | Detail | Keyakinan |
|---|---|---|
| Publish | Graph API langsung ke Page, bukan profil pribadi. | T |
| Auth | Page access token. Scope `pages_manage_posts`, `pages_read_engagement`. | T |
| Token | Page token turunan dari user token. Perlu refresh berkala. | S |
| Media | Gambar, video, link preview. | T |
| Rate limit | Berbasis Business Use Case per user dan per Page. | S |
| Review | Meta app review. | S |
| Catatan | Profil pribadi tidak boleh diposting lewat API. Batasan ini permanen, bukan sementara. | T |

## Pinterest

| Aspek | Detail | Keyakinan |
|---|---|---|
| Publish | Pin dibuat langsung dengan gambar atau video, ditambah judul, deskripsi, dan link. | S |
| Auth | OAuth 2.0. Scope `pins:write`, `pins:read`, `boards:read`, `user_accounts:read`. | S |
| Token | Access token dengan refresh token. | S |
| Media | Gambar atau video wajib. Pin butuh board tujuan. | T |
| Rate limit | Berbasis aplikasi dan pengguna. | S |
| Review | Standard access review. | S |
| Catatan | User harus memilih board. Simpan daftar board di `social_accounts.metadata`. | S |

## TikTok

| Aspek | Detail | Keyakinan |
|---|---|---|
| Publish | Direct post atau upload ke inbox. Direct post butuh audit. | S |
| Auth | OAuth 2.0 PKCE. Scope `video.publish`, `video.upload`, `user.info.basic`. | S |
| Token | Access token pendek (sekitar 24 jam), refresh token lebih panjang. | R |
| Media | Video MP4/MOV. Foto carousel didukung pada sebagian akun. | S |
| Rate limit | Sekitar 6 post per 24 jam per pengguna. | R |
| Review | Content Posting API audit. Tanpa audit, post hanya bisa private atau masuk inbox. | S |
| Catatan | Sediakan fallback upload ke inbox agar user tetap bisa menyelesaikan posting manual. Jangan menjanjikan direct post sebelum audit disetujui. | S |

## Urutan implementasi

| Tahap | Provider | Prasyarat |
|---|---|---|
| MVP | Threads | Selesai |
| Pasca-MVP 1 | Instagram, Facebook | Media pipeline, Meta app review |
| Pasca-MVP 2 | Pinterest | Media pipeline, board selection |
| Pasca-MVP 3 | TikTok | Video pipeline, audit, fallback inbox |

Alasan urutan: Threads sudah berjalan. Instagram dan Facebook berbagi satu app Meta sehingga review-nya bisa digabung. Pinterest lebih sederhana dari TikTok. TikTok paling berat dari sisi media dan audit.

## Checklist review Meta (Threads, Instagram, Facebook)

- [ ] Privacy policy yang menyebut data apa yang diambil dan kenapa.
- [ ] Terms of service.
- [ ] Halaman penghapusan data.
- [ ] Video screencast yang menunjukkan alur connect, compose, publish.
- [ ] Akun uji dengan kredensial yang bisa dipakai reviewer.
- [ ] Penjelasan penggunaan setiap scope.
- [ ] Bukti bahwa aplikasi tidak menyimpan data melebihi yang dibutuhkan.
- [ ] URL callback OAuth yang benar untuk produksi.

## Checklist audit TikTok

- [ ] Akun developer TikTok for Developers terdaftar.
- [ ] Aplikasi terdaftar dengan scope `video.publish` dan `video.upload`.
- [ ] Video demo alur publish.
- [ ] Kebijakan privasi dan terms yang dapat diakses publik.
- [ ] Penjelasan bagaimana konten pengguna digunakan.
- [ ] Rencana fallback jika direct post belum disetujui.

## Batasan yang harus tercermin di UI

- Instagram dan Pinterest tidak bisa menerima teks saja. Composer harus memblokir target tersebut sampai media ditambahkan.
- TikTok tidak bisa menerima gambar saja. Target TikTok butuh video.
- Facebook hanya Page, bukan profil pribadi. UI harus menyebut "Facebook Page".
- Jika scope analytics tidak disetujui, dashboard menampilkan status "belum tersedia", bukan angka kosong yang terlihat seperti nol.
