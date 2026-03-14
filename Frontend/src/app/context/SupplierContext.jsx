import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSuppliers } from '../../shared/lib/supplierService';

const SupplierContext = createContext(null);

export function SupplierProvider({ children }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async (force = false) => {
    if (!force && suppliers.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSuppliers({ page: 1, pageSize: 100 });
      setSuppliers(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [suppliers.length]);

  useEffect(() => { fetchSuppliers(); }, []);

  const value = {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    refetch: () => fetchSuppliers(true)
  };

  return (
    <SupplierContext.Provider value={value}>
      {children}
    </SupplierContext.Provider>
  );
}

export function useSuppliers() {
  const context = useContext(SupplierContext);
  if (!context) throw new Error('useSuppliers must be used within a SupplierProvider');
  return context;
}
