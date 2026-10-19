<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="content-page">
    <div class="container-fluid">
        <div class="page-title-head d-flex align-items-center">
            <div class="flex-grow-1"><h4 class="page-main-title m-0">Blog List</h4></div>
            <div class="text-end">
                <a href="apps-blog-add.php" class="btn btn-primary"><i class="ti ti-plus me-1"></i> Add New Post</a>
            </div>
        </div>

        <div class="row">
            <div class="col-xl-9">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-start">
                            <img src="assets/images/stock/small-1.jpg" alt="" class="avatar-xl rounded me-3">
                            <div class="flex-grow-1 overflow-hidden">
                                <h5 class="mt-0 font-16"><a href="apps-blog-article.php" class="text-dark">Designing for the Future</a></h5>
                                <p class="text-muted text-truncate mb-2">
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                </p>
                                <div class="d-flex align-items-center">
                                    <img src="assets/images/users/user-1.jpg" alt="" class="avatar-xs rounded-circle me-2">
                                    <div class="flex-grow-1">
                                        <h6 class="m-0 fs-13">Alperen</h6>
                                        <p class="text-muted mb-0 fs-12">24 Jan 2026 • 5 min read</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-start">
                            <img src="assets/images/stock/small-2.jpg" alt="" class="avatar-xl rounded me-3">
                            <div class="flex-grow-1 overflow-hidden">
                                <h5 class="mt-0 font-16"><a href="apps-blog-article.php" class="text-dark">Web Development Trends 2026</a></h5>
                                <p class="text-muted text-truncate mb-2">
                                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                </p>
                                <div class="d-flex align-items-center">
                                    <img src="assets/images/users/user-2.jpg" alt="" class="avatar-xs rounded-circle me-2">
                                    <div class="flex-grow-1">
                                        <h6 class="m-0 fs-13">David Dev</h6>
                                        <p class="text-muted mb-0 fs-12">23 Jan 2026 • 8 min read</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xl-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title mb-3">Search</h5>
                        <div class="input-group">
                            <input type="text" class="form-control" placeholder="Search...">
                            <button class="btn btn-primary" type="button"><i class="ti ti-search"></i></button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title mb-3">Categories</h5>
                        <ul class="list-unstyled mb-0">
                            <li class="mb-2"><a href="#" class="text-muted"><i class="ti ti-chevron-right me-1"></i> Design</a></li>
                            <li class="mb-2"><a href="#" class="text-muted"><i class="ti ti-chevron-right me-1"></i> Development</a></li>
                            <li><a href="#" class="text-muted"><i class="ti ti-chevron-right me-1"></i> Business</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>

<?php include 'includes/footer.php'; ?>