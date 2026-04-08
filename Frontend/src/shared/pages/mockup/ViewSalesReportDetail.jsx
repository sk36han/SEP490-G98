/**
 * ViewSalesReportDetail – Chi tiết báo cáo doanh số theo kỳ
 * Nhận params từ URL: /reports/sales/detail/{year|quarter|month}/{...params}
 * Style đồng bộ với các trang detail khác trong hệ thống.
 */
import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
} from '@mui/material';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Minus,
    Package,
    Truck,
} from 'lucide-react';

// ── Mock data (trùng với Viewsalesreportlist) ──────────────────────────────
const MOCK_DATA = [
    { id: 'y2026', level: 'YEAR', periodLabel: '2026',   parentId: null,
      deliveryNotes: 245, totalQty: 12_580, totalValue: 4_850_000_000 },
    { id: 'q1-2026', level: 'QUARTER', periodLabel: 'Quý 1 / 2026', parentId: 'y2026',
      deliveryNotes: 82, totalQty: 4_180, totalValue: 1_620_000_000 },
    { id: 'm1-2026', level: 'MONTH', periodLabel: 'Tháng 1 / 2026', parentId: 'q1-2026',
      deliveryNotes: 28, totalQty: 1_420, totalValue: 550_000_000 },
    { id: 'm2-2026', level: 'MONTH', periodLabel: 'Tháng 2 / 2026', parentId: 'q1-2026',
      deliveryNotes: 22, totalQty: 1_130, totalValue: 440_000_000 },
    { id: 'm3-2026', level: 'MONTH', periodLabel: 'Tháng 3 / 2026', parentId: 'q1-2026',
      deliveryNotes: 32, totalQty: 1_630, totalValue: 630_000_000 },
    { id: 'q2-2026', level: 'QUARTER', periodLabel: 'Quý 2 / 2026', parentId: 'y2026',
      deliveryNotes: 68, totalQty: 3_420, totalValue: 1_320_000_000 },
    { id: 'm4-2026', level: 'MONTH', periodLabel: 'Tháng 4 / 2026', parentId: 'q2-2026',
      deliveryNotes: 22, totalQty: 1_100, totalValue: 430_000_000 },
    { id: 'm5-2026', level: 'MONTH', periodLabel: 'Tháng 5 / 2026', parentId: 'q2-2026',
      deliveryNotes: 24, totalQty: 1_220, totalValue: 470_000_000 },
    { id: 'm6-2026', level: 'MONTH', periodLabel: 'Tháng 6 / 2026', parentId: 'q2-2026',
      deliveryNotes: 22, totalQty: 1_100, totalValue: 420_000_000 },
    { id: 'q3-2026', level: 'QUARTER', periodLabel: 'Quý 3 / 2026', parentId: 'y2026',
      deliveryNotes: 55, totalQty: 2_840, totalValue: 1_090_000_000 },
    { id: 'm7-2026', level: 'MONTH', periodLabel: 'Tháng 7 / 2026', parentId: 'q3-2026',
      deliveryNotes: 18, totalQty: 920, totalValue: 355_000_000 },
    { id: 'm8-2026', level: 'MONTH', periodLabel: 'Tháng 8 / 2026', parentId: 'q3-2026',
      deliveryNotes: 19, totalQty: 960, totalValue: 370_000_000 },
    { id: 'm9-2026', level: 'MONTH', periodLabel: 'Tháng 9 / 2026', parentId: 'q3-2026',
      deliveryNotes: 18, totalQty: 960, totalValue: 365_000_000 },
    { id: 'q4-2026', level: 'QUARTER', periodLabel: 'Quý 4 / 2026', parentId: 'y2026',
      deliveryNotes: 40, totalQty: 2_140, totalValue: 820_000_000 },
    { id: 'm10-2026', level: 'MONTH', periodLabel: 'Tháng 10 / 2026', parentId: 'q4-2026',
      deliveryNotes: 14, totalQty: 700, totalValue: 270_000_000 },
    { id: 'm11-2026', level: 'MONTH', periodLabel: 'Tháng 11 / 2026', parentId: 'q4-2026',
      deliveryNotes: 13, totalQty: 720, totalValue: 280_000_000 },
    { id: 'm12-2026', level: 'MONTH', periodLabel: 'Tháng 12 / 2026', parentId: 'q4-2026',
      deliveryNotes: 13, totalQty: 720, totalValue: 270_000_000 },
    { id: 'y2025', level: 'YEAR', periodLabel: '2025', parentId: null,
      deliveryNotes: 1_080, totalQty: 55_600, totalValue: 3_920_000_000 },
    { id: 'q1-2025', level: 'QUARTER', periodLabel: 'Quý 1 / 2025', parentId: 'y2025',
      deliveryNotes: 295, totalQty: 15_100, totalValue: 1_310_000_000 },
    { id: 'm1-2025', level: 'MONTH', periodLabel: 'Tháng 1 / 2025', parentId: 'q1-2025',
      deliveryNotes: 98, totalQty: 5_030, totalValue: 430_000_000 },
    { id: 'm2-2025', level: 'MONTH', periodLabel: 'Tháng 2 / 2025', parentId: 'q1-2025',
      deliveryNotes: 88, totalQty: 4_510, totalValue: 380_000_000 },
    { id: 'm3-2025', level: 'MONTH', periodLabel: 'Tháng 3 / 2025', parentId: 'q1-2025',
      deliveryNotes: 109, totalQty: 5_560, totalValue: 500_000_000 },
    { id: 'q2-2025', level: 'QUARTER', periodLabel: 'Quý 2 / 2025', parentId: 'y2025',
      deliveryNotes: 270, totalQty: 13_900, totalValue: 1_120_000_000 },
    { id: 'm4-2025', level: 'MONTH', periodLabel: 'Tháng 4 / 2025', parentId: 'q2-2025',
      deliveryNotes: 88, totalQty: 4_530, totalValue: 360_000_000 },
    { id: 'm5-2025', level: 'MONTH', periodLabel: 'Tháng 5 / 2025', parentId: 'q2-2025',
      deliveryNotes: 92, totalQty: 4_740, totalValue: 390_000_000 },
    { id: 'm6-2025', level: 'MONTH', periodLabel: 'Tháng 6 / 2025', parentId: 'q2-2025',
      deliveryNotes: 90, totalQty: 4_630, totalValue: 370_000_000 },
    { id: 'q3-2025', level: 'QUARTER', periodLabel: 'Quý 3 / 2025', parentId: 'y2025',
      deliveryNotes: 255, totalQty: 13_130, totalValue: 960_000_000 },
    { id: 'm7-2025', level: 'MONTH', periodLabel: 'Tháng 7 / 2025', parentId: 'q3-2025',
      deliveryNotes: 84, totalQty: 4_310, totalValue: 310_000_000 },
    { id: 'm8-2025', level: 'MONTH', periodLabel: 'Tháng 8 / 2025', parentId: 'q3-2025',
      deliveryNotes: 86, totalQty: 4_420, totalValue: 330_000_000 },
    { id: 'm9-2025', level: 'MONTH', periodLabel: 'Tháng 9 / 2025', parentId: 'q3-2025',
      deliveryNotes: 85, totalQty: 4_400, totalValue: 320_000_000 },
    { id: 'q4-2025', level: 'QUARTER', periodLabel: 'Quý 4 / 2025', parentId: 'y2025',
      deliveryNotes: 260, totalQty: 13_470, totalValue: 530_000_000 },
    { id: 'm10-2025', level: 'MONTH', periodLabel: 'Tháng 10 / 2025', parentId: 'q4-2025',
      deliveryNotes: 86, totalQty: 4_410, totalValue: 170_000_000 },
    { id: 'm11-2025', level: 'MONTH', periodLabel: 'Tháng 11 / 2025', parentId: 'q4-2025',
      deliveryNotes: 86, totalQty: 4_510, totalValue: 180_000_000 },
    { id: 'm12-2025', level: 'MONTH', periodLabel: 'Tháng 12 / 2025', parentId: 'q4-2025',
      deliveryNotes: 88, totalQty: 4_550, totalValue: 180_000_000 },
];

// ── Mock detail data theo từng loại kỳ ────────────────────────────────────

/** Mock: chi tiết theo quý (dùng cho detail NĂM) */
const MOCK_QUARTER_BREAKDOWN = {
    '2026': [
        { label: 'Quý 1 / 2026', deliveryNotes: 82, totalQty: 4_180, totalValue: 1_620_000_000 },
        { label: 'Quý 2 / 2026', deliveryNotes: 68, totalQty: 3_420, totalValue: 1_320_000_000 },
        { label: 'Quý 3 / 2026', deliveryNotes: 55, totalQty: 2_840, totalValue: 1_090_000_000 },
        { label: 'Quý 4 / 2026', deliveryNotes: 40, totalQty: 2_140, totalValue: 820_000_000 },
    ],
    '2025': [
        { label: 'Quý 1 / 2025', deliveryNotes: 295, totalQty: 15_100, totalValue: 1_310_000_000 },
        { label: 'Quý 2 / 2025', deliveryNotes: 270, totalQty: 13_900, totalValue: 1_120_000_000 },
        { label: 'Quý 3 / 2025', deliveryNotes: 255, totalQty: 13_130, totalValue: 960_000_000 },
        { label: 'Quý 4 / 2025', deliveryNotes: 260, totalQty: 13_470, totalValue: 530_000_000 },
    ],
};

