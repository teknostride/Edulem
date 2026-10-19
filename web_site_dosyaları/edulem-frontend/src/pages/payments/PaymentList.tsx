const PaymentList = () => {
  return (
    <>
      <div className="page-title-head d-flex align-items-center mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Ödemeler</h4>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Ödeme Listesi</h5>
            <a href="/payments/create" className="btn btn-primary btn-sm">
              <i className="ti ti-plus me-1"></i> Yeni Ödeme
            </a>
          </div>
        </div>
        <div className="card-body">
          <div className="text-center py-5">
            <i className="ti ti-currency-dollar fs-1 text-muted mb-3 d-block"></i>
            <p className="text-muted">Ödeme yönetimi sayfası geliştiriliyor...</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentList;
