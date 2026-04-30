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
    RefreshCw,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateGoodDeliveryNote.css'; // Đảm bảo đúng đường dẫn
import { createGoodsDeliveryNote } from '../lib/goodsDeliveryNoteService';
import { getDeliveries, getDeliveryHistory, normalizeTransportInfoFields } from '../lib/deliveryService';
import { getReleaseRequestDetail, getReleaseRequests } from '../lib/releaseRequestService';
import { formatLocalDateOnly, getLocalNowIso, normalizeDateOnlyLocalInput } from '../lib/dateUtils';
import { notifyApiError, notifyApiSuccess } from '../lib/toastMessageMapper';
import { getWarehouseDetail } from '../lib/warehouseService';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString('en-CA');
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

const mapWarehouseLotsFromDetailResponse = (wd) => {
    const rawLots = wd?.lots ?? wd?.Lots ?? [];
    return (Array.isArray(rawLots) ? rawLots : [])
        .map((lot) => ({
            lotId: lot.lotId ?? lot.LotId,
            itemId: lot.itemId ?? lot.ItemId,
            locationId: lot.locationId ?? lot.LocationId ?? null,
            locationCode: lot.locationCode ?? lot.LocationCode ?? '',
            locationName: lot.locationName ?? lot.LocationName ?? '',
            quantity: Number(lot.quantity ?? lot.Quantity ?? 0),
            isActive: Boolean(lot.isActive ?? lot.IsActive ?? true),
            receiptDate: lot.receiptDate ?? lot.ReceiptDate ?? null,
        }))
        .filter((lot) => lot.lotId != null && lot.itemId != null && lot.isActive && lot.quantity > 0);
};

const receiptDateSortKey = (value) => {
    if (value == null || value === '') return Number.MAX_SAFE_INTEGER;
    const t = Date.parse(String(value));
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
};

const buildFifoPickPreview = (gdnLines, lotsInput) => {
    const working = (Array.isArray(lotsInput) ? lotsInput : [])
        .filter((l) => l.lotId && l.itemId && l.isActive && toNumber(l.quantity) > 0)
        .map((l) => ({
            lotId: l.lotId,
            itemId: Number(l.itemId),
            locationId: l.locationId ?? null,
            locationName: String(l.locationName || '').trim(),
            receiptDate: l.receiptDate ?? l.ReceiptDate ?? null,
            remaining: toNumber(l.quantity),
        }))
        .sort((a, b) => {
            const da = receiptDateSortKey(a.receiptDate);
            const db = receiptDateSortKey(b.receiptDate);
            if (da !== db) return da - db;
            return Number(a.lotId) - Number(b.lotId);
        });

    const rows = [];
    const shortfalls = [];

    (Array.isArray(gdnLines) ? gdnLines : []).forEach((line) => {
        const need = Math.min(Math.max(toNumber(line.actualQty), 0), toNumber(line.remainingQty));
        let left = need;

        for (let i = 0; i < working.length && left > 0; i += 1) {
            const lot = working[i];
            if (lot.itemId !== Number(line.itemId)) continue;
            if (lot.remaining <= 0) continue;
            const take = Math.min(lot.remaining, left);
            rows.push({
                key: `${line.id}-${lot.lotId}-${rows.length}`,
                lineLocalId: line.id,
                itemCode: line.itemCode,
                itemName: line.itemName,
                uomName: line.uomName,
                lotId: lot.lotId,
                locationName: lot.locationName,
                receiptDate: lot.receiptDate,
                qty: take,
                lineNeed: need,
            });
            lot.remaining -= take;
            left -= take;
        }

        if (left > 0.000001) {
            shortfalls.push({
                itemCode: line.itemCode,
                itemName: line.itemName,
                shortage: left,
            });
        }
    });

    return { rows, shortfalls };
};

