/**
 * ViewSalesReportDetail – Chi tiết báo cáo doanh số theo kỳ
 * Nhận params từ URL: /reports/sales/detail/{year|quarter|month}/{...params}
 * Style đồng bộ với các trang detail khác trong hệ thống.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Minus,
    Package,
    Truck,
    BarChart3,
    Users,
    Eye,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DATA = [
    { id: 'y2026', level: 'YEAR', periodLabel: '2026', parentId: null,
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

// ── Mock Item (Vật tư) ─────────────────────────────────────────────────────
const MOCK_ITEMS_DATA = [
    { code: 'VT-001', name: 'Bóng tái sinh Dunlop', uom: 'Cái', deliveryNotes: 42, totalQty: 420, totalValue: 1_260_000_000, prevValue: 1_063_500_000, growth: 18.48 },
    { code: 'VT-002', name: 'Lốp xe tải Michelin 11R22.5', uom: 'Cái', deliveryNotes: 28, totalQty: 280, totalValue: 980_000_000, prevValue: 872_800_000, growth: 12.28 },
    { code: 'VT-003', name: 'Dầu nhớt Castrol 15W-40', uom: 'Lon', deliveryNotes: 105, totalQty: 1_050, totalValue: 735_000_000, prevValue: 602_100_000, growth: 22.07 },
    { code: 'VT-004', name: 'Mỡ bôi trơn Shell', uom: 'Kg', deliveryNotes: 64, totalQty: 640, totalValue: 448_000_000, prevValue: 472_200_000, growth: -5.12 },
    { code: 'VT-005', name: 'Dây curoa 康默', uom: 'Cái', deliveryNotes: 38, totalQty: 380, totalValue: 380_000_000, prevValue: 349_700_000, growth: 8.66 },
    { code: 'VT-006', name: 'Bạc lót Engine Stand', uom: 'Bộ', deliveryNotes: 22, totalQty: 176, totalValue: 281_600_000, prevValue: 246_400_000, growth: 14.29 },
    { code: 'VT-007', name: 'Gioăng cao su phớt dầu', uom: 'Cái', deliveryNotes: 56, totalQty: 840, totalValue: 168_000_000, prevValue: 151_200_000, growth: 11.11 },
    { code: 'VT-008', name: 'Nhớt Total 10W-30', uom: 'Lon', deliveryNotes: 30, totalQty: 300, totalValue: 150_000_000, prevValue: 135_000_000, growth: 11.11 },
    { code: 'VT-009', name: 'Bóng đèn halogen H7', uom: 'Cái', deliveryNotes: 80, totalQty: 240, totalValue: 72_000_000, prevValue: 66_000_000, growth: 9.09 },
    { code: 'VT-010', name: 'Lọc dầu Toyota 15690', uom: 'Cái', deliveryNotes: 18, totalQty: 54, totalValue: 54_000_000, prevValue: 48_600_000, growth: 11.11 },
].map((item, idx, arr) => {
    const total = arr.reduce((s, i) => s + i.totalValue, 0);
    return { ...item, share: (item.totalValue / total) * 100 };
});

// ── Mock Receiver ──────────────────────────────────────────────────────────
const MOCK_RECEIVER_DATA = [
    { code: 'RCV-001', name: 'Công ty TNHH Vận tải Thành Đạt', deliveryNotes: 18, totalQty: 1_840, totalValue: 980_000_000, prevValue: 781_400_000, growth: 25.41 },
    { code: 'RCV-002', name: 'HTX Vận tải Sài Gòn', deliveryNotes: 14, totalQty: 1_420, totalValue: 720_000_000, prevValue: 647_500_000, growth: 11.20 },
    { code: 'RCV-003', name: 'Doanh nghiệp Tân Phú', deliveryNotes: 11, totalQty: 980, totalValue: 540_000_000, prevValue: 561_000_000, growth: -3.74 },
    { code: 'RCV-004', name: 'Công ty CP Dịch vụ Giao thông Bình Dương', deliveryNotes: 9, totalQty: 760, totalValue: 430_000_000, prevValue: 359_500_000, growth: 19.61 },
    { code: 'RCV-005', name: 'Trạm sửa chữa xe Hiền Phát', deliveryNotes: 7, totalQty: 580, totalValue: 320_000_000, prevValue: 304_500_000, growth: 5.09 },
    { code: 'RCV-006', name: 'Xưởng sửa chữa ô tô Phú Nhuận', deliveryNotes: 6, totalQty: 420, totalValue: 290_000_000, prevValue: 261_000_000, growth: 11.11 },
    { code: 'RCV-007', name: 'Công ty TNHH Dịch vụ Logistic Hùng Vương', deliveryNotes: 5, totalQty: 380, totalValue: 265_000_000, prevValue: 238_500_000, growth: 11.11 },
    { code: 'RCV-008', name: 'HTX Nông nghiệp Đồng Tháp', deliveryNotes: 4, totalQty: 290, totalValue: 195_000_000, prevValue: 175_500_000, growth: 11.11 },
    { code: 'RCV-009', name: 'Trạm bảo dưỡng xe Bắc Việt', deliveryNotes: 3, totalQty: 220, totalValue: 145_000_000, prevValue: 130_500_000, growth: 11.11 },
    { code: 'RCV-010', name: 'Cửa hàng phụ tùng Minh Quân', deliveryNotes: 3, totalQty: 190, totalValue: 120_000_000, prevValue: 108_000_000, growth: 11.11 },
].map((item, idx, arr) => {
    const total = arr.reduce((s, i) => s + i.totalValue, 0);
    return { ...item, share: (item.totalValue / total) * 100 };
});

const LEVEL = { YEAR: 'YEAR', QUARTER: 'QUARTER', MONTH: 'MONTH' };

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatVND = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
};

const formatSignedCurrency = (n) => {
    if (n == null) return '—';
    const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Math.abs(n));
    return n >= 0 ? `+${formatted}` : `-${formatted}`;
};

const formatSignedPercent = (n) => {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

const formatNumber = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('vi-VN').format(n);
};

const formatShare = (n) => {
    if (n == null) return '—';
    return `${n.toFixed(1)}%`;
};

const calcChange = (curr, prev) => {
    if (curr == null || prev == null) return null;
    return curr - prev;
};

const calcGrowth = (change, prev) => {
    if (change == null || prev == null || prev === 0) return null;
    return (change / prev) * 100;
};

const changeColor = (v) =>
    v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : '#6b7280';

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

const ChangeIcon = ({ value }) => {
    if (value == null) return null;
    if (value > 0) return <TrendingUp size={14} color="#16a34a" />;
    if (value < 0) return <TrendingDown size={14} color="#dc2626" />;
    return <Minus size={14} color="#6b7280" />;
};

// ── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, color }) => (
    <Box sx={{ flex: '1 1 160px', minWidth: 160, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: color || '#111827', lineHeight: 1.2 }}>{value}</Typography>
    </Box>
);

// ── Section Block ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
        {Icon && <Icon size={16} color="#6b7280" />}
        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{title}</Typography>
    </Box>
);

// ── Table Header Row helper ──────────────────────────────────────────────────
const TH = ({ children }) => (
    <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        {children}
    </TableCell>
);
const THLeft = ({ children }) => (
    <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
        {children}
    </TableCell>
);

// ── Main Component ──────────────────────────────────────────────────────────
export default function ViewSalesReportDetail() {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(0);
    // ── So sánh kỳ: tách Quý/Năm thành 2 dropdown riêng ──
    const [compareQ, setCompareQ] = useState(null);   // Quý so sánh (cấp Quý)
    const [compareQYear, setCompareQYear] = useState(null); // Năm so sánh (cấp Quý)
    const [compareM, setCompareM] = useState(null);   // Tháng so sánh (cấp Tháng)
    const [compareMYear, setCompareMYear] = useState(null); // Năm so sánh (cấp Tháng)

    // ── Back navigation dựa trên from context ──
    const from = searchParams.get('from');
    const parentYear = searchParams.get('parentYear');
    const parentQuarter = searchParams.get('parentQuarter');

    const handleBack = () => {
        if (periodType === 'year') {
            navigate('/reports/sales');
        } else if (periodType === 'quarter') {
            if (from === 'list') {
                navigate('/reports/sales');
            } else if (from === 'year' && parentYear) {
                navigate(`/reports/sales/detail/year/${parentYear}`);
            } else {
                // fallback: về detail Năm hiện tại
                navigate(`/reports/sales/detail/year/${params.year}`);
            }
        } else if (periodType === 'month') {
            if (from === 'list') {
                navigate('/reports/sales');
            } else if (from === 'quarter' && parentQuarter && parentYear) {
                navigate(`/reports/sales/detail/quarter/${parentQuarter}/${parentYear}`);
            } else {
                // fallback: tính quý cha từ month rồi về
                const derivedQuarter = Math.ceil(parseInt(params.month) / 3);
                navigate(`/reports/sales/detail/quarter/${derivedQuarter}/${params.year}`);
            }
        } else {
            navigate('/reports/sales');
        }
    };

    // ── Xác định kỳ báo cáo ────────────────────────────────────────────
    const periodType = params.month ? 'month' : params.quarter ? 'quarter' : params.year ? 'year' : null;

    const currentRow = useMemo(() => {
        if (!periodType || !params.year) return null;
        if (periodType === 'year') return MOCK_DATA.find(r => r.level === LEVEL.YEAR && r.periodLabel === params.year);
        if (periodType === 'quarter' && params.quarter) return MOCK_DATA.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${params.quarter} / ${params.year}`);
        if (periodType === 'month' && params.month) return MOCK_DATA.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${params.month} / ${params.year}`);
        return null;
    }, [periodType, params.year, params.quarter, params.month]);

    // ── Options cho cấp NĂM (dropdown đơn) ──────────────────────────────
    const compareYearOptions = useMemo(() => {
        if (!currentRow || currentRow.level !== LEVEL.YEAR) return [];
        const currentYear = parseInt(currentRow.periodLabel);
        const years = [...new Set(MOCK_DATA.filter(r => r.level === LEVEL.YEAR).map(r => r.periodLabel))].sort().reverse();
        return years.filter(y => parseInt(y) < currentYear).map(y => ({ value: y, label: `Năm ${y}` }));
    }, [currentRow]);

    const selectedCompareYear = useMemo(() => compareYearOptions[0]?.value ?? null, [compareYearOptions]);

    // ── Options cho cấp QUÝ: dropdown Quý + dropdown Năm riêng ─────────
    const compareQOptions = useMemo(() => {
        if (!currentRow || currentRow.level !== LEVEL.QUARTER) return [];
        const parts = currentRow.periodLabel.split(' / ');
        const currentQ = parseInt(parts[0].replace('Quý ', ''));
        return [{ value: currentQ, label: `Quý ${currentQ}` }];
    }, [currentRow]);

    const compareQYOptions = useMemo(() => {
        if (!currentRow || currentRow.level !== LEVEL.QUARTER) return [];
        const parts = currentRow.periodLabel.split(' / ');
        const currentYear = parseInt(parts[1]);
        const currentQ = parseInt(parts[0].replace('Quý ', ''));
        const years = [...new Set(MOCK_DATA.map(r => parseInt(r.periodLabel.split(' / ')[1])))].sort((a, b) => b - a).filter(y => y < currentYear);
        const options = [];
        years.forEach(y => {
            const quarterRow = MOCK_DATA.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${currentQ} / ${y}`);
            if (quarterRow) options.push({ value: y, label: `${y}` });
        });
        return options;
    }, [currentRow]);

    // Auto-set default cho cấp Quý
    const selectedCompareQ = compareQ ?? compareQOptions[0]?.value ?? null;
    const selectedCompareQY = compareQYear ?? compareQYOptions[0]?.value ?? null;

    // ── Options cho cấp THÁNG: dropdown Tháng + dropdown Năm riêng ────
    const compareMOptions = useMemo(() => {
        if (!currentRow || currentRow.level !== LEVEL.MONTH) return [];
        const parts = currentRow.periodLabel.split(' / ');
        const currentM = parseInt(parts[0].replace('Tháng ', ''));
        return [{ value: currentM, label: `Tháng ${currentM}` }];
    }, [currentRow]);

    const compareMYOptions = useMemo(() => {
        if (!currentRow || currentRow.level !== LEVEL.MONTH) return [];
        const parts = currentRow.periodLabel.split(' / ');
        const currentYear = parseInt(parts[1]);
        const currentM = parseInt(parts[0].replace('Tháng ', ''));
        const years = [...new Set(MOCK_DATA.map(r => parseInt(r.periodLabel.split(' / ')[1])))].sort((a, b) => b - a).filter(y => y < currentYear);
        const options = [];
        years.forEach(y => {
            const monthRow = MOCK_DATA.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${currentM} / ${y}`);
            if (monthRow) options.push({ value: y, label: `${y}` });
        });
        return options;
    }, [currentRow]);

    // Auto-set default cho cấp Tháng
    const selectedCompareM = compareM ?? compareMOptions[0]?.value ?? null;
    const selectedCompareMY = compareMYear ?? compareMYOptions[0]?.value ?? null;

    // ── Row so sánh: tìm data tương ứng ──
    const compareRow = useMemo(() => {
        if (!currentRow) return null;
        if (currentRow.level === LEVEL.YEAR) {
            if (!selectedCompareYear) return null;
            return MOCK_DATA.find(r => r.level === LEVEL.YEAR && r.periodLabel === selectedCompareYear) || null;
        }
        if (currentRow.level === LEVEL.QUARTER) {
            const q = selectedCompareQ ?? compareQOptions[0]?.value;
            const y = selectedCompareQY ?? compareQYOptions[0]?.value;
            if (!q || !y) return null;
            return MOCK_DATA.find(r => r.level === LEVEL.QUARTER && r.periodLabel === `Quý ${q} / ${y}`) || null;
        }
        if (currentRow.level === LEVEL.MONTH) {
            const m = selectedCompareM ?? compareMOptions[0]?.value;
            const y = selectedCompareMY ?? compareMYOptions[0]?.value;
            if (!m || !y) return null;
            return MOCK_DATA.find(r => r.level === LEVEL.MONTH && r.periodLabel === `Tháng ${m} / ${y}`) || null;
        }
        return null;
    }, [currentRow, selectedCompareYear, selectedCompareQ, selectedCompareQY, selectedCompareM, selectedCompareMY, compareQOptions, compareQYOptions, compareMOptions, compareMYOptions]);

    const compPrev = compareRow?.totalValue ?? null;
    const compChange = calcChange(currentRow?.totalValue, compPrev);
    const compGrowth = calcGrowth(compChange, compPrev);

    // ── Label kỳ so sánh đang chọn (luôn hiện, kể cả khi không có data) ──
    const selectedComparePeriodLabel = useMemo(() => {
        if (!currentRow) return null;
        if (currentRow.level === LEVEL.YEAR && selectedCompareYear) return `Năm ${selectedCompareYear}`;
        if (currentRow.level === LEVEL.QUARTER) {
            const q = selectedCompareQ ?? compareQOptions[0]?.value;
            const y = selectedCompareQY ?? compareQYOptions[0]?.value;
            if (q && y) return `Quý ${q} / ${y}`;
            return null;
        }
        if (currentRow.level === LEVEL.MONTH) {
            const m = selectedCompareM ?? compareMOptions[0]?.value;
            const y = selectedCompareMY ?? compareMYOptions[0]?.value;
            if (m && y) return `Tháng ${m} / ${y}`;
            return null;
        }
        return null;
    }, [currentRow, selectedCompareYear, selectedCompareQ, selectedCompareQY, selectedCompareM, selectedCompareMY, compareQOptions, compareQYOptions, compareMOptions, compareMYOptions]);

    // ── Navigate sang detail kỳ ───────────────────────────────────────────
    const navigateToPeriod = (periodLabel) => {
        if (!periodLabel) return;
        if (/^Quý \d+ \/ \d{4}$/.test(periodLabel)) {
            const parts = periodLabel.match(/Quý (\d) \/ (\d{4})/);
            // truyền context: từ cấp Năm -> vào Quý
            if (periodType === 'year') {
                navigate(`/reports/sales/detail/quarter/${parts[1]}/${parts[2]}?from=year&parentYear=${params.year}`);
            } else {
                navigate(`/reports/sales/detail/quarter/${parts[1]}/${parts[2]}?from=list`);
            }
        } else if (/^Tháng \d+ \/ \d{4}$/.test(periodLabel)) {
            const parts = periodLabel.match(/Tháng (\d+) \/ (\d{4})/);
            // truyền context: từ cấp Năm/Quý -> vào Tháng
            if (periodType === 'year') {
                navigate(`/reports/sales/detail/month/${parts[1]}/${parts[2]}?from=year&parentYear=${params.year}`);
            } else if (periodType === 'quarter') {
                navigate(`/reports/sales/detail/month/${parts[1]}/${parts[2]}?from=quarter&parentQuarter=${params.quarter}&parentYear=${params.year}`);
            } else {
                navigate(`/reports/sales/detail/month/${parts[1]}/${parts[2]}?from=list`);
            }
        }
    };

    const subtitle = useMemo(() => {
        if (!currentRow) return '';
        if (currentRow.level === LEVEL.YEAR) return `Năm ${currentRow.periodLabel}`;
        return currentRow.periodLabel;
    }, [currentRow]);

    const yearNum = params.year || null;
    const quarterNum = params.quarter ? parseInt(params.quarter) : null;
    const monthNum = params.month ? parseInt(params.month) : null;

    const quarterBreakdown = useMemo(() => {
        if (currentRow?.level !== LEVEL.YEAR || !yearNum) return null;
        return MOCK_QUARTER_BREAKDOWN[yearNum] || null;
    }, [currentRow, yearNum]);

    const monthBreakdown = useMemo(() => {
        if (!yearNum) return null;
        if (currentRow?.level === LEVEL.YEAR) return MOCK_MONTH_BREAKDOWN[yearNum] || null;
        if (currentRow?.level === LEVEL.QUARTER && quarterNum) {
            const all = MOCK_MONTH_BREAKDOWN[yearNum] || [];
            return all.slice((quarterNum - 1) * 3, (quarterNum - 1) * 3 + 3);
        }
        return null;
    }, [currentRow, yearNum, quarterNum]);

    const weekBreakdown = useMemo(() => {
        if (currentRow?.level !== LEVEL.MONTH || !yearNum || !monthNum) return null;
        return MOCK_WEEK_BREAKDOWN[yearNum]?.[monthNum] || null;
    }, [currentRow, yearNum, monthNum]);

    // ── Item tab data ─────────────────────────────────────────────────────
    const itemTop = MOCK_ITEMS_DATA.slice(0, 8);
    const itemBest = itemTop[0];
    const itemStats = useMemo(() => ({
        totalItems: MOCK_ITEMS_DATA.length,
        totalQty: MOCK_ITEMS_DATA.reduce((s, i) => s + i.totalQty, 0),
        totalValue: MOCK_ITEMS_DATA.reduce((s, i) => s + i.totalValue, 0),
        bestItem: itemBest?.name || '—',
    }), []);

    const itemChange = calcChange(itemStats.totalValue, itemStats.totalValue * 0.82);
    const itemGrowth = calcGrowth(itemChange, itemStats.totalValue * 0.82);

    // ── Receiver tab data ─────────────────────────────────────────────────
    const receiverTop = MOCK_RECEIVER_DATA.slice(0, 8);
    const receiverBest = receiverTop[0];
    const receiverStats = useMemo(() => ({
        totalReceivers: MOCK_RECEIVER_DATA.length,
        totalQty: MOCK_RECEIVER_DATA.reduce((s, i) => s + i.totalQty, 0),
        totalValue: MOCK_RECEIVER_DATA.reduce((s, i) => s + i.totalValue, 0),
        totalNotes: MOCK_RECEIVER_DATA.reduce((s, i) => s + i.deliveryNotes, 0),
        bestReceiver: receiverBest?.name || '—',
    }), []);

    const receiverChange = calcChange(receiverStats.totalValue, receiverStats.totalValue * 0.85);
    const receiverGrowth = calcGrowth(receiverChange, receiverStats.totalValue * 0.85);

    // ── Fallback ────────────────────────────────────────────────────────────
    if (!currentRow) {
        return (
            <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                    <Typography sx={{ fontSize: '16px', color: '#6b7280' }}>Không tìm thấy dữ liệu kỳ báo cáo</Typography>
                    <Button variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/reports/sales')}
                        sx={{ textTransform: 'none', borderRadius: '10px', borderColor: '#e5e7eb', color: '#374151', fontSize: '13px', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>
                        Quay lại Báo cáo doanh số
                    </Button>
                </Box>
            </Box>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>

            {/* ── Header ── */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Button variant="text" startIcon={<ArrowLeft size={16} />} onClick={handleBack}
                        sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280', px: 1, minWidth: 0, '&:hover': { color: '#374151', bgcolor: 'transparent', textDecoration: 'none' } }}>
                        Báo cáo doanh số
                    </Button>
                </Box>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Chi tiết báo cáo doanh số
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '13px', mt: 0.5, fontWeight: 400 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>

            {/* ── Main Content ── */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 3 }, pb: 3, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* ── Summary Cards ── */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                    <SummaryCard label="Kỳ báo cáo" value={currentRow.periodLabel} color="#374151" />
                    <SummaryCard label="Tổng doanh số" value={formatVND(currentRow.totalValue)} color="#111827" />
                    <SummaryCard label="Tổng phiếu xuất" value={formatNumber(currentRow.deliveryNotes)} color="#2563eb" />
                    <SummaryCard label="Tổng số lượng xuất" value={formatNumber(currentRow.totalQty)} color="#059669" />
                </Box>

                {/* ── Tabs ── */}
                <Paper elevation={0} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff' }}>

                    {/* Tab bar */}
                    <Box sx={{ borderBottom: '1px solid #f3f4f6', px: 1, flexShrink: 0 }}>
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
                            sx={{
                                minHeight: 44,
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#9ca3af',
                                    minHeight: 44,
                                    px: 2.5,
                                    py: 0,
                                    gap: 0.5,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                },
                                '& .Mui-selected': {
                                    color: '#111827',
                                    fontWeight: 600,
                                },
                                '& .MuiTabs-indicator': {
                                    bgcolor: '#0284c7',
                                    height: 2,
                                },
                            }}
                        >
                            <Tab icon={<BarChart3 size={15} />} iconPosition="start" label="Doanh số" />
                            <Tab icon={<Package size={15} />} iconPosition="start" label="Vật tư" />
                            <Tab icon={<Users size={15} />} iconPosition="start" label="Khách hàng" />
                        </Tabs>
                    </Box>

                    {/* Tab content */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>

                        {/* ── Tab: Doanh số ── */}
                        {activeTab === 0 && (
                            <Box>

                                {/* So sánh kỳ */}
                                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', m: 2, mb: 1.5 }}>
                                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', mr: 1 }}>So sánh với kỳ</Typography>
                                        {/* Dropdowns bên trái chữ */}
                                        {currentRow?.level === LEVEL.YEAR && (
                                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                                <Select
                                                    value={selectedCompareYear ?? ''}
                                                    onChange={(e) => {}}
                                                    displayEmpty
                                                    sx={{ fontSize: '13px', height: 32, borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                                                >
                                                    {compareYearOptions.map(opt => (
                                                        <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13px' }}>{opt.label}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                        {currentRow?.level === LEVEL.QUARTER && (
                                            <>
                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                    <Select
                                                        value={selectedCompareQ ?? ''}
                                                        onChange={(e) => { setCompareQ(e.target.value); }}
                                                        displayEmpty
                                                        sx={{ fontSize: '13px', height: 32, borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                                                    >
                                                        {compareQOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13px' }}>{opt.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                                    <Select
                                                        value={selectedCompareQY ?? ''}
                                                        onChange={(e) => { setCompareQYear(e.target.value); }}
                                                        displayEmpty
                                                        sx={{ fontSize: '13px', height: 32, borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                                                    >
                                                        {compareQYOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13px' }}>{opt.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </>
                                        )}
                                        {currentRow?.level === LEVEL.MONTH && (
                                            <>
                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                    <Select
                                                        value={selectedCompareM ?? ''}
                                                        onChange={(e) => { setCompareM(e.target.value); }}
                                                        displayEmpty
                                                        sx={{ fontSize: '13px', height: 32, borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                                                    >
                                                        {compareMOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13px' }}>{opt.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                                    <Select
                                                        value={selectedCompareMY ?? ''}
                                                        onChange={(e) => { setCompareMYear(e.target.value); }}
                                                        displayEmpty
                                                        sx={{ fontSize: '13px', height: 32, borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
                                                    >
                                                        {compareMYOptions.map(opt => (
                                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13px' }}>{opt.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
                                        <SummaryCard label="Kỳ so sánh" value={compareRow ? compareRow.periodLabel : '—'} color="#9ca3af" />
                                        <SummaryCard label="Giá trị kỳ so sánh" value={compPrev != null ? formatVND(compPrev) : '—'} color="#9ca3af" />
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

                                {/* Kỳ so sánh — {periodLabel} */}
                                {selectedComparePeriodLabel && (
                                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', m: 2, mb: 1.5 }}>
                                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Kỳ so sánh — {selectedComparePeriodLabel}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1.5, p: 2.5, flexWrap: 'wrap' }}>
                                            <SummaryCard label="Kỳ báo cáo" value={compareRow ? compareRow.periodLabel : '—'} color="#9ca3af" />
                                            <SummaryCard label="Tổng doanh số" value={compareRow ? formatVND(compareRow.totalValue) : '—'} color="#9ca3af" />
                                            <SummaryCard label="Tổng phiếu xuất" value={compareRow ? formatNumber(compareRow.deliveryNotes) : '—'} color="#9ca3af" />
                                            <SummaryCard label="Tổng số lượng xuất" value={compareRow ? formatNumber(compareRow.totalQty) : '—'} color="#9ca3af" />
                                        </Box>
                                    </Paper>
                                )}

                                {/* Chi tiết Quý */}
                                {currentRow?.level === LEVEL.YEAR && quarterBreakdown && (
                                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', m: 2, mb: 1.5 }}>
                                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Chi tiết theo Quý</Typography>
                                            <Chip label={currentRow.periodLabel} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                                        </Box>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <THLeft>Quý</THLeft>
                                                        <TH>Số phiếu xuất</TH>
                                                        <TH>Tổng SL xuất</TH>
                                                        <TH>Giá trị xuất hàng</TH>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {quarterBreakdown.map((r, i) => {
                                                        const isCurrentPeriod = r.label === currentRow?.periodLabel;
                                                        return (
                                                            <TableRow key={i} hover sx={{ bgcolor: isCurrentPeriod ? '#f0f9ff' : undefined, '&:last-child td': { borderBottom: 0 } }}>
                                                                <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6' }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                                                        <Typography sx={{ fontWeight: 500, color: isCurrentPeriod ? '#0369a1' : undefined }}>
                                                                            {r.label}
                                                                        </Typography>
                                                                        <Tooltip title="Xem chi tiết">
                                                                            <IconButton size="small"
                                                                                onClick={() => navigateToPeriod(r.label)}
                                                                                sx={{ p: 0.25, color: '#9ca3af', '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)' } }}>
                                                                                <Eye size={14} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                )}

                                {/* Chi tiết Tháng */}
                                {monthBreakdown && (
                                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', m: 2, mb: 1.5 }}>
                                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Chi tiết theo Tháng</Typography>
                                            <Chip label={currentRow?.level === LEVEL.QUARTER ? currentRow.periodLabel : `Năm ${currentRow?.periodLabel}`} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                                        </Box>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <THLeft>Tháng</THLeft>
                                                        <TH>Số phiếu xuất</TH>
                                                        <TH>Tổng SL xuất</TH>
                                                        <TH>Giá trị xuất hàng</TH>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {monthBreakdown.map((r, i) => {
                                                        const isCurrentPeriod = currentRow?.level === LEVEL.MONTH &&
                                                            currentRow?.periodLabel === `${r.label} / ${params.year}`;
                                                        const fullLabel = `${r.label} / ${params.year}`;
                                                        return (
                                                            <TableRow key={i} hover sx={{ bgcolor: isCurrentPeriod ? '#f0f9ff' : undefined, '&:last-child td': { borderBottom: 0 } }}>
                                                                <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6' }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                                                        <Typography sx={{ fontWeight: 500, color: isCurrentPeriod ? '#0369a1' : undefined }}>
                                                                            {r.label}
                                                                        </Typography>
                                                                        <Tooltip title="Xem chi tiết">
                                                                            <IconButton size="small"
                                                                                onClick={() => navigateToPeriod(fullLabel)}
                                                                                sx={{ p: 0.25, color: '#9ca3af', '&:hover': { color: '#0284c7', bgcolor: 'rgba(2,132,199,0.08)' } }}>
                                                                                <Eye size={14} />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                )}

                                {/* Chi tiết Tuần */}
                                {weekBreakdown && (
                                    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', m: 2, mb: 1.5 }}>
                                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Chi tiết theo Tuần</Typography>
                                            <Chip label={currentRow.periodLabel} size="small" sx={{ bgcolor: 'rgba(2,132,199,0.1)', color: '#0369a1', fontSize: '11px', height: 20 }} />
                                        </Box>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <THLeft>Tuần</THLeft>
                                                        <THLeft>Ngày</THLeft>
                                                        <TH>Số phiếu xuất</TH>
                                                        <TH>Tổng SL xuất</TH>
                                                        <TH>Giá trị xuất hàng</TH>
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
                            </Box>
                        )}

                        {/* ── Tab: Vật tư ── */}
                        {activeTab === 1 && (
                            <Box>

                                {/* Summary */}
                                <Box sx={{ display: 'flex', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
                                    <SummaryCard label="Số vật tư phát sinh" value={formatNumber(itemStats.totalItems)} color="#374151" />
                                    <SummaryCard label="Tổng SL xuất (vật tư)" value={formatNumber(itemStats.totalQty)} color="#2563eb" />
                                    <SummaryCard label="Tổng giá trị xuất (vật tư)" value={formatVND(itemStats.totalValue)} color="#111827" />
                                    <SummaryCard label="Vật tư bán mạnh nhất" value={itemStats.bestItem} color="#059669" />
                                </Box>

                                {/* Top vật tư nổi bật */}
                                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mx: 2, mb: 1.5 }}>
                                    <SectionHeader icon={Package} title="Top vật tư nổi bật" />
                                    <Box sx={{ display: 'flex', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
                                        {itemTop.slice(0, 4).map((item) => (
                                            <Box key={item.code} sx={{ flex: '1 1 180px', minWidth: 180, bgcolor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '10px', p: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{item.code}</Typography>
                                                    <Typography sx={{ fontSize: '12px', color: changeColor(item.growth), fontWeight: 500 }}>{formatSignedPercent(item.growth)}</Typography>
                                                </Box>
                                                <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
                                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatVND(item.totalValue)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Paper>

                                {/* Danh sách vật tư */}
                                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mx: 2, mb: 2 }}>
                                    <SectionHeader icon={Package} title="Danh sách vật tư trong kỳ" />
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <THLeft>STT</THLeft>
                                                    <THLeft>Mã vật tư</THLeft>
                                                    <THLeft>Tên vật tư</THLeft>
                                                    <THLeft>ĐVT</THLeft>
                                                    <TH>Phiếu liên quan</TH>
                                                    <TH>Tổng SL xuất</TH>
                                                    <TH>Giá trị xuất hàng</TH>
                                                    <TH>Tỷ trọng</TH>
                                                    <TH>Kỳ trước</TH>
                                                    <TH>Tăng / Giảm</TH>
                                                    <TH>Tăng trưởng</TH>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {itemTop.map((item, i) => {
                                                    const prevItemValue = item.totalValue / (1 + item.growth / 100);
                                                    const itemChangeVal = calcChange(item.totalValue, prevItemValue);
                                                    return (
                                                        <TableRow key={item.code} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{i + 1}</TableCell>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500, fontSize: '12px' }}>{item.code}</TableCell>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontSize: '13px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</TableCell>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{item.uom}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(item.deliveryNotes)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(item.totalQty)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(item.totalValue)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{formatShare(item.share)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{formatVND(prevItemValue)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(itemChangeVal), fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatSignedCurrency(itemChangeVal)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(item.growth), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatSignedPercent(item.growth)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Box>
                        )}

                        {/* ── Tab: Khách hàng (Receiver) ── */}
                        {activeTab === 2 && (
                            <Box>

                                {/* Summary */}
                                <Box sx={{ display: 'flex', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
                                    <SummaryCard label="Số receiver phát sinh" value={formatNumber(receiverStats.totalReceivers)} color="#374151" />
                                    <SummaryCard label="Tổng phiếu xuất" value={formatNumber(receiverStats.totalNotes)} color="#2563eb" />
                                    <SummaryCard label="Tổng giá trị xuất" value={formatVND(receiverStats.totalValue)} color="#111827" />
                                    <SummaryCard label="Receiver doanh số cao nhất" value={receiverStats.bestReceiver} color="#059669" />
                                </Box>

                                {/* Top receiver nổi bật */}
                                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mx: 2, mb: 1.5 }}>
                                    <SectionHeader icon={Users} title="Top khách hàng / Receiver nổi bật" />
                                    <Box sx={{ display: 'flex', gap: 1.5, p: 2, flexWrap: 'wrap' }}>
                                        {receiverTop.slice(0, 4).map((r) => (
                                            <Box key={r.code} sx={{ flex: '1 1 180px', minWidth: 180, bgcolor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '10px', p: 1.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{r.code}</Typography>
                                                    <Typography sx={{ fontSize: '12px', color: changeColor(r.growth), fontWeight: 500 }}>{formatSignedPercent(r.growth)}</Typography>
                                                </Box>
                                                <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Typography>
                                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatVND(r.totalValue)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Paper>

                                {/* Danh sách receiver */}
                                <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', bgcolor: '#fff', overflow: 'hidden', mx: 2, mb: 2 }}>
                                    <SectionHeader icon={Users} title="Danh sách khách hàng trong kỳ" />
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <THLeft>STT</THLeft>
                                                    <THLeft>Mã receiver</THLeft>
                                                    <THLeft>Tên receiver</THLeft>
                                                    <TH>Số phiếu xuất</TH>
                                                    <TH>Tổng SL xuất</TH>
                                                    <TH>Giá trị xuất hàng</TH>
                                                    <TH>Tỷ trọng</TH>
                                                    <TH>Kỳ trước</TH>
                                                    <TH>Tăng / Giảm</TH>
                                                    <TH>Tăng trưởng</TH>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {receiverTop.map((r, i) => {
                                                    const prevRcvValue = r.totalValue / (1 + r.growth / 100);
                                                    const rcvChangeVal = calcChange(r.totalValue, prevRcvValue);
                                                    return (
                                                        <TableRow key={r.code} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontSize: '12px' }}>{i + 1}</TableCell>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 500, fontSize: '12px' }}>{r.code}</TableCell>
                                                            <TableCell sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontSize: '13px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.deliveryNotes)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(r.totalQty)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatVND(r.totalValue)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{formatShare(r.share)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{formatVND(prevRcvValue)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(rcvChangeVal), fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatSignedCurrency(rcvChangeVal)}</TableCell>
                                                            <TableCell align="right" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6', color: changeColor(r.growth), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatSignedPercent(r.growth)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Box>
                        )}

                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
