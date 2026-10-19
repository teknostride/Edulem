import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read?: boolean;
  is_starred?: boolean;
  is_important?: boolean;
  is_trashed?: boolean;
};

type Mailbox = 'inbox' | 'starred' | 'important' | 'trash';

const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const StudentAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [mailbox, setMailbox] = useState<Mailbox>('inbox');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCounts] = useState({ inbox: 0, starred: 0, important: 0, trash: 0 });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/portal/student/announcements?mailbox=${mailbox}`);
      const rows = res.data?.data?.announcements ?? [];
      const backendCounts = res.data?.data?.counts ?? { inbox: 0, trash: 0 };
      
      setAnnouncements(rows);
      setCounts(prev => ({ ...prev, ...backendCounts }));
      
      if (rows.length > 0 && !activeId) {
        setActiveId(rows[0].id);
      }
    } catch (err) {
      console.error('Duyurular yüklenemedi:', err);
      showToast('error', 'Duyurular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [mailbox]);

  const active = useMemo(() => announcements.find((item) => item.id === activeId) ?? null, [announcements, activeId]);

  const handleToggleStar = async (id: number, currentValue: boolean) => {
    try {
      await axiosClient.put(`/announcements/${id}/star`, { value: !currentValue });
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_starred: !currentValue } : a));
    } catch {
      showToast('error', 'Hata oluştu');
    }
  };

  const handleToggleImportant = async (id: number, currentValue: boolean) => {
    try {
      await axiosClient.put(`/announcements/${id}/important`, { value: !currentValue });
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_important: !currentValue } : a));
    } catch {
      showToast('error', 'Hata oluştu');
    }
  };

  const handleTrashToggle = async (id: number) => {
    const isCurrentlyTrashed = mailbox === 'trash';
    const ok = await confirmDialog({
      text: isCurrentlyTrashed 
        ? 'Bu duyuruyu kalıcı olarak silmek istediğinize emin misiniz?' 
        : 'Bu duyuruyu çöpe taşımak istediğinize emin misiniz?',
      confirmText: isCurrentlyTrashed ? 'Sil' : 'Çöpe Taşı'
    });
    
    if (!ok) return;

    try {
      if (isCurrentlyTrashed) {
        await axiosClient.delete(`/announcements/${id}`);
        showToast('success', 'Duyuru kalıcı olarak silindi');
      } else {
        await axiosClient.post('/announcements/bulk-trash', { ids: [id] });
        showToast('success', 'Duyuru çöpe taşındı');
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      fetchAnnouncements(); // Refresh counts
    } catch {
      showToast('error', 'Hata oluştu');
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await axiosClient.put(`/announcements/${id}/read`);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch {
      // ignore
    }
  };

  const openDetail = (id: number) => {
    setActiveId(id);
    handleMarkAsRead(id);
    const el = document.getElementById('student-announcement-detail');
    const bs = (window as any)?.bootstrap;
    const Offcanvas = bs?.Offcanvas;
    if (!el || !Offcanvas) return;
    const inst = Offcanvas.getInstance(el) || new Offcanvas(el);
    inst.show();
  };

  const closeDetail = () => {
    const el = document.getElementById('student-announcement-detail');
    const bs = (window as any)?.bootstrap;
    const Offcanvas = bs?.Offcanvas;
    if (!el || !Offcanvas) return;
    const inst = Offcanvas.getInstance(el);
    if (inst) inst.hide();
  };

  return (
    <div className="container-fluid student-announcements-page">
      <div className="mb-4">
        <h4 className="page-title mb-1">Duyurular</h4>
        <p className="text-muted mb-0">Size özel paylaşılan duyurular</p>
      </div>

      <div className="outlook-box gap-1 email-app">
        {/* Sol Menü */}
        <div className="outlook-left-menu outlook-left-menu-sm" style={{ minWidth: 260 }}>
          <div className="card h-100 mb-0 rounded-end-0">
            <div className="card-body p-2">
              <div className="list-group list-group-flush list-custom">
                <button
                  type="button"
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded ${mailbox === 'inbox' ? 'active' : ''}`}
                  onClick={() => setMailbox('inbox')}
                >
                  <span>
                    <i className="ti ti-inbox me-2 fs-lg align-middle"></i>
                    <span className="align-middle">Gelen Kutusu</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded ${mailbox === 'starred' ? 'active' : ''}`}
                  onClick={() => setMailbox('starred')}
                >
                  <span>
                    <i className="ti ti-star me-2 fs-lg align-middle"></i>
                    <span className="align-middle">Yıldızlı</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded ${mailbox === 'important' ? 'active' : ''}`}
                  onClick={() => setMailbox('important')}
                >
                  <span>
                    <i className="ti ti-alert-circle me-2 fs-lg align-middle"></i>
                    <span className="align-middle">Önemli</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between rounded ${mailbox === 'trash' ? 'active' : ''}`}
                  onClick={() => setMailbox('trash')}
                >
                  <span>
                    <i className="ti ti-trash me-2 fs-lg align-middle"></i>
                    <span className="align-middle">Çöp Kutusu</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ içerik */}
        <div className="card h-100 mb-0 rounded-start-0 flex-grow-1 border-start-0">
          <div className="card-header card-bg justify-content-between">
            <div className="d-flex flex-wrap align-items-center gap-1">
              <span className="fw-semibold">
                {mailbox === 'inbox' && 'Gelen Kutusu'}
                {mailbox === 'starred' && 'Yıldızlı Duyurular'}
                {mailbox === 'important' && 'Önemli Duyurular'}
                {mailbox === 'trash' && 'Çöp Kutusu'}
              </span>
            </div>
          </div>

          <div className="card-body p-0" style={{ minHeight: 520 }}>
            <div className="table-responsive">
              <table className="table table-hover table-select mb-0">
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="text-center p-4">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <div className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
                          <span>Yükleniyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : announcements.length === 0 ? (
                    <tr>
                      <td className="text-center p-5 text-muted">Duyuru bulunamadı.</td>
                    </tr>
                  ) : (
                    announcements.map((n) => {
                      const preview = stripHtml(n.message || '').slice(0, 100) + (stripHtml(n.message || '').length > 100 ? '...' : '');
                      const initial = (n.title || '?').charAt(0).toUpperCase();
                      return (
                        <tr key={n.id} style={{ cursor: 'pointer' }} className={n.read ? 'opacity-75' : 'fw-bold'} onClick={() => openDetail(n.id)}>
                          <td className="ps-3" style={{ width: '1%' }}>
                            <div className="avatar-xs">
                              <span className="avatar-title text-bg-primary rounded-circle">{initial}</span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-start justify-content-between gap-3">
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="text-truncate">{n.title}</div>
                                <div className="text-muted small text-truncate fw-normal">{preview || '—'}</div>
                              </div>
                              <div className="text-muted small text-nowrap fw-normal">
                                {n.created_at ? new Date(n.created_at).toLocaleDateString('tr-TR') : '—'}
                              </div>
                            </div>
                          </td>
                          <td style={{ width: '1%' }} className="pe-2" onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center gap-1">
                              <button
                                type="button"
                                className={`btn p-0 fs-lg ${n.is_starred ? 'text-warning' : 'text-muted'}`}
                                onClick={() => handleToggleStar(n.id, !!n.is_starred)}
                              >
                                <i className={n.is_starred ? 'ti ti-star-filled' : 'ti ti-star'}></i>
                              </button>
                              <button
                                type="button"
                                className={`btn p-0 fs-lg ${n.is_important ? 'text-danger' : 'text-muted'}`}
                                onClick={() => handleToggleImportant(n.id, !!n.is_important)}
                              >
                                <i className={n.is_important ? 'ti ti-alert-circle-filled' : 'ti ti-alert-circle'}></i>
                              </button>
                              <button
                                type="button"
                                className={`btn p-0 fs-lg text-muted`}
                                onClick={() => handleTrashToggle(n.id)}
                                title={mailbox === 'trash' ? 'Kalıcı Sil' : 'Çöpe Taşı'}
                              >
                                <i className={mailbox === 'trash' ? 'ti ti-trash-x' : 'ti ti-trash'}></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="student-announcement-detail" aria-labelledby="student-announcement-detail-label">
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="student-announcement-detail-label">{active?.title || 'Duyuru Detayı'}</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" onClick={closeDetail}></button>
        </div>
        <div className="offcanvas-body">
          {active ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted small">
                  <i className="ti ti-calendar me-1"></i>
                  {new Date(active.created_at).toLocaleString('tr-TR')}
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className={`btn btn-sm btn-icon ${active.is_starred ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => handleToggleStar(active.id, !!active.is_starred)}
                  >
                    <i className="ti ti-star"></i>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm btn-icon ${active.is_important ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => handleToggleImportant(active.id, !!active.is_important)}
                  >
                    <i className="ti ti-alert-circle"></i>
                  </button>
                </div>
              </div>
              <div className="card border-0 bg-light-subtle mb-3">
                <div className="card-body p-3">
                  <div 
                    className="announcement-content"
                    dangerouslySetInnerHTML={{ __html: active.message }}
                  />
                </div>
              </div>
              <div className="d-grid mt-4">
                <button 
                  type="button" 
                  className="btn btn-outline-danger" 
                  onClick={() => {
                    closeDetail();
                    handleTrashToggle(active.id);
                  }}
                >
                  <i className="ti ti-trash me-2"></i>
                  {mailbox === 'trash' ? 'Kalıcı Olarak Sil' : 'Duyuruyu Çöpe Taşı'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAnnouncementsPage;
