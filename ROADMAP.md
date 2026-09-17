# Engineering Roadmap & Technical Architecture
## Threads Maker v2.0: 1-Click Social Commerce & Visual Multiplier

---

| **Dokumen Kontrol** | **Detail Spesifikasi** |
| :--- | :--- |
| **Versi Roadmap** | v2.0.0-RELEASE-PLAN |
| **Status** | Active Execution Phase |
| **Lead Architect** | Senior System Analyst & Principal Product Manager |
| **Durasi Siklus** | 24 Minggu (6 Bulan / 4 Fase Terstruktur) |
| **Model Eksekusi** | Dual-track Agile / 2-Week Sprint Cadence |

---

## 1. Arsitektur Tech Stack Lengkap

Diagram arsitektur sistem di bawah ini menguraikan pemisahan modular antara Client-Side Studio, Serverless API Edge, Database, dan Third-Party Integrations:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (Browser)                                │
│  ┌───────────────────────┐  ┌──────────────────────────┐  ┌───────────────────┐  │
│  │ Next.js 15 App Router │  │ Visual Studio (Canvas)   │  │ Client Exporter   │  │
│  │ React 19 + Tailwind   │  │ html-to-image + Auto-Fit │  │ JSZip + FileSaver │  │
│  └───────────┬───────────┘  └────────────┬─────────────┘  └───────────────────┘  │
└──────────────┼───────────────────────────┼───────────────────────────────────────┘
               │ HTTPS / JSON              │ Local State / Blob
               ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          EDGE & API LAYER (Serverless)                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Next.js Route Handlers + Zod Validation + Edge Middleware                   │ │
│  └───────┬───────────────────────────────┬─────────────────────────────┬───────┘ │
└──────────┼───────────────────────────────┼─────────────────────────────┼─────────┘
           │                               │                             │
           ▼                               ▼                             ▼
