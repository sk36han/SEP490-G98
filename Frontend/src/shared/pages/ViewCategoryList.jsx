/*
 * Danh sách Danh mục sản phẩm – kết nối API CategoryController.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    useTheme,
    useMediaQuery,
    Popover,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    Tooltip,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Filter, Columns, Power, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import { getCategoryList, toggleCategoryStatus } from '../lib/categoryService';

const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const ViewCategoryList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canManage = permissionRole === 'WAREHOUSE_KEEPER';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [columnsAnchor, setColumnsAnchor] = useState(null);

    const currentPage = page + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const visibleColumnCount = showCode ? 7 : 6;

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getCategoryList({
                page: currentPage,
                pageSize,
                categoryName: searchTerm.trim() || undefined,
                isActive: showOnlyActive ? true : undefined,
            });
            setRows(result.items ?? []);
            setTotalItems(result.totalItems ?? 0);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách danh mục.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, showOnlyActive]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleToggleStatus = async (cat) => {
        if (!canManage) return;
        try {
            await toggleCategoryStatus(cat.categoryId, !cat.isActive);
            setRows((prev) =>
                prev.map((c) => (c.categoryId === cat.categoryId ? { ...c, isActive: !c.isActive } : c)),
            );
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không đổi được trạng thái.');
        }
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', pt: 0, pb: 2, width: '100%', maxWidth: '100%', ml: 0, mr: 0, boxSizing: 'border-box' }}>
            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', mb: 0.5 }}>
                    Danh mục sản phẩm
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Quản lý danh mục sản phẩm dùng để phân loại vật tư.
                </Typography>
            </Box>

            <Box className="list-view" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)', borderRadius: 3, p: 0.75, border: '1px solid', borderColor: 'divider', boxShadow: (t) => t.shadows[1], boxSizing: 'border-box' }}>
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput placeholder="Tìm theo mã, tên danh mục..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} sx={{ flex: '1 1 240px', minWidth: isMobile ? '100%' : 240, maxWidth: isMobile ? '100%' : 520 }} />
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => setFilterAnchor(e.currentTarget)}
                                    title="Bộ lọc"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Filter size={18} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={(e) => setColumnsAnchor(e.currentTarget)}
                                    title="Hiển thị cột"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Columns size={18} />
                                </IconButton>

                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {canManage && (
                                        <Button
                                            variant="contained"
                                            startIcon={<Plus size={18} />}
                                            sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                                            onClick={() => navigate('/categories/create')}
                                        >
                                            Thêm danh mục
                                        </Button>
                                    )}
                                    <IconButton size="small" onClick={fetchList} title="Làm mới" disabled={loading}>
                                        <RefreshCw size={18} />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
                        {error}
                    </Alert>
                )}

                <Card className="list-grid-card" sx={{ flex: 1, minHeight: 400, overflow: 'visible', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 360, overflow: 'visible' }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <TableContainer sx={{ flex: 1, width: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                                    <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                <TableCell sx={{ fontWeight: 600, width: 52, minWidth: 52, maxWidth: 52 }} align="center">STT</TableCell>
                                                {showCode && <TableCell sx={{ fontWeight: 600, width: '12%', px: 1.25 }}>Mã danh mục</TableCell>}
                                                <TableCell sx={{ fontWeight: 600, width: showCode ? '26%' : '34%', minWidth: 140, px: 1.25 }}>Tên</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 90, px: 1.25 }} align="center">Số lượng Item</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 100, px: 1.25 }}>Ngày tạo</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 100, px: 1.25 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 120, px: 1.25 }} align="right">Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={visibleColumnCount} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        {error ? 'Có lỗi khi tải dữ liệu.' : 'Chưa có danh mục nào.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rows.map((c, index) => (
                                                    <TableRow key={c.categoryId} hover>
                                                        <TableCell align="center" sx={{ width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: 'tabular-nums' }}>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                                        {showCode && <TableCell sx={{ px: 1.25 }}>{c.categoryCode}</TableCell>}
                                                        <TableCell sx={{ px: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{c.categoryName}</TableCell>
                                                        <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums', px: 1.25 }}>0</TableCell>
                                                        <TableCell sx={{ fontSize: '0.8rem', px: 1.25 }}>–</TableCell>
                                                        <TableCell sx={{ px: 1.25 }}>
                                                            <Chip
                                                                label={c.isActive ? 'Hoạt động' : 'Tắt'}
                                                                size="small"
                                                                color={c.isActive ? 'success' : 'default'}
                                                                sx={{ borderRadius: 1.5 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ px: 1.25 }}>
                                                            <Tooltip title="Xem vật tư thuộc danh mục này">
                                                                <IconButton size="small" onClick={() => navigate('/products', { state: { categoryName: c.categoryName } })} aria-label="Xem vật tư">
                                                                    <Package size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            {canManage && (
                                                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                                                    <Tooltip title={c.isActive ? 'Tắt' : 'Bật'}>
                                                                        <IconButton size="small" onClick={() => handleToggleStatus(c)} aria-label={c.isActive ? 'Tắt' : 'Bật'}>
                                                                            <Power size={18} style={{ color: c.isActive ? '#2e7d32' : '#757575' }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Chỉnh sửa">
                                                                        <IconButton size="small" aria-label="Chỉnh sửa" onClick={() => navigate(`/categories/edit/${c.categoryId}`)}>
                                                                            <Edit3 size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </CardContent>
                </Card>
                {!loading && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2, py: 1.5, flexShrink: 0 }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} sx={{ height: 32, fontSize: '0.875rem' }}>
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
                            {(totalItems === 0 ? 0 : page * pageSize + 1)}–{Math.min((page + 1) * pageSize, totalItems)} / {totalItems} (Tổng {totalPages} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
                        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, minWidth: 72, textAlign: 'center' }}>Trang {totalPages > 0 ? currentPage : 0} / {totalPages || 1}</Typography>
                        <Button size="small" variant="outlined" disabled={page >= totalPages - 1 || totalItems === 0} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
                    </Box>
                )}

                <Popover
                    open={Boolean(filterAnchor)}
                    anchorEl={filterAnchor}
                    onClose={() => setFilterAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                    <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Bộ lọc
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={showOnlyActive}
                                    onChange={(e) => {
                                        setShowOnlyActive(e.target.checked);
                                        setPage(0);
                                    }}
                                />
                            }
                            label="Chỉ hiển thị Hoạt động"
                        />
                    </Box>
                </Popover>

                <Popover
                    open={Boolean(columnsAnchor)}
                    anchorEl={columnsAnchor}
                    onClose={() => setColumnsAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                    <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            Cột hiển thị
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={showCode}
                                    onChange={(e) => {
                                        setShowCode(e.target.checked);
                                    }}
                                />
                            }
                            label="Mã danh mục"
                        />
                    </Box>
                </Popover>
            </Box>
        </Box>
    );
};

export default ViewCategoryList;
