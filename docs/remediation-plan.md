# Rencana Implementasi Remediasi, Threvo

> **Catatan penomoran.** Dokumen ini ditulis sebelum migrasi dirapikan. Nomor
> yang dipakai di bawah sudah bergeser: `0007_sync_scopes`, `0008_workspace_security`
> (sekarang `0009`), `0009_target_transactions` (sekarang `0010`),
> `0010_billing_payment_details` (sekarang `0011`), `0011_retention` (sekarang
> `0012`). Untuk daftar yang berlaku, lihat tabel migrasi di `README.md`.
> WP-01 sampai WP-11 sudah dikerjakan.

Dokumen ini adalah rencana teknis untuk menindaklanjuti audit tanggal 17 Oktober 2026.
Belum ada kode yang diubah. Setiap work package (WP) di bawah ini bisa direview,
dipecah menjadi PR, dan dieksekusi berurutan.

Referensi temuan memakai ID audit: `F-01` sampai `F-50`.

## Prinsip eksekusi

1. **Satu WP = satu PR kecil** dengan test dan rollback yang jelas.
2. **Migrasi selalu aditif dan idempotent.** Jangan edit migrasi yang sudah pernah
   dijalankan di staging/produksi; buat migrasi baru.
3. **Server adalah satu-satunya penulis data sensitif.** Setelah P0, browser tidak
   boleh menulis `workspaces`, `social_accounts`, `post_targets`,
   `post_target_media`, `media_assets`, `content_items`, `content_segments`,
   `usage_counters`, `subscriptions`, atau `invoices` secara langsung.
4. **Verifikasi setiap WP** dengan `npm run typecheck`, `npm run lint`, `npm test`,
   dan test baru. Untuk perubahan DB, jalankan di staging lalu cek dengan SQL.
5. **Jangan deploy** selama masih ada item P0 yang belum lulus acceptance criteria.

## Urutan migrasi baru

| File | Isi | Menggantikan |
|---|---|---|
| `0005_sync_scopes.sql` | Placeholder kosong agar versi remote `0005` tetap ada di direktori lokal | F-03 |
| `0007_sync_scopes.sql` | Isi sebenarnya dari perbaikan trigger scopes | F-03 |
| `0008_analytics_notifications_usage.sql` | Rename dari `0005_analytics_notifications_usage.sql` (versi bentrok dengan `0005_sync_scopes`, sehingga sempat dilewati) | F-03 |
| `0009_workspace_security.sql` | Proteksi kolom billing, RPC usage, kolom token, cabut write RLS, trigger konsistensi workspace, fix status konten, index subscription | F-04, F-05, F-06, F-13, F-41 |
| `0010_target_transactions.sql` | RPC atomik `create_post_target`, guard `complete/fail`, heartbeat lease | F-06, F-07, F-18, F-19 |
| `0011_billing_payment_details.sql` | Kolom `qr_string`, `va_number`, `payment_method`, perbaikan renewal `canceled` | F-11, F-38 |
| `0012_retention.sql` | Fungsi retensi analytics/notifications + index | F-31 |
| `0013_library_search_escape.sql` | Escape LIKE + index trigram | F-40 |

Catatan: remote migration history hanya menyimpan nomor versi, bukan nama file.
Karena `0005` sudah dipakai `0005_sync_scopes`, file analytics harus memakai
nomor unik yang lebih besar. Kedua file lama sudah diganti nama, dan isi
`0008` idempotent sehingga aman dijalankan ulang di database yang sudah punya
tabelnya. Verifikasi dengan `supabase migration list` di staging.

---

# P0 — Blocker sebelum deploy

## WP-01 — Perbaiki build Cloudflare (`F-01`)

**Tujuan:** `npm run cf:build` lulus dan menghasilkan `.open-next/worker.js`.

