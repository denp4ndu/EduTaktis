<?php
/**
 * Single Article Template
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="container">
    <div class="article-page-layout">
        
        <!-- Main Article Column -->
        <article class="article-main-column">

            <?php edutaktis_breadcrumbs(); ?>

            <?php while ( have_posts() ) : the_post(); ?>

                <header class="article-header">
                    <div class="meta-unboxed">
                        <?php the_category( ' · ' ); ?>
                    </div>

                    <h1 style="margin-bottom: 1rem; color: var(--color-dark);">
                        <?php the_title(); ?>
                    </h1>

                    <p style="font-size: 1.125rem; color: var(--color-secondary-text); line-height: 1.6; margin-bottom: 1.5rem;">
                        <?php echo esc_html( get_the_excerpt() ); ?>
                    </p>

                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; font-size: 0.8125rem; color: var(--color-secondary-text); padding-top: 1rem; border-top: 1px solid var(--color-border);">
                        <span>
                            Penulis: <a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>" style="font-weight: 700; color: var(--color-dark);"><?php the_author(); ?></a>
                        </span>
                        <span>·</span>
                        <time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date( 'j F Y' ) ); ?></time>
                        <?php if ( get_the_modified_date() !== get_the_date() ) : ?>
                            <span>·</span>
                            <time datetime="<?php echo esc_attr( get_the_modified_date( 'c' ) ); ?>">Diperbarui: <?php echo esc_html( get_the_modified_date( 'j F Y' ) ); ?></time>
                        <?php endif; ?>
                        <span>·</span>
                        <span><?php echo esc_html( edutaktis_reading_time() ); ?></span>
                    </div>
                </header>

                <!-- Featured Image -->
                <?php if ( has_post_thumbnail() ) : ?>
                    <div style="margin-bottom: 2rem; border-radius: var(--radius-lg); overflow: hidden;">
                        <?php the_post_thumbnail( 'full', array( 'style' => 'width: 100%; height: auto; display: block;' ) ); ?>
                    </div>
                <?php endif; ?>

                <!-- Practical Takeaway Box (Ringkasan Praktis) -->
                <div class="takeaway-box">
                    <div class="takeaway-kicker">Ringkasan Praktis (Practical Takeaway)</div>
                    <div class="takeaway-text">
                        <?php
                        $takeaway = get_post_meta( get_the_ID(), '_edutaktis_takeaway', true );
                        if ( ! empty( $takeaway ) ) {
                            echo wp_kses_post( $takeaway );
                        } else {
                            echo esc_html( get_the_excerpt() );
                        }
                        ?>
                    </div>
                </div>

                <!-- Article Content -->
                <div class="article-prose">
                    <?php the_content(); ?>
                </div>

                <!-- Author Box -->
                <div class="author-box">
                    <div class="author-avatar">
                        <?php echo esc_html( strtoupper( substr( get_the_author(), 0, 1 ) ) ); ?>
                    </div>
                    <div>
                        <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.25rem;">
                            <a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>" style="color: var(--color-dark);"><?php the_author(); ?></a>
                        </h4>
                        <p style="font-size: 0.75rem; color: var(--color-secondary-text); margin-bottom: 0.5rem;">Kontributor EduTaktis</p>
                        <p style="font-size: 0.8125rem; color: #475569; margin-bottom: 0;">
                            <?php echo esc_html( get_the_author_meta( 'description' ) ?: 'Penulis dan praktisi teknologi pendidikan di EduTaktis.' ); ?>
                        </p>
                    </div>
                </div>

            <?php endwhile; ?>

        </article>

        <!-- Sidebar Column -->
        <aside class="sidebar">
            
            <div class="sidebar-widget">
                <div class="widget-title">Pencarian Tutorial</div>
                <form role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>" style="display: flex; gap: 0.5rem;">
                    <input type="search" name="s" placeholder="Kata kunci..." value="<?php echo esc_attr( get_search_query() ); ?>" class="search-input" style="width: 100%;" />
                    <button type="submit" class="btn-primary">Cari</button>
                </form>
            </div>

            <div class="sidebar-widget">
                <div class="widget-title">Kategori Utama</div>
                <ul style="list-style: none; space-y: 0.5rem; font-size: 0.875rem;">
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>" style="color: var(--color-dark);">AI untuk Guru</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>" style="color: var(--color-dark);">Teknologi Pendidikan</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>" style="color: var(--color-dark);">Produktivitas Guru</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>" style="color: var(--color-dark);">Desain &amp; Konten</a></li>
                    <li style="margin-bottom: 0.5rem;"><a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>" style="color: var(--color-dark);">Tools &amp; Download</a></li>
                </ul>
            </div>

        </aside>

    </div>
</div>

<?php get_footer(); ?>
