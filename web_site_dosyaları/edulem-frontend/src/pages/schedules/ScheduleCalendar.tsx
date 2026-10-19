import { useState, useEffect, useRef } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

// FullCalendar import'ları
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    classroom_id?: number;
    teacher_id?: number;
    subject?: string;
    category?: string;
  };
  className?: string;
}

interface Classroom {
  id: number;
  name: string;
  code: string;
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
}

const ScheduleCalendar = () => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (calendarRef.current && !calendar) {
      initializeCalendar();
    }
  }, [calendarRef.current, classrooms, teachers]);

  const fetchInitialData = async () => {
    try {
      const [classroomsRes, teachersRes, schedulesRes] = await Promise.all([
        axiosClient.get('/classrooms'),
        axiosClient.get('/users?role=Öğretmen'),
        axiosClient.get('/schedules')
      ]);

      const classroomsData = Array.isArray(classroomsRes.data.data) ? classroomsRes.data.data : [];
      const teachersData = Array.isArray(teachersRes.data.data) ? teachersRes.data.data : [];
      const schedulesData = Array.isArray(schedulesRes.data.data) ? schedulesRes.data.data : [];

      setClassrooms(classroomsData);
      setTeachers(teachersData);

      if (calendarRef.current) {
        initializeCalendar(schedulesData);
      }
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Veriler yüklenemedi');
      
      // Hata durumunda mock verilerle devam et
      const mockClassrooms = [
        { id: 1, name: '9-A', code: '9A' },
        { id: 2, name: '9-B', code: '9B' },
        { id: 3, name: '10-A', code: '10A' },
        { id: 4, name: '10-B', code: '10B' }
      ];
      
      const mockTeachers = [
        { id: 1, first_name: 'Ahmet', last_name: 'Yılmaz' },
        { id: 2, first_name: 'Ayşe', last_name: 'Kaya' },
        { id: 3, first_name: 'Mehmet', last_name: 'Demir' }
      ];
      
      setClassrooms(mockClassrooms);
      setTeachers(mockTeachers);
      
      if (calendarRef.current) {
        initializeCalendar([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeCalendar = (events: any[] = []) => {
    if (!calendarRef.current) return;

    const calendarEvents: CalendarEvent[] = events.map(event => ({
      id: event.id.toString(),
      title: `${event.subject || 'Ders'} - ${getClassroomName(event.classroom_id)} - ${getTeacherName(event.teacher_id)}`,
      start: event.start_time,
      end: event.end_time,
      extendedProps: {
        classroom_id: event.classroom_id,
        teacher_id: event.teacher_id,
        subject: event.subject,
        category: event.category || 'bg-primary-subtle text-primary'
      },
      className: event.category || 'bg-primary-subtle text-primary'
    }));

    const calendarApi = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay'
      },
      initialView: 'timeGridWeek',
      locale: 'tr',
      themeSystem: 'bootstrap5',
      height: 'auto',
      events: calendarEvents,
      editable: true,
      droppable: true,
      selectable: true,
      selectMirror: true,
      nowIndicator: true,
      eventClick: handleEventClick,
      select: handleDateSelect,
      eventDrop: handleEventDrop,
      eventResize: handleEventResize,
      eventDidMount: function(info) {
        // Tooltip ekle
        void new (window as any).bootstrap.Tooltip(info.el, {
          title: `${info.event.title}`,
          placement: 'top',
          trigger: 'hover',
          container: 'body'
        });
      }
    });

    calendarApi.render();
    setCalendar(calendarApi);
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start?.toISOString() || '',
      end: event.end?.toISOString(),
      extendedProps: event.extendedProps,
      className: event.className
    });

    // Modal aç
    const modal = new (window as any).bootstrap.Modal(document.getElementById('event-modal')!);
    modal.show();
  };

  const handleDateSelect = (info: any) => {
    setSelectedEvent({
      id: '',
      title: '',
      start: info.startStr,
      end: info.endStr,
      extendedProps: {},
      className: 'bg-primary-subtle text-primary'
    });

    const modal = new (window as any).bootstrap.Modal(document.getElementById('event-modal')!);
    modal.show();
  };

  const handleEventDrop = async (info: any) => {
    try {
      await axiosClient.post(`/schedules/${info.event.id}?_method=PUT`, {
        start_time: info.event.start?.toISOString(),
        end_time: info.event.end?.toISOString()
      });
      showToast('success', 'Ders programı güncellendi');
    } catch (error) {
      info.revert();
      showToast('error', 'Ders programı güncellenemedi');
    }
  };

  const handleEventResize = async (info: any) => {
    try {
      await axiosClient.post(`/schedules/${info.event.id}?_method=PUT`, {
        start_time: info.event.start?.toISOString(),
        end_time: info.event.end?.toISOString()
      });
      showToast('success', 'Ders süresi güncellendi');
    } catch (error) {
      info.revert();
      showToast('error', 'Ders süresi güncellenemedi');
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const eventData = {
        title: formData.get('title') as string,
        subject: formData.get('title') as string,
        classroom_id: parseInt(formData.get('classroom_id') as string),
        teacher_id: parseInt(formData.get('teacher_id') as string),
        start_time: selectedEvent?.start,
        end_time: selectedEvent?.end,
        category: formData.get('category') as string
      };

      if (selectedEvent?.id) {
        await axiosClient.post(`/schedules/${selectedEvent.id}?_method=PUT`, eventData);
        showToast('success', 'Ders programı güncellendi');
      } else {
        await axiosClient.post('/schedules', eventData);
        showToast('success', 'Ders programı oluşturuldu');
      }

      const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('event-modal')!);
      modal?.hide();
      
      // Calendar'ı yenile
      fetchInitialData();
    } catch (error) {
      showToast('error', 'İşlem başarısız');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;

    try {
      const params = new URLSearchParams();
      params.append('_method', 'DELETE');
      await axiosClient.post(`/schedules/${selectedEvent.id}`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      showToast('success', 'Ders programı silindi');
      
      const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('event-modal')!);
      modal?.hide();
      
      fetchInitialData();
    } catch (error) {
      showToast('error', 'Ders programı silinemedi');
    }
  };

  const getClassroomName = (classroomId?: number) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom?.name || '';
  };

  const getTeacherName = (teacherId?: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : '';
  };

  const externalEvents = [
    { title: 'Matematik', category: 'bg-primary-subtle text-primary' },
    { title: 'Türkçe', category: 'bg-secondary-subtle text-secondary' },
    { title: 'Fen Bilimleri', category: 'bg-success-subtle text-success' },
    { title: 'Sosyal Bilgiler', category: 'bg-info-subtle text-info' },
    { title: 'İngilizce', category: 'bg-warning-subtle text-warning' },
    { title: 'Beden Eğitimi', category: 'bg-danger-subtle text-danger' },
    { title: 'Müzik', category: 'bg-dark-subtle text-dark' }
  ];

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Ders Programı</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item">
              <a href="javascript: void(0);">Pages</a>
            </li>
            <li className="breadcrumb-item">
              <a href="javascript: void(0);">Apps</a>
            </li>
            <li className="breadcrumb-item active">Ders Programı</li>
          </ol>
        </div>
      </div>

      <div className="d-flex gap-1">
        <div className="card d-none d-lg-flex rounded-end-0">
          <div className="card-body">
            <button className="btn btn-primary w-100 btn-new-event">
              <i className="ti ti-plus me-2 align-middle"></i>
              Yeni Ders Ekle
            </button>

            <div id="external-events">
              <p className="text-muted mt-2 fst-italic fs-xs mb-3">
                Dersi sürükleyip takvime bırakın veya takvime tıklayın
              </p>

              {externalEvents.map((event, index) => (
                <div
                  key={index}
                  className={`external-event fc-event ${event.category} fw-semibold`}
                  data-class={event.category}
                  style={{ cursor: 'pointer', marginBottom: '8px' }}
                >
                  <i className="ti ti-circle-filled me-2"></i>
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card rounded-start-0 flex-grow-1 border-start-0">
          <div className="d-lg-none d-inline-flex card-header">
            <button className="btn btn-primary btn-new-event">
              <i className="ti ti-plus me-2 align-middle"></i>
              Yeni Ders Ekle
            </button>
          </div>

          <div className="card-body">
            <div id="calendar" ref={calendarRef}></div>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit */}
      <div className="modal fade" id="event-modal" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSaveEvent} className="needs-validation">
              <div className="modal-header">
                <h4 className="modal-title">
                  {selectedEvent?.id ? 'Dersi Düzenle' : 'Yeni Ders'}
                </h4>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="event-title">Ders Adı</label>
                      <input
                        className="form-control"
                        placeholder="Ders adını girin"
                        type="text"
                        name="title"
                        id="event-title"
                        defaultValue={selectedEvent?.title}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="classroom_id">Sınıf</label>
                      <select
                        className="form-select"
                        name="classroom_id"
                        id="classroom_id"
                        defaultValue={selectedEvent?.extendedProps.classroom_id}
                        required
                      >
                        <option value="">Sınıf seçin</option>
                        {classrooms.map(classroom => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="teacher_id">Öğretmen</label>
                      <select
                        className="form-select"
                        name="teacher_id"
                        id="teacher_id"
                        defaultValue={selectedEvent?.extendedProps.teacher_id}
                        required
                      >
                        <option value="">Öğretmen seçin</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="event-category">Kategori</label>
                      <select
                        className="form-select"
                        name="category"
                        id="event-category"
                        defaultValue={selectedEvent?.extendedProps.category}
                        required
                      >
                        <option value="bg-primary-subtle text-primary">Matematik</option>
                        <option value="bg-secondary-subtle text-secondary">Türkçe</option>
                        <option value="bg-success-subtle text-success">Fen Bilimleri</option>
                        <option value="bg-info-subtle text-info">Sosyal Bilgiler</option>
                        <option value="bg-warning-subtle text-warning">İngilizce</option>
                        <option value="bg-danger-subtle text-danger">Beden Eğitimi</option>
                        <option value="bg-dark-subtle text-dark">Müzik</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {selectedEvent?.id && (
                  <button type="button" className="btn btn-danger" onClick={handleDeleteEvent}>
                    Sil
                  </button>
                )}
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">
                  Kapat
                </button>
                <button type="submit" className="btn btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
