# Product Requirement Document (PRD)
## 1-Click Social Commerce & Visual Multiplier for SEA Creators (Threads Maker v2.0)

---

| **Dokumen Metadata** | **Keterangan** |
| :--- | :--- |
| **Versi Dokumen** | v2.0-PROD-SPEC |
| **Status** | Approved for Implementation |
| **Penulis** | Senior System Analyst & Principal Product Manager |
| **Target Pasar** | Southeast Asia (Indonesia Priority, ekspansi Malaysia & Vietnam) |
| **Domain Produk** | Social Commerce, Generative Visual Studio, Content Multiplier |
| **Target Rilis** | Q2 - Q4 2026 |

---

## 1. Ringkasan Eksekutif & Visi Produk

### 1.1 Visi Produk
Mentransformasi Threads Maker dari sekadar web tool generator teks lokal menjadi **"The #1 Social Commerce Content Multiplier & Zero-Design Visual Carousel Studio for SEA Creators and D2C Brands"**. 

Platform ini memungkinkan kreator dan jenama mengubah 1 ide produk atau URL e-commerce (Shopee, Tokopedia, TikTok Shop) menjadi aset konten multisaluran dalam hitungan detik:
1. **Thread X (Twitter)** berstruktur hook psikologis tinggi.
2. **Meta Threads** conversational sequence.
3. **Carousel Slides (4:5 Instagram & 9:16 TikTok Photo Mode)** siap download dalam bentuk ZIP beresolusi tinggi (client-side rendered).
4. **Affiliate Bridge Micro-page** yang aman dari shadowban algoritma.

```
       [ Input: URL Produk / Ide Topik ]
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[ Anti-Slop AI Engine ]     [ Affiliate Link Parser ]
       │                               │
       ├───────────────────────────────┤
       ▼                               ▼
[ 1-Click Multiplier Engine ]
       ├── 1. X (Twitter) Hook & Thread Matrix
       ├── 2. Meta Threads Native Conversational Copy
       ├── 3. Visual Carousel Studio (4:5 IG & 9:16 TikTok Photo)
       └── 4. Anti-Spam Bio-Link / Bridge Page (#Ad Compliant)
```

### 1.2 Nilai Strategis & Transisi Arsitektur
- **Versi 1.0 (Legacy Baseline):** Client-only, single-tweet/thread text generator, penyimpanan localStorage, OpenAI prompt generik.
- **Versi 2.0 (Target Operasional):** Multi-tenant SaaS, hybrid offline-first + cloud workspace, client-side zero-GPU canvas renderer, parser e-commerce SEA, integrasi payment lokal (Midtrans/QRIS) & Stripe, serta Anti-Slop Localized Tone Engine.

---

## 2. Problem Statement & The Core Gap

### 2.1 Analisis Gap Industri: Western Tools vs. Manual Design vs. SEA Realities

| Dimensi Evaluasi | Western SaaS (Typefully, TweetHunter, Taplio) | Manual Design Tools (Canva, Figma, Photoshop) | Threads Maker v2.0 (Solusi Kami) |
| :--- | :--- | :--- | :--- |
| **Kesesuaian Bahasa & Tone** | Kaku, kosa kata korporat Barat, gagal menangkap slang lokal ("racun shopee", "spill dong", "worth it gak sih"). | Bergantung 100% pada copywriter manusia; proses lambat. | **Engine Anti-Slop Localized** (Jaksel, Storytelling Emosional, Review Kritis, Taktis Bisnis). |
| **Format Konten Dominan** | Berorientasi pada teks murni untuk Twitter/LinkedIn audiens US/EU. | Fleksibel tetapi butuh 45–90 menit per deck carousel berisi 8–10 slide. | **Zero-Design 1-Click Carousel** (Auto-layout, auto-fit font, rasio 4:5 & 9:16 TikTok Photo Mode). |
| **Monetisasi E-commerce** | Tidak mendukung ekosistem e-commerce lokal SEA (Shopee, Tokopedia, TikTok Shop). | Manual input link & manual capture screenshot produk. | **Affiliate Auto-Parser & Bridge Link** dengan proteksi anti-shadowban. |
| **Beban Biaya Langganan** | $30 – $99 / bulan (IDR 480rb – 1.6jt/bln); di luar daya beli 85% kreator mikro SEA. | Gratis sd $13/bln (tetapi beban waktu pembuatan sangat tinggi). | **Pricing Mikro Lokal** via QRIS / E-wallet (Mulai dari Rp49.000/bln atau sistem Pay-as-you-go). |
| **Infrastruktur Rendering** | Server-side rendering berat (biaya server tinggi dibebankan ke user). | Berat di memori browser, tidak otomatis menyesuaikan tipografi per panjang teks. | **Client-Side HTML5 Canvas / WebGL**: Zero GPU backend cost, export 10 slide dalam 2 detik. |

### 2.2 The Core Problem
1. **Canva Fatigue:** Kreator affiliate harus memproduksi 3-5 posting carousel setiap hari untuk mengimbangi algoritma TikTok dan Instagram. Menghabiskan 3 jam hanya untuk layout slide teks + gambar produk menurunkan ROI kreator.
2. **Algorithmic Link Penalty:** Menyematkan link affiliate langsung (`shp.ee` atau direct affiliate link) di postingan X atau TikTok deskripsi mengakibatkan penurunan jangkauan organik (shadowban / reach drop hingga 80%).
3. **AI Slop Syndrome:** AI generator standar (ChatGPT/Claude prompt default) menghasilkan teks yang terdengar seperti brosur korporat atau robot terjemahan, kehilangan sentuhan autentik lokal yang memicu konversi pembelian di Asia Tenggara.

---

## 3. Target Persona & Analisis Kasus Penggunaan (Use Cases)

### Persona 1: Sisca – Kreator Affiliate "Racun Belanja"
- **Profil:** Wanita 24 tahun, kreator paruh waktu di X, Instagram, dan TikTok. Memiliki 15.000 pengikut.
- **Fokus Konten:** Rekomendasi fashion, skincare, dan peralatan rumah tangga aesthetic.
- **Tantangan Utama:** Harus mengunggah 20–30 produk per minggu. Kewalahan membuat slide TikTok Photo Mode dan menulis copy thread X yang tidak terkesan spam.
- **Kebutuhan Produk:** Paste URL produk Shopee -> Otomatis generate 10 slide TikTok Photo Mode (9:16) + Thread X dengan format spill jujur + link bridge pendek.

### Persona 2: Budi – Founder Brand D2C Mikro (Direct-to-Consumer)
- **Profil:** Pria 29 tahun, pemilik brand kopi lokal dan perlengkapan EDC. Mengelola tim pemasaran kecil (1-2 orang).
- **Fokus Konten:** Storytelling di balik produk, edukasi manfaat, perbandingan dengan kompetitor.
- **Tantangan Utama:** Tidak mampu menggaji desainer grafis full-time. Konten visual di IG sering tidak konsisten warnanya.
- **Kebutuhan Produk:** Template carousel konsisten sesuai warna brand (custom hex theme, watermark logo brand), sekali generate langsung menghasilkan materi untuk IG Carousel dan Threads.

### Persona 3: Reza – Solopreneur & Edukator Finansial / Bisnis
- **Profil:** Pria 32 tahun, konsultan independen yang menjual kursus online dan template spreadsheet.
- **Fokus Konten:** Breakdown studi kasus, analisa laporan keuangan, tips produktivitas.
- **Tantangan Utama:** Thread informatif panjang di X sering terpotong dan kurang viral di Instagram jika tidak diubah menjadi visual slide.
- **Kebutuhan Produk:** Input topik panjang -> AI memecah menjadi 7 slide carousels edukatif dengan auto-fit typography + CTA download lead magnet di bio.

---

