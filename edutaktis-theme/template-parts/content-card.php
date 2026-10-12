<?php
/**
 * Content Card Template Part
 *
 * @package EduTaktis
 */
?>
<article class="post-card">
    <div class="post-card-body">
        <div class="post-meta-line" style="font-weight: 700; color: var(--color-accent); text-transform: uppercase;">
            <?php the_category( ' · ' ); ?>
        </div>

        <h3 class="post-card-title">
            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
        </h3>

        <p class="post-card-excerpt">
            <?php echo esc_html( get_the_excerpt() ); ?>
        </p>

        <div class="post-card-footer">
            <span><?php the_author(); ?></span>
            <span><?php echo esc_html( edutaktis_reading_time() ); ?></span>
        </div>
    </div>
</article>
