<div class="sidenav-menu">
    <a href="index.php" class="logo">
        <span class="logo logo-light">
            <span class="logo-lg"><img src="assets/images/logo.png" alt="logo"></span>
            <span class="logo-sm"><img src="assets/images/logo-sm.png" alt="small logo"></span>
        </span>
        <span class="logo logo-dark">
            <span class="logo-lg"><img src="assets/images/logo-black.png" alt="dark logo"></span>
            <span class="logo-sm"><img src="assets/images/logo-sm.png" alt="small logo"></span>
        </span>
    </a>

    <button class="button-on-hover"><i class="ti ti-circle align-middle"></i></button>
    <button class="button-close-offcanvas"><i class="ti ti-menu-4 align-middle"></i></button>

    <div class="scrollbar" data-simplebar>
        <div id="user-profile-settings" class="sidenav-user" style="background: url(assets/images/user-bg-pattern.svg)">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <a href="#!" class="link-reset">
                        <img src="assets/images/users/user-1.jpg" alt="user-image" class="rounded-circle mb-2 avatar-md">
                        <span class="sidenav-user-name fw-bold">Alperen</span>
                        <span class="fs-12 fw-semibold">Admin</span>
                    </a>
                </div>
                <div>
                    <a class="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon" data-bs-toggle="dropdown" href="#"><i class="ti ti-settings fs-24 align-middle ms-1"></i></a>
                    <div class="dropdown-menu">
                        <div class="dropdown-header noti-title"><h6 class="text-overflow m-0">Hoşgeldin!</h6></div>
                        <a href="#!" class="dropdown-item"><i class="ti ti-user-circle me-1 fs-lg align-middle"></i> Profil</a>
                        <a href="#!" class="dropdown-item"><i class="ti ti-settings-2 me-1 fs-lg align-middle"></i> Ayarlar</a>
                        <a href="login.php" class="dropdown-item text-danger fw-semibold"><i class="ti ti-logout me-1 fs-lg align-middle"></i> Çıkış</a>
                    </div>
                </div>
            </div>
        </div>

        <div id="sidenav-menu">
            <ul class="side-nav">
                <li class="side-nav-title mt-2">Genel</li>
                
                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#dashboards" aria-expanded="false" aria-controls="dashboards" class="side-nav-link">
                        <span class="menu-icon"><i class="ti ti-dashboard"></i></span>
                        <span class="menu-text">Dashboards</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="dashboards">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="index.php" class="side-nav-link">Finance</a></li>
                            <li class="side-nav-item"><a href="#" class="side-nav-link">Analytics</a></li>
                        </ul>
                    </div>
                </li>

                <li class="side-nav-title mt-2">Uygulamalar (Apps)</li>
                
                <li class="side-nav-item">
                    <a href="apps-chat.php" class="side-nav-link">
                        <span class="menu-icon"><i class="ti ti-message"></i></span>
                        <span class="menu-text">Chat</span>
                    </a>
                </li>

                <li class="side-nav-item">
                    <a href="apps-api-keys.php" class="side-nav-link">
                        <span class="menu-icon"><i class="ti ti-key"></i></span>
                        <span class="menu-text">API Anahtarları</span>
                    </a>
                </li>

                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#sidebarBlog" aria-expanded="false" aria-controls="sidebarBlog" class="side-nav-link collapsed">
                        <span class="menu-icon"><i class="ti ti-article"></i></span>
                        <span class="menu-text">Blog</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="sidebarBlog">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="apps-blog-list.php" class="side-nav-link">Liste Görünümü</a></li>
                            <li class="side-nav-item"><a href="apps-blog-grid.php" class="side-nav-link">Izgara (Grid)</a></li>
                            <li class="side-nav-item"><a href="apps-blog-article.php" class="side-nav-link">Makale Detay</a></li>
                            <li class="side-nav-item"><a href="apps-blog-add.php" class="side-nav-link">Yeni Ekle</a></li>
                        </ul>
                    </div>
                </li>

                <li class="side-nav-title mt-2">Kimlik Doğrulama</li>

                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#sidebarAuth" aria-expanded="false" aria-controls="sidebarAuth" class="side-nav-link collapsed">
                        <span class="menu-icon"><i class="ti ti-lock"></i></span>
                        <span class="menu-text">Güvenlik</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="sidebarAuth">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="login.php" class="side-nav-link" target="_blank">Giriş Yap</a></li>
                            <li class="side-nav-item"><a href="auth-sign-up.php" class="side-nav-link" target="_blank">Kayıt Ol</a></li>
                            <li class="side-nav-item"><a href="auth-two-factor.php" class="side-nav-link" target="_blank">İki Adımlı Doğrulama</a></li>
                            <li class="side-nav-item"><a href="auth-success-mail.php" class="side-nav-link" target="_blank">Başarılı Mail</a></li>
                        </ul>
                    </div>
                </li>

                <li class="side-nav-title mt-2">Özel Sayfalar</li>
                
                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#pages" aria-expanded="false" aria-controls="pages" class="side-nav-link collapsed">
                        <span class="menu-icon"><i class="ti ti-files"></i></span>
                        <span class="menu-text">Sayfalar</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="pages">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="pages-profile.php" class="side-nav-link">Profil</a></li>
                            <li class="side-nav-item"><a href="pages-invoice.php" class="side-nav-link">Fatura</a></li>
                        </ul>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>