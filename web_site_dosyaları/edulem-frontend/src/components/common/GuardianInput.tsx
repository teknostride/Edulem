import React from 'react';
import PhoneInput from './PhoneInput';

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

interface GuardianInputProps {
  guardian: Guardian;
  onChange: (guardian: Guardian) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  index?: number;
  title?: string;
  icon?: string;
  badge?: string;
  isUnavailable?: boolean;
  onToggleUnavailable?: (unavailable: boolean) => void;
  unavailableLabel?: string;
  lockRelationType?: boolean;
  /** İlk veli: e-posta zorunlu (velinin giriş yapacağı e-posta) */
  emailRequired?: boolean;
  /** Anlık TC doğrulama hata mesajı (null = geçerli, undefined = henüz kontrol edilmedi) */
  tcError?: string | null;
  /** TC doğrulaması devam ediyor mu? */
  tcChecking?: boolean;
  /** TC alanından çıkıldığında tetiklenir */
  onTcBlur?: (tc: string) => void;
}

const GuardianInput: React.FC<GuardianInputProps> = ({
  guardian,
  onChange,
  onRemove,
  showRemove = true,
  index = 0,
  title,
  icon,
  badge,
  isUnavailable = false,
  onToggleUnavailable,
  unavailableLabel,
  lockRelationType = false,
  emailRequired = false,
  tcError,
  tcChecking = false,
  onTcBlur,
}) => {
  const handleChange = (field: keyof Guardian, value: any) => {
    onChange({
      ...guardian,
      [field]: value
    });
  };

  const handleTcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    handleChange('tc_no', value);
  };

  const tcInputClass = `form-control ${
    tcError === null && guardian.tc_no.length === 11 ? 'is-valid' :
    tcError ? 'is-invalid' : ''
  }`;

  const headerTitle = title || `Veli ${index > 0 ? index + 1 : ''}`;

  return (
    <div className={`card mb-3 ${isUnavailable ? 'border-light bg-light-subtle opacity-75' : ''}`}>
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 py-2">
        <div className="d-flex align-items-center gap-2">
          {icon && <i className={`${icon} fs-5 text-primary`}></i>}
          <h6 className="mb-0 fw-bold">
            {headerTitle}
          </h6>
          {badge && (
            <span className="badge bg-soft-primary text-primary px-2 py-1 small">
              {badge}
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-3">
          {onToggleUnavailable && (
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id={`unavailable-${guardian.id || index || headerTitle}`}
                checked={isUnavailable}
                onChange={(e) => onToggleUnavailable(e.target.checked)}
              />
              <label
                className="form-check-label text-muted small user-select-none"
                htmlFor={`unavailable-${guardian.id || index || headerTitle}`}
              >
                {unavailableLabel || 'Bilgi Yok / Vefat'}
              </label>
            </div>
          )}
          {showRemove && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={onRemove}
            >
              <i className="ti ti-trash me-1"></i>
              Sil
            </button>
          )}
        </div>
      </div>
      {isUnavailable ? (
        <div className="card-body py-3 text-muted text-center small">
          <i className="ti ti-info-circle me-1 text-secondary"></i>
          {unavailableLabel || 'Bilgi Yok / Vefat'} seçildi. Bu veli için kayıt oluşturulmayacaktır.
        </div>
      ) : (
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">{headerTitle} Adı Soyadı</label>
              <input
                type="text"
                className="form-control"
                value={guardian.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ad Soyad"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Yakınlık</label>
              {lockRelationType ? (
                <input
                  type="text"
                  className="form-control bg-light"
                  value={guardian.relation_type === 'mother' ? 'Anne' : guardian.relation_type === 'father' ? 'Baba' : 'Veli'}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  className="form-select"
                  value={guardian.relation_type}
                  onChange={(e) => handleChange('relation_type', e.target.value)}
                >
                  <option value="">Seçiniz</option>
                  <option value="father">Baba</option>
                  <option value="mother">Anne</option>
                  <option value="guardian">Vasi</option>
                  <option value="other">Diğer</option>
                </select>
              )}
            </div>
          </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">TC Kimlik No</label>
            <div className="input-group">
              <input
                type="text"
                className={tcInputClass}
                value={guardian.tc_no}
                onChange={handleTcChange}
                onBlur={() => onTcBlur?.(guardian.tc_no)}
                placeholder="11 haneli TC kimlik no"
                maxLength={11}
              />
              {tcChecking && (
                <span className="input-group-text">
                  <span className="spinner-border spinner-border-sm" />
                </span>
              )}
              {tcError === null && !tcChecking && guardian.tc_no.length === 11 && (
                <span className="input-group-text text-success">
                  <i className="ti ti-check" />
                </span>
              )}
            </div>
            {tcError ? (
              <div className="invalid-feedback d-block">
                <i className="ti ti-alert-circle me-1" />{tcError}
              </div>
            ) : tcError === null && guardian.tc_no.length === 11 ? (
              <div className="valid-feedback d-block">
                <i className="ti ti-circle-check me-1" />Geçerli TC Kimlik No
              </div>
            ) : (
              <small className="form-text text-muted">
                {guardian.tc_no.length}/11 — Alan doldurulduğunda otomatik kontrol edilir
              </small>
            )}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Veli Telefon</label>
            <PhoneInput
              value={guardian.phone}
              onChange={(value) => handleChange('phone', value)}
              placeholder="(5XX) XXX XX XX"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">
            {emailRequired ? (
              <>Veli E-posta <span className="text-danger">*</span></>
            ) : (
              'E-posta'
            )}
          </label>
          <input
            type="email"
            className="form-control"
            value={guardian.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="veli@example.com"
            required={emailRequired}
          />
          {emailRequired && (
            <small className="form-text text-muted">Velinin giriş yapacağı e-posta</small>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Veli Mesleği</label>
          <input
            type="text"
            className="form-control"
            value={guardian.job || ''}
            onChange={(e) => handleChange('job', e.target.value)}
            placeholder="Örn: Öğretmen"
          />
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id={`legal-guardian-${guardian.id || index}`}
            checked={guardian.is_legal_guardian}
            onChange={(e) => handleChange('is_legal_guardian', e.target.checked)}
          />
          <label className="form-check-label" htmlFor={`legal-guardian-${guardian.id || index}`}>
            Yasal vasi
          </label>
        </div>
      </div>
    )}
  </div>
);
};

export default GuardianInput;
