</main> <!-- /main -->

<footer class="site-footer">
    <div class="container">
        <div class="footer-grid">
            <div>
                <!-- Logo Slot Container -->
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="logo-slot" style="display: flex; align-items: center; height: 3rem; width: 15rem; flex-shrink: 0; margin-bottom: 0.75rem;" aria-label="Brand logo">
                </a>
                <p style="font-size: 0.8125rem; line-height: 1.5; margin-bottom: 1rem; color: #94A3B8;">
                    Panduan, tutorial, tools, dan template untuk membantu guru bekerja lebih cerdas dengan teknologi AI dan aplikasi pendidikan.
                </p>
                <p style="font-size: 0.75rem; color: #64748B;">
                    &copy; <?php echo esc_html( date( 'Y' ) ); ?> EduTaktis (edutaktis.com). Hak Cipta Dilindungi.
                </p>
            </div>

            <div>
                <h4 class="footer-title">Kategori Utama</h4>
                <ul class="footer-links">
                    <li><a href="<?php echo esc_url( home_url( '/category/ai-untuk-guru' ) ); ?>">AI untuk Guru</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/category/teknologi-pendidikan' ) ); ?>">Teknologi Pendidikan</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/category/produktivitas' ) ); ?>">Produktivitas</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/category/desain-konten' ) ); ?>">Desain &amp; Konten</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/category/tools-download' ) ); ?>">Tools &amp; Download</a></li>
                </ul>
            </div>

            <div>
                <h4 class="footer-title">Informasi</h4>
                <ul class="footer-links">
                    <li><a href="<?php echo esc_url( home_url( '/tentang-kami' ) ); ?>">Tentang Kami</a></li>
                    <li><a href="<?php echo esc_url( home_url( '/kebijakan-privasi' ) ); ?>">Kebijakan Privasi</a></li>
                </ul>
            </div>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
