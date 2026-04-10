import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    Save,
    Loader,
    Trash2,
    Package,
    Search,
    MapPin,
    Truck,
    Phone,
    FileText,
    ClipboardList,
    CreditCard,
    ChevronRight,
    User,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateGoodDeliveryNote.css'; // Đảm bảo đúng đường dẫn
import { createGoodsDeliveryNote } from '../lib/goodsDeliveryNoteService';
import { getReleaseRequestDetail, getReleaseRequests } from '../lib/releaseRequestService';
import { getItemsForDisplay } from '../lib/itemService';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString('en-CA');
const MAX_NOTE_LENGTH = 1000;

const PAYMENT_METHOD_OPTIONS = [
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
    { value: 'CARD', label: 'Thẻ thanh toán' },
    { value: 'E_WALLET', label: 'Ví điện tử' },
    { value: 'OTHER', label: 'Khác' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateLineId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) =>
    String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(value));

const formatQuantity = (value) =>
    toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

const getRemainingQty = (line) => {
    const approvedQty = toNumber(line?.approvedQty ?? line?.ApprovedQty ?? 0);
    const allocatedQty = toNumber(line?.allocatedQty ?? line?.AllocatedQty ?? 0);
    const issuedQty = toNumber(line?.issuedQty ?? line?.IssuedQty ?? 0);
    const baseQty = allocatedQty > 0 ? allocatedQty : approvedQty;
    return Math.max(baseQty - issuedQty, 0);
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateGoodDeliveryNote() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();

    // ─── States ──────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        releaseRequestId: '',
        releaseRequestCode: '',
        warehouseId: '',
        warehouseName: '',
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        requestedByName: '',
        requestedDate: '',
        issueDate: TODAY,
        createdByName: 'Nguyễn Văn A',
        note: '',
        shippingFee: '',
        isPaid: false,
        paymentMethod: 'CASH',
        pickingStrategy: 'FIFO',
        carrierName: '',
        driverName: '',
        driverPhone: '',
        licensePlate: '',
        transportNote: '',
    });

    const [lines, setLines] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedSearchLineIds, setSelectedSearchLineIds] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([]);

    const releaseRequestDropdownRef = useRef(null);
    const [releaseRequestDropdownOpen, setReleaseRequestDropdownOpen] = useState(false);
    const [releaseRequestQuery, setReleaseRequestQuery] = useState('');
    const [selectedReleaseRequestDetail, setSelectedReleaseRequestDetail] = useState(null);
    const [rrList, setRrList] = useState([]);
    const [rrListLoading, setRrListLoading] = useState(false);

    // ─── Effects ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const queryId = searchParams.get('releaseRequestId') || searchParams.get('rrId');
        if (queryId) {
            getReleaseRequestDetail(queryId).then(data => {
                if (data) handleSelectReleaseRequest(data);
            });
        }
    }, [searchParams]);

    useEffect(() => {
        const loadInitialData = async () => {
            setRrListLoading(true);
            try {
                const [rrRes, itemRes] = await Promise.all([
                    getReleaseRequests({ page: 1, pageSize: 100 }),
                    getItemsForDisplay()
                ]);
                setRrList(rrRes.items || []);
                setItems(Array.isArray(itemRes) ? itemRes : []);
            } catch (err) {
                console.error('Initial load failed', err);
            } finally {
                setRrListLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (releaseRequestDropdownRef.current && !releaseRequestDropdownRef.current.contains(e.target)) {
                setReleaseRequestDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Derived Data ────────────────────────────────────────────────────────
    const subtotal = useMemo(() => lines.reduce((sum, l) => sum + toNumber(l.lineTotal), 0), [lines]);
    const grandTotal = subtotal + toNumber(formData.shippingFee);

    const filteredReleaseRequests = useMemo(() => {
        const keyword = normalizeText(releaseRequestQuery.trim());
        if (!keyword) return rrList;
        return rrList.filter(r => 
            normalizeText(r.releaseRequestCode).includes(keyword) || 
            normalizeText(r.receiverName).includes(keyword)
        );
    }, [releaseRequestQuery, rrList]);

    const remainingSelectableLines = useMemo(() => {
        if (!selectedReleaseRequestDetail) return [];
        const selectedLineIds = new Set(lines.map(l => l.releaseRequestLineId));
        return (selectedReleaseRequestDetail.lines || [])
            .filter(l => getRemainingQty(l) > 0 && !selectedLineIds.has(l.releaseRequestLineId));
    }, [selectedReleaseRequestDetail, lines]);

    const filteredProducts = useMemo(() => {
        const keyword = normalizeText(searchKeyword.trim());
        return remainingSelectableLines.filter(l => 
            normalizeText(l.itemName).includes(keyword) || normalizeText(l.itemCode).includes(keyword)
        );
    }, [remainingSelectableLines, searchKeyword]);

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleSelectReleaseRequest = async (rr) => {
        let detail = rr;
        if (!rr.lines || rr.lines.length === 0) {
            try {
                detail = await getReleaseRequestDetail(rr.releaseRequestId);
            } catch {
                showToast('Không tải được chi tiết yêu cầu.', 'error');
                return;
            }
        }

        const initialLines = (detail.lines || [])
            .filter(l => getRemainingQty(l) > 0)
            .map(l => ({
                id: generateLineId(),
                releaseRequestLineId: l.releaseRequestLineId,
                itemId: l.itemId,
                itemCode: l.itemCode,
                itemName: l.itemName,
                uomName: l.uomName,
                uomId: l.uomId,
                remainingQty: getRemainingQty(l),
                actualQty: getRemainingQty(l),
                unitPrice: 0, // Giá có thể lấy từ bảng items nếu cần
                lineTotal: 0,
                note: ''
            }));

        setSelectedReleaseRequestDetail(detail);
        setLines(initialLines);
        setReleaseRequestQuery(detail.releaseRequestCode);
        setReleaseRequestDropdownOpen(false);
        
        setFormData(prev => ({
            ...prev,
            releaseRequestId: String(detail.releaseRequestId),
            releaseRequestCode: detail.releaseRequestCode,
            warehouseId: String(detail.warehouseId),
            warehouseName: detail.warehouseName,
            receiverName: detail.receiverName,
            receiverPhone: detail.receiverPhone || '',
            receiverAddress: detail.address || '',
            requestedByName: detail.requestedByName,
            requestedDate: detail.requestedDate,
        }));
    };

    const updateLine = (index, field, value) => {
        setLines(prev => prev.map((l, i) => {
            if (i !== index) return l;
            if (field === 'actualQty') {
                const qty = Math.min(Math.max(toNumber(value), 0), l.remainingQty);
                return { ...l, actualQty: qty, lineTotal: qty * toNumber(l.unitPrice) };
            }
            return { ...l, [field]: value };
        }));
    };

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.releaseRequestId) nextErrors.releaseRequestCode = 'Vui lòng chọn yêu cầu xuất';
        if (!lines.length) nextErrors.lines = 'Chưa có vật tư nào';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const payload = {
                ReleaseRequestId: Number(formData.releaseRequestId),
                WarehouseId: Number(formData.warehouseId),
                IssueDate: formData.issueDate,
                Status: 'PENDING_ACC',
                PickingStrategy: formData.pickingStrategy,
                ShippingFee: toNumber(formData.shippingFee),
                IsPaid: formData.isPaid,
                PaymentMethod: formData.isPaid ? formData.paymentMethod : null,
                Note: formData.note,
                Lines: lines.map(l => ({
                    ItemId: l.itemId,
                    ActualQty: l.actualQty,
                    ReleaseRequestLineId: l.releaseRequestLineId,
                    UnitPrice: l.unitPrice,
                    Note: l.note
                })),
                TransportInfo: {
                    CarrierName: formData.carrierName,
                    DriverName: formData.driverName,
                    LicensePlate: formData.licensePlate
                }
            };
            await createGoodsDeliveryNote(payload);
            showToast('Tạo phiếu thành công!', 'success');
            setTimeout(() => navigate('/goods-delivery-notes'), 1200);
        } catch (e) {
            showToast(e.message || 'Lỗi server', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                    <h1 className="page-title" style={{margin: 0, fontSize: '20px'}}>Tạo phiếu xuất hàng</h1>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-cancel" onClick={() => navigate(-1)}>Hủy</button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader className="spinner" size={16}/> : <Save size={16}/>}
                        Lưu phiếu xuất
                    </button>
                </div>
            </div>

            <div className="gdn-layout-container">
                {/* ─── CỘT TRÁI (Main) ─── */}
                <div className="gdn-main-content">
                    
                    {/* Card 1: Reference */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title"><ClipboardList size={18} color="#0284c7"/> Thông tin nguồn xuất</h2>
                        </div>
                        <div className="gdn-card-body">
                            {!formData.releaseRequestId ? (
                                <div className="gdn-rr-selector" ref={releaseRequestDropdownRef}>
                                    <div className="input-wrapper">
                                        <Search size={16} className="input-icon-left" />
                                        <input
                                            className={`form-input ${errors.releaseRequestCode ? 'error' : ''}`}
                                            placeholder="Tìm mã yêu cầu xuất hàng..."
                                            value={releaseRequestQuery}
                                            onFocus={() => setReleaseRequestDropdownOpen(true)}
                                            onChange={(e) => setReleaseRequestQuery(e.target.value)}
                                        />
                                    </div>
                                    {releaseRequestDropdownOpen && (
                                        <div className="gdn-rr-dropdown">
                                            {filteredReleaseRequests.map(rr => (
                                                <div key={rr.releaseRequestId} className="gdn-rr-item" onClick={() => handleSelectReleaseRequest(rr)}>
                                                    <div style={{fontWeight: 700}}>{rr.releaseRequestCode}</div>
                                                    <div style={{fontSize: '12px', color: '#64748b'}}>{rr.receiverName} - {rr.warehouseName}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.releaseRequestCode && <p className="error-message">{errors.releaseRequestCode}</p>}
                                </div>
                            ) : (
                                <div className="gdn-reference-box">
                                    <button className="gdn-ref-change-btn" onClick={() => setFormData(p => ({...p, releaseRequestId: ''}))}>Thay đổi</button>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Mã tham chiếu</span>
                                        <span className="gdn-ref-value" style={{color: '#0284c7'}}>{formData.releaseRequestCode}</span>
                                    </div>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Kho xuất hàng</span>
                                        <span className="gdn-ref-value">{formData.warehouseName}</span>
                                    </div>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Người yêu cầu</span>
                                        <span className="gdn-ref-value">{formData.requestedByName}</span>
                                    </div>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Ngày yêu cầu</span>
                                        <span className="gdn-ref-value">{formData.requestedDate}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Items Table */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title"><Package size={18} color="#059669"/> Danh sách vật tư thực xuất</h2>
                            <div className="gdn-card-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => setLines(lines.map(l => ({...l, actualQty: l.remainingQty})))}>
                                    Khớp SL còn lại
                                </button>
                            </div>
                        </div>
                        <div className="gdn-card-body" style={{padding: '0 24px'}}>
                            {!lines.length ? (
                                <div className="gdn-empty-state">
                                    <Package size={48} strokeWidth={1} />
                                    <p className="gdn-empty-state-title">Chưa có vật tư</p>
                                    <p className="gdn-empty-state-desc">Vui lòng chọn yêu cầu xuất trước</p>
                                </div>
                            ) : (
                                <div className="gdn-table-wrapper">
                                    <table className="gdn-table">
                                        <thead>
                                            <tr>
                                                <th>Vật tư</th>
                                                <th style={{textAlign: 'right'}}>SL Còn lại</th>
                                                <th style={{width: '140px', textAlign: 'center'}}>Thực xuất</th>
                                                <th style={{width: '200px'}}>Ghi chú dòng</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => (
                                                <tr key={line.id}>
                                                    <td>
                                                        <div style={{fontWeight: 600, color: '#1e293b'}}>{line.itemName}</div>
                                                        <div style={{fontSize: '11px', color: '#64748b'}}>{line.itemCode}</div>
                                                    </td>
                                                    <td style={{textAlign: 'right', fontWeight: 600}}>
                                                        {formatQuantity(line.remainingQty)} <span style={{fontSize: '11px', fontWeight: 400}}>{line.uomName}</span>
                                                    </td>
                                                    <td>
                                                        <div className="gdn-qty-input-container" style={{margin: '0 auto'}}>
                                                            <input
                                                                type="number"
                                                                className="gdn-qty-input-field"
                                                                value={line.actualQty}
                                                                onChange={(e) => updateLine(idx, 'actualQty', e.target.value)}
                                                            />
                                                            <span className="gdn-qty-unit">{line.uomName}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input 
                                                            className="form-input" 
                                                            style={{fontSize: '12px', padding: '6px 8px'}} 
                                                            placeholder="Ghi chú..."
                                                            value={line.note}
                                                            onChange={(e) => updateLine(idx, 'note', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{textAlign: 'center'}}>
                                                        <button className="btn-icon-only" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                                                            <Trash2 size={16} color="#ef4444"/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 3: Transport */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title"><Truck size={18} color="#6366f1"/> Thông tin vận chuyển</h2>
                        </div>
                        <div className="gdn-card-body">
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px'}}>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Hãng vận chuyển</label>
                                    <input className="form-input" name="carrierName" value={formData.carrierName} onChange={(e) => setFormData({...formData, carrierName: e.target.value})} />
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Tài xế & SĐT</label>
                                    <input className="form-input" placeholder="Tên tài xế - 09xx" name="driverName" value={formData.driverName} onChange={(e) => setFormData({...formData, driverName: e.target.value})} />
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Biển số xe</label>
                                    <input className="form-input" placeholder="29A-123.45" name="licensePlate" value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── CỘT PHẢI (Sidebar) ─── */}
                <div className="gdn-sidebar">
                    
                    {/* Sidebar Card 1: Receiver */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title"><User size={16}/> Người nhận</h2>
                        </div>
                        <div className="gdn-card-body">
                            {formData.receiverName ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    <div style={{fontWeight: 700, fontSize: '15px'}}>{formData.receiverName}</div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569'}}>
                                        <Phone size={14}/> {formData.receiverPhone || 'N/A'}
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#64748b'}}>
                                        <MapPin size={14} style={{marginTop: '2px'}}/> {formData.receiverAddress || 'N/A'}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-muted" style={{fontSize: '13px'}}>Chưa có thông tin người nhận</div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Card 2: Strategy */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">Chiến lược xuất</h2>
                        </div>
                        <div className="gdn-card-body">
                            <div className="gdn-strategy-toggle">
                                <div 
                                    className={`gdn-strategy-option ${formData.pickingStrategy === 'FIFO' ? 'active' : ''}`}
                                    onClick={() => setFormData({...formData, pickingStrategy: 'FIFO'})}
                                >
                                    FIFO
                                </div>
                                <div 
                                    className={`gdn-strategy-option ${formData.pickingStrategy === 'LIFO' ? 'active' : ''}`}
                                    onClick={() => setFormData({...formData, pickingStrategy: 'LIFO'})}
                                >
                                    LIFO
                                </div>
                            </div>
                            <p style={{fontSize: '11px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic'}}>
                                * FIFO: Nhập trước xuất trước.
                            </p>
                        </div>
                    </div>

                    {/* Sidebar Card 3: Payment Summary */}
                    <div className="gdn-modern-card" style={{border: '2px solid #dcfce7'}}>
                        <div className="gdn-card-header" style={{backgroundColor: '#f0fdf4'}}>
                            <h2 className="gdn-card-title"><CreditCard size={16}/> Tổng kết</h2>
                        </div>
                        <div className="gdn-card-body">
                            <div className="gdn-payment-summary">
                                <div className="gdn-payment-row">
                                    <span className="gdn-label">Tiền hàng:</span>
                                    <span style={{fontWeight: 600}}>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Phí vận chuyển:</label>
                                    <div className="input-wrapper">
                                        <input 
                                            type="number" 
                                            className="form-input" 
                                            style={{textAlign: 'right'}}
                                            value={formData.shippingFee}
                                            onChange={(e) => setFormData({...formData, shippingFee: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="gdn-total-row">
                                    <span className="gdn-total-label">TỔNG CỘNG:</span>
                                    <span className="gdn-total-amount">{formatCurrency(grandTotal)}</span>
                                </div>
                                
                                <div style={{marginTop: '10px'}}>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                                        <input type="checkbox" checked={formData.isPaid} onChange={(e) => setFormData({...formData, isPaid: e.target.checked})} />
                                        <span className="gdn-label">Đã thanh toán</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}