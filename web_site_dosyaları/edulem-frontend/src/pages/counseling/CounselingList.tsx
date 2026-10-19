import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import SeasonFilter from '../../components/shared/SeasonFilter';

interface Student {
  id: number;
  name: string;
  avatar: string;
  grade: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  issues: string[];
  last_session?: string;
  session_count: number;
  status: 'active' | 'inactive' | 'completed';
}

interface Session {
  id: number;
  student_id: number;
  student_name: string;
  counselor_id: number;
  counselor_name: string;
  date: string;
  time: string;
  duration: number;
  type: 'individual' | 'group' | 'parent';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
}

interface Note {
  id: number;
  student_id: number;
  student_name?: string;
  student?: { name: string };
  counselor_id: number;
  counselor_name?: string;
  counselor?: { name: string; first_name?: string; last_name?: string };
  title: string;
  content: string;
  tags: string[];
  is_private: boolean;
  created_at: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const CounselingList = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'sessions' | 'notes'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // SeasonFilter bileşenini import et (en üste ekledik sayılır ama use state yanına ekleyelim)
  // Aslında en üste eklemek daha doğru


  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'notes') {
      fetchNotes();
    }
  }, [activeTab, currentPage, statusFilter, searchTerm, seasonFilter]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(seasonFilter && { season_id: seasonFilter }),
      });

      const response = await axiosClient.get(`/counseling/students?${params}`);
      setStudents(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Danışanlar yüklenemedi:', error);
      showToast('error', 'Danışanlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(seasonFilter && { season_id: seasonFilter }),
      });

      const response = await axiosClient.get(`/counseling/sessions?${params}`);
      setSessions(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Görüşmeler yüklenemedi:', error);
      showToast('error', 'Görüşmeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(seasonFilter && { season_id: seasonFilter }),
      });

      const response = await axiosClient.get(`/counseling/notes?${params}`);
      setNotes(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Notlar yüklenemedi:', error);
      showToast('error', 'Notlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu notu silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/counseling/notes/${id}`);
      showToast('success', 'Not silindi');
      fetchNotes();
    } catch (error) {
      showToast('error', 'Not silinemedi');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'scheduled':
        return 'success';
      case 'inactive':
      case 'cancelled':
        return 'danger';
      case 'completed':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'completed': return 'Tamamlandı';
      case 'scheduled': return 'Planlandı';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'individual': return 'primary';
      case 'group': return 'info';
      case 'parent': return 'warning';
      default: return 'secondary';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'individual': return 'Bireysel';
      case 'group': return 'Grup';
      case 'parent': return 'Veli';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredStudents = students.filter(student => {
    if (statusFilter !== 'all' && student.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        student.name.toLowerCase().includes(searchLower) ||
        student.class_name.toLowerCase().includes(searchLower) ||
        student.parent_name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredSessions = sessions.filter(session => {
    if (statusFilter !== 'all' && session.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        session.student_name.toLowerCase().includes(searchLower) ||
        session.counselor_name.toLowerCase().includes(searchLower) ||
        session.notes.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Rehberlik Servisi</h3>
          <p className="text-muted mb-0">Danışanlar ve görüşme yönetimi</p>
        </div>
        <div className="text-end d-none d-md-block">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Ana Sayfa</Link></li>
            <li className="breadcrumb-item active text-dark fw-medium">Rehberlik Servisi</li>
          </ol>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-end mb-4">
        <div className="btn-group" role="group">
          <button
            className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('students')}
          >
            Danışanlar
          </button>
          <button
            className={`btn ${activeTab === 'sessions' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('sessions')}
          >
            Görüşmeler
          </button>
          <button
            className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('notes')}
          >
            Notlar
          </button>
        </div>
        <div className="ms-2">
          {activeTab === 'notes' && (
            <button className="btn btn-success" onClick={() => navigate('/counseling/notes/create')}>
              <i className="ti ti-plus me-1"></i> Yeni Not
            </button>
          )}
          {activeTab === 'sessions' && (
            <button className="btn btn-success" onClick={() => navigate('/counseling/sessions/create')}>
              <i className="ti ti-plus me-1"></i> Yeni Görüşme
            </button>
          )}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-users"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{students.length}</h5>
                  <p className="text-muted mb-0">Toplam Danışan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-success text-success rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-calendar"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{sessions.length}</h5>
                  <p className="text-muted mb-0">Toplam Görüşme</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-warning text-warning rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-user-check"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{students.filter(s => s.status === 'active').length}</h5>
                  <p className="text-muted mb-0">Aktif Danışan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-info text-info rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-clock"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{sessions.filter(s => s.status === 'scheduled').length}</h5>
                  <p className="text-muted mb-0">Planlanan Görüşme</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreleme */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder={`${activeTab === 'students' ? 'Danışan ara...' : 'Görüşme ara...'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <SeasonFilter 
                value={seasonFilter} 
                onChange={setSeasonFilter} 
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                {activeTab === 'students' ? (
                  <>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="completed">Tamamlandı</option>
                  </>
                ) : (
                  <>
                    <option value="scheduled">Planlandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Listeleme */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'students' ? (
                <div className="list-group list-group-flush">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted">
                        <i className="ti ti-users fs-1 d-block mb-2"></i>
                        Henüz danışan bulunmuyor
                      </div>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div key={student.id} className="list-group-item list-group-item-action">
                        <div className="d-flex align-items-center gap-3">
                          <div className="flex-shrink-0">
                            {student.avatar ? (
                              <img src={student.avatar} alt="Student" className="avatar-md rounded-circle" />
                            ) : (
                              <div className="avatar-md bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center">
                                <i className="ti ti-user fs-4"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{student.name}</h6>
                                <p className="text-muted mb-1">{student.class_name} • {student.grade}</p>
                                <small className="text-muted">
                                  Veli: {student.parent_name} • {student.parent_phone}
                                </small>
                              </div>
                              <div>
                                <span className={`badge bg-${getStatusColor(student.status)}`}>
                                  {getStatusText(student.status)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <small className="text-muted">
                                <i className="ti ti-calendar me-1"></i>
                                {student.session_count} görüşme
                                {student.last_session && ` • Son görüşme: ${formatDate(student.last_session)}`}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'sessions' ? (
                <div className="list-group list-group-flush">
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted">
                        <i className="ti ti-calendar fs-1 d-block mb-2"></i>
                        Henüz görüşme bulunmuyor
                      </div>
                    </div>
                  ) : (
                    filteredSessions.map((session) => (
                      <div key={session.id} className="list-group-item list-group-item-action">
                        <div className="d-flex align-items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className={`avatar-md bg-soft-${getTypeColor(session.type)} text-${getTypeColor(session.type)} rounded-circle d-flex align-items-center justify-content-center`}>
                              <i className="ti ti-calendar fs-4"></i>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{session.student_name}</h6>
                                <p className="text-muted mb-1">
                                  Danışman: {session.counselor_name}
                                </p>
                                <small className="text-muted">
                                  {formatDate(session.date)} • {session.time} • {session.duration} dakika
                                </small>
                              </div>
                              <div className="d-flex gap-1">
                                <span className={`badge bg-${getTypeColor(session.type)}`}>
                                  {getTypeText(session.type)}
                                </span>
                                <span className={`badge bg-${getStatusColor(session.status)}`}>
                                  {getStatusText(session.status)}
                                </span>
                              </div>
                            </div>
                            {session.notes && (
                              <div className="mt-2">
                                <small className="text-muted">
                                  <i className="ti ti-notes me-1"></i>
                                  {session.notes}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {notes.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted">
                        <i className="ti ti-notes fs-1 d-block mb-2"></i>
                        Henüz not bulunmuyor
                      </div>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="list-group-item list-group-item-action">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h6 className="mb-0">{note.title}</h6>
                              {note.is_private && <span className="badge bg-soft-warning text-warning"><i className="ti ti-lock me-1"></i>Gizli</span>}
                            </div>
                            <p className="text-muted mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                              {note.content.length > 200 ? `${note.content.substring(0, 200)}...` : note.content}
                            </p>
                            <div className="d-flex flex-wrap gap-1 mt-2 mb-2">
                              {note.tags?.map(tag => (
                                <span key={tag} className="badge bg-soft-info text-info small">{tag}</span>
                              ))}
                            </div>
                            <small className="text-muted">
                              <i className="ti ti-user me-1"></i>
                              {note.student?.name || note.student_name} •
                              <i className="ti ti-calendar me-1 ms-2"></i>
                              {new Date(note.created_at).toLocaleDateString('tr-TR')}
                            </small>
                          </div>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-soft-primary"
                              onClick={() => navigate(`/counseling/notes/${note.id}/edit`)}
                            >
                              <i className="ti ti-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-soft-danger"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sayfalama */}
              {pagination && pagination.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    Toplam {pagination.total} kayıt
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="ti ti-chevron-left"></i>
                        </button>
                      </li>
                      {[...Array(pagination.last_page)].map((_, index) => {
                        const page = index + 1;
                        return (
                          <li
                            key={page}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === pagination.last_page}
                        >
                          <i className="ti ti-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CounselingList;