/** Mock: chi tiết theo tháng (dùng cho detail NĂM và QUÝ) */
const MOCK_MONTH_BREAKDOWN = {
    '2026': [
        { label: 'Tháng 1', deliveryNotes: 28, totalQty: 1_420, totalValue: 550_000_000 },
        { label: 'Tháng 2', deliveryNotes: 22, totalQty: 1_130, totalValue: 440_000_000 },
        { label: 'Tháng 3', deliveryNotes: 32, totalQty: 1_630, totalValue: 630_000_000 },
        { label: 'Tháng 4', deliveryNotes: 22, totalQty: 1_100, totalValue: 430_000_000 },
        { label: 'Tháng 5', deliveryNotes: 24, totalQty: 1_220, totalValue: 470_000_000 },
        { label: 'Tháng 6', deliveryNotes: 22, totalQty: 1_100, totalValue: 420_000_000 },
        { label: 'Tháng 7', deliveryNotes: 18, totalQty: 920, totalValue: 355_000_000 },
        { label: 'Tháng 8', deliveryNotes: 19, totalQty: 960, totalValue: 370_000_000 },
        { label: 'Tháng 9', deliveryNotes: 18, totalQty: 960, totalValue: 365_000_000 },
        { label: 'Tháng 10', deliveryNotes: 14, totalQty: 700, totalValue: 270_000_000 },
        { label: 'Tháng 11', deliveryNotes: 13, totalQty: 720, totalValue: 280_000_000 },
        { label: 'Tháng 12', deliveryNotes: 13, totalQty: 720, totalValue: 270_000_000 },
    ],
    '2025': [
        { label: 'Tháng 1', deliveryNotes: 98, totalQty: 5_030, totalValue: 430_000_000 },
        { label: 'Tháng 2', deliveryNotes: 88, totalQty: 4_510, totalValue: 380_000_000 },
        { label: 'Tháng 3', deliveryNotes: 109, totalQty: 5_560, totalValue: 500_000_000 },
        { label: 'Tháng 4', deliveryNotes: 88, totalQty: 4_530, totalValue: 360_000_000 },
        { label: 'Tháng 5', deliveryNotes: 92, totalQty: 4_740, totalValue: 390_000_000 },
        { label: 'Tháng 6', deliveryNotes: 90, totalQty: 4_630, totalValue: 370_000_000 },
        { label: 'Tháng 7', deliveryNotes: 84, totalQty: 4_310, totalValue: 310_000_000 },
        { label: 'Tháng 8', deliveryNotes: 86, totalQty: 4_420, totalValue: 330_000_000 },
        { label: 'Tháng 9', deliveryNotes: 85, totalQty: 4_400, totalValue: 320_000_000 },
        { label: 'Tháng 10', deliveryNotes: 86, totalQty: 4_410, totalValue: 170_000_000 },
        { label: 'Tháng 11', deliveryNotes: 86, totalQty: 4_510, totalValue: 180_000_000 },
        { label: 'Tháng 12', deliveryNotes: 88, totalQty: 4_550, totalValue: 180_000_000 },
    ],
};

/** Mock: chi tiết theo tuần (dùng cho detail THÁNG) */
const MOCK_WEEK_BREAKDOWN = {
    '2026': {
        1: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 8, totalQty: 410, totalValue: 158_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 7, totalQty: 380, totalValue: 148_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 8, totalQty: 390, totalValue: 155_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 5, totalQty: 240, totalValue: 89_000_000 },
        ],
        2: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 6, totalQty: 310, totalValue: 120_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 6, totalQty: 320, totalValue: 125_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 5, totalQty: 280, totalValue: 108_000_000 },
            { label: 'Tuần 4', days: '22–28', deliveryNotes: 5, totalQty: 220, totalValue: 87_000_000 },
        ],
        3: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 9, totalQty: 460, totalValue: 178_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 9, totalQty: 470, totalValue: 185_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 8, totalQty: 440, totalValue: 162_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 6, totalQty: 260, totalValue: 105_000_000 },
        ],
        4: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 6, totalQty: 300, totalValue: 118_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 6, totalQty: 310, totalValue: 120_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 5, totalQty: 270, totalValue: 105_000_000 },
            { label: 'Tuần 4', days: '22–30', deliveryNotes: 5, totalQty: 220, totalValue: 87_000_000 },
        ],
        5: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 7, totalQty: 350, totalValue: 135_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 6, totalQty: 320, totalValue: 126_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 6, totalQty: 330, totalValue: 112_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 5, totalQty: 220, totalValue: 97_000_000 },
        ],
        6: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 6, totalQty: 300, totalValue: 115_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 6, totalQty: 290, totalValue: 110_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 5, totalQty: 270, totalValue: 102_000_000 },
            { label: 'Tuần 4', days: '22–30', deliveryNotes: 5, totalQty: 240, totalValue: 93_000_000 },
        ],
        7: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 5, totalQty: 250, totalValue: 97_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 5, totalQty: 240, totalValue: 92_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 4, totalQty: 220, totalValue: 85_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 4, totalQty: 210, totalValue: 81_000_000 },
        ],
        8: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 5, totalQty: 255, totalValue: 99_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 5, totalQty: 250, totalValue: 96_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 5, totalQty: 255, totalValue: 88_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 4, totalQty: 200, totalValue: 87_000_000 },
        ],
        9: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 5, totalQty: 260, totalValue: 100_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 5, totalQty: 255, totalValue: 98_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 4, totalQty: 240, totalValue: 88_000_000 },
            { label: 'Tuần 4', days: '22–30', deliveryNotes: 4, totalQty: 205, totalValue: 79_000_000 },
        ],
        10: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 4, totalQty: 195, totalValue: 75_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 4, totalQty: 190, totalValue: 73_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 3, totalQty: 165, totalValue: 65_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 3, totalQty: 150, totalValue: 57_000_000 },
        ],
        11: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 4, totalQty: 200, totalValue: 78_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 3, totalQty: 185, totalValue: 72_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 3, totalQty: 175, totalValue: 68_000_000 },
            { label: 'Tuần 4', days: '22–30', deliveryNotes: 3, totalQty: 160, totalValue: 62_000_000 },
        ],
        12: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 4, totalQty: 200, totalValue: 76_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 3, totalQty: 185, totalValue: 70_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 3, totalQty: 175, totalValue: 68_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 3, totalQty: 160, totalValue: 56_000_000 },
        ],
    },
    '2025': {
        1: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 28, totalQty: 1_420, totalValue: 122_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 26, totalQty: 1_320, totalValue: 115_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 24, totalQty: 1_250, totalValue: 105_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 20, totalQty: 1_040, totalValue: 88_000_000 },
        ],
        2: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 25, totalQty: 1_280, totalValue: 108_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 23, totalQty: 1_180, totalValue: 102_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 22, totalQty: 1_100, totalValue: 92_000_000 },
            { label: 'Tuần 4', days: '22–28', deliveryNotes: 18, totalQty: 950, totalValue: 78_000_000 },
        ],
        3: [
            { label: 'Tuần 1', days: '01–07', deliveryNotes: 30, totalQty: 1_520, totalValue: 136_000_000 },
            { label: 'Tuần 2', days: '08–14', deliveryNotes: 29, totalQty: 1_490, totalValue: 138_000_000 },
            { label: 'Tuần 3', days: '15–21', deliveryNotes: 27, totalQty: 1_380, totalValue: 122_000_000 },
            { label: 'Tuần 4', days: '22–31', deliveryNotes: 23, totalQty: 1_170, totalValue: 104_000_000 },
        ],
    },
};

