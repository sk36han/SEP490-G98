/*
 * Danh sách Thông số – mục con Vật tư.
 * Cấu trúc bảng lấy từ UoM: mã, tên, trạng thái. Mock 4 bản ghi tên "microong".
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
    Stack,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Plus, Edit3, RefreshCw } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import CreateSpecDialog from '../components/CreateSpecDialog';
import { removeDiacritics } from '../utils/stringUtils';

// 4 bản ghi mẫu tên microong, các trường theo bảng UoM (code, name, isActive)
const INITIAL_SPECS = [
    { specId: 1, specCode: 'MICROONG_01', specName: 'microong', isActive: true },
    { specId: 2, specCode: 'MICROONG_02', specName: 'microong', isActive: true },
    { specId: 3, specCode: 'MICROONG_03', specName: 'microong', isActive: true },
    { specId: 4, specCode: 'MICROONG_04', specName: 'microong', isActive: false },
];

const PAGE_SIZE = 7;

const ViewSpecList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canManage = permissionRole === 'WAREHOUSE_KEEPER';
    const [rows, setRows] = useState(INITIAL_SPECS);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = normalize(searchTerm.trim());
        return rows.filter(
            (s) => normalize(s.specCode).includes(term) || normalize(s.specName).includes(term),
        );
    }, [rows, searchTerm]);

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const paginatedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleResetMock = () => {
        if (!canManage) return;
        setRows(INITIAL_SPECS);
    };

    const handleCreateSubmit = (newItem) => {
        setRows((prev) => [...prev, { specId: newItem.specId, specCode: newItem.specCode, specName: newItem.specName, isActive: true }]);
        setCreateOpen(false);
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', pt: 0, pb: 2, width: '100%', maxWidth: '100%', ml: 0, mr: 0, boxSizing: 'border-box' }}>
            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap', mb: 0.5 }}>
                    Thông số
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Quản lý danh sách thông số (cấu trúc tương tự đơn vị tính UoM).
                </Typography>
            </Box>

            <Box className="list-view" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'visible', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)', borderRadius: 3, p: 0.75, border: '1px solid', borderColor: 'divider', boxShadow: (t) => t.shadows[1], boxSizing: 'border-box' }}>
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput placeholder="Tìm theo mã, tên thông số..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} sx={{ flex: '1 1 240px', minWidth: isMobile ? '100%' : 240, maxWidth: isMobile ? '100%' : 520 }} />
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
                                {canManage && (
                                    <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setCreateOpen(true)} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>
                                        Thêm thông số
                                    </Button>
                                )}
                                {canManage && (
                                    <IconButton size="small" onClick={handleResetMock} title="Khôi phục dữ liệu mẫu">
                                        <RefreshCw size={18} />
                                    </IconButton>
                                )}
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
                                            <TableCell sx={{ fontWeight: 600, width: '8%' }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '28%' }}>Mã thông số</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '36%' }}>Tên thông số</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '18%' }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: '10%' }} align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    {rows.length === 0 ? 'Chưa có thông số nào.' : 'Không tìm thấy kết quả.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRows.map((s, index) => (
                                                <TableRow key={s.specId} hover>
                                                    <TableCell>{page * PAGE_SIZE + index + 1}</TableCell>
                                                    <TableCell>{s.specCode}</TableCell>
                                                    <TableCell>{s.specName}</TableCell>
                                                    <TableCell>
                                                        <Chip label={s.isActive ? 'Hoạt động' : 'Tắt'} size="small" color={s.isActive ? 'success' : 'default'} sx={{ borderRadius: 1.5 }} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {canManage && (
                                                            <IconButton size="small" aria-label="Chỉnh sửa">
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
            </Box>
            <CreateSpecDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreateSubmit} />
        </Box>
    );
};

export default ViewSpecList;