## 4. Value Proposition & Empat Pilar USP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THREADS MAKER v2.0 VALUE PROPOSITION                 │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ 1. Multiplier      │ 2. Affiliate       │ 3. Anti-Slop Localized Tone   │
│    1-to-Many       │    Engine          │    - Filter Cliche Bahasa     │
│    - X Thread      │    - URL Scraper   │    - Slang Jaksel, Emosional, │
│    - IG Carousel   │    - Auto #Ad      │      Kritis, Taktis           │
│    - TikTok Photo  │    - Bridge Link   ├───────────────────────────────┤
│    - Meta Threads  │    - No-Shadowban  │ 4. Zero-Design Visual Studio  │
│                    │                    │    - Client Canvas (Zero GPU) │
│                    │                    │    - Auto-fit Text & Batch ZIP│
└────────────────────┴────────────────────┴───────────────────────────────┘
```

### Pilar 1: Multiplier 1-to-Many
Satu kali input konten (topik, skrip mentah, atau link produk) menghasilkan output terdistribusi:
- Format A: X (Twitter) Thread 280-karakter per node.
- Format B: Meta Threads Conversational.
- Format C: Instagram Feed Carousel (rasio 4:5 - 1080x1350px).
- Format D: TikTok Photo Mode (rasio 9:16 - 1080x1920px).
- Format E: Copy Telegram / WhatsApp Channel blast.

### Pilar 2: Native Affiliate Engine & Anti-Spam
- Scraping otomatis metadata produk (nama produk, rating, harga, gambar thumbnail).
- Injeksi otomatis disclaimer kepatuhan regulasi lokal (misal: `#RacunShopee`, `#Ad`, `#AffiliateLink`).
- Pembuatan otomatis halaman perantara (Bridge Page / Micro Bio-Link) guna melindungi reputasi akun sosial media dari blokir link affiliate langsung.

### Pilar 3: Anti-Slop Localized Tone Engine
- Prompt layer dengan aturan ketat penghapusan kata klise AI (misal: "di era digital ini", "perlu diingat bahwa", "menyelami lebih dalam").
- 4 Preset Gaya Bahasa Asia Tenggara:
  1. *Jaksel Casual:* Santai, natural, campuran istilah kekinian yang relate untuk Gen Z/Millennial.
  2. *Storytelling Emosional:* Pendekatan masalah personal, empati, dan resolusi berbasis produk.
  3. *Review Kritis / Jujur:* Menimbang plus-minus secara objektif untuk membangun trust tinggi pembeli.
  4. *Taktis Bisnis:* Ringkas, sarat data, menggunakan bullet-points, cocok untuk edukator & solopreneur.

### Pilar 4: Zero-Design Client-Side Visual Carousel Studio
- Rendering visual 100% diproses di browser user menggunakan HTML5 Canvas / Modern DOM SVG Pipeline.
- **Zero Server Rendering Overhead:** Menghemat ribuan dolar biaya GPU/server Puppeteer.
- Tipografi adaptif (Dynamic Font Scaling): Algoritma menghitung jumlah kata dan otomatis menyesuaikan ukuran font agar slide tidak overflow atau terlalu kosong.

---

## 5. Spesifikasi Fungsional Lengkap

### 5.1 AI Content Generation Engine

```
[User Input Prompt/URL]
          │
          ▼
[Input Sanitizer & Language Detection]
          │
          ▼
[Anti-Slop System Prompt + Context Injector]
          │
          ▼
[AI Model Execution: GPT-4o-mini / DeepSeek V3]
          │
          ▼
[JSON Schema Validator (Zod)]
          ├── Valid? ──► [Thread & Slide State Dispatcher]
          └── Invalid? ─► [Retry / Fallback Parser]
```

