import { useState, useCallback } from 'react';
import { locationService } from '../lib/locationService';

export function useVietnamLocation() {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState({ provinces: false, districts: false, wards: false });

  const fetchProvinces = useCallback(async () => {
    setLoading(prev => ({ ...prev, provinces: true }));
    try {
      const data = await locationService.getProvincesV2();
      setProvinces(data || []);
    } finally {
      setLoading(prev => ({ ...prev, provinces: false }));
    }
  }, []);

  const fetchDistricts = useCallback(async (provinceCode) => {
    if (!provinceCode) { setDistricts([]); return; }
    setLoading(prev => ({ ...prev, districts: true }));
    try {
      const data = await locationService.getDistricts(provinceCode);
      setDistricts(data || []);
    } finally {
      setLoading(prev => ({ ...prev, districts: false }));
    }
  }, []);

  const fetchWards = useCallback(async (districtCode) => {
    if (!districtCode) { setWards([]); return; }
    setLoading(prev => ({ ...prev, wards: true }));
    try {
      const data = await locationService.getWards(districtCode);
      setWards(data || []);
    } finally {
      setLoading(prev => ({ ...prev, wards: false }));
    }
  }, []);

  const clearDistricts = useCallback(() => { setDistricts([]); setWards([]); }, []);
  const clearWards = useCallback(() => { setWards([]); }, []);

  return {
    provinces, districts, wards, loading,
    fetchProvinces, fetchDistricts, fetchWards,
    clearDistricts, clearWards
  };
}
