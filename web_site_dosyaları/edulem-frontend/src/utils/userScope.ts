export type UserScope = {
  campusIds: number[];
  educationLevelIds: number[];
};

const readUserData = (): any | null => {
  try {
    const raw = localStorage.getItem('USER_DATA');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const normalizeIds = (ids: unknown): number[] => {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((v: any) => {
      if (typeof v === 'number' || typeof v === 'string') return Number(v);
      if (v && (typeof v === 'object') && 'id' in v) return Number((v as any).id);
      return NaN;
    })
    .filter((id) => Number.isFinite(id) && id > 0);
};

export const getMyScope = (): UserScope => {
  const me = readUserData();

  const campusIds = normalizeIds(
    me?.campus_ids ??
    me?.assigned_campus_ids ??
    me?.campuses ??
    me?.assigned_campuses ??
    []
  );
  const educationLevelIds = normalizeIds(
    me?.education_level_ids ??
    me?.assigned_education_level_ids ??
    me?.education_levels ??
    me?.assigned_education_levels ??
    []
  );

  return {
    campusIds,
    educationLevelIds,
  };
};

export const getMyEducationLevelIds = (): number[] => getMyScope().educationLevelIds;

export const getMyPrimaryEducationLevelId = (): number | null => {
  const ids = getMyEducationLevelIds();
  if (ids.length === 0) return null;

  try {
    const stored = localStorage.getItem('PRIMARY_EDUCATION_LEVEL_ID');
    const storedId = stored ? Number(stored) : NaN;
    if (Number.isFinite(storedId) && storedId > 0 && ids.includes(storedId)) return storedId;
  } catch {
    // ignore
  }

  return ids[0];
};

export const setMyPrimaryEducationLevelId = (educationLevelId: number | null) => {
  try {
    if (!educationLevelId || !Number.isFinite(Number(educationLevelId)) || Number(educationLevelId) <= 0) {
      localStorage.removeItem('PRIMARY_EDUCATION_LEVEL_ID');
      return;
    }
    localStorage.setItem('PRIMARY_EDUCATION_LEVEL_ID', String(Number(educationLevelId)));
  } catch {
    // ignore
  }
};

export const getMyCampusIds = (): number[] => getMyScope().campusIds;

export const roleNeedsEducationLevelScope = (roleRaw: unknown): boolean => {
  const role = String(roleRaw ?? '').trim();
  return (
    role === 'Öğretmen' ||
    role === 'Sınıf Öğretmeni' ||
    role === 'teacher' ||
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === '6' ||
    role === '5' ||
    role === 'Öğrenci İşleri' ||
    role === 'student_affairs'
  );
};

export const getMyRole = (): string => {
  try {
    const stored = localStorage.getItem('USER_ROLE');
    if (stored) return stored;
    const me = readUserData();
    return String(me?.role ?? me?.role_name ?? me?.role_id ?? '');
  } catch {
    return '';
  }
};

export const isFounderOrOwner = (roleRaw: unknown): boolean => {
  const role = String(roleRaw ?? '').trim().toLowerCase();
  return ['owner', 'kurucu', 'founder', 'superadmin', 'kurum sahibi', 'kurum_sahibi'].some(k => role.includes(k));
};

export const isUnrestrictedRole = (): boolean => {
  const me = readUserData();
  if (me?.is_superadmin) return true;
  return isFounderOrOwner(me?.role ?? me?.role_name ?? '');
};

const TEACHER_ROLE_NAMES = [
  'Öğretmen', 'Sınıf Öğretmeni', 'teacher',
  'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher',
];

export const isTeacher = (): boolean => {
  const role = getMyRole();
  return TEACHER_ROLE_NAMES.includes(role);
};

export const getMyUserId = (): number | null => {
  try {
    const me = readUserData();
    const id = me?.id ?? me?.user_id;
    return id ? Number(id) : null;
  } catch {
    return null;
  }
};
