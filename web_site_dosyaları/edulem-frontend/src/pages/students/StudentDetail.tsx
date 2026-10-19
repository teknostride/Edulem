import { useEffect, useMemo, useState, Fragment } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { getMyEducationLevelIds, getMyRole, isFounderOrOwner, roleNeedsEducationLevelScope } from '../../utils/userScope';
import ResetStudentPasswordModal from '../../components/students/ResetStudentPasswordModal';
import MeetingNoteModal from '../teachers/meetings/MeetingNoteModal';

interface Student {
  id: number;
  student_name: string;
  tc_no: string;
  school_no?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  address?: string;
  city_id?: number;
  district_id?: number;
  classroom_id?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  city?: {
    id: number;
    name: string;
  };
  district?: {
    id: number;
    name: string;
  };
  classroom?: {
    id: number;
    name: string;
    education_level?: {
      id: number;
      name: string;
    };
    branch?: {
      id: number;
      name: string;
      campus?: {
        id: number;
        name: string;
      };
    };
  };
  campus_name?: string;
  guardians?: Array<{
    id: number;
    name: string;
    relation_type?: string;
    phone: string;
    email?: string;
    is_emergency_contact?: boolean;
    is_legal_guardian?: boolean;
  }>;
}

const StudentDetail = ({ studentId }: { studentId: number }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [academicStats, setAcademicStats] = useState({
    attendance: { total_absent: 0, total_late: 0, total_present: 0, excused_days: 0 },
    homework: { total: 0, completed: 0, pending: 0, completion_rate: 0 },
    exams: { total: 0, average: 0 }
  });
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or YYYY-MM

  const myRole = useMemo(() => getMyRole(), []);
  const isFounder = useMemo(() => isFounderOrOwner(myRole), [myRole]);
  const myEducationLevelIds = useMemo(() => getMyEducationLevelIds(), []);
  const enforceEducationLevelScope = useMemo(
    () => roleNeedsEducationLevelScope(myRole) && myEducationLevelIds.length > 0,
    [myRole, myEducationLevelIds.length]
  );

  const lastAttendance = useMemo(() => {
    if (!attendances || attendances.length === 0) return null;
    return attendances[0];
  }, [attendances]);

  const groupedAttendances = useMemo(() => {
    const groups: Record<string, any[]> = {};
    attendances.forEach(att => {
      const dateKey = att.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(att);
    });

    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const items = groups[date].sort((a, b) => {
        const timeA = a.schedule?.start_time || '00:00';
        const timeB = b.schedule?.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });
      return { date, items };
    });
  }, [attendances]);

  const attendanceWeeks = useMemo(() => {
    const getWeekNumber = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const weeks: Record<number, { weekNo: number; dates: any[]; label: string }> = {};
    groupedAttendances.forEach(group => {
      const weekNo = getWeekNumber(group.date);
      if (!weeks[weekNo]) {
        // Find start and end of week (Monday to Sunday) for label
        const d = new Date(group.date);
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        weeks[weekNo] = { 
          weekNo, 
          dates: [], 
          label: `${monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}` 
        };
      }
      weeks[weekNo].dates.push(group);
    });
    return Object.values(weeks).sort((a, b) => b.weekNo - a.weekNo);
  }, [groupedAttendances]);

  const attendanceStats = useMemo(() => {
    if (activeTab === 'attendance') {
      let present = 0, absent = 0, late = 0, excused = 0;
      attendances.forEach(att => {
        if (att.status === 'present') present++;
        else if (att.status === 'absent') absent++;
        else if (att.status === 'late') late++;
        else if (att.status === 'excused' || att.status === 'sick') excused++;
      });
      return { total_present: present, total_absent: absent, total_late: late, excused_days: excused };
    }
    return academicStats.attendance;
  }, [attendances, academicStats.attendance, activeTab]);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  useEffect(() => {
    if (activeTab === 'academic' && studentId) {
      if (enforceEducationLevelScope && !student) return;
      fetchAcademicStats();
    }
    if (activeTab === 'attendance' && studentId) {
      fetchDetailedAttendances();
      fetchAcademicStats(selectedMonth); // Refresh stats for the selected month
    }
  }, [activeTab, studentId, enforceEducationLevelScope, student, selectedMonth]);

  const normalizeGender = (value: any): 'male' | 'female' | '' => {
    const raw = String(value ?? '').toLowerCase().trim();
    if (!raw) return '';
    const clean = raw
      .replace(/[\s\-_.]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

    if (['m', 'e', 'male', 'man', 'erkek', 'bay'].includes(clean)) return 'male';
    if (['f', 'k', 'female', 'woman', 'kiz', 'kadin', 'bayan'].includes(clean)) return 'female';
    return '';
  };

  const normalizeRelationType = (value: any): 'father' | 'mother' | 'guardian' | 'other' => {
    const raw = String(value ?? '').toLowerCase().trim();
    if (!raw) return 'other';
    const clean = raw
      .replace(/[\s\-_.]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

    if (['father', 'baba', 'dad'].includes(clean)) return 'father';
    if (['mother', 'anne', 'mom'].includes(clean)) return 'mother';
    if (['guardian', 'vasi', 'veli'].includes(clean)) return 'guardian';
    return 'other';
  };

  const fetchAcademicStats = async (monthKey?: string) => {
    try {
      setLoadingStats(true);
      let params = "";
      if (monthKey && monthKey !== 'all') {
        const [year, month] = monthKey.split('-').map(Number);
        const dateFrom = `${monthKey}-01`;
        const dateTo = new Date(year, month, 0).toISOString().split('T')[0];
        params = `?date_from=${dateFrom}&date_to=${dateTo}`;
      } else if (monthKey === 'all') {
        const d = new Date();
        const dateTo = d.toISOString().split('T')[0];
        d.setFullYear(d.getFullYear() - 1);
        const dateFrom = d.toISOString().split('T')[0];
        params = `?date_from=${dateFrom}&date_to=${dateTo}`;
      }

      const [attendanceRes, homeworkRes, gradesRes] = await Promise.all([
        axiosClient.get(`/attendances/statistics/student/${studentId}${params}`).catch(() => null),
        axiosClient.get(`/homework/student-performance/${studentId}${params}`).catch(() => null),
        axiosClient.get(`/students/${studentId}/omr-exams`).catch(() => null)
      ]);

      const attData = attendanceRes?.data?.data?.statistics;
      const gradesArray = gradesRes?.data?.data?.grades || [];
      setGrades(gradesArray);

      const hwStats = homeworkRes?.data?.data?.statistics || {};
      const stats = {
        attendance: attData ? {
          total_absent: attData.absent_days || 0,
          total_late: attData.late_days || 0,
          total_present: attData.present_days || 0,
          excused_days: (attData.excused_days || 0) + (attData.sick_days || 0)
        } : { total_absent: 0, total_late: 0, total_present: 0, excused_days: 0 },
        homework: {
          total: hwStats.total_homeworks || 0,
          completed: hwStats.submitted_count || 0,
          pending: hwStats.pending_count || 0,
          completion_rate: hwStats.submission_rate || 0
        },
        exams: {
          total: gradesArray.length,
          average: gradesArray.length > 0
            ? gradesArray.reduce((acc: number, g: any) => acc + (Number(g.grade) || 0), 0) / gradesArray.length
            : 0
        }
      };
      setAcademicStats(stats);
    } catch (error) {
      console.error("Akademik istatistikler yüklenemedi:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchDetailedAttendances = async () => {
    try {
      setLoadingAttendances(true);
      let dateFrom, dateTo;
      
      if (selectedMonth === 'all') {
        const d = new Date();
        dateTo = d.toISOString().split('T')[0];
        d.setFullYear(d.getFullYear() - 1);
        dateFrom = d.toISOString().split('T')[0];
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        dateFrom = `${selectedMonth}-01`;
        dateTo = new Date(year, month, 0).toISOString().split('T')[0];
      }
      
      const response = await axiosClient.get(`/attendances?student_id=${studentId}&date_from=${dateFrom}&date_to=${dateTo}&per_page=100`);
      setAttendances(response.data.data?.attendances || response.data.attendances || []);
      setLoadingAttendances(false);
    } catch (error) {
      console.error('Devamsızlık detayları yüklenemedi:', error);
      setLoadingAttendances(false);
    }
  };

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/${studentId}`);

      // Backend'den gelen veri formatı: { data: { student: {...} } }
      const studentData = response.data.data?.student || response.data.student || response.data.data || response.data;

      const levelId =
        studentData?.education_level_id ??
        studentData?.classroom?.education_level?.id ??
        null;

      if (enforceEducationLevelScope) {
        if (levelId == null || !myEducationLevelIds.includes(Number(levelId))) {
          setStudent(null);
          showToast('error', 'Bu öğrencinin bilgilerini görüntüleme yetkiniz yok.');
          setLoading(false);
          return;
        }
      }

      setStudent(studentData);
      setLoading(false);
    } catch (error: any) {
      console.error('Öğrenci bilgileri yüklenemedi:', error);
      const errorMessage = error.response?.data?.message || 'Öğrenci bilgileri yüklenemedi';
      showToast('error', errorMessage);
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!student) return;
    const actionText = student.is_active ? 'pasife almak' : 'aktife almak';
    const ok = await confirmDialog({
      text: `Bu öğrenciyi ${actionText} istediğinizden emin misiniz?`,
      confirmText: 'Evet',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.patch(`/students/${studentId}/toggle-active`);
      setStudent(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      showToast('success', 'Öğrenci durumu başarıyla güncellendi');
    } catch (error: any) {
      console.error("Öğrenci durumu güncellenemedi:", error);
      const errorMessage = error.response?.data?.message || 'Öğrenci durumu güncellenirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      text: 'Bu öğrenciyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/students/${studentId}`);
      showToast('success', 'Öğrenci başarıyla silindi!');
      window.location.href = '/students';
    } catch (error) {
      console.error('Öğrenci silinemedi:', error);
      showToast('error', 'Öğrenci silinirken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary"></div>
        <div className="mt-2">Öğrenci bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-5">
        <div className="alert alert-danger">Öğrenci bulunamadı!</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* BAŞLIK */}
      <div className="d-flex justify-content-between align-items-center my-3">
        <div>
          <h4 className="fw-bold m-0">Öğrenci Detayı</h4>
          <small className="text-muted">
            {student.student_name}
          </small>
        </div>
        <div>
          {!isFounder && (
            <button
              className="btn btn-primary me-2"
              onClick={() => setShowMeetingModal(true)}
            >
              <i className="ti ti-calendar-plus me-1"></i>
              Görüşme Ekle
            </button>
          )}
          <button
            className="btn btn-ghost-info me-2"
            onClick={() => setShowResetPasswordModal(true)}
          >
            <i className="ti ti-key me-2"></i>
            Şifre Sıfırla
          </button>
          <button
            className="btn btn-ghost-warning me-2"
            onClick={() => window.location.href = `/students/${studentId}/edit`}
          >
            <i className="ti ti-edit me-2"></i>
            Düzenle
          </button>
          <button
            className={`btn btn-ghost-${student.is_active ? 'secondary' : 'success'} me-2`}
            onClick={handleToggleStatus}
          >
            <i className={`ti ti-${student.is_active ? 'user-off' : 'user-check'} me-2`}></i>
            {student.is_active ? 'Pasife Al' : 'Aktife Al'}
          </button>
          <button
            className="btn btn-ghost-danger"
            onClick={handleDelete}
          >
            <i className="ti ti-trash me-2"></i>
            Sil
          </button>
        </div>
      </div>

      <div className="row">
        {/* SOL TARAF - ÖĞRENCİ BİLGİLERİ */}
        <div className="col-lg-4">
          {/* ÖĞRENCİ KARTI */}
          <div className="card">
            <div className="card-body text-center">
              <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
                <span className="avatar-title fs-2">
                  {(() => {
                    const nameParts = (student.student_name || '').split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    return (firstName.substring(0, 1) + (lastName ? lastName.substring(0, 1) : firstName.substring(1, 2) || '')).toUpperCase();
                  })()}
                </span>
              </div>
              <h5 className="card-title mb-1">
                {student.student_name}
              </h5>
              <p className="text-muted mb-2">
                {student.classroom?.name || '-'} - {student.classroom?.education_level?.name || '-'}
              </p>
              <span className={`badge ${student.is_active ? 'bg-soft-success text-success' : 'bg-soft-secondary text-secondary'}`}>
                {student.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div className="card-body pt-0">
              <div className="row text-center">
                <div className="col-4">
                  <h6 className="mb-0">
                    {(() => {
                      const g = normalizeGender(student.gender);
                      return g === 'male' ? 'Erkek' : g === 'female' ? 'Kız' : '-';
                    })()}
                  </h6>
                  <small className="text-muted">Cinsiyet</small>
                </div>
                <div className="col-4">
                  <h6 className="mb-0">
                    {student.birth_date ? new Date(student.birth_date).toLocaleDateString('tr-TR') : '-'}
                  </h6>
                  <small className="text-muted">Doğum Tarihi</small>
                </div>
                <div className="col-4">
                  <h6 className="mb-0">
                    {student.tc_no || '-'}
                  </h6>
                  <small className="text-muted">TCKN</small>
                </div>
              </div>
            </div>
          </div>

          {/* KURUMSAL BİLGİLER */}
          <div className="card mt-3">
            <div className="card-header">
              <h6 className="card-title mb-0">Kurumsal Bilgiler</h6>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <small className="text-muted">Kampüs</small>
                <div className="fw-bold">
                  {student.campus_name ||
                    student.classroom?.branch?.campus?.name ||
                    (student.classroom?.education_level as any)?.campus?.name ||
                    '-'}
                </div>
              </div>
              <div className="mb-2">
                <small className="text-muted">Kademe</small>
                <div className="fw-bold">{student.classroom?.education_level?.name || '-'}</div>
              </div>
              <div className="mb-2">
                <small className="text-muted">Sınıf</small>
                <div className="fw-bold">{student.classroom?.name || '-'}</div>
              </div>
              <div className="mb-2">
                <small className="text-muted">Okul No</small>
                <div className="fw-bold">{student.school_no || '-'}</div>
              </div>
              {student.created_at && (
                <div className="mb-2">
                  <small className="text-muted">Kayıt Tarihi</small>
                  <div className="fw-bold">{new Date(student.created_at).toLocaleDateString('tr-TR')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ TARAF - DETAYLI BİLGİLER */}
        <div className="col-lg-8">
          {/* SEKMELER */}
          <div className="card">
            <div className="card-header">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                  >
                    <i className="ti ti-user me-2"></i>
                    Kişisel Bilgiler
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'guardians' ? 'active' : ''}`}
                    onClick={() => setActiveTab('guardians')}
                  >
                    <i className="ti ti-users me-2"></i>
                    Veli Bilgileri
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'academic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('academic')}
                  >
                    <i className="ti ti-school me-2"></i>
                    Akademik
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                  >
                    <i className="ti ti-calendar-event me-2"></i>
                    Devamsızlık
                  </button>
                </li>

              </ul>
            </div>

            <div className="card-body">
              {/* KİŞİSEL BİLGİLER SEKMESİ */}
              {activeTab === 'info' && (
                <div>
                  <h6 className="mb-3">İletişim Bilgileri</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">Telefon</label>
                        <div className="fw-bold">
                          {student.phone || <span className="text-muted">Belirtilmemiş</span>}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">E-posta</label>
                        <div className="fw-bold">
                          {student.email || <span className="text-muted">Belirtilmemiş</span>}
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label text-muted">Adres</label>
                        <div className="fw-bold">
                          {student.address || <span className="text-muted">Belirtilmemiş</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VELİ BİLGİLERİ SEKMESİ */}
              {activeTab === 'guardians' && (
                <div>
                  <h6 className="mb-3">Veli/VELİLER</h6>
                  {(!student.guardians || student.guardians.length === 0) ? (
                    <div className="alert alert-info">Kayıtlı veli bulunamadı.</div>
                  ) : (
                    (() => {
                      const getRank = (v: any) => {
                        const raw = String(v ?? '').trim().toLowerCase();
                        if (['mother', 'mom', 'anne'].includes(raw)) return 1;
                        if (['father', 'dad', 'baba'].includes(raw)) return 2;
                        if (['legal_guardian', 'guardian', 'vasi'].includes(raw)) return 3;
                        return 4;
                      };
                      const sorted = [...(student.guardians || [])].sort((a, b) => {
                        return getRank(a.relation_type ?? (a as any).relationship) - getRank(b.relation_type ?? (b as any).relationship);
                      });

                      return sorted.map((guardian) => {
                        const rel = normalizeRelationType(guardian.relation_type ?? (guardian as any).relationship);
                        const badgeColor = rel === 'mother' ? 'bg-soft-danger text-danger' : rel === 'father' ? 'bg-soft-primary text-primary' : 'bg-soft-warning text-warning';
                        return (
                          <div key={guardian.id} className="border rounded p-3 mb-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{guardian.name}</h6>
                                <span className={`badge ${badgeColor} me-2`}>
                                  {rel === 'father' ? 'Baba' : rel === 'mother' ? 'Anne' : rel === 'guardian' ? 'Vasi' : 'Diğer'}
                                </span>
                                {guardian.is_legal_guardian && (
                                  <span className="badge bg-primary text-white me-2">
                                    <i className="ti ti-shield-check me-0.5"></i>Yasal Vasi
                                  </span>
                                )}
                                {guardian.is_emergency_contact && (
                                  <span className="badge bg-soft-danger text-danger">
                                    Acil Durum
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="row mt-2">
                              <div className="col-md-4">
                                <small className="text-muted">Telefon</small>
                                <div className="fw-bold">{guardian.phone}</div>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted">E-posta</small>
                                <div className="fw-bold">
                                  {guardian.email || <span className="text-muted">Belirtilmemiş</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              )}

              {/* AKADEMİK SEKMESİ */}
              {activeTab === 'academic' && (
                <div>
                  <h6 className="mb-3">Akademik Bilgiler</h6>
                  {loadingStats ? (
                    <div className="text-center p-3">
                      <div className="spinner-border spinner-border-sm text-primary"></div>
                      <div className="mt-2 small text-muted">Yükleniyor...</div>
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-md-6">
                        <div className="card text-center">
                          <div className="card-body">
                            <h4 className="text-warning mb-0">
                              {academicStats.homework.total || 0}
                            </h4>
                            <small className="text-muted">Verilen Ödevler</small>
                            <div className="mt-2 small">
                              <span className="text-success">{academicStats.homework.completed || 0} tamam</span>
                              <span className="mx-1">|</span>
                              <span className="text-danger">{academicStats.homework.pending || 0} bekleyen</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card text-center">
                          <div className="card-body">
                            <h4 className="text-info mb-0">
                              {academicStats.exams.total || 0}
                            </h4>
                            <small className="text-muted">Katıldığı Sınavlar</small>
                            <div className="mt-2 small">
                              <span className="text-primary">Ort: {academicStats.exams.average?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 mt-4">
                        <h6 className="mb-3">Sınav Geçmişi</h6>
                        {grades.length === 0 ? (
                          <div className="alert alert-light text-center small text-muted border">
                            Katıldığı herhangi bir sınav kaydı bulunamadı.
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered mt-2">
                              <thead className="table-light text-muted">
                                <tr>
                                  <th style={{ width: '40%' }}>Ders</th>
                                  <th>Tarih</th>
                                  <th className="text-end">Not / Puan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grades.map((g: any) => (
                                  <tr key={g.id}>
                                    <td>
                                      {(g.lesson_name || g.lesson?.name) || 'Belirtilmemiş'}
                                      {(g.exam_name) && <div className="small text-muted">{g.exam_name}</div>}
                                    </td>
                                    <td>{g.grade_date ? new Date(g.grade_date).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td className="text-end fw-bold">{g.grade}</td>
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
              )}

              {/* DEVAMSIZLIK DETAY SEKMESİ */}
              {activeTab === 'attendance' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center">
                      <h6 className="m-0 me-3">Devamsızlık Özeti ve Geçmişi</h6>
                      <select 
                        className="form-select form-select-sm w-auto" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      >
                        <option value="all">Tüm Zamanlar (Son 1 Yıl)</option>
                        {Array.from({ length: 12 }).map((_, i) => {
                          const d = new Date();
                          d.setMonth(d.getMonth() - i);
                          const val = d.toISOString().substring(0, 7);
                          const label = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                          return <option key={val} value={val}>{label}</option>
                        })}
                      </select>
                    </div>
                    {lastAttendance && (
                      <div className="d-flex align-items-center">
                        <small className="text-muted me-2">Son Durum:</small>
                        {(() => {
                          switch (lastAttendance.status) {
                            case 'present': return <span className="badge bg-success">Derste ({new Date(lastAttendance.date).toLocaleDateString('tr-TR')})</span>;
                            case 'absent': return <span className="badge bg-danger">Gelmedi ({new Date(lastAttendance.date).toLocaleDateString('tr-TR')})</span>;
                            case 'late': return <span className="badge bg-warning text-dark">Geç Geldi ({new Date(lastAttendance.date).toLocaleDateString('tr-TR')})</span>;
                            case 'excused': return <span className="badge bg-info text-white">İzinli ({new Date(lastAttendance.date).toLocaleDateString('tr-TR')})</span>;
                            case 'sick': return <span className="badge bg-info text-white">Raporlu ({new Date(lastAttendance.date).toLocaleDateString('tr-TR')})</span>;
                            default: return <span className="badge bg-secondary">{lastAttendance.status}</span>;
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <div className={`card shadow-none border-start border-start-lg border-${
                    !lastAttendance ? 'secondary' :
                    lastAttendance.date === new Date().toISOString().substring(0, 10) ? (
                      lastAttendance.status === 'present' ? 'success' :
                      lastAttendance.status === 'absent' ? 'danger' :
                      lastAttendance.status === 'late' ? 'warning' : 'info'
                    ) : 'secondary'
                  } bg-${
                    !lastAttendance ? 'secondary' :
                    lastAttendance.date === new Date().toISOString().substring(0, 10) ? (
                      lastAttendance.status === 'present' ? 'success' :
                      lastAttendance.status === 'absent' ? 'danger' :
                      lastAttendance.status === 'late' ? 'warning' : 'info'
                    ) : 'secondary'
                  } bg-opacity-10 mb-4`}>
                    <div className="card-body py-3">
                      <div className="row align-items-center">
                        <div className="col-auto">
                          <div className={`avatar-md bg-${
                            !lastAttendance ? 'secondary' :
                            lastAttendance.date === new Date().toISOString().substring(0, 10) ? (
                              lastAttendance.status === 'present' ? 'success' :
                              lastAttendance.status === 'absent' ? 'danger' :
                              lastAttendance.status === 'late' ? 'warning' : 'info'
                            ) : 'secondary'
                          } bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center`}>
                            <i className={`ti ti-${
                              !lastAttendance ? 'user-question' :
                              lastAttendance.date === new Date().toISOString().substring(0, 10) ? (
                                lastAttendance.status === 'present' ? 'user-check' :
                                lastAttendance.status === 'absent' ? 'user-x' :
                                lastAttendance.status === 'late' ? 'clock' : 'clipboard'
                              ) : 'calendar-time'
                            } fs-1`}></i>
                          </div>
                        </div>
                        <div className="col">
                          <h6 className="text-muted mb-1 text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>Öğrenci Anlık Durumu</h6>
                          <div className="d-flex align-items-baseline">
                            <h4 className="mb-0 fw-bold me-2">
                              {(() => {
                                if (!lastAttendance) return 'Veri Yok';
                                const isToday = lastAttendance.date === new Date().toISOString().substring(0, 10);
                                if (!isToday) return 'Bugün Kayıt Yok';
                                
                                switch (lastAttendance.status) {
                                  case 'present': return 'Şu An Derste';
                                  case 'absent': return 'Bugün Gelmedi';
                                  case 'late': return 'Bugün Geç Geldi';
                                  case 'excused': return 'İzinli (Bugün)';
                                  case 'sick': return 'Raporlu (Bugün)';
                                  default: return lastAttendance.status;
                                }
                              })()}
                            </h4>
                            <span className="text-muted small">
                              {lastAttendance ? (
                                lastAttendance.date === new Date().toISOString().substring(0, 10) 
                                ? `(${lastAttendance.schedule?.lesson || 'Ders'} yoklamasına göre)`
                                : `(Son kayıt: ${new Date(lastAttendance.date).toLocaleDateString('tr-TR')})`
                              ) : ''}
                            </span>
                          </div>
                        </div>
                        <div className="col-auto">
                          <span className={`badge bg-${
                            !lastAttendance ? 'secondary' :
                            lastAttendance.date === new Date().toISOString().substring(0, 10) ? (
                              lastAttendance.status === 'present' ? 'success' :
                              lastAttendance.status === 'absent' ? 'danger' :
                              lastAttendance.status === 'late' ? 'warning' : 'info'
                            ) : 'secondary'
                          } text-uppercase`}>
                            {lastAttendance ? (lastAttendance.date === new Date().toISOString().substring(0, 10) ? 'Güncel' : 'Geçmiş Kayıt') : 'Bilinmiyor'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row mb-4">
                    <div className="col-md-3">
                      <div className="card shadow-none border bg-light text-center h-100">
                        <div className="card-body p-3">
                          <h2 className="text-danger mb-0 fw-bold">{attendanceStats.total_absent}</h2>
                          <p className="text-muted small mb-0">Toplam Devamsızlık</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card shadow-none border bg-light text-center h-100">
                        <div className="card-body p-3">
                          <h2 className="text-success mb-0 fw-bold">{attendanceStats.total_present}</h2>
                          <p className="text-muted small mb-0">Toplam Mevcudiyet</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card shadow-none border bg-light text-center h-100">
                        <div className="card-body p-3">
                          <h2 className="text-warning mb-0 fw-bold">{attendanceStats.total_late}</h2>
                          <p className="text-muted small mb-0">Geç Kalma</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card shadow-none border bg-light text-center h-100">
                        <div className="card-body p-3">
                          <h2 className="text-info mb-0 fw-bold">{attendanceStats.excused_days}</h2>
                          <p className="text-muted small mb-0">İzinli / Raporlu</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {loadingAttendances ? (
                    <div className="text-center p-3">
                      <div className="spinner-border spinner-border-sm text-primary"></div>
                      <div className="mt-2 small text-muted">Yükleniyor...</div>
                    </div>
                  ) : attendances.length === 0 ? (
                    <div className="alert alert-info">Kayıtlı devamsızlık bulunamadı.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle text-center">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '120px' }}>Tarih</th>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <th key={i}>{i + 1}. Ders</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceWeeks.map((week) => (
                            <Fragment key={week.weekNo}>
                              <tr className="table-secondary">
                                <td colSpan={9} className="text-start fw-bold py-2 ps-3">
                                  <i className="ti ti-calendar-week me-2"></i>
                                  {week.weekNo}. Hafta ({week.label})
                                </td>
                              </tr>
                              {week.dates.map((group) => (
                                <tr key={group.date}>
                                  <td className="fw-bold">{new Date(group.date).toLocaleDateString('tr-TR')}</td>
                                  {Array.from({ length: 8 }).map((_, i) => {
                                    const att = group.items[i];
                                    if (!att) return <td key={i} className="bg-light-subtle">-</td>;
                                    
                                    return (
                                      <td key={i}>
                                        {(() => {
                                          switch (att.status) {
                                            case 'present': return <span className="text-success small fw-bold">Geldi</span>;
                                            case 'absent': return <span className="text-danger small fw-bold">Gelmedi</span>;
                                            case 'late': return <span className="text-warning small fw-bold">Geç</span>;
                                            case 'excused': return <span className="text-info small fw-bold">İzinli</span>;
                                            case 'sick': return <span className="text-info small fw-bold">Raporlu</span>;
                                            default: return <span className="text-muted small">{att.status}</span>;
                                          }
                                        })()}
                                        {att.schedule?.lesson && (
                                          <div style={{ fontSize: '10px' }} className="text-muted text-truncate" title={att.schedule.lesson}>
                                            {att.schedule.lesson}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}


            </div>
          </div>
        </div>
      </div>

      <ResetStudentPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        student={student}
      />

      {showMeetingModal && (
        <MeetingNoteModal
          show={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          onSaved={() => {
            showToast('success', 'Görüşme kaydı başarıyla oluşturuldu.');
          }}
          initialStudentId={student.id}
          initialClassroomId={student.classroom_id || student.classroom?.id}
          initialStudentName={student.student_name}
        />
      )}
    </div>
  );
};

export default StudentDetail;
