import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Homework {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  lesson_name?: string;
  classroom_name?: string;
  lesson?: { id: number; name: string; code?: string };
  classroom?: { id: number; name: string; code?: string };
  teacher?: { id: number; name: string };
  submissions_count?: number;
  graded_count?: number;
  checked_assignments_count?: number;
  total_students?: number;
  last_graded_at?: string | null;
  has_teacher_notes?: boolean;
  is_checked?: boolean;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface TeacherStat {
  teacher_id: number | null;
  teacher_name: string;
  homework_count: number;
  total_submissions: number;
  graded_count: number;
}

interface Stats {
  total_homeworks: number;
  pending_homeworks_count?: number;
  archived_homeworks_count?: number;
  total_submissions: number;
  graded_count: number;
  pending_graded: number;
  teacher_stats?: TeacherStat[];
}

const MANAGER_VIEW_ROLES = ['owner', 'Kurucu', 'Kurum Sahibi', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'];
const CAMPUS_FILTER_ROLES = ['owner', 'Kurucu', 'Kurum Sahibi'];
/** Kurucu, Müdür, Müdür Yardımcısı sadece izleyen; ödev tanımlama butonu gösterme */
const VIEWER_ONLY_ROLES = ['owner', 'Kurucu', 'Kurum Sahibi', 'Müdür', 'Müdür Yardımcısı'];

const HomeworkList = () => {
  const navigate = useNavigate();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'pending' | 'archived'>('pending');

  const [userRole, setUserRole] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Array<{ id: number; name: string }>>([]);
  const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);
  const [classrooms, setClassrooms] = useState<Array<{ id: number; name: string }>>([]);

  const [campusId, setCampusId] = useState<number | ''>('');
  const [educationLevelId, setEducationLevelId] = useState<number | ''>('');
  const [classroomId, setClassroomId] = useState<number | ''>('');
  const [studentName, setStudentName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');

  const isManagerView = userRole !== null && MANAGER_VIEW_ROLES.includes(userRole);
  const isCampusFilter = userRole !== null && CAMPUS_FILTER_ROLES.includes(userRole);
  const isViewerOnly = userRole !== null && VIEWER_ONLY_ROLES.includes(userRole);
  const teacherStats = stats?.teacher_stats ?? [];
  const selectedTeacherStat = selectedTeacherId
    ? teacherStats.find((t) => t.teacher_id === selectedTeacherId)
    : null;

  useEffect(() => {
    const role =
      localStorage.getItem('USER_ROLE') ||
      (() => {
        try {
          return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
        } catch {
          return null;
        }
      })();
    setUserRole(role);
  }, []);

  const fetchCampuses = useCallback(async () => {
    try {
      const res = await axiosClient.get('/campuses');
      const data = res.data?.data ?? res.data;
      const list = data?.campuses ?? data ?? [];
      setCampuses(Array.isArray(list) ? list : []);
    } catch {
      setCampuses([]);
    }
  }, []);

  const fetchEducationLevels = useCallback(async (campusIdParam?: number | '') => {
    try {
      const url = campusIdParam ? `/education-levels?campus_id=${campusIdParam}` : '/education-levels';
      const res = await axiosClient.get(url);
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.education_levels ?? data) ? (data?.education_levels ?? data) : [];

      const sorted = [...list].sort((a: any, b: any) => {
        const rank = (nameRaw: any) => {
          const normalized = String(nameRaw ?? '')
            .toLocaleLowerCase('tr-TR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .replace(/ı/g, 'i');

          if (normalized.includes('anaokul')) return 1;
          if (normalized.includes('ilkokul')) return 2;
          if (normalized.includes('ortaokul')) return 3;
          if (normalized.includes('lise')) return 4;
          return 99;
        };

        const ra = rank(a?.name);
        const rb = rank(b?.name);
        if (ra !== rb) return ra - rb;
        return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr');
      });

      setEducationLevels(sorted);
    } catch {
      setEducationLevels([]);
    }
  }, []);

  const fetchClassrooms = useCallback(async (levelId: number) => {
    try {
      const params: any = {
        education_level_id: levelId,
        per_page: 200, // ensure all classrooms fetched to sort
      };
      const res = await axiosClient.get('/classrooms', { params });
      const root = res.data;
      const payload = root?.data ?? root;
      const list = payload?.classrooms ?? payload?.data ?? payload ?? [];
      const normalized = Array.isArray(list) ? list : [];

      const mapped = normalized
        .map((c: any) => ({
          id: Number(c?.id),
          name: String(c?.name ?? c?.class_name ?? c?.title ?? ''),
        }))
        .filter((c: any) => Number.isFinite(c.id) && c.id > 0 && c.name.trim() !== '');

      const sorted = [...mapped].sort((a, b) => {
        const parse = (name: string) => {
          const m = name.trim().match(/^(\d+)\s*[-\s]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])?\b/);
          if (!m) return { n: Number.POSITIVE_INFINITY, s: name.trim().toLowerCase() };
          const n = Number.parseInt(m[1], 10);
          const section = (m[2] ?? '').toString().toLowerCase();
          return { n: Number.isFinite(n) ? n : Number.POSITIVE_INFINITY, s: section };
        };

        const pa = parse(a.name);
        const pb = parse(b.name);
        if (pa.n !== pb.n) return pa.n - pb.n;
        return pa.s.localeCompare(pb.s, 'tr');
      });

      setClassrooms(sorted);
    } catch {
      setClassrooms([]);
    }
  }, []);

  useEffect(() => {
    if (isCampusFilter) fetchCampuses();
    else if (isManagerView) fetchEducationLevels();
  }, [isCampusFilter, isManagerView, fetchCampuses, fetchEducationLevels]);

  useEffect(() => {
    if (isCampusFilter && campusId) fetchEducationLevels(campusId);
    else if (isCampusFilter && !campusId) setEducationLevels([]);
  }, [isCampusFilter, campusId, fetchEducationLevels]);

  useEffect(() => {
    if (educationLevelId) fetchClassrooms(Number(educationLevelId));
    else setClassrooms([]);
  }, [educationLevelId, fetchClassrooms]);

  const fetchHomeworks = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage };
      params.is_checked = activeTab === 'archived' ? 1 : 0;
      if (campusId) params.campus_id = campusId;
      if (educationLevelId) params.education_level_id = educationLevelId;
      if (classroomId) params.classroom_id = classroomId;
      if (studentName.trim()) params.student_name = studentName.trim();
      if (selectedTeacherId) params.teacher_id = selectedTeacherId;

      const response = await axiosClient.get('/homework', { params });
      const data = response.data?.data ?? response.data;

      const list = data?.homeworks ?? data?.homeworks ?? [];
      const normalizedList = Array.isArray(list) ? list : [];
      const sortedByDueDate = [...normalizedList].sort((a: any, b: any) => {
        const ad = String(a?.due_date ?? '');
        const bd = String(b?.due_date ?? '');
        const at = ad ? new Date(ad).getTime() : Number.POSITIVE_INFINITY;
        const bt = bd ? new Date(bd).getTime() : Number.POSITIVE_INFINITY;
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
        if (Number.isNaN(at)) return 1;
        if (Number.isNaN(bt)) return -1;
        return at - bt;
      });
      setHomeworks(sortedByDueDate);
      setPagination(data?.pagination ?? null);
      setStats(data?.stats ?? null);
    } catch (error) {
      console.error('Ödevler yüklenemedi:', error);
      showToast('error', 'Ödevler yüklenemedi');
      setHomeworks([]);
      setPagination(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, campusId, educationLevelId, classroomId, selectedTeacherId, activeTab]);

  useEffect(() => {
    fetchHomeworks();
  }, [fetchHomeworks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHomeworks();
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu ödevi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    try {
      await axiosClient.delete(`/homework/${id}`);
      showToast('success', 'Ödev silindi');
      fetchHomeworks();
    } catch {
      showToast('error', 'Ödev silinemedi');
    }
  };

  const handleToggleArchive = async (id: number, currentStatus: boolean) => {
    const actionText = currentStatus ? 'arşivden çıkarmak' : 'arşive kaldırmak';
    const ok = await confirmDialog({
      title: currentStatus ? 'Arşivden Çıkar' : 'Arşive Kaldır',
      text: `Bu ödevi ${actionText} istediğinizden emin misiniz?`,
      confirmText: currentStatus ? 'Arşivden Çıkar' : 'Arşive Kaldır',
      cancelText: 'Vazgeç',
      icon: 'question',
    });
    if (!ok) return;

    try {
      const res = await axiosClient.post(`/homework/${id}/toggle-archive`);
      const msg = res.data?.message ?? (currentStatus ? 'Ödev arşivden çıkarıldı.' : 'Ödev arşive kaldırıldı.');
      showToast('success', msg);
      fetchHomeworks();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'İşlem gerçekleştirilemedi.';
      showToast('error', msg);
    }
  };

  const descriptionSnippet = (text: string | undefined, max = 60) => {
    if (!text) return '—';
    const t = text.replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : t.slice(0, max) + '…';
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('tr-TR');
    } catch {
      return d;
    }
  };

  const formatDateTime = (d: string) => {
    try {
      return new Date(d).toLocaleString('tr-TR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return d;
    }
  };

  const getHomeworkOrderNo = (index: number) => {
    if (!pagination) return index + 1;
    const offset = (currentPage - 1) * pagination.per_page + index;
    return Math.max(1, pagination.total - offset);
  };

  if (loading && homeworks.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Ödev Yönetimi</h3>
          <p className="text-muted mb-0">
            {isManagerView
              ? 'Öğretmenlerin verdiği ödevleri kademe ve sınıfa göre görüntüleyin, analiz edin.'
              : 'Ödev oluşturun, öğrenci teslimlerini takip edin ve değerlendirin.'}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {!isViewerOnly && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/academic/homework/create')}
            >
              <i className="ti ti-plus me-1"></i> Yeni Ödev
            </button>
          )}
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item"><a href="/academic" className="text-decoration-none text-muted">Akademik</a></li>
              <li className="breadcrumb-item active fw-medium">Ödevler</li>
            </ol>
          </div>
        </div>
      </div>

      {isManagerView && (
        <>
          <form onSubmit={handleSearch} className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-3 text-dark">
                <i className="ti ti-filter me-2 text-primary"></i>Filtrele
              </h5>
              <div className="row g-3">
                {isCampusFilter && (
                  <div className="col-12 col-md-6 col-lg-3">
                    <label className="form-label">Kampüs</label>
                    <select
                      className="form-select"
                      value={campusId === '' ? '' : campusId}
                      onChange={(e) => {
                        setCampusId(e.target.value ? Number(e.target.value) : '');
                        setEducationLevelId('');
                        setClassroomId('');
                      }}
                    >
                      <option value="">Tümü</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label">Kademe</label>
                  <select
                    className="form-select"
                    value={educationLevelId === '' ? '' : educationLevelId}
                    onChange={(e) => {
                      setEducationLevelId(e.target.value ? Number(e.target.value) : '');
                      setClassroomId('');
                    }}
                  >
                    <option value="">Tümü</option>
                    {educationLevels.map((lev) => (
                      <option key={lev.id} value={lev.id}>
                        {lev.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label">Sınıf</label>
                  <select
                    className="form-select"
                    value={classroomId === '' ? '' : classroomId}
                    onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Tümü</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label">Öğrenci adı ile ara</label>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Öğrenci adı..."
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                      <i className="ti ti-search"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {stats && (
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="rounded-3 bg-primary bg-opacity-10 p-3 me-3">
                        <i className="ti ti-book fs-4 text-primary"></i>
                      </div>
                      <div>
                        <h4 className="mb-0 fw-bold">{stats.total_homeworks}</h4>
                        <small className="text-muted">Toplam Ödev</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="rounded-3 bg-info bg-opacity-10 p-3 me-3">
                        <i className="ti ti-send fs-4 text-info"></i>
                      </div>
                      <div>
                        <h4 className="mb-0 fw-bold">{stats.total_submissions}</h4>
                        <small className="text-muted">Teslim Edilen</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="rounded-3 bg-success bg-opacity-10 p-3 me-3">
                        <i className="ti ti-circle-check fs-4 text-success"></i>
                      </div>
                      <div>
                        <h4 className="mb-0 fw-bold">{stats.graded_count}</h4>
                        <small className="text-muted">Kontrol Edilen</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="rounded-3 bg-warning bg-opacity-10 p-3 me-3">
                        <i className="ti ti-clock fs-4 text-warning"></i>
                      </div>
                      <div>
                        <h4 className="mb-0 fw-bold">{stats.pending_graded}</h4>
                        <small className="text-muted">Not Bekleyen</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Öğretmen bazlı istatistikler ve analiz */}
          {stats && teacherStats.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header border-0 pt-4 pb-2">
                <h5 className="card-title fw-bold mb-1">
                  <i className="ti ti-chart-bar me-2 text-primary"></i>Öğretmen İstatistikleri
                </h5>
                <p className="text-muted mb-0">
                  Öğretmen seçerek sadece o öğretmenin ödevlerini listeleyebilir ve bireysel analizini görüntüleyebilirsiniz.
                </p>
              </div>
              <div className="card-body">
                <div className="row align-items-end mb-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Öğretmene göre analiz</label>
                    <select
                      className="form-select"
                      value={selectedTeacherId === '' ? '' : selectedTeacherId}
                      onChange={(e) => {
                        setSelectedTeacherId(e.target.value ? Number(e.target.value) : '');
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">Tüm öğretmenler</option>
                      {teacherStats
                        .filter((t) => t.teacher_id != null)
                        .map((t) => (
                          <option key={t.teacher_id} value={t.teacher_id!}>
                            {t.teacher_name} ({t.homework_count} ödev)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {selectedTeacherStat && (
                  <div className="alert alert-light border mb-3 mb-md-0">
                    <h6 className="alert-heading mb-2">
                      <i className="ti ti-user me-1"></i>
                      {selectedTeacherStat.teacher_name} – Özet
                    </h6>
                    <div className="row g-2 small">
                      <div className="col-4 col-md-2">
                        <strong>Verdiği ödev:</strong> {selectedTeacherStat.homework_count}
                      </div>
                      <div className="col-4 col-md-2">
                        <strong>Teslim edilen:</strong> {selectedTeacherStat.total_submissions}
                      </div>
                      <div className="col-4 col-md-2">
                        <strong>Kontrol edilen:</strong> {selectedTeacherStat.graded_count}
                      </div>
                      <div className="col-4 col-md-2">
                        <strong>Not bekleyen:</strong>{' '}
                        {selectedTeacherStat.total_submissions - selectedTeacherStat.graded_count}
                      </div>
                    </div>
                    <p className="mb-0 mt-2 small text-muted">
                      Aşağıdaki liste bu öğretmenin ödevleriyle filtrelenmiştir.
                    </p>
                  </div>
                )}
                <div className="table-responsive mt-3">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Öğretmen</th>
                        <th className="text-center">Verdiği ödev</th>
                        <th className="text-center">Teslim edilen</th>
                        <th className="text-center">Kontrol edilen</th>
                        <th className="text-center">Not bekleyen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherStats.map((t) => (
                        <tr
                          key={t.teacher_id ?? 'none'}
                          className={selectedTeacherId === t.teacher_id ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedTeacherId(t.teacher_id ?? '');
                            setCurrentPage(1);
                          }}
                        >
                          <td>
                            <strong>{t.teacher_name}</strong>
                          </td>
                          <td className="text-center">{t.homework_count}</td>
                          <td className="text-center">{t.total_submissions}</td>
                          <td className="text-center">{t.graded_count}</td>
                          <td className="text-center">
                            {t.total_submissions - t.graded_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sekmeler: Kontrol Bekleyenler ve Ödev Arşivi */}
      <ul className="nav nav-pills nav-card bg-light p-2 rounded-3 mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-3 ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'pending') {
                setActiveTab('pending');
                setCurrentPage(1);
              }
            }}
          >
            <i className="ti ti-clock me-1"></i> Kontrol Bekleyenler
            {stats && typeof stats.pending_homeworks_count === 'number' ? (
              <span className="badge bg-warning text-dark ms-2">{stats.pending_homeworks_count}</span>
            ) : (
              stats && typeof stats.pending_graded === 'number' && (
                <span className="badge bg-warning text-dark ms-2">{stats.pending_graded}</span>
              )
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded-3 ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'archived') {
                setActiveTab('archived');
                setCurrentPage(1);
              }
            }}
          >
            <i className="ti ti-archive me-1"></i> Ödev Arşivi (Kontrol Edilenler)
            {stats && typeof stats.archived_homeworks_count === 'number' ? (
              <span className="badge bg-success ms-2">{stats.archived_homeworks_count}</span>
            ) : (
              stats && typeof stats.graded_count === 'number' && (
                <span className="badge bg-success ms-2">{stats.graded_count}</span>
              )
            )}
          </button>
        </li>
      </ul>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Ödev / İçerik</th>
                  <th>Ders</th>
                  <th>Sınıf</th>
                  {isManagerView && <th>Veren Öğretmen</th>}
                  {isManagerView && <th>Veriliş</th>}
                  <th>Teslim Tarihi</th>
                  <th>Kontrol Durumu</th>
                  {isManagerView && (
                    <>
                      <th>Teslim / Toplam</th>
                      <th>Kontrol / Not</th>
                      <th>Son kontrol</th>
                    </>
                  )}
                  <th className="text-end pe-4">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {homeworks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isManagerView ? 11 : 6}
                      className="text-center py-5 text-muted"
                    >
                      {activeTab === 'pending' ? (
                        <div>
                          <i className="ti ti-circle-check fs-1 text-success d-block mb-2"></i>
                          <h6 className="fw-bold text-dark">Harika! Kontrol bekleyen ödev bulunmuyor.</h6>
                          <p className="mb-0 small text-muted">Tüm ödevlerin kontrolleri tamamlanmış veya filtreye uygun ödev yok.</p>
                        </div>
                      ) : (
                        <div>
                          <i className="ti ti-archive fs-1 text-muted d-block mb-2 opacity-50"></i>
                          <h6 className="fw-bold text-dark">Arşivde henüz ödev bulunmuyor.</h6>
                          <p className="mb-0 small text-muted">Kontrolü tamamlanan veya arşive kaldırılan ödevler burada listelenir.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  homeworks.map((hw, index) => {
                    const checked = hw.checked_assignments_count ?? hw.graded_count ?? 0;
                    const total = hw.total_students ?? hw.submissions_count ?? 0;

                    return (
                      <tr key={hw.id}>
                        <td className="ps-4">
                          <div className="fw-semibold d-flex align-items-center gap-2">
                            <span>{getHomeworkOrderNo(index)}. Ödev - {hw.title}</span>
                            {hw.is_checked && <span title="Kontrol yapıldı / Arşivde">✅</span>}
                          </div>
                          <small className="text-muted d-block" title={hw.description}>
                            {descriptionSnippet(hw.description)}
                          </small>
                        </td>
                        <td>
                          {hw.lesson?.name ?? hw.lesson_name ?? '—'}
                        </td>
                        <td>
                          {hw.classroom?.name ?? hw.classroom_name ?? '—'}
                        </td>
                        {isManagerView && (
                          <td>
                            {hw.teacher?.name ?? '—'}
                          </td>
                        )}
                        {isManagerView && (
                          <td>
                            <small>{formatDateTime(hw.created_at)}</small>
                          </td>
                        )}
                        <td>{formatDate(hw.due_date)}</td>
                        <td>
                          {hw.is_checked ? (
                            <span className="badge bg-soft-success text-success border border-success border-opacity-25 px-2 py-1">
                              <i className="ti ti-check me-1"></i> Arşivde
                            </span>
                          ) : checked === 0 ? (
                            <span className="badge bg-soft-secondary text-secondary border border-secondary border-opacity-25 px-2 py-1">
                              <i className="ti ti-clock me-1"></i> Kontrol Edilmedi
                            </span>
                          ) : total > 0 && checked < total ? (
                            <span
                              className="badge bg-soft-warning text-dark border border-warning border-opacity-50 px-2 py-1"
                              title={`${checked} öğrenci kontrol edildi, ${total - checked} öğrenci bekliyor`}
                            >
                              <i className="ti ti-alert-circle me-1 text-warning"></i>
                              {checked}/{total} Kontrol Edildi ({total - checked} Bekliyor)
                            </span>
                          ) : (
                            <span className="badge bg-soft-info text-info border border-info border-opacity-25 px-2 py-1">
                              <i className="ti ti-checks me-1"></i> Tüm Kontroller Tamam
                            </span>
                          )}
                        </td>
                        {isManagerView && (
                          <>
                            <td>
                              <span className="badge bg-soft-info text-info">
                                {hw.submissions_count ?? 0} teslim
                              </span>
                              {hw.classroom?.name && (
                                <small className="text-muted d-block">sınıf mevcuduna göre</small>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-soft-success text-success">
                                {hw.graded_count ?? 0} kontrol
                              </span>
                              {(hw.has_teacher_notes ?? false) && (
                                <small className="text-muted d-block">not girildi</small>
                              )}
                            </td>
                            <td>
                              {hw.last_graded_at ? (
                                <small>{formatDateTime(hw.last_graded_at)}</small>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="text-end pe-4">
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-soft-info"
                              onClick={() => navigate(`/academic/homework/${hw.id}/edit`)}
                              title="Düzenle"
                            >
                              <i className="ti ti-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-soft-success"
                              onClick={() => navigate(`/academic/homework/${hw.id}/control`)}
                              title="Kontrol Et"
                            >
                              <i className="ti ti-checklist"></i>
                            </button>
                            {hw.is_checked ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-soft-warning"
                                onClick={() => handleToggleArchive(hw.id, true)}
                                title="Arşivden Çıkar (Bekleyenlere Taşı)"
                              >
                                <i className="ti ti-arrow-back-up"></i>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-soft-secondary"
                                onClick={() => handleToggleArchive(hw.id, false)}
                                title="Arşive Kaldır"
                              >
                                <i className="ti ti-archive"></i>
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-soft-danger"
                              onClick={() => handleDelete(hw.id)}
                              title="Sil"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {pagination && pagination.last_page > 1 && (
          <div className="card-footer bg-transparent border-0 py-3">
            <nav>
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </button>
                </li>
                {[...Array(pagination.last_page)].map((_, i) => (
                  <li
                    key={i + 1}
                    className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pagination.last_page, p + 1))
                    }
                  >
                    Sonraki
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkList;
