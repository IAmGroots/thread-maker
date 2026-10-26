# ADR 0003: Billing dengan Pakasir

Status: accepted
Tanggal: 2026-10-17

## Konteks

Pasar awal adalah Indonesia, dengan harga rupiah. Stripe belum tersedia penuh untuk merchant Indonesia (status preview, perlu kontak sales). Pakasir dipilih sebagai payment gateway agregator: QRIS dan virtual account, tanpa biaya bulanan, settlement H+1.

Batasan Pakasir yang membentuk desain (dari dokumentasi API v2):

- Tidak ada langganan berulang. Hanya transaksi sekali bayar.
- Webhook tidak memakai signature HMAC, hanya header `X-Secret`.
- `create-transaction` bersifat find-or-create per pasangan `slug + order_id`.
- Transaksi kedaluwarsa setelah 24 jam.
- Rate limit: 2 request/detik untuk create, 4 detik sekali untuk cek status per transaksi.

## Keputusan

1. Model billing adalah **prepaid period**, bukan auto-charge.
2. Semua akses payment melewati interface `PaymentProvider` (`lib/billing/types.ts`), dengan implementasi pertama `pakasir`.
3. Invoice dan event pembayaran disimpan di database. Webhook tidak dipercaya sendiri, selalu dikonfirmasi ulang.
4. MVP hanya mendukung siklus bulanan. Kolom `billing_period` sudah ada dengan nilai `monthly` dan `semiannual`, tetapi UI 6 bulan ditunda.

### Alur pembayaran

```text
User pilih paket
  -> POST /api/billing/checkout
     -> buat baris invoices (order_id, amount, plan, period_start, period_end)
     -> POST /api/v2/create-transaction/{slug}/{order_id}
     -> simpan txn_id + payment_link / qr_string + expired_at
  -> user bayar di halaman Pakasir
  -> POST /api/billing/pakasir/webhook
     -> verifikasi X-Secret (timing-safe)
     -> cocokkan order_id + amount dengan invoices
     -> GET /api/v2/transaction-status/{slug}/{txn_id} sebagai konfirmasi
     -> insert payment_events (txn_id unik)
     -> aktifkan subscriptions sampai period_end
```

### Aturan invoice

- Format `order_id`: `INV-{workspaceId}-{YYYYMM}-{attempt}`.
- Invoice kedaluwarsa tidak boleh dipakai ulang. Buat `order_id` baru dengan `attempt` bertambah.
- Satu invoice hanya untuk satu periode. Perpanjangan membuat invoice baru.
- Reminder dikirim H-7, H-3, dan H-1 sebelum `current_period_end`.
- Grace period 3 hari setelah `current_period_end`, lalu turun ke Free.
- `is_sandbox=true` ditolak saat `PAKASIR_SANDBOX=false`.

### Biaya dan penetapan harga

Fee QRIS: 0,7% + Rp 310 untuk nominal sampai Rp 105.000, dan 1% tanpa komponen tetap di atas Rp 105.000. Fee VA: Rp 3.500 flat.

| Paket | Harga | Fee QRIS | Bersih QRIS | Fee VA | Bersih VA |
|---|---|---|---|---|---|
| Starter | 49.000 | 653 | 48.347 | 3.500 | 45.500 |
| Creator | 89.000 | 933 | 88.067 | 3.500 | 85.500 |
| Pro | 149.000 | 1.490 | 147.510 | 3.500 | 145.500 |

Keputusan: fee ditanggung merchant. VA hanya ditampilkan untuk Creator dan Pro, karena di Starter fee VA memakan 7,1% margin.

## Konsekuensi

Positif:

- Tanpa biaya tetap dan tanpa proses onboarding payment gateway yang panjang.
- QRIS diterima hampir semua pengguna Indonesia.
- Interface `PaymentProvider` membuat penambahan provider berulang (Mayar, Xendit, Paddle) tidak menyentuh domain logic.

Negatif:

- Tidak ada auto-renew. Churn karena lupa bayar harus ditekan lewat reminder dan grace.
- Webhook tanpa signature menuntut verifikasi berlapis dan rate limit pada endpoint publik.
- Perlu job harian untuk menandai invoice kedaluwarsa dan menurunkan paket.

## Alternatif yang ditolak

| Opsi | Alasan ditolak |
|---|---|
| Stripe | Belum tersedia penuh untuk merchant Indonesia |
| Xendit / Midtrans | Butuh badan usaha dan proses onboarding lebih panjang |
| Paddle / Lemon Squeezy | Merchant of record, tetapi payout dan pajak lebih rumit untuk pasar ID |
| Auto-charge via kartu | Tidak didukung Pakasir |
