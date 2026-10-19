import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { getMyEducationLevelIds, isUnrestrictedRole, isTeacher } from '../../utils/userScope';

interface User {
  id: number;
  tc_no?: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  birth_date?: string;
  role_id?: number;
  role?: { id: number; name: string; display_name?: string; level?: number };
  campus_ids?: number[];
  education_level_ids?: number[];
  is_active: boolean;
  department?: string;
  teacher_type?: string;
  subjects?: (number | string)[];
  created_at?: string;
  can_edit?: boolean;
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
}

interface Lesson {
  id: number;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

interface EducationLevel {
  id: number;
  name: string;
  campus_id?: number;
}

interface Campus {
  id: number;
  name: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpenUserId, setMobileOpenUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedEducationLevelId, setSelectedEducationLevelId] = useState<string>('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(15);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: number | null; name: string }>({ show: false, id: null, name: '' });

  // Kademe dropdown: Founder/Owner hariç "Tümü" seçeneği gösterilmez
  const showEducationLevelAllOption = isUnrestrictedRole();
  const myEducationLevelIds = useMemo(() => getMyEducationLevelIds(), []);

  // Öğretmen kullanıcı listesine erişemez
  if (isTeacher()) {
    return (
      <div className="text-center p-5">
        <div className="alert alert-warning">
          <i className="ti ti-lock me-2"></i>
          Kullanıcı yönetim listesine erişim yetkiniz bulunmamaktadır.
        </div>
      </div>
    );
  }

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportScope, setExportScope] = useState<'all' | 'custom'>('all');
  const [exportColumns, setExportColumns] = useState<string[]>(['name', 'role_name', 'campus_name', 'education_level_name', 'email', 'phone', 'is_active']);
  const [selectedExportUserIds, setSelectedExportUserIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportUserSearch, setExportUserSearch] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, selectedRole, selectedCampusId, selectedEducationLevelId, perPage]);

  const fetchRoles = async () => {
    try {
      const res = await axiosClient.get('/roles');
      const raw = res.data?.data;
      const list = raw?.roles ?? (Array.isArray(raw) ? raw : raw?.data) ?? res.data?.roles ?? [];
      setRoles(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Roller yüklenemedi:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
        per_page: perPage.toString(),
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedRole) params.role = selectedRole;
      if (selectedCampusId) params.campus_id = selectedCampusId;
      if (selectedEducationLevelId) params.education_level_id = selectedEducationLevelId;

      const response = await axiosClient.get('/users?' + new URLSearchParams(params));
      const data = response.data?.data ?? response.data;
      const list = data?.users ?? (Array.isArray(data) ? data : []);
      setUsers(Array.isArray(list) ? list : []);
      setPagination(data?.pagination ?? null);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      showToast('error', 'Kullanıcılar yüklenemedi');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const openDeleteModal = (user: User) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || `#${user.id}`;
    setDeleteModal({ show: true, id: user.id, name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, id: null, name: '' });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await axiosClient.delete(`/users/${deleteModal.id}`);
      showToast('success', 'İşlem başarılı');
      closeDeleteModal();
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Kullanıcı silinemedi';
      showToast('error', msg);
    }
  };

  const activateUser = async (userId: number) => {
    try {
      await axiosClient.put(`/users/${userId}`, { is_active: true });
      showToast('success', 'Kullanıcı aktifleştirildi');
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Kullanıcı aktifleştirilemedi';
      showToast('error', msg);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const visibleSubjectIds = useMemo(() => {
    const ids = new Set<number>();
    users.forEach((u) => {
      (u.subjects || []).forEach((sid) => {
        const n = typeof sid === 'string' ? parseInt(sid, 10) : sid;
        if (Number.isFinite(n) && n > 0) ids.add(n);
      });
    });
    return Array.from(ids);
  }, [users]);

  useEffect(() => {
    if (visibleSubjectIds.length === 0) {
      setLessons([]);
      return;
    }

    let cancelled = false;
    const loadLessons = async () => {
      try {
        const response = await axiosClient.get('/lessons', {
          params: {
            ids: visibleSubjectIds,
            per_page: 200,
          },
        });
        const raw = response.data?.data;
        const list = raw?.lessons ?? (Array.isArray(raw) ? raw : raw?.data) ?? response.data?.lessons ?? [];
        if (!cancelled) {
          setLessons(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Dersler yüklenemedi:', e);
          setLessons([]);
        }
      }
    };

    loadLessons();
    return () => {
      cancelled = true;
    };
  }, [visibleSubjectIds]);

  const lessonNameMap = useMemo(() => {
    const map = new Map<number, string>();
    lessons.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [lessons]);

  const toUpperTr = (value: string) => {
    const v = (value ?? '').toString();
    return v ? v.toLocaleUpperCase('tr-TR') : '';
  };

  const visibleEducationLevelIds = useMemo(() => {
    const ids = new Set<number>();
    users.forEach((u) => {
      (u.education_level_ids || []).forEach((id) => {
        const n = typeof id === 'string' ? parseInt(id as any, 10) : (id as any);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      });
    });
    return Array.from(ids);
  }, [users]);

  useEffect(() => {
    if (visibleEducationLevelIds.length === 0) {
      setEducationLevels([]);
      return;
    }

    let cancelled = false;
    const loadEducationLevels = async () => {
      try {
        const response = await axiosClient.get('/education-levels', {
          params: {
            ids: visibleEducationLevelIds,
            per_page: 200,
          },
        });
        const raw = response.data?.data;
        const list = raw?.education_levels ?? response.data?.education_levels ?? raw?.data ?? [];
        if (!cancelled) {
          setEducationLevels(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Kademeler yüklenemedi:', e);
          setEducationLevels([]);
        }
      }
    };

    loadEducationLevels();
    return () => {
      cancelled = true;
    };
  }, [visibleEducationLevelIds]);

  const educationLevelNameMap = useMemo(() => {
    const map = new Map<number, string>();
    educationLevels.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [educationLevels]);

  const exportColumnOptions = useMemo(
    () => [
      { key: 'name', label: 'Ad Soyad' },
      { key: 'role_name', label: 'Rol' },
      { key: 'education_level_name', label: 'Kademe' },
      { key: 'campus_name', label: 'Kampüs' },
      { key: 'email', label: 'E-posta' },
      { key: 'phone', label: 'Telefon' },
      { key: 'birth_date', label: 'Doğum Tarihi' },
      { key: 'department', label: 'Departman' },
      { key: 'teacher_type', label: 'Personel Türü' },
      { key: 'is_active', label: 'Durum' },
      { key: 'created_at', label: 'Kayıt Tarihi' },
    ],
    []
  );

  const toggleExportColumn = (key: string, checked: boolean) => {
    setExportColumns((prev) => {
      if (checked) return Array.from(new Set([...prev, key]));
      return prev.filter((k) => k !== key);
    });
  };

  const startExport = async () => {
    if (exportColumns.length === 0) {
      showToast('error', 'En az 1 sütun seçmelisiniz');
      return;
    }
    if (exportScope === 'custom' && selectedExportUserIds.length === 0) {
      showToast('error', 'Özel seçim için en az 1 kullanıcı seçmelisiniz');
      return;
    }

    try {
      setExporting(true);
      const payload: any = {
        format: exportFormat,
        scope: exportScope === 'custom' ? 'users' : 'all',
        columns: exportColumns,
      };
      if (exportScope === 'custom') {
        payload.user_ids = selectedExportUserIds;
      }

      const response = await axiosClient.post('/users/export', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kullanicilar_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast('success', 'Dışa aktarma tamamlandı');
      setShowExportModal(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Dışa aktarma başarısız';
      showToast('error', msg);
    } finally {
      setExporting(false);
    }
  };

  const visiblePages = useMemo(() => {
    if (!pagination) return [] as number[];
    const total = pagination.last_page;
    const current = pagination.current_page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [pagination]);

  const getRoleName = (user: User) =>
    user.role?.name || user.role?.display_name || (user as any).role_name || '—';

  const getLessonName = (lessonId: number | string) => {
    const id = typeof lessonId === 'string' ? parseInt(lessonId) : lessonId;
    return toUpperTr(lessonNameMap.get(id) || '');  // ID gösterme, boş bırak
  };

  const visibleCampusIds = useMemo(() => {
    const ids = new Set<number>();
    users.forEach((u) => {
      (u.campus_ids || []).forEach((id) => {
        const n = typeof id === 'string' ? parseInt(id as any, 10) : (id as any);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      });
    });
    return Array.from(ids);
  }, [users]);

  useEffect(() => {
    if (visibleCampusIds.length === 0) {
      setCampuses([]);
      return;
    }

    let cancelled = false;
    const loadCampuses = async () => {
      try {
        const response = await axiosClient.get('/campuses', {
          params: {
            ids: visibleCampusIds,
            per_page: 200,
          },
        });
        const raw = response.data?.data;
        const list = raw?.campuses ?? response.data?.campuses ?? raw?.data ?? [];
        if (!cancelled) {
          setCampuses(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Kampüsler yüklenemedi:', e);
          setCampuses([]);
        }
      }
    };

    loadCampuses();
    return () => {
      cancelled = true;
    };
  }, [visibleCampusIds]);

  const campusNameMap = useMemo(() => {
    const map = new Map<number, string>();
    campuses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [campuses]);

  const getCampusNames = (ids: number[] | undefined) => {
    if (!ids || ids.length === 0) return [] as string[];
    return ids
      .map((id) => campusNameMap.get(id))
      .filter((n): n is string => Boolean(n));
  };

  const getEducationLevelNames = (ids: number[] | undefined) => {
    if (!ids || ids.length === 0) return [] as string[];
    return ids
      .map((id) => educationLevelNameMap.get(id))
      .filter((n): n is string => Boolean(n));
  };

  const getFullName = (user: User) =>
    (
      (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.email || '')
    ).toLocaleUpperCase('tr-TR');

  const getRowNumber = (idx: number) => {
    const per = pagination?.per_page ?? 15;
    const current = pagination?.current_page ?? currentPage;
    return (current - 1) * per + idx + 1;
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Kullanıcı Yönetimi</h3>
          <p className="text-muted mb-0">Sistem kullanıcılarını görüntüleyin ve yönetin.</p>
        </div>
        <div className="text-end d-none d-md-block">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><Link to="/settings" className="text-decoration-none text-muted">Ayarlar</Link></li>
            <li className="breadcrumb-item active fw-medium">Kullanıcılar</li>
          </ol>
        </div>
      </div>

      {/* Filtreler */}
      <div className="card mb-4">
        <div className="card-body user-filters">
          <form onSubmit={handleSearch} className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Ara</label>
              <div className="app-search">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ad, soyad veya TC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ti ti-search app-search-icon text-muted" />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Tüm roller</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.display_name || r.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Kampüs</label>
              <select
                className="form-select"
                value={selectedCampusId}
                onChange={(e) => {
                  setSelectedCampusId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Tümü</option>
                {campuses.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Kademe</label>
              <select
                className="form-select"
                value={selectedEducationLevelId}
                onChange={(e) => {
                  setSelectedEducationLevelId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {showEducationLevelAllOption && <option value="">Tümü</option>}
                {!showEducationLevelAllOption && myEducationLevelIds.length > 1 && (
                  <option value="">Tüm Yetkili Kademeler</option>
                )}
                {educationLevels.map((l) => (
                  <option key={l.id} value={String(l.id)}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-1">
              <button type="submit" className="btn btn-primary w-100">
                <i className="ti ti-search me-1" />
                Ara
              </button>
            </div>
            <div className="col-md-2 text-end">
              <div className="d-flex justify-content-end user-filters__actions" style={{ gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline-primary" onClick={() => setShowExportModal(true)}>
                  <i className="ti ti-download me-1" />
                  İndir
                </button>
                <Link to="/users/create" className="btn btn-success">
                  <i className="ti ti-plus me-1" />
                  Yeni Kullanıcı
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tablo */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
              <div className="mt-2 text-muted">Kullanıcılar yükleniyor...</div>
            </div>
          ) : (
            <>
              <div className="d-md-none mobile-card-list">
                {users.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-muted">
                      <i className="ti ti-users fs-1 d-block mb-2" />
                      {searchTerm || selectedRole || selectedCampusId || selectedEducationLevelId
                        ? 'Kayıt bulunamadı.'
                        : 'Henüz kullanıcı kaydı yok.'}
                    </div>
                    {!searchTerm && !selectedRole && (
                      <Link to="/users/create" className="btn btn-primary mt-2">
                        <i className="ti ti-plus me-1" />
                        İlk kullanıcıyı ekle
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {users.map((user, idx) => {
                      const open = mobileOpenUserId === user.id;
                      const campuses = getCampusNames(user.campus_ids);
                      const levels = getEducationLevelNames(user.education_level_ids);
                      const roleName = getRoleName(user);
                      const lessonsText = (user.subjects || [])
                        .map((sid) => getLessonName(sid))
                        .filter(Boolean)
                        .slice(0, 6)
                        .join(', ');

                      return (
                        <div key={user.id} className="card border">
                          <button
                            type="button"
                            className="card-body w-100 text-start p-3 border-0 bg-transparent"
                            onClick={() => setMobileOpenUserId((prev) => (prev === user.id ? null : user.id))}
                            aria-expanded={open}
                          >
                            <div className="d-flex align-items-start justify-content-between gap-2">
                              <div style={{ minWidth: 0 }}>
                                <div className="mobile-card-list__header">
                                  <div className="fw-semibold text-dark text-truncate">
                                    {getRowNumber(idx)}. {getFullName(user)}
                                  </div>
                                  <div className="mobile-card-list__role">
                                    <span className="badge bg-soft-secondary text-secondary">{roleName}</span>
                                  </div>
                                </div>

                                <div className="mobile-card-list__sub small text-muted mt-1">
                                  {levels.length > 0 ? levels.join(', ') : '—'}
                                  {campuses.length > 0 && (
                                    <>
                                      <span className="mx-1">•</span>
                                      <span>{campuses.join(', ')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-muted" style={{ flex: '0 0 auto' }}>
                                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}></i>
                              </div>
                            </div>
                          </button>

                          {open && (
                            <div className="card-body border-top p-3">
                              <div className="row g-2">
                                <div className="col-12">
                                  <div className="small text-muted">İletişim</div>
                                  <div className="small">
                                    <div><span className="text-muted">E-posta:</span> {user.email || '—'}</div>
                                    <div><span className="text-muted">Telefon:</span> {user.phone || '—'}</div>
                                  </div>
                                </div>

                                <div className="col-12">
                                  <div className="small text-muted">Kampüs</div>
                                  <div className="small">{campuses.length > 0 ? campuses.join(', ') : '—'}</div>
                                </div>

                                <div className="col-12">
                                  <div className="small text-muted">Kademe</div>
                                  <div className="small">{levels.length > 0 ? levels.join(', ') : '—'}</div>
                                </div>

                                <div className="col-12">
                                  <div className="small text-muted">Ders</div>
                                  <div className="small">{lessonsText || '—'}</div>
                                </div>

                                <div className="col-12">
                                  <div className="small text-muted">Durum</div>
                                  <div>
                                    <span className={`badge ${user.is_active ? 'bg-success' : 'bg-danger'}`}>
                                      {user.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="d-flex gap-2 mt-3">
                                <Link to={`/users/${user.id}`} className="btn btn-outline-primary">
                                  <i className="ti ti-eye me-1" />
                                  Detay
                                </Link>
                                {(user.can_edit ?? true) && (
                                  <Link to={`/users/${user.id}/edit`} className="btn btn-outline-warning">
                                    <i className="ti ti-edit me-1" />
                                    Düzenle
                                  </Link>
                                )}
                              </div>

                              {(user.can_edit ?? true) && (
                                <div className="d-flex gap-2 mt-2">
                                  {user.is_active ? (
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => openDeleteModal(user)}>
                                      <i className="ti ti-user-off me-1" />
                                      Pasife Al
                                    </button>
                                  ) : (
                                    <>
                                      <button type="button" className="btn btn-outline-success" onClick={() => activateUser(user.id)}>
                                        <i className="ti ti-user-check me-1" />
                                        Aktif Et
                                      </button>
                                      <button type="button" className="btn btn-outline-danger" onClick={() => openDeleteModal(user)}>
                                        <i className="ti ti-trash me-1" />
                                        Sil
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover table-nowrap mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>No</th>
                      <th>Kullanıcı</th>
                      <th>TC No</th>
                      <th>Kampüs</th>
                      <th>Telefon</th>
                      <th>Rol</th>
                      <th>Kademe</th>
                      <th>Ders</th>
                      <th>Durum</th>
                      <th className="text-end">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-4">
                          <div className="text-muted">
                            <i className="ti ti-users fs-1 d-block mb-2" />
                            {searchTerm || selectedRole || selectedCampusId || selectedEducationLevelId
                              ? 'Kayıt bulunamadı.'
                              : 'Henüz kullanıcı kaydı yok.'}
                          </div>
                          {!searchTerm && !selectedRole && (
                            <Link to="/users/create" className="btn btn-primary btn-sm mt-2">
                              <i className="ti ti-plus me-1" />
                              İlk kullanıcıyı ekle
                            </Link>
                          )}
                        </td>
                      </tr>
                    ) : (
                      users.map((user, idx) => (
                        <tr key={user.id} className={!user.is_active ? 'table-secondary' : ''} style={!user.is_active ? { opacity: 0.75 } : undefined}>
                          <td className="text-muted">
                            {getRowNumber(idx)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div>
                                <Link
                                  to={`/users/${user.id}`}
                                  className="fw-semibold text-dark text-decoration-none"
                                >
                                  {getFullName(user)}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-muted">{user.tc_no || '—'}</span>
                          </td>
                          <td>
                            {user.campus_ids && user.campus_ids.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {getCampusNames(user.campus_ids).slice(0, 2).map((n, i) => (
                                  <span key={i} className="badge bg-soft-success text-success" style={{ fontSize: '0.75rem' }}>{n}</span>
                                ))}
                                {getCampusNames(user.campus_ids).length > 2 && (
                                  <span className="badge bg-soft-secondary text-secondary" style={{ fontSize: '0.75rem' }}>+{getCampusNames(user.campus_ids).length - 2} daha</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className="text-muted">{user.phone || '—'}</span>
                          </td>
                          <td>
                            <span className="badge bg-soft-secondary text-secondary">
                              {getRoleName(user)}
                            </span>
                          </td>
                          <td>
                            {user.education_level_ids && user.education_level_ids.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {getEducationLevelNames(user.education_level_ids).slice(0, 3).map((n, i) => (
                                  <span key={i} className="badge bg-soft-info text-info" style={{ fontSize: '0.75rem' }}>{n}</span>
                                ))}
                                {getEducationLevelNames(user.education_level_ids).length > 3 && (
                                  <span className="badge bg-soft-secondary text-secondary" style={{ fontSize: '0.75rem' }}>+{getEducationLevelNames(user.education_level_ids).length - 3} daha</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex flex-column gap-1">
                              {user.subjects && user.subjects.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {user.subjects.slice(0, 3).map((lessonId, i) => (
                                    <span key={i} className="badge bg-soft-primary text-primary" style={{ fontSize: '0.75rem' }}>{getLessonName(lessonId)}</span>
                                  ))}
                                  {user.subjects.length > 3 && (
                                    <span className="badge bg-soft-secondary text-secondary" style={{ fontSize: '0.75rem' }}>+{user.subjects.length - 3} daha</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${user.is_active ? 'bg-success' : 'bg-danger'}`}>
                              {user.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <Link
                                to={`/users/${user.id}`}
                                className="btn btn-outline-primary"
                                title="Detay"
                              >
                                <i className="ti ti-eye" />
                              </Link>
                              {(user.can_edit ?? true) && (
                                <Link
                                  to={`/users/${user.id}/edit`}
                                  className="btn btn-outline-warning"
                                  title="Düzenle"
                                >
                                  <i className="ti ti-edit" />
                                </Link>
                              )}
                              {(user.can_edit ?? true) && (
                                user.is_active ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    title="Pasife Al"
                                    onClick={() => openDeleteModal(user)}
                                  >
                                    <i className="ti ti-user-off" />
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-outline-success"
                                      title="Aktif Et"
                                      onClick={() => activateUser(user.id)}
                                    >
                                      <i className="ti ti-user-check" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      title="Sil"
                                      onClick={() => openDeleteModal(user)}
                                    >
                                      <i className="ti ti-trash" />
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <div className="text-muted">
                      Toplam {pagination.total} kullanıcı (Sayfa {pagination.current_page}/{pagination.last_page})
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <div className="text-muted small">Sayfa Başına</div>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: '140px' }}
                        value={perPage}
                        onChange={(e) => {
                          const v = Number.parseInt(e.target.value, 10);
                          setPerPage(Number.isFinite(v) && v > 0 ? v : 15);
                          setCurrentPage(1);
                        }}
                      >
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={999}>Hepsi</option>
                      </select>
                    </div>
                  </div>
                  {pagination.last_page > 1 && (
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={pagination.current_page === 1}
                          >
                            Önceki
                          </button>
                        </li>
                        {visiblePages.map((page) => (
                          <li key={page} className={`page-item ${pagination.current_page === page ? 'active' : ''}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={pagination.current_page === pagination.last_page}
                          >
                            Sonraki
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Silme onay modalı - Kampüs/Sınıf sayfalarıyla aynı standart */}
      {deleteModal.show && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modal')) closeDeleteModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kullanıcı Sil</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal} aria-label="Kapat" />
              </div>
              <div className="modal-body">
                <div className="text-center">
                  <div className="avatar-lg bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
                    <i className="ti ti-user-off fs-1 text-danger" />
                  </div>
                  <p className="mb-0">
                    <strong>"{deleteModal.name}"</strong> kullanıcısını silmek istediğinize emin misiniz?
                  </p>
                  <p className="text-muted small mt-2 mb-0">Aktif kullanıcılar önce pasife alınır; pasif kullanıcılar kalıcı silinir.</p>
                </div>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteModal}>
                  İptal
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  <i className="ti ti-trash me-1" />
                  Devam Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !exporting && setShowExportModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kullanıcıları İndir</h5>
                <button type="button" className="btn-close" onClick={() => setShowExportModal(false)} disabled={exporting} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Format</label>
                    <select className="form-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} disabled={exporting}>
                      <option value="excel">Excel</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Kapsam</label>
                    <select
                      className="form-select"
                      value={exportScope}
                      onChange={(e) => {
                        const v = e.target.value as any;
                        setExportScope(v);
                        if (v === 'all') setSelectedExportUserIds([]);
                      }}
                      disabled={exporting}
                    >
                      <option value="all">Tüm Liste</option>
                      <option value="custom">Özel Seçim</option>
                    </select>
                  </div>
                </div>

                {exportScope === 'custom' && (
                  <div className="mt-3">
                    <label className="form-label">Kullanıcı Seç</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Kullanıcı ara (ad, soyad, e-posta)..."
                      value={exportUserSearch}
                      onChange={(e) => setExportUserSearch(e.target.value)}
                      disabled={exporting}
                    />
                    <div className="border rounded mt-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {users
                        .filter((u) => {
                          const q = exportUserSearch.trim().toLowerCase();
                          if (!q) return true;
                          const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                          return name.includes(q) || (u.email || '').toLowerCase().includes(q);
                        })
                        .map((u) => (
                          <label key={u.id} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom" style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedExportUserIds.includes(u.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedExportUserIds((prev) =>
                                  checked ? Array.from(new Set([...prev, u.id])) : prev.filter((id) => id !== u.id)
                                );
                              }}
                              disabled={exporting}
                            />
                            <span className="flex-grow-1">
                              <div className="fw-semibold">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}</div>
                              <div className="text-muted small">{u.email}</div>
                            </span>
                          </label>
                        ))}
                    </div>
                    <div className="text-muted small mt-1">Not: Özel seçim için bu sayfadaki kullanıcılar arasından seçim yapılır.</div>
                  </div>
                )}

                <div className="mt-3">
                  <label className="form-label">Sütunlar</label>
                  <div className="row">
                    {exportColumnOptions.map((col) => (
                      <div className="col-md-4" key={col.key}>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`userExportCol_${col.key}`}
                            checked={exportColumns.includes(col.key)}
                            onChange={(e) => toggleExportColumn(col.key, e.target.checked)}
                            disabled={exporting}
                          />
                          <label className="form-check-label" htmlFor={`userExportCol_${col.key}`}>{col.label}</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowExportModal(false)} disabled={exporting}>İptal</button>
                <button type="button" className="btn btn-primary" onClick={startExport} disabled={exporting}>
                  {exporting ? 'İndiriliyor...' : 'İndir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
