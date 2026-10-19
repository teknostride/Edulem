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

interface MeetingRecord {
  id: number;
  title: string;
  content: string;
  meeting_date: string;
  meeting_with?: 'student' | 'parent';
  visibility: string;
  student?: { id: number; name: string; school_no?: string; classroom_id?: number } | null;
  classroom_label?: string | null;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  editRecord?: MeetingRecord | null;
  initialVisibility?: string;
  initialStudentId?: number;
  initialClassroomId?: number;
  initialStudentName?: string;
}

const VISIBILITY_OPTIONS = [
  { value: 'admin_only', label: 'Sadece Yöneticiye Özel' },
  { value: 'teachers_open', label: 'Öğretmenlere Açık' },
  { value: 'public', label: 'Herkese Açık' },
  { value: 'private', label: 'Sadece Ben' },
];

const MeetingNoteModal = ({
  show,
  onClose,
  onSaved,
  editRecord,
  initialVisibility,
  initialStudentId,
  initialClassroomId,
  initialStudentName,
}: Props) => {
  const [meetingWith, setMeetingWith] = useState<'student' | 'parent'>('student');
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [classroomId, setClassroomId] = useState<string>('');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [visibility, setVisibility] = useState('admin_only');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      const recognition = (window as any)._meetingRecognition;
      if (recognition) recognition.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('error', 'Tarayıcınız ses tanıma özelliğini destekmiyor. (Chrome kullanın)');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let newText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) newText += event.results[i][0].transcript + ' ';
        }
        if (newText) setContent(prev => prev + newText);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      (window as any)._meetingRecognition = recognition;
      recognition.start();
    }
  };

  useEffect(() => {
    if (show) {
      fetchClassrooms();

      if (editRecord) {
        setMeetingWith(editRecord.meeting_with || 'student');
        setStudentId(editRecord.student?.id?.toString() || '');
        setClassroomId(editRecord.student?.classroom_id ? String(editRecord.student.classroom_id) : '');
        setTitle(editRecord.title || '');
        setMeetingDate(editRecord.meeting_date || '');
        setVisibility(editRecord.visibility || 'admin_only');
        setContent(editRecord.content || '');
      } else {
        setMeetingWith('student');
        setTitle('');
        setMeetingDate(new Date().toISOString().split('T')[0]);
        setVisibility(initialVisibility || 'admin_only');
        setContent('');
        if (initialClassroomId) {
          setClassroomId(String(initialClassroomId));
        } else {
          setClassroomId('');
        }
        if (initialStudentId) {
          setStudentId(String(initialStudentId));
          if (initialStudentName) {
            setStudents([{ id: initialStudentId, name: initialStudentName }]);
          }
        } else {
          setStudentId('');
          setStudents([]);
        }
      }
      setErrors({});
    }
  }, [show, editRecord, initialClassroomId, initialStudentId, initialStudentName]);

  useEffect(() => {
    if (classroomId) {
      fetchStudents(Number(classroomId));
    } else {
      setStudents([]);
      setStudentId('');
    }
  }, [classroomId]);

  const fetchClassrooms = async () => {
    setLoadingClassrooms(true);
    console.log('%c[EDULEM DEBUG] 🔄 /teacher-meetings/classrooms isteği gönderiliyor...', 'color: #3b82f6; font-weight: bold;');
    try {
      const res = await axiosClient.get('/teacher-meetings/classrooms');
      console.log('%c[EDULEM DEBUG] ✅ Sunucu Yanıtı:', 'color: #10b981; font-weight: bold;', res.data);
      if (res.data?.data?.debug) {
        console.table(res.data.data.debug);
      }
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.classrooms) ? data.classrooms : [];
      console.log(`%c[EDULEM DEBUG] 📦 Yüklenen Sınıf Sayısı: ${list.length}`, 'color: #8b5cf6; font-weight: bold;', list);
      setClassrooms(list);
    } catch (err: any) {
      console.error('%c[EDULEM DEBUG] ❌ Sınıf Listesi Alınamadı!', 'color: #ef4444; font-weight: bold;', {
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
      const list = Array.isArray(data?.students) ? data.students : [];
      if (initialStudentId && initialStudentName && !list.some((s: any) => s.id === initialStudentId)) {
        setStudents([{ id: initialStudentId, name: initialStudentName }, ...list]);
      } else {
        setStudents(list);
      }

      if (editRecord?.student?.id && editRecord?.student?.classroom_id === cId) {
        setStudentId(String(editRecord.student.id));
      } else if (initialStudentId) {
        setStudentId(String(initialStudentId));
      }
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
    if (!title.trim()) errs.title = 'Başlık zorunludur.';
    if (!meetingDate) errs.meetingDate = 'Tarih zorunludur.';
    if (!content.trim()) errs.content = 'Not içeriği zorunludur.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        type: 'meeting',
        meeting_with: meetingWith,
        classroom_id: Number(classroomId),
        student_id: Number(studentId),
        title: title.trim(),
        content: content.trim(),
        meeting_date: meetingDate,
        visibility,
      };

      if (editRecord) {
        await axiosClient.put(`/teacher-meetings/${editRecord.id}`, payload);
        showToast('success', 'Kayıt güncellendi.');
      } else {
        await axiosClient.post('/teacher-meetings', payload);
        showToast('success', 'Kayıt oluşturuldu.');
      }
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
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title">
              {initialVisibility === 'private' 
                ? (editRecord ? 'Özel Notu Düzenle' : 'Yeni Özel Not Ekle')
                : (editRecord ? 'Notu Düzenle' : 'Yeni Not Ekle')
              }
            </h5>
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
                    name="meeting_with"
                    id="meeting-with-student"
                    checked={meetingWith === 'student'}
                    onChange={() => setMeetingWith('student')}
                  />
                  <label className="form-check-label" htmlFor="meeting-with-student">Öğrenci</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="meeting_with"
                    id="meeting-with-parent"
                    checked={meetingWith === 'parent'}
                    onChange={() => setMeetingWith('parent')}
                  />
                  <label className="form-check-label" htmlFor="meeting-with-parent">Veli</label>
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

            <div className="mb-3">
              <label className="form-label fw-semibold">Başlık <span className="text-danger">*</span></label>
              <input
                type="text"
                className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Görüşme başlığı"
              />
              {errors.title && <div className="invalid-feedback">{errors.title}</div>}
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Görüşme Tarihi <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className={`form-control ${errors.meetingDate ? 'is-invalid' : ''}`}
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
                {errors.meetingDate && <div className="invalid-feedback">{errors.meetingDate}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Görünürlük Seviyesi</label>
                <select
                  className="form-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-semibold mb-0">Not İçeriği <span className="text-danger">*</span></label>
                <button
                  type="button"
                  className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-outline-primary'}`}
                  onClick={toggleListening}
                  title={isListening ? 'Dinlemeyi Durdur' : 'Sesle Yazdır'}
                >
                  <i className={`ti ${isListening ? 'ti-microphone' : 'ti-microphone'} me-1`}></i>
                  {isListening ? 'Dinleniyor...' : 'Sesle Yazdır'}
                </button>
              </div>
              <textarea
                className={`form-control ${errors.content ? 'is-invalid' : ''}`}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Görüşme notlarınızı buraya yazın..."
              />
              {errors.content && <div className="invalid-feedback">{errors.content}</div>}
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

export default MeetingNoteModal;
