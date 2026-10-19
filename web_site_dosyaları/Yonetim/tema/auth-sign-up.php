<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Kayıt Ol | Yönetim Paneli</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="shortcut icon" href="assets/images/favicon.ico" />

    <script src="assets/js/config.js"></script>

    <link href="assets/css/vendors.min.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/app.min.css" rel="stylesheet" type="text/css" />
</head>

<body>
    <div class="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
        <div class="row g-0 auth-row">
            <div class="col-lg-6">
                <div class="auth-content p-4 h-100 d-flex flex-column justify-content-center">
                    <div class="text-center mb-4">
                        <h3 class="fw-bold">Hesap Oluştur</h3>
                        <p class="text-muted">Ücretsiz hesabınızı hemen oluşturun.</p>
                    </div>

                    <form action="index.php">
                        <div class="mb-3">
                            <label class="form-label">Ad Soyad</label>
                            <input type="text" class="form-control" placeholder="Adınız Soyadınız">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">E-posta</label>
                            <input type="email" class="form-control" placeholder="E-posta adresiniz">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Şifre</label>
                            <input type="password" class="form-control" placeholder="Şifreniz">
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="terms">
                                <label class="form-check-label" for="terms">Şartları kabul ediyorum.</label>
                            </div>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary">Kayıt Ol</button>
                        </div>
                    </form>

                    <p class="text-center mt-4">
                        Zaten hesabınız var mı? <a href="auth-sign-in.php" class="fw-semibold">Giriş Yap</a>
                    </p>
                </div>
            </div>
            
            <div class="col-lg-6 d-none d-lg-block">
                <div class="auth-img-overlay h-100 w-100 rounded-end overflow-hidden" 
                     style="background: url('assets/images/auth-img.jpg') center center / cover no-repeat;">
                     </div>
            </div>
        </div>
    </div>

    <script src="assets/js/vendors.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>