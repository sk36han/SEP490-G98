/**
 * Viewsalesreportlist – Báo cáo doanh số theo 3 cấp thời gian: Năm → Quý → Tháng
 * Pattern giống ViewCategoryList / ViewSupplierList, bám sát theme hệ thống.
 * Chỉ là mockup, không gọi API thật.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
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
    Paper,
    Tooltip,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Filter,
    Columns,
    GripVertical,
    CloudOff,
    ChevronRight,
    ChevronDown,
    FileBarChart,
    Download,
    Eye,
} from 'lucide-react';
import SearchInput from '../../components/SearchInput';
import SalesReportFilterPopup from '../../components/SalesReportFilterPopup';

// ── LocalStorage keys ──────────────────────────────────────────────────────
const LS_COL_ORDER  = 'salesReportColumnOrder';
const LS_VISIBLE    = 'salesReportVisibleColumns';
const LS_EXPANDED   = 'salesReportExpanded';

// ── Constants ──────────────────────────────────────────────────────────────
const LEVEL = { YEAR: 'YEAR', QUARTER: 'QUARTER', MONTH: 'MONTH' };

const YEAR_OPTIONS = ['2026', '2025', '2024'];
const QUARTER_OPTIONS = ['Tất cả', 'Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'];
const MONTH_OPTIONS   = ['Tất cả', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                         'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_DATA = [
    // Năm 2026
    { id: 'y2026', level: LEVEL.YEAR, periodLabel: '2026',   scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      deliveryNotes: 245, lineItems: 1_840, totalQty: 12_580, totalValue: 4_850_000_000,
      prevValue: 3_920_000_000, change: 930_000_000, growth: 23.7 },
    // Quý 1/2026
    { id: 'q1-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 1 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 82, lineItems: 610, totalQty: 4_180, totalValue: 1_620_000_000,
      prevValue: 1_310_000_000, change: 310_000_000, growth: 23.7 },
    // Tháng 1/2026
    { id: 'm1-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 1 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 28, lineItems: 198, totalQty: 1_420, totalValue: 550_000_000,
      prevValue: 430_000_000, change: 120_000_000, growth: 27.9 },
    // Tháng 2/2026
    { id: 'm2-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 2 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 22, lineItems: 166, totalQty: 1_130, totalValue: 440_000_000,
      prevValue: 380_000_000, change: 60_000_000, growth: 15.8 },
    // Tháng 3/2026
    { id: 'm3-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 3 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 32, lineItems: 246, totalQty: 1_630, totalValue: 630_000_000,
      prevValue: 500_000_000, change: 130_000_000, growth: 26.0 },
    // Quý 2/2026
    { id: 'q2-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 2 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 68, lineItems: 512, totalQty: 3_420, totalValue: 1_320_000_000,
      prevValue: 1_120_000_000, change: 200_000_000, growth: 17.9 },
    // Tháng 4/2026
    { id: 'm4-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 4 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 22, lineItems: 170, totalQty: 1_100, totalValue: 430_000_000,
      prevValue: 360_000_000, change: 70_000_000, growth: 19.4 },
    // Tháng 5/2026
    { id: 'm5-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 5 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 24, lineItems: 182, totalQty: 1_220, totalValue: 470_000_000,
      prevValue: 390_000_000, change: 80_000_000, growth: 20.5 },
    // Tháng 6/2026
    { id: 'm6-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 6 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 22, lineItems: 160, totalQty: 1_100, totalValue: 420_000_000,
      prevValue: 370_000_000, change: 50_000_000, growth: 13.5 },
    // Quý 3/2026
    { id: 'q3-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 3 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 55, lineItems: 418, totalQty: 2_840, totalValue: 1_090_000_000,
      prevValue: 960_000_000, change: 130_000_000, growth: 13.5 },
    // Tháng 7/2026
    { id: 'm7-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 7 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 18, lineItems: 138, totalQty: 920, totalValue: 355_000_000,
      prevValue: 310_000_000, change: 45_000_000, growth: 14.5 },
    // Tháng 8/2026
    { id: 'm8-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 8 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 19, lineItems: 142, totalQty: 960, totalValue: 370_000_000,
      prevValue: 330_000_000, change: 40_000_000, growth: 12.1 },
    // Tháng 9/2026
    { id: 'm9-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 9 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 18, lineItems: 138, totalQty: 960, totalValue: 365_000_000,
      prevValue: 320_000_000, change: 45_000_000, growth: 14.1 },
    // Quý 4/2026
    { id: 'q4-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 4 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 40, lineItems: 300, totalQty: 2_140, totalValue: 820_000_000,
      prevValue: 530_000_000, change: 290_000_000, growth: 54.7 },
    // Tháng 10/2026
    { id: 'm10-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 10 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 14, lineItems: 100, totalQty: 700, totalValue: 270_000_000,
      prevValue: 170_000_000, change: 100_000_000, growth: 58.8 },
    // Tháng 11/2026
    { id: 'm11-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 11 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 13, lineItems: 98, totalQty: 720, totalValue: 280_000_000,
      prevValue: 180_000_000, change: 100_000_000, growth: 55.6 },
    // Tháng 12/2026
    { id: 'm12-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 12 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 13, lineItems: 102, totalQty: 720, totalValue: 270_000_000,
      prevValue: 180_000_000, change: 90_000_000, growth: 50.0 },
    // Năm 2025
    { id: 'y2025', level: LEVEL.YEAR, periodLabel: '2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      deliveryNotes: 1_080, lineItems: 8_140, totalQty: 55_600, totalValue: 3_920_000_000,
      prevValue: 3_100_000_000, change: 820_000_000, growth: 26.5 },
    // Quý 1/2025
    { id: 'q1-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 1 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 295, lineItems: 2_210, totalQty: 15_100, totalValue: 1_310_000_000,
      prevValue: 1_080_000_000, change: 230_000_000, growth: 21.3 },
    { id: 'm1-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 1 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 98, lineItems: 736, totalQty: 5_030, totalValue: 430_000_000,
      prevValue: 350_000_000, change: 80_000_000, growth: 22.9 },
    { id: 'm2-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 2 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 88, lineItems: 660, totalQty: 4_510, totalValue: 380_000_000,
      prevValue: 320_000_000, change: 60_000_000, growth: 18.8 },
    { id: 'm3-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 3 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 109, lineItems: 814, totalQty: 5_560, totalValue: 500_000_000,
      prevValue: 410_000_000, change: 90_000_000, growth: 22.0 },

    // Quý 2/2025
    { id: 'q2-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 2 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 270, lineItems: 2_030, totalQty: 13_900, totalValue: 1_120_000_000,
      prevValue: 960_000_000, change: 160_000_000, growth: 16.7 },
    { id: 'm4-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 4 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 88, lineItems: 662, totalQty: 4_530, totalValue: 360_000_000,
      prevValue: 320_000_000, change: 40_000_000, growth: 12.5 },
    { id: 'm5-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 5 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 92, lineItems: 694, totalQty: 4_740, totalValue: 390_000_000,
      prevValue: 330_000_000, change: 60_000_000, growth: 18.2 },
    { id: 'm6-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 6 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 90, lineItems: 674, totalQty: 4_630, totalValue: 370_000_000,
      prevValue: 310_000_000, change: 60_000_000, growth: 19.4 },

    // Quý 3/2025
    { id: 'q3-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 3 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 255, lineItems: 1_920, totalQty: 13_130, totalValue: 960_000_000,
      prevValue: 840_000_000, change: 120_000_000, growth: 14.3 },
    { id: 'm7-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 7 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 84, lineItems: 630, totalQty: 4_310, totalValue: 310_000_000,
      prevValue: 270_000_000, change: 40_000_000, growth: 14.8 },
    { id: 'm8-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 8 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 86, lineItems: 646, totalQty: 4_420, totalValue: 330_000_000,
      prevValue: 280_000_000, change: 50_000_000, growth: 17.9 },
    { id: 'm9-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 9 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 85, lineItems: 644, totalQty: 4_400, totalValue: 320_000_000,
      prevValue: 290_000_000, change: 30_000_000, growth: 10.3 },

    // Quý 4/2025
    { id: 'q4-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 4 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 260, lineItems: 1_980, totalQty: 13_470, totalValue: 530_000_000,
      prevValue: 460_000_000, change: 70_000_000, growth: 15.2 },
    { id: 'm10-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 10 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 86, lineItems: 646, totalQty: 4_410, totalValue: 170_000_000,
      prevValue: 150_000_000, change: 20_000_000, growth: 13.3 },
    { id: 'm11-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 11 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 86, lineItems: 660, totalQty: 4_510, totalValue: 180_000_000,
      prevValue: 155_000_000, change: 25_000_000, growth: 16.1 },
    { id: 'm12-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 12 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 88, lineItems: 674, totalQty: 4_550, totalValue: 180_000_000,
      prevValue: 155_000_000, change: 25_000_000, growth: 16.1 },
];

// ── Column definitions ─────────────────────────────────────────────────────
const ALL_COLUMNS = [
    { id: 'periodLabel',   label: 'Kỳ báo cáo',       align: 'left',  width: 220, minWidth: 220 },
    { id: 'deliveryNotes', label: 'Số phiếu xuất',     align: 'right', width: 110, minWidth: 110 },
    { id: 'totalQty',     label: 'Tổng SL xuất',        align: 'right', width: 110, minWidth: 110 },
    { id: 'totalValue',   label: 'Giá trị xuất hàng',  align: 'right', width: 160, minWidth: 160 },
    { id: 'prevValue',    label: 'Kỳ trước',            align: 'right', width: 140, minWidth: 140 },
    { id: 'change',      label: 'Tăng / Giảm',          align: 'right', width: 140, minWidth: 140 },
    { id: 'growth',      label: 'Tăng trưởng',           align: 'right', width: 100, minWidth: 100 },
];

const DEFAULT_VISIBLE = ['periodLabel', 'deliveryNotes', 'totalQty', 'totalValue', 'prevValue', 'change', 'growth'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format VND cho giá trị thường (không dấu) */
const formatVND = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
};

/** Format số nguyên có dấu + / - phía trước */
const formatSignedCurrency = (n) => {
    if (n == null) return '—';
    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
};

/** Format phần trăm có dấu + / - và 2 số lẻ */
const formatSignedPercent = (n) => {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

/** Format số nguyên thường */
const formatNumber = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN').format(n);
};

/** Tính Tăng/Giảm = hiện tại - kỳ trước */
const calcChange = (curr, prev) => {
    if (curr == null || prev == null) return null;
    return curr - prev;
};

/** Tính Tăng trưởng = (change / prev) * 100, tránh chia 0 */
const calcGrowth = (change, prev) => {
    if (change == null || prev == null || prev === 0) return null;
    return (change / prev) * 100;
};

/** Màu Tăng/Giảm: dương=xanh, âm=đỏ, 0=xám */
const changeColor = (v) => v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#6b7280';

/** Tìm row kỳ trước trong rawData dựa trên level của row hiện tại */
const getPreviousPeriodRow = (row, rawData) => {
    if (!row || !rawData?.length) return null;

    if (row.level === LEVEL.YEAR) {
        const yearNum = parseInt(row.periodLabel);
        const prevYear = yearNum - 1;
        return rawData.find(r => r.level === LEVEL.YEAR && r.periodLabel === String(prevYear));
    }

    if (row.level === LEVEL.QUARTER) {
        const label = row.periodLabel;
        const qNum = parseInt(label.match(/Quý (\d)/)?.[1] || '0');
        const yrNum = parseInt(label.match(/(\d{4})$/)?.[1] || '0');
        let prevQ = qNum - 1;
        let prevY = yrNum;
        if (prevQ === 0) { prevQ = 4; prevY = yrNum - 1; }
        const prevLabel = `Quý ${prevQ} / ${prevY}`;
        return rawData.find(r => r.level === LEVEL.QUARTER && r.periodLabel === prevLabel);
    }

    if (row.level === LEVEL.MONTH) {
        const label = row.periodLabel;
        const mNum = parseInt(label.match(/Tháng (\d+)/)?.[1] || '0');
        const yrNum = parseInt(label.match(/(\d{4})$/)?.[1] || '0');
        let prevM = mNum - 1;
        let prevY = yrNum;
        if (prevM === 0) { prevM = 12; prevY = yrNum - 1; }
        const prevLabel = `Tháng ${prevM} / ${prevY}`;
        return rawData.find(r => r.level === LEVEL.MONTH && r.periodLabel === prevLabel);
    }

    return null;
};

/** Tính comparison object từ row và rawData gốc */
const getComputedComparison = (row, rawData) => {
    const prevRow = getPreviousPeriodRow(row, rawData);
    if (!prevRow) return { compPrev: null, compChange: null, compGrowth: null };

    const compPrev = prevRow.totalValue;
    const compChange = calcChange(row.totalValue, compPrev);
    const compGrowth = calcGrowth(compChange, compPrev);

    return { compPrev, compChange, compGrowth };
};

// ── Font style theo cấp (nhấn mạnh YEAR > QUARTER > MONTH) ──────────────────
const LEVEL_FONT = {
    YEAR:    { fontSize: '14px', fontWeight: 700, color: '#111827' },
    QUARTER: { fontSize: '13px', fontWeight: 500, color: '#374151' },
    MONTH:   { fontSize: '12px', fontWeight: 400, color: '#6b7280' },
};

const ROW_INDENT = { YEAR: 0, QUARTER: 24, MONTH: 48 };

// Font style cho cột giá trị (đậm hơn label, giữ đúng màu level)
const VALUE_FONT = {
    YEAR:    { fontSize: '14px', fontWeight: 700, color: '#111827' },
    QUARTER: { fontSize: '13px', fontWeight: 600, color: '#374151' },
    MONTH:   { fontSize: '12px', fontWeight: 500, color: '#6b7280' },
};