┌──────────────────────┐       ┌──────────────────────┐      ┌─────────────────────┐
│  AI Engine Cluster   │       │ Database & Cache     │      │ External Services   │
│  - OpenAI GPT-4o-mini│       │ - PostgreSQL (Neon)  │      │ - Midtrans (QRIS)   │
│  - DeepSeek V3/R1    │       │ - Prisma ORM         │      │ - Stripe Checkout   │
│  - Anthropic Claude  │       │ - Upstash Redis      │      │ - OpenGraph Scraper │
│    (Fallback Casc.)  │       │   (Rate Limit/Cache) │      │ - X / Meta API      │
└──────────────────────┘       └──────────────────────┘      └─────────────────────┘
```

### 1.1 Matriks Komponen Teknologi

| Lapisan (Layer) | Komponen Terpilih | Versi / Spesifikasi | Rasionalisasi & Keputusan Desain |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | `v15.1.4` (React 19) | Server Components untuk SEO cepat, Client Components untuk interaktivitas kanvas, Turbopack untuk DX kencang. |
| **Styling & Design System** | **Tailwind CSS + Shadcn UI** | `v3.4.17` / Radix Primitives | Aksesibilitas tinggi (ARIA), ukuran bundle minimal, kemudahan kustomisasi tema visual. |
| **Visual Rendering Engine** | **html-to-image + JSZip** | `v1.11.11` + `v3.10.1` | **Zero Server GPU Cost:** Seluruh rendering dilakukan di browser klien (Canvas/SVG rasterizer), menghemat biaya server 100%. |
| **State Management** | **Zustand** | `v5.0.2` | State generator, pengaturan tema, dan slide re-ordering yang ringan tanpa boilerplate Redux. |
| **Backend API & Runtime** | **Next.js Route Handlers** | Node.js 20 LTS / Edge | Endpoint terstruktur, validasi skema runtime menggunakan `Zod`, streaming response via SSE. |
| **Database & ORM** | **PostgreSQL + Prisma ORM** | Neon / Supabase Serverless | Skema relasional yang aman (type-safe), koneksi pooling via PgBouncer untuk arsitektur serverless. |
| **Caching & Rate Limiting** | **Upstash Redis** | Serverless REST Redis | Sliding-window rate limiter per IP/User, caching hasil scraping metadata produk e-commerce. |
| **Otentikasi & IAM** | **Auth.js (NextAuth v5)** | `v5.0.0-beta` | Mendukung Google OAuth, X OAuth 2.0 PKCE, JWT stateless sessions, dan RBAC multi-tenant. |
| **AI Orchestration** | **Multi-Provider Cascade** | OpenAI, DeepSeek, Claude | Routing otomatis ke provider termurah (DeepSeek V3 / GPT-4o-mini) dengan fallback Claude jika API down. |
| **Payment Gateway** | **Midtrans + Stripe** | Snap Core API + Stripe SDK | **Midtrans** untuk penetrasi pasar Indonesia (QRIS, E-Wallet, VA lokal); **Stripe** untuk regional SEA/Global. |
| **Monitoring & Telemetri** | **PostHog + Sentry** | Client & Server SDK | PostHog untuk analitik produk & event tracking (WAMP); Sentry untuk crash reporting kanvas browser. |

---

## 2. Tahapan Eksekusi Rinci (Phased Execution)

```
2026 ROADMAP OVERVIEW:
[FASE 1: MVP Visual Studio] ──► [FASE 2: Affiliate & Sync] ──► [FASE 3: Auth & Payment] ──► [FASE 4: Direct Pub & Moat]
(Minggu 1 - 6)                  (Minggu 7 - 12)                 (Minggu 13 - 18)             (Minggu 19 - 24)
```

---

### Fase 1: MVP Visual Studio & Tipografi Adaptif (Minggu 1 - 6)
**Tujuan Utama:** Mengubah Threads Maker dari aplikasi teks murni menjadi Visual Carousel Studio yang mampu mengekspor format Instagram (4:5) dan TikTok Photo Mode (9:16) secara instan.

#### Scope & Deliverables:
1. **Pondasi Canvas Client-Side:**
   - Implementasi komponen canvas virtual berbasis CSS Grid/Flexbox dengan ukuran referensi tinggi (1080x1350 dan 1080x1920).
   - Integrasi library `html-to-image` dengan scaling rasio 2x (Retina-ready).
2. **6 Preset Tema Desain Populer:**
   - Midnight Stealth, Minimal Editorial, Clean Pastel, Cyber Accent, Warm Sand, dan High-Contrast Warning.
3. **Dynamic Font-Scaling Engine:**
   - Skrip kalkulasi otomatis ukuran font berdasarkan jumlah karakter dan rasio aspek guna mencegah text overflow.
4. **Batch ZIP Downloader:**
   - Integrasi `jszip` dan `file-saver` untuk merender 5–15 slide secara paralel menjadi file `.zip` siap unggah dalam hitungan detik.
5. **Multi-Format Preview Tabs:**
   - Tampilan tab interaktif: *Tweet Preview*, *Meta Threads Preview*, dan *Visual Carousel Slider*.

---

### Fase 2: Social Commerce Affiliate Engine & Local DB (Minggu 7 - 12)
**Tujuan Utama:** Menghubungkan ekosistem e-commerce lokal Asia Tenggara dan memodernisasi prompt engine agar bebas klise AI (Anti-Slop).

#### Scope & Deliverables:
1. **Metadata Product Scraper Engine:**
   - Route handler `/api/scrape-product` untuk mengekstrak data dari URL Shopee, Tokopedia, dan TikTok Shop.
   - Cache hasil scraping di Redis (TTL 24 jam) untuk efisiensi latensi.
   - UI Fallback manual yang elegan jika terkena bot protection.
2. **Anti-Slop Prompt Framework v2:**
   - Sistem penyaringan kata klise bahasa Indonesia dan Inggris.
   - Preset tone baru: *Jaksel Casual*, *Review Kritis/Jujur*, *Storytelling Emosional*, dan *Taktis Bisnis*.
3. **Database Relasional & Skema Prisma:**
   - Inisialisasi PostgreSQL (Neon/Supabase) dan setup skema tabel: `CampaignThread`, `CarouselDeck`, `CarouselSlide`, `AffiliateMeta`.
4. **Hybrid Storage Sync:**
   - Sinkronisasi dua arah: data lokal di `localStorage` dapat di-sync ke cloud database saat pengguna login.
5. **Bridge Bio-Link Generator (v1):**
   - Halaman publik `/b/:slug` untuk routing aman link afiliasi guna mencegah shadowban akun media sosial kreator.

---

### Fase 3: Multi-Tenancy, Auth & Monetisasi SEA (Minggu 13 - 18)
**Tujuan Utama:** Meluncurkan model bisnis SaaS, paywall kuota kredit, dan sistem pembayaran instan QRIS untuk kreator Indonesia.

#### Scope & Deliverables:
1. **Sistem Otentikasi & Multi-Tenancy:**
   - Auth.js dengan Google OAuth dan X OAuth 2.0 PKCE.
   - Konsep `Workspace` (Personal vs Agency) dengan manajemen anggota tim.
2. **Sistem Kuota Kredit:**
   - Deduplikasi kredit per aksi: generate teks, generate carousel, regenerasi konten.
   - Ledger transaksi kredit di database PostgreSQL.
3. **Integrasi Midtrans (QRIS & Virtual Account):**
   - Integrasi Midtrans Snap & Core API untuk transaksi IDR otomatis tanpa verifikasi manual.
   - Webhook handler `/api/webhooks/midtrans` dengan verifikasi signature dan idempotensi ketat.
4. **Integrasi Stripe Checkout:**
   - Mendukung pembayaran kartu internasional untuk pengguna non-Indonesia.
5. **Billing Dashboard & Paywall Modal:**
   - Modal peringatan kuota habis yang mulus, riwayat transaksi, dan status langganan aktif.

---

### Fase 4: Direct Publishing, Telemetri & Enterprise Moat (Minggu 19 - 24)
**Tujuan Utama:** Membangun parit pertahanan produk (economic moat) melalui direct social posting, analitik klik link, dan otomatisasi lanjutan.

#### Scope & Deliverables:
1. **Direct Publishing ke X (Twitter) & Meta Threads:**
   - Publikasi thread langsung via X API v2 dan Threads Official Graph API.
   - Penjadwalan posting berbasis background worker (Inngest / BullMQ).
2. **Link Tracking & Analytics Dashboard:**
   - Telemetri klik pada Bridge Bio-Link (`/b/:slug`), pemisahan traffic bot vs pembeli asli, dan estimasi CTR (Click-Through Rate).
3. **AI Hook A/B Testing Matrix:**
   - Menghasilkan 3 variasi hook pembuka dengan skor estimasi viralitas algoritmik.
4. **Brand Kit Lanjutan & Custom Font Uploader:**
   - Kreator Pro dan Agensi dapat mengunggah font kustom (`.woff2`) dan palet warna spesifik brand mereka.
5. **Audit Keamanan & Kesiapan Skala Tinggi:**
   - Penetration testing, audit XSS kanvas, dan benchmark beban serverless.

---

## 3. Jadwal Sprint Mingguan & Deliverables Konkrit

```
SPRINT SCHEDULE MATRIX (W1 - W24):
┌────────────┬─────────────────────────────┬───────────────────────────────────────────┐
│ Sprint     │ Minggu                      │ Milestone & Deliverables Konkrit          │
├────────────┼─────────────────────────────┼───────────────────────────────────────────┤
│ Sprint 1   │ Minggu 1 - Minggu 2         │ Virtual Canvas DOM & Rendering Prototype  │
│ Sprint 2   │ Minggu 3 - Minggu 4         │ 6 Visual Themes + Dynamic Font Scaling    │
│ Sprint 3   │ Minggu 5 - Minggu 6         │ Batch ZIP Exporter + Testing Retina 2x    │
│ Sprint 4   │ Minggu 7 - Minggu 8         │ Scraper E-commerce + Anti-Slop Prompt v2  │
│ Sprint 5   │ Minggu 9 - Minggu 10        │ Setup PostgreSQL Prisma + Local-Cloud Sync│
│ Sprint 6   │ Minggu 11 - Minggu 12       │ Bridge Bio-Link Generator + Slug Routing  │
│ Sprint 7   │ Minggu 13 - Minggu 14       │ Auth.js (Google/X) + Workspace Model      │
│ Sprint 8   │ Minggu 15 - Minggu 16       │ Midtrans QRIS + Stripe Webhook Engine     │
│ Sprint 9   │ Minggu 17 - Minggu 18       │ Credit Ledger System + Billing UI Paywall │
│ Sprint 10  │ Minggu 19 - Minggu 20       │ Official Meta Threads & X Direct API      │
│ Sprint 11  │ Minggu 21 - Minggu 22       │ Background Scheduler + Telemetri Klik     │
│ Sprint 12  │ Minggu 23 - Minggu 24       │ Security Penetration, QA & Public Launch  │
└────────────┴─────────────────────────────┴───────────────────────────────────────────┘
```

### Rincian Deliverable Mingguan

- **Minggu 1:** Riset implementasi `html-to-image` vs `html2canvas`. Setup virtual DOM kanvas terisolasi dengan rasio tetap (1080x1350).
- **Minggu 2:** Penyesuaian layout preview kanvas responsif di desktop & mobile; pengujian isolasi stylesheet CSS agar tidak bocor ke kanvas.
- **Minggu 3:** Implementasi 6 tema visual: Midnight, Editorial, Pastel, Cyber, Warm Sand, Warning. Selector tema di UI.
- **Minggu 4:** Pembuatan algoritma dynamic font auto-fit berdasarkan batas piksel dan panjang kata. Pengujian teks panjang vs pendek.
- **Minggu 5:** Integrasi `JSZip` dan `FileSaver.js`. Rendering loop paralel slide ke format PNG 2x resolusi tanpa memblokir thread UI.
- **Minggu 6:** Integrasi kontrol watermark, penomoran slide (`01/07`), dan QA testing cross-browser (Chrome, Safari, Firefox).
- **Minggu 7:** Endpoint parser `/api/scrape-product` dengan cheerio/puppeteer core untuk membaca OpenGraph metadata Shopee & Tokopedia.
- **Minggu 8:** Desain ulang prompt AI engine dengan Anti-Slop filter bahasa Indonesia; pengujian konsistensi output JSON berstruktur.
- **Minggu 9:** Konfigurasi Prisma ORM dengan PostgreSQL Neon. Migrasi skema database relasional.
- **Minggu 10:** Logika sinkronisasi data: membaca dari `localStorage` dan melakukan merge ke PostgreSQL saat user terautentikasi.
- **Minggu 11:** Implementasi Next.js dynamic route `/b/[slug]` untuk micro landing page bridge link dengan preview produk dan CTA aman.
- **Minggu 12:** Pengujian beban scraper, mitigasi fallback modal manual bila e-commerce menerapkan captcha, dan optimasi Redis cache.
- **Minggu 13:** Implementasi NextAuth v5 dengan Google Provider dan X (Twitter) OAuth 2.0 PKCE.
- **Minggu 14:** Implementasi multi-workspace RBAC: skema kepemilikan workspace, switch antar workspace di header aplikasi.
- **Minggu 15:** Integrasi API Midtrans Snap: pembuatan order, generate QRIS dinamis, dan handling callback status transaksi.
- **Minggu 16:** Integrasi Stripe Checkout untuk opsi mata uang internasional. Pengujian alur transaksi webhook sandbox.
- **Minggu 17:** Implementasi Credit Ledger: pengurangan saldo kredit otomatis pada setiap eksekusi AI dan proteksi saldo minus.
- **Minggu 18:** Pembuatan UI billing, riwayat tagihan, invoice download, dan paywall modal interaktif.
- **Minggu 19:** Integrasi X API v2 thread endpoint dan Meta Threads API Graph untuk direct posting.
- **Minggu 20:** Implementasi alur token refresh OAuth sosial media dan penyimpanan token terenkripsi AES-256.
- **Minggu 21:** Setup Inngest/BullMQ untuk antrean jadwal posting thread otomatis (Schedule Post).
- **Minggu 22:** Dashboard telemetri link bridge: grafik klik harian, perujuk (referrer), dan rasio klik-ke-beli.
- **Minggu 23:** Audit performa Web Vitals (LCP < 2.0s), accessibility audit (WCAG AA), dan optimasi bundle build Next.js.
- **Minggu 24:** End-to-end regression testing, stress testing kanvas di perangkat Android mid-range, dan rilis publik v2.0.

---

## 4. Risiko Teknis, Tantangan Keamanan & Strategi Mitigasi

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RISK & MITIGATION MATRIX                              │
├───────────────────────┬─────────────────────────────────────────────────────────┤
│ Potensi Risiko        │ Strategi Solusi & Mitigasi Arsitektur                   │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ 1. Anti-Scraping      │ Multi-Tier Fallback: OpenGraph -> Headless Proxy ->     │
│    E-Commerce Bot     │ Instant Manual Entry Modal (< 15 detik bagi user).      │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ 2. Ketidakstabilan    │ "Export-First" Philosophy: Core value pada ZIP export   │
│    API X / Threads    │ & Copy to Clipboard; Direct API sebagai opsi sekunder.  │
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ 3. Font Glitch di     │ Font Preloading via document.fonts.ready, SVG-inlining, │
│    iOS Safari Canvas  │ dan isolasi layout kanvas dalam container berskala tetap│
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ 4. "AI Slop" Fatigue  │ Anti-Slop Filter, injeksi gaya lokal kultural, dan opsi │
│    & Churn Kreator    │ user tone fine-tuning agar hasil tidak terdengar robotik│
├───────────────────────┼─────────────────────────────────────────────────────────┤
│ 5. Transaksi QRIS     │ Idempotency Key pada Webhook, verifikasi hash signature │
│    Gagal / Terbengkalai Midtrans, dan poller status pembayaran di frontend.   │
└───────────────────────┴─────────────────────────────────────────────────────────┘
```

