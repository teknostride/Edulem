import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { showToast } from '../../../utils/toast';

interface Student {
    id: number;
    name: string;
    student_name?: string;
    school_no?: string;
    phone?: string;
    classroom?: {
        id: number;
        name: string;
    };
    classroom_name?: string;
    guardians?: Array<{
        name: string;
        phone: string;
    }>;
    attendance?: {
        status: string;
        notes?: string;
    };
}

const TutoringAttendance = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await axiosClient.get(`/tutoring/${id}`);
            const sessionData = res.data?.data ?? res.data?.tutoring ?? res.data;
            setSession(sessionData);

            let sessionStudents: any[] = [];
            if (sessionData && Array.isArray(sessionData.students)) {
                sessionStudents = sessionData.students;
            } else if (Array.isArray(sessionData)) {
                sessionStudents = sessionData;
            }

            const existingAttendances: any[] = Array.isArray(sessionData?.attendances) ? sessionData.attendances : [];
            const attMap = new Map();
            existingAttendances.forEach((a: any) => {
                const sId = a?.student_id ?? a?.student?.id;
                if (sId != null) {
                    attMap.set(Number(sId), a);
                    attMap.set(String(sId), a);
                }
            });

            setStudents(sessionStudents.map((s: any) => {
                const prev = attMap.get(Number(s.id)) || attMap.get(String(s.id));
                return {
                    ...s,
                    attendance: prev
                        ? { status: prev.status || 'present', notes: prev.notes || '' }
                        : (s.pivot?.attendance || { status: 'present', notes: '' })
                };
            }));

        } catch (error) {
            showToast('error', 'Etüt ve yoklama verileri yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: number, status: string) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, attendance: { ...s.attendance!, status } } : s
        ));
    };

    const handleNotesChange = (studentId: number, notes: string) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, attendance: { ...s.attendance!, notes } } : s
        ));
    };

    const handleSetAllStatus = (status: 'present' | 'absent') => {
        setStudents(prev => prev.map(s => ({
            ...s,
            attendance: { ...s.attendance!, status }
        })));
        showToast('info', `Tüm öğrenciler "${status === 'present' ? 'Geldi' : 'Gelmedi'}" olarak işaretlendi.`);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const attendanceData = students.map(s => ({
                student_id: s.id,
                status: s.attendance?.status || 'present',
                notes: s.attendance?.notes || ''
            }));

            await axiosClient.post(`/tutoring/${id}/bulk-attendance`, {
                attendances: attendanceData
            });

            showToast('success', 'Yoklama ve katılım kayıtları başarıyla kaydedildi');
            fetchData();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Yoklama kaydedilemedi');
        } finally {
            setSaving(false);
        }
    };

    // Okul adını al
    const getSchoolName = () => {
        try {
            const imp = localStorage.getItem('EDULEM_IMPERSONATION');
            if (imp) {
                const impData = JSON.parse(imp);
                if (impData.tenant_name) return impData.tenant_name;
            }
            const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
            if (ud.tenant_name) return ud.tenant_name;
            if (ud.institution_name) return ud.institution_name;
            if (ud.tenant?.name) return ud.tenant.name;
            if (ud.school_name) return ud.school_name;
            const cached = localStorage.getItem('TENANT_NAME') || localStorage.getItem('INSTITUTION_NAME');
            if (cached) return cached;
            if (typeof window !== 'undefined') {
                const host = window.location.hostname.toLowerCase();
                if (host.startsWith('akirfan.')) return 'AK İRFAN OKULLARI';
                if (host.startsWith('demo.')) return 'DEMO OKUL';
            }
        } catch {}
        return 'EDULEM EĞİTİM KURUMLARI';
    };

    // Güvenli ve Temiz Yazdırma (Ayrı Sekmede %100 Çıktı Garantisi)
    const printHtml = (htmlContent: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Yazdırma penceresi açılamadı. Lütfen tarayıcınızın adres çubuğundaki açılır pencere (popup) engelini kaldırıp tekrar deneyin.');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrint = () => {
        if (!session) {
            window.print();
            return;
        }

        const schoolTitle = getSchoolName();
        const dateStr = session.date ? new Date(session.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
        const timeStr = `${session.start_time ? (session.start_time.length > 5 ? session.start_time.substring(11, 16) || session.start_time.substring(0, 5) : session.start_time) : ''} - ${session.end_time ? (session.end_time.length > 5 ? session.end_time.substring(11, 16) || session.end_time.substring(0, 5) : session.end_time) : ''}`;

        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <title>${session.title} - Resmi Yoklama ve Katılım Raporu</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 12px;
            font-size: 11px;
        }
        .no-print {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .btn-print {
            background: #16a34a;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
        }
        .btn-print:hover {
            background: #15803d;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                padding: 0 !important;
            }
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header h1 {
            font-size: 16px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 0.5px;
        }
        .header h2 {
            font-size: 13px;
            margin: 0 0 4px 0;
            font-weight: 700;
            color: #333;
        }
        .header .meta {
            font-size: 10px;
            color: #666;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border: 1px solid #999;
        }
        .info-table td {
            padding: 5px 8px;
            font-size: 11px;
            border: 1px solid #ccc;
        }
        .info-table td.label {
            font-weight: bold;
            background: #f4f5f7 !important;
            width: 18%;
            color: #333;
        }
        .section-title {
            font-size: 12px;
            font-weight: 800;
            margin: 14px 0 6px 0;
            text-transform: uppercase;
            display: flex;
            justify-content: space-between;
        }
        table.list-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        table.list-table thead {
            display: table-header-group;
        }
        table.list-table tr {
            page-break-inside: avoid;
        }
        table.list-table th, table.list-table td {
            border: 1px solid #333;
            padding: 5px 7px;
            font-size: 10.5px;
        }
        table.list-table th {
            background-color: #f1f3f5 !important;
            font-weight: 700;
            text-align: left;
        }
        .text-center { text-align: center; }
        .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        .footer-col {
            width: 45%;
            text-align: center;
        }
        .footer-col .sig-space {
            height: 45px;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <div>
            <strong style="color: #15803d; font-size: 13px;">Resmi Yoklama ve Katılım Raporu Çıktı Ekranı</strong>
            <div style="color: #166534; font-size: 11px;">Yazdırma penceresi otomatik açılır. Kapatırsanız veya açılmazsa butona tıklayabilirsiniz.</div>
        </div>
        <button class="btn-print" onclick="window.print()">🖨️ Sayfayı Yazdır / PDF İndir</button>
    </div>

    <div class="header">
        <h1>${schoolTitle}</h1>
        <h2>ETÜT VE ÖZEL DERS RESMİ YOKLAMA & KATILIM RAPORU</h2>
        <div class="meta">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">Oturum:</td>
            <td><strong>${session.title || '-'}</strong></td>
            <td class="label">Tarih:</td>
            <td>${dateStr}</td>
        </tr>
        <tr>
            <td class="label">Ders Adı:</td>
            <td>${session.lesson?.name || '-'}</td>
            <td class="label">Saat / Süre:</td>
            <td>${timeStr}</td>
        </tr>
        <tr>
            <td class="label">Öğretmen:</td>
            <td>${session.teacher?.name || '-'}</td>
            <td class="label">Derslik / Salon:</td>
            <td>${session.room || 'Belirtilmedi'}</td>
        </tr>
        <tr>
            <td class="label">Toplam Kayıtlı:</td>
            <td><strong>${students.length} Öğrenci</strong></td>
            <td class="label">Katılım Durumu:</td>
            <td><strong>${presentCount} Geldi</strong>, ${absentCount} Gelmedi, ${lateCount} Geç (%${attendanceRate})</td>
        </tr>
    </table>

    <div class="section-title">
        <span>ÖĞRENCİ KATILIM LİSTESİ (${students.length} ÖĞRENCİ)</span>
    </div>
    <table class="list-table">
        <thead>
            <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 70px; text-align: center;">Okul No</th>
                <th>Öğrenci Adı Soyadı</th>
                <th style="width: 90px;">Sınıfı</th>
                <th style="width: 110px; text-align: center;">Katılım Durumu</th>
                <th>Not / Açıklama</th>
                <th style="width: 75px; text-align: center;">İmza</th>
            </tr>
        </thead>
        <tbody>
            ${students.length === 0 ? `
                <tr><td colspan="7" class="text-center" style="padding: 15px;">Kayıtlı öğrenci bulunamadı.</td></tr>
            ` : students.map((st, i) => {
                const stStatus = st.attendance?.status;
                const statusLabel = stStatus === 'present' ? 'GELDİ' : (stStatus === 'late' ? 'GEÇ GELDİ' : (stStatus === 'absent' ? 'GELMEDİ' : '-'));
                const statusColor = stStatus === 'present' ? '#198754' : (stStatus === 'late' ? '#fd7e14' : '#dc3545');
                return `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="text-center"><strong>${st.school_no || '-'}</strong></td>
                        <td><strong>${st.name || st.student_name || '-'}</strong></td>
                        <td>${st.classroom?.name || st.classroom_name || '-'}</td>
                        <td class="text-center" style="font-weight: bold; color: ${statusColor};">${statusLabel}</td>
                        <td style="font-size: 10px;">${st.attendance?.notes || '-'}</td>
                        <td></td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-col">
            <div><strong>Dersi Veren Öğretmen</strong></div>
            <div style="margin-top: 4px;">${session.teacher?.name || '-'}</div>
            <div class="sig-space"></div>
            <div>(İmza)</div>
        </div>
        <div class="footer-col">
            <div><strong>Okul / Kurum Yönetimi</strong></div>
            <div style="margin-top: 4px;">Onay</div>
            <div class="sig-space"></div>
            <div>(İmza / Mühür)</div>
        </div>
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 300);
        };
    </script>
</body>
</html>`;

        printHtml(html);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted mt-2">Etüt ve yoklama raporu yükleniyor...</p>
            </div>
        );
    }

    // İstatistik ve Rapor Hesaplamaları
    const totalStudents = students.length;
    const presentCount = students.filter(s => s.attendance?.status === 'present').length;
    const absentCount = students.filter(s => s.attendance?.status === 'absent').length;
    const lateCount = students.filter(s => s.attendance?.status === 'late').length;
    const isAttendanceRecorded = (session?.attendances && session.attendances.length > 0) || false;
    const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    // Filtrelenmiş Liste
    const filteredStudents = students.filter(student => {
        if (filterStatus !== 'all' && student.attendance?.status !== filterStatus) {
            return false;
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            const name = (student.name || student.student_name || '').toLowerCase();
            const no = (student.school_no || '').toLowerCase();
            const cls = (student.classroom?.name || student.classroom_name || '').toLowerCase();
            return name.includes(q) || no.includes(q) || cls.includes(q);
        }
        return true;
    });

    return (
        <div className="container-fluid tutoring-attendance-report-page">
            {/* Üst Başlık ve Aksiyonlar */}
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3 no-print">
                <div className="d-flex align-items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/academic/tutoring')}
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        title="Etüt Listesine Dön"
                    >
                        <i className="ti ti-arrow-left"></i>
                        <span>Geri Dön</span>
                    </button>
                    <div>
                        <div className="d-flex align-items-center gap-2">
                            <h3 className="fw-bold m-0">Etüt Yoklama & Katılım Raporu</h3>
                            {isAttendanceRecorded ? (
                                <span className="badge bg-success-subtle text-success border border-success">
                                    <i className="ti ti-check me-1"></i> Yoklama Alındı
                                </span>
                            ) : (
                                <span className="badge bg-warning-subtle text-warning border border-warning">
                                    <i className="ti ti-clock me-1"></i> Yoklama Bekliyor
                                </span>
                            )}
                        </div>
                        <p className="text-muted mb-0 small">
                            {session?.title} &bull; {session?.lesson?.name} &bull; {session?.teacher?.name} &bull;{' '}
                            {session?.date ? new Date(session.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        </p>
                    </div>
                </div>

                <div className="d-flex gap-2 align-items-center">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="btn btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
                        title="Raporu A4 formatında yazdır / PDF al"
                    >
                        <i className="ti ti-printer fs-5"></i>
                        <span>Raporu Yazdır</span>
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
                        onClick={handleSave}
                        disabled={saving}
                        title="Yapılan yoklama değişikliklerini kaydet"
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                <span>Kaydediliyor...</span>
                            </>
                        ) : (
                            <>
                                <i className="ti ti-device-floppy fs-5"></i>
                                <span>Yoklamayı Kaydet</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* RAPOR ÖZET KARTLARI */}
            <div className="row g-3 mb-4 no-print">
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm h-100 bg-primary text-white">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <p className="text-white-50 small mb-1">Toplam Kayıtlı Öğrenci</p>
                                    <h3 className="fw-bold mb-0">{totalStudents}</h3>
                                </div>
                                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center">
                                    <i className="ti ti-users fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <p className="text-muted small mb-1">Katılan (Geldi)</p>
                                    <h3 className="fw-bold mb-0 text-success">{presentCount}</h3>
                                    <small className="text-muted">Katılım: %{attendanceRate}</small>
                                </div>
                                <div className="avatar-sm bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center">
                                    <i className="ti ti-user-check fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm h-100 border-start border-danger border-4">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <p className="text-muted small mb-1">Katılmayan (Gelmedi)</p>
                                    <h3 className="fw-bold mb-0 text-danger">{absentCount}</h3>
                                    <small className="text-muted">Devamsız: %{totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0}</small>
                                </div>
                                <div className="avatar-sm bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center">
                                    <i className="ti ti-user-x fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm h-100 border-start border-warning border-4">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <p className="text-muted small mb-1">Geç Gelen</p>
                                    <h3 className="fw-bold mb-0 text-warning">{lateCount}</h3>
                                    <small className="text-muted">Gecikmeli Katılım</small>
                                </div>
                                <div className="avatar-sm bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center">
                                    <i className="ti ti-clock-pause fs-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ETÜT BİLGİ DETAYI & HIZLI İŞLEMLER */}
            <div className="card border-0 shadow-sm mb-4 no-print">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-8">
                            <div className="d-flex flex-wrap gap-4 text-muted small">
                                <div>
                                    <strong className="text-dark d-block">Öğretmen:</strong>
                                    <span>{session?.teacher?.name || '-'}</span>
                                </div>
                                <div>
                                    <strong className="text-dark d-block">Ders:</strong>
                                    <span>{session?.lesson?.name || '-'}</span>
                                </div>
                                <div>
                                    <strong className="text-dark d-block">Derslik / Salon:</strong>
                                    <span>{session?.room || 'Belirtilmedi'}</span>
                                </div>
                                <div>
                                    <strong className="text-dark d-block">Saat:</strong>
                                    <span>
                                        {session?.start_time ? (session.start_time.length > 5 ? session.start_time.substring(11, 16) || session.start_time.substring(0, 5) : session.start_time) : ''}
                                        {session?.end_time ? ` - ${session.end_time.length > 5 ? session.end_time.substring(11, 16) || session.end_time.substring(0, 5) : session.end_time}` : ''}
                                    </span>
                                </div>
                                <div>
                                    <strong className="text-dark d-block">Tür:</strong>
                                    <span>{session?.type_label || (session?.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 text-md-end">
                            <div className="btn-group btn-group-sm">
                                <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    onClick={() => handleSetAllStatus('present')}
                                >
                                    <i className="ti ti-check-all me-1"></i> Tümünü Geldi Yap
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => handleSetAllStatus('absent')}
                                >
                                    <i className="ti ti-x me-1"></i> Tümünü Gelmedi Yap
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ÖĞRENCİ LİSTESİ VE YOKLAMA TABLOSU */}
            <div className="card border-0 shadow-sm no-print">
                <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
                    {/* Durum Filtre Butonları */}
                    <div className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className={`btn ${filterStatus === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setFilterStatus('all')}
                        >
                            Tümü ({totalStudents})
                        </button>
                        <button
                            type="button"
                            className={`btn ${filterStatus === 'present' ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setFilterStatus('present')}
                        >
                            Gelenler ({presentCount})
                        </button>
                        <button
                            type="button"
                            className={`btn ${filterStatus === 'absent' ? 'btn-danger' : 'btn-outline-danger'}`}
                            onClick={() => setFilterStatus('absent')}
                        >
                            Gelmeyenler ({absentCount})
                        </button>
                        <button
                            type="button"
                            className={`btn ${filterStatus === 'late' ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => setFilterStatus('late')}
                        >
                            Geç Gelenler ({lateCount})
                        </button>
                    </div>

                    {/* Arama Kutusu */}
                    <div className="search-box" style={{ maxWidth: '280px' }}>
                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light border-end-0"><i className="ti ti-search text-muted"></i></span>
                            <input
                                type="text"
                                className="form-control border-start-0 bg-light"
                                placeholder="Öğrenci adı, no veya sınıf ara..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4" style={{ width: '60px' }}>#</th>
                                    <th>Öğrenci Bilgisi</th>
                                    <th>Sınıfı</th>
                                    <th>Veli / İletişim</th>
                                    <th style={{ width: '220px' }}>Katılım Durumu</th>
                                    <th>Açıklama / Not</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-5 text-muted">
                                            {searchTerm || filterStatus !== 'all' ? 'Filtreye uygun öğrenci bulunamadı.' : 'Bu etüte kayıtlı öğrenci bulunmuyor.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student, idx) => {
                                        const status = student.attendance?.status || 'present';
                                        const primaryGuardian = (student.guardians && student.guardians.length > 0) ? student.guardians[0] : null;

                                        return (
                                            <tr key={student.id}>
                                                <td className="ps-4 text-muted small">{idx + 1}</td>
                                                <td>
                                                    <div className="fw-bold text-dark">{student.name || student.student_name}</div>
                                                    <small className="text-muted">Okul No: {student.school_no || student.id}</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-soft-primary text-primary">
                                                        {student.classroom?.name || student.classroom_name || 'Belirtilmedi'}
                                                    </span>
                                                </td>
                                                <td className="small">
                                                    {primaryGuardian ? (
                                                        <div>
                                                            <span className="text-dark fw-medium">{primaryGuardian.name}</span>
                                                            <div className="text-muted">{primaryGuardian.phone}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted">{student.phone || '-'}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="btn-group btn-group-sm w-100">
                                                        <button
                                                            type="button"
                                                            className={`btn ${status === 'present' ? 'btn-success fw-bold' : 'btn-outline-success'}`}
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                        >
                                                            <i className="ti ti-check me-1"></i> Geldi
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn ${status === 'absent' ? 'btn-danger fw-bold' : 'btn-outline-danger'}`}
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                        >
                                                            <i className="ti ti-x me-1"></i> Gelmedi
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn ${status === 'late' ? 'btn-warning fw-bold' : 'btn-outline-warning'}`}
                                                            onClick={() => handleStatusChange(student.id, 'late')}
                                                        >
                                                            Geç
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Yoklama notu (opsiyonel)..."
                                                        value={student.attendance?.notes || ''}
                                                        onChange={e => handleNotesChange(student.id, e.target.value)}
                                                    />
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

            {/* YAZDIRILABİLİR RESMİ YOKLAMA & KATILIM RAPORU (Sadece print esnasında görünür) */}
            <div id="printable-attendance-report" className="print-only">
                {session && (
                    <div className="print-content">
                        {/* Başlık */}
                        <div className="text-center pb-3 border-bottom">
                            <h2 className="fw-bold mb-1">EDULEM EĞİTİM KURUMLARI</h2>
                            <h4 className="fw-bold text-uppercase mb-1">ETÜT VE ÖZEL DERS RESMİ YOKLAMA & KATILIM RAPORU</h4>
                            <div className="text-muted small">
                                Rapor Tarihi: {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        {/* Oturum Bilgileri & İstatistik Özeti */}
                        <div className="my-3 p-3 border rounded">
                            <table className="table table-sm table-borderless mb-0">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '20%' }}><strong>Oturum Başlığı:</strong></td>
                                        <td style={{ width: '30%' }}>{session.title}</td>
                                        <td style={{ width: '20%' }}><strong>Tarih:</strong></td>
                                        <td style={{ width: '30%' }}>{session.date ? new Date(session.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ders Adı:</strong></td>
                                        <td>{session.lesson?.name || '-'}</td>
                                        <td><strong>Saat / Süre:</strong></td>
                                        <td>
                                            {session.start_time ? (session.start_time.length > 5 ? session.start_time.substring(11, 16) || session.start_time.substring(0, 5) : session.start_time) : ''}
                                            {session.end_time ? ` - ${session.end_time.length > 5 ? session.end_time.substring(11, 16) || session.end_time.substring(0, 5) : session.end_time}` : ''}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Öğretmen:</strong></td>
                                        <td>{session.teacher?.name || '-'}</td>
                                        <td><strong>Derslik / Salon:</strong></td>
                                        <td>{session.room || 'Belirtilmedi'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Toplam Kayıtlı:</strong></td>
                                        <td>{totalStudents} Öğrenci</td>
                                        <td><strong>Katılım Özeti:</strong></td>
                                        <td>
                                            <strong>{presentCount} Geldi</strong>, {absentCount} Gelmedi, {lateCount} Geç (Katılım: %{attendanceRate})
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Katılım Tablosu */}
                        <h6 className="fw-bold mb-2">ÖĞRENCİ KATILIM LİSTESİ</h6>
                        <table className="table table-bordered table-sm align-middle print-table">
                            <thead>
                                <tr className="bg-light">
                                    <th style={{ width: '40px', textAlign: 'center' }}>Sıra</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Okul No</th>
                                    <th>Öğrenci Adı Soyadı</th>
                                    <th style={{ width: '110px' }}>Sınıfı</th>
                                    <th style={{ width: '110px', textAlign: 'center' }}>Katılım Durumu</th>
                                    <th>Not / Açıklama</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>İmza</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((st, i) => {
                                    const stStatus = st.attendance?.status;
                                    const statusLabel = stStatus === 'present' ? 'GELDİ' : (stStatus === 'late' ? 'GEÇ GELDİ' : 'GELMEDİ');
                                    return (
                                        <tr key={st.id}>
                                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                            <td style={{ textAlign: 'center' }}>{st.school_no || '-'}</td>
                                            <td className="fw-bold">{st.name || st.student_name}</td>
                                            <td>{st.classroom?.name || st.classroom_name || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                {statusLabel}
                                            </td>
                                            <td className="small">{st.attendance?.notes || '-'}</td>
                                            <td></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* İmza Alanı */}
                        <div className="row mt-5 pt-4">
                            <div className="col-6 text-center">
                                <p className="mb-4"><strong>Dersi Veren Öğretmen</strong></p>
                                <p className="mb-0">{session.teacher?.name}</p>
                                <small className="text-muted">(İmza)</small>
                            </div>
                            <div className="col-6 text-center">
                                <p className="mb-4"><strong>Okul / Kurum Yönetimi</strong></p>
                                <p className="mb-0">Onay</p>
                                <small className="text-muted">(İmza / Mühür)</small>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .bg-soft-primary { background-color: rgba(13, 110, 253, 0.1); }
                .bg-success-subtle { background-color: rgba(25, 135, 84, 0.1); }
                .bg-danger-subtle { background-color: rgba(220, 53, 69, 0.1); }
                .bg-warning-subtle { background-color: rgba(255, 193, 7, 0.1); }

                .print-only {
                    display: none;
                }

                @media print {
                    /* Menü, üst çubuk, modal ve no-print elementlerini gizle */
                    .no-print, .sidenav-menu, .topbar, footer, .modal-backdrop, .modal, .offcanvas, .btn, button {
                        display: none !important;
                    }

                    /* Ana sarmalayıcıların görünürlüğünü koru (.wrapper display:none YAPILMAMALIDIR) */
                    html, body, .wrapper, .page-content, .content-page, .content, .container-fluid {
                        display: block !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: #ffffff !important;
                    }

                    .print-only {
                        display: block !important;
                    }

                    #printable-attendance-report {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    #printable-attendance-report * {
                        visibility: visible !important;
                    }

                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }

                    .print-table th, .print-table td {
                        border: 1px solid #000000 !important;
                        color: #000000 !important;
                        padding: 4px 6px !important;
                    }

                    .print-table th {
                        background-color: #f1f3f5 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    @page {
                        size: A4 portrait;
                        margin: 12mm 10mm;
                    }
                }
            `}</style>
        </div>
    );
};

export default TutoringAttendance;
