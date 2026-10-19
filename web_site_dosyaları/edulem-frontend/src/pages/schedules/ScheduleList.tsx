import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Schedule {
  id: number;
  classroom_id: number;
  classroom_name: string;
  lesson_id: number;
  lesson_name: string;
  teacher_id: number;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  time_slot_id: number;
  time_slot_name: string;
  is_active: boolean;
  created_at: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const toUpperTr = (value: string) => {
  const v = (value ?? '').toString();
  return v ? v.toLocaleUpperCase('tr-TR') : '';
};

const cmpTr = (a: string, b: string) => {
  return (a ?? '').toString().localeCompare((b ?? '').toString(), 'tr-TR', { sensitivity: 'base' });
};

const ScheduleList = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Dropdown verileri
  const [classrooms, setClassrooms] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (classroomFilter === 'all') {
      setSchedules([]);
      setPagination(null);
      setLoading(false);
      return;
    }
    fetchSchedules();
  }, [currentPage, searchTerm, dayFilter, classroomFilter]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
        ...(dayFilter !== 'all' && { day_of_week: dayFilter }),
        ...(classroomFilter !== 'all' && { classroom_id: classroomFilter }),
      });

      const response = await axiosClient.get(`/schedules?${params}`);
      const items = Array.isArray(response.data.data) ? response.data.data : [];
      const sorted = [...items].sort((x: Schedule, y: Schedule) => {
        const byLesson = cmpTr(x.lesson_name, y.lesson_name);
        if (byLesson !== 0) return byLesson;
        const byTeacher = cmpTr(x.teacher_name, y.teacher_name);
        if (byTeacher !== 0) return byTeacher;
        return (x.id ?? 0) - (y.id ?? 0);
      });
      setSchedules(sorted);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Ders programı yüklenemedi:', error);
      showToast('error', 'Ders programı yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const classroomsRes = await axiosClient.get('/classrooms');
      setClassrooms(classroomsRes.data.data);
    } catch (error) {
      console.error('Dropdown verileri yüklenemedi:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu ders programını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      const params = new URLSearchParams();
      params.append('_method', 'DELETE');
      await axiosClient.post(`/schedules/${id}`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      showToast('success', 'Ders programı başarıyla silindi');
      fetchSchedules();
    } catch (error) {
      console.error('Ders programı silinemedi:', error);
      showToast('error', 'Ders programı silinemedi');
    }
  };

  const getDayName = (day: string) => {
    const days: { [key: string]: string } = {
      'monday': 'Pazartesi',
      'tuesday': 'Salı',
      'wednesday': 'Çarşamba',
      'thursday': 'Perşembe',
      'friday': 'Cuma',
      'saturday': 'Cumartesi',
      'sunday': 'Pazar'
    };
    return days[day] || day;
  };

  const getTimeColor = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 10) return 'primary';
    if (hour < 12) return 'success';
    if (hour < 14) return 'warning';
    if (hour < 16) return 'info';
    return 'secondary';
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Ders Programı</h3>
          <p className="text-muted mb-0">Ders programlarını görüntüleyin ve yönetin.</p>
        </div>
        <Link to="/schedules/create" className="btn btn-primary">
          <i className="ti ti-plus me-1"></i>
          Yeni Ders Programı
        </Link>
      </div>

      {/* Filtreler */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Ders programı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
              >
                <option value="all">Tüm Günler</option>
                <option value="monday">Pazartesi</option>
                <option value="tuesday">Salı</option>
                <option value="wednesday">Çarşamba</option>
                <option value="thursday">Perşembe</option>
                <option value="friday">Cuma</option>
                <option value="saturday">Cumartesi</option>
                <option value="sunday">Pazar</option>
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={classroomFilter}
                onChange={(e) => setClassroomFilter(e.target.value)}
              >
                <option value="all">Tüm Sınıflar</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id.toString()}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setDayFilter('all');
                  setClassroomFilter('all');
                  setCurrentPage(1);
                }}
              >
                <i className="ti ti-refresh me-1"></i>
                Temizle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
            </div>
          ) : classroomFilter === 'all' ? (
            <div className="text-center py-5">
              <div className="text-muted">
                <i className="ti ti-school fs-1 d-block mb-2"></i>
                <p className="mb-0">Lütfen sınıf seçiniz</p>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Gün</th>
                      <th>Saat</th>
                      <th>Sınıf</th>
                      <th>Ders</th>
                      <th>Öğretmen</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">
                          <div className="text-muted">
                            <i className="ti ti-calendar fs-1 d-block mb-2"></i>
                            Henüz ders programı eklenmemiş
                          </div>
                        </td>
                      </tr>
                    ) : (
                      schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td>
                            <span className="badge bg-soft-primary text-primary">
                              {getDayName(schedule.day_of_week)}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <span className={`badge bg-soft-${getTimeColor(schedule.start_time)} text-${getTimeColor(schedule.start_time)}`}>
                                {schedule.start_time}
                              </span>
                              <span className="text-muted">-</span>
                              <span className={`badge bg-soft-${getTimeColor(schedule.end_time)} text-${getTimeColor(schedule.end_time)}`}>
                                {schedule.end_time}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-soft-info text-info">
                                {schedule.classroom_name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="fw-medium">{toUpperTr(schedule.lesson_name)}</div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="avatar-xs bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center">
                                {toUpperTr(schedule.teacher_name).charAt(0)}
                              </div>
                              <span>{toUpperTr(schedule.teacher_name)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link
                                to={`/schedules/${schedule.id}/edit`}
                                className="btn btn-outline-primary"
                              >
                                <i className="ti ti-pencil"></i>
                              </Link>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(schedule.id)}
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sayfalama */}
              {pagination && pagination.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    Toplam {pagination.total} ders programı
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

export default ScheduleList;
