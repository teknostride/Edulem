import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface SmsTemplate {
    id: number;
    name: string;
    code: string;
    content: string;
    type: string;
    is_active: boolean;
    created_at: string;
}

interface BirthdaySettings {
    staff_enabled: boolean;
    staff_time: string;
    staff_template: string;
    student_enabled: boolean;
    student_time: string;
    student_recipient: 'student' | 'guardian' | 'both';
    student_template: string;
    guardian_template?: string;
    tenant_name?: string;
}

interface GuardianInfo {
    id: number;
    name: string;
    phone?: string;
    has_phone: boolean;
    relation?: string;
    is_legal?: boolean;
    sent_today?: boolean;
}

interface TodayBirthdayPerson {
    id: number;
    name: string;
    phone?: string;
    has_phone: boolean;
    has_any_contact?: boolean;
    age?: number | null;
    title?: string;
    school_no?: string;
    birth_date?: string;
    classroom?: string;
    sent_today?: boolean;
    student_sent_today?: boolean;
    guardian_phone_count?: number;
    guardian_sent_count?: number;
    guardians?: GuardianInfo[];
}

interface TodayBirthdayData {
    date: string;
    current_time?: string;
    staff_count: number;
    student_count: number;
    staff_sent_count?: number;
    student_sent_count?: number;
    staff: TodayBirthdayPerson[];
    students: TodayBirthdayPerson[];
}

interface UpcomingBirthdayPerson {
    id: number;
    name: string;
    type: 'staff' | 'student';
    type_label: string;
    title?: string;
    phone?: string;
    has_phone: boolean;
    has_any_contact?: boolean;
    birth_date?: string;
    days_left: number;
    next_birthday: string;
    next_birthday_formatted: string;
    day_month: string;
    turning_age?: number | null;
    guardians?: GuardianInfo[];
}

interface UpcomingBirthdayData {
    days_window: number;
    total_count: number;
    staff_count: number;
    student_count: number;
    items: UpcomingBirthdayPerson[];
}

