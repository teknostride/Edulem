import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

type AttendanceSummary = {
  came_days: number;
  absent_days: number;
  excused_or_reported_days: number;
};

type ProblemDay = {
  date: string;
  status: 'absent' | 'excused' | string;
  status_label: string;
};

const StudentAttendancePage = () => {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [problemDays, setProblemDays] = useState<ProblemDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/portal/student/attendance');
        setSummary(res.data?.data?.summary ?? null);
        setProblemDays(res.data?.data?.problem_days ?? []);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h4 className="page-title mb-1">Devamsızlık</h4>
        <p className="text-muted mb-0">Devam durumunun günlük özeti</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><h6 className="text-muted">Geldiği Gün</h6><h3 className="mb-0">{summary?.came_days ?? 0}</h3></div></div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><h6 className="text-muted">Gelmediği Gün</h6><h3 className="mb-0 text-danger">{summary?.absent_days ?? 0}</h3></div></div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><h6 className="text-muted">İzinli / Raporlu</h6><h3 className="mb-0 text-warning">{summary?.excused_or_reported_days ?? 0}</h3></div></div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent fw-bold">Gelmediği / İzinli Olduğu Günler</div>
        <div className="card-body p-0">
          {problemDays.length === 0 ? (
            <div className="p-4 text-muted">Bu dönem problemli devamsızlık kaydı bulunmuyor.</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tür</th>
                  </tr>
                </thead>
                <tbody>
                  {problemDays.map((item) => (
                    <tr key={`${item.date}-${item.status}`}>
                      <td>{new Date(item.date).toLocaleDateString('tr-TR')}</td>
                      <td>{item.status_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;
