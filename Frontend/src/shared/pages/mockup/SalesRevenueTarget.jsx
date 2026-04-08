import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    TextField,
    Autocomplete,
} from '@mui/material';
import { FileText, Filter, Columns, Plus, GripVertical, RotateCcw, Target, CheckCircle2, Eye } from 'lucide-react';
import { removeDiacritics } from '../../utils/stringUtils';
import SearchInput from '../../components/SearchInput';
import '../../styles/ListView.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const STATUS_STYLE = {
    DRAFT: { bgColor: 'rgba(107, 114, 128, 0.15)', label: 'Nháp', dot: '•' },
    SUBMITTED: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Đã gửi duyệt', dot: '•' },
    APPROVED: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã duyệt', dot: '•' },
    LOCKED: { bgColor: 'rgba(139, 92, 246, 0.15)', label: 'Đã khóa', dot: '•' },
};

const SCOPE_TYPE_STYLE = {
    COMPANY: { bgColor: 'rgba(59, 130, 246, 0.12)', label: 'Toàn công ty', color: '#1d4ed8' },
    BRANCH: { bgColor: 'rgba(16, 185, 129, 0.12)', label: 'Chi nhánh', color: '#047857' },
    REGION: { bgColor: 'rgba(249, 115, 22, 0.12)', label: 'Khu vực', color: '#c2410c' },
    TEAM: { bgColor: 'rgba(139, 92, 246, 0.12)', label: 'Nhóm', color: '#7c3aed' },
};

const SALES_TARGET_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, draggable: false },
    { id: 'planCode', label: 'Mã kế hoạch', sortable: true, draggable: true },
    { id: 'year', label: 'Năm', sortable: true, draggable: true },
    { id: 'quarter', label: 'Quý', sortable: true, draggable: true },
    { id: 'scopeType', label: 'Phạm vi áp dụng', sortable: true, draggable: true },
    { id: 'scopeName', label: 'Đơn vị áp dụng', sortable: true, draggable: true },
    { id: 'targetAmount', label: 'Mục tiêu quý', sortable: true, draggable: true },
    { id: 'actualAmount', label: 'Thực tế lũy kế', sortable: true, draggable: true },
    { id: 'varianceAmount', label: 'Chênh lệch', sortable: true, draggable: true },
    { id: 'completionRate', label: 'Tỷ lệ hoàn thành', sortable: true, draggable: true },
    { id: 'status', label: 'Trạng thái', sortable: true, draggable: true },
    { id: 'createdByName', label: 'Người tạo', sortable: true, draggable: true },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, draggable: true },
];

