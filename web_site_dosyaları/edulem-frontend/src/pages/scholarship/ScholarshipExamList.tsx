import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Scholarship {
    id: number;
    tenant_id: number;
    student_id?: number;
    tc_kimlik: string;
    ad_soyad: string;
    okul_adi: string;
    classroom_id?: number;
    sinif_adi?: string;
    veli_ad_soyad: string;
    dogum_tarihi?: string;
    veli_iletisim: string;
    durum: 'aktif' | 'pasif';
    created_at: string;
    updated_at: string;
}

interface Classroom {
    id: number;
    name: string;
    grade_level?: string | number | null;
    campus_id?: number | null;
    campus?: {
        id: number;
        name: string;
    } | null;
    education_level_id?: number | null;
    education_level?: {
        id?: number;
        name: string;
        campus_id?: number | null;
        campus?: { id: number; name: string } | null;
    };
    educationLevel?: {
        id?: number;
        name: string;
        campus_id?: number | null;
        campus?: { id: number; name: string } | null;
    };
}

interface Statistics {
    total_active: number;
    total_archived: number;
    class_level_stats: Array<{
        sinif_adi: string;
        count: number;
    }>;
    classroom_stats: Array<{
        classroom_id: number;
        classroom_name: string;
        count: number;
    }>;
}

interface ScholarshipDocumentTemplate {
    id: number;
    name?: string | null;
    exam_entry_date: string;
    exam_entry_time?: string | null;
    school_name: string;
    exam_address: string;
    notes?: string | null;
    classrooms?: Array<{
        id: number;
        name: string;
        education_level?: {
            id: number;
            name: string;
        } | null;
    }>;
}

interface StudentPickItem {
    id: number;
    ad_soyad?: string | null;
    tc_kimlik?: string | null;
    bursluluk_kayitli?: boolean;
}