#### 5.1.1 Input Controller
- **Input Type:** Teks Bebas (Ide Topik), Dokumen/Artikel Mentah, atau URL E-commerce.
- **Target Distribution Channel:** Multi-select (X, Meta Threads, IG Carousel 4:5, TikTok Photo Mode 9:16).
- **Tone Profile Selector:** Jaksel, Santai, Emosional, Otoritatif, Review Kritis.
- **Slide Count Constraint:** Min 3 slide, Max 15 slide (default: 7 slide).
- **Affiliate Hook Mode (Toggle):** Jika aktif, wajib menyertakan hook masalah, demonstrasi solusi, dan CTA pembelian.

#### 5.1.2 Anti-Slop Rules & Prompt Engineering
- **Banned Lexicon:** Daftar kata terlarang dalam bahasa Indonesia dan Inggris (misal: "tahukah kamu", "pada akhirnya", "dalam dunia yang serba cepat ini", "game changer", "delve into").
- **Formatting Constraints:** Hook pertama wajib di bawah 150 karakter untuk memicu klik "Show More". Setiap slide carousel tidak boleh melebihi 40 kata agar terbaca jelas di layar smartphone.

#### 5.1.3 Structured Output Schema (Zod Validation)
```typescript
export const GeneratedContentSchema = z.object({
  campaignTitle: z.string(),
  strategy: z.object({
    hookType: z.enum(["curiosity", "pain_point", "contrarian", "social_proof"]),
    targetAudience: z.string(),
  }),
  twitterThread: z.array(
    z.object({
      order: z.number(),
      content: z.string().max(280),
      mediaSuggestion: z.string().optional(),
    })
  ),
  metaThreads: z.array(
    z.object({
      order: z.number(),
      content: z.string().max(500),
    })
  ),
  carouselDeck: z.object({
    aspectRatio: z.enum(["4:5", "9:16", "1:1"]),
    suggestedTheme: z.string(),
    slides: z.array(
      z.object({
        slideNumber: z.number(),
        type: z.enum(["cover", "content", "quote", "product_highlight", "cta"]),
        headline: z.string().max(60),
        bodyText: z.string().max(200),
        calloutBadge: z.string().optional(),
        productImagePlaceholder: z.boolean().default(false),
      })
    ),
  }),
  affiliateMeta: z.object({
    productName: z.string().optional(),
    cleanUrl: z.string().url().optional(),
    disclaimerText: z.string(),
  }).optional(),
});
```

---

### 5.2 Client-Side Visual Carousel Studio

#### 5.2.1 Arsitektur Render Canvas
- **Engine:** Menggunakan pipeline modern berbasis SVG ForeignObject / HTML5 Canvas melalui `html-to-image` yang dioptimasi dengan hardware acceleration.
- **Resolution Matrix:**
  * **Instagram Portrait (4:5):** 1080 x 1350 px (DPI scale: 2x -> 2160 x 2700 px untuk output retina ultra-sharp).
  * **TikTok Photo Mode (9:16):** 1080 x 1920 px (DPI scale: 2x -> 2160 x 3840 px).
  * **Square Classic (1:1):** 1080 x 1080 px (DPI scale: 2x -> 2160 x 2160 px).

```
   ┌─────────────────────────────────────────────────────────┐
   │             VISUAL CAROUSEL STUDIO (CLIENT)             │
   │                                                         │
   │  ┌───────────────────┐    ┌───────────────────────────┐ │
   │  │   Control Panel   │    │      Live Virtual DOM     │ │
   │  │  - Theme Selector │    │      Carousel Canvas      │ │
   │  │  - Aspect Ratio   │ ──►│   (1080x1350 / 1080x1920) │ │
   │  │  - Watermark/Logo │    │                           │ │
   │  │  - Auto-Fit Text  │    └─────────────┬─────────────┘ │
   │  └───────────────────┘                  │               │
   │                                         ▼               │
   │                         [ html-to-image Pixel Engine ]  │
   │                                         │               │
   │                                         ▼               │
   │                         [ JSZip Parallel Blob Packager] │
   │                                         │               │
   │                                         ▼               │
   │                         [ Instant .ZIP File Download ]  │
   └─────────────────────────────────────────────────────────┘
```