const DEFAULT_COLUMN_ORDER = SALES_TARGET_COLUMNS.map((c) => c.id);
const DEFAULT_VISIBLE_COLUMN_IDS = DEFAULT_COLUMN_ORDER.slice();
const SORTABLE_COLUMN_IDS = SALES_TARGET_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const COLUMN_IDS_WITH_RIGHT_ALIGN = new Set(['targetAmount', 'actualAmount', 'varianceAmount', 'completionRate']);
const STORAGE_KEYS = {
    visible: 'salesTargetVisibleColumnIds',
    order: 'salesTargetColumnOrder',
    sort: 'salesTargetSortConfig',
    filter: 'salesTargetFilterValues',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LIST = [
    { id: 1, planCode: 'KHDS-2026-Q1-001', year: 2026, quarter: 1, scopeType: 'COMPANY', scopeName: 'Công ty TNHH Thương Mại ABC', targetAmount: 5000000000, actualAmount: 3200000000, status: 'APPROVED', createdByName: 'Nguyễn Văn An', createdAt: '2026-01-15T08:30:00Z' },
    { id: 2, planCode: 'KHDS-2026-Q1-002', year: 2026, quarter: 1, scopeType: 'BRANCH', scopeName: 'Chi nhánh Hồ Chí Minh', targetAmount: 2000000000, actualAmount: 1800000000, status: 'APPROVED', createdByName: 'Trần Thị Bình', createdAt: '2026-01-16T09:00:00Z' },
    { id: 3, planCode: 'KHDS-2026-Q1-003', year: 2026, quarter: 1, scopeType: 'BRANCH', scopeName: 'Chi nhánh Hà Nội', targetAmount: 1800000000, actualAmount: 1100000000, status: 'APPROVED', createdByName: 'Lê Văn Cường', createdAt: '2026-01-17T10:15:00Z' },
    { id: 4, planCode: 'KHDS-2026-Q1-004', year: 2026, quarter: 1, scopeType: 'REGION', scopeName: 'Khu vực Miền Nam', targetAmount: 3500000000, actualAmount: 2400000000, status: 'SUBMITTED', createdByName: 'Phạm Thị Dung', createdAt: '2026-01-18T14:20:00Z' },
    { id: 5, planCode: 'KHDS-2026-Q2-001', year: 2026, quarter: 2, scopeType: 'COMPANY', scopeName: 'Công ty TNHH Thương Mại ABC', targetAmount: 6000000000, actualAmount: 0, status: 'DRAFT', createdByName: 'Nguyễn Văn An', createdAt: '2026-03-01T08:00:00Z' },
    { id: 6, planCode: 'KHDS-2026-Q2-002', year: 2026, quarter: 2, scopeType: 'BRANCH', scopeName: 'Chi nhánh Đà Nẵng', targetAmount: 1200000000, actualAmount: 0, status: 'DRAFT', createdByName: 'Võ Thị E', createdAt: '2026-03-02T09:30:00Z' },
    { id: 7, planCode: 'KHDS-2025-Q4-001', year: 2025, quarter: 4, scopeType: 'COMPANY', scopeName: 'Công ty TNHH Thương Mại ABC', targetAmount: 4800000000, actualAmount: 5100000000, status: 'LOCKED', createdByName: 'Nguyễn Văn An', createdAt: '2025-10-01T08:00:00Z' },
    { id: 8, planCode: 'KHDS-2025-Q4-002', year: 2025, quarter: 4, scopeType: 'TEAM', scopeName: 'Nhóm Kinh doanh B2B', targetAmount: 800000000, actualAmount: 920000000, status: 'LOCKED', createdByName: 'Hoàng Văn F', createdAt: '2025-10-05T11:00:00Z' },
    { id: 9, planCode: 'KHDS-2025-Q3-001', year: 2025, quarter: 3, scopeType: 'BRANCH', scopeName: 'Chi nhánh Hồ Chí Minh', targetAmount: 1900000000, actualAmount: 1750000000, status: 'LOCKED', createdByName: 'Trần Thị Bình', createdAt: '2025-07-01T08:00:00Z' },
    { id: 10, planCode: 'KHDS-2025-Q3-002', year: 2025, quarter: 3, scopeType: 'BRANCH', scopeName: 'Chi nhánh Hà Nội', targetAmount: 1700000000, actualAmount: 1850000000, status: 'LOCKED', createdByName: 'Lê Văn Cường', createdAt: '2025-07-02T09:00:00Z' },
    { id: 11, planCode: 'KHDS-2026-Q1-005', year: 2026, quarter: 1, scopeType: 'TEAM', scopeName: 'Nhóm Kinh doanh B2C', targetAmount: 600000000, actualAmount: 450000000, status: 'APPROVED', createdByName: 'Đặng Văn G', createdAt: '2026-01-20T16:00:00Z' },
    { id: 12, planCode: 'KHDS-2026-Q3-001', year: 2026, quarter: 3, scopeType: 'COMPANY', scopeName: 'Công ty TNHH Thương Mại ABC', targetAmount: 6500000000, actualAmount: 0, status: 'DRAFT', createdByName: 'Nguyễn Văn An', createdAt: '2026-04-01T08:00:00Z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeParse = (jsonStr, fallback) => {
    try { return JSON.parse(jsonStr); } catch { return fallback; }
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN');
};

const formatQuarter = (q) => `Q${q}`;

const calcVariance = (actual, target) => actual - target;
const calcCompletionRate = (actual, target) => target > 0 ? Math.round((actual / target) * 100) : 0;

const enrichedRows = MOCK_LIST.map((r) => ({
    ...r,
    varianceAmount: calcVariance(r.actualAmount, r.targetAmount),
    completionRate: calcCompletionRate(r.actualAmount, r.targetAmount),
}));

// ─── Summary Card ─────────────────────────────────────────────────────────────

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

// ─── Filter Popup ─────────────────────────────────────────────────────────────

const FILTER_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'SUBMITTED', label: 'Đã gửi duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'LOCKED', label: 'Đã khóa' },
];

const FILTER_SCOPE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'COMPANY', label: 'Toàn công ty' },
    { value: 'BRANCH', label: 'Chi nhánh' },
    { value: 'REGION', label: 'Khu vực' },
    { value: 'TEAM', label: 'Nhóm' },
];