### 4.1 Risiko 1: Sistem Anti-Scraping E-Commerce (Shopee/Tokopedia Cloudflare Shield)
- **Tingkat Keparahan:** TINGGI | **Probabilitas:** TINGGI
- **Dampak:** Gagal membaca judul produk, harga, dan gambar secara otomatis dari URL produk.
- **Mitigasi Teknis:**
  1. *Lapis 1 (Scraper Ringan):* Mengambil tag metadata OpenGraph standar via HTTP GET header tersamar (User-Agent rotasi).
  2. *Lapis 2 (Cache Aggressive):* Menyimpan hasil query produk yang sama di Redis selama 24 jam sehingga tidak perlu scrape berulang.
  3. *Lapis 3 (Graceful Fallback UI):* Apabila bot protection mendeteksi request, sistem TIDAK BOLEH menampilkan pesan error fatal. Sistem langsung membuka modal input ringkas: *"Scraper e-commerce sedang padat. Masukkan Nama Produk & Harga secara manual dalam 10 detik"*, sehingga proses generasi AI tetap dapat berjalan lancar.

### 4.2 Risiko 2: Biaya Mahal & Perubahan Kebijakan API X (Twitter) & Meta Threads
- **Tingkat Keparahan:** SEDANG | **Probabilitas:** TINGGI
- **Dampak:** Biaya API tier tinggi atau limitasi rate limit yang membatasi direct posting.
- **Mitigasi Teknis:**
  - Menerapkan filosofi **"Export-First Product"**. Nilai utama produk terletak pada **Visual Carousel ZIP Downloader** dan tombol **Copy Thread to Clipboard (1-Click)** yang 100% independen dari API pihak ketiga.
  - Direct API posting diperlakukan sebagai fitur *add-on eksklusif* bagi pengguna Creator Pro dan Agency, dengan kuota harian ketat untuk mencegah terlampauinya rate limit API resmi.

