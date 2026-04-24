import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    Save,
    Loader,
    Trash2,
    Package,
    Search,
    MapPin,
    Truck,
    Phone,
    ClipboardList,
    User,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateGoodDeliveryNote.css'; // Đảm bảo đúng đường dẫn
import { createGoodsDeliveryNote } from '../lib/goodsDeliveryNoteService';
import { getDeliveries, getDeliveryHistory, normalizeTransportInfoFields } from '../lib/deliveryService';
import { getReleaseRequestDetail, getReleaseRequests } from '../lib/releaseRequestService';
import { formatLocalDateOnly, getLocalNowIso, normalizeDateOnlyLocalInput } from '../lib/dateUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = formatLocalDateOnly();
/** Luôn gửi FIFO — không hiển thị chọn trên form. */
const PICKING_STRATEGY_FIFO = 'FIFO';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateLineId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) =>
    String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
        note: '',
        carrierName: '',
        driverName: '',
        driverPhone: '',
        licensePlate: '',
        transportNote: '',
    });

    const [lines, setLines] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [createdAtClient, setCreatedAtClient] = useState('');

    const releaseRequestDropdownRef = useRef(null);
    const [releaseRequestDropdownOpen, setReleaseRequestDropdownOpen] = useState(false);
    const [releaseRequestQuery, setReleaseRequestQuery] = useState('');
    const [rrList, setRrList] = useState([]);
    const [deliveryList, setDeliveryList] = useState([]);
    const [deliveryListLoading, setDeliveryListLoading] = useState(false);
    const [deliveryTemplateId, setDeliveryTemplateId] = useState('');
    /** none | template | custom — khi template: chỉ xem preview, không hiện form nhập trực tiếp */
    const [transportSource, setTransportSource] = useState('none');
    const [transportDialogOpen, setTransportDialogOpen] = useState(false);
    const [transportDialogDraft, setTransportDialogDraft] = useState({
        carrierName: '',
        driverName: '',
        driverPhone: '',
        licensePlate: '',
        note: '',
    });

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
            try {
                const rrRes = await getReleaseRequests({ page: 1, pageSize: 100 });
                setRrList(rrRes.items || []);
            } catch (err) {
                console.error('Initial load failed', err);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setDeliveryListLoading(true);
            try {
                const res = await getDeliveries({ page: 1, pageSize: 100 });
                const listFromTransportInfo = res?.items || [];
                if (listFromTransportInfo.length > 0) {
                    if (!cancelled) setDeliveryList(listFromTransportInfo);
                    return;
                }

                // Fallback: nếu danh sách TransportInfo rỗng, thử lấy lịch sử vận chuyển để làm template nhanh.
                const historyTemplates = await getDeliveryHistory();
                if (!cancelled) setDeliveryList(historyTemplates);
            } catch (err) {
                console.warn('Load delivery list for transport templates failed', err);
                if (!cancelled) {
                    const historyTemplates = await getDeliveryHistory();
                    setDeliveryList(historyTemplates);
                }
            } finally {
                if (!cancelled) setDeliveryListLoading(false);
            }
        })();
        return () => { cancelled = true; };
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
    const filteredReleaseRequests = useMemo(() => {
        const keyword = normalizeText(releaseRequestQuery.trim());
        if (!keyword) return rrList;
        return rrList.filter(r => 
            normalizeText(r.releaseRequestCode).includes(keyword) || 
            normalizeText(r.receiverName).includes(keyword)
        );
    }, [releaseRequestQuery, rrList]);

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
                requestedQty: toNumber(l.requestedQty ?? l.approvedQty ?? 0),
                remainingQty: getRemainingQty(l),
                actualQty: getRemainingQty(l),
                unitPrice: 0,
                lineTotal: 0,
                requiresCertificateCopy: Boolean(l.requiresCertificateCopy ?? l.RequiresCertificateCopy),
                note: ''
            }));

        setLines(initialLines);
        setReleaseRequestQuery(detail.releaseRequestCode);
        setReleaseRequestDropdownOpen(false);
        
        setDeliveryTemplateId('');
        setTransportSource('none');
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
            carrierName: '',
            driverName: '',
            driverPhone: '',
            licensePlate: '',
            transportNote: '',
        }));
    };

    const applyDeliveryTemplate = (transportIdStr) => {
        setDeliveryTemplateId(transportIdStr);
        if (!transportIdStr) {
            setTransportSource('none');
            setFormData((prev) => ({
                ...prev,
                carrierName: '',
                driverName: '',
                driverPhone: '',
                licensePlate: '',
                transportNote: '',
            }));
            return;
        }
        const row = deliveryList.find((d) => String(d.transportId) === transportIdStr);
        if (!row) return;
        setTransportSource('template');
        setFormData((prev) => ({
            ...prev,
            carrierName: row.carrierName || '',
            driverName: row.driverName || '',
            driverPhone: row.driverPhone || '',
            licensePlate: row.licensePlate || '',
            transportNote: row.note != null && String(row.note).trim() !== '' ? String(row.note).trim() : '',
        }));
    };

    const openTransportDialog = () => {
        setTransportDialogDraft({
            carrierName: formData.carrierName || '',
            driverName: formData.driverName || '',
            driverPhone: formData.driverPhone || '',
            licensePlate: formData.licensePlate || '',
            note: formData.transportNote || '',
        });
        setTransportDialogOpen(true);
    };

    const saveTransportDialog = () => {
        const n = normalizeTransportInfoFields(transportDialogDraft);
        setFormData((prev) => ({
            ...prev,
            carrierName: n.carrierName ?? '',
            driverName: n.driverName ?? '',
            driverPhone: n.driverPhone ?? '',
            licensePlate: n.licensePlate ?? '',
            transportNote: n.note ?? '',
        }));
        setTransportSource('custom');
        setDeliveryTemplateId('');
        setTransportDialogOpen(false);
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
            if (!createdAtClient) {
                // Capture exact client creation moment for fallback display/trace.
                setCreatedAtClient(getLocalNowIso());
            }
            const payload = {
                ReleaseRequestId: Number(formData.releaseRequestId),
                WarehouseId: Number(formData.warehouseId),
                // Backend uses DateOnly; always send local date string (YYYY-MM-DD), never UTC-converted datetime.
                IssueDate: normalizeDateOnlyLocalInput(formData.issueDate),
                Status: 'PENDING_ISSUE',
                PickingStrategy: PICKING_STRATEGY_FIFO,
                ShippingFee: 0,
                IsPaid: false,
                PaymentMethod: null,
                Note: formData.note?.trim() || null,
                Lines: lines.map(l => ({
                    ItemId: l.itemId,
                    RequestedQty: toNumber(l.requestedQty),
                    ActualQty: toNumber(l.actualQty),
                    UomId: l.uomId,
                    ReleaseRequestLineId: l.releaseRequestLineId ?? null,
                    UnitPrice: toNumber(l.unitPrice),
                    RequiresCertificateCopy: Boolean(l.requiresCertificateCopy),
                    Note: l.note?.trim() || null,
                })),
                TransportInfo: (() => {
                    const ti = normalizeTransportInfoFields(formData);
                    const hasAny = ti.carrierName || ti.driverName || ti.driverPhone || ti.licensePlate || ti.note;
                    if (!hasAny) return null;
                    return {
                        CarrierName: ti.carrierName,
                        DriverName: ti.driverName,
                        DriverPhone: ti.driverPhone,
                        LicensePlate: ti.licensePlate,
                        Note: ti.note,
                    };
                })(),
            };
            await createGoodsDeliveryNote(payload);
            showToast('Tạo phiếu thành công. Phiếu chuyển sang bước chuẩn bị hàng.', 'success');
            setTimeout(() => navigate('/good-delivery-notes'), 1200);
        } catch (e) {
            showToast(e.message || 'Lỗi server', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page create-good-delivery-note-page">
            <div className="page-header gdn-page-toolbar">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={18} />
                        <span>Quay lại</span>
                    </button>
                    <h1 className="page-title gdn-page-title">Tạo phiếu xuất hàng</h1>
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
                    <div className="gdn-modern-card gdn-card--compact">
                        <div className="gdn-card-header gdn-card-header--compact">
                            <h2 className="gdn-card-title"><ClipboardList size={16} color="#0284c7"/> Thông tin nguồn xuất</h2>
                        </div>
                        <div className="gdn-card-body gdn-card-body--compact">
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
                                    <button
                                        type="button"
                                        className="gdn-ref-change-btn"
                                        onClick={() => {
                                            setDeliveryTemplateId('');
                                            setTransportSource('none');
                                            setFormData((p) => ({
                                                ...p,
                                                releaseRequestId: '',
                                                carrierName: '',
                                                driverName: '',
                                                driverPhone: '',
                                                licensePlate: '',
                                                transportNote: '',
                                            }));
                                        }}
                                    >
                                        Thay đổi
                                    </button>
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

                    {/* Card 2: Items Table — vùng bảng cuộn nội bộ */}
                    <div className="gdn-modern-card gdn-items-card">
                        <div className="gdn-card-header gdn-card-header--compact">
                            <h2 className="gdn-card-title"><Package size={16} color="#059669"/> Danh sách vật tư thực xuất</h2>
                            <div className="gdn-card-actions">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLines(lines.map(l => ({...l, actualQty: l.remainingQty})))}>
                                    Khớp SL còn lại
                                </button>
                            </div>
                        </div>
                        <div className="gdn-card-body gdn-items-card-body">
                            {!lines.length ? (
                                <div className="gdn-empty-state gdn-empty-state--compact">
                                    <Package size={36} strokeWidth={1} />
                                    <p className="gdn-empty-state-title">Chưa có vật tư</p>
                                    <p className="gdn-empty-state-desc">Vui lòng chọn yêu cầu xuất trước</p>
                                </div>
                            ) : (
                                <div className="gdn-table-scroll">
                                    <table className="gdn-table gdn-table--compact">
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
                </div>

                {/* ─── CỘT PHẢI (Sidebar) — sticky, cùng chiều rộng 350px ─── */}
                <aside className="gdn-sidebar">
                    
                    {/* Sidebar Card 1: Receiver */}
                    <div className="gdn-modern-card gdn-card--compact gdn-sidebar-card">
                        <div className="gdn-card-header gdn-card-header--compact">
                            <h2 className="gdn-card-title"><User size={14}/> Người nhận</h2>
                        </div>
                        <div className="gdn-card-body gdn-card-body--compact">
                            {formData.receiverName ? (
                                <div className="gdn-sidebar-receiver">
                                    <div className="gdn-sidebar-receiver-name">{formData.receiverName}</div>
                                    <div className="gdn-sidebar-receiver-row">
                                        <Phone size={12}/> {formData.receiverPhone || 'N/A'}
                                    </div>
                                    <div className="gdn-sidebar-receiver-addr">
                                        <MapPin size={12} style={{ marginTop: '1px', flexShrink: 0 }} /> {formData.receiverAddress || 'N/A'}
                                    </div>
                                </div>
                            ) : (
                                <div className="gdn-sidebar-placeholder">Chưa có thông tin người nhận</div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Card 2: Note */}
                    <div className="gdn-modern-card gdn-card--compact gdn-sidebar-card">
                        <div className="gdn-card-header gdn-card-header--compact">
                            <h2 className="gdn-card-title">Ghi chú phiếu</h2>
                        </div>
                        <div className="gdn-card-body gdn-card-body--compact">
                            <textarea
                                className="form-input gdn-input--compact"
                                rows={2}
                                placeholder="Tùy chọn"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Sidebar Card 3: Transport */}
                    <div className="gdn-modern-card gdn-card--compact gdn-sidebar-card gdn-transport-card">
                        <div className="gdn-card-header gdn-card-header--compact">
                            <h2 className="gdn-card-title"><Truck size={15} color="#6366f1"/> Vận chuyển</h2>
                        </div>
                        <div className="gdn-card-body gdn-card-body--compact gdn-sidebar-transport-body">
                            {deliveryListLoading ? (
                                <p className="gdn-sidebar-muted">Đang tải danh sách giao hàng…</p>
                            ) : (
                                <div className="gdn-input-group gdn-input-group--tight">
                                    <label className="gdn-label">Chọn nhanh từ danh sách giao hàng</label>
                                    <select
                                        className="form-input gdn-input--compact"
                                        value={deliveryTemplateId}
                                        onChange={(e) => applyDeliveryTemplate(e.target.value)}
                                    >
                                        <option value="">— Không chọn —</option>
                                        {deliveryList.map((d) => {
                                            const label = [
                                                d.driverName || d.carrierName || (d.gdnId != null ? `GDN #${d.gdnId}` : '—'),
                                                d.driverPhone || '',
                                                d.licensePlate || '',
                                            ].filter(Boolean).join(' · ');
                                            return (
                                                <option key={d.transportId} value={String(d.transportId)}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {!deliveryList.length && (
                                        <p className="gdn-sidebar-muted" style={{ marginTop: 6 }}>Chưa có bản ghi giao hàng để chọn nhanh.</p>
                                    )}
                                </div>
                            )}

                            {transportSource === 'template' && (
                                <p className="gdn-sidebar-muted gdn-transport-hint">
                                    Đang dùng thông tin từ lịch sử. Để nhập mới, dùng nút bên dưới.
                                </p>
                            )}

                            <div className="gdn-delivery-driver-preview">
                                <div className="gdn-delivery-driver-preview__title">Thông tin người giao hàng</div>
                                <div className="gdn-sidebar-receiver-row" style={{ fontSize: '12px', color: '#64748b' }}>
                                    Đơn vị VC: <strong style={{ color: '#334155' }}>{formData.carrierName || '—'}</strong>
                                </div>
                                <div className="gdn-sidebar-receiver-row">
                                    <User size={12} /> <span style={{ fontWeight: 600 }}>{formData.driverName || '—'}</span>
                                </div>
                                <div className="gdn-sidebar-receiver-row">
                                    <Phone size={12} /> {formData.driverPhone || '—'}
                                </div>
                                <div className="gdn-sidebar-receiver-row" style={{ fontSize: '12px', color: '#475569' }}>
                                    Biển số xe: <strong>{formData.licensePlate || '—'}</strong>
                                </div>
                                {formData.transportNote ? (
                                    <div className="gdn-sidebar-receiver-row" style={{ fontSize: '12px', color: '#475569', marginTop: 6 }}>
                                        Ghi chú VC: {formData.transportNote}
                                    </div>
                                ) : null}
                            </div>

                            {transportSource !== 'template' && (
                                <p className="gdn-sidebar-muted" style={{ marginTop: 8 }}>
                                    Nhập thông tin bên giao hàng qua hộp thoại (giống trang Tạo giao hàng — dữ liệu gửi kèm khi lưu phiếu xuất).
                                </p>
                            )}

                            <button
                                type="button"
                                className="btn btn-secondary gdn-transport-add-btn"
                                onClick={openTransportDialog}
                            >
                                Thêm mới thông tin bên giao hàng
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            <Dialog
                open={transportDialogOpen}
                onClose={() => setTransportDialogOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: '14px' } }}
            >
                <DialogTitle sx={{ fontSize: '18px', fontWeight: 600, pb: 1 }}>
                    Thông tin bên giao hàng
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                        Cùng định dạng với trang Tạo giao hàng. Khi bạn bấm Lưu phiếu xuất, thông tin này được gửi kèm trong yêu cầu tạo phiếu (không cần nhập mã phiếu — hệ thống gắn sau khi tạo).
                    </p>
                    <div style={{ display: 'grid', gap: '14px' }}>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Đơn vị vận chuyển</label>
                            <input
                                className="form-input gdn-input--compact"
                                value={transportDialogDraft.carrierName}
                                onChange={(e) => setTransportDialogDraft((d) => ({ ...d, carrierName: e.target.value }))}
                                placeholder="Ví dụ: Giao Hàng Nhanh"
                            />
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Tên tài xế</label>
                            <input
                                className="form-input gdn-input--compact"
                                value={transportDialogDraft.driverName}
                                onChange={(e) => setTransportDialogDraft((d) => ({ ...d, driverName: e.target.value }))}
                            />
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">SĐT tài xế</label>
                            <input
                                className="form-input gdn-input--compact"
                                type="tel"
                                maxLength={20}
                                value={transportDialogDraft.driverPhone}
                                onChange={(e) => setTransportDialogDraft((d) => ({ ...d, driverPhone: e.target.value }))}
                                placeholder="Chỉ số (theo quy tắc backend)"
                            />
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Biển số xe</label>
                            <input
                                className="form-input gdn-input--compact"
                                value={transportDialogDraft.licensePlate}
                                onChange={(e) => setTransportDialogDraft((d) => ({ ...d, licensePlate: e.target.value }))}
                            />
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Ghi chú vận chuyển</label>
                            <textarea
                                className="form-input gdn-input--compact"
                                rows={3}
                                value={transportDialogDraft.note}
                                onChange={(e) => setTransportDialogDraft((d) => ({ ...d, note: e.target.value }))}
                                maxLength={500}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
                    <button type="button" className="btn btn-cancel" onClick={() => setTransportDialogOpen(false)}>
                        Hủy
                    </button>
                    <button type="button" className="btn btn-primary" onClick={saveTransportDialog}>
                        Lưu thông tin
                    </button>
                </DialogActions>
            </Dialog>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}