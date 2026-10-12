<?php
/**
 * Search Results Template
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">

    <header style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.75rem;">
            Hasil Pencarian: "<?php echo esc_html( get_search_query() ); ?>"
        </h1>
    </header>

    <?php if ( have_posts() ) : ?>
        <div class="posts-grid">
            <?php
            while ( have_posts() ) :
                the_post();
                get_template_part( 'template-parts/content-card' );
            endwhile;
            ?>
        </div>

        <div style="margin-top: 2.5rem; display: flex; justify-content: center;">
            <?php the_posts_pagination( array(
                'prev_text' => '&larr; Sebelumnya',
                'next_text' => 'Selanjutnya &rarr;',
            ) ); ?>
        </div>
    <?php else : ?>
        <div style="background-color: #ffffff; border: 1px solid var(--color-border); border-radius: 1rem; padding: 3rem; text-align: center;">
            <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Artikel Tidak Ditemukan</h2>
            <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 1.5rem;">
                Coba gunakan kata kunci lain seperti 'ChatGPT', 'Canva', atau 'Modul Ajar'.
            </p>
            <form role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>" style="max-width: 24rem; margin: 0 auto; display: flex; gap: 0.5rem;">
                <input type="search" name="s" placeholder="Cari tutorial lagi..." value="<?php echo esc_attr( get_search_query() ); ?>" class="search-input" style="flex: 1; padding: 0.5rem 1rem;" />
                <button type="submit" class="btn-primary">Cari</button>
            </form>
        </div>
    <?php endif; ?>

</div>

<?php get_footer(); ?>