### 4.3 Risiko 3: Render Glitch & Perbedaan Font pada Browser iOS WebKit / Safari
- **Tingkat Keparahan:** TINGGI | **Probabilitas:** SEDANG
- **Dampak:** Slide carousel hasil export di iPhone tampak bergeser teksnya, font default tidak terpasang, atau gambar buram.
- **Mitigasi Teknis:**
  1. Wajib mengeksekusi `await document.fonts.ready` sebelum memulai proses rasterisasi `html-to-image`.
  2. Semua gambar avatar dan ilustrasi wajib di-convert menjadi data URL Base64 guna menghindari isu kontaminasi canvas (Tainted Canvas CORS error).
  3. Menetapkan ukuran kanvas virtual eksplisit (`width: 1080px`, `height: 1350px`) dengan CSS transform scale untuk rendering retina bebas blur.

### 4.4 Risiko 4: AI Fatigue & Kreator Churn Akibat Konten Terlalu Mirip
- **Tingkat Keparahan:** SEDANG | **Probabilitas:** SEDANG
- **Dampak:** Kreator merasa konten yang dihasilkan terdengar sama dengan kreator lain dan berhenti berlangganan.
- **Mitigasi Teknis:**
  - Mengimplementasikan variasi temperatur dinamis (0.7 – 0.9) pada model AI.
  - Fitur *"Remix Hook"*: Menghasilkan 5 alternatif hook dengan sudut pandang kontras (misal: "Review Kecewa vs Review Puas", "Perhitungan Finansial vs Nilai Estetika").
  - Menjaga pembaruan berkala pada repositori prompt anti-slop komunitas.

