import { useEffect, useMemo, useRef, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';

interface Classroom {
  id: number;
  name: string;
  campus_id?: number | null;
  education_level_id?: number | null;
  grade_level?: number | null;
}

interface Student {
  id: number;
  student_name: string;
  school_no?: string | null;
  classroom_id?: number | null;
  education_level_id?: number | null;
  classroom?: {
    id: number;
    name: string;
    campus_id?: number | null;
    education_level_id?: number | null;
    grade_level?: number | null;
  } | null;
}

interface CounselingRecord {
  id: number;
  student_id: number;
  counselor_id: number;
  subject: string;
  meeting_at: string;
  content: string;
  is_private: boolean;
  student?: {
    id: number;
    name: string;
    school_name?: string;
    school_no?: string;
    classroom_id?: number | null;
    education_level_id?: number | null;
    classroom?: {
      id: number;
      name: string;
      campus_id?: number | null;
      education_level_id?: number | null;
      grade_level?: number | null;
      campus?: {
        id: number;
        name: string;
      } | null;
      branch?: {
        id: number;
        name: string;
        campus?: {
          id: number;
          name: string;
        } | null;
      } | null;
    } | null;
  };
  counselor?: {
    id: number;
    name?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface RecordMeta {
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
}

const CounselingClientsPage = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CounselingRecord | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [meta, setMeta] = useState<RecordMeta | null>(null);
  const [page, setPage] = useState(1);

  const [campuses, setCampuses] = useState<Array<{ id: number; name: string }>>([]);
  const [campusFilter, setCampusFilter] = useState('');
  const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);
  const [educationLevelFilter, setEducationLevelFilter] = useState('');
  const [filteredClassroomId, setFilteredClassroomId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('USER_DATA');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const roleStr = (localStorage.getItem('USER_ROLE') || me?.role || me?.role_name || '').toString().toLowerCase();
  const isAdmin = useMemo(() => {
    return ['owner', 'kurucu', 'admin', 'genel müdür', 'genel mudur', 'müdür', 'mudur', 'müdür yardımcısı', 'mudur yardimcisi', 'kampüs müdürü', 'kampus muduru', 'superadmin', 'yönetici'].some((x) => roleStr.includes(x));
  }, [roleStr]);

  const isGuidance = useMemo(() => {
    return (
      roleStr.includes('rehber') ||
      roleStr === 'guidance' ||
      roleStr === '6' ||
      isAdmin
    );
  }, [roleStr, isAdmin]);

  const myUserId = me?.id ? Number(me.id) : null;
  const canModify = (counselorId: unknown) => (myUserId !== null && Number(counselorId) === myUserId) || isAdmin;

  // Kullanıcının atanmış kampüslerini al
  const myCampusIds = useMemo(() => {
    const ids = me?.campus_ids || me?.assigned_campus_ids || [];
    return Array.isArray(ids) ? ids.map((id: unknown) => Number(id)).filter((id: number) => !isNaN(id) && id > 0) : [];
  }, [me]);

  // Kullanıcının atanmış kademelerini al
  const myEducationLevelIds = useMemo(() => {
    const ids = me?.education_level_ids || me?.assigned_education_level_ids || [];
    return Array.isArray(ids) ? ids.map((id: unknown) => Number(id)).filter((id: number) => !isNaN(id) && id > 0) : [];
  }, [me]);

  // Sınıfları kademelere göre filtrele (kullanıcının atandığı kademeler + seçili kademe filtresi)
  const filteredClassrooms = useMemo(() => {
    let filtered = classrooms;

    // Kampüs filtresine göre (Eğer sınıf modelinde campus_id yoksa şubeden gelebilir, ama şimdilik sadece branch yoksa front end tarafında filtrelemeyebilir)
    if (myCampusIds.length > 0) {
      // Note: Classroom model may not include campus directly; if needed, filter by branch.campus.
    }

    if (myEducationLevelIds.length > 0) {
      filtered = filtered.filter((c) => {
        const levelId = c.grade_level ?? c.education_level_id;
        return levelId && myEducationLevelIds.includes(Number(levelId));
      });
    }

    if (educationLevelFilter) {
      const selectedLevelId = Number(educationLevelFilter);
      filtered = filtered.filter((c) => {
        const levelId = c.grade_level ?? c.education_level_id;
        return levelId && Number(levelId) === selectedLevelId;
      });
    }

    return filtered;
  }, [classrooms, myCampusIds, myEducationLevelIds, educationLevelFilter]);

  const [form, setForm] = useState({
    campus_id: '',
    education_level_id: '',
    classroom_id: '',
    student_id: '',
    subject: '',
    meeting_date: new Date().toISOString().slice(0, 10),
    meeting_time: new Date().toTimeString().slice(0, 5),
    content: '',
    is_private: true,
  });

  useEffect(() => {
    fetchCampuses();
  }, []);

  useEffect(() => {
    // Sadece seçili kampüse göre kademe getir
    if (campusFilter) {
      fetchEducationLevels(campusFilter);
    } else if (form.campus_id) {
      // Form campus varsa ona göre, yoksa default
    } else {
      fetchEducationLevels();
    }
  }, [campusFilter]);

  useEffect(() => {
    // Sadece seçili kademeye göre sınıf getir
    if (educationLevelFilter || campusFilter) {
      fetchClassrooms(educationLevelFilter, campusFilter);
    } else {
      setClassrooms([]);
      setFilteredClassroomId('');
    }
  }, [educationLevelFilter, campusFilter]);

  useEffect(() => {
    // Filtreleme sınıfı değiştiğinde veya yeni arama ile öğrencileri çek
    if (filteredClassroomId) {
      fetchStudents(studentSearch, filteredClassroomId, campusFilter, educationLevelFilter);
    }
  }, [filteredClassroomId]);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchCampuses = async () => {
    try {
      const res = await axiosClient.get('/campuses');
      const data = res.data?.data?.campuses ?? res.data?.data ?? [];
      let allCampuses: { id: number; name: string }[] = Array.isArray(data) ? data : [];

      // Kullanıcının atanmış kampüsleri varsa sadece onları göster
      if (myCampusIds.length > 0) {
        allCampuses = allCampuses.filter(c => myCampusIds.includes(Number(c.id)));
      }

      setCampuses(allCampuses);

      // Tek kampüs yetkisi varsa otomatik seç
      if (allCampuses.length === 1) {
        setCampusFilter(String(allCampuses[0].id));
      }
    } catch {
      showToast('error', 'Kampüs listesi alınamadı');
    }
  };

  const fetchEducationLevels = async (campusId = '') => {
    try {
      const params = new URLSearchParams();
      if (myEducationLevelIds.length > 0) {
        params.set('ids', myEducationLevelIds.join(','));
      }
      if (campusId) params.set('campus_id', campusId);

      const res = await axiosClient.get(`/education-levels?${params.toString()}`);
      const data = res.data?.data?.education_levels ?? res.data?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a: any, b: any) => {
        const rank = (nameRaw: any) => {
          const normalized = String(nameRaw ?? '')
            .toLocaleLowerCase('tr-TR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '')
            .replace(/ı/g, 'i');

          if (normalized.includes('anaokul')) return 1;
          if (normalized.includes('ilkokul')) return 2;
          if (normalized.includes('ortaokul')) return 3;
          if (normalized.includes('lise')) return 4;
          return 99;
        };

        const ra = rank(a?.name);
        const rb = rank(b?.name);
        if (ra !== rb) return ra - rb;
        return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'tr');
      });

      setEducationLevels(sorted);
    } catch {
      showToast('error', 'Kademe listesi alınamadı');
    }
  };

  const fetchClassrooms = async (educationLevelId = '', campusId = '') => {
    try {
      const params = new URLSearchParams();
      params.set('per_page', '200');
      if (educationLevelId) params.set('education_level_id', educationLevelId);
      if (campusId) params.set('campus_id', campusId);

      const res = await axiosClient.get(`/classrooms?${params.toString()}`);
      const data = res.data?.data?.classrooms ?? [];
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a: any, b: any) => {
        const parse = (rawName: any) => {
          const name = String(rawName ?? '').trim();
          const m = name.match(/^(\d+)[\s\-\/.]*([A-Za-zÇĞİÖŞÜçğıöşü]?)\s*(.*)$/u);
          const grade = m ? Number(m[1]) : Number.NaN;
          const section = (m?.[2] ?? '').toString().toLocaleUpperCase('tr-TR');
          const rest = (m?.[3] ?? '').toString();
          return { name, grade, section, rest };
        };

        const pa = parse(a?.name);
        const pb = parse(b?.name);

        const aHasGrade = !Number.isNaN(pa.grade);
        const bHasGrade = !Number.isNaN(pb.grade);
        if (aHasGrade && bHasGrade && pa.grade !== pb.grade) return pa.grade - pb.grade;
        if (aHasGrade !== bHasGrade) return aHasGrade ? -1 : 1;

        if (pa.section !== pb.section) return pa.section.localeCompare(pb.section, 'tr');
        if (pa.rest !== pb.rest) return pa.rest.localeCompare(pb.rest, 'tr');
        return pa.name.localeCompare(pb.name, 'tr');
      });

      setClassrooms(sorted);
    } catch {
      showToast('error', 'Sınıf listesi alınamadı');
    }
  };

  const fetchStudents = async (search = '', classroomId = '', campusId = '', educationLevelId = '') => {
    try {
      if (!classroomId && !search) {
        setStudents([]); // Öğrenci getirme işlemini sınıf zorunlu kıldık
        return;
      }
      const params = new URLSearchParams();
      params.set('per_page', '200');
      if (search) params.set('search', search);
      if (classroomId) params.set('classroom_id', classroomId);
      if (campusId) params.set('campus_id', campusId);
      if (educationLevelId) params.set('education_level_id', educationLevelId);

      const res = await axiosClient.get(`/students?${params.toString()}`);
      const data = res.data?.data?.students ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      showToast('error', 'Öğrenci listesi alınamadı');
    }
  };

  const fetchRecords = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('per_page', '20');
      if (filteredClassroomId) params.set('classroom_id', filteredClassroomId);
      if (studentSearch) params.set('student_search', studentSearch);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await axiosClient.get(`/counseling/records?${params.toString()}`);
      const payload = res.data?.data ?? {};
      setRecords(Array.isArray(payload.records) ? payload.records : []);
      setMeta(payload.pagination ?? null);
    } catch {
      showToast('error', 'Görüşme tutanakları alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const getCounselorLabel = (r: CounselingRecord) => {
    const c = r.counselor;
    if (!c) return '-';
    const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
    return full || c.name || '-';
  };

  const openDetail = async (recordId: number) => {
    try {
      setDetailLoading(true);
      const res = await axiosClient.get(`/counseling/records/${recordId}`);
      const record = res.data?.data?.record ?? null;
      setSelectedRecord(record);
    } catch {
      showToast('error', 'Detay alınamadı');
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadPdf = async (recordId: number) => {
    try {
      const res = await axiosClient.get(`/counseling/records/${recordId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gorusme-tutanagi-${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'PDF indirilemedi');
    }
  };

  const startEdit = async (recordId: number) => {
    try {
      setDetailLoading(true);
      const res = await axiosClient.get(`/counseling/records/${recordId}`);
      const record: CounselingRecord | null = res.data?.data?.record ?? null;
      if (!record) {
        showToast('error', 'Detay alınamadı');
        return;
      }

      setEditingId(record.id);

      const campusId = String(
        record.student?.classroom?.campus_id ||
        record.student?.classroom?.campus?.id ||
        record.student?.classroom?.branch?.campus?.id ||
        ''
      );
      const eduLevelId = String(
        record.student?.classroom?.education_level_id ||
        record.student?.classroom?.grade_level ||
        record.student?.education_level_id ||
        ''
      );
      const classroomId = String(record.student?.classroom?.id || record.student?.classroom_id || '');
      const studentId = String(record.student_id || '');

      setForm({
        campus_id: campusId,
        education_level_id: eduLevelId,
        classroom_id: classroomId,
        student_id: studentId,
        subject: record.subject ?? '',
        meeting_date: String(record.meeting_at).slice(0, 10),
        meeting_time: String(record.meeting_at).slice(11, 16),
        content: record.content ?? '',
        is_private: Boolean(record.is_private),
      });

      if (campusId) {
        fetchEducationLevels(campusId);
      } else {
        fetchEducationLevels();
      }
      fetchClassrooms(eduLevelId, campusId);

      if (classroomId) {
        fetchStudents('', classroomId, campusId, eduLevelId);
      }

      if (editorRef.current) {
        editorRef.current.innerHTML = record.content ?? '';
      }

      setSelectedRecord(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Düzenleme için detay alınamadı';
      showToast('error', msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      campus_id: '',
      education_level_id: '',
      classroom_id: '',
      student_id: '',
      subject: '',
      meeting_date: new Date().toISOString().slice(0, 10),
      meeting_time: new Date().toTimeString().slice(0, 5),
      content: '',
      is_private: true,
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const deleteRecord = async (recordId: number) => {
    const ok = await confirmDialog({
      text: 'Bu görüşme tutanağı silinecek. Devam etmek istiyor musunuz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/counseling/records/${recordId}`);
      showToast('success', 'Görüşme tutanağı silindi');
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
      }
      fetchRecords(1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Silme işlemi başarısız';
      showToast('error', msg);
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchStudents(studentSearch, filteredClassroomId, campusFilter, educationLevelFilter);
    fetchRecords(1);
  };

  const resetFilters = () => {
    setCampusFilter('');
    setEducationLevelFilter('');
    setFilteredClassroomId('');
    setStudentSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);

    // Kampüs listesi yenilemesiyle birlikte eğitim seviyelerini de güncelle
    if (campuses.length === 1) {
      setCampusFilter(String(campuses[0].id));
    }
    setStudents([]);
    setClassrooms([]);
    fetchRecords(1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalContent = editorRef.current?.innerHTML?.trim() || form.content?.trim();

    if (!form.student_id || !form.subject || !form.meeting_date || !form.meeting_time || !finalContent) {
      showToast('error', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        student_id: Number(form.student_id),
        subject: form.subject.trim(),
        meeting_at: `${form.meeting_date}T${form.meeting_time}`,
        content: finalContent,
        is_private: form.is_private,
      };

      if (editingId) {
        await axiosClient.put(`/counseling/records/${editingId}`, payload);
        showToast('success', 'Görüşme tutanağı güncellendi');
      } else {
        await axiosClient.post('/counseling/records', payload);
        showToast('success', 'Görüşme tutanağı kaydedildi');
      }

      setForm({
        campus_id: '',
        education_level_id: '',
        classroom_id: '',
        student_id: '',
        subject: '',
        meeting_date: new Date().toISOString().slice(0, 10),
        meeting_time: new Date().toTimeString().slice(0, 5),
        content: '',
        is_private: true,
      });
      setEditingId(null);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setPage(1);
      fetchRecords(1);
    } catch (err: any) {
      const msg = err?.response?.data?.message || (editingId ? 'Güncelleme işlemi başarısız' : 'Kayıt oluşturulamadı');
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Sınıfa göre öğrencileri filtrele (form için)
  const studentOptions = useMemo(() => {
    if (!form.classroom_id) return [];
    const selectedClassroomId = Number(form.classroom_id);
    const list = students
      .filter((s) => s.classroom_id != null && Number(s.classroom_id) === selectedClassroomId)
      .map((s) => ({
        id: s.id,
        label: `${s.student_name || (s as any).name || ''}${s.school_no ? ` (${s.school_no})` : ''}`,
      }));

    // If editing, make sure the currently selected student is in the list
    if (form.student_id && !list.some((o) => String(o.id) === String(form.student_id))) {
      const curRec = records.find((r) => r.id === editingId) || (selectedRecord?.id === editingId ? selectedRecord : null);
      if (curRec?.student && String(curRec.student.id) === String(form.student_id)) {
        list.unshift({
          id: curRec.student.id,
          label: `${curRec.student.name || ''}${curRec.student.school_no ? ` (${curRec.student.school_no})` : ''}`,
        });
      }
    }

    return list;
  }, [students, form.classroom_id, form.student_id, editingId, records, selectedRecord]);

  // Form için sınıf listesi - önce kullanıcının kademelerine sonra formdaki kademe filtresine göre
  const formClassrooms = useMemo(() => {
    let filtered = classrooms;

    // Önce kullanıcının atandığı kademelere göre filtrele
    if (myEducationLevelIds.length > 0) {
      filtered = filtered.filter((c) => {
        const levelId = c.grade_level ?? c.education_level_id;
        return levelId && myEducationLevelIds.includes(Number(levelId));
      });
    }

    // Sonra formdaki kademe seçimine göre filtrele
    if (form.education_level_id) {
      const selectedLevelId = Number(form.education_level_id);
      filtered = filtered.filter((c) => {
        const levelId = c.grade_level ?? c.education_level_id;
        return levelId && Number(levelId) === selectedLevelId;
      });
    }

    // If editing, make sure currently selected classroom is in the options so select doesn't blank out
    if (form.classroom_id && !filtered.some((c) => String(c.id) === String(form.classroom_id))) {
      const curRec = records.find((r) => r.id === editingId) || (selectedRecord?.id === editingId ? selectedRecord : null);
      if (curRec?.student?.classroom && String(curRec.student.classroom.id) === String(form.classroom_id)) {
        filtered = [
          {
            id: curRec.student.classroom.id,
            name: curRec.student.classroom.name,
            grade_level: form.education_level_id ? Number(form.education_level_id) : undefined,
            education_level_id: form.education_level_id ? Number(form.education_level_id) : undefined,
          },
          ...filtered,
        ];
      }
    }

    return filtered;
  }, [classrooms, myEducationLevelIds, form.education_level_id, form.classroom_id, editingId, records, selectedRecord]);

  // Formda kampüs değiştiğinde kademeleri güncelle
  useEffect(() => {
    if (form.campus_id) {
      fetchEducationLevels(form.campus_id);
    }
  }, [form.campus_id]);

  // Formda kademe değiştiğinde sınıfları güncelle
  useEffect(() => {
    if (form.education_level_id || form.campus_id) {
      fetchClassrooms(form.education_level_id, form.campus_id);
    }
  }, [form.education_level_id, form.campus_id]);

  // Formda sınıf seçildiğinde öğrencileri çek
  useEffect(() => {
    if (form.classroom_id) {
      fetchStudents('', form.classroom_id, form.campus_id, form.education_level_id);
    }
  }, [form.classroom_id]);

  const execEditorCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, content: editorRef.current?.innerHTML ?? '' }));
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0">Danışanlar</h3>
          <p className="text-muted mb-0">Görüşme tutanaklarını kaydedin ve filtreleyin</p>
        </div>
        <div className="text-end d-none d-md-block ms-3">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><a href="/" className="text-decoration-none text-muted">Anasayfa</a></li>
            <li className="breadcrumb-item active fw-medium">Danışanlar</li>
          </ol>
        </div>
      </div>

      <div className="row g-3">
        {isGuidance && (
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">{editingId ? 'Görüşme Tutanağını Düzenle' : 'Yeni Görüşme Tutanağı'}</h5>
              </div>
              <div className="card-body">
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Kampüs Seçimi</label>
                    <select
                      className="form-select"
                      value={form.campus_id || ''}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        campus_id: e.target.value,
                        education_level_id: '',
                        classroom_id: '',
                        student_id: ''
                      }))}
                    >
                      <option value="">Tüm Kampüsler</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Kademe Seçimi</label>
                    <select
                      className="form-select"
                      value={form.education_level_id || ''}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        education_level_id: e.target.value,
                        classroom_id: '',
                        student_id: ''
                      }))}
                      disabled={!form.campus_id && campuses.length > 1 && !editingId}
                    >
                      <option value="">{form.campus_id || campuses.length <= 1 || editingId ? 'Tüm Kademeler' : 'Önce Kampüs Seçin'}</option>
                      {educationLevels.map((el) => (
                        <option key={el.id} value={el.id}>{el.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Sınıf Seçimi *</label>
                    <select
                      className="form-select"
                      value={form.classroom_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, classroom_id: e.target.value, student_id: '' }))}
                      disabled={!form.education_level_id && !editingId}
                      required
                    >
                      <option value="">{form.education_level_id || editingId ? 'Sınıf seçin' : 'Önce Kademe Seçin'}</option>
                      {formClassrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Öğrenci Seçimi *</label>
                    <select
                      className="form-select"
                      value={form.student_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}
                      disabled={!form.classroom_id && !editingId}
                      required
                    >
                      <option value="">{form.classroom_id || editingId ? 'Öğrenci seçin' : 'Önce sınıf seçin'}</option>
                      {studentOptions.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Görüşme Konusu *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="Örn: Sınav kaygısı"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Tarih ve Saat *</label>
                    <div className="row g-2">
                      <div className="col-7">
                        <input
                          type="date"
                          className="form-control"
                          value={form.meeting_date}
                          onChange={(e) => setForm((prev) => ({ ...prev, meeting_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-5">
                        <input
                          type="time"
                          className="form-control"
                          value={form.meeting_time}
                          onChange={(e) => setForm((prev) => ({ ...prev, meeting_time: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Görüşme İçeriği *</label>
                    <div className="border rounded">
                      <div className="d-flex gap-1 p-2 border-bottom bg-light">
                        <button type="button" className="btn btn-sm btn-light" onClick={() => execEditorCommand('bold')}><b>B</b></button>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => execEditorCommand('italic')}><i>I</i></button>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => execEditorCommand('underline')}><u>U</u></button>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => execEditorCommand('insertUnorderedList')}>
                          <i className="ti ti-list"></i>
                        </button>
                      </div>
                      <div
                        ref={editorRef}
                        className="p-2"
                        contentEditable
                        style={{ minHeight: 140, outline: 'none' }}
                        onInput={() => {
                          const html = editorRef.current?.innerHTML ?? '';
                          setForm((prev) => ({ ...prev, content: html }));
                        }}
                        data-placeholder="Görüşme notlarını yazın..."
                      />
                    </div>
                    <small className="text-muted">Kalın, italik, altı çizili ve maddeleme desteklenir.</small>
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="privacy-switch"
                      checked={form.is_private}
                      onChange={(e) => setForm((prev) => ({ ...prev, is_private: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="privacy-switch">
                      {form.is_private ? 'Sadece ben göreyim' : 'İdareciler de görebilsin'}
                    </label>
                  </div>

                  <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
                    {submitting ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Tutanağı Kaydet')}
                  </button>

                  {editingId && (
                    <button className="btn btn-light w-100 mt-2" type="button" onClick={cancelEdit} disabled={submitting}>
                      İptal
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        <div className={isGuidance ? 'col-lg-8' : 'col-12'}>
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-2">
                <div className="col-md-2">
                  <label className="form-label">Kampüs</label>
                  <select
                    className="form-select"
                    value={campusFilter}
                    onChange={(e) => {
                      setCampusFilter(e.target.value);
                      setEducationLevelFilter('');
                      setFilteredClassroomId('');
                      setStudents([]);
                    }}
                  >
                    <option value="">Tümü</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Kademe</label>
                  <select
                    className="form-select"
                    value={educationLevelFilter}
                    onChange={(e) => {
                      setEducationLevelFilter(e.target.value);
                      setFilteredClassroomId(''); // Kademe değişince sınıfı sıfırla
                      setStudents([]);
                    }}
                    disabled={!campusFilter && campuses.length > 0}
                  >
                    <option value="">Tümü</option>
                    {educationLevels.map((el) => (
                      <option key={el.id} value={el.id}>{el.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Sınıf</label>
                  <select
                    className="form-select"
                    value={filteredClassroomId}
                    onChange={(e) => setFilteredClassroomId(e.target.value)}
                    disabled={!educationLevelFilter}
                  >
                    <option value="">Tümü</option>
                    {filteredClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Öğrenci Ara</label>
                  <input
                    type="text"
                    className="form-control"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Ad veya no"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Başlangıç</label>
                  <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Bitiş</label>
                  <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="col-md-2 d-flex align-items-end gap-2">
                  <button className="btn btn-primary w-100" onClick={applyFilters}>Filtrele</button>
                  <button className="btn btn-light" onClick={resetFilters} title="Temizle">
                    <i className="ti ti-rotate"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Görüşme Tutanakları</h5>
              <small className="text-muted">Toplam: {meta?.total ?? 0}</small>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-4 text-muted">Kayıt bulunamadı.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Öğrenci</th>
                        <th>Konu</th>
                        <th>Görüşen</th>
                        <th>Gizlilik</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td>{new Date(r.meeting_at).toLocaleString('tr-TR')}</td>
                          <td>
                            <div>{r.student?.name || '-'}</div>
                            <small className="text-muted">{r.student?.classroom?.name || '-'}</small>
                          </td>
                          <td>{r.subject}</td>
                          <td>{getCounselorLabel(r)}</td>
                          <td>
                            {r.is_private ? (
                              <span className="badge bg-soft-warning text-warning">Sadece ben</span>
                            ) : (
                              <span className="badge bg-soft-success text-success">İdare ile paylaşılan</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="btn-group btn-group-sm" role="group" aria-label="Kayıt işlemleri">
                                <button type="button" className="btn btn-light" onClick={() => openDetail(r.id)}>
                                  Detay
                                </button>
                                <button type="button" className="btn btn-light" onClick={() => downloadPdf(r.id)}>
                                  PDF
                                </button>
                              </div>

                              {canModify(r.counselor_id) && (
                                <div className="btn-group btn-group-sm" role="group" aria-label="Düzenle / Sil">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => startEdit(r.id)}
                                    title="Düzenle"
                                    aria-label="Düzenle"
                                  >
                                    <i className="ti ti-pencil"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => deleteRecord(r.id)}
                                    title="Sil"
                                    aria-label="Sil"
                                  >
                                    <i className="ti ti-trash"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {meta && meta.last_page > 1 && (
              <div className="card-footer d-flex justify-content-between align-items-center">
                <small className="text-muted">Sayfa {meta.current_page} / {meta.last_page}</small>
                <div className="btn-group">
                  <button className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</button>
                  <button className="btn btn-sm btn-light" disabled={page >= meta.last_page} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}>Sonraki</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {
        selectedRecord && (
          <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} role="dialog">
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Görüşme Tutanağı Detayı</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedRecord(null)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  {detailLoading ? (
                    <div>Yükleniyor...</div>
                  ) : (
                    <div>
                      <div className="row g-2 mb-3">
                        <div className="col-md-6">
                          <div className="text-muted">Öğrenci</div>
                          <div className="fw-semibold">{selectedRecord.student?.name ?? '-'}</div>
                          <small className="text-muted">{selectedRecord.student?.classroom?.name ?? '-'}</small>
                        </div>
                        <div className="col-md-6">
                          <div className="text-muted">Görüşen</div>
                          <div className="fw-semibold">{getCounselorLabel(selectedRecord)}</div>
                          <small className="text-muted">{new Date(selectedRecord.meeting_at).toLocaleString('tr-TR')}</small>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="text-muted">Konu</div>
                        <div className="fw-semibold">{selectedRecord.subject}</div>
                      </div>

                      <div className="mb-2">
                        <div className="text-muted">Gizlilik</div>
                        <div>
                          {selectedRecord.is_private ? (
                            <span className="badge bg-soft-warning text-warning">Sadece ben</span>
                          ) : (
                            <span className="badge bg-soft-success text-success">İdare ile paylaşılan</span>
                          )}
                        </div>
                      </div>

                      <hr />

                      <div className="mb-2">
                        <div className="text-muted mb-1">İçerik</div>
                        <div className="border rounded p-2" dangerouslySetInnerHTML={{ __html: selectedRecord.content || '' }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setSelectedRecord(null)}>Kapat</button>
                  <button type="button" className="btn btn-primary" onClick={() => downloadPdf(selectedRecord.id)}>PDF İndir</button>
                  {canModify(selectedRecord.counselor_id) && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => startEdit(selectedRecord.id)}
                        title="Düzenle"
                        aria-label="Düzenle"
                      >
                        <i className="ti ti-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => deleteRecord(selectedRecord.id)}
                        title="Sil"
                        aria-label="Sil"
                      >
                        <i className="ti ti-trash"></i>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default CounselingClientsPage;
