import { useState, useEffect, useRef, type MouseEvent } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import RichTextEditor from '../../components/RichTextEditor';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  status?: string;
  created_by?: number;
  user_id?: number;
  user_name?: string;
  user_avatar?: string;
  target_roles?: (number | string)[];
  created_at: string;
  scheduled_at?: string;
  read: boolean;
  is_starred?: boolean;
  is_important?: boolean;
  action_url?: string;
  action_text?: string;
  can_edit?: boolean;
  can_delete?: boolean;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  user_count: number;
}

const STUDENT_TARGET_ROLE_ID = -1;

const NotificationList = () => {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
    } catch {
      return {};
    }
  })();
  const currentUserId = currentUser?.id ?? null;

  const roleKey = localStorage.getItem('USER_ROLE') || (currentUser?.role ?? null);

  const isTeacherRole =
    roleKey === 'Öğretmen' ||
    roleKey === 'Sınıf Öğretmeni' ||
    roleKey === 'teacher' ||
    roleKey === 'Rehber Öğretmen' ||
    roleKey === 'rehber_teacher' ||
    roleKey === 'guidance_teacher' ||
    roleKey === 'Rehberlik' ||
    roleKey === 'guidance' ||
    roleKey === '5' ||
    roleKey === '6';

  const isStudentRole = roleKey === 'student' || roleKey === 'Öğrenci' || roleKey === 'guardian' || roleKey === 'Veli';
  const isOwner = roleKey === 'owner' || roleKey === 'Admin' || roleKey === 'Genel Müdür' || roleKey === 'Kurucu' || roleKey === 'kurucu';
  const isStudentAffairs = roleKey === 'Öğrenci İşleri' || roleKey === 'student_affairs';
  const isManager = roleKey === 'Müdür' || roleKey === 'Müdür Yardımcısı' || roleKey === 'Kampüs Müdürü' || isOwner;

  const canPublishAnnouncements = (isOwner || isManager || isStudentAffairs) && !isTeacherRole && !isStudentRole;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, _setCurrentPage] = useState(1);
  const [filter, _setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [starredCount, setStarredCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [importantCount, setImportantCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [editorContent, setEditorContent] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'compose'>('list');
  const [mailbox, setMailbox] = useState<'inbox' | 'sent' | 'starred' | 'scheduled' | 'drafts' | 'important' | 'trash'>('inbox');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Notification | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [currentPage, filter, searchTerm, mailbox]);

  useEffect(() => {
    if (!canPublishAnnouncements && currentView === 'compose' && !editingAnnouncement) {
      setCurrentView('list');
    }
  }, [canPublishAnnouncements, currentView, editingAnnouncement]);

  useEffect(() => {
    if (!canPublishAnnouncements && (mailbox === 'scheduled' || mailbox === 'drafts' || mailbox === 'sent')) {
      setMailbox('inbox');
    }
  }, [canPublishAnnouncements, mailbox]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < notifications.length;
  }, [selectedIds, notifications.length]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axiosClient.get('/roles');
        const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);

        let studentCount = 0;
        try {
          const studentRes = await axiosClient.get('/students', { params: { per_page: 1 } });
          studentCount =
            Number(studentRes.data?.data?.pagination?.total) ||
            Number(studentRes.data?.pagination?.total) ||
            0;
        } catch {
          studentCount = 0;
        }

        setRoles([
          {
            id: STUDENT_TARGET_ROLE_ID,
            name: 'student',
            display_name: 'Öğrenci',
            description: 'Öğrenci portalı - Tüm öğrenciler',
            user_count: studentCount,
          },
          ...arr.map((r: { id: number; name: string; display_name?: string; description?: string; users_count?: number }) => ({
          id: r.id,
          name: r.name,
          display_name: r.display_name || r.name,
          description: r.description,
          user_count: r.users_count ?? 0,
        })),
        ]);
      } catch {
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        mailbox,
        ...(filter !== 'all' && { type: filter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await axiosClient.get(`/announcements?${params}`);
      const announcementsData = Array.isArray(response.data.data) ? response.data.data : [];
      setNotifications(announcementsData);
      setSelectedIds([]);
    } catch (error) {
      console.error('Duyurular yüklenemedi:', error);
      showToast('error', 'Duyurular yüklenemedi');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axiosClient.get('/announcements/unread-count');
      const d = response.data?.data ?? response.data;
      setUnreadCount(d?.unread_count ?? 0);
      setStarredCount(d?.starred_count ?? 0);
      setSentCount(d?.sent_count ?? 0);
      setScheduledCount(d?.scheduled_count ?? 0);
      setDraftsCount(d?.drafts_count ?? 0);
      setImportantCount(d?.important_count ?? 0);
      setTrashCount(d?.trash_count ?? 0);
    } catch (error) {
      console.error('Mailbox sayıları alınamadı:', error);
      setUnreadCount(0);
      setStarredCount(0);
      setSentCount(0);
      setScheduledCount(0);
      setDraftsCount(0);
      setImportantCount(0);
      setTrashCount(0);
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const getSelectedRolesText = () => {
    if (selectedRoles.length === 0) return 'Rol seçin...';
    if (selectedRoles.length === 1) {
      const role = roles.find(r => r.id === selectedRoles[0]);
      return role ? `${role.display_name} (${role.user_count} kişi)` : 'Rol seçin...';
    }
    return `${selectedRoles.length} rol seçildi (${selectedRoles.reduce((sum, roleId) => {
      const role = roles.find(r => r.id === roleId);
      return sum + (role ? role.user_count : 0);
    }, 0)} kişi)`;
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await axiosClient.put(`/announcements/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      fetchUnreadCount();
      // Sidebar badge'ini güncelle
      window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'notification', count: unreadCount - 1 } }));
    } catch (error) {
      console.error('Okundu işaretlenemedi:', error);
      showToast('error', 'Okundu işaretlenemedi');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.put('/announcements/read-all');
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      fetchUnreadCount();
      showToast('success', 'Tüm duyurular okundu olarak işaretlendi');
      // Sidebar badge'ini sıfırla
      window.dispatchEvent(new CustomEvent('badgeCounts', { detail: { type: 'notification', count: 0 } }));
    } catch (error) {
      console.error('Duyurular okundu işaretlenemedi:', error);
      showToast('error', 'Duyurular okundu işaretlenemedi');
    }
  };

  const handleImportant = async (n: Notification) => {
    try {
      await axiosClient.put(`/announcements/${n.id}/important`, { value: !n.is_important });
      setNotifications(prev => prev.map(item => (item.id === n.id ? { ...item, is_important: !item.is_important } : item)));
    } catch (error) {
      console.error('Önemli işareti güncellenemedi:', error);
      showToast('error', 'Önemli işareti güncellenemedi');
    }
  };

  const handleDelete = async (target: Notification | number) => {
    const notificationId = typeof target === 'number' ? target : target.id;
    const item = typeof target === 'object' ? target : notifications.find((n) => n.id === notificationId);

    const isTrash = mailbox === 'trash';
    const isCreator = item ? (item.created_by != null && item.created_by === currentUserId) : false;
    const isSentOrScheduledOrDraft = mailbox === 'sent' || mailbox === 'scheduled' || mailbox === 'drafts';
    const isPublisherAction = (item?.can_delete || isCreator || isSentOrScheduledOrDraft) && !isTrash;

    let confirmText = '';
    let confirmBtn = 'Sil';

    if (isTrash) {
      confirmText = 'Bu duyuruyu kalıcı olarak silmek istediğinize emin misiniz?';
      confirmBtn = 'Kalıcı Sil';
    } else if (isPublisherAction) {
      confirmText = 'Bu duyuruyu yayından kaldırmak ve sistemden tamamen silmek istediğinize emin misiniz? (Tüm alıcılardan kaldırılacaktır)';
      confirmBtn = 'Yayından Kaldır ve Sil';
    } else {
      confirmText = 'Bu duyuruyu çöpe taşımak istediğinize emin misiniz?';
      confirmBtn = 'Çöpe Taşı';
    }

    const ok = await confirmDialog({
      text: confirmText,
      confirmText: confirmBtn,
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      if (isTrash || isPublisherAction) {
        await axiosClient.delete(`/announcements/${notificationId}`, {
          params: {
            delete_for_everyone: isPublisherAction ? 1 : 0,
            mailbox,
          },
        });
        showToast('success', isPublisherAction ? 'Duyuru yayından kaldırıldı ve silindi' : 'Duyuru kalıcı olarak silindi');
      } else {
        await axiosClient.post('/announcements/bulk-trash', { ids: [notificationId] });
        showToast('success', 'Duyuru çöpe taşındı');
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      fetchUnreadCount();
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', 'Duyuru silinemedi');
    }
  };

  const handleBulkTrash = async () => {
    if (selectedIds.length === 0) {
      showToast('error', 'Lütfen silmek istediğiniz duyuruları seçin');
      return;
    }

    const isTrash = mailbox === 'trash';
    const isSent = mailbox === 'sent' || mailbox === 'scheduled' || mailbox === 'drafts';

    let confirmMsg = '';
    if (isTrash) {
      confirmMsg = `${selectedIds.length} duyuru kalıcı olarak silinecek. Emin misiniz?`;
    } else if (isSent) {
      confirmMsg = `Seçilen ${selectedIds.length} duyuru tüm alıcılardan ve sistemden kaldırılacak. Emin misiniz?`;
    } else {
      confirmMsg = `Seçilen ${selectedIds.length} duyuru çöpe taşınacak. Emin misiniz?`;
    }

    const ok = await confirmDialog({
      text: confirmMsg,
      confirmText: isSent ? 'Yayından Kaldır ve Sil' : (isTrash ? 'Kalıcı Sil' : 'Çöpe Taşı'),
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      if (isTrash || isSent) {
        for (const id of selectedIds) {
          await axiosClient.delete(`/announcements/${id}`, {
            params: { delete_for_everyone: isSent ? 1 : 0, mailbox },
          });
        }
        showToast('success', isSent ? `${selectedIds.length} duyuru yayından kaldırıldı ve silindi` : `${selectedIds.length} duyuru kalıcı olarak silindi`);
      } else {
        await axiosClient.post('/announcements/bulk-trash', { ids: selectedIds });
        showToast('success', `${selectedIds.length} duyuru çöpe taşındı`);
      }
      setSelectedIds([]);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', 'İşlem sırasında hata oluştu');
    }
  };

  const handleStar = async (n: Notification) => {
    try {
      await axiosClient.put(`/announcements/${n.id}/star`, { value: !n.is_starred });
      setNotifications(prev => prev.map(item => (item.id === n.id ? { ...item, is_starred: !item.is_starred } : item)));
      fetchUnreadCount();
    } catch (error) {
      console.error('Yıldız güncellenemedi:', error);
      showToast('error', 'Yıldız güncellenemedi');
    }
  };

  // const _getTypeIcon = (type: string) => {
  //   switch (type) {
  //     case 'info': return 'ti ti-info-circle';
  //     case 'success': return 'ti ti-check-circle';
  //     case 'warning': return 'ti ti-alert-triangle';
  //     case 'error': return 'ti ti-x-circle';
  //     default: return 'ti ti-info-circle';
  //   }
  // };

  // const _getTypeColor = (type: string) => {
  //   switch (type) {
  //     case 'info': return 'text-info';
  //     case 'success': return 'text-success';
  //     case 'warning': return 'text-warning';
  //     case 'error': return 'text-danger';
  //     default: return 'text-info';
  //   }
  // };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} saat önce`;
    } else if (minutes > 0) {
      return `${minutes} dakika önce`;
    } else {
      return 'Az önce';
    }
  };

  /** Planlanmış duyurular için: Yayınlanacak tarih/saat (ileri tarih) */
  const formatScheduled = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate || !scheduleTime) {
      showToast('error', 'Lütfen tarih ve saat seçin');
      return;
    }
    const at = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (at <= new Date()) {
      showToast('error', 'Yayın zamanı ileri bir tarih olmalıdır');
      return;
    }
    if (selectedRoles.length === 0) {
      showToast('error', 'Lütfen en az bir rol seçin');
      return;
    }
    if (!subject.trim()) {
      showToast('error', 'Lütfen başlık girin');
      return;
    }
    if (!editorContent || stripHtml(editorContent).trim().length < 1) {
      showToast('error', 'Lütfen içerik girin');
      return;
    }
    try {
      const scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
      await axiosClient.post('/announcements', {
        title: subject.trim(),
        message: editorContent,
        type: 'info',
        roles: selectedRoles.map((id) => (id === STUDENT_TARGET_ROLE_ID ? 'student' : id)),
        status: 'scheduled',
        scheduled_at: scheduledAt,
      });
      showToast('success', 'Duyuru planlandı');
      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('');
      setSubject('');
      setEditorContent('');
      setSelectedRoles([]);
      setCurrentView('list');
      setMailbox('scheduled');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number } };
      const msg = err?.response?.data?.message || 'Duyuru planlanamadı';
      showToast('error', msg);
    }
  };

  const handleSaveDraft = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const title = subject.trim() || '(Taslak)';
    const message = editorContent.trim() ? editorContent : '<p>Taslak</p>';
    try {
      await axiosClient.post('/announcements', {
        title,
        message,
        type: 'info',
        roles: selectedRoles.map((id) => (id === STUDENT_TARGET_ROLE_ID ? 'student' : id)),
        status: 'draft',
      });
      showToast('success', 'Taslak kaydedildi');
      setSubject('');
      setEditorContent('');
      setSelectedRoles([]);
      setCurrentView('list');
      setMailbox('drafts');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Taslak kaydedilemedi:', error);
      showToast('error', 'Taslak kaydedilemedi');
    }
  };

  const handleStartEdit = async (n: Notification) => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/announcements/${n.id}`);
      const data: Notification = res.data?.data || n;
      setEditingAnnouncement(data);
      setSubject(data.title || '');
      setEditorContent(data.message || '');

      if (Array.isArray(data.target_roles) && data.target_roles.length > 0) {
        const mapped = data.target_roles
          .map((r) => ((r === 'student' || r === 'Öğrenci') ? STUDENT_TARGET_ROLE_ID : Number(r)))
          .filter((id) => !isNaN(id));
        setSelectedRoles(mapped);
      } else {
        setSelectedRoles([]);
      }
      setCurrentView('compose');
    } catch {
      setEditingAnnouncement(n);
      setSubject(n.title || '');
      setEditorContent(n.message || '');
      if (Array.isArray(n.target_roles) && n.target_roles.length > 0) {
        const mapped = n.target_roles
          .map((r) => ((r === 'student' || r === 'Öğrenci') ? STUDENT_TARGET_ROLE_ID : Number(r)))
          .filter((id) => !isNaN(id));
        setSelectedRoles(mapped);
      } else {
        setSelectedRoles([]);
      }
      setCurrentView('compose');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAnnouncement(null);
    setSubject('');
    setEditorContent('');
    setSelectedRoles([]);
    setCurrentView('list');
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    if (!subject.trim()) {
      showToast('error', 'Lütfen başlık girin');
      return;
    }
    if (!editorContent || stripHtml(editorContent).trim().length < 1) {
      showToast('error', 'Lütfen içerik girin');
      return;
    }
    if (selectedRoles.length === 0) {
      showToast('error', 'Lütfen en az bir rol seçin');
      return;
    }

    try {
      setIsUpdating(true);
      const payload = {
        title: subject.trim(),
        message: editorContent,
        type: editingAnnouncement.type || 'info',
        roles: selectedRoles.map((id) => (id === STUDENT_TARGET_ROLE_ID ? 'student' : id)),
      };

      await axiosClient.put(`/announcements/${editingAnnouncement.id}`, payload);
      showToast('success', 'Duyuru başarıyla güncellendi');
      handleCancelEdit();
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: unknown) {
      console.error('Duyuru güncellenemedi:', error);
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err?.response?.data?.message || 'Duyuru güncellenemedi');
    } finally {
      setIsUpdating(false);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  /** Mobilde offcanvas'ı kapat (data-bs-dismiss vendors.min.js'te backdrop hatası veriyor) */
  const closeSidebarOffcanvas = () => {
    const el = document.getElementById('emailSidebaroffcanvas');
    const bs = (window as unknown as { bootstrap?: { Offcanvas?: { getInstance: (e: Element) => { hide: () => void } | null } } }).bootstrap;
    if (el && bs?.Offcanvas) {
      const inst = bs.Offcanvas.getInstance(el);
      if (inst) inst.hide();
    }
  };

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Duyurular</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="javascript: void(0);">Sayfalar</a></li>
            <li className="breadcrumb-item"><a href="javascript: void(0);">Uygulamalar</a></li>
            <li className="breadcrumb-item active">Duyurular</li>
          </ol>
        </div>
      </div>

      <div className="outlook-box gap-1 email-app">
        {/* Sidebar */}
        <div
          className="offcanvas-lg offcanvas-start outlook-left-menu outlook-left-menu-sm"
          tabIndex={-1}
          id="emailSidebaroffcanvas"
          data-bs-backdrop="true"
          data-bs-scroll="false"
        >
          <div className="card h-100 mb-0 rounded-end-0">
            <div className="card-body">
              {canPublishAnnouncements ? (
                <a
                  href="#"
                  className="btn btn-danger fw-medium w-100"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentView === 'compose') {
                      handleCancelEdit();
                      setMailbox('inbox');
                    } else {
                      setEditingAnnouncement(null);
                      setSubject('');
                      setEditorContent('');
                      setSelectedRoles([]);
                      setCurrentView('compose');
                    }
                  }}
                >
                  {currentView === 'compose' ? 'Gelen Kutusu' : 'Duyuru Yayınla'}
                </a>
              ) : null}

              <div className="list-group list-group-flush list-custom mt-3">
                <a
                  href="#"
                  className={`list-group-item list-group-item-action ${mailbox === 'inbox' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setMailbox('inbox'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                >
                  <i className="ti ti-inbox me-1 opacity-75 fs-lg align-middle"></i>
                  <span className="align-middle">Gelen Kutusu</span>
                  {unreadCount > 0 && <span className="badge align-middle bg-danger-subtle fs-xxs text-danger float-end">{unreadCount}</span>}
                </a>

                {canPublishAnnouncements ? (
                  <a
                    href="#"
                    className={`list-group-item list-group-item-action ${mailbox === 'sent' ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); setMailbox('sent'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                  >
                    <i className="ti ti-send-2 me-1 opacity-75 fs-lg align-middle"></i>
                    <span className="align-middle">Yayınlanmış</span>
                    {sentCount > 0 && <span className="badge align-middle bg-primary-subtle fs-xxs text-primary float-end">{sentCount}</span>}
                  </a>
                ) : null}

                {canPublishAnnouncements ? (
                  <>
                    <a
                      href="#"
                      className={`list-group-item list-group-item-action ${mailbox === 'scheduled' ? 'active' : ''}`}
                      onClick={(e) => { e.preventDefault(); setMailbox('scheduled'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                    >
                      <i className="ti ti-clock me-1 opacity-75 fs-lg align-middle"></i>
                      <span className="align-middle">Planlanmış</span>
                      {scheduledCount > 0 && <span className="badge align-middle bg-info-subtle fs-xxs text-info float-end">{scheduledCount}</span>}
                    </a>

                    <a
                      href="#"
                      className={`list-group-item list-group-item-action ${mailbox === 'drafts' ? 'active' : ''}`}
                      onClick={(e) => { e.preventDefault(); setMailbox('drafts'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                    >
                      <i className="ti ti-pencil me-1 opacity-75 fs-lg align-middle"></i>
                      <span className="align-middle">Taslaklar</span>
                      {draftsCount > 0 && <span className="badge align-middle bg-secondary fs-xxs text-white float-end">{draftsCount}</span>}
                    </a>
                  </>
                ) : null}

                <a
                  href="#"
                  className={`list-group-item list-group-item-action ${mailbox === 'starred' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setMailbox('starred'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                >
                  <i className="ti ti-star me-1 opacity-75 fs-lg align-middle"></i>
                  <span className="align-middle">Yıldızlı</span>
                  {starredCount > 0 && <span className="badge align-middle bg-warning-subtle fs-xxs text-warning float-end">{starredCount}</span>}
                </a>

                <a
                  href="#"
                  className={`list-group-item list-group-item-action ${mailbox === 'important' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setMailbox('important'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                >
                  <i className="ti ti-alert-circle me-1 opacity-75 fs-lg align-middle"></i>
                  <span className="align-middle">Önemli</span>
                  {importantCount > 0 && <span className="badge align-middle bg-danger-subtle fs-xxs text-danger float-end">{importantCount}</span>}
                </a>

                <a
                  href="#"
                  className={`list-group-item list-group-item-action ${mailbox === 'trash' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setMailbox('trash'); setCurrentView('list'); closeSidebarOffcanvas(); }}
                >
                  <i className="ti ti-trash me-1 opacity-75 fs-lg align-middle"></i>
                  <span className="align-middle">Çöp</span>
                  {trashCount > 0 && <span className="badge align-middle bg-secondary fs-xxs text-white float-end">{trashCount}</span>}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="card h-100 mb-0 rounded-start-0 flex-grow-1 border-start-0">
          {/* Mobile Header */}
          <div className="card-header d-lg-none d-flex gap-2">
            <button
              className="btn btn-default btn-icon"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#emailSidebaroffcanvas"
              aria-controls="emailSidebaroffcanvas"
            >
              <i className="ti ti-menu-4 fs-lg"></i>
            </button>
            <div className="app-search">
              <input
                type="text"
                className="form-control"
                placeholder="Duyurularınızı girin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="ti ti-search app-search-icon text-muted"></i>
            </div>
          </div>

          {/* Email List Header */}
          <div className="card-header card-bg justify-content-between">
            <div className="d-flex flex-wrap align-items-center gap-1">
              <input
                ref={selectAllRef}
                className="form-check-input form-check-input-light fs-14 mt-0 me-1"
                type="checkbox"
                id="select-all-email"
                checked={notifications.length > 0 && selectedIds.length === notifications.length}
                onChange={(e) => {
                  if (e.target.checked) setSelectedIds(notifications.map(n => n.id));
                  else setSelectedIds([]);
                }}
              />
              <label htmlFor="select-all-email" className="form-label mb-0 me-2 cursor-pointer">
                Hepsini seç
              </label>

              <button type="button" className="btn btn-default btn-sm" onClick={handleMarkAllAsRead}>
                <i className="ti ti-checks me-1"></i>Tümünü oku
              </button>

              <button type="button" className="btn btn-default btn-icon btn-sm" onClick={handleBulkTrash} title="Seçilenleri çöpe taşı">
                <i className="ti ti-trash fs-lg"></i>
              </button>
            </div>

            <div className="app-search d-none d-lg-inline-flex">
              <input data-table-search="" type="text" className="form-control" placeholder="Duyuruları ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <i className="ti ti-search app-search-icon text-muted"></i>
            </div>
          </div>

          {/* Content Area - Dynamic */}
          <div className="card-body p-0" style={{ height: 'calc(100% - 100px)' }}>
            {currentView === 'list' || !canPublishAnnouncements ? (
              /* Email List View */
              <div>
                <div className="table-responsive">
                  <table className="table table-hover table-select mb-0">
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center p-4">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <div className="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true"></div>
                              <span>Yükleniyor...</span>
                            </div>
                          </td>
                        </tr>
                      ) : notifications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-5 text-muted">
                            {mailbox === 'trash' && 'Çöp kutusu boş.'}
                            {mailbox === 'sent' && 'Henüz yayınlanmış duyuru yok.'}
                            {mailbox === 'drafts' && 'Henüz taslak yok.'}
                            {mailbox === 'scheduled' && 'Planlanmış duyuru yok.'}
                            {mailbox === 'starred' && 'Yıldızlı duyuru yok.'}
                            {mailbox === 'important' && 'Önemli duyuru yok.'}
                            {mailbox === 'inbox' && 'Henüz duyuru yok.'}
                          </td>
                        </tr>
                      ) : (
                        notifications.map((n) => {
                          const initial = (n.user_name || '?').charAt(0).toUpperCase();
                          const preview = stripHtml(n.message).slice(0, 80) + (stripHtml(n.message).length > 80 ? '...' : '');
                          return (
                            <tr
                              key={n.id}
                              className={`position-relative ${n.read ? 'mark-as-read opacity-75' : ''}`}
                            >
                              <td className="ps-3" style={{ width: '1%' }}>
                                <div className="d-flex gap-3 align-items-center">
                                  <input
                                    className="form-check-input form-check-input-light fs-14 position-relative z-2 mt-0"
                                    type="checkbox"
                                    checked={selectedIds.includes(n.id)}
                                    onChange={() => {
                                      setSelectedIds(prev => prev.includes(n.id) ? prev.filter(i => i !== n.id) : [...prev, n.id]);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className={`btn p-0 fs-xl ${n.is_starred ? 'text-warning' : 'text-muted'}`}
                                    onClick={() => handleStar(n)}
                                    title={n.is_starred ? 'Yıldızı kaldır' : 'Yıldızla'}
                                  >
                                    <i className={n.is_starred ? 'ti ti-star-filled' : 'ti ti-star'}></i>
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn p-0 fs-lg ${n.is_important ? 'text-danger' : 'text-muted'}`}
                                    onClick={() => handleImportant(n)}
                                    title={n.is_important ? 'Önemliden kaldır' : 'Önemli işaretle'}
                                  >
                                    <i className={n.is_important ? 'ti ti-alert-circle-filled' : 'ti ti-alert-circle'}></i>
                                  </button>
                                </div>
                              </td>
                              <td
                                className="cursor-pointer"
                                onClick={() => {
                                  handleMarkAsRead(n.id);
                                  setSelectedDetail(n.id);
                                }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <div className="avatar-xs">
                                    <span className="avatar-title text-bg-primary rounded-circle">{initial}</span>
                                  </div>
                                  <h5 className="fs-base mb-0 fw-medium">{n.user_name || '—'}</h5>
                                </div>
                              </td>
                              <td
                                className="cursor-pointer"
                                onClick={() => {
                                  handleMarkAsRead(n.id);
                                  setSelectedDetail(n.id);
                                }}
                              >
                                <span className={`link-reset fs-base ${n.read ? 'fw-normal text-muted' : 'fw-semibold'}`}>{n.title}</span>
                                <span className="d-xl-inline-block d-none">—</span>
                                <span className="fs-base text-muted d-xl-inline-block d-none mb-0">{preview || '—'}</span>
                              </td>
                              <td style={{ width: '1%' }}>
                                <div className="d-flex align-items-center gap-1">
                                  {(n.can_edit ?? (canPublishAnnouncements || (n.created_by != null && n.created_by === currentUserId))) && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-icon btn-ghost-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEdit(n);
                                      }}
                                      title="Duyuruyu Düzenle"
                                    >
                                      <i className="ti ti-edit"></i>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-ghost-danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(n);
                                    }}
                                    title={
                                      mailbox === 'trash'
                                        ? 'Kalıcı sil'
                                        : ((n.can_delete ?? (n.created_by != null && n.created_by === currentUserId)) || mailbox === 'sent' || mailbox === 'scheduled' || mailbox === 'drafts')
                                        ? 'Yayından kaldır ve sil'
                                        : 'Çöpe taşı'
                                    }
                                  >
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </div>
                              </td>
                              <td>
                                <p className="fs-xs text-muted mb-0 text-end pe-2">
                                  {n.scheduled_at ? (
                                    <span title="Yayınlanacak"><i className="ti ti-clock me-1"></i>{formatScheduled(n.scheduled_at)}</span>
                                  ) : (
                                    n.created_at ? formatDate(n.created_at) : '—'
                                  )}
                                </p>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Compose View */
              <div>
                {editingAnnouncement && (
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-primary-subtle text-primary">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary text-white fs-xs px-2 py-1">Düzenleme Modu</span>
                      <span className="fs-sm fw-semibold">
                        Duyuruyu Düzenle: <span className="text-dark">{editingAnnouncement.title}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleCancelEdit}
                    >
                      <i className="ti ti-x me-1"></i>Vazgeç
                    </button>
                  </div>
                )}

                {/* To Field */}
                <div className="input-group border-bottom border-dashed ps-2 pe-4">
                  <div className="dropdown w-100">
                    <button
                      className="btn btn-outline-secondary dropdown-toggle w-100 text-start py-3 border-0"
                      type="button"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                      <span className="fw-semibold fs-sm text-body">Kime:</span>
                      <span className="ms-2">{getSelectedRolesText()}</span>
                    </button>
                    <div className={`dropdown-menu w-100 p-3 ${showRoleDropdown ? 'show' : ''}`} style={{ position: 'absolute', top: '100%', left: '0', right: '0', zIndex: 1000 }}>
                      <div className="mb-2">
                        <small className="text-muted">Duyuru yapılacak rolleri seçin:</small>
                      </div>
                      {rolesLoading ? (
                        <div className="text-muted py-2">Roller yükleniyor...</div>
                      ) : (
                        roles.map((role) => (
                          <div key={role.id} className="form-check mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`role-${role.id}`}
                              checked={selectedRoles.includes(role.id)}
                              onChange={() => handleRoleToggle(role.id)}
                            />
                            <label className="form-check-label d-flex justify-content-between align-items-center" htmlFor={`role-${role.id}`}>
                              <span>
                                <strong>{role.display_name}</strong>
                                {role.description && <small className="text-muted d-block">{role.description}</small>}
                              </span>
                              <span className="badge bg-primary">{role.user_count} kişi</span>
                            </label>
                          </div>
                        )))}
                      {selectedRoles.length > 0 && (
                        <div className="mt-3 pt-2 border-top">
                          <small className="text-success">
                            <i className="ti ti-check me-1"></i>
                            Toplam {selectedRoles.reduce((sum, roleId) => {
                              const role = roles.find(r => r.id === roleId);
                              return sum + (role ? role.user_count : 0);
                            }, 0)} kişiye duyuru gönderilecek
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Field */}
                <div className="border-bottom border-dashed ps-2 pe-4">
                  <input
                    type="text"
                    className="form-control py-3 fs-sm fw-semibold border-0"
                    placeholder="Duyuru Başlığı"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Metin editörü */}
                <RichTextEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  placeholder="Duyuru içeriğini buraya yazın..."
                  minHeight={200}
                  maxHeight={400}
                />

                {/* Action Buttons */}
                <div className="bg-light-subtle p-2 border-light border-bottom">
                  <div className="d-flex gap-1 align-items-center">
                    {editingAnnouncement ? (
                      <div className="d-flex gap-2 align-items-center">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={isUpdating}
                          onClick={handleUpdateAnnouncement}
                        >
                          {isUpdating ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Güncelleniyor...
                            </>
                          ) : (
                            <>
                              <i className="ti ti-check me-2"></i>
                              Değişiklikleri Kaydet
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <div className="btn-group">
                        <button type="button" className="btn btn-primary" onClick={() => {
                          if (selectedRoles.length === 0) {
                            showToast('error', 'Lütfen en az bir rol seçin');
                            return;
                          }

                          const announcementData = {
                            title: subject,
                            message: editorContent,
                            type: 'info',
                            roles: selectedRoles.map((id) => (id === STUDENT_TARGET_ROLE_ID ? 'student' : id))
                          };

                          axiosClient.post('/announcements', announcementData)
                            .then(() => {
                              showToast('success', 'Duyuru gönderildi');
                              setSubject('');
                              setEditorContent('');
                              setSelectedRoles([]);
                              setCurrentView('list');
                              fetchNotifications();
                              fetchUnreadCount();
                            })
                            .catch((error) => {
                              console.error('Duyuru gönderilemedi:', error);
                              showToast('error', 'Duyuru gönderilemedi');
                            });
                        }}>
                          <i className="ti ti-send-2 me-2"></i>
                          Gönder
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary dropdown-toggle dropdown-toggle-split drop-arrow-none"
                          data-bs-toggle="dropdown"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <i className="ti ti-chevron-down align-middle"></i>
                        </button>
                        <div className="dropdown-menu">
                          <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setShowScheduleModal(true); }}>
                            <i className="ti ti-clock me-2"></i>Zamanla gönder
                          </a>
                          <a className="dropdown-item" href="#" onClick={handleSaveDraft}>
                            <i className="ti ti-device-floppy me-2"></i>Taslak kaydet
                          </a>
                          <div className="dropdown-divider"></div>
                          <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setCurrentView('list'); }}>
                            Vazgeç
                          </a>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-icon btn-soft-danger ms-auto"
                      data-bs-toggle="tooltip"
                      data-bs-trigger="hover"
                      data-bs-placement="top"
                      aria-label="Silmek"
                      data-bs-original-title="Delete"
                      onClick={handleCancelEdit}
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duyuru detay offcanvas - satıra tıklanınca okundu işaretlenir ve açılır; opak beyaz panel */}
      {selectedDetail != null && (() => {
        const detail = notifications.find((n) => n.id === selectedDetail);
        if (!detail) return null;
        const hasMessage = detail.message != null && String(detail.message).trim().length > 0;
        const safeMsg = hasMessage ? String(detail.message) : '';
        const looksLikeHtml = /<(?:\/)?(?:p|div|br|span|ul|ol|li|strong|b|i|em|a\s|h[1-6])[\s>]/i.test(safeMsg);
        return (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setSelectedDetail(null)} aria-hidden="true" />
            <div
              className="offcanvas offcanvas-end show bg-body border-start shadow"
              tabIndex={-1}
              style={{
                zIndex: 1050,
                visibility: 'visible',
                width: '400px',
                maxWidth: '90vw',
                background: 'var(--bs-body-bg)',
                opacity: 1,
              }}
              aria-modal="true"
            >
              <div className="offcanvas-header border-bottom bg-body d-flex align-items-center justify-content-between">
                <h5 className="offcanvas-title text-truncate me-2 mb-0">{detail.title}</h5>
                <div className="d-flex align-items-center gap-1">
                  {(detail.can_edit ?? (canPublishAnnouncements || (detail.created_by != null && detail.created_by === currentUserId))) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                      onClick={() => {
                        setSelectedDetail(null);
                        handleStartEdit(detail);
                      }}
                      title="Duyuruyu Düzenle"
                    >
                      <i className="ti ti-edit"></i>
                      <span>Düzenle</span>
                    </button>
                  )}
                  {(detail.can_delete ?? (canPublishAnnouncements || (detail.created_by != null && detail.created_by === currentUserId))) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                      onClick={() => {
                        setSelectedDetail(null);
                        handleDelete(detail);
                      }}
                      title="Duyuruyu Sil"
                    >
                      <i className="ti ti-trash"></i>
                      <span>Sil</span>
                    </button>
                  )}
                  <button type="button" className="btn-close ms-1" onClick={() => setSelectedDetail(null)} aria-label="Kapat" />
                </div>
              </div>
              <div className="offcanvas-body bg-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="text-muted fs-sm">{detail.user_name || '—'}</span>
                  <span className="text-muted fs-xs">•</span>
                  <span className="text-muted fs-xs">{detail.created_at ? formatDate(detail.created_at) : '—'}</span>
                </div>
                <div className="announcement-body text-body" style={{ minHeight: '60px', overflowWrap: 'break-word' }}>
                  {hasMessage ? (
                    looksLikeHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: safeMsg }} />
                    ) : (
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{safeMsg}</p>
                    )
                  ) : (
                    <p className="text-muted mb-0">İçerik yok.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Zamanla gönder modal - ileri tarih/saat ile planlanmış duyuru */}
      {showScheduleModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} onClick={() => setShowScheduleModal(false)} aria-hidden="true" />
          <div className="modal fade show" style={{ display: 'block', zIndex: 1070 }} tabIndex={-1} aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Zamanla gönder</h5>
                  <button type="button" className="btn-close" onClick={() => setShowScheduleModal(false)} aria-label="Kapat" />
                </div>
                <div className="modal-body">
                  <p className="text-muted fs-sm mb-3">Duyuru, seçtiğiniz tarih ve saatte otomatik yayınlanacak (örn. bayram mesajı 2 gün sonra 09:00).</p>
                  <div className="mb-3">
                    <label className="form-label">Tarih</label>
                    <input
                      type="date"
                      className="form-control"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label">Saat</label>
                    <input
                      type="time"
                      className="form-control"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>İptal</button>
                  <button type="button" className="btn btn-primary" onClick={handleScheduleSubmit}>
                    <i className="ti ti-clock me-1"></i>Planla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationList;
