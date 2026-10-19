import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import SeasonFilter from '../../components/shared/SeasonFilter';

interface MeetingRecord {
  id: number;
  type: string;
  meeting_with?: 'student' | 'parent';
  title: string;
  content: string;
  meeting_date: string;
  meeting_time?: string | null;
  visibility: string;
  status: string;
  teacher?: { id: number; name: string } | null;
  student?: { id: number; name: string; school_no?: string } | null;
  classroom_label?: string | null;
}

interface MeetingsStats {
  totals: {
    total_records: number;
    student_meetings: number;
    parent_meetings: number;
    meetings: number;
    appointments: number;
  };
  by_teacher: Array<{
    teacher_id: number;
    teacher_name: string;
    total_records: number;
    student_meetings: number;
    parent_meetings: number;
  }>;
  top_last_30_days: Array<{
    teacher_id: number;
    teacher_name: string;
    total_records: number;
  }>;
  last_30_days_from: string;
}

const VISIBILITY_BADGE: Record<string, { label: string; color: string }> = {
  admin_only: { label: 'Sadece Yöneticiye Özel', color: 'warning' },
  teachers_open: { label: 'Öğretmenlere Açık', color: 'info' },
  public: { label: 'Herkese Açık', color: 'success' },
  private: { label: 'Sadece Ben', color: 'secondary' },
};

