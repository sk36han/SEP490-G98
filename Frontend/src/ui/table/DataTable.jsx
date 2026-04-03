import { DataGrid } from '@mui/x-data-grid';
import { headCellBaseSx, bodyCellBaseSx } from './styles';

export function DataTable({ columns, rows, loading, paginationMode = 'server', ...props }) {
  return (
    <DataGrid
      columns={columns}
      rows={rows}
      loading={loading}
      paginationMode={paginationMode}
      disableRowSelectionOnClick
      autoHeight
      getRowClassName={() => 'table-row'}
      sx={{
        border: 'none',
        '& .table-row:hover': { bgcolor: '#f9fafb' },
        '& .MuiDataGrid-columnHeaders': {
          bgcolor: '#fafafa',
        },
      }}
      {...props}
    />
  );
}
