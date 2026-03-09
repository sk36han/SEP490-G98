import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    User,
    Calendar,
    FileText,
    ImageIcon,
    Eye,
    Package,
    CheckCircle,
    XCircle,
    Clock,
} from 'lucide-react';
import { Chip } from '@mui/material';
import '../styles/CreateSupplier.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

// Tham khảo style trạng thái từ ViewGoodReceiptNotesList
const STATUS_STYLE = {
    Draft: { bgColor: 'rgba(107,114,128,0.15)', label: 'Nháp', dot: '•', color: '#4b5563' },
    Submitted: { bgColor: 'rgba(59,130,246,0.15)', label: 'Đã gửi duyệt', dot: '•', color: '#1d4ed8' },
    Approved: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã duyệt', dot: '•', color: '#047857' },
    Rejected: { bgColor: 'rgba(239,68,68,0.15)', label: 'Từ chối', dot: '•', color: '#b91c1c' },
    Posted: { bgColor: 'rgba(139,92,246,0.15)', label: 'Đã ghi sổ', dot: '•', color: '#6d28d9' },
};

const RECEIVING_STATUS_STYLE = {
    NotStarted: { bgColor: 'rgba(107,114,128,0.15)', label: 'Chưa nhập', dot: '•', color: '#4b5563' },
    Partial: { bgColor: 'rgba(251,191,36,0.20)', label: 'Nhập một phần', dot: '•', color: '#b45309' },
    Completed: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã nhập đủ', dot: '•', color: '#047857' },
};

const ViewGoodReceiptNoteDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});

    // Mock data – sau này sẽ thay bằng API theo id
    const [grnData, setGrnData] = useState(null);

    useEffect(() => {
        // Giả lập gọi API
        setLoading(true);
        setTimeout(() => {
            setGrnData({
                grnId: id || 1,
                grnCode: 'GRN-2025-001',
                referencePoCode: 'PO-2025-001',
                warehouseName: 'Kho Hà Nội',
                supplierName: 'Công ty TNHH ABC',
                receiptDate: '2025-02-10',
                creatorName: 'Nguyễn Văn A',
                createdAt: '2025-02-09 08:00',
                status: 'Approved',
                receivingStatus: 'Completed',
                note: 'Phiếu nhập kho cho đơn mua PO-2025-001, đã kiểm tra số lượng và chất lượng.',
                lines: [
                    {
                        id: 1,
                        itemName: 'Laptop Dell XPS 13',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 10,
                        receivedQty: 10,
                        hasCO: true,
                        hasCQ: true,
                        note: 'Hàng nguyên seal, đủ phụ kiện.',
                    },
                    {
                        id: 2,
                        itemName: 'Màn hình LG 27 inch',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 5,
                        receivedQty: 5,
                        hasCO: false,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 3,
                        itemName: 'Bàn phím cơ Keychron',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 15,
                        receivedQty: 14,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Thiếu 1 cái, nhà cung cấp sẽ giao bù.',
                    },
                    {
                        id: 4,
                        itemName: 'Chuột Logitech MX Master 3',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 8,
                        receivedQty: 8,
                        hasCO: true,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 5,
                        itemName: 'Tai nghe Sony WH-1000XM4',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 6,
                        receivedQty: 6,
                        hasCO: false,
                        hasCQ: true,
                        note: 'Đã test chất lượng OK.',
                    },
                    {
                        id: 6,
                        itemName: 'Webcam Logitech C920',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 12,
                        receivedQty: 10,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Còn thiếu 2 cái sẽ nhập đợt sau.',
                    },
                    {
                        id: 7,
                        itemName: 'Ổ cứng SSD Samsung 1TB',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 20,
                        receivedQty: 10,
                        hasCO: true,
                        hasCQ: true,
                        note: 'Nhập từng đợt theo kế hoạch.',
                    },
                    {
                        id: 8,
                        itemName: 'RAM Corsair 16GB DDR4',
                        itemImage: null,
                        uom: 'Thanh',
                        orderedQty: 24,
                        receivedQty: 24,
                        hasCO: false,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 9,
                        itemName: 'Đế tản nhiệt laptop Cooler Master',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 18,
                        receivedQty: 18,
                        hasCO: true,
                        hasCQ: false,
                        note: '',
                    },
                    {
                        id: 10,
                        itemName: 'Loa Bluetooth JBL Flip 5',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 10,
                        receivedQty: 5,
                        hasCO: false,
                        hasCQ: false,
                        note: 'Đã nhận 1/2 số lượng.',
                    },
                    {
                        id: 11,
                        itemName: 'Cáp HDMI 2.1 - 2m',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Sợi',
                        orderedQty: 50,
                        receivedQty: 50,
                        hasCO: false,
                        hasCQ: false,
                        note: '',
                    },
                    {
                        id: 12,
                        itemName: 'USB Hub Anker 7-Port',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 30,
                        receivedQty: 20,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Thiếu 10 cái, NCC cam kết giao bù.',
                    },
                ],
            });
            setLoading(false);
        }, 300);
    }, [id]);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const u = new URL(url);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleImageError = (id) => {
        setImageErrors((prev) => ({ ...prev, [id]: true }));
    };

    const handleBack = () => navigate(-1);

    if (loading || !grnData) {
        return (
            <div className="create-supplier-page">
                <div className="page-header">
                    <div className="page-header-left">
                        <button type="button" onClick={handleBack} className="back-button">
                            <ArrowLeft size={20} />
                            <span>Quay lại</span>
                        </button>
                    </div>
                </div>
                <div className="form-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Đang tải chi tiết phiếu nhập kho...</span>
                </div>
            </div>
        );
    }

    const totalQuantityOrdered = grnData.lines.reduce(
        (sum, line) => sum + (Number(line.orderedQty) || 0),
        0
    );
    const totalReceivedQty = grnData.lines.reduce(
        (sum, line) => sum + (Number(line.receivedQty) || 0),
        0
    );
    const orderValue = grnData.lines.reduce(
        (sum, line) => sum + (Number(line.receivedQty) || 0) * 1000000,
        0
    );
    const discountAmount = 0;
    const additionalCostTotal = 0;
    const grandTotal = orderValue - discountAmount + additionalCostTotal;

    const statusStyle = STATUS_STYLE[grnData.status] ?? {
        bgColor: 'rgba(107,114,128,0.15)',
        label: grnData.status ?? '-',
        dot: '•',
        color: '#4b5563',
    };
    const receivingStatusStyle = RECEIVING_STATUS_STYLE[grnData.receivingStatus] ?? {
        bgColor: 'rgba(107,114,128,0.15)',
        label: grnData.receivingStatus ?? '-',
        dot: '•',
        color: '#4b5563',
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleBack} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu nhập kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{grnData.grnCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: statusStyle.bgColor,
                                        color: statusStyle.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {grnData.status === 'Approved' && <CheckCircle size={16} />}
                                    {grnData.status === 'Rejected' && <XCircle size={16} />}
                                    {grnData.status === 'Submitted' && <Clock size={16} />}
                                    {grnData.status === 'Draft' && <Clock size={16} />}
                                    {statusStyle.label}
                                </div>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: receivingStatusStyle.bgColor,
                                        color: receivingStatusStyle.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {grnData.receivingStatus === 'Completed' && <CheckCircle size={16} />}
                                    {grnData.receivingStatus === 'Partial' && <Clock size={16} />}
                                    {grnData.receivingStatus === 'NotStarted' && <Clock size={16} />}
                                    {receivingStatusStyle.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bố cục giống ViewPurchaseOrderDetail:
                        - Hàng 1: Trái = Chi tiết sản phẩm, Phải = Thông tin phiếu + Thông tin chung
                        - Hàng 2: Trái = Nhà cung cấp + Ghi chú + Tổng hợp, Phải = placeholder lịch sử */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1.8fr) 350px',
                            gap: '24px',
                            alignItems: 'flex-start',
                        }}
                    >
                        {/* Trái: Chi tiết sản phẩm nhập */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm nhập</h2>
                            </div>

                            {grnData.lines.length === 0 ? (
                                <div
                                    style={{
                                        padding: '24px 12px',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                        fontSize: 14,
                                    }}
                                >
                                    Chưa có sản phẩm nào trong phiếu nhập kho.
                                </div>
                            ) : (
                                <div className="table-container" style={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>STT</th>
                                                <th>Sản phẩm</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                                                <th style={{ width: '110px' }}>SL đặt</th>
                                                <th style={{ width: '110px' }}>SL nhập</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CO</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CQ</th>
                                                <th style={{ width: '200px' }}>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grnData.lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 12,
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                        {isValidImageUrl(line.itemImage) && !imageErrors[`line-${line.id}`] ? (
                                                            <img
                                                                src={line.itemImage}
                                                                alt={line.itemName}
                                                                onError={() => handleImageError(`line-${line.id}`)}
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    objectFit: 'cover',
                                                                    borderRadius: 6,
                                                                    border: '1px solid #e5e7eb',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: 6,
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <ImageIcon size={20} color="#9ca3af" />
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 8,
                                                                alignItems: 'center',
                                                                flex: 1,
                                                            }}
                                                        >
                                                            <a
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    // TODO: mở chi tiết sản phẩm khi có trang riêng
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
                                                            <button
                                                                type="button"
                                                                className="btn-icon-only"
                                                                style={{ color: '#2196F3' }}
                                                                title="Xem chi tiết sản phẩm"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </div>
                                                        </div>
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                            fontSize: 14,
                                                            color: '#374151',
                                                        }}
                                                    >
                                                        {line.uom || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                        {Number(line.orderedQty) || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                        {Number(line.receivedQty) || 0}
                                                    </td>
                                                    <td
                                                        style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                                        title="Chứng chỉ xuất xứ (CO)"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCO}
                                                            readOnly
                                                            disabled
                                                            style={{
                                                                width: 18,
                                                                height: 18,
                                                                cursor: 'default',
                                                                margin: 0,
                                                            }}
                                                        />
                                                    </td>
                                                    <td
                                                        style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                                        title="Chứng chỉ chất lượng (CQ)"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCQ}
                                                            readOnly
                                                            disabled
                                                            style={{
                                                                width: 18,
                                                                height: 18,
                                                                cursor: 'default',
                                                                margin: 0,
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div
                                                            style={{
                                                                fontSize: 13,
                                                                color: '#4b5563',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                            }}
                                                        >
                                                            {line.note || '—'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Phải: Thông tin chung (1 card, giống cấu trúc ViewPODetail) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Kho nhập</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.warehouseName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ngày nhập dự kiến</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.receiptDate}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.createdAt}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Đơn mua tham chiếu</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.referencePoCode || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                                {/* Trạng thái đã hiển thị trên header, không lặp lại tại đây */}
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 350px',
                            gap: '24px',
                            alignItems: 'start',
                            marginTop: 24,
                        }}
                    >
                        {/* Cột trái: Nhà cung cấp + Ghi chú + Tổng hợp phiếu nhập */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Package className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.supplierName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do nhập kho</label>
                                    <textarea
                                        value={grnData.note || ''}
                                        readOnly
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical', backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng đặt</label>
                                        <div
                                            style={{
                                                padding: '10px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: 8,
                                                fontWeight: 600,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {totalQuantityOrdered} sản phẩm
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Tạm tính</label>
                                        <div
                                            style={{
                                                padding: '10px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: 8,
                                                fontWeight: 600,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {formatCurrency(orderValue)}
                                        </div>
                                    </div>
                                    <div className="form-field span-2">
                                        {/* Phần text Chiết khấu + Chi phí giống Create/ViewPO (không có ô input, chỉ hiển thị) */}
                                        <label className="form-label">Chi phí</label>
                                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                <span style={{ color: '#ef4444' }}>
                                                    - {formatCurrency(discountAmount)}
                                                </span>
                                            </div>
                                            {additionalCostTotal > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: 6,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <span>Chi phí:</span>
                                                    <span style={{ color: '#10b981' }}>
                                                        + {formatCurrency(additionalCostTotal)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 16,
                                                padding: '20px',
                                                backgroundColor: '#e3f2fd',
                                                borderRadius: 12,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #2196F3',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    color: '#2196F3',
                                                }}
                                            >
                                                Tổng giá trị đơn:
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                    color: '#2196F3',
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải: placeholder lịch sử phiếu nhập (cho đồng nhất layout) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử phiếu nhập</h2>
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                                Chức năng lịch sử phiếu nhập sẽ được bổ sung sau.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewGoodReceiptNoteDetail;

