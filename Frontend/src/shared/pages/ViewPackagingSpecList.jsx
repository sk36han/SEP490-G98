/*
 * Danh sách Quy cách đóng gói – kết nối API api/packagingspecs.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    CircularProgress,
    Alert,
    Tooltip,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Power } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import CreatePackagingSpecDialog from '../components/CreatePackagingSpecDialog';
import { removeDiacritics } from '../utils/stringUtils';
import { getPackagingSpecList, createPackagingSpec, updatePackagingSpec } from '../lib/packagingSpecService';

const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const ViewPackagingSpecList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canManage = permissionRole === 'WAREHOUSE_KEEPER';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [packEditRow, setPackEditRow] = useState(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await getPackagingSpecList();
            setRows(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách quy cách đóng gói.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = normalize(searchTerm.trim());
        return rows.filter(
            (p) =>
                normalize(p.specName).includes(term),
        );
    }, [rows, searchTerm]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

    const handleToggleStatus = async (p) => {
        if (!canManage) return;
        try {
            await updatePackagingSpec(p.packagingSpecId, {
                specName: p.specName,
                description: p.description ?? null,
                isActive: !p.isActive,
            });
            setRows((prev) =>
                prev.map((r) => (r.packagingSpecId === p.packagingSpecId ? { ...r, isActive: !r.isActive } : r)),
            );
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không đổi được trạng thái.');
        }
    };

    const handleOpenCreatePack = () => {
        setPackEditRow(null);
        setPackDialogOpen(true);
    };

    const handleOpenEditPack = (p) => {
        setPackEditRow(p);
        setPackDialogOpen(true);
    };

    const handlePackDialogSubmit = async (payload) => {
        try {
            if (payload.isEdit) {
                await updatePackagingSpec(payload.packagingSpecId, {
                    specName: (payload.specName || '').trim(),
                    description: payload.description ?? null,
                    isActive: payload.isActive,
                });
            } else {
                await createPackagingSpec({
                    specName: (payload.specName || '').trim(),
                    description: payload.description ?? null,
                });
            }
            setPackDialogOpen(false);
            fetchList();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không lưu được quy cách.');
            throw err;
        }
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', pt: 0, pb: 2, width: '100%', maxWidth: '100%', ml: 0, mr: 0, boxSizing: 'border-box' }}>
            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', mb: 0.5 }}>
                    Quy cách đóng gói
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Danh sách quy cách đóng gói để gán cho vật tư (Hộp, Thùng, Túi, ...).
                </Typography>
            </Box>

            <Box className="list-view" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)', borderRadius: 3, p: 0.75, border: '1px solid', borderColor: 'divider', boxShadow: (t) => t.shadows[1], boxSizing: 'border-box' }}>
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput placeholder="Tìm theo mã, tên quy cách..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} sx={{ flex: '1 1 240px', minWidth: isMobile ? '100%' : 240, maxWidth: isMobile ? '100%' : 520 }} />
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
                                {canManage && (
                                    <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleOpenCreatePack} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>
                                        Thêm quy cách
                                    </Button>
                                )}
                                <IconButton size="small" onClick={fetchList} sx={{ flexShrink: 0 }} title="Làm mới" disabled={loading}>
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
                                                <TableCell sx={{ fontWeight: 600, width: '48%', minWidth: 160, px: 1.25 }}>Tên quy cách</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '22%', minWidth: 100, px: 1.25 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ fontWeight: 600, width: '18%', minWidth: 100, px: 1.25 }} align="right">Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paginatedRows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        {error ? 'Có lỗi khi tải dữ liệu.' : 'Chưa có quy cách nào.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedRows.map((p, index) => (
                                                    <TableRow key={p.packagingSpecId} hover>
                                                        <TableCell align="center" sx={{ width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: 'tabular-nums' }}>{page * pageSize + index + 1}</TableCell>
                                                        <TableCell sx={{ px: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.specName}</TableCell>
                                                        <TableCell sx={{ px: 1.25 }}>
                                                            <Chip label={p.isActive ? 'Hoạt động' : 'Tắt'} size="small" color={p.isActive ? 'success' : 'default'} sx={{ borderRadius: 1.5 }} />
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ px: 1.25 }}>
                                                            {canManage && (
                                                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                                                    <Tooltip title={p.isActive ? 'Tắt' : 'Bật'}>
                                                                        <IconButton size="small" onClick={() => handleToggleStatus(p)} aria-label={p.isActive ? 'Tắt' : 'Bật'}>
                                                                            <Power size={18} style={{ color: p.isActive ? '#2e7d32' : '#757575' }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Chỉnh sửa">
                                                                        <IconButton size="small" aria-label="Chỉnh sửa" onClick={() => handleOpenEditPack(p)}>
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
                            {(totalCount === 0 ? 0 : page * pageSize + 1)}–{Math.min((page + 1) * pageSize, totalCount)} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
                        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, minWidth: 72, textAlign: 'center' }}>Trang {totalPages > 0 ? page + 1 : 0} / {totalPages || 1}</Typography>
                        <Button size="small" variant="outlined" disabled={page >= totalPages - 1 || totalCount === 0} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
                    </Box>
            </Box>
            <CreatePackagingSpecDialog open={packDialogOpen} onClose={() => setPackDialogOpen(false)} editRow={packEditRow} onSubmit={handlePackDialogSubmit} />
        </Box>
    );
};

export default ViewPackagingSpecList;
