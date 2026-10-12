<?php
/**
 * Static Page Template
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="article-container container">

    <?php edutaktis_breadcrumbs(); ?>

    <?php while ( have_posts() ) : the_post(); ?>

        <header class="article-header">
            <h1 style="margin-bottom: 1rem; color: var(--color-dark);">
                <?php the_title(); ?>
            </h1>
        </header>

        <div class="article-prose">
            <?php the_content(); ?>
        </div>

    <?php endwhile; ?>

</div>

<?php get_footer(); ?>
