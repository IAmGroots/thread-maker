import { UILocale } from "@/lib/i18n/types";

/**
 * Static "viral / hype" topic pool used as an instant, offline-safe source of
 * suggested topics. The AI endpoint (`/api/suggest-topics`) supplements this
 * with freshly generated, general topics — but the pool guarantees the UI
 * always has something to show, even when the AI is unavailable.
 *
 * Content is intentionally NOT part of the i18n dictionaries: it is curated
 * editorial content, not UI copy.
 */
export interface SuggestedTopic {
  category: string;
  topic: string;
}

export const TOPIC_POOL: Record<UILocale, SuggestedTopic[]> = {
  id: [
    {
      category: "Teknologi & AI",
      topic:
        "Cara memakai AI generatif untuk memangkas pekerjaan repetitif tanpa kehilangan sentuhan personal",
    },
    {
      category: "Teknologi & AI",
      topic:
        "Kenapa banyak orang mulai meninggalkan aplikasi AI populer dan pindah ke alternatif lokal",
    },
    {
      category: "Teknologi & AI",
      topic:
        "Tips menjaga privasi data saat memakai chatbot AI sehari-hari di ponsel",
    },
    {
      category: "Teknologi & AI",
      topic:
        "Tren coding dengan bantuan AI: peluang baru atau ancaman buat developer pemula?",
    },
    {
      category: "Bisnis & Startup",
      topic:
        "Pelajaran dari startup lokal yang tiba-tiba viral lalu harus bertahan setelah tren mereda",
    },
    {
      category: "Bisnis & Startup",
      topic:
        "Model bisnis rumahan yang sedang naik daun di media sosial tahun ini",
    },
    {
      category: "Bisnis & Startup",
      topic:
        "Strategi konten UMKM agar tetap relevan saat algoritma media sosial berubah",
    },
    {
      category: "Bisnis & Startup",
      topic:
        "Kenapa kolaborasi antar brand lokal jadi cara paling cepat mencuri perhatian netizen",
    },
    {
      category: "Karier & Produktivitas",
      topic:
        "Skill yang paling dicari perusahaan tahun ini menurut tren rekrutmen terbaru",
    },
    {
      category: "Karier & Produktivitas",
      topic:
        "Cara membangun personal branding di media sosial tanpa terlihat memaksa",
    },
    {
      category: "Karier & Produktivitas",
      topic:
        "Waspada sindrom burnout di era kerja hybrid dan cara menyiasatinya",
    },
    {
      category: "Karier & Produktivitas",
      topic:
        "Sistem manajemen waktu sederhana yang sedang dipakai banyak kreator produktif",
    },
    {
      category: "Kesehatan & Gaya Hidup",
      topic:
        "Kebiasaan digital sehat agar tidak kecanduan scroll media sosial setiap malam",
    },
    {
      category: "Kesehatan & Gaya Hidup",
      topic:
        "Tren olahraga singkat di rumah yang ramai dibicarakan di internet",
    },
    {
      category: "Kesehatan & Gaya Hidup",
      topic:
        "Cara mengurangi waktu layar untuk tidur yang lebih berkualitas",
    },
    {
      category: "Kesehatan & Gaya Hidup",
      topic:
        "Mengapa istirahat dari notifikasi kerja di akhir pekan makin populer",
    },
    {
      category: "Budaya Internet & Tren",
      topic:
        "Meme dan tren yang sedang ramai dan alasan di balik keviralannya",
    },
    {
      category: "Budaya Internet & Tren",
      topic:
        "Fenomena konten pendek yang bikin banyak orang sulit fokus lama",
    },
    {
      category: "Budaya Internet & Tren",
      topic:
        "Cara membaca hype internet agar tidak mudah tertipu informasi menyesatkan",
    },
    {
      category: "Budaya Internet & Tren",
      topic:
        "Kenapa komunitas online kecil justru lebih aktif daripada yang besar",
    },
    {
      category: "Uang & Finansial",
      topic:
        "Kebiasaan finansial digital yang membantu generasi muda lebih melek uang",
    },
    {
      category: "Uang & Finansial",
      topic:
        "Mengapa diskusi soal gaji terbuka mulai banyak dibicarakan di media sosial",
    },
    {
      category: "Uang & Finansial",
      topic:
        "Cara menilai tawaran investasi viral agar terhindar dari penipuan",
    },
    {
      category: "Uang & Finansial",
      topic:
        "Tren penghasilan tambahan dari konten yang sedang naik tahun ini",
    },
    {
      category: "Edukasi & Belajar",
      topic:
        "Cara belajar cepat di era informasi berlimpah tanpa kewalahan",
    },
    {
      category: "Edukasi & Belajar",
      topic:
        "Mengapa banyak orang beralih ke kursus singkat online saat ini",
    },
    {
      category: "Edukasi & Belajar",
      topic:
        "Strategi membuat catatan digital yang benar-benar dipakai ulang",
    },
    {
      category: "Edukasi & Belajar",
      topic:
        "Pertanyaan kritis yang perlu ditanyakan sebelum percaya tips viral di internet",
    },
    {
      category: "Gaming & Hiburan",
      topic:
        "Game dan film yang sedang ramai dibicarakan komunitas online",
    },
    {
      category: "Gaming & Hiburan",
      topic:
        "Alasan konten gaming masih jadi hiburan digital paling digemari",
    },
  ],
  en: [
    {
      category: "Tech & AI",
      topic:
        "How to use generative AI to cut repetitive work without losing the human touch",
    },
    {
      category: "Tech & AI",
      topic:
        "Why people are ditching popular AI apps for local alternatives",
    },
    {
      category: "Tech & AI",
      topic:
        "Practical tips for protecting your data privacy with everyday AI chatbots",
    },
    {
      category: "Tech & AI",
      topic:
        "AI-assisted coding: a new opportunity or a threat to junior developers?",
    },
    {
      category: "Business & Startups",
      topic:
        "Lessons from local startups that went viral and had to survive after the hype faded",
    },
    {
      category: "Business & Startups",
      topic:
        "Home-based business models that are blowing up on social media this year",
    },
    {
      category: "Business & Startups",
      topic:
        "Content strategies for small businesses when the social algorithm keeps changing",
    },
    {
      category: "Business & Startups",
      topic:
        "Why brand collabs are the fastest way to grab the internet's attention lately",
    },
    {
      category: "Career & Productivity",
      topic:
        "The skills companies are hunting for this year, according to hiring trends",
    },
    {
      category: "Career & Productivity",
      topic:
        "How to build a personal brand on social media without feeling pushy",
    },
    {
      category: "Career & Productivity",
      topic:
        "Spotting burnout in the hybrid-work era and how to work around it",
    },
    {
      category: "Career & Productivity",
      topic:
        "The simple time-management systems productive creators swear by right now",
    },
    {
      category: "Health & Lifestyle",
      topic:
        "Healthy digital habits to stop doomscrolling every night",
    },
    {
      category: "Health & Lifestyle",
      topic:
        "Short at-home workouts that are trending across the internet",
    },
    {
      category: "Health & Lifestyle",
      topic:
        "Cutting screen time for genuinely better sleep",
    },
    {
      category: "Health & Lifestyle",
      topic:
        "Why weekend notification detoxes are becoming a thing",
    },
    {
      category: "Internet Culture & Trends",
      topic:
        "The memes and trends blowing up right now and why they went viral",
    },
    {
      category: "Internet Culture & Trends",
      topic:
        "Short-form content and why it makes it so hard to focus for long",
    },
    {
      category: "Internet Culture & Trends",
      topic:
        "How to read internet hype without falling for misleading information",
    },
    {
      category: "Internet Culture & Trends",
      topic:
        "Why small online communities often out-engage the big ones",
    },
    {
      category: "Money & Finance",
      topic:
        "Digital money habits helping younger people get smarter with cash",
    },
    {
      category: "Money & Finance",
      topic:
        "Why open salary conversations are trending on social media",
    },
    {
      category: "Money & Finance",
      topic:
        "How to vet viral investment offers to avoid falling for scams",
    },
    {
      category: "Money & Finance",
      topic:
        "The content-driven side-hustles on the rise this year",
    },
    {
      category: "Education & Learning",
      topic:
        "How to learn fast in an age of information overload without burning out",
    },
    {
      category: "Education & Learning",
      topic:
        "Why so many people are switching to short online courses right now",
    },
    {
      category: "Education & Learning",
      topic:
        "Building digital notes you will actually revisit",
    },
    {
      category: "Education & Learning",
      topic:
        "The critical questions to ask before trusting viral internet advice",
    },
    {
      category: "Gaming & Entertainment",
      topic:
        "The games and shows online communities can't stop talking about",
    },
    {
      category: "Gaming & Entertainment",
      topic:
        "Why gaming content remains the most-loved form of digital entertainment",
    },
  ],
};

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick `count` unique random topics from the pool for the given locale.
 *
 * When `exclude` is provided, topics whose `topic` string is in the exclude
 * list are deprioritized (used last), so a "shuffle" tends to surface new
 * entries instead of repeating what the user already sees.
 */
export function pickRandomTopics(
  locale: UILocale,
  count: number,
  exclude: string[] = [],
): SuggestedTopic[] {
  const pool = TOPIC_POOL[locale] ?? TOPIC_POOL.en;
  const excludeSet = new Set(exclude);

  const fresh = shuffle(pool.filter((t) => !excludeSet.has(t.topic)));
  const repeated = shuffle(pool.filter((t) => excludeSet.has(t.topic)));

  return [...fresh, ...repeated].slice(0, Math.max(0, count));
}
