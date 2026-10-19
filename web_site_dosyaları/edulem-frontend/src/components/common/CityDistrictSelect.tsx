import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

interface City {
  id: number;
  name: string;
  plate_code: string;
}

interface District {
  id: number;
  city_id: number;
  name: string;
}

interface CityDistrictSelectProps {
  cityId?: number;
  districtId?: number;
  onCityChange: (cityId: number) => void;
  onDistrictChange: (districtId: number) => void;
  required?: boolean;
}

const CityDistrictSelect: React.FC<CityDistrictSelectProps> = ({
  cityId = 0,
  districtId = 0,
  onCityChange,
  onDistrictChange,
  required = false
}) => {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);

  // Şehirleri getir
  useEffect(() => {
    fetchCities();
  }, []);

  // Seçilen şehir değişince ilçeleri getir
  useEffect(() => {
    if (cityId) {
      fetchDistricts(cityId);
    } else {
      setDistricts([]);
      onDistrictChange(0);
    }
  }, [cityId]);

  const fetchCities = async () => {
    try {
      setLoading(true);
      
      // ✅ DÜZELTME: Backend API'den şehirleri çek
      const response = await axiosClient.get('/locations/cities');
      const data = response.data.data?.cities || response.data.cities || response.data.data || response.data;
      const citiesArray = Array.isArray(data) ? data : [];
      
      setCities(citiesArray.map((c: any) => ({
        id: c.id,
        name: c.name,
        plate_code: c.plate_code || ''
      })));
      
      
    } catch (error) {
      console.error('Şehirler yüklenemedi:', error);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async (cityId: number) => {
    try {
      setLoading(true);
      
      // ✅ DÜZELTME: Backend API'den ilçeleri çek
      const response = await axiosClient.get(`/locations/districts/${cityId}`);
      const data = response.data.data?.districts || response.data.districts || response.data.data || response.data;
      const districtsArray = Array.isArray(data) ? data : [];
      
      setDistricts(districtsArray.map((d: any) => ({
        id: d.id,
        city_id: d.city_id || cityId,
        name: d.name
      })));
      
    } catch (error) {
      console.error('İlçeler yüklenemedi:', error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCityId = parseInt(e.target.value);
    onCityChange(newCityId);
    onDistrictChange(0); // Şehir değişince ilçeyi sıfırla
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrictId = parseInt(e.target.value);
    onDistrictChange(newDistrictId);
  };

  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label">Şehir {required && '*'}</label>
        <select
          className="form-select"
          value={cityId}
          onChange={handleCityChange}
          disabled={loading}
          required={required}
        >
          <option value="">Şehir seçiniz</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        {loading && <small className="form-text text-muted">Yükleniyor...</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">İlçe {required && '*'}</label>
        <select
          className="form-select"
          value={districtId}
          onChange={handleDistrictChange}
          disabled={loading || !cityId}
          required={required}
        >
          <option value="">İlçe seçiniz</option>
          {districts.map(district => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
        {loading && <small className="form-text text-muted">Yükleniyor...</small>}
      </div>
    </div>
  );
};

export default CityDistrictSelect;
