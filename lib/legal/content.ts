export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const LEGAL_UPDATED_AT = "17 Oktober 2026";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Data yang kami simpan",
    paragraphs: [
      "Data akun: alamat email, nama tampilan, dan foto profil yang Anda berikan saat masuk dengan Google.",
      "Data konten: topik, teks thread, pengaturan generator, tag, dan catatan yang Anda simpan di perpustakaan.",
      "Data akun sosial: nama pengguna, ID akun platform, izin akses (scope), dan token akses. Token disimpan dalam bentuk terenkripsi AES-256-GCM dan tidak pernah dikirim ke browser.",
      "Data publikasi: jadwal, status publish, ID post di platform, dan pesan kesalahan.",
      "Data penggunaan: waktu akses, endpoint yang dipanggil, dan jumlah permintaan, untuk keamanan dan kuota.",
    ],
  },
  {
    heading: "2. Untuk apa data digunakan",
    paragraphs: [
      "Menyediakan fitur yang Anda minta: membuat konten, menyimpan draf, menjadwalkan, dan mempublikasikan ke akun sosial yang Anda hubungkan.",
      "Menjaga keamanan layanan, mencegah penyalahgunaan, dan menegakkan batas paket.",
      "Memberi dukungan ketika Anda melaporkan masalah.",
      "Kami tidak menjual data Anda dan tidak memakainya untuk iklan pihak ketiga.",
    ],
  },
  {
    heading: "3. Siapa yang memproses data",
    paragraphs: [
      "Supabase: basis data dan autentikasi.",
      "Cloudflare: hosting aplikasi dan penjadwal publish.",
      "Penyedia model AI: menerima teks yang Anda kirim untuk menghasilkan konten. Jangan masukkan data pribadi sensitif ke dalam topik atau prompt.",
      "Meta (Threads): menerima konten dan token saat Anda menghubungkan akun dan mempublikasikan.",
      "Pakasir: memproses pembayaran. Data kartu atau rekening tidak pernah melewati server Threvo.",
    ],
  },
  {
    heading: "4. Penyimpanan dan keamanan",
    paragraphs: [
      "Data disimpan di pusat data penyedia di atas. Akses ke basis data dibatasi dengan row-level security per pengguna.",
      "Token akses sosial dienkripsi sebelum disimpan. Kunci enkripsi hanya tersedia di server.",
      "Tidak ada sistem yang sepenuhnya aman. Jika terjadi insiden yang berdampak pada data Anda, kami akan memberi tahu sesuai kewajiban yang berlaku.",
    ],
  },
  {
    heading: "5. Berapa lama data disimpan",
    paragraphs: [
      "Konten dan akun sosial disimpan selama akun Anda aktif, atau sampai Anda menghapusnya.",
      "Setelah penghapusan akun, data dihapus dari sistem aktif. Salinan cadangan dapat bertahan hingga 30 hari sebelum terhapus otomatis.",
      "Catatan transaksi pembayaran dapat disimpan lebih lama jika diwajibkan oleh peraturan perpajakan.",
    ],
  },
  {
    heading: "6. Hak Anda",
    paragraphs: [
      "Anda dapat melihat dan mengubah konten kapan saja di dalam aplikasi.",
      "Anda dapat memutus koneksi akun sosial di halaman Pengaturan. Token untuk akun tersebut dihapus.",
      "Anda dapat meminta salinan atau penghapusan data dengan menghubungi kami di alamat kontak di bawah.",
    ],
  },
  {
    heading: "7. Cookie dan penyimpanan lokal",
    paragraphs: [
      "Kami memakai cookie untuk sesi login. Tanpa cookie ini Anda tidak dapat masuk.",
      "Preferensi bahasa dan tema disimpan di penyimpanan lokal browser Anda, bukan di server.",
    ],
  },
  {
    heading: "8. Anak",
    paragraphs: [
      "Layanan ini bukan untuk anak-anak. Kami tidak dengan sengaja mengumpulkan data dari anak di bawah usia yang diizinkan oleh hukum yang berlaku.",
    ],
  },
  {
    heading: "9. Perubahan kebijakan",
    paragraphs: [
      "Jika kebijakan ini berubah secara material, kami akan menampilkan pemberitahuan di aplikasi sebelum perubahan berlaku.",
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Layanan",
    paragraphs: [
      "Threvo membantu Anda membuat konten, menyimpannya, menjadwalkan, dan mempublikasikannya ke akun media sosial yang Anda hubungkan.",
      "Threvo bukan afiliasi platform media sosial mana pun. Setiap platform memiliki ketentuan sendiri yang tetap berlaku.",
    ],
  },
  {
    heading: "2. Akun Anda",
    paragraphs: [
      "Anda bertanggung jawab atas keamanan akun dan perangkat Anda.",
      "Anda harus memiliki hak untuk menghubungkan akun sosial yang Anda tambahkan.",
      "Satu orang tidak boleh menggunakan layanan untuk mengelola akun milik orang lain tanpa izin.",
    ],
  },
  {
    heading: "3. Konten Anda",
    paragraphs: [
      "Anda tetap memiliki konten yang Anda buat. Kami hanya menyimpannya untuk menjalankan layanan.",
      "Anda bertanggung jawab atas isi konten, termasuk kepatuhan terhadap hukum, hak cipta, dan aturan platform tujuan.",
      "Konten yang dihasilkan model AI harus Anda periksa sebelum dipublikasikan. Hasil AI dapat salah.",
    ],
  },
  {
    heading: "4. Penggunaan yang dilarang",
    paragraphs: [
      "Spam, manipulasi engagement, dan pembuatan akun massal.",
      "Mengakses layanan dengan cara otomatis yang membebani sistem di luar batas paket.",
      "Mempublikasikan konten ilegal, menyesatkan, atau melanggar hak orang lain.",
      "Mencoba mengakses data pengguna lain atau melewati kontrol keamanan.",
    ],
  },
  {
    heading: "5. Platform pihak ketiga",
    paragraphs: [
      "Ketersediaan fitur publish bergantung pada API platform dan persetujuan aplikasi yang sedang berjalan.",
      "Platform dapat mengubah batas, menolak konten, atau mencabut akses kapan saja. Threvo tidak dapat menjamin publikasi selalu berhasil.",
    ],
  },
  {
    heading: "6. Pembayaran",
    paragraphs: [
      "Paket berbayar ditagih di muka untuk satu periode bulanan melalui Pakasir.",
      "Tidak ada penagihan otomatis. Anda memperpanjang sendiri sebelum periode berakhir.",
      "Setelah periode berakhir ada masa tenggang 3 hari. Setelah itu akun turun ke paket Free tanpa menghapus konten.",
      "Pembayaran untuk periode yang sedang berjalan tidak dapat dikembalikan, kecuali diwajibkan oleh hukum.",
    ],
  },
  {
    heading: "7. Batas paket",
    paragraphs: [
      "Jumlah akun, post terjadwal, kredit AI, dan penyimpanan dibatasi sesuai paket yang tercantum di halaman harga.",
      "Kami dapat menyesuaikan batas dengan pemberitahuan sebelumnya. Batas yang sudah dibayar untuk periode berjalan tidak dikurangi.",
    ],
  },
  {
    heading: "8. Ketersediaan",
    paragraphs: [
      "Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjanjikan ketersediaan tanpa gangguan.",
      "Pemeliharaan, gangguan penyedia, atau perubahan API platform dapat menyebabkan layanan berhenti sementara.",
    ],
  },
  {
    heading: "9. Penghentian",
    paragraphs: [
      "Anda dapat berhenti menggunakan layanan kapan saja dan meminta penghapusan data.",
      "Kami dapat menangguhkan akun yang melanggar ketentuan ini, dengan pemberitahuan bila memungkinkan.",
    ],
  },
  {
    heading: "10. Batasan tanggung jawab",
    paragraphs: [
      "Sepanjang diizinkan hukum, tanggung jawab kami atas kerugian tidak langsung, kehilangan keuntungan, atau kehilangan data dibatasi pada jumlah yang Anda bayarkan dalam 3 bulan terakhir.",
    ],
  },
  {
    heading: "11. Hukum yang berlaku",
    paragraphs: [
      "Ketentuan ini diatur oleh hukum Republik Indonesia. Sengketa diselesaikan melalui musyawarah terlebih dahulu.",
    ],
  },
];

