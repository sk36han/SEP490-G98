import { TablePagination as MuiTablePagination } from '@mui/material';

export function TablePagination({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, ...props }) {
  return (
    <MuiTablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={[10, 20, 50, 100]}
      {...props}
    />
  );
}
