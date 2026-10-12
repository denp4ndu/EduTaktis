<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="site-header">
    <div class="container header-inner">
        
        <!-- Zone 1: Logo Slot Container -->
        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo-slot" style="display: flex; align-items: center; height: 3rem; width: 15rem; flex-shrink: 0;" aria-label="Brand logo">
        </a>

        <!-- Zone 2: Primary Navigation Links -->
        <nav class="nav-links" aria-label="Main Navigation">
            <a href="<?php echo esc_url( home_url( '/' ) ); ?>">Beranda</a>
            <a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>">AI untuk Guru</a>
            <a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>">Teknologi Pendidikan</a>
            <a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>">Produktivitas</a>
            <a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>">Desain &amp; Konten</a>
            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>">Download</a>
        </nav>

        <!-- Zone 3: Actions & Search -->
        <div class="header-actions">
            <form role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
                <input 
                    type="search" 
                    name="s" 
                    placeholder="Cari tutorial..." 
                    value="<?php echo esc_attr( get_search_query() ); ?>" 
                    class="search-input"
                    aria-label="Cari tutorial atau prompt"
                />
            </form>

            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>" class="btn-primary">
                Mulai Jelajahi
            </a>
        </div>

    </div>
</header>
<main>
