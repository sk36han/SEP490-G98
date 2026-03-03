import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Eye, Package } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import { removeDiacritics } from '../utils/stringUtils';

const INITIAL_BRANDS = [
    { brandId: 1, brandCode: 'APPLE', brandName: 'Apple', isActive: true, itemCount: 5 },
    { brandId: 2, brandCode: 'SAMSUNG', brandName: 'Samsung', isActive: true, itemCount: 3 },
    { brandId: 3, brandCode: 'OTHER', brandName: 'Khác', isActive: true, itemCount: 2 },
];

const emptyBrand = { brandId: null, brandCode: '', brandName: '', isActive: true };

const PAGE_SIZE = 7;

const ViewBrandList = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    const canManageBrand =
        permissionRole === 'WAREHOUSE_KEEPER' || permissionRole === 'ACCOUNTANTS';
    const [rows, setRows] = useState(INITIAL_BRANDS);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(emptyBrand);
    const [detailBrand, setDetailBrand] = useState(null);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = normalize(searchTerm.trim());
        return rows.filter(
            (b) =>
                normalize(b.brandCode).includes(term) ||
                normalize(b.brandName).includes(term),
        );
    }, [rows, searchTerm]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const paginatedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleOpenCreate = () => {
        setEditing(false);
        setForm(emptyBrand);
        setDialogOpen(true);
    };

    const handleOpenEdit = (brand) => {
        setEditing(true);
        setForm(brand);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setForm(emptyBrand);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.brandCode.trim() || !form.brandName.trim()) {
            // eslint-disable-next-line no-alert
            alert('Vui lòng nhập đầy đủ Mã Brand và Tên Brand.');
            return;
        }

        if (editing) {
            setRows((prev) =>
                prev.map((b) =>
                    b.brandId === form.brandId
                        ? { ...b, brandCode: form.brandCode.trim(), brandName: form.brandName.trim() }
                        : b,
                ),
            );
        } else {
            const nextId = rows.length > 0 ? Math.max(...rows.map((b) => b.brandId)) + 1 : 1;
            setRows((prev) => [
                ...prev,
                {
                    brandId: nextId,
                    brandCode: form.brandCode.trim(),
                    brandName: form.brandName.trim(),
                    isActive: true,
                    itemCount: 0,
                },
            ]);
        }
        handleCloseDialog();
    };

    const handleToggleStatus = (brandId) => {
        if (!canManageBrand) return;
        setRows((prev) =>
            prev.map((b) => (b.brandId === brandId ? { ...b, isActive: !b.isActive } : b)),
        );
    };

    const handleResetMock = () => {
        if (!canManageBrand) return;
        setRows(INITIAL_BRANDS);
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
                                {canManageBrand && (
                                    <IconButton
                                        size="small"
                                        onClick={handleResetMock}
                                        sx={{ flexShrink: 0 }}
                                        title="Khôi phục dữ liệu mẫu"
                                    >
                                        <RefreshCw size={18} />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Card className="list-grid-card" sx={{ flex: 1, minHeight: 400, minWidth: 0, overflow: 'visible', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)', boxShadow: (t) => t.shadows[0], display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 360, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                            <TableContainer sx={{ flex: 1, width: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
                                <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell sx={{ fontWeight: 600, width: '5%', maxWidth: '5%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '12%', maxWidth: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Mã Brand</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '20%', maxWidth: '20%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tên Brand</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '10%', maxWidth: '10%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Số vật tư</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '12%', maxWidth: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '14%', maxWidth: '14%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Xem vật tư</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '27%', maxWidth: '27%', overflow: 'visible' }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    {rows.length === 0
                                                        ? 'Chưa có Brand nào. Nhấn "Thêm Brand" để tạo mới.'
                                                        : 'Không tìm thấy brand nào phù hợp.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((b, index) => (
                                                <TableRow key={b.brandId} hover>
                                                    <TableCell sx={{ width: '5%', maxWidth: '5%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page * PAGE_SIZE + index + 1}</TableCell>
                                                    <TableCell sx={{ width: '12%', maxWidth: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.brandCode}>{b.brandCode}</TableCell>
                                                    <TableCell
                                                        sx={{
                                                            width: '20%',
                                                            maxWidth: '20%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            cursor: 'pointer',
                                                            color: 'primary.main',
                                                            '&:hover': { textDecoration: 'underline' },
                                                        }}
                                                        onClick={() => handleViewItemsByBrand(b)}
                                                    >
                                                        {b.brandName}
                                                    </TableCell>
                                                    <TableCell sx={{ width: '10%', maxWidth: '10%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                                        {b.itemCount ?? 0}
                                                    </TableCell>
                                                    <TableCell sx={{ width: '12%', maxWidth: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <Chip
                                                            label={b.isActive ? 'Hoạt động' : 'Tắt'}
                                                            size="small"
                                                            color={b.isActive ? 'success' : 'default'}
                                                            onClick={() => canManageBrand && handleToggleStatus(b.brandId)}
                                                            sx={{ cursor: canManageBrand ? 'pointer' : 'default', borderRadius: 1.5 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ width: '14%', maxWidth: '14%', overflow: 'visible' }} align="left">
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
                                                    <TableCell align="right" sx={{ width: '27%', maxWidth: '27%', overflow: 'visible' }}>
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
                        </Box>
                    </CardContent>
                </Card>

                {totalCount > PAGE_SIZE && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, py: 1.5, flexShrink: 0 }}>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
                        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, minWidth: 72, textAlign: 'center' }}>Trang {page + 1} / {totalPages}</Typography>
                        <Button size="small" variant="outlined" disabled={page >= totalPages - 1 || totalCount === 0} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
                    </Box>
                )}
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
                                <Typography variant="caption" color="text.secondary">Mã Brand</Typography>
                                <Typography variant="body1" fontWeight={600}>{detailBrand.brandCode}</Typography>
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
                                    {detailBrand.itemCount ?? 0} vật tư
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
                                label="Mã Brand"
                                name="brandCode"
                                value={form.brandCode}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                required
                            />
                            <TextField
                                label="Tên Brand"
                                name="brandName"
                                value={form.brandName}
                                onChange={handleChange}
                                size="small"
                                fullWidth
                                required
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Lưu
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
            )}
        </Box>
    );
};

export default ViewBrandList;

