import { useState, useCallback } from 'react';

export function useFilterPopup() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [filters, setFilters] = useState({});

  const openFilter = useCallback((event) => setAnchorEl(event.currentTarget), []);
  const closeFilter = useCallback(() => setAnchorEl(null), []);

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    closeFilter();
    return newFilters;
  }, [closeFilter]);

  const clearFilters = useCallback(() => setFilters({}), []);

  const hasFilters = useCallback(() => Object.values(filters).some(v => v !== '' && v != null), [filters]);

  return { anchorEl, filters, openFilter, closeFilter, applyFilters, clearFilters, hasFilters, isOpen: Boolean(anchorEl) };
}