const MeetingsPage = () => {
  const [records, setRecords] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MeetingsStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [typeFilter, setTypeFilter] = useState<'meeting' | 'appointment' | ''>('');
  const [withFilter, setWithFilter] = useState<'student' | 'parent' | ''>('');
  const [teacherId, setTeacherId] = useState<number | ''>('');
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (withFilter) params.set('meeting_with', withFilter);
      if (teacherId) params.set('teacher_id', String(teacherId));
      if (seasonFilter) params.set('season_id', seasonFilter);

      const res = await axiosClient.get(`/meetings?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.meetings) ? data.meetings : [];
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, withFilter, teacherId, seasonFilter]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (withFilter) params.set('meeting_with', withFilter);
      if (teacherId) params.set('teacher_id', String(teacherId));
      if (seasonFilter) params.set('season_id', seasonFilter);

      const res = await axiosClient.get(`/meetings/stats?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      setStats((data || null) as MeetingsStats | null);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [typeFilter, withFilter, teacherId, seasonFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((r) => {
      const hay = [
        r.title,
        r.content,
        r.teacher?.name,
        r.student?.name,
        r.student?.school_no,
        r.classroom_label,
        r.meeting_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [records, search]);

  const renderVisibilityBadge = (v: string) => {
    const info = VISIBILITY_BADGE[v] || VISIBILITY_BADGE.admin_only;
    return <span className={`badge bg-soft-${info.color} text-${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="container-fluid pt-3">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="page-title mb-1">Görüşmeler</h4>
          <small className="text-muted">Öğretmenlerin oluşturduğu öğrenci/veli görüşmelerini takip edin.</small>
        </div>
        <span className="badge bg-soft-primary text-primary px-3 py-2">{filtered.length} kayıt</span>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-2">
              <label className="form-label">Sezon</label>
              <SeasonFilter 
                value={seasonFilter} 
                onChange={setSeasonFilter} 
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Öğretmen</label>
              <select
                className="form-select"
                value={teacherId === '' ? '' : String(teacherId)}
                onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Tümü</option>
                {(stats?.by_teacher || []).map((t) => (
                  <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Tür</label>
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="">Tümü</option>
                <option value="meeting">Görüşme</option>
                <option value="appointment">Randevu</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Görüşme Kiminle</label>
              <select className="form-select" value={withFilter} onChange={(e) => setWithFilter(e.target.value as any)}>
                <option value="">Tümü</option>
                <option value="student">Öğrenci</option>
                <option value="parent">Veli</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Ara</label>
              <input
                type="text"
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Başlık, öğretmen, öğrenci, sınıf..."
              />
            </div>
          </div>
        </div>
      </div>

      {(loadingStats || stats) && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Toplam Görüşme/Randevu</div>
                <div className="fw-bold fs-4">{loadingStats ? '-' : (stats?.totals?.total_records ?? 0)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Öğrenci ile</div>
                <div className="fw-bold fs-4">{loadingStats ? '-' : (stats?.totals?.student_meetings ?? 0)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Veli ile</div>
                <div className="fw-bold fs-4">{loadingStats ? '-' : (stats?.totals?.parent_meetings ?? 0)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Son 30 Gün Top 10</div>
                <div className="fw-bold fs-6">{loadingStats ? '-' : (stats?.last_30_days_from ? `${stats.last_30_days_from} - bugün` : '-')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loadingStats && stats && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="fw-semibold mb-2">Öğretmen Bazlı Kırılım</div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Öğretmen</th>
                        <th className="text-end">Toplam</th>
                        <th className="text-end">Öğrenci</th>
                        <th className="text-end">Veli</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.by_teacher || []).map((t) => (
                        <tr key={t.teacher_id}>
                          <td>{t.teacher_name}</td>
                          <td className="text-end fw-semibold">{t.total_records}</td>
                          <td className="text-end">{t.student_meetings}</td>
                          <td className="text-end">{t.parent_meetings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="fw-semibold mb-2">Son 30 Gün En Çok Görüşme</div>
                {(stats.top_last_30_days || []).length === 0 ? (
                  <div className="text-muted small">Kayıt yok</div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {stats.top_last_30_days.map((t, idx) => (
                      <div key={t.teacher_id} className="border rounded p-2 small">
                        <div className="d-flex justify-content-between">
                          <div className="fw-semibold">{idx + 1}. {t.teacher_name}</div>
                          <div className="fw-semibold">{t.total_records}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">Kayıt bulunamadı.</div>
      ) : (
        filtered.map((rec) => (
          <div key={rec.id} className="card border shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 className="mb-1 fw-bold">{rec.title}</h6>
                  <div className="text-muted small">
                    <i className="ti ti-user me-1"></i>
                    {rec.teacher?.name || '-'}
                    <span className="mx-2">|</span>
                    <i className="ti ti-calendar me-1"></i>
                    {rec.meeting_date || '-'}
                    {rec.meeting_time ? (
                      <>
                        <span className="mx-2">|</span>
                        <i className="ti ti-clock me-1"></i>
                        {rec.meeting_time}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="d-flex flex-column align-items-end gap-1">
                  {renderVisibilityBadge(rec.visibility)}
                  <span className={`badge bg-soft-${rec.type === 'appointment' ? 'info' : 'primary'} text-${rec.type === 'appointment' ? 'info' : 'primary'}`}>
                    {rec.type === 'appointment' ? 'Randevu' : 'Görüşme'}
                  </span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-3 mb-2">
                {rec.student ? (
                  <span className="badge bg-soft-primary text-primary px-2 py-1">
                    <i className="ti ti-school me-1"></i>
                    {rec.student.name} {rec.student.school_no ? `(${rec.student.school_no})` : ''}
                  </span>
                ) : null}
                {rec.classroom_label ? (
                  <span className="text-muted small">
                    <i className="ti ti-building me-1"></i>
                    {rec.classroom_label}
                  </span>
                ) : null}
                {rec.meeting_with ? (
                  <span className="text-muted small">
                    <i className="ti ti-users me-1"></i>
                    {rec.meeting_with === 'student' ? 'Öğrenci' : 'Veli'}
                  </span>
                ) : null}
              </div>

              {rec.content ? (
                <div className="border rounded p-3 bg-light small" style={{ whiteSpace: 'pre-wrap' }}>
                  {rec.content}
                </div>
              ) : (
                <div className="text-muted small">-</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MeetingsPage;
