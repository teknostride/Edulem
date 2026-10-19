import type { jsPDF } from 'jspdf';

// Font yükleme - şu an devre dışı (widths hatası)
// Gelecekte düzgün TTF font ile aktif edilebilir
export const ensureTurkishFont = async (_doc: jsPDF): Promise<string | null> => {
  // Font yükleme devre dışı - Latin karakter çevrimi kullanılıyor
  return null;
};

// Türkçe karakterleri Latin karşılıklarına çevir (PDF font desteği olmadığında)
export const toAsciiTurkish = (text: string): string => {
  if (!text) return '';
  
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'I',  // I zaten I
    'i': 'i', 'İ': 'I',  // İ -> I, i -> i
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
    'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I',
    'û': 'u', 'Û': 'U',
    'ê': 'e', 'Ê': 'E',
    'ô': 'o', 'Ô': 'O',
    'ñ': 'n', 'Ñ': 'N',
    'á': 'a', 'Á': 'A',
    'é': 'e', 'É': 'E',
    'í': 'i', 'Í': 'I',
    'ó': 'o', 'Ó': 'O',
    'ú': 'u', 'Ú': 'U',
  };
  
  return text.split('').map(char => charMap[char] || char).join('');
};
