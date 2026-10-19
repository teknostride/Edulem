import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Student {
  id: number;
  name: string;
  grade: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  avatar?: string;
}

interface Counselor {
  id: number;
  name: string;
  role: string;
  avatar?: string;
}

interface CounselingSession {
  id?: number;
  student_id: number;
  counselor_id: number;
  date: string;
  time: string;
  duration: number;
  type: 'individual' | 'group' | 'parent';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at?: string;
}

const CounselingSessionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [session, setSession] = useState<CounselingSession>({
    student_id: 0,
    counselor_id: 0,
    date: new Date().toISOString().slice(0, 16),
    time: '09:00',
    duration: 45,
    type: 'individual',
    status: 'scheduled',
    notes: '',
  });
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      const recognition = (window as any)._counselingRecognition;
      if (recognition) recognition.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('error', 'Tarayıcınız ses tanıma özelliğini desteklemiyor. (Chrome kullanın)');
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
        if (newText) {
          setSession(prev => ({ ...prev, notes: prev.notes + newText }));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      (window as any)._counselingRecognition = recognition;
      recognition.start();
    }
  };

  const sessionTypes = [
    { value: 'individual', label: 'Bireysel Görüşme' },
    { value: 'group', label: 'Grup Görüşmesi' },
    { value: 'parent', label: 'Veli Görüşmesi' },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Planlandı' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'cancelled', label: 'İptal Edildi' },
  ];

  const durationOptions = [
    { value: 30, label: '30 dakika' },
    { value: 45, label: '45 dakika' },
    { value: 60, label: '60 dakika' },
    { value: 90, label: '90 dakika' },
    { value: 120, label: '120 dakika' },
  ];

  useEffect(() => {
    fetchDropdownData();
    if (id) {
      fetchSession();
    }
  }, [id]);

  const fetchDropdownData = async () => {
    try {
      const [studentsRes, counselorsRes] = await Promise.all([
        axiosClient.get('/counseling/students'),
        axiosClient.get('/users?role=counselor'),
      ]);

      setStudents(studentsRes.data.data);
      setCounselors(counselorsRes.data.data);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Veriler yüklenemedi');
    }
  };

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/counseling/sessions/${id}`);
      setSession(response.data.data);
    } catch (error) {
      console.error('Görüşme yüklenemedi:', error);
      showToast('error', 'Görüşme yüklenemedi');
      navigate('/counseling');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session.student_id || !session.counselor_id || !session.date || !session.time) {
      showToast('error', 'Tüm alanları doldurun');
      return;
    }

    try {
      setSubmitting(true);

      if (id) {
        await axiosClient.put(`/counseling/sessions/${id}`, session);
        showToast('success', 'Görüşme başarıyla güncellendi');
      } else {
        await axiosClient.post('/counseling/sessions', session);
        showToast('success', 'Görüşme başarıyla oluşturuldu');
      }

      navigate('/counseling');
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', id ? 'Görüşme güncellenemedi' : 'Görüşme oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSession(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
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
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">
            {id ? 'Görüşme Düzenle' : 'Yeni Görüşme'}
          </h4>
          <small className="text-muted">
            {id ? 'Mevcut görüşmeyi düzenleyin' : 'Yeni görüşme oluşturun'}
          </small>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/counseling')}
        >
          <i className="ti ti-arrow-left me-1"></i>
          Geri Dön
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="student_id" className="form-label">Danışan *</label>
                  <select
                    className="form-select"
                    id="student_id"
                    name="student_id"
                    value={session.student_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Danışan seçin...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.class_name} - {student.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="counselor_id" className="form-label">Danışman *</label>
                  <select
                    className="form-select"
                    id="counselor_id"
                    name="counselor_id"
                    value={session.counselor_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Danışman seçin...</option>
                    {counselors.map((counselor) => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.name} ({counselor.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="date" className="form-label">Tarih *</label>
                      <input
                        type="date"
                        className="form-control"
                        id="date"
                        name="date"
                        value={session.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="time" className="form-label">Saat *</label>
                      <input
                        type="time"
                        className="form-control"
                        id="time"
                        name="time"
                        value={session.time}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="type" className="form-label">Görüşme Türü *</label>
                      <select
                        className="form-select"
                        id="type"
                        name="type"
                        value={session.type}
                        onChange={handleInputChange}
                        required
                      >
                        {sessionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="duration" className="form-label">Süre *</label>
                      <select
                        className="form-select"
                        id="duration"
                        name="duration"
                        value={session.duration}
                        onChange={handleInputChange}
                        required
                      >
                        {durationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Durum</label>
                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    value={session.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-12">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label htmlFor="notes" className="form-label mb-0">Görüşme Notları</label>
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
                    className="form-control"
                    id="notes"
                    name="notes"
                    value={session.notes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Görüşme hakkında notlar..."
                  />
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {id ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                  </>
                ) : (
                  <>
                    <i className="ti ti-device-floppy me-1"></i>
                    {id ? 'Güncelle' : 'Oluştur'}
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate('/counseling')}
                disabled={submitting}
              >
                <i className="ti ti-x me-1"></i>
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CounselingSessionForm;
