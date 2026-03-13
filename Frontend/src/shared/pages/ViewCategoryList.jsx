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
    Tooltip,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Filter, Columns, Power, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import { getCategoryList, toggleCategoryStatus } from '../lib/categoryService';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const headCellBaseSx = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    height: 48,
    py: 0,
    px: 2,
    verticalAlign: 'middle',
};

const bodyCellBaseSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

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

    const start = totalItems === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalItems);

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafafa',
            }}
        >
            {/* Page Header */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 2 },
                    py: 2.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Typography
                    variant="h5"
                    component="h1"
                    fontWeight="600"
                    sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                >
                    Danh mục sản phẩm
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Quản lý danh mục sản phẩm dùng để phân loại vật tư.
                </Typography>
            </Box>

            {/* Body */}
            <Box
                className="list-view"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    boxSizing: 'border-box',
                }}
            >
                {/* Outer White Container */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        bgcolor: '#ffffff',
                    }}
                >
                    {/* Filter Toolbar Card */}
                    <Card
                        className="list-filter-card"
                        sx={{
                            mb: 0,
                            borderRadius: '12px 12px 0 0',
                            border: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            boxShadow: 'none',
                        }}
                    >
                        <CardContent
                            sx={{
                                '&.MuiCardContent-root:last-child': { pb: 1.5 },
                                pt: 2,
                                px: 2,
                            }}
                        >
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
                                    placeholder="Tìm kiếm theo tên danh mục..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(0);
                                    }}
                                    sx={{
                                        flex: '1 1 200px',
                                        minWidth: isMobile ? '100%' : 200,
                                        maxWidth: isMobile ? '100%' : 480,
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f3f4f6',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            '& fieldset': {
                                                border: 'none',
                                            },
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                            '&.Mui-focused': {
                                                bgcolor: '#ffffff',
                                                borderColor: '#3b82f6',
                                                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                            },
                                            '& input::placeholder': {
                                                color: '#9ca3af',
                                                fontSize: '13px',
                                            },
                                        },
                                    }}
                                />

                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        ml: isMobile ? 0 : 'auto',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Tooltip title="Bộ lọc">
                                        <IconButton
                                            color="primary"
                                            onClick={(e) => setFilterAnchor(e.currentTarget)}
                                            aria-label="Bộ lọc"
                                            sx={{
                                                border: '1px solid #e5e7eb',
                                                bgcolor: '#ffffff',
                                                borderRadius: '10px',
                                                '&:hover': {
                                                    bgcolor: '#f9fafb',
                                                    borderColor: '#d1d5db',
                                                },
                                            }}
                                        >
                                            <Filter size={20} />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Chọn cột hiển thị">
                                        <IconButton
                                            color="primary"
                                            onClick={(e) => setColumnsAnchor(e.currentTarget)}
                                            aria-label="Chọn cột"
                                            sx={{
                                                border: '1px solid #e5e7eb',
                                                bgcolor: '#ffffff',
                                                borderRadius: '10px',
                                                '&:hover': {
                                                    bgcolor: '#f9fafb',
                                                    borderColor: '#d1d5db',
                                                },
                                            }}
                                        >
                                            <Columns size={20} />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Làm mới">
                                        <span>
                                            <IconButton
                                                color="primary"
                                                onClick={fetchList}
                                                disabled={loading}
                                                aria-label="Làm mới"
                                                sx={{
                                                    border: '1px solid #e5e7eb',
                                                    bgcolor: '#ffffff',
                                                    borderRadius: '10px',
                                                    '&:hover': {
                                                        bgcolor: '#f9fafb',
                                                        borderColor: '#d1d5db',
                                                    },
                                                }}
                                            >
                                                <RefreshCw size={20} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>

                                    {canManage && (
                                        <Button
                                            className="list-page-btn"
                                            variant="contained"
                                            startIcon={<Plus size={18} />}
                                            onClick={() => navigate('/categories/create')}
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                textTransform: 'none',
                                                borderRadius: 10,
                                                minHeight: 38,
                                                px: 2.5,
                                                bgcolor: '#0284c7',
                                                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                                '&:hover': {
                                                    bgcolor: '#0369a1',
                                                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                                },
                                            }}
                                        >
                                            Thêm danh mục
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Filter Popover */}
                    <Popover
                        open={Boolean(filterAnchor)}
                        anchorEl={filterAnchor}
                        onClose={() => setFilterAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ p: 2 }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                sx={{ mb: 1.5, fontSize: '14px', color: '#111827' }}
                            >
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
                                        sx={{
                                            color: '#9ca3af',
                                            '&.Mui-checked': { color: '#3b82f6' },
                                        }}
                                    />
                                }
                                label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>Chỉ hiển thị Hoạt động</Typography>}
                            />
                        </Box>
                    </Popover>

                    {/* Columns Popover */}
                    <Popover
                        open={Boolean(columnsAnchor)}
                        anchorEl={columnsAnchor}
                        onClose={() => setColumnsAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ p: 2, minWidth: 180 }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                sx={{ mb: 1.5, fontSize: '14px', color: '#111827' }}
                            >
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
                                        sx={{
                                            color: '#9ca3af',
                                            '&.Mui-checked': { color: '#3b82f6' },
                                        }}
                                    />
                                }
                                label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>Mã danh mục</Typography>}
                            />
                        </Box>
                    </Popover>

                    {/* Grid Card / Table */}
                    <Card
                        className="list-grid-card"
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 0,
                            border: 'none',
                            boxShadow: 'none',
                            p: 0,
                        }}
                    >
                        <Box
                            className="list-grid-wrapper"
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                minWidth: 0,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                            }}
                        >
                            {/* Loading State */}
                            {loading ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 8,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <CircularProgress size={40} sx={{ mb: 2 }} />
                                    <Typography variant="body2">Đang tải danh sách danh mục…</Typography>
                                </Box>
                            ) : error ? (
                                /* Error State */
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        color: 'error.main',
                                        textAlign: 'center',
                                        px: 2,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        {error}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => fetchList()}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Thử lại
                                    </Button>
                                </Box>
                            ) : rows.length === 0 ? (
                                /* Empty State */
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        px: 2,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <Typography>Chưa có dữ liệu danh mục</Typography>
                                </Box>
                            ) : (
                                /* Table */
                                <TableContainer
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        minWidth: 0,
                                        width: '100%',
                                        maxWidth: '100%',
                                        overflow: 'auto',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <Table
                                        size="small"
                                        stickyHeader
                                        sx={{
                                            minWidth: '100%',
                                            width: 'max-content',
                                            tableLayout: 'fixed',
                                            borderCollapse: 'separate',
                                            borderSpacing: 0,
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow>
                                                <TableCell
                                                    sx={{
                                                        ...headCellBaseSx,
                                                        width: 56,
                                                        minWidth: 56,
                                                        maxWidth: 56,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    STT
                                                </TableCell>
                                                {showCode && (
                                                    <TableCell sx={{ ...headCellBaseSx, width: 140, minWidth: 140 }}>
                                                        Mã danh mục
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ ...headCellBaseSx, minWidth: 280 }}>
                                                    Tên
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        ...headCellBaseSx,
                                                        width: 140,
                                                        minWidth: 140,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    Số lượng Item
                                                </TableCell>
                                                <TableCell sx={{ ...headCellBaseSx, width: 140, minWidth: 140 }}>
                                                    Ngày tạo
                                                </TableCell>
                                                <TableCell sx={{ ...headCellBaseSx, width: 200, minWidth: 200 }}>
                                                    Trạng thái
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((c, index) => (
                                                <TableRow
                                                    key={c.categoryId}
                                                    hover
                                                    sx={{
                                                        height: 52,
                                                        '&:hover': {
                                                            bgcolor: '#f9fafb',
                                                        },
                                                    }}
                                                >
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            ...bodyCellBaseSx,
                                                            width: 56,
                                                            minWidth: 56,
                                                            maxWidth: 56,
                                                        }}
                                                    >
                                                        {page * pageSize + index + 1}
                                                    </TableCell>
                                                    {showCode && (
                                                        <TableCell sx={{ ...bodyCellBaseSx }}>
                                                            {c.categoryCode}
                                                        </TableCell>
                                                    )}
                                                    <TableCell sx={{ ...bodyCellBaseSx }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.75,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                }}
                                                                title={c.categoryName}
                                                            >
                                                                {c.categoryName}
                                                            </Typography>
                                                            <Tooltip title="Xem vật tư thuộc danh mục này">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        navigate('/products', {
                                                                            state: { categoryName: c.categoryName },
                                                                        })
                                                                    }
                                                                    aria-label="Xem vật tư"
                                                                    sx={{
                                                                        color: '#6b7280',
                                                                        flexShrink: 0,
                                                                        '&:hover': { bgcolor: '#f3f4f6' },
                                                                    }}
                                                                >
                                                                    <Package size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell
                                                        align="center"
                                                        sx={{
                                                            ...bodyCellBaseSx,
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        0
                                                    </TableCell>
                                                    <TableCell sx={{ ...bodyCellBaseSx, fontSize: '0.8rem' }}>–</TableCell>
                                                    <TableCell sx={{ ...bodyCellBaseSx }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 1,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Chip
                                                                label={c.isActive ? '• Hoạt động' : '• Tạm dừng'}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    fontSize: '12px',
                                                                    lineHeight: '16px',
                                                                    borderRadius: '999px',
                                                                    minWidth: 100,
                                                                    height: '26px',
                                                                    bgcolor: c.isActive
                                                                        ? 'rgba(16, 185, 129, 0.2)'
                                                                        : 'rgba(107, 114, 128, 0.2)',
                                                                    color: '#374151',
                                                                    border: 'none',
                                                                    boxShadow: 'none',
                                                                    '& .MuiChip-label': {
                                                                        px: 1.5,
                                                                        py: 0,
                                                                        textAlign: 'left',
                                                                    },
                                                                }}
                                                            />
                                                            {canManage && (
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 0.25,
                                                                    }}
                                                                >
                                                                    <Tooltip title={c.isActive ? 'Tắt' : 'Bật'}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleToggleStatus(c)}
                                                                            aria-label={c.isActive ? 'Tắt' : 'Bật'}
                                                                            sx={{
                                                                                color: c.isActive ? '#10b981' : '#9ca3af',
                                                                                '&:hover': { bgcolor: '#f3f4f6' },
                                                                            }}
                                                                        >
                                                                            <Power size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Chỉnh sửa">
                                                                        <IconButton
                                                                            size="small"
                                                                            aria-label="Chỉnh sửa"
                                                                            onClick={() => navigate(`/categories/edit/${c.categoryId}`)}
                                                                            sx={{
                                                                                color: '#6b7280',
                                                                                '&:hover': { bgcolor: '#f3f4f6' },
                                                                            }}
                                                                        >
                                                                            <Edit3 size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </Card>

                    {/* Pagination Footer */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 2,
                            py: 2,
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 2,
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
                            Số dòng / trang:
                        </Typography>

                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(0);
                                }}
                                sx={{
                                    height: 32,
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
                            {start}–{end} / {totalItems} (Tổng {totalPages} trang)
                        </Typography>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page <= 0}
                            onClick={() => setPage((p) => p - 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Trước
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page >= totalPages - 1 || totalItems === 0}
                            onClick={() => setPage((p) => p + 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ViewCategoryList;
