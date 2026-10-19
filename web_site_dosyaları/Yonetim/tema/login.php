<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8" />
    <title>Giriş Yap | Yönetim Paneli</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <link rel="shortcut icon" href="assets/images/favicon.ico" />

    <script src="assets/js/config.js"></script>

    <link href="assets/css/vendors.min.css" rel="stylesheet" type="text/css" />

    <link href="assets/css/app.min.css" rel="stylesheet" type="text/css" />
</head>

<body>

    <div class="position-relative d-flex min-vh-100 flex-column overflow-hidden bg-body">
        <div class="d-flex flex-grow-1 align-items-center justify-content-center">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6 col-xl-5">
                        <div class="card card-body p-4 rounded-3 text-center border">
                            
                            <div class="mb-4">
                                <div class="avatar-md mx-auto mb-2">
                                     <div class="avatar-title bg-primary-subtle text-primary fs-xl border border-dashed rounded-circle">
                                        <i class="ti ti-lock-open"></i> 
                                        </div>
                                </div>
                                <h4 class="fw-bold">Tekrar Hoşgeldiniz</h4>
                                <p class="text-muted fs-12 mb-0">Panelinize erişmek için lütfen giriş yapın.</p>
                            </div>

                            <form action="index.php" class="text-start">
                                
                                <div class="mb-3">
                                    <label class="form-label" for="email">E-posta Adresi</label>
                                    <input type="email" class="form-control" id="email" placeholder="ornek@site.com" required />
                                </div>

                                <div class="mb-3">
                                    <label class="form-label" for="userpassword">Şifre</label>
                                    <input type="password" class="form-control" id="userpassword" placeholder="Şifreniz" required />
                                </div>

                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary fw-semibold py-2">Giriş Yap</button>
                                </div>
                            </form>

                            <p class="text-muted text-center mt-4 mb-0">
                                Hesabınız yok mu? 
                                <a href="auth-sign-up.php" class="text-decoration-underline link-offset-3 fw-semibold">Kayıt Ol</a>
                            </p>
                        </div>

                        <p class="text-center text-muted mt-4 mb-0">
                            © <script>document.write(new Date().getFullYear())</script> Paces — by <span class="fw-semibold">Coderthemes</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="assets/js/vendors.min.js"></script>

    <script src="assets/js/app.js"></script>

</body>
</html>