<?php include 'includes/header.php'; ?>
<?php include 'includes/sidebar.php'; ?>

<div class="content-page">
    <div class="container-fluid">

        <div class="page-title-head d-flex align-items-center">
            <div class="flex-grow-1">
                <h4 class="page-main-title m-0">API Keys</h4>
            </div>
            <div class="text-end">
                <ol class="breadcrumb m-0 py-0">
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Paces</a></li>
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Apps</a></li>
                    <li class="breadcrumb-item active">API Keys</li>
                </ol>
            </div>
        </div>

        <div class="row">
            <div class="col-lg-12">
                <div class="card">
                    <div class="card-header border-bottom border-dashed">
                        <div class="d-flex justify-content-between align-items-center">
                            <h4 class="card-title mb-0">API Keys</h4>
                            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#api-key-modal">
                                <i class="ti ti-plus me-1"></i>Create New Key
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-centered align-middle table-nowrap mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col" style="width: 50px;">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="checkAll" value="option">
                                            </div>
                                        </th>
                                        <th scope="col">Name</th>
                                        <th scope="col">Created By</th>
                                        <th scope="col">API Key</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Created Date</th>
                                        <th scope="col" style="width: 100px;">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="check1" value="option">
                                            </div>
                                        </td>
                                        <td><span class="fw-medium">Streamline</span></td>
                                        <td><div class="avatar-xs d-inline-block me-1"><img src="assets/images/users/user-1.jpg" alt="" class="rounded-circle img-fluid"></div> David Dev</td>
                                        <td>
                                            <input type="text" class="form-control form-control-sm w-auto d-inline-block align-middle me-1" value="23e4210d-2e11-477c-9b16-5e0037a50512" readonly>
                                            <button class="btn btn-sm btn-icon btn-ghost-secondary clipboard-btn" data-clipboard-text="23e4210d-2e11-477c-9b16-5e0037a50512"><i class="ti ti-copy fs-16"></i></button>
                                        </td>
                                        <td><span class="badge bg-success-subtle text-success">Active</span></td>
                                        <td>24 Jan, 2026</td>
                                        <td>
                                            <div class="dropdown">
                                                <a href="#" class="btn btn-sm btn-icon btn-ghost-secondary" data-bs-toggle="dropdown"><i class="ti ti-dots-vertical fs-16"></i></a>
                                                <ul class="dropdown-menu dropdown-menu-end">
                                                    <li><a class="dropdown-item" href="#">Rename</a></li>
                                                    <li><a class="dropdown-item" href="#">Regenerate Key</a></li>
                                                    <li><a class="dropdown-item text-danger" href="#">Disable Key</a></li>
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                    </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="card-footer border-top border-dashed">
                        <div class="d-flex justify-content-between align-items-center">
                            <p class="mb-0 text-muted">Showing <span class="fw-semibold">1</span> to <span class="fw-semibold">10</span> of <span class="fw-semibold">12</span> entries</p>
                            <ul class="pagination pagination-sm mb-0">
                                <li class="page-item disabled"><a class="page-link" href="#">Previous</a></li>
                                <li class="page-item active"><a class="page-link" href="#">1</a></li>
                                <li class="page-item"><a class="page-link" href="#">2</a></li>
                                <li class="page-item"><a class="page-link" href="#">Next</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div> </div>

<div class="modal fade" id="api-key-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create API Key</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="mb-3">
                        <label for="apikeyName" class="form-label">Key Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="apikeyName" placeholder="Enter key name" required>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary">Create Key</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<?php 
// Bu sayfaya özel scriptler
$extra_scripts = '
    <script src="assets/plugins/clipboard/clipboard.min.js"></script>
    <script>
        // Basit bir clipboard başlatıcı (app.js içinde yoksa)
        var clipboard = new ClipboardJS(".clipboard-btn");
        clipboard.on("success", function(e) {
            alert("Kopyalandı!");
            e.clearSelection();
        });
    </script>
';
include 'includes/footer.php'; 
?>