/** Mock: top sản phẩm bán chạy */
const MOCK_TOP_PRODUCTS = [
    { code: 'VT-001', name: 'Bóng tái sinh Dunlop', unit: 'Cái', qty: 420, revenue: 1_260_000_000, growth: 18.5 },
    { code: 'VT-002', name: 'Lốp xe tải Michelin 11R22.5', unit: 'Cái', qty: 280, revenue: 980_000_000, growth: 12.3 },
    { code: 'VT-003', name: 'Dầu nhớt Castrol 15W-40', unit: 'Lon', qty: 1_050, revenue: 735_000_000, growth: 22.1 },
    { code: 'VT-004', name: 'Mỡ bôi trơn Shell', unit: 'Kg', qty: 640, revenue: 448_000_000, growth: -5.2 },
    { code: 'VT-005', name: 'Dây curoa 康默', unit: 'Cái', qty: 380, revenue: 380_000_000, growth: 8.7 },
];

/** Mock: top khách hàng */
const MOCK_TOP_CUSTOMERS = [
    { code: 'KH-001', name: 'Công ty TNHH Vận tải Thành Đạt', orders: 18, revenue: 980_000_000, growth: 25.4 },
    { code: 'KH-002', name: 'HTX Vận tải Sài Gòn', orders: 14, revenue: 720_000_000, growth: 11.2 },
    { code: 'KH-003', name: 'Doanh nghiệp Tân Phú', orders: 11, revenue: 540_000_000, growth: -3.8 },
    { code: 'KH-004', name: 'Công ty CP Dịch vụ Giao thông Bình Dương', orders: 9, revenue: 430_000_000, growth: 19.6 },
    { code: 'KH-005', name: 'Trạm sửa chữa xe Hiền Phát', orders: 7, revenue: 320_000_000, growth: 5.1 },
];

const LEVEL = { YEAR: 'YEAR', QUARTER: 'QUARTER', MONTH: 'MONTH' };

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format VND thường */
const formatVND = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(n);
};

/** Format VND có dấu ± */
const formatSignedCurrency = (n) => {
    if (n == null) return '—';
    const formatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
};

/** Format phần trăm ±2 số lẻ */
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

/** Màu: dương=xanh, âm=đỏ, 0=xám */
const changeColor = (v) =>
    v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#6b7280';

