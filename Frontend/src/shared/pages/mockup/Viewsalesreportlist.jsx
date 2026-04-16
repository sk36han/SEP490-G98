/**
 * Viewsalesreportlist – Báo cáo doanh số theo 3 cấp thời gian: Năm → Quý → Tháng
 * Pattern giống ViewCategoryList / ViewSupplierList, bám sát theme hệ thống.
 * Chỉ là mockup, không gọi API thật.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Columns,
    GripVertical,
    CloudOff,
    ChevronRight,
    ChevronDown,
    FileBarChart,
    Download,
    Eye,
} from 'lucide-react';
import {
    BarChart, Bar, Line,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import SearchInput from '../../components/SearchInput';

// ── LocalStorage keys ──────────────────────────────────────────────────────
const LS_COL_ORDER  = 'salesReportColumnOrder';
const LS_VISIBLE    = 'salesReportVisibleColumns';
const LS_EXPANDED   = 'salesReportExpanded';

// ── Constants ──────────────────────────────────────────────────────────────
const LEVEL = { YEAR: 'YEAR', QUARTER: 'QUARTER', MONTH: 'MONTH' };

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_DATA = [
    // Năm 2026
    { id: 'y2026', level: LEVEL.YEAR, periodLabel: '2026',   scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      deliveryNotes: 245, grnNotes: 210, lineItems: 1_840, totalQty: 12_580, grnQty: 11_240, totalValue: 4_850_000_000,
      prevValue: 3_920_000_000, change: 930_000_000, growth: 23.7 },
    // Quý 1/2026
    { id: 'q1-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 1 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 82, grnNotes: 70, lineItems: 610, totalQty: 4_180, grnQty: 3_740, totalValue: 1_620_000_000,
      prevValue: 1_310_000_000, change: 310_000_000, growth: 23.7 },
    // Tháng 1/2026
    { id: 'm1-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 1 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 28, grnNotes: 24, lineItems: 198, totalQty: 1_420, grnQty: 1_260, totalValue: 550_000_000,
      prevValue: 430_000_000, change: 120_000_000, growth: 27.9 },
    // Tháng 2/2026
    { id: 'm2-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 2 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 22, grnNotes: 19, lineItems: 166, totalQty: 1_130, grnQty: 1_010, totalValue: 440_000_000,
      prevValue: 380_000_000, change: 60_000_000, growth: 15.8 },
    // Tháng 3/2026
    { id: 'm3-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 3 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2026', deliveryNotes: 32, grnNotes: 27, lineItems: 246, totalQty: 1_630, grnQty: 1_470, totalValue: 630_000_000,
      prevValue: 500_000_000, change: 130_000_000, growth: 26.0 },
    // Quý 2/2026
    { id: 'q2-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 2 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 68, grnNotes: 58, lineItems: 512, totalQty: 3_420, grnQty: 3_043, totalValue: 1_320_000_000, grnValue: 1_254_000_000,
      prevValue: 1_120_000_000, change: 200_000_000, growth: 17.9 },
    // Tháng 4/2026
    { id: 'm4-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 4 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 22, grnNotes: 18, lineItems: 170, totalQty: 1_100, grnQty: 979, grnValue: 408_500_000, totalValue: 430_000_000,
      prevValue: 360_000_000, change: 70_000_000, growth: 19.4 },
    // Tháng 5/2026
    { id: 'm5-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 5 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 24, grnNotes: 20, lineItems: 182, totalQty: 1_220, grnQty: 1085, grnValue: 446_500_000, totalValue: 470_000_000,
      prevValue: 390_000_000, change: 80_000_000, growth: 20.5 },
    // Tháng 6/2026
    { id: 'm6-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 6 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2026', deliveryNotes: 22, grnNotes: 18, lineItems: 160, totalQty: 1_100, grnQty: 979, grnValue: 399_000_000, totalValue: 420_000_000,
      prevValue: 370_000_000, change: 50_000_000, growth: 13.5 },
    // Quý 3/2026
    { id: 'q3-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 3 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 55, grnNotes: 47, lineItems: 418, totalQty: 2_840, grnQty: 2527, grnValue: 1_035_500_000, totalValue: 1_090_000_000,
      prevValue: 1_150_000_000, change: -60_000_000, growth: -5.2 },
    // Tháng 7/2026
    { id: 'm7-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 7 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 18, grnNotes: 15, lineItems: 138, totalQty: 920, grnQty: 818, grnValue: 337_250_000, totalValue: 355_000_000,
      prevValue: 310_000_000, change: 45_000_000, growth: 14.5 },
    // Tháng 8/2026
    { id: 'm8-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 8 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 19, grnNotes: 16, lineItems: 142, totalQty: 960, grnQty: 854, grnValue: 351_500_000, totalValue: 370_000_000,
      prevValue: 330_000_000, change: 40_000_000, growth: 12.1 },
    // Tháng 9/2026
    { id: 'm9-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 9 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2026', deliveryNotes: 18, grnNotes: 15, lineItems: 138, totalQty: 960, grnQty: 854, grnValue: 346_750_000, totalValue: 365_000_000,
      prevValue: 320_000_000, change: 45_000_000, growth: 14.1 },
    // Quý 4/2026
    { id: 'q4-2026', level: LEVEL.QUARTER, periodLabel: 'Quý 4 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2026', deliveryNotes: 40, grnNotes: 34, lineItems: 300, totalQty: 2_140, grnQty: 1904, grnValue: 779_000_000, totalValue: 820_000_000,
      prevValue: 920_000_000, change: -100_000_000, growth: -10.9 },
    // Tháng 10/2026
    { id: 'm10-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 10 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 14, grnNotes: 12, lineItems: 100, totalQty: 700, grnQty: 623, grnValue: 256_500_000, totalValue: 270_000_000,
      prevValue: 170_000_000, change: 100_000_000, growth: 58.8 },
    // Tháng 11/2026
    { id: 'm11-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 11 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 13, grnNotes: 11, lineItems: 98, totalQty: 720, grnQty: 640, grnValue: 266_000_000, totalValue: 280_000_000,
      prevValue: 180_000_000, change: 100_000_000, growth: 55.6 },
    // Tháng 12/2026
    { id: 'm12-2026', level: LEVEL.MONTH, periodLabel: 'Tháng 12 / 2026', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2026', deliveryNotes: 13, grnNotes: 11, lineItems: 102, totalQty: 720, grnQty: 640, grnValue: 256_500_000, totalValue: 270_000_000,
      prevValue: 180_000_000, change: 90_000_000, growth: 50.0 },
    // Năm 2025
    { id: 'y2025', level: LEVEL.YEAR, periodLabel: '2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      deliveryNotes: 1_080, grnNotes: 920, lineItems: 8_140, totalQty: 55_600, grnQty: 49_800, totalValue: 3_920_000_000,
      prevValue: 4_200_000_000, change: -280_000_000, growth: -6.7 },
    // Quý 1/2025
    { id: 'q1-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 1 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 295, grnNotes: 253, lineItems: 2_210, totalQty: 15_100, grnQty: 13439, grnValue: 1_244_500_000, totalValue: 1_310_000_000,
      prevValue: 1_080_000_000, change: 230_000_000, growth: 21.3 },
    { id: 'm1-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 1 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 98, grnNotes: 84, lineItems: 736, totalQty: 5_030, grnQty: 4476, grnValue: 408_500_000, totalValue: 430_000_000,
      prevValue: 350_000_000, change: 80_000_000, growth: 22.9 },
    { id: 'm2-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 2 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 88, grnNotes: 75, lineItems: 660, totalQty: 4_510, grnQty: 4013, grnValue: 361_000_000, totalValue: 380_000_000,
      prevValue: 320_000_000, change: 60_000_000, growth: 18.8 },
    { id: 'm3-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 3 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q1-2025', deliveryNotes: 109, grnNotes: 93, lineItems: 814, totalQty: 5_560, grnQty: 4948, grnValue: 475_000_000, totalValue: 500_000_000,
      prevValue: 410_000_000, change: 90_000_000, growth: 22.0 },
    // Quý 2/2025
    { id: 'q2-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 2 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 270, grnNotes: 232, lineItems: 2_030, totalQty: 13_900, grnQty: 12371, grnValue: 1_064_000_000, totalValue: 1_120_000_000,
      prevValue: 960_000_000, change: 160_000_000, growth: 16.7 },
    { id: 'm4-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 4 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 88, grnNotes: 75, lineItems: 662, totalQty: 4_530, grnQty: 4031, grnValue: 342_000_000, totalValue: 360_000_000,
      prevValue: 320_000_000, change: 40_000_000, growth: 12.5 },
    { id: 'm5-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 5 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 92, grnNotes: 79, lineItems: 694, totalQty: 4_740, grnQty: 4218, grnValue: 370_500_000, totalValue: 390_000_000,
      prevValue: 330_000_000, change: 60_000_000, growth: 18.2 },
    { id: 'm6-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 6 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q2-2025', deliveryNotes: 90, grnNotes: 77, lineItems: 674, totalQty: 4_630, grnQty: 4120, grnValue: 351_500_000, totalValue: 370_000_000,
      prevValue: 310_000_000, change: 60_000_000, growth: 19.4 },
    // Quý 3/2025
    { id: 'q3-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 3 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 255, grnNotes: 219, lineItems: 1_920, totalQty: 13_130, grnQty: 11685, grnValue: 912_000_000, totalValue: 960_000_000,
      prevValue: 840_000_000, change: 120_000_000, growth: 14.3 },
    { id: 'm7-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 7 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 84, grnNotes: 72, lineItems: 630, totalQty: 4_310, grnQty: 3835, grnValue: 294_500_000, totalValue: 310_000_000,
      prevValue: 270_000_000, change: 40_000_000, growth: 14.8 },
    { id: 'm8-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 8 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 86, grnNotes: 73, lineItems: 646, totalQty: 4_420, grnQty: 3933, grnValue: 313_500_000, totalValue: 330_000_000,
      prevValue: 280_000_000, change: 50_000_000, growth: 17.9 },
    { id: 'm9-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 9 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q3-2025', deliveryNotes: 85, grnNotes: 73, lineItems: 644, totalQty: 4_400, grnQty: 3916, grnValue: 304_000_000, totalValue: 320_000_000,
      prevValue: 290_000_000, change: 30_000_000, growth: 10.3 },
    // Quý 4/2025
    { id: 'q4-2025', level: LEVEL.QUARTER, periodLabel: 'Quý 4 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'y2025', deliveryNotes: 260, grnNotes: 223, lineItems: 1_980, totalQty: 13_470, grnQty: 11988, grnValue: 503_500_000, totalValue: 530_000_000,
      prevValue: 460_000_000, change: 70_000_000, growth: 15.2 },
    { id: 'm10-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 10 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 86, grnNotes: 73, lineItems: 646, totalQty: 4_410, grnQty: 3924, grnValue: 161_500_000, totalValue: 170_000_000,
      prevValue: 150_000_000, change: 20_000_000, growth: 13.3 },
    { id: 'm11-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 11 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 86, grnNotes: 73, lineItems: 660, totalQty: 4_510, grnQty: 4013, grnValue: 171_000_000, totalValue: 180_000_000,
      prevValue: 155_000_000, change: 25_000_000, growth: 16.1 },
    { id: 'm12-2025', level: LEVEL.MONTH, periodLabel: 'Tháng 12 / 2025', scope: 'Toàn công ty', unit: 'Công ty TNHH ABC',
      parentId: 'q4-2025', deliveryNotes: 88, grnNotes: 75, lineItems: 674, totalQty: 4_550, grnQty: 4049, grnValue: 171_000_000, totalValue: 180_000_000,
      prevValue: 155_000_000, change: 25_000_000, growth: 16.1 },
];

// ── Column definitions ─────────────────────────────────────────────────────
const ALL_COLUMNS = [
    { id: 'periodLabel', label: 'Kỳ báo cáo',       align: 'left',  width: 220, minWidth: 220 },
    { id: 'notes',       label: 'Số phiếu',          align: 'right', width: 110, minWidth: 110 },
    { id: 'qty',         label: 'Tổng SL',            align: 'right', width: 110, minWidth: 110 },
    { id: 'value',       label: 'Giá trị',            align: 'right', width: 160, minWidth: 160 },
    { id: 'prevValue',   label: 'Cùng kỳ năm trước', align: 'right', width: 140, minWidth: 140 },
    { id: 'change',      label: 'Chênh lệch',         align: 'right', width: 140, minWidth: 140 },
    { id: 'growth',      label: 'Tăng trưởng',        align: 'right', width: 100, minWidth: 100 },
];

const DEFAULT_VISIBLE = ['periodLabel', 'notes', 'qty', 'value', 'prevValue', 'change', 'growth'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format VND */
const formatVND = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
};

