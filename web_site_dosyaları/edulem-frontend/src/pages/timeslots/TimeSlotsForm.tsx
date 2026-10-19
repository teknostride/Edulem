import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { showToast } from '../../utils/toast';

interface TimeSlotFormData {
  name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  order: number;
  is_active: boolean;
}

const TimeSlotsForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<TimeSlotFormData>({
    name: '',
    start_time: '08:00',
    end_time: '08:45',
    break_duration: 0,
    order: 1,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchTimeSlot();
    }
  }, [id]);

  const fetchTimeSlot = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/time-slots/${id}`);
      const timeSlot = response.data.data;
      
      setFormData({
        name: timeSlot.name,
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        break_duration: timeSlot.break_duration,
        order: timeSlot.order,
        is_active: timeSlot.is_active,
      });
    } catch (error) {
      console.error('Ders saati yüklenemedi:', error);
      showToast('error', 'Ders saati yüklenemedi');
      navigate('/time-slots');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
             type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast('error', 'Ders saati adı zorunludur');
      return false;
    }

    if (!formData.start_time || !formData.end_time) {
      showToast('error', 'Başlangıç ve bitiş saatleri zorunludur');
      return false;
    }

    if (formData.start_time >= formData.end_time) {
      showToast('error', 'Bitiş saati başlangıç saatinden sonra olmalıdır');
      return false;
    }

    if (formData.order < 1) {
      showToast('error', 'Sıra numarası 1 veya daha büyük olmalıdır');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      if (isEdit) {
        await axiosClient.put(`/time-slots/${id}`, formData);
        showToast('success', 'Ders saati başarıyla güncellendi');
      } else {
        await axiosClient.post('/time-slots', formData);
        showToast('success', 'Ders saati başarıyla oluşturuldu');
      }
      
      navigate('/time-slots');
    } catch (error) {
      console.error('İşlem başarısız:', error);
      showToast('error', isEdit ? 'Ders saati güncellenemedi' : 'Ders saati oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDuration = () => {
    const start = new Date(`2000-01-01T${formData.start_time}`);
    const end = new Date(`2000-01-01T${formData.end_time}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60); // dakika
    return Math.max(0, diff - formData.break_duration);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-1">
            {isEdit ? 'Ders Saati Düzenle' : 'Yeni Ders Saati'}
          </h4>
          <small className="text-muted">
            {isEdit ? 'Ders saati bilgilerini güncelleyin' : 'Yeni ders saati oluşturun'}
          </small>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/time-slots')}
        >
          <i className="ti ti-arrow-left me-1"></i>
          Geri Dön
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label">
                      Ders Saati Adı <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Örn: 1. Ders Saati"
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="order" className="form-label">
                      Sıra No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="order"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label htmlFor="break_duration" className="form-label">
                      Ara Süresi (dakika)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="break_duration"
                      name="break_duration"
                      value={formData.break_duration}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="start_time" className="form-label">
                      Başlangıç Saati <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="end_time" className="form-label">
                      Bitiş Saati <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      id="end_time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Ders Süresi</label>
                    <div className="form-control-plaintext">
                      <span className="badge bg-soft-primary text-primary fs-6">
                        {calculateDuration()} dakika
                      </span>
                    </div>
                  </div>

                  <div className="col-12">
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
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {isEdit ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                      </>
                    ) : (
                      <>
                        <i className="ti ti-device-floppy me-1"></i>
                        {isEdit ? 'Güncelle' : 'Oluştur'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/time-slots')}
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Bilgiler</h6>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <h6 className="alert-heading">
                  <i className="ti ti-info-circle me-2"></i>
                  Ders Saatleri Hakkında
                </h6>
                <ul className="mb-0">
                  <li>Ders saatleri okul ders programını belirler</li>
                  <li>Her ders saatinin başlangıç ve bitiş zamanı olmalıdır</li>
                  <li>Ara süresi dersler arası mola süresidir</li>
                  <li>Sıra numarası ders saatlerinin sıralamasını belirler</li>
                </ul>
              </div>

              <div className="alert alert-warning">
                <h6 className="alert-heading">
                  <i className="ti ti-alert-triangle me-2"></i>
                  Önemli Notlar
                </h6>
                <ul className="mb-0">
                  <li>Ders saatleri çakışmamalıdır</li>
                  <li>Aktif olmayan ders saatleri programa dahil edilmez</li>
                  <li>Ders saati değişiklikleri mevcut programı etkileyebilir</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotsForm;
