import { useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

interface ClassroomOption {
  id: number;
  name: string;
  education_level?: string | null;
}

interface StudentOption {
  id: number;
  name: string;
  school_no?: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AppointmentModal = ({ show, onClose, onSaved }: Props) => {
  const [meetingWith, setMeetingWith] = useState<'student' | 'parent'>('student');
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classroomId, setClassroomId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      setMeetingWith('student');
      setClassroomId('');
      setStudentId('');
      setMeetingDate(new Date().toISOString().split('T')[0]);
      setMeetingTime('');
      setDescription('');
      setStudents([]);
      setErrors({});
      fetchClassrooms();
    }
  }, [show]);

  useEffect(() => {
    if (classroomId) {
      setStudentId('');
      fetchStudents(Number(classroomId));
    } else {
      setStudents([]);
      setStudentId('');
    }
  }, [classroomId]);

  const fetchClassrooms = async () => {
    setLoadingClassrooms(true);
    console.log('%c[EDULEM APPOINTMENT DEBUG] 🔄 /teacher-meetings/classrooms isteği gönderiliyor...', 'color: #3b82f6; font-weight: bold;');
    try {
      const res = await axiosClient.get('/teacher-meetings/classrooms');
      console.log('%c[EDULEM APPOINTMENT DEBUG] ✅ Sunucu Yanıtı:', 'color: #10b981; font-weight: bold;', res.data);
      if (res.data?.data?.debug) {
        console.table(res.data.data.debug);
      }
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.classrooms) ? data.classrooms : [];
      console.log(`%c[EDULEM APPOINTMENT DEBUG] 📦 Yüklenen Sınıf Sayısı: ${list.length}`, 'color: #8b5cf6; font-weight: bold;', list);
      setClassrooms(list);
    } catch (err: any) {
      console.error('%c[EDULEM APPOINTMENT DEBUG] ❌ Sınıf Listesi Alınamadı!', 'color: #ef4444; font-weight: bold;', {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseData: err?.response?.data,
        error: err,
      });
      setClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const fetchStudents = async (cId: number) => {
    setLoadingStudents(true);
    try {
      const res = await axiosClient.get(`/teacher-meetings/classrooms/${cId}/students`);
      const data = res.data?.data ?? res.data;
      setStudents(Array.isArray(data?.students) ? data.students : []);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!classroomId) errs.classroomId = 'Sınıf seçimi zorunludur.';
    if (!studentId) errs.studentId = 'Öğrenci seçimi zorunludur.';
    if (!meetingDate) errs.meetingDate = 'Tarih zorunludur.';
    if (!meetingTime) errs.meetingTime = 'Saat zorunludur.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await axiosClient.post('/teacher-meetings', {
        type: 'appointment',
        meeting_with: meetingWith,
        classroom_id: Number(classroomId),
        student_id: Number(studentId),
        title: 'Randevu',
        content: description.trim() || null,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        visibility: 'admin_only',
      });
      showToast('success', 'Randevu oluşturuldu.');
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title">Yeni Randevu Oluştur</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Görüşme Kiminle Yapıldı? <span className="text-danger">*</span></label>
              <div className="d-flex gap-3 mt-1">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="appointment_meeting_with"
                    id="appointment-meeting-with-student"
                    checked={meetingWith === 'student'}
                    onChange={() => setMeetingWith('student')}
                  />
                  <label className="form-check-label" htmlFor="appointment-meeting-with-student">Öğrenci</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="appointment_meeting_with"
                    id="appointment-meeting-with-parent"
                    checked={meetingWith === 'parent'}
                    onChange={() => setMeetingWith('parent')}
                  />
                  <label className="form-check-label" htmlFor="appointment-meeting-with-parent">Veli</label>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Sınıf <span className="text-danger">*</span></label>
              <select
                className={`form-select ${errors.classroomId ? 'is-invalid' : ''}`}
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                disabled={loadingClassrooms}
              >
                <option value="">{loadingClassrooms ? 'Sınıflar yükleniyor...' : 'Sınıf seçin...'}</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.education_level ? `${c.education_level} - ${c.name}` : c.name}
                  </option>
                ))}
              </select>
              {errors.classroomId && <div className="invalid-feedback">{errors.classroomId}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Öğrenci <span className="text-danger">*</span></label>
              <select
                className={`form-select ${errors.studentId ? 'is-invalid' : ''}`}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={!classroomId || loadingStudents}
              >
                <option value="">
                  {!classroomId ? 'Önce sınıf seçin...' : loadingStudents ? 'Yükleniyor...' : 'Öğrenci seçin...'}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.school_no || '-'})
                  </option>
                ))}
              </select>
              {errors.studentId && <div className="invalid-feedback">{errors.studentId}</div>}
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Tarih <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className={`form-control ${errors.meetingDate ? 'is-invalid' : ''}`}
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
                {errors.meetingDate && <div className="invalid-feedback">{errors.meetingDate}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Saat <span className="text-danger">*</span></label>
                <input
                  type="time"
                  className={`form-control ${errors.meetingTime ? 'is-invalid' : ''}`}
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
                {errors.meetingTime && <div className="invalid-feedback">{errors.meetingTime}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Açıklama</label>
              <textarea
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Randevu açıklaması (opsiyonel)"
              />
            </div>
          </div>
          <div className="modal-footer border-top">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="button" className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
