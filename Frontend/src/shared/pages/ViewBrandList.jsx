import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Stack,
    Tooltip,
    useTheme,
    useMediaQuery,
    CircularProgress,
    Alert,
    FormControlLabel,
    Checkbox,
    Popover,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Eye, Package, Filter } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import { getBrandList, createBrand, updateBrand, toggleBrandStatus } from '../lib/brandService';

const emptyBrand = { brandId: null, brandName: '', isActive: true };

const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

/** Hiển thị "mã" từ tên (backend không có brandCode). */
const getBrandCodeDisplay = (b) =>
    (b.brandName || '')
        .trim()
        .replace(/\s+/g, '_')
        .toUpperCase()
        .slice(0, 12) || '–';

const ViewBrandList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    const canManageBrand =
        permissionRole === 'WAREHOUSE_KEEPER' || permissionRole === 'ACCOUNTANTS';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(emptyBrand);
    const [detailBrand, setDetailBrand] = useState(null);

    const currentPage = page + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getBrandList({
                page: currentPage,
                pageSize,
                brandName: searchTerm.trim() || undefined,
                isActive: showOnlyActive ? true : undefined,
            });
            setRows(result.items ?? []);
            setTotalItems(result.totalItems ?? 0);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách thương hiệu.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, showOnlyActive]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleOpenCreate = () => {
        setEditing(false);
        setForm(emptyBrand);
        setDialogOpen(true);
    };

    const handleOpenEdit = (brand) => {
        setEditing(true);
        setForm({ brandId: brand.brandId, brandName: brand.brandName ?? '', isActive: brand.isActive ?? true });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setForm(emptyBrand);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (form.brandName || '').trim();
        if (!name || name.length < 2) {
            return;
        }
        setSubmitting(true);
        try {
            if (editing) {
                await updateBrand(form.brandId, { brandName: name, isActive: form.isActive });
            } else {
                await createBrand({ brandName: name });
            }
            handleCloseDialog();
            fetchList();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (brand) => {
        if (!canManageBrand) return;
        try {
            await toggleBrandStatus(brand.brandId, !brand.isActive);
            setRows((prev) =>
                prev.map((b) => (b.brandId === brand.brandId ? { ...b, isActive: !b.isActive } : b)),
            );
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không đổi được trạng thái.');
        }
    };

    const handleViewItemsByBrand = (brand) => {
        if (!brand) return;
        navigate('/products', { state: { brandName: brand.brandName } });
    };

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
            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        fontWeight="800"
                        sx={{
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            backgroundClip: 'text',
                            textFillColor: 'transparent',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Danh sách Brand (Thương hiệu)
                    </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Quản lý các Brand dùng để gán cho vật tư trong hệ thống. Bạn có thể tạo mới, chỉnh sửa
                    và bật/tắt trạng thái Brand ngay trên trang này.
                </Typography>
            </Box>

            <Box
                className="list-view"
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
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã brand, tên brand..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                sx={{ flex: '1 1 240px', minWidth: isMobile ? '100%' : 240, maxWidth: isMobile ? '100%' : 520 }}
                            />
                            <IconButton
                                size="small"
                                onClick={(e) => setFilterAnchor(e.currentTarget)}
                                title="Bộ lọc"
                                sx={{ border: 1, borderColor: 'divider' }}
                            >
                                <Filter size={18} />
                            </IconButton>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
                                {canManageBrand && (
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={handleOpenCreate}
                                        sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                                    >
                                        Thêm Brand
                                    </Button>
                                )}
                                <IconButton size="small" onClick={fetchList} sx={{ flexShrink: 0 }} title="Làm mới">
                                    <RefreshCw size={18} />
                                </IconButton>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
                        {error}
                    </Alert>
                )}

                <Card className="list-grid-card" sx={{ flex: 1, minHeight: 400, minWidth: 0, overflow: 'visible', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)', boxShadow: (t) => t.shadows[0], display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 360, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <TableContainer sx={{ flex: 1, width: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
                                    <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                <TableCell sx={{ fontWeight: 600, width: 52, minWidth: 52, maxWidth: 52 }} align="center">STT</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '32%', minWidth: 160, px: 1.25 }}>Tên Brand</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '12%', minWidth: 80, px: 1.25 }} align="center">Số vật tư</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 100, px: 1.25 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '16%', minWidth: 100, px: 1.25 }}>Xem vật tư</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '18%', minWidth: 120, px: 1.25 }} align="right">Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        {error ? 'Có lỗi khi tải dữ liệu.' : 'Chưa có Brand nào. Nhấn "Thêm Brand" để tạo mới.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rows.map((b, index) => (
                                                    <TableRow key={b.brandId} hover>
                                                        <TableCell align="center" sx={{ width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: 'tabular-nums' }}>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                                        <TableCell sx={{ px: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.brandName}</TableCell>
                                                        <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums', px: 1.25 }}>0</TableCell>
                                                        <TableCell sx={{ px: 1.25 }}>
                                                            <Chip
                                                                label={b.isActive ? 'Hoạt động' : 'Tắt'}
                                                                size="small"
                                                                color={b.isActive ? 'success' : 'default'}
                                                                onClick={() => canManageBrand && handleToggleStatus(b)}
                                                                sx={{ cursor: canManageBrand ? 'pointer' : 'default', borderRadius: 1.5 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ px: 1.25 }}>
                                                            <Tooltip title="Xem danh sách vật tư thuộc brand">
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<Package size={14} />}
                                                                    onClick={() => handleViewItemsByBrand(b)}
                                                                    sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, px: 1 }}
                                                                >
                                                                    Xem vật tư
                                                                </Button>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ px: 1.25 }}>
                                                            <Tooltip title="Xem chi tiết">
                                                                <IconButton size="small" onClick={() => setDetailBrand(b)} aria-label="Xem chi tiết">
                                                                    <Eye size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            {canManageBrand && (
                                                                <Tooltip title="Chỉnh sửa">
                                                                    <IconButton size="small" onClick={() => handleOpenEdit(b)} aria-label="Chỉnh sửa">
                                                                        <Edit3 size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
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

                <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
                    <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Bộ lọc</Typography>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={showOnlyActive} onChange={(e) => { setShowOnlyActive(e.target.checked); setPage(0); }} />}
                            label="Chỉ hiển thị đang hoạt động"
                        />
                    </Box>
                </Popover>
            </Box>

            {/* Dialog chi tiết Brand */}
            <Dialog
                open={Boolean(detailBrand)}
                onClose={() => setDetailBrand(null)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: 2 } },
                }}
            >
                <DialogTitle sx={{ pb: 0 }}>
                    Chi tiết Brand
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    {detailBrand && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Mã hiển thị</Typography>
                                <Typography variant="body1" fontWeight={600}>{getBrandCodeDisplay(detailBrand)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Tên Brand</Typography>
                                <Typography variant="body1" fontWeight={600}>{detailBrand.brandName}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Chip
                                        label={detailBrand.isActive ? 'Hoạt động' : 'Tắt'}
                                        size="small"
                                        color={detailBrand.isActive ? 'success' : 'default'}
                                        sx={{ borderRadius: 1.5 }}
                                    />
                                </Box>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Số vật tư thuộc brand</Typography>
                                <Typography variant="body1" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    0 vật tư
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDetailBrand(null)} sx={{ textTransform: 'none' }}>
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Package size={18} />}
                        onClick={() => {
                            if (detailBrand) {
                                setDetailBrand(null);
                                handleViewItemsByBrand(detailBrand);
                            }
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Xem danh sách vật tư
                    </Button>
                </DialogActions>
            </Dialog>

            {canManageBrand && (
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    {editing ? 'Chỉnh sửa Brand' : 'Thêm Brand mới'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <TextField
                                label="Tên thương hiệu"
                                name="brandName"
                                value={form.brandName}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                required
                                placeholder="VD: Apple, Samsung"
                                helperText="Từ 2 đến 255 ký tự"
                            />
                            {editing && (
                                <FormControlLabel
                                    control={<Checkbox name="isActive" checked={form.isActive} onChange={handleChange} />}
                                    label="Đang hoạt động"
                                />
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }} disabled={submitting}>
                            Hủy
                        </Button>
                        <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }} disabled={submitting}>
                            {submitting ? 'Đang lưu…' : 'Lưu'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
            )}
        </Box>
    );
};

export default ViewBrandList;