export const DELETION_SECTIONS: LegalSection[] = [
  {
    heading: "1. Hapus satu konten",
    paragraphs: [
      "Buka halaman Perpustakaan, pilih thread, lalu gunakan tombol hapus. Konten dan segmennya dihapus dari basis data.",
      "Post yang sudah terlanjur dipublikasikan ke platform tidak ikut terhapus. Hapus manual di platform terkait.",
    ],
  },
  {
    heading: "2. Putuskan akun sosial",
    paragraphs: [
      "Buka halaman Pengaturan dan pilih Putuskan pada akun yang ingin dilepas.",
      "Token akses untuk akun tersebut dihapus dari basis data. Riwayat publish tetap tersimpan tanpa token.",
    ],
  },
  {
    heading: "3. Hapus seluruh akun",
    paragraphs: [
      "Kirim permintaan dari alamat email yang terdaftar ke alamat kontak di bawah, dengan subjek Permintaan Penghapusan Akun.",
      "Kami memverifikasi kepemilikan akun, lalu menghapus profil, konten, akun sosial, dan jadwal. Proses selesai dalam 30 hari.",
    ],
  },
  {
    heading: "4. Yang tetap tersimpan",
    paragraphs: [
      "Salinan cadangan terhapus otomatis dalam 30 hari.",
      "Catatan transaksi pembayaran dapat disimpan lebih lama jika diwajibkan peraturan perpajakan.",
    ],
  },
];
