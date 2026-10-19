import { Fragment, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface ClassroomOption {
  id: number;
  name: string;
  education_level_id?: number | null;
  grade_level?: number | null;
}

interface CampusOption {
  id: number;
  name: string;
}

interface EducationLevelOption {
  id: number;
  name: string;
  campus_id?: number;
}

interface Guardian {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  relation_type?: string;
  is_legal_guardian?: boolean;
}

interface StudentRow {
  id: number;
  student_name: string;
  school_no?: string;
  phone?: string;
  email?: string;
  address?: string;
  classroom?: { id: number; name: string };
  guardians?: Guardian[];
  emergency_contact_info?: {
    name?: string;
    phone?: string;
    relation?: string;
  } | null;
}

const relationLabel = (relationType?: string) => {
  if (relationType === 'mother') return 'Anne';
  if (relationType === 'father') return 'Baba';
  if (relationType === 'guardian') return 'Vasi';
  return 'Yakın';
};

const GUIDANCE_ROLES = [
  'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', '6',
];

const isGuidanceRole = (): boolean => {
  try {
    const raw = localStorage.getItem('USER_ROLE') || '';
    if (GUIDANCE_ROLES.includes(raw)) return true;

    const userStr = localStorage.getItem('USER') || localStorage.getItem('user') || localStorage.getItem('USER_DATA');
    if (userStr) {
      const user = JSON.parse(userStr);
      const roleName = user.role || user.role_name || '';
      const roleId = user.role_id;
      if (GUIDANCE_ROLES.includes(String(roleName))) return true;
      if (roleId === 6 || String(roleId) === '6') return true;
    }
  } catch { }
  return false;
};

const TeacherStudentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | ''>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Guidance-specific state
  const guidanceMode = useMemo(() => isGuidanceRole(), []);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevelOption[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  // ---- DATA FETCHING (matches CounselingClientsPage patterns) ----

  const fetchCampuses = async () => {
    try {
      const res = await axiosClient.get('/campuses');
      const data = res.data?.data?.campuses ?? res.data?.data ?? [];
      const list: CampusOption[] = Array.isArray(data) ? data : [];
      setCampuses(list);

      // Auto-select if single campus
      if (list.length === 1) {
        setSelectedCampusId(String(list[0].id));
      }
    } catch {
      console.error('Kampüs listesi alınamadı');
    }
  };

  const fetchEducationLevels = async (campusId = '') => {
    try {
      const params = new URLSearchParams();
      if (campusId) params.set('campus_id', campusId);

      const res = await axiosClient.get(`/education-levels?${params.toString()}`);
      const data = res.data?.data?.education_levels ?? res.data?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setEducationLevels(list);
    } catch {
      console.error('Kademe listesi alınamadı');
    }
  };

  const fetchClassrooms = async (educationLevelId = '', campusId = '') => {
    try {
      const params = new URLSearchParams();
      params.set('per_page', '200');
      if (educationLevelId) params.set('education_level_id', educationLevelId);
      if (campusId) params.set('campus_id', campusId);

      const res = await axiosClient.get(`/classrooms?${params.toString()}`);
      const data = res.data?.data?.classrooms ?? [];
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a: any, b: any) => {
        const parse = (rawName: any) => {
          const name = String(rawName ?? '').trim();
          const m = name.match(/^(\d+)[\s\-\/.]*([A-Za-zÇĞİÖŞÜçğıöşü]?)\s*(.*)$/u);
          const grade = m ? Number(m[1]) : Number.NaN;
          const section = (m?.[2] ?? '').toString().toLocaleUpperCase('tr-TR');
          const rest = (m?.[3] ?? '').toString();
          return { name, grade, section, rest };
        };
        const pa = parse(a?.name);
        const pb = parse(b?.name);
        if (!Number.isNaN(pa.grade) && !Number.isNaN(pb.grade) && pa.grade !== pb.grade) return pa.grade - pb.grade;
        if (!Number.isNaN(pa.grade) !== !Number.isNaN(pb.grade)) return !Number.isNaN(pa.grade) ? -1 : 1;
        if (pa.section !== pb.section) return pa.section.localeCompare(pb.section, 'tr');
        return pa.name.localeCompare(pb.name, 'tr');
      });
      setClassrooms(sorted);
    } catch {
      console.error('Sınıf listesi alınamadı');
      setClassrooms([]);
    }
  };

  /** Fetch students for a specific classroom using existing teacher endpoint */
  const fetchClassroomStudents = async (classroomId: number) => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/teacher/classrooms/${classroomId}/students`);
      const data = response.data?.data ?? response.data;
      const list = Array.isArray(data?.students) ? data.students : [];
      setStudents(list as StudentRow[]);
    } catch (error) {
      console.error('Sınıf öğrencileri alınamadı:', error);
      showToast('error', 'Öğrenci listesi yüklenemedi');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  /** Fetch ALL students across multiple classrooms for guidance mode */
  const fetchAllStudentsForGuidance = async (classroomIds: number[]) => {
    if (classroomIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results: StudentRow[] = [];
      const batchSize = 10;
      for (let i = 0; i < classroomIds.length; i += batchSize) {
        const batch = classroomIds.slice(i, i + batchSize);
        const responses = await Promise.all(
          batch.map((id) =>
            axiosClient
              .get(`/students/teacher/classrooms/${id}/students`)
              .then((r) => {
                const data = r.data?.data ?? r.data;
                return Array.isArray(data?.students) ? data.students : [];
              })
              .catch(() => [])
          )
        );
        for (const list of responses) {
          results.push(...list);
        }
      }
      // Deduplicate by student id
      const unique = Array.from(new Map(results.map((s: StudentRow) => [s.id, s])).values());
      setStudents(unique);
    } catch (error) {
      console.error('Öğrenci listesi alınamadı:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // ---- INITIALIZATION ----

  useEffect(() => {
    if (guidanceMode) {
      fetchCampuses();
    } else {
      // Regular teacher: use teacher classrooms endpoint
      fetchTeacherClassrooms();
    }
  }, []);

  // Fetch classrooms for regular teacher only
  const fetchTeacherClassrooms = async () => {
    try {
      const response = await axiosClient.get('/students/teacher/classrooms');
      const data = response.data?.data ?? response.data;
      const list = Array.isArray(data?.classrooms) ? data.classrooms : [];
      const mapped = list
        .map((c: any) => ({ id: Number(c.id), name: String(c.name || '') }))
        .filter((c: ClassroomOption) => Number.isFinite(c.id) && !!c.name);

      setClassrooms(mapped);
      if (mapped.length > 0) {
        setSelectedClassroomId(mapped[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Öğretmen sınıf listesi alınamadı:', error);
      showToast('error', 'Sınıf listesi yüklenemedi');
      setClassrooms([]);
      setLoading(false);
    }
  };

  // ---- GUIDANCE FILTER EFFECTS ----

  // When campus changes → fetch education levels
  useEffect(() => {
    if (!guidanceMode) return;
    setSelectedLevelId('');
    setSelectedClassroomId('');
    setClassrooms([]);
    setStudents([]);
    setLoading(false);

    if (selectedCampusId) {
      fetchEducationLevels(selectedCampusId);
    } else {
      fetchEducationLevels();
    }
  }, [selectedCampusId]);

  // When education level changes → fetch classrooms
  useEffect(() => {
    if (!guidanceMode) return;
    setSelectedClassroomId('');
    setStudents([]);
    setCurrentPage(1);

    if (selectedLevelId || selectedCampusId) {
      fetchClassrooms(selectedLevelId, selectedCampusId);
    } else {
      setClassrooms([]);
      setLoading(false);
    }
  }, [selectedLevelId, selectedCampusId]);

  // When classroom list updates in guidance mode → auto-fetch students from all classrooms
  useEffect(() => {
    if (!guidanceMode) return;
    if (classrooms.length > 0 && !selectedClassroomId) {
      fetchAllStudentsForGuidance(classrooms.map((c) => c.id));
    }
  }, [classrooms]);

  // When specific classroom selected in guidance mode → fetch just that classroom
  useEffect(() => {
    if (!guidanceMode) return;
    if (selectedClassroomId) {
      fetchClassroomStudents(Number(selectedClassroomId));
    } else if (classrooms.length > 0) {
      fetchAllStudentsForGuidance(classrooms.map((c) => c.id));
    }
  }, [selectedClassroomId]);

  // ---- REGULAR TEACHER CLASSROOM EFFECT ----

  useEffect(() => {
    if (guidanceMode) return;
    if (!selectedClassroomId) {
      setStudents([]);
      setLoading(false);
      setExpandedStudentId(null);
      return;
    }
    setExpandedStudentId(null);
    setCurrentPage(1);
    fetchClassroomStudents(Number(selectedClassroomId));
  }, [selectedClassroomId]);

  // ---- COMPUTED VALUES ----

  const selectedClassroomName = useMemo(() => {
    if (!selectedClassroomId) return '-';
    return classrooms.find((c) => c.id === selectedClassroomId)?.name || '-';
  }, [classrooms, selectedClassroomId]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;

    return students.filter((s) => {
      const guardianText = (s.guardians || [])
        .map((g) => `${g.name || ''} ${g.phone || ''} ${g.email || ''}`.toLowerCase())
        .join(' ');

      return (
        (s.student_name || '').toLowerCase().includes(term) ||
        (s.school_no || '').toLowerCase().includes(term) ||
        (s.phone || '').toLowerCase().includes(term) ||
        (s.email || '').toLowerCase().includes(term) ||
        guardianText.includes(term)
      );
    });
  }, [students, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedStudents = useMemo(() => {
    if (itemsPerPage <= 0) return filteredStudents;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredStudents.length / itemsPerPage) : 1;

  // ---- RENDER ----

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="page-title mb-1">Öğrenciler</h4>
          <small className="text-muted">
            {guidanceMode
              ? 'Atandığınız kademelerdeki tüm öğrenciler görüntülenir. Kampüs, kademe ve sınıf filtrelerini kullanabilirsiniz.'
              : 'Sadece ders atamanız olan sınıflardaki öğrenciler görüntülenir.'}
          </small>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            {guidanceMode && (
              <>
                <div className="col-12 col-md-3">
                  <label className="form-label">Kampüs</label>
                  <select
                    className="form-select"
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                  >
                    <option value="">Tüm Kampüsler</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Kademe</label>
                  <select
                    className="form-select"
                    value={selectedLevelId}
                    onChange={(e) => setSelectedLevelId(e.target.value)}
                  >
                    <option value="">{selectedCampusId ? 'Tüm Kademeler' : 'Önce Kampüs Seçin'}</option>
                    {educationLevels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className={guidanceMode ? 'col-12 col-md-3' : 'col-12 col-md-4'}>
              <label className="form-label">Sınıf</label>
              <select
                className="form-select"
                value={selectedClassroomId === '' ? '' : selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">
                  {guidanceMode
                    ? (selectedLevelId || selectedCampusId ? 'Tüm Sınıflar' : 'Önce Kampüs ve Kademe Seçin')
                    : 'Sınıf seçin...'}
                </option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={guidanceMode ? 'col-12 col-md-3' : 'col-12 col-md-6'}>
              <label className="form-label">Ara</label>
              <input
                type="text"
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Öğrenci adı, okul no veya veli adı..."
              />
            </div>
            {!guidanceMode && (
              <div className="col-12 col-md-2 text-md-end">
                <span className="badge bg-soft-primary text-primary px-3 py-2">
                  {filteredStudents.length} öğrenci
                </span>
              </div>
            )}
          </div>
          {guidanceMode && (
            <div className="mt-2 text-end">
              <span className="badge bg-soft-primary text-primary px-3 py-2">
                {filteredStudents.length} öğrenci
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: '60px' }}>#</th>
                  <th>Öğrenci</th>
                  <th>Sınıf</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">Yükleniyor...</td>
                  </tr>
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">
                      {guidanceMode && !selectedCampusId
                        ? 'Lütfen soldaki filtrelerden kampüs ve kademe seçin.'
                        : 'Öğrenci bulunamadı.'}
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, index) => (
                    <Fragment key={student.id}>
                      <tr
                        onClick={() => setExpandedStudentId((prev) => (prev === student.id ? null : student.id))}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="ps-4 text-muted fw-medium">
                          {(itemsPerPage > 0 ? (currentPage - 1) * itemsPerPage : 0) + index + 1}
                        </td>
                        <td>
                          <div className="fw-semibold">{student.student_name}</div>
                          <small className="text-muted">Okul No: {student.school_no || '-'}</small>
                        </td>
                        <td>
                          <small>{student.classroom?.name || selectedClassroomName}</small>
                        </td>
                        <td>
                          <span className="text-primary small fw-medium">
                            {expandedStudentId === student.id ? 'Detayı Gizle' : 'Detayı Göster'}
                          </span>
                        </td>
                      </tr>

                      {expandedStudentId === student.id && (
                        <tr>
                          <td colSpan={4} className="ps-4 pe-4 pb-4 bg-light-subtle">
                            <div className="row g-3 pt-2">
                              <div className="col-12 col-lg-4">
                                <div className="border rounded p-3 bg-white h-100">
                                  <div className="fw-semibold mb-2">İletişim</div>
                                  <div className="small"><i className="ti ti-phone me-1"></i>{student.phone || '-'}</div>
                                  <div className="small"><i className="ti ti-mail me-1"></i>{student.email || '-'}</div>
                                  <div className="small"><i className="ti ti-map-pin me-1"></i>{student.address || '-'}</div>
                                </div>
                              </div>

                              <div className="col-12 col-lg-8">
                                <div className="border rounded p-3 bg-white h-100">
                                  <div className="fw-semibold mb-2">Veli Bilgileri</div>
                                  {student.guardians && student.guardians.length > 0 ? (
                                    <div className="d-flex flex-column gap-2">
                                      {student.guardians.map((g) => (
                                        <div key={g.id} className="small border rounded p-2">
                                          <div className="fw-semibold">{g.name}</div>
                                          <div className="text-muted">{relationLabel(g.relation_type)}{g.is_legal_guardian ? ' (Yasal Veli)' : ''}</div>
                                          <div><i className="ti ti-phone me-1"></i>{g.phone || '-'}</div>
                                          <div><i className="ti ti-mail me-1"></i>{g.email || '-'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <small className="text-muted">Kayıtlı veli yok</small>
                                  )}

                                  {(() => {
                                    const e = student.emergency_contact_info;
                                    const hasEmergency = !!(e && (e.name || e.phone || e.relation));
                                    if (!hasEmergency) return null;
                                    return (
                                      <div className="mt-3">
                                        <div className="fw-semibold mb-2">Acil Durum Kişisi</div>
                                        <div className="small border rounded p-2">
                                          <div className="fw-semibold">{e?.name || '-'}</div>
                                          <div className="text-muted">{e?.relation || '-'}</div>
                                          <div><i className="ti ti-phone me-1"></i>{e?.phone || '-'}</div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Göster:</span>
                <select
                  className="form-select form-select-sm w-auto"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>Hepsi</option>
                </select>
                <span className="text-muted small">
                  | Toplam {filteredStudents.length} kayıt
                </span>
              </div>

              {totalPages > 1 && (
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
                      Önceki
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                      return (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => setCurrentPage(page)}>
                            {page}
                          </button>
                        </li>
                      );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                      return <li key={page} className="page-item disabled"><span className="page-link">...</span></li>;
                    }
                    return null;
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>
                      Sonraki
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
