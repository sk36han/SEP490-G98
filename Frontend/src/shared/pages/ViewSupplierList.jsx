import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Filter, CloudOff, Columns, Eye, Edit, Plus } from 'lucide-react';
import { getSuppliers } from '../lib/supplierService';
import SearchInput from '../components/SearchInput';
import SupplierFilterPopup from '../components/SupplierFilterPopup';
import ViewSupplierDetail from '../components/ViewSupplierDetail';
import EditSupplierPopup from '../components/EditSupplierPopup';
import '../styles/SupplierView.css';

const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const SUPPLIER_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: () => '' },
    { id: 'supplierCode', label: 'Mã NCC', getValue: (row) => row.supplierCode ?? '' },
    { id: 'supplierName', label: 'Tên nhà cung cấp', getValue: (row) => row.supplierName ?? '' },
    { id: 'taxCode', label: 'Mã số thuế', getValue: (row) => row.taxCode ?? '' },
    { id: 'phone', label: 'Điện thoại', getValue: (row) => row.phone ?? '' },
    { id: 'email', label: 'Email', getValue: (row) => row.email ?? '' },
    { id: 'address', label: 'Địa chỉ', getValue: (row) => row.address ?? '' },
    { id: 'isActive', label: 'Trạng thái', getValue: (row) => (row.isActive ? 'Hoạt động' : 'Tắt') },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = SUPPLIER_COLUMNS.map((c) => c.id);

const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt': return 0.6;
        case 'supplierCode': return 1.2;
        case 'supplierName': return 2.2;
        case 'taxCode': return 1.2;
        case 'phone': return 1.2;
        case 'email': return 1.5;
        case 'address': return 2;
        case 'isActive': return 1.2;
        case 'actions': return 1.4;
        default: return 1;
    }
};

const getColumnCellSx = (colId, widthPct) => {
    const base = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: `${widthPct}%`,
        maxWidth: `${widthPct}%`,
        boxSizing: 'border-box',
    };
    return colId === 'actions' ? { ...base, overflow: 'visible' } : base;
};