#### 5.2.2 Preset Tema & Sistem Desain
1. **Midnight Stealth:** Latar belakang hitam pekat `#09090b`, aksen teks hijau neon `#22c55e` atau biru safir, tipografi Sans-serif tebal (Inter/Plus Jakarta Sans).
2. **Minimal Editorial:** Latar belakang broken white `#f8fafc`, tipografi serif elegan (Playfair/Merriweather) dipadu sans-serif modern, tata letak majalah premium.
3. **Cyber Accent:** Latar belakang gradasi gelap `#0f172a` ke `#1e1b4b`, highlight gradien violet-pink, gaya futuristik untuk kreator tech/gadget.
4. **Clean Pastel (Aesthetic):** Latar cream/warm sand `#fefae0` dengan aksen terakota `#bc6c25`, cocok untuk lifestyle, fashion, dan kosmetik.
5. **High-Contrast Warning:** Latar kuning terang `#facc15` dengan tipografi hitam solid `#000000`, ditujukan untuk tips kontroversial atau hook viral berdaya kejut tinggi.

#### 5.2.3 Dynamic Typography Auto-Fit Algorithm
Untuk mencegah text-overflow atau slide yang terlihat terlalu sepi:
```typescript
function calculateDynamicFontSize(textLength: number, maxLines: number, canvasRatio: '4:5' | '9:16'): number {
  const baseSize = canvasRatio === '9:16' ? 48 : 44;
  if (textLength < 60) return baseSize * 1.25;      // Short impactful copy
  if (textLength < 120) return baseSize;             // Standard medium
  if (textLength < 180) return baseSize * 0.85;      // Dense information
  return baseSize * 0.72;                            // Long text with safe boundaries
}
```

#### 5.2.4 Elemen Interaktif & Branding
- **Slide Indicator Counter:** Penomoran otomatis dinamis (contoh: `03 / 08` atau progress pill bar di bagian atas slide).
- **Kustomisasi Watermark:** Avatar pengguna, Handle Twitter/IG (`@username`), Verified Checkmark badge SVG, dan link ringkas.
- **Swipable Visual Hook:** Indikator panah swipe di pojok kanan bawah ("Geser untuk solusi ➔").
- **Batch Export Engine:** Memproses seluruh slide secara paralel menggunakan worker browser, mengompilasi menjadi satu file `.zip` menggunakan `JSZip` dan `FileSaver.js`. Target performa: 10 slide high-res selesai dalam < 3 detik.

---

### 5.3 Affiliate Link & Product Metadata Parser

#### 5.3.1 Alur Parsing URL Produk
1. **Input:** Pengguna memasukkan link produk dari Shopee (`shp.ee/...` atau `shopee.co.id/...`), Tokopedia (`tokopedia.link/...`), atau TikTok Shop (`vt.tiktok.com/...`).
2. **Scraping Layer (Next.js Server Route with Headless Proxy fallback):**
   - Resolusi URL redirect untuk mendapatkan canonical URL.
   - Ekstraksi meta tags OpenGraph (`og:title`, `og:image`, `og:price:amount`, `og:description`).
   - Fallback graceful: Apabila bot protection e-commerce aktif, UI menampilkan modal input manual metadata super-cepat (Nama barang, Harga, Screenshot upload) tanpa memblokir alur generate.
3. **Auto-Compliance Disclaimer:**
   - Menyisipkan otomatis teks wajib etika periklanan digital di slide terakhir dan tweet penutup: *"Postingan ini mengandung link afiliasi resmi. Komisi kecil didapatkan tanpa menambah harga beli pembeli. #Ad #Affiliate"*.

#### 5.3.2 Anti-Spam Bridge Bio-Link (Micro-Landing Page)
- Membuat link pendek unik di bawah domain aplikasi: `threads-maker.app/b/:slug`.
- Halaman bridge menampilkan:
  * Preview cover produk & rating bintang.
  * Ringkasan rekomendasi kreator dalam 2 kalimat.
  * Tombol CTA langsung: "Beli di Shopee (Harga Promo)" atau "Beli di Tokopedia".
  * **Hasil Algoritmik:** Akun kreator di platform media sosial terhindar dari pemotongan reach karena tidak menyematkan link e-commerce mentah.