/** Tìm row kỳ trước */
const getPreviousPeriodRow = (row) => {
    if (!row) return null;
    if (row.level === LEVEL.YEAR) {
        const yearNum = parseInt(row.periodLabel);
        return MOCK_DATA.find(r => r.level === LEVEL.YEAR && r.periodLabel === String(yearNum - 1));
    }
    if (row.level === LEVEL.QUARTER) {
        const q = parseInt(row.periodLabel.match(/Quý (\d)/)?.[1] || '0');
        const y = parseInt(row.periodLabel.match(/(\d{4})$/)?.[1] || '0');
        let prevQ = q - 1, prevY = y;
        if (prevQ === 0) { prevQ = 4; prevY = y - 1; }
        return MOCK_DATA.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${prevQ} / ${prevY}`);
    }
    if (row.level === LEVEL.MONTH) {
        const m = parseInt(row.periodLabel.match(/Tháng (\d+)/)?.[1] || '0');
        const y = parseInt(row.periodLabel.match(/(\d{4})$/)?.[1] || '0');
        let prevM = m - 1, prevY = y;
        if (prevM === 0) { prevM = 12; prevY = y - 1; }
        return MOCK_DATA.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${prevM} / ${prevY}`);
    }
    return null;
};

/** Icon tăng/giảm */
const ChangeIcon = ({ value }) => {
    if (value == null) return null;
    if (value > 0) return <TrendingUp size={14} color="#16a34a" />;
    if (value < 0) return <TrendingDown size={14} color="#dc2626" />;
    return <Minus size={14} color="#6b7280" />;
};

// ── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, color }) => (
    <Box sx={{
        flex: '1 1 160px',
        minWidth: 160,
        bgcolor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
    }}>
        <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>
            {label}
        </Typography>
        <Typography sx={{
            fontSize: '18px',
            fontWeight: 700,
            color: color || '#111827',
            lineHeight: 1.2,
        }}>
            {value}
        </Typography>
    </Box>
);

