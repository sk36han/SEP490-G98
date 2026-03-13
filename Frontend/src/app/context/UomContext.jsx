import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUomList } from '../../shared/lib/uomService';

const UomContext = createContext(null);

export function UomProvider({ children }) {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUoms = useCallback(async (force = false) => {
    if (!force && uoms.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getUomList({ pageSize: 1000 });
      setUoms(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [uoms.length]);

  useEffect(() => { fetchUoms(); }, []);

  const value = {
    uoms,
    loading,
    error,
    fetchUoms,
    refetch: () => fetchUoms(true)
  };

  return (
    <UomContext.Provider value={value}>
      {children}
    </UomContext.Provider>
  );
}

export function useUoms() {
  const context = useContext(UomContext);
  if (!context) throw new Error('useUoms must be used within a UomProvider');
  return context;
}
