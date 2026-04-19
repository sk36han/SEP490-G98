/**
 * ViewReceiverList – Danh sách người nhận
 * Người dùng: WAREHOUSE_KEEPER, SALE_ENGINEER, DIRECTOR, ACCOUNTANTS
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    FormControl,
    Chip,
    Tooltip,
    Button,
} from '@mui/material';
import {
    User, Phone, Mail, MapPin, Users, Eye, Edit,
    Plus, Search, Filter, RefreshCw,
} from 'lucide-react';
import SearchInput from '../components/SearchInput';
import ReceiverFilterPopup from '../components/ReceiverFilterPopup';
import { getReceivers, toggleReceiverStatus } from '../lib/receiverService';
import { formatDateOnlyUtc } from '../lib/dateUtils';
import '../styles/ListView.css';

const COLUMNS = [
    { id: 'stt', label: 'STT', width: 60 },
    { id: 'receiverCode', label: 'Mã người nhận', width: 140 },
    { id: 'receiverName', label: 'Tên người nhận', width: 220 },
    { id: 'phone', label: 'Điện thoại', width: 130 },
    { id: 'email', label: 'Email', width: 200 },
    { id: 'address', label: 'Địa chỉ', width: 260 },
    { id: 'isActive', label: 'Trạng thái', width: 120 },
    { id: 'createdAt', label: 'Ngày tạo', width: 140 },
    { id: 'actions', label: 'Thao tác', width: 100 },
];

const ROWS_PER_PAGE_OPTIONS = [20, 50, 100];

const fmtDate = (str) => (str ? formatDateOnlyUtc(str) : '—');

const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <Box sx={{
        flex: '1 1 200px', minWidth: 200, bgcolor: '#fff',
        border: '1px solid #e5e7eb', borderRadius: '14px', p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
        <Box sx={{
            width: 48, height: 48, borderRadius: '12px', bgcolor: bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            <Icon size={22} color={color} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.25 }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

export default function ViewReceiverList() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rows, setRows] = useState([]);
    const [totalItems, setTotalItems] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                pageSize,
                receiverName: searchTerm || filterValues.receiverName || '',
                isActive: filterValues.isActive ?? null,
                fromDate: filterValues.fromDate || null,
                toDate: filterValues.toDate || null,
            };
            const res = await getReceivers(params);
            setRows(res.items ?? []);
            setTotalItems(res.totalItems ?? 0);
        } catch (err) {
            setError(err?.message || 'Tải dữ liệu thất bại.');
            setRows([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm, filterValues]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    usePolling('receivers', () => fetchDataRef.current?.());

    const summary = useMemo(() => {
        const total = rows.length;
        const active = rows.filter(r => r.isActive).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [rows]);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = totalItems > 0 ? page * pageSize + 1 : 0;
    const end = Math.min((page + 1) * pageSize, totalItems);

    const handleStatusChange = async (id, isActive) => {
        if (!window.confirm('Bạn có chắc muốn thay đổi trạng thái?')) return;
        try {
            await toggleReceiverStatus(id, isActive);
            setRows(prev => prev.map(r => r.receiverId === id ? { ...r, isActive } : r));
        } catch (err) {
            setError(err?.message || 'Đổi trạng thái thất bại.');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2.5, bgcolor: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users size={20} color="#6b7280" />
                    <Typography variant="h5" fontWeight={600} sx={{ fontSize: '20px', color: '#111827' }}>
                        Quản lý người nhận
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.25 }}>
                    Tra cứu và quản lý thông tin người nhận hàng
                </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2.5, gap: 2 }}>

                {/* Summary */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Users} label="Tổng người nhận" value={totalItems.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={User} label="Đang hoạt động" value={summary.active.toLocaleString()} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={User} label="Ngưng hoạt động" value={summary.inactive.toLocaleString()} color="#d97706" bgColor="rgba(217,119,6,0.1)" />
                </Box>

                {/* Filter bar */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput
                        placeholder="Tìm theo tên, mã, SĐT, email…"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                        sx={{
                            flex: '1 1 240px', minWidth: 200, maxWidth: 420,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px',
                                fontSize: '13px', '& fieldset': { border: 'none' },
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                '&.Mui-focused': { bgcolor: '#fff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                                '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                            },
                        }}
                    />
                    <Tooltip title="Bộ lọc nâng cao">
                        <Button
                            variant="outlined"
                            onClick={() => setFilterOpen(true)}
                            startIcon={<Filter size={15} />}
                            size="small"
                            sx={{ height: 36, borderRadius: '10px', fontSize: '13px', textTransform: 'none', borderColor: '#e5e7eb', color: '#374151', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}
                        >
                            Bộ lọc
                        </Button>
                    </Tooltip>
                    <Tooltip title="Tải lại dữ liệu">
                        <button onClick={fetchData} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                            <RefreshCw size={15} style={{ color: loading ? '#9ca3af' : '#374151', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                    </Tooltip>
                    <Box sx={{ ml: 'auto' }}>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/receivers/create')}
                            startIcon={<Plus size={15} />}
                            sx={{ height: 36, borderRadius: '10px', fontSize: '13px', fontWeight: 600, textTransform: 'none', background: 'linear-gradient(135deg, #2196F3, #21CBF3)', boxShadow: '0 2px 8px rgba(33,150,243,0.3)', '&:hover': { background: 'linear-gradient(135deg, #1976D2, #00BCD4)' } }}
                        >
                            Tạo mới
                        </Button>
                    </Box>
                </Box>

                {/* Table */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, color: '#9ca3af', flexDirection: 'column', gap: 1 }}>
                            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
                            <Typography sx={{ fontSize: '13px' }}>Đang tải dữ liệu…</Typography>
                        </Box>
                    ) : error ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1.5 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>{error}</Typography>
                            <Button size="small" variant="outlined" onClick={fetchData} sx={{ textTransform: 'none', borderRadius: '8px' }}>Thử lại</Button>
                        </Box>
                    ) : rows.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: '#9ca3af' }}>
                            <Users size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                            <Typography sx={{ fontSize: '14px' }}>Chưa có người nhận nào</Typography>
                        </Box>
                    ) : (
                        <Table size="small" stickyHeader sx={{ minWidth: '100%', tableLayout: 'fixed' }}>
                            <TableHead>
                                <TableRow>
                                    {COLUMNS.map(col => (
                                        <TableCell key={col.id}
                                            sx={{ fontWeight: 600, fontSize: '12px', color: '#6b7280', bgcolor: '#fafafa', borderBottom: '1px solid #e5e7eb', width: col.width, whiteSpace: 'nowrap', py: 1.5, px: 2 }}>
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, index) => (
                                    <TableRow key={row.receiverId} hover sx={{ '&:hover': { bgcolor: '#f9fafb' }, '&:last-child td': { borderBottom: 0 } }}>
                                        <TableCell sx={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {(page * pageSize) + index + 1}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500, color: '#374151', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {row.receiverCode || '—'}
                                        </TableCell>
                                        <TableCell sx={{ color: '#374151', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {row.receiverName || '—'}
                                        </TableCell>
                                        <TableCell sx={{ color: '#374151', fontSize: '13px', py: 1.5, px: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Phone size={13} color="#9ca3af" />
                                                {row.phone || '—'}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: '#374151', fontSize: '13px', py: 1.5, px: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Mail size={13} color="#9ca3af" />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.email || '—'}</span>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280', fontSize: '13px', py: 1.5, px: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={[row.address, row.ward, row.province].filter(Boolean).join(', ')}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <MapPin size={13} color="#9ca3af" />
                                                {[row.address, row.ward, row.province].filter(Boolean).join(', ') || '—'}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5, px: 2 }}>
                                            <FormControl size="small" sx={{ minWidth: 0 }}>
                                                <Select
                                                    value={row.isActive ? 'true' : 'false'}
                                                    onChange={e => handleStatusChange(row.receiverId, e.target.value === 'true')}
                                                    sx={{
                                                        fontSize: '12px', borderRadius: '999px', height: 28, width: '100%',
                                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                                                        ...(row.isActive
                                                            ? { color: '#059669', bgcolor: 'rgba(5,150,105,0.08)', '& .MuiSelect-icon': { color: '#059669' } }
                                                            : { color: '#d97706', bgcolor: 'rgba(217,119,6,0.08)', '& .MuiSelect-icon': { color: '#d97706' } }
                                                        ),
                                                    }}
                                                >
                                                    <MenuItem value="true" sx={{ fontSize: '12px', borderRadius: '6px', mb: 0.5 }}>Hoạt động</MenuItem>
                                                    <MenuItem value="false" sx={{ fontSize: '12px', borderRadius: '6px' }}>Ngưng</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280', fontSize: '13px', py: 1.5, px: 2 }}>
                                            {fmtDate(row.createdAt)}
                                        </TableCell>
                                        <TableCell sx={{ py: 1.5, px: 2 }}>
                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                <Tooltip title="Xem chi tiết">
                                                    <button
                                                        onClick={() => navigate(`/receivers/${row.receiverId}`)}
                                                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip title="Chỉnh sửa">
                                                    <button
                                                        onClick={() => navigate(`/receivers/${row.receiverId}`)}
                                                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Box>

                {/* Pagination */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        Số dòng / trang:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                            sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' } }}>
                            {ROWS_PER_PAGE_OPTIONS.map(n => <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {start}–{end} / {totalItems}
                    </Typography>
                    <button
                        disabled={page <= 0}
                        onClick={() => setPage(p => p - 1)}
                        style={{
                            minWidth: 36, height: 32, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                            backgroundColor: page <= 0 ? '#f9fafb' : '#fff', cursor: page <= 0 ? 'default' : 'pointer',
                            color: page <= 0 ? '#d1d5db' : '#374151', fontSize: '13px', padding: 0,
                        }}
                    >
                        ‹
                    </button>
                    <Typography variant="body2" component="span" sx={{ fontSize: '13px', color: '#374151', minWidth: 72, textAlign: 'center' }}>
                        {page + 1} / {totalPages}
                    </Typography>
                    <button
                        disabled={end >= totalItems || totalItems === 0}
                        onClick={() => setPage(p => p + 1)}
                        style={{
                            minWidth: 36, height: 32, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)',
                            backgroundColor: (end >= totalItems || totalItems === 0) ? '#f9fafb' : '#fff',
                            cursor: (end >= totalItems || totalItems === 0) ? 'default' : 'pointer',
                            color: (end >= totalItems || totalItems === 0) ? '#d1d5db' : '#374151', fontSize: '13px', padding: 0,
                        }}
                    >
                        ›
                    </button>
                </Box>
            </Box>

            <ReceiverFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={values => { setFilterValues(values); setPage(0); setFilterOpen(false); }}
            />
        </Box>
    );
}
