import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Option {
  id: number;
  name: string;
}

interface BranchFormData {
  campus_id: number;
  name: string;
  education_level_id: number;
  manager_id: number;
  is_active: boolean;
}

const BranchForm = ({ branchId }: { branchId?: number }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campuses, setCampuses] = useState<Option[]>([]);
  const [educationLevels, setEducationLevels] = useState<Option[]>([]);
  const [managers, setManagers] = useState<Array<{ id: number; first_name: string; last_name: string }>>([]);
  const [formData, setFormData] = useState<BranchFormData>({
    campus_id: 0,
    name: '',
    education_level_id: 0,
    manager_id: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchCampuses();
    if (branchId) fetchBranch();
  }, [branchId]);

  useEffect(() => {
    if (formData.campus_id) {
      fetchEducationLevels(formData.campus_id);
    } else {
      setEducationLevels([]);
      setFormData((p) => ({ ...p, education_level_id: 0 }));
    }
  }, [formData.campus_id]);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchCampuses = async () => {
    try {
      const res = await axiosClient.get('/campuses');
      const data = res.data.data?.campuses || res.data.campuses || res.data.data || res.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Kampüsler yüklenemedi:', e);
      setCampuses([]);
    }
  };

  const fetchEducationLevels = async (campusId: number) => {
    try {
      const res = await axiosClient.get(`/education-levels?campus_id=${campusId}`);
      const data = res.data.data?.education_levels || res.data.education_levels || res.data.data || res.data;
      setEducationLevels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Kademeler yüklenemedi:', e);
      setEducationLevels([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await axiosClient.get('/users?per_page=500');
      const data = res.data.data?.users ?? res.data.users ?? res.data.data ?? res.data;
      const arr = Array.isArray(data) ? data : [];
      setManagers(arr);
    } catch (e) {
      console.error('Kullanıcılar yüklenemedi:', e);
      setManagers([]);
    }
  };

  const fetchBranch = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/branches/${branchId}`);
      const b = res.data.data?.branch ?? res.data.branch;
      if (b) {
        setFormData({
          campus_id: b.campus_id ?? 0,
          name: b.name ?? '',
          education_level_id: b.education_level_id ?? 0,
          manager_id: b.manager_id ?? 0,
          is_active: b.is_active ?? true,
        });
      }
    } catch (e: any) {
      showToast('error', e.response?.data?.message ?? 'Şube yüklenemedi.');
      navigate('/branches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campus_id || !formData.name.trim()) {
      showToast('warning', 'Kampüs ve şube adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        campus_id: formData.campus_id,
        name: formData.name.trim(),
        education_level_id: formData.education_level_id || null,
        manager_id: formData.manager_id || null,
      };
      if (branchId) {
        payload.is_active = formData.is_active;
        await axiosClient.put(`/branches/${branchId}`, payload);
        showToast('success', 'Şube güncellendi.');
      } else {
        await axiosClient.post('/branches', payload);
        showToast('success', 'Şube oluşturuldu.');
      }
      navigate('/branches');
    } catch (err: any) {
      showToast('error', err.response?.data?.message ?? 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
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

  return (
    <div className="content-page">
      <div className="container-fluid">
        <div className="page-title-head d-flex align-items-center">
          <div className="flex-grow-1">
            <h4 className="page-main-title m-0">
              {branchId ? 'Şube Düzenle' : 'Yeni Şube'}
            </h4>
          </div>
          <div className="text-end">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item">
                <Link to="/">EduLem</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/branches">Şubeler</Link>
              </li>
              <li className="breadcrumb-item active">
                {branchId ? 'Düzenle' : 'Yeni'}
              </li>
            </ol>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Kampüs *</label>
                    <select
                      className="form-select"
                      value={formData.campus_id || ''}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          campus_id: Number(e.target.value) || 0,
                          education_level_id: 0,
                        }))
                      }
                      required
                    >
                      <option value="">Seçiniz</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Şube adı *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Örn. İlkokul - Aksaray Kampüs"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Kademe</label>
                    <select
                      className="form-select"
                      value={formData.education_level_id || ''}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          education_level_id: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={!formData.campus_id}
                    >
                      <option value="">Seçiniz (isteğe bağlı)</option>
                      {educationLevels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Şube müdürü</label>
                    <select
                      className="form-select"
                      value={formData.manager_id || ''}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          manager_id: Number(e.target.value) || 0,
                        }))
                      }
                    >
                      <option value="">Atanmamış</option>
                      {managers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {branchId && (
                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              is_active: e.target.checked,
                            }))
                          }
                        />
                        <label className="form-check-label">Aktif</label>
                      </div>
                    </div>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : null}
                      {branchId ? 'Güncelle' : 'Oluştur'}
                    </button>
                    <Link to="/branches" className="btn btn-outline-secondary">
                      İptal
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