const ScholarshipExamList: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<'all' | 'classes' | 'statistics' | 'documents' | 'exam-class' | 'archive'>('all');

    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [mobileOpenScholarshipId, setMobileOpenScholarshipId] = useState<number | null>(null);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const [showModal, setShowModal] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);

    const [showPickModal, setShowPickModal] = useState(false);
    const [pickEducationLevelId, setPickEducationLevelId] = useState<number | ''>('');
    const [pickClassroomId, setPickClassroomId] = useState<number | ''>('');
    const [pickStudentsLoading, setPickStudentsLoading] = useState(false);
    const [pickStudents, setPickStudents] = useState<StudentPickItem[]>([]);
    const [pickSelectedStudentIds, setPickSelectedStudentIds] = useState<number[]>([]);
    const [pickSaving, setPickSaving] = useState(false);
    const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);
    const [pickLoading, setPickLoading] = useState(false);

    const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');
    const [selectedClassroomId, setSelectedClassroomId] = useState<number | ''>('');
    const [selectedCampusIdClasses, setSelectedCampusIdClasses] = useState<string>('');
    const [classTabLoading, setClassTabLoading] = useState(false);
    const [classTabScholarships, setClassTabScholarships] = useState<Scholarship[]>([]);
    const [campuses, setCampuses] = useState<Array<{ id: number; name: string }>>([]);

    const [mixRoomCount, setMixRoomCount] = useState<number>(1);
    const [mixRoomCapacity, setMixRoomCapacity] = useState<number>(30);
    const [mixSelectedClassroomIds, setMixSelectedClassroomIds] = useState<number[]>([]);
    const [mixSameSchoolTogether, setMixSameSchoolTogether] = useState<boolean>(false);
    const [mixSameEducationLevelOnly, setMixSameEducationLevelOnly] = useState<boolean>(true);
    const [mixGenerating, setMixGenerating] = useState<boolean>(false);
    const [mixEditMode, setMixEditMode] = useState<boolean>(false);
    const [mixRooms, setMixRooms] = useState<Array<{ name: string; students: Scholarship[] }>>([]);

    const fetchMixSourceStudents = async (classroomIds: number[]) => {
        const res = await axiosClient.get('/scholarships', {
            params: {
                durum: 'aktif',
                per_page: 1000,
            },
        });
        const d = res.data?.data ?? res.data;
        const list = d?.scholarships ?? d?.scholarships?.data ?? [];
        const arr: Scholarship[] = Array.isArray(list) ? list : [];
        return arr.filter((s) => (s.classroom_id ? classroomIds.includes(s.classroom_id) : false));
    };

    const shuffleArray = <T,>(input: T[]) => {
        const a = [...input];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const generateMixedRooms = async (opts?: { reshuffle?: boolean }) => {
        if (mixSelectedClassroomIds.length === 0) {
            showToast('error', 'En az bir sınıf seçmelisiniz');
            return;
        }
        if (!mixRoomCount || mixRoomCount < 1) {
            showToast('error', 'Sınav sınıf sayısı en az 1 olmalı');
            return;
        }
        if (!mixRoomCapacity || mixRoomCapacity < 1) {
            showToast('error', 'Sınıf kapasitesi en az 1 olmalı');
            return;
        }

        try {
            setMixGenerating(true);
            const students = await fetchMixSourceStudents(mixSelectedClassroomIds);

            let pool = [...students];

            if (mixSameEducationLevelOnly) {
                const byLevel = new Map<string, Scholarship[]>();
                for (const s of pool) {
                    const cls = classrooms.find((c) => c.id === s.classroom_id);
                    const level = cls?.education_level?.name || 'Diğer';
                    byLevel.set(level, [...(byLevel.get(level) || []), s]);
                }

                const orderedLevels = Array.from(byLevel.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
                pool = orderedLevels.flatMap((lvl) => shuffleArray(byLevel.get(lvl) || []));
            } else {
                pool = shuffleArray(pool);
            }

            if (mixSameSchoolTogether) {
                const bySchool = new Map<string, Scholarship[]>();
                for (const s of pool) {
                    const key = (s.okul_adi || '').trim() || 'Diğer';
                    bySchool.set(key, [...(bySchool.get(key) || []), s]);
                }
                const orderedSchools = Array.from(bySchool.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
                pool = orderedSchools.flatMap((k) => shuffleArray(bySchool.get(k) || []));
            }

            const rooms: Array<{ name: string; students: Scholarship[] }> = Array.from({ length: mixRoomCount }).map((_, i) => ({
                name: `Sınav Sınıfı ${i + 1}`,
                students: [],
            }));

            let roomIndex = 0;
            for (const s of pool) {
                let attempts = 0;
                while (attempts < rooms.length && rooms[roomIndex].students.length >= mixRoomCapacity) {
                    roomIndex = (roomIndex + 1) % rooms.length;
                    attempts++;
                }
                if (rooms[roomIndex].students.length >= mixRoomCapacity) break;
                rooms[roomIndex].students.push(s);
                roomIndex = (roomIndex + 1) % rooms.length;
            }

            if (!opts?.reshuffle) {
                setMixEditMode(false);
            }
            setMixRooms(rooms);
        } catch (e: any) {
            console.error('Sınav sınıfları oluşturulamadı:', e);
            showToast('error', e?.response?.data?.message || 'Sınav sınıfları oluşturulamadı');
        } finally {
            setMixGenerating(false);
        }
    };

    const moveStudentToRoom = (studentId: number, targetRoomIndex: number) => {
        setMixRooms((prev) => {
            const next = prev.map((r) => ({ ...r, students: [...r.students] }));
            let found: Scholarship | null = null;

            for (const r of next) {
                const idx = r.students.findIndex((s) => s.id === studentId);
                if (idx >= 0) {
                    found = r.students[idx];
                    r.students.splice(idx, 1);
                    break;
                }
            }

            if (!found) return prev;
            if (next[targetRoomIndex].students.length >= mixRoomCapacity) {
                showToast('error', 'Hedef sınıf kapasitesi dolu');
                return prev;
            }
            next[targetRoomIndex].students.push(found);
            return next;
        });
    };

    const openMixedRoomsPrint = (mode: 'print' | 'pdf') => {
        if (!mixRooms.length) {
            showToast('error', 'Önce sınav sınıflarını oluşturmalısınız');
            return;
        }

        const html = `\
<!doctype html>\
<html lang="tr">\
<head>\
<meta charset="utf-8" />\
<meta name="viewport" content="width=device-width, initial-scale=1" />\
<title>Sınav Sınıfları</title>\
<style>\
body{font-family:Arial, sans-serif; color:#111827; font-size:12px;}\
.header{display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #f97316; padding-bottom:8px; margin-bottom:12px;}\
.title{font-size:18px; font-weight:700; color:#f97316;}\
.meta{color:#6b7280; font-size:11px;}\
.room{margin-bottom:18px; page-break-inside:avoid;}\
.room h2{font-size:14px; margin:0 0 6px 0;}\
table{width:100%; border-collapse:collapse;}\
th,td{border:1px solid #e5e7eb; padding:6px 8px;}\
th{background:#f9fafb; text-align:left;}\
.badge{display:inline-block; padding:2px 6px; border-radius:10px; background:#fff7ed; color:#9a3412; font-size:11px;}\
@media print {.no-print{display:none;}}\
</style>\
</head>\
<body>\
<div class="header">\
  <div>\
    <div class="title">SINAV SINIFLARI</div>\
    <div class="meta">Oluşturulma: ${new Date().toLocaleString('tr-TR')}</div>\
  </div>\
  <div class="meta">\
    <span class="badge">Sınav Sınıfı: ${mixRooms.length}</span>\
    <span class="badge">Kapasite: ${mixRoomCapacity}</span>\
    <span class="badge">Toplam Öğrenci: ${mixRooms.reduce((a, r) => a + r.students.length, 0)}</span>\
  </div>\
</div>\
${mixRooms
                .map((r) => {
                    const rows = r.students
                        .map((s, i) => {
                            const cls = classrooms.find((c) => c.id === s.classroom_id);
                            const clsText = s.sinif_adi || (cls ? `${cls.education_level?.name ? cls.education_level.name + ' - ' : ''}${cls.name}` : '-');
                            return `<tr>\
  <td>${i + 1}</td>\
  <td>${s.tc_kimlik || ''}</td>\
  <td>${s.ad_soyad || ''}</td>\
  <td>${s.okul_adi || ''}</td>\
  <td>${clsText}</td>\
  <td>${s.veli_iletisim || ''}</td>\
</tr>`;
                        })
                        .join('');
                    return `<div class="room">\
  <h2>${r.name} (${r.students.length} Öğrenci)</h2>\
  <table>\
    <thead>\
      <tr>\
        <th style="width:40px">Sıra</th>\
        <th style="width:120px">T.C. Kimlik</th>\
        <th>Ad Soyad</th>\
        <th>Okul</th>\
        <th style="width:150px">Sınıf</th>\
        <th style="width:120px">Veli İletişim</th>\
      </tr>\
    </thead>\
    <tbody>${rows || ''}</tbody>\
  </table>\
</div>`;
                })
                .join('')}\
</body>\
</html>`;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();

        if (mode === 'print') {
            w.onload = () => {
                try {
                    w.focus();
                    w.print();
                } catch {
                    // noop
                }
            };
        }
    };

    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templates, setTemplates] = useState<ScholarshipDocumentTemplate[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ScholarshipDocumentTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        exam_entry_date: '',
        exam_entry_time: '',
        school_name: '',
        exam_address: '',
        notes: '',
        classroom_ids: [] as number[],
    });

    const [formData, setFormData] = useState({
        tc_kimlik: '',
        ad_soyad: '',
        okul_adi: '',
        classroom_id: null as number | null,
        sinif_adi: '',
        veli_ad_soyad: '',
        dogum_tarihi: '',
        veli_iletisim: '',
        student_id: null as number | null,
    });

    useEffect(() => {
        if (selectedTab === 'statistics') {
            fetchStatistics();
        }

        if (selectedTab === 'exam-class' || selectedTab === 'documents') {
            fetchClassrooms();
        }

        if (selectedTab === 'classes') {
            fetchClassrooms();
            fetchClassTabScholarships();
        }
    }, [selectedTab]);

    useEffect(() => {
        if (!showPickModal) return;
        if (!pickClassroomId) {
            setPickStudents([]);
            setPickSelectedStudentIds([]);
            return;
        }

        const fetchPickStudents = async () => {
            try {
                setPickStudentsLoading(true);
                const res = await axiosClient.get(`/scholarships/students-by-classroom/${pickClassroomId}`);
                const d = res.data?.data ?? res.data;
                const list = d?.students ?? [];
                const arr: StudentPickItem[] = Array.isArray(list) ? list : [];
                setPickStudents(arr);
                setPickSelectedStudentIds([]);
            } catch (e: any) {
                console.error('Öğrenciler yüklenemedi:', e);
                showToast('error', e?.response?.data?.message || 'Öğrenciler yüklenemedi');
                setPickStudents([]);
                setPickSelectedStudentIds([]);
            } finally {
                setPickStudentsLoading(false);
            }
        };

        fetchPickStudents();
    }, [showPickModal, pickClassroomId]);

    useEffect(() => {
        if (selectedTab !== 'documents') return;
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTab]);

    useEffect(() => {
        if (selectedTab !== 'classes') return;
        fetchClassTabScholarships();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassLevel]);

    useEffect(() => {
        if (selectedTab !== 'classes') return;
        fetchClassTabScholarships();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClassroomId]);

    useEffect(() => {
        if (selectedTab === 'all' || selectedTab === 'archive') {
            fetchScholarships();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTab, searchTerm, currentPage]);

    const fetchScholarships = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                per_page: '15',
                ...(searchTerm ? { search: searchTerm } : {}),
                ...(selectedTab === 'archive' ? { durum: 'pasif' } : {}),
            });

            const response = await axiosClient.get(`/scholarships?${params.toString()}`);
            setScholarships(response.data.data.scholarships);
            setPagination(response.data.data.pagination);
        } catch (error) {
            showToast('error', 'Bursluluk kayıtları yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const [classroomsRes, campusesRes] = await Promise.all([
                axiosClient.get('/classrooms?per_page=200'),
                axiosClient.get('/campuses'),
            ]);
            setClassrooms(classroomsRes.data.data.classrooms || []);
            const cmpData = campusesRes.data?.data ?? campusesRes.data;
            setCampuses(cmpData?.campuses ?? cmpData ?? []);
        } catch {
            setClassrooms([]);
        }
    };

    const fetchClassTabScholarships = async () => {
        try {
            setClassTabLoading(true);

            const params = new URLSearchParams({
                per_page: '5000',
                durum: 'aktif',
            });

            const response = await axiosClient.get(`/scholarships?${params.toString()}`);
            const list: Scholarship[] = response.data.data.scholarships || [];

            const filtered = selectedClassroomId
                ? list.filter((s) => Number(s.classroom_id) === Number(selectedClassroomId))
                : selectedClassLevel
                    ? list.filter((s) => {
                        const v = String(s.sinif_adi || '').trim();
                        if (!v) return false;
                        return v === selectedClassLevel || v.startsWith(`${selectedClassLevel} `) || v.startsWith(`${selectedClassLevel} -`);
                    })
                    : list;

            setClassTabScholarships(filtered);
        } catch {
            setClassTabScholarships([]);
        } finally {
            setClassTabLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            setStatsLoading(true);
            const response = await axiosClient.get('/scholarships/statistics');
            const d = response.data?.data ?? response.data;
            setStatistics(d);
        } catch (e: any) {
            console.error('İstatistikler yüklenemedi:', e);
            showToast('error', e?.response?.data?.message || 'İstatistikler yüklenemedi');
            setStatistics(null);
        }
        finally {
            setStatsLoading(false);
        }
    };

    const downloadEntryDocument = async (scholarshipId: number) => {
        try {
            const res = await axiosClient.get(`/scholarships/${scholarshipId}/entry-document`, {
                responseType: 'blob',
            });

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            const w = window.open(url, '_blank');
            if (w) {
                w.onload = () => {
                    try {
                        w.focus();
                        w.print();
                    } catch {
                        // noop
                    }
                };
            }

            setTimeout(() => {
                try {
                    window.URL.revokeObjectURL(url);
                } catch {
                    // noop
                }
            }, 15000);
        } catch (e: any) {
            console.error('Belge indirilemedi:', e);

            let msg = e?.response?.data?.message;
            try {
                const data = e?.response?.data;
                const contentType = String(e?.response?.headers?.['content-type'] || '');

                if (!msg && data instanceof Blob && (contentType.includes('application/json') || data.type.includes('application/json'))) {
                    const text = await data.text();
                    const parsed = JSON.parse(text);
                    msg = parsed?.message;
                }
            } catch {
                // noop
            }

            showToast('error', msg || 'Belge indirilemedi');
        }
    };

    const fetchTemplates = async () => {
        try {
            setTemplatesLoading(true);
            const res = await axiosClient.get('/scholarship-document-templates?per_page=100');
            const d = res.data?.data ?? res.data;
            const raw = d?.templates;
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            setTemplates(list);
        } catch (e: any) {
            console.error('Şablonlar yüklenemedi:', e);
            showToast('error', e?.response?.data?.message || 'Şablonlar yüklenemedi');
            setTemplates([]);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const openCreateTemplate = () => {
        setEditingTemplate(null);
        setTemplateForm({
            name: '',
            exam_entry_date: '',
            exam_entry_time: '',
            school_name: '',
            exam_address: '',
            notes: '',
            classroom_ids: [],
        });
        setShowTemplateModal(true);
    };

    const openEditTemplate = (t: ScholarshipDocumentTemplate) => {
        setEditingTemplate(t);
        setTemplateForm({
            name: t.name || '',
            exam_entry_date: t.exam_entry_date || '',
            exam_entry_time: t.exam_entry_time ? String(t.exam_entry_time).slice(0, 5) : '',
            school_name: t.school_name || '',
            exam_address: t.exam_address || '',
            notes: t.notes || '',
            classroom_ids: (t.classrooms || []).map((c) => c.id),
        });
        setShowTemplateModal(true);
    };

    const saveTemplate = async () => {
        if (!templateForm.exam_entry_date) {
            showToast('error', 'Sınav giriş tarihi zorunludur');
            return;
        }
        if (!templateForm.school_name.trim()) {
            showToast('error', 'Okul adı zorunludur');
            return;
        }
        if (!templateForm.exam_address.trim()) {
            showToast('error', 'Sınav adresi zorunludur');
            return;
        }
        if (templateForm.classroom_ids.length === 0) {
            showToast('error', 'En az bir sınıf seçmelisiniz');
            return;
        }

        const payload: any = {
            name: templateForm.name.trim() ? templateForm.name.trim() : null,
            exam_entry_date: templateForm.exam_entry_date,
            exam_entry_time: templateForm.exam_entry_time ? templateForm.exam_entry_time.slice(0, 5) : null,
            school_name: templateForm.school_name.trim(),
            exam_address: templateForm.exam_address.trim(),
            notes: templateForm.notes ? String(templateForm.notes) : null,
            classroom_ids: templateForm.classroom_ids,
        };

        try {
            if (editingTemplate) {
                await axiosClient.put(`/scholarship-document-templates/${editingTemplate.id}`, payload);
                showToast('success', 'Şablon güncellendi');
            } else {
                await axiosClient.post('/scholarship-document-templates', payload);
                showToast('success', 'Şablon oluşturuldu');
            }
            setShowTemplateModal(false);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (e: any) {
            console.error('Şablon kaydedilemedi:', e);
            showToast('error', e?.response?.data?.message || 'Şablon kaydedilemedi');
        }
    };

    const deleteTemplate = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Şablon silinsin mi?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/scholarship-document-templates/${id}`);
            showToast('success', 'Şablon silindi');
            fetchTemplates();
        } catch (e: any) {
            showToast('error', e?.response?.data?.message || 'Şablon silinemedi');
        }
    };

    const resetForm = () => {
        setFormData({
            tc_kimlik: '',
            ad_soyad: '',
            okul_adi: '',
            classroom_id: null,
            sinif_adi: '',
            veli_ad_soyad: '',
            dogum_tarihi: '',
            veli_iletisim: '',
            student_id: null,
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const openCreate = () => {
        setEditingScholarship(null);
        resetForm();
        if (classrooms.length === 0) {
            fetchClassrooms();
        }
        setShowModal(true);
    };

    const getFirstValidationError = (err: any) => {
        const errors = err?.response?.data?.errors;
        if (!errors || typeof errors !== 'object') return '';
        const firstKey = Object.keys(errors)[0];
        const v = (errors as any)[firstKey];
        if (Array.isArray(v)) return String(v[0] ?? '');
        if (typeof v === 'string') return v;
        return '';
    };

    const openPickFromList = async () => {
        setShowPickModal(true);
        setPickLoading(true);
        try {
            const [classroomsRes, educationLevelsRes] = await Promise.all([
                axiosClient.get('/classrooms?per_page=200'),
                axiosClient.get('/education-levels?per_page=200'),
            ]);
            setClassrooms(classroomsRes.data.data.classrooms || []);
            const elData = educationLevelsRes.data?.data ?? educationLevelsRes.data;
            const rawLevels = elData?.education_levels ?? elData?.educationLevels ?? elData;
            const levelArr = Array.isArray(rawLevels) ? rawLevels : Array.isArray(rawLevels?.data) ? rawLevels.data : [];
            setEducationLevels(levelArr as Array<{ id: number; name: string }>);
        } catch (e: any) {
            console.error('Veriler yüklenemedi:', e);
            showToast('error', 'Kademeler ve sınıflar yüklenemedi');
        } finally {
            setPickLoading(false);
        }
        setPickEducationLevelId('');
        setPickClassroomId('');
        setPickStudents([]);
        setPickSelectedStudentIds([]);
    };

    const closePickFromList = () => {
        setShowPickModal(false);
        setPickEducationLevelId('');
        setPickClassroomId('');
        setPickStudents([]);
        setPickSelectedStudentIds([]);
        setEducationLevels([]);
    };

    const saveSelectedStudentsFromPick = async () => {
        if (pickSelectedStudentIds.length === 0) {
            showToast('error', 'En az bir öğrenci seçmelisiniz');
            return;
        }

        try {
            setPickSaving(true);
            const res = await axiosClient.post('/scholarships/register-selected-students', {
                student_ids: pickSelectedStudentIds,
            });
            const msg = res.data?.message || 'Kayıt işlemi tamamlandı';
            showToast('success', msg);
            closePickFromList();
            setShowModal(false);
            fetchScholarships();
            fetchStatistics();
        } catch (e: any) {
            console.error('Toplu kayıt başarısız:', e);
            showToast('error', e?.response?.data?.message || 'Toplu kayıt başarısız');
        } finally {
            setPickSaving(false);
        }
    };

    const saveEntireClassFromPick = async () => {
        if (!pickClassroomId) {
            showToast('error', 'Önce sınıf seçmelisiniz');
            return;
        }

        try {
            setPickSaving(true);
            const res = await axiosClient.post('/scholarships/register-entire-class', {
                classroom_id: pickClassroomId,
            });
            const msg = res.data?.message || 'Sınıf kaydı tamamlandı';
            showToast('success', msg);
            closePickFromList();
            setShowModal(false);
            fetchScholarships();
            fetchStatistics();
        } catch (e: any) {
            console.error('Sınıf kaydı başarısız:', e);
            showToast('error', e?.response?.data?.message || 'Sınıf kaydı başarısız');
        } finally {
            setPickSaving(false);
        }
    };

    const openEdit = (scholarship: Scholarship) => {
        setEditingScholarship(scholarship);
        setFormData({
            tc_kimlik: scholarship.tc_kimlik,
            ad_soyad: scholarship.ad_soyad,
            okul_adi: scholarship.okul_adi,
            classroom_id: scholarship.classroom_id || null,
            sinif_adi: scholarship.sinif_adi || '',
            veli_ad_soyad: scholarship.veli_ad_soyad,
            dogum_tarihi: scholarship.dogum_tarihi || '',
            veli_iletisim: scholarship.veli_iletisim,
            student_id: scholarship.student_id || null,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data: any = { ...formData };
            if (data.classroom_id === '' || data.classroom_id === null || data.classroom_id === undefined) {
                delete data.classroom_id;
            } else {
                data.classroom_id = Number(data.classroom_id);
                if (!Number.isFinite(data.classroom_id) || data.classroom_id <= 0) {
                    delete data.classroom_id;
                }
            }

            if (data.student_id === '' || data.student_id === null || data.student_id === undefined) {
                delete data.student_id;
            } else {
                data.student_id = Number(data.student_id);
                if (!Number.isFinite(data.student_id) || data.student_id <= 0) {
                    delete data.student_id;
                }
            }

            if (editingScholarship) {
                await axiosClient.put(`/scholarships/${editingScholarship.id}`, data);
                showToast('success', 'Bursluluk kaydı güncellendi');
            } else {
                await axiosClient.post('/scholarships', data);
                showToast('success', 'Bursluluk kaydı eklendi');
            }

            setShowModal(false);
            setEditingScholarship(null);
            resetForm();
            fetchScholarships();
            fetchStatistics();
        } catch (error: any) {
            if (error?.response?.status === 422) {
                const msg = getFirstValidationError(error);
                showToast('error', msg || error.response?.data?.message || 'Lütfen zorunlu alanları kontrol edin');
                return;
            }
            if (error.response?.data?.warning) {
                const ok = await confirmDialog({
                    title: 'Uyarı',
                    text: String(error.response.data.message || 'Devam etmek istiyor musunuz?'),
                    confirmText: 'Devam Et',
                    cancelText: 'İptal',
                    icon: 'warning',
                });
                if (ok) {
                    try {
                        const submitData = { ...formData, ad_soyad_onay: '1' };
                        await axiosClient.post('/scholarships', submitData);
                        showToast('success', 'Bursluluk kaydı eklendi');
                        setShowModal(false);
                        resetForm();
                        fetchScholarships();
                        fetchStatistics();
                    } catch (e2: any) {
                        if (e2?.response?.status === 422) {
                            const msg = getFirstValidationError(e2);
                            showToast('error', msg || e2.response?.data?.message || 'Lütfen zorunlu alanları kontrol edin');
                            return;
                        }
                        showToast('error', e2?.response?.data?.message || 'İşlem başarısız');
                    }
                }
            } else {
                showToast('error', error.response?.data?.message || 'İşlem başarısız');
            }
        }
    };

    const handleDelete = async (id: number) => {
        const ok = await confirmDialog({
            text: 'Bu kaydı silmek istediğinizden emin misiniz?',
            confirmText: 'Sil',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.delete(`/scholarships/${id}`);
            showToast('success', 'Kayıt silindi');
            fetchScholarships();
            fetchStatistics();
        } catch {
            showToast('error', 'Kayıt silinemedi');
        }
    };

    const handleArchiveAll = async () => {
        const ok = await confirmDialog({
            text: 'Tüm aktif kayıtları arşivlemek istediğinizden emin misiniz?',
            confirmText: 'Arşivle',
            cancelText: 'İptal',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await axiosClient.post('/scholarships/archive-all');
            showToast('success', 'Tüm kayıtlar arşivlendi');
            fetchScholarships();
            fetchStatistics();
        } catch {
            showToast('error', 'Arşivleme başarısız');
        }
    };

    const handleRestore = async (id: number) => {
        try {
            await axiosClient.post(`/scholarships/${id}/restore`);
            showToast('success', 'Kayıt arşivden geri çağrıldı');
            fetchScholarships();
            fetchStatistics();
        } catch {
            showToast('error', 'Geri çağırma başarısız');
        }
    };

    return (
        <div className="container-fluid scholarship-page">
            <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0">Bursluluk Sınavı Yönetimi</h3>
                    <p className="text-muted mb-0">Bursluluk başvuru kayıtlarını ve süreçlerini yönetin</p>
                </div>
                <div className="text-end d-none d-md-block ms-3">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
                        <li className="breadcrumb-item active fw-medium">Bursluluk Sınavları</li>
                    </ol>
                </div>
            </div>

            {/* Tab Menü */}
            <div className="card mb-4">
                <div className="card-body p-0">
                    <ul className="nav nav-tabs nav-tabs-bottom" role="tablist">
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'all' ? 'active' : ''}`} onClick={() => setSelectedTab('all')}>
                                <i className="ti ti-list me-2"></i>Tümü
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'classes' ? 'active' : ''}`} onClick={() => setSelectedTab('classes')}>
                                <i className="ti ti-building me-2"></i>Sınıflar
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'statistics' ? 'active' : ''}`} onClick={() => setSelectedTab('statistics')}>
                                <i className="ti ti-bar-chart me-2"></i>İstatistikler
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'documents' ? 'active' : ''}`} onClick={() => setSelectedTab('documents')}>
                                <i className="ti ti-file-text me-2"></i>Belge Düzenleme
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'exam-class' ? 'active' : ''}`} onClick={() => setSelectedTab('exam-class')}>
                                <i className="ti ti-school me-2"></i>Sınav Sınıfı
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${selectedTab === 'archive' ? 'active' : ''}`} onClick={() => setSelectedTab('archive')}>
                                <i className="ti ti-archive me-2"></i>Arşiv
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Tümü Tab */}
            {selectedTab === 'all' && (
                <div className="card">
                    <div className="card-body">
                        <div className="row mb-4">
                            <div className="col-md-8">
                                <div className="app-search">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ad, soyad veya T.C. kimlik ile ara..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setCurrentPage(1);
                                            setSearchTerm(e.target.value);
                                        }}
                                    />
                                    <i className="ti ti-search app-search-icon"></i>
                                </div>
                            </div>
                            <div className="col-md-4 text-end">
                                <button className="btn btn-warning me-2" onClick={handleArchiveAll}>
                                    <i className="ti ti-archive me-2"></i>Listeyi Arşivle
                                </button>
                                <button className="btn btn-primary" onClick={openCreate}>
                                    <i className="ti ti-plus me-2"></i>Yeni Kayıt
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Yükleniyor...</span>
                                </div>
                            </div>
                        ) : scholarships.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                                <p className="text-muted mt-3 mb-0">
                                    {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı` : 'Henüz bursluluk kaydı yok'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="d-md-none mobile-card-list">
                                    <div className="d-flex flex-column gap-2">
                                        {scholarships.map((s) => {
                                            const open = mobileOpenScholarshipId === s.id;
                                            const className = s.sinif_adi || '—';
                                            const birth = formatDate(s.dogum_tarihi || '');
                                            return (
                                                <div key={s.id} className="card border">
                                                    <button
                                                        type="button"
                                                        className="card-body w-100 text-start p-3 border-0 bg-transparent"
                                                        onClick={() => setMobileOpenScholarshipId((prev) => (prev === s.id ? null : s.id))}
                                                        aria-expanded={open}
                                                    >
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div style={{ minWidth: 0 }}>
                                                                <div className="mobile-card-list__header">
                                                                    <div className="fw-semibold text-dark text-truncate">{s.ad_soyad || '—'}</div>
                                                                    <div className="mobile-card-list__role">
                                                                        <span className="badge bg-primary">{className}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="mobile-card-list__sub small text-muted mt-1">
                                                                    <span className="font-monospace">{s.tc_kimlik || '—'}</span>
                                                                    <span className="mx-1">•</span>
                                                                    <span>{s.okul_adi || '—'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-muted" style={{ flex: '0 0 auto' }}>
                                                                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}></i>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {open && (
                                                        <div className="card-body border-top p-3">
                                                            <div className="row g-2">
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli</div>
                                                                    <div className="small">{s.veli_ad_soyad || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Doğum Tarihi</div>
                                                                    <div className="small">{birth || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli İletişim</div>
                                                                    {s.veli_iletisim ? (
                                                                        <a href={`tel:${s.veli_iletisim}`} className="text-decoration-none small">
                                                                            <i className="ti ti-phone me-1"></i>
                                                                            {s.veli_iletisim}
                                                                        </a>
                                                                    ) : (
                                                                        <div className="small">—</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex gap-2 mt-3">
                                                                <button type="button" className="btn btn-outline-success" onClick={() => downloadEntryDocument(s.id)}>
                                                                    <i className="ti ti-file-text me-1"></i>
                                                                    Belge
                                                                </button>
                                                                <button type="button" className="btn btn-outline-warning" onClick={() => openEdit(s)}>
                                                                    <i className="ti ti-pencil me-1"></i>
                                                                    Düzenle
                                                                </button>
                                                            </div>
                                                            <div className="d-flex gap-2 mt-2">
                                                                <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(s.id)}>
                                                                    <i className="ti ti-trash me-1"></i>
                                                                    Sil
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="table-responsive d-none d-md-block">
                                    <table className="table table-hover align-middle">
                                        <thead>
                                            <tr>
                                                <th>T.C. Kimlik</th>
                                                <th>Ad Soyad</th>
                                                <th>Okul</th>
                                                <th>Sınıf</th>
                                                <th>Veli Ad Soyad</th>
                                                <th>Doğum Tarihi</th>
                                                <th>Veli İletişim</th>
                                                <th className="text-center">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scholarships.map((scholarship) => (
                                                <tr key={scholarship.id}>
                                                    <td className="fw-semibold">{scholarship.tc_kimlik}</td>
                                                    <td>{scholarship.ad_soyad}</td>
                                                    <td>{scholarship.okul_adi}</td>
                                                    <td>
                                                        {scholarship.sinif_adi ? (
                                                            <span className="badge bg-primary">{scholarship.sinif_adi}</span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>{scholarship.veli_ad_soyad}</td>
                                                    <td>{formatDate(scholarship.dogum_tarihi || '')}</td>
                                                    <td>
                                                        <a href={`tel:${scholarship.veli_iletisim}`} className="text-decoration-none">
                                                            <i className="ti ti-phone me-1"></i>
                                                            {scholarship.veli_iletisim}
                                                        </a>
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            className="btn btn-sm btn-outline-success me-1"
                                                            onClick={() => downloadEntryDocument(scholarship.id)}
                                                            title="Belge"
                                                        >
                                                            <i className="ti ti-file-text"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-warning me-1"
                                                            onClick={() => openEdit(scholarship)}
                                                            title="Düzenle"
                                                        >
                                                            <i className="ti ti-pencil"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(scholarship.id)}
                                                            title="Sil"
                                                        >
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {pagination && pagination.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div className="text-muted">Toplam {pagination.total} kayıt</div>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <i className="ti ti-chevron-left"></i>
                                            </button>
                                        </li>
                                        {[...Array(pagination.last_page)].map((_, index) => {
                                            const page = index + 1;
                                            return (
                                                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                                                        {page}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                        <li className={`page-item ${currentPage === pagination.last_page ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => setCurrentPage(Math.min(pagination.last_page, currentPage + 1))}
                                                disabled={currentPage === pagination.last_page}
                                            >
                                                <i className="ti ti-chevron-right"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sınıflar Tab */}
            {selectedTab === 'classes' && (
                <div className="card">
                    <div className="card-body">
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label">Kampüs Seçiniz</label>
                                <select
                                    className="form-select"
                                    value={selectedCampusIdClasses}
                                    onChange={(e) => {
                                        setSelectedCampusIdClasses(e.target.value);
                                        setSelectedClassLevel('');
                                        setSelectedClassroomId('');
                                    }}
                                >
                                    <option value="">Tüm Kampüsler</option>
                                    {campuses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Kademe Seçiniz</label>
                                <select
                                    className="form-select"
                                    value={selectedClassLevel}
                                    onChange={(e) => {
                                        setSelectedClassLevel(e.target.value);
                                        setSelectedClassroomId('');
                                    }}
                                    disabled={false}
                                >
                                    <option value="">Tümü</option>
                                    {Array.from(new Set(
                                        classrooms
                                            .filter((c) => {
                                                if (!selectedCampusIdClasses) return true;
                                                const cId = Number(selectedCampusIdClasses);
                                                return c.campus_id === cId || c.campus?.id === cId ||
                                                    c.educationLevel?.campus_id === cId || c.educationLevel?.campus?.id === cId ||
                                                    c.education_level?.campus_id === cId || c.education_level?.campus?.id === cId;
                                            })
                                            .map((c) => c.educationLevel?.name ?? c.education_level?.name)
                                            .filter(Boolean) as string[]
                                    ))
                                        .sort((a, b) => a.localeCompare(b, 'tr'))
                                        .map((levelName) => (
                                            <option key={levelName} value={levelName}>{levelName}</option>
                                        ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Sınıf Seçiniz</label>
                                <select
                                    className="form-select"
                                    value={selectedClassroomId}
                                    onChange={(e) => setSelectedClassroomId(e.target.value ? Number(e.target.value) : '')}
                                    disabled={false}
                                >
                                    <option value="">Tümü</option>
                                    {classrooms
                                        .filter((c) => {
                                            const cId = selectedCampusIdClasses ? Number(selectedCampusIdClasses) : null;
                                            const byCampus = !cId || c.campus_id === cId || c.campus?.id === cId ||
                                                c.educationLevel?.campus_id === cId || c.educationLevel?.campus?.id === cId ||
                                                c.education_level?.campus_id === cId || c.education_level?.campus?.id === cId;
                                            const levelName = c.educationLevel?.name ?? c.education_level?.name;
                                            const byLevel = selectedClassLevel ? levelName === selectedClassLevel : true;
                                            return byCampus && byLevel;
                                        })
                                        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'))
                                        .map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {classTabLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        ) : classTabScholarships.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                                <p className="text-muted mt-3 mb-0">Kayıt bulunamadı</p>
                            </div>
                        ) : (
                            <>
                                <div className="d-md-none mobile-card-list">
                                    <div className="d-flex flex-column gap-2">
                                        {classTabScholarships.map((s) => {
                                            const open = mobileOpenScholarshipId === s.id;
                                            const className = s.sinif_adi || '—';
                                            const birth = formatDate(s.dogum_tarihi || '');
                                            return (
                                                <div key={s.id} className="card border">
                                                    <button
                                                        type="button"
                                                        className="card-body w-100 text-start p-3 border-0 bg-transparent"
                                                        onClick={() => setMobileOpenScholarshipId((prev) => (prev === s.id ? null : s.id))}
                                                        aria-expanded={open}
                                                    >
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div style={{ minWidth: 0 }}>
                                                                <div className="mobile-card-list__header">
                                                                    <div className="fw-semibold text-dark text-truncate">{s.ad_soyad || '—'}</div>
                                                                    <div className="mobile-card-list__role">
                                                                        <span className="badge bg-primary">{className}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="mobile-card-list__sub small text-muted mt-1">
                                                                    <span className="font-monospace">{s.tc_kimlik || '—'}</span>
                                                                    <span className="mx-1">•</span>
                                                                    <span>{s.okul_adi || '—'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-muted" style={{ flex: '0 0 auto' }}>
                                                                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}></i>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {open && (
                                                        <div className="card-body border-top p-3">
                                                            <div className="row g-2">
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli</div>
                                                                    <div className="small">{s.veli_ad_soyad || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Doğum Tarihi</div>
                                                                    <div className="small">{birth || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli İletişim</div>
                                                                    {s.veli_iletisim ? (
                                                                        <a href={`tel:${s.veli_iletisim}`} className="text-decoration-none small">
                                                                            <i className="ti ti-phone me-1"></i>
                                                                            {s.veli_iletisim}
                                                                        </a>
                                                                    ) : (
                                                                        <div className="small">—</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex gap-2 mt-3">
                                                                <button type="button" className="btn btn-outline-success" onClick={() => downloadEntryDocument(s.id)}>
                                                                    <i className="ti ti-file-text me-1"></i>
                                                                    Belge
                                                                </button>
                                                                <button type="button" className="btn btn-outline-warning" onClick={() => openEdit(s)}>
                                                                    <i className="ti ti-pencil me-1"></i>
                                                                    Düzenle
                                                                </button>
                                                            </div>
                                                            <div className="d-flex gap-2 mt-2">
                                                                <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(s.id)}>
                                                                    <i className="ti ti-trash me-1"></i>
                                                                    Sil
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="table-responsive d-none d-md-block">
                                    <table className="table table-hover align-middle">
                                        <thead>
                                            <tr>
                                                <th>T.C. Kimlik</th>
                                                <th>Ad Soyad</th>
                                                <th>Okul</th>
                                                <th>Sınıf</th>
                                                <th>Veli Ad Soyad</th>
                                                <th>Doğum Tarihi</th>
                                                <th>Veli İletişim</th>
                                                <th className="text-center">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classTabScholarships.map((scholarship) => (
                                                <tr key={scholarship.id}>
                                                    <td className="fw-semibold">{scholarship.tc_kimlik}</td>
                                                    <td>{scholarship.ad_soyad}</td>
                                                    <td>{scholarship.okul_adi}</td>
                                                    <td>
                                                        {scholarship.sinif_adi ? (
                                                            <span className="badge bg-primary">{scholarship.sinif_adi}</span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>{scholarship.veli_ad_soyad}</td>
                                                    <td>{formatDate(scholarship.dogum_tarihi || '')}</td>
                                                    <td>
                                                        <a href={`tel:${scholarship.veli_iletisim}`} className="text-decoration-none">
                                                            <i className="ti ti-phone me-1"></i>
                                                            {scholarship.veli_iletisim}
                                                        </a>
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            className="btn btn-sm btn-outline-success me-1"
                                                            onClick={() => downloadEntryDocument(scholarship.id)}
                                                            title="Belge"
                                                        >
                                                            <i className="ti ti-file-text"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-warning me-1"
                                                            onClick={() => openEdit(scholarship)}
                                                            title="Düzenle"
                                                        >
                                                            <i className="ti ti-pencil"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDelete(scholarship.id)}
                                                            title="Sil"
                                                        >
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* İstatistikler Tab */}
            {selectedTab === 'statistics' && (
                <div className="row g-3">
                    {statsLoading ? (
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            </div>
                        </div>
                    ) : !statistics ? (
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                                    <div className="text-muted mt-2">İstatistik verisi bulunamadı.</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="card bg-soft-primary mb-0">
                                                    <div className="card-body">
                                                        <div className="d-flex align-items-center">
                                                            <div className="flex-grow-1">
                                                                <div className="text-muted">Aktif Kayıt</div>
                                                                <div className="fs-2 fw-bold">{statistics.total_active ?? 0}</div>
                                                            </div>
                                                            <div className="fs-2 text-primary">
                                                                <i className="ti ti-users"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="card bg-soft-secondary mb-0">
                                                    <div className="card-body">
                                                        <div className="d-flex align-items-center">
                                                            <div className="flex-grow-1">
                                                                <div className="text-muted">Arşiv Kayıt</div>
                                                                <div className="fs-2 fw-bold">{statistics.total_archived ?? 0}</div>
                                                            </div>
                                                            <div className="fs-2 text-secondary">
                                                                <i className="ti ti-archive"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-6">
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Sınıf Düzeyi Dağılımı</h5>
                                    </div>
                                    <div className="card-body">
                                        {statistics.class_level_stats?.length ? (
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover align-middle mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>Sınıf</th>
                                                            <th className="text-end">Kayıt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {statistics.class_level_stats.map((s) => (
                                                            <tr key={s.sinif_adi}>
                                                                <td>{s.sinif_adi}</td>
                                                                <td className="text-end fw-semibold">{s.count}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-muted">Veri yok</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-6">
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Sınıf Bazlı Dağılım</h5>
                                    </div>
                                    <div className="card-body">
                                        {statistics.classroom_stats?.length ? (
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover align-middle mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th>Sınıf</th>
                                                            <th className="text-end">Kayıt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {statistics.classroom_stats.map((s) => (
                                                            <tr key={s.classroom_id}>
                                                                <td>{s.classroom_name}</td>
                                                                <td className="text-end fw-semibold">{s.count}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-muted">Veri yok</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Belge Düzenleme Tab */}
            {selectedTab === 'documents' && (
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h5 className="mb-1">Belge Şablonları</h5>
                                <div className="text-muted">Öğrenci kayıt belgesi için şablon oluşturun ve yönetin.</div>
                            </div>
                            <button className="btn btn-primary" onClick={openCreateTemplate}>
                                <i className="ti ti-plus me-1"></i> Yeni Belge Şablonu Oluştur
                            </button>
                        </div>

                        <hr />

                        {templatesLoading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-muted">Şablon bulunamadı.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Şablon</th>
                                            <th>Sınav Giriş Tarihi</th>
                                            <th>Sınav Saati</th>
                                            <th>Sınıflar</th>
                                            <th className="text-end">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templates.map((t) => (
                                            <tr key={t.id}>
                                                <td>
                                                    <div className="fw-semibold">{t.name || `Şablon #${t.id}`}</div>
                                                    <div className="text-muted small">{t.school_name}</div>
                                                </td>
                                                <td>{t.exam_entry_date}</td>
                                                <td>{t.exam_entry_time ? String(t.exam_entry_time).slice(0, 5) : '-'}</td>
                                                <td>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {(t.classrooms || []).slice(0, 4).map((c) => (
                                                            <span key={c.id} className="badge bg-soft-primary text-primary">
                                                                {(c.education_level?.name ? `${c.education_level.name} - ` : '') + c.name}
                                                            </span>
                                                        ))}
                                                        {(t.classrooms || []).length > 4 ? (
                                                            <span className="badge bg-soft-secondary text-secondary">+{(t.classrooms || []).length - 4}</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-soft-secondary me-1" onClick={() => openEditTemplate(t)} title="Düzenle">
                                                        <i className="ti ti-edit"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-soft-danger" onClick={() => deleteTemplate(t.id)} title="Sil">
                                                        <i className="ti ti-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {selectedTab === 'exam-class' && (
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div>
                                <h5 className="mb-1">Karma Sınav Sınıfları Oluştur</h5>
                                <div className="text-muted">Bursluluk kayıtlarını seçilen sınıflara göre karma sınav sınıflarına dağıtın.</div>
                            </div>
                        </div>

                        <hr />

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Kaç Tane Sınav Sınıfı Açılacak? <span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={mixRoomCount}
                                    min={1}
                                    onChange={(e) => setMixRoomCount(Number(e.target.value) || 1)}
                                />
                                <div className="text-muted small mt-1">Oluşturulacak sınav sınıfı sayısı</div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Sınıf Kapasitesi <span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={mixRoomCapacity}
                                    min={1}
                                    onChange={(e) => setMixRoomCapacity(Number(e.target.value) || 1)}
                                />
                                <div className="text-muted small mt-1">Her sınav sınıfının maksimum öğrenci sayısı</div>
                            </div>

                            <div className="col-12">
                                <label className="form-label">Hangi Sınıflar Karılacak? <span className="text-danger">*</span></label>
                                <div className="border rounded p-3">
                                    <div className="row g-2">
                                        {classrooms
                                            .slice()
                                            .sort((a, b) => {
                                                const aL = a.education_level?.name || '';
                                                const bL = b.education_level?.name || '';
                                                const lvl = aL.localeCompare(bL, 'tr');
                                                if (lvl !== 0) return lvl;
                                                return String(a.name).localeCompare(String(b.name), 'tr');
                                            })
                                            .map((c) => {
                                                const label = `${c.education_level?.name ? c.education_level.name + ' - ' : ''}${c.name}`;
                                                const checked = mixSelectedClassroomIds.includes(c.id);
                                                return (
                                                    <div className="col-md-3" key={c.id}>
                                                        <div className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id={`mix_cls_${c.id}`}
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const isChecked = e.target.checked;
                                                                    setMixSelectedClassroomIds((prev) =>
                                                                        isChecked ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id)
                                                                    );
                                                                }}
                                                            />
                                                            <label className="form-check-label" htmlFor={`mix_cls_${c.id}`}>{label}</label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <div className="text-muted small mt-2">Karma sınav sınıflarına dahil edilecek sınıfları seçiniz</div>
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="row g-3 align-items-start">
                                    <div className="col-12 col-xl-6">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="mixSameSchoolTogether"
                                                checked={mixSameSchoolTogether}
                                                onChange={(e) => setMixSameSchoolTogether(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="mixSameSchoolTogether">Aynı Okuldaki Öğrenciler Yan Yana Gelsin</label>
                                        </div>
                                    </div>
                                    <div className="col-12 col-xl-6">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="mixSameEducationLevelOnly"
                                                checked={mixSameEducationLevelOnly}
                                                onChange={(e) => setMixSameEducationLevelOnly(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="mixSameEducationLevelOnly">Aynı Sınıfta Sadece Aynı Kademede Öğrenciler Yer Alsın</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 d-flex justify-content-end flex-wrap gap-2">
                                <button
                                    className="btn btn-light"
                                    onClick={() => {
                                        setMixRoomCount(1);
                                        setMixRoomCapacity(30);
                                        setMixSelectedClassroomIds([]);
                                        setMixSameSchoolTogether(false);
                                        setMixSameEducationLevelOnly(true);
                                        setMixRooms([]);
                                        setMixEditMode(false);
                                    }}
                                >
                                    Temizle
                                </button>
                                <button className="btn btn-warning" disabled={mixGenerating} onClick={() => generateMixedRooms()}>
                                    <i className="ti ti-arrows-shuffle me-1"></i> Sınav Sınıflarını Oluştur
                                </button>
                            </div>
                        </div>

                        <hr />

                        <div className="d-flex align-items-start justify-content-between flex-column flex-lg-row gap-4">
                            <div className="d-flex gap-2 flex-wrap">
                                <button className={`btn ${mixEditMode ? 'btn-primary' : 'btn-outline-primary'}`} disabled={!mixRooms.length} onClick={() => setMixEditMode((v) => !v)}>
                                    <i className="ti ti-edit me-1"></i> Düzenleme Modu
                                </button>
                                <button className="btn btn-outline-secondary" disabled={!mixRooms.length || mixGenerating} onClick={() => generateMixedRooms({ reshuffle: true })}>
                                    <i className="ti ti-refresh me-1"></i> Tekrar Karıştır
                                </button>
                            </div>
                            <div className="d-flex flex-column align-items-start align-items-lg-end gap-2 w-100 ms-lg-auto">
                                <div className="d-flex align-items-center justify-content-start justify-content-lg-end flex-wrap gap-2">
                                    <span className="badge bg-soft-primary text-primary px-3 py-2">Toplam Öğrenci: {mixRooms.reduce((a, r) => a + r.students.length, 0)}</span>
                                    <span className="badge bg-soft-secondary text-secondary px-3 py-2">Sınav Sınıfı: {mixRooms.length}</span>
                                    <span className="badge bg-soft-success text-success px-3 py-2">Kapasite: {mixRoomCapacity}</span>
                                </div>
                                <div className="d-flex align-items-center justify-content-start justify-content-lg-end flex-wrap gap-2 mt-2">
                                    <button className="btn btn-outline-warning" disabled={!mixRooms.length} onClick={() => openMixedRoomsPrint('print')}>
                                        <i className="ti ti-printer me-1"></i> Yazdır
                                    </button>
                                    <button className="btn btn-outline-success" disabled={!mixRooms.length} onClick={() => openMixedRoomsPrint('pdf')}>
                                        <i className="ti ti-download me-1"></i> PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3">
                            {mixRooms.length === 0 ? (
                                <div className="text-muted">Henüz sınav sınıfı oluşturulmadı.</div>
                            ) : (
                                <div className="row g-3">
                                    {mixRooms.map((room, roomIndex) => (
                                        <div className="col-12" key={room.name}>
                                            <div className="border rounded p-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <div className="fw-semibold">{room.name} ({room.students.length} Öğrenci)</div>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-hover align-middle mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: 50 }}>Sıra</th>
                                                                <th style={{ width: 140 }}>T.C. Kimlik</th>
                                                                <th>Ad Soyad</th>
                                                                <th>Okul</th>
                                                                <th style={{ width: 180 }}>Sınıf</th>
                                                                <th style={{ width: 140 }}>Veli İletişim</th>
                                                                {mixEditMode ? <th style={{ width: 220 }} className="text-end">Düzenle</th> : null}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {room.students.map((s, i) => {
                                                                const cls = classrooms.find((c) => c.id === s.classroom_id);
                                                                const clsText = s.sinif_adi || (cls ? `${cls.education_level?.name ? cls.education_level.name + ' - ' : ''}${cls.name}` : '-');
                                                                return (
                                                                    <tr key={s.id}>
                                                                        <td>{i + 1}</td>
                                                                        <td className="fw-semibold">{s.tc_kimlik}</td>
                                                                        <td>{s.ad_soyad}</td>
                                                                        <td>{s.okul_adi}</td>
                                                                        <td>{clsText}</td>
                                                                        <td>{s.veli_iletisim}</td>
                                                                        {mixEditMode ? (
                                                                            <td className="text-end">
                                                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                                                    <select
                                                                                        className="form-select form-select-sm"
                                                                                        style={{ maxWidth: 180 }}
                                                                                        value={roomIndex}
                                                                                        onChange={(e) => moveStudentToRoom(s.id, Number(e.target.value))}
                                                                                    >
                                                                                        {mixRooms.map((r2, idx) => (
                                                                                            <option key={r2.name} value={idx}>
                                                                                                {r2.name}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                            </td>
                                                                        ) : null}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'archive' && (
                <div className="card">
                    <div className="card-body">
                        <div className="row mb-4">
                            <div className="col-md-8">
                                <div className="app-search">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ad, soyad veya T.C. kimlik ile ara..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setCurrentPage(1);
                                            setSearchTerm(e.target.value);
                                        }}
                                    />
                                    <i className="ti ti-search app-search-icon"></i>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        ) : scholarships.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="ti ti-inbox" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
                                <p className="text-muted mt-3 mb-0">{searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı` : 'Arşivde kayıt yok'}</p>
                            </div>
                        ) : (
                            <>
                                <div className="d-md-none mobile-card-list">
                                    <div className="d-flex flex-column gap-2">
                                        {scholarships.map((s) => {
                                            const open = mobileOpenScholarshipId === s.id;
                                            const className = s.sinif_adi || '—';
                                            const birth = formatDate(s.dogum_tarihi || '');
                                            return (
                                                <div key={s.id} className="card border">
                                                    <button
                                                        type="button"
                                                        className="card-body w-100 text-start p-3 border-0 bg-transparent"
                                                        onClick={() => setMobileOpenScholarshipId((prev) => (prev === s.id ? null : s.id))}
                                                        aria-expanded={open}
                                                    >
                                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                                            <div style={{ minWidth: 0 }}>
                                                                <div className="mobile-card-list__header">
                                                                    <div className="fw-semibold text-dark text-truncate">{s.ad_soyad || '—'}</div>
                                                                    <div className="mobile-card-list__role">
                                                                        <span className="badge bg-secondary">{className}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="mobile-card-list__sub small text-muted mt-1">
                                                                    <span className="font-monospace">{s.tc_kimlik || '—'}</span>
                                                                    <span className="mx-1">•</span>
                                                                    <span>{s.okul_adi || '—'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-muted" style={{ flex: '0 0 auto' }}>
                                                                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}></i>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {open && (
                                                        <div className="card-body border-top p-3">
                                                            <div className="row g-2">
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli</div>
                                                                    <div className="small">{s.veli_ad_soyad || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Doğum Tarihi</div>
                                                                    <div className="small">{birth || '—'}</div>
                                                                </div>
                                                                <div className="col-12">
                                                                    <div className="small text-muted">Veli İletişim</div>
                                                                    {s.veli_iletisim ? (
                                                                        <a href={`tel:${s.veli_iletisim}`} className="text-decoration-none small">
                                                                            <i className="ti ti-phone me-1"></i>
                                                                            {s.veli_iletisim}
                                                                        </a>
                                                                    ) : (
                                                                        <div className="small">—</div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex gap-2 mt-3">
                                                                <button type="button" className="btn btn-outline-success" onClick={() => handleRestore(s.id)}>
                                                                    <i className="ti ti-arrow-back-up me-1"></i>
                                                                    Geri Çağır
                                                                </button>
                                                                <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(s.id)}>
                                                                    <i className="ti ti-trash me-1"></i>
                                                                    Sil
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="table-responsive d-none d-md-block">
                                    <table className="table table-hover align-middle">
                                        <thead>
                                            <tr>
                                                <th>T.C. Kimlik</th>
                                                <th>Ad Soyad</th>
                                                <th>Okul</th>
                                                <th>Sınıf</th>
                                                <th>Veli Ad Soyad</th>
                                                <th>Doğum Tarihi</th>
                                                <th>Veli İletişim</th>
                                                <th className="text-center">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scholarships.map((scholarship) => (
                                                <tr key={scholarship.id}>
                                                    <td className="fw-semibold">{scholarship.tc_kimlik}</td>
                                                    <td>{scholarship.ad_soyad}</td>
                                                    <td>{scholarship.okul_adi}</td>
                                                    <td>
                                                        {scholarship.sinif_adi ? (
                                                            <span className="badge bg-secondary">{scholarship.sinif_adi}</span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>{scholarship.veli_ad_soyad}</td>
                                                    <td>{formatDate(scholarship.dogum_tarihi || '')}</td>
                                                    <td>
                                                        <a href={`tel:${scholarship.veli_iletisim}`} className="text-decoration-none">
                                                            <i className="ti ti-phone me-1"></i>
                                                            {scholarship.veli_iletisim}
                                                        </a>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleRestore(scholarship.id)} title="Geri Çağır">
                                                            <i className="ti ti-arrow-back-up"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(scholarship.id)} title="Sil">
                                                            <i className="ti ti-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Kayıt Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <h5 className="modal-title mb-0">{editingScholarship ? 'Kayıt Düzenle' : 'Yeni Kayıt Ekle'}</h5>
                                    {!editingScholarship ? (
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={openPickFromList}>
                                            Listeden
                                        </button>
                                    ) : null}
                                </div>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">T.C. Kimlik No <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.tc_kimlik}
                                                onChange={(e) => setFormData({ ...formData, tc_kimlik: e.target.value })}
                                                maxLength={11}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Ad Soyad <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.ad_soyad}
                                                onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Okul Adı <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.okul_adi}
                                                onChange={(e) => setFormData({ ...formData, okul_adi: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Doğum Tarihi</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.dogum_tarihi}
                                                onChange={(e) => setFormData({ ...formData, dogum_tarihi: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Veli Ad Soyad <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.veli_ad_soyad}
                                                onChange={(e) => setFormData({ ...formData, veli_ad_soyad: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Veli İletişim <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.veli_iletisim}
                                                onChange={(e) => setFormData({ ...formData, veli_iletisim: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-12 mb-3">
                                            <label className="form-label">Sınıf</label>
                                            <select
                                                className="form-select"
                                                value={formData.classroom_id || ''}
                                                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value ? Number(e.target.value) : null })}
                                            >
                                                <option value="">Sınıf seçiniz</option>
                                                {classrooms.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.education_level?.name} - {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingScholarship ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showPickModal && (
                <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Öğrencilerden Bursluluk Kaydı (Listeden)</h5>
                                <button type="button" className="btn-close" onClick={closePickFromList}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-12 col-md-4">
                                        <label className="form-label">Kademe</label>
                                        <select
                                            className="form-select"
                                            value={pickEducationLevelId === '' ? '' : String(pickEducationLevelId)}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setPickEducationLevelId(v ? Number(v) : '');
                                                setPickClassroomId('');
                                                setPickStudents([]);
                                                setPickSelectedStudentIds([]);
                                            }}
                                            disabled={pickLoading}
                                        >
                                            <option value="">{pickLoading ? 'Yükleniyor...' : 'Kademe seçiniz'}</option>
                                            {(Array.isArray(educationLevels) ? educationLevels : [])
                                                .slice()
                                                .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                                                .map((level) => (
                                                    <option key={level.id} value={level.id}>
                                                        {level.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <label className="form-label">Sınıf</label>
                                        <select
                                            className="form-select"
                                            value={pickClassroomId === '' ? '' : pickClassroomId}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setPickClassroomId(v ? Number(v) : '');
                                            }}
                                            disabled={pickEducationLevelId === ''}
                                        >
                                            <option value="">Sınıf seçiniz</option>
                                            {classrooms
                                                .filter((c) => {
                                                    if (pickEducationLevelId === '') return false;
                                                    const targetId = Number(pickEducationLevelId);
                                                    const id1 = c.education_level_id != null ? Number(c.education_level_id) : null;
                                                    const id2 = c.education_level?.id != null ? Number(c.education_level.id) : null;
                                                    const id3 = c.educationLevel?.id != null ? Number(c.educationLevel.id) : null;
                                                    const gradeLevelNum = c.grade_level != null && String(c.grade_level).trim() !== '' ? Number(c.grade_level) : null;
                                                    return [id1, id2, id3, gradeLevelNum].some((x) => Number.isFinite(x as any) && Number(x) === targetId);
                                                })
                                                .slice()
                                                .sort((a, b) => {
                                                    const aN = String(a.name || '');
                                                    const bN = String(b.name || '');
                                                    return aN.localeCompare(bN, 'tr');
                                                })
                                                .map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {`${c.education_level?.name || c.educationLevel?.name ? (c.education_level?.name || c.educationLevel?.name) + ' - ' : ''}${c.name}`}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="col-12 col-md-4 d-flex align-items-end justify-content-md-end gap-2 flex-wrap">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => {
                                            setPickEducationLevelId('');
                                            setPickClassroomId('');
                                            setPickStudents([]);
                                            setPickSelectedStudentIds([]);
                                        }}>
                                            Temizle
                                        </button>
                                        <button type="button" className="btn btn-warning" disabled={!pickClassroomId || pickSaving} onClick={saveEntireClassFromPick}>
                                            Tüm Sınıfı Kaydet
                                        </button>
                                    </div>
                                </div>

                                <hr className="my-3" />

                                {!pickClassroomId ? (
                                    <div className="text-muted">Devam etmek için kademe ve sınıf seçiniz.</div>
                                ) : pickStudentsLoading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status"></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                            <div className="text-muted">
                                                Toplam: {pickStudents.length} | Seçili: {pickSelectedStudentIds.length}
                                            </div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    disabled={pickStudents.length === 0}
                                                    onClick={() => {
                                                        const ids = pickStudents.filter((s) => !s.bursluluk_kayitli).map((s) => s.id);
                                                        setPickSelectedStudentIds(ids);
                                                    }}
                                                >
                                                    Tümünü Seç
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    disabled={pickSelectedStudentIds.length === 0}
                                                    onClick={() => setPickSelectedStudentIds([])}
                                                >
                                                    Seçimi Temizle
                                                </button>
                                            </div>
                                        </div>

                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover align-middle">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 50 }}>
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={
                                                                    pickStudents.filter((s) => !s.bursluluk_kayitli).length > 0 &&
                                                                    pickSelectedStudentIds.length === pickStudents.filter((s) => !s.bursluluk_kayitli).length
                                                                }
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        const ids = pickStudents.filter((s) => !s.bursluluk_kayitli).map((s) => s.id);
                                                                        setPickSelectedStudentIds(ids);
                                                                    } else {
                                                                        setPickSelectedStudentIds([]);
                                                                    }
                                                                }}
                                                            />
                                                        </th>
                                                        <th>T.C. Kimlik</th>
                                                        <th>Ad Soyad</th>
                                                        <th className="text-end">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pickStudents.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="text-center text-muted py-4">
                                                                Bu sınıfta öğrenci bulunamadı.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pickStudents.map((s) => {
                                                            const disabled = Boolean(s.bursluluk_kayitli);
                                                            const checked = pickSelectedStudentIds.includes(s.id);
                                                            return (
                                                                <tr key={s.id} className={disabled ? 'text-muted' : ''}>
                                                                    <td>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            disabled={disabled}
                                                                            checked={checked}
                                                                            onChange={(e) => {
                                                                                const v = e.target.checked;
                                                                                setPickSelectedStudentIds((prev) => {
                                                                                    if (v) return prev.includes(s.id) ? prev : [...prev, s.id];
                                                                                    return prev.filter((x) => x !== s.id);
                                                                                });
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="font-monospace">{s.tc_kimlik || '-'}</td>
                                                                    <td className="fw-semibold">{s.ad_soyad || '-'}</td>
                                                                    <td className="text-end">
                                                                        {disabled ? (
                                                                            <span className="badge bg-soft-success text-success">Kayıtlı</span>
                                                                        ) : (
                                                                            <span className="badge bg-soft-secondary text-secondary">Seçilebilir</span>
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
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closePickFromList}>
                                    İptal
                                </button>
                                <button type="button" className="btn btn-primary" disabled={pickSaving || pickSelectedStudentIds.length === 0} onClick={saveSelectedStudentsFromPick}>
                                    Seçilenleri Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Şablon Modal */}
            {showTemplateModal && (
                <div className="modal fade show d-block" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editingTemplate ? 'Belge Şablonu Düzenle' : 'Yeni Belge Şablonu Oluştur'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowTemplateModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Sınav Giriş Tarihi <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={templateForm.exam_entry_date}
                                            onChange={(e) => setTemplateForm({ ...templateForm, exam_entry_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Sınav Saati</label>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={templateForm.exam_entry_time}
                                            onChange={(e) => setTemplateForm({ ...templateForm, exam_entry_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Okul Adı <span className="text-danger">*</span></label>
                                        <input
                                            className="form-control"
                                            value={templateForm.school_name}
                                            onChange={(e) => setTemplateForm({ ...templateForm, school_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Şablon Adı</label>
                                        <input
                                            className="form-control"
                                            value={templateForm.name}
                                            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                            placeholder="Örn: 2026 Belge Şablonu"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Sınav Adresi <span className="text-danger">*</span></label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            value={templateForm.exam_address}
                                            onChange={(e) => setTemplateForm({ ...templateForm, exam_address: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Notlar</label>
                                        <textarea
                                            className="form-control"
                                            rows={4}
                                            placeholder="Her satır ayrı bir not olarak belgeye eklenecektir."
                                            value={templateForm.notes}
                                            onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                                        ></textarea>
                                        <div className="text-muted small mt-1">Her alt satır yeni bir not gibi yazdırılır.</div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Bu Belge Hangi Sınıflar İçin Düzenlenecek? <span className="text-danger">*</span></label>
                                        <div className="border rounded p-3">
                                            <div className="row g-2">
                                                {classrooms
                                                    .slice()
                                                    .sort((a, b) => {
                                                        const aL = a.education_level?.name || '';
                                                        const bL = b.education_level?.name || '';
                                                        const lvl = aL.localeCompare(bL, 'tr');
                                                        if (lvl !== 0) return lvl;
                                                        return String(a.name).localeCompare(String(b.name), 'tr');
                                                    })
                                                    .map((c) => {
                                                        const label = `${c.education_level?.name ? c.education_level.name + ' - ' : ''}${c.name}`;
                                                        const checked = templateForm.classroom_ids.includes(c.id);
                                                        return (
                                                            <div className="col-md-4" key={c.id}>
                                                                <div className="form-check">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        id={`tpl_cls_${c.id}`}
                                                                        checked={checked}
                                                                        onChange={(e) => {
                                                                            const isChecked = e.target.checked;
                                                                            setTemplateForm((prev) => ({
                                                                                ...prev,
                                                                                classroom_ids: isChecked
                                                                                    ? Array.from(new Set([...prev.classroom_ids, c.id]))
                                                                                    : prev.classroom_ids.filter((x) => x !== c.id),
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label" htmlFor={`tpl_cls_${c.id}`}>{label}</label>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                            <div className="text-muted small mt-2">Çoklu seçim yapabilirsiniz</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>
                                    İptal
                                </button>
                                <button className="btn btn-primary" onClick={saveTemplate}>
                                    Belge Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ScholarshipExamList;