---

### 5.4 Workspace, Multi-Tenancy & User Auth

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACCOUNT                         │
│             (Google / X OAuth 2.0 PKCE)                 │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    [ Personal Workspace ]       [ Agency Workspace ]
    - Private Drafts             - Multiple Creators
    - Local Cache Sync           - Custom Branding Sets
    - Free / Pro Quota           - Team Member RBAC
```

#### 5.4.1 Otentikasi
- **Provider:** NextAuth (Auth.js v5) dengan integrasi Google OAuth dan X (Twitter) OAuth 2.0 PKCE.
- **Session Strategy:** Stateless JWT terenkripsi dengan rolling session (30 hari).
- **Guest / Offline Mode:** Pengguna tanpa login tetap dapat menggunakan editor dasar dan menyimpan hasil kerja di `localStorage` (arsitektur legacy dipertahankan). Prompt registrasi muncul saat melakukan cloud sync atau melebihi kuota gratis.

#### 5.4.2 Multi-Tenancy & Workspace
- Pengguna dapat membuat beberapa Workspace (misal: "Personal Brand", "Akun Affiliate Toko A", "Klien Agensi X").
- Setiap Workspace menyimpan:
  * Brand Kit (Default Watermark, Foto Profil, Warna Hex Primer/Sekunder, Font).
  * Template Prompt Favorit.
  * Riwayat Campaign & Arsip Slide.

---

### 5.5 Monetisasi, Kuota Kredit & Gateway Pembayaran Lokal

#### 5.5.1 Model Monetisasi & Tiering

| Tier | Biaya Langganan | Kuota Kredit | Fitur Unggulan |
| :--- | :--- | :--- | :--- |
| **Starter (Gratis)** | Rp0 / Free Forever | 15 Kredit / bulan | Teks Thread X & Threads, Export Carousel dengan Watermark kecil Threads Maker, Simpan Lokal. |
| **Creator Pro** | Rp69.000 / bln (~$4.5 USD) atau Rp599.000 / tahun | 250 Kredit / bulan | Tanpa Watermark, Visual Carousel 4:5 & 9:16 Full HD, Batch ZIP Export, Affiliate Parser & Bridge Link, Custom Font & Brand Kit. |
| **Agency / Business** | Rp199.000 / bln (~$13 USD) | 1.000 Kredit / bulan | 5 Akun Tim (Multi-tenancy), Prioritas Generasi AI (DeepSeek R1 / Claude 3.5), Unlimited Bridge Links, Dedicated Support. |

#### 5.5.2 Konsumsi Kredit
- 1x Generate Multiplier (Thread + Carousel Script): 2 Kredit.
- 1x Regenerate / Rewrite Tone: 1 Kredit.
- 1x Batch High-Res ZIP Render (Client-side): 0 Kredit (Unlimited di Pro).
- 1x Deploy Bridge Link Aktif: 1 Kredit / link.

#### 5.5.3 Integrasi Payment Gateway
- **Domestik Indonesia:** Midtrans Snap & Core API:
  * **QRIS Dinamis:** Mendukung GoPay, OVO, ShopeePay, DANA, BCA Mobile.
  * **Virtual Account:** BCA, Mandiri, BNI, BRI, Permata.
- **Regional / Global (Stripe Checkout):**
  * Kartu Kredit / Debit Visa & Mastercard.

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performa & Latensi
- **Time to First Byte (TTFB):** < 200 ms pada Cloudflare Edge / Vercel Edge.
- **AI Streaming Latency:** Karakter pertama stream muncul dalam waktu < 1.2 detik setelah klik submit.
- **Client Render Time:** 10 slide high-resolution (2160x2700 px) di-render dan di-pack ke ZIP dalam waktu < 3.0 detik pada perangkat dengan CPU setara Snapdragon 720G / Intel Core i3 ke atas.
- **Lighthouse Score:** Minimal 90 pada Desktop dan 85 pada Mobile untuk Performance, Accessibility, dan Best Practices.

### 6.2 Keamanan & Privasi
- **Sanitasi Konten:** Semua output AI dan input pengguna wajib disaring dengan `DOMPurify` untuk mencegah serangan Stored/Reflected Cross-Site Scripting (XSS).
- **Enkripsi Data:** Enkripsi `AES-256-GCM` pada level database untuk menyimpan access token sosial media pihak ketiga (OAuth tokens).
- **Isolasi Multi-Tenancy:** Pembatasan akses baris database (Row-Level Security / RLS) memastikan Workspace A tidak dapat membaca aset Workspace B.

### 6.3 Anti-Spam Policy & Kepatuhan Platform Sosial
- Generator wajib mematuhi batas karakter ketat:
  * X (Twitter): 280 karakter per node.
  * Meta Threads: 500 karakter per node.
- Deteksi duplikasi konten otomatis: Mencegah spam posting teks yang 100% identik untuk menghindari penalti suspend akun X.

### 6.4 Ketersediaan & Keandalan (High Availability)
- **Target Uptime:** 99.9% availability per bulan.
- **Graceful Degradation:** Jika API model utama (misal OpenAI) mengalami gangguan, sistem otomatis beralih ke provider cadangan (OpenRouter / DeepSeek API) tanpa memutus alur kerja pengguna.

---

## 7. Data Model & Skema Relasional

Arsitektur database dirancang menggunakan **PostgreSQL** dengan ORM **Prisma**.

```
  ┌────────────┐        ┌───────────────────┐        ┌─────────────┐
  │   User     │───1:N──│  WorkspaceMember  │──N:1───│  Workspace  │
  └────────────┘        └───────────────────┘        └──────┬──────┘
        │                                                   │
       1:N                                                 1:N
        ▼                                                   ▼
┌──────────────────┐                               ┌───────────────────┐
│   Subscription   │                               │  CampaignThread   │
└──────────────────┘                               └────────┬──────────┘
                                                            │
                                            ┌───────────────┴──────────────┐
                                           1:N                            1:1
                                            ▼                              ▼
                                    ┌───────────────┐              ┌───────────────┐
                                    │  TweetNode    │              │  CarouselDeck │
                                    └───────────────┘              └───────┬───────┘
                                                                           │
                                                                          1:N
                                                                           ▼
                                                                   ┌───────────────┐
                                                                   │ CarouselSlide │
                                                                   └───────────────┘
```

### 7.1 Skema Prisma Lengkap (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum SubscriptionTier {
  FREE
  CREATOR_PRO
  AGENCY_BUSINESS
}

enum PaymentStatus {
  PENDING
  PAID
  EXPIRED
  FAILED
}

enum AspectRatio {
  RATIO_4_5
  RATIO_9_16
  RATIO_1_1
}

model User {
  id            String            @id @default(cuid())
  name          String?
  email         String            @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  accounts      Account[]
  sessions      Session[]
  memberships   WorkspaceMember[]
  subscriptions Subscription[]
  creditLedger  CreditTransaction[]
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Workspace {
  id          String            @id @default(cuid())
  name        String
  slug        String            @unique
  credits     Int               @default(15)
  brandColor  String            @default("#09090b")
  watermark   String?
  avatarUrl   String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  members     WorkspaceMember[]
  campaigns   CampaignThread[]
  bridgePages BridgePage[]
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  role        Role      @default(EDITOR)
  userId      String
  workspaceId String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
}

model CampaignThread {
  id          String        @id @default(cuid())
  workspaceId String
  title       String
  inputPrompt String        @db.Text
  tone        String
  targetAud   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tweets      TweetNode[]
  carousel    CarouselDeck?
  affiliate   AffiliateMeta?
}

model TweetNode {
  id          String         @id @default(cuid())
  campaignId  String
  order       Int
  platform    String         @default("X") // "X" | "THREADS"
  content     String         @db.Text
  campaign    CampaignThread @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, order])
}

model CarouselDeck {
  id          String          @id @default(cuid())
  campaignId  String          @unique
  aspectRatio AspectRatio     @default(RATIO_4_5)
  themeName   String          @default("Midnight Stealth")
  campaign    CampaignThread  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  slides      CarouselSlide[]
}

model CarouselSlide {
  id           String       @id @default(cuid())
  deckId       String
  slideNumber  Int
  headline     String       @db.VarChar(120)
  bodyText     String       @db.Text
  badgeText    String?
  isCover      Boolean      @default(false)
  isCta        Boolean      @default(false)
  deck         CarouselDeck @relation(fields: [deckId], references: [id], onDelete: Cascade)

  @@index([deckId, slideNumber])
}

model AffiliateMeta {
  id             String         @id @default(cuid())
  campaignId     String         @unique
  originalUrl    String         @db.Text
  platform       String         // SHOPEE | TOKOPEDIA | TIKTOK
  productTitle   String?
  priceDisplay   String?
  imageUrl       String?
  disclaimer     String         @default("#Ad #Affiliate")
  campaign       CampaignThread @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model BridgePage {
  id          String    @id @default(cuid())
  workspaceId String
  slug        String    @unique
  productName String
  description String?   @db.Text
  targetUrl   String    @db.Text
  heroImage   String?
  clickCount  Int       @default(0)
  createdAt   DateTime  @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model Subscription {
  id            String           @id @default(cuid())
  userId        String
  tier          SubscriptionTier @default(FREE)
  status        PaymentStatus    @default(PENDING)
  orderId       String           @unique
  gateway       String           // "MIDTRANS" | "STRIPE"
  grossAmount   Int
  currentPeriodEnd DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CreditTransaction {
  id          String   @id @default(cuid())
  userId      String
  amount      Int      // +100 or -2
  description String
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 8. Metrik Keberhasilan & Product Analytics

```
               [ Acquisition: Pengunjung Unik Web ]
                               │
                               ▼
            [ Activation: 1st Multiplier Generated ]
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │       NORTH STAR METRIC: WAMP               │
        │ (Weekly Activated Multiplier Posts >= 1)    │
        └──────────────────────┬──────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
