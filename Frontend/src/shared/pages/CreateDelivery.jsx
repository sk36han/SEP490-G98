import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Loader,
    Truck,
    Phone,
    MapPin,
    FileText,
    Search,
    ClipboardList,
    Calendar,
    User,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateGoodDeliveryNote.css';
import { createDelivery } from '../lib/deliveryService';
import { getGoodsDeliveryNotes } from '../lib/goodsDeliveryNoteService';

const normalizeText = (value) =>
    String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateDelivery() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();

    // ─── States ──────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        gdnId: '',
        gdnCode: '',
        issueDate: '',
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        requestedByName: '',
        carrierName: '',
        driverName: '',
        driverPhone: '',
        licensePlate: '',
        note: '',
    });

    const [gdnDropdownOpen, setGdnDropdownOpen] = useState(false);
    const [gdnQuery, setGdnQuery] = useState('');
    const [gdnList, setGdnList] = useState([]);
    const [gdnListLoading, setGdnListLoading] = useState(false);
    const [selectedGdnDetail, setSelectedGdnDetail] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const gdnDropdownRef = useRef(null);

    // ─── Effects ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const queryId = searchParams.get('gdnId') || searchParams.get('gdnid');
        if (queryId) {
            // Try to find from already-loaded list later; for now just set ID if needed
            setFormData(prev => ({ ...prev, gdnId: queryId }));
        }
    }, [searchParams]);

    useEffect(() => {
        const loadGdnList = async () => {
            setGdnListLoading(true);
            try {
                const res = await getGoodsDeliveryNotes({ page: 1, pageSize: 100 });
                setGdnList(res.items || []);
            } catch (err) {
                console.error('Load GDN list failed', err);
            } finally {
                setGdnListLoading(false);
            }
        };
        loadGdnList();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (gdnDropdownRef.current && !gdnDropdownRef.current.contains(e.target)) {
                setGdnDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Derived ─────────────────────────────────────────────────────────────
    const filteredGdns = useMemo(() => {
        const keyword = normalizeText(gdnQuery.trim());
        if (!keyword) return gdnList;
        return gdnList.filter(g =>
            normalizeText(g.gdnCode).includes(keyword) ||
            normalizeText(g.receiverName).includes(keyword)
        );
    }, [gdnQuery, gdnList]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleSelectGdn = (gdn) => {
        setSelectedGdnDetail(gdn);
        setGdnQuery(gdn.gdnCode || '');
        setGdnDropdownOpen(false);
        setFormData(prev => ({
            ...prev,
            gdnId: String(gdn.gdnId || gdn.gdnid || gdn.id),
            gdnCode: gdn.gdnCode || '',
            issueDate: gdn.issueDate || gdn.IssueDate || '',
            receiverName: gdn.receiverName || gdn.ReceiverName || '',
            receiverPhone: gdn.receiverPhone || gdn.ReceiverPhone || '',
            receiverAddress: gdn.receiverAddress || gdn.Address || '',
            requestedByName: gdn.requestedByName || gdn.RequestedByName || '',
        }));
    };

    const validateForm = () => {
        const nextErrors = {};
        if (!formData.gdnId) nextErrors.gdnCode = 'Vui lòng chọn phiếu xuất hàng.';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const payload = {
                Gdnid: Number(formData.gdnId),
                CarrierName: formData.carrierName || null,
                DriverName: formData.driverName || null,
                DriverPhone: formData.driverPhone || null,
                LicensePlate: formData.licensePlate || null,
                Note: formData.note || null,
            };
            await createDelivery(payload);
            showToast('Tạo giao hàng thành công!', 'success');
            setTimeout(() => navigate('/deliveries'), 1200);
        } catch (e) {
            showToast(e.message || 'Lỗi server', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page">
            {/* ─── Header ─── */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                    <h1 className="page-title" style={{ margin: 0, fontSize: '20px' }}>Tạo giao hàng</h1>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-cancel" onClick={() => navigate(-1)}>Hủy</button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader className="spinner" size={16} /> : <Save size={16} />}
                        Tạo giao hàng
                    </button>
                </div>
            </div>

            <div className="gdn-layout-container">
                {/* ─── CỘT TRÁI ─── */}
                <div className="gdn-main-content">

                    {/* Card 1: Chọn GDN */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">
                                <ClipboardList size={18} color="#0284c7" />
                                Thông tin phiếu xuất hàng
                            </h2>
                        </div>
                        <div className="gdn-card-body">
                            {!formData.gdnId ? (
                                <div className="gdn-rr-selector" ref={gdnDropdownRef}>
                                    <div className="input-wrapper">
                                        <Search size={16} className="input-icon-left" />
                                        <input
                                            className={`form-input ${errors.gdnCode ? 'error' : ''}`}
                                            placeholder="Tìm mã phiếu xuất hàng (GDN)..."
                                            value={gdnQuery}
                                            onFocus={() => setGdnDropdownOpen(true)}
                                            onChange={(e) => setGdnQuery(e.target.value)}
                                        />
                                    </div>
                                    {gdnDropdownOpen && (
                                        <div className="gdn-rr-dropdown">
                                            {filteredGdns.length === 0 ? (
                                                <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                                                    Không tìm thấy phiếu xuất hàng nào.
                                                </div>
                                            ) : (
                                                filteredGdns.map(gdn => (
                                                    <div key={gdn.gdnId || gdn.gdnid || gdn.id} className="gdn-rr-item" onClick={() => handleSelectGdn(gdn)}>
                                                        <div style={{ fontWeight: 700 }}>{gdn.gdnCode || gdn.GdnCode}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            {gdn.receiverName || gdn.ReceiverName || '—'} — {gdn.warehouseName || gdn.WarehouseName || '—'}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                    {errors.gdnCode && <p className="error-message">{errors.gdnCode}</p>}
                                </div>
                            ) : (
                                <div className="gdn-reference-box">
                                    <button
                                        className="gdn-ref-change-btn"
                                        onClick={() => {
                                            setFormData(p => ({
                                                ...p,
                                                gdnId: '',
                                                gdnCode: '',
                                                issueDate: '',
                                                receiverName: '',
                                                receiverPhone: '',
                                                receiverAddress: '',
                                                requestedByName: '',
                                            }));
                                            setSelectedGdnDetail(null);
                                            setGdnQuery('');
                                        }}
                                    >
                                        Thay đổi
                                    </button>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Mã phiếu xuất</span>
                                        <span className="gdn-ref-value" style={{ color: '#0284c7' }}>{formData.gdnCode}</span>
                                    </div>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Ngày xuất</span>
                                        <span className="gdn-ref-value">{formData.issueDate || '—'}</span>
                                    </div>
                                    <div className="gdn-ref-item">
                                        <span className="gdn-ref-label">Người yêu cầu</span>
                                        <span className="gdn-ref-value">{formData.requestedByName || '—'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Thông tin vận chuyển */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">
                                <Truck size={18} color="#6366f1" />
                                Thông tin vận chuyển
                            </h2>
                        </div>
                        <div className="gdn-card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Đơn vị vận chuyển</label>
                                    <input
                                        className="form-input"
                                        placeholder="Ví dụ: Giao Hàng Nhanh, Viettel Post..."
                                        value={formData.carrierName}
                                        onChange={(e) => setFormData({ ...formData, carrierName: e.target.value })}
                                    />
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Tên tài xế</label>
                                    <input
                                        className="form-input"
                                        placeholder="Họ tên tài xế"
                                        value={formData.driverName}
                                        onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                                    />
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">SĐT tài xế</label>
                                    <input
                                        className="form-input"
                                        placeholder="09xxxxxxxx"
                                        type="tel"
                                        maxLength={20}
                                        value={formData.driverPhone}
                                        onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                                    />
                                </div>
                                <div className="gdn-input-group">
                                    <label className="gdn-label">Biển số xe</label>
                                    <input
                                        className="form-input"
                                        placeholder="59A-123.45"
                                        value={formData.licensePlate}
                                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Ghi chú */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">
                                <FileText size={18} color="#8b5cf6" />
                                Ghi chú giao hàng
                            </h2>
                        </div>
                        <div className="gdn-card-body">
                            <textarea
                                className="form-input"
                                style={{ width: '100%', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder="Ghi chú thêm cho việc giao hàng (thời gian giao, địa chỉ cụ thể, liên hệ trước...)"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                maxLength={500}
                            />
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', textAlign: 'right' }}>
                                {formData.note.length} / 500
                            </p>
                        </div>
                    </div>
                </div>

                {/* ─── CỘT PHẢI (Sidebar) ─── */}
                <div className="gdn-sidebar">

                    {/* Sidebar Card: Tóm tắt */}
                    <div className="gdn-modern-card">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">
                                <Truck size={16} />
                                Tóm tắt giao hàng
                            </h2>
                        </div>
                        <div className="gdn-card-body">
                            {formData.gdnId ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <span className="gdn-ref-label">Mã phiếu xuất</span>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0284c7' }}>{formData.gdnCode}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                                        <Calendar size={14} /> {formData.issueDate || '—'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569' }}>
                                        <User size={14} style={{ marginTop: '2px' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{formData.receiverName || '—'}</div>
                                            <div style={{ color: '#64748b', fontSize: '12px' }}>{formData.receiverPhone || '—'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                                        <MapPin size={14} style={{ marginTop: '2px' }} />
                                        {formData.receiverAddress || '—'}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', color: '#94a3b8' }}>
                                    <ClipboardList size={32} strokeWidth={1} />
                                    <p style={{ fontSize: '13px', textAlign: 'center', margin: 0 }}>
                                        Chưa chọn phiếu xuất hàng
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
