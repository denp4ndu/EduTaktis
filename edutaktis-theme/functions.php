<?php
/**
 * EduTaktis Production WordPress Theme Functions
 *
 * @package EduTaktis
 * @version 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

if ( ! isset( $content_width ) ) {
    $content_width = 1200;
}

/**
 * Theme Setup
 */
function edutaktis_setup() {
    // Let WordPress manage document title
    add_theme_support( 'title-tag' );

    // Enable Post Thumbnails
    add_theme_support( 'post-thumbnails' );
    set_post_thumbnail_size( 800, 450, true );

    // Register Navigation Menus
    register_nav_menus( array(
        'primary-menu' => __( 'Primary Navigation', 'edutaktis' ),
        'footer-menu'  => __( 'Footer Links', 'edutaktis' ),
    ) );

    // HTML5 markup support
    add_theme_support( 'html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ) );
}
add_action( 'after_setup_theme', 'edutaktis_setup' );

/**
 * Clean up WordPress Header (Remove WP generator, emoji bloat, edit URI)
 */
function edutaktis_cleanup_head() {
    remove_action( 'wp_head', 'wp_generator' );
    remove_action( 'wp_head', 'rsd_link' );
    remove_action( 'wp_head', 'wlwmanifest_link' );
    remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
    remove_action( 'wp_print_styles', 'print_emoji_styles' );
}
add_action( 'init', 'edutaktis_cleanup_head' );

/**
 * Enqueue scripts and styles.
 */
function edutaktis_scripts() {
    // Optimized Google Fonts with swap display
    wp_enqueue_style( 
        'edutaktis-fonts', 
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap', 
        array(), 
        null 
    );

    // Production Stylesheet
    wp_enqueue_style( 'edutaktis-style', get_stylesheet_uri(), array(), '1.0.0' );

    // Production Vanilla JavaScript
    if ( file_exists( get_template_directory() . '/assets/js/main.js' ) ) {
        wp_enqueue_script( 'edutaktis-main', get_template_directory_uri() . '/assets/js/main.js', array(), '1.0.0', true );
    }
}
add_action( 'wp_enqueue_scripts', 'edutaktis_scripts' );

/**
 * Custom Breadcrumb Generator (Server-Side WP_Post / WP_Term)
 */
function edutaktis_breadcrumbs() {
    if ( is_front_page() ) {
        return;
    }

    echo '<nav aria-label="Breadcrumb" class="breadcrumbs">';
    echo '<a href="' . esc_url( home_url( '/' ) ) . '">Beranda</a>';

    if ( is_category() || is_single() ) {
        echo '<span aria-hidden="true">/</span>';
        $categories = get_the_category();
        if ( ! empty( $categories ) ) {
            $cat = $categories[0];
            echo '<a href="' . esc_url( get_category_link( $cat->term_id ) ) . '">' . esc_html( $cat->name ) . '</a>';
        }
        if ( is_single() ) {
            echo '<span aria-hidden="true">/</span>';
            echo '<span aria-current="page">' . esc_html( get_the_title() ) . '</span>';
        }
    } elseif ( is_page() ) {
        echo '<span aria-hidden="true">/</span>';
        echo '<span aria-current="page">' . esc_html( get_the_title() ) . '</span>';
    } elseif ( is_search() ) {
        echo '<span aria-hidden="true">/</span>';
        echo '<span aria-current="page">Pencarian: ' . esc_html( get_search_query() ) . '</span>';
    } elseif ( is_author() ) {
        $author = get_userdata( get_query_var( 'author' ) );
        echo '<span aria-hidden="true">/</span>';
        echo '<span aria-current="page">Penulis: ' . esc_html( $author ? $author->display_name : '' ) . '</span>';
    }
    echo '</nav>';
}

/**
 * Estimate Reading Time from WordPress Post Content
 */
function edutaktis_reading_time() {
    $content = get_post_field( 'post_content', get_the_ID() );
    $word_count = str_word_count( strip_tags( $content ) );
    $time = ceil( $word_count / 200 );
    return $time > 0 ? $time . ' min read' : '1 min read';
}
