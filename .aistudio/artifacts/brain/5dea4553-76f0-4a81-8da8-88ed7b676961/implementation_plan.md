# EduTaktis — Custom WordPress Theme & Live Preview Application

Building a lightweight, high-performance custom WordPress theme and interactive web preview application for **EduTaktis** (`edutaktis.com`) based strictly on the approved design system and brand positioning (*AI & Teknologi Praktis untuk Guru*).

## User Review & Confirmed Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user in Phase 1:

- **Confirmed Mode**: Live interactive EduTaktis web application preview with built-in WordPress theme export and download capabilities.
- **Confirmed Content**: Populated with realistic Indonesian education content across 5 core topics (*AI untuk Guru*, *Teknologi Pendidikan*, *Produktivitas*, *Desain & Konten*, and *Tools/Download*).
- **Confirmed Customizer**: Includes an interactive Theme Customizer panel allowing real-time color/typography testing and responsive layout switching (Desktop, Tablet, Mobile).

---

## 1. Overview & Core Concept

**EduTaktis** is a modern Indonesian EdTech media platform providing practical AI guides, tutorials, prompts, and downloadable tools for teachers. The custom WordPress theme delivers a clean, editorial, zero-bloat user experience designed for maximum legibility, fast loading speeds (targeting Core Web Vitals LCP ≤ 2.5s, INP < 200ms, CLS < 0.1), and complete eradication of public WordPress branding.

---

## 2. Visual Identity & Design System

### A. Approved Brand Palette
- **Primary (`#2563EB`)**: Royal Blue — CTAs, active states, brand highlights
- **Accent (`#14B8A6`)**: Teal — Featured badges, practical takeaway highlights, interactive indicators
- **Dark (`#0F172A`)**: Deep Slate — Headings, high-contrast dark surfaces
- **Background (`#F8FAFC`)**: Soft Off-White Canvas — Main page field
- **Surface (`#FFFFFF`)**: Pure White — Cards, article reader canvas, headers
- **Slate (`#64748B`)**: Muted Body & Secondary text
- **Border (`#E2E8F0`)**: Hairline borders and subtle dividers
- **Status Colors**: Success (`#22C55E`), Warning (`#F59E0B`), Error (`#EF4444`), Info (`#0EA5E9`)

### B. Typography Hierarchy
- **Headings**: `Plus Jakarta Sans` (Display & Section Titles)
- **Body & Prose**: `Inter` with system fallback (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`)
- **Prose Measure**: Constrained to 68–72ch (`max-w-2xl` / `max-w-prose`) with `leading-relaxed` (1.75) for effortless reading on desktop and mobile.

### C. Zero-Pill & Public Branding Discipline
- **Zero WordPress Footprints**: No "Powered by WordPress", no default WP favicon/widgets, clean semantic HTML5 markup.
- **Unboxed Metadata**: Categories, publish dates, author names, and reading times rendered as clean unboxed text with subtle typographic dot separators (`·`).

---

## 3. Technical Architecture & Component Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EDUTAKTIS PREVIEW & ENGINE                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
      ┌────────────────────────────────┴────────────────────────────────┐
      │                                                                 │
┌─────▼──────────────────────────────┐                ┌─────────────────▼─────────────┐
│  Interactive App Preview (React)   │                │   PHP WordPress Theme Package  │
├────────────────────────────────────┤                ├───────────────────────────────┤
│ • Header & Responsive Navigation   │                │ • style.css (Theme metadata)  │
│ • Homepage (Hero, Featured, Categories)              │ • index.php, single.php       │
│ • Single Article Template          │                │ • archive.php, search.php     │
│ • Practical Takeaway Box           │                │ • author.php, 404.php         │
│ • Author & Category Views          │                │ • header.php, footer.php      │
│ • Live Instant Search Modal        │                │ • functions.php (No WP bloat) │
│ • Interactive Theme Customizer     │                │ • template-parts/ content     │
│ • ZIP Export & Code Inspector      │                │ • edutaktis-theme.zip export  │
└────────────────────────────────────┘                └───────────────────────────────┘
```

---

## 4. Key Pages & Components to Implement

1. **Header**: 3-Zone Top Bar Contract (Wordmark brand, 5 category links, search & CTA buttons, mobile hamburger menu).
2. **Homepage**:
   - Hero section (*AI & Teknologi Praktis untuk Guru*) with primary CTA (*Mulai Jelajahi*) and secondary CTA (*Tutorial Populer*).
   - Featured Article marquee card.
   - Category grid sections (*AI untuk Guru*, *Teknologi Pendidikan*, *Produktivitas*, *Desain & Konten*, *Tools/Download*).
   - Latest Articles stream with card views and pagination.
   - High-impact Newsletter & Template CTA banner.
3. **Article Page (Single Post)**:
   - Breadcrumb rail (`Beranda > AI untuk Guru > Judul Artikel`).
   - H1 Title, Excerpt, Author avatar/bio link, Published date, Updated date, Reading time.
   - Featured image with caption.
   - Article prose reader with styled H2/H3, blockquotes, prompt template copy blocks, and **Practical Takeaway Box** (*Ringkasan Praktis*).
   - Author Box (Bio, social links, articles count).
   - Related Articles (3-card grid).
   - In-article CTA card.
4. **Category / Archive Page**: Header with topic description, post count, subcategory tabs, and filtered grid.
5. **Search Modal & Results Page**: Real-time keyword filtering with empty state and topic suggestions.
6. **Author Page**: Author bio header, social links, and published articles grid.
7. **404 Page**: Friendly 404 layout with search box and quick navigation links.
8. **Theme Customizer & WP Theme Exporter**:
   - Device frame toggle (Desktop, Tablet, Mobile).
   - Live color token inspector.
   - Single-click **"Download WordPress Theme (.zip)"** generating full PHP theme files adhering strictly to WordPress coding standards.

---

## 5. Verification & Security Rules

- **Escaping & Sanitization**: PHP templates utilize `esc_html()`, `esc_url()`, `esc_attr()`, and `wp_kses_post()`.
- **Keyboard Navigation**: Focus rings (`focus-visible`) enabled across all buttons and inputs.
- **Core Web Vitals**: Zero heavy JS libraries, lightweight CSS Tailwind generation, responsive images.

---

## 6. Execution Steps

1. Update `metadata.json` and `index.html` with EduTaktis brand title and metadata.
2. Generate high-fidelity visual assets using `generate_image` for Hero and featured articles.
3. Build mock database and state management (`src/data/content.ts`).
4. Build reusable EduTaktis UI components and layout templates.
5. Build WordPress PHP theme files and zip exporter (`src/utils/wpThemeGenerator.ts`).
6. Build Theme Customizer & Device Frame switcher controls.
7. Verify compilation and test responsiveness across views.
