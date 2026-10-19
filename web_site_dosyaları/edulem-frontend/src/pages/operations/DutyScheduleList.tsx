import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { getMyCampusIds, getMyEducationLevelIds, getMyRole } from '../../utils/userScope';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toAsciiTurkish } from '../../utils/pdfFont';

interface Teacher {
    id: number;
    first_name: string;
    last_name: string;
}

interface DutySchedule {
    id: number;
    user_id: number;
    campus_id?: number | null;
    education_level_id?: number | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location?: string;
    is_active: boolean;
    user?: Teacher;
}

type Option = { id: number; name: string };

type DutyScheduleFormData = {
    user_id: string;
    campus_id?: number | '';
    education_level_id?: number | '';
    day_of_week: number;
    start_time: string;
    end_time: string;
    location: string;
    is_active: boolean;
};

const defaultFormData: DutyScheduleFormData = {
    user_id: '',
    campus_id: '',
    education_level_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '17:00',
    location: '',
    is_active: true,
};

interface DragPayload {
    type: 'duty_clone' | 'teacher_new';
    scheduleId?: number;
    userId: number;
    teacherName: string;
    startTime?: string;
    endTime?: string;
    sourceLocation?: string;
    sourceDay?: number;
}

const DutyScheduleList = () => {
    const userData = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('USER_DATA') || '{}');
        } catch {
            return {};
        }
    }, []);
    const roleRaw = localStorage.getItem('USER_ROLE') || userData?.role || userData?.role_name || userData?.role_id;
    const roleKey = String(roleRaw ?? '').trim();
    const roleName = useMemo(() => getMyRole(), []);
    const myCampusIds = useMemo(() => getMyCampusIds(), []);
    const myEducationLevelIds = useMemo(() => getMyEducationLevelIds(), []);
    const isFounder = roleName === 'owner' || roleKey === 'owner';
    const requiresEducationLevelSelection = !isFounder && myEducationLevelIds.length > 0;
    const hasSingleEducationLevel = requiresEducationLevelSelection && myEducationLevelIds.length === 1;
    const requiresCampusSelection = !isFounder && myCampusIds.length > 0;
    const hasSingleCampus = requiresCampusSelection && myCampusIds.length === 1;
    const canEdit =
        roleKey === 'owner' ||
        roleKey === 'Admin' ||
        roleKey === 'Genel Müdür' ||
        roleKey === 'Müdür' ||
        roleKey === 'Müdür Yardımcısı' ||
        roleKey === 'Kampüs Müdürü' ||
        roleKey === 'Öğrenci İşleri' ||
        roleKey === 'student_affairs' ||
        roleKey === '10';

    const days = useMemo(
        () => [
            { id: 1, label: 'Pazartesi' },
            { id: 2, label: 'Salı' },
            { id: 3, label: 'Çarşamba' },
            { id: 4, label: 'Perşembe' },
            { id: 5, label: 'Cuma' },
        ],
        []
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState<false | 'excel' | 'pdf'>(false);

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schedules, setSchedules] = useState<DutySchedule[]>([]);

    const [campuses, setCampuses] = useState<Option[]>([]);
    const [educationLevels, setEducationLevels] = useState<Option[]>([]);
    const [campusFilter, setCampusFilter] = useState<number | ''>('');
    const [educationLevelFilter, setEducationLevelFilter] = useState<number | ''>('');

    const [locationsByScope, setLocationsByScope] = useState<Record<string, string[]>>(() => {
        try {
            const raw = localStorage.getItem('DUTY_LOCATIONS_BY_SCOPE');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });
    const [locations, setLocations] = useState<string[]>([]);
    const [newLocation, setNewLocation] = useState('');

    // Editor Modal
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<DutyScheduleFormData>(defaultFormData);

    // Drag & Drop States
    const [draggingData, setDraggingData] = useState<DragPayload | null>(null);
    const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
    const [dragOverDutyId, setDragOverDutyId] = useState<number | null>(null);

    // Quick Teacher Palette
    const [showQuickPalette, setShowQuickPalette] = useState(true);
    const [quickTeacherSearch, setQuickTeacherSearch] = useState('');

    // Swap Modal States
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapDuty1Id, setSwapDuty1Id] = useState<number | ''>('');
    const [swapDuty2Id, setSwapDuty2Id] = useState<number | ''>('');
    const [swapping, setSwapping] = useState(false);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campusFilter, educationLevelFilter]);

    useEffect(() => {
        const key = `${campusFilter || 0}::${educationLevelFilter || 0}`;
        setLocations(locationsByScope[key] || []);
    }, [campusFilter, educationLevelFilter, locationsByScope]);

    useEffect(() => {
        try {
            localStorage.setItem('DUTY_LOCATIONS_BY_SCOPE', JSON.stringify(locationsByScope));
        } catch {
            // ignore
        }
    }, [locationsByScope]);

    const normalizeTeachers = (payload: any): Teacher[] => {
        const raw = payload?.data?.data;
        const candidates = [raw?.users, raw?.items, raw, payload?.data];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate.filter((item: any) => item && typeof item.id !== 'undefined');
            }
        }

        return [];
    };

    const normalizeSchedules = (payload: any): DutySchedule[] => {
        const raw = payload?.data?.data;
        const candidates = [raw?.items, raw, payload?.data];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate as DutySchedule[];
            }
        }

        return [];
    };

    const bootstrap = async () => {
        setLoading(true);
        try {
            const scopeParams: any = {};
            if (campusFilter) scopeParams.campus_id = campusFilter;
            if (educationLevelFilter) scopeParams.education_level_id = educationLevelFilter;

            const shouldRequireLevel = educationLevelFilter === '';

            const [campusesRes, levelsRes, teachersRes, schedulesRes] = await Promise.all([
                axiosClient.get('/campuses', { params: { per_page: 200 } }).catch(() => null),
                axiosClient.get('/education-levels', {
                    params: {
                        per_page: 200,
                        campus_id: campusFilter || undefined,
                    },
                }).catch(() => null),
                axiosClient.get('/users', {
                    params: {
                        duty_assignable: 1,
                        campus_id: campusFilter || undefined,
                        education_level_id: educationLevelFilter || undefined,
                        per_page: 200,
                    },
                }),
                shouldRequireLevel
                    ? Promise.resolve({ data: { data: { items: [] } } } as any)
                    : axiosClient.get('/duty-schedules', { params: { ...scopeParams, per_page: 500 } }),
            ]);

            const campusRaw = campusesRes?.data?.data?.campuses || campusesRes?.data?.campuses || campusesRes?.data?.data || campusesRes?.data;
            const campusArr: Option[] = Array.isArray(campusRaw)
                ? campusRaw.map((c: any) => ({ id: Number(c.id), name: String(c.name ?? '') })).filter((c: any) => Number.isFinite(c.id) && c.id > 0)
                : [];

            const campusScoped = !isFounder && myCampusIds.length > 0
                ? campusArr.filter((c) => myCampusIds.includes(Number(c.id)))
                : campusArr;
            setCampuses(campusScoped);

            if (!isFounder && myCampusIds.length === 1 && campusFilter === '') {
                setCampusFilter(myCampusIds[0]);
            }

            const levelRaw = levelsRes?.data?.data?.education_levels || levelsRes?.data?.education_levels || levelsRes?.data?.data || levelsRes?.data;
            const levelArr: Option[] = Array.isArray(levelRaw)
                ? levelRaw.map((l: any) => ({ id: Number(l.id), name: String(l.name ?? '') })).filter((l: any) => Number.isFinite(l.id) && l.id > 0)
                : [];
            setEducationLevels(levelArr);

            if (!isFounder && myEducationLevelIds.length === 1 && educationLevelFilter === '') {
                setEducationLevelFilter(myEducationLevelIds[0]);
            }

            const fetchedTeachers = normalizeTeachers(teachersRes)
                .slice()
                .sort((a, b) => {
                    const an = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
                    const bn = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim();
                    return an.localeCompare(bn, 'tr');
                });
            setTeachers(fetchedTeachers);

            if (shouldRequireLevel) {
                setSchedules([]);
                setLocations([]);
                return;
            }

            const fetchedSchedules = normalizeSchedules(schedulesRes);
            setSchedules(fetchedSchedules);

            const fetchedLocations = Array.from(new Set(
                fetchedSchedules
                    .map(s => (s.location || '').trim())
                    .filter(Boolean)
            ));

            const key = `${campusFilter || 0}::${educationLevelFilter || 0}`;
            setLocationsByScope((prev) => {
                const existing = prev[key] || [];
                const merged = Array.from(new Set([...existing, ...fetchedLocations]))
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, 'tr'));
                return {
                    ...prev,
                    [key]: merged,
                };
            });
        } catch (error) {
            showToast('error', 'Nöbet çizelgesi yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = (dayOfWeek?: number, location?: string) => {
        if (!canEdit) return;
        if (requiresCampusSelection && campusFilter === '') {
            showToast('warning', 'Lütfen önce kampüs seçiniz');
            return;
        }
        if (requiresEducationLevelSelection && educationLevelFilter === '') {
            showToast('warning', 'Lütfen önce kademe seçiniz');
            return;
        }
        setEditingId(null);
        setFormData({
            ...defaultFormData,
            day_of_week: dayOfWeek || 1,
            location: location || '',
            campus_id: campusFilter || '',
            education_level_id: educationLevelFilter || '',
        });
        setShowEditor(true);
    };

    const openEdit = (schedule: DutySchedule) => {
        if (!canEdit) return;
        setEditingId(schedule.id);
        setFormData({
            user_id: String(schedule.user_id),
            campus_id: (schedule.campus_id ?? '') as any,
            education_level_id: (schedule.education_level_id ?? '') as any,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time?.substring(0, 5) || '08:00',
            end_time: schedule.end_time?.substring(0, 5) || '17:00',
            location: schedule.location || '',
            is_active: !!schedule.is_active,
        });
        setShowEditor(true);
    };

    const closeEditor = () => {
        setShowEditor(false);
        setEditingId(null);
        setFormData(defaultFormData);
    };

    const saveSchedule = async () => {
        if (!canEdit) return;
        if (!formData.user_id) {
            showToast('warning', 'Öğretmen seçmelisin');
            return;
        }

        if (requiresCampusSelection && (campusFilter === '' && formData.campus_id === '')) {
            showToast('warning', 'Kampüs seçimi zorunludur');
            return;
        }

        if (requiresEducationLevelSelection && (educationLevelFilter === '' && formData.education_level_id === '')) {
            showToast('warning', 'Kademe seçimi zorunludur');
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                ...formData,
                campus_id: formData.campus_id === '' ? (campusFilter || undefined) : formData.campus_id,
                education_level_id: formData.education_level_id === '' ? (educationLevelFilter || undefined) : formData.education_level_id,
            };

            if (editingId) {
                await axiosClient.put(`/duty-schedules/${editingId}`, payload);
                showToast('success', 'Nöbet görevi güncellendi');
            } else {
                await axiosClient.post('/duty-schedules', payload);
                showToast('success', 'Nöbet görevi oluşturuldu');
            }

            closeEditor();
            await bootstrap();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'İşlem başarısız');
        } finally {
            setSaving(false);
        }
    };

    const deleteSchedule = async (id: number) => {
        if (!canEdit) return;
        const ok = await confirmDialog({
            text: 'Bu nöbet görevini silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/duty-schedules/${id}`);
            showToast('success', 'Nöbet görevi silindi');
            await bootstrap();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Silme işlemi başarısız');
        }
    };

    // ─── TOPLU SIFIRLAMA ───────────────────────────────────────────────────
    const handleBulkReset = async () => {
        if (!canEdit) return;
        if (requiresEducationLevelSelection && educationLevelFilter === '') {
            showToast('warning', 'Lütfen önce kademe seçiniz');
            return;
        }

        const currentLevelName = educationLevels.find(l => l.id === Number(educationLevelFilter))?.name || 'Seçili kademe';
        const ok = await confirmDialog({
            title: 'Nöbetleri Sıfırla',
            text: `${currentLevelName} kademesindeki TÜM öğretmen nöbet görevlerini sıfırlamak istediğinize emin misiniz? Nöbet yerleri korunacak, öğretmen atamaları temizlenecektir.`,
            confirmText: 'Evet, Sıfırla',
            cancelText: 'Vazgeç',
            icon: 'warning',
        });
        if (!ok) return;

        setLoading(true);
        try {
            const payload: any = {};
            if (campusFilter) payload.campus_id = campusFilter;
            if (educationLevelFilter) payload.education_level_id = educationLevelFilter;

            const res = await axiosClient.post('/duty-schedules/bulk-clear', payload);
            showToast('success', res.data?.message || 'Tüm nöbet görevleri sıfırlandı.');
            await bootstrap();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Nöbetler sıfırlanırken hata oluştu.');
            setLoading(false);
        }
    };

    // ─── NÖBET DEĞİŞİMİ (SWAP) ─────────────────────────────────────────────
    const openSwapModal = (initialSchedule?: DutySchedule) => {
        if (!canEdit) return;
        if (schedules.length < 2) {
            showToast('warning', 'Nöbet değişimi yapabilmek için en az 2 nöbet görevi bulunmalıdır.');
            return;
        }
        setSwapDuty1Id(initialSchedule ? initialSchedule.id : schedules[0]?.id || '');
        // Select a different second schedule if possible
        const otherSchedule = schedules.find(s => s.id !== (initialSchedule ? initialSchedule.id : schedules[0]?.id));
        setSwapDuty2Id(otherSchedule ? otherSchedule.id : '');
        setShowSwapModal(true);
    };

    const handleSwapDuties = async (id1: number, id2: number) => {
        if (!canEdit) return;
        if (id1 === id2) {
            showToast('warning', 'Farklı iki nöbet görevi seçmelisiniz.');
            return;
        }

        setSwapping(true);
        try {
            const res = await axiosClient.post('/duty-schedules/swap', {
                schedule_id_1: id1,
                schedule_id_2: id2,
            });
            showToast('success', res.data?.message || 'Nöbetler başarıyla karşılıklı değiştirildi.');
            setShowSwapModal(false);
            setSwapDuty1Id('');
            setSwapDuty2Id('');
            await bootstrap();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Nöbet değişimi başarısız oldu.');
        } finally {
            setSwapping(false);
        }
    };

    // ─── DRAG & DROP İŞLEMLERİ ──────────────────────────────────────────────
    // 1. Tablodaki bir nöbet kartı sürüklendiğinde (Çoğaltma veya Takas için)
    const handleDragStartDuty = (e: React.DragEvent, s: DutySchedule) => {
        if (!canEdit) return;
        const teacherName = getTeacherName(s);
        const payload: DragPayload = {
            type: 'duty_clone',
            scheduleId: s.id,
            userId: s.user_id,
            teacherName,
            startTime: s.start_time,
            endTime: s.end_time,
            sourceLocation: s.location,
            sourceDay: s.day_of_week,
        };
        setDraggingData(payload);
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
    };

    // 2. Hızlı öğretmen paletinden öğretmen sürüklendiğinde
    const handleDragStartTeacher = (e: React.DragEvent, t: Teacher) => {
        if (!canEdit) return;
        const payload: DragPayload = {
            type: 'teacher_new',
            userId: t.id,
            teacherName: `${t.first_name} ${t.last_name}`.toLocaleUpperCase('tr-TR'),
            startTime: '08:00',
            endTime: '17:00',
        };
        setDraggingData(payload);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
    };

    const handleDragEnd = () => {
        setDraggingData(null);
        setDragOverCellKey(null);
        setDragOverDutyId(null);
    };

    const handleCellDragOver = (e: React.DragEvent, loc: string, dayId: number) => {
        if (!canEdit) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const key = `${loc.trim()}::${dayId}`;
        if (dragOverCellKey !== key) {
            setDragOverCellKey(key);
        }
    };

    const handleCellDragLeave = (loc: string, dayId: number) => {
        const key = `${loc.trim()}::${dayId}`;
        if (dragOverCellKey === key) {
            setDragOverCellKey(null);
        }
    };

    // Hücreye bırakıldığında: Öğretmeni bu hücreye çoğalt / ekle
    const handleCellDrop = async (e: React.DragEvent, loc: string, dayId: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCellKey(null);
        setDragOverDutyId(null);

        if (!canEdit) return;

        let data = draggingData;
        if (!data) {
            try {
                const raw = e.dataTransfer.getData('application/json');
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }
        }
        if (!data) return;

        const teacher = teachers.find(t => t.id === data!.userId);
        const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.toLocaleUpperCase('tr-TR') : data.teacherName;

        // Bu hücrede bu öğretmen zaten var mı kontrol et
        const cellSchedules = getCellSchedules(loc, dayId);
        if (cellSchedules.some(s => s.user_id === data!.userId)) {
            showToast('warning', `${teacherName} zaten bu nöbet yerinde ve günde görevli.`);
            setDraggingData(null);
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                user_id: data.userId,
                day_of_week: dayId,
                location: loc,
                start_time: (data.startTime || '08:00').substring(0, 5),
                end_time: (data.endTime || '17:00').substring(0, 5),
                campus_id: campusFilter || undefined,
                education_level_id: educationLevelFilter || undefined,
                is_active: true,
            };

            await axiosClient.post('/duty-schedules', payload);
            const dayLabel = dayLabelById[dayId] || '';
            showToast('success', `${teacherName} ➡️ ${dayLabel} (${loc}) nöbetine başarıyla çoğaltıldı.`);
            await bootstrap();
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'Nöbet kopyalama başarısız oldu.');
        } finally {
            setSaving(false);
            setDraggingData(null);
        }
    };

    // Var olan bir nöbet kartının üzerine bırakıldığında: Karşılıklı Nöbet Değişimi (Swap)
    const handleCardDrop = async (e: React.DragEvent, targetSchedule: DutySchedule) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverDutyId(null);
        setDragOverCellKey(null);

        if (!canEdit) return;

        let data = draggingData;
        if (!data) {
            try {
                const raw = e.dataTransfer.getData('application/json');
                data = raw ? JSON.parse(raw) : null;
            } catch {
                data = null;
            }
        }
        if (!data) return;

        // Kart başka bir nöbet kartıysa takas yap
        if (data.type === 'duty_clone' && data.scheduleId) {
            if (data.scheduleId === targetSchedule.id) {
                setDraggingData(null);
                return;
            }

            const sourceSchedule = schedules.find(s => s.id === data!.scheduleId);
            if (!sourceSchedule) {
                setDraggingData(null);
                return;
            }

            const sourceTeacherName = getTeacherName(sourceSchedule);
            const targetTeacherName = getTeacherName(targetSchedule);
            const sourceLoc = sourceSchedule.location || '-';
            const targetLoc = targetSchedule.location || '-';
            const sourceDayName = dayLabelById[sourceSchedule.day_of_week] || '';
            const targetDayName = dayLabelById[targetSchedule.day_of_week] || '';

            setDraggingData(null);

            const ok = await confirmDialog({
                title: 'Nöbet Değişimi',
                text: `${sourceTeacherName} (${sourceDayName} - ${sourceLoc}) ile ${targetTeacherName} (${targetDayName} - ${targetLoc}) nöbetlerini karşılıklı değiştirmek istiyor musunuz?`,
                confirmText: 'Evet, Değiştir',
                cancelText: 'Vazgeç',
                icon: 'question',
            });

            if (ok) {
                await handleSwapDuties(sourceSchedule.id, targetSchedule.id);
            }
        } else {
            // Paletten sürüklenen öğretmen karta bırakıldıysa, o hücreye ekle
            await handleCellDrop(e, targetSchedule.location || '', targetSchedule.day_of_week);
        }
    };

    const addLocation = () => {
        if (!canEdit) return;
        if (requiresCampusSelection && campusFilter === '') {
            showToast('warning', 'Lütfen önce kampüs seçiniz');
            return;
        }
        if (requiresEducationLevelSelection && educationLevelFilter === '') {
            showToast('warning', 'Lütfen önce kademe seçiniz');
            return;
        }
        const trimmed = newLocation.trim();
        if (!trimmed) return;
        const key = `${campusFilter || 0}::${educationLevelFilter || 0}`;
        setLocationsByScope((prev) => {
            const merged = Array.from(new Set([...(prev[key] || []), trimmed]))
                .map((x) => x.trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'tr'));
            return {
                ...prev,
                [key]: merged,
            };
        });
        setNewLocation('');
    };

    const removeLocation = async (loc: string) => {
        if (!canEdit) return;
        const schedulesToDelete = schedules.filter(s => {
            const locOk = (s.location || '').trim() === loc.trim();
            const campusOk = campusFilter === '' || Number(s.campus_id ?? 0) === Number(campusFilter);
            const levelOk = educationLevelFilter === '' || Number(s.education_level_id ?? 0) === Number(educationLevelFilter);
            return locOk && campusOk && levelOk;
        });
        const ok = await confirmDialog({
            text: `'${loc}' nöbet yerini ${schedulesToDelete.length > 0 ? `ve buna bağlı ${schedulesToDelete.length} görevi ` : ''}kaldırmak istediğinize emin misiniz?`,
            confirmText: 'Kaldır',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;

        if (schedulesToDelete.length > 0) {
            setLoading(true);
            try {
                await Promise.all(schedulesToDelete.map(s =>
                    axiosClient.delete(`/duty-schedules/${s.id}`)
                ));
            } catch (error: any) {
                showToast('error', 'Bazı görevler silinemedi');
            }
        }

        const key = `${campusFilter || 0}::${educationLevelFilter || 0}`;
        setLocationsByScope((prev) => {
            const next = (prev[key] || []).filter((x) => x !== loc);
            return {
                ...prev,
                [key]: next,
            };
        });

        if (schedulesToDelete.length > 0) {
            await bootstrap();
        }
    };

    const schedulesByLocationAndDay = useMemo(() => {
        const map = new Map<string, DutySchedule[]>();
        const filtered = schedules.filter((s) => {
            const campusOk = campusFilter === '' || Number(s.campus_id ?? 0) === Number(campusFilter);
            const levelOk = educationLevelFilter === '' || Number(s.education_level_id ?? 0) === Number(educationLevelFilter);
            return campusOk && levelOk;
        });

        for (const s of filtered) {
            const key = `${(s.location || '').trim()}::${s.day_of_week}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        for (const [, arr] of map) {
            arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        return map;
    }, [schedules, campusFilter, educationLevelFilter]);

    const getCellSchedules = (location: string, dayOfWeek: number) => {
        const key = `${location.trim()}::${dayOfWeek}`;
        return schedulesByLocationAndDay.get(key) || [];
    };

    const getTeacherName = (s: DutySchedule) => {
        const fromUser = s.user ? `${s.user.first_name} ${s.user.last_name}` : '';
        if (fromUser.trim()) return fromUser.toLocaleUpperCase('tr-TR');
        const t = teachers.find(x => x.id === s.user_id);
        return t ? `${t.first_name} ${t.last_name}`.toLocaleUpperCase('tr-TR') : 'ÖĞRETMEN';
    };

    const dayLabelById: Record<number, string> = useMemo(() => {
        const m: Record<number, string> = {};
        days.forEach((d) => {
            m[d.id] = d.label;
        });
        return m;
    }, [days]);

    const campusNameById = useMemo(() => {
        const m = new Map<number, string>();
        campuses.forEach((c) => m.set(Number(c.id), c.name));
        return m;
    }, [campuses]);

    const educationLevelNameById = useMemo(() => {
        const m = new Map<number, string>();
        educationLevels.forEach((l) => m.set(Number(l.id), l.name));
        return m;
    }, [educationLevels]);

    const filteredForExport = useMemo(() => {
        return schedules.filter((s) => {
            const campusOk = campusFilter === '' || Number(s.campus_id ?? 0) === Number(campusFilter);
            const levelOk = educationLevelFilter === '' || Number(s.education_level_id ?? 0) === Number(educationLevelFilter);
            return campusOk && levelOk;
        });
    }, [schedules, campusFilter, educationLevelFilter]);

    const exportRows = useMemo(() => {
        return filteredForExport
            .slice()
            .sort((a, b) => {
                if (Number(a.day_of_week) !== Number(b.day_of_week)) return Number(a.day_of_week) - Number(b.day_of_week);
                if (String(a.location ?? '') !== String(b.location ?? '')) return String(a.location ?? '').localeCompare(String(b.location ?? ''), 'tr');
                return String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''));
            })
            .map((s) => {
                const campusName = s.campus_id ? (campusNameById.get(Number(s.campus_id)) || `Kampüs #${s.campus_id}`) : '-';
                const levelName = s.education_level_id ? (educationLevelNameById.get(Number(s.education_level_id)) || `Kademe #${s.education_level_id}`) : '-';
                return {
                    gun: dayLabelById[Number(s.day_of_week)] || String(s.day_of_week),
                    baslangic: String(s.start_time || '').substring(0, 5),
                    bitis: String(s.end_time || '').substring(0, 5),
                    nobet_yeri: (s.location || '').trim() || '-',
                    ogretmen: getTeacherName(s),
                    kampus: campusName,
                    kademe: levelName,
                };
            });
    }, [filteredForExport, dayLabelById, campusNameById, educationLevelNameById, getTeacherName]);

    const buildReportTitle = () => {
        const base = 'Öğretmen Nöbet Çizelgesi';
        const campusPart = campusFilter ? (campusNameById.get(Number(campusFilter)) || `Kampüs #${campusFilter}`) : 'Tüm Kampüsler';
        const levelPart = educationLevelFilter
            ? (educationLevelNameById.get(Number(educationLevelFilter)) || `Kademe #${educationLevelFilter}`)
            : (isFounder ? 'Tüm Kademeler' : 'Tüm Yetkili Kademeler');
        return `${base} - ${campusPart} - ${levelPart}`;
    };

    const exportExcel = async () => {
        if (requiresEducationLevelSelection && educationLevelFilter === '') {
            showToast('warning', 'Lütfen önce kademe seçiniz');
            return;
        }
        try {
            setExporting('excel');
            if (!exportRows.length) {
                showToast('error', 'Dışa aktarılacak kayıt bulunamadı');
                return;
            }
            const ws = XLSX.utils.json_to_sheet(
                exportRows.map((r) => ({
                    'Gün': r.gun,
                    'Başlangıç': r.baslangic,
                    'Bitiş': r.bitis,
                    'Nöbet Yeri': r.nobet_yeri,
                    'Öğretmen': r.ogretmen,
                    'Kampüs': r.kampus,
                    'Kademe': r.kademe,
                }))
            );
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Nöbet');
            const today = new Date().toLocaleDateString('tr-TR').replace(/\//g, '-');
            XLSX.writeFile(wb, `${buildReportTitle().replace(/[\\/:*?\[\]]/g, '-')}_${today}.xlsx`);
        } catch (e) {
            console.error(e);
            showToast('error', 'Excel dışa aktarma başarısız');
        } finally {
            setExporting(false);
        }
    };

    const exportPdf = async () => {
        if (requiresEducationLevelSelection && educationLevelFilter === '') {
            showToast('warning', 'Lutfen once kademe seciniz');
            return;
        }
        try {
            setExporting('pdf');
            if (!locations.length) {
                showToast('error', 'Disa aktarilacak kayit bulunamadi');
                return;
            }

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const title = toAsciiTurkish(buildReportTitle());
            const dateStr = toAsciiTurkish(new Date().toLocaleDateString('tr-TR'));

            doc.setFontSize(14);
            doc.text(title, 40, 40);

            doc.setFontSize(10);
            doc.text(dateStr, 40, 58);

            const dayHeaders = days.map(d => toAsciiTurkish(d.label));
            const head = [['Nobet Yeri', ...dayHeaders]];

            const body = locations.map(loc => {
                const row = [toAsciiTurkish(loc)];
                days.forEach(day => {
                    const cellSchedules = getCellSchedules(loc, day.id);
                    if (cellSchedules.length === 0) {
                        row.push('-');
                    } else {
                        const teachersList = cellSchedules.map(s => toAsciiTurkish(getTeacherName(s))).join(', ');
                        row.push(teachersList);
                    }
                });
                return row;
            });

            const autoTableFn: any =
                (autoTable as any)?.autoTable ||
                (autoTable as any)?.default?.autoTable ||
                (autoTable as any)?.default ||
                autoTable;

            if (typeof autoTableFn !== 'function') {
                throw new Error('jspdf-autotable is not available');
            }

            autoTableFn(doc, {
                head: head,
                body: body,
                startY: 80,
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    cellPadding: 6,
                    overflow: 'linebreak',
                    lineColor: [200, 200, 200],
                    lineWidth: 0.5,
                },
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                },
                bodyStyles: {
                    valign: 'middle',
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
                columnStyles: {
                    0: { cellWidth: 100, fontStyle: 'bold' },
                },
                margin: { left: 40, right: 40, top: 80 },
                didDrawPage: (data: any) => {
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(
                        `Sayfa ${data.pageNumber}`,
                        data.settings.margin.left,
                        doc.internal.pageSize.height - 20
                    );
                },
            });

            const today = dateStr.replace(/\//g, '-');
            doc.save(`${title.replace(/[\\/:*?\[\]]/g, '-')}_${today}.pdf`);
        } catch (e) {
            console.error(e);
            const msg = String((e as any)?.message ?? '');
            const missingLib = msg.toLowerCase().includes('failed to resolve module') || msg.toLowerCase().includes('cannot find module');
            showToast('error', missingLib ? 'PDF icin gerekli paketler eksik (jspdf, jspdf-autotable)' : 'PDF disa aktarma basarisiz');
        } finally {
            setExporting(false);
        }
    };

    // Filtered teachers for quick palette
    const filteredQuickTeachers = useMemo(() => {
        if (!quickTeacherSearch.trim()) return teachers;
        const q = quickTeacherSearch.toLowerCase();
        return teachers.filter(t =>
            `${t.first_name} ${t.last_name}`.toLowerCase().includes(q)
        );
    }, [teachers, quickTeacherSearch]);

    // Selected schedules for swap modal
    const swapSchedule1 = useMemo(() => schedules.find(s => s.id === Number(swapDuty1Id)), [schedules, swapDuty1Id]);
    const swapSchedule2 = useMemo(() => schedules.find(s => s.id === Number(swapDuty2Id)), [schedules, swapDuty2Id]);

    return (
        <div className="container-fluid">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0 d-flex align-items-center gap-2">
                        <i className="ti ti-calendar-user text-primary"></i>
                        Öğretmen Nöbet Çizelgesi
                    </h3>
                    <p className="text-muted mb-0">Haftalık (gün x nöbet yeri) bazında öğretmen nöbetlerini oluşturun, sürükleyerek çoğaltın veya değiştirin.</p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* Nöbet Değişimi Butonu */}
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-xs"
                            onClick={() => openSwapModal()}
                            disabled={loading || schedules.length < 2}
                            title="İki öğretmenin nöbetini karşılıklı takas edin"
                        >
                            <i className="ti ti-arrows-exchange fs-6"></i>
                            Nöbet Değişimi
                        </button>
                    )}

                    {/* Toplu Sıfırlama Butonu */}
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-xs"
                            onClick={() => void handleBulkReset()}
                            disabled={loading || schedules.length === 0}
                            title="Seçili kademedeki tüm nöbet atamalarını sıfırla"
                        >
                            <i className="ti ti-trash-x fs-6"></i>
                            Tüm Nöbetleri Sıfırla
                        </button>
                    )}

                    {/* Excel & PDF Dışa Aktarma */}
                    <div className="btn-group" role="group">
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => void exportExcel()}
                            disabled={exporting !== false || loading}
                        >
                            <i className="ti ti-file-spreadsheet me-1"></i>
                            {exporting === 'excel' ? 'Hazırlanıyor...' : 'Excel'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => void exportPdf()}
                            disabled={exporting !== false || loading}
                        >
                            <i className="ti ti-file-type-pdf me-1"></i>
                            {exporting === 'pdf' ? 'Hazırlanıyor...' : 'PDF'}
                        </button>
                    </div>
                </div>
                <div className="text-end d-none d-md-block ms-3">
                    <ol className="breadcrumb m-0 py-0 small">
                        <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                        <li className="breadcrumb-item"><a href="/operations" className="text-decoration-none text-muted">Operasyonel</a></li>
                        <li className="breadcrumb-item active fw-medium">Nöbet Çizelgesi</li>
                    </ol>
                </div>
            </div>

            {/* Scope Filtreleri (Kampüs & Kademe) */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-dark">Kampüs</label>
                            {hasSingleCampus ? (
                                <div className="form-control bg-light">
                                    {campuses.find((x) => x.id === myCampusIds[0])?.name || 'Kampüs'}
                                </div>
                            ) : (
                                <select
                                    className="form-select"
                                    value={campusFilter}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setCampusFilter(v ? Number.parseInt(v, 10) : '');
                                    }}
                                >
                                    <option value="">Tüm Kampüsler</option>
                                    {campuses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-dark">Kademe</label>
                            {hasSingleEducationLevel ? (
                                <div className="form-control bg-light">
                                    {educationLevels.find((x) => x.id === myEducationLevelIds[0])?.name || 'Kademe'}
                                </div>
                            ) : (
                                <select
                                    className="form-select"
                                    value={educationLevelFilter}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setEducationLevelFilter(v ? Number.parseInt(v, 10) : '');
                                    }}
                                >
                                    <option value="">{isFounder ? 'Tüm Kademeler' : 'Kademe Seçiniz'}</option>
                                    {educationLevels
                                        .filter((lvl) => isFounder || myEducationLevelIds.includes(Number(lvl.id)))
                                        .map((lvl) => (
                                             <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                                        ))}
                                </select>
                            )}
                        </div>

                        <div className="col-md-4 d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setCampusFilter(myCampusIds.length === 1 && !isFounder ? myCampusIds[0] : '');
                                    setEducationLevelFilter(myEducationLevelIds.length === 1 && !isFounder ? myEducationLevelIds[0] : '');
                                }}
                            >
                                Filtreyi Temizle
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {educationLevelFilter === '' ? (
                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <div className="text-center py-5">
                            <div className="text-muted">
                                <i className="ti ti-school fs-1 d-block mb-2 text-primary opacity-50"></i>
                                <p className="mb-0 fw-semibold">Lütfen nöbet çizelgesini görüntülemek ve düzenlemek için yukarıdan bir kademe seçiniz.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* HIZLI ÖĞRETMEN SÜRÜKLEME ÇUBUĞU (Ders Programı Gibi Çoğaltma / Atama) */}
                    {canEdit && (
                        <div className="card border-0 shadow-sm mb-3">
                            <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary-subtle text-primary p-2 rounded">
                                        <i className="ti ti-hand-grab fs-5"></i>
                                    </span>
                                    <div>
                                        <strong className="text-dark small d-block">
                                            Hızlı Öğretmen Atama & Çoğaltma Paleti
                                        </strong>
                                        <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                                            Öğretmeni tutup çizelgedeki bir güne sürükleyip bırakabilirsiniz. Tablodaki bir öğretmeni de başka bir güne sürükleyerek <strong>kolayca çoğaltabilir</strong> ya da başka bir öğretmenin üzerine bırakarak <strong>nöbetlerini değiştirebilirsiniz</strong>.
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
                                        <span className="input-group-text bg-light"><i className="ti ti-search text-muted"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Öğretmen ara..."
                                            value={quickTeacherSearch}
                                            onChange={e => setQuickTeacherSearch(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-link text-muted p-0"
                                        onClick={() => setShowQuickPalette(!showQuickPalette)}
                                        title={showQuickPalette ? 'Paleti Gizle' : 'Paleti Göster'}
                                    >
                                        <i className={`ti ${showQuickPalette ? 'ti-chevron-up' : 'ti-chevron-down'} fs-5`}></i>
                                    </button>
                                </div>
                            </div>

                            {showQuickPalette && (
                                <div className="card-body p-2 bg-light-subtle">
                                    <div className="d-flex flex-wrap gap-2 align-items-center" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                                        {filteredQuickTeachers.length === 0 ? (
                                            <div className="text-muted small p-2">Öğretmen bulunamadı.</div>
                                        ) : (
                                            filteredQuickTeachers.map(t => (
                                                <div
                                                    key={t.id}
                                                    className="badge bg-white text-dark border px-2 py-2 d-flex align-items-center gap-1 cursor-grab shadow-xs user-select-none transition hover-lift"
                                                    draggable={canEdit}
                                                    onDragStart={(e) => handleDragStartTeacher(e, t)}
                                                    onDragEnd={handleDragEnd}
                                                    title="Bu öğretmeni çizelgedeki bir hücreye sürükleyip bırakın"
                                                    style={{ cursor: 'grab' }}
                                                >
                                                    <i className="ti ti-grip-vertical text-muted"></i>
                                                    <span className="fw-semibold">{`${t.first_name} ${t.last_name}`.toLocaleUpperCase('tr-TR')}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nöbet Yeri Ekleme */}
                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                            <div className="row g-2 align-items-end">
                                <div className="col-md-5">
                                    <label className="form-label fw-bold small text-dark">Yeni Nöbet Yeri Ekle</label>
                                    <input
                                        className="form-control"
                                        value={newLocation}
                                        onChange={e => setNewLocation(e.target.value)}
                                        placeholder="Örn: A Blok 1. Kat, Bahçe, Yemekhane..."
                                        disabled={!canEdit}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addLocation();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <button type="button" className="btn btn-outline-primary w-100" onClick={addLocation} disabled={!canEdit || !newLocation.trim()}>
                                        <i className="ti ti-plus me-1"></i>Ekle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NÖBET MATRİS TABLOSU */}
                    <div className="card duty-table-wrapper">
                        <div className="card-body p-0">
                            <div className="table-responsive" style={{ overflowX: 'auto' }}>
                                <table className="table duty-table mb-0" style={{ minWidth: 980 }}>
                                    <thead className="duty-thead">
                                        <tr>
                                            <th style={{ width: 220 }} className="align-middle">Nöbet Yeri</th>
                                            {days.map(d => (
                                                <th key={d.id} className="align-middle text-center">{d.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={days.length + 1} className="text-center py-5">
                                                    <div className="spinner-border text-primary" role="status"></div>
                                                </td>
                                            </tr>
                                        ) : locations.length === 0 ? (
                                            <tr>
                                                <td colSpan={days.length + 1} className="text-center py-5 text-muted">
                                                    Henüz nöbet yeri tanımlanmamış. Yukarıdan yeni bir nöbet yeri ekleyin.
                                                </td>
                                            </tr>
                                        ) : (
                                            locations.map(loc => (
                                                <tr key={loc} className="duty-row">
                                                    <td className="align-middle fw-medium">
                                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                                            <span className="duty-location-name">{loc}</span>
                                                            {canEdit && (
                                                                <button
                                                                    type="button"
                                                                    className="duty-row-delete"
                                                                    onClick={() => void removeLocation(loc)}
                                                                    title="Nöbet yerini kaldır"
                                                                >
                                                                    <i className="ti ti-trash" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {days.map(d => {
                                                        const cellSchedules = getCellSchedules(loc, d.id);
                                                        const isCellDragTarget = dragOverCellKey === `${loc.trim()}::${d.id}`;

                                                        return (
                                                            <td
                                                                key={`${loc}-${d.id}`}
                                                                className={`duty-cell ${isCellDragTarget ? 'is-drag-over' : ''}`}
                                                                onDragOver={(e) => handleCellDragOver(e, loc, d.id)}
                                                                onDragLeave={() => handleCellDragLeave(loc, d.id)}
                                                                onDrop={(e) => void handleCellDrop(e, loc, d.id)}
                                                            >
                                                                <div className={`duty-cell-inner ${cellSchedules.length === 0 ? 'is-empty' : ''}`}>
                                                                    {canEdit && (
                                                                        <button
                                                                            type="button"
                                                                            className="duty-add"
                                                                            onClick={() => openCreate(d.id, loc)}
                                                                            title="Bu güne nöbet ekle"
                                                                        >
                                                                            <i className="ti ti-plus" />
                                                                        </button>
                                                                    )}

                                                                    {cellSchedules.length === 0 ? (
                                                                        <div className="duty-empty-hint">-</div>
                                                                    ) : (
                                                                        <div className="duty-cards">
                                                                            {cellSchedules.map(s => {
                                                                                const isCardDragOver = dragOverDutyId === s.id;
                                                                                return (
                                                                                    <div
                                                                                        key={s.id}
                                                                                        className={`duty-card ${s.is_active ? '' : 'is-inactive'} ${isCardDragOver ? 'is-drag-over-card' : ''}`}
                                                                                        onClick={() => openEdit(s)}
                                                                                        draggable={canEdit}
                                                                                        onDragStart={(e) => handleDragStartDuty(e, s)}
                                                                                        onDragEnd={handleDragEnd}
                                                                                        onDragOver={(e) => {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            setDragOverDutyId(s.id);
                                                                                        }}
                                                                                        onDragLeave={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (dragOverDutyId === s.id) setDragOverDutyId(null);
                                                                                        }}
                                                                                        onDrop={(e) => void handleCardDrop(e, s)}
                                                                                        title={canEdit ? 'Tıklayarak düzenleyin, sürükleyerek çoğaltın veya başka bir öğretmenin üzerine bırakarak nöbetleri değiştirin' : ''}
                                                                                    >
                                                                                        <div className="d-flex align-items-start justify-content-between">
                                                                                            <div>
                                                                                                <div className="duty-card__name">
                                                                                                    {getTeacherName(s)}
                                                                                                </div>
                                                                                                <div className="duty-card__time">
                                                                                                    {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}
                                                                                                </div>
                                                                                            </div>
                                                                                            {canEdit && (
                                                                                                <div className="d-flex align-items-center gap-1">
                                                                                                    {/* Nöbet Değişimi Butonu */}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className="duty-card__swap"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            openSwapModal(s);
                                                                                                        }}
                                                                                                        title="Nöbeti Değiştir (Karşılıklı Takas)"
                                                                                                    >
                                                                                                        <i className="ti ti-arrows-exchange" />
                                                                                                    </button>
                                                                                                    {/* Sil Butonu */}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className="duty-card__delete"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            void deleteSchedule(s.id);
                                                                                                        }}
                                                                                                        title="Görevi Sil"
                                                                                                    >
                                                                                                        <i className="ti ti-trash" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL 1: NÖBET EKLEME / DÜZENLEME EDİTÖRÜ */}
            {canEdit && showEditor && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content shadow border-0">
                                <div className="modal-header bg-white border-bottom">
                                    <h5 className="modal-title fw-bold text-dark">{editingId ? 'Nöbet Düzenle' : 'Yeni Nöbet Ekle'}</h5>
                                    <button type="button" className="btn-close" onClick={closeEditor}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-dark">Kademe</label>
                                            <div className="form-control bg-light">
                                                {educationLevels.find((x) => x.id === Number(formData.education_level_id))?.name || '-'}
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-dark">Öğretmen</label>
                                            <select
                                                className="form-select"
                                                value={formData.user_id}
                                                onChange={e => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                                            >
                                                <option value="">Öğretmen Seçin...</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {`${t.first_name} ${t.last_name}`.toLocaleUpperCase('tr-TR')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-dark">Gün</label>
                                            <select
                                                className="form-select"
                                                value={formData.day_of_week}
                                                onChange={e => setFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                                            >
                                                {days.map(d => (
                                                    <option key={d.id} value={d.id}>{d.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-bold small text-dark">Nöbet Yeri</label>
                                            <div className="form-control bg-light">{formData.location || '-'}</div>
                                        </div>

                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-dark">Başlangıç Saati</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={formData.start_time}
                                                onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold small text-dark">Bitiş Saati</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={formData.end_time}
                                                onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                            />
                                        </div>

                                        <div className="col-12">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="dutyActiveSwitch"
                                                    checked={formData.is_active}
                                                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                                />
                                                <label className="form-check-label" htmlFor="dutyActiveSwitch">Aktif</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-light" onClick={closeEditor} disabled={saving}>Vazgeç</button>
                                    <button type="button" className="btn btn-primary" onClick={() => void saveSchedule()} disabled={saving}>
                                        {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={closeEditor}></div>
                </>
            )}

            {/* MODAL 2: NÖBET DEĞİŞİMİ (SWAP MODAL) */}
            {canEdit && showSwapModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content shadow border-0">
                                <div className="modal-header bg-white border-bottom">
                                    <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                        <i className="ti ti-arrows-exchange text-primary fs-4"></i>
                                        Nöbet Değişimi (Öğretmen Takası)
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowSwapModal(false)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    <p className="text-muted small mb-3">
                                        Aşağıdan karşılıklı nöbetlerini değiştirmek istediğiniz iki görevi seçin. Öğretmenlerin nöbet günleri ve yerleri yer değiştirecektir.
                                    </p>

                                    <div className="row g-3">
                                        {/* 1. Görev */}
                                        <div className="col-md-6">
                                            <div className="p-3 border rounded bg-light h-100">
                                                <label className="form-label fw-bold text-dark mb-2">1. Nöbet Görevi</label>
                                                <select
                                                    className="form-select mb-3"
                                                    value={swapDuty1Id}
                                                    onChange={e => setSwapDuty1Id(e.target.value ? Number(e.target.value) : '')}
                                                >
                                                    <option value="">Nöbet Seçin...</option>
                                                    {schedules.map(s => {
                                                        const tName = getTeacherName(s);
                                                        const dName = dayLabelById[s.day_of_week] || '';
                                                        return (
                                                            <option key={s.id} value={s.id} disabled={s.id === Number(swapDuty2Id)}>
                                                                {tName} ({dName} - {s.location || '-'})
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {swapSchedule1 && (
                                                    <div className="p-2 bg-white rounded border small">
                                                        <div className="fw-bold text-primary">{getTeacherName(swapSchedule1)}</div>
                                                        <div className="text-muted mt-1">
                                                            <i className="ti ti-calendar me-1"></i>{dayLabelById[swapSchedule1.day_of_week]}
                                                        </div>
                                                        <div className="text-muted">
                                                            <i className="ti ti-map-pin me-1"></i>{swapSchedule1.location || '-'}
                                                        </div>
                                                        <div className="text-muted">
                                                            <i className="ti ti-clock me-1"></i>{swapSchedule1.start_time?.substring(0, 5)} - {swapSchedule1.end_time?.substring(0, 5)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Görev */}
                                        <div className="col-md-6">
                                            <div className="p-3 border rounded bg-light h-100">
                                                <label className="form-label fw-bold text-dark mb-2">2. Nöbet Görevi (Takas Edilecek)</label>
                                                <select
                                                    className="form-select mb-3"
                                                    value={swapDuty2Id}
                                                    onChange={e => setSwapDuty2Id(e.target.value ? Number(e.target.value) : '')}
                                                >
                                                    <option value="">Nöbet Seçin...</option>
                                                    {schedules.map(s => {
                                                        const tName = getTeacherName(s);
                                                        const dName = dayLabelById[s.day_of_week] || '';
                                                        return (
                                                            <option key={s.id} value={s.id} disabled={s.id === Number(swapDuty1Id)}>
                                                                {tName} ({dName} - {s.location || '-'})
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {swapSchedule2 && (
                                                    <div className="p-2 bg-white rounded border small">
                                                        <div className="fw-bold text-success">{getTeacherName(swapSchedule2)}</div>
                                                        <div className="text-muted mt-1">
                                                            <i className="ti ti-calendar me-1"></i>{dayLabelById[swapSchedule2.day_of_week]}
                                                        </div>
                                                        <div className="text-muted">
                                                            <i className="ti ti-map-pin me-1"></i>{swapSchedule2.location || '-'}
                                                        </div>
                                                        <div className="text-muted">
                                                            <i className="ti ti-clock me-1"></i>{swapSchedule2.start_time?.substring(0, 5)} - {swapSchedule2.end_time?.substring(0, 5)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Değişim Sonucu Önizleme */}
                                    {swapSchedule1 && swapSchedule2 && (
                                        <div className="mt-3 p-3 bg-primary-subtle border border-primary-subtle rounded text-dark small">
                                            <strong className="d-block mb-1">Değişim Sonrası Yeni Durum:</strong>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <i className="ti ti-arrow-right text-primary"></i>
                                                <span>
                                                    <strong>{getTeacherName(swapSchedule1)}</strong> ➡️ {dayLabelById[swapSchedule2.day_of_week]} günü, <strong>{swapSchedule2.location}</strong> nöbetine geçecek.
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="ti ti-arrow-right text-primary"></i>
                                                <span>
                                                    <strong>{getTeacherName(swapSchedule2)}</strong> ➡️ {dayLabelById[swapSchedule1.day_of_week]} günü, <strong>{swapSchedule1.location}</strong> nöbetine geçecek.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSwapModal(false)} disabled={swapping}>
                                        Vazgeç
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                        onClick={() => void handleSwapDuties(Number(swapDuty1Id), Number(swapDuty2Id))}
                                        disabled={!swapDuty1Id || !swapDuty2Id || swapDuty1Id === swapDuty2Id || swapping}
                                    >
                                        {swapping && <span className="spinner-border spinner-border-sm me-1"></span>}
                                        <i className="ti ti-arrows-exchange"></i>
                                        Nöbetleri Değiştir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowSwapModal(false)}></div>
                </>
            )}

            <style>{`
                .bg-soft-primary { background-color: rgba(59, 108, 255, 0.1); }

                .duty-table-wrapper {
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .duty-table {
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .duty-table th,
                .duty-table td {
                    border: 1px solid #e5e7eb;
                }
                .duty-thead th {
                    font-weight: 600;
                    font-size: 13px;
                }
                .duty-thead th:first-child {
                    background: var(--duty-header-first-bg, #f1f5f9);
                    color: var(--duty-header-first-color, #0f172a);
                }
                .duty-thead th:not(:first-child) {
                    background: #1e293b;
                    color: #ffffff;
                }

                [data-bs-theme="dark"] .duty-table-wrapper,
                [data-layout-mode="dark"] .duty-table-wrapper {
                    border-color: rgba(255,255,255,0.1);
                }
                [data-bs-theme="dark"] .duty-table th,
                [data-bs-theme="dark"] .duty-table td,
                [data-layout-mode="dark"] .duty-table th,
                [data-layout-mode="dark"] .duty-table td {
                    border-color: rgba(255,255,255,0.08);
                }
                [data-bs-theme="dark"] .duty-thead th:first-child,
                [data-layout-mode="dark"] .duty-thead th:first-child {
                    background: #1e293b;
                    color: #e2e8f0;
                }

                .duty-row:hover .duty-row-delete {
                    opacity: 1;
                    pointer-events: auto;
                }
                .duty-row-delete {
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                    background: transparent;
                    color: #64748b;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 140ms ease, color 140ms ease, background 140ms ease, border-color 140ms ease;
                }
                .duty-row-delete:hover {
                    color: #ef4444;
                    background: transparent;
                    border-color: transparent;
                }

                .duty-cell {
                    padding: 0;
                    background: transparent;
                    transition: background 140ms ease, border 140ms ease;
                }
                .duty-cell.is-drag-over {
                    background: rgba(59, 130, 246, 0.12) !important;
                    outline: 2px dashed #3b82f6 !important;
                    outline-offset: -2px;
                }

                .duty-cell-inner {
                    position: relative;
                    min-height: 96px;
                    padding: 10px;
                    transition: background 140ms ease;
                }
                .duty-cell-inner.is-empty {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                }
                .duty-cell-inner.is-empty:hover {
                    background: rgba(148, 163, 184, 0.14);
                }
                .duty-cell-inner:hover .duty-add {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .duty-add {
                    position: absolute;
                    right: 10px;
                    bottom: 10px;
                    transform: translateY(4px);
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    border: 1px solid transparent;
                    background: transparent;
                    color: rgba(148, 163, 184, 0.95);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 140ms ease, transform 140ms ease, color 140ms ease, border-color 140ms ease;
                }
                .duty-cell-inner.is-empty .duty-add {
                    position: static;
                    opacity: 0;
                    transform: scale(0.96);
                }
                .duty-cell-inner.is-empty:hover .duty-add {
                    opacity: 1;
                    pointer-events: auto;
                    transform: scale(1.08);
                }
                .duty-add:hover {
                    border-color: rgba(148, 163, 184, 0.5);
                    color: #93c5fd;
                }

                .duty-empty-hint {
                    display: none;
                }

                .duty-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-right: 42px;
                }
                .duty-card {
                    border-radius: 8px;
                    background: #eef2ff;
                    border: 1px solid rgba(148, 163, 184, 0.55);
                    border-left: 4px solid #93c5fd;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    padding: 10px 10px;
                    cursor: grab;
                    user-select: none;
                    transition: box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease, background 140ms ease;
                }
                .duty-card:active {
                    cursor: grabbing;
                }
                .duty-card:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
                    border-color: rgba(147, 197, 253, 0.7);
                }
                .duty-card.is-inactive {
                    opacity: 0.75;
                    background: #f1f5f9;
                }
                .duty-card.is-drag-over-card {
                    background: #dbeafe !important;
                    border: 2px dashed #2563eb !important;
                    transform: scale(1.04) !important;
                }
                .duty-card__name {
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.15;
                    font-size: 13px;
                }
                .duty-card__time {
                    color: #64748b;
                    font-size: 12px;
                    margin-top: 3px;
                }

                /* Dark mode overrides */
                [data-bs-theme="dark"] .duty-card,
                [data-layout-mode="dark"] .duty-card {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(148, 163, 184, 0.25);
                    border-left-color: #818cf8;
                }
                [data-bs-theme="dark"] .duty-card.is-inactive,
                [data-layout-mode="dark"] .duty-card.is-inactive {
                    background: rgba(255,255,255,0.05);
                }
                [data-bs-theme="dark"] .duty-card__name,
                [data-layout-mode="dark"] .duty-card__name {
                    color: #e2e8f0;
                }
                [data-bs-theme="dark"] .duty-card__time,
                [data-layout-mode="dark"] .duty-card__time {
                    color: #94a3b8;
                }

                .duty-card:hover .duty-card__swap,
                .duty-card:hover .duty-card__delete {
                    opacity: 1;
                    pointer-events: auto;
                }
                .duty-card__swap {
                    width: 24px;
                    height: 24px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                    background: transparent;
                    color: #64748b;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 140ms ease, color 140ms ease, background 140ms ease;
                }
                .duty-card__swap:hover {
                    color: #2563eb;
                    background: rgba(37, 99, 235, 0.1);
                }

                .duty-card__delete {
                    width: 24px;
                    height: 24px;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid transparent;
                    background: transparent;
                    color: #64748b;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 140ms ease, color 140ms ease, background 140ms ease;
                }
                .duty-card__delete:hover {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }

                .cursor-grab {
                    cursor: grab;
                }
                .cursor-grab:active {
                    cursor: grabbing;
                }
                .hover-lift {
                    transition: transform 120ms ease, box-shadow 120ms ease;
                }
                .hover-lift:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
};

export default DutyScheduleList;