**File:**
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`

**Langkah:**
1. Tambahkan `esbuild` sebagai devDependency di root. Gunakan versi yang sudah
   terbukti dipakai `@opennextjs/aws` di lockfile saat ini (`0.25.4`):
   ```bash
   npm install --save-dev esbuild@^0.25.4
   ```
2. Jalankan `npm run cf:build`. Jika masih gagal, cek resolusi:
   ```bash
   node -e "console.log(require.resolve('esbuild'))"
   ```
3. Tambahkan job CI terpisah agar kegagalan build Cloudflare tidak lolos:
   ```yaml
   cloudflare-build:
     runs-on: ubuntu-latest
     env:
       NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
       NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
       SUPABASE_SERVICE_ROLE_KEY: placeholder-service-key
       TOKEN_ENCRYPTION_KEY: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
       CRON_SECRET: placeholder-cron-secret
       NEXT_TELEMETRY_DISABLED: "1"
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with: { node-version: 20, cache: npm }
       - run: npm ci
       - run: npm run cf:build
   ```
4. Jangan menambahkan `--force` atau mengubah versi Tailwind.

**Verifikasi:**
- `npm run cf:build` exit 0.
- `.open-next/worker.js` dan `.open-next/assets/` ada.
- `npm run build` tetap exit 0.

**Acceptance:** build Cloudflare reproducible di CI.

**Effort:** S.

---

## WP-02 — Cron Cloudflare benar-benar berjalan (`F-02`)

**Tujuan:** trigger `* * * * *` memanggil route cron dengan `CRON_SECRET`.

**File:**
- `custom-worker.ts` (baru)
- `wrangler.toml`
- `cloudflare-env.d.ts`
- `.env.example`, `README.md`

**Langkah:**
1. Buat `custom-worker.ts`:
   ```ts
   // @ts-expect-error .open-next/worker.js dibuat saat build
   import { default as handler } from "./.open-next/worker.js";

   export default {
     fetch: handler.fetch,
     async scheduled(_event, env, ctx) {
       const request = new Request(
         "https://threvo.internal/api/cron/publish-scheduled",
         {
           method: "GET",
           headers: { authorization: `Bearer ${env.CRON_SECRET}` },
         },
       );
       ctx.waitUntil(handler.fetch(request, env, ctx));
     },
   } satisfies ExportedHandler<CloudflareEnv>;
   ```
2. Ubah `wrangler.toml`:
   ```toml
   main = "./custom-worker.ts"
   ```
   Biarkan `[triggers] crons = ["* * * * *"]`.
3. Tambahkan `CRON_SECRET: string` ke `CloudflareEnv` (sudah ada, pastikan
   tipenya tetap).
4. Dokumentasikan `wrangler secret put CRON_SECRET` di README.
5. Uji lokal:
   ```bash
   npx wrangler dev --test-scheduled
   curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
   ```
6. Pastikan route cron tetap menolak request tanpa Bearer yang benar.

**Verifikasi:**
- Log worker menunjukkan `processed` dan `analyticsWorkspaces`.
- Target `scheduled` dengan `scheduled_for <= now()` berubah menjadi `publishing`
  lalu `published`/`failed`.
- `expire_due_subscriptions` dan `create_expiry_reminders` terpanggil.

**Acceptance:** publish terjadwal, expiry, reminder, dan sync analytics berjalan
tanpa scheduler eksternal.

**Effort:** S/M.

---

## WP-03 — Hilangkan duplikasi versi migrasi (`F-03`)

**File:**
- `supabase/migrations/0005_sync_scopes.sql` → `0007_sync_scopes.sql`
- `README.md`, `docs/migration-plan.md`

**Langkah:**
1. `git mv supabase/migrations/0005_sync_scopes.sql supabase/migrations/0007_sync_scopes.sql`
2. Perbarui referensi dokumentasi.
3. Di staging:
   ```bash
   npx supabase migration list
   npm run db:push
   ```
4. Verifikasi fungsi `sync_threads_account_to_social` memakai 5 scope, dan
   backfill `scopes` berjalan.
5. Jika remote sudah mencatat `0005` dan isinya sudah diterapkan, jalankan
   `supabase migration repair --status applied 0007` **hanya** jika `db push`
   mencoba menjalankan ulang dan gagal karena objek sudah ada. Karena SQL-nya
   idempotent, jalankan ulang lebih aman.

**Acceptance:** tidak ada dua file dengan prefix versi sama; `db push` bersih di
staging kosong dan staging yang sudah termigrasi.

**Effort:** S.

---

## WP-04 — Kunci `plan` dan `trial_used` (`F-04`)

**File:**
- `supabase/migrations/0009_workspace_security.sql`
- `README.md` (klaim kuota DB-enforced)

**Langkah:**
1. Tambahkan trigger:
   ```sql
   create or replace function public.protect_workspace_billing_fields()
   returns trigger
   language plpgsql
   security definer
   set search_path = public
   as $$
   begin
     -- Security definer membuat current_user menjadi owner fungsi, jadi
     -- perubahan dari RPC billing tetap diizinkan. Hanya koneksi PostgREST
     -- sebagai authenticated/anon yang diblokir.
     if current_user in ('authenticated', 'anon') then
       if new.plan is distinct from old.plan then
         raise exception 'workspaces.plan is managed by billing';
       end if;
       if new.trial_used is distinct from old.trial_used then
         raise exception 'workspaces.trial_used is managed by billing';
       end if;
       if new.slug is distinct from old.slug then
         raise exception 'workspaces.slug is immutable';
       end if;
     end if;
     return new;
   end;
   $$;

   drop trigger if exists protect_workspace_billing_fields on public.workspaces;
   create trigger protect_workspace_billing_fields
     before update on public.workspaces
     for each row execute function public.protect_workspace_billing_fields();
   ```
2. Cabut update tabel dan berikan hanya kolom non-sensitif:
   ```sql
   revoke update on public.workspaces from authenticated, anon;
   grant update (name, timezone, updated_at)
     on public.workspaces to authenticated;
   ```
   Pastikan trigger `set_workspaces_updated_at` tetap berjalan. Jika kolom
   `updated_at` di-set oleh trigger dan privilege kolom menghalangi, grant juga
   `updated_at` (sudah termasuk di atas).
3. Uji sebagai user owner lewat SQL/PostgREST:
   ```sql
   update public.workspaces set plan = 'pro' where id = '<ws>';
   -- harus error
   ```
4. Uji `start_creator_trial()` dan `apply_paid_invoice()` tetap bisa mengubah
   `plan`/`trial_used`.

**Acceptance:** owner tidak bisa self-upgrade atau reset trial; RPC billing tetap
berfungsi.

**Effort:** S/M.

---

## WP-05 — Hardening RPC usage (`F-05`)

**File:**
- `supabase/migrations/0009_workspace_security.sql`
- `lib/billing/usage.ts`
- `lib/security/aiGuard.ts`
- `app/api/threads/schedule/route.ts`
- `app/api/threads/publish/route.ts`

**Langkah:**
1. Di migrasi, ganti `consume_usage`/`refund_usage` agar hanya `service_role`
   yang bisa mengeksekusi:
   ```sql
   revoke all on function public.consume_usage(uuid, text, text, bigint)
     from public, authenticated, anon;
   revoke all on function public.refund_usage(uuid, text, text, bigint)
     from public, authenticated, anon;
   grant execute on function public.consume_usage(uuid, text, text, bigint)
     to service_role;
   grant execute on function public.refund_usage(uuid, text, text, bigint)
     to service_role;
   ```
2. Di dalam fungsi tambahkan guard defensif:
   ```sql
   if coalesce(auth.role(), '') <> 'service_role' then
     raise exception 'usage functions are service-role only';
   end if;
   ```
3. Ubah `lib/billing/usage.ts` agar `consumeUsage`/`refundUsage` membuat admin
   client sendiri:
   ```ts
   import { createAdminClient } from "@/lib/supabase/admin";

   export async function consumeUsage(
     workspaceId: string,
     metric: UsageMetric,
     amount = 1,
   ): Promise<boolean> {
     const admin = createAdminClient();
     const { data, error } = await admin.rpc("consume_usage", { ... });
     if (error) throw new Error(error.message);
     return data != null;
   }
   ```
   `getUsageSnapshot` tetap memakai user client (RLS select).
4. Perbarui pemanggil di `aiGuard.ts`, `schedule/route.ts`, dan `publish/route.ts`.

**Verifikasi:**
- Dari browser/anon, `rpc('consume_usage', ...)` dan `rpc('refund_usage', ...)`
  menghasilkan `permission denied`.
- Generate AI dan schedule tetap memotong kuota.
- Refund tetap terjadi saat provider AI gagal.

**Acceptance:** tidak ada jalur client untuk menambah/mengembalikan kuota sendiri.

**Effort:** S.

---

## WP-06 — Satu jalur tulis target + konsistensi tenant (`F-06`, `F-14`, `F-18`, `F-19`)

**Tujuan:** semua pembuatan target (schedule dan publish-now) atomik, tervalidasi,
dan memotong kuota sekali.

**File:**
- `supabase/migrations/0009_workspace_security.sql`
- `supabase/migrations/0010_target_transactions.sql`
- `app/api/threads/schedule/route.ts`
- `app/api/threads/publish/route.ts`
- `app/api/targets/[id]/route.ts`
- `app/api/media/route.ts`
- `app/api/threads/callback/route.ts`
- `app/api/threads/disconnect/route.ts`
- `lib/content/items.ts`

**Langkah DB:**
1. Tambahkan trigger konsistensi:
   ```sql
   create or replace function public.assert_post_target_workspace()
   returns trigger language plpgsql security definer set search_path = public as $$
   begin
     if not exists (
       select 1
       from public.content_items ci
       join public.social_accounts sa on sa.id = new.social_account_id
       where ci.id = new.content_item_id
         and ci.workspace_id = new.workspace_id
         and sa.workspace_id = new.workspace_id
     ) then
       raise exception 'post target workspace mismatch';
     end if;
     return new;
   end;
   $$;
   ```
   Trigger `before insert or update of workspace_id, content_item_id,
   social_account_id` pada `post_targets`.
2. Trigger serupa pada `post_target_media` yang memastikan
   `media_assets.workspace_id = post_targets.workspace_id`.
3. Buat RPC atomik `create_post_target` (detail di WP-07/0009) yang:
   - memvalidasi akun aktif dan media milik workspace,
   - mengonsumsi `scheduled_posts` dalam transaksi yang sama,
   - menginsert target + link media,
   - menangani `idempotency_key` duplikat dengan mengembalikan target lama.
4. Cabut write policy RLS untuk tabel yang tidak lagi ditulis client:
   ```sql
   drop policy if exists "Editors can write targets" on public.post_targets;
   drop policy if exists "Editors can write target media" on public.post_target_media;
   drop policy if exists "Editors can write media" on public.media_assets;
   drop policy if exists "Editors can write content items" on public.content_items;
   drop policy if exists "Editors can write content segments" on public.content_segments;
   drop policy if exists "Admins can manage social accounts" on public.social_accounts;
   drop policy if exists "Workspace media insert" on storage.objects;
   drop policy if exists "Workspace media delete" on storage.objects;
   ```
   Policy `select` tetap ada untuk UI.
5. Ganti semua penulisan di route menjadi admin client setelah
   `getCurrentWorkspace()` + pengecekan akun/workspace:
   - `schedule` POST/PATCH/DELETE,
   - `targets/[id]` PATCH/POST/DELETE,
   - `publish` POST,
   - `media` POST/PATCH/DELETE (termasuk upload/remove storage),
   - `threads/callback` upsert,
   - `threads/disconnect` update,
   - `lib/content/items.ts` insert content + segments.
6. Jangan pernah menerima `workspace_id` dari body; selalu dari
   `getCurrentWorkspace()`.

**Verifikasi:**
- Insert `post_targets` langsung sebagai authenticated ditolak.
- Upload media langsung ke storage bucket dengan anon key ditolak.
- Schedule dengan `mediaId` milik workspace lain ditolak 404.
- Schedule gagal validasi tidak memotong kuota.
- Target dan link media selalu ada bersama atau tidak sama sekali.

**Acceptance:** tidak ada jalur tulis client yang melewati kuota/tenant check.

**Effort:** M/L.

---

## WP-07 — Idempotensi publish dan lease (`F-07`, `F-15`, `F-36`)

**File:**
- `supabase/migrations/0010_target_transactions.sql`
- `lib/queue/postgres.ts`
- `lib/queue/types.ts`
- `lib/publish/worker.ts`
- `lib/providers/threads.ts`
- `lib/threads/publish.ts`
- `app/api/threads/publish/route.ts`
- `app/api/threads/schedule/route.ts`
- `components/results/PostToThreadsButton.tsx`
- `components/saved/SchedulePostDialog.tsx`

**Langkah:**
1. **Request id dari UI.** Di `PostToThreadsButton`, buat
   `requestId = crypto.randomUUID()` saat dialog dibuka dan kirim di body.
   Jangan membuat ulang saat retry dalam dialog yang sama.
2. **Schema.** Tambahkan `requestId: z.string().uuid().optional()` ke
   `publishRequestSchema` dan `scheduleRequestSchema`.
3. **Idempotency key.**
   - publish-now: `now:${requestId}` (fallback:
     `now:${sha256(tweets.join("\n") + accountId + minuteBucket)}`).
   - schedule: `${sha256(tweets.join("\n"))}:${accountId}:${scheduledFor}`.
   Jangan memakai `contentItemId` karena raw tweets bisa membuat content item
   baru setiap request.
4. **RPC `create_post_target`** (0009):
   - argumen: workspace, user, content item, account, scheduled_for, timezone,
     idempotency_key, segments jsonb, media id, consume boolean.
   - `security definer`, hanya `service_role` (route memakai admin).
   - insert target; jika `unique_violation` pada `idempotency_key`, select target
     lama dan return.
   - insert `post_target_media` dalam transaksi yang sama.
   - `perform public.consume_usage(...)`; jika null, raise
     `scheduled_posts_exhausted`.
   - return `id`.
5. **Route publish-now** memakai RPC yang sama dengan `scheduled_for = now()`,
   lalu `processTargetById`. Jika RPC mengembalikan target lama yang sudah
   `published`, kembalikan status published tanpa publish ulang.
6. **Checkpoint/lease.**
   - `saveCheckpoint` juga meng-update `locked_at = now()` (heartbeat).
   - Naikkan `LEASE_MS` menjadi 30 menit, atau pertahankan 15 menit dengan
     heartbeat per segmen. Heartbeat wajib.
   - `releaseExpiredLeases` hanya melepas target yang `locked_at` lebih lama dari
     lease.
7. **Guard status.**
   - `complete_post_target` hanya update `where status = 'publishing'`.
   - `fail_post_target` hanya update `where status = 'publishing'`.
   - Jika `complete` dipanggil saat status sudah `published`, no-op.
8. **Resume.** Pastikan `provider.publish` memakai `checkpoint` dan
   `providerState.lastPostId`; jangan mengulang segmen yang sudah terkirim.
9. **Timeout.** Tambahkan `AbortSignal.timeout(20_000)` pada semua fetch Threads
   (create container, poll, publish, insights, refresh token) dan tangani
   `AbortError` sebagai retryable.

**Verifikasi:**
- Double-click publish-now menghasilkan satu `post_targets` dan satu post.
- Simulasi crash setelah checkpoint: retry melanjutkan dari segmen berikutnya.
- Dua worker paralel tidak memproses target yang sama.
- Publish-now memotong kuota satu kali.

**Acceptance:** tidak ada post ganda pada skenario retry normal; residual window
setelah `publishContainer` sukses sebelum checkpoint dicatat didokumentasikan.

**Effort:** L.

---

## WP-08 — Perbaiki logika sandbox Pakasir (`F-10`)

**File:**
- `lib/billing/pakasir.ts`
- `app/api/billing/pakasir/webhook/route.ts`
- `tests/unit/pakasir.test.ts`

**Langkah:**
1. Di `verifyWebhook`, setelah parse payload:
   ```ts
   if (config.sandbox && !parsed.isSandbox) {
     return { valid: false, reason: "live_in_sandbox" };
   }
   if (!config.sandbox && parsed.isSandbox) {
     return { valid: false, reason: "sandbox_in_production" };
   }
   ```
2. Di route webhook, setelah `getStatus`, bandingkan juga
   `state.isSandbox` dengan `config.sandbox` (jangan hanya payload).
3. Pastikan `PAKASIR_SANDBOX=false` di produksi dan dokumentasikan.
4. Tambahkan test: live callback di sandbox ditolak; sandbox callback di
   produksi ditolak; status non-completed diabaikan.

**Acceptance:** tidak ada pembayaran sandbox yang mengaktifkan plan produksi, dan
callback live tidak diterima di sandbox.

**Effort:** S.

---

## WP-09 — Tampilkan QR/VA (`F-11`)

**File:**
- `supabase/migrations/0011_billing_payment_details.sql`
- `app/api/billing/checkout/route.ts`
- `app/api/billing/status/route.ts`
- `app/billing/page.tsx`
- `lib/i18n/en.ts`, `lib/i18n/id.ts`
- `types/database.ts`

**Langkah:**
1. Tambah kolom:
   ```sql
   alter table public.invoices add column if not exists qr_string text;
   alter table public.invoices add column if not exists va_number text;
   alter table public.invoices add column if not exists payment_method text;
   ```
2. Checkout menyimpan `charge.qrString`, `charge.vaNumber`, dan `method`.
3. Response checkout mengembalikan `qrString`, `vaNumber`, `paymentMethod`.
4. UI billing menampilkan:
   - tombol `payment_link` jika ada,
   - QR string (monospace + tombol copy) jika `qrString` ada,
   - nomor VA (monospace + tombol copy) jika `vaNumber` ada.
5. Tambahkan string i18n di `en.ts` dan `id.ts`.
6. Invoice list menampilkan fallback link/QR/VA.

**Acceptance:** checkout sandbox dengan method QRIS/VA selalu memberi cara bayar
yang bisa dipakai, meskipun `payment_link` kosong.

**Effort:** M.

---

## WP-10 — Hapus token saat disconnect (`F-08`, `F-30`)

**File:**
- `supabase/migrations/0011_billing_payment_details.sql` (atau migrasi terpisah)
- `app/api/threads/disconnect/route.ts`
- `lib/legal/content.ts`
- `README.md`

**Langkah:**
1. Ubah kolom agar nullable:
   ```sql
   alter table public.social_accounts alter column access_token_enc drop not null;
   ```
2. Di route disconnect:
   ```ts
   .update({
     status: "revoked",
     access_token_enc: null,
     refresh_token_enc: null,
     updated_at: new Date().toISOString(),
   })
   ```
3. Batalkan target yang belum terkirim:
   ```ts
   .from("post_targets")
   .update({ status: "canceled" })
   .eq("workspace_id", workspace.id)
   .eq("social_account_id", account.id)
   .in("status", ["scheduled", "failed", "partial", "draft"]);
   ```
4. Perbarui teks privasi agar akurat: token dihapus, riwayat publish tetap ada.
5. Pastikan reconnect membuat baris baru/upsert dengan token baru.

**Acceptance:** setelah disconnect, tidak ada token tersimpan; target terjadwal
tidak retry; reconnect berhasil.

**Effort:** S.

---

## WP-11 — Tutup open redirect (`F-09`)

**File:**
- `lib/http/safeRedirect.ts` (baru)
- `app/auth/callback/route.ts`
- `tests/unit/safe-redirect.test.ts` (baru)

**Langkah:**
1. Helper:
   ```ts
   export function safeNextPath(next: string | null): string {
     if (!next) return "/";
     if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
       return "/";
     }
     try {
       const url = new URL(next, "https://app.local");
       if (url.origin !== "https://app.local") return "/";
       return `${url.pathname}${url.search}${url.hash}`;
     } catch {
       return "/";
     }
   }
   ```
2. Gunakan di callback:
   ```ts
   return NextResponse.redirect(`${origin}${safeNextPath(next)}`);
   ```
3. Test: `https://evil.com`, `//evil.com`, `/\evil.com`, `/saved?x=1` (valid),
   `javascript:alert(1)`.