export default function ViewSupplierList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [rows, setRows] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(7);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailSupplier, setDetailSupplier] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState(null);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());
    };

    const visibleColumns = SUPPLIER_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const totalWeight = visibleColumns.reduce((acc, col) => acc + getColumnWeight(col.id), 0);
    const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const getApiParams = useCallback(() => {
        const fv = filterValues || {};
        const supplierName =
            fv.supplierName !== undefined && String(fv.supplierName).trim() !== ''
                ? String(fv.supplierName).trim()
                : String(searchTerm ?? '').trim();
        const fromDate = fv.fromDate;
        const toDate = fv.toDate;
        return {
            page: Number(page) + 1 || 1,
            pageSize: Number(pageSize) || 7,
            supplierCode: fv.supplierCode != null ? String(fv.supplierCode) : '',
            supplierName: supplierName || '',
            taxCode: fv.taxCode != null ? String(fv.taxCode) : '',
            isActive: fv.isActive ?? null,
            fromDate: typeof fromDate === 'string' ? fromDate : null,
            toDate: typeof toDate === 'string' ? toDate : null,
        };
    }, [page, pageSize, searchTerm, filterValues]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSuppliers(getApiParams());
            setRows(Array.isArray(res?.items) ? res.items : []);
            setTotalRows(res?.totalItems ?? 0);
        } catch (err) {
            const status = err?.response?.status;
            let msg = err?.response?.data?.message ?? err?.message;
            if (status === 404) {
                msg =
                    'API Supplier trả 404. Kiểm tra backend (localhost:5141) đang chạy và có Controller Supplier với route GET api/Supplier/list-all.';
            } else if (!msg || typeof msg !== 'string') {
                msg = 'Không thể kết nối đến server. Kiểm tra backend và CORS.';
            }
            setError(msg);
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
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalRows / pageSize)) : 0;

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                pt: 0,
                pb: 2,
                width: '100%',
                maxWidth: '100%',
                ml: 0,
                mr: 0,
                boxSizing: 'border-box',
            }}
        >
            <ViewSupplierDetail
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setDetailSupplier(null);
                }}
                supplier={detailSupplier}
            />
            <EditSupplierPopup
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setEditSupplier(null);
                }}
                supplier={editSupplier}
                onSave={fetchData}
            />

            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    fontWeight="800"
                    sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Quản lý nhà cung cấp
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    Tra cứu và quản lý thông tin nhà cung cấp.
                </Typography>
            </Box>

            <Box
                className="supplier-view"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
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

                <Card
                    className="supplier-filter-card"
                    sx={{
                        mb: 1,
                        borderRadius: 3,
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                    }}
                >
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: 1.5,
                                alignItems: isMobile ? 'stretch' : 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <SearchInput
                                placeholder="Tìm kiếm theo mã NCC, tên nhà cung cấp…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                }}
                            />
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
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                                    aria-label="Chọn cột"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    className="list-page-btn"
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => navigate('/suppliers/create')}
                                    sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                                >
                                    Thêm nhà cung cấp
                                </Button>
                            </Box>
                            
                        </Box>
                    </CardContent>
                </Card>

                <Popover
                    open={columnSelectorOpen}
                    anchorEl={columnSelectorAnchor}
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>
                        Chọn cột hiển thị
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={visibleColumnIds.size === SUPPLIER_COLUMNS.length}
                                    indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < SUPPLIER_COLUMNS.length}
                                    onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                />
                            }
                            label="Tất cả"
                        />
                        {SUPPLIER_COLUMNS.map((col) => (
                            <FormControlLabel
                                key={col.id}
                                control={
                                    <Checkbox
                                        checked={visibleColumnIds.has(col.id)}
                                        onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                    />
                                }
                                label={col.label}
                            />
                        ))}
                    </FormGroup>
                </Popover>

                <Card
                    className="supplier-grid-card"
                    sx={{
                        flex: 1,
                        minHeight: 400,
                        minWidth: 0,
                        overflow: 'visible',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                        p: 1,
                    }}
                >
                    <Box className="supplier-grid-wrapper" sx={{ flex: 1, minHeight: 360, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                <Typography color="text.secondary">Đang tải…</Typography>
                            </Box>
                        ) : showOverlayError ? (
                            <Box
                                className="supplier-grid-error-overlay"
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 200,
                                    backgroundColor: 'rgba(255,255,255,0.95)',
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
                        ) : showEmpty ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                                <Typography>Chưa có dữ liệu nhà cung cấp</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
                                <Table size="small" stickyHeader sx={{ width: '100%', tableLayout: 'fixed' }}>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id} sx={{ ...getColumnCellSx(col.id, getColWidthPct(col.id)), fontWeight: 600, bgcolor: 'grey.50' }} align={col.id === 'actions' ? 'right' : 'left'}>
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.supplierId} hover>
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, getColWidthPct(col.id))}>
                                                                {page * pageSize + index + 1}
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right" sx={getColumnCellSx(col.id, getColWidthPct(col.id))}>
                                                                <Tooltip title="Xem">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => {
                                                                            setDetailSupplier(row);
                                                                            setDetailOpen(true);
                                                                        }}
                                                                        aria-label="Xem"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Sửa">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => {
                                                                            setEditSupplier(row);
                                                                            setEditOpen(true);
                                                                        }}
                                                                        aria-label="Sửa"
                                                                    >
                                                                        <Edit size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        );
                                                    }
                                                    return <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, getColWidthPct(col.id))} title={col.getValue(row)}>{col.getValue(row)}</TableCell>;
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Card>

                <Box
                    sx={{
                        flexShrink: 0,
                        mt: 1,
                        pt: 1,
                        pb: 0.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                        overflow: 'visible',
                        minHeight: 48,
                    }}
                >
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Số dòng / trang:</Typography>
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
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {start}–{end} / {totalRows} (Tổng {totalPages} trang)
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
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ px: 1.5, minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                        Trang {page + 1} / {totalPages || 1}
                    </Typography>
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
        </Box>
    );
}
