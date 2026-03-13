import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBrandList } from '../../shared/lib/brandService';

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBrands = useCallback(async (force = false) => {
    if (!force && brands.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBrandList({ pageSize: 1000 });
      setBrands(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brands.length]);

  useEffect(() => { fetchBrands(); }, []);

  const value = {
    brands,
    loading,
    error,
    fetchBrands,
    refetch: () => fetchBrands(true)
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrands() {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrands must be used within a BrandProvider');
  return context;
}