/** Format số nguyên có dấu + / - */
const formatSignedCurrency = (n) => {
    if (n == null) return '—';
    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
};

/** Format phần trăm có dấu + / - */
const formatSignedPercent = (n) => {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

/** Format số nguyên */
const formatNumber = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN').format(n);
};

/** Tính Tăng/Giảm */
const calcChange = (curr, prev) => {
    if (curr == null || prev == null) return null;
    return curr - prev;
};

/** Tính Tăng trưởng */
const calcGrowth = (change, prev) => {
    if (change == null || prev == null || prev === 0) return null;
    return (change / prev) * 100;
};

/** Màu Tăng/Giảm */
const changeColor = (v) => v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#6b7280';

/** Tìm row kỳ trước */
const getPreviousPeriodRow = (row, rawData) => {
    if (!row || !rawData?.length) return null;
    if (row.level === LEVEL.YEAR) {
        const yearNum = parseInt(row.periodLabel);
        return rawData.find(r => r.level === LEVEL.YEAR && r.periodLabel === String(yearNum - 1));
    }
    if (row.level === LEVEL.QUARTER) {
        const qNum = parseInt(row.periodLabel.match(/Quý (\d+)/)?.[1] || '0');
        const yrNum = parseInt(row.periodLabel.match(/(\d{4})$/)?.[1] || '0');
        return rawData.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${qNum} / ${yrNum - 1}`);
    }
    if (row.level === LEVEL.MONTH) {
        const mNum = parseInt(row.periodLabel.match(/Tháng (\d+)/)?.[1] || '0');
        const yrNum = parseInt(row.periodLabel.match(/(\d{4})$/)?.[1] || '0');
        return rawData.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${mNum} / ${yrNum - 1}`);
    }
    return null;
};

/** Comparison object */
const getComputedComparison = (row, rawData) => {
    const prevRow = getPreviousPeriodRow(row, rawData);
    if (!prevRow) return { compPrev: null, compChange: null, compGrowth: null };
    const currVal = row.grnValue ?? row.totalValue ?? 0;
    const prevVal = prevRow.grnValue ?? prevRow.totalValue ?? 0;
    const currHasGrn = row.grnValue != null;
    const prevHasGrn = prevRow.grnValue != null;
    if (!currHasGrn || !prevHasGrn) {
        return { compPrev: prevVal, compChange: null, compGrowth: null };
    }
    const compChange = calcChange(currVal, prevVal);
    const compGrowth = calcGrowth(compChange, prevVal);
    return { compPrev: prevVal, compChange, compGrowth };
};

/** Chart level label */
const CHART_LEVEL_LABELS = {
    [LEVEL.YEAR]: 'Năm',
    [LEVEL.QUARTER]: 'Quý',
    [LEVEL.MONTH]: 'Tháng',
};

// ── Font style theo cấp ───────────────────────────────────────────────────
const LEVEL_FONT = {
    YEAR:    { fontSize: '14px', fontWeight: 700, color: '#111827' },
    QUARTER: { fontSize: '13px', fontWeight: 500, color: '#374151' },
    MONTH:   { fontSize: '12px', fontWeight: 400, color: '#6b7280' },
};

const ROW_INDENT = { YEAR: 0, QUARTER: 24, MONTH: 48 };

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

// ── Chart components ───────────────────────────────────────────────────────

/** Custom tooltip cho chart chính (Giá trị + Tăng trưởng) */
const MainChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{
            bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', p: 1.5, minWidth: 180,
        }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', mb: 1 }}>
                {label}
            </Typography>
            {payload.map((entry, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                        {entry.name}
                    </Typography>
                    <Typography sx={{
                        fontSize: '12px', fontWeight: 600,
                        color: entry.color === '#3b82f6' ? '#111827' : (entry.value >= 0 ? '#16a34a' : '#dc2626'),
                    }}>
                        {entry.name === 'Tăng trưởng'
                            ? formatSignedPercent(entry.value)
                            : formatVND(entry.value)
                        }
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

/** Custom tooltip cho chart phụ (notes / qty) */
const SubChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{
            bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', p: 1.5, minWidth: 150,
        }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', mb: 1 }}>
                {label}
            </Typography>
            {payload.map((entry, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>{entry.name}</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                        {formatNumber(entry.value)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function Viewsalesreportlist() {
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    // ── State ──────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [dataMode, setDataMode] = useState('outbound');
    const [quickFilter, setQuickFilter] = useState('all');

    // Chart state
    const [chartLevel, setChartLevel] = useState(LEVEL.QUARTER);
    const [chartYear, setChartYear] = useState('2026');

    // Lấy danh sách năm có trong dữ liệu
    const availableYears = useMemo(() => {
        const years = [...new Set(MOCK_DATA.filter(r => r.level === LEVEL.YEAR).map(r => r.periodLabel))];
        return years.sort((a, b) => b - a);
    }, []);

    // Column management
    const [columnOrder, setColumnOrder] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem(LS_COL_ORDER)); return Array.isArray(s) && s.length ? s : ALL_COLUMNS.map(c => c.id); }
        catch { return ALL_COLUMNS.map(c => c.id); }
    });
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem(LS_VISIBLE)); return new Set(Array.isArray(s) && s.length ? s : DEFAULT_VISIBLE); }
        catch { return new Set(DEFAULT_VISIBLE); }
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    // Expand / collapse
    const [expandedIds, setExpandedIds] = useState(() => {
        try {
            const s = JSON.parse(localStorage.getItem(LS_EXPANDED));
            return new Set(Array.isArray(s) ? s : ['y2026','q1-2026','q2-2026','q3-2026','q4-2026','y2025','q1-2025','q2-2025','q3-2025','q4-2025']);
        } catch { return new Set(['y2026','q1-2026','q2-2026','q3-2026','q4-2026','y2025','q1-2025','q2-2025','q3-2025','q4-2025']); }
    });

    // ── Derived data ──────────────────────────────────────────────────────────
    const visibleColumns = useMemo(() =>
        columnOrder.map(id => ALL_COLUMNS.find(c => c.id === id)).filter(c => c && visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]
    );

    const filteredData = useMemo(() => {
        let data = searchTerm.trim()
            ? MOCK_DATA.filter(row => row.periodLabel.toLowerCase().includes(searchTerm.toLowerCase()))
            : MOCK_DATA;
        if (quickFilter !== 'all') {
            data = data.filter(r => {
                if (quickFilter === 'positive') return r.change > 0;
                if (quickFilter === 'negative') return r.change <= 0;
                return true;
            });
        }
        return data;
    }, [searchTerm, quickFilter]);

    // ── Chart data ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const yearRow = MOCK_DATA.find(r => r.level === LEVEL.YEAR && r.periodLabel === chartYear);
        const parentId = yearRow?.id;
        let rows = MOCK_DATA;
        if (chartLevel === LEVEL.QUARTER) {
            rows = MOCK_DATA.filter(r => r.level === LEVEL.QUARTER && r.parentId === parentId);
        } else if (chartLevel === LEVEL.MONTH) {
            // Lấy các quarter thuộc năm đang chọn
            const quartersOfYear = MOCK_DATA.filter(r => r.level === LEVEL.QUARTER && r.parentId === parentId);
            const quarterIds = new Set(quartersOfYear.map(q => q.id));
            rows = MOCK_DATA.filter(r => r.level === LEVEL.MONTH && quarterIds.has(r.parentId));
        } else {
            rows = MOCK_DATA.filter(r => r.level === LEVEL.YEAR);
        }
        return rows.map(row => {
            const { compGrowth } = getComputedComparison(row, MOCK_DATA);
            let shortLabel = row.periodLabel;
            if (chartLevel === LEVEL.QUARTER) shortLabel = row.periodLabel.replace('Quý ', 'Q').replace(' / ', '/');
            if (chartLevel === LEVEL.MONTH) shortLabel = row.periodLabel.replace('Tháng ', '').replace(' / ', '/');
            return {
                label: row.periodLabel,
                shortLabel,
                value: row.totalValue,
                growth: compGrowth ?? 0,
                notesOutbound: row.deliveryNotes,
                notesInbound:  row.grnNotes   || 0,
                qtyOutbound:   row.totalQty,
                qtyInbound:    row.grnQty     || 0,
            };
        });
    }, [chartLevel, chartYear]);

    // ── Tree rows ─────────────────────────────────────────────────────────────
    const treeRows = useMemo(() => {
        const result = [];
        const idSet = new Set(filteredData.map(r => r.id));
        filteredData.forEach(row => {
            const { compPrev, compChange, compGrowth } = getComputedComparison(row, MOCK_DATA);
            if (row.level === LEVEL.YEAR) {
                result.push({ ...row, depth: 0, hasChildren: filteredData.some(r => r.parentId === row.id && idSet.has(r.id)), compPrev, compChange, compGrowth });
            } else if (row.level === LEVEL.QUARTER) {
                const parent = filteredData.find(r => r.id === row.parentId);
                if (parent && expandedIds.has(parent.id)) {
                    result.push({ ...row, depth: 1, hasChildren: filteredData.some(r => r.parentId === row.id && idSet.has(r.id)), compPrev, compChange, compGrowth });
                }
            } else if (row.level === LEVEL.MONTH) {
                const quarter = filteredData.find(r => r.id === row.parentId);
                const year = quarter ? filteredData.find(r => r.id === quarter.parentId) : null;
                if (quarter && year && expandedIds.has(quarter.id) && expandedIds.has(year.id)) {
                    result.push({ ...row, depth: 2, hasChildren: false, compPrev, compChange, compGrowth });
                }
            }
        });
        return result;
    }, [filteredData, expandedIds]);

    // ── Summary totals ────────────────────────────────────────────────────────
    const summaryTotals = useMemo(() => {
        const years = filteredData.filter(r => r.level === LEVEL.YEAR);
        return {
            totalSales: years.reduce((s, r) => s + r.totalValue, 0),
            totalNotes: years.reduce((s, r) => s + r.deliveryNotes, 0),
            totalQty:   years.reduce((s, r) => s + r.totalQty, 0),
            totalGrnNotes: years.reduce((s, r) => s + (r.grnNotes || 0), 0),
            totalGrnQty:   years.reduce((s, r) => s + (r.grnQty   || 0), 0),
        };
    }, [filteredData]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const toggleExpand = useCallback((id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            localStorage.setItem(LS_EXPANDED, JSON.stringify([...next]));
            return next;
        });
    }, []);

    const handlePopupDragStart = (e, colId) => {
        setDraggedPopupColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        const src = e.dataTransfer.getData('text/plain') || draggedPopupColumn;
        if (!src || src === targetId) { setDraggedPopupColumn(null); return; }
        const arr = [...tempColumnOrder];
        const fi = arr.indexOf(src), ti = arr.indexOf(targetId);
        if (fi === -1 || ti === -1) { setDraggedPopupColumn(null); return; }
        arr.splice(fi, 1);
        arr.splice(ti, 0, src);
        setTempColumnOrder(arr);
        setDraggedPopupColumn(null);
    };
    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        localStorage.setItem(LS_VISIBLE, JSON.stringify([...visibleColumnIds]));
        setColumnSelectorAnchor(null);
    };

    const chartBarColor = dataMode === 'inbound' ? '#059669' : '#2563eb';

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
                    Theo dõi số liệu xuất/nhập hàng thực tế
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Theo dõi số liệu xuất/nhập hàng thực tế theo Năm, Quý, Tháng
                </Typography>

                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={FileBarChart} label="Tổng doanh số" value={formatVND(summaryTotals.totalSales)} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={FileBarChart} label="Tổng phiếu xuất" value={formatNumber(summaryTotals.totalNotes)} color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
                    <SummaryCard icon={FileBarChart} label="Tổng số lượng xuất" value={formatNumber(summaryTotals.totalQty)} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={FileBarChart} label="Tổng phiếu nhập" value={formatNumber(summaryTotals.totalGrnNotes)} color="#7c3aed" bgColor="rgba(124,58,237,0.1)" />
                    <SummaryCard icon={FileBarChart} label="Tổng số lượng nhập" value={formatNumber(summaryTotals.totalGrnQty)} color="#0891b2" bgColor="rgba(8,145,178,0.1)" />
                </Box>
            </Box>

            {/* ══════════════════════════════════════════════════════
                CHART SECTION — nằm giữa Summary Cards và Main Content
            ══════════════════════════════════════════════════════ */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, pb: 2 }}>
                <Box sx={{
                    bgcolor: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: '12px', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    {/* Chart section header */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                            Biểu đồ
                        </Typography>
                        {/* Chart level toggle */}
                        <Box sx={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', ml: 1 }}>
                            {[LEVEL.YEAR, LEVEL.QUARTER, LEVEL.MONTH].map(lvl => (
                                <Box key={lvl}
                                    onClick={() => setChartLevel(lvl)}
                                    sx={{
                                        px: 1.5, py: 0.5, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                        bgcolor: chartLevel === lvl ? '#0284c7' : '#fff',
                                        color: chartLevel === lvl ? '#fff' : '#6b7280',
                                        '&:hover': { bgcolor: chartLevel === lvl ? '#0284c7' : '#f3f4f6' },
                                    }}
                                >
                                    {CHART_LEVEL_LABELS[lvl]}
                                </Box>
                            ))}
                        </Box>
                        {/* Year dropdown */}
                        <Box sx={{ ml: 1 }}>
                            <select
                                value={chartYear}
                                onChange={(e) => setChartYear(e.target.value)}
                                style={{
                                    padding: '5px 28px 5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: '#fff',
                                    color: '#374151',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    paddingRight: '28px',
                                }}
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </Box>
                    </Box>

                    {/* ── Chart Row 1: Giá trị & Tăng trưởng ── */}
                    <Box sx={{ borderBottom: '1px solid #f3f4f6', pb: 0.5 }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                Giá trị &amp; Tăng trưởng
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#9ca3af', mt: 0.25 }}>
                                Theo {CHART_LEVEL_LABELS[chartLevel].toLowerCase()}
                            </Typography>
                        </Box>
                        {chartData.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
                                <CloudOff size={28} style={{ opacity: 0.3 }} />
                                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Không có dữ liệu</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ px: 1, pt: 1.5, pb: 1, height: 256, overflow: 'hidden' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 6, right: 56, left: 0, bottom: 28 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                        <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} interval="preserveStartEnd" />
                                        <YAxis yAxisId="bar" orientation="left" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(0)}B`} width={40} />
                                        <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={44} />
                                        <RechartsTooltip content={<MainChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280', paddingTop: '2px' }} />
                                        <Bar yAxisId="bar" dataKey="value" name="Giá trị" fill={chartBarColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Line yAxisId="line" type="monotone" dataKey="growth" name="Tăng trưởng" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Box>

                    {/* ── Chart Row 2: Số phiếu & Tổng SL (2 cột) ── */}
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                        {/* Số phiếu xuất / nhập */}
                        <Box sx={{ flex: 1, minWidth: 0, borderRight: isMobile ? 0 : '1px solid #f3f4f6' }}>
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                    Số phiếu xuất &amp; nhập
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#9ca3af', mt: 0.25 }}>
                                    Theo {CHART_LEVEL_LABELS[chartLevel].toLowerCase()}
                                </Typography>
                            </Box>
                            {chartData.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
                                    <CloudOff size={28} style={{ opacity: 0.3 }} />
                                    <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Không có dữ liệu</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ px: 1, pt: 1.5, pb: 1, height: 216, overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 6, right: 16, left: 0, bottom: 28 }} barCategoryGap="20%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                            <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
                                            <RechartsTooltip content={<SubChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                                            <Bar dataKey="notesOutbound" name="Phiếu xuất" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="notesInbound" name="Phiếu nhập" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Box>

                        {/* Tổng SL xuất / nhập */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                    Tổng SL xuất &amp; nhập
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#9ca3af', mt: 0.25 }}>
                                    Theo {CHART_LEVEL_LABELS[chartLevel].toLowerCase()}
                                </Typography>
                            </Box>
                            {chartData.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
                                    <CloudOff size={28} style={{ opacity: 0.3 }} />
                                    <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>Không có dữ liệu</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ px: 1, pt: 1.5, pb: 1, height: 216, overflow: 'hidden' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 6, right: 16, left: 0, bottom: 28 }} barCategoryGap="20%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                            <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
                                            <RechartsTooltip content={<SubChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                                            <Bar dataKey="qtyOutbound" name="SL xuất" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="qtyInbound" name="SL nhập" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </Box>
                    </Box>
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
                                        '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#0284c7', boxShadow: '0 0 0 3px rgba(2,132,199,0.10)' },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />

                            {/* Toggle Nhập / Xuất */}
                            <Box sx={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', bgcolor: '#fff' }}>
                                <Box onClick={() => { setDataMode('outbound'); }} sx={{ px: 1.5, py: 0.75, fontSize: '12px', fontWeight: 500, cursor: 'pointer', bgcolor: dataMode === 'outbound' ? '#2563eb' : '#fff', color: dataMode === 'outbound' ? '#fff' : '#6b7280', '&:hover': { bgcolor: dataMode === 'outbound' ? '#2563eb' : '#f9fafb' } }}>Xuất</Box>
                                <Box onClick={() => { setDataMode('inbound'); }} sx={{ px: 1.5, py: 0.75, fontSize: '12px', fontWeight: 500, cursor: 'pointer', bgcolor: dataMode === 'inbound' ? '#059669' : '#fff', color: dataMode === 'inbound' ? '#fff' : '#6b7280', borderLeft: '1px solid #e5e7eb', '&:hover': { bgcolor: dataMode === 'inbound' ? '#059669' : '#f9fafb' } }}>Nhập</Box>
                            </Box>

                            {/* Quick filter */}
                            <Box sx={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', bgcolor: '#fff' }}>
                                <Box onClick={() => setQuickFilter('all')} sx={{ px: 1.5, py: 0.75, fontSize: '12px', fontWeight: 500, cursor: 'pointer', bgcolor: quickFilter === 'all' ? '#6b7280' : '#fff', color: quickFilter === 'all' ? '#fff' : '#6b7280', '&:hover': { bgcolor: quickFilter === 'all' ? '#6b7280' : '#f9fafb' } }}>Tất cả</Box>
                                <Box onClick={() => setQuickFilter('positive')} sx={{ px: 1.5, py: 0.75, fontSize: '12px', fontWeight: 500, cursor: 'pointer', bgcolor: quickFilter === 'positive' ? '#16a34a' : '#fff', color: quickFilter === 'positive' ? '#fff' : '#6b7280', borderLeft: '1px solid #e5e7eb', '&:hover': { bgcolor: quickFilter === 'positive' ? '#16a34a' : '#f9fafb' } }}>+Tăng</Box>
                                <Box onClick={() => setQuickFilter('negative')} sx={{ px: 1.5, py: 0.75, fontSize: '12px', fontWeight: 500, cursor: 'pointer', bgcolor: quickFilter === 'negative' ? '#dc2626' : '#fff', color: quickFilter === 'negative' ? '#fff' : '#6b7280', borderLeft: '1px solid #e5e7eb', '&:hover': { bgcolor: quickFilter === 'negative' ? '#dc2626' : '#f9fafb' } }}>-Giảm</Box>
                            </Box>

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary"
                                    onClick={(e) => { setTempColumnOrder(columnOrder); setColumnSelectorAnchor(e.currentTarget); }}
                                    aria-label="Chọn cột"
                                    sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>

                            <Box sx={{ flex: 1 }} />

                            <Button variant="outlined" startIcon={<Download size={16} />} sx={{
                                fontSize: '13px', fontWeight: 500, textTransform: 'none', borderRadius: '10px',
                                height: 38, px: 2.5, borderColor: '#e5e7eb', color: '#374151',
                                '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                            }}>
                                Xuất báo cáo
                            </Button>
                        </Box>
                    </Box>

                    {/* ── Column Selector Popover ── */}
                    <Popover
                        open={Boolean(columnSelectorAnchor)}
                        anchorEl={columnSelectorAnchor}
                        onClose={() => setColumnSelectorAnchor(null)}
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
                                Chọn cột &amp; Sắp xếp
                            </Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                                {ALL_COLUMNS.slice().sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box key={col.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent', opacity: draggedPopupColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', borderRadius: '8px', px: 0.75, py: 0.25, '&:hover': { bgcolor: '#f9fafb' } }}
                                        onDragOver={handlePopupDragOver}
                                        onDrop={(e) => handlePopupDrop(e, col.id)}
                                    >
                                        <Box draggable onDragStart={(e) => handlePopupDragStart(e, col.id)} onDragEnd={() => setDraggedPopupColumn(null)} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                            <GripVertical size={14} />
                                        </Box>
                                        <FormControlLabel
                                            control={
                                                <Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => {
                                                    setVisibleColumnIds(prev => { const next = new Set(prev); e.target.checked ? next.add(col.id) : next.delete(col.id); return next; });
                                                }} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' } }} />
                                            }
                                            label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Button variant="outlined" onClick={() => setColumnSelectorAnchor(null)} sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>
                                Hủy
                            </Button>
                            <Button variant="contained" onClick={handleSaveColumnOrder} sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#0284c7', boxShadow: 'none', '&:hover': { bgcolor: '#0369a1' } }}>
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* ── Table ── */}
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                                    {treeRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={visibleColumns.length} sx={{ py: 6, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                                    <CloudOff size={36} style={{ opacity: 0.35 }} />
                                                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                                                        Không có dữ liệu báo cáo
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        treeRows.map((row) => {
                                            const isExpanded = expandedIds.has(row.id);
                                            return (
                                                <TableRow key={row.id} hover sx={{
                                                    height: 52,
                                                    bgcolor: row.level === LEVEL.YEAR ? '#fff' : row.level === LEVEL.QUARTER ? '#fafbfc' : '#fcfcfd',
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                    '&:last-child td': { borderBottom: 0 },
                                                }}>
                                                    {visibleColumns.map((col) => {
                                                        const lf = LEVEL_FONT[row.level] || LEVEL_FONT.MONTH;

                                                        if (col.id === 'periodLabel') {
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6' }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: `${ROW_INDENT[row.level] || 0}px` }}>
                                                                            {row.hasChildren ? (
                                                                                <IconButton size="small" onClick={() => toggleExpand(row.id)} sx={{ p: 0.25, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                                </IconButton>
                                                                            ) : <Box sx={{ width: 20, flexShrink: 0 }} />}
                                                                            <Typography sx={{ ...lf }}>{row.periodLabel}</Typography>
                                                                        </Box>
                                                                        <Tooltip title="Xem chi tiết">
                                                                            <IconButton size="small" onClick={() => {
                                                                                if (row.level === LEVEL.YEAR) navigate(`/reports/sales/detail/year/${row.periodLabel}?from=list`);
                                                                                else if (row.level === LEVEL.QUARTER) {
                                                                                    const parts = row.periodLabel.match(/Quý (\d+) \/ (\d{4})/);
                                                                                    navigate(`/reports/sales/detail/quarter/${parts[1]}/${parts[2]}?from=list`);
                                                                                } else if (row.level === LEVEL.MONTH) {
                                                                                    const parts = row.periodLabel.match(/Tháng (\d+) \/ (\d{4})/);
                                                                                    navigate(`/reports/sales/detail/month/${parts[1]}/${parts[2]}?from=list`);
                                                                                }
                                                                            }} sx={{ p: 0.5, color: '#9ca3af', '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)' } }}>
                                                                                <Eye size={15} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.align === 'right') {
                                                            let val = '';
                                                            let color = lf.color;
                                                            let weight = lf.fontWeight;
                                                            let fontSize = lf.fontSize;

                                                            if (col.id === 'notes') {
                                                                val = formatNumber(dataMode === 'inbound' ? (row.grnNotes || 0) : row.deliveryNotes);
                                                                color = dataMode === 'inbound' ? '#7c3aed' : '#2563eb';
                                                            } else if (col.id === 'qty') {
                                                                val = formatNumber(dataMode === 'inbound' ? (row.grnQty || 0) : row.totalQty);
                                                                color = dataMode === 'inbound' ? '#0891b2' : '#059669';
                                                            } else if (col.id === 'value') {
                                                                const vf = VALUE_FONT[row.level] || VALUE_FONT.MONTH;
                                                                fontSize = vf.fontSize; weight = vf.fontWeight; color = vf.color;
                                                                val = formatVND(dataMode === 'inbound' ? (row.grnValue || 0) : row.totalValue);
                                                            } else if (col.id === 'prevValue') {
                                                                val = row.compPrev != null ? formatVND(row.compPrev) : '—';
                                                                color = '#9ca3af';
                                                            } else if (col.id === 'change') {
                                                                val = row.compChange != null ? formatSignedCurrency(row.compChange) : '—';
                                                                if (row.compChange != null) color = changeColor(row.compChange);
                                                            } else if (col.id === 'growth') {
                                                                val = row.compGrowth != null ? formatSignedPercent(row.compGrowth) : '—';
                                                                if (row.compGrowth != null) color = changeColor(row.compGrowth);
                                                            }

                                                            return (
                                                                <TableCell key={col.id} align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontSize, fontWeight: weight, color, fontVariantNumeric: 'tabular-nums' }}>
                                                                    {val}
                                                                </TableCell>
                                                            );
                                                        }

                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', ...lf }}>
                                                                {String(row[col.id] ?? '—')}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
