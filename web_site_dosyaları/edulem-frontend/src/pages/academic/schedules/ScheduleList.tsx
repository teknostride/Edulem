import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

interface Schedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  classroom?: { id: number; name: string; code?: string };
  lesson?: { id: number; name: string; code?: string };
  teacher?: { id: number; name: string };
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const DAY_NAMES: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
  6: 'Cumartesi',
  7: 'Pazar',
};

const ScheduleList = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSchedules();
  }, [currentPage]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/schedules', {
        params: { page: currentPage, per_page: 15 },
      });
      const data = res.data.data || res.data;
      const arr = data.schedules ?? data ?? [];
      setSchedules(Array.isArray(arr) ? arr : []);
      if (data.pagination) setPagination(data.pagination);
    } catch (e: any) {
      console.error(e);
      showToast('error', e.response?.data?.message ?? 'Ders programları yüklenemedi.');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
          <div>
            <h3 className="fw-bold m-0 text-dark">Ders Programları</h3>
            <p className="text-muted mb-0">Haftalık ders programlarını ve sınıf atamalarını görüntüleyin.</p>
          </div>
          <div className="text-end d-none d-md-block ms-3">
            <ol className="breadcrumb m-0 py-0">
              <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
              <li className="breadcrumb-item"><a href="/academic/classrooms" className="text-decoration-none text-muted">Akademik</a></li>
              <li className="breadcrumb-item active fw-medium">Ders Programları</li>
            </ol>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover table-nowrap align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Gün</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Sınıf</th>
                    <th>Ders</th>
                    <th>Öğretmen</th>
                    <th>Salon</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        <div className="text-muted">
                          <i className="ti ti-calendar-off fs-48 mb-2 d-block" />
                          <p className="mb-0">Kayıt bulunamadı</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    schedules.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <span className="badge bg-primary-subtle text-primary">
                            {DAY_NAMES[s.day_of_week] ?? s.day_of_week}
                          </span>
                        </td>
                        <td>{s.start_time ?? '—'}</td>
                        <td>{s.end_time ?? '—'}</td>
                        <td>{s.classroom?.name ?? '—'}</td>
                        <td>{s.lesson?.name ?? '—'}</td>
                        <td>{s.teacher?.name ?? '—'}</td>
                        <td>{s.room ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.last_page > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Toplam {pagination.total} kayıt, Sayfa {pagination.current_page} /{' '}
                  {pagination.last_page}
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li
                      className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                      >
                        Önceki
                      </button>
                    </li>
                    <li
                      className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''
                        }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.last_page}
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
      </div>
    </div>
  );
};

export default ScheduleList;
