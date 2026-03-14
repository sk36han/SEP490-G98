import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCategoryList } from '../../shared/lib/categoryService';

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async (force = false) => {
    if (!force && categories.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCategoryList({ page: 1, pageSize: 100 });
      setCategories(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categories.length]);

  useEffect(() => { fetchCategories(); }, []);

  const value = {
    categories,
    loading,
    error,
    fetchCategories,
    refetch: () => fetchCategories(true)
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within a CategoryProvider');
  return context;
}
