import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface GuardianItem {
    id: number;
    name: string;
    phone?: string;
    relation_type?: string;
    is_legal_guardian?: boolean;
}

interface StudentItem {
    id: number;
    name: string;
    student_name?: string;
    school_no?: string | number;
    phone?: string;
    classroom_id?: number;
    classroom?: {
        id: number;
        name: string;
        grade_level?: number | string;
        branch?: { id: number; name: string };
    };
    guardians?: GuardianItem[];
}

interface ClassroomItem {
    id: number;
    name: string;
    grade_level?: number | string;
    branch?: { id: number; name: string };
    students_count?: number;
}

interface UserItem {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    roles?: Array<{ id: number; name: string; title?: string }>;
}

export const normalizePhone = (phone?: string | null): string | null => {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) return null;

    if (cleaned.length === 10 && cleaned.startsWith('5')) {
        return '90' + cleaned;
    }
    if (cleaned.length === 11 && cleaned.startsWith('05')) {
        return '9' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('905')) {
        return cleaned;
    }
    if (cleaned.length >= 11 && cleaned.length <= 15 && !cleaned.startsWith('90') && !cleaned.startsWith('0') && !cleaned.startsWith('5')) {
        return cleaned;
    }
    return null;
};

const isMother = (rel?: string) => {
    const r = (rel || '').trim().toLowerCase();
    return r === 'mother' || r === 'anne';
};

const isFather = (rel?: string) => {
    const r = (rel || '').trim().toLowerCase();
    return r === 'father' || r === 'baba';
};

type TargetType = 'classroom' | 'students' | 'users' | 'all' | 'phones';
type TargetAudience = 'mother' | 'father' | 'guardians' | 'student' | 'all';

