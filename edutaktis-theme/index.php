<?php
/**
 * Main Template & Homepage
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">

    <?php if ( is_home() && ! is_paged() ) : ?>
    <!-- Editorial Hero Section -->
    <section class="hero-editorial">
        <div class="hero-kicker">AI &amp; TEKNOLOGI PRAKTIS UNTUK GURU</div>
        <h1 class="hero-headline">AI &amp; Teknologi Praktis untuk Guru</h1>
        <p class="hero-supporting">
            Panduan, tutorial, tools, dan template untuk membantu guru bekerja lebih cerdas dengan teknologi.
        </p>
        <div style="display: flex; gap: 0.875rem; flex-wrap: wrap;">
            <a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>" class="btn-primary" style="padding: 0.75rem 1.5rem; font-size: 0.875rem;">
                Mulai Jelajahi
            </a>
            <a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>" class="btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 0.875rem;">
                Tutorial Populer
            </a>
        </div>
    </section>

    <!-- Topic Categories Grid -->
    <section style="margin-bottom: 3.5rem;">
        <h2 style="font-size: 1.25rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-secondary-text); margin-bottom: 1.25rem;">
            Kategori Topik
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
            <a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>" style="background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; display: block; color: var(--color-dark);">
                <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; color: var(--color-dark);">AI untuk Guru</div>
                <div style="font-size: 0.8125rem; color: var(--color-secondary-text);">Panduan prompt ChatGPT &amp; Gemini.</div>
            </a>
            <a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>" style="background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; display: block; color: var(--color-dark);">
                <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; color: var(--color-dark);">Teknologi Pendidikan</div>
                <div style="font-size: 0.8125rem; color: var(--color-secondary-text);">Google Classroom, LMS, &amp; Canva.</div>
            </a>
            <a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>" style="background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; display: block; color: var(--color-dark);">
                <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; color: var(--color-dark);">Produktivitas Guru</div>
                <div style="font-size: 0.8125rem; color: var(--color-secondary-text);">Efisiensi administrasi &amp; rapor.</div>
            </a>
            <a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>" style="background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; display: block; color: var(--color-dark);">
                <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; color: var(--color-dark);">Desain &amp; Konten</div>
                <div style="font-size: 0.8125rem; color: var(--color-secondary-text);">Template presentasi &amp; modul ajar.</div>
            </a>
        </div>
    </section>
    <?php endif; ?>

    <!-- Latest Articles Stream -->
    <section>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border);">
            <h2 style="font-size: 1.5rem;">Artikel &amp; Tutorial Terbaru</h2>
        </div>

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
            <p style="color: var(--color-secondary-text);">Belum ada artikel di database WordPress.</p>
        <?php endif; ?>
    </section>

</div>

<?php get_footer(); ?>
