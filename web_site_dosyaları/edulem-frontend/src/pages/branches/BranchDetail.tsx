import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Branch {
  id: number;
  name: string;
  campus_id: number;
  education_level_id?: number;
  manager_id?: number;
  is_active: boolean;
  campus?: { id: number; name: string };
  education_level?: { id: number; name: string };
  manager?: { id: number; first_name: string; last_name: string };
  created_at: string;
  updated_at?: string;
}

const BranchDetail = ({ branchId }: { branchId: number }) => {
  const navigate = useNavigate();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  const fetchBranch = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/branches/${branchId}`);
      const b = res.data.data?.branch ?? res.data.branch;
      setBranch(b ?? null);
    } catch (e: any) {
      showToast('error', e.response?.data?.message ?? 'Şube yüklenemedi.');
      navigate('/branches');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      text: 'Bu şubeyi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    try {
      await axiosClient.delete(`/branches/${branchId}`);
      showToast('success', 'Şube silindi.');
      navigate('/branches');
    } catch (e: any) {
      showToast('error', e.response?.data?.message ?? 'Şube silinemedi.');
    }
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="container-fluid">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <div className="mt-2">Yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!branch) return null;

  return (
    <div className="content-page">
      <div className="container-fluid">
        <div className="page-title-head d-flex align-items-center">
          <div className="flex-grow-1">
            <h4 className="page-main-title m-0">Şube Detayı</h4>
          </div>
          <div className="text-end">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item">
                <Link to="/">EduLem</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/branches">Şubeler</Link>
              </li>
              <li className="breadcrumb-item active">{branch.name}</li>
            </ol>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center mb-4">
                  <div className="avatar-lg me-3">
                    <span className="avatar-title bg-primary-subtle text-primary rounded">
                      <i className="ti ti-building-store fs-2" />
                    </span>
                  </div>
                  <div>
                    <h5 className="mb-1">{branch.name}</h5>
                    <span
                      className={`badge ${branch.is_active ? 'bg-success' : 'bg-danger'}`}
                    >
                      {branch.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '180px' }}>
                          Kampüs
                        </td>
                        <td>
                          <span className="badge bg-info-subtle text-info">
                            {branch.campus?.name ?? '—'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Kademe</td>
                        <td>
                          <span className="badge bg-success-subtle text-success">
                            {branch.education_level?.name ?? '—'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Şube müdürü</td>
                        <td>
                          {branch.manager
                            ? `${branch.manager.first_name} ${branch.manager.last_name}`
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Oluşturulma</td>
                        <td>
                          {branch.created_at
                            ? new Date(branch.created_at).toLocaleDateString('tr-TR')
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2 mt-4">
                  <Link
                    to={`/branches/${branchId}/edit`}
                    className="btn btn-primary"
                  >
                    <i className="ti ti-edit me-1" />
                    Düzenle
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleDelete}
                  >
                    <i className="ti ti-trash me-1" />
                    Sil
                  </button>
                  <Link to="/branches" className="btn btn-outline-secondary">
                    Listeye dön
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDetail;
