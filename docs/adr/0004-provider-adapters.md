# ADR 0004: Provider Adapters

Status: accepted
Tanggal: 2026-10-17

## Konteks

Semua kode publish saat ini khusus Threads (`lib/threads/*`, `app/api/threads/*`). Menambah Instagram, Facebook, Pinterest, dan TikTok dengan menyalin pola yang sama akan menghasilkan empat jalur publish yang berbeda, empat cara menangani token, dan empat tempat yang harus diperbaiki saat API platform berubah.

Platform juga berbeda secara mendasar:

- Threads dan Pinterest memakai container dua langkah.
- Instagram dan TikTok mewajibkan media, bukan teks.
- TikTok punya mode upload ke inbox ketika audit belum disetujui.
- Masa hidup token berbeda jauh (TikTok sekitar 24 jam, Threads sekitar 60 hari).

## Keputusan

Satu interface untuk semua provider, dengan kapabilitas yang dideklarasikan per provider.

```ts
export interface SocialProvider {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  getAuthUrl(input: AuthUrlInput): string;
  exchangeCode(input: ExchangeInput): Promise<TokenSet>;
  refreshToken(input: RefreshInput): Promise<TokenSet>;
  getProfile(accessToken: string): Promise<ProviderProfile>;
  validatePost(input: PostInput): ValidationResult;
  publish(input: PublishInput): Promise<PublishResult>;
  deletePost?(input: DeleteInput): Promise<void>;
  getAnalytics?(input: AnalyticsInput): Promise<RawMetrics[]>;
}

export interface ProviderCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  carousel: boolean;
  thread: boolean;
  analytics: boolean;
  delete: boolean;
  requiresMedia: boolean;
}
```

### Aturan implementasi

- Worker tidak boleh memanggil API platform secara langsung. Semua lewat `registry.get(provider)`.
- Setiap adapter mengembalikan `PublishResult` yang sudah dinormalisasi (`providerPostId`, `url`, `status`, `raw`). Worker tidak membaca bentuk respons platform.
- `validatePost` dipanggil sebelum enqueue, bukan saat publish. Kesalahan yang bisa dideteksi lebih awal tidak boleh menjadi kegagalan antrian.
- `publish` harus idempoten terhadap `idempotencyKey`. Jika platform menyediakan dedupe, pakai. Jika tidak, cek `provider_post_id` yang sudah tersimpan sebelum mengirim ulang.
- Adapter tidak menyentuh database. Ia menerima token dan input, mengembalikan hasil.
- `lib/threads/*` yang sudah ada dipertahankan sebagai inti adapter Threads. Yang berubah hanya pembungkusnya.

### Urutan implementasi

| Tahap | Provider | Catatan |
|---|---|---|
| MVP | Threads | Sudah ada, tinggal dibungkus |
| Pasca-MVP 1 | Instagram, Facebook Pages | Satu app Meta, satu proses review |
| Pasca-MVP 2 | Pinterest | Image wajib, board wajib |
| Pasca-MVP 3 | TikTok | Video wajib, audit Content Posting API, fallback inbox |

## Konsekuensi

Positif:

- Penambahan provider adalah satu file adapter plus satu entri registry.
- Perbedaan kapabilitas menjadi data, sehingga composer bisa menyesuaikan diri tanpa `if (provider === ...)` yang tersebar.
- Perubahan API platform terisolasi.

Negatif:

- Interface harus cukup umum untuk kasus yang belum ada (video, carousel, upload bertahap). Risiko over-abstraction.
- Mitigasi: interface dijaga minimal. Field khusus provider disimpan di `provider_state` dan `raw`, bukan ditambahkan ke tipe bersama.

## Alternatif yang ditolak

| Opsi | Alasan ditolak |
|---|---|
| Satu fungsi `publish(text, provider)` | Tidak cukup untuk media dan upload bertahap |
| Library pihak ketiga (Ayrshare, Post Bridge) | Biaya per post dan kontrol terbatas atas error |
| Salin pola Threads per provider | Empat jalur yang harus diperbaiki terpisah setiap ada perubahan |