const SmsBulkSend = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [targetType, setTargetType] = useState<TargetType>('classroom');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>('guardians');

    // Data lists
    const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);

    // Selections
    const [selectedClassrooms, setSelectedClassrooms] = useState<number[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [manualPhones, setManualPhones] = useState<string>('');

    // Filters & UI States
    const [classroomSearch, setClassroomSearch] = useState<string>('');
    const [studentSearch, setStudentSearch] = useState<string>('');
    const [userSearch, setUserSearch] = useState<string>('');
    const [previewSearch, setPreviewSearch] = useState<string>('');
    const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
    const [showMissingModal, setShowMissingModal] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [sending, setSending] = useState<boolean>(false);

    // Form
    const [formData, setFormData] = useState({
        title: '',
        template_id: '',
        message: '',
        scheduled_at: ''
    });

    const [charCount, setCharCount] = useState(0);
    const [smsCount, setSmsCount] = useState(1);

    // Initial data loading
    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const msg = formData.message || '';
        const count = msg.length;
        setCharCount(count);
        setSmsCount(count <= 160 ? 1 : Math.ceil(count / 153));
    }, [formData.message]);

    const fetchInitialData = async () => {
        setLoadingData(true);
        try {
            const [templatesRes, classroomsRes, studentsRes, usersRes] = await Promise.allSettled([
                axiosClient.get('/sms/templates?is_active=1'),
                axiosClient.get('/classrooms?per_page=500'),
                axiosClient.get('/students?per_page=5000&is_active=1'),
                axiosClient.get('/users?per_page=500'),
            ]);

            if (templatesRes.status === 'fulfilled') {
                const raw = templatesRes.value.data?.data?.templates ?? templatesRes.value.data?.data ?? templatesRes.value.data ?? [];
                setTemplates(Array.isArray(raw) ? raw : []);
            }

            if (classroomsRes.status === 'fulfilled') {
                const raw = classroomsRes.value.data?.data?.classrooms ?? classroomsRes.value.data?.data ?? [];
                setClassrooms(Array.isArray(raw) ? raw : []);
            }

            if (studentsRes.status === 'fulfilled') {
                const raw = studentsRes.value.data?.data?.students ?? studentsRes.value.data?.data ?? [];
                setStudents(Array.isArray(raw) ? raw : []);
            }

            if (usersRes.status === 'fulfilled') {
                const raw = usersRes.value.data?.data?.users?.data ?? usersRes.value.data?.data?.users ?? usersRes.value.data?.data ?? [];
                setUsers(Array.isArray(raw) ? raw : []);
            }
        } catch {
            showToast('error', 'Veriler yüklenirken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    };

    // Filtered Classrooms
    const filteredClassrooms = useMemo(() => {
        if (!classroomSearch.trim()) return classrooms;
        const q = classroomSearch.toLowerCase();
        return classrooms.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.branch?.name || '').toLowerCase().includes(q)
        );
    }, [classrooms, classroomSearch]);

    // Available students when targetType is classroom (students belonging to selected classrooms)
    const classroomStudents = useMemo(() => {
        if (selectedClassrooms.length === 0) return [];
        return students.filter(s => s.classroom_id && selectedClassrooms.includes(s.classroom_id));
    }, [students, selectedClassrooms]);

    // Filtered students for display inside the selected classes
    const displayClassroomStudents = useMemo(() => {
        if (!studentSearch.trim()) return classroomStudents;
        const q = studentSearch.toLowerCase();
        return classroomStudents.filter(s => {
            const name = (s.student_name || s.name || '').toLowerCase();
            const no = String(s.school_no || '').toLowerCase();
            return name.includes(q) || no.includes(q);
        });
    }, [classroomStudents, studentSearch]);

    // Filtered students when targetType is 'students' (all school students)
    const filteredAllStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(s => {
            const name = (s.student_name || s.name || '').toLowerCase();
            const no = String(s.school_no || '').toLowerCase();
            const cName = (s.classroom?.name || '').toLowerCase();
            return name.includes(q) || no.includes(q) || cName.includes(q);
        });
    }, [students, studentSearch]);

    // Handle Classroom Selection Toggle
    const handleToggleClassroom = (classroomId: number) => {
        const isSelected = selectedClassrooms.includes(classroomId);
        let nextSelectedClassrooms: number[];

        if (isSelected) {
            nextSelectedClassrooms = selectedClassrooms.filter(id => id !== classroomId);
            // Remove students belonging to this class
            const studentsInClass = students.filter(s => s.classroom_id === classroomId).map(s => s.id);
            setSelectedStudentIds(prev => prev.filter(id => !studentsInClass.includes(id)));
        } else {
            nextSelectedClassrooms = [...selectedClassrooms, classroomId];
            // Automatically add all students of this class
            const studentsInClass = students.filter(s => s.classroom_id === classroomId).map(s => s.id);
            setSelectedStudentIds(prev => Array.from(new Set([...prev, ...studentsInClass])));
        }

        setSelectedClassrooms(nextSelectedClassrooms);
    };

    const handleSelectAllClassrooms = () => {
        if (selectedClassrooms.length === classrooms.length) {
            setSelectedClassrooms([]);
            setSelectedStudentIds([]);
        } else {
            const allClassIds = classrooms.map(c => c.id);
            setSelectedClassrooms(allClassIds);
            const allStudentIds = students.filter(s => s.classroom_id && allClassIds.includes(s.classroom_id)).map(s => s.id);
            setSelectedStudentIds(allStudentIds);
        }
    };

    // Toggle individual student
    const handleToggleStudent = (studentId: number) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    // Toggle all visible students in classroom list
    const handleToggleAllClassroomStudents = () => {
        const visibleIds = displayClassroomStudents.map(s => s.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));

        if (allVisibleSelected) {
            setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    // Manual phone parser
    const parsedManualPhones = useMemo(() => {
        if (!manualPhones.trim()) return { all: [], valid: [], invalid: [] };
        const raw = manualPhones
            .split(/[\n,;]+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        const valid: string[] = [];
        const invalid: string[] = [];

        raw.forEach(p => {
            const norm = normalizePhone(p);
            if (norm) {
                valid.push(norm);
            } else {
                invalid.push(p);
            }
        });

        return { all: raw, valid, invalid };
    }, [manualPhones]);

    // Active targeted students based on targetType
    const activeTargetStudents = useMemo(() => {
        if (targetType === 'all') {
            return students;
        }
        if (targetType === 'classroom' || targetType === 'students') {
            return students.filter(s => selectedStudentIds.includes(s.id));
        }
        return [];
    }, [targetType, students, selectedStudentIds]);

    // Calculate resolved recipient phones and identify missing numbers based on targetAudience
    const recipientResolution = useMemo(() => {
        if (targetType === 'phones' || targetType === 'users') {
            return {
                uniquePhonesMap: new Map<string, any>(),
                resolvedList: [],
                missingList: [],
            };
        }

        const uniquePhonesMap = new Map<string, {
            phone: string;
            contactName: string;
            relationLabel: string;
            studentNames: string[];
            studentNos: string[];
        }>();

        const missingList: Array<{
            studentId: number;
            studentName: string;
            schoolNo?: string | number;
            classroomName?: string;
            reason: string;
        }> = [];

        activeTargetStudents.forEach(st => {
            const stName = st.student_name || st.name || `Öğrenci #${st.id}`;
            const cName = st.classroom?.name || '';
            const stPhone = normalizePhone(st.phone);

            const allGuardians = st.guardians || [];
            const mothers = allGuardians.filter(g => isMother(g.relation_type) && !!normalizePhone(g.phone));
            const fathers = allGuardians.filter(g => isFather(g.relation_type) && !!normalizePhone(g.phone));
            const otherGuardians = allGuardians.filter(g => !isMother(g.relation_type) && !isFather(g.relation_type) && !!normalizePhone(g.phone));

            let matchedCount = 0;

            const addPhone = (phone: string, contactName: string, relLabel: string) => {
                const norm = normalizePhone(phone);
                if (!norm) return;
                matchedCount++;

                if (uniquePhonesMap.has(norm)) {
                    const existing = uniquePhonesMap.get(norm)!;
                    if (!existing.studentNames.includes(stName)) {
                        existing.studentNames.push(stName);
                        if (st.school_no) existing.studentNos.push(String(st.school_no));
                    }
                } else {
                    uniquePhonesMap.set(norm, {
                        phone: norm,
                        contactName,
                        relationLabel: relLabel,
                        studentNames: [stName],
                        studentNos: st.school_no ? [String(st.school_no)] : [],
                    });
                }
            };

            if (targetAudience === 'mother') {
                if (mothers.length > 0) {
                    mothers.forEach(m => addPhone(m.phone!, m.name, 'Anne'));
                } else {
                    missingList.push({
                        studentId: st.id,
                        studentName: stName,
                        schoolNo: st.school_no,
                        classroomName: cName,
                        reason: 'Anne telefonu kayıtlı değil',
                    });
                }
            } else if (targetAudience === 'father') {
                if (fathers.length > 0) {
                    fathers.forEach(f => addPhone(f.phone!, f.name, 'Baba'));
                } else {
                    missingList.push({
                        studentId: st.id,
                        studentName: stName,
                        schoolNo: st.school_no,
                        classroomName: cName,
                        reason: 'Baba telefonu kayıtlı değil',
                    });
                }
            } else if (targetAudience === 'guardians') {
                const list = [...mothers, ...fathers, ...otherGuardians];
                if (list.length > 0) {
                    list.forEach(g => {
                        const rel = isMother(g.relation_type) ? 'Anne' : isFather(g.relation_type) ? 'Baba' : 'Veli';
                        addPhone(g.phone!, g.name, rel);
                    });
                } else {
                    missingList.push({
                        studentId: st.id,
                        studentName: stName,
                        schoolNo: st.school_no,
                        classroomName: cName,
                        reason: 'Hiçbir veli telefonu kayıtlı değil',
                    });
                }
            } else if (targetAudience === 'student') {
                if (stPhone) {
                    addPhone(stPhone, stName, 'Öğrenci');
                } else {
                    missingList.push({
                        studentId: st.id,
                        studentName: stName,
                        schoolNo: st.school_no,
                        classroomName: cName,
                        reason: 'Öğrencinin kendi cep telefonu kayıtlı değil',
                    });
                }
            } else if (targetAudience === 'all') {
                let found = false;
                if (stPhone) {
                    addPhone(stPhone, stName, 'Öğrenci');
                    found = true;
                }
                const guardiansList = [...mothers, ...fathers, ...otherGuardians];
                guardiansList.forEach(g => {
                    const rel = isMother(g.relation_type) ? 'Anne' : isFather(g.relation_type) ? 'Baba' : 'Veli';
                    addPhone(g.phone!, g.name, rel);
                    found = true;
                });
                if (!found) {
                    missingList.push({
                        studentId: st.id,
                        studentName: stName,
                        schoolNo: st.school_no,
                        classroomName: cName,
                        reason: 'Öğrenci veya veli numarası bulunamadı',
                    });
                }
            }
        });

        return {
            uniquePhonesMap,
            resolvedList: Array.from(uniquePhonesMap.values()),
            missingList,
        };
    }, [activeTargetStudents, targetAudience, targetType]);

    // Filtered Preview items in modal
    const filteredPreviewItems = useMemo(() => {
        if (!previewSearch.trim()) return recipientResolution.resolvedList;
        const q = previewSearch.toLowerCase();
        return recipientResolution.resolvedList.filter(item =>
            item.phone.includes(q) ||
            item.contactName.toLowerCase().includes(q) ||
            item.relationLabel.toLowerCase().includes(q) ||
            item.studentNames.some(sn => sn.toLowerCase().includes(q))
        );
    }, [recipientResolution.resolvedList, previewSearch]);

    // Template change
    const handleTemplateChange = (id: string) => {
        const template = templates.find(t => String(t.id) === id);
        if (template) {
            setFormData(prev => ({
                ...prev,
                template_id: id,
                title: prev.title || template.name || template.title || '',
                message: template.content || template.message || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, template_id: '', message: '' }));
        }
    };

    // Calculate total recipients to send
    const totalRecipientsCount = useMemo(() => {
        if (targetType === 'phones') return parsedManualPhones.valid.length;
        if (targetType === 'users') return selectedUserIds.length;
        return recipientResolution.resolvedList.length;
    }, [targetType, parsedManualPhones.valid.length, selectedUserIds.length, recipientResolution.resolvedList.length]);

    // Send Form
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.message.trim()) {
            showToast('error', 'Lütfen mesaj metnini girin.');
            return;
        }

        let payloadRecipientIds: number[] = [];
        let payloadPhones: string[] = [];

        if (targetType === 'phones') {
            const { all, valid, invalid } = parsedManualPhones;
            if (all.length === 0) {
                showToast('error', 'Lütfen en az bir telefon numarası girin.');
                return;
            }
            if (valid.length === 0) {
                showToast('error', `Girilen numara(lar) geçersiz: ${invalid.slice(0, 2).join(', ')}`);
                return;
            }
            payloadPhones = valid;
        } else if (targetType === 'users') {
            if (selectedUserIds.length === 0) {
                showToast('error', 'Lütfen en az bir personel seçin.');
                return;
            }
            payloadRecipientIds = selectedUserIds;
            const staffPhones = users
                .filter(u => selectedUserIds.includes(u.id) && !!u.phone)
                .map(u => normalizePhone(u.phone))
                .filter((p): p is string => !!p);
            payloadPhones = Array.from(new Set(staffPhones));
        } else if (targetType === 'all') {
            payloadRecipientIds = [];
            payloadPhones = Array.from(recipientResolution.uniquePhonesMap.keys());
            if (payloadPhones.length === 0) {
                showToast('error', 'Okulda bu hedef kitleye uygun geçerli telefon numarası bulunamadı.');
                return;
            }
        } else {
            // classroom or students
            if (activeTargetStudents.length === 0) {
                showToast('error', targetType === 'classroom' ? 'Lütfen en az bir sınıf ve öğrenci seçin.' : 'Lütfen en az bir öğrenci seçin.');
                return;
            }

            payloadPhones = Array.from(recipientResolution.uniquePhonesMap.keys());
            if (payloadPhones.length === 0) {
                showToast('error', 'Seçilen öğrencilerde belirtilen hedef kitleye (' + targetAudienceLabel(targetAudience) + ') ait telefon numarası bulunamadı.');
                return;
            }

            if (targetType === 'classroom') {
                payloadRecipientIds = selectedClassrooms;
            } else {
                payloadRecipientIds = selectedStudentIds;
            }
        }

        setSending(true);
        try {
            let scheduledAtFormatted: string | null = null;
            if (formData.scheduled_at && formData.scheduled_at.trim()) {
                scheduledAtFormatted = formData.scheduled_at.trim().replace('T', ' ');
                if (scheduledAtFormatted.length === 16) {
                    scheduledAtFormatted += ':00';
                }
            }

            const payload: any = {
                title: formData.title.trim() || formData.message.slice(0, 30) + '...',
                message: formData.message.trim(),
                recipient_type: targetType,
                recipient_ids: payloadRecipientIds,
                recipient_phones: payloadPhones,
                target_audience: targetAudience,
                scheduled_at: scheduledAtFormatted,
            };

            const res = await axiosClient.post('/sms/scheduled', payload);
            showToast('success', res.data?.message || (scheduledAtFormatted ? 'SMS başarıyla planlandı.' : 'Toplu SMS gönderim işlemi başarıyla başlatıldı.'));

            // Reset form
            setFormData({ title: '', template_id: '', message: '', scheduled_at: '' });
            setSelectedClassrooms([]);
            setSelectedStudentIds([]);
            setSelectedUserIds([]);
            setManualPhones('');
        } catch (error: any) {
            showToast('error', error.response?.data?.message || 'SMS gönderimi başlatılırken hata oluştu.');
        } finally {
            setSending(false);
        }
    };

    function targetAudienceLabel(audience: TargetAudience) {
        switch (audience) {
            case 'mother': return 'Sadece Anne';
            case 'father': return 'Sadece Baba';
            case 'guardians': return 'Anne ve Baba (Veliler)';
            case 'student': return 'Sadece Öğrenci';
            case 'all': return 'Hepsi (Öğrenci + Veliler)';
        }
    }

    return (
        <div className="container-fluid py-2">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold m-0 text-dark">
                        <i className="ti ti-mail-fast me-2 text-primary"></i>Toplu SMS Gönderimi
                    </h3>
                    <p className="text-muted mb-0 small">Hedef kitlenizi (Anne, Baba veya Öğrenci) belirleyin ve güvenle iletin.</p>
                </div>
                <div className="text-end d-none d-md-block ms-3">
                    <ol className="breadcrumb m-0 py-0 small">
                        <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Anasayfa</Link></li>
                        <li className="breadcrumb-item"><Link to="/sms/history" className="text-decoration-none text-muted">SMS Geçmişi</Link></li>
                        <li className="breadcrumb-item active fw-medium text-primary">Toplu Gönderim</li>
                    </ol>
                </div>
            </div>

            <div className="row g-4">
                {/* 1. Alıcı Grubu & Filtreler */}
                <div className="col-xl-6 col-lg-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                                    <span className="badge bg-primary-subtle text-primary p-2 rounded">
                                        <i className="ti ti-users fs-5"></i>
                                    </span>
                                    1. Alıcı ve Hedef Kitle Seçimi
                                </h5>
                                {loadingData && (
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                )}
                            </div>
                        </div>

                        <div className="card-body p-4">
                            {/* Gönderim Türü Seçimi */}
                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark mb-2">Gönderim Türü</label>
                                <select
                                    className="form-select form-select-lg fs-6"
                                    value={targetType}
                                    onChange={e => {
                                        setTargetType(e.target.value as any);
                                        setSelectedStudentIds([]);
                                        setSelectedClassrooms([]);
                                    }}
                                >
                                    <option value="classroom">🏫 Sınıf Bazlı (Sınıf seçip öğrencileri ve velileri belirle)</option>
                                    <option value="students">🎓 Öğrenci Bazlı (Tüm okuldan tekil öğrenci seçimi)</option>
                                    <option value="users">💼 Öğretmen & Personel Bazlı</option>
                                    <option value="all">🌐 Tüm Okul (Tüm veli ve öğrencilere toplu iletim)</option>
                                    <option value="phones">📱 Manuel Telefon Numaraları</option>
                                </select>
                            </div>

                            {/* HEDEF KİTLE SEÇİCİ (Anne / Baba / Veliler / Öğrenci / Hepsi) */}
                            {(targetType === 'classroom' || targetType === 'students' || targetType === 'all') && (
                                <div className="mb-4 p-3 rounded border bg-light-subtle">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                                            <i className="ti ti-user-check text-primary fs-5"></i>
                                            SMS Kime Gönderilsin? (Hedef Kitle)
                                        </label>
                                        <span className="badge bg-primary text-white px-2 py-1 small">
                                            {targetAudienceLabel(targetAudience)}
                                        </span>
                                    </div>
                                    <p className="text-muted small mb-2">
                                        Okul veli yönetiminde anne ve babaya giden mesajları buradan tam olarak ayırabilirsiniz.
                                    </p>

                                    <div className="row g-2">
                                        <div className="col-sm-6 col-md-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 py-2 text-start d-flex align-items-center gap-2 border ${
                                                    targetAudience === 'mother' ? 'btn-primary shadow-sm' : 'btn-white bg-white'
                                                }`}
                                                onClick={() => setTargetAudience('mother')}
                                            >
                                                <span className="fs-5">👩</span>
                                                <div>
                                                    <div className="fw-bold small">Sadece Anne</div>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Yalnızca anne numaraları</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="col-sm-6 col-md-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 py-2 text-start d-flex align-items-center gap-2 border ${
                                                    targetAudience === 'father' ? 'btn-primary shadow-sm' : 'btn-white bg-white'
                                                }`}
                                                onClick={() => setTargetAudience('father')}
                                            >
                                                <span className="fs-5">👨</span>
                                                <div>
                                                    <div className="fw-bold small">Sadece Baba</div>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Yalnızca baba numaraları</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="col-sm-6 col-md-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 py-2 text-start d-flex align-items-center gap-2 border ${
                                                    targetAudience === 'guardians' ? 'btn-primary shadow-sm' : 'btn-white bg-white'
                                                }`}
                                                onClick={() => setTargetAudience('guardians')}
                                            >
                                                <span className="fs-5">🧑‍🤝‍🧑</span>
                                                <div>
                                                    <div className="fw-bold small">Anne ve Baba</div>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Tüm kayıtlı veliler</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="col-sm-6 col-md-6">
                                            <button
                                                type="button"
                                                className={`btn w-100 py-2 text-start d-flex align-items-center gap-2 border ${
                                                    targetAudience === 'student' ? 'btn-primary shadow-sm' : 'btn-white bg-white'
                                                }`}
                                                onClick={() => setTargetAudience('student')}
                                            >
                                                <span className="fs-5">📱</span>
                                                <div>
                                                    <div className="fw-bold small">Sadece Öğrenci</div>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Öğrencinin kendi cep telefonu</div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="col-sm-6 col-md-6">
                                            <button
                                                type="button"
                                                className={`btn w-100 py-2 text-start d-flex align-items-center gap-2 border ${
                                                    targetAudience === 'all' ? 'btn-primary shadow-sm' : 'btn-white bg-white'
                                                }`}
                                                onClick={() => setTargetAudience('all')}
                                            >
                                                <span className="fs-5">👨‍👩‍👧‍👦</span>
                                                <div>
                                                    <div className="fw-bold small">Hepsi (Öğrenci + Veliler)</div>
                                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Öğrenci ve her iki velisi</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DURUM 1: SINIF BAZLI SEÇİM */}
                            {targetType === 'classroom' && (
                                <div>
                                    {/* Sınıf Listesi Seçici */}
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="form-label fw-bold mb-0 text-dark">
                                                Sınıfları Seçin
                                            </label>
                                            <div className="d-flex align-items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                                                    onClick={handleSelectAllClassrooms}
                                                >
                                                    {selectedClassrooms.length === classrooms.length ? 'Seçimi Kaldır' : 'Tüm Sınıfları Seç'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sınıf Arama */}
                                        <div className="input-group input-group-sm mb-2">
                                            <span className="input-group-text bg-white"><i className="ti ti-search text-muted"></i></span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Sınıf ara (örn: 8-A, 5. Sınıf...)"
                                                value={classroomSearch}
                                                onChange={e => setClassroomSearch(e.target.value)}
                                            />
                                            {classroomSearch && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => setClassroomSearch('')}
                                                >
                                                    <i className="ti ti-x"></i>
                                                </button>
                                            )}
                                        </div>

                                        {/* Sınıf Butonları/Kutucukları */}
                                        <div className="border rounded p-2 bg-light d-flex flex-wrap gap-2" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                                            {filteredClassrooms.length === 0 ? (
                                                <div className="text-muted small p-2 w-100 text-center">Sınıf bulunamadı.</div>
                                            ) : (
                                                filteredClassrooms.map(c => {
                                                    const isChecked = selectedClassrooms.includes(c.id);
                                                    const sCount = students.filter(s => s.classroom_id === c.id).length;
                                                    return (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            className={`btn btn-sm text-start d-flex align-items-center gap-2 px-2 py-1 rounded transition ${
                                                                isChecked
                                                                    ? 'btn-primary text-white shadow-sm'
                                                                    : 'btn-outline-secondary bg-white text-dark'
                                                            }`}
                                                            onClick={() => handleToggleClassroom(c.id)}
                                                        >
                                                            <i className={`ti ${isChecked ? 'ti-circle-check-filled' : 'ti-circle'} fs-6`}></i>
                                                            <span className="fw-semibold">{c.name}</span>
                                                            <span className={`badge ${isChecked ? 'bg-white text-primary' : 'bg-light text-muted border'} rounded-pill`} style={{ fontSize: '0.7rem' }}>
                                                                {sCount} Öğrenci
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Seçilen Sınıflardaki Öğrencilerin Listesi */}
                                    <div className="mt-4 pt-3 border-top">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-dark d-flex align-items-center gap-1">
                                                    <i className="ti ti-school text-primary"></i>
                                                    Sınıftaki Öğrenciler
                                                </span>
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                                                    {selectedStudentIds.length} / {classroomStudents.length} Seçili
                                                </span>
                                            </div>

                                            {classroomStudents.length > 0 && (
                                                <div className="d-flex align-items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                                                        onClick={handleToggleAllClassroomStudents}
                                                    >
                                                        {displayClassroomStudents.every(s => selectedStudentIds.includes(s.id))
                                                            ? 'Öğrenci Seçimini Kaldır'
                                                            : 'Tüm Öğrencileri Seç'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {selectedClassrooms.length === 0 ? (
                                            <div className="border border-dashed rounded p-4 text-center text-muted small bg-light">
                                                <i className="ti ti-chalkboard fs-2 d-block mb-2 text-primary opacity-50"></i>
                                                Lütfen yukarıdaki listeden bir veya birden fazla sınıf seçin.
                                                <br />
                                                Seçtiğiniz sınıftaki öğrenciler burada listelenecektir.
                                            </div>
                                        ) : classroomStudents.length === 0 ? (
                                            <div className="border rounded p-3 text-center text-muted small bg-light">
                                                Seçilen sınıfta aktif öğrenci kaydı bulunamadı.
                                            </div>
                                        ) : (
                                            <>
                                                {/* Öğrenci Arama Çubuğu */}
                                                <div className="input-group input-group-sm mb-2">
                                                    <span className="input-group-text bg-white"><i className="ti ti-search text-muted"></i></span>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Öğrenci ara (isim, okul no)..."
                                                        value={studentSearch}
                                                        onChange={e => setStudentSearch(e.target.value)}
                                                    />
                                                    {studentSearch && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary"
                                                            onClick={() => setStudentSearch('')}
                                                        >
                                                            <i className="ti ti-x"></i>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Öğrenci Kartları / Listesi */}
                                                <div
                                                    className="border rounded p-2 bg-light d-flex flex-column gap-1"
                                                    style={{ maxHeight: '280px', overflowY: 'auto' }}
                                                >
                                                    {displayClassroomStudents.map(st => {
                                                        const isChecked = selectedStudentIds.includes(st.id);
                                                        const stName = st.student_name || st.name || `Öğrenci #${st.id}`;
                                                        const mothers = (st.guardians || []).filter(g => isMother(g.relation_type) && !!normalizePhone(g.phone));
                                                        const fathers = (st.guardians || []).filter(g => isFather(g.relation_type) && !!normalizePhone(g.phone));
                                                        const hasOwnPhone = !!normalizePhone(st.phone);

                                                        return (
                                                            <div
                                                                key={st.id}
                                                                className={`p-2 rounded border cursor-pointer transition d-flex align-items-center justify-content-between ${
                                                                    isChecked ? 'bg-white border-primary shadow-xs' : 'bg-white-subtle border-light opacity-75'
                                                                }`}
                                                                onClick={() => handleToggleStudent(st.id)}
                                                            >
                                                                <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="form-check-input mt-0 cursor-pointer"
                                                                        checked={isChecked}
                                                                        onChange={() => {}}
                                                                        onClick={e => e.stopPropagation()}
                                                                    />
                                                                    <div className="text-truncate">
                                                                        <div className="fw-bold small text-dark text-truncate">
                                                                            {stName}
                                                                            {st.school_no && (
                                                                                <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.78rem' }}>
                                                                                    (No: {st.school_no})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-1 mt-1">
                                                                            <span className="badge bg-secondary-subtle text-secondary py-0 px-1" style={{ fontSize: '0.68rem' }}>
                                                                                {st.classroom?.name || 'Sınıf'}
                                                                            </span>
                                                                            {/* İletişim Rozetleri */}
                                                                            <span
                                                                                className={`badge ${mothers.length > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                                style={{ fontSize: '0.68rem' }}
                                                                                title={mothers.length > 0 ? `Anne: ${mothers[0].name} (${mothers[0].phone})` : 'Anne telefonu yok'}
                                                                            >
                                                                                👩 Anne {mothers.length > 0 ? '✓' : '—'}
                                                                            </span>
                                                                            <span
                                                                                className={`badge ${fathers.length > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                                style={{ fontSize: '0.68rem' }}
                                                                                title={fathers.length > 0 ? `Baba: ${fathers[0].name} (${fathers[0].phone})` : 'Baba telefonu yok'}
                                                                            >
                                                                                👨 Baba {fathers.length > 0 ? '✓' : '—'}
                                                                            </span>
                                                                            <span
                                                                                className={`badge ${hasOwnPhone ? 'bg-info-subtle text-info border border-info-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                                style={{ fontSize: '0.68rem' }}
                                                                                title={hasOwnPhone ? `Öğrenci Tel: ${st.phone}` : 'Öğrenci telefonu yok'}
                                                                            >
                                                                                📱 Kendi {hasOwnPhone ? '✓' : '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-shrink-0">
                                                                    <i className={`ti ${isChecked ? 'ti-check text-primary fw-bold' : 'ti-minus text-muted'}`}></i>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DURUM 2: TÜM OKULDAN TEKİL ÖĞRENCİ SEÇİMİ */}
                            {targetType === 'students' && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-bold mb-0 text-dark">
                                            Öğrenci Arayın ve Seçin
                                        </label>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="small text-muted">
                                                {selectedStudentIds.length} Seçili
                                            </span>
                                            {selectedStudentIds.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-link p-0 text-decoration-none text-danger fw-medium"
                                                    onClick={() => setSelectedStudentIds([])}
                                                >
                                                    Temizle
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arama Kutusu */}
                                    <div className="input-group input-group-sm mb-2">
                                        <span className="input-group-text bg-white"><i className="ti ti-search text-muted"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Öğrenci adı, no veya sınıf yazın..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                        />
                                        {studentSearch && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setStudentSearch('')}
                                            >
                                                <i className="ti ti-x"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Liste */}
                                    <div className="border rounded p-2 bg-light d-flex flex-column gap-1" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                        {filteredAllStudents.length === 0 ? (
                                            <div className="text-muted small p-4 text-center">Öğrenci bulunamadı.</div>
                                        ) : (
                                            filteredAllStudents.map(st => {
                                                const isChecked = selectedStudentIds.includes(st.id);
                                                const stName = st.student_name || st.name || `Öğrenci #${st.id}`;
                                                const mothers = (st.guardians || []).filter(g => isMother(g.relation_type) && !!normalizePhone(g.phone));
                                                const fathers = (st.guardians || []).filter(g => isFather(g.relation_type) && !!normalizePhone(g.phone));
                                                const hasOwnPhone = !!normalizePhone(st.phone);

                                                return (
                                                    <div
                                                        key={st.id}
                                                        className={`p-2 rounded border cursor-pointer transition d-flex align-items-center justify-content-between ${
                                                            isChecked ? 'bg-white border-primary shadow-xs' : 'bg-white-subtle border-light opacity-75'
                                                        }`}
                                                        onClick={() => handleToggleStudent(st.id)}
                                                    >
                                                        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input mt-0 cursor-pointer"
                                                                checked={isChecked}
                                                                onChange={() => {}}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            <div className="text-truncate">
                                                                <div className="fw-bold small text-dark text-truncate">
                                                                    {stName}
                                                                    {st.school_no && (
                                                                        <span className="text-muted fw-normal ms-1" style={{ fontSize: '0.78rem' }}>
                                                                            (No: {st.school_no})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="d-flex align-items-center gap-1 mt-1">
                                                                    <span className="badge bg-secondary-subtle text-secondary py-0 px-1" style={{ fontSize: '0.68rem' }}>
                                                                        {st.classroom?.name || 'Sınıfsız'}
                                                                    </span>
                                                                    <span
                                                                        className={`badge ${mothers.length > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                        style={{ fontSize: '0.68rem' }}
                                                                    >
                                                                        👩 Anne {mothers.length > 0 ? '✓' : '—'}
                                                                    </span>
                                                                    <span
                                                                        className={`badge ${fathers.length > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                        style={{ fontSize: '0.68rem' }}
                                                                    >
                                                                        👨 Baba {fathers.length > 0 ? '✓' : '—'}
                                                                    </span>
                                                                    <span
                                                                        className={`badge ${hasOwnPhone ? 'bg-info-subtle text-info border border-info-subtle' : 'bg-light text-muted border'} py-0 px-1`}
                                                                        style={{ fontSize: '0.68rem' }}
                                                                    >
                                                                        📱 Kendi {hasOwnPhone ? '✓' : '—'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0">
                                                            <i className={`ti ${isChecked ? 'ti-check text-primary fw-bold' : 'ti-minus text-muted'}`}></i>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DURUM 3: ÖĞRETMEN & PERSONEL */}
                            {targetType === 'users' && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label fw-bold mb-0 text-dark">Personel Listesi</label>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="small text-muted">{selectedUserIds.length} Personel Seçili</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                                                onClick={() => {
                                                    if (selectedUserIds.length === users.length) setSelectedUserIds([]);
                                                    else setSelectedUserIds(users.map(u => u.id));
                                                }}
                                            >
                                                {selectedUserIds.length === users.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="input-group input-group-sm mb-2">
                                        <span className="input-group-text bg-white"><i className="ti ti-search text-muted"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Personel ara (isim, branş)..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                        />
                                    </div>

                                    <div className="border rounded p-2 bg-light d-flex flex-column gap-1" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {users
                                            .filter(u => !userSearch.trim() || (u.name || '').toLowerCase().includes(userSearch.toLowerCase()))
                                            .map(u => {
                                                const isChecked = selectedUserIds.includes(u.id);
                                                const roleName = u.roles?.[0]?.title || u.roles?.[0]?.name || 'Personel';
                                                return (
                                                    <div
                                                        key={u.id}
                                                        className={`p-2 rounded border cursor-pointer transition d-flex align-items-center justify-content-between ${
                                                            isChecked ? 'bg-white border-primary shadow-xs' : 'bg-white-subtle border-light'
                                                        }`}
                                                        onClick={() => {
                                                            setSelectedUserIds(prev =>
                                                                prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                            );
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="fw-bold small text-dark">{u.name}</div>
                                                            <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                                                <span className="badge bg-secondary-subtle text-secondary me-1">{roleName}</span>
                                                                {u.phone ? `Tel: ${u.phone}` : <span className="text-danger">Tel yok</span>}
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isChecked}
                                                            onChange={() => {}}
                                                        />
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* DURUM 4: TÜM OKUL BİLDİRİMİ */}
                            {targetType === 'all' && (
                                <div className="alert alert-info py-3 small mb-0">
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <i className="ti ti-info-circle fs-5"></i>
                                        <strong className="fs-6">Tüm Okul Seçildi</strong>
                                    </div>
                                    Sistemdeki <strong>tüm aktif öğrencilerin</strong> yukarıda seçtiğiniz hedef kitlesine (
                                    <strong>{targetAudienceLabel(targetAudience)}</strong>) toplu SMS iletilecektir.
                                </div>
                            )}

                            {/* DURUM 5: MANUEL NUMARALAR */}
                            {targetType === 'phones' && (
                                <div>
                                    <label className="form-label fw-bold text-dark mb-1">Telefon Numaraları</label>
                                    <textarea
                                        className="form-control"
                                        rows={7}
                                        placeholder="Her satıra bir numara veya virgülle ayırarak yazın:&#10;05XXXXXXXXX&#10;905YYYYYYYYY"
                                        value={manualPhones}
                                        onChange={e => setManualPhones(e.target.value)}
                                    ></textarea>
                                    <div className="form-text small">
                                        Format: 10 haneli (5XXXXXXXXX) veya başında 0 / 90 olabilir.
                                    </div>
                                    {parsedManualPhones.all.length > 0 && (
                                        <div className="mt-2 d-flex flex-wrap gap-2 align-items-center">
                                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                <i className="ti ti-check me-1"></i>
                                                {parsedManualPhones.valid.length} Geçerli Numara
                                            </span>
                                            {parsedManualPhones.invalid.length > 0 && (
                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                                                    <i className="ti ti-alert-triangle me-1"></i>
                                                    {parsedManualPhones.invalid.length} Hatalı Format
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CANLI ALICI ÖZETİ VE DOĞRULAMA KARTI */}
                            {(targetType === 'classroom' || targetType === 'students' || targetType === 'all') && (
                                <div className="mt-4 pt-3 border-top">
                                    <div className="p-3 rounded border bg-light">
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-1">
                                                <i className="ti ti-list-check text-primary fs-5"></i>
                                                Alıcı Gönderim Özeti
                                            </h6>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                                onClick={() => setShowPreviewModal(true)}
                                                disabled={recipientResolution.resolvedList.length === 0}
                                            >
                                                <i className="ti ti-eye"></i>
                                                Alıcı Numaralarını Önizle ({recipientResolution.resolvedList.length})
                                            </button>
                                        </div>

                                        <div className="row g-2 text-center">
                                            <div className="col-4">
                                                <div className="p-2 bg-white rounded border">
                                                    <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Seçili Öğrenci</div>
                                                    <div className="fs-5 fw-bold text-dark">{activeTargetStudents.length}</div>
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <div className="p-2 bg-white rounded border border-success-subtle">
                                                    <div className="text-success small" style={{ fontSize: '0.72rem' }}>Gidecek SMS</div>
                                                    <div className="fs-5 fw-bold text-success">{recipientResolution.resolvedList.length}</div>
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <div
                                                    className={`p-2 bg-white rounded border ${
                                                        recipientResolution.missingList.length > 0 ? 'border-warning cursor-pointer' : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (recipientResolution.missingList.length > 0) setShowMissingModal(true);
                                                    }}
                                                >
                                                    <div className="text-warning small" style={{ fontSize: '0.72rem' }}>
                                                        Eksik Numara {recipientResolution.missingList.length > 0 && '🔍'}
                                                    </div>
                                                    <div className={`fs-5 fw-bold ${recipientResolution.missingList.length > 0 ? 'text-warning' : 'text-muted'}`}>
                                                        {recipientResolution.missingList.length}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {recipientResolution.missingList.length > 0 && (
                                            <div className="mt-2 p-2 bg-warning-subtle text-dark border border-warning-subtle rounded small d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center gap-1">
                                                    <i className="ti ti-alert-triangle text-warning fs-5"></i>
                                                    <span>
                                                        <strong>{recipientResolution.missingList.length} öğrencinin</strong> hedef kitle ({targetAudienceLabel(targetAudience)}) numarası sistemde kayıtlı değil.
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-xs btn-outline-dark p-1 py-0"
                                                    onClick={() => setShowMissingModal(true)}
                                                >
                                                    Listele
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Mesaj İçeriği & Gönderim */}
                <div className="col-xl-6 col-lg-6">
                    <form onSubmit={handleSend} className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                                <span className="badge bg-primary-subtle text-primary p-2 rounded">
                                    <i className="ti ti-mail-forward fs-5"></i>
                                </span>
                                2. Mesaj İçeriği & Planlama
                            </h5>
                        </div>

                        <div className="card-body p-4">
                            {/* Görev / Paket Başlığı */}
                            <div className="mb-3">
                                <label className="form-label fw-bold text-dark">Görev Başlığı (SMS Geçmişi Takibi İçin)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Örn: 8. Sınıflar Deneme Sınavı Bilgilendirmesi"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            {/* Şablon Seçimi */}
                            <div className="mb-3">
                                <label className="form-label fw-bold text-dark">SMS Şablonu (Opsiyonel)</label>
                                <select
                                    className="form-select"
                                    value={formData.template_id}
                                    onChange={e => handleTemplateChange(e.target.value)}
                                >
                                    <option value="">Manuel Mesaj Yaz</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.title || t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mesaj Metni */}
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label fw-bold text-dark mb-0">Mesaj Metni <span className="text-danger">*</span></label>
                                    <span className={`badge ${charCount > 160 ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                                        {charCount} Karakter / {smsCount} SMS
                                    </span>
                                </div>
                                <textarea
                                    className="form-control"
                                    rows={8}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    placeholder="Göndermek istediğiniz SMS mesajını buraya yazın..."
                                ></textarea>
                                <div className="mt-2 p-2 bg-light rounded small text-muted d-flex align-items-center gap-2">
                                    <i className="ti ti-info-circle text-primary fs-5 flex-shrink-0"></i>
                                    <span>Türkçe karakterler (İ, ı, ş, ğ, ü, ö, ç) İleti Bilgi Türkçe Encoding standardında operatörlere sorunsuz iletilir.</span>
                                </div>
                            </div>

                            {/* Gönderim Zamanı */}
                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark">Gönderim Zamanı (İleri Tarihli Planlama)</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white"><i className="ti ti-calendar-time text-primary"></i></span>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        value={formData.scheduled_at}
                                        onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    />
                                    {formData.scheduled_at && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setFormData({ ...formData, scheduled_at: '' })}
                                        >
                                            Hemen Gönder Yap
                                        </button>
                                    )}
                                </div>
                                <div className="form-text small">Boş bırakılırsa SMS hemen anında gönderilir.</div>
                            </div>

                            {/* Gönderim Kartı Altı Buton */}
                            <div className="pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div>
                                    <span className="small text-muted">Toplam Hedef: </span>
                                    <span className="fw-bold text-primary fs-6">{totalRecipientsCount} Alıcı Numara</span>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 py-2 fw-semibold shadow-sm d-flex align-items-center gap-2"
                                    disabled={sending || totalRecipientsCount === 0 || !formData.message.trim()}
                                >
                                    {sending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status"></span>
                                            Gönderim Başlatılıyor...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ti ti-send fs-5"></i>
                                            {formData.scheduled_at
                                                ? `SMS Görevini Planla (${totalRecipientsCount} Numara)`
                                                : `SMS'leri Hemen Gönder (${totalRecipientsCount} Numara)`}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* MODAL 1: ALICI NUMARALARI ÖNİZLEME */}
            {showPreviewModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content shadow border-0">
                            <div className="modal-header bg-white border-bottom">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <i className="ti ti-checkup-list text-primary fs-4"></i>
                                    Alıcı Numaraları Önizleme ({recipientResolution.resolvedList.length} Numara)
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowPreviewModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <p className="text-muted small mb-0">
                                        Aşağıdaki listede seçilen hedef kitleye (<strong>{targetAudienceLabel(targetAudience)}</strong>) göre SMS'in gideceği gerçek numaralar ve ilgili kişiler listelenmektedir.
                                    </p>
                                    <div className="input-group input-group-sm" style={{ maxWidth: '260px' }}>
                                        <span className="input-group-text"><i className="ti ti-search"></i></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="İsim veya numara ara..."
                                            value={previewSearch}
                                            onChange={e => setPreviewSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="table-responsive border rounded" style={{ maxHeight: '380px' }}>
                                    <table className="table table-sm table-hover align-middle mb-0">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th className="ps-3">Telefon</th>
                                                <th>Alıcı Adı</th>
                                                <th>Rol / Yakınlık</th>
                                                <th>İlgili Öğrenci(ler)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPreviewItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-4 text-muted small">
                                                        Kayıt bulunamadı.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPreviewItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="ps-3 fw-mono text-dark fw-bold">
                                                            {item.phone}
                                                        </td>
                                                        <td className="fw-semibold text-dark">
                                                            {item.contactName}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${
                                                                item.relationLabel === 'Anne' ? 'bg-info-subtle text-info border border-info-subtle' :
                                                                item.relationLabel === 'Baba' ? 'bg-primary-subtle text-primary border border-primary-subtle' :
                                                                item.relationLabel === 'Öğrenci' ? 'bg-success-subtle text-success border border-success-subtle' :
                                                                'bg-secondary-subtle text-secondary'
                                                            }`}>
                                                                {item.relationLabel}
                                                            </span>
                                                        </td>
                                                        <td className="small text-muted">
                                                            {item.studentNames.join(', ')}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top">
                                <span className="small text-muted me-auto">
                                    Tekil Numara Sayısı: <strong>{recipientResolution.resolvedList.length}</strong>
                                </span>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPreviewModal(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: NUMARASI EKSİK ÖĞRENCİLER */}
            {showMissingModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow border-0">
                            <div className="modal-header bg-white border-bottom">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <i className="ti ti-alert-triangle text-warning fs-4"></i>
                                    Numarası Bulunmayan Öğrenciler ({recipientResolution.missingList.length})
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowMissingModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <p className="text-muted small mb-3">
                                    Aşağıdaki öğrenciler seçili olmasına rağmen sistemde seçtiğiniz hedef kitleye (<strong>{targetAudienceLabel(targetAudience)}</strong>) ait telefon kaydı bulunamadığından SMS alamayacaktır:
                                </p>

                                <div className="border rounded p-2 bg-light d-flex flex-column gap-1" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {recipientResolution.missingList.map((m, idx) => (
                                        <div key={idx} className="p-2 bg-white rounded border d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold small text-dark">{m.studentName}</div>
                                                <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                                    {m.classroomName && <span className="badge bg-secondary-subtle text-secondary me-1">{m.classroomName}</span>}
                                                    {m.schoolNo && <span>No: {m.schoolNo}</span>}
                                                </div>
                                            </div>
                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">
                                                {m.reason}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer bg-light border-top">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMissingModal(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsBulkSend;
