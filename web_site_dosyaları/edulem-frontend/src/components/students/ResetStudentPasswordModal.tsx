import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface StudentTarget {
  id: number;
  name?: string;
  student_name?: string;
  tc_no?: string;
  school_no?: string;
}

interface ResetStudentPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentTarget | null;
  onSuccess?: (data: { student_id: number; student_name: string; tc_no: string; password: string }) => void;
}

const ResetStudentPasswordModal: React.FC<ResetStudentPasswordModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    student_id: number;
    student_name: string;
    tc_no: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomPassword('');
      setShowPassword(false);
      setLoading(false);
      setCopied(false);
      setResult(null);
    }
  }, [isOpen, student?.id]);

  if (!student) return null;

  const displayName = student.name || student.student_name || 'Öğrenci';

  const handleGenerateRandom = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomPassword(randomNum);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    if (!result?.password) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('success', 'Şifre panoya kopyalandı.');
    } catch {
      showToast('warning', 'Panoya kopyalanamadı, lütfen şifreyi elle kopyalayınız.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (customPassword.trim() && customPassword.trim().length < 4) {
      showToast('error', 'Şifre en az 4 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const payload: { password?: string } = {};
      if (customPassword.trim()) {
        payload.password = customPassword.trim();
      }

      const response = await axiosClient.post(`/students/${student.id}/reset-password`, payload);
      const data = response.data?.data || response.data;

      setResult({
        student_id: data.student_id || student.id,
        student_name: data.student_name || displayName,
        tc_no: data.tc_no || student.tc_no || '',
        password: data.password || customPassword,
      });

      showToast('success', 'Şifre başarıyla sıfırlandı.');
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu.';
      showToast('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Öğrenci Şifre Sıfırlama"
      size="md"
      footer={
        result ? (
          <div className="d-flex justify-content-end w-100">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              <i className="ti ti-check me-1"></i>
              Tamam
            </button>
          </div>
        ) : (
          <div className="d-flex justify-content-between w-100">
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
              disabled={loading}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Sıfırlanıyor...
                </>
              ) : (
                <>
                  <i className="ti ti-key me-1"></i>
                  Şifreyi Sıfırla
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {/* Öğrenci Özet Bilgisi */}
      <div className="card bg-light-subtle border-0 mb-3">
        <div className="card-body p-3">
          <div className="d-flex align-items-center">
            <div className="avatar bg-primary-subtle text-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
              <i className="ti ti-user fs-3"></i>
            </div>
            <div>
              <div className="fw-bold fs-6 text-dark">{displayName}</div>
              <div className="text-muted small">
                {student.tc_no && <span>TC: {student.tc_no}</span>}
                {student.tc_no && student.school_no && <span className="mx-2">•</span>}
                {student.school_no && <span>No: {student.school_no}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <div className="text-center py-2">
          <div className="text-success mb-2">
            <i className="ti ti-circle-check fs-1"></i>
          </div>
          <h5 className="fw-bold mb-1">Şifre Başarıyla Sıfırlandı!</h5>
          <p className="text-muted small mb-3">
            Öğrenci bu yeni şifre ve T.C. Kimlik Numarası ile Öğrenci Portalı'na ve Mobil Uygulama'ya giriş yapabilir.
          </p>

          <div className="p-3 bg-light rounded border text-start mb-3">
            <div className="row g-2">
              <div className="col-12 col-sm-4 text-muted small">Öğrenci:</div>
              <div className="col-12 col-sm-8 fw-semibold">{result.student_name}</div>

              {result.tc_no && (
                <>
                  <div className="col-12 col-sm-4 text-muted small">T.C. Kimlik No:</div>
                  <div className="col-12 col-sm-8 fw-semibold">{result.tc_no}</div>
                </>
              )}

              <div className="col-12 col-sm-4 text-muted small d-flex align-items-center">Yeni Şifre:</div>
              <div className="col-12 col-sm-8 d-flex align-items-center gap-2">
                <span className="badge bg-warning-subtle text-warning-emphasis fs-5 px-3 py-2 border border-warning-subtle font-monospace">
                  {result.password}
                </span>
                <button
                  type="button"
                  className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline-primary'}`}
                  onClick={handleCopy}
                  title="Şifreyi Kopyala"
                >
                  <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} me-1`}></i>
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            </div>
          </div>

          <div className="alert alert-info d-flex align-items-center py-2 px-3 mb-0" role="alert">
            <i className="ti ti-info-circle fs-3 me-2 flex-shrink-0"></i>
            <div className="small text-start">
              Lütfen oluşturulan şifreyi öğrenciye veya velisine iletiniz. Güvenlik gereği şifre sistemde şifrelenmiş olarak saklanır ve tekrar görüntülenemez.
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Yeni Şifre Belirle <span className="text-muted fw-normal small">(Opsiyonel)</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="ti ti-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Boş bırakırsanız 6 haneli rastgele şifre üretilir"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Gizle' : 'Göster'}
              >
                <i className={`ti ti-eye${showPassword ? '-off' : ''}`}></i>
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleGenerateRandom}
                title="Rastgele 6 Haneli Şifre Üret"
                disabled={loading}
              >
                <i className="ti ti-dice me-1"></i>
                Rastgele Üret
              </button>
            </div>
            <div className="form-text">
              Özel bir şifre belirlemek istemiyorsanız doğrudan <strong>"Şifreyi Sıfırla"</strong> butonuna tıklayarak otomatik şifre oluşturabilirsiniz.
            </div>
          </div>

          <div className="alert alert-warning py-2 px-3 d-flex align-items-center mb-0" role="alert">
            <i className="ti ti-alert-triangle fs-3 me-2 flex-shrink-0 text-warning"></i>
            <div className="small">
              Öğrencinin mevcut şifresi geçersiz kılınacak ve oluşturulan yeni şifre ile web öğrenci portalı ve mobil uygulamaya anında erişim sağlanacaktır.
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ResetStudentPasswordModal;
