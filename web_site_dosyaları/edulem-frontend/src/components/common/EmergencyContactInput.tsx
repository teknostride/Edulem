import React from 'react';
import PhoneInput from './PhoneInput';

interface EmergencyContactInfo {
  name: string;
  relation: string;
  phone: string;
}

interface EmergencyContactInputProps {
  emergencyContact: EmergencyContactInfo;
  onChange: (contact: EmergencyContactInfo) => void;
  guardians: Array<{ name: string; relation_type: string; phone: string }>;
}

const EmergencyContactInput: React.FC<EmergencyContactInputProps> = ({
  emergencyContact,
  onChange,
  guardians
}) => {
  const handleChange = (field: keyof EmergencyContactInfo, value: any) => {
    onChange({
      ...emergencyContact,
      [field]: value
    });
  };

  // Velileri seçenek olarak sun
  const guardianOptions = guardians.map((guardian, index) => ({
    value: index,
    label: `${guardian.name || ''} (${guardian.relation_type || ''})`,
    name: guardian.name || '',
    phone: guardian.phone || '',
    relation: guardian.relation_type || ''
  }));

  // Güvenli değer hesaplama
  const getSafeValue = () => {
    try {
      return guardianOptions.findIndex(g => 
        g && 
        g.name && 
        emergencyContact.name && 
        g.phone && 
        emergencyContact.phone &&
        g.name === emergencyContact.name && 
        g.phone === emergencyContact.phone
      );
    } catch (error) {
      console.error('EmergencyContactInput value calculation error:', error);
      return -1;
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="ti ti-alert-triangle me-2 text-warning"></i>
          Acil Durum Kişisi
        </h6>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Veli Seçimi</label>
            <select
              className="form-select"
              value={getSafeValue()}
              onChange={(e) => {
                const selectedIndex = parseInt(e.target.value);
                if (selectedIndex >= 0 && selectedIndex < guardianOptions.length) {
                  const selectedGuardian = guardianOptions[selectedIndex];
                  if (selectedGuardian) {
                    handleChange('name', selectedGuardian.name || '');
                    handleChange('relation', selectedGuardian.relation || '');
                    handleChange('phone', selectedGuardian.phone || '');
                  }
                }
              }}
            >
              <option value="">Veli seçin veya yeni kişi girin</option>
              {guardianOptions.map((guardian, index) => (
                <option key={index} value={index}>
                  {guardian.label}
                </option>
              ))}
            </select>
            <small className="form-text text-muted">
              Mevcut velilerden seçebilir veya yeni kişi bilgisi girebilirsiniz
            </small>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Yakınlık</label>
            <input
              type="text"
              className="form-control"
              value={emergencyContact.relation}
              onChange={(e) => handleChange('relation', e.target.value)}
              placeholder="Örn: Dayı, Amca, Teyze"
            />
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Ad Soyad *</label>
            <input
              type="text"
              className="form-control"
              value={emergencyContact.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Acil durum kişisinin adı soyadı"
              required
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Telefon *</label>
            <PhoneInput
              value={emergencyContact.phone}
              onChange={(value) => handleChange('phone', value)}
              placeholder="(XXX) XXX XX XX"
              required
            />
          </div>
        </div>
        <div className="alert alert-info">
          <i className="ti ti-info-circle me-2"></i>
          <strong>Acil Durum:</strong> Anne veya baba ulaşılamadığında, belirtilen acil durum kişisi aranacaktır.
        </div>
      </div>
    </div>
  );
};

export default EmergencyContactInput;
