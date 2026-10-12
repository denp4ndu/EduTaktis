import JSZip from 'jszip';

export interface GeneratedThemeFiles {
  [filename: string]: string;
}

export function generateEduTaktisWPThemeFiles(): GeneratedThemeFiles {
  return {
    'style.css': `/*
Theme Name: EduTaktis
Theme URI: https://edutaktis.com
Author: EduTaktis Team
Author URI: https://edutaktis.com
Description: Production-Grade Custom WordPress Theme for EduTaktis — AI & Teknologi Praktis untuk Guru. Built on Phase 04B Editorial Design System.
Version: 1.0.0
License: GNU General Public License v2 or later
Text Domain: edutaktis
*/

:root {
  --font-heading: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-accent: #14B8A6;
  --color-dark: #0F172A;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-secondary-text: #64748B;
  --color-border: #E2E8F0;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  --container-width: 1280px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  background-color: var(--color-bg);
  color: var(--color-dark);
  -webkit-text-size-adjust: 100%;
}

body { min-height: 100vh; display: flex; flex-direction: column; }

a:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--color-primary); outline-offset: 2px;
}

.container {
  width: min(100% - 32px, 1280px);
  margin-left: auto; margin-right: auto;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading); color: var(--color-dark);
  line-height: 1.25; font-weight: 800; letter-spacing: -0.02em;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; }
h3 { font-size: 1.25rem; }

@media (min-width: 768px) {
  h1 { font-size: 3.25rem; }
  h2 { font-size: 2.25rem; }
}

p { margin-bottom: 1rem; color: #334155; }
a { color: var(--color-primary); text-decoration: none; }
a:hover { color: var(--color-primary-hover); }

.site-header {
  position: sticky; top: 0; z-index: 40;
  background-color: #ffffff; border-bottom: 1px solid var(--color-border);
}

.header-inner {
  display: flex; align-items: center; justify-content: space-between;
  height: 4.5rem; gap: 1.5rem;
}

.brand-logo {
  display: flex; align-items: center; gap: 0.75rem;
  font-weight: 800; font-size: 1.25rem; color: var(--color-dark);
}

.nav-links { display: none; align-items: center; gap: 1.75rem; font-size: 0.875rem; font-weight: 600; }
@media (min-width: 1024px) { .nav-links { display: flex; } }

.btn-primary {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.625rem 1.25rem; background-color: var(--color-primary);
  color: #ffffff !important; font-size: 0.8125rem; font-weight: 700;
  border-radius: var(--radius-md); border: none; cursor: pointer;
}

.hero-editorial {
  background-color: #ffffff; border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: 3rem 2rem; margin: 2rem 0 3rem 0;
}
@media (min-width: 768px) { .hero-editorial { padding: 4rem 3.5rem; } }

.posts-grid {
  display: grid; grid-template-columns: 1fr; gap: 2rem;
}
@media (min-width: 768px) { .posts-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .posts-grid { grid-template-columns: repeat(3, 1fr); } }

.post-card {
  background-color: #ffffff; border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column;
}

.takeaway-box {
  background-color: #F0FDFA; border-left: 4px solid var(--color-accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0; padding: 1.5rem; margin: 2rem 0;
}

.article-page-layout {
  display: grid; grid-template-columns: 1fr; gap: 2.5rem; padding: 2rem 0 4rem 0;
}
@media (min-width: 1024px) { .article-page-layout { grid-template-columns: 1fr 320px; } }

.article-prose { font-size: 1.0625rem; line-height: 1.75; color: #334155; max-width: 68ch; }

.site-footer {
  background-color: var(--color-dark); color: #94A3B8;
  border-top: 1px solid #1E293B; margin-top: 5rem; padding: 4rem 0;
}
`,

    'functions.php': `<?php
if ( ! defined( 'ABSPATH' ) ) exit;
if ( ! isset( $content_width ) ) $content_width = 1280;

function edutaktis_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    set_post_thumbnail_size( 800, 450, true );

    register_nav_menus( array(
        'primary-menu' => __( 'Primary Navigation', 'edutaktis' ),
        'footer-menu'  => __( 'Footer Links', 'edutaktis' ),
    ) );

    add_theme_support( 'html5', array(
        'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'
    ) );
}
add_action( 'after_setup_theme', 'edutaktis_setup' );

function edutaktis_cleanup_head() {
    remove_action( 'wp_head', 'wp_generator' );
    remove_action( 'wp_head', 'rsd_link' );
    remove_action( 'wp_head', 'wlwmanifest_link' );
    remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
    remove_action( 'wp_print_styles', 'print_emoji_styles' );
}
add_action( 'init', 'edutaktis_cleanup_head' );

function edutaktis_scripts() {
    wp_enqueue_style( 'edutaktis-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap', array(), null );
    wp_enqueue_style( 'edutaktis-style', get_stylesheet_uri(), array(), '1.0.0' );
    if ( file_exists( get_template_directory() . '/assets/js/main.js' ) ) {
        wp_enqueue_script( 'edutaktis-main', get_template_directory_uri() . '/assets/js/main.js', array(), '1.0.0', true );
    }
}
add_action( 'wp_enqueue_scripts', 'edutaktis_scripts' );

function edutaktis_breadcrumbs() {
    if ( is_front_page() ) return;
    echo '<nav aria-label="Breadcrumb" class="breadcrumbs">';
    echo '<a href="' . esc_url( home_url( '/' ) ) . '">Beranda</a>';
    if ( is_category() || is_single() ) {
        echo '<span>/</span>';
        $cats = get_the_category();
        if ( ! empty( $cats ) ) {
            echo '<a href="' . esc_url( get_category_link( $cats[0]->term_id ) ) . '">' . esc_html( $cats[0]->name ) . '</a>';
        }
        if ( is_single() ) {
            echo '<span>/</span><span aria-current="page">' . esc_html( get_the_title() ) . '</span>';
        }
    } elseif ( is_page() ) {
        echo '<span>/</span><span aria-current="page">' . esc_html( get_the_title() ) . '</span>';
    } elseif ( is_search() ) {
        echo '<span>/</span><span aria-current="page">Pencarian: ' . esc_html( get_search_query() ) . '</span>';
    }
    echo '</nav>';
}

function edutaktis_reading_time() {
    $content = get_post_field( 'post_content', get_the_ID() );
    $time = ceil( str_word_count( strip_tags( $content ) ) / 200 );
    return $time > 0 ? $time . ' min read' : '1 min read';
}
`,

    'header.php': `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="<?php echo esc_url( get_template_directory_uri() . '/assets/logo/edutaktis-symbol.svg' ); ?>" />
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="site-header">
    <div class="container header-inner">
        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="brand-logo" aria-label="EduTaktis Beranda">
            <svg viewBox="0 0 40 40" fill="none" style="width: 2.25rem; height: 2.25rem; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6H34V12H23V33H17V12H12V6H6Z" fill="#2563EB"/>
                <path d="M6 6H12V33H6V6Z" fill="#2563EB"/>
                <path d="M12 18H21V23H12V18Z" fill="#14B8A6"/>
                <path d="M12 28H28V33H12V28Z" fill="#2563EB"/>
            </svg>
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 800; font-size: 1.25rem; color: #0F172A; line-height: 1;">EduTaktis</span>
                <span style="font-size: 0.625rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.2rem;">AI &amp; TEKNOLOGI PRAKTIS UNTUK GURU</span>
            </div>
        </a>

        <nav class="nav-links" aria-label="Main Navigation">
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>">Beranda</a>
            <a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>">AI untuk Guru</a>
            <a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>">Teknologi Pendidikan</a>
            <a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>">Produktivitas</a>
            <a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>">Desain &amp; Konten</a>
            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>">Download</a>
        </nav>

        <div class="header-actions">
            <form role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
                <input type="search" name="s" placeholder="Cari tutorial..." value="<?php echo esc_attr( get_search_query() ); ?>" class="search-input" />
            </form>
            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>" class="btn-primary">Mulai Jelajahi</a>
        </div>
    </div>
</header>
<main>
`,

    'footer.php': `</main>
<footer class="site-footer">
    <div class="container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2.5rem;">
            <div>
                <div style="display: flex; items-center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <svg viewBox="0 0 40 40" fill="none" style="width: 2.25rem; height: 2.25rem; flex-shrink: 0;" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 6H34V12H23V33H17V12H12V6H6Z" fill="#FFFFFF"/>
                        <path d="M6 6H12V33H6V6Z" fill="#FFFFFF"/>
                        <path d="M12 18H21V23H12V18Z" fill="#14B8A6"/>
                        <path d="M12 28H28V33H12V28Z" fill="#FFFFFF"/>
                    </svg>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 800; font-size: 1.35rem; color: #FFFFFF; line-height: 1;">EduTaktis</span>
                        <span style="font-size: 0.625rem; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.2rem;">AI &amp; TEKNOLOGI PRAKTIS UNTUK GURU</span>
                    </div>
                </div>
                <p style="font-size: 0.8125rem; color: #94A3B8; margin-bottom: 1rem;">Panduan, tutorial, tools, dan template untuk membantu guru bekerja lebih cerdas dengan teknologi.</p>
                <p style="font-size: 0.75rem; color: #64748B;">&copy; <?php echo esc_html( date( 'Y' ) ); ?> EduTaktis (edutaktis.com). Hak Cipta Dilindungi.</p>
            </div>
            <div>
                <h4 style="color: #fff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem;">Kategori Utama</h4>
                <ul style="list-style: none; font-size: 0.875rem;">
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>" style="color: #94A3B8;">AI untuk Guru</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>" style="color: #94A3B8;">Teknologi Pendidikan</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>" style="color: #94A3B8;">Produktivitas</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>" style="color: #94A3B8;">Desain &amp; Konten</a></li>
                </ul>
            </div>
        </div>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
`,

    'index.php': `<?php
get_header(); ?>
<div class="container" style="padding: 2.5rem 0 4rem 0;">
    <?php if ( is_home() && ! is_paged() ) : ?>
    <section class="hero-editorial">
        <span style="color: var(--color-accent); font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">AI &amp; TEKNOLOGI PRAKTIS UNTUK GURU</span>
        <h1 style="margin-top: 0.75rem; margin-bottom: 1rem;">AI &amp; Teknologi Praktis untuk Guru</h1>
        <p style="color: var(--color-secondary-text); font-size: 1.125rem; max-width: 38rem; margin-bottom: 1.75rem;">Panduan, tutorial, tools, dan template untuk membantu guru bekerja lebih cerdas dengan teknologi.</p>
        <div style="display: flex; gap: 0.875rem; flex-wrap: wrap;">
            <a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>" class="btn-primary">Mulai Jelajahi</a>
            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>" style="padding: 0.625rem 1.25rem; font-size: 0.8125rem; background: #fff; color: var(--color-dark); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-weight: 700;">Tutorial Populer</a>
        </div>
    </section>
    <?php endif; ?>

    <h2 style="margin-bottom: 1.5rem;">Artikel &amp; Tutorial Terbaru</h2>
    <?php if ( have_posts() ) : ?>
        <div class="posts-grid">
            <?php while ( have_posts() ) : the_post(); get_template_part( 'template-parts/content-card' ); endwhile; ?>
        </div>
        <div style="margin-top: 2.5rem; display: flex; justify-content: center;"><?php the_posts_pagination(); ?></div>
    <?php else : ?>
        <p style="color: #64748B;">Belum ada artikel di database WordPress.</p>
    <?php endif; ?>
</div>
<?php get_footer(); ?>
`,

    'single.php': `<?php
get_header(); ?>
<div class="container">
    <div class="article-page-layout">
        <article class="article-main-column">
            <?php edutaktis_breadcrumbs(); ?>
            <?php while ( have_posts() ) : the_post(); ?>
                <header style="margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border);">
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; margin-bottom: 0.5rem;"><?php the_category( ' · ' ); ?></div>
                    <h1 style="margin-bottom: 1rem;"><?php the_title(); ?></h1>
                    <p style="font-size: 1.125rem; color: var(--color-secondary-text);"><?php echo esc_html( get_the_excerpt() ); ?></p>
                    <div style="font-size: 0.75rem; color: var(--color-secondary-text); margin-top: 1rem;">
                        Penulis: <a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>"><strong><?php the_author(); ?></strong></a> · Rilis: <?php echo esc_html( get_the_date( 'j F Y' ) ); ?> · <?php echo esc_html( edutaktis_reading_time() ); ?>
                    </div>
                </header>

                <?php if ( has_post_thumbnail() ) : ?>
                    <div style="margin-bottom: 2rem; border-radius: var(--radius-lg); overflow: hidden;"><?php the_post_thumbnail( 'full', array( 'style' => 'width: 100%; height: auto;' ) ); ?></div>
                <?php endif; ?>

                <div class="takeaway-box">
                    <div style="font-weight: 800; color: #0F766E; text-transform: uppercase; font-size: 0.75rem; margin-bottom: 0.5rem;">Ringkasan Praktis</div>
                    <div style="font-size: 0.875rem; color: #115E59;"><?php echo wp_kses_post( get_post_meta( get_the_ID(), '_edutaktis_takeaway', true ) ?: get_the_excerpt() ); ?></div>
                </div>

                <div class="article-prose"><?php the_content(); ?></div>
            <?php endwhile; ?>
        </article>

        <aside className="sidebar">
            <div style="background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem;">
                <h4 style="font-size: 0.875rem; font-weight: 800; uppercase; margin-bottom: 1rem;">Kategori Pembelajaran</h4>
                <ul style="list-style: none; font-size: 0.875rem;">
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>">AI untuk Guru</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>">Teknologi Pendidikan</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>">Produktivitas</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>">Desain &amp; Konten</a></li>
                </ul>
            </div>
        </aside>
    </div>
</div>
<?php get_footer(); ?>
`,

    'page.php': `<?php
get_header(); ?>
<div class="container article-container">
    <?php edutaktis_breadcrumbs(); ?>
    <?php while ( have_posts() ) : the_post(); ?>
        <h1><?php the_title(); ?></h1>
        <div class="article-prose"><?php the_content(); ?></div>
    <?php endwhile; ?>
</div>
<?php get_footer(); ?>
`,

    'archive.php': `<?php
get_header(); ?>
<div class="container" style="padding: 2.5rem 0 4rem 0;">
    <header style="background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
        <?php the_archive_title( '<h1 style="font-size: 2rem;">', '</h1>' ); ?>
        <?php the_archive_description( '<p style="color: var(--color-secondary-text); font-size: 0.875rem;">', '</p>' ); ?>
    </header>
    <?php if ( have_posts() ) : ?>
        <div class="posts-grid"><?php while ( have_posts() ) : the_post(); get_template_part( 'template-parts/content-card' ); endwhile; ?></div>
        <div style="margin-top: 2.5rem; display: flex; justify-content: center;"><?php the_posts_pagination(); ?></div>
    <?php else : ?><p style="color: #64748B;">Tidak ada artikel.</p><?php endif; ?>
</div>
<?php get_footer(); ?>
`,

    'search.php': `<?php
get_header(); ?>
<div class="container" style="padding: 2.5rem 0 4rem 0;">
    <h1 style="margin-bottom: 2rem;">Hasil Pencarian: "<?php echo esc_html( get_search_query() ); ?>"</h1>
    <?php if ( have_posts() ) : ?>
        <div class="posts-grid"><?php while ( have_posts() ) : the_post(); get_template_part( 'template-parts/content-card' ); endwhile; ?></div>
        <div style="margin-top: 2.5rem; display: flex; justify-content: center;"><?php the_posts_pagination(); ?></div>
    <?php else : ?>
        <p style="color: #64748B;">Artikel tidak ditemukan.</p>
    <?php endif; ?>
</div>
<?php get_footer(); ?>
`,

    'author.php': `<?php
get_header(); $author = get_userdata( get_query_var( 'author' ) ); ?>
<div class="container" style="padding: 2.5rem 0 4rem 0;">
    <?php if ( $author ) : ?>
    <header style="background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
        <h1>Penulis: <?php echo esc_html( $author->display_name ); ?></h1>
        <p style="color: var(--color-secondary-text); font-size: 0.875rem;"><?php echo esc_html( $author->description ); ?></p>
    </header>
    <?php endif; ?>
    <?php if ( have_posts() ) : ?>
        <div class="posts-grid"><?php while ( have_posts() ) : the_post(); get_template_part( 'template-parts/content-card' ); endwhile; ?></div>
    <?php endif; ?>
</div>
<?php get_footer(); ?>
`,

    '404.php': `<?php
get_header(); ?>
<div class="container" style="padding: 5rem 0; text-align: center;">
    <h1>404 — Halaman Tidak Ditemukan</h1>
    <p style="color: var(--color-secondary-text); margin-bottom: 1.5rem;">Halaman yang Anda cari tidak tersedia.</p>
    <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn-primary">Kembali ke Beranda</a>
</div>
<?php get_footer(); ?>
`,

    'template-parts/content-card.php': `<?php
?>
<article class="post-card">
    <div class="post-card-body">
        <div class="meta-unboxed"><?php the_category( ' · ' ); ?></div>
        <h3 class="card-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
        <p class="card-excerpt"><?php echo esc_html( get_the_excerpt() ); ?></p>
        <div class="card-byline">
            <span><?php the_author(); ?></span>
            <span><?php echo esc_html( edutaktis_reading_time() ); ?></span>
        </div>
    </div>
</article>
`,

    'assets/logo/edutaktis-symbol.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <path d="M6 6H34V12H23V33H17V12H12V6H6Z" fill="#2563EB"/>
  <path d="M6 6H12V33H6V6Z" fill="#2563EB"/>
  <path d="M12 18H21V23H12V18Z" fill="#14B8A6"/>
  <path d="M12 28H28V33H12V28Z" fill="#2563EB"/>
</svg>`,

    'assets/js/main.js': `document.addEventListener('DOMContentLoaded', function() {
    console.log('EduTaktis WP Theme Phase 04B Brand Remediation Loaded.');
});`,

    'README.txt': `=== EduTaktis WordPress Theme ===
Theme Name: EduTaktis
Domain: https://edutaktis.com
Description: Custom WordPress theme for EduTaktis built with the approved Phase 04B E/T Technology Logo Symbol.
`,
  };
}

export async function downloadWPThemeZip(): Promise<void> {
  const zip = new JSZip();
  const files = generateEduTaktisWPThemeFiles();

  Object.entries(files).forEach(([filename, content]) => {
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'edutaktis-theme.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
