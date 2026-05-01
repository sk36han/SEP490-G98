import { useState, useEffect, useCallback } from 'react';

export function useListData(fetchFn, options = {}) {
  const { initialPage = 1, initialPageSize = 20 } = options;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage - 1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ page: page + 1, pageSize, search: searchTerm, ...params });
      setRows(result.items || []);
      setTotalItems(result.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, searchTerm]);

  useEffect(() => { fetchList(); }, [fetchList]);

  return {
    rows, loading, error, page, pageSize, totalItems, searchTerm,
    setSearchTerm: (term) => { setSearchTerm(term); setPage(0); },
    setPage, setPageSize,
    refetch: fetchList,
  };
}
