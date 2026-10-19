import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import PhoneInput from '../../components/common/PhoneInput';
import CityDistrictSelect from '../../components/common/CityDistrictSelect';
import GuardianInput from '../../components/common/GuardianInput';
import Modal from '../../components/common/Modal';
import ResetStudentPasswordModal from '../../components/students/ResetStudentPasswordModal';

interface Option {
  id: number;
  name: string;
}

interface Guardian {
  id?: number;
  name: string;
  tc_no: string;
  relation_type: 'father' | 'mother' | 'guardian' | 'other';
  phone: string;
  email?: string;
  job?: string;
  is_legal_guardian: boolean;
}

interface StudentFormData {
  // Temel Bilgiler
  student_name: string;
  tc_no: string;
  birth_date: string;
  gender: 'male' | 'female' | '';
  school_no: string;

  // Kurumsal Bilgiler
  campus_id: number;
  education_level_id: number;
  classroom_id: number;

  // Adres Bilgileri
  city_id: number;
  district_id: number;
  address: string;

  // İletişim Bilgileri
  phone: string;
  email: string;

  // Durum
  is_active: boolean;

  // Veli Bilgileri
  guardians: Guardian[];
  // Acil durum kişisi
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
}

const StudentForm = ({ studentId }: { studentId?: number }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  // TC anlık doğrulama hata durumları: 'student' | 'guardian_0' | 'guardian_1' ...
  const [tcErrors, setTcErrors] = useState<Record<string, string | null>>({});
  const [tcChecking, setTcChecking] = useState<Record<string, boolean>>({}); 
  const [campuses, setCampuses] = useState<Option[]>([]);
  const [educationLevels, setEducationLevels] = useState<Option[]>([]);
  const [classrooms, setClassrooms] = useState<Option[]>([]);

  // Copy from Season states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySeasons, setCopySeasons] = useState<any[]>([]);
  const [selectedCopySeason, setSelectedCopySeason] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [upgradeGrade, setUpgradeGrade] = useState(false);
  const [modalEducationLevelId, setModalEducationLevelId] = useState('');
  const [modalCampusId, setModalCampusId] = useState('');
  const [modalClassroomId, setModalClassroomId] = useState('');
  const [modalClassrooms, setModalClassrooms] = useState<any[]>([]);
  const [modalEducationLevels, setModalEducationLevels] = useState<any[]>([]);

  // Sibling states
  const [selectedSiblings, setSelectedSiblings] = useState<any[]>([]);
  const [showSiblingModal, setShowSiblingModal] = useState(false);
  const [siblingSearch, setSiblingSearch] = useState('');
  const [siblingSearchResults, setSiblingSearchResults] = useState<any[]>([]);
  const [searchingSiblings, setSearchingSiblings] = useState(false);

  const [formData, setFormData] = useState<StudentFormData>({
    student_name: '',
    tc_no: '',
    birth_date: '',
    gender: '',
    school_no: '',
    campus_id: 0,
    education_level_id: 0,
    classroom_id: 0,
    city_id: 0,
    district_id: 0,
    address: '',
    phone: '',
    email: '',
    is_active: true,
    guardians: [],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: ''
  });

  const createEmptyGuardian = (relation_type: Guardian['relation_type'], is_legal: boolean = false): Guardian => ({
    name: '',
    tc_no: '',
    relation_type,
    phone: '',
    email: '',
    job: '',
    is_legal_guardian: is_legal,
  });

  const [mother, setMother] = useState<Guardian>(createEmptyGuardian('mother', true));
  const [motherUnavailable, setMotherUnavailable] = useState(false);

  const [father, setFather] = useState<Guardian>(createEmptyGuardian('father', false));
  const [fatherUnavailable, setFatherUnavailable] = useState(false);

  const [otherGuardians, setOtherGuardians] = useState<Guardian[]>([]);

  const parseGuardiansFromStudent = (studentGuardians: any[], isCopy: boolean = false) => {
    const normalizeRelationType = (value: any): Guardian['relation_type'] => {
      const raw = String(value ?? '').toLowerCase().trim();
      if (['father', 'baba', 'dad'].includes(raw)) return 'father';
      if (['mother', 'anne', 'mom'].includes(raw)) return 'mother';
      if (['guardian', 'vasi', 'veli', 'legal_guardian'].includes(raw)) return 'guardian';
      return 'other';
    };

    const normalizeGuardian = (g: any): Guardian => ({
      id: isCopy ? undefined : g?.id,
      name: g?.name ?? '',
      tc_no: g?.tc_no ?? '',
      relation_type: normalizeRelationType(g?.relation_type ?? g?.pivot?.relation_type ?? 'other'),
      phone: g?.phone ?? '',
      email: g?.email ?? '',
      job: g?.job ?? '',
      is_legal_guardian: Boolean(g?.is_legal_guardian ?? g?.pivot?.is_legal_guardian ?? false),
    });

    const list = Array.isArray(studentGuardians) ? studentGuardians.map(normalizeGuardian) : [];

    let foundMother = list.find(g => g.relation_type === 'mother');
    let foundFather = list.find(g => g.relation_type === 'father');
    let remaining = list.filter(g => g !== foundMother && g !== foundFather);

    // Eski kayıtlarda relation_type açık seçilmemişse 1. veli anne, 2. veli baba olarak eşlensin
    if (!foundMother && remaining.length > 0 && remaining[0].relation_type !== 'guardian') {
      foundMother = { ...remaining[0], relation_type: 'mother' };
      remaining = remaining.slice(1);
    }
    if (!foundFather && remaining.length > 0 && remaining[0].relation_type !== 'guardian') {
      foundFather = { ...remaining[0], relation_type: 'father' };
      remaining = remaining.slice(1);
    }

    if (foundMother) {
      setMother(foundMother);
      setMotherUnavailable(false);
    } else {
      setMother(createEmptyGuardian('mother', false));
      setMotherUnavailable(list.length > 0);
    }

    if (foundFather) {
      setFather(foundFather);
      setFatherUnavailable(false);
    } else {
      setFather(createEmptyGuardian('father', false));
      setFatherUnavailable(list.length > 0 && !foundMother);
    }

    setOtherGuardians(remaining);
  };

  useEffect(() => {
    fetchCampuses();

    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  useEffect(() => {
    if (showCopyModal && copySeasons.length === 0) {
      fetchSeasons();
    }
  }, [showCopyModal]);

  useEffect(() => {
    if (selectedCopySeason) {
      fetchModalFilters();
      setModalEducationLevelId('');
      setModalCampusId(''); // Reset campus too
      setModalClassroomId('');
    }
  }, [selectedCopySeason]);

  // Consolidate all search triggers into one debounced effect
  useEffect(() => {
    if (!showCopyModal || !selectedCopySeason) return;

    const timer = setTimeout(() => {
      handleSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [showCopyModal, studentSearch, selectedCopySeason, modalCampusId, modalEducationLevelId, modalClassroomId]);

  const fetchModalFilters = async () => {
    try {
      // Kademeler zaten global
      const levelsRes = await axiosClient.get('/education-levels');
      const levelsData = levelsRes.data.data?.education_levels ?? levelsRes.data.education_levels ?? (Array.isArray(levelsRes.data.data) ? levelsRes.data.data : []);
      setModalEducationLevels(levelsData);

      // Her zaman aktif sezonun (güncel) sınıfları gelsin - kullanıcı karmaşasını önlemek için
      const classroomsRes = await axiosClient.get(`/classrooms?per_page=500`);
      const classroomsData = classroomsRes.data.data?.classrooms ?? classroomsRes.data.classrooms ?? (Array.isArray(classroomsRes.data.data) ? classroomsRes.data.data : []);
      setModalClassrooms(classroomsData);
      console.log('Modal Classrooms Loaded:', classroomsData.length);
    } catch (error) {
      console.error('Modal filter fetch failed:', error);
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await axiosClient.get('/seasons');
      const data = response.data.data ?? response.data;
      setCopySeasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Sezonlar yüklenemedi');
    }
  };

  const filteredModalClassrooms = useMemo(() => {
    if (!modalEducationLevelId) return modalClassrooms;
    return modalClassrooms.filter(c => 
      c.education_level_id === parseInt(modalEducationLevelId) || 
      String(c.grade_level) === String(modalEducationLevelId)
    );
  }, [modalClassrooms, modalEducationLevelId]);

  useEffect(() => {
    if (showCopyModal && selectedCopySeason) {
      handleSearch();
    }
  }, [showCopyModal, selectedCopySeason, modalCampusId, modalEducationLevelId, modalClassroomId]);

  const handleSearch = async () => {
    if (!selectedCopySeason) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      let url = `/students?search=${studentSearch}&season_id=${selectedCopySeason}&is_active=1&per_page=1000`;
      if (modalCampusId) url += `&campus_id=${modalCampusId}`;
      if (modalEducationLevelId) url += `&education_level_id=${modalEducationLevelId}`;
      if (modalClassroomId) url += `&classroom_id=${modalClassroomId}`;
      
      const response = await axiosClient.get(url);
      const data = response.data.data?.students ?? response.data.students ?? response.data.data ?? response.data;
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkCopy = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('error', 'Lütfen en az bir öğrenci seçin.');
      return;
    }

    // Eğer sadece 1 kişi seçiliyse ve kullanıcı direkt butona bastıysa, 
    // acaba formu mu doldurmak istiyor yoksa direkt aktarmak mı?
    // Kullanıcı talebine göre "çekebilsin" dediği için direkt aktaracağız.
    // Ancak 1 kişi için formu doldurma özelliği de kalsın diye satıra tıklatıyoruz.

    try {
      setSaving(true);
      const res = await axiosClient.post('/students/bulk-copy-from-season', {
        student_ids: selectedStudentIds,
        source_season_id: selectedCopySeason,
        upgrade_grade: upgradeGrade
      });

      const transferred = res.data?.data?.transferred ?? selectedStudentIds.length;
      const skipped = res.data?.data?.skipped ?? 0;
      const message = skipped > 0
        ? `${transferred} öğrenci aktarıldı, ${skipped} öğrenci zaten kayıtlı olduğu için atlandı.`
        : `${transferred} öğrenci başarıyla yeni sezona aktarıldı.`;

      showToast(transferred > 0 ? 'success' : 'warning', message);
      setShowCopyModal(false);
      
      // Eğer çoklu aktarım yapıldıysa listeye yönlendir
      if (selectedStudentIds.length > 0) {
        navigate('/students');
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Aktarım başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySelect = async (origStudentId: number) => {
    // Bu fonksiyon hala 1 kişiyi forma DOLDURMAK için kullanılabilir.
    // Satırın yanındaki düğmeye basarak veya satıra tıklayarak formu doldurabiliriz.
    try {
      setLoading(true);
      setShowCopyModal(false);
      const response = await axiosClient.get(`/students/${origStudentId}?season_id=${selectedCopySeason}`);
      const student = response.data.data?.student || response.data.student || response.data.data || response.data;

      // Normalize logic (same as fetchStudent)
      const normalizeGender = (value: any): StudentFormData['gender'] => {
        const raw = String(value ?? '').toLowerCase().trim();
        if (['m', 'male', 'man', 'erkek', 'bay'].includes(raw)) return 'male';
        if (['f', 'female', 'woman', 'kiz', 'kadin', 'bayan'].includes(raw)) return 'female';
        return '';
      };

      parseGuardiansFromStudent(student.guardians, true);

      setFormData(prev => ({
        ...prev,
        student_name: student.student_name || student.name || '',
        tc_no: student.tc_no || '',
        birth_date: student.birth_date ? (student.birth_date.split('T')[0] || student.birth_date.split(' ')[0]) : '',
        gender: normalizeGender(student.gender),
        school_no: student.school_no || '',
        // Don't copy campus/classroom necessarily, but maybe user wants it?
        // Let's keep existing campus/kademe if already selected, or just leave at 0
        phone: student.phone || '',
        email: student.email || '',
        guardians: [],
        emergency_contact_name: (student.emergency_contact_info as any)?.name || '',
        emergency_contact_phone: (student.emergency_contact_info as any)?.phone || '',
        emergency_contact_relation: (student.emergency_contact_info as any)?.relation || ''
      }));

      showToast('success', 'Öğrenci bilgileri kopyalandı. Lütfen yeni kampüs ve sınıf atamasını yapın.');
    } catch (error) {
      showToast('error', 'Öğrenci kopyalanamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.campus_id) {
      fetchEducationLevels(formData.campus_id);
    } else {
      setEducationLevels([]);
      setFormData(prev => ({ ...prev, education_level_id: 0, classroom_id: 0 }));
    }
  }, [formData.campus_id]);

  useEffect(() => {
    if (formData.education_level_id) {
      fetchClassrooms(formData.education_level_id);
    } else {
      setClassrooms([]);
      setFormData(prev => ({ ...prev, classroom_id: 0 }));
    }
  }, [formData.education_level_id]);

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      const data = response.data.data?.campuses || response.data.campuses || response.data.data || response.data;
      setCampuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kampüsler yüklenemedi:', error);
      setCampuses([]);
    }
  };

  const fetchEducationLevels = async (campusId: number) => {
    try {
      const response = await axiosClient.get(`/education-levels?campus_id=${campusId}`);
      const data = response.data.data?.education_levels || response.data.education_levels || response.data.data || response.data;
      setEducationLevels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Kademe bilgileri yüklenemedi:', error);
      setEducationLevels([]);
    }
  };

  const fetchClassrooms = async (educationLevelId: number) => {
    try {
      const response = await axiosClient.get(`/classrooms?education_level_id=${educationLevelId}`);
      let data = response.data.data?.classrooms || response.data.classrooms || response.data.data || response.data;
      const list = Array.isArray(data) ? data : [];

      const byLevel = list.filter(
        (c: { grade_level?: number; education_level_id?: number }) =>
          c.grade_level == educationLevelId || c.education_level_id == educationLevelId
      );

      const userData = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      const isSuperAdmin = userData.is_superadmin || userData.role_name === 'SuperAdmin';

      if (isSuperAdmin) {
        setClassrooms(byLevel);
        return;
      }

      try {
        const userClassroomsResponse = await axiosClient.get('/user/classrooms');
        const userClassrooms = userClassroomsResponse.data?.data?.classrooms ?? userClassroomsResponse.data?.classrooms ?? userClassroomsResponse.data?.data ?? userClassroomsResponse.data;
        const userClassroomIds = Array.isArray(userClassrooms) ? userClassrooms.map((c: { id: number }) => c.id) : [];
        const filtered = userClassroomIds.length > 0
          ? byLevel.filter((c: { id: number }) => userClassroomIds.includes(c.id))
          : byLevel;
        setClassrooms(filtered);
      } catch {
        setClassrooms(byLevel);
      }
    } catch (error) {
      console.error('Sınıflar yüklenemedi:', error);
      setClassrooms([]);
    }
  };

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/${studentId}`);

      // Backend'den gelen veri formatı: { data: { student: {...} } }
      const student = response.data.data?.student || response.data.student || response.data.data || response.data;

      console.log('Öğrenci verisi:', student); // Debug için

      // Kampüs ve kademe: API artık root'ta campus_id, education_level_id dönüyor; yoksa classroom içinden al
      const campusId = student.campus_id ?? student.classroom?.branch?.campus?.id ?? 0;
      const educationLevelId = student.education_level_id ?? student.classroom?.education_level?.id ?? student.classroom?.grade_level ?? 0;

      const normalizeGender = (value: any): StudentFormData['gender'] => {
        const raw = String(value ?? '').toLowerCase().trim();
        if (!raw) return '';
        const clean = raw
          .replace(/[\s\-_.]/g, '')
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c');

        if (['m', 'male', 'man', 'erkek', 'bay'].includes(clean)) return 'male';
        if (['f', 'female', 'woman', 'kiz', 'kadin', 'bayan'].includes(clean)) return 'female';
        return '';
      };

      parseGuardiansFromStudent(student.guardians, false);

      setFormData({
        student_name: student.student_name || student.name || '',
        tc_no: student.tc_no || '',
        birth_date: student.birth_date ? (student.birth_date.split('T')[0] || student.birth_date.split(' ')[0]) : '',
        gender: normalizeGender(student.gender),
        school_no: student.school_no || '',
        campus_id: campusId,
        education_level_id: educationLevelId,
        classroom_id: student.classroom_id || 0,
        city_id: student.city_id || 0,
        district_id: student.district_id || 0,
        address: student.address || '',
        phone: student.phone || '',
        email: student.email || '',
        is_active: student.is_active ?? true,
        guardians: [],
        emergency_contact_name: (student.emergency_contact_info as any)?.name || '',
        emergency_contact_phone: (student.emergency_contact_info as any)?.phone || '',
        emergency_contact_relation: (student.emergency_contact_info as any)?.relation || ''
      });

      // Eğer campus_id varsa, education levels'ı yükle
      if (campusId) {
        await fetchEducationLevels(campusId);
      }

      // Eğer education_level_id varsa, classrooms'ı yükle
      if (educationLevelId) {
        await fetchClassrooms(educationLevelId);
      }

      const sibs = Array.isArray(student.siblings) ? student.siblings : [];
      setSelectedSiblings(sibs);

      setLoading(false);
    } catch (error: any) {
      console.error('Öğrenci bilgileri yüklenemedi:', error);
      const errorMessage = error.response?.data?.message || 'Öğrenci bilgileri yüklenemedi';
      showToast('error', errorMessage);
      setLoading(false);
    }
  };

  const handleSearchSiblings = async () => {
    if (!siblingSearch.trim()) {
      setSiblingSearchResults([]);
      return;
    }
    try {
      setSearchingSiblings(true);
      const res = await axiosClient.get(`/students?search=${encodeURIComponent(siblingSearch.trim())}&per_page=20`);
      const list = res.data?.data?.students || res.data?.students || res.data?.data || [];
      const filtered = (Array.isArray(list) ? list : []).filter(
        (s: any) => s.id !== studentId && !selectedSiblings.some((sel) => sel.id === s.id)
      );
      setSiblingSearchResults(filtered);
    } catch (err) {
      console.error('Kardeş arama hatası:', err);
    } finally {
      setSearchingSiblings(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name === 'campus_id' || name === 'education_level_id' || name === 'classroom_id' || name === 'city_id' || name === 'district_id') {
      processedValue = Number(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleTcNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, tc_no: value }));
    // Temizle (yeniden yazmaya başlandığında)
    if (tcErrors['student'] !== undefined) {
      setTcErrors(prev => ({ ...prev, student: undefined as any }));
    }
  };

  const validateTcField = async (field: 'student' | 'mother' | 'father' | `other_${number}`, tcValue: string) => {
    if (tcValue.length !== 11) return;
    setTcChecking(prev => ({ ...prev, [field]: true }));
    try {
      const payload: any = {};
      if (field === 'student') {
        payload.tc_no = tcValue;
        const filledTcs: { tc_no: string }[] = [];
        if (!motherUnavailable && mother.tc_no?.length === 11) filledTcs.push({ tc_no: mother.tc_no });
        if (!fatherUnavailable && father.tc_no?.length === 11) filledTcs.push({ tc_no: father.tc_no });
        otherGuardians.forEach(og => {
          if (og.tc_no?.length === 11) filledTcs.push({ tc_no: og.tc_no });
        });
        if (filledTcs.length > 0) {
          payload.guardians = filledTcs;
        }
      } else {
        payload.guardians = [{ tc_no: tcValue }];
      }

      const res = await axiosClient.post('/students/validate-tc', payload);
      const results = res.data?.data?.results ?? {};

      if (field === 'student') {
        setTcErrors(prev => ({ ...prev, student: results['student'] ?? null }));
      } else {
        setTcErrors(prev => ({ ...prev, [field]: results['guardian_0'] ?? null }));
      }
    } catch {
      // Ağ hatası – sessizce geç
    } finally {
      setTcChecking(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAddOtherGuardian = () => {
    setOtherGuardians(prev => [
      ...prev,
      createEmptyGuardian('guardian', false)
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Referans: Zorunlu – Ad Soyad, Okul No, Sınıf, Öğrenci TC/Doğum Tarihi/Cinsiyet
      if (!formData.student_name.trim()) {
        showToast('error', 'Ad soyad zorunludur.');
        setSaving(false);
        return;
      }
      if (!formData.school_no.trim()) {
        showToast('error', 'Okul numarası zorunludur.');
        setSaving(false);
        return;
      }
      if (!formData.classroom_id) {
        showToast('error', 'Sınıf seçimi zorunludur.');
        setSaving(false);
        return;
      }
      if (!formData.tc_no || formData.tc_no.length !== 11) {
        showToast('error', 'Öğrenci TC Kimlik No zorunludur (11 hane).');
        setSaving(false);
        return;
      }
      if (!formData.birth_date) {
        showToast('error', 'Doğum tarihi zorunludur.');
        setSaving(false);
        return;
      }
      if (!formData.gender) {
        showToast('error', 'Cinsiyet zorunludur.');
        setSaving(false);
        return;
      }

      const isGuardianFilled = (g: Guardian) => {
        return Boolean(
          (g.name && g.name.trim() !== '') ||
          (g.tc_no && g.tc_no.trim() !== '') ||
          (g.phone && g.phone.trim() !== '') ||
          (g.email && g.email.trim() !== '') ||
          (g.job && g.job.trim() !== '') ||
          g.id
        );
      };

      const finalGuardians: Guardian[] = [];

      // 1. Anne
      if (!motherUnavailable && isGuardianFilled(mother)) {
        if (!mother.name || !mother.name.trim()) {
          showToast('error', 'Anne için Ad Soyad alanı zorunludur.');
          setSaving(false);
          return;
        }
        finalGuardians.push({
          ...mother,
          name: mother.name.trim(),
          tc_no: (mother.tc_no || '').trim(),
          phone: (mother.phone || '').trim(),
          email: (mother.email || '').trim(),
          job: (mother.job || '').trim(),
          relation_type: 'mother',
        });
      }

      // 2. Baba
      if (!fatherUnavailable && isGuardianFilled(father)) {
        if (!father.name || !father.name.trim()) {
          showToast('error', 'Baba için Ad Soyad alanı zorunludur.');
          setSaving(false);
          return;
        }
        finalGuardians.push({
          ...father,
          name: father.name.trim(),
          tc_no: (father.tc_no || '').trim(),
          phone: (father.phone || '').trim(),
          email: (father.email || '').trim(),
          job: (father.job || '').trim(),
          relation_type: 'father',
        });
      }

      // 3. Vasi / Diğer Veliler
      for (let i = 0; i < otherGuardians.length; i++) {
        const og = otherGuardians[i];
        if (isGuardianFilled(og)) {
          if (!og.name || !og.name.trim()) {
            showToast('error', `${i + 1}. Vasi / Diğer Veli için Ad Soyad alanı zorunludur.`);
            setSaving(false);
            return;
          }
          finalGuardians.push({
            ...og,
            name: og.name.trim(),
            tc_no: (og.tc_no || '').trim(),
            phone: (og.phone || '').trim(),
            email: (og.email || '').trim(),
            job: (og.job || '').trim(),
            relation_type: og.relation_type || 'guardian',
          });
        }
      }

      if (finalGuardians.length === 0) {
        showToast('error', 'En az bir veli (Anne, Baba veya Vasi) bilgisi girilmelidir.');
        setSaving(false);
        return;
      }

      const payload: any = {
        student_name: formData.student_name.trim(),
        school_no: formData.school_no.trim(),
        classroom_id: formData.classroom_id,
        is_active: formData.is_active,
        tc_no: formData.tc_no,
        birth_date: formData.birth_date,
        gender: formData.gender,
      };

      // Opsiyonel alanlar (referans: şehir vb.)
      if (formData.city_id && formData.city_id > 0) payload.city_id = formData.city_id;
      if (formData.district_id && formData.district_id > 0) payload.district_id = formData.district_id;
      payload.address = formData.address ? formData.address.trim() : null;
      payload.phone = formData.phone ? formData.phone.trim() : null;
      payload.email = formData.email ? formData.email.trim() : null;
      if (formData.campus_id) payload.campus_id = formData.campus_id;
      if (formData.education_level_id) payload.education_level_id = formData.education_level_id;

      payload.guardians = finalGuardians;
      const emergencyName = (formData.emergency_contact_name || '').trim();
      const emergencyPhone = (formData.emergency_contact_phone || '').trim();
      const emergencyRelation = (formData.emergency_contact_relation || '').trim();
      if (emergencyName || emergencyPhone || emergencyRelation) {
        payload.emergency_contact_info = {
          name: emergencyName,
          phone: emergencyPhone,
          relation: emergencyRelation,
        };
      } else {
        payload.emergency_contact_info = null;
      }

      payload.sibling_ids = selectedSiblings.map((s: any) => s.id);

      await (studentId
        ? axiosClient.put(`/students/${studentId}`, payload)
        : axiosClient.post('/students', payload));

      showToast('success', studentId ? 'Öğrenci başarıyla güncellendi!' : 'Öğrenci başarıyla eklendi!');

      setTimeout(() => {
        navigate('/students');
      }, 1500);
    } catch (error: any) {
      console.error('İşlem başarısız:', error);

      let errorMessage = 'İşlem sırasında bir hata oluştu.';

      if (error.response?.status === 422) {
        const errors: Record<string, string[]> = error.response.data?.errors || {};

        // Alan adlarını Türkçeye çevir
        const fieldLabels: Record<string, string> = {
          tc_no: 'Öğrenci TC Kimlik No',
          student_name: 'Ad Soyad',
          school_no: 'Okul Numarası',
          birth_date: 'Doğum Tarihi',
          gender: 'Cinsiyet',
          classroom_id: 'Sınıf',
          email: 'E-posta',
          phone: 'Telefon',
        };

        const allErrors: string[] = [];
        Object.entries(errors).forEach(([field, messages]) => {
          const guardianTcMatch = field.match(/^guardians\.(\d+)\.tc_no$/);
          const guardianFieldMatch = field.match(/^guardians\.(\d+)\.(.+)$/);
          let label = '';
          if (guardianTcMatch) {
            const idx = Number(guardianTcMatch[1]);
            const gPrefix = idx === 0 && !motherUnavailable ? 'Anne' : idx === 1 && !fatherUnavailable ? 'Baba' : `${idx + 1}. Veli`;
            label = `${gPrefix} TC Kimlik No`;
          } else if (guardianFieldMatch) {
            const idx = Number(guardianFieldMatch[1]);
            const subField = guardianFieldMatch[2];
            const subLabels: Record<string, string> = { name: 'İsim', email: 'E-posta', phone: 'Telefon', tc_no: 'TC', job: 'Meslek' };
            const gPrefix = idx === 0 && !motherUnavailable ? 'Anne' : idx === 1 && !fatherUnavailable ? 'Baba' : `${idx + 1}. Veli`;
            label = `${gPrefix} ${subLabels[subField] || subField}`;
          } else {
            label = fieldLabels[field] || field;
          }
          const msg = (messages as string[]).join(', ');
          allErrors.push(`${label}: ${msg}`);
        });

        if (allErrors.length > 0) {
          errorMessage = allErrors.join('\n');
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.response?.data?.message) {
        let msg = String(error.response.data.message);
        if (
          msg.includes('SQLSTATE') ||
          msg.includes('QueryException') ||
          msg.includes('violation:') ||
          msg.includes('Column') ||
          msg.includes('Integrity constraint')
        ) {
          if (msg.includes("'name'") || msg.includes('guardians')) {
            msg = 'Veli adı soyadı alanı boş bırakılamaz. Lütfen veli bilgilerini kontrol ediniz.';
          } else if (msg.includes('Duplicate entry')) {
            msg = 'Bu T.C. Kimlik Numarası veya Okul Numarası sistemde zaten mevcuttur.';
          } else {
            msg = 'Öğrenci kaydedilirken bir hata oluştu. Lütfen girdiğiniz bilgileri kontrol edip tekrar deneyiniz.';
          }
        }
        errorMessage = msg;
      }

      showToast('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary"></div>
        <div className="mt-2">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* BAŞLIK */}
      <div className="page-title-head d-flex align-items-center mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">
            {studentId ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
          </h4>
          <small className="text-muted">
            {studentId ? 'Öğrenci bilgilerini güncelleyin' : 'Yeni öğrenci kaydı oluşturun'}
          </small>
        </div>
        <div className="d-flex gap-2">
          {!studentId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCopyModal(true)}
            >
              <i className="ti ti-copy me-2"></i>
              Sezondan Kopyala
            </button>
          )}
          {studentId && (
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => setShowResetPasswordModal(true)}
            >
              <i className="ti ti-key me-2"></i>
              Şifre Sıfırla
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost-secondary"
            onClick={() => navigate('/students')}
          >
            <i className="ti ti-arrow-left me-2"></i>
            Geri
          </button>
        </div>
      </div>

      {/* Copy Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        title="Sezondan Öğrenci Kopyala"
        size="lg"
      >
        <div className="p-3">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Sezon Seçin</label>
              <select
                className="form-select"
                value={selectedCopySeason}
                onChange={(e) => setSelectedCopySeason(e.target.value)}
              >
                <option value="">Seçiniz...</option>
                {copySeasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.year}</option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label">Öğrenci Ara</label>
              <div className="input-group">
                <span className="input-group-text"><i className="ti ti-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="İsim, Okul No veya TC No ile ara..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  disabled={!selectedCopySeason}
                />
              </div>
            </div>

            {selectedCopySeason && (
              <>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Kampüs Filtresi</label>
                  <select
                    className="form-select form-select-sm"
                    value={modalCampusId}
                    onChange={(e) => {
                      setModalCampusId(e.target.value);
                      setModalEducationLevelId('');
                      setModalClassroomId('');
                    }}
                  >
                    <option value="">Tüm Kampüsler</option>
                    {campuses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Kademe Filtresi</label>
                  <select
                    className="form-select form-select-sm"
                    value={modalEducationLevelId}
                    onChange={(e) => {
                      setModalEducationLevelId(e.target.value);
                      setModalClassroomId('');
                    }}
                  >
                    <option value="">Tüm Kademeler</option>
                    {modalEducationLevels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Sınıf Filtresi</label>
                  <select
                    className="form-select form-select-sm"
                    value={modalClassroomId}
                    onChange={(e) => setModalClassroomId(e.target.value)}
                  >
                    <option value="">Tüm Sınıflar</option>
                    {filteredModalClassrooms.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Tümünü Seç */}
          {searchResults.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-2 mb-1 px-1">
              <span className="small text-muted">{searchResults.length} öğrenci listelendi</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  const allSelected = searchResults.every(s => selectedStudentIds.includes(s.id));
                  if (allSelected) {
                    setSelectedStudentIds(prev => prev.filter(id => !searchResults.some(s => s.id === id)));
                  } else {
                    const newIds = searchResults.map(s => s.id);
                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...newIds])));
                  }
                }}
              >
                {searchResults.every(s => selectedStudentIds.includes(s.id)) ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
            </div>
          )}

          <div className="search-results-list mt-1" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', position: 'relative' }}>
            {searching && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255,255,255,0.4)', zIndex: 10 }}>
                <div className="spinner-border spinner-border-sm text-primary"></div>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="list-group list-group-flush">
                {searchResults.map(s => (
                  <div
                    key={s.id}
                    className="list-group-item py-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleStudentSelection(s.id)}
                  >
                    <div className="row align-items-center">
                      <div className="col-auto">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={() => {}}
                          />
                        </div>
                      </div>
                      
                      {/* 1. Sütun: Ad Soyad ve TC */}
                      <div className="col-md-5">
                        <div className="fw-bold text-primary mb-0">{s.student_name}</div>
                        <div className="small text-muted" style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                          TC: {s.tc_no}
                        </div>
                      </div>

                      {/* 2. Sütun: Sınıf */}
                      <div className="col-md-3">
                        <div className="small text-muted mb-0" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Sınıf</div>
                        <div className="fw-medium text-dark">
                          {s.classroom?.name || <span className="text-muted small">Sınıf Yok</span>}
                        </div>
                      </div>

                      {/* 3. Sütun: Okul No */}
                      <div className="col-md-2">
                        <div className="small text-muted mb-0" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>No</div>
                        <div className="fw-medium text-dark">
                          {s.school_no || <span className="text-muted">-</span>}
                        </div>
                      </div>

                      {/* Aksiyon */}
                      <div className="col-auto ms-auto">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySelect(s.id);
                          }}
                        >
                          Seç
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!searching && selectedCopySeason && searchResults.length === 0 && (
              <div className="text-center p-4 text-muted">Arama kriterlerine uygun öğrenci bulunamadı.</div>
            )}
            {!selectedCopySeason && (
              <div className="text-center p-5 text-info">
                <i className="ti ti-info-circle fs-2 d-block mb-2"></i>
                Lütfen önce verilerin çekileceği sezonu seçin.
              </div>
            )}
          </div>
          
          {selectedStudentIds.length > 0 && (
            <div className="mt-3 p-3 bg-light rounded d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="form-check me-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="upgradeGradeCheck"
                    checked={upgradeGrade}
                    onChange={(e) => setUpgradeGrade(e.target.checked)}
                  />
                  <label className="form-check-label small fw-bold text-primary" htmlFor="upgradeGradeCheck" style={{ cursor: 'pointer' }}>
                    Sınıf Yükselt (+1)
                  </label>
                </div>
                <strong>{selectedStudentIds.length}</strong> öğrenci seçildi
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBulkCopy}
                disabled={saving}
              >
                {saving ? 'Aktarılıyor...' : 'Seçilenleri Yeni Sezona Aktar'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Sibling Search Modal */}
      <Modal
        isOpen={showSiblingModal}
        onClose={() => setShowSiblingModal(false)}
        title="Kardeş Öğrenci Seç"
        size="lg"
      >
        <div className="p-3">
          <div className="mb-3">
            <label className="form-label fw-bold">Öğrenci Ara</label>
            <div className="input-group">
              <span className="input-group-text"><i className="ti ti-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Öğrenci adı, TC No veya okul no ile ara..."
                value={siblingSearch}
                onChange={(e) => setSiblingSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSiblings();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSearchSiblings}
                disabled={searchingSiblings}
              >
                {searchingSiblings ? <span className="spinner-border spinner-border-sm me-1"></span> : 'Ara'}
              </button>
            </div>
            <small className="text-muted">Aramak için isim veya TC yazıp Ara'ya tıklayın veya Enter'a basın.</small>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {searchingSiblings ? (
              <div className="text-center py-4">
                <span className="spinner-border text-primary"></span>
                <p className="mt-2 text-muted small">Öğrenciler aranıyor...</p>
              </div>
            ) : siblingSearchResults.length > 0 ? (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Öğrenci</th>
                    <th>TC No</th>
                    <th>Okul No</th>
                    <th>Sınıf</th>
                    <th className="text-end" style={{ width: '90px' }}>Ekle</th>
                  </tr>
                </thead>
                <tbody>
                  {siblingSearchResults.map((st: any) => (
                    <tr key={st.id}>
                      <td className="fw-semibold">
                        <div className="d-flex align-items-center gap-2">
                          <span className="avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-xs">
                            {(st.student_name || st.name || 'Ö').charAt(0)}
                          </span>
                          <span>{st.student_name || st.name}</span>
                        </div>
                      </td>
                      <td>{st.tc_no || '—'}</td>
                      <td>{st.school_no || '—'}</td>
                      <td>{st.classroom?.name || st.classroom || '—'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedSiblings(prev => [...prev, st]);
                            setSiblingSearchResults(prev => prev.filter(s => s.id !== st.id));
                            showToast('success', `${st.student_name || st.name} kardeş olarak eklendi.`);
                          }}
                        >
                          <i className="ti ti-plus me-1"></i> Ekle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : siblingSearch.trim().length >= 2 ? (
              <div className="text-center py-4 text-muted">
                <i className="ti ti-search-off fs-1 d-block mb-2"></i>
                Aramanıza uygun öğrenci bulunamadı.
              </div>
            ) : (
              <div className="text-center py-4 text-muted">
                <i className="ti ti-users fs-1 d-block mb-2 text-secondary"></i>
                Öğrenci aramak için yukarıdaki kutuya en az 2 karakter yazıp Ara'ya tıklayın.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* SOL KOLON: Temel Bilgiler */}
          <div className="col-lg-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-user me-2"></i>
                  Temel Bilgiler
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    Ad Soyad <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="student_name"
                    value={formData.student_name}
                    onChange={handleInputChange}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Okul No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="school_no"
                      value={formData.school_no}
                      onChange={handleInputChange}
                      placeholder="Örn: 2024001"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">TC Kimlik No <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input
                        type="text"
                        className={`form-control ${
                          tcErrors['student'] === null ? 'is-valid' :
                          tcErrors['student'] ? 'is-invalid' : ''
                        }`}
                        name="tc_no"
                        value={formData.tc_no}
                        onChange={handleTcNoChange}
                        onBlur={() => validateTcField('student', formData.tc_no)}
                        placeholder="11 haneli TC No"
                        maxLength={11}
                      />
                      {tcChecking['student'] && (
                        <span className="input-group-text">
                          <span className="spinner-border spinner-border-sm" />
                        </span>
                      )}
                      {tcErrors['student'] === null && !tcChecking['student'] && formData.tc_no.length === 11 && (
                        <span className="input-group-text text-success"><i className="ti ti-check" /></span>
                      )}
                    </div>
                    {tcErrors['student'] ? (
                      <div className="invalid-feedback d-block"><i className="ti ti-alert-circle me-1" />{tcErrors['student']}</div>
                    ) : tcErrors['student'] === null && formData.tc_no.length === 11 ? (
                      <div className="valid-feedback d-block"><i className="ti ti-circle-check me-1" />Geçerli TC Kimlik No</div>
                    ) : (
                      <small className="form-text text-muted">{formData.tc_no.length}/11 — Alan doldurulduğunda otomatik kontrol edilir</small>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Doğum Tarihi <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Cinsiyet <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">Seçiniz</option>
                      <option value="male">Erkek</option>
                      <option value="female">Kız</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Kurumsal Bilgiler */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-building me-2"></i>
                  Kurumsal Bilgiler
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    Kampüs <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="campus_id"
                    value={formData.campus_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="0">Seçiniz</option>
                    {campuses.map(campus => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Kademe <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="education_level_id"
                    value={formData.education_level_id}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.campus_id}
                  >
                    <option value="0">Önce kampüs seçiniz</option>
                    {educationLevels.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Sınıf <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="classroom_id"
                    value={formData.classroom_id}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.education_level_id}
                  >
                    <option value="0">Önce kademe seçiniz</option>
                    {classrooms.map(classroom => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <label className="form-check-label">Aktif Öğrenci</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ KOLON: İletişim ve Adres */}
          <div className="col-lg-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-phone me-2"></i>
                  İletişim Bilgileri
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Telefon</label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                    placeholder="(5XX) XXX XX XX"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">E-posta</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-map-pin me-2"></i>
                  Adres Bilgileri
                </h5>
              </div>
              <div className="card-body">
                <CityDistrictSelect
                  cityId={formData.city_id}
                  districtId={formData.district_id}
                  onCityChange={(cityId) => setFormData(prev => ({ ...prev, city_id: cityId, district_id: 0 }))}
                  onDistrictChange={(districtId) => setFormData(prev => ({ ...prev, district_id: districtId }))}
                  required={false}
                />
                <div className="mb-3">
                  <label className="form-label">Adres</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Detaylı adres bilgisi"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Veli Bilgileri */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-1">
                    <i className="ti ti-users me-2"></i>
                    Veli Bilgileri
                  </h5>
                  <small className="text-muted">
                    Öğrenci velileri Anne ve Baba olarak sıralı kaydedilir. En az bir veli girilmelidir.
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleAddOtherGuardian}
                >
                  <i className="ti ti-plus me-1"></i>
                  Vasi / Diğer Veli Ekle
                </button>
              </div>
              <div className="card-body">
                {/* 1. Anne Bilgileri */}
                <GuardianInput
                  guardian={mother}
                  onChange={(g) => {
                    setMother(g);
                    if (tcErrors['mother'] !== undefined) {
                      setTcErrors(prev => ({ ...prev, mother: undefined as any }));
                    }
                  }}
                  title="Anne Bilgileri"
                  icon="ti ti-user-heart"
                  badge="1. Veli"
                  lockRelationType={true}
                  showRemove={false}
                  isUnavailable={motherUnavailable}
                  onToggleUnavailable={(checked) => setMotherUnavailable(checked)}
                  unavailableLabel="Anne Bilgisi Yok / Vefat"
                  tcError={tcErrors['mother']}
                  tcChecking={tcChecking['mother']}
                  onTcBlur={(tc) => validateTcField('mother', tc)}
                />

                {/* 2. Baba Bilgileri */}
                <GuardianInput
                  guardian={father}
                  onChange={(g) => {
                    setFather(g);
                    if (tcErrors['father'] !== undefined) {
                      setTcErrors(prev => ({ ...prev, father: undefined as any }));
                    }
                  }}
                  title="Baba Bilgileri"
                  icon="ti ti-user"
                  badge="2. Veli"
                  lockRelationType={true}
                  showRemove={false}
                  isUnavailable={fatherUnavailable}
                  onToggleUnavailable={(checked) => setFatherUnavailable(checked)}
                  unavailableLabel="Baba Bilgisi Yok / Vefat"
                  tcError={tcErrors['father']}
                  tcChecking={tcChecking['father']}
                  onTcBlur={(tc) => validateTcField('father', tc)}
                />

                {/* 3. Vasi / Diğer Veliler (Opsiyonel) */}
                {otherGuardians.map((guardian, index) => (
                  <GuardianInput
                    key={index}
                    guardian={guardian}
                    onChange={(g) => {
                      setOtherGuardians(prev => prev.map((og, i) => i === index ? g : og));
                      if (tcErrors[`other_${index}`] !== undefined) {
                        setTcErrors(prev => ({ ...prev, [`other_${index}`]: undefined as any }));
                      }
                    }}
                    onRemove={() => setOtherGuardians(prev => prev.filter((_, i) => i !== index))}
                    showRemove={true}
                    title={`Vasi / Diğer Veli ${otherGuardians.length > 1 ? index + 1 : ''}`}
                    icon="ti ti-shield"
                    badge="Vasi / Diğer"
                    index={index + 2}
                    emailRequired={false}
                    tcError={tcErrors[`other_${index}`]}
                    tcChecking={tcChecking[`other_${index}`]}
                    onTcBlur={(tc) => validateTcField(`other_${index}`, tc)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Acil Durum Kişisi */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-emergency-bed me-2"></i>
                  Acil Durum Kişisi
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Ad Soyad</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                      placeholder="Acil durumda aranacak kişi"
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Telefon</label>
                    <PhoneInput
                      value={formData.emergency_contact_phone}
                      onChange={(value) => setFormData(prev => ({ ...prev, emergency_contact_phone: value }))}
                      placeholder="(5XX) XXX XX XX"
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Yakınlık</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.emergency_contact_relation}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_relation: e.target.value }))}
                      placeholder="Örn: Anne, Baba, Amca"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kardeş Öğrenciler */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="ti ti-friends me-2"></i>
                  Kardeş Öğrenciler (Opsiyonel)
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setSiblingSearch('');
                    setSiblingSearchResults([]);
                    setShowSiblingModal(true);
                  }}
                >
                  <i className="ti ti-plus me-1"></i>
                  Kardeş Ekle
                </button>
              </div>
              <div className="card-body">
                {selectedSiblings.length === 0 ? (
                  <div className="text-center py-3 text-muted">
                    <i className="ti ti-info-circle me-1"></i>
                    Tanımlanmış kardeş öğrenci bulunmuyor. Birden fazla öğrencisi olan veliler için buradan kardeş tanımlayabilirsiniz.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Öğrenci Adı</th>
                          <th>TC No</th>
                          <th>Okul No</th>
                          <th>Sınıf</th>
                          <th className="text-end" style={{ width: '80px' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSiblings.map((sib: any) => (
                          <tr key={sib.id}>
                            <td className="fw-semibold">
                              <div className="d-flex align-items-center gap-2">
                                <span className="avatar-xs rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-xs">
                                  {(sib.name || sib.student_name || 'Ö').charAt(0)}
                                </span>
                                <span>{sib.name || sib.student_name}</span>
                              </div>
                            </td>
                            <td>{sib.tc_no || '—'}</td>
                            <td>{sib.school_no || '—'}</td>
                            <td>{sib.classroom?.name || sib.classroom || '—'}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost-danger"
                                title="Kaldır"
                                onClick={() => setSelectedSiblings(prev => prev.filter(s => s.id !== sib.id))}
                              >
                                <i className="ti ti-trash fs-sm"></i>
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
          </div>
        </div>

        {/* KAYDET BUTONLARI */}
        <div className="row">
          <div className="col-lg-12">
            <div className="card">
              <div className="card-body">
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/students')}
                  >
                    <i className="ti ti-x me-2"></i>
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-2"></i>
                        {studentId ? 'Güncelle' : 'Kaydet'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {studentId && (
        <ResetStudentPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          student={{
            id: studentId,
            name: formData.student_name,
            tc_no: formData.tc_no,
            school_no: formData.school_no,
          }}
        />
      )}
    </div>
  );
};

export default StudentForm;
