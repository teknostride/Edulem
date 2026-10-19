import React, { useState, useEffect } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "(XXX) XXX XX XX",
  className = "",
  disabled = false,
  required = false
}) => {
  const [displayValue, setDisplayValue] = useState("");

  // Başlangıçta formatla
  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhoneNumber(value));
    }
  }, [value]);

  // Telefon numarasını formatla
  const formatPhoneNumber = (phone: string): string => {
    // Sadece rakamları al
    const cleaned = phone.replace(/\D/g, '');
    
    // 10 haneli format: (XXX) XXX XX XX
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    if (cleaned.length <= 9) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  };

  // Input değişimini handle et
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Sadece rakamlara izin ver
    let cleaned = inputValue.replace(/\D/g, '');
    
    // Maksimum 10 rakam ((XXX) XXX XX XX)
    const limited = cleaned.slice(0, 10);
    
    // Formatlı değeri ayarla
    const formatted = formatPhoneNumber(limited);
    setDisplayValue(formatted);
    
    // Temiz değeri parent'a gönder (10 karakter)
    onChange(limited);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`form-control ${className}`}
      disabled={disabled}
      required={required}
      maxLength={15} // (XXX) XXX XX XX formatı için
    />
  );
};

export default PhoneInput;
