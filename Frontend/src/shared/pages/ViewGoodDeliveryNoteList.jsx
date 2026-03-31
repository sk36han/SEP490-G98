import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, parseDate } from '../lib/dateUtils';
import {
    Box,
    Paper,
    Button,
    Typography,
    IconButton,
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
    Chip,
    TableSortLabel,
    CircularProgress,
    Alert,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { FileText, Filter, Columns, Plus, GripVertical, RotateCcw, Package } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import GoodDeliveryNoteFilterPopup from '../components/GoodDeliveryNoteFilterPopup';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

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

const STATUS_STYLE = {
    Draft: { bgColor: 'rgba(107, 114, 128, 0.2)', label: 'Nháp', dot: '•' },
    PendingAcc: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chờ kế toán duyệt', dot: '•' },
    PendingDir: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chờ giám đốc duyệt', dot: '•' },
    Approved: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã duyệt', dot: '•' },
    Dispatched: { bgColor: 'rgba(59, 130, 246, 0.2)', label: 'Đã xuất hàng', dot: '•' },
    Signed: { bgColor: 'rgba(139, 92, 246, 0.2)', label: 'Đã ký nhận', dot: '•' },
    Posted: { bgColor: 'rgba(139, 92, 246, 0.2)', label: 'Đã ghi sổ', dot: '•' },
    Rejected: { bgColor: 'rgba(239, 68, 68, 0.2)', label: 'Từ chối', dot: '•' },
};

const PAYMENT_STYLE = {
    paid: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã thanh toán', dot: '•' },
    unpaid: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chưa thanh toán', dot: '•' },
};

const GDN_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, draggable: false },
    { id: 'gdnCode', label: 'Mã phiếu xuất', sortable: true, draggable: true },
    { id: 'status', label: 'Trạng thái', sortable: true, draggable: true },
    { id: 'issueDate', label: 'Ngày xuất', sortable: true, draggable: true },
    { id: 'releaseRequestCode', label: 'Yêu cầu xuất tham chiếu', sortable: true, draggable: true },
    { id: 'receiverName', label: 'Người nhận', sortable: true, draggable: true },
    { id: 'warehouseName', label: 'Kho xuất', sortable: true, draggable: true },
    { id: 'totalDeliveredQty', label: 'Tổng số lượng xuất', sortable: true, draggable: true },
    { id: 'totalDeliveredAmount', label: 'Tổng tiền xuất', sortable: true, draggable: true },
    { id: 'paymentDisplay', label: 'Thanh toán', sortable: true, draggable: true },
    { id: 'createdBy', label: 'Người tạo', sortable: true, draggable: true },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, draggable: true },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, draggable: true },
];

const DEFAULT_COLUMN_ORDER = GDN_COLUMNS.map((c) => c.id);
const DEFAULT_VISIBLE_COLUMN_IDS = DEFAULT_COLUMN_ORDER.slice();
const SORTABLE_COLUMN_IDS = GDN_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const COLUMN_IDS_WITH_RIGHT_ALIGN = new Set(['totalDeliveredQty', 'totalDeliveredAmount']);

