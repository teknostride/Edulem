import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { confirmDialog, showToast } from '../../../utils/toast';

interface TimeSlot {
  id: number;
  education_level_id: number;
  start_time: string;
  end_time: string;
  label: string;
  type: 'lesson' | 'break' | 'lunch';
  slot_number?: number;
}

interface Campus {
  id: number;
  name: string;
}

interface EducationLevel {
  id: number;
  campus_id: number;
  name: string;
}

const getArray = (res: any): any[] => {
  if (!res?.data) return [];
  const p = res.data;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p.data)) return p.data;
  if (p?.data && typeof p.data === 'object') {
    const v = Object.values(p.data);
    for (const x of v) if (Array.isArray(x)) return x;
  }
  return [];
};

const TimeSlotsList = () => {
  const [searchParams] = useSearchParams();
  const levelFromQuery = searchParams.get('education_level_id');

  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<number | ''>('');
  const [selectedLevelId, setSelectedLevelId] = useState<number | ''>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rC, rL] = await Promise.all([
          axiosClient.get('/campuses'),
          axiosClient.get('/education-levels'),
        ]);
        setCampuses(getArray(rC));
        setEducationLevels(getArray(rL));
      } catch (e) {
        console.error(e);
        showToast('error', 'Veriler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredLevels = useMemo(() => {
    if (!selectedCampusId) return [];
    return educationLevels.filter(
      (l) => Number(l.campus_id) === Number(selectedCampusId)
    );
  }, [selectedCampusId, educationLevels]);

  useEffect(() => {
    if (levelFromQuery && educationLevels.length > 0) {
      const level = educationLevels.find(
        (l) => String(l.id) === levelFromQuery
      );
      if (level) {
        setSelectedCampusId(level.campus_id);
        setSelectedLevelId(level.id);
      }
    }
  }, [levelFromQuery, educationLevels]);


  useEffect(() => {
    if (!selectedLevelId) {
      setSlots([]);
      return;
    }
    (async () => {
      try {
        const res = await axiosClient.get(`/${selectedLevelId}/time-slots`);
        setSlots(getArray(res));
      } catch (e) {
        setSlots([]);
      }
    })();
  }, [selectedLevelId]);

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu zaman dilimini silmek istediğinize emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    try {
      await axiosClient.delete(`/time-slots/${id}`);
      showToast('success', 'Silindi.');
      if (selectedLevelId) {
        const res = await axiosClient.get(`/${selectedLevelId}/time-slots`);
        setSlots(getArray(res));
      }
    } catch (e) {
      showToast('error', 'Silinemedi.');
    }
  };

  const typeLabel = (t: string) => {
    if (t === 'lesson') return 'Ders';
    if (t === 'break') return 'Teneffüs';
    return 'Öğle arası';
  };

  const typeBadge = (t: string) => {
    if (t === 'lesson') return 'bg-primary';
    if (t === 'break') return 'bg-secondary';
    return 'bg-warning text-dark';
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
            <h4 className="page-main-title m-0">Ders Saatleri</h4>
          </div>
          <div className="text-end">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item">
                <Link to="/">EduLem</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/settings/institution">Kurum Bilgileri</Link>
              </li>
              <li className="breadcrumb-item active">Ders Saatleri</li>
            </ol>
          </div>
        </div>

        <div className="alert alert-info border-0 mb-3">
          <i className="ti ti-info-circle me-2" />
          Kampüs ve kademe seçerek ilgili ders saatlerini görüntüleyebilir veya{' '}
          <Link to="/settings/institution" className="alert-link">
            Kurum Bilgileri → Çalışma Zamanı
          </Link>{' '}
          sekmesinden düzenleyebilirsiniz.
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <label className="form-label small fw-bold text-muted">Kampüs</label>
            <select
              className="form-select"
              value={selectedCampusId}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : '';
                setSelectedCampusId(v);
                setSelectedLevelId('');
                setSlots([]);
              }}
            >
              <option value="">Seçiniz...</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-bold text-muted">Kademe</label>
            <select
              className="form-select"
              value={selectedLevelId}
              onChange={(e) =>
                setSelectedLevelId(e.target.value ? Number(e.target.value) : '')
              }
              disabled={!selectedCampusId}
            >
              <option value="">Seçiniz...</option>
              {filteredLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedLevelId && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Zaman Dilimleri</h6>
              <Link
                to={`/time-slots/create?education_level_id=${selectedLevelId}`}
                className="btn btn-primary btn-sm"
              >
                <i className="ti ti-plus me-1" />
                Yeni saat ekle
              </Link>
            </div>
            <div className="card-body">
              {slots.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Henüz zaman dilimi tanımlanmamış.
                  <div className="mt-2">
                    <Link
                      to={`/time-slots/create?education_level_id=${selectedLevelId}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      İlk saati ekle
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-nowrap align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Sıra</th>
                        <th>Başlangıç</th>
                        <th>Bitiş</th>
                        <th>Etiket</th>
                        <th>Tür</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...slots]
                        .sort((a, b) =>
                          (a.start_time || '').localeCompare(b.start_time || '')
                        )
                        .map((s) => (
                          <tr key={s.id}>
                            <td>{s.slot_number ?? '—'}</td>
                            <td>{s.start_time?.slice(0, 5) ?? '—'}</td>
                            <td>{s.end_time?.slice(0, 5) ?? '—'}</td>
                            <td>{s.label ?? '—'}</td>
                            <td>
                              <span
                                className={`badge ${typeBadge(s.type)}`}
                              >
                                {typeLabel(s.type)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(s.id)}
                              >
                                <i className="ti ti-trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlotsList;