**Acceptance:** hanya path internal yang dipakai.

**Effort:** S.

---

## Gate P0

P0 selesai hanya jika:

- [ ] `npm run cf:build` lulus di CI.
- [ ] Cron trigger terbukti memproses target di staging.
- [ ] Tidak ada dua migrasi dengan versi sama; `db push` bersih.
- [ ] Owner tidak bisa mengubah `plan`/`trial_used`.
- [ ] `consume_usage`/`refund_usage` hanya service role.
- [ ] Direct write ke tabel sensitif ditolak.
- [ ] Publish-now idempoten dan memotong kuota.
- [ ] Sandbox Pakasir tidak bisa mengaktifkan plan produksi.
- [ ] QR/VA tampil.
- [ ] Disconnect menghapus token.
- [ ] Open redirect tertutup.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` lulus.

---

# P1 — Sebelum pelanggan berbayar pertama

## WP-12 — Save library tidak menghapus data (`F-12`)

**File:** `lib/storage/threads.ts`, `app/generator/page.tsx`,
`app/saved/page.tsx`, i18n.

**Langkah:**
1. Hapus blok yang menghapus baris tertua.
2. Jika `count >= maxThreads`, lempar `LibraryLimitError` dengan kode
   `library_full`.
3. UI menampilkan toast dan CTA ke `/billing` atau minta hapus thread.
4. `importThreads` juga menolak jika melebihi cap (atau memotong dengan konfirmasi
   eksplisit; default: tolak).
5. Tampilkan `x / 100` di halaman saved.

**Test:** unit test untuk `saveThread` dengan mock count; e2e tidak perlu.

**Effort:** S.

---

## WP-13 — Sembunyikan ciphertext token (`F-13`)

**File:** `supabase/migrations/0009_workspace_security.sql`, `types/database.ts`.

**Langkah:**
1. Cabut select tabel dan berikan kolom aman:
   ```sql
   revoke select on public.social_accounts from authenticated, anon;
   grant select (
     id, workspace_id, provider, provider_account_id, username, display_name,
     avatar_url, token_expires_at, scopes, status, metadata, connected_by,
     created_at, updated_at
   ) on public.social_accounts to authenticated;
   ```
2. Pastikan semua query client memilih kolom eksplisit (sudah).
3. Worker/admin tetap bisa membaca token karena service role.
4. Tambahkan test SQL bahwa `select access_token_enc` sebagai authenticated gagal.

**Effort:** S/M.

---

## WP-14 — Validasi media di publish (`F-14`)

**File:** `lib/media/access.ts` (baru), `app/api/threads/publish/route.ts`,
`app/api/threads/schedule/route.ts`, `supabase/migrations/0008...`.

**Langkah:**
1. Helper:
   ```ts
   export async function assertMediaInWorkspace(
     supabase: SupabaseClient<Database>,
     workspaceId: string,
     mediaId: string,
   ): Promise<boolean>
   ```
2. Panggil di kedua route sebelum insert.
3. Trigger DB di WP-06 menjadi pertahanan terakhir.

**Effort:** S.

---

## WP-15 — Audit dependency (`F-16`)

**Langkah:**
1. `npm audit --omit=dev`.
2. `npm audit fix` (tanpa `--force`).
3. Untuk `sharp`, tambahkan `overrides` hanya jika kompatibel dengan Next 15;
   uji `npm run build` dan image optimization.
4. Untuk `braces`, `postcss-selector-parser`, `source-map-js`, update transitive
   via `npm update` atau override terkontrol.
5. Dokumentasikan hasil di PR.

**Acceptance:** tidak ada high/critical di `npm audit --omit=dev`; build/e2e lulus.

**Effort:** S/M.

---

## WP-16 — Release hygiene (`F-17`)

**Langkah:**
1. Tambahkan `supabase/.temp/` ke `.gitignore`.
2. `git rm -r --cached supabase/.temp` jika sudah tracked.
3. Commit pekerjaan saat ini dalam potongan logis sebelum remediasi:
   - `feat: workspace surfaces`
   - `feat: billing and queue`
   - `chore: docs and config`
4. Jangan deploy dari working tree kotor.

**Effort:** S.

---

## WP-17 — Guard reschedule (`F-20`)

**File:** `app/api/targets/[id]/route.ts`.

**Langkah:**
1. Hapus `"publishing"` dari `.in("status", [...])`.
2. Validasi `scheduledFor` harus > now (Zod refine).
3. Gunakan `.select("id")` dan cek `data.length === 1`; jika 0, return 409.
4. Untuk publish-now, gunakan RPC/claim yang sudah ada; jangan update target yang
   sedang `publishing`.

**Effort:** S.

---

## WP-18 — Perbaiki state generator (`F-21`)

**File:** `app/generator/page.tsx`, `components/results/PostToThreadsButton.tsx`.

**Langkah:**
1. Saat `handleGenerate`, `setSavedThreadIdByVersion({})`.
2. Saat `handleSave`, simpan `saved.metadata.id` ke versi aktif.
3. Saat load dari sessionStorage, set
   `setSavedThreadIdByVersion({ 1: loadedThread.metadata.id })`.
4. `PostToThreadsButton` harus menerima `accountId` yang dipilih agar
   `publishedThreadIds` terisi; atau pindahkan badge ke parent yang sudah punya
   `selectedAccountId`.
5. Setelah publish sukses, panggil `refresh(accountId)`.

**Effort:** S.

---

## WP-19 — Affiliate key points & CTA (`F-22`)

**File:** `components/generator/AffiliateSection.tsx`, `lib/ai/prompts.ts`,
`types/thread.ts`.

**Langkah:**
1. Tambahkan state lokal untuk textarea key points (satu baris per poin):
   ```tsx
   value={(product.keyPoints ?? []).join("\n")}
   onChange={(e) => updateProduct({
     keyPoints: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
   })}
   ```
2. Di prompt, gunakan `ctaPlacement`:
   - `last_tweet`: CTA di tweet terakhir.
   - `reply`: minta CTA sebagai balasan terpisah, atau tambahkan segmen terakhir
     secara eksplisit di server setelah generate.
3. Jika `reply` tidak didukung oleh format output, hapus opsi dari UI daripada
   menyimpan setting yang tidak dipakai.
4. Tambahkan test prompt yang memastikan `keyPoints` dan `ctaPlacement` muncul.

**Effort:** S/M.

---

## WP-20 — Export seluruh library (`F-23`)

**File:** `app/api/library/export/route.ts` (baru), `app/saved/page.tsx`,
`lib/storage/library-server.ts`.

**Langkah:**
1. Route `GET /api/library/export?format=json|txt&query=...`:
   - auth + workspace,
   - loop `listLibraryPage` dengan limit 50 sampai `hasMore=false` (cap 1000),
   - format JSON/TXT memakai helper yang sudah ada,
   - `Content-Disposition: attachment`.
2. UI memanggil route dan mengunduh blob, bukan `filteredThreads`.
3. Toast menjelaskan bahwa seluruh hasil (termasuk yang belum dimuat) diekspor.

**Effort:** S.

---

## WP-21 — Unread count notifikasi (`F-24`)

**File:** `app/api/notifications/route.ts`, `components/notifications/notification-bell.tsx`.

**Langkah:**
1. Di GET, hitung unread dengan query `count: "exact", head: true` dan
   `read_at is null`, terpisah dari list limit.
2. Return `unreadCount` dari count, bukan dari 10 item.
3. `markAllRead` memanggil PATCH tanpa `ids` (sudah mendukung semua) atau dengan
   semua id; badge langsung 0.
4. Test route dengan mock count.

**Effort:** S.

---

## WP-22 — Aturan karakter Threads (`F-25`)

**File:** `lib/utils.ts`, `components/results/AdjustLengthDialog.tsx`,
`components/results/PostToThreadsButton.tsx`, `lib/validations/threads.ts`,
`tests/unit/utils.test.ts`.

**Langkah:**
1. Tambahkan `countThreadsChars(text)` yang menghitung panjang Unicode sebenarnya
   (Threads limit 500; tidak ada aturan URL 23 seperti Twitter).
2. Ganti pemakaian di UI publish/adjust length.
3. `isValidTweetLength` dipertahankan untuk kompatibilitas atau dihapus jika tidak
   dipakai.
4. Update label `/280` menjadi `/500`.
5. Test dengan teks + URL dan emoji.

**Effort:** S/M.

---

## WP-23 — Queue & calendar UX (`F-26`)

**File:** `app/queue/page.tsx`, `app/calendar/page.tsx`, `lib/calendar/grid.ts`,
`components/saved/ScheduledList.tsx`, i18n.

**Langkah:**
1. Queue menampilkan preview 1–2 baris isi konten (ambil dari
   `content_override.segments` atau join `content_segments` di API GET).
2. Cancel memakai `AlertDialog` konfirmasi.
3. Reschedule menolak waktu lampau di UI dan API.
4. Calendar:
   - tambahkan tombol "Reschedule" per item sebagai alternatif drag,
   - dukung keyboard (Enter/Space membuka dialog),
   - gunakan timezone workspace untuk label, bukan timezone browser,
   - tampilkan lebih dari 2 item per hari dengan daftar scroll.
5. Tambahkan test unit untuk `moveToDay` dan validasi masa depan.

**Effort:** M.

---

## WP-24 — Pagination & query efisien (`F-27`)

**Langkah:**
1. `GET /api/threads/schedule`: tambahkan `limit`/`offset` (default 50) dan
   filter status; UI queue/calendar memakai paging.
2. `GET /api/analytics`: batasi snapshot dengan `limit` atau agregasi SQL
   (`distinct on (provider_post_id)`), bukan mengambil semua 90 hari.
3. `mediaUsageBytes`: gunakan RPC `sum(size_bytes)` atau select agregat, bukan
   semua baris.
4. Pertimbangkan memindahkan `cookies()` locale ke komponen yang membutuhkan agar
   halaman publik bisa static; ukur dampak build.
5. Tambahkan index trigram untuk pencarian library jika data besar:
   ```sql
   create extension if not exists pg_trgm;
   create index if not exists idx_saved_threads_topic_trgm
     on public.saved_threads using gin (topic gin_trgm_ops);
   ```

**Effort:** M.

---

## WP-25 — Rate limit produksi (`F-28`)

**Langkah:**
1. Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, dan
   `TRUSTED_IP_HEADER=cf-connecting-ip` di Cloudflare.
2. Pastikan `lib/security/rateLimit.ts` memakai Redis jika env tersedia dan
   fallback in-memory hanya untuk dev.
3. Dokumentasikan di README bahwa tanpa Upstash rate limit hanya best-effort.
4. Tambahkan test bahwa header spoof tidak mengubah key saat trusted header
   dikonfigurasi.

**Effort:** S.

---

## WP-26 — Batasi analytics sync & suggest-topics (`F-29`)

**Langkah:**
1. `POST /api/analytics`: gunakan `checkRateLimit(user, "analytics-sync")` dan
   cooldown per workspace (mis. 5 menit) sebelum memanggil Threads.
2. `suggest-topics`: tetap tanpa credit, tetapi tambahkan rate limit per user dan
   cache hasil per topik (mis. 24 jam) untuk mengurangi biaya provider.
3. Catat biaya provider di log.

**Effort:** S/M.

---

## WP-27 — Observability, retensi, error boundary (`F-31`)

**Langkah:**
1. Tambahkan `app/error.tsx` dan `app/global-error.tsx` dengan pesan i18n dan
   tombol retry.
2. Integrasikan Sentry (atau Cloudflare Logpush) untuk error server/client.
3. Tambahkan health endpoint `GET /api/health` (tanpa auth) yang mengecek DB dan
   versi build.
4. Implementasikan `0012_retention.sql`:
   - `prune_analytics()` berdasarkan `analyticsRetentionDays` plan,
   - `prune_notifications()` (mis. 90 hari),
   - panggil dari cron.
5. Dokumentasikan backup Supabase (PITR) dan prosedur restore.

**Effort:** M/L.

---

## WP-28 — Test route, RLS, worker, billing (`F-32`)

**Langkah:**
1. Tambahkan test unit untuk:
   - `safeNextPath`,
   - `countThreadsChars`,
   - `create_post_target` idempotency (mock RPC),
   - `verifyWebhook` sandbox cases,
   - `backoffMs` dan lease.
2. Tambahkan integration test DB (staging) untuk:
   - RLS lintas tenant,
   - owner tidak bisa update plan,
   - `consume_usage` ditolak untuk authenticated,
   - `post_targets` cross-workspace ditolak.
3. Tambahkan e2e dengan user uji:
   - login → generate → save → publish (mock provider),
   - schedule → queue → cancel,
   - billing checkout sandbox.
4. Tambahkan job CI `cf:build` dan e2e opsional.

**Effort:** M/L.

---

# P2 — Kualitas dan skala

| WP | Temuan | Perubahan teknis | Effort |
|---|---|---|---|
| WP-29 | F-33 | `regenerate-tweet` mengirim `style`, `tone`, `language`, `affiliate`, `useHook`, `useCTA` ke prompt; tambahkan test prompt | S |
| WP-30 | F-34 | Cron batch 3–5 target dengan time guard 20 detik; analytics round-robin per workspace (cursor) | M |
| WP-31 | F-35 | `getRequestOrigin` hanya percaya `X-Forwarded-Host` jika ada di `TRUSTED_HOSTS`; default ke `NEXT_PUBLIC_APP_URL` | S |
| WP-32 | F-36 | Timeout/AbortSignal di semua fetch Threads dan refresh token; test abort | S |
| WP-33 | F-37 | Checkout memakai `admin.rpc("plan_price", ...)`; batasi method Starter ke QRIS; status API mengembalikan harga dari RPC | S/M |
| WP-34 | F-38 | `apply_paid_invoice` memakai `current_period_end` terakhir meski status `canceled`/`past_due`; test renewal | S |
| WP-35 | F-39 | Set capability `video/carousel/delete` ke `false` sampai implementasi ada; atau implementasikan `deletePost` | S |
| WP-36 | F-27 | Index `subscriptions(status, current_period_end)`; index `notifications(created_at)`; index trigram library | S |
| WP-37 | F-42/F-43 | Zod untuk media PATCH/DELETE & notifications; malformed JSON → 400; update/delete cek row count; publish failure → 502/409 yang sesuai | M |
| WP-38 | F-49 | `app/robots.ts`, `app/sitemap.ts`, meta OG; lengkapi settings workspace (nama/timezone) dengan API baru | M |

---

# P3 — Kebersihan jangka panjang

| WP | Temuan | Perubahan teknis | Effort |
|---|---|---|---|
| WP-39 | F-40 | Pakai `buildSearchPattern` di RPC atau escape wildcard di SQL; test `%`/`_` | S |
| WP-40 | F-41 | Perbaiki `refresh_content_status` agar `count(*) = 0` → `draft`; backfill | S |
| WP-41 | F-47 | Hapus `zustand`, `hooks/useLocalStorage.ts`, `lib/billing/periods.ts` (atau pakai), dead exports; pastikan test tidak bergantung | S |
| WP-42 | F-48 | Sinkronkan README/ADR/pricing/schema/DESIGN dengan kode; perbaiki karakter rusak; perbarui klaim keamanan | M |
| WP-43 | F-46 | Dukung rotasi `TOKEN_ENCRYPTION_KEY` dengan key id/version dan re-enkripsi bertahap | M |
| WP-44 | F-50 | Migrasi library dari `saved_threads.user_id` ke `workspace_id`; update RLS dan search | L |
| WP-45 | F-45 | Ganti CSP `unsafe-inline` dengan nonce/hash untuk script | M |
| WP-46 | F-44 | Terapkan origin check ke `/auth/signout` | S |

---

# Detail migrasi `0010_target_transactions.sql`

RPC inti yang disarankan:

```sql
create or replace function public.create_post_target(
  p_workspace uuid,
  p_user uuid,
  p_content_item uuid,
  p_social_account uuid,
  p_scheduled_for timestamptz,
  p_timezone text,
  p_idempotency_key text,
  p_segments jsonb,
  p_media uuid default null,
  p_consume boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_allowed bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'create_post_target is service-role only';
  end if;

  if p_consume then
    v_allowed := public.consume_usage(
      p_workspace,
      to_char(now() at time zone 'utc', 'YYYY-MM'),
      'scheduled_posts',
      1
    );
    if v_allowed is null then
      raise exception 'scheduled_posts_exhausted' using errcode = 'P0001';
    end if;
  end if;

  begin
    insert into public.post_targets (
      workspace_id, content_item_id, social_account_id, scheduled_for,
      timezone, status, content_override, idempotency_key
    )
    values (
      p_workspace, p_content_item, p_social_account, p_scheduled_for,
      p_timezone, 'scheduled', jsonb_build_object('segments', p_segments),
      p_idempotency_key
    )
    returning id into v_target;
  exception when unique_violation then
    select id into v_target
    from public.post_targets
    where idempotency_key = p_idempotency_key
      and workspace_id = p_workspace;
    if v_target is null then
      raise;
    end if;
  end;

  if p_media is not null then
    insert into public.post_target_media (post_target_id, media_asset_id, position)
    values (v_target, p_media, 0)
    on conflict do nothing;
  end if;

  return v_target;
end;
$$;

revoke all on function public.create_post_target(
  uuid, uuid, uuid, uuid, timestamptz, text, text, jsonb, uuid, boolean
) from public, authenticated, anon;
grant execute on function public.create_post_target(
  uuid, uuid, uuid, uuid, timestamptz, text, text, jsonb, uuid, boolean
) to service_role;
```

Catatan: `consume_usage` harus tetap service-role-only (WP-05). Karena RPC ini
dipanggil dengan admin client, `auth.role()` adalah `service_role`.

# Detail guard worker

`lib/queue/postgres.ts`:

```ts
async saveCheckpoint(id, checkpoint, providerState) {
  const { error } = await client
    .from("post_targets")
    .update({
      checkpoint,
      provider_state: providerState as unknown as Json,
      locked_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "publishing");
  if (error) throw new Error(`Failed to save checkpoint: ${error.message}`);
}
```

`complete_post_target`/`fail_post_target`:

```sql
update public.post_targets
set ...
where id = p_id and status = 'publishing';
```

# Rencana test minimum

| Level | Test | Perintah |
|---|---|---|
| Unit | safe redirect, char count, pakasir sandbox, backoff, idempotency key | `npm test` |
| Build | Next build + Cloudflare build | `npm run build && npm run cf:build` |
| E2E | smoke + login/generate/save/schedule/publish mock | `npm run test:e2e` |
| DB staging | RLS lintas tenant, plan protection, usage RPC | script SQL/manual |
| Cron staging | `wrangler dev --test-scheduled` + target due | manual |
| Billing staging | checkout sandbox + webhook + status | manual |

# Rollback

| Perubahan | Rollback |
|---|---|
| Migrasi 0008/0009/0010/0011 | Buat migrasi `down` terpisah yang menghapus trigger/kolom/fungsi baru; jangan drop data |
| Custom worker | Kembalikan `main` ke `.open-next/worker.js`, hapus `custom-worker.ts` |
| Perubahan route ke admin client | Revert PR; RLS write policy lama masih bisa dikembalikan dari migrasi sebelumnya |
| Idempotency | Kembalikan pembuatan key ke perilaku lama; target lama tetap valid |
| Billing QR/VA | Kolom nullable, UI fallback ke payment_link |

# Urutan eksekusi yang disarankan

1. **Minggu 1:** WP-01, WP-02, WP-03, WP-16.
2. **Minggu 1–2:** WP-04, WP-05, WP-13 (satu PR keamanan DB).
3. **Minggu 2:** WP-06, WP-07, WP-14 (satu PR transaksi/idempotensi).
4. **Minggu 2–3:** WP-08, WP-09, WP-10, WP-11.
5. **Gate P0:** jalankan seluruh verifikasi + staging manual.
6. **Minggu 3–4:** WP-12, WP-17, WP-18, WP-19, WP-20, WP-21, WP-22.
7. **Minggu 4–5:** WP-23, WP-24, WP-25, WP-26, WP-27, WP-28.
8. **Setelah stabil:** P2 lalu P3.

# Risiko residual yang harus diterima/dipantau

- Threads API tidak menyediakan idempotency key platform. Window antara
  `publishContainer` sukses dan checkpoint tersimpan tetap ada; mitigasi:
  checkpoint per segmen + heartbeat + rekonsiliasi manual.
- Payload webhook Pakasir belum diverifikasi terhadap dokumentasi resmi di
  environment nyata; WP-08 harus diuji dengan sandbox.
- `sharp` dan image optimization di Cloudflare belum terbukti sampai
  `cf:build` + deploy staging berhasil.
- RLS runtime belum diuji otomatis; WP-28 harus menambahkan integration test.

---

# Status Implementasi (17 Oktober 2026)

Kode sudah diubah untuk P0, P1, P2, dan sebagian P3. Migrasi **belum dijalankan**
ke database mana pun; jalankan `npm run db:push` di staging sebelum deploy.

## Sudah diimplementasikan

| WP | Status | Ringkasan |
|---|---|---|
| WP-01 | Selesai | `esbuild` ditambahkan, `open-next.config.ts` memakai `defineCloudflareConfig()`, job CI `cloudflare-build`. `npm run cf:build` lulus. |
| WP-02 | Selesai | `custom-worker.ts` dengan handler `scheduled`, `wrangler.toml` memakai entry tersebut. |
| WP-03 | Selesai | `0005_sync_scopes.sql` -> `0007_sync_scopes.sql`; `0005_analytics_notifications_usage.sql` -> `0008_analytics_notifications_usage.sql` (versi `0005` sudah terpakai, sehingga file ini sempat dilewati remote). |
| WP-04 | Selesai | Trigger + column privileges melindungi `plan`, `trial_used`, `slug`. |
| WP-05 | Selesai | `consume_usage`/`refund_usage` hanya `service_role`; pemanggil memakai admin client. |
| WP-06 | Selesai | Write RLS dicabut; route memakai admin client setelah auth/workspace check; trigger konsistensi tenant. |
| WP-07 | Selesai | RPC `create_post_target` (kuota + target + media atomik), idempotency key deterministik, guard status worker, heartbeat lease, timeout fetch. |
| WP-08 | Selesai | Sandbox/live mismatch ditolak di verifikasi webhook dan status provider. |
| WP-09 | Selesai | `qr_string`, `va_number`, `payment_method` disimpan; UI menampilkan QR (qrcode) dan VA dengan tombol copy. |
| WP-10 | Selesai | Disconnect menghapus token, membatalkan target terjadwal, dan menghapus salinan legacy. |
| WP-11 | Selesai | `safeNextPath` + test; `getRequestOrigin` memakai `NEXT_PUBLIC_APP_URL` dan menolak host aneh. |
| WP-12 | Selesai | Save/import menolak saat cap tercapai (`LibraryLimitError`), tidak menghapus data. |
| WP-13 | Selesai | Select `social_accounts` dibatasi per kolom; token tidak terbaca browser. |
| WP-14 | Selesai | `mediaBelongsToWorkspace` dipakai di schedule dan publish. |
| WP-15 | Sebagian | `npm audit fix` menaikkan `sharp` ke 0.35.5 dan `source-map-js` ke 1.2.2. Sisa `braces`/`postcss-selector-parser` hanya lewat Tailwind 3 dan fix-nya butuh Tailwind 4 (breaking), jadi diterima sebagai risiko build-time. |
| WP-16 | Selesai | `supabase/.temp` di-ignore (verifikasi manual saat commit). |
| WP-17 | Selesai | Reschedule menolak status `publishing` dan waktu lampau; row-count dicek. |
| WP-18 | Selesai | State `savedThreadIdByVersion` dibersihkan/diisi dengan benar; badge publish memakai `accountId`. |
| WP-19 | Selesai | Key points terhubung ke state; `ctaPlacement` dipakai di prompt. |
| WP-20 | Selesai | `GET /api/library/export` mengekspor seluruh hasil, bukan halaman termuat. |
| WP-21 | Selesai | Unread count dihitung terpisah; mark-all-read berlaku untuk semua. |
| WP-22 | Selesai | `countThreadsChars` (500, URL penuh, emoji = 1) dipakai di UI dan server. |
| WP-23 | Sebagian | Preview queue, konfirmasi cancel, reschedule masa depan, daftar kalender scroll + dialog reschedule (alternatif drag). Label kalender masih memakai timezone browser, belum timezone workspace. |
| WP-24 | Selesai | Pagination target, agregat media via RPC, index trigram library. |
| WP-25 | Sebagian | Kode mendukung Upstash + `TRUSTED_IP_HEADER`; nilai produksi tetap harus diisi. |
| WP-26 | Selesai | Rate limit sync analytics + cooldown 5 menit. |
| WP-27 | Sebagian | `app/error.tsx`, `app/global-error.tsx`, `/api/health`, retensi analytics/notifikasi. Error tracking eksternal (Sentry) belum dipasang. |
| WP-28 | Sebagian | Test unit baru untuk redirect, karakter Threads, idempotency, sandbox Pakasir. Test RLS/integrasi DB belum ada. |
| WP-29 | Selesai | Regenerate mengirim style/tone/language/affiliate/opsi konten. |
| WP-30 | Selesai | Batch cron 3 target; retensi ikut dijalankan. |
| WP-31 | Selesai | `X-Forwarded-Host` disanitasi dan `NEXT_PUBLIC_APP_URL` diprioritaskan. |
| WP-32 | Selesai | Semua fetch Threads memakai timeout; timeout dianggap retryable. |
| WP-33 | Selesai | Harga dari `plan_price()`; method VA ditolak untuk Starter. |
| WP-34 | Selesai | Renewal memakai `current_period_end` juga untuk `canceled`/`past_due`. |
| WP-35 | Selesai | Capability video/carousel/delete diset `false`. |
| WP-36 | Selesai | Index `subscriptions(status, current_period_end)`, `notifications(created_at)`, trigram library. |
| WP-37 | Selesai | Zod untuk media/notifications, malformed JSON -> 400, row-count dicek, guard AI dibungkus try/catch. |
| WP-38 | Selesai | `robots.ts`, `sitemap.ts`, edit nama/timezone workspace via `PATCH /api/workspace`. |
| WP-39 | Selesai | Pola LIKE di-escape sebelum RPC; wildcard dicocokkan literal. |
| WP-40 | Selesai | Konten tanpa target kembali `draft`. |
| WP-41 | Sebagian | `zustand` dan `useLocalStorage` dihapus; dead export notifikasi dihapus. |
| WP-42 | Sebagian | README diperbarui (1-15, cron, env baru); dokumen lain belum disinkronkan penuh. |
| WP-43 | Selesai | Dekripsi fallback ke `TOKEN_ENCRYPTION_KEY_OLD`. |
| WP-46 | Selesai | `/auth/signout` memeriksa Origin. |

## Ditunda (butuh keputusan produk/arsitektur)

| WP | Alasan |
|---|---|
| WP-44 | Migrasi library dari `user_id` ke `workspace_id` mengubah RLS dan seluruh query library; MVP masih satu workspace per user. |
| WP-45 | CSP nonce/hash memerlukan perubahan rendering Next dan pengujian menyeluruh; `unsafe-inline` masih dipakai. |
| WP-27 (Sentry) | Butuh akun/DSN dan keputusan vendor observability. |
| WP-28 (integration test) | Butuh database staging dan kredensial; test unit sudah ditambah. |

## Langkah verifikasi manual sebelum deploy

1. `npm run db:push` di staging, lalu cek `supabase migration list`.
2. Login sebagai owner, coba `update workspaces set plan='pro'` lewat PostgREST: harus gagal.
3. Dari browser, `rpc('consume_usage', ...)`: harus `permission denied`.
4. `select access_token_enc from social_accounts`: harus gagal.
5. Schedule + publish-now dua kali dengan request id sama: satu target, satu post.
6. Disconnect akun: token null, target terjadwal `canceled`.
7. Checkout sandbox QRIS: QR tampil dan bisa discan.
8. `wrangler dev --test-scheduled` + `curl /__scheduled`: cron memproses target due.
