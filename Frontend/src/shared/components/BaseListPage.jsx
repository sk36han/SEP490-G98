import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Card } from '@mui/material';
import { DataTable } from '../../ui/table/DataTable';
import { TablePagination } from '../../ui/table/TablePagination';
import { SearchInput } from './SearchInput';
import { useFilterPopup } from '../hooks/useFilterPopup';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function BaseListPage({
  title, columns, fetchData, defaultVisibleColumns = [],
  filterComponent: FilterComponent, onRowClick, children
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const filterPopup = useFilterPopup();
  const [visibleColumnIds] = useLocalStorage(`${title}VisibleColumns`, new Set(defaultVisibleColumns));

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData({ page: page + 1, pageSize, search: searchTerm, ...filterPopup.filters });
      setRows(result.items || []);
      setTotalItems(result.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, searchTerm, filterPopup.filters]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const visibleColumns = columns.filter(col => !visibleColumnIds.size || visibleColumnIds.has(col.field));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>{title}</Typography>
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={searchTerm} onChange={setSearchTerm} />
          {FilterComponent && <FilterComponent {...filterPopup} />}
          {children}
        </Box>
      </Card>
      <Paper>
        <DataTable
          columns={visibleColumns} rows={rows} loading={loading}
          paginationMode="server" rowCount={totalItems}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
          onRowClick={onRowClick}
        />
        <TablePagination
          count={totalItems} page={page} rowsPerPage={pageSize}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>
    </Box>
  );
}
