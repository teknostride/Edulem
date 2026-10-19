const RecentTransactions = () => {
  // Şimdilik veriyi burada elle (mock data) tutuyoruz. İleride veritabanından çekeceğiz.
  const transactions = [
    { id: '#TX901', name: 'Sophia Miller', avatar: 'user-5.jpg', desc: 'Abonelik Yenileme', amount: '$299.00', status: 'Success', statusClass: 'bg-success-subtle text-success', type: 'text-success' },
    { id: '#TX900', name: 'James Carter', avatar: 'user-2.jpg', desc: 'İade İşlemi', amount: '-$150.50', status: 'Pending', statusClass: 'bg-warning-subtle text-warning', type: 'text-danger' },
    { id: '#TX899', name: 'Liam Thompson', avatar: 'user-3.jpg', desc: 'Cüzdan Yükleme', amount: '$620.00', status: 'Success', statusClass: 'bg-success-subtle text-success', type: 'text-success' },
  ];

  return (
    <div className="card">
      <div className="card-header border-light justify-content-between">
        <h4 className="card-title">Son İşlemler</h4>
        <a href="#!" className="btn btn-sm btn-link">Tümünü Gör</a>
      </div>

      <div className="table-responsive">
        <table className="table table-centered table-nowrap table-hover w-100 mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>İsim</th>
              <th>Açıklama</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={index}>
                <td><a href="#!" className="fw-medium text-reset">{tx.id}</a></td>
                <td>
                  <img src={`/assets/images/users/${tx.avatar}`} alt="" className="avatar-xs rounded-circle me-1" />
                  <span className="align-middle">{tx.name}</span>
                </td>
                <td>{tx.desc}</td>
                <td className={tx.type}>{tx.amount}</td>
                <td><span className={`badge ${tx.statusClass} p-1`}>{tx.status}</span></td>
                <td><a href="#!" className="text-muted fs-20"><i className="ti ti-eye"></i></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTransactions;