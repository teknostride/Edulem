import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';
import { isTeacher, getMyUserId } from '../../utils/userScope';

interface User {
  id?: number;
  tc_no: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  password?: string;
  role_id: number;
  campus_ids?: number[];
  education_level_ids?: number[];
  is_active: boolean;
  teacher_type?: string; // Öğretmen türü
  subjects?: number[]; // Ders ID'leri
  department?: string; // Bölüm
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  scope?: string; // all, campus, education_level
}

interface Campus {
  id: number;
  name: string;
  is_active: boolean;
}

interface EducationLevel {
  id: number;
  name: string;
  campus_id: number;
  is_active: boolean;
}

interface Lesson {
  id: number;
  name: string;
  code: string;
  description?: string;
  color?: string;
  is_active: boolean;
}

const toUpperTr = (value: string) => {
  const v = (value ?? '').toString();
  return v ? v.toLocaleUpperCase('tr-TR') : '';
};

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [formData, setFormData] = useState<User>({
    tc_no: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    password: '',
    role_id: 0,
    campus_ids: [],
    education_level_ids: [],
    is_active: true,
    teacher_type: '',
    subjects: [],
    department: ''
  });

  // Search states for checkbox lists
  const [campusSearch, setCampusSearch] = useState('');
  const [educationLevelSearch, setEducationLevelSearch] = useState('');
  const [lessonSearch, setLessonSearch] = useState('');
  const [showLessonDropdown, setShowLessonDropdown] = useState(false);

  const isEditMode = !!id;
  const viewerIsTeacher = isTeacher();
  const myUserId = getMyUserId();

  // Öğretmen başka bir kullanıcıyı düzenleyemez, yeni kullanıcı da oluşturamaz
  if (viewerIsTeacher && (!isEditMode || (myUserId !== null && Number(id) !== myUserId))) {
    return (
      <div className="text-center p-5">
        <div className="alert alert-warning">
          <i className="ti ti-lock me-2"></i>
          Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, [id, isEditMode]);

  // Yeni kullanıcı sayfasında e-posta ve şifre her zaman boş başlasın (tarayıcı otomatik doldurmasın)
  useEffect(() => {
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, email: '', password: '' }));
    }
  }, [isEditMode]);

  const fetchData = async () => {
    try {
      // Rolleri getir (API'den; mock ile karıştırma - yanlış role_id kaydedilmesin)
      const rolesResponse = await axiosClient.get('/roles');
      const raw = rolesResponse.data?.data;
      const rolesList = Array.isArray(raw) ? raw : (raw?.roles || rolesResponse.data?.roles || []);
      const mockRoles: Role[] = [
        { id: 3, name: 'Müdür', description: 'Kendi kademesine bakar', scope: 'education_level' },
        { id: 9, name: 'Müdür Yardımcısı', description: 'Müdür yardımcısı - Kendi kademesine bakar', scope: 'education_level' },
        { id: 4, name: 'Öğretmen', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 6, name: 'Rehberlik', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 7, name: 'Öğrenci İşleri', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 8, name: 'Muhasebe', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' }
      ];
      // Gizlenecek rolleri filtrele - Kurum Sahibi (owner) sadece SaaS SuperAdmin tarafından yönetimden atanabilir
      const hiddenRoles = ['Genel Müdür', 'Kampüs Müdürü', 'Sınıf Öğretmeni', 'owner', 'guardian'];
      const filteredApiRoles = rolesList.filter((r: Role) => !hiddenRoles.includes(r.name) && r.name !== 'owner' && r.display_name !== 'Kurum Sahibi');
      const finalRoles = filteredApiRoles.length > 0 ? filteredApiRoles : mockRoles;
      setRoles(finalRoles);

      // Kampüsleri getir (sayfalı)
      const campusesResponse = await axiosClient.get('/campuses', { params: { per_page: 200 } });
      const campusesData = campusesResponse.data?.data?.campuses || campusesResponse.data?.campuses || [];
      setCampuses(Array.isArray(campusesData) ? campusesData : []);

      if (isEditMode && id) {
        // Edit mode - mevcut kullanıcıyı getir
        const userResponse = await axiosClient.get(`/users/${id}`);
        const userData = userResponse.data?.data?.user ?? userResponse.data?.user ?? userResponse.data?.data ?? userResponse.data;
        const normalizedSubjects = Array.isArray(userData.subjects)
          ? userData.subjects
            .map((s: any) => Number(s))
            .filter((s: number) => Number.isFinite(s) && s > 0)
          : [];

        setFormData({
          tc_no: userData.tc_no || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          birth_date: userData.birth_date ? (userData.birth_date.split('T')[0] || userData.birth_date.split(' ')[0]) : '',
          role_id: userData.role_id || 0,
          campus_ids: userData.campus_ids || [],
          education_level_ids: userData.education_level_ids || [],
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          teacher_type: userData.teacher_type || '',
          subjects: normalizedSubjects,
          department: userData.department || ''
        });
      }
    } catch (error) {
      if (isEditMode) {
        console.error('Kullanıcı verisi yüklenemedi:', error);
        showToast('error', 'Kullanıcı verisi yüklenemedi');
        navigate('/users');
        setLoading(false);
        return;
      }

      // Hata durumunda mock data ile devam et
      const mockRoles: Role[] = [
        { id: 3, name: 'Müdür', description: 'Kendi kademesine bakar', scope: 'education_level' },
        { id: 9, name: 'Müdür Yardımcısı', description: 'Müdür yardımcısı - Kendi kademesine bakar', scope: 'education_level' },
        { id: 4, name: 'Öğretmen', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 6, name: 'Rehberlik', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 7, name: 'Öğrenci İşleri', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' },
        { id: 8, name: 'Muhasebe', description: 'Atandığı kampüs ve kademelere bakar', scope: 'campus' }
      ];

      setRoles(mockRoles);

      const mockCampuses: Campus[] = [
        { id: 1, name: 'Merkez Kampüs', is_active: true },
        { id: 2, name: 'Batı Kampüs', is_active: true },
        { id: 3, name: 'Kuzey Kampüs', is_active: true }
      ];

      setCampuses(mockCampuses);

      const mockEducationLevels: EducationLevel[] = [
        { id: 1, name: 'Anaokulu', campus_id: 1, is_active: true },
        { id: 2, name: 'İlkokul', campus_id: 1, is_active: true },
        { id: 3, name: 'Ortaokul', campus_id: 1, is_active: true },
        { id: 4, name: 'Lise', campus_id: 2, is_active: true },
        { id: 5, name: 'Hazırlık', campus_id: 2, is_active: true },
        { id: 6, name: 'Meslek Lisesi', campus_id: 3, is_active: true }
      ];

      setEducationLevels(mockEducationLevels);

      showToast('warning', 'API bağlantısı sağlanamadı, örnek veriler yüklendi');
    }

    setLoading(false);
  };

  useEffect(() => {
    const campusIds = formData.campus_ids || [];
    if (campusIds.length === 0) {
      setEducationLevels([]);
      return;
    }

    let cancelled = false;
    const fetchScopedEducationLevels = async () => {
      try {
        const response = await axiosClient.get('/education-levels', {
          params: {
            campus_ids: campusIds,
            per_page: 200,
          },
        });
        const data = response.data?.data;
        const list = data?.education_levels || response.data?.education_levels || [];
        if (!cancelled) {
          setEducationLevels(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Kademeler yüklenemedi:', error);
          setEducationLevels([]);
        }
      }
    };

    fetchScopedEducationLevels();
    return () => {
      cancelled = true;
    };
  }, [formData.campus_ids]);

  useEffect(() => {
    if (!showLessonDropdown) return;

    let cancelled = false;
    setLessonsLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const response = await axiosClient.get('/lessons', {
          params: {
            search: lessonSearch || undefined,
            per_page: 50,
          },
        });
        const data = response.data?.data;
        const list = data?.lessons || response.data?.lessons || data?.data || [];
        if (!cancelled) {
          setLessons(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Dersler yüklenemedi:', error);
          setLessons([]);
        }
      } finally {
        if (!cancelled) {
          setLessonsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [showLessonDropdown, lessonSearch]);

  useEffect(() => {
    const selectedIds = (formData.subjects || []).filter((id): id is number => Number.isFinite(id));
    if (selectedIds.length === 0) return;

    const missingIds = selectedIds.filter((id) => !lessons.some((l) => l.id === id));
    if (missingIds.length === 0) return;

    let cancelled = false;
    const fetchMissingLessons = async () => {
      try {
        const response = await axiosClient.get('/lessons', {
          params: {
            ids: missingIds,
            per_page: 200,
          },
        });
        const data = response.data?.data;
        const list = data?.lessons || response.data?.lessons || data?.data || [];
        if (!cancelled && Array.isArray(list)) {
          setLessons((prev) => {
            const map = new Map<number, Lesson>();
            prev.forEach((l) => map.set(l.id, l));
            list.forEach((l: Lesson) => map.set(l.id, l));
            return Array.from(map.values());
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Seçili ders isimleri yüklenemedi:', error);
        }
      }
    };

    fetchMissingLessons();
    return () => {
      cancelled = true;
    };
  }, [formData.subjects, lessons]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'campus_ids' || name === 'education_level_ids') {
      // Checkbox handling
      const checkboxValue = parseInt((e.target as HTMLInputElement).value);
      const isChecked = (e.target as HTMLInputElement).checked;

      setFormData(prev => {
        const currentArray = prev[name as keyof User] as number[] || [];
        if (isChecked) {
          return {
            ...prev,
            [name]: [...currentArray, checkboxValue]
          };
        } else {
          return {
            ...prev,
            [name]: currentArray.filter(id => id !== checkboxValue)
          };
        }
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }

    // Rol değiştiğinde campus ve education_level sıfırla
    if (name === 'role_id') {
      const selectedRole = roles.find(role => role.id === parseInt(value));
      if (selectedRole?.scope === 'all') {
        setFormData(prev => ({
          ...prev,
          campus_ids: [],
          education_level_ids: []
        }));
      } else if (selectedRole?.scope === 'education_level') {
        setFormData(prev => ({
          ...prev,
          education_level_ids: []
        }));
      }
    }
  };

  const handleCampusCheckboxChange = (campusId: number, isChecked: boolean) => {
    setFormData(prev => {
      const currentCampusIds = prev.campus_ids || [];
      const newCampusIds = isChecked
        ? [...currentCampusIds, campusId]
        : currentCampusIds.filter(id => id !== campusId);

      // Campus değiştiğinde education_level_ids'i temizle
      return {
        ...prev,
        campus_ids: newCampusIds,
        education_level_ids: []
      };
    });
  };

  const handleEducationLevelCheckboxChange = (levelId: number, isChecked: boolean) => {
    setFormData(prev => {
      const currentLevelIds = prev.education_level_ids || [];
      return {
        ...prev,
        education_level_ids: isChecked
          ? [...currentLevelIds, levelId]
          : currentLevelIds.filter(id => id !== levelId)
      };
    });
  };

  const addSubject = (lessonId: number) => {
    if (!formData.subjects?.includes(lessonId)) {
      setFormData(prev => ({
        ...prev,
        subjects: [...(prev.subjects || []), lessonId]
      }));
    }
  };

  const removeSubject = (lessonId: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects?.filter(id => id !== lessonId) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('ACCESS_TOKEN')?.trim();
    if (!token) {
      showToast('error', 'Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
      return;
    }

    setSaving(true);

    try {
      // Form verilerini hazırla
      const submitData = {
        tc_no: formData.tc_no,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email ? formData.email.trim() : null,
        phone: formData.phone,
        ...(formData.birth_date ? { birth_date: formData.birth_date } : {}),
        role_id: parseInt(formData.role_id.toString()), // String'i integer'a çevir
        campus_ids: formData.campus_ids || [],
        education_level_ids: formData.education_level_ids || [],
        subjects: (formData.subjects || []).map(s => s.toString()), // Number'ı string'e çevir
        is_active: formData.is_active,
        // Sadece yeni kullanıcı için şifre veya her durumda 123456
        ...(!isEditMode && { password: formData.password || '123456' })
      };

      try {
        if (isEditMode && id) {
          // Update mode - mevcut kullanıcıyı güncelle
          await axiosClient.put(`/users/${id}`, submitData);
          showToast('success', 'Kullanıcı başarıyla güncellendi');
        } else {
          // Create mode - yeni kullanıcı oluştur
          await axiosClient.post('/users', submitData);
          showToast('success', 'Kullanıcı başarıyla oluşturuldu');
        }
      } catch (apiError: any) {
        // Validasyon hatası (422)
        if (apiError.response?.status === 422) {
          const errors = apiError.response?.data?.errors;
          if (errors && typeof errors === 'object') {
            const firstField = Object.keys(errors)[0];
            const firstMessage = Array.isArray(errors[firstField]) ? errors[firstField][0] : errors[firstField];
            showToast('error', firstMessage || 'Validasyon hatası. Lütfen formu kontrol edin.');
          } else {
            showToast('error', 'Validasyon hatası. Lütfen formu kontrol edin.');
          }
          return;
        }

        // Backend implementasyonu hazır değilse bilgilendir
        if (apiError.response?.status === 501 ||
          apiError.response?.status === 500 ||
          apiError.code === 'ERR_BAD_RESPONSE' ||
          apiError.message?.includes('501') ||
          apiError.message?.includes('Not Implemented')) {

          showToast('warning', 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
          return; // Yönlendirme yapma
        } else {
          throw apiError;
        }
      }

      // Başarılı olursa kullanıcı listesine yönlendir
      setTimeout(() => {
        window.location.href = '/users';
      }, 1500);
    } catch (error: any) {
      // API hatası mesajlarını göster
      if (error.response?.data?.message) {
        showToast('error', error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Validation errors
        const errors = error.response.data.errors;
        const errorMessages = Object.keys(errors).map(key => {
          if (Array.isArray(errors[key])) {
            return errors[key].join(', ');
          }
          return errors[key];
        }).join(', ');
        showToast('error', errorMessages);
      } else {
        showToast('error', 'Kullanıcı kaydedilemedi. Lütfen bilgileri kontrol edin.');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find(role => role.id === formData.role_id);
  const roleLabel = (r: Role) => r?.display_name || r?.name || '';
  const availableEducationLevels = useMemo(() => {
    return formData.campus_ids && formData.campus_ids.length > 0
      ? educationLevels.filter(el => formData.campus_ids!.includes(el.campus_id))
      : [];
  }, [educationLevels, formData.campus_ids]);

  const filteredCampuses = useMemo(() => {
    const q = campusSearch.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter((campus) => campus.name.toLowerCase().includes(q));
  }, [campuses, campusSearch]);

  const filteredEducationLevels = useMemo(() => {
    const q = educationLevelSearch.trim().toLowerCase();
    if (!q) return availableEducationLevels;
    return availableEducationLevels.filter((level) => level.name.toLowerCase().includes(q));
  }, [availableEducationLevels, educationLevelSearch]);

  const filteredLessons = useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((lesson) => (
      lesson.name.toLowerCase().includes(q) || (lesson.code && lesson.code.toLowerCase().includes(q))
    ));
  }, [lessons, lessonSearch]);

  const lessonNameMap = useMemo(() => {
    const map = new Map<number, string>();
    lessons.forEach((lesson) => map.set(lesson.id, lesson.name));
    return map;
  }, [lessons]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-title-head d-flex align-items-center mb-4">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">
            {isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          </h4>
        </div>
        <div>
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={() => navigate('/users')}
          >
            <i className="ti ti-arrow-left me-1"></i> Geri
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="tc_no" className="form-label">TC Kimlik No *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="tc_no"
                    name="tc_no"
                    value={formData.tc_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, tc_no: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    placeholder="11 haneli TC"
                    required
                    maxLength={11}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="first_name" className="form-label">Ad *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Örn: Ahmet"
                    required
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="last_name" className="form-label">Soyad *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Örn: Yılmaz"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">E-posta</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ornek@email.com (İsteğe bağlı)"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">Telefon</label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      // Telefon maskesi: (5XX) XXX XX XX
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 0) {
                        if (value.length <= 3) {
                          value = `(${value}`;
                        } else if (value.length <= 6) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        } else if (value.length <= 8) {
                          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)} ${value.slice(6)}`;
                        } else {
                          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)} ${value.slice(6, 8)} ${value.slice(8, 10)}`;
                        }
                      }
                      setFormData(prev => ({ ...prev, phone: value }));
                    }}
                    placeholder="(5XX) XXX XX XX"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="birth_date" className="form-label">Doğum Tarihi</label>
                  <input
                    type="date"
                    className="form-control"
                    id="birth_date"
                    name="birth_date"
                    value={formData.birth_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {!isEditMode && (
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Şifre</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Güçlü şifre (en az 8 karakter)"
                      autoComplete="new-password"
                    />
                    <small className="text-muted">İsteğe bağlı boş bırakılabilir</small>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Rol Seçimi */}
            <div className="row">
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="role_id" className="form-label">Rol *</label>
                  <select
                    className="form-select"
                    id="role_id"
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name} {role.description ? `- ${role.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Kampüsler */}
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="campus_ids" className="form-label">Kampüsler</label>
                  <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <div className="mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Kampüs ara..."
                        value={campusSearch}
                        onChange={(e) => setCampusSearch(e.target.value)}
                      />
                    </div>
                    {filteredCampuses.map(campus => (
                      <div key={campus.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`campus_${campus.id}`}
                          value={campus.id}
                          checked={formData.campus_ids?.includes(campus.id) || false}
                          onChange={(e) => handleCampusCheckboxChange(campus.id, e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor={`campus_${campus.id}`}>
                          {campus.name}
                        </label>
                      </div>
                    ))}
                    {campuses.length === 0 && (
                      <div className="text-muted text-center py-2">
                        <i className="ti ti-building me-2"></i>
                        Kampüs bulunamadı
                      </div>
                    )}
                  </div>
                  <small className="text-muted">İşaretleyerek kampüs seçebilirsiniz</small>
                </div>
              </div>

              {/* 3. Kademeler */}
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="education_level_ids" className="form-label">Kademeler</label>
                  <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <div className="mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Kademe ara..."
                        value={educationLevelSearch}
                        onChange={(e) => setEducationLevelSearch(e.target.value)}
                      />
                    </div>
                    {availableEducationLevels.length === 0 ? (
                      <div className="text-muted text-center py-2">
                        <i className="ti ti-school me-2"></i>
                        {!formData.campus_ids || formData.campus_ids.length === 0
                          ? 'Önce kampüs seçiniz'
                          : 'Seçili kampüslerde kademe bulunamadı'
                        }
                      </div>
                    ) : (
                      filteredEducationLevels
                        .map(level => {
                          const campus = campuses.find(c => c.id === level.campus_id);
                          const displayName = campus
                            ? `${campus.name} - ${level.name}`
                            : level.name;

                          return (
                            <div key={level.id} className="form-check mb-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`level_${level.id}`}
                                value={level.id}
                                checked={formData.education_level_ids?.includes(level.id) || false}
                                onChange={(e) => handleEducationLevelCheckboxChange(level.id, e.target.checked)}
                              />
                              <label className="form-check-label" htmlFor={`level_${level.id}`}>
                                {displayName}
                              </label>
                            </div>
                          );
                        })
                    )}
                  </div>
                  <small className="text-muted">İşaretleyerek kademe seçebilirsiniz</small>
                </div>
              </div>
            </div>

            {/* 4. Ders Atamaları / Görev alanları - Her zaman görünür */}
            <div className="row">
              <div className="col-12">
                <div className="mb-3">
                  <label htmlFor="subjects" className="form-label">
                    {selectedRole && roleLabel(selectedRole) === 'Rehberlik' ? 'Ders / Görev Alanları' : 'Ders Atamaları'}
                  </label>

                  {/* Ders Dropdown - Buton ile Custom Implementation */}
                  <div style={{ position: 'relative' }}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ders ara..."
                        value={lessonSearch}
                        onChange={(e) => {
                          setLessonSearch(e.target.value);
                          setShowLessonDropdown(true); // Yazı yazıldığında dropdown aç
                        }}
                        onBlur={() => {
                          // Dropdown'ı kapatmak için küçük delay (tıklamaya izin vermek için)
                          setTimeout(() => setShowLessonDropdown(false), 200);
                        }}
                        autoComplete="off"
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setShowLessonDropdown(!showLessonDropdown)}
                      >
                        <i className="ti ti-chevron-down"></i>
                      </button>
                    </div>

                    {/* Custom Dropdown Menu - yazı yazıldığında veya buton tıklandığında göster */}
                    {showLessonDropdown && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          marginTop: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {lessonsLoading ? (
                          <div style={{ padding: '10px 12px', color: '#999' }}>
                            Yükleniyor...
                          </div>
                        ) : filteredLessons.length > 0 ? (
                          filteredLessons.map(lesson => (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                if (!formData.subjects?.includes(lesson.id)) {
                                  addSubject(lesson.id);
                                }
                                setLessonSearch(''); // Input'u temizle
                                setShowLessonDropdown(false); // Dropdown'u kapat
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: formData.subjects?.includes(lesson.id) ? '#e7f1ff' : 'white',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!formData.subjects?.includes(lesson.id)) {
                                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!formData.subjects?.includes(lesson.id)) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }
                              }}
                            >
                              <span>{toUpperTr(lesson.name)} {lesson.code ? `(${lesson.code})` : ''}</span>
                              {formData.subjects?.includes(lesson.id) && (
                                <i className="ti ti-check text-success"></i>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '10px 12px', color: '#999' }}>
                            Ders bulunamadı
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Seçili Dersler */}
                  <div className="mt-2">
                    {(formData.subjects || []).length > 0 ? (
                      (formData.subjects || []).map(lessonId => {
                        const lessonName = lessonNameMap.get(lessonId);
                        return (
                          <span key={lessonId} className="badge bg-primary me-2 mb-2">
                            {lessonName ? toUpperTr(lessonName) : `Ders #${lessonId}`}
                            <button
                              type="button"
                              className="btn-close btn-close-white ms-1"
                              style={{ cursor: 'pointer' }}
                              onClick={() => removeSubject(lessonId)}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <small className="text-muted">
                        {selectedRole && roleLabel(selectedRole) === 'Rehberlik' ? 'Henüz ders/görev alanı eklenmedi' : 'Henüz ders atanmadı'}
                      </small>
                    )}
                  </div>
                  <small className="text-muted">
                    Dropdown'dan ders seçerek atayabilirsiniz.
                  </small>
                </div>
              </div>
            </div>


            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <label className="form-check-label" htmlFor="is_active">
                  Aktif
                </label>
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary me-2"
                onClick={() => navigate('/users')}
              >
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
                    <i className="ti ti-device-floppy me-1"></i>
                    {isEditMode ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserForm;
