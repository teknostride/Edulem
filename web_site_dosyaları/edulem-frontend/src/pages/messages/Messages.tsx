import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast, confirmDialog } from '../../utils/toast';

interface User {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  avatar?: string;
  is_online?: boolean;
  last_seen?: string;
  role?: string | { id: number; name: string; display_name: string; level: number };
  role_name?: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Chat {
  id: number;
  user: User;
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

const Messages = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setShowVideoModal] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState<number | ''>('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosClient.get('/messages/conversations');
        const d = res.data?.data ?? res.data;
        const list = Array.isArray(d?.conversations) ? d.conversations : [];
        const cid = d?.current_user_id ?? null;
        setChats(list);
        setCurrentUserId(cid);
        if (list.length > 0) setSelectedChat(list[0]);
        fetchUsers(cid ?? undefined);
      } catch (e) {
        console.error('Konuşmalar yüklenemedi:', e);
        showToast('error', 'Konuşmalar yüklenemedi');
        setChats([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedChat) fetchMessages();
  }, [selectedChat]);

  useEffect(() => {
    if (!searchTerm.trim()) { setFilteredUsers(users); return; }
    const q = searchTerm.toLowerCase();
    setFilteredUsers(users.filter(u =>
      `${u.first_name || ''} ${u.last_name || ''} ${u.name || ''}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    ));
  }, [searchTerm, users]);

  const fetchUsers = async (excludeId?: number) => {
    try {
      const res = await axiosClient.get(
        '/users?per_page=500&for_messaging=1&role=owner,Genel%20M%C3%BCd%C3%BCr,Kamp%C3%BCs%20M%C3%BCd%C3%BCr%C3%BC,M%C3%BCd%C3%BCr,M%C3%BCd%C3%BCr%20Yard%C4%B1mc%C4%B1s%C4%B1,%C3%96%C4%9Fretmen,Rehberlik,%C3%96%C4%9Frenci%20%C4%B0%C5%9Fleri,Muhasebe,S%C4%B1n%C4%B1f%20%C3%96%C4%9Fretmeni'
      );
      const d = res.data?.data ?? res.data;
      let list: User[] = Array.isArray(d?.users) ? d.users : Array.isArray(d) ? d : [];
      if (excludeId != null) list = list.filter(u => u.id !== excludeId);
      const roleOrName = (u: User) =>
        (typeof u.role === 'object' ? u.role?.name || u.role?.display_name || '' : String(u.role_name ?? u.role ?? '')).toLowerCase();
      list = list
        .filter(u => (u.first_name != null || u.last_name != null || u.name != null || u.email))
        .filter(u => roleOrName(u) !== 'öğrenci' && roleOrName(u) !== 'student')
        // Kurucu (owner) her zaman listede kalsın, filtreleme yapma
        .sort((a, b) => {
          // Kurucuları en üste getir
          const aRole = roleOrName(a);
          const bRole = roleOrName(b);
          const aIsOwner = aRole === 'owner';
          const bIsOwner = bRole === 'owner';

          if (aIsOwner && !bIsOwner) return -1;
          if (!aIsOwner && bIsOwner) return 1;

          return `${a.first_name ?? a.name ?? ''} ${a.last_name ?? ''}`.localeCompare(`${b.first_name ?? b.name ?? ''} ${b.last_name ?? ''}`);
        });
      setUsers(list);
    } catch (e) {
      console.error('Kullanıcılar yüklenemedi:', e);
      setUsers([]);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const res = await axiosClient.get(`/messages/messages?user_id=${selectedChat.user.id}`);
      const d = res.data?.data ?? res.data;
      setMessages(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error('Mesajlar yüklenemedi:', e);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;
    try {
      const res = await axiosClient.post('/messages/send', {
        receiver_id: selectedChat.user.id,
        content: messageInput.trim(),
      });
      const newMessage = res.data?.data ?? res.data;
      if (newMessage?.id) {
        setMessages(prev => [...prev, newMessage]);
        const otherId = selectedChat.user?.id;
        const exists = chats.some(c => c.user?.id === otherId);
        if (exists) {
          setChats(prev => prev.map(c => c.user?.id === otherId ? { ...c, last_message: newMessage, updated_at: newMessage.created_at } : c));
        } else {
          const newChat: Chat = { id: otherId!, user: selectedChat.user, last_message: newMessage, unread_count: 0, updated_at: newMessage.created_at };
          setChats(prev => [newChat, ...prev]);
          setSelectedChat(newChat);
        }
      }
      setMessageInput('');
    } catch (e) {
      console.error('Mesaj gönderilemedi:', e);
      showToast('error', 'Mesaj gönderilemedi');
    }
  };

  const getInitials = (u: User | null | undefined) => {
    if (!u) return '?';
    const n = trim(`${u.first_name ?? u.name ?? ''} ${u.last_name ?? ''}`);
    if (!n) return (u.email?.[0] ?? '?').toUpperCase();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} sa`;
    if (diffDays < 7) return `${diffDays} gün`;
    return date.toLocaleDateString('tr-TR');
  };

  const trim = (s: string) => (s || '').trim();
  const displayName = (u: User) => trim(`${u.first_name ?? u.name ?? ''} ${u.last_name ?? ''}`) || u.email || 'İsimsiz';
  const filteredChats = chats.filter(chat =>
    displayName(chat.user).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createNewChat = async () => {
    const uid = typeof newChatUserId === 'number' ? newChatUserId : null;
    const u = users.find(x => x.id === uid);
    if (!u || !newChatMessage.trim()) {
      showToast('error', 'Alıcı ve mesaj girin');
      return;
    }
    try {
      const res = await axiosClient.post('/messages/send', { receiver_id: u.id, content: newChatMessage.trim() });
      const newMessage = res.data?.data ?? res.data;
      const newChat: Chat = {
        id: u.id,
        user: u,
        last_message: newMessage,
        unread_count: 0,
        updated_at: (newMessage?.created_at) || new Date().toISOString(),
      };
      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
      setShowCreateModal(false);
      setNewChatUserId('');
      setNewChatMessage('');
    } catch (e) {
      console.error('Mesaj gönderilemedi:', e);
      showToast('error', 'Mesaj gönderilemedi');
    }
  };

  const deleteMessage = async (messageId: number) => {
    const isConfirmed = await confirmDialog({
      title: 'Silme İşlemi',
      text: 'Bu mesajı silmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal'
    });
    if (!isConfirmed) return;
    try {
      await axiosClient.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e) {
      showToast('error', 'Mesaj silinemedi');
    }
  };

  const deleteConversation = async (userId: number) => {
    const isConfirmed = await confirmDialog({
      title: 'Sohbeti Sil',
      text: 'Bu kişiyle olan tüm sohbetinizi silmek istediğinize emin misiniz? (Karşı taraftan silinmez)',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal'
    });
    if (!isConfirmed) return;
    try {
      await axiosClient.delete(`/messages/conversations/${userId}`);
      setChats(prev => prev.filter(c => c.user.id !== userId));
      setMessages([]);
      setSelectedChat(null);
      showToast('success', 'Sohbet silindi');
    } catch (e) {
      showToast('error', 'Sohbet silinemedi');
    }
  };

  return (
    <div className="container-fluid">
      <div className="page-title-head d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">Kurum İçi Mesajlaşma</h4>
          <p className="text-muted small mb-0 mt-1">Kurum personeli ile özel sohbet. Gelen mesajlar üst menüdeki Mesajlar bildirimi ile görülebilir.</p>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="javascript: void(0);">İletişim</a></li>
            <li className="breadcrumb-item active">Mesajlar</li>
          </ol>
        </div>
      </div>

      <div className="outlook-box gap-1">
        {/* Sidebar */}
        <div className="offcanvas-lg offcanvas-start outlook-left-menu outlook-left-menu-lg" tabIndex={-1} id="chatSidebaroffcanvas">
          <div className="card h-100 mb-0 border-end-0 rounded-end-0">
            <div className="card-header p-3 border-light card-bg d-block">
              <div className="d-flex gap-2">
                <div className="app-search flex-grow-1">
                  <input
                    type="text"
                    className="form-control bg-light-subtle border-light"
                    placeholder="Personel ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="ti ti-search app-search-icon text-muted"></i>
                </div>
                <button
                  className="btn btn-dark btn-icon"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="ti ti-pencil fs-xl"></i>
                </button>
              </div>
            </div>
            <div className="card-body p-2" style={{ height: 'calc(100% - 100px)', overflowY: 'auto' }}>
              {/* Tüm Kişiler - Mesajı olanlar üstte */}
              <div className="list-group list-group-flush">
                <div className="text-muted small px-2 mb-1">Kurum personeli:</div>

                {/* Mesajı olan kullanıcılar (en son mesaja göre üstte) */}
                {filteredChats.map((chat) => (
                  <a
                    key={`chat-${chat.id}`}
                    href="#!"
                    className={`list-group-item list-group-item-action d-flex gap-2 justify-content-between ${selectedChat?.id === chat.id ? 'active' : ''
                      }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <span className="d-flex justify-content-start align-items-center gap-2 overflow-hidden">
                      <span className="avatar avatar-sm flex-shrink-0">
                        <img
                          src={chat.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName(chat.user))}&background=random`}
                          alt={displayName(chat.user)}
                          className="rounded-circle"
                        />
                      </span>
                      <span className="d-flex flex-column overflow-hidden">
                        <span className="text-nowrap fw-semibold fs-base mb-0 lh-base">
                          {displayName(chat.user)}
                        </span>
                        <span className="text-muted d-block fs-xs mb-1 text-truncate">
                          {chat.user.role_name || (typeof chat.user.role === 'object' ? chat.user.role?.display_name : chat.user.role) || 'Personel'}
                        </span>
                        <span className="text-muted d-block fs-xs mb-0 text-truncate">
                          {chat.last_message?.content}
                        </span>
                      </span>
                    </span>
                    <span className="d-flex flex-column gap-1 justify-content-center flex-shrink-0 align-items-end">
                      <span className="text-muted fs-xs">
                        {formatTime(chat.updated_at)}
                      </span>
                      {chat.unread_count > 0 && (
                        <span className="badge text-bg-primary fs-xxs">
                          {chat.unread_count}
                        </span>
                      )}
                    </span>
                  </a>
                ))}

                {/* Mesajı olmayan kullanıcılar (altta, isme göre sıralı) */}
                {filteredUsers
                  .filter(user => !chats.some(chat => chat.user?.id === user.id))
                  .map((user) => (
                    <a
                      key={`user-${user.id}`}
                      href="#!"
                      className={`list-group-item list-group-item-action d-flex gap-2 align-items-center ${selectedChat?.user?.id === user.id ? 'active' : ''
                        }`}
                      onClick={() => {
                        const newChat: Chat = {
                          id: Date.now(),
                          user: user,
                          unread_count: 0,
                          updated_at: new Date().toISOString()
                        };
                        setSelectedChat(newChat);
                        setSearchTerm('');
                      }}
                    >
                      <span className="avatar avatar-sm flex-shrink-0">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName(user))}&background=random`}
                          alt={displayName(user)}
                          className="rounded-circle"
                        />
                      </span>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center">
                          <h6 className="mb-0 fw-medium text-truncate">{displayName(user)}</h6>
                          <span className={`badge rounded-pill ${user.is_online ? 'bg-success' : 'bg-secondary'}`}>
                            {user.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}
                          </span>
                        </div>
                        <p className="mb-0 text-muted small text-truncate fw-medium">
                          {user.role_name || (typeof user.role === 'object' ? user.role?.display_name : user.role) || 'Personel'}
                        </p>
                        <p className="mb-0 text-muted small text-truncate">{user.email}</p>
                      </div>
                    </a>
                  ))}

                {/* Boş durum */}
                {chats.length === 0 && filteredUsers.length === 0 && (
                  <div className="text-center text-muted py-3">
                    <small>Kullanıcı bulunamadı</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="card h-100 mb-0 rounded-start-0 flex-grow-1">
          {selectedChat ? (
            <>
              <div className="card-header card-bg">
                <div className="d-lg-none d-inline-flex gap-2">
                  <button
                    className="btn btn-default btn-icon"
                    type="button"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#chatSidebaroffcanvas"
                  >
                    <i className="ti ti-menu-4 fs-lg"></i>
                  </button>
                </div>

                <div className="flex-grow-1">
                  <h5 className="mb-1 lh-base fs-lg">
                    <a href="#!" className="link-reset">
                      {displayName(selectedChat.user)}
                    </a>
                  </h5>
                  <p className="mb-0 lh-sm text-muted" style={{ paddingTop: '1px' }}>
                    <i className={`ti ti-circle-filled ${selectedChat.user.is_online ? 'text-success' : 'text-muted'}`}></i>
                    {selectedChat.user.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </p>
                </div>

                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-sm btn-icon btn-outline-danger border-0"
                    onClick={() => deleteConversation(selectedChat.user.id)}
                    title="Tüm Sohbeti Sil"
                  >
                    <i className="ti ti-trash fs-lg"></i>
                  </button>
                </div>
              </div>

              <div className="card-body pt-0 mb-5 pb-2" style={{ maxHeight: 'calc(100vh - 317px)', overflowY: 'auto' }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`d-flex align-items-start gap-2 my-3 chat-item ${message.sender_id === currentUserId ? 'text-end justify-content-end' : ''}`}
                  >
                    {message.sender_id !== currentUserId && (
                      <span className="avatar avatar-md flex-shrink-0">
                        {selectedChat.user.avatar ? (
                          <img src={selectedChat.user.avatar} className="rounded-circle" alt="User" />
                        ) : (
                          <span className="avatar-title text-bg-primary fw-bold rounded-circle">
                            {getInitials(selectedChat?.user)}
                          </span>
                        )}
                      </span>
                    )}
                    <div style={{ position: 'relative' }} className="chat-msg-wrapper">
                      <div
                        className={`chat-message py-2 px-3 rounded ${message.sender_id === currentUserId ? 'bg-info-subtle' : 'bg-warning-subtle'}`}
                      >
                        {message.content}
                      </div>
                      <div className={`text-muted fs-xs mt-1 d-flex align-items-center gap-1 ${message.sender_id === currentUserId ? 'justify-content-end' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
                          <path d="M12 7v5l3 3"></path>
                        </svg>
                        <span>
                          {new Date(message.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.sender_id === currentUserId && (
                          <span className="ms-1 d-flex align-items-center" style={{ lineHeight: 1 }}>
                            {message.is_read ? (
                              <i className="ti ti-checks text-primary" style={{ fontSize: '15px' }} title="Okundu"></i>
                            ) : (
                              <i className="ti ti-check" style={{ fontSize: '15px' }} title="İletildi"></i>
                            )}
                          </span>
                        )}
                        {/* Silme butonu — sadece kendi mesajı, hover'da görünür */}
                        {message.sender_id === currentUserId && (
                          <button
                            className="chat-delete-btn"
                            onClick={() => deleteMessage(message.id)}
                            title="Mesajı sil"
                          >
                            <i className="ti ti-trash" style={{ fontSize: '13px' }}></i>
                          </button>
                        )}
                      </div>
                    </div>
                    {message.sender_id === currentUserId && (
                      <span className="avatar avatar-md flex-shrink-0">
                        <span className="avatar-title text-bg-primary fw-bold rounded-circle">Siz</span>
                      </span>
                    )}
                  </div>
                ))}

              </div>

              <div className="card-footer bg-body-secondary border-top border-dashed border-bottom-0 position-absolute bottom-0 w-100">
                <div className="d-flex gap-2">
                  <div className="app-search flex-grow-1">
                    <input
                      type="text"
                      className="form-control py-2 bg-light-subtle border-light"
                      placeholder="Mesajınızı yazın..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <i className="ti ti-message app-search-icon text-muted"></i>
                  </div>
                  <button onClick={sendMessage} className="btn btn-primary">
                    Gönder
                    <i className="ti ti-send-2 ms-1 fs-xl"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card-body d-flex align-items-center justify-content-center">
              <div className="text-center">
                <i className="ti ti-message-circle fs-1 text-muted mb-3"></i>
                <h5>Sohbet başlatmak için soldan bir personel seçin</h5>
                <p className="text-muted">Kurum personeli ile özel mesajlaşma; gelen mesajlar bildirimde görünür</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yeni sohbet modal */}
      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Yeni sohbet</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createNewChat(); }}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Alıcı</label>
                    <select
                      className="form-select"
                      value={newChatUserId}
                      onChange={(e) => setNewChatUserId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">Kişi seçin</option>
                      {users.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{displayName(u)}{u.email ? ` (${u.email})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-0">
                    <label className="form-label">İlk mesaj</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Mesajınızı yazın..."
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary">Gönder</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Video/Audio modals kaldırıldı - kurum içi sadece metin mesajı */}
      {false && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-0">
                <h5 className="modal-title">Starting Video Call</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowVideoModal(false)}></button>
              </div>
              <div className="modal-body d-flex flex-column align-items-center justify-content-center text-center py-5">
                <div className="mb-4">
                  {selectedChat?.user?.avatar ? (
                    <img src={selectedChat?.user?.avatar} className="rounded-circle shadow" alt="User Photo" width="150" height="150" />
                  ) : (
                    <div className="rounded-circle shadow bg-primary d-flex align-items-center justify-content-center" style={{ width: '150px', height: '150px' }}>
                      <span className="text-white fs-1">
                        {getInitials(selectedChat?.user)}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="fw-semibold mb-1">
                  {selectedChat?.user.first_name} {selectedChat?.user.last_name}
                </h3>
                <p className="text-muted mb-4">Connecting to call...</p>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light d-flex align-items-center gap-2">
                    <i className="ti ti-video"></i>
                    Camera On
                  </button>
                  <button type="button" className="btn btn-light d-flex align-items-center gap-2">
                    <i className="ti ti-microphone"></i>
                    Mic On
                  </button>
                  <button type="button" className="btn btn-danger d-flex align-items-center gap-2" onClick={() => setShowVideoModal(false)}>
                    <i className="ti ti-phone-call"></i>
                    End Call
                  </button>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <span className="text-muted fst-italic">Make sure your devices are connected before starting the call</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {false && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-0">
                <h5 className="modal-title">Starting Audio Call</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { }}></button>
              </div>
              <div className="modal-body d-flex flex-column align-items-center justify-content-center text-center py-5">
                <div className="mb-4">
                  {selectedChat?.user?.avatar ? (
                    <img src={selectedChat?.user?.avatar} className="rounded-circle shadow" alt="User Photo" width="120" height="120" />
                  ) : (
                    <div className="rounded-circle shadow bg-primary d-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                      <span className="text-white fs-1">
                        {getInitials(selectedChat?.user)}
                      </span>
                    </div>
                  )}
                </div>
                <h4 className="fw-semibold mb-1">
                  {selectedChat?.user.first_name} {selectedChat?.user.last_name}
                </h4>
                <p className="text-muted mb-4">Calling...</p>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light d-flex align-items-center gap-2">
                    <i className="ti ti-microphone"></i>
                    Mic On
                  </button>
                  <button type="button" className="btn btn-light d-flex align-items-center gap-2">
                    <i className="ti ti-volume"></i>
                    Speaker On
                  </button>
                  <button type="button" className="btn btn-danger d-flex align-items-center gap-2" onClick={() => { }}>
                    <i className="ti ti-phone-call"></i>
                    End Call
                  </button>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <span className="text-muted fst-italic">Ensure your microphone is working properly</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
