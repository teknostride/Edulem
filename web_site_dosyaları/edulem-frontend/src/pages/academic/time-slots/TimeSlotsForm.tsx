import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

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

const TimeSlotsForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const levelFromQuery = searchParams.get('education_level_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [educationLevelId, setEducationLevelId] = useState<number | ''>(
    levelFromQuery ? parseInt(levelFromQuery, 10) : ''
  );
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(40);
  const [type, setType] = useState<'lesson' | 'break' | 'lunch'>('lesson');

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

  const filteredLevels = useMemo(() => educationLevels, [educationLevels]);

  const endTime = (() => {
    const [h, m] = startTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + duration, 0, 0);
    return d.toTimeString().slice(0, 5);
  })();

  const label = (() => {
    if (type === 'break') return 'Teneffüs';
    if (type === 'lunch') return 'Öğle arası';
    return 'Ders';
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!educationLevelId) {
      showToast('warning', 'Kademe seçiniz.');
      return;
    }
    if (duration <= 0) {
      showToast('warning', 'Süre 0\'dan büyük olmalıdır.');
      return;
    }
    setSaving(true);
    try {
      await axiosClient.post('/time-slots', {
        education_level_id: educationLevelId,
        start_time: startTime,
        end_time: endTime,
        label,
        type,
      });
      showToast('success', 'Zaman dilimi eklendi.');
      navigate(`/time-slots?education_level_id=${educationLevelId}`);
    } catch (err: any) {
      showToast(
        'error',
        err.response?.data?.message ?? 'Kayıt sırasında hata oluştu.'
      );
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
            <h4 className="page-main-title m-0">Yeni Zaman Dilimi</h4>
          </div>
          <div className="text-end">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item">
                <Link to="/">EduLem</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/time-slots">Ders Saatleri</Link>
              </li>
              <li className="breadcrumb-item active">Yeni</li>
            </ol>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Kademe *</label>
                    <select
                      className="form-select"
                      value={educationLevelId || ''}
                      onChange={(e) =>
                        setEducationLevelId(
                          e.target.value ? Number(e.target.value) : ''
                        )
                      }
                      required
                    >
                      <option value="">Seçiniz</option>
                      {filteredLevels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {campuses.find((c) => c.id === l.campus_id)
                            ? ` — ${campuses.find((c) => c.id === l.campus_id)?.name}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label">Başlangıç saati *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label">Süre (dk) *</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        value={duration}
                        onChange={(e) =>
                          setDuration(parseInt(e.target.value, 10) || 0)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tahmini bitiş</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={endTime}
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tür *</label>
                    <select
                      className="form-select"
                      value={type}
                      onChange={(e) =>
                        setType(
                          e.target.value as 'lesson' | 'break' | 'lunch'
                        )
                      }
                    >
                      <option value="lesson">Ders</option>
                      <option value="break">Teneffüs</option>
                      <option value="lunch">Öğle arası</option>
                    </select>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="spinner-border spinner-border-sm me-1" />
                      ) : null}
                      Ekle
                    </button>
                    <Link
                      to={
                        educationLevelId
                          ? `/time-slots?education_level_id=${educationLevelId}`
                          : '/time-slots'
                      }
                      className="btn btn-outline-secondary"
                    >
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

export default TimeSlotsForm;
