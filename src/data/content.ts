export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  iconName: string;
}

export interface Author {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  articlesCount: number;
  socials: {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
    website?: string;
  };
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  categoryId: string;
  authorId: string;
  publishedDate: string;
  updatedDate: string;
  readingTime: string;
  featured?: boolean;
  popular?: boolean;
  views: number;
  coverGradient: {
    from: string;
    to: string;
    pattern: string;
  };
  takeaway: {
    summary: string;
    points: string[];
    downloadLink?: string;
    downloadTitle?: string;
  };
  content: string; // HTML-like formatted prose
  prompts?: { title: string; prompt: string }[];
}

export const BRAND_INFO = {
  name: "EduTaktis",
  domain: "edutaktis.com",
  tagline: "AI & Teknologi Praktis untuk Guru",
  description: "Panduan, tutorial, tools, dan template untuk membantu guru bekerja lebih cerdas dengan teknologi.",
  primaryCTA: "Mulai Jelajahi",
  secondaryCTA: "Tutorial Populer",
};

export const CATEGORIES: Category[] = [
  {
    id: "ai-guru",
    name: "AI untuk Guru",
    slug: "ai-untuk-guru",
    description: "Panduan praktis pembuatan prompt ChatGPT, Copilot, & Gemini untuk modul ajar dan asesmen.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconName: "Bot",
  },
  {
    id: "tek-pendidikan",
    name: "Teknologi Pendidikan",
    slug: "teknologi-pendidikan",
    description: "Integrasi LMS, Google Classroom, Canva Education, dan platform pembelajaran interaktif.",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    iconName: "Laptop",
  },
  {
    id: "produktivitas",
    name: "Produktivitas",
    slug: "produktivitas",
    description: "Otomatisasi tugas administrasi guru, pembuatan lembar kerja, dan efisiensi penilaian.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconName: "Zap",
  },
  {
    id: "desain-konten",
    name: "Desain & Konten",
    slug: "desain-konten",
    description: "Template media pembelajaran visual, infografis kelas, dan presentasi modul ajar.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    iconName: "Palette",
  },
  {
    id: "tools-download",
    name: "Tools & Download",
    slug: "tools-download",
    description: "Kumpulan template prompt AI, spreadsheet administrasi otomatis, dan e-book gratis.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconName: "DownloadCloud",
  },
];

export const AUTHORS: Record<string, Author> = {
  "budi-santoso": {
    id: "budi-santoso",
    name: "Budi Santoso, M.Pd",
    role: "Spesialis AI & Inovasi Pembelajaran",
    avatar: "BS",
    bio: "Praktisi teknologi pendidikan dengan pengalaman 12+ tahun mendampingi ribuan guru Indonesia memanfaatkan kecerdasan buatan dan platform digital untuk efisiensi mengajar.",
    articlesCount: 18,
    socials: {
      youtube: "https://youtube.com/@edutaktis",
      linkedin: "https://linkedin.com/in/budisantoso-edu",
      twitter: "https://x.com/budietaktis",
    },
  },
  "anisa-rahma": {
    id: "anisa-rahma",
    name: "Anisa Rahma, S.Kom",
    role: "Guru Penggerak & Specialist Media Belajar",
    avatar: "AR",
    bio: "Pendidik dan desainer instruksional yang berfokus pada integrasi Canva, Google Workspace, dan materi visual interaktif untuk ruang kelas sekolah menengah.",
    articlesCount: 14,
    socials: {
      youtube: "https://youtube.com/@edutaktis",
      instagram: "https://instagram.com/anisarahma.edu",
    },
  },
  "dwi-prasetyo": {
    id: "dwi-prasetyo",
    name: "Dwi Prasetyo, S.Pd",
    role: "Pengembang Kurikulum & Prompt Engineer",
    avatar: "DP",
    bio: "Guru Matematika yang antusias dalam pembuatan instrumen asesmen terstruktur dan otomatisasi administrasi pembelajaran menggunakan ChatGPT dan Gemini.",
    articlesCount: 11,
    socials: {
      linkedin: "https://linkedin.com/in/dwiprasetyo",
    },
  },
};

