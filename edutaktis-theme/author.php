<?php
/**
 * Author Archive Template
 *
 * @package EduTaktis
 */

get_header();

$author = get_userdata( get_query_var( 'author' ) );
?>

<div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">

    <?php if ( $author ) : ?>
    <header style="background-color: #ffffff; border: 1px solid var(--color-border); border-radius: 1rem; padding: 2rem; margin-bottom: 2rem; display: flex; gap: 1.5rem; align-items: flex-start;">
        <div class="author-avatar" style="width: 4.5rem; height: 4.5rem; font-size: 1.75rem;">
            <?php echo esc_html( strtoupper( substr( $author->display_name, 0, 1 ) ) ); ?>
        </div>
        <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase;">Penulis EduTaktis</span>
            <h1 style="font-size: 1.75rem; margin-bottom: 0.5rem;"><?php echo esc_html( $author->display_name ); ?></h1>
            <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 0;">
                <?php echo esc_html( $author->description ?: 'Kontributor dan penulis di EduTaktis.' ); ?>
            </p>
        </div>
    </header>
    <?php endif; ?>

    <h2 style="font-size: 1.25rem; margin-bottom: 1.5rem;">Artikel Oleh <?php echo esc_html( $author ? $author->display_name : '' ); ?></h2>

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
        <p style="color: #64748B;">Penulis ini belum menerbitkan artikel.</p>
    <?php endif; ?>

</div>

<?php get_footer(); ?>