### 4.5 Risiko 5: Idempotensi Webhook Pembayaran QRIS & Double Credit Assignment
- **Tingkat Keparahan:** KRITIS | **Probabilitas:** RENDAH
- **Dampak:** User mendapat kuota kredit ganda jika Midtrans mengirim retry webhook berulang kali, atau user komplain kredit tidak masuk saat pembayaran tertunda.
- **Mitigasi Teknis:**
  - Menerapkan **Idempotency Verification** pada tabel `Subscription`:
    ```typescript
    // Pseudocode Webhook Midtrans
    const existingPayment = await prisma.subscription.findUnique({ where: { orderId } });
    if (existingPayment.status === "PAID") {
      return NextResponse.json({ message: "Transaction already processed" }, { status: 200 });
    }
    // Lanjutkan penambahan kredit dalam transaksi atomik (Prisma $transaction)
    ```
  - Menggunakan enkripsi SHA512 hash verification: `SHA512(order_id + status_code + gross_amount + ServerKey)` untuk menjamin integritas request dari Midtrans.

---

## 5. Definition of Done (DoD) & Kriteria Penerimaan per Fase

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DEFINITION OF DONE STANDARD                       │
├────────────────────────────────────────────────────────────────────────┤
│ [✓] Zero Critical Security Vulnerabilities (SonarQube/Snyk Scan)       │
│ [✓] Unit & Integration Tests Pass Rate >= 85%                          │
│ [✓] Mobile Responsiveness Verified on Android & iOS WebKit             │
│ [✓] Performance Budget: P95 Client Canvas Export < 3.0s                │
│ [✓] Strict TypeScript Compilation (No `any` types allowed)             │
│ [✓] Error Tracking Wired with Sentry & Events Tracked with PostHog     │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Kriteria Penerimaan Fase 1 (Visual Studio MVP)
- [ ] Pengguna dapat melihat live preview carousel dengan aspect ratio 4:5 dan 9:16 secara mulus.
- [ ] 6 Tema desain dapat dipilih dan langsung memperbarui tampilan seluruh slide tanpa freeze UI.
- [ ] Teks judul dan bodi slide otomatis menyesuaikan ukuran font tanpa ada kata yang terpotong keluar dari batas kanvas (Zero Overflow).
- [ ] Tombol "Download All Slides (.ZIP)" berhasil mengekspor seluruh slide sebagai berkas PNG beresolusi 2160x2700 px (4:5) atau 2160x3840 px (9:16) dalam waktu kurang dari 3.5 detik untuk 10 slide.
- [ ] File ZIP yang di-ekstrak memiliki nama berkas terurut rapi: `slide-01.png`, `slide-02.png`, dst.

