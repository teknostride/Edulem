import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { confirmDialog, showToast } from '../../utils/toast';
import { getMyEducationLevelIds, getMyRole, roleNeedsEducationLevelScope } from '../../utils/userScope';
import ResetStudentPasswordModal from '../../components/students/ResetStudentPasswordModal';

const STUDENT_FILTERS_STORAGE_KEY = 'STUDENT_LIST_FILTERS';

const loadSavedStudentFilters = () => {
  try {
    const raw = localStorage.getItem(STUDENT_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

interface Student {
  id: number;
  student_name: string;
  tc_no: string;
  school_no?: string;
  phone?: string;
  guardians?: Array<{
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
    relation_type?: string;
    is_legal_guardian?: boolean;
  }>;
  emergency_contact_info?: {
    name?: string;
    phone?: string;
    relation?: string;
  } | null;
  email?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  address?: string;
  city_id?: number;
  district_id?: number;
  classroom_id?: number;
  campus_id?: number | null;
  education_level_id?: number | string | null;
  campus_name?: string | null;
  education_level_name?: string | null;
  is_active: boolean;
  city?: {
    id: number;
    name: string;
  };
  district?: {
    id: number;
    name: string;
  };
  classroom?: {
    id: number;
    name: string;
    education_level?: {
      id: number;
      name: string;
    };
    branch?: {
      id: number;
      name: string;
      campus?: {
        id: number;
        name: string;
      };
    };
  };
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const StudentList = () => {
  const savedFilters = useMemo(() => loadSavedStudentFilters(), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [resetPasswordStudent, setResetPasswordStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm ?? '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(savedFilters?.searchTerm ?? '');
  const [mobileOpenStudentId, setMobileOpenStudentId] = useState<number | null>(null);
  const [_showFilters, _setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(() => {
    if (savedFilters?.perPage && Number.isFinite(Number(savedFilters.perPage))) {
      const p = Number(savedFilters.perPage);
      return p === 15 ? 30 : p;
    }
    return 30;
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportColumns, setExportColumns] = useState<string[]>(['student_name', 'classroom_name', 'phone', 'guardian1_phone', 'guardian2_phone', 'emergency_phone']);
  const [bulkDeleteAlsoEmptyClassrooms, setBulkDeleteAlsoEmptyClassrooms] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkImportUploading, setBulkImportUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBulkActions] = useState(false);

  const [exportAllMyEducationLevels, setExportAllMyEducationLevels] = useState(false);

  const [sortBy, setSortBy] = useState<'name' | 'school_no' | 'birth_date' | 'classroom'>(savedFilters?.sortBy ?? 'name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(savedFilters?.sortDir ?? 'asc');

  // Filtreler (Kalıcı ve varsayılan aktif)
  const [campusFilter, setCampusFilter] = useState<number | ''>(savedFilters?.campusFilter ?? '');
  const [educationLevelFilter, setEducationLevelFilter] = useState<number | ''>(savedFilters?.educationLevelFilter ?? '');
  const [classroomFilters, setClassroomFilters] = useState<number[]>(() => {
    if (Array.isArray(savedFilters?.classroomFilters)) {
      return savedFilters.classroomFilters.map(Number).filter((n: number) => Number.isFinite(n) && n > 0);
    }
    if (savedFilters?.classroomFilter && Number.isFinite(Number(savedFilters.classroomFilter))) {
      return [Number(savedFilters.classroomFilter)];
    }
    return [];
  });
  const [statusFilter, setStatusFilter] = useState<boolean | ''>(() => {
    if (savedFilters && typeof savedFilters.statusFilter === 'boolean') {
      return savedFilters.statusFilter;
    }
    if (savedFilters && savedFilters.statusFilter === '') {
      return '';
    }
    return true; // İlk açılışta varsayılan olarak AKTİF
  });

  // Çoklu sınıf seçim dropdown kontrolleri
  const [classroomDropdownOpen, setClassroomDropdownOpen] = useState(false);
  const [classroomSearch, setClassroomSearch] = useState('');
  const classroomDropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown verileri
  const [campuses, setCampuses] = useState<Array<{ id: number; name: string }>>([]);
  const [educationLevels, setEducationLevels] = useState<Array<{ id: number; name: string }>>([]);
  const [classrooms, setClassrooms] = useState<Array<{ id: number; name: string }>>([]);

  const myRole = useMemo(() => getMyRole(), []);
  const myEducationLevelIds = useMemo(() => getMyEducationLevelIds(), []);
  const enforceEducationLevelScope = useMemo(
    () => roleNeedsEducationLevelScope(myRole) && myEducationLevelIds.length > 0,
    [myRole, myEducationLevelIds.length]
  );

  // Filtreleri localStorage'a kaydet
  useEffect(() => {
    try {
      const stateToSave = {
        searchTerm,
        campusFilter,
        educationLevelFilter,
        classroomFilters,
        statusFilter,
        sortBy,
        sortDir,
        perPage,
      };
      localStorage.setItem(STUDENT_FILTERS_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // ignore
    }
  }, [searchTerm, campusFilter, educationLevelFilter, classroomFilters, statusFilter, sortBy, sortDir, perPage]);

  // Click outside to close classroom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classroomDropdownRef.current && !classroomDropdownRef.current.contains(event.target as Node)) {
        setClassroomDropdownOpen(false);
      }
    };
    if (classroomDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [classroomDropdownOpen]);

  useEffect(() => {
    fetchCampuses();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1); // Filtre değiştiğinde sayfayı sıfırla
  }, [campusFilter, educationLevelFilter, classroomFilters, statusFilter, debouncedSearchTerm, perPage, sortBy, sortDir]);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, campusFilter, educationLevelFilter, classroomFilters, statusFilter, debouncedSearchTerm, perPage, sortBy, sortDir]);

  const isFirstCampusRender = useRef(true);
  useEffect(() => {
    if (isFirstCampusRender.current) {
      isFirstCampusRender.current = false;
      if (campusFilter !== '') {
        fetchEducationLevels(campusFilter);
      } else if (enforceEducationLevelScope && myEducationLevelIds.length > 0) {
        fetchEducationLevelsByIds(myEducationLevelIds);
      }
      return;
    }

    if (campusFilter !== '') {
      fetchEducationLevels(campusFilter);
    } else {
      if (enforceEducationLevelScope && myEducationLevelIds.length > 0) {
        fetchEducationLevelsByIds(myEducationLevelIds);
      } else {
        setEducationLevels([]);
        setEducationLevelFilter('');
      }
    }
  }, [campusFilter]);

  useEffect(() => {
    if (!enforceEducationLevelScope) return;

    // Eğer seçili kademe, yetkili olmadığı bir kademe ise temizle
    if (educationLevelFilter !== '' && !myEducationLevelIds.includes(Number(educationLevelFilter))) {
      setEducationLevelFilter('');
      return;
    }

    // Tek kademe atanmışsa otomatik seç
    if (educationLevelFilter === '' && myEducationLevelIds.length === 1) {
      setEducationLevelFilter(myEducationLevelIds[0]);
    }
  }, [enforceEducationLevelScope, educationLevelFilter, myEducationLevelIds]);

  const fetchEducationLevelsByIds = async (ids: number[]) => {
    try {
      const response = await axiosClient.get('/education-levels', {
        params: {
          ids,
          per_page: 200,
        },
      });

      const root = response.data;
      const payload = root?.data ?? root;
      const rawLevels = payload?.education_levels ?? payload?.data ?? payload;
      const list = Array.isArray(rawLevels)
        ? rawLevels
        : Array.isArray(payload)
          ? payload
          : [];

      const scoped = list
        .map((x: any) => ({ id: Number(x?.id), name: String(x?.name ?? '') }))
        .filter((x: any) => Number.isFinite(x.id) && x.id > 0 && x.name.trim() !== '')
        .filter((x: any) => ids.includes(Number(x.id)))
        .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'tr'));

      setEducationLevels(scoped);
    } catch (error) {
      console.error('Kademeler yüklenemedi:', error);
      setEducationLevels([]);
    }
  };

  const isFirstEducationLevelRender = useRef(true);
  useEffect(() => {
    if (isFirstEducationLevelRender.current) {
      isFirstEducationLevelRender.current = false;
      if (educationLevelFilter !== '') {
        fetchClassrooms(Number(educationLevelFilter), campusFilter);
      }
      return;
    }

    if (educationLevelFilter !== '') {
      fetchClassrooms(Number(educationLevelFilter), campusFilter);
      setClassroomFilters([]);
    } else {
      setClassrooms([]);
      setClassroomFilters([]);
    }
  }, [educationLevelFilter, campusFilter]);

  const toggleClassroom = (classroomId: number) => {
    setClassroomFilters((prev) =>
      prev.includes(classroomId) ? prev.filter((id) => id !== classroomId) : [...prev, classroomId]
    );
  };

  const selectAllClassrooms = () => {
    setClassroomFilters(classrooms.map((c) => c.id));
  };

  const clearAllClassrooms = () => {
    setClassroomFilters([]);
  };

  const filteredClassrooms = useMemo(() => {
    if (!classroomSearch.trim()) return classrooms;
    const q = classroomSearch.trim().toLowerCase();
    return classrooms.filter((c) => c.name.toLowerCase().includes(q));
  }, [classrooms, classroomSearch]);

  const classroomLabel = useMemo(() => {
    if (classroomFilters.length === 0) return 'Tüm Sınıflar';
    if (classroomFilters.length === 1) {
      const match = classrooms.find((c) => c.id === classroomFilters[0]);
      return match ? match.name : '1 Sınıf Seçili';
    }
    if (classroomFilters.length === classrooms.length && classrooms.length > 0) {
      return 'Tüm Sınıflar Seçili';
    }
    return `${classroomFilters.length} Sınıf Seçili`;
  }, [classroomFilters, classrooms]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    campusFilter !== '' ||
    educationLevelFilter !== '' ||
    classroomFilters.length > 0 ||
    statusFilter !== true ||
    sortBy !== 'name' ||
    sortDir !== 'asc' ||
    perPage !== 30
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCampusFilter('');
    setEducationLevelFilter('');
    setClassroomFilters([]);
    setStatusFilter(true);
    setSortBy('name');
    setSortDir('asc');
    setPerPage(30);
    setCurrentPage(1);
    try {
      localStorage.removeItem(STUDENT_FILTERS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/campuses');
      const data = response.data.data?.campuses || response.data.campuses || response.data.data || response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kampüsler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEducationLevels = async (campusId: number) => {
    try {
      const response = await axiosClient.get(`/education-levels?campus_id=${campusId}`);
      const data = response.data.data?.education_levels || response.data.education_levels || response.data.data || response.data;
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

      const scoped = enforceEducationLevelScope
        ? sorted.filter((x: any) => myEducationLevelIds.includes(Number(x?.id)))
        : sorted;
      setEducationLevels(scoped);
    } catch (error) {
      console.error('Kademeler yüklenemedi:', error);
    }
  };

  const fetchClassrooms = async (educationLevelId: number, campusId?: number | '') => {
    try {
      const params: any = {
        education_level_id: educationLevelId,
        per_page: 200,
      };
      if (campusId !== undefined && campusId !== '') {
        params.campus_id = campusId;
      }
      const response = await axiosClient.get('/classrooms', { params });

      const root = response.data;
      const payload = root?.data ?? root;
      const rawClassrooms = payload?.classrooms ?? payload?.data ?? payload;

      const normalized = Array.isArray(rawClassrooms)
        ? rawClassrooms
        : Array.isArray(payload)
          ? payload
          : [];

      const mapped = normalized
        .map((c: any) => ({
          id: Number(c?.id),
          name: String(c?.name ?? c?.class_name ?? c?.title ?? ''),
        }))
        .filter((c: any) => Number.isFinite(c.id) && c.id > 0 && c.name.trim() !== '');

      const sorted = [...mapped].sort((a, b) => {
        const parse = (name: string) => {
          const m = name.trim().match(/^(\d+)\s*[-\s]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])?\b/);
          if (!m) return { n: Number.POSITIVE_INFINITY, s: name.trim().toLowerCase() };
          const n = Number.parseInt(m[1], 10);
          const section = (m[2] ?? '').toString().toLowerCase();
          return { n: Number.isFinite(n) ? n : Number.POSITIVE_INFINITY, s: section };
        };

        const pa = parse(a.name);
        const pb = parse(b.name);
        if (pa.n !== pb.n) return pa.n - pb.n;
        return pa.s.localeCompare(pb.s, 'tr');
      });

      setClassrooms(sorted);
    } catch (error) {
      console.error('Sınıflar yüklenemedi:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setListLoading(true);

      const sortByApi = (() => {
        if (sortBy === 'classroom') return 'classroom';
        if (sortBy === 'name') return 'name';
        if (sortBy === 'school_no') return 'school_no';
        if (sortBy === 'birth_date') return 'birth_date';
        return 'name';
      })();

      const params: any = {
        page: String(currentPage),
        per_page: String(perPage),
        // Bazı backend implementasyonları farklı isimler bekleyebiliyor
        page_size: String(perPage),
        limit: String(perPage),
        sort_by: sortByApi,
        sort_dir: sortDir,
      };

      if (campusFilter) params.campus_id = campusFilter;

      // Kademe kısıtı: filtre seçilmemişse atanmış kademeler ile kısıtla
      if (enforceEducationLevelScope) {
        if (educationLevelFilter) {
          params.education_level_id = educationLevelFilter;
        }
      } else {
        if (educationLevelFilter) params.education_level_id = educationLevelFilter;
      }

      if (classroomFilters.length > 0) {
        params.classroom_ids = classroomFilters;
        params.class_ids = classroomFilters.join(',');
        if (classroomFilters.length === 1) {
          params.classroom_id = classroomFilters[0];
        }
      }
      if (statusFilter !== '') params.is_active = statusFilter ? 1 : 0;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      const response = await axiosClient.get('/students', { params });

      const responseData = response.data;
      const data = responseData?.data || responseData;

      let studentsArray: Student[] = [];
      if (data?.students) {
        studentsArray = Array.isArray(data.students) ? data.students : [];
      } else if (Array.isArray(data)) {
        studentsArray = data;
      } else if (Array.isArray(responseData)) {
        studentsArray = responseData;
      }

      const sortedStudents = (() => {
        const list = [...studentsArray];
        const dir = sortDir === 'desc' ? -1 : 1;
        const safeStr = (v: unknown) => String(v ?? '').trim();
        if (sortBy === 'name') {
          return list.sort((a, b) => dir * safeStr(a.student_name).localeCompare(safeStr(b.student_name), 'tr'));
        }
        if (sortBy === 'school_no') {
          return list.sort((a, b) => {
            const na = parseInt(safeStr(a.school_no), 10);
            const nb = parseInt(safeStr(b.school_no), 10);
            if (!isNaN(na) && !isNaN(nb)) return dir * (na - nb);
            return dir * safeStr(a.school_no).localeCompare(safeStr(b.school_no), 'tr', { numeric: true });
          });
        }
        if (sortBy === 'birth_date') {
          return list.sort((a, b) => {
            const ta = a.birth_date ? new Date(a.birth_date).getTime() : 0;
            const tb = b.birth_date ? new Date(b.birth_date).getTime() : 0;
            return dir * (ta - tb);
          });
        }
        if (sortBy === 'classroom') {
          return list.sort((a, b) => {
            const ca = safeStr(a.classroom?.name);
            const cb = safeStr(b.classroom?.name);
            const cmp = ca.localeCompare(cb, 'tr', { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) return dir * cmp;
            return safeStr(a.student_name).localeCompare(safeStr(b.student_name), 'tr');
          });
        }
        return list;
      })();

      setStudents(sortedStudents);

      // Pagination bilgisi
      if (data?.pagination) {
        setPagination(data.pagination);
      } else {
        // Eğer pagination bilgisi yoksa, varsayılan değerler
        setPagination({
          current_page: 1,
          last_page: 1,
          per_page: perPage,
          total: sortedStudents.length
        });
      }

      setListLoading(false);
    } catch (error) {
      console.error('Öğrenciler yüklenemedi:', error);
      showToast('error', 'Öğrenciler yüklenemedi');
      setStudents([]);
      setListLoading(false);
    }
  };

  const handleToggleStatus = async (student: Student) => {
    const actionText = student.is_active ? 'pasife almak' : 'aktife almak';
    const ok = await confirmDialog({
      text: `Bu öğrenciyi ${actionText} istediğinizden emin misiniz?`,
      confirmText: 'Evet',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.patch(`/students/${student.id}/toggle-active`);
      showToast('success', 'Öğrenci durumu başarıyla güncellendi');
      fetchStudents(); // Listeyi yenile
    } catch (error: any) {
      console.error("Öğrenci durumu güncellenemedi:", error);
      const errorMessage = error.response?.data?.message || 'Öğrenci durumu güncellenirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      text: 'Bu öğrenciyi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/students/${id}`);
      showToast('success', 'Öğrenci başarıyla silindi');
      fetchStudents(); // Listeyi yenile
    } catch (error: any) {
      console.error("Öğrenci silinemedi:", error);
      const errorMessage = error.response?.data?.message || 'Öğrenci silinirken bir hata oluştu.';
      showToast('error', errorMessage);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredStudents = students;

  const getCampusName = (student: Student) =>
    student.campus_name ?? student.classroom?.branch?.campus?.name ?? '-';

  const getEducationLevelName = (student: Student) =>
    student.education_level_name ?? student.classroom?.education_level?.name ?? '-';

  const getClassroomName = (student: Student) => student.classroom?.name || '-';

  const formatBirthDate = (birthDate?: string) => {
    if (!birthDate) return '';
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR');
  };

  const formatGender = (gender?: Student['gender']) => {
    if (!gender) return '';
    return gender === 'male' ? 'Erkek' : 'Kız';
  };

  const getContactLines = (student: Student) => {
    const lines: Array<{ label: string; value: string; isLegal?: boolean; isEmergency?: boolean }> = [];

    const gs = student.guardians ?? [];
    const labelize = (v: unknown) => {
      const raw = String(v ?? '').trim();
      if (!raw) return 'Veli';
      const norm = raw.toLocaleLowerCase('tr-TR');
      if (['mother', 'mom', 'anne'].includes(norm)) return 'Anne';
      if (['father', 'dad', 'baba'].includes(norm)) return 'Baba';
      if (['legal_guardian', 'guardian', 'vasi'].includes(norm)) return 'Vasi';
      if (['other', 'diger', 'diğer', 'veli'].includes(norm)) return 'Veli';
      return raw.charAt(0).toLocaleUpperCase('tr-TR') + raw.slice(1);
    };

    const getRelationRank = (v: unknown) => {
      const raw = String(v ?? '').trim().toLowerCase();
      if (['mother', 'mom', 'anne'].includes(raw)) return 1;
      if (['father', 'dad', 'baba'].includes(raw)) return 2;
      if (['legal_guardian', 'guardian', 'vasi'].includes(raw)) return 3;
      return 4;
    };

    const sortedGuardians = [...gs].sort((a, b) => {
      const rankA = getRelationRank(a.relation_type);
      const rankB = getRelationRank(b.relation_type);
      if (rankA !== rankB) return rankA - rankB;
      const aLegal = Boolean(a.is_legal_guardian);
      const bLegal = Boolean(b.is_legal_guardian);
      if (aLegal && !bLegal) return -1;
      if (!aLegal && bLegal) return 1;
      return 0;
    });

    for (const g of sortedGuardians) {
      if (g?.phone) {
        lines.push({
          label: labelize(g.relation_type),
          value: g.phone,
          isLegal: Boolean(g.is_legal_guardian),
        });
      }
    }

    const emergencyPhone = student.emergency_contact_info?.phone;
    if (emergencyPhone) {
      const rel = String(student.emergency_contact_info?.relation ?? '').trim();
      lines.push({ label: rel ? `Acil (${rel})` : 'Acil', value: emergencyPhone, isEmergency: true });
    }

    if (student.phone) lines.unshift({ label: 'Öğrenci', value: student.phone });
    if (student.email) lines.push({ label: 'E-posta', value: student.email });

    return lines;
  };

  const rowNumberOffset = useMemo(() => {
    const page = pagination?.current_page ?? currentPage;
    const per = pagination?.per_page ?? perPage;
    return (Math.max(1, page) - 1) * Math.max(1, per);
  }, [pagination, currentPage, perPage]);

  const listStatsText = useMemo(() => {
    if (!pagination) return '';
    const total = Number(pagination.total ?? 0);
    const current = Number(pagination.current_page ?? currentPage);
    const per = Number(pagination.per_page ?? perPage);
    if (total <= 0) return 'Toplam: 0';
    const start = (Math.max(1, current) - 1) * Math.max(1, per) + 1;
    const end = Math.min(total, (Math.max(1, current) - 1) * Math.max(1, per) + filteredStudents.length);
    return `${start}-${end} / ${total}`;
  }, [pagination, currentPage, perPage, filteredStudents.length]);

  const visiblePages = useMemo(() => {
    if (!pagination) return [] as number[];
    const total = pagination.last_page;
    const current = pagination.current_page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [pagination]);

  const exportColumnOptions = useMemo(() => ([
    { key: 'student_name', label: 'Ad Soyad' },
    { key: 'tc_no', label: 'TC Kimlik' },
    { key: 'school_no', label: 'Okul No' },
    { key: 'classroom_name', label: 'Sınıf' },
    { key: 'campus_name', label: 'Kampüs' },
    { key: 'education_level_name', label: 'Kademe' },
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'E-posta' },
    { key: 'address', label: 'Adres' },
    { key: 'birth_date', label: 'Doğum Tarihi' },
    { key: 'gender', label: 'Cinsiyet' },
    { key: 'guardian1_name', label: 'Anne Adı' },
    { key: 'guardian1_phone', label: 'Anne Telefon' },
    { key: 'guardian2_name', label: 'Baba Adı' },
    { key: 'guardian2_phone', label: 'Baba Telefon' },
    { key: 'emergency_phone', label: 'Acil Durum Telefon' },
    { key: 'is_active', label: 'Durum' },
  ]), []);

  const toggleExportColumn = (key: string, checked: boolean) => {
    setExportColumns(prev => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter(k => k !== key);
    });
  };

  const selectAllColumns = () => {
    setExportColumns(exportColumnOptions.map(c => c.key));
  };

  const clearAllColumns = () => {
    setExportColumns([]);
  };


  const handleDeleteAll = async () => {
    const ok = await confirmDialog({
      text: 'Tüm öğrencileri silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      icon: 'warning',
    });
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const params: any = {
        delete_empty_classrooms: bulkDeleteAlsoEmptyClassrooms,
      };

      if (campusFilter) params.campus_id = campusFilter;
      if (educationLevelFilter) params.education_level_id = educationLevelFilter;
      if (classroomFilters.length > 0) {
        params.classroom_ids = classroomFilters;
        params.class_ids = classroomFilters.join(',');
        if (classroomFilters.length === 1) {
          params.classroom_id = classroomFilters[0];
        }
      }
      if (statusFilter !== '') params.is_active = statusFilter;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      const response = await axiosClient.post('/students/delete-all', params);
      const deleted = response?.data?.data?.deleted ?? response?.data?.deleted;
      showToast('success', `Silindi: ${deleted ?? 0}`);
      fetchStudents();
    } catch (error: any) {
      console.error('Tamamını silme hatası:', error);
      const msg = error?.response?.data?.message || 'Silme sırasında hata oluştu';
      showToast('error', msg);
    } finally {
      setBulkDeleting(false);
    }
  };

  const downloadImportTemplate = async () => {
    try {
      const response = await axiosClient.get('/students/import-template', { responseType: 'blob' });
      const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
      let fileName = 'ogrenci_toplu_ekleme_sablonu.xlsx';
      if (typeof contentDisposition === 'string') {
        const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const rawName = match?.[1] || match?.[2];
        if (rawName) fileName = decodeURIComponent(rawName);
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Şablon indirilemedi:', error);
      const msg = error?.response?.data?.message || 'Şablon indirilemedi';
      showToast('error', msg);
    }
  };

  const uploadImportTemplate = async (file: File) => {
    setBulkImportUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imported = response?.data?.data?.imported ?? response?.data?.imported;
      const updated = response?.data?.data?.updated ?? response?.data?.updated;
      const errors = response?.data?.data?.errors ?? response?.data?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        // Show all errors in a modal
        const errorListHtml = `<div class="text-start" style="max-height: 400px; overflow-y: auto;">
          <ul class="list-group list-group-flush fs-13">
            ${errors.map((err: string) => `<li class="list-group-item list-group-item-danger py-1">${err}</li>`).join('')}
          </ul>
        </div>`;

        (window as any).Swal.fire({
          title: 'Aktarım Tamamlandı (Hatalar Var)',
          html: `Başarılı: ${imported ?? 0}, Güncellenen: ${updated ?? 0}, Hata: ${errors.length}<br/><br/>${errorListHtml}`,
          icon: 'warning',
          confirmButtonText: 'Tamam'
        });
      } else {
        showToast('success', `Aktarım tamamlandı. Başarılı: ${imported ?? 0}, Güncellenen: ${updated ?? 0}`);
      }

      fetchStudents();
    } catch (error: any) {
      console.error('Toplu aktarım hatası:', error);
      const msg = error?.response?.data?.message || 'Toplu aktarım sırasında hata oluştu';
      showToast('error', msg);
    } finally {
      setBulkImportUploading(false);
    }
  };

  useEffect(() => {
    if (!showExportModal) return;

    if (enforceEducationLevelScope && myEducationLevelIds.length > 0) {
      setExportAllMyEducationLevels(true);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExportModal(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showExportModal]);

  const startExport = async () => {
    if (exportColumns.length === 0) {
      showToast('error', 'En az 1 sütun seçmelisiniz');
      return;
    }

    const payload: any = {
      format: exportFormat,
      scope: 'all',
      columns: exportColumns,
      campus_id: campusFilter || undefined,
      education_level_id: educationLevelFilter || undefined,
      classroom_ids: classroomFilters.length > 0 ? classroomFilters : undefined,
      class_ids: classroomFilters.length > 0 ? classroomFilters.join(',') : undefined,
      classroom_id: classroomFilters.length === 1 ? classroomFilters[0] : undefined,
      is_active: statusFilter === '' ? undefined : (statusFilter ? 1 : 0),
      search: debouncedSearchTerm || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    };

    if (enforceEducationLevelScope && exportAllMyEducationLevels && myEducationLevelIds.length > 0) {
      payload.education_level_ids = myEducationLevelIds;
      delete payload.education_level_id;
    }

    setExporting(true);
    try {
      const response = await axiosClient.post('/students/export', payload, { responseType: 'blob' });
      const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
      let fileName = exportFormat === 'excel' ? 'ogrenciler.xlsx' : 'ogrenciler.pdf';

      if (typeof contentDisposition === 'string') {
        const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const rawName = match?.[1] || match?.[2];
        if (rawName) {
          fileName = decodeURIComponent(rawName);
        }
      }

      const blob = new Blob([response.data], {
        type: exportFormat === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
      showToast('success', 'Dosya indiriliyor');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Export sırasında hata oluştu';
      showToast('error', msg);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="text-center p-5">
      <div className="spinner-border text-primary"></div>
      <div className="mt-2 text-dark fw-medium">Sistem yükleniyor...</div>
    </div>
  );

  return (
    <div className="container-fluid">
      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold m-0 text-dark">Öğrenci Yönetimi</h3>
          <p className="text-muted mb-0">Sistemdeki öğrencileri görüntüleyin ve yönetin.</p>
        </div>

        <div className="text-end d-none d-md-block">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Ana Sayfa</Link></li>
            <li className="breadcrumb-item active fw-medium">Öğrenciler</li>
          </ol>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card border mb-4">
        <div className="card-body p-3 student-filters">
          <div className="row g-3">
            {/* Row 1: Search */}
            <div className="col-12 col-md-6 col-lg-4">
              <div className="app-search position-relative">
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Öğrenci adı, TCKN, okul no ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ti ti-search position-absolute top-50 start-0 translate-middle-y ms-3 fs-5 text-muted"></i>
              </div>
            </div>
          </div>

          <div className="mt-3"></div>

          {/* Row 2: Filters */}
          <div className="col-12">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="flex-grow-1 d-flex flex-wrap gap-2 student-filters__controls">
                <div className="position-relative" style={{ minWidth: "160px" }}>
                  <select
                    className="form-select ps-5"
                    value={campusFilter === '' ? '' : campusFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      const parsed = value === '' ? '' : Number.parseInt(value, 10);
                      setCampusFilter(Number.isNaN(parsed as any) ? '' : (parsed as number | ''));
                      setEducationLevelFilter('');
                      setClassroomFilters([]);
                    }}
                  >
                    <option value="">Tüm Kampüsler</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>{campus.name}</option>
                    ))}
                  </select>
                  <i className="ti ti-building position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>

                <div className="position-relative" style={{ minWidth: "160px" }}>
                  <select
                    className="form-select ps-5"
                    value={educationLevelFilter === '' ? '' : educationLevelFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      const parsed = value === '' ? '' : Number.parseInt(value, 10);
                      const nextValue = Number.isNaN(parsed as any) ? '' : (parsed as number | '');

                      setEducationLevelFilter(nextValue);
                      setClassroomFilters([]);
                    }}
                    disabled={(enforceEducationLevelScope && myEducationLevelIds.length === 1) || (!enforceEducationLevelScope && campusFilter === '')}
                  >
                    {enforceEducationLevelScope ? (
                      myEducationLevelIds.length > 1
                        ? <option value="">Tüm Yetkili Kademeler</option>
                        : <option value="" disabled>Kademe</option>
                    ) : (
                      <option value="">Tüm Kademeler</option>
                    )}
                    {educationLevels.map((level) => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                  <i className="ti ti-school position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>

                {/* Çoklu Sınıf Seçimi Dropdown */}
                <div className="position-relative" style={{ minWidth: "190px" }} ref={classroomDropdownRef}>
                  <button
                    type="button"
                    className="form-select ps-5 text-start d-flex align-items-center justify-content-between text-truncate"
                    disabled={educationLevelFilter === '' || classrooms.length === 0}
                    onClick={() => setClassroomDropdownOpen((prev) => !prev)}
                    style={{ backgroundPosition: 'right 0.75rem center' }}
                  >
                    <span className="text-truncate">
                      {classroomLabel}
                    </span>
                  </button>
                  <i className="ti ti-users position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ pointerEvents: 'none', zIndex: 5 }}></i>

                  {classroomDropdownOpen && (
                    <div
                      className="dropdown-menu show shadow-lg p-2 position-absolute"
                      style={{
                        minWidth: '240px',
                        maxWidth: '320px',
                        zIndex: 1050,
                        top: '100%',
                        left: 0,
                        marginTop: '4px'
                      }}
                    >
                      <div className="mb-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Sınıf ara..."
                          value={classroomSearch}
                          onChange={(e) => setClassroomSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={selectAllClassrooms}
                        >
                          Tümünü Seç ({classrooms.length})
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                          onClick={clearAllClassrooms}
                        >
                          Temizle
                        </button>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredClassrooms.length === 0 ? (
                          <div className="text-muted small p-2 text-center">Sınıf bulunamadı</div>
                        ) : (
                          filteredClassrooms.map((classroom) => {
                            const isSelected = classroomFilters.includes(classroom.id);
                            return (
                              <label
                                key={classroom.id}
                                className="dropdown-item d-flex align-items-center gap-2 py-1 px-2 rounded cursor-pointer"
                                style={{ cursor: 'pointer' }}
                              >
                                <input
                                  type="checkbox"
                                  className="form-check-input mt-0"
                                  checked={isSelected}
                                  onChange={() => toggleClassroom(classroom.id)}
                                />
                                <span className="small text-truncate">{classroom.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <div className="pt-2 border-top mt-1 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary w-100"
                          onClick={() => setClassroomDropdownOpen(false)}
                        >
                          Tamam
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="position-relative" style={{ minWidth: "130px" }}>
                  <select
                    className="form-select ps-5"
                    value={statusFilter === '' ? '' : statusFilter ? '1' : '0'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStatusFilter(value === '' ? '' : value === '1');
                    }}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Pasif</option>
                    <option value="">Tümü</option>
                  </select>
                  <i className="ti ti-circle-check position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>

                <div className="position-relative" style={{ minWidth: "170px" }}>
                  <select
                    className="form-select ps-5"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="name">İsme göre</option>
                    <option value="school_no">Noya göre</option>
                    <option value="birth_date">Doğum Tarihine göre</option>
                    <option value="classroom">Sınıfa göre</option>
                  </select>
                  <i className="ti ti-arrows-sort position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>

                <div className="position-relative" style={{ minWidth: "140px" }}>
                  <select
                    className="form-select ps-5"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as any)}
                  >
                    <option value="asc">Artan</option>
                    <option value="desc">Azalan</option>
                  </select>
                  <i className="ti ti-sort-ascending position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 student-filters__actions">
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleResetFilters}
                    title="Filtreleri Sıfırla"
                  >
                    <i className="ti ti-filter-off me-1"></i>
                    Sıfırla
                  </button>
                )}

                <Link to="/students/create" className="btn btn-primary">
                  <i className="ti ti-plus me-1"></i>
                  Yeni Öğrenci
                </Link>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowExportModal(true)}
                  disabled={exporting || listLoading}
                  title="Öğrenci listesini indir"
                >
                  <i className="ti ti-download me-1"></i>
                  İndir
                </button>
              </div>
            </div>
          </div>

          <hr className="my-1 opacity-50" />
          {listLoading && (
            <div className="progress mb-2" style={{ height: '3px' }}>
              <div className="progress-bar progress-bar-animated progress-bar-striped" role="progressbar" style={{ width: '100%' }}></div>
            </div>
          )}

          {showBulkActions && (
            <div className="col-12">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex flex-wrap gap-2">
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowExportModal(true)}
                    >
                      <i className="ti ti-download me-1"></i>
                      İndir
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={downloadImportTemplate}
                      title="Toplu Ekleme Şablonu İndir"
                    >
                      <i className="ti ti-file-download"></i>
                    </button>
                    <label className={`btn btn-outline-secondary mb-0 ${bulkImportUploading ? 'disabled' : ''}`} title="Toplu Ekleme Şablonu Yükle">
                      <i className="ti ti-upload"></i>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        hidden
                        disabled={bulkImportUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          uploadImportTemplate(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input mt-1"
                      type="checkbox"
                      id="bulkDeleteAlsoEmptyClassrooms"
                      checked={bulkDeleteAlsoEmptyClassrooms}
                      onChange={(e) => setBulkDeleteAlsoEmptyClassrooms(e.target.checked)}
                    />
                    <label className="form-check-label small text-muted ms-1" htmlFor="bulkDeleteAlsoEmptyClassrooms">
                      Sınıfları da sil
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleDeleteAll}
                    disabled={bulkDeleting}
                  >
                    <i className="ti ti-trash me-1"></i>
                    Tüm Filtrelenenleri Sil
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="card border">
        <div className="card-body p-0">
          <div className="d-flex justify-content-end px-3 py-2">
            <div className="small text-muted">{listStatsText}</div>
          </div>

          <div className="d-md-none px-3 pb-3 mobile-card-list">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <i className="ti ti-inbox fs-1 d-block mb-2"></i>
                  {searchTerm ? 'Arama kriterlerinize uygun öğrenci bulunamadı.' : 'Henüz öğrenci kaydı bulunmamaktadır.'}
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {filteredStudents.map((student, rowIndex) => {
                  const open = mobileOpenStudentId === student.id;
                  const campus = getCampusName(student);
                  const level = getEducationLevelName(student);
                  const classroom = getClassroomName(student);
                  const birth = formatBirthDate(student.birth_date);
                  const gender = formatGender(student.gender);
                  const contactLines = getContactLines(student);
                  const schoolNo = String(student.school_no ?? '').trim();

                  return (
                    <div key={student.id} className="card border">
                      <button
                        type="button"
                        className="card-body w-100 text-start p-3 border-0 bg-transparent"
                        onClick={() => setMobileOpenStudentId((prev) => (prev === student.id ? null : student.id))}
                        aria-expanded={open}
                      >
                        <div className="d-flex align-items-start justify-content-between gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-semibold text-dark text-truncate">
                              {rowNumberOffset + rowIndex + 1}. {(student.student_name ?? '').toLocaleUpperCase('tr-TR')}
                            </div>
                            <div className="small text-muted mt-1">
                              <span className="badge bg-soft-info text-info me-2">{classroom}</span>
                              <span className="badge bg-soft-secondary text-secondary me-2">{schoolNo || '-'}</span>
                              <span>{campus}</span>
                              <span className="mx-1">•</span>
                              <span>{level}</span>
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
                              <div className="small text-muted">TCKN</div>
                              <div className="font-monospace">{student.tc_no || '-'}</div>
                            </div>

                            {(birth || gender) && (
                              <div className="col-12">
                                <div className="small text-muted">Doğum / Cinsiyet</div>
                                <div>
                                  {[birth, gender].filter(Boolean).join(' • ')}
                                </div>
                              </div>
                            )}

                            {contactLines.length > 0 && (
                              <div className="col-12">
                                <div className="small text-muted mb-1">İletişim</div>
                                <div className="d-flex flex-column gap-1">
                                  {contactLines.map((l, i) => (
                                    <div
                                      key={i}
                                      className={`small ${
                                        l.isLegal
                                          ? 'p-1 px-2 rounded bg-primary-subtle border border-primary-subtle d-flex align-items-center gap-1'
                                          : 'd-flex align-items-center gap-1'
                                      }`}
                                      title={l.isLegal ? 'Yasal Vasi (İlk Aranacak Kişi)' : undefined}
                                    >
                                      <i className={`ti ${l.isLegal ? 'ti-phone-call text-primary fw-bold' : 'ti-phone text-muted'} me-1`}></i>
                                      <span className={l.isLegal ? 'fw-bold text-primary' : 'text-muted'}>{l.label}:</span>{' '}
                                      <a
                                        href={l.value.startsWith('http') || l.value.includes('@') ? undefined : `tel:${l.value}`}
                                        className={l.isLegal ? 'fw-bold text-primary text-decoration-none' : 'text-dark text-decoration-none'}
                                      >
                                        {l.value}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="d-flex gap-2 mt-3">
                            <Link to={`/students/${student.id}`} className="btn btn-outline-primary flex-fill">
                              <i className="ti ti-eye me-1"></i>
                              Detay
                            </Link>
                            <Link to={`/students/${student.id}/edit`} className="btn btn-outline-warning flex-fill">
                              <i className="ti ti-edit me-1"></i>
                              Düzenle
                            </Link>
                            <button
                              type="button"
                              onClick={() => setResetPasswordStudent(student)}
                              className="btn btn-outline-info"
                              title="Şifre Sıfırla"
                            >
                              <i className="ti ti-key"></i>
                            </button>
                          </div>

                          <div className="d-flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student)}
                              className={`btn btn-outline-${student.is_active ? 'secondary' : 'success'}`}
                            >
                              <i className={`ti ti-${student.is_active ? 'user-off' : 'user-check'} me-1`}></i>
                              {student.is_active ? 'Pasife Al' : 'Aktife Al'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id)}
                              className="btn btn-outline-danger"
                            >
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
            )}
          </div>

          <div className="table-responsive d-none d-md-block">
            <table className="table table-striped table-bordered mb-0">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>No</th>
                  <th>Öğrenci</th>
                  <th>TCKN</th>
                  <th>Sınıf</th>
                  <th>Okul No</th>
                  <th>Kampüs/Kademe</th>
                  <th>İletişim</th>
                  <th className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      <div className="text-muted">
                        <i className="ti ti-inbox fs-1 d-block mb-2"></i>
                        {searchTerm ? 'Arama kriterlerinize uygun öğrenci bulunamadı.' : 'Henüz öğrenci kaydı bulunmamaktadır.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, rowIndex) => {
                    return (
                      <tr key={student.id}>
                        <td>
                          <span className="text-muted">{rowNumberOffset + rowIndex + 1}</span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div>
                              <Link
                                to={`/students/${student.id}`}
                                className="fw-bold text-dark text-decoration-none"
                              >
                                {(student.student_name ?? '').toUpperCase()}
                              </Link>
                              {student.birth_date && (
                                <div className="small text-muted">
                                  {new Date(student.birth_date).toLocaleDateString('tr-TR')}
                                  {student.gender && (
                                    <span className="ms-2">
                                      {student.gender === 'male' ? '♂' : '♀'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-monospace">{student.tc_no || '-'}</span>
                        </td>
                        <td>
                          <span className="badge bg-soft-info text-info">
                            {student.classroom?.name || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="font-monospace">{student.school_no || '-'}</span>
                        </td>
                        <td>
                          <div className="small">
                            <div>{student.campus_name ?? student.classroom?.branch?.campus?.name ?? '-'}</div>
                            <div className="text-muted">{student.education_level_name ?? student.classroom?.education_level?.name ?? '-'}</div>
                          </div>
                        </td>
                        <td>
                          <div className="small d-flex flex-column gap-1">
                            {(() => {
                              const gs = student.guardians ?? [];

                              const labelize = (v: unknown) => {
                                const raw = String(v ?? '').trim();
                                if (!raw) return 'Veli';

                                const norm = raw.toLocaleLowerCase('tr-TR');
                                const mapped = (() => {
                                  if (['mother', 'mom', 'anne'].includes(norm)) return 'Anne';
                                  if (['father', 'dad', 'baba'].includes(norm)) return 'Baba';
                                  if (['legal_guardian', 'guardian', 'vasi'].includes(norm)) return 'Vasi';
                                  if (['other', 'diger', 'diğer', 'veli'].includes(norm)) return 'Veli';
                                  return null;
                                })();

                                if (mapped) return mapped;
                                return raw.charAt(0).toLocaleUpperCase('tr-TR') + raw.slice(1);
                              };

                              const sortedGuardians = [...gs].sort((a, b) => {
                                const aLegal = Boolean(a.is_legal_guardian);
                                const bLegal = Boolean(b.is_legal_guardian);
                                if (aLegal && !bLegal) return -1;
                                if (!aLegal && bLegal) return 1;
                                return 0;
                              });

                              const emergencyPhone = student.emergency_contact_info?.phone;
                              const emergencyRelation = student.emergency_contact_info?.relation;

                              const hasGuardiansWithPhone = sortedGuardians.some((g) => Boolean(g?.phone));
                              const anyPhone = hasGuardiansWithPhone || Boolean(emergencyPhone);
                              if (!anyPhone) return <span className="text-muted">-</span>;

                              return (
                                <>
                                  {sortedGuardians.map((g, idx) => {
                                    if (!g?.phone) return null;
                                    const isLegal = Boolean(g.is_legal_guardian);
                                    return (
                                      <div
                                        key={g.id ?? idx}
                                        className={
                                          isLegal
                                            ? 'p-1 px-2 rounded bg-primary-subtle border border-primary-subtle d-flex align-items-center gap-1'
                                            : 'text-muted d-flex align-items-center gap-1 py-0.5'
                                        }
                                        title={isLegal ? 'Yasal Vasi (İlk Aranacak Kişi)' : undefined}
                                      >
                                        <i className={`ti ${isLegal ? 'ti-phone-call text-primary fw-bold' : 'ti-phone text-secondary'}`}></i>
                                        <span className={isLegal ? 'fw-bold text-primary' : 'text-secondary'}>
                                          {labelize(g.relation_type)}:
                                        </span>
                                        <a
                                          href={`tel:${g.phone}`}
                                          className={isLegal ? 'fw-bold text-primary text-decoration-none' : 'text-body text-decoration-none'}
                                        >
                                          {g.phone}
                                        </a>
                                      </div>
                                    );
                                  })}
                                  {emergencyPhone && (
                                    <div className="text-danger-emphasis d-flex align-items-center gap-1 small mt-0.5">
                                      <i className="ti ti-alert-circle text-danger"></i>
                                      <span className="fw-medium">Acil{emergencyRelation ? ` (${emergencyRelation})` : ''}:</span>
                                      <a href={`tel:${emergencyPhone}`} className="text-danger-emphasis text-decoration-none">
                                        {emergencyPhone}
                                      </a>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <Link
                              to={`/students/${student.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Detay"
                            >
                              <i className="ti ti-eye"></i>
                            </Link>
                            <Link
                              to={`/students/${student.id}/edit`}
                              className="btn btn-sm btn-outline-warning"
                              title="Düzenle"
                            >
                              <i className="ti ti-edit"></i>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setResetPasswordStudent(student)}
                              className="btn btn-sm btn-outline-info"
                              title="Şifreyi Sıfırla"
                            >
                              <i className="ti ti-key"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(student)}
                              className={`btn btn-sm btn-outline-${student.is_active ? 'secondary' : 'success'}`}
                              title={student.is_active ? 'Pasife Al' : 'Aktife Al'}
                            >
                              <i className={`ti ti-${student.is_active ? 'user-off' : 'user-check'}`}></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id)}
                              className="btn btn-sm btn-outline-danger"
                              title="Sil"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
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

      {showExportModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Öğrenci Listesi İndir</h5>
                <button type="button" className="btn-close" onClick={() => setShowExportModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    {enforceEducationLevelScope && myEducationLevelIds.length > 0 && (
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div>
                          <div className="fw-semibold">Kademe Kapsamı</div>
                          <div className="text-muted small">Toplu indirme için tüm yetkili kademeleri seçebilirsiniz.</div>
                        </div>
                        <div className="form-check form-switch m-0">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="exportAllMyEducationLevels"
                            checked={exportAllMyEducationLevels}
                            onChange={(e) => setExportAllMyEducationLevels(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="exportAllMyEducationLevels">Tüm Kademeler</label>
                        </div>
                      </div>
                    )}

                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-semibold">Sütun Seçimi</div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAllColumns}>Tümünü Seç</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearAllColumns}>Temizle</button>
                      </div>
                    </div>
                    <div className="row mt-2">
                      {exportColumnOptions.map(col => (
                        <div className="col-md-4" key={col.key}>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`exportCol_${col.key}`}
                              checked={exportColumns.includes(col.key)}
                              onChange={(e) => toggleExportColumn(col.key, e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor={`exportCol_${col.key}`}>{col.label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-muted small mt-2">
                      Not: Yetkiye göre bazı alanlar (ör. TC Kimlik) export’ta otomatik çıkarılabilir.
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowExportModal(false)} disabled={exporting}>İptal</button>
                <button type="button" className="btn btn-primary" onClick={startExport} disabled={exporting}>
                  {exporting ? 'İndiriliyor...' : 'İndir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="modal-backdrop fade show" onClick={() => setShowExportModal(false)}></div>
      )}

      {/* PAGINATION */}
      {pagination && (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="text-muted">
              Toplam {pagination.total} öğrenci (Sayfa {pagination.current_page}/{pagination.last_page})
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="text-muted small">Sayfa Başına</div>
              <select
                className="form-select form-select-sm"
                style={{ width: '140px' }}
                value={perPage}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  setPerPage(Number.isFinite(v) && v > 0 ? v : 30);
                  setCurrentPage(1);
                }}
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={15}>15</option>
                <option value={999}>Hepsi</option>
              </select>
            </div>
          </div>

          {pagination.last_page > 1 && (
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    Önceki
                  </button>
                </li>
                {visiblePages.map(page => (
                  <li key={page} className={`page-item ${page === pagination.current_page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    Sonraki
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}

      <ResetStudentPasswordModal
        isOpen={Boolean(resetPasswordStudent)}
        onClose={() => setResetPasswordStudent(null)}
        student={resetPasswordStudent}
      />
    </div>
  );
};

export default StudentList;
