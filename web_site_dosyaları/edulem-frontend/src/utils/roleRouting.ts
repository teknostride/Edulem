export const normalizeRole = (rawRole: any): string => {
  if (rawRole && typeof rawRole === 'object' && rawRole.name) {
    rawRole = rawRole.name;
  }
  const role = String(rawRole ?? '').trim();
  if (role === '5') return 'teacher';
  if (role === '6') return 'rehber_teacher';
  if (role === 'Rehberlik') return 'rehber_teacher';
  if (role === 'guidance') return 'rehber_teacher';
  return role;
};

export const getRoleLabel = (rawRole: string | null | undefined): string => {
  const role = normalizeRole(rawRole);

  const roleMap: Record<string, string> = {
    owner: 'Kurucu',
    Admin: 'Genel Müdür',
    'Genel Müdür': 'Genel Müdür',
    teacher: 'Öğretmen',
    'Öğretmen': 'Öğretmen',
    'Sınıf Öğretmeni': 'Sınıf Öğretmeni',
    'Rehber Öğretmen': 'Rehber Öğretmen',
    rehber_teacher: 'Rehber Öğretmen',
    guidance_teacher: 'Rehber Öğretmen',
    student: 'Öğrenci',
    'Öğrenci': 'Öğrenci',
    guardian: 'Veli',
    Veli: 'Veli',
    guidance: 'Rehberlik',
    Rehberlik: 'Rehberlik',
    student_affairs: 'Öğrenci İşleri',
    'Öğrenci İşleri': 'Öğrenci İşleri',
    'Müdür': 'Müdür',
    'Müdür Yardımcısı': 'Müdür Yardımcısı',
    'Kampüs Müdürü': 'Kampüs Müdürü',
    muhasebe: 'Muhasebe',
    Muhasebe: 'Muhasebe',
  };

  return roleMap[role] || role || 'Görev Belirtilmedi';
};

export const getDashboardRouteByRole = (rawRole: string | null | undefined): string => {
  try {
    const ud = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
    if (ud?.is_superadmin === 1 || ud?.is_superadmin === true || ud?.is_super_admin === 1 || ud?.is_super_admin === true) {
      return '/super-admin';
    }
  } catch {}

  const role = normalizeRole(rawRole);

  switch (role) {
    case 'superadmin':
    case 'super_admin':
    case 'SuperAdmin':
      return '/super-admin';
    case 'owner':
    case 'Admin':
    case 'Genel Müdür':
      return '/founder/dashboard';
    case 'student':
    case 'Öğrenci':
    case 'guardian':
    case 'Veli':
      return '/portal/dashboard';
    case 'teacher':
    case 'Öğretmen':
    case 'Sınıf Öğretmeni':
    case 'Rehber Öğretmen':
    case 'rehber_teacher':
    case 'guidance_teacher':
    case 'Müdür':
    case 'Müdür Yardımcısı':
    case 'Kampüs Müdürü':
    case 'Rehberlik':
    case 'guidance':
    case 'Muhasebe':
    case 'muhasebe':
      return '/';
    case 'Öğrenci İşleri':
    case 'student_affairs':
      return '/student-affairs/dashboard';
    default:
      return '/';
  }
};
