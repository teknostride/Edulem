import { useState, useEffect } from 'react';
import axiosClient from '../../../../api/axiosClient';

interface Campus {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active: boolean;
  created_at: string;
}

interface EducationLevel {
  id: number;
  name: string;
  campus_id: number;
  is_active: boolean;
}

const CampusStructureTab = () => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCampusForm, setShowCampusForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [_selectedCampus, _setSelectedCampus] = useState<number | null>(null);

  const fetchCampuses = async () => {
    try {
      const response = await axiosClient.get('/campuses');
      setCampuses(response.data.data?.campuses || []);
    } catch (error) {
      console.error('Kampüsler yüklenemedi:', error);
    }
  };

  const fetchEducationLevels = async () => {
    try {
      const response = await axiosClient.get('/education-levels');
      setEducationLevels(response.data.data?.education_levels || []);
    } catch (error) {
      console.error('Eğitim seviyeleri yüklenemedi:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchCampuses(), fetchEducationLevels()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    <div>
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Kampüsler</h5>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowCampusForm(true)}
              >
                <i className="ti ti-plus me-1"></i>
                Yeni Kampüs
              </button>
            </div>
            <div className="card-body">
              {campuses.length === 0 ? (
                <p className="text-muted text-center py-3">Henüz kampüs eklenmemiş.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {campuses.map(campus => (
                    <div key={campus.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{campus.name}</h6>
                        {campus.address && <small className="text-muted d-block">{campus.address}</small>}
                        {campus.phone && <small className="text-muted d-block">{campus.phone}</small>}
                      </div>
                      <div>
                        <span className={`badge ${campus.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {campus.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Eğitim Kademeleri</h5>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowLevelForm(true)}
              >
                <i className="ti ti-plus me-1"></i>
                Yeni Kademe
              </button>
            </div>
            <div className="card-body">
              {educationLevels.length === 0 ? (
                <p className="text-muted text-center py-3">Henüz eğitim kademesi eklenmemiş.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {educationLevels.map(level => {
                    const campus = campuses.find(c => c.id === level.campus_id);
                    return (
                      <div key={level.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{level.name}</h6>
                          <small className="text-muted d-block">
                            Kampüs: {campus?.name || 'Bilinmeyen'}
                          </small>
                        </div>
                        <div>
                          <span className={`badge ${level.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {level.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for forms */}
      {showCampusForm && (
        <div className="alert alert-info">
          <h6>Kampüs Ekleme Formu</h6>
          <p className="mb-0">Bu form geliştirme aşamasındadır.</p>
          <button 
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => setShowCampusForm(false)}
          >
            Kapat
          </button>
        </div>
      )}

      {showLevelForm && (
        <div className="alert alert-info">
          <h6>Eğitim Kademesi Ekleme Formu</h6>
          <p className="mb-0">Bu form geliştirme aşamasındadır.</p>
          <button 
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => setShowLevelForm(false)}
          >
            Kapat
          </button>
        </div>
      )}
    </div>
  );
};

export default CampusStructureTab;
