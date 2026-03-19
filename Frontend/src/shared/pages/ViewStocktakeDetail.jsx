import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    Package,
    ImageIcon,
    User,
    Warehouse,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Edit,
    Save,
    X,
    Plus,
    Search,
    Trash2,
    RotateCcw,
    Printer,
    Send,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// Mock items for product selection
const MOCK_ITEMS = [
    { id: 1, code: 'ITEM-001', name: 'Vật tư A', uom: 'Cái', image: null, systemQty: 150 },
    { id: 2, code: 'ITEM-002', name: 'Vật tư B', uom: 'Cái', image: null, systemQty: 85 },
    { id: 3, code: 'ITEM-003', name: 'Vật tư C', uom: 'Kg', image: null, systemQty: 200 },
    { id: 4, code: 'ITEM-004', name: 'Vật tư D', uom: 'Thùng', image: null, systemQty: 50 },
    { id: 5, code: 'ITEM-005', name: 'Vật tư E', uom: 'Cái', image: null, systemQty: 120 },
];

// Mock data for stocktake detail
const MOCK_STOCKTAKE = {
    id: 1,
    code: 'KK-20240315-001',
    warehouseId: 1,
    warehouseName: 'Kho HCM',
    warehouseCode: 'WH-HCM',
    mode: 'PERIODIC',
    modeLabel: 'Định kỳ',
    plannedAt: '2026-04-01T08:00:00',
    note: 'Kiểm kê định kỳ hàng tháng',
    creatorName: 'Nguyễn Văn A',
    status: 'APPROVED',
    statusLabel: 'Bản nháp',
    createdAt: '2024-03-15T08:00:00',
    lines: [
        { id: 1, itemId: 1, itemName: 'Vật tư A', itemCode: 'ITEM-001', uom: 'Cái', systemQty: 150, countedQty: null, varianceQty: 0 },
        { id: 2, itemId: 2, itemName: 'Vật tư B', itemCode: 'ITEM-002', uom: 'Cái', systemQty: 85, countedQty: null, varianceQty: 0 },
        { id: 3, itemId: 3, itemName: 'Vật tư C', itemCode: 'ITEM-003', uom: 'Kg', systemQty: 200, countedQty: null, varianceQty: 0 },
        { id: 4, itemId: 4, itemName: 'Vật tư D', itemCode: 'ITEM-004', uom: 'Thùng', systemQty: 50, countedQty: null, varianceQty: 0 },
        { id: 5, itemId: 5, itemName: 'Vật tư E', itemCode: 'ITEM-005', uom: 'Cái', systemQty: 120, countedQty: null, varianceQty: 0 },
        { id: 6, itemId: 6, itemName: 'Vật tư F', itemCode: 'ITEM-006', uom: 'Cái', systemQty: 75, countedQty: null, varianceQty: 0 },
        { id: 7, itemId: 7, itemName: 'Vật tư G', itemCode: 'ITEM-007', uom: 'Hộp', systemQty: 300, countedQty: null, varianceQty: 0 },
        { id: 8, itemId: 8, itemName: 'Vật tư H', itemCode: 'ITEM-008', uom: 'Kg', systemQty: 180, countedQty: null, varianceQty: 0 },
        { id: 9, itemId: 9, itemName: 'Vật tư I', itemCode: 'ITEM-009', uom: 'Cái', systemQty: 95, countedQty: null, varianceQty: 0 },
        { id: 10, itemId: 10, itemName: 'Vật tư J', itemCode: 'ITEM-010', uom: 'Thùng', systemQty: 45, countedQty: null, varianceQty: 0 },
        { id: 11, itemId: 11, itemName: 'Vật tư K', itemCode: 'ITEM-011', uom: 'Cái', systemQty: 220, countedQty: null, varianceQty: 0 },
        { id: 12, itemId: 12, itemName: 'Vật tư L', itemCode: 'ITEM-012', uom: 'Kg', systemQty: 160, countedQty: null, varianceQty: 0 },
        { id: 13, itemId: 13, itemName: 'Vật tư M', itemCode: 'ITEM-013', uom: 'Hộp', systemQty: 88, countedQty: null, varianceQty: 0 },
        { id: 14, itemId: 14, itemName: 'Vật tư N', itemCode: 'ITEM-014', uom: 'Cái', systemQty: 112, countedQty: null, varianceQty: 0 },
        { id: 15, itemId: 15, itemName: 'Vật tư O', itemCode: 'ITEM-015', uom: 'Thùng', systemQty: 60, countedQty: null, varianceQty: 0 },
        { id: 16, itemId: 16, itemName: 'Vật tư P', itemCode: 'ITEM-016', uom: 'Cái', systemQty: 135, countedQty: null, varianceQty: 0 },
        { id: 17, itemId: 17, itemName: 'Vật tư Q', itemCode: 'ITEM-017', uom: 'Kg', systemQty: 99, countedQty: null, varianceQty: 0 },
        { id: 18, itemId: 18, itemName: 'Vật tư R', itemCode: 'ITEM-018', uom: 'Hộp', systemQty: 250, countedQty: null, varianceQty: 0 },
        { id: 19, itemId: 19, itemName: 'Vật tư S', itemCode: 'ITEM-019', uom: 'Cái', systemQty: 42, countedQty: null, varianceQty: 0 },
        { id: 20, itemId: 20, itemName: 'Vật tư T', itemCode: 'ITEM-020', uom: 'Thùng', systemQty: 78, countedQty: null, varianceQty: 0 },
    ]
};

