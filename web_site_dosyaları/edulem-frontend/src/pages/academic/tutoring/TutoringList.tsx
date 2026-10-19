import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { confirmDialog, showToast } from '../../../utils/toast';

interface Student {
    id: number;
    name: string;
    student_name?: string;
    school_no?: string;
    phone?: string;
    classroom?: {
        id: number;
        name: string;
        grade_level?: string;
    };
    classroom_name?: string;
    guardians?: Array<{
        id: number;
        name: string;
        phone: string;
        relation_type?: string;
    }>;
}

interface TutoringSession {
    id: number;
    title: string;
    type: 'tutoring' | 'private_lesson' | 'extra_lesson' | 'class_tutoring' | string;
    type_label?: string;
    date: string;
    start_time: string;
    end_time: string;
    room: string;
    notes?: string;
    teacher: {
        id: number;
        name: string;
        email?: string;
    };
    lesson: {
        id: number;
        name: string;
    };
    max_students: number;
    students_count: number;
    is_active: boolean;
    students?: Student[];
    attendances?: Array<{
        student_id: number;
        status: 'present' | 'absent' | 'late';
        notes?: string;
    }>;
    attendance_summary?: {
        taken: boolean;
        total: number;
        present: number;
        absent: number;
        late: number;
        rate: number;
    };
}