const SmsTemplateList = () => {
    const [activeTab, setActiveTab] = useState<'templates' | 'birthday'>('templates');

    // Tab 1: Template List States
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);

    // Tab 2: Birthday Settings States
    const [loadingBirthday, setLoadingBirthday] = useState(false);
    const [savingBirthday, setSavingBirthday] = useState(false);
    const [sendingToday, setSendingToday] = useState(false);
    const [showTodayDetails, setShowTodayDetails] = useState(false);

    const [birthdaySettings, setBirthdaySettings] = useState<BirthdaySettings>({
        staff_enabled: true,
        staff_time: '09:00',
        staff_template: 'Sayın {ad_soyad}, {kurum_adi} ailesi olarak doğum gününüzü en içten dileklerimizle kutlar, sevdiklerinizle birlikte sağlıklı, mutlu ve huzurlu bir ömür dileriz.',
        student_enabled: true,
        student_time: '09:30',
        student_recipient: 'both',
        student_template: 'Sevgili {ogrenci_adi}, {kurum_adi} ailesi olarak yeni yaşını en içten dileklerimizle kutlar; sağlık, mutluluk ve üstün başarılar dileriz.',
        guardian_template: 'Sayın Velimiz, değerli öğrencimiz {ogrenci_adi}\'nin doğum gününü {kurum_adi} ailesi olarak kutlar; evladınızla birlikte sağlıklı, huzurlu ve başarılı nice mutlu yaşlar dileriz.',
        tenant_name: 'EduLem',
    });

    const [todayData, setTodayData] = useState<TodayBirthdayData | null>(null);
    const [upcomingData, setUpcomingData] = useState<UpcomingBirthdayData | null>(null);
    const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'staff' | 'student'>('all');
    const [studentSubTab, setStudentSubTab] = useState<'student' | 'guardian'>('student');

    // Ref pointers for textarea insertion
    const staffTextareaRef = useRef<HTMLTextAreaElement>(null);
    const studentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const guardianTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchTemplates();
        fetchBirthdaySettings();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const res = await axiosClient.get('/sms/templates');
            setTemplates(res.data.data.templates || res.data.data || []);
        } catch (error) {
            showToast('error', 'Şablonlar yüklenemedi');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const fetchBirthdaySettings = async () => {
        try {
            setLoadingBirthday(true);
            const res = await axiosClient.get('/sms/birthday-settings');
            if (res.data?.data) {
                if (res.data.data.settings) {
                    setBirthdaySettings(prev => ({
                        ...prev,
                        ...res.data.data.settings,
                    }));
                }
                if (res.data.data.today) {
                    setTodayData(res.data.data.today);
                }
                if (res.data.data.upcoming) {
                    setUpcomingData(res.data.data.upcoming);
                }
            }
        } catch (error) {
            console.error('Doğum günü ayarları yüklenirken hata oluştu', error);
        } finally {
            setLoadingBirthday(false);
        }
    };

    const handleSaveBirthdaySettings = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            setSavingBirthday(true);
            const res = await axiosClient.post('/sms/birthday-settings', birthdaySettings);
            showToast('success', res.data?.message || 'Doğum günü SMS ayarları başarıyla kaydedildi. Belirlenen saatlerde otomatik gönderilecektir.');
            // Refresh to update today's status
            fetchBirthdaySettings();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Ayarlar kaydedilemedi.');
        } finally {
            setSavingBirthday(false);
        }
    };

    const handleSendTodayNow = async () => {
        const total = (todayData?.staff_count || 0) + (todayData?.student_count || 0);
        if (total === 0) {
            showToast('info', 'Bugün doğum günü olan kayıtlı personel veya öğrenci bulunmuyor.');
            return;
        }

        const confirmSend = window.confirm(
            `Bugün doğum günü olan ${todayData?.staff_count || 0} personel ve ${todayData?.student_count || 0} öğrenciye doğum günü tebrik SMS'leri manuel olarak şimdi gönderilsin mi?\n\n(Not: Sistem zaten belirlenen saatte otomatik olarak göndermektedir.)`
        );
        if (!confirmSend) return;

        try {
            setSendingToday(true);
            const res = await axiosClient.post('/sms/birthday-settings/send-today');
            showToast('success', res.data?.message || "Doğum günü SMS'leri gönderildi.");
            fetchBirthdaySettings();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Gönderim sırasında bir hata oluştu.');
        } finally {
            setSendingToday(false);
        }
    };

    const insertVariable = (target: 'staff' | 'student' | 'guardian', variableName: string) => {
        const textToInsert = `{${variableName}}`;
        if (target === 'staff') {
            const textarea = staffTextareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const prev = birthdaySettings.staff_template;
                const next = prev.substring(0, start) + textToInsert + prev.substring(end);
                setBirthdaySettings({ ...birthdaySettings, staff_template: next });
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                }, 0);
            } else {
                setBirthdaySettings({
                    ...birthdaySettings,
                    staff_template: birthdaySettings.staff_template + ' ' + textToInsert,
                });
            }
        } else if (target === 'guardian') {
            const textarea = guardianTextareaRef.current;
            const currentTpl = birthdaySettings.guardian_template || '';
            if (textarea) {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const next = currentTpl.substring(0, start) + textToInsert + currentTpl.substring(end);
                setBirthdaySettings({ ...birthdaySettings, guardian_template: next });
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                }, 0);
            } else {
                setBirthdaySettings({
                    ...birthdaySettings,
                    guardian_template: currentTpl + ' ' + textToInsert,
                });
            }
        } else {
            const textarea = studentTextareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const prev = birthdaySettings.student_template;
                const next = prev.substring(0, start) + textToInsert + prev.substring(end);
                setBirthdaySettings({ ...birthdaySettings, student_template: next });
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                }, 0);
            } else {
                setBirthdaySettings({
                    ...birthdaySettings,
                    student_template: birthdaySettings.student_template + ' ' + textToInsert,
                });
            }
        }
    };

    // Calculate GSM segments
    const getSmsCount = (text: string) => {
        const len = text.length;
        if (len === 0) return { chars: 0, sms: 1 };
        return {
            chars: len,
            sms: len <= 160 ? 1 : Math.ceil(len / 153),
        };
    };

    const staffSmsStats = getSmsCount(birthdaySettings.staff_template);
    const studentSmsStats = getSmsCount(birthdaySettings.student_template);
    const guardianSmsStats = getSmsCount(birthdaySettings.guardian_template || '');

    // Live previews
    const previewStaffMsg = birthdaySettings.staff_template
        .replace(/{ad_soyad}/g, 'Ahmet Yılmaz')
        .replace(/{kurum_adi}/g, birthdaySettings.tenant_name || 'Kurum Adı')
        .replace(/{yas}/g, '34');

    const previewStudentMsg = birthdaySettings.student_template
        .replace(/{ogrenci_adi}/g, 'Zeynep Kaya')
        .replace(/{okul_no}/g, '342')
        .replace(/{sinif}/g, '10-A')
        .replace(/{kurum_adi}/g, birthdaySettings.tenant_name || 'Kurum Adı')
        .replace(/{yas}/g, '16');

    const previewGuardianMsg = (birthdaySettings.guardian_template || '')
        .replace(/{ogrenci_adi}/g, 'Zeynep Kaya')
        .replace(/{veli_adi}/g, 'Ayşe Kaya')
        .replace(/{okul_no}/g, '342')
        .replace(/{sinif}/g, '10-A')
        .replace(/{kurum_adi}/g, birthdaySettings.tenant_name || 'Kurum Adı')
        .replace(/{yas}/g, '16');

    const totalTodayCount = (todayData?.staff_count || 0) + (todayData?.student_count || 0);

    const filteredUpcomingItems = (upcomingData?.items || []).filter(item => {
        if (upcomingFilter === 'staff') return item.type === 'staff';
        if (upcomingFilter === 'student') return item.type === 'student';
        return true;
    });

    return (
        <div className="container-fluid">
            {/* Header & Breadcrumb */}
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0 d-flex align-items-center gap-2">
                        <span>SMS Şablonları & Otomasyonu</span>
                    </h3>
                    <p className="text-muted mb-0">SMS taslaklarınızı yönetin ve otomatik doğum günü tebrik mesajlarını yapılandırın.</p>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="text-end d-none d-md-block">
                        <ol className="breadcrumb m-0 py-0">
                            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Anasayfa</Link></li>
                            <li className="breadcrumb-item"><Link to="/sms/history" className="text-decoration-none text-muted">SMS Merkezi</Link></li>
                            <li className="breadcrumb-item active fw-medium">Şablonlar</li>
                        </ol>
                    </div>
                    {activeTab === 'templates' && (
                        <Link to="/sms/templates/create" className="btn btn-primary d-flex align-items-center shadow-sm">
                            <i className="ti ti-plus me-1"></i> Yeni Şablon Ekle
                        </Link>
                    )}
                </div>
            </div>

            {/* Nav Tabs */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-2">
                    <ul className="nav nav-pills gap-2">
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link px-4 py-2 d-flex align-items-center gap-2 fw-medium ${activeTab === 'templates' ? 'active shadow-sm' : 'text-dark'}`}
                                onClick={() => setActiveTab('templates')}
                            >
                                <i className="ti ti-template fs-5"></i>
                                <span>Genel SMS Şablonları</span>
                                <span className={`badge rounded-pill ${activeTab === 'templates' ? 'bg-white text-primary' : 'bg-light text-muted'}`}>
                                    {templates.length}
                                </span>
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link px-4 py-2 d-flex align-items-center gap-2 fw-medium ${activeTab === 'birthday' ? 'active shadow-sm' : 'text-dark'}`}
                                onClick={() => setActiveTab('birthday')}
                            >
                                <i className="ti ti-cake fs-5"></i>
                                <span>Otomatik Doğum Günü Mesajları</span>
                                {totalTodayCount > 0 ? (
                                    <span className={`badge rounded-pill ${activeTab === 'birthday' ? 'bg-white text-danger' : 'bg-danger text-white'}`}>
                                        Bugün: {totalTodayCount}
                                    </span>
                                ) : (
                                    <span className="badge rounded-pill bg-success-subtle text-success">
                                        Tam Otomatik
                                    </span>
                                )}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* TAB 1: Standart Şablonlar */}
            {activeTab === 'templates' && (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-3">Başlık / Kod</th>
                                        <th>Mesaj İçeriği</th>
                                        <th>Tür</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingTemplates ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-5">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </td>
                                        </tr>
                                    ) : templates.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-5 text-muted">Henüz şablon bulunmuyor.</td>
                                        </tr>
                                    ) : (
                                        templates.map(template => (
                                            <tr key={template.id}>
                                                <td className="ps-3">
                                                    <div className="fw-bold">{template.name}</div>
                                                    <small className="text-muted">{template.code}</small>
                                                </td>
                                                <td>
                                                    <div className="text-truncate" style={{ maxWidth: '380px' }} title={template.content}>
                                                        {template.content}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge bg-soft-info text-info">
                                                        {template.type === 'general' ? 'Genel' :
                                                            template.type === 'attendance' ? 'Yoklama' :
                                                                template.type === 'exam' ? 'Sınav' : template.type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${template.is_active ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                                                        {template.is_active ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Doğum Günü Mesaj Ayarları */}
            {activeTab === 'birthday' && (
                <div>
                    {loadingBirthday ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="text-muted mt-2">Doğum günü ayarları yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* Otomasyon Bilgi & Bugünkü Durum Kartı */}
                            <div className="card border-0 shadow-sm mb-4 bg-gradient-birthday text-white overflow-hidden">
                                <div className="card-body p-4 position-relative">
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="birthday-icon-circle bg-white text-primary shadow-sm">
                                                <i className="ti ti-cake fs-2"></i>
                                            </div>
                                            <div>
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <h5 className="fw-bold mb-0 text-white">Doğum Günü SMS Otomasyonu</h5>
                                                    <span className="badge bg-success text-white fw-bold d-flex align-items-center gap-1 shadow-sm">
                                                        <i className="ti ti-bolt"></i> Tam Otomatik Çalışır
                                                    </span>
                                                    <span className="badge bg-white-20 text-white">
                                                        {todayData?.date || new Date().toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                                <p className="mb-0 text-white-75 mt-1 small">
                                                    Sistem her gün doğum günü gelen personel ve öğrencileri otomatik tespit eder ve belirlediğiniz şablonla otomatik olarak SMS gönderir.
                                                </p>
                                                <div className="d-flex align-items-center gap-3 mt-2 flex-wrap text-white-75 small">
                                                    <span><i className="ti ti-clock me-1"></i> Personel Saati: <strong>{birthdaySettings.staff_time}</strong></span>
                                                    <span><i className="ti ti-clock me-1"></i> Öğrenci Saati: <strong>{birthdaySettings.student_time}</strong></span>
                                                    {totalTodayCount > 0 && (
                                                        <span className="badge bg-white text-dark">
                                                            Bugün Doğum Günü: {todayData?.staff_count} Personel, {todayData?.student_count} Öğrenci
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {totalTodayCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-light d-flex align-items-center gap-1 btn-sm"
                                                    onClick={() => setShowTodayDetails(!showTodayDetails)}
                                                >
                                                    <i className={`ti ${showTodayDetails ? 'ti-chevron-up' : 'ti-eye'} fs-6`}></i>
                                                    <span>{showTodayDetails ? 'Listeyi Kapat' : 'Bugünkü Kişileri Gör'}</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-light text-primary fw-bold d-flex align-items-center gap-1 shadow-sm btn-sm"
                                                onClick={handleSendTodayNow}
                                                disabled={sendingToday || totalTodayCount === 0}
                                                title="Sistem otomatik saati beklemeden bugünkü SMS'leri anında şimdi tetikler"
                                            >
                                                {sendingToday ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm"></span>
                                                        <span>Gönderiliyor...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ti ti-send fs-6"></i>
                                                        <span>Şimdi Manuel Tetikle</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Collapsible List of Today's Celebrants */}
                                    {showTodayDetails && todayData && (
                                        <div className="mt-4 pt-3 border-top border-white-25 bg-black-10 rounded p-3">
                                            <div className="row g-3">
                                                {/* Staff */}
                                                <div className="col-md-6">
                                                    <h6 className="fw-bold text-white mb-2 d-flex align-items-center gap-2">
                                                        <i className="ti ti-users"></i> Bugün Doğan Personeller ({todayData.staff.length})
                                                    </h6>
                                                    {todayData.staff.length === 0 ? (
                                                        <small className="text-white-50">Bugün personellerden doğum günü olan yok.</small>
                                                    ) : (
                                                        <div className="list-group list-group-flush rounded bg-white text-dark p-2">
                                                            {todayData.staff.map(s => (
                                                                <div key={s.id} className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom last-border-0">
                                                                    <div>
                                                                        <div className="fw-bold">{s.name}</div>
                                                                        <small className="text-muted">{s.title || 'Personel'} {s.age ? `• ${s.age} yaşında` : ''}</small>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-1">
                                                                        {s.has_phone ? (
                                                                            <span className="badge bg-soft-success text-success"><i className="ti ti-phone me-1"></i>{s.phone}</span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-danger text-danger"><i className="ti ti-phone-off me-1"></i>Telefon Yok</span>
                                                                        )}
                                                                        {s.sent_today ? (
                                                                            <span className="badge bg-success text-white" title="Bugün otomatik gönderildi">
                                                                                <i className="ti ti-check me-1"></i>Gönderildi
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-warning text-warning" title="Saatinde otomatik gönderilecek">
                                                                                <i className="ti ti-clock me-1"></i>Bekliyor
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Students */}
                                                <div className="col-md-6">
                                                    <h6 className="fw-bold text-white mb-2 d-flex align-items-center gap-2">
                                                        <i className="ti ti-school"></i> Bugün Doğan Öğrenciler ({todayData.students.length})
                                                    </h6>
                                                    {todayData.students.length === 0 ? (
                                                        <small className="text-white-50">Bugün öğrencilerden doğum günü olan yok.</small>
                                                    ) : (
                                                        <div className="list-group list-group-flush rounded bg-white text-dark p-2">
                                                            {todayData.students.map(st => (
                                                                <div key={st.id} className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom last-border-0">
                                                                    <div>
                                                                        <div className="fw-bold">{st.name}</div>
                                                                        <small className="text-muted">{st.classroom} {st.school_no ? `(No: ${st.school_no})` : ''} {st.age ? `• ${st.age} yaşında` : ''}</small>
                                                                    </div>
                                                                    <div className="text-end d-flex align-items-center gap-1">
                                                                        {st.has_phone ? (
                                                                            <span className="badge bg-soft-success text-success">Öğr: {st.phone}</span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-warning text-warning">Öğr Tel Yok</span>
                                                                        )}
                                                                        {st.guardians && st.guardians.length > 0 && (
                                                                            <span className="badge bg-soft-info text-info">
                                                                                {st.guardians.length} Veli
                                                                            </span>
                                                                        )}
                                                                        {st.sent_today ? (
                                                                            <span className="badge bg-success text-white" title="Bugün otomatik gönderildi">
                                                                                <i className="ti ti-check me-1"></i>Gönderildi
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-warning text-warning" title="Saatinde otomatik gönderilecek">
                                                                                <i className="ti ti-clock me-1"></i>Bekliyor
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Birthday Settings Forms */}
                            <form onSubmit={handleSaveBirthdaySettings}>
                                <div className="row g-4">
                                    {/* 1. Personel Doğum Günü SMS Kartı */}
                                    <div className="col-lg-6">
                                        <div className="card border-0 shadow-sm h-100">
                                            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="badge-icon-box bg-soft-primary text-primary">
                                                        <i className="ti ti-user-check fs-5"></i>
                                                    </div>
                                                    <div>
                                                        <h5 className="card-title mb-0 fw-bold">Personel Doğum Günü Otomasyonu</h5>
                                                        <small className="text-muted">Doğum gününde tüm personele otomatik gönderilecek mesaj.</small>
                                                    </div>
                                                </div>
                                                <div className="form-check form-switch m-0">
                                                    <input
                                                        className="form-check-input fs-5 cursor-pointer"
                                                        type="checkbox"
                                                        role="switch"
                                                        id="staffEnabledSwitch"
                                                        checked={birthdaySettings.staff_enabled}
                                                        onChange={e => setBirthdaySettings({ ...birthdaySettings, staff_enabled: e.target.checked })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="card-body">
                                                {/* Bilgi Kutusu */}
                                                <div className="alert alert-light border d-flex align-items-center gap-2 py-2 px-3 mb-3 small">
                                                    <i className="ti ti-info-circle text-primary fs-5"></i>
                                                    <span>
                                                        Sistem her gün saat <strong>{birthdaySettings.staff_time}</strong>'da doğum günü olan personelleri otomatik tespit edip SMS gönderir.
                                                    </span>
                                                </div>

                                                {/* Gönderim Saati */}
                                                <div className="row mb-3 align-items-center">
                                                    <label className="col-sm-4 col-form-label fw-medium text-dark">
                                                        <i className="ti ti-clock me-1 text-muted"></i> Gönderim Saati
                                                    </label>
                                                    <div className="col-sm-8">
                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={birthdaySettings.staff_time}
                                                            onChange={e => setBirthdaySettings({ ...birthdaySettings, staff_time: e.target.value })}
                                                            disabled={!birthdaySettings.staff_enabled}
                                                        />
                                                        <small className="text-muted">Her gün bu saatte arka planda otomatik gönderilir.</small>
                                                    </div>
                                                </div>

                                                {/* Değişken Ekle Butonları */}
                                                <div className="mb-2">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <label className="form-label fw-medium text-dark mb-0">Standart Mesaj Şablonu</label>
                                                        <span className={`small fw-semibold ${staffSmsStats.chars > 160 ? 'text-warning' : 'text-muted'}`}>
                                                            {staffSmsStats.chars} Karakter • {staffSmsStats.sms} SMS
                                                        </span>
                                                    </div>
                                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                                        <span className="text-muted small align-self-center me-1">Parametre Ekle:</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline-primary rounded-pill px-2 py-1"
                                                            onClick={() => insertVariable('staff', 'ad_soyad')}
                                                            title="Personelin Adı Soyadı"
                                                        >
                                                            + {'{ad_soyad}'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline-primary rounded-pill px-2 py-1"
                                                            onClick={() => insertVariable('staff', 'kurum_adi')}
                                                            title="Kurumunuzun Adı"
                                                        >
                                                            + {'{kurum_adi}'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline-primary rounded-pill px-2 py-1"
                                                            onClick={() => insertVariable('staff', 'yas')}
                                                            title="Personelin Yeni Yaşı"
                                                        >
                                                            + {'{yas}'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Textarea */}
                                                <div className="mb-3">
                                                    <textarea
                                                        ref={staffTextareaRef}
                                                        className="form-control"
                                                        rows={4}
                                                        value={birthdaySettings.staff_template}
                                                        onChange={e => setBirthdaySettings({ ...birthdaySettings, staff_template: e.target.value })}
                                                        placeholder="Personel için standart doğum günü mesajınızı yazın..."
                                                        disabled={!birthdaySettings.staff_enabled}
                                                        required
                                                    ></textarea>
                                                </div>

                                                {/* Live SMS Preview */}
                                                <div className="sms-preview-card p-3 rounded bg-light border">
                                                    <div className="d-flex align-items-center gap-2 mb-2">
                                                        <i className="ti ti-device-mobile text-primary fs-5"></i>
                                                        <span className="small fw-bold text-muted text-uppercase">Canlı SMS Önizleme</span>
                                                    </div>
                                                    <div className="sms-bubble staff-bubble p-3 shadow-sm rounded-3 bg-white border">
                                                        <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                                                            {previewStaffMsg || <span className="text-muted italic">Mesaj içeriği boş.</span>}
                                                        </p>
                                                        <div className="text-end mt-1">
                                                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{birthdaySettings.staff_time || '09:00'} • EduLem</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Öğrenci & Veli Doğum Günü Otomasyonu (Tek Sağ Kolon) */}
                                    <div className="col-lg-6">
                                        <div className="card border-0 shadow-sm h-100">
                                            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="badge-icon-box bg-soft-success text-success">
                                                        <i className="ti ti-school fs-5"></i>
                                                    </div>
                                                    <div>
                                                        <h5 className="card-title mb-0 fw-bold">Öğrenci & Veli Otomasyonu</h5>
                                                        <small className="text-muted">Öğrenci ve velilere (Anne & Baba) kutlama mesajı kuralları.</small>
                                                    </div>
                                                </div>
                                                <div className="form-check form-switch m-0">
                                                    <input
                                                        className="form-check-input fs-5 cursor-pointer"
                                                        type="checkbox"
                                                        role="switch"
                                                        id="studentEnabledSwitch"
                                                        checked={birthdaySettings.student_enabled}
                                                        onChange={e => setBirthdaySettings({ ...birthdaySettings, student_enabled: e.target.checked })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="card-body">
                                                {/* Gönderim Saati ve Hedef Alıcı */}
                                                <div className="row g-2 mb-3">
                                                    <div className="col-sm-5">
                                                        <label className="form-label fw-medium text-dark small mb-1">
                                                            <i className="ti ti-clock me-1 text-muted"></i> Gönderim Saati
                                                        </label>
                                                        <input
                                                            type="time"
                                                            className="form-control"
                                                            value={birthdaySettings.student_time}
                                                            onChange={e => setBirthdaySettings({ ...birthdaySettings, student_time: e.target.value })}
                                                            disabled={!birthdaySettings.student_enabled}
                                                        />
                                                    </div>
                                                    <div className="col-sm-7">
                                                        <label className="form-label fw-medium text-dark small mb-1">
                                                            <i className="ti ti-send me-1 text-muted"></i> Kime Gönderilsin?
                                                        </label>
                                                        <select
                                                            className="form-select"
                                                            value={birthdaySettings.student_recipient}
                                                            onChange={e => setBirthdaySettings({ ...birthdaySettings, student_recipient: e.target.value as any })}
                                                            disabled={!birthdaySettings.student_enabled}
                                                        >
                                                            <option value="both">Hem Öğrenci Hem Veliler (Önerilen)</option>
                                                            <option value="guardian">Sadece Velilere (Anne & Baba)</option>
                                                            <option value="student">Sadece Öğrenciye</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Kritik Bilgi Uyarısı */}
                                                <div className="alert alert-success-subtle border border-success-subtle py-2 px-3 rounded small mb-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="ti ti-check-circle text-success fs-5 flex-shrink-0"></i>
                                                        <span style={{ fontSize: '0.82rem' }}>
                                                            <strong>Öğrenci Numarası Olmasa Bile:</strong> Kayıtlı Anne ve Baba numaralarına aşağıdaki <strong>Veli Şablonu</strong> ile SMS eksiksiz iletilir.
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Alt Sekmeler (Öğrenci Şablonu & Veli Şablonu) */}
                                                <div className="p-3 bg-light rounded border">
                                                    <div className="btn-group btn-group-sm w-100 mb-3" role="group">
                                                        <button
                                                            type="button"
                                                            className={`btn py-2 fw-semibold ${studentSubTab === 'student' ? 'btn-success text-white shadow-sm' : 'btn-outline-secondary bg-white'}`}
                                                            onClick={() => setStudentSubTab('student')}
                                                        >
                                                            <i className="ti ti-school me-1"></i> 1. Öğrenci Şablonu
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn py-2 fw-semibold ${studentSubTab === 'guardian' ? 'btn-info text-white shadow-sm' : 'btn-outline-secondary bg-white'}`}
                                                            onClick={() => setStudentSubTab('guardian')}
                                                        >
                                                            <i className="ti ti-users me-1"></i> 2. Veli Şablonu (Anne/Baba)
                                                        </button>
                                                    </div>

                                                    {/* 1. Öğrenci Şablonu Bölümü */}
                                                    <div style={{ display: studentSubTab === 'student' ? 'block' : 'none' }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <label className="form-label fw-medium text-dark mb-0 small">
                                                                Öğrencinin Telefonuna Gidecek Mesaj:
                                                            </label>
                                                            <span className={`small fw-semibold ${studentSmsStats.chars > 160 ? 'text-warning' : 'text-muted'}`}>
                                                                {studentSmsStats.chars} Karakter • {studentSmsStats.sms} SMS
                                                            </span>
                                                        </div>

                                                        {/* Parametre Butonları */}
                                                        <div className="d-flex flex-wrap gap-1 mb-2">
                                                            <span className="text-muted small align-self-center me-1" style={{ fontSize: '0.75rem' }}>Ekle:</span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('student', 'ogrenci_adi')}
                                                                title="Öğrencinin Adı Soyadı"
                                                            >
                                                                + {'{ogrenci_adi}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('student', 'okul_no')}
                                                                title="Öğrenci Numarası"
                                                            >
                                                                + {'{okul_no}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('student', 'sinif')}
                                                                title="Sınıf / Şube"
                                                            >
                                                                + {'{sinif}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('student', 'kurum_adi')}
                                                                title="Kurumunuzun Adı"
                                                            >
                                                                + {'{kurum_adi}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-success rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('student', 'yas')}
                                                                title="Öğrencinin Yeni Yaşı"
                                                            >
                                                                + {'{yas}'}
                                                            </button>
                                                        </div>

                                                        {/* Textarea */}
                                                        <div className="mb-3">
                                                            <textarea
                                                                ref={studentTextareaRef}
                                                                className="form-control"
                                                                rows={4}
                                                                value={birthdaySettings.student_template}
                                                                onChange={e => setBirthdaySettings({ ...birthdaySettings, student_template: e.target.value })}
                                                                placeholder="Öğrencinin kendisine gidecek doğum günü mesajınızı yazın..."
                                                                disabled={!birthdaySettings.student_enabled}
                                                                required
                                                            ></textarea>
                                                        </div>

                                                        {/* Önizleme */}
                                                        <div className="sms-preview-card p-3 rounded bg-white border">
                                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                                <i className="ti ti-device-mobile text-success fs-5"></i>
                                                                <span className="small fw-bold text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>Öğrenci Önizleme</span>
                                                            </div>
                                                            <div className="sms-bubble student-bubble p-2 shadow-sm rounded-3 bg-light border">
                                                                <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                                                                    {previewStudentMsg || <span className="text-muted italic">Mesaj içeriği boş.</span>}
                                                                </p>
                                                                <div className="text-end mt-1">
                                                                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>{birthdaySettings.student_time || '09:30'} • EduLem</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 2. Veli Şablonu Bölümü */}
                                                    <div style={{ display: studentSubTab === 'guardian' ? 'block' : 'none' }}>
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <label className="form-label fw-medium text-dark mb-0 small">
                                                                Anne & Baba Telefonlarına Gidecek Mesaj:
                                                            </label>
                                                            <span className={`small fw-semibold ${guardianSmsStats.chars > 160 ? 'text-warning' : 'text-muted'}`}>
                                                                {guardianSmsStats.chars} Karakter • {guardianSmsStats.sms} SMS
                                                            </span>
                                                        </div>

                                                        {/* Parametre Butonları */}
                                                        <div className="d-flex flex-wrap gap-1 mb-2">
                                                            <span className="text-muted small align-self-center me-1" style={{ fontSize: '0.75rem' }}>Ekle:</span>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'ogrenci_adi')}
                                                                title="Öğrencinin Adı Soyadı"
                                                            >
                                                                + {'{ogrenci_adi}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'veli_adi')}
                                                                title="Velinin Adı Soyadı"
                                                            >
                                                                + {'{veli_adi}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'okul_no')}
                                                                title="Öğrenci Numarası"
                                                            >
                                                                + {'{okul_no}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'sinif')}
                                                                title="Sınıf / Şube"
                                                            >
                                                                + {'{sinif}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'kurum_adi')}
                                                                title="Kurumunuzun Adı"
                                                            >
                                                                + {'{kurum_adi}'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-outline-info rounded-pill px-2 py-0"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => insertVariable('guardian', 'yas')}
                                                                title="Öğrencinin Yeni Yaşı"
                                                            >
                                                                + {'{yas}'}
                                                            </button>
                                                        </div>

                                                        {/* Textarea */}
                                                        <div className="mb-3">
                                                            <textarea
                                                                ref={guardianTextareaRef}
                                                                className="form-control"
                                                                rows={4}
                                                                value={birthdaySettings.guardian_template || ''}
                                                                onChange={e => setBirthdaySettings({ ...birthdaySettings, guardian_template: e.target.value })}
                                                                placeholder="Anne ve babaya gidecek doğum günü mesajınızı yazın..."
                                                                disabled={!birthdaySettings.student_enabled}
                                                                required
                                                            ></textarea>
                                                        </div>

                                                        {/* Önizleme */}
                                                        <div className="sms-preview-card p-3 rounded bg-white border">
                                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                                <i className="ti ti-device-mobile text-info fs-5"></i>
                                                                <span className="small fw-bold text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>Veli Önizleme</span>
                                                            </div>
                                                            <div className="sms-bubble guardian-bubble p-2 shadow-sm rounded-3 bg-light border">
                                                                <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                                                                    {previewGuardianMsg || <span className="text-muted italic">Mesaj içeriği boş.</span>}
                                                                </p>
                                                                <div className="text-end mt-1">
                                                                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>{birthdaySettings.student_time || '09:30'} • EduLem</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button Bar */}
                                <div className="card border-0 shadow-sm mt-4 bg-light">
                                    <div className="card-body d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
                                        <div className="text-muted small d-flex align-items-center gap-1">
                                            <i className="ti ti-shield-check text-success fs-5"></i>
                                            <span>
                                                Ayarları kaydettiğinizde, sistem doğum günü gelen öğrenci ve personellere <strong>otomatik olarak</strong> SMS gönderecektir.
                                            </span>
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 shadow"
                                            disabled={savingBirthday}
                                        >
                                            {savingBirthday ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                    <span>Kaydediliyor...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ti ti-device-floppy fs-5"></i>
                                                    <span className="fw-semibold">Ayarları Kaydet ve Otomasyonu Başlat</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* ========================================================== */}
                            {/* 1. BUGÜN DOĞUM GÜNÜ OLANLAR (Alt Liste)                    */}
                            {/* ========================================================== */}
                            <div className="card border-0 shadow-sm mt-4">
                                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="badge-icon-box bg-soft-primary text-primary">
                                            <i className="ti ti-cake fs-4"></i>
                                        </div>
                                        <div>
                                            <h6 className="fw-bold mb-0 text-dark">
                                                Bugün Doğum Günü Olanlar
                                            </h6>
                                            <small className="text-muted">
                                                {todayData?.date || new Date().toLocaleDateString('tr-TR')} • Toplam {totalTodayCount} Kişi ({todayData?.staff_count || 0} Personel, {todayData?.student_count || 0} Öğrenci)
                                            </small>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        {totalTodayCount > 0 && (
                                            <span className="badge bg-soft-success text-success px-3 py-2">
                                                <i className="ti ti-check me-1"></i>
                                                {(todayData?.staff_sent_count || 0) + (todayData?.student_sent_count || 0)} / {totalTodayCount} SMS Gönderildi
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="card-body p-3">
                                    {totalTodayCount === 0 ? (
                                        <div className="text-center py-4">
                                            <div className="avatar-lg bg-light rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center text-muted" style={{ width: 48, height: 48 }}>
                                                <i className="ti ti-confetti fs-2 text-warning"></i>
                                            </div>
                                            <h6 className="fw-semibold text-dark mb-1">Bugün Doğum Günü Olan Kayıt Yok</h6>
                                            <p className="text-muted small mb-0">Bugün ({todayData?.date || new Date().toLocaleDateString('tr-TR')}) doğum günü olan personel veya öğrenci bulunmuyor.</p>
                                        </div>
                                    ) : (
                                        <div className="row g-3">
                                            {/* Personel Listesi */}
                                            <div className="col-lg-6">
                                                <div className="border rounded p-3 bg-light-subtle h-100">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <span className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <i className="ti ti-briefcase text-primary"></i>
                                                            Personeller ({todayData?.staff.length || 0})
                                                        </span>
                                                        <span className="badge bg-soft-primary text-primary">Personel</span>
                                                    </div>
                                                    {(!todayData?.staff || todayData.staff.length === 0) ? (
                                                        <div className="text-muted small py-3 text-center">Bugün doğum günü olan personel yok.</div>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-hover align-middle mb-0 bg-white rounded">
                                                                <thead className="table-light">
                                                                    <tr className="small text-muted">
                                                                        <th>Ad Soyad</th>
                                                                        <th>Unvan / Görev</th>
                                                                        <th>Yaş</th>
                                                                        <th>İletişim</th>
                                                                        <th className="text-end">SMS Durumu</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {todayData.staff.map(s => (
                                                                        <tr key={s.id}>
                                                                            <td className="fw-semibold text-dark">{s.name}</td>
                                                                            <td><small className="text-muted">{s.title || 'Personel'}</small></td>
                                                                            <td><span className="badge bg-light text-dark">{s.age ? `${s.age} Yaş` : '-'}</span></td>
                                                                            <td>
                                                                                {s.has_phone ? (
                                                                                    <small className="text-dark"><i className="ti ti-phone text-muted me-1"></i>{s.phone}</small>
                                                                                ) : (
                                                                                    <span className="badge bg-soft-danger text-danger">Tel Yok</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="text-end">
                                                                                {s.sent_today ? (
                                                                                    <span className="badge bg-success text-white"><i className="ti ti-check me-1"></i>Gönderildi</span>
                                                                                ) : (
                                                                                    <span className="badge bg-soft-warning text-warning"><i className="ti ti-clock me-1"></i>Bekliyor</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Öğrenci Listesi */}
                                            <div className="col-lg-6">
                                                <div className="border rounded p-3 bg-light-subtle h-100">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <span className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <i className="ti ti-school text-success"></i>
                                                            Öğrenciler ({todayData?.students.length || 0})
                                                        </span>
                                                        <span className="badge bg-soft-success text-success">Öğrenci</span>
                                                    </div>
                                                    {(!todayData?.students || todayData.students.length === 0) ? (
                                                        <div className="text-muted small py-3 text-center">Bugün doğum günü olan öğrenci yok.</div>
                                                    ) : (
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-hover align-middle mb-0 bg-white rounded">
                                                                <thead className="table-light">
                                                                    <tr className="small text-muted">
                                                                        <th>Öğrenci</th>
                                                                        <th>Sınıf / No</th>
                                                                        <th>Yaş</th>
                                                                        <th>İletişim</th>
                                                                        <th className="text-end">SMS Durumu</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {todayData.students.map(st => (
                                                                        <tr key={st.id}>
                                                                            <td className="fw-semibold text-dark">{st.name}</td>
                                                                            <td>
                                                                                <small className="text-muted">
                                                                                    {st.classroom || 'Sınıfsız'} {st.school_no ? `(${st.school_no})` : ''}
                                                                                </small>
                                                                            </td>
                                                                            <td><span className="badge bg-light text-dark">{st.age ? `${st.age} Yaş` : '-'}</span></td>
                                                                            <td>
                                                                                {st.has_phone ? (
                                                                                    <div className="small text-dark mb-1 d-flex align-items-center gap-1">
                                                                                        <span className="badge bg-soft-success text-success">Öğrenci:</span>
                                                                                        <span className="fw-medium">{st.phone}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="small text-muted mb-1">
                                                                                        <span className="badge bg-light text-muted">Öğrenci Tel:</span>
                                                                                        <span className="ms-1 fst-italic">Kayıtlı Değil</span>
                                                                                    </div>
                                                                                )}
                                                                                {st.guardians && st.guardians.length > 0 ? (
                                                                                    <div className="d-flex flex-column gap-1 mt-1">
                                                                                        {st.guardians.map((g, gIdx) => (
                                                                                            <div key={gIdx} className="small d-flex align-items-center gap-1 flex-wrap">
                                                                                                <span className={`badge ${g.relation === 'Anne' ? 'bg-soft-danger text-danger' : g.relation === 'Baba' ? 'bg-soft-primary text-primary' : 'bg-soft-secondary text-secondary'}`}>
                                                                                                    {g.relation || 'Veli'} ({g.name}):
                                                                                                </span>
                                                                                                {g.has_phone ? (
                                                                                                    <span className="text-dark fw-medium">{g.phone}</span>
                                                                                                ) : (
                                                                                                    <span className="text-muted fst-italic">Tel Yok</span>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <small className="text-muted fst-italic d-block mt-1">Veli kaydı yok</small>
                                                                                )}
                                                                            </td>
                                                                            <td className="text-end">
                                                                                {st.sent_today ? (
                                                                                    <div className="d-inline-flex flex-column align-items-end gap-1">
                                                                                        <span className="badge bg-success text-white">
                                                                                            <i className="ti ti-check me-1"></i>Gönderildi
                                                                                        </span>
                                                                                        <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                                                            {st.student_sent_today ? 'Öğrenci ' : ''}
                                                                                            {st.guardian_sent_count && st.guardian_sent_count > 0 ? `+ ${st.guardian_sent_count} Veli` : ''}
                                                                                        </small>
                                                                                    </div>
                                                                                ) : st.has_any_contact ? (
                                                                                    <div className="d-inline-flex flex-column align-items-end gap-1">
                                                                                        <span className="badge bg-soft-warning text-warning" title="Belirlenen saatte otomatik gönderilecek">
                                                                                            <i className="ti ti-clock me-1"></i>Bekliyor
                                                                                        </span>
                                                                                        <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                                                            {st.has_phone ? 'Öğrenci ' : ''}
                                                                                            {st.guardian_phone_count && st.guardian_phone_count > 0 ? `+ ${st.guardian_phone_count} Veli` : ''}
                                                                                        </small>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="badge bg-soft-danger text-danger" title="Öğrenci ve velilerde kayıtlı telefon bulunamadı">
                                                                                        <i className="ti ti-phone-off me-1"></i>İletişim Yok
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ========================================================== */}
                            {/* 2. YAKLAŞAN DOĞUM GÜNLERİ                                  */}
                            {/* ========================================================== */}
                            <div className="card border-0 shadow-sm mt-4 mb-4">
                                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="badge-icon-box bg-soft-info text-info">
                                            <i className="ti ti-calendar-event fs-4"></i>
                                        </div>
                                        <div>
                                            <h6 className="fw-bold mb-0 text-dark">
                                                Yaklaşan Doğum Günleri
                                            </h6>
                                            <small className="text-muted">
                                                Önümüzdeki {upcomingData?.days_window || 5} gün içinde doğum günü olanlar • Toplam {upcomingData?.total_count || 0} Kişi
                                            </small>
                                        </div>
                                    </div>

                                    {/* Filtreleme Butonları */}
                                    <div className="btn-group btn-group-sm">
                                        <button
                                            type="button"
                                            className={`btn ${upcomingFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setUpcomingFilter('all')}
                                        >
                                            Tümü ({upcomingData?.total_count || 0})
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${upcomingFilter === 'staff' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setUpcomingFilter('staff')}
                                        >
                                            Personel ({upcomingData?.staff_count || 0})
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${upcomingFilter === 'student' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setUpcomingFilter('student')}
                                        >
                                            Öğrenci ({upcomingData?.student_count || 0})
                                        </button>
                                    </div>
                                </div>

                                <div className="card-body p-0">
                                    {filteredUpcomingItems.length === 0 ? (
                                        <div className="text-center py-5 text-muted">
                                            <i className="ti ti-calendar-off fs-1 text-secondary mb-2 d-block opacity-50"></i>
                                            <h6 className="fw-semibold text-dark mb-1">Yaklaşan Doğum Günü Bulunmuyor</h6>
                                            <p className="small mb-0">
                                                {upcomingFilter === 'all'
                                                    ? `Önümüzdeki ${upcomingData?.days_window || 5} gün içinde doğum günü yaklaşan kimse bulunamadı.`
                                                    : upcomingFilter === 'staff'
                                                    ? 'Yaklaşan doğum günü olan personel bulunamadı.'
                                                    : 'Yaklaşan doğum günü olan öğrenci bulunamadı.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="table-light">
                                                    <tr className="small text-muted">
                                                        <th style={{ width: '150px' }}>Kalan Süre</th>
                                                        <th>Doğum Günü Tarihi</th>
                                                        <th>Kişi</th>
                                                        <th>Tür</th>
                                                        <th>Grup / Sınıf / Görev</th>
                                                        <th>Gireceği Yaş</th>
                                                        <th>İletişim</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUpcomingItems.map((item, idx) => {
                                                        let badgeClass = 'bg-soft-secondary text-secondary';
                                                        let badgeIcon = 'ti-calendar';
                                                        let badgeText = `${item.days_left} gün kaldı`;

                                                        if (item.days_left === 1) {
                                                            badgeClass = 'bg-danger text-white';
                                                            badgeIcon = 'ti-alarm';
                                                            badgeText = 'Yarın!';
                                                        } else if (item.days_left <= 3) {
                                                            badgeClass = 'bg-warning text-dark';
                                                            badgeIcon = 'ti-bolt';
                                                            badgeText = `${item.days_left} gün kaldı`;
                                                        } else if (item.days_left <= 7) {
                                                            badgeClass = 'bg-soft-info text-info';
                                                            badgeIcon = 'ti-calendar-event';
                                                            badgeText = `${item.days_left} gün kaldı`;
                                                        }

                                                        return (
                                                            <tr key={`${item.type}-${item.id}-${idx}`}>
                                                                <td>
                                                                    <span className={`badge ${badgeClass} d-inline-flex align-items-center gap-1 px-2 py-1`}>
                                                                        <i className={`ti ${badgeIcon}`}></i>
                                                                        {badgeText}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="fw-semibold text-dark">{item.next_birthday_formatted}</div>
                                                                    <small className="text-muted">{item.day_month}</small>
                                                                </td>
                                                                <td>
                                                                    <span className="fw-bold text-dark">{item.name}</span>
                                                                </td>
                                                                <td>
                                                                    {item.type === 'staff' ? (
                                                                        <span className="badge bg-soft-primary text-primary">
                                                                            <i className="ti ti-briefcase me-1"></i>Personel
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-soft-success text-success">
                                                                            <i className="ti ti-school me-1"></i>Öğrenci
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className="text-muted small">{item.title || '-'}</span>
                                                                </td>
                                                                <td>
                                                                    {item.turning_age ? (
                                                                        <span className="badge bg-light text-dark fw-semibold">
                                                                            {item.turning_age}. Yaş
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted small">-</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {item.type === 'staff' ? (
                                                                        item.has_phone ? (
                                                                            <span className="small text-dark">
                                                                                <i className="ti ti-phone text-muted me-1"></i>{item.phone}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-danger text-danger">Telefon Yok</span>
                                                                        )
                                                                    ) : (
                                                                        <div>
                                                                            {item.has_phone ? (
                                                                                <div className="small text-dark mb-1">
                                                                                    <span className="badge bg-soft-success text-success me-1">Öğr:</span>
                                                                                    <span className="fw-medium">{item.phone}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="small text-muted mb-1">
                                                                                    <span className="badge bg-light text-muted me-1">Öğr:</span>
                                                                                    <span className="fst-italic">Kayıtlı Değil</span>
                                                                                </div>
                                                                            )}
                                                                            {item.guardians && item.guardians.length > 0 ? (
                                                                                <div className="d-flex flex-column gap-1">
                                                                                    {item.guardians.map((g, gIdx) => (
                                                                                        <div key={gIdx} className="small">
                                                                                            <span className={`badge ${g.relation === 'Anne' ? 'bg-soft-danger text-danger' : g.relation === 'Baba' ? 'bg-soft-primary text-primary' : 'bg-soft-secondary text-secondary'} me-1`}>
                                                                                                {g.relation || 'Veli'} ({g.name}):
                                                                                            </span>
                                                                                            {g.has_phone ? (
                                                                                                <span className="text-dark fw-medium">{g.phone}</span>
                                                                                            ) : (
                                                                                                <span className="text-muted fst-italic">Tel Yok</span>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : null}
                                                                            {!item.has_any_contact && (
                                                                                <span className="badge bg-soft-danger text-danger">İletişim Yok</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            <style>{`
                .bg-soft-info { background-color: rgba(13, 202, 240, 0.1); }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
                .bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
                .badge-icon-box {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .birthday-icon-circle {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .bg-gradient-birthday {
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%);
                }
                .bg-black-10 {
                    background-color: rgba(0, 0, 0, 0.15);
                }
                .border-white-25 {
                    border-color: rgba(255, 255, 255, 0.25) !important;
                }
                .btn-xs {
                    font-size: 0.75rem;
                    padding: 0.2rem 0.5rem;
                }
                .last-border-0:last-child {
                    border-bottom: 0 !important;
                }
                .sms-bubble {
                    border-left: 4px solid #4f46e5 !important;
                    background-color: #fdfdfd;
                }
                .sms-bubble.student-bubble {
                    border-left-color: #10b981 !important;
                }
                .sms-bubble.guardian-bubble {
                    border-left-color: #0ea5e9 !important;
                }
                .cursor-pointer {
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default SmsTemplateList;
