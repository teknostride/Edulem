import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Message {
  id: number;
  subject: string;
  content: string;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  sender_role: string;
  recipient_id: number;
  recipient_name: string;
  recipient_avatar: string;
  recipient_role: string;
  created_at: string;
  read: boolean;
  type: 'personal' | 'announcement' | 'system';
  reply_count: number;
  last_message?: string;
  last_message_time?: string;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  role: string | { name?: string; display_name?: string };
  is_online: boolean;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const MessageList = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient_id: 0,
    subject: '',
    content: ''
  });
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [currentPage, filter, searchTerm]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(filter !== 'all' && { type: filter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await axiosClient.get(`/messages?${params}`);
      setMessages(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error);
      showToast('error', 'Mesajlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosClient.get(
        '/users?per_page=500&for_messaging=1&role=owner,Genel%20M%C3%BCd%C3%BCr,Kamp%C3%BCs%20M%C3%BCd%C3%BCr%C3%BC,M%C3%BCd%C3%BCr,M%C3%BCd%C3%BCr%20Yard%C4%B1mc%C4%B1s%C4%B1,%C3%96%C4%9Fretmen,Rehberlik,%C3%96%C4%9Frenci%20%C4%B0%C5%9Fleri,Muhasebe,S%C4%B1n%C4%B1f%20%C3%96%C4%9Fretmeni'
      );
      const d = response.data?.data ?? response.data;
      const list = Array.isArray(d?.users) ? d.users : Array.isArray(d) ? d : [];
      setUsers(list);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      setUsers([]);
    }
  };

  const handleSendMessage = async () => {
    if (!composeData.recipient_id || !composeData.subject || !composeData.content.trim()) {
      showToast('error', 'Lütfen tüm alanları doldurun');
      return;
    }

    try {
      await axiosClient.post('/messages', composeData);
      showToast('success', 'Mesaj başarıyla gönderildi');
      setShowCompose(false);
      setComposeData({ recipient_id: 0, subject: '', content: '' });
      fetchMessages();
    } catch (error) {
      console.error('Mesaj gönderilemedi:', error);
      showToast('error', 'Mesaj gönderilemedi');
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await axiosClient.put(`/messages/${messageId}/read`);
      setMessages(prev => {
        const msgIndex = prev.findIndex(m => m.id === messageId);
        if (msgIndex !== -1 && !prev[msgIndex].read) {
          window.dispatchEvent(new CustomEvent('messageRead'));
        }
        return prev.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        );
      });
    } catch (error) {
      console.error('Mesaj okundu işaretlenemedi:', error);
    }
  };

  const handleDelete = async (messageId: number) => {
    const ok = await confirmDialog({
      text: 'Bu mesajı silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      const msgToDelete = messages.find(m => m.id === messageId);
      await axiosClient.delete(`/messages/${messageId}`);
      if (msgToDelete && !msgToDelete.read) {
        window.dispatchEvent(new CustomEvent('messageRead'));
      }
      showToast('success', 'Mesaj başarıyla silindi');
      fetchMessages();
    } catch (error) {
      console.error('Mesaj silinemedi:', error);
      showToast('error', 'Mesaj silinemedi');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return 'ti ti-message-circle';
      case 'announcement': return 'ti ti-bullhorn';
      case 'system': return 'ti ti-info-circle';
      default: return 'ti ti-message';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personal': return 'primary';
      case 'announcement': return 'warning';
      case 'system': return 'info';
      default: return 'secondary';
    }
  };

  const getUnreadCount = () => {
    return messages.filter(msg => !msg.read).length;
  };

  const filteredMessages = messages.filter(message => {
    if (filter !== 'all' && message.type !== filter) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        message.subject.toLowerCase().includes(searchLower) ||
        message.content.toLowerCase().includes(searchLower) ||
        message.sender_name.toLowerCase().includes(searchLower) ||
        message.recipient_name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">Mesajlar</h4>
          <small className="text-muted">Kullanıcılar arası mesajlaşma</small>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group" role="group">
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('all')}
            >
              Tümü
            </button>
            <button
              className={`btn ${filter === 'personal' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('personal')}
            >
              Kişisel
            </button>
            <button
              className={`btn ${filter === 'announcement' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('announcement')}
            >
              Duyurular
            </button>
            <button
              className={`btn ${filter === 'system' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('system')}
            >
              Sistem
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCompose(true)}
          >
            <i className="ti ti-plus me-1"></i>
            Yeni Mesaj
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-primary text-primary rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-message-circle"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{getUnreadCount()}</h5>
                  <p className="text-muted mb-0">Okunmamış</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-success text-success rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-send"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{messages.length}</h5>
                  <p className="text-muted mb-0">Toplam Mesaj</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-warning text-warning rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-users"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">{users.length}</h5>
                  <p className="text-muted mb-0">Kullanıcı</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="avatar-sm bg-soft-info text-info rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ti ti-bell"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-0">
                    {messages.filter(m => m.type === 'announcement').length}
                  </h5>
                  <p className="text-muted mb-0">Duyuru</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arama */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Mesaj ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mesaj Listesi */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="list-group list-group-flush">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="text-muted">
                      <i className="ti ti-message-circle fs-1 d-block mb-2"></i>
                      {filter === 'all' ? 'Henüz mesaj bulunmuyor' : `Henüz ${filter === 'personal' ? 'kişisel' : filter === 'announcement' ? 'duyuru' : 'sistem'} mesajı bulunmuyor`}
                    </div>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`list-group-item list-group-item-action ${!message.read ? 'bg-light' : ''}`}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div className="flex-shrink-0">
                          {message.sender_avatar ? (
                            <img
                              src={message.sender_avatar}
                              alt="User Avatar"
                              className="avatar-md rounded-circle"
                            />
                          ) : (
                            <div className={`avatar-md bg-soft-${getTypeColor(message.type)} text-${getTypeColor(message.type)} rounded-circle d-flex align-items-center justify-content-center`}>
                              <i className={`${getTypeIcon(message.type)} fs-4`}></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">{message.subject}</h6>
                              <p className="text-muted mb-2">{message.content}</p>
                              <small className="text-muted">
                                {message.sender_name && `${message.sender_name} • `}
                                {new Date(message.created_at).toLocaleString('tr-TR')}
                              </small>
                            </div>
                            <div className="d-flex gap-1">
                              {!message.read && (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleMarkAsRead(message.id)}
                                  title="Okundu işaretle"
                                >
                                  <i className="ti ti-check"></i>
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(message.id)}
                                title="Sil"
                              >
                                <i className="ti ti-x"></i>
                              </button>
                            </div>
                          </div>
                          {message.reply_count > 0 && (
                            <div className="mt-2">
                              <small className="text-muted">
                                <i className="ti ti-corner-down-left me-1"></i>
                                {message.reply_count} cevap
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sayfalama */}
              {pagination && pagination.last_page > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted">
                    Toplam {pagination.total} mesaj
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <i className="ti ti-chevron-left"></i>
                        </button>
                      </li>
                      {[...Array(pagination.last_page)].map((_, index) => {
                        const page = index + 1;
                        return (
                          <li
                            key={page}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === pagination.last_page}
                        >
                          <i className="ti ti-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mesaj Gönderme Modal */}
      {showCompose && (
        <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Yeni Mesaj</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCompose(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="recipient" className="form-label">Alıcı</label>
                  <select
                    className="form-select"
                    id="recipient"
                    value={composeData.recipient_id}
                    onChange={(e) => setComposeData(prev => ({ ...prev, recipient_id: parseInt(e.target.value) }))}
                  >
                    <option value="">Alıcı seçin</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({typeof user.role === 'object' ? ((user.role as any)?.name || (user.role as any)?.display_name || '') : (user.role || '')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="subject" className="form-label">Konu</label>
                  <input
                    type="text"
                    className="form-control"
                    id="subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Mesaj konusu"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="content" className="form-label">Mesaj</label>
                  <textarea
                    className="form-control"
                    id="content"
                    rows={4}
                    value={composeData.content}
                    onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Mesajınızı buraya yazın..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompose(false)}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendMessage}
                >
                  <i className="ti ti-send me-1"></i>
                  Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
