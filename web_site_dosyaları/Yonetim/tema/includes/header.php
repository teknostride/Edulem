<!DOCTYPE html>
<html lang="en" data-skin="matrix" data-bs-theme="light" data-menu-color="dark" data-topbar-color="light" data-layout-width="fluid" dir="ltr" data-sidenav-size="on-hover-active" data-layout-position="fixed">
<head>
    <meta charset="utf-8">
    <title>Finance Dashboard | Responsive Bootstrap 5 Admin Dashboard Template</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Paces is a modern, responsive admin dashboard available on ThemeForest.">
    <meta name="author" content="Coderthemes">

    <link rel="shortcut icon" href="assets/images/favicon.ico">

    <script src="assets/js/config.js"></script>


    <link href="assets/css/vendors.min.css" rel="stylesheet" type="text/css">

    <link href="assets/css/app.min.css" rel="stylesheet" type="text/css">

    <style id="apexcharts-css">.apexcharts-canvas {position: relative; user-select: none;}</style>
</head>

<body>
    <div class="wrapper">
        
        <header class="app-topbar">
            <div class="container-fluid topbar-menu">
                <div class="d-flex align-items-center gap-2">
                    <div class="logo-topbar">
                        <a href="index.php" class="logo-light">
                            <span class="logo-lg"><img src="assets/images/logo.png" alt="logo"></span>
                            <span class="logo-sm"><img src="assets/images/logo-sm.png" alt="small logo"></span>
                        </a>
                        <a href="index.php" class="logo-dark">
                            <span class="logo-lg"><img src="assets/images/logo-black.png" alt="dark logo"></span>
                            <span class="logo-sm"><img src="assets/images/logo-sm.png" alt="small logo"></span>
                        </a>
                    </div>

                    <button class="sidenav-toggle-button btn btn-primary btn-icon">
                        <i class="ti ti-menu-4"></i>
                    </button>

                    <button class="topnav-toggle-button px-2" data-bs-toggle="collapse" data-bs-target="#topnav-menu">
                        <i class="ti ti-menu-4"></i>
                    </button>

                    <div id="search-box-rounded" class="app-search d-none d-xl-flex">
                        <input type="search" class="form-control rounded-pill topbar-search" name="search" placeholder="Quick Search...">
                        <i class="ti ti-search app-search-icon text-muted"></i>
                    </div>

                    <div id="megamenu-columns" class="topbar-item d-none d-md-flex">
                        <div class="dropdown">
                            <button class="topbar-link btn fw-medium btn-link dropdown-toggle drop-arrow-none px-2" data-bs-toggle="dropdown" type="button" aria-haspopup="false" aria-expanded="false">
                                Mega Menu <i class="ti ti-chevron-down ms-1"></i>
                            </button>
                            <div class="dropdown-menu dropdown-menu-xxl p-0">
                                <div class="h-100" style="max-height: 380px" data-simplebar>
                                    <div class="row g-0">
                                        <div class="col-md-4">
                                            <div class="p-2">
                                                <h5 class="mb-1 fw-semibold fs-sm dropdown-header">Dashboard & Analytics</h5>
                                                <ul class="list-unstyled megamenu-list">
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Sales Dashboard</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Marketing Dashboard</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Finance Overview</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">User Analytics</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Traffic Insights</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="p-2">
                                                <h5 class="mb-1 fw-semibold fs-sm dropdown-header">Project Management</h5>
                                                <ul class="list-unstyled megamenu-list">
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Kanban Workflow</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Project Timeline</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Task Management</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Team Members</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Assignments</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="p-2 bg-light bg-opacity-50">
                                                <h5 class="mb-1 fw-semibold fs-sm dropdown-header">User Management</h5>
                                                <ul class="list-unstyled megamenu-list">
                                                    <li><a href="javascript:void(0);" class="dropdown-item">User Profiles</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Access Control</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Security Settings</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">User Groups</a></li>
                                                    <li><a href="javascript:void(0);" class="dropdown-item">Authentication</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="megamenu-apps" class="topbar-item d-none d-md-flex">
                        <div class="dropdown">
                            <button class="topbar-link btn fw-medium btn-link dropdown-toggle drop-arrow-none px-2" data-bs-toggle="dropdown" type="button" aria-haspopup="false" aria-expanded="false">
                                Apps <i class="ti ti-chevron-down ms-1"></i>
                            </button>
                            <div class="dropdown-menu dropdown-menu-xxl p-0">
                                <div class="h-100" style="max-height: 380px" data-simplebar>
                                    <div class="row g-0">
                                        <div class="col-sm-8">
                                            <div class="row g-0">
                                                <div class="col-sm-6">
                                                    <div class="p-2">
                                                        <a href="#!" class="dropdown-item"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-primary border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-basket fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">eCommerce</h5><span class="text-muted fs-12">Products, orders & etc.</span></span></span></a>
                                                        <a href="#!" class="dropdown-item my-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-success border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-message fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Chat</h5><span class="text-muted fs-12">Team conversations</span></span></span></a>
                                                        <a href="#!" class="dropdown-item my-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-danger border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-list-check fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Task</h5><span class="text-muted fs-12">Plan and track work</span></span></span></a>
                                                        <a href="#!" class="dropdown-item mt-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-info border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-mailbox fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Email</h5><span class="text-muted fs-12">Messages and inbox</span></span></span></a>
                                                    </div>
                                                </div>
                                                <div class="col-sm-6">
                                                    <div class="p-2">
                                                        <a href="#!" class="dropdown-item"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-secondary border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-building fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Companies</h5><span class="text-muted fs-12">Business profiles</span></span></span></a>
                                                        <a href="#!" class="dropdown-item my-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-dark border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-id fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Contacts Diary</h5><span class="text-muted fs-12">People and connections</span></span></span></a>
                                                        <a href="#!" class="dropdown-item my-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-warning border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-calendar fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Calendar</h5><span class="text-muted fs-12">Events and reminders</span></span></span></a>
                                                        <a href="#!" class="dropdown-item mt-2"><span class="d-flex align-items-center"><span class="avatar-md me-2"><span class="avatar-title text-success border border-light bg-light bg-opacity-50 rounded"><i class="ti ti-lifebuoy fs-22"></i></span></span><span><h5 class="fs-base mb-0 lh-base">Support</h5><span class="text-muted fs-12">Help and assistance</span></span></span></a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-sm-4">
                                            <div class="h-100 position-relative rounded-end rounded-0 overflow-hidden" style="background: url(assets/images/stock/small-8.jpg); background-size: cover">
                                                <div class="p-3 card-img-overlay bg-gradient bg-secondary bg-opacity-90 d-flex align-items-center justify-content-center">
                                                    <div class="text-center text-white">
                                                        <i class="ti ti-atom fs-36"></i>
                                                        <p class="text-white text-opacity-75 mb-3 text-uppercase">Limited Offer</p>
                                                        <h3 class="fw-semibold text-white mb-2 fs-20">Unlock Exclusive Savings</h3>
                                                        <button type="button" class="btn btn-danger btn-sm mt-3"><i class="ti ti-shopping-cart me-1"></i> Grab Deal</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <div id="theme-dropdown" class="topbar-item d-none d-sm-flex">
                        <div class="dropdown">
                            <button class="topbar-link" data-bs-toggle="dropdown" type="button">
                                <i class="ti ti-sun topbar-link-icon" id="theme-icon-light"></i>
                                <i class="ti ti-moon topbar-link-icon d-none" id="theme-icon-dark"></i>
                                <i class="ti ti-sun-moon topbar-link-icon d-none" id="theme-icon-system"></i>
                            </button>
                            <div class="dropdown-menu dropdown-menu-end" data-thememode="dropdown">
                                <label class="dropdown-item cursor-pointer active"><input class="form-check-input" type="radio" name="data-bs-theme" value="light" style="display: none"><i class="ti ti-sun align-middle me-1 fs-16"></i> <span class="align-middle">Light</span></label>
                                <label class="dropdown-item cursor-pointer"><input class="form-check-input" type="radio" name="data-bs-theme" value="dark" style="display: none"><i class="ti ti-moon align-middle me-1 fs-16"></i> <span class="align-middle">Dark</span></label>
                                <label class="dropdown-item cursor-pointer"><input class="form-check-input" type="radio" name="data-bs-theme" value="system" style="display: none"><i class="ti ti-sun-moon align-middle me-1 fs-16"></i> <span class="align-middle">System</span></label>
                            </div>
                        </div>
                    </div>

                    <div id="apps-dropdown-grid" class="topbar-item d-none d-xl-flex">
                        <div class="dropdown">
                            <button class="topbar-link dropdown-toggle drop-arrow-none" data-bs-toggle="dropdown"><i class="ti ti-apps topbar-link-icon"></i></button>
                            <div class="dropdown-menu dropdown-menu-lg p-2 dropdown-menu-end">
                                <div class="row align-items-center g-1">
                                    <div class="col-4"><a href="javascript:void(0);" class="dropdown-item border border-dashed rounded text-center py-2"><span class="avatar-sm d-block mx-auto mb-1"><span class="avatar-title text-bg-light rounded-circle"><img src="assets/images/logos/google.svg" alt="Google Logo" height="18"></span></span><span class="align-middle fw-medium">Google</span></a></div>
                                    <div class="col-4"><a href="javascript:void(0);" class="dropdown-item border border-dashed rounded text-center py-2"><span class="avatar-sm d-block mx-auto mb-1"><span class="avatar-title text-bg-light rounded-circle"><img src="assets/images/logos/figma.svg" alt="Figma Logo" height="18"></span></span><span class="align-middle fw-medium">Figma</span></a></div>
                                    <div class="col-4"><a href="javascript:void(0);" class="dropdown-item border border-dashed rounded text-center py-2"><span class="avatar-sm d-block mx-auto mb-1"><span class="avatar-title text-bg-light rounded-circle"><img src="assets/images/logos/slack.svg" alt="Slack Logo" height="18"></span></span><span class="align-middle fw-medium">Slack</span></a></div>
                                    <div class="col-4"><a href="javascript:void(0);" class="dropdown-item border border-dashed rounded text-center py-2"><span class="avatar-sm d-block mx-auto mb-1"><span class="avatar-title text-bg-light rounded-circle"><img src="assets/images/logos/dropbox.svg" alt="Dropbox Logo" height="18"></span></span><span class="align-middle fw-medium">Dropbox</span></a></div>
                                    <div class="col-4 text-center"><a href="javascript:void(0);" class="btn btn-sm rounded-circle btn-icon btn-danger"><i class="ti ti-circle-dashed-plus fs-18"></i></a></div>
                                    <div class="col-4"><a href="javascript:void(0);" class="dropdown-item border border-dashed rounded text-center py-2"><span class="avatar-sm d-block mx-auto mb-1"><span class="avatar-title bg-primary-subtle text-primary rounded-circle"><i class="ti ti-calendar fs-18"></i></span></span><span class="align-middle fw-medium">Calendar</span></a></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="notification-dropdown-people" class="topbar-item">
                        <div class="dropdown">
                            <button class="topbar-link dropdown-toggle drop-arrow-none" data-bs-toggle="dropdown"><i class="ti ti-bell topbar-link-icon animate-ring"></i><span class="badge text-bg-danger badge-circle topbar-badge">5</span></button>
                            <div class="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg">
                                <div class="px-3 py-2 border-bottom"><div class="row align-items-center"><div class="col"><h6 class="m-0 fs-md fw-semibold">Notifications</h6></div><div class="col text-end"><a href="#!" class="badge badge-soft-success badge-label py-1">07 Notifications</a></div></div></div>
                                <div style="max-height: 300px" data-simplebar>
                                    <div class="dropdown-item notification-item py-2 text-wrap" id="message-1"><span class="d-flex align-items-center gap-3"><span class="flex-shrink-0 position-relative"><img src="assets/images/users/user-4.jpg" class="avatar-md rounded-circle" alt="User Avatar"><span class="position-absolute rounded-pill bg-success notification-badge"><i class="ti ti-bell align-middle"></i></span></span><span class="flex-grow-1 text-muted"><span class="fw-medium text-body">Emily Johnson</span> commented on a task in <span class="fw-medium text-body">Design Sprint</span><br><span class="fs-xs">12 minutes ago</span></span></span></div>
                                    </div>
                                <a href="javascript:void(0);" class="dropdown-item text-center text-reset text-decoration-underline link-offset-2 fw-bold notify-item border-top border-light py-2">Read All Messages</a>
                            </div>
                        </div>
                    </div>

                    <div id="fullscreen-toggler" class="topbar-item d-none d-md-flex"><button class="topbar-link" type="button" data-toggle="fullscreen"><i class="ti ti-maximize topbar-link-icon"></i><i class="ti ti-minimize topbar-link-icon d-none"></i></button></div>
                    <div id="monochrome-toggler" class="topbar-item d-none d-xl-flex"><button id="monochrome-mode" class="topbar-link" type="button" data-toggle="monochrome"><i class="ti ti-palette topbar-link-icon"></i></button></div>
                    <div class="topbar-item d-none d-sm-flex"><button class="topbar-link btn-theme-setting" data-bs-toggle="offcanvas" data-bs-target="#theme-settings-offcanvas"><i class="ti ti-settings topbar-link-icon"></i></button></div>
                    
                    <div id="language-selector-rounded" class="topbar-item">
                        <div class="dropdown">
                            <button class="topbar-link fw-bold" data-bs-toggle="dropdown"><img src="assets/images/flags/us.svg" class="rounded-circle me-2" height="18"><span id="selected-language-code">EN</span></button>
                            <div class="dropdown-menu dropdown-menu-end">
                                <a href="javascript:void(0);" class="dropdown-item" data-translator-lang="en"><img src="assets/images/flags/us.svg" height="18" class="me-1"> English</a>
                            </div>
                        </div>
                    </div>

                    <div id="user-dropdown-detailed" class="topbar-item nav-user">
                        <div class="dropdown">
                            <a class="topbar-link dropdown-toggle drop-arrow-none px-2" data-bs-toggle="dropdown" href="#"><img src="assets/images/users/user-1.jpg" width="32" class="rounded-circle me-lg-2 d-flex" alt="user-image"><div class="d-lg-flex align-items-center gap-1 d-none"><span><h5 class="my-0 lh-1 pro-username">David Dev</h5><span class="fs-xs lh-1">Admin Head</span></span><i class="ti ti-chevron-down align-middle"></i></div></a>
                            <div class="dropdown-menu dropdown-menu-end">
                                <div class="dropdown-header noti-title"><h6 class="text-overflow m-0">Welcome back 👋!</h6></div>
                                <a href="#!" class="dropdown-item"><i class="ti ti-user-circle me-1 fs-lg align-middle"></i> Profile</a>
                                <a href="#!" class="dropdown-item"><i class="ti ti-settings-2 me-1 fs-lg align-middle"></i> Account Settings</a>
                                <a href="#!" class="dropdown-item"><i class="ti ti-headset me-1 fs-lg align-middle"></i> Support Center</a>
                                <div class="dropdown-divider"></div>
                                <a href="javascript:void(0);" class="dropdown-item fw-semibold"><i class="ti ti-logout me-1 fs-lg align-middle"></i> Log Out</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
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
                        <span class="sidenav-user-name fw-bold">David Dev</span>
                        <span class="fs-12 fw-semibold" data-lang="user-role">Art Director</span>
                    </a>
                </div>
                <div>
                    <a class="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon" data-bs-toggle="dropdown" href="#"><i class="ti ti-settings fs-24 align-middle ms-1"></i></a>
                    <div class="dropdown-menu">
                        <div class="dropdown-header noti-title"><h6 class="text-overflow m-0">Welcome back!</h6></div>
                        <a href="#!" class="dropdown-item"><i class="ti ti-user-circle me-1 fs-lg align-middle"></i> Profile</a>
                        <a href="#!" class="dropdown-item"><i class="ti ti-settings-2 me-1 fs-lg align-middle"></i> Account Settings</a>
                        <a href="javascript:void(0);" class="dropdown-item text-danger fw-semibold"><i class="ti ti-logout me-1 fs-lg align-middle"></i> Log Out</a>
                    </div>
                </div>
            </div>
        </div>

        <div id="sidenav-menu">
            <ul class="side-nav">
                <li class="side-nav-title mt-2" data-lang="main">Main</li>
                <li class="side-nav-item active">
                    <a data-bs-toggle="collapse" href="#dashboards" aria-expanded="true" aria-controls="dashboards" class="side-nav-link">
                        <span class="menu-icon"><i class="ti ti-dashboard"></i></span>
                        <span class="menu-text" data-lang="dashboards">Dashboards</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse show" id="dashboards">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="index.html" class="side-nav-link"><span class="menu-text" data-lang="dashboard-ecommerce">Ecommerce</span></a></li>
                            <li class="side-nav-item"><a href="dashboard-analytics.html" class="side-nav-link"><span class="menu-text" data-lang="dashboard-analytics">Analytics</span></a></li>
                            <li class="side-nav-item"><a href="dashboard-crm.html" class="side-nav-link"><span class="menu-text" data-lang="dashboard-crm">CRM</span></a></li>
                            <li class="side-nav-item active"><a href="dashboard-finance.html" class="side-nav-link active"><span class="menu-text" data-lang="dashboard-finance">Finance</span></a></li>
                            <li class="side-nav-item"><a href="dashboard-projects.html" class="side-nav-link"><span class="menu-text" data-lang="dashboard-projects">Projects</span></a></li>
                        </ul>
                    </div>
                </li>

                <li class="side-nav-title mt-2" data-lang="apps">Apps</li>
                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#ecommerce" aria-expanded="false" aria-controls="ecommerce" class="side-nav-link collapsed">
                        <span class="menu-icon"><i class="ti ti-basket"></i></span>
                        <span class="menu-text" data-lang="ecommerce">Ecommerce</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="ecommerce">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a data-bs-toggle="collapse" href="#products" class="side-nav-link collapsed"><span class="menu-text" data-lang="products">Products</span><span class="menu-arrow"></span></a>
                                <div class="collapse" id="products">
                                    <ul class="sub-menu">
                                        <li class="side-nav-item"><a href="apps-ecommerce-products.html" class="side-nav-link">Products</a></li>
                                        </ul>
                                </div>
                            </li>
                            </ul>
                    </div>
                </li>
                <li class="side-nav-item"><a href="apps-chat.html" class="side-nav-link"><span class="menu-icon"><i class="ti ti-message"></i></span><span class="menu-text" data-lang="apps-chat">Chat</span></a></li>
                <li class="side-nav-item"><a data-bs-toggle="collapse" href="#projects" class="side-nav-link collapsed"><span class="menu-icon"><i class="ti ti-briefcase"></i></span><span class="menu-text" data-lang="projects">Projects</span><span class="menu-arrow"></span></a>
                    <div class="collapse" id="projects"><ul class="sub-menu"><li class="side-nav-item"><a href="apps-projects-list.html" class="side-nav-link">List</a></li></ul></div>
                </li>
                
                <li class="side-nav-title mt-2" data-lang="custom-pages">Custom Pages</li>
                <li class="side-nav-item">
                    <a data-bs-toggle="collapse" href="#pages" aria-expanded="false" aria-controls="pages" class="side-nav-link collapsed">
                        <span class="menu-icon"><i class="ti ti-files"></i></span>
                        <span class="menu-text" data-lang="pages">Pages</span>
                        <span class="menu-arrow"></span>
                    </a>
                    <div class="collapse" id="pages">
                        <ul class="sub-menu">
                            <li class="side-nav-item"><a href="pages-profile.html" class="side-nav-link">Profile</a></li>
                            <li class="side-nav-item"><a href="pages-invoice.html" class="side-nav-link">Invoice</a></li>
                        </ul>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>