export const ARTICLES: Article[] = [
  {
    id: "1",
    slug: "panduan-lengkap-prompt-chatgpt-modul-ajar-kurikulum-merdeka",
    title: "Panduan Lengkap Prompt ChatGPT untuk Membuat Modul Ajar Kurikulum Merdeka",
    excerpt: "Cara menyusun Draf Modul Ajar (RPP) yang presisi dan sesuai Capaian Pembelajaran (CP) untuk membantu mempercepat penyusunan administrasi guru menggunakan ChatGPT.",
    categoryId: "ai-guru",
    authorId: "budi-santoso",
    publishedDate: "24 September 2026",
    updatedDate: "28 September 2026",
    readingTime: "6 min read",
    featured: true,
    popular: true,
    views: 3420,
    coverGradient: {
      from: "from-blue-600",
      to: "to-indigo-800",
      pattern: "abstract-grid",
    },
    takeaway: {
      summary: "Menggunakan ChatGPT membantu mempercepat penyusunan draf awal modul ajar secara signifikan, tetapi memerlukan validasi dan penyesuaian pedagogis langsung oleh guru.",
      points: [
        "Sebutkan peran AI, Fase Kurikulum, Mata Pelajaran, dan Capaian Pembelajaran (CP) dalam awal prompt.",
        "Minta format keluaran berupa tabel dengan komponen: Tujuan Pembelajaran, Langkah Kegiatan, dan Asesmen.",
        "Selalu gunakan prinsip 'Human-in-the-loop' untuk meninjau kecocokan materi sebelum diterapkan.",
      ],
      downloadLink: "#download-template-prompt-modul-ajar",
      downloadTitle: "Download Template Prompt Modul Ajar (.TXT)",
    },
    prompts: [
      {
        title: "Prompt Utama Generator Modul Ajar Kurikulum Merdeka",
        prompt: `Bertindaklah sebagai Ahli Pengembang Kurikulum Merdeka di Indonesia. Buatkan Modul Ajar terstruktur untuk:
- Mata Pelajaran: [Nama Mapel, contoh: IPA]
- Fase/Kelas: [Fase D / Kelas 7]
- Capaian Pembelajaran (CP): [Masukkan teks CP]
- Jumlah Pertemuan: 2 Pertemuan (2x40 menit)

Sajikan Modul Ajar dalam bentuk tabel rapi mencakup:
1. Tujuan Pembelajaran (TP)
2. Pemahaman Bermakna & Pertanyaan Pemantik
3. Langkah Pembelajaran (Pendahuluan, Inti dengan model PBL, Penutup)
4. Rencana Asesmen Formatif & Sumatif beserta Rubrik Penilaian`,
      },
    ],
    content: `
      <h2>Mengapa Guru Perlu Memanfaatkan AI dalam Menyusun Modul Ajar?</h2>
      <p>Administrasi guru di Indonesia sering kali menyita waktu hingga 15 jam per minggu. Padahal, waktu efektif tersebut dapat dialokasikan untuk mendampingi peserta didik di dalam kelas secara personal.</p>
      <p>Dengan perkembangan Generative AI seperti ChatGPT, Claude, dan Google Gemini, penyusunan Modul Ajar Kurikulum Merdeka kini dapat diselesaikan jauh lebih taktis tanpa mengurangi kualitas paedagogis.</p>

      <h2>Struktur Master Prompt Modul Ajar yang Efektif</h2>
      <p>Kunci utama mendapatkan jawaban yang akurat dari ChatGPT adalah menerapkan formula <strong>R.O.L.E + C.O.N.T.E.X.T + F.O.R.M.A.T</strong>.</p>
      
      <blockquote>
        "Prompt yang baik bukan sekadar meminta 'buatkan RPP', melainkan memberikan konteks fase, ketersediaan alat di sekolah, karakteristik murid, serta rubrik penilaian yang diinginkan."
      </blockquote>

      <h3>Langkah Praktis Menyusun Prompt:</h3>
      <ol>
        <li><strong>Definisikan Peran (Role):</strong> Minta AI bertindak sebagai pakar pedagogi Kurikulum Merdeka.</li>
        <li><strong>Sediakan Capaian Pembelajaran (CP):</strong> Salin teks CP dari Keputusan BSKAP secara utuh.</li>
        <li><strong>Tentukan Model Pembelajaran:</strong> Pilih Problem Based Learning (PBL) atau Project Based Learning (PjBL).</li>
        <li><strong>Format Output:</strong> Instruksikan AI menyajikan hasil dalam format tabel Markdown.</li>
      </ol>

      <h2>Contoh Aplikasi dalam Pembelajaran Praktis</h2>
      <p>Setelah AI memberikan draf Modul Ajar, guru wajib melakukan <em>fine-tuning</em> atau penyesuaian. Periksa ketersediaan sarana prasarana di sekolah, tingkat pemahaman murid, serta integrasi Profil Pelajar Pancasila (P3).</p>
    `,
  },
  {
    id: "2",
    slug: "5-tools-ai-gratis-terbaik-membantu-tugas-administrasi-guru",
    title: "5 Tools AI Gratis Terbaik untuk Membantu Tugas Administrasi Guru Sekolah",
    excerpt: "Daftar platform kecerdasan buatan bebas biaya yang terbukti mempercepat pembuatan soal, lembar kerja murid, dan kriteria ketercapaian tujuan pembelajaran.",
    categoryId: "tools-download",
    authorId: "anisa-rahma",
    publishedDate: "22 September 2026",
    updatedDate: "26 September 2026",
    readingTime: "5 min read",
    featured: false,
    popular: true,
    views: 2890,
    coverGradient: {
      from: "from-teal-600",
      to: "to-emerald-800",
      pattern: "geometric",
    },
    takeaway: {
      summary: "Memilih tools AI yang sesuai dengan kebutuhan kelas akan menghemat waktu pembuatan media dan asesmen.",
      points: [
        "MagicSchool AI: Khusus dibuat untuk kebutuhan pendidik dari tingkat PAUD hingga SMA.",
        "Curipod: Membuat slide presentasi interaktif dan polling kelas secara instant.",
        "Quizizz AI: Mengubah dokumen PDF/Word materi menjadi kuis interaktif otomatis.",
      ],
      downloadLink: "#download-cheatsheet-tools-ai",
      downloadTitle: "Download Cheatsheet Tools AI Guru (.PDF)",
    },
    content: `
      <h2>1. MagicSchool AI — Asisten Digital Serbaguna Guru</h2>
      <p>MagicSchool AI menyediakan lebih dari 50 generator khusus untuk guru, mulai dari pembuat soal pilihan ganda, penganalisis teks bacaan berdasarkan jenjang usia, hingga pembuat Surat Keterangan / Laporan Kemajuan Belajar murid.</p>

      <h2>2. Quizizz AI — Pembuat Kuis Otomatis dari Dokumen</h2>
      <p>Cukup unggah file PDF modul materi Anda, dan Quizizz AI akan memproses soal-soal pilihan ganda lengkap dengan kunci jawaban dan pembahasan secara otomatis.</p>

      <h2>3. Canva untuk Pendidikan & Magic Studio</h2>
      <p>Setiap guru di Indonesia berhak mendapatkan akun Canva for Education secara gratis menggunakan Akun Pembelajaran (belajar.id). Fitur Magic Write dan Text-to-Image sangat membantu membuat infografis visual.</p>
    `,
  },
  {
    id: "3",
    slug: "cara-membuat-rubrik-penilaian-otomatis-spreadsheet-excel-ai",
    title: "Cara Membuat Rubrik Penilaian Otomatis di Spreadsheet dengan Bantuan AI",
    excerpt: "Langkah demi langkah merancang rumus Excel / Google Sheets otomatis yang langsung menghitung nilai akhir dan predikat ketercapaian siswa.",
    categoryId: "produktivitas",
    authorId: "dwi-prasetyo",
    publishedDate: "19 September 2026",
    updatedDate: "20 September 2026",
    readingTime: "7 min read",
    featured: false,
    popular: false,
    views: 1940,
    coverGradient: {
      from: "from-indigo-600",
      to: "to-purple-800",
      pattern: "dots",
    },
    takeaway: {
      summary: "Gunakan AI untuk menghasilkan rumus kompleks Google Sheets seperti VLOOKUP, INDEX-MATCH, dan kondisi KKTP otomatis.",
      points: [
        "Prompt AI untuk menulis rumus kondisional berdasarkan skala nilai 1-4.",
        "Integrasikan Conditional Formatting agar siswa yang membutuhkan intervensi terlihat jelas secara visual.",
      ],
      downloadLink: "#download-template-spreadsheet-rubrik",
      downloadTitle: "Download Template Spreadsheet Penilaian (.XLSX)",
    },
    content: `
      <h2>Mengapa Spreadsheet Terintegrasi Kriteria Penting?</h2>
      <p>Pengolahan nilai akhir sering memakan waktu lama saat pembagian rapor pertengahan semester. Dengan rumus spreadsheet yang tepat, proses pengolahan data siswa dapat otomatis terupdate.</p>

      <h2>Langkah Pembuatan Spreadsheet Penilaian:</h2>
      <p>Kami menyediakan template gratis yang telah dikonfigurasi dengan rumus predikat KKTP (Kriteria Ketercapaian Tujuan Pembelajaran).</p>
    `,
  },
  {
    id: "4",
    slug: "optimasi-canva-for-education-membuat-media-pembelajaran-interaktif",
    title: "Optimasi Canva for Education: Membuat Media Pembelajaran Interaktif dalam 15 Menit",
    excerpt: "Manfaatkan akun Belajar.id untuk mengakses fitur premium Canva for Education. Lengkap dengan trik membuat LKPD visual dan presentasi bergerak.",
    categoryId: "desain-konten",
    authorId: "anisa-rahma",
    publishedDate: "15 September 2026",
    updatedDate: "18 September 2026",
    readingTime: "4 min read",
    featured: false,
    popular: true,
    views: 3110,
    coverGradient: {
      from: "from-amber-500",
      to: "to-orange-700",
      pattern: "waves",
    },
    takeaway: {
      summary: "Media visual yang memikat meningkatkan tingkat partisipasi dan pemahaman siswa hingga 45%.",
      points: [
        "Gunakan elemen terverifikasi Canva Education agar bebas hak cipta.",
        "Manfaatkan fitur 'Present and Record' untuk pembelajaran asinkronus.",
      ],
    },
    content: `
      <h2>Integrasi Visual dalam Ruang Kelas Masa Kini</h2>
      <p>Generasi siswa saat ini sangat responsif terhadap konten visual. Canva menyediakan ribuan template khusus pendidikan yang dapat disesuaikan dengan kurikulum lokal.</p>
    `,
  },
  {
    id: "5",
    slug: "pemanfaatan-google-classroom-dan-google-forms-asesmen-tanpa-kertas",
    title: "Pemanfaatan Google Classroom & Forms untuk Asesmen Tanpa Kertas (Paperless)",
    excerpt: "Panduan praktis menguji pemahaman murid secara real-time, memberikan umpan balik langsung, dan menghemat anggaran cetak kertas sekolah.",
    categoryId: "tek-pendidikan",
    authorId: "budi-santoso",
    publishedDate: "10 September 2026",
    updatedDate: "12 September 2026",
    readingTime: "6 min read",
    featured: false,
    popular: false,
    views: 2150,
    coverGradient: {
      from: "from-teal-600",
      to: "to-cyan-800",
      pattern: "grid",
    },
    takeaway: {
      summary: "Asesmen digital mengurangi penggunaan kertas dan memberikan rekapitulasi analisis butir soal secara instan.",
      points: [
        "Gunakan mode 'Locked Quiz' pada Chromebook atau browser siswa untuk menjaga keaslian ujian.",
        "Ekspor hasil ujian ke Google Sheets dalam satu klik untuk rekapitulasi nilai.",
      ],
    },
    content: `
      <h2>Transisi Menuju Sekolah Digital yang Efektif</h2>
      <p>Ujian berbasis kertas membutuhkan biaya cetak, waktu penggandaan, dan koreksi manual yang melelahkan. Dengan Google Forms Quiz, kunci jawaban dan analisis kecenderungan salah murid langsung tersedia begitu kuis selesai.</p>
    `,
  },
];
