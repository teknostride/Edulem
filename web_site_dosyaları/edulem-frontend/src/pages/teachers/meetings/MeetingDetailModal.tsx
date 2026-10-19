interface MeetingRecord {
  id: number;
  title: string;
  content: string;
  meeting_date: string;
  visibility: string;
  student?: { id: number; name: string; school_no?: string } | null;
  classroom_label?: string | null;
}

interface Props {
  show: boolean;
  onClose: () => void;
  record: MeetingRecord | null;
}

const VISIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  admin_only: { label: 'Sadece Yöneticiye Özel', color: 'warning' },
  teachers_open: { label: 'Öğretmenlere Açık', color: 'info' },
  public: { label: 'Herkese Açık', color: 'success' },
  private: { label: 'Sadece Ben', color: 'secondary' },
};

const MeetingDetailModal = ({ show, onClose, record }: Props) => {
  if (!show || !record) return null;

  const vis = VISIBILITY_LABELS[record.visibility] || VISIBILITY_LABELS.admin_only;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom">
            <h5 className="modal-title">Görüşme Detayları</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label text-muted small mb-1">Başlık</label>
                <div className="fw-semibold fs-5">{record.title}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label text-muted small mb-1">Öğrenci</label>
                <div>
                  {record.student ? (
                    <span className="badge bg-soft-primary text-primary px-2 py-1">
                      <i className="ti ti-user me-1"></i>
                      {record.student.name}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label text-muted small mb-1">Sınıf</label>
                <div>
                  {record.classroom_label ? (
                    <span>
                      <i className="ti ti-building me-1 text-muted"></i>
                      {record.classroom_label}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label text-muted small mb-1">Tarih</label>
                <div>
                  <i className="ti ti-calendar me-1 text-muted"></i>
                  {record.meeting_date || '-'}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label text-muted small mb-1">Görünürlük</label>
                <div>
                  <span className={`badge bg-soft-${vis.color} text-${vis.color}`}>
                    {vis.label}
                  </span>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label text-muted small mb-1">Not İçeriği</label>
                <div className="border rounded p-3 bg-light" style={{ whiteSpace: 'pre-wrap' }}>
                  {record.content || '-'}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-top">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailModal;
