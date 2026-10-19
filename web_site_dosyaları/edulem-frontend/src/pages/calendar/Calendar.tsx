import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

// FullCalendar imports
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
    type: 'schedule' | 'event' | 'assignment' | 'appointment';
    classroom_id?: number;
    teacher_id?: number;
    subject?: string;
    category?: string;
    description?: string;
    location?: string;
  };
  className?: string;
}

const SchoolCalendar = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [userCalendarRes, schedulesRes] = await Promise.all([
        axiosClient.get('/calendar-events/user-calendar'),
        axiosClient.get('/schedules')
      ]);

      const data = userCalendarRes.data.data;
      const formattedEvents: CalendarEvent[] = [];

      // Add Events from calendar-events
      data.events.forEach((ev: any) => {
        formattedEvents.push({
          id: `ev-${ev.id}`,
          title: `[Etkinlik] ${ev.title}`,
          start: `${ev.event_date}T${ev.start_time}`,
          end: `${ev.event_date}T${ev.end_time}`,
          extendedProps: {
            type: 'event',
            description: ev.description,
            location: ev.location,
            category: 'bg-info text-white'
          },
          className: 'bg-info border-info text-white'
        });
      });

      // Add Assignments
      data.assignments.forEach((as: any) => {
        formattedEvents.push({
          id: `as-${as.id}`,
          title: `[Görev] ${as.title}`,
          start: as.start_date,
          end: as.end_date,
          extendedProps: {
            type: 'assignment',
            description: as.description,
            category: 'bg-warning text-dark'
          },
          className: 'bg-warning border-warning text-dark'
        });
      });

      // Add Appointments
      data.appointments.forEach((ap: any) => {
        formattedEvents.push({
          id: `ap-${ap.id}`,
          title: `[Randevu] ${ap.name || 'Misafir'}`,
          start: `${ap.appointment_date}T${ap.appointment_time}`,
          extendedProps: {
            type: 'appointment',
            description: ap.notes,
            category: 'bg-danger text-white'
          },
          className: 'bg-danger border-danger text-white'
        });
      });

      // Add regular schedules
      schedulesRes.data.data.forEach((sc: any) => {
        formattedEvents.push({
          id: `sc-${sc.id}`,
          title: `[Ders] ${sc.subject || 'Ders'}`,
          start: sc.start_time,
          end: sc.end_time,
          extendedProps: {
            type: 'schedule',
            subject: sc.subject,
            category: 'bg-primary text-white'
          },
          className: 'bg-primary border-primary text-white'
        });
      });

      if (calendarRef.current) {
        initializeCalendar(formattedEvents);
      }
    } catch (error) {
      console.error('Veriler yüklenemedi:', error);
      showToast('error', 'Takvim verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const initializeCalendar = (calendarEvents: CalendarEvent[]) => {
    if (!calendarRef.current) return;

    if (calendar) {
      calendar.destroy();
    }

    const calendarApi = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
      },
      initialView: 'dayGridMonth',
      locale: 'tr',
      themeSystem: 'bootstrap5',
      height: 'auto',
      events: calendarEvents,
      nowIndicator: true,
      eventClick: (info) => {
        setSelectedEvent(info.event);
        const modalElement = document.getElementById('event-detail-modal');
        if (modalElement && (window as any).bootstrap) {
          const modal = new (window as any).bootstrap.Modal(modalElement);
          modal.show();
        }
      }
    });

    calendarApi.render();
    setCalendar(calendarApi);
  };

  const syncData = async (type: 'staff' | 'apps') => {
    try {
      const endpoint = type === 'staff' ? '/calendar-events/sync-staff' : '/calendar-events/sync-appointments';
      await axiosClient.post(endpoint);
      showToast('success', 'Senkronizasyon başarılı');
      fetchCalendarData();
    } catch (error) {
      showToast('error', 'Senkronizasyon başarısız');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center justify-content-between mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Okul Ajandası</h4>
          <p className="text-muted mb-0">Tüm akademik ve sosyal etkinliklerin merkezi görünümü</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={() => syncData('staff')}>
            <i className="ti ti-refresh me-1"></i> Görevleri Eşitle
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => syncData('apps')}>
            <i className="ti ti-refresh me-1"></i> Randevuları Eşitle
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/communication/activities/create')}>
            <i className="ti ti-plus me-1"></i> Yeni Etkinlik
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div id="calendar" ref={calendarRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Detay Modalı */}
      <div className="modal fade" id="event-detail-modal" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold">{selectedEvent?.title}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <span className={`badge ${selectedEvent?.classNames?.[0]}`}>
                  {selectedEvent?.extendedProps?.type?.toUpperCase()}
                </span>
              </div>
              <div className="d-flex align-items-center mb-2">
                <i className="ti ti-calendar-event me-2 text-primary"></i>
                <span>{selectedEvent?.start?.toLocaleString('tr-TR')}</span>
                {selectedEvent?.end && (
                  <>
                    <span className="mx-2">-</span>
                    <span>{selectedEvent?.end?.toLocaleString('tr-TR')}</span>
                  </>
                )}
              </div>
              {selectedEvent?.extendedProps?.location && (
                <div className="d-flex align-items-center mb-2">
                  <i className="ti ti-map-pin me-2 text-danger"></i>
                  <span>{selectedEvent?.extendedProps?.location}</span>
                </div>
              )}
              <hr className="my-3 opacity-10" />
              <p className="text-muted mb-0">
                {selectedEvent?.extendedProps?.description || 'Açıklama bulunmuyor.'}
              </p>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">Kapat</button>
              <button type="button" className="btn btn-primary">Detaya Git</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolCalendar;