const STATUS_MAP = {
    'DRAFT': { label: 'Bản nháp', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' },
    'IN_PROGRESS': { label: 'Đang thực hiện', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    'PENDING_APPROVAL': { label: 'Chờ duyệt', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.2)' },
    'APPROVED': { label: 'Đã duyệt', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    'COMPLETED': { label: 'Hoàn thành', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    'CANCELLED': { label: 'Đã hủy', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
};

const MODE_MAP = {
    'PERIODIC': { label: 'Định kỳ', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    'ADHOC': { label: 'Đột xuất', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.2)' },
};

const ViewStocktakeDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [loading] = useState(false);
    const [basicEditing, setBasicEditing] = useState(false);
    const [isCounting, setIsCounting] = useState(false);
    const [countingCompleted, setCountingCompleted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [selectedLineIds, setSelectedLineIds] = useState([]);


    // Variance filter state
    const [varianceFilter, setVarianceFilter] = useState('all'); // 'all' | 'negative' | 'positive' | 'sufficient'
    const [lineSearchKeyword, setLineSearchKeyword] = useState('');
    const [pendingMarkSufficient, setPendingMarkSufficient] = useState(false); // confirm mode
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    // Mock data - trong thực tế sẽ gọi API
    const [stocktakeData, setStocktakeData] = useState(MOCK_STOCKTAKE);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // Count editing handlers
    const startCounting = () => {
        setIsCounting(true);
    };

    const stopCounting = () => {
        setStocktakeData(MOCK_STOCKTAKE);
        setIsCounting(false);
        setSelectedLineIds([]);
        setPendingMarkSufficient(false);
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev =>
            prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        // Select items with null/empty countedQty (no auto-fill)
        const emptyIds = filteredLines.filter(l => l.countedQty === '' || l.countedQty === null || l.countedQty === undefined).map(l => l.id);
        if (selectedLineIds.length === emptyIds.length && emptyIds.every(id => selectedLineIds.includes(id))) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(emptyIds);
        }
    };

    const handleMarkAllSufficient = () => {
        if (selectedLineIds.length === 0) return;
        setPendingMarkSufficient(true);
    };

    const confirmMarkSufficient = () => {
        setStocktakeData(prev => ({
            ...prev,
            lines: prev.lines.map(line => {
                if (!selectedLineIds.includes(line.id)) return line;
                return { ...line, countedQty: line.systemQty, varianceQty: 0 };
            })
        }));
        setSelectedLineIds([]);
        setPendingMarkSufficient(false);
    };

    const cancelMarkSufficient = () => {
        setPendingMarkSufficient(false);
    };

    // Update line data by line id
    const updateLine = (lineId, field, value) => {
        setStocktakeData(prev => {
            const newLines = prev.lines.map(line => {
                if (line.id !== lineId) return line;
                const updated = { ...line, [field]: value };

                // Auto calculate variance
                if (field === 'systemQty' || field === 'countedQty') {
                    const sysQty = parseFloat(updated.systemQty) || 0;
                    const cntQty = parseFloat(updated.countedQty) || 0;
                    updated.varianceQty = cntQty - sysQty;
                }

                return updated;
            });
            return { ...prev, lines: newLines };
        });
    };

    // Save basic info
    const handleSave = async () => {
        try {
            setSubmitting(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Lưu thay đổi thành công!', 'success');
            setBasicEditing(false);
        } catch (error) {
            showToast('Có lỗi xảy ra khi lưu', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate summary
    const summary = useMemo(() => {
        if (!stocktakeData.lines || stocktakeData.lines.length === 0) {
            return { totalItems: 0, totalSystemQty: 0, totalCountedQty: 0, totalVariance: 0, totalCounted: 0, missing: 0, excess: 0, sufficient: 0 };
        }

        const hasValue = (val) => val !== null && val !== undefined && val !== '';

        const totalSystemQty = stocktakeData.lines.reduce((sum, line) => sum + (line.systemQty || 0), 0);
        // Chỉ tính items đã nhập countedQty
        const countedLines = stocktakeData.lines.filter(l => hasValue(l.countedQty));
        const totalCountedQty = countedLines.reduce((sum, line) => sum + (parseFloat(line.countedQty) || 0), 0);
        const totalVariance = countedLines.reduce((sum, line) => sum + (line.varianceQty || 0), 0);

        const missing = countedLines.filter(l => l.varianceQty < 0).length;
        const excess = countedLines.filter(l => l.varianceQty > 0).length;
        const sufficient = countedLines.filter(l => l.varianceQty === 0).length;

        return {
            totalItems: stocktakeData.lines.length,
            totalSystemQty,
            totalCountedQty,
            totalVariance,
            totalCounted: countedLines.length,
            missing,
            excess,
            sufficient
        };
    }, [stocktakeData.lines]);

    // Filtered lines based on variance filter and search
    const filteredLines = useMemo(() => {
        let lines = stocktakeData.lines || [];

        // Apply variance filter
        if (varianceFilter === 'negative') {
            lines = lines.filter(l => l.varianceQty < 0);
        } else if (varianceFilter === 'positive') {
            lines = lines.filter(l => l.varianceQty > 0);
        } else if (varianceFilter === 'sufficient') {
            // Only items with countedQty entered and varianceQty = 0
            lines = lines.filter(l => l.countedQty !== null && l.countedQty !== undefined && l.countedQty !== '' && l.varianceQty === 0);
        }

        // Apply search filter
        if (lineSearchKeyword.trim()) {
            const kw = lineSearchKeyword.toLowerCase();
            lines = lines.filter(l =>
                l.itemName?.toLowerCase().includes(kw) ||
                l.itemCode?.toLowerCase().includes(kw)
            );
        }

        // Sort: selected first, then Thiếu -> Thừa -> Đủ -> Null
        lines = [...lines].sort((a, b) => {
            // Selected items first
            const aSelected = selectedLineIds.includes(a.id);
            const bSelected = selectedLineIds.includes(b.id);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            // Sort categories: 1=Thiếu, 2=Thừa, 3=Đủ, 4=Null
            const getSortOrder = (line) => {
                const hasValue = line.countedQty !== null && line.countedQty !== undefined && line.countedQty !== '';
                if (!hasValue) return 4; // Null
                const v = line.varianceQty || 0;
                if (v === 0) return 3; // Đủ
                if (v < 0) return 1; // Thiếu
                return 2; // Thừa
            };

            const orderA = getSortOrder(a);
            const orderB = getSortOrder(b);
            if (orderA !== orderB) return orderA - orderB;

            // Within same category, sort by variance value
            const vA = a.varianceQty || 0;
            const vB = b.varianceQty || 0;
            return vA - vB;
        });

        return lines;
    }, [stocktakeData.lines, varianceFilter, lineSearchKeyword, selectedLineIds]);

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isCounting && !basicEditing && stocktakeData.status === 'DRAFT' && !countingCompleted && (
                        <button type="button" className="btn btn-secondary" onClick={() => setBasicEditing(true)}>
                            <Edit size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                    {basicEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={() => {
                                setBasicEditing(false);
                            }} disabled={submitting}>
                                <X size={15} />
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }}></span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Lưu
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    {!isCounting && !basicEditing && stocktakeData.status !== 'DRAFT' && !countingCompleted && (
                        <button type="button" className="btn btn-secondary" onClick={() => setBasicEditing(true)}>
                            <Edit size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                    {!basicEditing && (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={() => showToast('In PDF', 'info')}>
                                <Printer size={15} />
                                In PDF
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => showToast('In A4', 'info')}>
                                <Printer size={15} />
                                In A4
                            </button>
                        </>
                    )}
                    {!isCounting && !basicEditing && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                if (!reportSent) {
                                    const hasEmpty = stocktakeData.lines.some(l => l.countedQty === null || l.countedQty === undefined || l.countedQty === '');
                                    if (hasEmpty) {
                                        showToast('Vui lòng nhập đầy đủ số lượng kiểm kê cho tất cả vật tư trước khi gửi báo cáo', 'warning');
                                        return;
                                    }
                                }
                                navigate(`/inventory/stocktakes/report/${stocktakeData.id}`, { state: { reportSent } });
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <Send size={16} />
                            {reportSent ? 'Xem báo cáo' : 'Gửi báo cáo'}
                        </button>
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu kiểm kê kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{stocktakeData.code}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {stocktakeData.mode && MODE_MAP[stocktakeData.mode] && (
                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 20,
                                            backgroundColor: MODE_MAP[stocktakeData.mode].bgColor,
                                            color: MODE_MAP[stocktakeData.mode].color,
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {MODE_MAP[stocktakeData.mode].label}
                                    </div>
                                )}
                                {stocktakeData.status && STATUS_MAP[stocktakeData.status] && (
                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 20,
                                            backgroundColor: STATUS_MAP[stocktakeData.status].bgColor,
                                            color: STATUS_MAP[stocktakeData.status].color,
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {stocktakeData.status === 'COMPLETED' && <CheckCircle size={16} />}
                                        {stocktakeData.status === 'CANCELLED' && <XCircle size={16} />}
                                        {(stocktakeData.status === 'DRAFT' || stocktakeData.status === 'PENDING_APPROVAL' || stocktakeData.status === 'IN_PROGRESS') && <Clock size={16} />}
                                        {STATUS_MAP[stocktakeData.status].label}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Line items (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Trái: Danh sách vật tư + Ghi chú + Tổng kết */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. Danh sách vật tư */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
                                    {!isCounting && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                if (stocktakeData.status !== 'APPROVED') {
                                                    showToast('Chỉ phiếu đã duyệt mới có thể bắt đầu kiểm kê', 'warning');
                                                    return;
                                                }
                                                const now = new Date();
                                                const planned = stocktakeData.plannedAt ? new Date(stocktakeData.plannedAt) : null;
                                                if (!planned || now >= planned) {
                                                    setConfirmDialogOpen(true);
                                                } else {
                                                    showToast('Chưa đến ngày giờ dự kiến kiểm kê', 'warning');
                                                }
                                            }}
                                            style={{ fontSize: '13px', height: '36px', padding: '0 16px' }}
                                        >
                                            Bắt đầu kiểm kê
                                        </button>
                                    )}
                                    {isCounting && (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {selectedLineIds.length > 0 && !pendingMarkSufficient && (
                                                <button type="button" onClick={handleMarkAllSufficient} className="btn btn-sm btn-card-text" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }} title="Đánh dấu tất cả những sản phẩm chưa điền.">
                                                    <CheckCircle size={14} />
                                                    Đánh dấu tất cả là đã đủ
                                                </button>
                                            )}
                                            {pendingMarkSufficient && (
                                                <>
                                                    <button type="button" onClick={cancelMarkSufficient} className="btn btn-sm btn-card-text" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}>
                                                        Hủy
                                                    </button>
                                                    <button type="button" onClick={confirmMarkSufficient} className="btn btn-sm" style={{ fontSize: '12px', height: '32px', padding: '0 12px', backgroundColor: '#16a34a', color: 'white', border: 'none' }}>
                                                        Xác nhận
                                                    </button>
                                                </>
                                            )}
                                            {!pendingMarkSufficient && (
                                                <>
                                                    <button type="button" onClick={stopCounting} className="btn btn-cancel" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}>
                                                        Hủy
                                                    </button>
                                                    <button type="button" onClick={() => {
                                                        const hasEmptyCounted = stocktakeData.lines.some(l => l.countedQty === null || l.countedQty === undefined || l.countedQty === '');
                                                        if (hasEmptyCounted) {
                                                            showToast('Vui lòng nhập đầy đủ số lượng kiểm kê cho tất cả vật tư trước khi lưu', 'warning');
                                                            return;
                                                        }
                                                        showToast('Lưu số lượng kiểm kê thành công', 'success');
                                                        setIsCounting(false);
                                                        setCountingCompleted(true);
                                                    }} className="btn btn-primary" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}>
                                                        Lưu
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Variance Filter + Search Row */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    {/* Search Input */}
                                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            value={lineSearchKeyword}
                                            onChange={(e) => setLineSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư theo tên, mã..."
                                            className="form-input line-search-input"
                                        />
                                        {lineSearchKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setLineSearchKeyword('')}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Variance Filter Chips */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('all')}
                                            className={`variance-chip ${varianceFilter === 'all' ? 'active' : ''}`}
                                            data-variance="all"
                                        >
                                            Tất cả
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('negative')}
                                            className={`variance-chip ${varianceFilter === 'negative' ? 'active' : ''}`}
                                            data-variance="negative"
                                        >
                                            Thiếu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('positive')}
                                            className={`variance-chip ${varianceFilter === 'positive' ? 'active' : ''}`}
                                            data-variance="positive"
                                        >
                                            Thừa                                
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('sufficient')}
                                            className={`variance-chip ${varianceFilter === 'sufficient' ? 'active' : ''}`}
                                            data-variance="sufficient"
                                        >
                                            Đủ
                                        </button>
                                    </div>
                                </div>

                                {/* Empty state - no lines at all */}
                                {(!stocktakeData.lines || stocktakeData.lines.length === 0) && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                    </div>
                                )}

                                {/* Lines table */}
                                {stocktakeData.lines && stocktakeData.lines.length > 0 && (
                                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    {isCounting && (
                                                        <th style={{ width: '60px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLineIds.length === filteredLines.length && filteredLines.length > 0}
                                                                onChange={toggleSelectAll}
                                                                style={{ cursor: 'pointer' }}
                                                                title="Đánh dấu tất cả những sản phẩm chưa điền."
                                                            />
                                                        </th>
                                                    )}
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL đã kiểm kê</th>
                                                    <th style={{ width: '80px', textAlign: 'right' }}>Chênh lệch</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        {isCounting && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={() => toggleLineSelection(line.id)} style={{ cursor: 'pointer' }} />
                                                            </td>
                                                        )}
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                {isValidImageUrl(line.itemImage) ? (
                                                                    <img src={line.itemImage} alt={line.itemName} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                        <a
                                                                            href="#"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                navigate(`/items/${line.itemId}`);
                                                                            }}
                                                                            style={{
                                                                                color: '#2196F3',
                                                                                textDecoration: 'none',
                                                                                fontSize: 14,
                                                                                fontWeight: 500,
                                                                                flex: 1,
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.textDecoration = 'underline';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.textDecoration = 'none';
                                                                            }}
                                                                        >
                                                                            {line.itemName}
                                                                        </a>
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                        Mã: {line.itemCode} • ĐVT: {line.uom}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.systemQty || 0}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {isCounting ? (
                                                                <input
                                                                    type="number"
                                                                    value={line.countedQty ?? ''}
                                                                    onChange={(e) => updateLine(line.id, 'countedQty', e.target.value)}
                                                                    className="form-input"
                                                                    style={{ textAlign: 'right', fontSize: '13px', width: '100%' }}
                                                                    placeholder="0"
                                                                />
                                                            ) : (
                                                                <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                    {line.countedQty ?? '-'}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: (line.countedQty === null || line.countedQty === undefined || line.countedQty === '') ? '#9ca3af' : line.varianceQty > 0 ? '#2196F3' : line.varianceQty < 0 ? '#dc2626' : '#16a34a' }}>
                                                            {line.countedQty === null || line.countedQty === undefined || line.countedQty === '' ? '-' : line.varianceQty < 0 ? `Thiếu ${Math.abs(line.varianceQty)}` : line.varianceQty > 0 ? `Thừa ${line.varianceQty}` : 'Đủ'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 2. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field" style={{ position: 'relative' }}>
                                    {basicEditing && !isCounting ? (
                                        <>
                                            <textarea
                                                value={stocktakeData.note || ''}
                                                onChange={(e) => setStocktakeData(prev => ({ ...prev, note: e.target.value }))}
                                                className="form-textarea"
                                                rows={4}
                                                placeholder="Nhập ghi chú (nếu có)"
                                                style={{ width: '100%', minHeight: '100px' }}
                                            />
                                            <span style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '12px', color: '#9ca3af' }}>
                                                {(stocktakeData.note || '').length} / 500
                                            </span>
                                        </>
                                    ) : (
                                        <div className="form-textarea" style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                            {stocktakeData.note || '—'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Tổng kết */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng kết phiếu kiểm kê kho</h2>
                                </div>
                                <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalItems}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Đã kiểm kê:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalCounted} / {summary.totalItems}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thiếu:</span>
                                        <span style={{ fontWeight: 600, color: '#dc2626' }}>{summary.missing}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thừa:</span>
                                        <span style={{ fontWeight: 600, color: '#2196F3' }}>{summary.excess}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư đủ:</span>
                                        <span style={{ fontWeight: 600, color: '#16a34a' }}>{summary.sufficient}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng hệ thống:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalSystemQty}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng kiểm kê:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalCounted === 0 ? 'Chưa thực hiện kiểm kê kho' : summary.totalCountedQty}</span>
                                    </div>
                                    {summary.totalCounted > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                            Tổng chênh lệch:
                                        </span>
                                        <span style={{ fontSize: '24px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                            {summary.totalVariance > 0 ? `Thừa ${summary.excess} sản phẩm` : summary.totalVariance < 0 ? `Thiếu ${summary.missing} sản phẩm` : 'Đủ'}
                                        </span>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Phải: Thông tin chung */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Ngày giờ tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày giờ tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.createdAt ? new Date(stocktakeData.createdAt).toLocaleString('vi-VN') : ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.creatorName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Kho */}
                                <div className="form-field">
                                    <label className="form-label">Kho</label>
                                    <div className="input-wrapper">
                                        <Warehouse className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.warehouseName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Ngày giờ dự kiến */}
                                <div className="form-field">
                                    <label className="form-label">Ngày giờ dự kiến kiểm kê</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        {basicEditing && !isCounting ? (
                                            <input
                                                type="datetime-local"
                                                value={stocktakeData.plannedAt ? stocktakeData.plannedAt.slice(0, 16) : ''}
                                                onChange={(e) => setStocktakeData(prev => ({ ...prev, plannedAt: e.target.value }))}
                                                className="form-input"
                                            />
                                        ) : (
                                            <input type="text" value={stocktakeData.plannedAt ? new Date(stocktakeData.plannedAt).toLocaleString('vi-VN') : ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            {/* Confirm Dialog - Bắt đầu kiểm kê */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '480px',
                        borderRadius: '16px',
                        border: '1px solid var(--slate-200, #e5e7eb)',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    },
                }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, fontSize: '18px', fontWeight: 600 }}>
                    Xác nhận bắt đầu kiểm kê
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                        Khi bắt đầu kiểm kê, <strong>CÁC GIAO DỊCH trong kho sẽ bị khóa</strong>. Bạn có muốn tiếp tục?
                    </p>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
                    <button
                        type="button"
                        onClick={() => setConfirmDialogOpen(false)}
                        className="btn btn-cancel"
                        style={{ minWidth: '72px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setConfirmDialogOpen(false);
                            startCounting();
                        }}
                        style={{ minWidth: '110px', height: '40px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
                    >
                        Xác nhận
                    </button>
                </DialogActions>
            </Dialog>

            {/* Toast Notification */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default ViewStocktakeDetail;
