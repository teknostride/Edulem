import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../../api/axiosClient';
import { confirmDialog, showToast } from '../../../utils/toast';
import MeetingNoteModal from './MeetingNoteModal';
import MeetingDetailModal from './MeetingDetailModal';
import AppointmentModal from './AppointmentModal';

/* ---------- types ---------- */
interface MeetingRecord {
  id: number;
  type: string;
  meeting_with?: 'student' | 'parent';
  title: string;
  content: string;
  meeting_date: string;
  meeting_time?: string | null;
  visibility: string;
  status: string;
  student?: { id: number; name: string; school_no?: string; classroom_id?: number } | null;
  classroom_label?: string | null;
}

/* ---------- constants ---------- */
const VISIBILITY_BADGE: Record<string, { label: string; color: string }> = {
  admin_only: { label: 'Sadece Yöneticiye Özel', color: 'warning' },
  teachers_open: { label: 'Öğretmenlere Açık', color: 'info' },
  public: { label: 'Herkese Açık', color: 'success' },
  private: { label: 'Sadece Ben', color: 'secondary' },
};

type MainTab = 'meetings' | 'notes' | 'appointments';
type AppointmentSub = 'today' | 'upcoming' | 'past';
type MeetingTypeSub = 'all' | 'student' | 'parent';