const MOCK_GDN_LIST = [
    {
        goodsDeliveryNoteId: 1,
        gdnCode: 'GDN-2025-001',
        releaseRequestCode: 'RR-2025-014',
        receiverName: 'Công ty TNHH ABC',
        warehouseName: 'Kho HCM',
        issueDate: '2025-03-10T08:00:00',
        status: 'Approved',
        totalDeliveredQty: 50,
        totalDeliveredAmount: 125000000,
        createdBy: 'Nguyễn Văn A',
        createdAt: '2025-03-09T10:00:00',
        isPaid: true,
        paymentMethod: 'Chuyển khoản',
    },
    {
        goodsDeliveryNoteId: 2,
        gdnCode: 'GDN-2025-002',
        releaseRequestCode: 'RR-2025-015',
        receiverName: 'Công ty CP XYZ',
        warehouseName: 'Kho Hà Nội',
        issueDate: '2025-03-08T09:00:00',
        status: 'Dispatched',
        totalDeliveredQty: 30,
        totalDeliveredAmount: 75000000,
        createdBy: 'Trần Thị B',
        createdAt: '2025-03-07T14:00:00',
        isPaid: false,
        paymentMethod: 'Tiền mặt',
    },
    {
        goodsDeliveryNoteId: 3,
        gdnCode: 'GDN-2025-003',
        releaseRequestCode: 'RR-2025-016',
        receiverName: 'Công ty TNHH Minh Phát',
        warehouseName: 'Kho Đà Nẵng',
        issueDate: '2025-03-07T10:00:00',
        status: 'PendingDir',
        totalDeliveredQty: 20,
        totalDeliveredAmount: 45000000,
        createdBy: 'Lê Văn C',
        createdAt: '2025-03-06T11:00:00',
        isPaid: false,
        paymentMethod: '',
    },
    {
        goodsDeliveryNoteId: 4,
        gdnCode: 'GDN-2025-004',
        releaseRequestCode: 'RR-2025-017',
        receiverName: 'Công ty CP Hòa Bình',
        warehouseName: 'Kho HCM',
        issueDate: '2025-03-06T08:30:00',
        status: 'Signed',
        totalDeliveredQty: 80,
        totalDeliveredAmount: 200000000,
        createdBy: 'Phạm Thị D',
        createdAt: '2025-03-05T09:00:00',
        isPaid: true,
        paymentMethod: 'Chuyển khoản',
    },
    {
        goodsDeliveryNoteId: 5,
        gdnCode: 'GDN-2025-005',
        releaseRequestCode: 'RR-2025-018',
        receiverName: 'Công ty TNHH Bắc Nam',
        warehouseName: 'Kho Hà Nội',
        issueDate: '2025-03-05T14:00:00',
        status: 'Posted',
        totalDeliveredQty: 45,
        totalDeliveredAmount: 112500000,
        createdBy: 'Nguyễn Văn A',
        createdAt: '2025-03-04T08:00:00',
        isPaid: true,
        paymentMethod: 'Chuyển khoản',
    },
    {
        goodsDeliveryNoteId: 6,
        gdnCode: 'GDN-2025-006',
        releaseRequestCode: 'RR-2025-019',
        receiverName: 'Công ty TNHH Trường Sơn',
        warehouseName: 'Kho Đà Nẵng',
        issueDate: '2025-03-04T09:00:00',
        status: 'PendingAcc',
        totalDeliveredQty: 15,
        totalDeliveredAmount: 37500000,
        createdBy: 'Trần Thị B',
        createdAt: '2025-03-03T10:00:00',
        isPaid: false,
        paymentMethod: '',
    },
    {
        goodsDeliveryNoteId: 7,
        gdnCode: 'GDN-2025-007',
        releaseRequestCode: 'RR-2025-020',
        receiverName: 'Công ty CP Ánh Dương',
        warehouseName: 'Kho HCM',
        issueDate: '2025-03-03T11:00:00',
        status: 'Rejected',
        totalDeliveredQty: 0,
        totalDeliveredAmount: 0,
        createdBy: 'Lê Văn C',
        createdAt: '2025-03-02T14:00:00',
        isPaid: false,
        paymentMethod: '',
    },
    {
        goodsDeliveryNoteId: 8,
        gdnCode: 'GDN-2025-008',
        releaseRequestCode: 'RR-2025-021',
        receiverName: 'Công ty TNHH An Khang',
        warehouseName: 'Kho Hà Nội',
        issueDate: '2025-03-02T08:00:00',
        status: 'Draft',
        totalDeliveredQty: 0,
        totalDeliveredAmount: 0,
        createdBy: 'Phạm Thị D',
        createdAt: '2025-03-01T16:00:00',
        isPaid: false,
        paymentMethod: '',
    },
];

const formatDate = (dateStr) => formatDateTime(dateStr);

const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
};

const safeParse = (jsonStr, fallback) => {
    try {
        return JSON.parse(jsonStr);
    } catch {
        return fallback;
    }
};

