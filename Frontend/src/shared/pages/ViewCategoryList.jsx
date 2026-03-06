/*
 * Danh sách Danh mục sản phẩm – mục con Vật tư.
 * Các trường: STT, Mã danh mục, Tên, Số lượng Item thuộc danh mục, Ngày tạo, Ngày cập nhật, Trạng thái, Hành động.
 */
import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Filter, Columns } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import { removeDiacritics } from '../utils/stringUtils';

const formatDate = (dateStr) => {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
};

const INITIAL_CATEGORIES = [
    { categoryId: 1, categoryCode: 'DT', categoryName: 'Điện thoại', itemCount: 2, createdAt: '2025-02-01T08:00:00', updatedAt: '2025-02-14T08:30:00', isActive: true },
    { categoryId: 2, categoryCode: 'LT', categoryName: 'Laptop', itemCount: 1, createdAt: '2025-02-01T08:00:00', updatedAt: '2025-02-12T09:15:00', isActive: true },
    { categoryId: 3, categoryCode: 'DL', categoryName: 'Điện lạnh', itemCount: 1, createdAt: '2025-02-01T08:00:00', updatedAt: '2025-02-10T16:45:00', isActive: true },
    { categoryId: 4, categoryCode: 'PK', categoryName: 'Phụ kiện', itemCount: 2, createdAt: '2025-02-01T08:00:00', updatedAt: '2025-02-14T07:00:00', isActive: true },
];

const PAGE_SIZE = 7;

const ViewCategoryList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canManage = permissionRole === 'WAREHOUSE_KEEPER';
    const [rows, setRows] = useState(INITIAL_CATEGORIES);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [columnsAnchor, setColumnsAnchor] = useState(null);

    const filteredRows = useMemo(() => {
        let result = rows;
        if (searchTerm.trim()) {
            const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
            const term = normalize(searchTerm.trim());
            result = result.filter(
                (c) =>
                    normalize(c.categoryCode).includes(term) ||
                    normalize(c.categoryName).includes(term),
            );
        }
        if (showOnlyActive) {
            result = result.filter((c) => c.isActive);
        }
        return result;
    }, [rows, searchTerm, showOnlyActive]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const paginatedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const visibleColumnCount = showCode ? 8 : 7;

    const handleResetMock = () => {
        if (!canManage) return;
        setRows(INITIAL_CATEGORIES);
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
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                borderRadius: 2,
                                                minHeight: 36,
                                                px: 2,
                                            }}
                                            onClick={() => navigate('/categories/create')}
                                        >
                                            Thêm danh mục
                                        </Button>
                                    )}
                                    {canManage && (
                                        <IconButton size="small" onClick={handleResetMock} title="Khôi phục dữ liệu mẫu">
                                            <RefreshCw size={18} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Card className="list-grid-card" sx={{ flex: 1, minHeight: 400, overflow: 'visible', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 360, overflow: 'visible' }}>
                            <TableContainer sx={{ flex: 1, width: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                                <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell sx={{ fontWeight: 600, width: '6%' }} align="center">STT</TableCell>
                                            {showCode && (
                                                <TableCell sx={{ fontWeight: 600, width: '12%' }}>Mã danh mục</TableCell>
                                            )}
                                            <TableCell sx={{ fontWeight: 600, width: showCode ? '22%' : '30%' }}>Tên</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '14%' }} align="center">Số lượng Item</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '14%' }}>Ngày tạo</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '14%' }}>Ngày cập nhật</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '12%' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '4%' }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={visibleColumnCount} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    {rows.length === 0 ? 'Chưa có danh mục nào.' : 'Không tìm thấy kết quả.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((c, index) => (
                                                <TableRow key={c.categoryId} hover>
                                                    <TableCell align="center">{page * PAGE_SIZE + index + 1}</TableCell>
                                                    {showCode && <TableCell>{c.categoryCode}</TableCell>}
                                                    <TableCell
                                                        sx={{
                                                            maxWidth: 260,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {c.categoryName}
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                        {(c.itemCount ?? 0).toLocaleString('vi-VN')}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(c.updatedAt)}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={c.isActive ? 'Hoạt động' : 'Tắt'}
                                                            size="small"
                                                            color={c.isActive ? 'success' : 'default'}
                                                            sx={{ borderRadius: 1.5 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {canManage && (
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Chỉnh sửa"
                                                                onClick={() => navigate(`/categories/edit/${c.categoryId}`)}
                                                            >
                                                                <Edit3 size={18} />
                                                            </IconButton>
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
