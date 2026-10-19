import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import { showToast, confirmDialog } from '../../utils/toast';
import * as XLSX from 'xlsx';

interface Student {
    id: number;
    name: string;
    school_no?: string | number;
    classroom_id?: number;
    classroom?: {
        id: number;
        name: string;
    };
    gender?: string;
}

interface Classroom {
    id: number;
    name: string;
    grade_level?: string | number;
    capacity?: number;
    students_count?: number;
}

interface ExamRoom {
    id: string;
    name: string;
    capacity: number;
    invigilator?: string; // Gözetmen öğretmen
}

interface AssignedSeat {
    seatNumber: number;
    deskCode?: string; // örn: 1-A, 1-B veya 01
    student: Student;
    roomId: string;
    roomName: string;
}

interface SavedSeatingPlan {
    id: string;
    title: string;
    date: string;
    time?: string;
    algorithm: 'butterfly' | 'random' | 'balanced';
    deskLayout: 'single' | 'double';
    rooms: ExamRoom[];
    selectedClassIds: number[];
    assignments: AssignedSeat[];
    createdAt: string;
}

const STORAGE_KEY = 'EDULEM_TRIAL_EXAM_SEATING_PLANS';

export default function TrialExamSeating() {
    // ─── Genel State'ler ───
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [omrExams, setOmrExams] = useState<any[]>([]);

    // ─── Adım 1: Sınav Bilgileri ───
    const [examTitle, setExamTitle] = useState('');
    const [examDate, setExamDate] = useState(() => new Date().toISOString().substring(0, 10));
    const [examTime, setExamTime] = useState('09:30');
    const [selectedOmrExamId, setSelectedOmrExamId] = useState('');

    // ─── Adım 2: Sınıf Seçimi ───
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
    const [classGradeFilter, setClassGradeFilter] = useState('');

    // ─── Adım 3: Sınav Salonları ───
    const [rooms, setRooms] = useState<ExamRoom[]>([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomCapacity, setNewRoomCapacity] = useState<number>(20);

    // ─── Adım 4: Dağıtım Modu ve Algoritma ───
    const [algorithm, setAlgorithm] = useState<'butterfly' | 'random' | 'balanced'>('butterfly');
    const [deskLayout, setDeskLayout] = useState<'single' | 'double'>('double');
    const [sortBy, setSortBy] = useState<'number' | 'name' | 'random'>('random');

    // ─── Sonuçlar ───
    const [assignments, setAssignments] = useState<AssignedSeat[]>([]);
    const [activeTab, setActiveTab] = useState<'rooms' | 'grid' | 'all' | 'classes'>('rooms');
    const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
    const [searchStudentQuery, setSearchStudentQuery] = useState('');
    const [savedPlans, setSavedPlans] = useState<SavedSeatingPlan[]>([]);
    const [selectedSavedPlanId, setSelectedSavedPlanId] = useState<string>('');

    // Sayfa ilk yüklendiğinde sınıfları, OMR sınavlarını ve yerel kayıtları getir
    useEffect(() => {
        fetchClassrooms();
        fetchOmrExams();
        loadSavedPlans();
    }, []);

    const loadSavedPlans = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) setSavedPlans(list);
            }
        } catch (e) {
            console.error('Kayıtlı planlar okunamadı', e);
        }
    };

    const fetchClassrooms = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/classrooms?per_page=500');
            const data = res.data?.data?.classrooms || res.data?.data || [];
            const list = Array.isArray(data) ? data : [];
            const sorted = [...list].sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'));
            setClassrooms(sorted);
        } catch (error) {
            console.error('Sınıflar yüklenemedi', error);
            showToast('error', 'Sınıf listesi alınamadı');
        } finally {
            setLoading(false);
        }
    };

    const fetchOmrExams = async () => {
        try {
            const res = await axiosClient.get('/omr/exams?per_page=100');
            const data = res.data?.data?.exams || res.data?.data || [];
            if (Array.isArray(data)) setOmrExams(data);
        } catch {
            // OMR modülü aktif değilse sessiz kal
        }
    };

    // OMR sınavı seçildiğinde başlığı otomatik doldur
    const handleOmrExamChange = (examId: string) => {
        setSelectedOmrExamId(examId);
        if (!examId) return;
        const exam = omrExams.find(e => String(e.id) === examId);
        if (exam) {
            setExamTitle(exam.name || '');
            if (exam.exam_date) {
                setExamDate(exam.exam_date.substring(0, 10));
            }
        }
    };

    // Filtrelenmiş sınıflar
    const filteredClassrooms = useMemo(() => {
        if (!classGradeFilter) return classrooms;
        return classrooms.filter(c => String(c.grade_level || '').includes(classGradeFilter) || String(c.name || '').startsWith(classGradeFilter));
    }, [classrooms, classGradeFilter]);

    // Seçili sınıfların toplam öğrenci tahmini
    const totalEstimatedStudents = useMemo(() => {
        return selectedClassIds.reduce((sum, id) => {
            const cls = classrooms.find(c => c.id === id);
            return sum + (cls?.students_count || 0);
        }, 0);
    }, [classrooms, selectedClassIds]);

    // Toplam salon kapasitesi
    const totalRoomCapacity = useMemo(() => {
        return rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);
    }, [rooms]);

    // Sınıf seçimi toggle
    const handleToggleClass = (classId: number) => {
        setSelectedClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
    };

    const handleSelectAllFilteredClasses = () => {
        const ids = filteredClassrooms.map(c => c.id);
        setSelectedClassIds(prev => Array.from(new Set([...prev, ...ids])));
    };

    const handleClearClassSelection = () => {
        setSelectedClassIds([]);
    };

    // Seçilen sınıfları doğrudan salon olarak ekle
    const handleAddSelectedClassesAsRooms = () => {
        if (selectedClassIds.length === 0) {
            showToast('warning', 'Lütfen önce yukarıdan en az bir sınıf seçiniz.');
            return;
        }

        const newRooms: ExamRoom[] = selectedClassIds.map(id => {
            const cls = classrooms.find(c => c.id === id);
            return {
                id: `room_${id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: cls?.name ? `${cls.name} Salonu` : `Salon ${id}`,
                capacity: cls?.capacity && cls.capacity > 0 ? cls.capacity : 20,
                invigilator: ''
            };
        });

        setRooms(prev => [...prev, ...newRooms]);
        showToast('success', `${newRooms.length} adet salon eklendi.`);
    };

    // Özel salon ekleme
    const handleAddCustomRoom = () => {
        if (!newRoomName.trim()) {
            showToast('warning', 'Lütfen salon adı giriniz.');
            return;
        }
        const cap = Number(newRoomCapacity) > 0 ? Number(newRoomCapacity) : 20;
        const newR: ExamRoom = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: newRoomName.trim(),
            capacity: cap,
            invigilator: ''
        };
        setRooms(prev => [...prev, newR]);
        setNewRoomName('');
        setNewRoomCapacity(20);
        showToast('success', 'Salon eklendi.');
    };

    const handleRemoveRoom = (roomId: string) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
    };

    const handleUpdateRoom = (roomId: string, field: keyof ExamRoom, value: any) => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, [field]: value } : r));
    };

    // ─── DAĞITIM VE KELEBEK HESAPLAMA MOTORU ───
    const handleGenerateDistribution = async () => {
        if (!examTitle.trim()) {
            showToast('warning', 'Lütfen bir sınav başlığı giriniz.');
            return;
        }
        if (selectedClassIds.length === 0) {
            showToast('warning', 'Lütfen sınava girecek sınıfları seçiniz.');
            return;
        }
        if (rooms.length === 0) {
            showToast('warning', 'Lütfen en az bir sınav salonu ekleyiniz.');
            return;
        }

        try {
            setCalculating(true);
            showToast('info', 'Öğrenci verileri çekiliyor ve dağıtım hesaplanıyor...');

            // Seçilen sınıflardaki öğrencileri getir
            // Güvenli yöntem: Seçilen tüm sınıflar için öğrencileri çek
            const classIdsParam = selectedClassIds.join(',');
            const res = await axiosClient.get(`/students?classroom_ids=${classIdsParam}&per_page=5000&is_active=1`);
            const rawData = res.data?.data?.students?.data || res.data?.data?.students || res.data?.data || [];
            let allStudents: Student[] = (Array.isArray(rawData) ? rawData : []).map((s: any) => ({
                id: Number(s.id),
                name: String(s.name || s.student_name || 'İsimsiz Öğrenci'),
                school_no: s.school_no || '',
                classroom_id: Number(s.classroom_id || s.classroom?.id || 0),
                classroom: s.classroom ? { id: Number(s.classroom.id), name: String(s.classroom.name) } : undefined,
                gender: s.gender || ''
            }));

            // Sınıf bilgisini classrooms listesinden zenginleştir
            allStudents = allStudents.map(st => {
                if (!st.classroom && st.classroom_id) {
                    const matchCls = classrooms.find(c => c.id === st.classroom_id);
                    if (matchCls) {
                        st.classroom = { id: matchCls.id, name: matchCls.name };
                    }
                }
                return st;
            });

            if (allStudents.length === 0) {
                showToast('error', 'Seçilen sınıflarda aktif öğrenci bulunamadı.');
                setCalculating(false);
                return;
            }

            if (totalRoomCapacity < allStudents.length) {
                const confirmed = await confirmDialog({
                    title: 'Kapasite Yetersiz',
                    text: `Toplam ${allStudents.length} öğrenci var fakat salonların toplam kapasitesi ${totalRoomCapacity}. Açıkta kalacak öğrenciler olabilir. Yine de devam edilsin mi?`,
                    icon: 'warning',
                    confirmText: 'Yine de Devam Et',
                    cancelText: 'İptal'
                });
                if (!confirmed) {
                    setCalculating(false);
                    return;
                }
            }

            // Dağıtım Algoritmasını Çalıştır
            const generatedAssignments = executeDistribution(allStudents, rooms, algorithm, deskLayout, sortBy);
            setAssignments(generatedAssignments);

            // Planı otomatik olarak localStorage'a kaydet
            const newPlan: SavedSeatingPlan = {
                id: `plan_${Date.now()}`,
                title: examTitle.trim(),
                date: examDate,
                time: examTime,
                algorithm,
                deskLayout,
                rooms,
                selectedClassIds,
                assignments: generatedAssignments,
                createdAt: new Date().toLocaleString('tr-TR')
            };

            const updatedPlans = [newPlan, ...savedPlans.filter(p => p.title !== newPlan.title)].slice(0, 20);
            setSavedPlans(updatedPlans);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));

            showToast('success', `Tebrikler! ${generatedAssignments.length} öğrenci başarıyla salonlara ve sıralara yerleştirildi.`);

            // Sonuçlar bölümüne kaydır
            setTimeout(() => {
                const el = document.getElementById('results-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 200);

        } catch (error: any) {
            console.error('Dağıtım hesaplama hatası:', error);
            showToast('error', error.response?.data?.message || 'Dağıtım oluşturulurken hata meydana geldi');
        } finally {
            setCalculating(false);
        }
    };

    // ─── DAĞITIM ALGORİTMASI ÇEKİRDEĞİ ───
    const executeDistribution = (
        studentPool: Student[],
        roomPool: ExamRoom[],
        algo: 'butterfly' | 'random' | 'balanced',
        layout: 'single' | 'double',
        sortMode: 'number' | 'name' | 'random'
    ): AssignedSeat[] => {
        const results: AssignedSeat[] = [];

        // 1. Öğrencileri sınıflarına göre grupla
        const classMap: { [classId: number]: Student[] } = {};
        studentPool.forEach(s => {
            const cId = s.classroom_id || 0;
            if (!classMap[cId]) classMap[cId] = [];
            classMap[cId].push(s);
        });

        // Her sınıfın öğrencilerini belirtilen kurala göre sırala
        Object.keys(classMap).forEach(key => {
            const list = classMap[Number(key)];
            if (sortMode === 'number') {
                list.sort((a, b) => Number(a.school_no || 0) - Number(b.school_no || 0));
            } else if (sortMode === 'name') {
                list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
            } else {
                // Fisher-Yates shuffle
                for (let i = list.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [list[i], list[j]] = [list[j], list[i]];
                }
            }
        });

        if (algo === 'random') {
            // Tam Rastgele Karma: Tüm öğrencileri birleştirip karıştır ve sırayla salonlara doldur
            let all = [...studentPool];
            for (let i = all.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all[i], all[j]] = [all[j], all[i]];
            }

            let studentIdx = 0;
            for (const room of roomPool) {
                const cap = Number(room.capacity) || 20;
                for (let seat = 1; seat <= cap; seat++) {
                    if (studentIdx >= all.length) break;
                    const student = all[studentIdx++];
                    results.push({
                        seatNumber: seat,
                        deskCode: layout === 'double' ? `${Math.ceil(seat / 2)}-${seat % 2 === 1 ? 'A' : 'B'}` : `${seat}`,
                        student,
                        roomId: room.id,
                        roomName: room.name
                    });
                }
            }
            return results;
        }

        // Kelebek (Butterfly) veya Dengeli Dağıtım:
        // Şubeleri döngüsel olarak karıştır (Interleave)
        const classIds = Object.keys(classMap).map(Number);
        // Çoktan aza doğru sırala
        classIds.sort((a, b) => classMap[b].length - classMap[a].length);

        // Her salon için öğrenci listesi oluştur
        // Kelebek düzeninde sınıflar ardışık olarak salonlara paylaştırılır
        const roomAssignments: { [roomId: string]: Student[] } = {};
        roomPool.forEach(r => { roomAssignments[r.id] = []; });

        let currentRoomIdx = 0;
        let active = true;
        let classOffset = 0;

        while (active) {
            active = false;
            // Her turda farklı bir sınıf sırasıyla başla (çapraz / kelebek örgüsü)
            for (let i = 0; i < classIds.length; i++) {
                const cIdx = (i + classOffset) % classIds.length;
                const cId = classIds[cIdx];
                const list = classMap[cId];
                if (list && list.length > 0) {
                    active = true;
                    const student = list.shift()!;

                    // Uygun kapasitesi olan bir salon bul
                    let targetRoomFound = false;
                    for (let rAttempt = 0; rAttempt < roomPool.length; rAttempt++) {
                        const rIndex = (currentRoomIdx + rAttempt) % roomPool.length;
                        const r = roomPool[rIndex];
                        const curRoomList = roomAssignments[r.id];
                        const maxCap = Number(r.capacity) || 20;

                        if (curRoomList.length < maxCap) {
                            // Kelebek kontrolü: Eğer bu salondaki son öğrenci aynı sınıftan değilse buraya koy!
                            const lastStudent = curRoomList[curRoomList.length - 1];
                            const isSameClass = lastStudent && lastStudent.classroom_id === student.classroom_id;

                            if (!isSameClass || rAttempt === roomPool.length - 1) {
                                curRoomList.push(student);
                                currentRoomIdx = (rIndex + 1) % roomPool.length;
                                targetRoomFound = true;
                                break;
                            }
                        }
                    }

                    if (!targetRoomFound) {
                        // Tüm salonlar dolmuşsa
                        active = false;
                        break;
                    }
                }
            }
            classOffset++;
        }

        // Salon içi sıraları numaralandır
        roomPool.forEach(room => {
            const studentsInRoom = roomAssignments[room.id] || [];
            studentsInRoom.forEach((student, idx) => {
                const seatNo = idx + 1;
                const deskCode = layout === 'double'
                    ? `${Math.ceil(seatNo / 2)}-${seatNo % 2 === 1 ? 'A (Sol)' : 'B (Sağ)'}`
                    : `Sıra ${seatNo}`;

                results.push({
                    seatNumber: seatNo,
                    deskCode,
                    student,
                    roomId: room.id,
                    roomName: room.name
                });
            });
        });

        return results;
    };

    // Kayıtlı planı geri yükle
    const handleRestorePlan = (plan: SavedSeatingPlan) => {
        setExamTitle(plan.title);
        setExamDate(plan.date);
        if (plan.time) setExamTime(plan.time);
        setAlgorithm(plan.algorithm);
        setDeskLayout(plan.deskLayout);
        setRooms(plan.rooms);
        setSelectedClassIds(plan.selectedClassIds);
        setAssignments(plan.assignments);
        setSelectedSavedPlanId(plan.id);
        showToast('success', `"${plan.title}" planı başarıyla yüklendi.`);
    };

    const handleDeleteSavedPlan = (planId: string) => {
        const filtered = savedPlans.filter(p => p.id !== planId);
        setSavedPlans(filtered);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        if (selectedSavedPlanId === planId) setSelectedSavedPlanId('');
        showToast('info', 'Plan silindi.');
    };

    // ─── DIŞA AKTARMA: EXCEL ───
    const handleExportExcel = () => {
        if (assignments.length === 0) {
            showToast('warning', 'Dışa aktarılacak dağıtım sonucu bulunamadı.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. Genel Liste Sayfası
        const allData = assignments.map((a, idx) => ({
            'Sıra': idx + 1,
            'Sınav Salonu': a.roomName,
            'Sıra No': a.seatNumber,
            'Sıra Kodu': a.deskCode || a.seatNumber,
            'Okul No': a.student.school_no || '-',
            'Öğrenci Adı Soyadı': a.student.name,
            'Asıl Sınıfı': a.student.classroom?.name || '-',
            'İmza': ''
        }));
        const wsAll = XLSX.utils.json_to_sheet(allData);
        XLSX.utils.book_append_sheet(wb, wsAll, 'Genel_Dagitim_Listesi');

        // 2. Salon Salon Sayfalar
        rooms.forEach(room => {
            const roomAssignments = assignments.filter(a => a.roomId === room.id);
            if (roomAssignments.length > 0) {
                const roomData = roomAssignments.map(a => ({
                    'Sıra No': a.seatNumber,
                    'Sıra Kodu': a.deskCode || a.seatNumber,
                    'Okul No': a.student.school_no || '-',
                    'Öğrenci Adı Soyadı': a.student.name,
                    'Asıl Sınıfı': a.student.classroom?.name || '-',
                    'İmza': ''
                }));
                const wsRoom = XLSX.utils.json_to_sheet(roomData);
                // Sheet name max 31 karakter
                const safeName = room.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 30);
                XLSX.utils.book_append_sheet(wb, wsRoom, safeName || `Salon_${room.id}`);
            }
        });

        const safeTitle = (examTitle || 'Deneme_Sinavi').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `${safeTitle}_Kelebek_Dagitim_Plani.xlsx`);
        showToast('success', 'Excel dosyası başarıyla indirildi.');
    };

    // ─── DIŞA AKTARMA: YAZDIR / RESMİ KAPI LİSTESİ ───
    const handlePrintDoorLists = () => {
        if (assignments.length === 0) {
            showToast('warning', 'Yazdırılacak sonuç bulunamadı.');
            return;
        }
        window.print();
    };

    // Filtrelenmiş sonuçlar
    const displayedAssignments = useMemo(() => {
        return assignments.filter(a => {
            if (selectedRoomFilter !== 'all' && a.roomId !== selectedRoomFilter) {
                return false;
            }
            if (searchStudentQuery.trim()) {
                const q = searchStudentQuery.trim().toLocaleLowerCase('tr');
                const nameM = a.student.name.toLocaleLowerCase('tr').includes(q);
                const noM = String(a.student.school_no || '').includes(q);
                const clsM = (a.student.classroom?.name || '').toLocaleLowerCase('tr').includes(q);
                const roomM = a.roomName.toLocaleLowerCase('tr').includes(q);
                if (!nameM && !noM && !clsM && !roomM) return false;
            }
            return true;
        });
    }, [assignments, selectedRoomFilter, searchStudentQuery]);

    // Sınıf bazında renk paleti (Kelebek görselleştirmesi için)
    const classColors = [
        'bg-primary text-white',
        'bg-success text-white',
        'bg-info text-dark',
        'bg-warning text-dark',
        'bg-danger text-white',
        'bg-dark text-white',
        'bg-secondary text-white',
        'bg-primary-subtle text-primary border border-primary',
        'bg-success-subtle text-success border border-success'
    ];

    const getClassColorBadge = (classId?: number) => {
        if (!classId) return 'bg-light text-dark';
        const idx = selectedClassIds.indexOf(classId);
        return idx >= 0 ? classColors[idx % classColors.length] : 'bg-light text-dark';
    };

    return (
        <div className="container-fluid py-3 trial-exam-container">
            {/* Özel Baskı Stili (A4 Sayfa Bölmeli Resmi Kapı Listeleri) */}
            <style>{`
                @media print {
                    body {
                        background: #fff !important;
                        color: #000 !important;
                        font-size: 12pt;
                    }
                    /* Ekrandaki her şeyi gizle */
                    .side-nav, .topbar, .navbar, .card-header, .no-print, .btn, .breadcrumb, footer, .alert {
                        display: none !important;
                    }
                    .trial-exam-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                    }
                    .print-only-block {
                        display: block !important;
                    }
                    .print-page {
                        page-break-after: always !important;
                        break-after: page !important;
                        padding: 20mm 15mm;
                        margin: 0;
                    }
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #333 !important;
                        padding: 6px 10px !important;
                        text-align: left;
                    }
                    .print-table th {
                        background-color: #f0f0f0 !important;
                        font-weight: bold;
                    }
                }
                @media screen {
                    .print-only-block {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Üst Başlık & Eylemler */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2 no-print">
                <div>
                    <h3 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        <i className="ti ti-layers-intersect text-primary"></i>
                        Deneme Sınavı Sınıf & Oturma Düzeni
                    </h3>
                    <p className="text-muted mb-0">
                        Kelebek Sınav Sistemi ve Karma Dağıtım Algoritmaları ile sınav salonları, kapı listeleri ve oturma planı oluşturun.
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {savedPlans.length > 0 && (
                        <div className="dropdown">
                            <button
                                className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1"
                                type="button"
                                data-bs-toggle="dropdown"
                            >
                                <i className="ti ti-history"></i>
                                Kayıtlı Planlar ({savedPlans.length})
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                {savedPlans.map(p => (
                                    <li key={p.id} className="d-flex justify-content-between align-items-center px-3 py-1">
                                        <button
                                            type="button"
                                            className="dropdown-item text-start p-1"
                                            onClick={() => handleRestorePlan(p)}
                                        >
                                            <div className="fw-semibold">{p.title}</div>
                                            <small className="text-muted">{p.date} • {p.assignments.length} Öğrenci</small>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm text-danger p-0 ms-2"
                                            onClick={() => handleDeleteSavedPlan(p.id)}
                                            title="Sil"
                                        >
                                            <i className="ti ti-trash"></i>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {assignments.length > 0 && (
                        <>
                            <button
                                type="button"
                                className="btn btn-success d-flex align-items-center gap-1"
                                onClick={handleExportExcel}
                            >
                                <i className="ti ti-file-spreadsheet"></i>
                                Excel İndir
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary d-flex align-items-center gap-1"
                                onClick={handlePrintDoorLists}
                            >
                                <i className="ti ti-printer"></i>
                                Kapı Listeleri Yazdır / PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* YAPILANDIRMA SİHİRBAZI */}
            <div className="row g-4 no-print">
                {/* Sol Kolon: Sınav Bilgisi & Sınıflar */}
                <div className="col-lg-6">
                    {/* ADIM 1: Sınav Bilgileri */}
                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                                <span className="badge bg-primary rounded-circle">1</span>
                                Sınav Bilgileri
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                {omrExams.length > 0 && (
                                    <div className="col-md-12">
                                        <label className="form-label small fw-semibold text-muted">OMR Sınavlarından Seç (Opsiyonel)</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={selectedOmrExamId}
                                            onChange={e => handleOmrExamChange(e.target.value)}
                                        >
                                            <option value="">Doğrudan yeni deneme adı yazın veya buradan seçin...</option>
                                            {omrExams.map(e => (
                                                <option key={e.id} value={e.id}>
                                                    {e.name} {e.exam_type ? `(${e.exam_type})` : ''} - {e.exam_date || ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="col-md-8">
                                    <label className="form-label small fw-semibold">Deneme Sınavı Adı <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Örn: 8. Sınıf LGS 1. Genel Deneme Sınavı"
                                        value={examTitle}
                                        onChange={e => setExamTitle(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-semibold">Sınav Tarihi</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={examDate}
                                        onChange={e => setExamDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ADIM 2: Sınava Girecek Sınıfların Seçimi */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                                <span className="badge bg-primary rounded-circle">2</span>
                                Sınava Girecek Sınıflar (Öğrenci Kaynakları)
                            </h6>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                {selectedClassIds.length} Sınıf Seçildi (Tahmini ~{totalEstimatedStudents} Öğrenci)
                            </span>
                        </div>
                        <div className="card-body">
                            {/* Filtre ve Hızlı Seçim */}
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                <div className="input-group input-group-sm" style={{ maxWidth: '240px' }}>
                                    <span className="input-group-text bg-white border-end-0">
                                        <i className="ti ti-filter text-muted"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Kademe / İsim Filtre (Örn: 8)"
                                        value={classGradeFilter}
                                        onChange={e => setClassGradeFilter(e.target.value)}
                                    />
                                </div>
                                <div className="d-flex gap-1">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={handleSelectAllFilteredClasses}
                                    >
                                        Tümünü Seç
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={handleClearClassSelection}
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>

                            {/* Sınıf Kartları Grid */}
                            <div className="row g-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {loading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm text-primary"></div> Sınıflar yükleniyor...
                                    </div>
                                ) : filteredClassrooms.length === 0 ? (
                                    <div className="text-center py-4 text-muted small">
                                        Atanmış sınıf bulunamadı.
                                    </div>
                                ) : (
                                    filteredClassrooms.map(c => {
                                        const isSelected = selectedClassIds.includes(c.id);
                                        return (
                                            <div key={c.id} className="col-sm-6 col-md-4">
                                                <div
                                                    className={`p-2 rounded border d-flex align-items-center justify-content-between ${isSelected ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                                                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                                    onClick={() => handleToggleClass(c.id)}
                                                >
                                                    <div className="d-flex align-items-center gap-2 text-truncate">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input mt-0"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                        />
                                                        <span className="fw-semibold text-truncate small">{c.name}</span>
                                                    </div>
                                                    {c.students_count !== undefined && (
                                                        <span className="badge bg-white text-muted border small">
                                                            {c.students_count} öğr.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Kolon: Salonlar & Dağıtım Algoritması */}
                <div className="col-lg-6">
                    {/* ADIM 3: Sınav Salonları */}
                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                                <span className="badge bg-primary rounded-circle">3</span>
                                Sınav Salonları (Derslikler) & Kapasite
                            </h6>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={handleAddSelectedClassesAsRooms}
                                title="Yukarıda seçilen sınıfları doğrudan sınav salonu olarak ekler"
                            >
                                <i className="ti ti-copy me-1"></i>
                                Seçilen Sınıfları Salon Yap
                            </button>
                        </div>
                        <div className="card-body">
                            {/* Manuel Salon Ekleme Formu */}
                            <div className="row g-2 mb-3 align-items-end">
                                <div className="col-7">
                                    <label className="form-label small text-muted mb-1">Yeni Salon / Sınıf Adı</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Örn: Salon 1, A-101, vb."
                                        value={newRoomName}
                                        onChange={e => setNewRoomName(e.target.value)}
                                    />
                                </div>
                                <div className="col-3">
                                    <label className="form-label small text-muted mb-1">Sıra/Kapasite</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        min="1"
                                        max="200"
                                        value={newRoomCapacity}
                                        onChange={e => setNewRoomCapacity(parseInt(e.target.value) || 20)}
                                    />
                                </div>
                                <div className="col-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm w-100"
                                        onClick={handleAddCustomRoom}
                                    >
                                        <i className="ti ti-plus"></i> Ekle
                                    </button>
                                </div>
                            </div>

                            {/* Eklenen Salonlar Listesi */}
                            <div className="border rounded bg-white p-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                {rooms.length === 0 ? (
                                    <div className="text-center py-3 text-muted small">
                                        Henüz salon eklenmedi. "Seçilen Sınıfları Salon Yap" butonuna tıklayabilir veya manuel ekleyebilirsiniz.
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {rooms.map((r, i) => (
                                            <div key={r.id} className="d-flex align-items-center justify-content-between p-2 rounded bg-light border">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-dark rounded-circle">{i + 1}</span>
                                                    <span className="fw-semibold small">{r.name}</span>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="d-flex align-items-center gap-1">
                                                        <span className="small text-muted">Kapasite:</span>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm text-center"
                                                            style={{ width: '60px' }}
                                                            min="1"
                                                            value={r.capacity}
                                                            onChange={e => handleUpdateRoom(r.id, 'capacity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm p-1"
                                                        onClick={() => handleRemoveRoom(r.id)}
                                                        title="Salonu Kaldır"
                                                    >
                                                        <i className="ti ti-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Kapasite Durum Çubuğu */}
                            <div className="mt-2 d-flex justify-content-between align-items-center small">
                                <span className="text-muted">
                                    Toplam {rooms.length} Salon • Toplam Kapasite: <strong>{totalRoomCapacity}</strong>
                                </span>
                                {rooms.length > 0 && (
                                    <span className={`badge ${totalRoomCapacity >= totalEstimatedStudents ? 'bg-success' : 'bg-danger'}`}>
                                        {totalRoomCapacity >= totalEstimatedStudents
                                            ? `✓ Kapasite Yeterli (${totalRoomCapacity} / ~${totalEstimatedStudents})`
                                            : `⚠ Kapasite Yetersiz (${totalRoomCapacity} / ~${totalEstimatedStudents})`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ADIM 4: Dağıtım Modu ve Algoritma */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2 text-primary">
                                <span className="badge bg-primary rounded-circle">4</span>
                                Dağıtım Modu & Oturma Düzeni
                            </h6>
                        </div>
                        <div className="card-body">
                            {/* Algoritma Seçimi */}
                            <div className="row g-2 mb-3">
                                <div className="col-4">
                                    <div
                                        className={`p-2 rounded border text-center ${algorithm === 'butterfly' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setAlgorithm('butterfly')}
                                    >
                                        <div className="fw-bold small text-primary">🦋 Kelebek Düzeni</div>
                                        <small className="text-muted" style={{ fontSize: '11px' }}>
                                            Aynı sınıf yan yana/arka arkaya gelmez
                                        </small>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div
                                        className={`p-2 rounded border text-center ${algorithm === 'random' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setAlgorithm('random')}
                                    >
                                        <div className="fw-bold small text-success">🎲 Tam Karma</div>
                                        <small className="text-muted" style={{ fontSize: '11px' }}>
                                            Tüm öğrenciler rastgele karıştırılır
                                        </small>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div
                                        className={`p-2 rounded border text-center ${algorithm === 'balanced' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setAlgorithm('balanced')}
                                    >
                                        <div className="fw-bold small text-info">⚖️ Dengeli Şube</div>
                                        <small className="text-muted" style={{ fontSize: '11px' }}>
                                            Her salona her şubeden eşit oranda
                                        </small>
                                    </div>
                                </div>
                            </div>

                            {/* Sıra Düzeni ve Sıralama Kriteri */}
                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label small text-muted mb-1">Sıra Düzeni (Masa Tipi)</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={deskLayout}
                                        onChange={e => setDeskLayout(e.target.value as any)}
                                    >
                                        <option value="double">İkili Sıra (1-A / 1-B Yan Yana)</option>
                                        <option value="single">Tekli Sıra (1, 2, 3... Bağımsız)</option>
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label small text-muted mb-1">Öğrenci Sıralama Önceliği</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value as any)}
                                    >
                                        <option value="random">Rastgele Karıştır</option>
                                        <option value="number">Okul Numarasına Göre</option>
                                        <option value="name">Ada Göre (Alfabetik)</option>
                                    </select>
                                </div>
                            </div>

                            {/* HESAPLA BUTONU */}
                            <button
                                type="button"
                                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                                disabled={calculating || selectedClassIds.length === 0 || rooms.length === 0}
                                onClick={handleGenerateDistribution}
                            >
                                {calculating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                        Dağıtım Hesaplanıyor...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti ti-wand fs-5"></i>
                                        Dağıtımı Hesapla ve Oturma Planını Oluştur
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DAĞITIM SONUÇLARI BÖLÜMÜ */}
            {assignments.length > 0 && (
                <div id="results-section" className="mt-4">
                    {/* Özet Kartları */}
                    <div className="row g-3 mb-4 no-print">
                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm bg-primary text-white p-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="opacity-75">Yerleşen Öğrenci</small>
                                        <h3 className="fw-bold mb-0">{assignments.length}</h3>
                                    </div>
                                    <i className="ti ti-users fs-1 opacity-50"></i>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm bg-success text-white p-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="opacity-75">Sınav Salonu</small>
                                        <h3 className="fw-bold mb-0">{rooms.length}</h3>
                                    </div>
                                    <i className="ti ti-door fs-1 opacity-50"></i>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm bg-info text-white p-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="opacity-75">Kullanılan Düzen</small>
                                        <h5 className="fw-bold mb-0">
                                            {algorithm === 'butterfly' ? 'Kelebek Düzeni' : algorithm === 'random' ? 'Tam Karma' : 'Dengeli Şube'}
                                        </h5>
                                    </div>
                                    <i className="ti ti-layout-grid fs-1 opacity-50"></i>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm bg-warning text-dark p-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="opacity-75">Kayıtlı Sınav</small>
                                        <h6 className="fw-bold mb-0 text-truncate" title={examTitle}>
                                            {examTitle || 'Deneme Sınavı'}
                                        </h6>
                                        <small className="text-muted">{examDate}</small>
                                    </div>
                                    <i className="ti ti-calendar-event fs-1 opacity-50"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sonuç Sekmeleri ve Tablo */}
                    <div className="card border-0 shadow-sm no-print">
                        <div className="card-header bg-white border-bottom p-3">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <ul className="nav nav-pills gap-1">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link btn-sm ${activeTab === 'rooms' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('rooms')}
                                        >
                                            <i className="ti ti-door me-1"></i> Salon Kapı Listeleri
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link btn-sm ${activeTab === 'grid' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('grid')}
                                        >
                                            <i className="ti ti-layout-grid me-1"></i> Görsel Sıra Krokisi
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link btn-sm ${activeTab === 'all' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('all')}
                                        >
                                            <i className="ti ti-list me-1"></i> Genel Öğrenci Arama
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link btn-sm ${activeTab === 'classes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('classes')}
                                        >
                                            <i className="ti ti-school me-1"></i> Sınıf Bazında Dağılım
                                        </button>
                                    </li>
                                </ul>

                                {/* Filtreleme Kontrolleri */}
                                <div className="d-flex gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ width: '180px' }}
                                        value={selectedRoomFilter}
                                        onChange={e => setSelectedRoomFilter(e.target.value)}
                                    >
                                        <option value="all">Tüm Salonlar</option>
                                        {rooms.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({assignments.filter(a => a.roomId === r.id).length} öğr.)
                                            </option>
                                        ))}
                                    </select>

                                    <div className="input-group input-group-sm" style={{ width: '220px' }}>
                                        <span className="input-group-text bg-white border-end-0">
                                            <i className="ti ti-search text-muted"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Öğrenci veya No ara..."
                                            value={searchStudentQuery}
                                            onChange={e => setSearchStudentQuery(e.target.value)}
                                        />
                                        {searchStudentQuery && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setSearchStudentQuery('')}
                                            >
                                                <i className="ti ti-x"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-3">
                            {/* SEKME 1: SALON KAPI LİSTELERİ */}
                            {activeTab === 'rooms' && (
                                <div>
                                    {rooms
                                        .filter(r => selectedRoomFilter === 'all' || r.id === selectedRoomFilter)
                                        .map(room => {
                                            const roomSeats = assignments.filter(a => a.roomId === room.id);
                                            return (
                                                <div key={room.id} className="mb-4 border rounded p-3 bg-white">
                                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                        <div>
                                                            <h5 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
                                                                <i className="ti ti-door"></i>
                                                                {room.name}
                                                            </h5>
                                                            <small className="text-muted">
                                                                Kapasite: {room.capacity} • Yerleşen: {roomSeats.length} Öğrenci
                                                            </small>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="input-group input-group-sm" style={{ width: '240px' }}>
                                                                <span className="input-group-text bg-white">Gözetmen:</span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="Öğretmen Adı..."
                                                                    value={room.invigilator || ''}
                                                                    onChange={e => handleUpdateRoom(room.id, 'invigilator', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="table-responsive">
                                                        <table className="table table-hover table-sm align-middle mb-0">
                                                            <thead className="table-light">
                                                                <tr>
                                                                    <th style={{ width: '80px' }}>Sıra No</th>
                                                                    <th style={{ width: '120px' }}>Sıra Kodu</th>
                                                                    <th style={{ width: '110px' }}>Okul No</th>
                                                                    <th>Öğrenci Adı Soyadı</th>
                                                                    <th style={{ width: '130px' }}>Asıl Sınıfı</th>
                                                                    <th style={{ width: '150px' }} className="text-center">İmza</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {roomSeats.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={6} className="text-center py-3 text-muted">Bu salona yerleşen öğrenci yok.</td>
                                                                    </tr>
                                                                ) : (
                                                                    roomSeats.map(seat => (
                                                                        <tr key={seat.student.id}>
                                                                            <td>
                                                                                <span className="badge bg-secondary-subtle text-secondary fw-bold">
                                                                                    #{seat.seatNumber}
                                                                                </span>
                                                                            </td>
                                                                            <td className="fw-semibold text-muted">
                                                                                {seat.deskCode || seat.seatNumber}
                                                                            </td>
                                                                            <td className="fw-bold">
                                                                                {seat.student.school_no || '-'}
                                                                            </td>
                                                                            <td className="fw-semibold">
                                                                                {seat.student.name}
                                                                            </td>
                                                                            <td>
                                                                                <span className={`badge ${getClassColorBadge(seat.student.classroom_id)}`}>
                                                                                    {seat.student.classroom?.name || '-'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="text-center border-start border-end">
                                                                                <span className="text-muted opacity-25">________________</span>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* SEKME 2: GÖRSEL SIRA KROKİSİ */}
                            {activeTab === 'grid' && (
                                <div>
                                    {rooms
                                        .filter(r => selectedRoomFilter === 'all' || r.id === selectedRoomFilter)
                                        .map(room => {
                                            const roomSeats = assignments.filter(a => a.roomId === room.id);
                                            return (
                                                <div key={room.id} className="mb-4 border rounded p-3 bg-white">
                                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                        <h5 className="fw-bold mb-0 text-primary">
                                                            <i className="ti ti-layout-grid me-1"></i> {room.name} - Oturma Planı Krokisi
                                                        </h5>
                                                        <span className="badge bg-light text-dark border">
                                                            {roomSeats.length} / {room.capacity} Sıra Dolu
                                                        </span>
                                                    </div>

                                                    {/* Öğretmen Kürsüsü Temsili */}
                                                    <div className="text-center mb-4">
                                                        <div className="d-inline-block px-5 py-2 bg-dark text-white rounded shadow-sm fw-bold small">
                                                            📋 ÖĞRETMEN KÜRSÜSÜ / TAHTA
                                                        </div>
                                                    </div>

                                                    {/* Sıra Izgarası */}
                                                    <div className="row g-2 justify-content-center">
                                                        {Array.from({ length: Number(room.capacity) || 20 }, (_, idx) => {
                                                            const seatNo = idx + 1;
                                                            const seat = roomSeats.find(s => s.seatNumber === seatNo);
                                                            return (
                                                                <div key={seatNo} className="col-6 col-sm-4 col-md-3 col-lg-2">
                                                                    <div
                                                                        className={`p-2 rounded border text-center h-100 d-flex flex-column justify-content-between ${
                                                                            seat ? 'bg-white shadow-sm' : 'bg-light border-dashed opacity-50'
                                                                        }`}
                                                                        style={{ minHeight: '90px' }}
                                                                    >
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                            <span className="badge bg-secondary rounded-circle" style={{ width: '22px', height: '22px' }}>
                                                                                {seatNo}
                                                                            </span>
                                                                            <small className="text-muted fw-semibold" style={{ fontSize: '10px' }}>
                                                                                {seat?.deskCode || `Sıra ${seatNo}`}
                                                                            </small>
                                                                        </div>
                                                                        {seat ? (
                                                                            <div>
                                                                                <div className="fw-bold small text-truncate" title={seat.student.name}>
                                                                                    {seat.student.name}
                                                                                </div>
                                                                                {seat.student.school_no && (
                                                                                    <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                                                        No: {seat.student.school_no}
                                                                                    </div>
                                                                                )}
                                                                                <span className={`badge mt-1 ${getClassColorBadge(seat.student.classroom_id)}`} style={{ fontSize: '10px' }}>
                                                                                    {seat.student.classroom?.name || '-'}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-muted small my-auto">Boş Sıra</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* SEKME 3: GENEL ÖĞRENCİ ARAMA LİSTESİ */}
                            {activeTab === 'all' && (
                                <div className="table-responsive">
                                    <table className="table table-hover table-striped align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Okul No</th>
                                                <th>Öğrenci Adı Soyadı</th>
                                                <th>Kendi Sınıfı</th>
                                                <th>Atandığı Salon</th>
                                                <th>Sıra Numarası</th>
                                                <th>Sıra Kodu</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedAssignments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-4 text-muted">Aramanıza uygun öğrenci bulunamadı.</td>
                                                </tr>
                                            ) : (
                                                displayedAssignments.map((a, idx) => (
                                                    <tr key={a.student.id}>
                                                        <td>{idx + 1}</td>
                                                        <td className="fw-bold">{a.student.school_no || '-'}</td>
                                                        <td className="fw-semibold">{a.student.name}</td>
                                                        <td>
                                                            <span className={`badge ${getClassColorBadge(a.student.classroom_id)}`}>
                                                                {a.student.classroom?.name || '-'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">
                                                                {a.roomName}
                                                            </span>
                                                        </td>
                                                        <td className="fw-bold text-center">
                                                            <span className="badge bg-dark rounded-pill px-3">
                                                                Sıra: {a.seatNumber}
                                                            </span>
                                                        </td>
                                                        <td className="text-muted small">{a.deskCode || a.seatNumber}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* SEKME 4: SINIF BAZINDA DAĞILIM (PANOLUK LİSTE) */}
                            {activeTab === 'classes' && (
                                <div className="row g-3">
                                    {selectedClassIds.map(cId => {
                                        const cls = classrooms.find(c => c.id === cId);
                                        const classStudents = assignments.filter(a => a.student.classroom_id === cId);
                                        return (
                                            <div key={cId} className="col-md-6">
                                                <div className="card border h-100 shadow-none">
                                                    <div className="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0 fw-bold">{cls?.name || `Sınıf ${cId}`} Sınav Dağılımı</h6>
                                                        <span className="badge bg-primary">{classStudents.length} Öğrenci</span>
                                                    </div>
                                                    <div className="card-body p-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                        <table className="table table-sm table-striped mb-0 small">
                                                            <thead>
                                                                <tr>
                                                                    <th>No</th>
                                                                    <th>Öğrenci Adı</th>
                                                                    <th>Sınav Salonu</th>
                                                                    <th>Sıra No</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {classStudents.map(cs => (
                                                                    <tr key={cs.student.id}>
                                                                        <td>{cs.student.school_no || '-'}</td>
                                                                        <td className="fw-medium">{cs.student.name}</td>
                                                                        <td><span className="badge bg-info-subtle text-info">{cs.roomName}</span></td>
                                                                        <td className="fw-bold">Sıra {cs.seatNumber}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* YALNIZCA YAZDIRMA İÇİN GÖRÜNEN RESMİ A4 KAPI LİSTELERİ */}
            <div className="print-only-block">
                {rooms.map(room => {
                    const roomSeats = assignments.filter(a => a.roomId === room.id);
                    return (
                        <div key={room.id} className="print-page">
                            {/* Başlık ve Resmi Bilgiler */}
                            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                                <h3 style={{ margin: '0 0 5px 0', textTransform: 'uppercase' }}>{examTitle || 'DENEME SINAVI'}</h3>
                                <h4 style={{ margin: '0 0 5px 0' }}>SALON YOKLAMA VE KAPI LİSTESİ</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11pt' }}>
                                    <div><strong>SALON:</strong> {room.name}</div>
                                    <div><strong>TARİH / SAAT:</strong> {examDate} {examTime ? `- ${examTime}` : ''}</div>
                                    <div><strong>ÖĞRENCİ SAYISI:</strong> {roomSeats.length} / {room.capacity}</div>
                                </div>
                                <div style={{ textAlign: 'left', marginTop: '5px', fontSize: '10pt' }}>
                                    <strong>GÖZETMEN ÖĞRETMEN:</strong> {room.invigilator || '...................................................'}
                                </div>
                            </div>

                            {/* Öğrenci Tablosu */}
                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>SIRA</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>MASA</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>OKUL NO</th>
                                        <th>ÖĞRENCİ ADI SOYADI</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>ASIL SINIFI</th>
                                        <th style={{ width: '120px', textAlign: 'center' }}>İMZA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roomSeats.map(seat => (
                                        <tr key={seat.student.id}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{seat.seatNumber}</td>
                                            <td style={{ textAlign: 'center' }}>{seat.deskCode || seat.seatNumber}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{seat.student.school_no || '-'}</td>
                                            <td>{seat.student.name}</td>
                                            <td style={{ textAlign: 'center' }}>{seat.student.classroom?.name || '-'}</td>
                                            <td style={{ textAlign: 'center' }}></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Alt İmza Alanı */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '10pt' }}>
                                <div>
                                    <p>Sınav Salon Başkanı / Gözetmen</p>
                                    <p style={{ marginTop: '25px' }}>İmza: .......................................</p>
                                </div>
                                <div>
                                    <p>Bina Sınav Komisyonu / İdare</p>
                                    <p style={{ marginTop: '25px' }}>İmza: .......................................</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