const getPaymentDisplay = (row) => {
    if (row.isPaid && row.paymentMethod) {
        return `Đã thanh toán - ${row.paymentMethod}`;
    }
    if (row.isPaid) {
        return 'Đã thanh toán';
    }
    return 'Chưa thanh toán';
};

export default function ViewGoodDeliveryNoteList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const canCreate = true; // UI mock - show create button

    const [list] = useState(MOCK_GDN_LIST);
    const [loading] = useState(false);
    const [error] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem('gdnFilterValues');
        return saved ? safeParse(saved, {}) : {};
    });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('gdnVisibleColumnIds');
        return saved ? new Set(safeParse(saved, DEFAULT_VISIBLE_COLUMN_IDS)) : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem('gdnSortConfig');
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.orderBy ?? null;
    });
    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem('gdnSortConfig');
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.order ?? 'asc';
    });
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('gdnColumnOrder');
        return saved ? safeParse(saved, DEFAULT_COLUMN_ORDER) : [...DEFAULT_COLUMN_ORDER];
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const resetRef = useRef(false);

    useEffect(() => {
        if (columnSelectorAnchor) {
            setTempColumnOrder(columnOrder);
        }
        return () => {
            if (!resetRef.current) {
                setTempColumnOrder(columnOrder);
            }
            resetRef.current = false;
        };
    }, [columnSelectorAnchor]);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            localStorage.setItem('gdnVisibleColumnIds', JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        const newSet = checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set();
        newSet.add('stt');
        setVisibleColumnIds(newSet);
        localStorage.setItem('gdnVisibleColumnIds', JSON.stringify([...newSet]));
    };

    const visibleColumns = GDN_COLUMNS
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;

        let newOrder, newOrderBy;
        if (orderBy === columnId) {
            if (order === 'asc') {
                newOrder = 'desc';
                newOrderBy = columnId;
            } else {
                newOrder = 'asc';
                newOrderBy = null;
            }
        } else {
            newOrderBy = columnId;
            newOrder = 'asc';
        }

        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);
        localStorage.setItem('gdnSortConfig', JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    const handleDragStart = (e, columnId) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;

        const newOrder = [...columnOrder];
        const dragIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;

        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumn);

        setColumnOrder(newOrder);
        localStorage.setItem('gdnColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    const handleDragEnd = () => setDraggedColumn(null);

    const BODY_CELL_SX = {
        py: 1.75,
        px: 2,
        fontSize: '13px',
        lineHeight: '20px',
        verticalAlign: 'middle',
        borderBottom: '1px solid #f3f4f6',
        color: '#374151',
    };

    const handlePopupDragStart = (e, columnId) => {
        setDraggedPopupColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handlePopupDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePopupDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetColumnId) return;

        const newOrder = [...tempColumnOrder];
        const dragIdx = newOrder.indexOf(draggedPopupColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;

        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedPopupColumn);

        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };

    const handlePopupDragEnd = () => setDraggedPopupColumn(null);

    const handleResetColumns = () => {
        const defaultOrder = [...DEFAULT_COLUMN_ORDER];
        const defaultVisible = new Set(DEFAULT_VISIBLE_COLUMN_IDS);

        resetRef.current = true;
        setTempColumnOrder(defaultOrder);
        setColumnOrder(defaultOrder);
        setVisibleColumnIds(defaultVisible);
        localStorage.setItem('gdnColumnOrder', JSON.stringify(defaultOrder));
        localStorage.setItem('gdnVisibleColumnIds', JSON.stringify([...defaultVisible]));
        setColumnSelectorAnchor(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('gdnColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const filteredAndSortedRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';
        let result = [...list];

        if (term) {
            result = result.filter((row) =>
                normalize(row.gdnCode ?? '').includes(term) ||
                normalize(row.releaseRequestCode ?? '').includes(term) ||
                normalize(row.receiverName ?? '').includes(term) ||
                normalize(row.warehouseName ?? '').includes(term) ||
                normalize(row.createdBy ?? '').includes(term)
            );
        }

        if (filterValues.status) {
            result = result.filter((row) => row.status === filterValues.status);
        }
        if (filterValues.paymentStatus) {
            const isPaidFilter = filterValues.paymentStatus === 'paid';
            result = result.filter((row) => row.isPaid === isPaidFilter);
        }
        if (filterValues.releaseRequestCode) {
            result = result.filter((row) => normalize(row.releaseRequestCode ?? '').includes(normalize(filterValues.releaseRequestCode)));
        }
        if (filterValues.receiverName) {
            result = result.filter((row) => normalize(row.receiverName ?? '').includes(normalize(filterValues.receiverName)));
        }
        if (filterValues.warehouseName) {
            result = result.filter((row) => normalize(row.warehouseName ?? '').includes(normalize(filterValues.warehouseName)));
        }
        if (filterValues.createdBy) {
            result = result.filter((row) => normalize(row.createdBy ?? '').includes(normalize(filterValues.createdBy)));
        }
        if (filterValues.issueFromDate) {
            result = result.filter((row) => {
                const d = row.issueDate;
                return d && String(d).slice(0, 10) >= filterValues.issueFromDate;
            });
        }
        if (filterValues.issueToDate) {
            result = result.filter((row) => {
                const d = row.issueDate;
                return d && String(d).slice(0, 10) <= filterValues.issueToDate;
            });
        }

        result.sort((a, b) => {
            if (!orderBy) return 0;
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['issueDate', 'createdAt'].includes(orderBy);
            const isNumber = ['totalDeliveredQty', 'totalDeliveredAmount'].includes(orderBy);
            const isPaymentDisplay = orderBy === 'paymentDisplay';
            let cmp = 0;
            if (isDate) {
                cmp = (parseDate(aVal)?.getTime() ?? 0) - (parseDate(bVal)?.getTime() ?? 0);
            } else if (isNumber) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else if (isPaymentDisplay) {
                cmp = getPaymentDisplay(a).toLowerCase().localeCompare(getPaymentDisplay(b).toLowerCase());
            } else {
                cmp = String(aVal ?? '').toLowerCase().localeCompare(String(bVal ?? '').toLowerCase());
            }
            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [list, searchTerm, filterValues, orderBy, order]);

    const totalCount = filteredAndSortedRows.length;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const rows = filteredAndSortedRows.slice(page * pageSize, (page + 1) * pageSize);

    const totalPagesCalc = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;

    useEffect(() => setPage(0), [searchTerm, filterValues]);

    const handleFilterApply = (values) => {
        setFilterValues(values);
        localStorage.setItem('gdnFilterValues', JSON.stringify(values));
        setPage(0);
    };

    const releaseRequestCodeOptions = useMemo(() => [...new Set(list.map((x) => x.releaseRequestCode).filter(Boolean))], [list]);
    const receiverOptions = useMemo(() => [...new Set(list.map((x) => x.receiverName).filter(Boolean))], [list]);
    const warehouseOptions = useMemo(() => [...new Set(list.map((x) => x.warehouseName).filter(Boolean))], [list]);
    const createdByOptions = useMemo(() => [...new Set(list.map((x) => x.createdBy).filter(Boolean))], [list]);

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <Box sx={{
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fafafa',
        }}>
            {/* Header Section */}
            <Box sx={{
                flexShrink: 0,
                px: { xs: 2, sm: 2 },
                py: 2.5,
                bgcolor: '#fafafa',
            }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Danh sách phiếu xuất hàng
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Goods Delivery Notes
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Package} label="Tổng phiếu xuất" value={(totalCount || rows.length).toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Package} label="Đã xác nhận" value={rows.filter(r => r.status === 'CONFIRMED').length.toLocaleString()} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={Package} label="Chưa xác nhận" value={rows.filter(r => r.status === 'PENDING').length.toLocaleString()} color="#d97706" bgColor="rgba(217,119,6,0.1)" />
                </Box>
            </Box>

            <GoodDeliveryNoteFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
                releaseRequestCodeOptions={releaseRequestCodeOptions}
                receiverOptions={receiverOptions}
                warehouseOptions={warehouseOptions}
                createdByOptions={createdByOptions}
            />

            {/* Main Content Wrapper */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper
                    className="list-view"
                    elevation={0}
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
                    {/* Toolbar Section */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã phiếu xuất, mã yêu cầu xuất, người nhận, kho xuất, người tạo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        '& fieldset': { border: 'none' },
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': {
                                            bgcolor: '#ffffff',
                                            borderColor: '#3b82f6',
                                            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                        },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={() => setFilterOpen(true)}
                                    aria-label="Bộ lọc"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <Filter size={18} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                                    aria-label="Chọn cột"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>
                            {canCreate && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => navigate('/goods-delivery-notes/create')}
                                        sx={{
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderRadius: '10px',
                                            height: 38,
                                            px: 2.5,
                                            bgcolor: '#0284c7',
                                            boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                            '&:hover': {
                                                bgcolor: '#0369a1',
                                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                            },
                                        }}
                                    >
                                        Tạo phiếu xuất hàng
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Column Selector Popover */}
                    <Popover
                        open={Boolean(columnSelectorAnchor)}
                        anchorEl={columnSelectorAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    width: 340,
                                    maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }
                            }
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>

                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
                        }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === GDN_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < GDN_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {[...GDN_COLUMNS].sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box
                                        key={col.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            borderRadius: '8px',
                                            px: 0.75,
                                            py: 0.25,
                                            '&:hover': { bgcolor: '#f9fafb' },
                                        }}
                                        onDragOver={(e) => { if (col.draggable !== false) e.preventDefault(); }}
                                        onDrop={(e) => { if (col.draggable !== false) { e.preventDefault(); handlePopupDrop(e, col.id); } }}
                                    >
                                        {col.draggable !== false ? (
                                            <Box
                                                draggable
                                                onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                                onDragEnd={handlePopupDragEnd}
                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}
                                            >
                                                <GripVertical size={14} />
                                            </Box>
                                        ) : (
                                            <Box sx={{ width: 14, height: 14 }} />
                                        )}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={visibleColumnIds.has(col.id)}
                                                    disabled={col.id === 'stt'}
                                                    onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                                    sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.Mui-disabled': { color: '#d1d5db' } }}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontSize: '13px', color: col.id === 'stt' ? '#9ca3af' : '#374151' }}>
                                                    {col.label}
                                                    {col.id === 'stt' && (
                                                        <Typography component="span" sx={{ fontSize: '11px', color: '#9ca3af', ml: 0.5 }}>(cố định)</Typography>
                                                    )}
                                                </Typography>
                                            }
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>

                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0, alignItems: 'center' }}>
                            <Button
                                variant="text"
                                onClick={handleResetColumns}
                                startIcon={<RotateCcw size={14} />}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', color: '#6b7280', mr: 'auto',
                                    '&:hover': { bgcolor: '#f9fafb', color: '#374151' },
                                }}
                            >
                                Đặt lại
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280',
                                    '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#0284c7', boxShadow: 'none',
                                    '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)' },
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* Table Section */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && (
                            <Alert severity="error" onClose={() => {}} sx={{ m: 2, mb: 0 }}>{error}</Alert>
                        )}
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu phiếu xuất hàng</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                        whiteSpace: 'nowrap',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        borderBottom: '2px solid #e5e7eb',
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        py: 1.5,
                                                        px: 2,
                                                        ...(col.id === 'stt' && { width: 70, minWidth: 70, maxWidth: 70 }),
                                                        ...(col.id === 'gdnCode' && { minWidth: 150 }),
                                                        ...(col.id === 'releaseRequestCode' && { minWidth: 180 }),
                                                        ...(col.id === 'receiverName' && { minWidth: 170 }),
                                                        ...(col.id === 'warehouseName' && { minWidth: 140 }),
                                                        ...(col.id === 'issueDate' && { minWidth: 145 }),
                                                        ...(col.id === 'status' && { minWidth: 160 }),
                                                        ...(col.id === 'totalDeliveredQty' && { minWidth: 160 }),
                                                        ...(col.id === 'totalDeliveredAmount' && { minWidth: 160 }),
                                                        ...(col.id === 'paymentDisplay' && { minWidth: 180 }),
                                                        ...(col.id === 'createdBy' && { minWidth: 130 }),
                                                        ...(col.id === 'createdAt' && { minWidth: 145 }),
                                                    }}
                                                    align={COLUMN_IDS_WITH_RIGHT_ALIGN.has(col.id) ? 'right' : 'left'}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {col.sortable && (
                                                            <Box
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, col.id)}
                                                                onDragEnd={handleDragEnd}
                                                                className="drag-icon"
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    cursor: 'grab',
                                                                    '&:active': { cursor: 'grabbing' },
                                                                    color: '#9ca3af',
                                                                    opacity: 1,
                                                                    transition: 'opacity 0.2s',
                                                                }}
                                                            >
                                                                <GripVertical size={14} />
                                                            </Box>
                                                        )}
                                                        {col.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === col.id}
                                                                direction={orderBy === col.id ? order : 'asc'}
                                                                onClick={() => handleSortRequest(col.id)}
                                                                sx={{
                                                                    flex: 1,
                                                                    '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 },
                                                                }}
                                                                hideSortIcon={false}
                                                            >
                                                                {col.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            <Typography variant="inherit" sx={{ flex: 1 }}>{col.label}</Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow
                                                key={row.goodsDeliveryNoteId}
                                                hover
                                                sx={{
                                                    height: 56,
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                    '& .MuiTableCell-root': BODY_CELL_SX,
                                                }}
                                            >
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                                {page * pageSize + index + 1}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'gdnCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/goods-delivery-notes/${row.goodsDeliveryNoteId}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(`/goods-delivery-notes/${row.goodsDeliveryNoteId}`); }}
                                                                        sx={{
                                                                            color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer',
                                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                            '&:hover': { textDecoration: 'underline' },
                                                                        }}
                                                                        title={row.gdnCode}
                                                                    >
                                                                        {row.gdnCode}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'releaseRequestCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/release-requests/${encodeURIComponent(row.releaseRequestCode)}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(`/release-requests/${encodeURIComponent(row.releaseRequestCode)}`); }}
                                                                        sx={{
                                                                            color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer',
                                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                            '&:hover': { textDecoration: 'underline' },
                                                                        }}
                                                                        title={row.releaseRequestCode}
                                                                    >
                                                                        {row.releaseRequestCode || '-'}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'status') {
                                                        const style = STATUS_STYLE[row.status] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.status ?? '', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={`${style.dot} ${style.label}`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '999px',
                                                                            minWidth: 140, height: '26px', bgcolor: style.bgColor, color: '#374151',
                                                                            border: 'none', boxShadow: 'none',
                                                                            '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'issueDate') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                                                                {formatDate(row.issueDate)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'createdAt') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                                                                {formatDate(row.createdAt)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'totalDeliveredQty') {
                                                        return (
                                                            <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3 }}>
                                                                {(Number(row.totalDeliveredQty) || 0).toLocaleString('vi-VN')}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'totalDeliveredAmount') {
                                                        return (
                                                            <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3 }}>
                                                                {formatCurrency(row.totalDeliveredAmount)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'paymentDisplay') {
                                                        const paymentKey = row.isPaid ? 'paid' : 'unpaid';
                                                        const pStyle = PAYMENT_STYLE[paymentKey] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: getPaymentDisplay(row), dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={`${pStyle.dot} ${pStyle.label}`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '999px',
                                                                            minWidth: 140, height: '26px', bgcolor: pStyle.bgColor, color: '#374151',
                                                                            border: 'none', boxShadow: 'none',
                                                                            '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }


                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={row[col.id]}
                                                        >
                                                            {row[col.id] ?? '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Pagination Section */}
                    <Box sx={{
                        flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2
                    }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' } }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {totalPagesCalc || 1} trang)
                        </Typography>
                        <Button
                            size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)', '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' } }}
                        >
                            Trước
                        </Button>
                        <Typography
                            variant="body2" color="text.secondary" component="span"
                            sx={{ px: 1.5, minWidth: 72, textAlign: 'center', fontSize: '13px', whiteSpace: 'nowrap' }}
                        >
                            Trang {page + 1} / {totalPagesCalc || 1}
                        </Typography>
                        <Button
                            size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)', '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' } }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