const FILTER_YEAR_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
];

const FILTER_QUARTER_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: '1', label: 'Quý 1' },
    { value: '2', label: 'Quý 2' },
    { value: '3', label: 'Quý 3' },
    { value: '4', label: 'Quý 4' },
];

const SalesTargetFilterPopup = ({ open, onClose, initialValues = {}, onApply, createdByOptions = [] }) => {
    const [statusOption, setStatusOption] = useState(FILTER_STATUS_OPTIONS[0]);
    const [scopeOption, setScopeOption] = useState(FILTER_SCOPE_OPTIONS[0]);
    const [yearOption, setYearOption] = useState(FILTER_YEAR_OPTIONS[0]);
    const [quarterOption, setQuarterOption] = useState(FILTER_QUARTER_OPTIONS[0]);
    const [createdBy, setCreatedBy] = useState('');
    const [createdFromDate, setCreatedFromDate] = useState('');
    const [createdToDate, setCreatedToDate] = useState('');
    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    const dropdownPaperSx = {
        borderRadius: '10px', mt: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.08)', '& .MuiAutocomplete-listbox': { fontSize: '13px', padding: '4px 0', maxHeight: 240 },
        '& .MuiAutocomplete-option': { fontSize: '13px', padding: '8px 12px', '&:hover': { bgcolor: '#f3f4f6' }, '&[aria-selected="true"]': { bgcolor: '#e0f2fe' } },
    };
    const inputSx = {
        '& .MuiOutlinedInput-root': { height: 40, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } },
        '& .MuiInputBase-input': { fontSize: '13px' },
    };
    const labelSx = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

    useEffect(() => {
        if (!open) return;
        setStatusOption(FILTER_STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) || FILTER_STATUS_OPTIONS[0]);
        setScopeOption(FILTER_SCOPE_OPTIONS.find((o) => o.value === (initialValues.scopeType ?? '')) || FILTER_SCOPE_OPTIONS[0]);
        setYearOption(FILTER_YEAR_OPTIONS.find((o) => String(o.value) === String(initialValues.year)) || FILTER_YEAR_OPTIONS[0]);
        setQuarterOption(FILTER_QUARTER_OPTIONS.find((o) => String(o.value) === String(initialValues.quarter)) || FILTER_QUARTER_OPTIONS[0]);
        setCreatedBy(initialValues.createdByName ?? '');
        setCreatedFromDate(initialValues.createdFromDate ?? '');
        setCreatedToDate(initialValues.createdToDate ?? '');
    }, [open, initialValues]);

    const handleApply = () => {
        onApply({
            status: statusOption.value || undefined,
            scopeType: scopeOption.value || undefined,
            year: yearOption.value || undefined,
            quarter: quarterOption.value || undefined,
            createdByName: createdBy || undefined,
            createdFromDate: createdFromDate || undefined,
            createdToDate: createdToDate || undefined,
        });
        onClose();
    };

    const handleClear = () => {
        setStatusOption(FILTER_STATUS_OPTIONS[0]);
        setScopeOption(FILTER_SCOPE_OPTIONS[0]);
        setYearOption(FILTER_YEAR_OPTIONS[0]);
        setQuarterOption(FILTER_QUARTER_OPTIONS[0]);
        setCreatedBy('');
        setCreatedFromDate('');
        setCreatedToDate('');
        onApply({});
        onClose();
    };

    const handleMouseDown = (e) => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        dragRef.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY };
        const onMouseMove = (ev) => {
            dragRef.current.x += ev.clientX - dragRef.current.startX;
            dragRef.current.y += ev.clientY - dragRef.current.startY;
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
            boxRef.current.style.left = `${dragRef.current.x}px`;
            boxRef.current.style.top = `${dragRef.current.y}px`;
        };
        const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!open) return null;

    return (
        <Paper ref={boxRef} elevation={0} sx={{
            position: 'fixed', left: 300, top: 110, width: 360, maxHeight: '80vh', borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden', zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: '#ffffff',
        }}>
            <Box onMouseDown={handleMouseDown} sx={{ cursor: 'move', px: 2.5, py: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Bộ lọc</Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng" sx={{ p: 0.5, color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#111827' } }}>
                    <RotateCcw size={16} style={{ transform: 'scaleX(-1)' }} />
                </IconButton>
            </Box>

            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Năm</Typography>
                    <Autocomplete size="small" options={FILTER_YEAR_OPTIONS} getOptionLabel={(o) => o.label} value={yearOption}
                        onChange={(_, v) => setYearOption(v || FILTER_YEAR_OPTIONS[0])} isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(p) => <Paper {...p} sx={dropdownPaperSx} />} renderInput={(p) => <TextField {...p} placeholder="Chọn năm" sx={inputSx} />} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Quý</Typography>
                    <Autocomplete size="small" options={FILTER_QUARTER_OPTIONS} getOptionLabel={(o) => o.label} value={quarterOption}
                        onChange={(_, v) => setQuarterOption(v || FILTER_QUARTER_OPTIONS[0])} isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(p) => <Paper {...p} sx={dropdownPaperSx} />} renderInput={(p) => <TextField {...p} placeholder="Chọn quý" sx={inputSx} />} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái</Typography>
                    <Autocomplete size="small" options={FILTER_STATUS_OPTIONS} getOptionLabel={(o) => o.label} value={statusOption}
                        onChange={(_, v) => setStatusOption(v || FILTER_STATUS_OPTIONS[0])} isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(p) => <Paper {...p} sx={dropdownPaperSx} />} renderInput={(p) => <TextField {...p} placeholder="Chọn trạng thái" sx={inputSx} />} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Phạm vi áp dụng</Typography>
                    <Autocomplete size="small" options={FILTER_SCOPE_OPTIONS} getOptionLabel={(o) => o.label} value={scopeOption}
                        onChange={(_, v) => setScopeOption(v || FILTER_SCOPE_OPTIONS[0])} isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(p) => <Paper {...p} sx={dropdownPaperSx} />} renderInput={(p) => <TextField {...p} placeholder="Chọn phạm vi" sx={inputSx} />} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Người tạo</Typography>
                    <Autocomplete freeSolo size="small" options={createdByOptions} value={createdBy}
                        onInputChange={(_, v) => setCreatedBy(v || '')} PaperComponent={(p) => <Paper {...p} sx={dropdownPaperSx} />}
                        renderInput={(p) => <TextField {...p} placeholder="Tìm người tạo" sx={inputSx} />} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={labelSx}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField size="small" type="date" value={createdFromDate} onChange={(e) => setCreatedFromDate(e.target.value)} fullWidth sx={inputSx} />
                        <TextField size="small" type="date" value={createdToDate} onChange={(e) => setCreatedToDate(e.target.value)} fullWidth sx={inputSx} />
                    </Box>
                </Box>
            </Box>

            <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 1 }}>
                <Button fullWidth size="small" onClick={handleClear} sx={{ fontSize: '13px', fontWeight: 500, textTransform: 'none', height: 36, borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151', '&:hover': { bgcolor: '#f3f4f6', borderColor: '#9ca3af' } }}>
                    Xóa lọc
                </Button>
                <Button fullWidth size="small" onClick={handleApply} sx={{ fontSize: '13px', fontWeight: 600, textTransform: 'none', height: 36, borderRadius: '8px', bgcolor: '#3b82f6', color: '#ffffff', '&:hover': { bgcolor: '#2563eb' } }}>
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesRevenueTarget() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const resetRef = useRef(false);

    const [list] = useState(enrichedRows);
    const [loading, setLoading] = useState(false);
    const [error] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.filter);
        return saved ? safeParse(saved, {}) : {};
    });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.visible);
        return saved ? new Set(safeParse(saved, DEFAULT_VISIBLE_COLUMN_IDS)) : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.sort);
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.orderBy ?? null;
    });
    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.sort);
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.order ?? 'asc';
    });
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.order);
        return saved ? safeParse(saved, DEFAULT_COLUMN_ORDER) : [...DEFAULT_COLUMN_ORDER];
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    useEffect(() => {
        if (columnSelectorAnchor) setTempColumnOrder(columnOrder);
        return () => { if (!resetRef.current) setTempColumnOrder(columnOrder); resetRef.current = false; };
    }, [columnSelectorAnchor]);

    // Column visibility
    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            localStorage.setItem(STORAGE_KEYS.visible, JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        const newSet = checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set();
        newSet.add('stt');
        setVisibleColumnIds(newSet);
        localStorage.setItem(STORAGE_KEYS.visible, JSON.stringify([...newSet]));
    };

    const visibleColumns = SALES_TARGET_COLUMNS
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

    // Sort
    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;
        let newOrder, newOrderBy;
        if (orderBy === columnId) {
            if (order === 'asc') { newOrder = 'desc'; newOrderBy = columnId; }
            else { newOrder = 'asc'; newOrderBy = null; }
        } else { newOrderBy = columnId; newOrder = 'asc'; }
        setOrderBy(newOrderBy); setOrder(newOrder); setPage(0);
        localStorage.setItem(STORAGE_KEYS.sort, JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    // Table drag-drop
    const handleDragStart = (e, columnId) => { setDraggedColumn(columnId); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;
        const newOrder = [...columnOrder];
        const dragIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;
        newOrder.splice(dragIdx, 1);
        newOrder.splice(dragIdx < targetIdx ? targetIdx : targetIdx, 0, draggedColumn);
        setColumnOrder(newOrder);
        localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(newOrder));
        setDraggedColumn(null);
    };
    const handleDragEnd = () => setDraggedColumn(null);

    // Popup drag-drop
    const handlePopupDragStart = (e, columnId) => { setDraggedPopupColumn(columnId); e.dataTransfer.effectAllowed = 'move'; };
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetColumnId) return;
        const newOrder = [...tempColumnOrder];
        const dragIdx = newOrder.indexOf(draggedPopupColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;
        newOrder.splice(dragIdx, 1);
        newOrder.splice(dragIdx < targetIdx ? targetIdx : targetIdx, 0, draggedPopupColumn);
        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };
    const handlePopupDragEnd = () => setDraggedPopupColumn(null);

    const handleResetColumns = () => {
        resetRef.current = true;
        setTempColumnOrder([...DEFAULT_COLUMN_ORDER]);
        setColumnOrder([...DEFAULT_COLUMN_ORDER]);
        setVisibleColumnIds(new Set(DEFAULT_VISIBLE_COLUMN_IDS));
        localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(DEFAULT_COLUMN_ORDER));
        localStorage.setItem(STORAGE_KEYS.visible, JSON.stringify(DEFAULT_VISIBLE_COLUMN_IDS));
        setColumnSelectorAnchor(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    // Filter
    const handleFilterApply = (values) => {
        setFilterValues(values);
        localStorage.setItem(STORAGE_KEYS.filter, JSON.stringify(values));
        setPage(0);
    };

    const createdByOptions = useMemo(() => [...new Set(list.map((x) => x.createdByName).filter(Boolean))], [list]);

    // Filtered + sorted rows
    const filteredAndSortedRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';
        let result = [...list];

        if (term) {
            result = result.filter((row) =>
                normalize(row.planCode ?? '').includes(term) ||
                normalize(row.scopeName ?? '').includes(term) ||
                normalize(row.scopeType ?? '').includes(term) ||
                normalize(row.createdByName ?? '').includes(term) ||
                normalize(String(row.year) ?? '').includes(term) ||
                normalize(`Q${row.quarter}`).includes(term)
            );
        }

        if (filterValues.status) result = result.filter((row) => row.status === filterValues.status);
        if (filterValues.scopeType) result = result.filter((row) => row.scopeType === filterValues.scopeType);
        if (filterValues.year) result = result.filter((row) => String(row.year) === String(filterValues.year));
        if (filterValues.quarter) result = result.filter((row) => String(row.quarter) === String(filterValues.quarter));
        if (filterValues.createdByName) result = result.filter((row) => normalize(row.createdByName ?? '').includes(normalize(filterValues.createdByName)));
        if (filterValues.createdFromDate) result = result.filter((row) => { const d = row.createdAt; return d && String(d).slice(0, 10) >= filterValues.createdFromDate; });
        if (filterValues.createdToDate) result = result.filter((row) => { const d = row.createdAt; return d && String(d).slice(0, 10) <= filterValues.createdToDate; });

        result.sort((a, b) => {
            if (!orderBy) return 0;
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = orderBy === 'createdAt';
            const isNumber = ['targetAmount', 'actualAmount', 'varianceAmount', 'completionRate'].includes(orderBy);
            let cmp = 0;
            if (isDate) {
                const tA = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                const tB = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                cmp = tA - tB;
            } else if (isNumber) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else {
                cmp = String(aVal ?? '').toLowerCase().localeCompare(String(bVal ?? '').toLowerCase());
            }
            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [list, searchTerm, filterValues, orderBy, order]);

    useEffect(() => setPage(0), [searchTerm, filterValues]);

    const totalCount = filteredAndSortedRows.length;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const rows = filteredAndSortedRows.slice(page * pageSize, (page + 1) * pageSize);

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => { setPageSize(Number(e.target.value)); setPage(0); };

    // Summary stats
    const totalPlans = filteredAndSortedRows.length;
    const approvedCount = filteredAndSortedRows.filter((r) => r.status === 'APPROVED').length;
    const activeCount = filteredAndSortedRows.filter((r) => ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(r.status)).length;

    const BODY_CELL_SX = {
        py: 1.75, px: 2, fontSize: '13px', lineHeight: '20px', verticalAlign: 'middle',
        borderBottom: '1px solid #f3f4f6', color: '#374151',
    };

    const getCellValue = (col, row, index) => {
        const opts = { pageNumber: page + 1, pageSize };
        if (col.id === 'stt') return (opts.pageNumber - 1) * opts.pageSize + index + 1;
        if (col.id === 'planCode') return row.planCode ?? '';
        if (col.id === 'year') return row.year ?? '';
        if (col.id === 'quarter') return row.quarter ? formatQuarter(row.quarter) : '';
        if (col.id === 'scopeType') return SCOPE_TYPE_STYLE[row.scopeType]?.label ?? row.scopeType ?? '';
        if (col.id === 'scopeName') return row.scopeName ?? '';
        if (col.id === 'targetAmount') return row.targetAmount;
        if (col.id === 'actualAmount') return row.actualAmount;
        if (col.id === 'varianceAmount') return row.varianceAmount;
        if (col.id === 'completionRate') return row.completionRate;
        if (col.id === 'status') return row.status;
        if (col.id === 'createdByName') return row.createdByName ?? '';
        if (col.id === 'createdAt') return row.createdAt;
        return '';
    };

    const handleRowClick = (row) => {
        // TODO: navigate to detail page
        console.log('Navigate to detail:', row.planCode);
    };

    const handleCreatePlan = () => {
        // TODO: navigate to create page
        console.log('Create new plan');
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            {/* Header Section */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Kế hoạch doanh số
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Theo dõi và quản lý kế hoạch doanh số theo kỳ áp dụng.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Target} label="Tổng kế hoạch" value={totalPlans.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={CheckCircle2} label="Đã duyệt" value={approvedCount.toLocaleString()} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={Eye} label="Đang theo dõi" value={activeCount.toLocaleString()} color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
                </Box>
            </Box>

            <SalesTargetFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} initialValues={filterValues} onApply={handleFilterApply} createdByOptions={createdByOptions} />

            {/* Main Content Wrapper */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper className="list-view" elevation={0} sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff' }}>
                    {/* Toolbar */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã kế hoạch, năm, quý, phạm vi áp dụng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px',
                                        '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton color="primary" onClick={() => setFilterOpen(true)} aria-label="Bộ lọc" sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                    <Filter size={18} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={handleCreatePlan} sx={{
                                    fontSize: '13px', fontWeight: 500, textTransform: 'none', borderRadius: '10px', height: 38, px: 2.5,
                                    bgcolor: '#0284c7', boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                    '&:hover': { bgcolor: '#0369a1', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)' },
                                }}>
                                    Tạo kế hoạch
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* Column Selector Popover */}
                    <Popover open={Boolean(columnSelectorAnchor)} anchorEl={columnSelectorAnchor} onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { elevation: 0, sx: { mt: 1, width: 340, maxHeight: '70vh', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Chọn cột & Sắp xếp</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } } }}>
                            <FormGroup>
                                <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === SALES_TARGET_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < SALES_TARGET_COLUMNS.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }} />} label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>} sx={{ mb: 1, py: 0.5 }} />
                                {[...SALES_TARGET_COLUMNS].sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box key={col.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: '8px', px: 0.75, py: 0.25, '&:hover': { bgcolor: '#f9fafb' } }}
                                        onDragOver={(e) => { if (col.draggable !== false) e.preventDefault(); }}
                                        onDrop={(e) => { if (col.draggable !== false) { e.preventDefault(); handlePopupDrop(e, col.id); } }}>
                                        {col.draggable !== false ? (
                                            <Box draggable onDragStart={(e) => handlePopupDragStart(e, col.id)} onDragEnd={handlePopupDragEnd} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                                <GripVertical size={14} />
                                            </Box>
                                        ) : (<Box sx={{ width: 14, height: 14 }} />)}
                                        <FormControlLabel control={<Checkbox checked={visibleColumnIds.has(col.id)} disabled={col.id === 'stt'} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.Mui-disabled': { color: '#d1d5db' } }} />}
                                            label={<Typography sx={{ fontSize: '13px', color: col.id === 'stt' ? '#9ca3af' : '#374151' }}>{col.label}{col.id === 'stt' && <Typography component="span" sx={{ fontSize: '11px', color: '#9ca3af', ml: 0.5 }}>(cố định)</Typography>}</Typography>}
                                            sx={{ flex: 1, m: 0, py: 0.5 }} />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0, alignItems: 'center' }}>
                            <Button variant="text" onClick={handleResetColumns} startIcon={<RotateCcw size={14} />} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', color: '#6b7280', mr: 'auto', '&:hover': { bgcolor: '#f9fafb', color: '#374151' } }}>Đặt lại</Button>
                            <Button variant="outlined" onClick={handleCancelColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>Hủy</Button>
                            <Button variant="contained" onClick={handleSaveColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#0284c7', boxShadow: 'none', '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)' } }}>Lưu</Button>
                        </Box>
                    </Popover>

                    {/* Table Section */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mb: 0 }}>{error}</Alert>}
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}><CircularProgress size={32} /></Box>
                        ) : rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có kế hoạch doanh số nào</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id} sx={{
                                                    fontWeight: 600, bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                    whiteSpace: 'nowrap', opacity: draggedColumn === col.id ? 0.5 : 1, transition: 'all 0.2s',
                                                    borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2,
                                                    ...(col.id === 'stt' && { width: 70, minWidth: 70, maxWidth: 70 }),
                                                    ...(col.id === 'planCode' && { minWidth: 170 }),
                                                    ...(col.id === 'year' && { minWidth: 80 }),
                                                    ...(col.id === 'quarter' && { minWidth: 80 }),
                                                    ...(col.id === 'scopeType' && { minWidth: 140 }),
                                                    ...(col.id === 'scopeName' && { minWidth: 200 }),
                                                    ...(col.id === 'status' && { minWidth: 130 }),
                                                    ...(col.id === 'createdAt' && { minWidth: 130 }),
                                                    ...(col.id === 'createdByName' && { minWidth: 140 }),
                                                }} align={COLUMN_IDS_WITH_RIGHT_ALIGN.has(col.id) ? 'right' : 'left'}
                                                    onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {col.sortable && (
                                                            <Box draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragEnd={handleDragEnd} className="drag-icon"
                                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', opacity: 1, transition: 'opacity 0.2s' }}>
                                                                <GripVertical size={14} />
                                                            </Box>
                                                        )}
                                                        {col.sortable ? (
                                                            <TableSortLabel active={orderBy === col.id} direction={orderBy === col.id ? order : 'asc'} onClick={() => handleSortRequest(col.id)}
                                                                sx={{ flex: 1, '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 } }} hideSortIcon={false}>{col.label}</TableSortLabel>
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
                                            <TableRow key={row.id} hover sx={{ height: 56, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb', cursor: 'pointer' }, '& .MuiTableCell-root': BODY_CELL_SX }}
                                                onClick={() => handleRowClick(row)}>
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') {
                                                        return <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{getCellValue(col, row, index)}</TableCell>;
                                                    }
                                                    if (col.id === 'planCode') {
                                                        const val = getCellValue(col, row, index);
                                                        return <TableCell key={col.id} align="left"><Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}><Box component="a" href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRowClick(row); }}
                                                            sx={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                                                            title={val}>{val}</Box></Box></TableCell>;
                                                    }
                                                    if (col.id === 'status') {
                                                        const style = STATUS_STYLE[row.status] ?? { bgColor: 'rgba(107,114,128,0.15)', label: row.status ?? '', dot: '•' };
                                                        return <TableCell key={col.id} align="left"><Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}><Chip label={`${style.dot} ${style.label}`} size="small" sx={{ fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '999px', minWidth: 100, height: '26px', bgcolor: style.bgColor, color: '#374151', border: 'none', boxShadow: 'none', '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' } }} /></Box></TableCell>;
                                                    }
                                                    if (col.id === 'scopeType') {
                                                        const style = SCOPE_TYPE_STYLE[row.scopeType] ?? { bgColor: 'rgba(107,114,128,0.12)', label: row.scopeType ?? '', color: '#374151' };
                                                        return <TableCell key={col.id} align="left"><Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}><Chip label={style.label} size="small" sx={{ fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '8px', minWidth: 0, height: '26px', bgcolor: style.bgColor, color: style.color, border: 'none', boxShadow: 'none', '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' } }} /></Box></TableCell>;
                                                    }
                                                    if (col.id === 'targetAmount') {
                                                        return <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3, color: '#111827' }}>{formatCurrency(row.targetAmount)}</TableCell>;
                                                    }
                                                    if (col.id === 'actualAmount') {
                                                        return <TableCell key={col.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums', pr: 3, color: '#374151' }}>{formatCurrency(row.actualAmount)}</TableCell>;
                                                    }
                                                    if (col.id === 'varianceAmount') {
                                                        const v = row.varianceAmount;
                                                        const isPositive = v >= 0;
                                                        return <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3, color: isPositive ? '#059669' : '#dc2626' }}>{isPositive ? '+' : ''}{formatCurrency(v)}</TableCell>;
                                                    }
                                                    if (col.id === 'completionRate') {
                                                        const rate = row.completionRate;
                                                        const color = rate >= 100 ? '#059669' : rate >= 70 ? '#d97706' : '#dc2626';
                                                        return <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3, color }}>{rate}%</TableCell>;
                                                    }
                                                    if (col.id === 'createdAt') {
                                                        return <TableCell key={col.id} align="left" sx={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{formatDate(row.createdAt)}</TableCell>;
                                                    }
                                                    if (col.id === 'scopeName') {
                                                        return <TableCell key={col.id} align="left" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.scopeName}>{row.scopeName}</TableCell>;
                                                    }
                                                    return <TableCell key={col.id} align="left" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getCellValue(col, row, index)}>{getCellValue(col, row, index)}</TableCell>;
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Pagination */}
                    <Box sx={{ flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select value={pageSize} onChange={handlePageSizeChange} sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' } }}>
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (<MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>Trước</Button>
                        <Button size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>Sau</Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