### 5.2 Kriteria Penerimaan Fase 2 (Affiliate Engine & Database)
- [ ] Menempelkan tautan produk Shopee atau Tokopedia otomatis mengisi data: Judul Produk, Estimasi Harga, dan Thumbnail.
- [ ] Jika scraping diblokir, modal entri manual muncul dalam waktu < 500 ms tanpa merusak state aplikasi.
- [ ] AI Generator menghasilkan copy berbahasa Indonesia bebas kata-kata klise dengan format JSON yang valid 100% terhadap skema Zod.
- [ ] Pengguna tanpa login dapat beralih halaman tanpa kehilangan draf (tersimpan di `localStorage`).
- [ ] Pengguna yang login otomatis tersinkronisasi riwayat kampanyenya ke database PostgreSQL Neon.
- [ ] Endpoint `/b/:slug` dapat diakses publik dengan waktu muat halaman < 300 ms dan tombol redirect affiliate berfungsi normal.

### 5.3 Kriteria Penerimaan Fase 3 (Auth, Multi-Tenancy & Pembayaran)
- [ ] Pengguna dapat masuk menggunakan akun Google dan akun X (Twitter) via OAuth 2.0 PKCE.
- [ ] Pengguna dapat membuat workspace baru dan mengundang anggota tim dengan batasan role (Admin/Editor/Viewer).
- [ ] Alur pembayaran QRIS Midtrans: Pengguna memindai QR code via aplikasi mobile banking / e-wallet, dan dalam waktu < 5 detik setelah pembayaran berhasil, saldo kredit bertambah secara otomatis tanpa perlu refresh halaman.
- [ ] Alur pembayaran kartu internasional via Stripe Checkout berfungsi dengan penanganan mata uang USD/SGD.
- [ ] Pengurangan kredit terekam transparan pada tabel audit `CreditTransaction`.
- [ ] Kuota kredit habis menampilkan modal paywall yang mengarahkan pengguna ke halaman upgrade paket.

### 5.4 Kriteria Penerimaan Fase 4 (Direct Publishing & Kesiapan Skala)
- [ ] Pengguna dapat menautkan akun X dan mempublikasikan thread berisi teks secara otomatis dari dalam aplikasi.
- [ ] Pengguna dapat menautkan akun Meta Threads dan memposting update secara terjadwal.
- [ ] Dashboard analitik menampilkan metrik jumlah klik bridge link, geographic location, dan referer secara akurat.
- [ ] Hasil uji beban (load test): Sistem API Next.js mampu melayani 200 request paralel per detik dengan error rate < 0.1%.
- [ ] Seluruh endpoint terproteksi dengan Upstash Sliding-Window Rate Limiter untuk mencegah brute force dan eksploitasi kuota AI.

---
*Roadmap ini mengikat seluruh tim pengembang, arsitek sistem, dan tim produk dalam siklus pengembangan Threads Maker v2.0.*
