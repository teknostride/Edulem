import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface Classroom {
  id: number;
  name: string;
  grade: string;
  capacity: number;
}

interface Lesson {
  id: number;
  name: string;
  code: string;
  credit: number;
  duration: number;
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface TimeSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  order: number;
}

interface Schedule {
  id?: number;
  classroom_id: number;
  lesson_id: number;
  teacher_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  time_slot_id: number;
  is_active: boolean;
}

const ScheduleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({
    classroom_id: 0,
    lesson_id: 0,
    teacher_id: 0,
    day_of_week: 'monday',
    start_time: '',
    end_time: '',
    time_slot_id: 0,
    is_active: true,
  });

  const daysOfWeek = [
    { value: 'monday', label: 'Pazartesi' },
    { value: 'tuesday', label: 'Salı' },
    { value: 'wednesday', label: 'Çarşamba' },
    { value: 'thursday', label: 'Perşembe' },
    { value: 'friday', label: 'Cuma' },
    { value: 'saturday', label: 'Cumartesi' },
    { value: 'sunday', label: 'Pazar' },
  ];

  useEffect(() => {
    fetchDropdownData();
    if (id) {
      fetchSchedule();
    }
  }, [id]);

  const fetchDropdownData = async () => {
    try {
      const [classroomsRes, lessonsRes, timeSlotsRes] = await Promise.all([
        axiosClient.get('/classrooms'),
        axiosClient.get('/lessons'),
        axiosClient.get('/time-slots?is_active=true'),
      ]);

      setClassrooms(classroomsRes.data.data);
      setLessons(lessonsRes.data.data);
      setTimeSlots(timeSlotsRes.data.data);
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Veriler yüklenemedi');
    }
  };

  // Dersin atanmış öğretmenlerini getir
  const fetchLessonTeachers = async (lessonId: number) => {
    if (!lessonId) {
      setTeachers([]);
      return;
    }
    try {
      const response = await axiosClient.get(`/lessons/${lessonId}/teachers`);
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Öğretmenler yüklenemedi:', error);
      showToast('warning', 'Bu ders için öğretmen bulunamadı');
      setTeachers([]);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/schedules/${id}`);
      setSchedule(response.data.data);
    } catch (error) {
      console.error('Ders programı yüklenemedi:', error);
      showToast('error', 'Ders programı yüklenemedi');
      navigate('/schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schedule.classroom_id || !schedule.lesson_id || !schedule.teacher_id || 
        !schedule.day_of_week || !schedule.start_time || !schedule.end_time || !schedule.time_slot_id) {
      showToast('error', 'Tüm alanları doldurun');
      return;
    }

    try {
      setSubmitting(true);
      
      if (id) {
        await axiosClient.post(`/schedules/${id}?_method=PUT`, schedule);
        showToast('success', 'Ders programı başarıyla güncellendi');
      } else {
        await axiosClient.post('/schedules', schedule);
        showToast('success', 'Ders programı başarıyla oluşturuldu');
      }
      
      navigate('/schedules');
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', id ? 'Ders programı güncellenemedi' : 'Ders programı oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Ders değiştiğinde öğretmen listesini güncelle
    if (name === 'lesson_id') {
      const lessonId = parseInt(value);
      setSchedule(prev => ({
        ...prev,
        lesson_id: lessonId,
        teacher_id: 0 // Öğretmeni sıfırla
      }));
      fetchLessonTeachers(lessonId);
      return;
    }
    
    setSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Düzenleme modunda mevcut dersin öğretmenlerini yükle
  useEffect(() => {
    if (schedule.lesson_id) {
      fetchLessonTeachers(schedule.lesson_id);
    }
  }, [schedule.lesson_id]);

  const handleTimeSlotChange = (timeSlotId: number) => {
    const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
    if (timeSlot) {
      setSchedule(prev => ({
        ...prev,
        time_slot_id: timeSlotId,
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
      }));
    }
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
            {id ? 'Ders Programı Düzenle' : 'Yeni Ders Programı'}
          </h4>
          <small className="text-muted">
            {id ? 'Mevcut ders programını düzenleyin' : 'Yeni ders programı oluşturun'}
          </small>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/schedules')}
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
                  <label htmlFor="classroom_id" className="form-label">Sınıf *</label>
                  <select
                    className="form-select"
                    id="classroom_id"
                    name="classroom_id"
                    value={schedule.classroom_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sınıf seçin...</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} ({classroom.grade} - {classroom.capacity} kişi)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="lesson_id" className="form-label">Ders *</label>
                  <select
                    className="form-select"
                    id="lesson_id"
                    name="lesson_id"
                    value={schedule.lesson_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Ders seçin...</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.name} ({lesson.code}) - {lesson.credit} kredi
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="teacher_id" className="form-label">Öğretmen *</label>
                  <select
                    className="form-select"
                    id="teacher_id"
                    name="teacher_id"
                    value={schedule.teacher_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Öğretmen seçin...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} ({teacher.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="day_of_week" className="form-label">Gün *</label>
                  <select
                    className="form-select"
                    id="day_of_week"
                    name="day_of_week"
                    value={schedule.day_of_week}
                    onChange={handleInputChange}
                    required
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="time_slot_id" className="form-label">Ders Saati *</label>
                  <select
                    className="form-select"
                    id="time_slot_id"
                    name="time_slot_id"
                    value={schedule.time_slot_id}
                    onChange={(e) => handleTimeSlotChange(parseInt(e.target.value))}
                    required
                  >
                    <option value="">Ders saati seçin...</option>
                    {timeSlots.map((timeSlot) => (
                      <option key={timeSlot.id} value={timeSlot.id}>
                        {timeSlot.name} ({timeSlot.start_time} - {timeSlot.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="start_time" className="form-label">Başlangıç Saati</label>
                      <input
                        type="time"
                        className="form-control"
                        id="start_time"
                        name="start_time"
                        value={schedule.start_time}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="end_time" className="form-label">Bitiş Saati</label>
                      <input
                        type="time"
                        className="form-control"
                        id="end_time"
                        name="end_time"
                        value={schedule.end_time}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={schedule.is_active}
                      onChange={(e) => setSchedule(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="is_active">
                      Aktif
                    </label>
                  </div>
                  <small className="text-muted">Ders programı yayınlanır</small>
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
                onClick={() => navigate('/schedules')}
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

export default ScheduleForm;
