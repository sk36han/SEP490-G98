import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { viVN } from '@mui/x-data-grid/locales';
import { Filter, CloudOff } from 'lucide-react';
import { getSuppliers } from '../lib/supplierService';
import SupplierFilterPopup from '../components/SupplierFilterPopup';
import '../styles/SupplierView.css';

/**
 * Columns from backend ModelResponse/SupplierResponse.cs
 */
const COLUMNS = [
    { field: 'supplierId', headerName: 'ID', width: 80, type: 'number' },
    { field: 'supplierCode', headerName: 'Mã NCC', flex: 1, minWidth: 120 },
    { field: 'supplierName', headerName: 'Tên nhà cung cấp', flex: 1, minWidth: 180 },
    { field: 'taxCode', headerName: 'Mã số thuế', width: 130 },
    { field: 'phone', headerName: 'Điện thoại', width: 130 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 160 },
    { field: 'address', headerName: 'Địa chỉ', flex: 1, minWidth: 180 },
    {
        field: 'isActive',
        headerName: 'Trạng thái',
        width: 120,
        renderCell: (params) => (params.value ? 'Hoạt động' : 'Tắt'),
    },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export default function SupplierView() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [rows, setRows] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const getApiParams = useCallback(() => {
        const supplierName = filterValues.supplierName !== undefined && filterValues.supplierName !== ''
            ? filterValues.supplierName
            : searchTerm.trim();
        return {
            page: page + 1,
            pageSize,
            supplierCode: filterValues.supplierCode ?? '',
            supplierName: supplierName || '',
            taxCode: filterValues.taxCode ?? '',
            isActive: filterValues.isActive ?? null,
            fromDate: filterValues.fromDate ?? null,
            toDate: filterValues.toDate ?? null,
        };
    }, [page, pageSize, searchTerm, filterValues]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSuppliers(getApiParams());
            setRows(res.items ?? []);
            setTotalRows(res.totalItems ?? 0);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không thể kết nối đến server');
            setRows([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [getApiParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setPage(0);
    };

    const handleFilterApply = (values) => {
        setFilterValues(values);
        setPage(0);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const showOverlayError = error && !loading;
    const showEmpty = !loading && !error && rows.length === 0;
    const start = totalRows === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalRows);

    return (
        <Box
            className="supplier-view"
            sx={{
                width: '100%',
                maxWidth: '100%',
                background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                borderRadius: 3,
                p: 0.75,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (t) => t.shadows[1],
                boxSizing: 'border-box',
            }}
        >
            <SupplierFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

            {/* Header */}
            <Box className="supplier-view-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                <Typography variant="h5" fontWeight={600}>
                    Quản lý nhà cung cấp
                </Typography>
                <Button
                    className="supplier-page-btn"
                    variant="contained"
                    disabled
                    sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                >
                    Tạo mới (Coming soon)
                </Button>
            </Box>

            {/* Search bar: thứ tự Search input → Tìm kiếm → icon Filter */}
            <Card
                className="supplier-filter-card"
                sx={{
                    mb: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (t) => t.shadows[1],
                }}
            >
                <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 2, px: 2 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: 1.5,
                            alignItems: isMobile ? 'stretch' : 'center',
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm theo mã NCC, tên nhà cung cấp…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="supplier-search-input"
                            sx={{
                                width: isMobile ? '100%' : 480,
                                maxWidth: '100%',
                            }}
                        />
                        <Button
                            className="supplier-page-btn"
                            variant="contained"
                            onClick={handleSearch}
                            sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 40, px: 2 }}
                        >
                            Tìm kiếm
                        </Button>
                        <Tooltip title="Bộ lọc">
                            <IconButton
                                color="primary"
                                onClick={() => setFilterOpen(true)}
                                aria-label="Bộ lọc"
                                sx={{ border: 1, borderColor: 'divider' }}
                            >
                                <Filter size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </CardContent>
            </Card>

            {/* DataGrid – không Filter trong toolbar, chỉ Sort + Columns */}
            <Card
                className="supplier-grid-card"
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (t) => t.shadows[1],
                    p: 2,
                }}
            >
                <Box className="supplier-grid-wrapper" sx={{ position: 'relative', minHeight: 'calc(100vh - 260px)' }}>
                    <DataGrid
                        localeText={viVN}
                        rows={rows}
                        columns={COLUMNS}
                        getRowId={(row) => row.supplierId}
                        rowCount={totalRows}
                        loading={loading}
                        pagination={false}
                        showToolbar
                        slotProps={{ toolbar: { showQuickFilter: false } }}
                        disableRowSelectionOnClick
                        disableColumnSelector={false}
                        disableColumnFilter
                        showColumnVerticalBorder={false}
                        showCellVerticalBorder={false}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: theme.palette.grey[50],
                                alignItems: 'center',
                                minHeight: 48,
                                '& .MuiDataGrid-columnHeader': {
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 16px',
                                    outline: 'none',
                                    '&:focus, & .MuiDataGrid-columnHeaderFocusVisible': { outline: 'none' },
                                },
                                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, textAlign: 'center' },
                            },
                            '& .MuiDataGrid-cell': {
                                alignItems: 'center',
                                outline: 'none',
                                '&:focus, &:focus-within': { outline: 'none' },
                            },
                            '& .MuiDataGrid-row .MuiDataGrid-cell': {
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            },
                        }}
                        slots={{
                            noRowsOverlay: () =>
                                showEmpty ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary', py: 4 }}>
                                        <Typography>Chưa có dữ liệu nhà cung cấp</Typography>
                                    </Box>
                                ) : null,
                        }}
                    />
                    {showOverlayError && (
                        <Box
                            className="supplier-grid-error-overlay"
                            sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 100,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                zIndex: 5,
                                gap: 1.5,
                            }}
                        >
                            <CloudOff size={40} style={{ color: theme.palette.text.secondary }} />
                            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                                Không thể kết nối đến máy chủ
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Vui lòng thử lại sau
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => fetchData()}
                                sx={{ mt: 0.5, textTransform: 'none' }}
                            >
                                Thử lại
                            </Button>
                        </Box>
                    )}
                </Box>
            </Card>

            {/* Pagination – gom hết bên phải: Số dòng/trang + dropdown + range + Trước/Sau */}
            <Box
                sx={{
                    mt: 1.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 2,
                }}
            >
                <Typography variant="body2" color="text.secondary">Số dòng / trang:</Typography>
                <FormControl size="small" sx={{ minWidth: 72 }}>
                    <Select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        sx={{ height: 32, fontSize: '0.875rem' }}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                    {start}–{end} of {totalRows}
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={page <= 0}
                    onClick={() => handlePageChange(page - 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Trước
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={end >= totalRows || totalRows === 0}
                    onClick={() => handlePageChange(page + 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Sau
                </Button>
            </Box>
        </Box>
    );
}