const TutoringList = () => {
    const [sessions, setSessions] = useState<TutoringSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    // Detay Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<TutoringSession | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Genel Yoklama Raporu Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);

    // SMS Modal State
    const [smsModalOpen, setSmsModalOpen] = useState(false);
    const [smsLoading, setSmsLoading] = useState(false);
    const [smsSending, setSmsSending] = useState(false);
    const [smsSession, setSmsSession] = useState<TutoringSession | null>(null);
    const [smsStudents, setSmsStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [smsTargetAudience, setSmsTargetAudience] = useState<'guardians' | 'mother' | 'father' | 'student' | 'all'>('guardians');
    const [smsMessage, setSmsMessage] = useState('');

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
        } catch {
            return {};
        }
    })();

    const role = localStorage.getItem('USER_ROLE') || currentUser?.role || null;

    const isTeacher =
        role === 'Öğretmen' ||
        role === 'Sınıf Öğretmeni' ||
        role === 'teacher' ||
        role === 'Rehber Öğretmen' ||
        role === 'rehber_teacher' ||
        role === 'guidance_teacher' ||
        role === 'Rehberlik' ||
        role === 'guidance' ||
        role === '5' ||
        role === '6';

    useEffect(() => {
        fetchSessions();
        fetchStats();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (isTeacher && currentUser?.id) {
                params.teacher_id = currentUser.id;
            }
            const res = await axiosClient.get('/tutoring', { params });
            const data = res.data?.data ?? res.data;
            const list = Array.isArray(data?.sessions)
                ? data.sessions
                : (Array.isArray(data?.tutorings) ? data.tutorings : (Array.isArray(data) ? data : []));
            setSessions(list);
        } catch (error: any) {
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params: any = {};
            if (isTeacher && currentUser?.id) {
                params.teacher_id = currentUser.id;
            }
            const res = await axiosClient.get('/tutoring/statistics', { params });
            const data = res.data?.data ?? res.data;
            setStats(data);
        } catch (error: any) {
            setStats(null);
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu etüt oturumunu silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        try {
            await axiosClient.delete(`/tutoring/${id}`);
            showToast('success', 'Oturum silindi');
            fetchSessions();
        } catch (error) {
            showToast('error', 'Silme işlemi başarısız');
        }
    };

    // Detay Modalını Aç
    const handleOpenDetail = async (session: TutoringSession) => {
        setSelectedDetail(session);
        setDetailModalOpen(true);
        setDetailLoading(true);
        setStudentSearch('');

        try {
            const res = await axiosClient.get(`/tutoring/${session.id}`);
            const data = res.data?.data ?? res.data?.tutoring ?? res.data;
            if (data) {
                setSelectedDetail(data);
            }
        } catch (error) {
            console.error('Etüt detayı yüklenemedi:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    // SMS Modalını Aç
    const handleOpenSms = async (session: TutoringSession) => {
        setSmsSession(session);
        setSmsModalOpen(true);
        setSmsLoading(true);
        setSmsTargetAudience('guardians');

        // Varsayılan mesaj taslağı
        const sessionDate = session.date
            ? new Date(session.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
            : '';
        const startTime = session.start_time ? session.start_time.substring(11, 16) || session.start_time.substring(0, 5) : '';
        const defaultMsg = `Sayın Velimiz, öğrencimizin katıldığı "${session.title}" etüt çalışması ${sessionDate} saat ${startTime}'da yapılacaktır. Bilgilerinize sunarız.`;
        setSmsMessage(defaultMsg);

        try {
            const res = await axiosClient.get(`/tutoring/${session.id}`);
            const data = res.data?.data ?? res.data?.tutoring ?? res.data;
            const students: Student[] = Array.isArray(data?.students) ? data.students : [];
            setSmsStudents(students);
            setSelectedStudentIds(students.map(s => s.id));
        } catch (error) {
            setSmsStudents([]);
            setSelectedStudentIds([]);
        } finally {
            setSmsLoading(false);
        }
    };

    // SMS Gönder
    const handleSendSms = async () => {
        if (!smsSession) return;
        if (!smsMessage.trim()) {
            showToast('error', 'Lütfen gönderilecek SMS mesajını yazın.');
            return;
        }
        if (selectedStudentIds.length === 0) {
            showToast('error', 'Lütfen en az bir öğrenci seçin.');
            return;
        }

        try {
            setSmsSending(true);
            await axiosClient.post('/sms/scheduled', {
                title: `${smsSession.title} - Etüt Bilgilendirmesi`,
                message: smsMessage.trim(),
                recipient_type: 'students',
                recipient_ids: selectedStudentIds,
                target_audience: smsTargetAudience,
            });

            showToast('success', `${selectedStudentIds.length} öğrenci için SMS başarıyla gönderildi.`);
            setSmsModalOpen(false);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'SMS gönderimi sırasında bir hata oluştu.';
            showToast('error', msg);
        } finally {
            setSmsSending(false);
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

    // Detay Modalı - Öğrenci Katılım ve Yoklama Listesini Yazdır
    const handlePrintDetail = () => {
        if (!selectedDetail) {
            window.print();
            return;
        }

        const schoolTitle = getSchoolName();
        const dateStr = selectedDetail.date
            ? new Date(selectedDetail.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
            : '-';
        const timeStr = `${selectedDetail.start_time ? (selectedDetail.start_time.length > 5 ? selectedDetail.start_time.substring(11, 16) || selectedDetail.start_time.substring(0, 5) : selectedDetail.start_time) : ''} - ${selectedDetail.end_time ? (selectedDetail.end_time.length > 5 ? selectedDetail.end_time.substring(11, 16) || selectedDetail.end_time.substring(0, 5) : selectedDetail.end_time) : ''}`;
        const studentsList = filteredStudents.length > 0 ? filteredStudents : (selectedDetail.students || []);

        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <title>${selectedDetail.title} - Katılım Listesi</title>
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
<body>
    <div class="no-print">
        <div>
            <strong style="color: #15803d; font-size: 13px;">Etüt ve Yoklama Listesi Çıktı Ekranı</strong>
            <div style="color: #166534; font-size: 11px;">Yazdırma penceresi otomatik açılır. Kapatırsanız veya açılmazsa butona tıklayabilirsiniz.</div>
        </div>
        <button class="btn-print" onclick="window.print()">🖨️ Sayfayı Yazdır / PDF İndir</button>
    </div>

    <div class="header">
        <h1>${schoolTitle}</h1>
        <h2>ETÜT VE ÖZEL DERS KATILIM ÇİZELGESİ</h2>
        <div class="meta">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">Oturum:</td>
            <td><strong>${selectedDetail.title || '-'}</strong></td>
            <td class="label">Tarih:</td>
            <td>${dateStr}</td>
        </tr>
        <tr>
            <td class="label">Ders:</td>
            <td>${selectedDetail.lesson?.name || '-'}</td>
            <td class="label">Saat / Süre:</td>
            <td>${timeStr}</td>
        </tr>
        <tr>
            <td class="label">Öğretmen:</td>
            <td>${selectedDetail.teacher?.name || '-'}</td>
            <td class="label">Derslik / Tip:</td>
            <td>${selectedDetail.room || 'Belirtilmedi'} (${selectedDetail.type_label || (selectedDetail.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt')})</td>
        </tr>
        <tr>
            <td class="label">Katılımcı:</td>
            <td><strong>${studentsList.length} / ${selectedDetail.max_students || 'Limitsiz'} Öğrenci</strong></td>
            <td class="label">ID:</td>
            <td>#${selectedDetail.id}</td>
        </tr>
        ${selectedDetail.notes ? `
        <tr>
            <td class="label">Oturum Notları:</td>
            <td colspan="3">${selectedDetail.notes}</td>
        </tr>
        ` : ''}
    </table>

    <div class="section-title">
        <span>KATILAN ÖĞRENCİ LİSTESİ (${studentsList.length} ÖĞRENCİ)</span>
    </div>
    <table class="list-table">
        <thead>
            <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 70px; text-align: center;">Okul No</th>
                <th>Öğrenci Adı Soyadı</th>
                <th style="width: 80px;">Sınıf</th>
                <th style="width: 105px;">Telefon</th>
                <th style="width: 155px;">Veli İletişim</th>
                <th style="width: 75px; text-align: center;">Yoklama</th>
                <th style="width: 75px; text-align: center;">İmza</th>
            </tr>
        </thead>
        <tbody>
            ${studentsList.length === 0 ? `
                <tr><td colspan="8" class="text-center" style="padding: 15px;">Kayıtlı öğrenci bulunamadı.</td></tr>
            ` : studentsList.map((st, i) => {
                const g = (st.guardians && st.guardians.length > 0) ? st.guardians[0] : null;
                const guardianText = g ? `${g.name || 'Veli'} (${g.phone || '-'})` : '-';
                return `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td class="text-center"><strong>${st.school_no || '-'}</strong></td>
                        <td><strong>${st.name || st.student_name || '-'}</strong></td>
                        <td>${st.classroom?.name || st.classroom_name || '-'}</td>
                        <td>${st.phone || '-'}</td>
                        <td style="font-size: 10px;">${guardianText}</td>
                        <td class="text-center">[ &nbsp; ] Geldi</td>
                        <td></td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-col">
            <div><strong>Dersi Veren Öğretmen</strong></div>
            <div style="margin-top: 4px;">${selectedDetail.teacher?.name || '-'}</div>
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

    // Genel Yoklama Raporunu Yazdır
    const handlePrintReport = () => {
        const schoolTitle = getSchoolName();
        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <title>Genel Etüt ve Yoklama Raporu</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 8px;
            font-size: 11px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #222;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header h1 {
            font-size: 17px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            font-weight: 800;
        }
        .header h2 {
            font-size: 13px;
            margin: 0 0 4px 0;
            font-weight: 700;
            color: #333;
        }
        .stats-bar {
            display: flex;
            justify-content: space-around;
            background: #f8f9fa;
            border: 1px solid #ddd;
            padding: 8px;
            margin-bottom: 12px;
            border-radius: 4px;
        }
        .stat-item { text-align: center; }
        .stat-label { font-size: 10px; color: #666; }
        .stat-val { font-size: 14px; font-weight: bold; color: #111; }
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
            padding: 5px 6px;
            font-size: 10px;
        }
        table.list-table th {
            background-color: #f1f3f5 !important;
            font-weight: bold;
            text-align: left;
        }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${schoolTitle}</h1>
        <h2>GENEL ETÜT VE YOKLAMA RAPORU</h2>
        <div style="font-size: 10px; color: #666;">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>

    <div class="stats-bar">
        <div class="stat-item"><div class="stat-label">Toplam Etüt</div><div class="stat-val">${sessions.length}</div></div>
        <div class="stat-item"><div class="stat-label">Yoklaması Alınan</div><div class="stat-val" style="color: green;">${sessions.filter(s => s.attendance_summary?.taken).length}</div></div>
        <div class="stat-item"><div class="stat-label">Yoklama Bekleyen</div><div class="stat-val" style="color: orange;">${sessions.filter(s => !s.attendance_summary?.taken).length}</div></div>
        <div class="stat-item"><div class="stat-label">Genel Katılım Oranı</div><div class="stat-val" style="color: #0d6efd;">%${computedReportAttendanceRate}</div></div>
    </div>

    <table class="list-table">
        <thead>
            <tr>
                <th style="width: 35px; text-align: center;">ID</th>
                <th>Etüt Oturumu</th>
                <th>Öğretmen</th>
                <th>Ders</th>
                <th>Tarih / Saat</th>
                <th style="text-align: center;">Kayıtlı</th>
                <th style="text-align: center;">Yoklama Durumu</th>
                <th style="text-align: center;">Katılım Dağılımı</th>
            </tr>
        </thead>
        <tbody>
            ${sessions.map(s => {
                const dateStr = s.date ? new Date(s.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                const timeStr = `${s.start_time ? (s.start_time.length > 5 ? s.start_time.substring(11, 16) || s.start_time.substring(0, 5) : s.start_time) : ''} - ${s.end_time ? (s.end_time.length > 5 ? s.end_time.substring(11, 16) || s.end_time.substring(0, 5) : s.end_time) : ''}`;
                const taken = s.attendance_summary?.taken;
                const p = s.attendance_summary?.present || 0;
                const a = s.attendance_summary?.absent || 0;
                const l = s.attendance_summary?.late || 0;
                return `
                    <tr>
                        <td class="text-center">#${s.id}</td>
                        <td><strong>${s.title}</strong></td>
                        <td>${s.teacher?.name || '-'}</td>
                        <td>${s.lesson?.name || '-'}</td>
                        <td>${dateStr} ${timeStr}</td>
                        <td class="text-center">${s.students_count || 0} / ${s.max_students || 'Limitsiz'}</td>
                        <td class="text-center">${taken ? 'ALINDI' : 'ALINMADI'}</td>
                        <td class="text-center">${taken ? `${p} Geldi, ${a} Gelmedi, ${l} Geç` : '-'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>
</body>
</html>`;
        printHtml(html);
    };

    // Listeyi Yazdır (Genel Fallback)
    const handlePrint = () => {
        if (selectedDetail) {
            handlePrintDetail();
        } else if (reportModalOpen) {
            handlePrintReport();
        } else {
            window.print();
        }
    };

    // İstatistik Değerleri
    const totalSessions = stats?.total_sessions ?? stats?.summary?.total_sessions ?? sessions.length ?? 0;
    const attendanceRate = stats?.attendance_rate ?? stats?.summary?.attendance_rate ?? 0;
    const thisWeek = stats?.this_week ?? stats?.summary?.this_week ?? 0;
    const activeRooms = stats?.active_rooms ?? stats?.summary?.active_rooms ?? 0;

    const sessionsWithAttendance = sessions.filter(s => s.attendance_summary?.taken);
    const totalPresentCount = sessionsWithAttendance.reduce((acc, s) => acc + (s.attendance_summary?.present || 0), 0);
    const totalAbsentCount = sessionsWithAttendance.reduce((acc, s) => acc + (s.attendance_summary?.absent || 0), 0);
    const totalRecordedAttendances = totalPresentCount + totalAbsentCount;
    const computedReportAttendanceRate = totalRecordedAttendances > 0
        ? Math.round((totalPresentCount / totalRecordedAttendances) * 100)
        : (attendanceRate || 0);

    // Filtrelenmiş Öğrenci Listesi (Detay Modal için)
    const filteredStudents = (selectedDetail?.students || []).filter(student => {
        if (!studentSearch.trim()) return true;
        const q = studentSearch.toLowerCase();
        const name = (student.name || student.student_name || '').toLowerCase();
        const no = (student.school_no || '').toLowerCase();
        const cls = (student.classroom?.name || student.classroom_name || '').toLowerCase();
        return name.includes(q) || no.includes(q) || cls.includes(q);
    });

    return (
        <div className="container-fluid tutoring-page-container">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3 no-print">
                <div>
                    <h3 className="fw-bold m-0">Etüt ve Özel Ders Yönetimi</h3>
                    <p className="text-muted mb-0">
                        {isTeacher
                            ? 'Size atanmış ek ders ve etüt çalışmalarını buradan yönetebilir, katılan öğrencilere SMS gönderebilirsiniz.'
                            : 'Tüm ek ders ve etüt çalışmalarını buradan yönetebilirsiniz.'}
                    </p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    {!isTeacher && (
                        <>
                            <button
                                type="button"
                                onClick={() => setReportModalOpen(true)}
                                className="btn btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
                                title="Tüm etütlerin genel yoklama ve katılım raporunu görüntüle"
                            >
                                <i className="ti ti-file-analytics fs-5"></i>
                                <span>Genel Yoklama Raporu</span>
                            </button>
                            <Link to="/academic/tutoring/create" className="btn btn-primary">
                                <i className="ti ti-plus me-1"></i> Yeni Oturum Oluştur
                            </Link>
                        </>
                    )}
                    <div className="text-end d-none d-md-block ms-3">
                        <ol className="breadcrumb m-0 py-0">
                            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                            <li className="breadcrumb-item"><a href="/academic/classrooms" className="text-decoration-none text-muted">Akademik</a></li>
                            <li className="breadcrumb-item active fw-medium">Etütler</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="row mb-4 no-print">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-primary text-white">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="avatar-sm bg-white bg-opacity-25 rounded-circle me-3 d-flex align-items-center justify-content-center">
                                    <i className="ti ti-calendar-event fs-4"></i>
                                </div>
                                <div>
                                    <p className="text-white-50 mb-0">Toplam Etüt</p>
                                    <h4 className="mb-0">{totalSessions}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="avatar-sm bg-soft-success text-success rounded-circle me-3 d-flex align-items-center justify-content-center">
                                    <i className="ti ti-users fs-4"></i>
                                </div>
                                <div>
                                    <p className="text-muted mb-0">Katılım Oranı</p>
                                    <h4 className="mb-0">%{attendanceRate}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="avatar-sm bg-soft-warning text-warning rounded-circle me-3 d-flex align-items-center justify-content-center">
                                    <i className="ti ti-clock fs-4"></i>
                                </div>
                                <div>
                                    <p className="text-muted mb-0">Bu Haftaki Dersler</p>
                                    <h4 className="mb-0">{thisWeek}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="avatar-sm bg-soft-info text-info rounded-circle me-3 d-flex align-items-center justify-content-center">
                                    <i className="ti ti-school fs-4"></i>
                                </div>
                                <div>
                                    <p className="text-muted mb-0">Aktif Salonlar</p>
                                    <h4 className="mb-0">{activeRooms}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Etüt Tablosu */}
            <div className="card border-0 shadow-sm no-print">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Oturum Bilgisi</th>
                                    <th>Ders / Öğretmen</th>
                                    <th>Tarih ve Saat</th>
                                    <th>Yer / Tip</th>
                                    <th>Kapasite</th>
                                    <th>Yoklama Durumu</th>
                                    <th className="text-end pe-4">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted">
                                            {isTeacher ? 'Henüz size atanmış bir etüt oturumu bulunmuyor.' : 'Henüz etüt oturumu oluşturulmamış.'}
                                        </td>
                                    </tr>
                                ) : sessions.map(session => (
                                    <tr key={session.id}>
                                        <td className="ps-4">
                                            <div
                                                className="fw-bold text-dark cursor-pointer text-primary-hover"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleOpenDetail(session)}
                                                title="Detayları görüntülemek için tıklayın"
                                            >
                                                {session.title}
                                            </div>
                                            <small className="text-muted">ID: #{session.id}</small>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div>
                                                    <div className="fw-medium">{session.lesson?.name || '-'}</div>
                                                    <small className="text-muted">{session.teacher?.name || '-'}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{session.date ? new Date(session.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</div>
                                            <small className="text-primary fw-medium">
                                                {session.start_time ? (session.start_time.length > 5 ? session.start_time.substring(11, 16) || session.start_time.substring(0, 5) : session.start_time) : ''}
                                                {session.end_time ? ` - ${session.end_time.length > 5 ? session.end_time.substring(11, 16) || session.end_time.substring(0, 5) : session.end_time}` : ''}
                                            </small>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark mb-1 d-block w-fit">{session.room || 'Belirtilmedi'}</span>
                                            <span className={`badge ${session.type === 'private_lesson' ? 'bg-soft-danger text-danger' : 'bg-soft-info text-info'}`}>
                                                {session.type_label || (session.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="flex-grow-1 me-2" style={{ minWidth: '60px' }}>
                                                    <div className="progress progress-sm">
                                                        <div
                                                            className={`progress-bar ${session.students_count >= session.max_students ? 'bg-danger' : 'bg-success'}`}
                                                            style={{ width: `${Math.min(100, (session.students_count / (session.max_students || 1)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <small className="text-muted">{session.students_count}/{session.max_students || '∞'}</small>
                                            </div>
                                        </td>
                                        <td>
                                            {session.attendance_summary?.taken ? (
                                                <div>
                                                    <span className="badge bg-soft-success text-success d-inline-flex align-items-center gap-1">
                                                        <i className="ti ti-check"></i> Alındı (%{session.attendance_summary.rate})
                                                    </span>
                                                    <small className="text-muted d-block mt-1">
                                                        {session.attendance_summary.present} Geldi &bull; {session.attendance_summary.absent} Gelmedi
                                                    </small>
                                                </div>
                                            ) : (
                                                <span className="badge bg-soft-warning text-warning d-inline-flex align-items-center gap-1">
                                                    <i className="ti ti-clock"></i> Bekliyor
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="btn-group">
                                                {/* Detay & Öğrenci Listesi */}
                                                <button
                                                    onClick={() => handleOpenDetail(session)}
                                                    className="btn btn-sm btn-outline-secondary"
                                                    title="Öğrenci Listesi ve Detaylar"
                                                >
                                                    <i className="ti ti-users"></i>
                                                </button>
                                                {/* SMS Gönder */}
                                                <button
                                                    onClick={() => handleOpenSms(session)}
                                                    className="btn btn-sm btn-outline-info"
                                                    title="Etüt Öğrencilerine SMS Gönder"
                                                >
                                                    <i className="ti ti-mail"></i>
                                                </button>
                                                {/* Yoklama Al / Yoklama Raporu */}
                                                <Link
                                                    to={`/academic/tutoring/${session.id}/attendance`}
                                                    className={`btn btn-sm ${session.attendance_summary?.taken ? 'btn-outline-success' : 'btn-outline-warning'}`}
                                                    title={isTeacher ? "Yoklama Al / İncele" : "Yoklama & Katılım Raporu"}
                                                >
                                                    <i className={isTeacher ? "ti ti-user-check" : "ti ti-clipboard-check"}></i>
                                                </Link>
                                                {/* Düzenle & Sil */}
                                                {!isTeacher && (
                                                    <>
                                                        <Link to={`/academic/tutoring/${session.id}/edit`} className="btn btn-sm btn-outline-primary" title="Düzenle">
                                                            <i className="ti ti-edit"></i>
                                                        </Link>
                                                        <button onClick={() => handleDelete(session.id)} className="btn btn-sm btn-outline-danger" title="Sil">
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETAY VE ÖĞRENCİ LİSTESİ MODALI */}
            {detailModalOpen && selectedDetail && (
                <div className="modal show d-block no-print" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content shadow border-0 rounded-3">
                            <div className="modal-header bg-light border-0 py-3 px-4">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar-xs bg-primary text-white rounded d-flex align-items-center justify-content-center">
                                        <i className="ti ti-school fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0">{selectedDetail.title}</h5>
                                        <small className="text-muted">ID: #{selectedDetail.id} &bull; {selectedDetail.lesson?.name}</small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                                        title="Yoklama ve öğrenci listesini yazdır"
                                    >
                                        <i className="ti ti-printer fs-6"></i>
                                        <span>Listeyi Yazdır / Çıktı Al</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDetailModalOpen(false);
                                            handleOpenSms(selectedDetail);
                                        }}
                                        className="btn btn-outline-info btn-sm d-flex align-items-center gap-1"
                                        title="Katılan öğrencilere SMS gönder"
                                    >
                                        <i className="ti ti-mail fs-6"></i>
                                        <span>SMS Gönder</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-close ms-2"
                                        onClick={() => setDetailModalOpen(false)}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-4">
                                {detailLoading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="text-muted mt-2">Öğrenci listesi ve etüt detayları yükleniyor...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Bilgi Kartları */}
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-3 col-6">
                                                <div className="p-3 bg-light rounded-3 h-100">
                                                    <small className="text-muted d-block">Öğretmen</small>
                                                    <strong className="text-dark fs-6">{selectedDetail.teacher?.name || '-'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <div className="p-3 bg-light rounded-3 h-100">
                                                    <small className="text-muted d-block">Tarih & Saat</small>
                                                    <strong className="text-dark fs-6">
                                                        {selectedDetail.date ? new Date(selectedDetail.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                                                    </strong>
                                                    <div className="text-primary small fw-semibold">
                                                        {selectedDetail.start_time ? (selectedDetail.start_time.length > 5 ? selectedDetail.start_time.substring(11, 16) || selectedDetail.start_time.substring(0, 5) : selectedDetail.start_time) : ''}
                                                        {selectedDetail.end_time ? ` - ${selectedDetail.end_time.length > 5 ? selectedDetail.end_time.substring(11, 16) || selectedDetail.end_time.substring(0, 5) : selectedDetail.end_time}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <div className="p-3 bg-light rounded-3 h-100">
                                                    <small className="text-muted d-block">Derslik / Tip</small>
                                                    <strong className="text-dark fs-6">{selectedDetail.room || 'Belirtilmedi'}</strong>
                                                    <div>
                                                        <span className="badge bg-soft-info text-info">{selectedDetail.type_label || (selectedDetail.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <div className="p-3 bg-light rounded-3 h-100">
                                                    <small className="text-muted d-block">Kapasite / Katılım</small>
                                                    <strong className="text-dark fs-6">
                                                        {selectedDetail.students?.length ?? selectedDetail.students_count ?? 0} / {selectedDetail.max_students || 'Limitsiz'}
                                                    </strong>
                                                    <div className="text-muted small">Kayıtlı Öğrenci Sayısı</div>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedDetail.notes && (
                                            <div className="alert alert-light border mb-4">
                                                <i className="ti ti-notes me-1 text-primary"></i>
                                                <strong>Oturum Notları:</strong> {selectedDetail.notes}
                                            </div>
                                        )}

                                        {/* Öğrenci Listesi Tablosu */}
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <h6 className="fw-bold mb-0">
                                                <i className="ti ti-users me-1 text-primary"></i>
                                                Etüte Eklenen Öğrenciler ({selectedDetail.students?.length || 0})
                                            </h6>
                                            <div className="search-box" style={{ maxWidth: '300px' }}>
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-white border-end-0"><i className="ti ti-search text-muted"></i></span>
                                                    <input
                                                        type="text"
                                                        className="form-control border-start-0"
                                                        placeholder="Öğrenci adı, no veya sınıf ara..."
                                                        value={studentSearch}
                                                        onChange={e => setStudentSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="table-responsive border rounded-3">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th style={{ width: '50px' }}>#</th>
                                                        <th>Okul No</th>
                                                        <th>Öğrenci Adı Soyadı</th>
                                                        <th>Sınıfı</th>
                                                        <th>Telefon</th>
                                                        <th>Veli İletişim</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredStudents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-4 text-muted">
                                                                {studentSearch ? 'Arama kriterlerine uygun öğrenci bulunamadı.' : 'Bu etüte henüz öğrenci eklenmemiş.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredStudents.map((student, idx) => {
                                                            const primaryGuardian = (student.guardians && student.guardians.length > 0) ? student.guardians[0] : null;
                                                            return (
                                                                <tr key={student.id}>
                                                                    <td className="text-muted small">{idx + 1}</td>
                                                                    <td>
                                                                        <span className="badge bg-light text-dark fw-bold">{student.school_no || '-'}</span>
                                                                    </td>
                                                                    <td className="fw-bold text-dark">
                                                                        {student.name || student.student_name}
                                                                    </td>
                                                                    <td>
                                                                        <span className="badge bg-soft-primary text-primary">
                                                                            {student.classroom?.name || student.classroom_name || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="small text-muted">
                                                                        {student.phone || '-'}
                                                                    </td>
                                                                    <td className="small">
                                                                        {primaryGuardian ? (
                                                                            <div>
                                                                                <span className="fw-medium text-dark">{primaryGuardian.name}</span>
                                                                                <span className="text-muted ms-1">({primaryGuardian.phone})</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-0 bg-light py-2 px-4">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailModalOpen(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SMS GÖNDERME MODALI */}
            {smsModalOpen && smsSession && (
                <div className="modal show d-block no-print" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content shadow border-0 rounded-3">
                            <div className="modal-header bg-light border-0 py-3 px-4">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar-xs bg-info text-white rounded d-flex align-items-center justify-content-center">
                                        <i className="ti ti-mail fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0">Etüt Öğrencilerine SMS Gönder</h5>
                                        <small className="text-muted">{smsSession.title} &bull; {smsSession.lesson?.name}</small>
                                    </div>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setSmsModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {smsLoading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-info" role="status"></div>
                                        <p className="text-muted mt-2">Öğrenci ve veli bilgileri hazırlanıyor...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Hedef Kitle Seçimi */}
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Alıcı Hedef Kitle</label>
                                            <div className="d-flex flex-wrap gap-2">
                                                {[
                                                    { id: 'guardians', label: 'Veliler (Anne & Baba)' },
                                                    { id: 'mother', label: 'Sadece Anneler' },
                                                    { id: 'father', label: 'Sadece Babalar' },
                                                    { id: 'student', label: 'Sadece Öğrenciler' },
                                                    { id: 'all', label: 'Öğrenci + Veliler' },
                                                ].map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setSmsTargetAudience(item.id as any)}
                                                        className={`btn btn-sm ${smsTargetAudience === item.id ? 'btn-info text-white fw-bold shadow-sm' : 'btn-outline-secondary'}`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Öğrenci Seçimi */}
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <label className="form-label fw-bold mb-0">
                                                    Alıcı Öğrenciler ({selectedStudentIds.length} / {smsStudents.length} Seçili)
                                                </label>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-sm p-0 text-decoration-none"
                                                        onClick={() => setSelectedStudentIds(smsStudents.map(s => s.id))}
                                                    >
                                                        Tümünü Seç
                                                    </button>
                                                    <span className="text-muted">|</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
                                                        onClick={() => setSelectedStudentIds([])}
                                                    >
                                                        Temizle
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="border rounded p-2" style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                                                {smsStudents.length === 0 ? (
                                                    <div className="text-muted small p-2">Bu etüte kayıtlı öğrenci bulunamadı.</div>
                                                ) : (
                                                    <div className="row g-2">
                                                        {smsStudents.map(student => {
                                                            const isChecked = selectedStudentIds.includes(student.id);
                                                            return (
                                                                <div key={student.id} className="col-md-6">
                                                                    <div
                                                                        className={`form-check p-2 rounded cursor-pointer ${isChecked ? 'bg-white border border-info' : 'border border-light'}`}
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => {
                                                                            if (isChecked) {
                                                                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                                            } else {
                                                                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <input
                                                                            className="form-check-input ms-0 me-2"
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {}}
                                                                        />
                                                                        <label className="form-check-label small fw-semibold text-dark">
                                                                            {student.name || student.student_name}
                                                                            {student.school_no && <span className="text-muted ms-1">({student.school_no})</span>}
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* SMS Metni */}
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <label className="form-label fw-bold mb-0">SMS Mesaj Metni</label>
                                                <small className="text-muted">
                                                    {smsMessage.length} karakter &bull; {Math.ceil(smsMessage.length / 160) || 1} SMS
                                                </small>
                                            </div>
                                            <textarea
                                                className="form-control"
                                                rows={4}
                                                value={smsMessage}
                                                onChange={e => setSmsMessage(e.target.value)}
                                                placeholder="Gönderilecek SMS metnini buraya yazın..."
                                            ></textarea>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-0 bg-light py-2 px-4">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSmsModalOpen(false)}>
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-info text-white btn-sm d-flex align-items-center gap-1 shadow-sm"
                                    onClick={handleSendSms}
                                    disabled={smsSending || selectedStudentIds.length === 0 || !smsMessage.trim()}
                                >
                                    {smsSending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status"></span>
                                            <span>Gönderiliyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ti ti-send"></i>
                                            <span>SMS Gönder ({selectedStudentIds.length} Alıcı)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* YAZDIRILABİLİR ETÜT ÇIKTI ŞABLONU (Sadece window.print() esnasında görünür) */}
            <div id="printable-tutoring-sheet" className="print-only">
                {selectedDetail && (
                    <div className="print-content">
                        {/* Kurum Başlığı */}
                        <div className="print-header text-center pb-3 border-bottom">
                            <h2 className="fw-bold mb-1">EDULEM EĞİTİM KURUMLARI</h2>
                            <h4 className="fw-bold text-uppercase mb-1">ETÜT VE ÖZEL DERS KATILIM ÇİZELGESİ</h4>
                            <div className="text-muted small">Rapor Tarihi: {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        {/* Oturum Bilgileri Özeti */}
                        <div className="print-session-info my-3 p-2 border rounded">
                            <table className="table table-sm table-borderless mb-0">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '20%' }}><strong>Oturum Başlığı:</strong></td>
                                        <td style={{ width: '30%' }}>{selectedDetail.title}</td>
                                        <td style={{ width: '20%' }}><strong>Tarih:</strong></td>
                                        <td style={{ width: '30%' }}>{selectedDetail.date ? new Date(selectedDetail.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Ders:</strong></td>
                                        <td>{selectedDetail.lesson?.name || '-'}</td>
                                        <td><strong>Saat / Süre:</strong></td>
                                        <td>
                                            {selectedDetail.start_time ? (selectedDetail.start_time.length > 5 ? selectedDetail.start_time.substring(11, 16) || selectedDetail.start_time.substring(0, 5) : selectedDetail.start_time) : ''}
                                            {selectedDetail.end_time ? ` - ${selectedDetail.end_time.length > 5 ? selectedDetail.end_time.substring(11, 16) || selectedDetail.end_time.substring(0, 5) : selectedDetail.end_time}` : ''}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Öğretmen:</strong></td>
                                        <td>{selectedDetail.teacher?.name || '-'}</td>
                                        <td><strong>Derslik / Salon:</strong></td>
                                        <td>{selectedDetail.room || 'Belirtilmedi'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Etüt Türü:</strong></td>
                                        <td>{selectedDetail.type_label || (selectedDetail.type === 'private_lesson' ? 'Özel Ders' : 'Grup Etüt')}</td>
                                        <td><strong>Toplam Katılımcı:</strong></td>
                                        <td>{selectedDetail.students?.length || selectedDetail.students_count || 0} Öğrenci</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Öğrenci Yoklama & İmza Çizelgesi */}
                        <h6 className="fw-bold mb-2">KATILAN ÖĞRENCİ LİSTESİ</h6>
                        <table className="table table-bordered table-sm align-middle print-table">
                            <thead>
                                <tr className="bg-light">
                                    <th style={{ width: '40px', textAlign: 'center' }}>Sıra</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Okul No</th>
                                    <th>Öğrenci Adı Soyadı</th>
                                    <th style={{ width: '120px' }}>Sınıf / Şube</th>
                                    <th style={{ width: '130px' }}>Veli Telefonu</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Yoklama</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>İmza</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(selectedDetail.students || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-3 text-muted">Kayıtlı öğrenci bulunmamaktadır.</td>
                                    </tr>
                                ) : (
                                    selectedDetail.students!.map((st, i) => {
                                        const g = (st.guardians && st.guardians.length > 0) ? st.guardians[0] : null;
                                        return (
                                            <tr key={st.id}>
                                                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                                <td style={{ textAlign: 'center' }}>{st.school_no || '-'}</td>
                                                <td className="fw-bold">{st.name || st.student_name}</td>
                                                <td>{st.classroom?.name || st.classroom_name || '-'}</td>
                                                <td className="small">{g ? g.phone : (st.phone || '-')}</td>
                                                <td style={{ textAlign: 'center' }}>[ &nbsp; ] Geldi</td>
                                                <td></td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* İmza Alanları */}
                        <div className="print-footer row mt-5 pt-4">
                            <div className="col-6 text-center">
                                <p className="mb-4"><strong>Dersi Veren Öğretmen</strong></p>
                                <p className="mb-0">{selectedDetail.teacher?.name}</p>
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

            {/* GENEL YOKLAMA RAPORU MODALI (Yöneticiler için) */}
            {reportModalOpen && (
                <div className="modal show d-block no-print" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content shadow border-0 rounded-3">
                            <div className="modal-header bg-light border-0 py-3 px-4">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="avatar-xs bg-primary text-white rounded d-flex align-items-center justify-content-center">
                                        <i className="ti ti-file-analytics fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold mb-0">Genel Etüt & Yoklama Raporu</h5>
                                        <small className="text-muted">Tüm etüt oturumlarının yoklama ve katılım durumları</small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                                    >
                                        <i className="ti ti-printer fs-6"></i>
                                        <span>Raporu Yazdır</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-close ms-2"
                                        onClick={() => setReportModalOpen(false)}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body p-4">
                                {/* Özet Sayaçlar */}
                                <div className="row g-3 mb-4">
                                    <div className="col-md-3 col-6">
                                        <div className="p-3 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block">Toplam Etüt</small>
                                            <h4 className="fw-bold mb-0 text-primary">{sessions.length}</h4>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-6">
                                        <div className="p-3 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block">Yoklaması Alınan</small>
                                            <h4 className="fw-bold mb-0 text-success">
                                                {sessions.filter(s => s.attendance_summary?.taken).length}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-6">
                                        <div className="p-3 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block">Yoklama Bekleyen</small>
                                            <h4 className="fw-bold mb-0 text-warning">
                                                {sessions.filter(s => !s.attendance_summary?.taken).length}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-6">
                                        <div className="p-3 bg-light rounded-3 text-center">
                                            <small className="text-muted d-block">Genel Katılım Oranı</small>
                                            <h4 className="fw-bold mb-0 text-info">%{computedReportAttendanceRate}</h4>
                                        </div>
                                    </div>
                                </div>

                                {/* Oturumlar Rapor Tablosu */}
                                <div className="table-responsive border rounded-3">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-3">ID</th>
                                                <th>Etüt Oturumu</th>
                                                <th>Öğretmen</th>
                                                <th>Ders</th>
                                                <th>Tarih / Saat</th>
                                                <th>Kayıtlı</th>
                                                <th>Yoklama Durumu</th>
                                                <th>Katılım Özeti</th>
                                                <th className="text-end pe-3">Detay</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sessions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="text-center py-4 text-muted">Kayıtlı etüt bulunamadı.</td>
                                                </tr>
                                            ) : (
                                                sessions.map(s => (
                                                    <tr key={s.id}>
                                                        <td className="ps-3 text-muted small">#{s.id}</td>
                                                        <td>
                                                            <strong className="text-dark d-block">{s.title}</strong>
                                                            <small className="text-muted">{s.room || 'Salon belirtilmedi'}</small>
                                                        </td>
                                                        <td>{s.teacher?.name || '-'}</td>
                                                        <td>{s.lesson?.name || '-'}</td>
                                                        <td>
                                                            <div>{s.date ? new Date(s.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</div>
                                                            <small className="text-muted">
                                                                {s.start_time ? (s.start_time.length > 5 ? s.start_time.substring(11, 16) || s.start_time.substring(0, 5) : s.start_time) : ''}
                                                            </small>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-light text-dark fw-bold">{s.students_count} Öğrenci</span>
                                                        </td>
                                                        <td>
                                                            {s.attendance_summary?.taken ? (
                                                                <span className="badge bg-success-subtle text-success">
                                                                    <i className="ti ti-check me-1"></i> Alındı
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-warning-subtle text-warning">
                                                                    <i className="ti ti-clock me-1"></i> Bekliyor
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {s.attendance_summary?.taken ? (
                                                                <div>
                                                                    <strong className="text-success small">{s.attendance_summary.present} Geldi</strong>
                                                                    {s.attendance_summary.absent > 0 && (
                                                                        <span className="text-danger small ms-1">&bull; {s.attendance_summary.absent} Gelmedi</span>
                                                                    )}
                                                                    <div className="small text-muted">Oran: %{s.attendance_summary.rate}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted small">Henüz girilmedi</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end pe-3">
                                                            <Link
                                                                to={`/academic/tutoring/${s.id}/attendance`}
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => setReportModalOpen(false)}
                                                                title="Yoklama Raporunu İncele"
                                                            >
                                                                <i className="ti ti-clipboard-check me-1"></i> İncele
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer border-0 bg-light py-2 px-4">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReportModalOpen(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .w-fit { width: fit-content; }
                .progress-sm { height: 6px; }
                .bg-soft-success { background-color: rgba(25, 135, 84, 0.1); }
                .bg-soft-warning { background-color: rgba(255, 193, 7, 0.1); }
                .bg-soft-danger { background-color: rgba(220, 53, 69, 0.1); }
                .bg-soft-info { background-color: rgba(13, 202, 240, 0.1); }
                .text-primary-hover:hover { color: var(--bs-primary) !important; text-decoration: underline; }

                /* YAZDIRMA STILLERI */
                .print-only {
                    display: none;
                }

                @media print {
                    /* Menü, üst çubuk, modal ve no-print elementlerini gizle */
                    .no-print, .sidenav-menu, .topbar, footer, .modal-backdrop, .modal, .offcanvas, .btn, button {
                        display: none !important;
                    }

                    /* Ana sarmalayıcıların görünürlüğünü koru (.wrapper display:none YAPILMAMALIDIR) */
                    html, body, .wrapper, .page-content, .content-page, .content, .container-fluid, .tutoring-page-container {
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

                    #printable-tutoring-sheet {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    #printable-tutoring-sheet * {
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

export default TutoringList;