const validateTransportDialogDraft = (draft) => {
    const errors = {};
    const carrierName = String(draft?.carrierName || '').trim();
    const driverName = String(draft?.driverName || '').trim();
    const driverPhoneRaw = String(draft?.driverPhone || '').trim();
    const driverPhoneDigits = driverPhoneRaw.replace(/\D/g, '');
    const licensePlate = String(draft?.licensePlate || '').trim();
    const note = String(draft?.note || '').trim();

    if (!carrierName) errors.carrierName = 'Vui lòng nhập đơn vị vận chuyển.';
    if (!driverName) errors.driverName = 'Vui lòng nhập tên tài xế.';
    if (!driverPhoneRaw) {
        errors.driverPhone = 'Vui lòng nhập SĐT tài xế.';
    }
    if (!licensePlate) errors.licensePlate = 'Vui lòng nhập biển số xe.';

    if (carrierName.length > 200) errors.carrierName = 'Đơn vị vận chuyển tối đa 200 ký tự.';
    if (driverName.length > 200) errors.driverName = 'Tên tài xế tối đa 200 ký tự.';
    if (licensePlate.length > 50) errors.licensePlate = 'Biển số xe tối đa 50 ký tự.';
    if (note.length > 500) errors.note = 'Ghi chú vận chuyển tối đa 500 ký tự.';

    if (driverPhoneRaw) {
        if (!driverPhoneDigits) {
            errors.driverPhone = 'SĐT tài xế không hợp lệ.';
        } else if (driverPhoneDigits.length < 9 || driverPhoneDigits.length > 20) {
            errors.driverPhone = 'SĐT tài xế phải từ 9 đến 20 chữ số.';
        }
    }

    return errors;
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

    const releaseRequestDropdownRef = useRef(null);
    const [releaseRequestDropdownOpen, setReleaseRequestDropdownOpen] = useState(false);
    const [releaseRequestQuery, setReleaseRequestQuery] = useState('');
    const [rrList, setRrList] = useState([]);
    const [warehouseLots, setWarehouseLots] = useState([]);
    const [warehouseLotsLoading, setWarehouseLotsLoading] = useState(false);
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
    const [transportDialogErrors, setTransportDialogErrors] = useState({});

    // ─── Effects ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const queryId = searchParams.get('releaseRequestId') || searchParams.get('rrId');
        if (!queryId) {
            showToast('Chỉ có thể tạo phiếu xuất hàng từ một yêu cầu xuất hàng (RR).', 'warning');
            navigate('/release-request');
            return;
        }
        getReleaseRequestDetail(queryId).then(data => {
            if (data) handleSelectReleaseRequest(data);
            else {
                showToast('Không tìm thấy yêu cầu xuất hàng để tạo phiếu xuất.', 'error');
                navigate('/release-request');
            }
        });
    }, [searchParams, navigate, showToast]);

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

    const fifoPickPreview = useMemo(
        () => buildFifoPickPreview(lines, warehouseLots),
        [lines, warehouseLots],
    );

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

        if (detail.warehouseId) {
            try {
                setWarehouseLotsLoading(true);
                const wd = await getWarehouseDetail(Number(detail.warehouseId));
                setWarehouseLots(mapWarehouseLotsFromDetailResponse(wd));
            } catch {
                setWarehouseLots([]);
                showToast('Không tải được tồn theo lô để gợi ý lấy hàng.', 'warning');
            } finally {
                setWarehouseLotsLoading(false);
            }
        } else {
            setWarehouseLots([]);
        }
    };

    const refreshFifoWarehouseLots = async () => {
        const wid = Number(formData.warehouseId);
        if (!formData.warehouseId || !Number.isFinite(wid) || wid <= 0) {
            showToast('Chưa có kho để làm mới gợi ý.', 'warning');
            return;
        }
        try {
            setWarehouseLotsLoading(true);
            const wd = await getWarehouseDetail(wid);
            setWarehouseLots(mapWarehouseLotsFromDetailResponse(wd));
            showToast('Đã làm mới gợi ý lấy hàng (FIFO).', 'success');
        } catch {
            setWarehouseLots([]);
            showToast('Không tải được tồn theo lô để gợi ý lấy hàng.', 'warning');
        } finally {
            setWarehouseLotsLoading(false);
        }
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
        setTransportDialogErrors({});
        setTransportDialogOpen(true);
    };

    const saveTransportDialog = () => {
        const nextErrors = validateTransportDialogDraft(transportDialogDraft);
        if (Object.keys(nextErrors).length > 0) {
            setTransportDialogErrors(nextErrors);
            return;
        }
        const n = normalizeTransportInfoFields(transportDialogDraft);
        const tempTransportId = `local-${Date.now()}`;
        const newTransportOption = {
            transportId: tempTransportId,
            carrierName: n.carrierName ?? '',
            driverName: n.driverName ?? '',
            driverPhone: n.driverPhone ?? '',
            licensePlate: n.licensePlate ?? '',
            note: n.note ?? '',
        };

        setDeliveryList((prev) => {
            const existedIdx = prev.findIndex((x) =>
                (x.carrierName || '').trim() === (newTransportOption.carrierName || '').trim()
                && (x.driverName || '').trim() === (newTransportOption.driverName || '').trim()
                && (x.driverPhone || '').trim() === (newTransportOption.driverPhone || '').trim()
                && (x.licensePlate || '').trim() === (newTransportOption.licensePlate || '').trim()
            );
            if (existedIdx >= 0) {
                const next = [...prev];
                const existed = next[existedIdx];
                next.splice(existedIdx, 1);
                next.unshift(existed);
                return next;
            }
            return [newTransportOption, ...prev];
        });

        setFormData((prev) => ({
            ...prev,
            carrierName: n.carrierName ?? '',
            driverName: n.driverName ?? '',
            driverPhone: n.driverPhone ?? '',
            licensePlate: n.licensePlate ?? '',
            transportNote: n.note ?? '',
        }));
        setTransportSource('template');
        setDeliveryTemplateId(String(tempTransportId));
        setTransportDialogErrors({});
        setTransportDialogOpen(false);
        showToast('Đã tạo đơn vị vận chuyển và cập nhật danh sách chọn nhanh.', 'success');
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
        const transportCheck = validateTransportDialogDraft({
            carrierName: formData.carrierName,
            driverName: formData.driverName,
            driverPhone: formData.driverPhone,
            licensePlate: formData.licensePlate,
            note: formData.transportNote,
        });
        if (Object.keys(transportCheck).length > 0) {
            nextErrors.transportInfo = 'Vui lòng nhập đầy đủ thông tin bên giao hàng.';
        }
        setErrors(nextErrors);
        if (nextErrors.transportInfo) {
            showToast(nextErrors.transportInfo, 'warning');
        }
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
                                            setWarehouseLots([]);
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
                    {lines.length > 0 && (
                        <div className="gdn-modern-card gdn-card--compact gdn-fifo-card">
                            <div className="gdn-card-header gdn-card-header--compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <h2 className="gdn-card-title" style={{ margin: 0 }}>
                                    <MapPin size={16} color="#b45309" /> Gợi ý lấy hàng (FIFO)
                                </h2>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={refreshFifoWarehouseLots}
                                    disabled={warehouseLotsLoading || !formData.warehouseId}
                                    title="Tải lại tồn theo lô từ server"
                                >
                                    {warehouseLotsLoading ? (
                                        <Loader className="spinner" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                    ) : (
                                        <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                    )}
                                    Làm mới gợi ý
                                </button>
                            </div>
                            <div className="gdn-card-body gdn-card-body--compact">
                                {warehouseLotsLoading ? (
                                    <p className="gdn-sidebar-muted" style={{ margin: 0 }}>Đang tải tồn theo lô của kho...</p>
                                ) : !warehouseLots.length ? (
                                    <p className="gdn-sidebar-muted" style={{ margin: 0 }}>
                                        Chưa có dữ liệu lô hoặc kho chưa có tồn theo lô để hiển thị.
                                    </p>
                                ) : (
                                    <>
                                        {fifoPickPreview.shortfalls.length > 0 && (
                                            <div className="gdn-fifo-shortfalls" style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: '13px', color: '#991b1b' }}>
                                                <strong>Thiếu tồn theo lô:</strong>{' '}
                                                {fifoPickPreview.shortfalls.map((s) => (
                                                    <span key={s.itemCode} style={{ display: 'block', marginTop: 4 }}>
                                                        {s.itemCode} - {s.itemName}: thiếu <strong>{formatQuantity(s.shortage)}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {fifoPickPreview.rows.length === 0 && fifoPickPreview.shortfalls.length === 0 ? (
                                            <p className="gdn-sidebar-muted" style={{ margin: 0 }}>
                                                Nhập số lượng thực xuất để xem gợi ý.
                                            </p>
                                        ) : (
                                            <div className="gdn-table-scroll">
                                                <table className="gdn-table gdn-table--compact">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: 44 }}>STT</th>
                                                            <th>Vật tư</th>
                                                            <th>Vị trí</th>
                                                            <th>Lô</th>
                                                            <th style={{ width: 110 }}>Ngày nhập</th>
                                                            <th style={{ textAlign: 'right', width: 100 }}>SL lấy</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {fifoPickPreview.rows.map((r, idx) => (
                                                            <tr key={r.key}>
                                                                <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                                                                <td>
                                                                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{r.itemCode}</div>
                                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{r.itemName}</div>
                                                                </td>
                                                                <td style={{ fontWeight: 600, color: '#0f766e' }}>
                                                                    {r.locationName ? r.locationName : '-'}
                                                                </td>
                                                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>#{r.lotId}</td>
                                                                <td style={{ fontSize: '12px', color: '#475569' }}>
                                                                    {r.receiptDate != null && String(r.receiptDate).trim() !== ''
                                                                        ? String(r.receiptDate).slice(0, 10)
                                                                        : '-'}
                                                                </td>
                                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                                    {formatQuantity(r.qty)} <span style={{ fontSize: '11px', fontWeight: 400 }}>{r.uomName}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
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
                                            const label = d.driverName || '—';
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
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTransportDialogDraft((d) => ({ ...d, carrierName: value }));
                                    setTransportDialogErrors((prev) => ({ ...prev, carrierName: undefined }));
                                }}
                                placeholder="Ví dụ: Giao Hàng Nhanh"
                            />
                            {transportDialogErrors.carrierName && (
                                <p className="error-message">{transportDialogErrors.carrierName}</p>
                            )}
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Tên tài xế</label>
                            <input
                                className="form-input gdn-input--compact"
                                value={transportDialogDraft.driverName}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTransportDialogDraft((d) => ({ ...d, driverName: value }));
                                    setTransportDialogErrors((prev) => ({ ...prev, driverName: undefined }));
                                }}
                            />
                            {transportDialogErrors.driverName && (
                                <p className="error-message">{transportDialogErrors.driverName}</p>
                            )}
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">SĐT tài xế</label>
                            <input
                                className="form-input gdn-input--compact"
                                type="tel"
                                maxLength={20}
                                value={transportDialogDraft.driverPhone}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTransportDialogDraft((d) => ({ ...d, driverPhone: value }));
                                    setTransportDialogErrors((prev) => ({ ...prev, driverPhone: undefined }));
                                }}
                                placeholder="Ví dụ: 0912345678"
                            />
                            {transportDialogErrors.driverPhone && (
                                <p className="error-message">{transportDialogErrors.driverPhone}</p>
                            )}
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Biển số xe</label>
                            <input
                                className="form-input gdn-input--compact"
                                value={transportDialogDraft.licensePlate}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTransportDialogDraft((d) => ({ ...d, licensePlate: value }));
                                    setTransportDialogErrors((prev) => ({ ...prev, licensePlate: undefined }));
                                }}
                            />
                            {transportDialogErrors.licensePlate && (
                                <p className="error-message">{transportDialogErrors.licensePlate}</p>
                            )}
                        </div>
                        <div className="gdn-input-group gdn-input-group--tight">
                            <label className="gdn-label">Ghi chú vận chuyển</label>
                            <textarea
                                className="form-input gdn-input--compact"
                                rows={3}
                                value={transportDialogDraft.note}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTransportDialogDraft((d) => ({ ...d, note: value }));
                                    setTransportDialogErrors((prev) => ({ ...prev, note: undefined }));
                                }}
                                maxLength={500}
                            />
                            {transportDialogErrors.note && (
                                <p className="error-message">{transportDialogErrors.note}</p>
                            )}
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