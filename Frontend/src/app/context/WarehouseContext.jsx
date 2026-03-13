import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWarehouseList } from '../../shared/lib/warehouseService';

const WarehouseContext = createContext(null);

export function WarehouseProvider({ children }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWarehouses = useCallback(async (force = false) => {
    if (!force && warehouses.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getWarehouseList({ pageSize: 1000 });
      setWarehouses(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [warehouses.length]);

  useEffect(() => { fetchWarehouses(); }, []);

  const value = {
    warehouses,
    loading,
    error,
    fetchWarehouses,
    refetch: () => fetchWarehouses(true)
  };

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouses() {
  const context = useContext(WarehouseContext);
  if (!context) throw new Error('useWarehouses must be used within a WarehouseProvider');
  return context;
}
