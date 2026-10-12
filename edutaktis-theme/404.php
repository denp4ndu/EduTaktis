<?php
/**
 * 404 Page Template
 *
 * @package EduTaktis
 */

get_header(); ?>

<div class="container" style="padding: 5rem 1rem; text-align: center; max-width: 32rem; margin: 0 auto;">
    <div style="width: 4rem; height: 4rem; background-color: #DBEAFE; color: var(--color-primary); border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; margin: 0 auto 1.5rem auto;">
        404
    </div>
    
    <h1 style="font-size: 2rem; margin-bottom: 0.75rem;">Halaman Tidak Ditemukan</h1>
    
    <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 2rem;">
        Halaman yang Anda cari tidak tersedia, telah dipindahkan, atau alamat URL yang dimasukkan salah.
    </p>

    <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn-primary" style="padding: 0.75rem 1.5rem; font-size: 0.875rem;">
            Kembali ke Beranda
        </a>
    </div>
</div>

<?php get_footer(); ?>