[ Creator Retention D30 > 35% ]   [ Trial to Paid (QRIS) > 5% ]
```

### 8.1 North Star Metric (NSM)
> **Weekly Activated Multiplier Posts (WAMP):** Jumlah kreator aktif mingguan yang mengenerate dan mengekspor (download ZIP carousel atau copy thread X) minimal 1 kampanye multiformat per minggu.

### 8.2 Matriks KPI Operasional

| Kategori Metrik | Target Q2 2026 | Target Q4 2026 | Metode Pengukuran |
| :--- | :--- | :--- | :--- |
| **Activation Rate (D0)** | > 60% dari pendaftar baru mencoba 1x generate dan preview carousel | > 75% | Event Track: `campaign_generate_completed` / `signup_completed` |
| **Export Action Rate** | > 45% dari hasil generate di-export (ZIP / Copy to Clipboard) | > 60% | Event Track: `carousel_zip_exported` + `thread_copied` |
| **D30 Retention Rate** | > 25% | > 38% | Cohort Analysis (PostHog) |
| **Payment Conversion** | 3.5% pengguna gratis convert ke Pro Tier via QRIS | 5.5% | Midtrans Settlement Callback vs Active Users |
| **Churn Rate Bulanan** | < 8% | < 5% | Subscription cancellation & expiration tracking |
| **Client Render Failure** | < 0.5% gagal export ZIP di browser user | < 0.1% | Sentry Error Monitoring pada Canvas Pipeline |

---
*Dokumen ini merupakan spesifikasi teknis dan produk resmi untuk pengembangan sistem Threads Maker v2.0.*