/* ================================================================ */
const TeacherMeetingsPage = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('meetings');
  const [meetingTypeSub, setMeetingTypeSub] = useState<MeetingTypeSub>('all');

  // data
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [privateNotes, setPrivateNotes] = useState<MeetingRecord[]>([]);
  const [appointments, setAppointments] = useState<MeetingRecord[]>([]);

  // loading
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // appointment sub-tab
  const [appointmentSub, setAppointmentSub] = useState<AppointmentSub>('today');

  // modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editRecord, setEditRecord] = useState<MeetingRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MeetingRecord | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  /* ---------- fetchers ---------- */
  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const res = await axiosClient.get('/teacher-meetings/meetings');
      const data = res.data?.data ?? res.data;
      setMeetings(Array.isArray(data?.meetings) ? data.meetings : []);
    } catch {
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  const fetchPrivateNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const res = await axiosClient.get('/teacher-meetings/private-notes');
      const data = res.data?.data ?? res.data;
      setPrivateNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch {
      setPrivateNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const fetchAppointments = useCallback(async (filter: AppointmentSub) => {
    setLoadingAppointments(true);
    try {
      const res = await axiosClient.get(`/teacher-meetings/appointments?filter=${filter}`);
      const data = res.data?.data ?? res.data;
      setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  /* ---------- effects ---------- */
  useEffect(() => {
    if (activeTab === 'meetings') fetchMeetings();
    else if (activeTab === 'notes') fetchPrivateNotes();
    else if (activeTab === 'appointments') fetchAppointments(appointmentSub);
  }, [activeTab, fetchMeetings, fetchPrivateNotes, fetchAppointments, appointmentSub]);

  /* ---------- handlers ---------- */
  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu kaydı silmek istediğinize emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;
    try {
      await axiosClient.delete(`/teacher-meetings/${id}`);
      showToast('success', 'Kayıt silindi.');
      if (activeTab === 'meetings') fetchMeetings();
      else if (activeTab === 'notes') fetchPrivateNotes();
      else fetchAppointments(appointmentSub);
    } catch {
      showToast('error', 'Silme işlemi başarısız.');
    }
  };

  const handleNoteSaved = () => {
    if (activeTab === 'meetings') fetchMeetings();
    else fetchPrivateNotes();
  };

  const handleAppointmentSaved = () => {
    fetchAppointments(appointmentSub);
  };

  const openEdit = (rec: MeetingRecord) => {
    setEditRecord(rec);
    setShowNoteModal(true);
  };

  const openDetail = (rec: MeetingRecord) => {
    setDetailRecord(rec);
    setShowDetailModal(true);
  };

  const openNewNote = () => {
    setEditRecord(null);
    setShowNoteModal(true);
  };

  /* ---------- render helpers ---------- */
  const renderVisibilityBadge = (v: string) => {
    const info = VISIBILITY_BADGE[v] || VISIBILITY_BADGE.admin_only;
    return <span className={`badge bg-soft-${info.color} text-${info.color}`}>{info.label}</span>;
  };

  const renderMeetingCard = (rec: MeetingRecord) => (
    <div key={rec.id} className="card border shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="mb-0 fw-bold">{rec.title}</h6>
          {renderVisibilityBadge(rec.visibility)}
        </div>

        <div className="d-flex flex-wrap gap-3 mb-3">
          {rec.student && (
            <span className="badge bg-soft-primary text-primary px-2 py-1">
              <i className="ti ti-user me-1"></i>{rec.student.name}
            </span>
          )}
          {rec.classroom_label && (
            <span className="text-muted small">
              <i className="ti ti-building me-1"></i>{rec.classroom_label}
            </span>
          )}
          {rec.meeting_date && (
            <span className="text-muted small">
              <i className="ti ti-calendar me-1"></i>{rec.meeting_date}
            </span>
          )}
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-soft-primary" onClick={() => openDetail(rec)}>
            <i className="ti ti-eye me-1"></i>Detay
          </button>
          <button className="btn btn-sm btn-soft-warning" onClick={() => openEdit(rec)}>
            <i className="ti ti-pencil me-1"></i>Düzenle
          </button>
          <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(rec.id)}>
            <i className="ti ti-trash me-1"></i>Sil
          </button>
        </div>
      </div>
    </div>
  );

  const renderAppointmentCard = (rec: MeetingRecord) => (
    <div key={rec.id} className="card border shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            {rec.student && (
              <span className="badge bg-soft-primary text-primary px-2 py-1 me-2">
                <i className="ti ti-user me-1"></i>{rec.student.name}
              </span>
            )}
            {rec.classroom_label && (
              <span className="text-muted small">
                <i className="ti ti-building me-1"></i>{rec.classroom_label}
              </span>
            )}
          </div>
          <span className={`badge bg-soft-${rec.status === 'completed' ? 'success' : rec.status === 'cancelled' ? 'danger' : 'info'} text-${rec.status === 'completed' ? 'success' : rec.status === 'cancelled' ? 'danger' : 'info'}`}>
            {rec.status === 'completed' ? 'Tamamlandı' : rec.status === 'cancelled' ? 'İptal' : 'Planlandı'}
          </span>
        </div>

        <div className="d-flex flex-wrap gap-3 mb-2">
          {rec.meeting_date && (
            <span className="text-muted small">
              <i className="ti ti-calendar me-1"></i>{rec.meeting_date}
            </span>
          )}
          {rec.meeting_time && (
            <span className="text-muted small">
              <i className="ti ti-clock me-1"></i>{rec.meeting_time}
            </span>
          )}
        </div>

        {rec.content && (
          <p className="text-muted small mb-2">{rec.content}</p>
        )}

        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-soft-danger" onClick={() => handleDelete(rec.id)}>
            <i className="ti ti-trash me-1"></i>Sil
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = (icon: string, text: string) => (
    <div className="text-center py-5">
      <div className="mb-3">
        <i className={`ti ${icon} fs-1 text-muted`}></i>
      </div>
      <p className="text-muted">{text}</p>
    </div>
  );

  const renderLoading = () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Yükleniyor...</span>
      </div>
    </div>
  );

  /* ---------- tab content ---------- */
  const renderMeetingsTab = () => {
    if (loadingMeetings) return renderLoading();

    const subLabels: { key: MeetingTypeSub; label: string }[] = [
      { key: 'all', label: 'Tümü' },
      { key: 'student', label: 'Öğrenci Görüşmeleri' },
      { key: 'parent', label: 'Veli Görüşmeleri' },
    ];

    const filteredMeetings = meetings.filter((m) => {
      if (meetingTypeSub === 'all') return true;
      return m.meeting_with === meetingTypeSub;
    });

    return (
      <>
        <ul className="nav nav-pills mb-3">
          {subLabels.map((s) => (
            <li className="nav-item" key={s.key}>
              <button
                className={`nav-link ${meetingTypeSub === s.key ? 'active' : ''}`}
                onClick={() => setMeetingTypeSub(s.key)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        {filteredMeetings.length === 0
          ? renderEmptyState('ti-notes-off', 'Seçili kritere uygun görüşme kaydı bulunmuyor.')
          : filteredMeetings.map(renderMeetingCard)}
      </>
    );
  };

  const renderNotesTab = () => {
    if (loadingNotes) return renderLoading();
    if (privateNotes.length === 0) {
      return (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="ti ti-lock fs-1 text-muted"></i>
          </div>
          <p className="text-muted">Henüz özel not eklenmemiş.<br />Bu notlar sadece sizin tarafınızdan görülebilir.</p>
        </div>
      );
    }
    return <>{privateNotes.map(renderMeetingCard)}</>;
  };

  const renderAppointmentsTab = () => {
    const subLabels: { key: AppointmentSub; label: string }[] = [
      { key: 'today', label: 'Bugün' },
      { key: 'upcoming', label: 'Gelecek' },
      { key: 'past', label: 'Geçmiş' },
    ];

    const emptyTexts: Record<AppointmentSub, string> = {
      today: 'Bugün için randevu bulunmuyor.',
      upcoming: 'Gelecek randevu bulunmuyor.',
      past: 'Geçmiş randevu bulunmuyor.',
    };

    return (
      <>
        <ul className="nav nav-pills mb-3">
          {subLabels.map((s) => (
            <li className="nav-item" key={s.key}>
              <button
                className={`nav-link ${appointmentSub === s.key ? 'active' : ''}`}
                onClick={() => setAppointmentSub(s.key)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        {loadingAppointments
          ? renderLoading()
          : appointments.length === 0
            ? renderEmptyState('ti-calendar-check', emptyTexts[appointmentSub])
            : appointments.map(renderAppointmentCard)
        }
      </>
    );
  };

  /* ---------- main render ---------- */
  const actionButton = () => {
    if (activeTab === 'meetings' || activeTab === 'notes') {
      return (
        <button className="btn btn-success" onClick={openNewNote}>
          <i className="ti ti-plus me-1"></i>Yeni Not Ekle
        </button>
      );
    }
    if (activeTab === 'appointments') {
      return (
        <button className="btn btn-success" onClick={() => setShowAppointmentModal(true)}>
          <i className="ti ti-plus me-1"></i>Yeni Randevu Oluştur
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1 text-dark">Görüşmelerim</h3>
          <p className="text-muted mb-0">
            Öğrencilerle ve velilerle yapılan görüşmeleri kaydedin, randevu oluşturun ve kişisel notlarınızı tutun.
          </p>
        </div>
        {actionButton()}
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <i className="ti ti-notes me-1"></i>Görüşme Kayıtları
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <i className="ti ti-lock me-1"></i>Özel Notlar
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <i className="ti ti-calendar me-1"></i>Randevularım
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div>
        {activeTab === 'meetings' && renderMeetingsTab()}
        {activeTab === 'notes' && renderNotesTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
      </div>

      {/* Modals */}
      <MeetingNoteModal
        show={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditRecord(null); }}
        onSaved={handleNoteSaved}
        editRecord={editRecord}
        initialVisibility={activeTab === 'notes' ? 'private' : 'admin_only'}
      />

      <MeetingDetailModal
        show={showDetailModal}
        onClose={() => { setShowDetailModal(false); setDetailRecord(null); }}
        record={detailRecord}
      />

      <AppointmentModal
        show={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSaved={handleAppointmentSaved}
      />
    </div>
  );
};

export default TeacherMeetingsPage;
