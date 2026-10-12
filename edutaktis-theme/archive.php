<?php
/**
 * Archive Template (Categories & Tags)
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">

    <header style="background-color: #ffffff; border: 1px solid var(--color-border); border-radius: 1rem; padding: 2rem; margin-bottom: 2rem;">
        <?php
        the_archive_title( '<h1 style="font-size: 1.75rem; margin-bottom: 0.5rem;">', '</h1>' );
        the_archive_description( '<p style="color: #64748B; font-size: 0.875rem; margin-bottom: 0;">', '</p>' );
        ?>
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
        <p style="color: #64748B;">Tidak ada artikel dalam arsip ini.</p>
    <?php endif; ?>

</div>

<?php get_footer(); ?>