// ── SummaryCard ─────────────────────────────────────────────────────────────
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

// ── Main Component ──────────────────────────────────────────────────────────
export default function Viewsalesreportlist() {
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Search / filter
    const [searchTerm, setSearchTerm]         = useState('');
    const [filterAnchor, setFilterAnchor]     = useState(null);
    const [filterValues, setFilterValues]     = useState({});

    // Column management
    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            return Array.isArray(saved) && saved.length > 0 ? saved : ALL_COLUMNS.map(c => c.id);
        } catch { return ALL_COLUMNS.map(c => c.id); }
    });
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_VISIBLE));
            return new Set(Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_VISIBLE);
        } catch { return new Set(DEFAULT_VISIBLE); }
    });
    const [tempColumnOrder, setTempColumnOrder]         = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn]     = useState(null);

    // Expand / collapse
    const [expandedIds, setExpandedIds] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_EXPANDED));
            return new Set(Array.isArray(saved) ? saved : ['y2026', 'q1-2026', 'q2-2026', 'q3-2026', 'q4-2026', 'y2025', 'q1-2025', 'q2-2025', 'q3-2025', 'q4-2025']);
        } catch { return new Set(['y2026', 'q1-2026', 'q2-2026', 'q3-2026', 'q4-2026', 'y2025', 'q1-2025', 'q2-2025', 'q3-2025', 'q4-2025']); }
    });

    // Tree report: không dùng pagination

    // ── Build visible flat rows ──────────────────────────────────────────
    const visibleColumns = useMemo(() =>
        columnOrder.map(id => ALL_COLUMNS.find(c => c.id === id)).filter(c => c && visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]
    );

    // Apply search filter to mock data
    const filteredData = useMemo(() => {
        const fv = filterValues;
        return MOCK_DATA.filter(row => {
            // Year filter
            if (fv.year && fv.year !== 'all') {
                if (!row.periodLabel.startsWith(fv.year)) return false;
            }
            // Quarter filter
            if (fv.quarter && fv.quarter !== 'Tất cả') {
                const qNum = fv.quarter.replace('Quý ', '');
                if (row.level === LEVEL.QUARTER && !row.periodLabel.includes(`Quý ${qNum}`)) return false;
                if (row.level === LEVEL.MONTH) {
                    const monthNum = parseInt(row.periodLabel.match(/Tháng (\d+)/)?.[1] || '0');
                    const qStart = (parseInt(qNum) - 1) * 3 + 1;
                    if (monthNum < qStart || monthNum > qStart + 2) return false;
                }
            }
            // Month filter
            if (fv.month && fv.month !== 'Tất cả') {
                if (row.level === LEVEL.MONTH && !row.periodLabel.includes(fv.month)) return false;
            }
            // Search
            if (searchTerm.trim()) {
                const kw = searchTerm.toLowerCase();
                const match = row.periodLabel.toLowerCase().includes(kw);
                if (!match) return false;
            }
            return true;
        });
    }, [filterValues, searchTerm]);

    // Build tree: filter để quyết định hiển thị,
    // nhưng comparison LUÔN lấy từ MOCK_DATA gốc (không lọc)
    const treeRows = useMemo(() => {
        const result = [];
        const rawData = MOCK_DATA; // luôn dùng dataset gốc cho comparison
        const idSet = new Set(filteredData.map(r => r.id));

        filteredData.forEach(row => {
            // Luôn tính comparison từ raw dataset gốc, không dùng filteredData
            const { compPrev, compChange, compGrowth } = getComputedComparison(row, rawData);

            if (row.level === LEVEL.YEAR) {
                result.push({ ...row, depth: 0, hasChildren: filteredData.some(r => r.parentId === row.id && idSet.has(r.id)),
                    compPrev, compChange, compGrowth });
            } else if (row.level === LEVEL.QUARTER) {
                const parent = filteredData.find(r => r.id === row.parentId);
                if (parent && expandedIds.has(parent.id)) {
                    result.push({ ...row, depth: 1, hasChildren: filteredData.some(r => r.parentId === row.id && idSet.has(r.id)),
                        compPrev, compChange, compGrowth });
                }
            } else if (row.level === LEVEL.MONTH) {
                const quarter = filteredData.find(r => r.id === row.parentId);
                if (quarter && expandedIds.has(quarter.id)) {
                    result.push({ ...row, depth: 2, hasChildren: false,
                        compPrev, compChange, compGrowth });
                }
            }
        });
        return result;
    }, [filteredData, expandedIds]);

    const totalItems = treeRows.length;

    // ── Expand / collapse ─────────────────────────────────────────────────
    const toggleExpand = useCallback((id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            localStorage.setItem(LS_EXPANDED, JSON.stringify([...next]));
            return next;
        });
    }, []);

    // ── Column selector ───────────────────────────────────────────────────
    const handlePopupDragStart = (e, colId) => {
        setDraggedPopupColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedPopupColumn;
        if (!sourceId || sourceId === targetId) { setDraggedPopupColumn(null); return; }
        const arr = [...tempColumnOrder];
        const from = arr.indexOf(sourceId);
        const to   = arr.indexOf(targetId);
        if (from === -1 || to === -1) { setDraggedPopupColumn(null); return; }
        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setTempColumnOrder(arr);
        setDraggedPopupColumn(null);
    };
    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        localStorage.setItem(LS_VISIBLE, JSON.stringify([...visibleColumnIds]));
        setColumnSelectorAnchor(null);
    };
    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    // ── Filter ────────────────────────────────────────────────────────────
    const handleFilterApply = useCallback((values) => {
        setFilterValues(values);
    }, []);

    // ── Summary totals ────────────────────────────────────────────────────
    const summaryTotals = useMemo(() => {
        const visibleRows = filteredData;
        return {
            totalSales:   visibleRows.filter(r => r.level === LEVEL.YEAR).reduce((s, r) => s + r.totalValue, 0),
            totalNotes:   visibleRows.filter(r => r.level === LEVEL.YEAR).reduce((s, r) => s + r.deliveryNotes, 0),
            totalQty:     visibleRows.filter(r => r.level === LEVEL.YEAR).reduce((s, r) => s + r.totalQty, 0),
        };
    }, [filteredData]);

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <Box sx={{
            height: '100%', minHeight: 0, minWidth: 0,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            bgcolor: '#fafafa',
        }}>
            {/* ── Page Header ── */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600"
                    sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Báo cáo doanh số
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Theo dõi số liệu xuất hàng thực tế theo Năm, Quý, Tháng
                </Typography>

                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard
                        icon={FileBarChart}
                        label="Tổng doanh số"
                        value={formatVND(summaryTotals.totalSales)}
                        color="#6b7280"
                        bgColor="rgba(107,114,128,0.1)"
                    />
                    <SummaryCard
                        icon={FileBarChart}
                        label="Tổng phiếu xuất"
                        value={formatNumber(summaryTotals.totalNotes)}
                        color="#2563eb"
                        bgColor="rgba(37,99,235,0.1)"
                    />
                    <SummaryCard
                        icon={FileBarChart}
                        label="Tổng số lượng xuất"
                        value={formatNumber(summaryTotals.totalQty)}
                        color="#059669"
                        bgColor="rgba(5,150,105,0.1)"
                    />
                </Box>
            </Box>

            {/* ── Main Content ── */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper className="list-view" elevation={0} sx={{
                    flex: 1, minHeight: 0, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff',
                }}>
                    {/* ── Toolbar ── */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{
                            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                            gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap',
                        }}>
                            <SearchInput
                                placeholder="Tìm theo kỳ báo cáo…"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); }}
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6', border: '1px solid #e5e7eb',
                                        borderRadius: '10px', fontSize: '13px',
                                        '& fieldset': { border: 'none' },
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': {
                                            bgcolor: '#ffffff', borderColor: '#0284c7',
                                            boxShadow: '0 0 0 3px rgba(2,132,199,0.10)',
                                        },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />

                            <Tooltip title="Bộ lọc">
                                <IconButton color="primary"
                                    onClick={(e) => setFilterAnchor(e.currentTarget)}
                                    aria-label="Bộ lọc"
                                    sx={{
                                        border: '1px solid #e5e7eb', bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}>
                                    <Filter size={18} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary"
                                    onClick={(e) => { setTempColumnOrder(columnOrder); setColumnSelectorAnchor(e.currentTarget); }}
                                    aria-label="Chọn cột"
                                    sx={{
                                        border: '1px solid #e5e7eb', bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}>
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>

                            {/* spacer to push export to right */}
                            <Box sx={{ flex: 1 }} />

                            {/* Export button */}
                            <Button
                                variant="outlined"
                                startIcon={<Download size={16} />}
                                sx={{
                                    fontSize: '13px', fontWeight: 500,
                                    textTransform: 'none', borderRadius: '10px',
                                    height: 38, px: 2.5,
                                    borderColor: '#e5e7eb', color: '#374151',
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                }}
                            >
                                Xuất báo cáo
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Filter Popup ── */}
                    <SalesReportFilterPopup
                        open={Boolean(filterAnchor)}
                        onClose={() => setFilterAnchor(null)}
                        initialValues={filterValues}
                        onApply={handleFilterApply}
                    />

                    {/* ── Column Selector Popover ── */}
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
                                    mt: 1, width: 340, maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>
                        <Box sx={{
                            px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
                        }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === ALL_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < ALL_COLUMNS.length}
                                            onChange={(e) => setVisibleColumnIds(e.target.checked ? new Set(ALL_COLUMNS.map(c => c.id)) : new Set())}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' }, '&.MuiCheckbox-indeterminate': { color: '#0284c7' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {ALL_COLUMNS
                                    .slice()
                                    .sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id))
                                    .map((col) => (
                                        <Box
                                            key={col.id}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1,
                                                bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent',
                                                opacity: draggedPopupColumn === col.id ? 0.5 : 1,
                                                transition: 'all 0.2s',
                                                borderRadius: '8px', px: 0.75, py: 0.25,
                                                '&:hover': { bgcolor: '#f9fafb' },
                                            }}
                                            onDragOver={handlePopupDragOver}
                                            onDrop={(e) => handlePopupDrop(e, col.id)}
                                        >
                                            <Box draggable
                                                onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                                onDragEnd={() => setDraggedPopupColumn(null)}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', cursor: 'grab',
                                                    '&:active': { cursor: 'grabbing' },
                                                    color: '#9ca3af', '&:hover': { color: '#6b7280' },
                                                }}>
                                                <GripVertical size={14} />
                                            </Box>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={visibleColumnIds.has(col.id)}
                                                        onChange={(e) => {
                                                            setVisibleColumnIds(prev => {
                                                                const next = new Set(prev);
                                                                e.target.checked ? next.add(col.id) : next.delete(col.id);
                                                                return next;
                                                            });
                                                        }}
                                                        sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' } }}
                                                    />
                                                }
                                                label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                                sx={{ flex: 1, m: 0, py: 0.5 }}
                                            />
                                        </Box>
                                    ))
                                }
                            </FormGroup>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Button variant="outlined" onClick={handleCancelColumnOrder}
                                sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px',
                                    borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>
                                Hủy
                            </Button>
                            <Button variant="contained" onClick={handleSaveColumnOrder}
                                sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px',
                                    bgcolor: '#0284c7', boxShadow: 'none', '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' } }}>
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* ── Table / States ── */}
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {treeRows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1, color: 'text.secondary', py: 6 }}>
                                <CloudOff size={48} style={{ marginBottom: 8, opacity: 0.35 }} />
                                <Typography sx={{ fontSize: '13px' }}>Không có dữ liệu báo cáo</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                                    Hiển thị {totalItems} dòng báo cáo
                                </Typography>
                            </Box>
                        )}
                        {treeRows.length > 0 && (
                            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id} align={col.align} sx={{
                                                    fontWeight: 600, bgcolor: '#fafafa',
                                                    borderBottom: '2px solid #e5e7eb',
                                                    fontSize: '12px', color: '#6b7280',
                                                    py: 1.5, px: 2, whiteSpace: 'nowrap',
                                                    width: col.width, minWidth: col.minWidth,
                                                }}>
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {treeRows.map((row) => {
                                            const isExpanded = expandedIds.has(row.id);

                                            return (
                                                <TableRow key={row.id} hover
                                                    sx={{
                                                        height: 52,
                                                        bgcolor: row.level === LEVEL.YEAR ? '#fff' : row.level === LEVEL.QUARTER ? '#fafbfc' : '#fcfcfd',
                                                        '&:hover': { bgcolor: '#f9fafb' },
                                                        '&:last-child td': { borderBottom: 0 },
                                                    }}
                                                >
                                                    {visibleColumns.map((col) => {
                                                        const lf = LEVEL_FONT[row.level] || LEVEL_FONT.MONTH;

                                                        // Kỳ báo cáo với expand button và icon xem chi tiết
                                                        if (col.id === 'periodLabel') {
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6' }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: `${ROW_INDENT[row.level] || 0}px` }}>
                                                                            {row.hasChildren ? (
                                                                                <IconButton size="small"
                                                                                    onClick={() => toggleExpand(row.id)}
                                                                                    sx={{ p: 0.25, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                                </IconButton>
                                                                            ) : (
                                                                                <Box sx={{ width: 20, flexShrink: 0 }} />
                                                                            )}
                                                                            <Typography sx={{ ...lf }}>
                                                                                {row.periodLabel}
                                                                            </Typography>
                                                                        </Box>
                                                                        <Tooltip title="Xem chi tiết">
                                                                            <IconButton size="small"
                                                                                onClick={() => {/* TODO: navigate to detail */}}
                                                                                sx={{ p: 0.5, color: '#9ca3af', '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)' } }}>
                                                                                <Eye size={15} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        // Numeric columns
                                                        if (col.align === 'right') {
                                                            let val = '';
                                                            let color = lf.color;
                                                            let weight = lf.fontWeight;
                                                            let fontSize = lf.fontSize;

                                                            if (col.id === 'deliveryNotes') {
                                                                val = formatNumber(row.deliveryNotes);
                                                            } else if (col.id === 'totalQty') {
                                                                val = formatNumber(row.totalQty);
                                                            } else if (col.id === 'totalValue') {
                                                                val = formatVND(row.totalValue);
                                                                const vf = VALUE_FONT[row.level] || VALUE_FONT.MONTH;
                                                                fontSize = vf.fontSize;
                                                                weight = vf.fontWeight;
                                                                color = vf.color;
                                                            } else if (col.id === 'prevValue') {
                                                                val = row.compPrev != null ? formatVND(row.compPrev) : '—';
                                                                color = '#9ca3af';
                                                            } else if (col.id === 'change') {
                                                                if (row.compChange != null) {
                                                                    color = changeColor(row.compChange);
                                                                    val = formatSignedCurrency(row.compChange);
                                                                } else {
                                                                    val = '—';
                                                                }
                                                            } else if (col.id === 'growth') {
                                                                if (row.compGrowth != null) {
                                                                    color = changeColor(row.compGrowth);
                                                                    val = formatSignedPercent(row.compGrowth);
                                                                } else {
                                                                    val = '—';
                                                                }
                                                            }

                                                            return (
                                                                <TableCell key={col.id} align="right" sx={{
                                                                    py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6',
                                                                    fontSize, fontWeight: weight, color, fontVariantNumeric: 'tabular-nums',
                                                                }}>
                                                                    {val}
                                                                </TableCell>
                                                            );
                                                        }

                                                        // Default fallback
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', ...lf }}>
                                                                {String(row[col.id] ?? '—')}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
