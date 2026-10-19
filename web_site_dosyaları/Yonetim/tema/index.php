<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="content-page">
    <div class="container-fluid">
        
        <div class="page-title-head d-flex align-items-center">
            <div class="flex-grow-1">
                <h4 class="page-main-title m-0">Finance</h4>
            </div>
            <div class="text-end">
                <ol class="breadcrumb m-0 py-0">
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Paces</a></li>
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Dashboard</a></li>
                    <li class="breadcrumb-item active">Finance</li>
                </ol>
            </div>
        </div>

        <div class="alert alert-primary alert-dismissible d-flex align-items-center" role="alert">
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <i class="ti ti-lifebuoy fs-24 me-1"></i>
            <div><strong> Sayın Alperen - </strong> Lütfen son finansal işlemlerinizi kontrol ediniz.</div>
            <a href="#!" class="text-reset text-decoration-underline ms-auto link-offset-2"><b>İşlem Yap</b></a>
        </div>

        <div class="row">
            <div class="col-xxl-4">
                <div class="card card-h-100">
                    <div class="card-header border-0 justify-content-between">
                        <h4 class="card-title">Total Balance</h4>
                        <div class="dropdown ms-auto">
                            <a href="#" class="btn btn-sm btn-default btn-icon" data-bs-toggle="dropdown">
                                <i class="ti ti-dots-vertical fs-lg"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#"> <i class="ti ti-wallet me-2"></i> Add Funds </a></li>
                                <li><a class="dropdown-item" href="#"> <i class="ti ti-cash-banknote-move-back me-2"></i> Withdraw Funds </a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body pt-0">
                        <h2 class="fw-bold" id="user-balance-data">
                            <span id="user-balance-number">$76,852.36</span>
                            <span data-toggler="off" id="user-b-show-hide" style="cursor: pointer;">
                                <a href="javascript:void(0);" data-toggler-on="" class="d-none">
                                    <i class="ti ti-eye text-warning fs-xxl"></i>
                                </a>
                                <a href="javascript:void(0);" data-toggler-off="">
                                    <i class="ti ti-eye-off text-muted fs-xxl"></i>
                                </a>
                            </span>
                        </h2>
                        
                        <div class="p-2 bg-light bg-opacity-50 rounded mt-3 d-flex align-items-center">
                            <img src="assets/images/debit-card.png" alt="" height="36" class="rounded me-1">
                            <div>
                                <p class="mb-0 fw-semibold">$59.258,25</p>
                                <p class="text-muted fs-12 mb-0">**** 3698</p>
                            </div>
                            <a href="#!" class="btn btn-link fw-medium text-reset ms-auto text-decoration-underline link-offset-2">Details</a>
                        </div>

                        <div class="row g-2 mt-3">
                            <div class="col">
                                <a href="#!" class="btn btn-secondary bg-gradient w-100"><i class="ti ti-coin me-1"></i> Transfer</a>
                            </div>
                            <div class="col">
                                <a href="#!" class="btn btn-info bg-gradient w-100"><i class="ti ti-coin me-1"></i> Request</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xxl-8">
                <div class="row">
                    <div class="col-xl-3 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <iconify-icon icon="solar:leaf-bold-duotone" class="fs-36 text-success"></iconify-icon>
                                <h3 class="fw-bold mt-3 mb-1">$51,68k</h3>
                                <p class="text-muted">Total Income</p>
                                <span class="badge fs-12 badge-soft-success"><i class="ti ti-arrow-badge-up"></i> 8.72%</span>
                                <div id="total-income-chart" class="mt-3" style="min-height: 50px;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <iconify-icon icon="solar:wallet-money-bold-duotone" class="fs-36 text-info"></iconify-icon>
                                <h3 class="fw-bold mt-3 mb-1">$24,03k</h3>
                                <p class="text-muted">Total Expenses</p>
                                <span class="badge fs-12 badge-soft-danger"><i class="ti ti-arrow-badge-down"></i> 3.28%</span>
                                <div id="total-expenses-chart" class="mt-3" style="min-height: 50px;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <iconify-icon icon="solar:chart-2-bold-duotone" class="fs-36 text-warning"></iconify-icon>
                                <h3 class="fw-bold mt-3 mb-1">$48,21k</h3>
                                <p class="text-muted">Investments</p>
                                <span class="badge fs-12 badge-soft-danger"><i class="ti ti-arrow-badge-down"></i> 5.69%</span>
                                <div id="investments-chart" class="mt-3" style="min-height: 50px;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <iconify-icon icon="solar:hand-money-bold" class="fs-36 text-secondary"></iconify-icon>
                                <h3 class="fw-bold mt-3 mb-1">$11,65k</h3>
                                <p class="text-muted">Savings</p>
                                <span class="badge fs-12 badge-soft-success"><i class="ti ti-arrow-badge-up"></i> 10.58%</span>
                                <div id="savings-chart" class="mt-3" style="min-height: 50px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-xl-8">
                <div class="card card-h-100">
                    <div class="card-header border-0 justify-content-between">
                        <h4 class="card-title">Financial Overview</h4>
                        <div class="dropdown ms-auto">
                            <a href="#" class="btn btn-sm btn-default btn-icon" data-bs-toggle="dropdown">
                                <i class="ti ti-dots-vertical fs-lg"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#">Refresh Data</a></li>
                                <li><a class="dropdown-item" href="#">View Analytics</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="bg-light bg-opacity-40 p-3">
                            <div class="row text-center">
                                <div class="col">
                                    <p class="text-muted mb-1">Revenue</p>
                                    <h4 class="mb-0">$29,56k</h4>
                                </div>
                                <div class="col">
                                    <p class="text-muted mb-1">Expenses</p>
                                    <h4 class="mb-0">$15,08k</h4>
                                </div>
                                <div class="col">
                                    <p class="text-muted mb-1">Investment</p>
                                    <h4 class="mb-0">$3,67k</h4>
                                </div>
                                <div class="col">
                                    <p class="text-muted mb-1">Savings</p>
                                    <h4 class="mb-0">$6,72k</h4>
                                </div>
                            </div>
                        </div>
                        <div id="financial-overview-chart" class="apex-charts" style="min-height: 391px;"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-4">
                <div class="card bg-secondary bg-gradient text-white">
                    <div class="card-body" style="background-image: url(assets/images/flower-style.svg); background-size: contain; background-repeat: no-repeat; background-position: right bottom;">
                        <h4 class="text-white">Investment Growth</h4>
                        <p class="text-white text-opacity-75">Track performance and see where your money is heading.</p>
                        <a href="#!" class="btn btn-sm rounded-pill btn-info bg-gradient">View Portfolio</a>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header justify-content-between">
                        <h4 class="card-title">Quick Transfer</h4>
                        <div class="dropdown ms-auto">
                            <a href="#" class="btn btn-sm btn-default btn-icon" data-bs-toggle="dropdown">
                                <i class="ti ti-dots-vertical fs-lg"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a href="#!" class="dropdown-item">Add Recipient</a></li>
                                <li><a href="#!" class="dropdown-item">Recent Transfers</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex gap-2 justify-content-center mb-3">
                            <img src="assets/images/users/user-4.jpg" class="rounded-circle img-thumbnail avatar-lg" alt="user">
                            <img src="assets/images/users/user-5.jpg" class="rounded-circle img-thumbnail avatar-lg" alt="user">
                            <img src="assets/images/users/user-3.jpg" class="rounded-circle img-thumbnail avatar-lg" alt="user">
                            <img src="assets/images/users/user-2.jpg" class="rounded-circle img-thumbnail avatar-lg" alt="user">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Send From</label>
                            <select class="form-select">
                                <option value="visa">Visa •••• 3698</option>
                                <option value="mastercard">Mastercard •••• 1425</option>
                            </select>
                        </div>
                        
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="form-label">Amount</label>
                                <input type="number" class="form-control" placeholder="0.00">
                            </div>
                            <div class="col-6 d-flex align-items-end">
                                <a href="#!" class="btn btn-primary w-100">Send Money</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card" data-table="transactions" data-table-rows-per-page="8">
                    <div class="card-header border-light justify-content-between">
                        <h4 class="card-title">Recent Transactions</h4>
                        
                        <div class="d-flex align-items-center gap-2">
                             <div class="app-search">
                                <input data-table-search="" type="search" class="form-control" placeholder="Search transactions...">
                                <i class="ti ti-search app-search-icon text-muted"></i>
                            </div>
                            
                            <select data-table-set-rows-per-page="" class="form-select form-control my-1 my-md-0 w-auto">
                                <option value="5">5</option>
                                <option value="8" selected>8</option>
                                <option value="10">10</option>
                            </select>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-custom table-nowrap table-centered table-select table-hover w-100 mb-0">
                            <thead class="bg-light align-middle bg-opacity-25 thead-sm">
                                <tr>
                                    <th data-table-sort="id" style="cursor: pointer;">ID</th>
                                    <th data-table-sort="name" style="cursor: pointer;">Name / Business</th>
                                    <th>Description</th>
                                    <th data-table-sort="amount" style="cursor: pointer;">Amount</th>
                                    <th data-table-sort="status" style="cursor: pointer;">Status</th>
                                    <th>•••</th>
                                </tr>
                            </thead>
                            <tbody class="list">
                                <tr>
                                    <td class="id"><a href="#!" class="fw-medium text-reset">#TX901</a></td>
                                    <td class="name">
                                        <img src="assets/images/users/user-5.jpg" alt="" class="avatar-xs rounded-circle me-1">
                                        Sophia Miller
                                    </td>
                                    <td class="desc">Subscription Renewal</td>
                                    <td class="amount text-success">USD $299.00</td>
                                    <td class="status"><span class="badge bg-success-subtle text-success p-1">Success</span></td>
                                    <td><a href="#!" class="text-muted fs-20"><i class="ti ti-eye"></i></a></td>
                                </tr>
                                <tr>
                                    <td class="id"><a href="#!" class="fw-medium text-reset">#TX900</a></td>
                                    <td class="name">
                                        <img src="assets/images/users/user-2.jpg" alt="" class="avatar-xs rounded-circle me-1">
                                        James Carter
                                    </td>
                                    <td class="desc">Refund Processed</td>
                                    <td class="amount text-danger">-USD $150.50</td>
                                    <td class="status"><span class="badge bg-warning-subtle text-warning p-1">Pending</span></td>
                                    <td><a href="#!" class="text-muted fs-20"><i class="ti ti-eye"></i></a></td>
                                </tr>
                                <tr>
                                    <td class="id"><a href="#!" class="fw-medium text-reset">#TX899</a></td>
                                    <td class="name">
                                        <div class="avatar-xs d-inline-block me-1">
                                            <span class="avatar-title bg-secondary-subtle text-secondary fw-semibold rounded-circle">W</span>
                                        </div>
                                        WavePay
                                    </td>
                                    <td class="desc">Wallet Top-Up</td>
                                    <td class="amount text-success">USD $620.00</td>
                                    <td class="status"><span class="badge bg-success-subtle text-success p-1">Success</span></td>
                                    <td><a href="#!" class="text-muted fs-20"><i class="ti ti-eye"></i></a></td>
                                </tr>
                                <tr>
                                    <td class="id"><a href="#!" class="fw-medium text-reset">#TX898</a></td>
                                    <td class="name">
                                        <img src="assets/images/users/user-3.jpg" alt="" class="avatar-xs rounded-circle me-1">
                                        Liam Thompson
                                    </td>
                                    <td class="desc">Service Charge</td>
                                    <td class="amount text-danger">-USD $19.99</td>
                                    <td class="status"><span class="badge bg-danger-subtle text-danger p-1">Failed</span></td>
                                    <td><a href="#!" class="text-muted fs-20"><i class="ti ti-eye"></i></a></td>
                                </tr>
                                <tr>
                                    <td class="id"><a href="#!" class="fw-medium text-reset">#TX897</a></td>
                                    <td class="name">
                                        <img src="assets/images/users/user-4.jpg" alt="" class="avatar-xs rounded-circle me-1">
                                        Emma Stone
                                    </td>
                                    <td class="desc">Invoice #2112</td>
                                    <td class="amount text-success">EUR €420.72</td>
                                    <td class="status"><span class="badge bg-success-subtle text-success p-1">Success</span></td>
                                    <td><a href="#!" class="text-muted fs-20"><i class="ti ti-eye"></i></a></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="card-footer border-0">
                        <div data-table-pagination=""></div>
                    </div>
                </div>
            </div>
        </div>
        </div> </div>

<?php include 'includes/footer.php'; ?>