// ── Main Component ──────────────────────────────────────────────────────────
export default function ViewSalesReportDetail() {
    const navigate = useNavigate();
    const params = useParams();

    // ── Xác định kỳ báo cáo từ URL ────────────────────────────────────────
    // params chỉ có: year, quarter, month — KHÔNG có periodType
    // nên xác định periodType dựa trên presence của các param
    const periodType = params.month ? 'month' : params.quarter ? 'quarter' : params.year ? 'year' : null;

    const currentRow = useMemo(() => {
        if (!periodType || !params.year) return null;

        if (periodType === 'year') {
            return MOCK_DATA.find(r => r.level === LEVEL.YEAR && r.periodLabel === params.year);
        }
        if (periodType === 'quarter' && params.quarter) {
            return MOCK_DATA.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${params.quarter} / ${params.year}`);
        }
        if (periodType === 'month' && params.month) {
            return MOCK_DATA.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${params.month} / ${params.year}`);
        }
        return null;
    }, [periodType, params.year, params.quarter, params.month]);

    const prevRow = useMemo(() => {
        return getPreviousPeriodRow(currentRow);
    }, [currentRow]);

    const compPrev = prevRow?.totalValue ?? null;
    const compChange = calcChange(currentRow?.totalValue, compPrev);
    const compGrowth = calcGrowth(compChange, compPrev);

    // ── Subtitle ─────────────────────────────────────────────────────────────
    const subtitle = useMemo(() => {
        if (!currentRow) return '';
        if (currentRow.level === LEVEL.YEAR) return `Năm ${currentRow.periodLabel}`;
        return currentRow.periodLabel;
    }, [currentRow]);

    // ── Chi tiết breakdown ────────────────────────────────────────────────
    const yearNum = params.year || null;
    const quarterNum = params.quarter ? parseInt(params.quarter) : null;
    const monthNum = params.month ? parseInt(params.month) : null;

    // Quarter breakdown (cho NĂM)
    const quarterBreakdown = useMemo(() => {
        if (currentRow?.level !== LEVEL.YEAR || !yearNum) return null;
        return MOCK_QUARTER_BREAKDOWN[yearNum] || null;
    }, [currentRow, yearNum]);

    // Month breakdown (cho NĂM hoặc QUÝ)
    const monthBreakdown = useMemo(() => {
        if (!yearNum) return null;
        if (currentRow?.level === LEVEL.YEAR) {
            return MOCK_MONTH_BREAKDOWN[yearNum] || null;
        }
        if (currentRow?.level === LEVEL.QUARTER && quarterNum) {
            const all = MOCK_MONTH_BREAKDOWN[yearNum] || [];
            const start = (quarterNum - 1) * 3;
            return all.slice(start, start + 3);
        }
        return null;
    }, [currentRow, yearNum, quarterNum]);

    // Week breakdown (cho THÁNG)
    const weekBreakdown = useMemo(() => {
        if (currentRow?.level !== LEVEL.MONTH || !yearNum || !monthNum) return null;
        return MOCK_WEEK_BREAKDOWN[yearNum]?.[monthNum] || null;
    }, [currentRow, yearNum, monthNum]);

    // Top products luôn hiển thị
    const topProducts = MOCK_TOP_PRODUCTS;

    // Top customers luôn hiển thị
    const topCustomers = MOCK_TOP_CUSTOMERS;

    // ── Fallback: không tìm thấy ───────────────────────────────────────────────
    if (!currentRow) {
        return (
            <Box sx={{
                height: '100%', minHeight: 0, minWidth: 0,
                overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa',
            }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                    <Typography sx={{ fontSize: '16px', color: '#6b7280' }}>
                        Không tìm thấy dữ liệu kỳ báo cáo
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowLeft size={16} />}
                        onClick={() => navigate('/reports/sales')}
                        sx={{
                            textTransform: 'none', borderRadius: '10px',
                            borderColor: '#e5e7eb', color: '#374151', fontSize: '13px',
                            '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                        }}
                    >
                        Quay lại Báo cáo doanh số
                    </Button>
                </Box>
            </Box>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <Box sx={{
            height: '100%', minHeight: 0, minWidth: 0,
            overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa',
        }}>
            {/* ── Header ── */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Button
                        variant="text"
                        startIcon={<ArrowLeft size={16} />}
                        onClick={() => navigate('/reports/sales')}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 500,
                            color: '#6b7280', px: 1, minWidth: 0,
                            '&:hover': { color: '#374151', bgcolor: 'transparent', textDecoration: 'none' },
                        }}
                    >
                        Báo cáo doanh số
                    </Button>
                </Box>
                <Typography variant="h5" component="h1" fontWeight="600"
                    sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Chi tiết báo cáo doanh số
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '13px', mt: 0.5, fontWeight: 400 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>

            {/* ── Main Content ── */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 3 }, pb: 3, minHeight: 0, overflow: 'auto' }}>

                {/* ── Summary Cards ── */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard label="Kỳ báo cáo" value={currentRow.periodLabel} color="#374151" />
                    <SummaryCard label="Tổng doanh số" value={formatVND(currentRow.totalValue)} color="#111827" />
                    <SummaryCard label="Tổng phiếu xuất" value={formatNumber(currentRow.deliveryNotes)} color="#2563eb" />
                    <SummaryCard label="Tổng số lượng xuất" value={formatNumber(currentRow.totalQty)} color="#059669" />
                </Box>

                {/* ── So sánh kỳ ── */}
                <Paper elevation={0} sx={{
                    border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5,
                }}>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            So sánh với kỳ trước
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
                        <SummaryCard
                            label="Kỳ trước"
                            value={compPrev != null ? formatVND(compPrev) : '—'}
                            color="#9ca3af"
                        />
                        <Box sx={{ flex: '1 1 180px', minWidth: 180, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ChangeIcon value={compChange} />
                                <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>Tăng / Giảm</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: changeColor(compChange), lineHeight: 1.2 }}>
                                {compChange != null ? formatSignedCurrency(compChange) : '—'}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 180px', minWidth: 180, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ChangeIcon value={compGrowth} />
                                <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>Tăng trưởng</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: changeColor(compGrowth), lineHeight: 1.2 }}>
                                {compGrowth != null ? formatSignedPercent(compGrowth) : '—'}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>

                {/* ── Kỳ trước ── */}
                {prevRow && (
                    <Paper elevation={0} sx={{
                        border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5,
                    }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                Kỳ trước — {prevRow.periodLabel}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
                            <SummaryCard label="Kỳ báo cáo" value={prevRow.periodLabel} color="#9ca3af" />
                            <SummaryCard label="Tổng doanh số" value={formatVND(prevRow.totalValue)} color="#9ca3af" />
                            <SummaryCard label="Tổng phiếu xuất" value={formatNumber(prevRow.deliveryNotes)} color="#9ca3af" />
                            <SummaryCard label="Tổng số lượng xuất" value={formatNumber(prevRow.totalQty)} color="#9ca3af" />
                        </Box>
                    </Paper>
                )}

                {/* ── Chi tiết breakdown ── */}
                {currentRow?.level === LEVEL.YEAR && quarterBreakdown && (
                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Chi tiết theo Quý</Typography>
                            <Chip label={`${currentRow.periodLabel}`} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Kỳ', 'Số phiếu xuất', 'Tổng SL xuất', 'Giá trị xuất hàng'].map(h => (
                                            <TableCell key={h} align={h !== 'Kỳ' ? 'right' : 'left'} sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {quarterBreakdown.map((r, i) => (
                                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>{r.label}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {monthBreakdown && (
                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                Chi tiết theo Tháng
                            </Typography>
                            <Chip label={currentRow?.level === LEVEL.QUARTER ? currentRow.periodLabel : `Năm ${currentRow?.periodLabel}`} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Kỳ', 'Số phiếu xuất', 'Tổng SL xuất', 'Giá trị xuất hàng'].map(h => (
                                            <TableCell key={h} align={h !== 'Kỳ' ? 'right' : 'left'} sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {monthBreakdown.map((r, i) => (
                                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>{r.label}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {weekBreakdown && (
                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Chi tiết theo Tuần</Typography>
                            <Chip label={currentRow.periodLabel} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Tuần', 'Ngày', 'Số phiếu xuất', 'Tổng SL xuất', 'Giá trị xuất hàng'].map(h => (
                                            <TableCell key={h} align={h === 'Tuần' || h === 'Ngày' ? 'left' : 'right'} sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {weekBreakdown.map((r, i) => (
                                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>{r.label}</TableCell>
                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{r.days}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {/* ── Top sản phẩm bán chạy ── */}
                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mb: 2.5 }}>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Package size={16} color="#6b7280" />
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Top sản phẩm bán chạy</Typography>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['STT', 'Mã SP', 'Tên sản phẩm', 'Đơn vị', 'SL bán', 'Doanh số', 'Tăng trưởng'].map((h, i) => (
                                        <TableCell key={h} align={i < 3 ? 'left' : 'right'} sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {topProducts.map((p, i) => (
                                    <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{i + 1}</TableCell>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500, fontSize: '12px' }}>{p.code}</TableCell>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>{p.name}</TableCell>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{p.unit}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(p.qty)}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(p.revenue)}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(p.growth), fontVariantNumeric: 'tabular-nums' }}>{formatSignedPercent(p.growth)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* ── Top khách hàng ── */}
                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden' }}>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Truck size={16} color="#6b7280" />
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Top khách hàng</Typography>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['STT', 'Mã KH', 'Tên khách hàng', 'Số đơn', 'Doanh số', 'Tăng trưởng'].map((h, i) => (
                                        <TableCell key={h} align={i < 3 ? 'left' : 'right'} sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {topCustomers.map((c, i) => (
                                    <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{i + 1}</TableCell>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500, fontSize: '12px' }}>{c.code}</TableCell>
                                        <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>{c.name}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(c.orders)}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(c.revenue)}</TableCell>
                                        <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(c.growth), fontVariantNumeric: 'tabular-nums' }}>{formatSignedPercent(c.growth)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Box>
    );
}
