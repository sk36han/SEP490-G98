import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    User,
    Save,
    Loader,
    Calendar,
    Trash2,
    Package,
    Search,
    FileText,
    MapPin,
    Building2,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// Mock GRN data - đồng nhất với ViewGoodReceiptNoteDetail
const MOCK_GRNS = [
    {
        id: 1,
        grnCode: 'GRN-2026-001',
        supplierId: 101,
        supplierName: 'Công ty TNHH Vật tư ABC',
        warehouseId: 11,
        warehouseName: 'Kho Hà Nội',
        createdDate: '2026-02-15',
        supplierPhone: '024.12345678',
        supplierEmail: 'abc@vattu.com',
        supplierTaxCode: '0101234567',
        supplierAddressProvince: 'Hà Nội',
        supplierAddressDistrict: 'Quận Cầu Giấy',
        supplierAddressWard: 'Phường Mai Dịch',
        supplierAddressStreet: 'Số 123 Đường Nguyễn Phong Sắc',
        lines: [
            { grnLineId: 1, productId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receivedQty: 50, unitPrice: 3500 },
            { grnLineId: 2, productId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receivedQty: 20, unitPrice: 22000 },
            { grnLineId: 3, productId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receivedQty: 10, unitPrice: 62000 },
        ],
    },
    {
        id: 2,
        grnCode: 'GRN-2026-002',
        supplierId: 102,
        supplierName: 'Công ty CP Thương mại XYZ',
        warehouseId: 12,
        warehouseName: 'Kho TP.HCM',
        createdDate: '2026-02-20',
        supplierPhone: '028.98765432',
        supplierEmail: 'xyz@thuongmai.com',
        supplierTaxCode: '0109876543',
        supplierAddressProvince: 'TP.HCM',
        supplierAddressDistrict: 'Quận 1',
        supplierAddressWard: 'Phường Bến Nghé',
        supplierAddressStreet: 'Số 456 Đường Lê Duẩn',
        lines: [
            { grnLineId: 4, productId: 4, sku: 'CLIP-001', productName: 'Kẹp giấy 33mm (hộp 50 cái)', uom: 'Hộp', receivedQty: 30, unitPrice: 18000 },
            { grnLineId: 5, productId: 5, sku: 'GLUE-001', productName: 'Keo dán thiên long 15g', uom: 'Tuýp', receivedQty: 15, unitPrice: 7000 },
        ],
    },
];

const CreatePurchaseReturn = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = { userId: 1, fullName: 'Nguyễn Văn A' };

    // Load GRN data from URL params on mount
    useEffect(() => {
        const grnId = searchParams.get('grnId');
        const grnCode = searchParams.get('grnCode');

        if (grnId && grnCode) {
            const foundGrn = MOCK_GRNS.find((g) => g.id === Number(grnId) && g.grnCode === grnCode);
            if (foundGrn) {
                setFormData((prev) => ({
                    ...prev,
                    relatedGRNId: foundGrn.id,
                    relatedGRNCode: foundGrn.grnCode,
                    supplierId: foundGrn.supplierId,
                    supplierName: foundGrn.supplierName,
                    supplierPhone: foundGrn.supplierPhone,
                    supplierEmail: foundGrn.supplierEmail,
                    supplierTaxCode: foundGrn.supplierTaxCode,
                    supplierAddressProvince: foundGrn.supplierAddressProvince,
                    supplierAddressDistrict: foundGrn.supplierAddressDistrict,
                    supplierAddressWard: foundGrn.supplierAddressWard,
                    supplierAddressStreet: foundGrn.supplierAddressStreet,
                    warehouseId: foundGrn.warehouseId,
                    warehouseName: foundGrn.warehouseName,
                    grnReceiptDate: foundGrn.createdDate || '',
                }));

                // Auto-fill lines from GRN
                const autoLines = foundGrn.lines.map((item) => ({
                    id: Date.now() + Math.random() + item.grnLineId,
                    grnLineId: item.grnLineId,
                    productId: item.productId,
                    sku: item.sku,
                    productName: item.productName,
                    uom: item.uom,
                    receivedQty: Number(item.receivedQty) || 0,
                    returnQty: 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    totalPrice: Number(item.unitPrice) || 0,
                }));
                setLines(autoLines);
                setSelectedProductIds(foundGrn.lines.map((item) => item.productId));
                setGrnQuery(foundGrn.grnCode);
                showToast('Đã tải thông tin từ phiếu nhập kho', 'success');
            }
        }
    }, []);

    const [formData, setFormData] = useState({
        relatedGRNId: '',
        relatedGRNCode: '',
        supplierId: '',
        supplierName: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierTaxCode: '',
        supplierAddressStreet: '',
        supplierAddressWard: '',
        supplierAddressDistrict: '',
        supplierAddressProvince: '',
        warehouseId: '',
        warehouseName: '',
        createdById: currentUser.userId,
        createdByName: currentUser.fullName,
        createdAt: new Date().toISOString().slice(0, 10),
        returnDate: '',
        reason: '',
        note: '',
        feeAmount: '',
        deductionReason: '',
        refundReceiveStatus: 'later',
        refundMethod: 'cash',
        grnReceiptDate: '',
        refundRecordedDate: '',
    });

    const MAX_REASON_LENGTH = 250;
    const MAX_NOTE_LENGTH = 250;

    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [grnQuery, setGrnQuery] = useState('');
    const [grnDropdownOpen, setGrnDropdownOpen] = useState(false);
    const [errors, setErrors] = useState({});

    const selectedGrn = useMemo(() => {
        return MOCK_GRNS.find((g) => g.id === formData.relatedGRNId) || null;
    }, [formData.relatedGRNId]);

    const filteredGrns = useMemo(() => {
        const q = grnQuery.trim().toLowerCase();
        if (!q) return MOCK_GRNS;
        return MOCK_GRNS.filter(
            (g) =>
                (g.grnCode || '').toLowerCase().includes(q) ||
                (g.supplierName || '').toLowerCase().includes(q) ||
                (g.warehouseName || '').toLowerCase().includes(q)
        );
    }, [grnQuery]);

    const availableProducts = useMemo(() => {
        const source = selectedGrn?.lines || [];
        return source.filter((item) => !selectedProductIds.includes(item.productId));
    }, [selectedGrn, selectedProductIds]);

    const filteredProducts = useMemo(() => {
        const q = searchKeyword.trim().toLowerCase();
        if (!q) return availableProducts;
        return availableProducts.filter(
            (item) =>
                (item.productName || '').toLowerCase().includes(q) ||
                (item.sku || '').toLowerCase().includes(q)
        );
    }, [availableProducts, searchKeyword]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'reason' && value.length > MAX_REASON_LENGTH) return;
        if (name === 'note' && value.length > MAX_NOTE_LENGTH) return;
        if (name === 'deductionReason' && value.length > MAX_NOTE_LENGTH) return;

        if (name === 'refundRecordedDate') {
            const today = new Date().toISOString().slice(0, 10);
            const minDate = formData.grnReceiptDate || '';

            if (value && value > today) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được ở tương lai' }));
            } else if (value && minDate && value < minDate) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến' }));
            } else {
                setErrors((prev) => ({ ...prev, refundRecordedDate: '' }));
            }
        }

        if (name === 'refundRecordedDate') {
            const today = new Date().toISOString().slice(0, 10);
            const minDate = formData.grnReceiptDate || '';

            if (value && value > today) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được ở tương lai' }));
            } else if (value && minDate && value < minDate) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến' }));
            } else {
                setErrors((prev) => ({ ...prev, refundRecordedDate: '' }));
            }
        }
        if (name === 'deductionReason' && value.length > MAX_NOTE_LENGTH) return;

        if (name === 'feeAmount') {
            const digitsOnly = value.replace(/\D/g, '');
            const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
            setFormData((prev) => ({
                ...prev,
                feeAmount: normalized,
            }));

            if (errors.feeAmount) {
                setErrors((prev) => ({
                    ...prev,
                    feeAmount: '',
                }));
            }
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    const handleSelectGrn = (grn) => {
        setFormData((prev) => ({
            ...prev,
            relatedGRNId: grn.id,
            relatedGRNCode: grn.grnCode,
            supplierId: grn.supplierId,
            supplierName: grn.supplierName,
            supplierPhone: grn.supplierPhone,
            supplierEmail: grn.supplierEmail,
            supplierTaxCode: grn.supplierTaxCode,
            supplierAddressProvince: grn.supplierAddressProvince,
            supplierAddressDistrict: grn.supplierAddressDistrict,
            supplierAddressWard: grn.supplierAddressWard,
            supplierAddressStreet: grn.supplierAddressStreet,
            warehouseId: grn.warehouseId,
            warehouseName: grn.warehouseName,
        }));

        setGrnQuery(grn.grnCode);
        setGrnDropdownOpen(false);
        setLines([]);
        setSelectedLineIds([]);
        setSelectedProductIds([]);
        setShowProductSearch(false);
        setSearchKeyword('');

        setErrors((prev) => ({
            ...prev,
            lines: '',
        }));
    };

    const openProductSearch = () => {
        if (!formData.relatedGRNId) {
            showToast('Vui lòng chọn phiếu nhập tham chiếu trước.', 'warning');
            setErrors((prev) => ({
                ...prev,
                relatedGRNCode: 'Phiếu nhập tham chiếu là bắt buộc',
            }));
            return;
        }

        setShowProductSearch(true);
        setSearchKeyword('');
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    const addLine = (product) => {
        const existed = lines.some((line) => line.productId === product.productId);
        if (existed) {
            showToast('Vật tư đã có trong danh sách trả.', 'warning');
            return;
        }

        const newLine = {
            id: Date.now() + Math.random(),
            grnLineId: product.grnLineId,
            productId: product.productId,
            sku: product.sku,
            productName: product.productName,
            uom: product.uom,
            receivedQty: Number(product.receivedQty) || 0,
            returnQty: 1,
            unitPrice: Number(product.unitPrice) || 0,
            totalPrice: Number(product.unitPrice) || 0,
        };

        setLines((prev) => [...prev, newLine]);
        setSelectedProductIds((prev) => [...prev, product.productId]);
        setShowProductSearch(false);
        setSearchKeyword('');

        if (errors.lines) {
            setErrors((prev) => ({
                ...prev,
                lines: '',
            }));
        }
    };

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;

                let processedValue = value;
                if (field === 'returnQty') {
                    const numValue = Number(value) || 0;
                    // Không cho nhập quá số lượng đã nhập
                    processedValue = Math.min(Math.max(numValue, 0), line.receivedQty);
                }

                const next = {
                    ...line,
                    [field]: field === 'returnQty' ? processedValue : value,
                };

                if (field === 'returnQty') {
                    next.totalPrice = (Number(next.returnQty) || 0) * (Number(next.unitPrice) || 0);
                }

                return next;
            })
        );
    };

    const removeLine = (index) => {
        const removed = lines[index];
        setLines((prev) => prev.filter((_, i) => i !== index));
        setSelectedLineIds((prev) => prev.filter((id) => id !== removed.id));
        setSelectedProductIds((prev) => prev.filter((id) => id !== removed.productId));
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (!lines.length) return;
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map((line) => line.id));
        }
    };

    const removeSelectedLines = () => {
        if (!selectedLineIds.length) return;

        const removedProductIds = lines
            .filter((line) => selectedLineIds.includes(line.id))
            .map((line) => line.productId);

        setLines((prev) => prev.filter((line) => !selectedLineIds.includes(line.id)));
        setSelectedProductIds((prev) => prev.filter((id) => !removedProductIds.includes(id)));
        setSelectedLineIds([]);
    };

    const totalReturnQuantity = lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0);
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const feeAmount = Number(formData.feeAmount) || 0;
    const isFeeAmountExceedSubtotal = feeAmount > subtotal;
    const estimatedRefundAmount = Math.max(subtotal - feeAmount, 0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(value) || 0);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.returnDate) {
            newErrors.returnDate = 'Ngày trả hàng là bắt buộc';
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'Lý do trả hàng là bắt buộc';
        }

        if (!lines.length) {
            newErrors.lines = 'Vui lòng thêm ít nhất 1 vật tư trả';
        } else {
            const invalidLine = lines.find(
                (line) =>
                    Number(line.returnQty) <= 0 ||
                    Number(line.returnQty) > Number(line.receivedQty)
            );

            if (invalidLine) {
                newErrors.lines = 'Số lượng trả phải lớn hơn 0 và không vượt quá số lượng đã nhập';
            }
        }

        if (feeAmount < 0) {
            newErrors.feeAmount = 'Phí xử lý phải lớn hơn hoặc bằng 0';
        }

        if (feeAmount > subtotal) {
            newErrors.feeAmount = 'Phí xử lý không được cao hơn Giá trị hoàn trả';
        }

        if (formData.refundReceiveStatus === 'received') {
            if (!formData.refundRecordedDate) {
                newErrors.refundRecordedDate = 'Ngày ghi nhận là bắt buộc';
            } else {
                const today = new Date().toISOString().slice(0, 10);
                if (formData.refundRecordedDate > today) {
                    newErrors.refundRecordedDate = 'Ngày ghi nhận không được ở tương lai';
                }
                if (formData.grnReceiptDate && formData.refundRecordedDate < formData.grnReceiptDate) {
                    newErrors.refundRecordedDate = 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến';
                }
            }
        }

        if (formData.refundReceiveStatus === 'received') {
            if (!formData.refundRecordedDate) {
                newErrors.refundRecordedDate = 'Ngày ghi nhận là bắt buộc';
            } else {
                const today = new Date().toISOString().slice(0, 10);
                if (formData.refundRecordedDate > today) {
                    newErrors.refundRecordedDate = 'Ngày ghi nhận không được ở tương lai';
                }
                if (formData.grnReceiptDate && formData.refundRecordedDate < formData.grnReceiptDate) {
                    newErrors.refundRecordedDate = 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin.', 'error');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                relatedGRNId: formData.relatedGRNId,
                returnDate: formData.returnDate,
                reason: formData.reason.trim(),
                note: formData.note.trim() || null,
                feeAmount: feeAmount,
                deductionReason: formData.deductionReason?.trim() || null,
                refundReceiveStatus: formData.refundReceiveStatus,
                refundMethod: formData.refundReceiveStatus === 'received' ? formData.refundMethod : null,
                refundReceivedAmount: formData.refundReceiveStatus === 'received' ? estimatedRefundAmount : 0,
                refundRecordedDate: formData.refundReceiveStatus === 'received' ? formData.refundRecordedDate : null,
                estimatedRefundAmount,
                lines: lines.map((line) => ({
                    grnLineId: line.grnLineId,
                    itemId: line.productId,
                    returnQty: Number(line.returnQty) || 0,
                    unitPrice: Number(line.unitPrice) || 0,
                })),
            };

            console.log('Create Purchase Return payload:', payload);

            await new Promise((resolve) => setTimeout(resolve, 1000));
            showToast('Tạo phiếu trả hàng thành công!', 'success');
            setTimeout(() => navigate('/purchase-returns'), 1200);
        } catch (error) {
            showToast(error?.message || 'Có lỗi xảy ra', 'error');
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
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-cancel"
                        disabled={submitting}
                    >
                        <X size={15} />
                        Hủy
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? (
                            <>
                                <Loader size={15} className="spinner" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                Lưu phiếu trả
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="form-card">
                <form id="create-pr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo phiếu trả hàng</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start', height: '760px' }}>
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '760px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư trả</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {selectedLineIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={removeSelectedLines}
                                            className="btn btn-sm"
                                            style={{
                                                fontWeight: 600,
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            Xóa ({selectedLineIds.length})
                                        </button>
                                    )}

                                    <label
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: 600 }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={lines.length > 0 && lines.every(line => line.returnQty === line.receivedQty)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setLines(prev => prev.map(line => ({
                                                        ...line,
                                                        returnQty: line.receivedQty,
                                                        totalPrice: line.receivedQty * line.unitPrice,
                                                    })));
                                                } else {
                                                    setLines(prev => prev.map(line => ({
                                                        ...line,
                                                        returnQty: 0,
                                                        totalPrice: 0,
                                                    })));
                                                }
                                            }}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                        Trả toàn bộ
                                    </label>

                                    <button
                                        type="button"
                                        onClick={openProductSearch}
                                        className="btn btn-sm"
                                        style={{ fontSize: '14px', fontWeight: 600 }}
                                    >
                                        <Plus size={16} />
                                        Thêm vật tư
                                    </button>
                                </div>
                            </div>

                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>
                                    {errors.lines}
                                </div>
                            )}

                            {showProductSearch && (
                                <div
                                    style={{
                                        marginBottom: '16px',
                                        animation: 'slideDown 0.3s ease-out',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Search
                                            size={20}
                                            style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#9ca3af',
                                                zIndex: 1,
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư trong phiếu nhập tham chiếu..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 44px',
                                                border: '2px solid #2196F3',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={closeProductSearch}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#6b7280',
                                                zIndex: 1,
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '4px',
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '10px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            maxHeight: '400px',
                                            overflowY: 'auto',
                                            zIndex: 100,
                                            animation: 'fadeIn 0.2s ease-out',
                                        }}
                                    >
                                        {filteredProducts.length === 0 ? (
                                            <div
                                                style={{
                                                    padding: '24px',
                                                    textAlign: 'center',
                                                    color: '#9ca3af',
                                                }}
                                            >
                                                <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '13px' }}>
                                                    Không tìm thấy vật tư phù hợp
                                                </p>
                                            </div>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <div
                                                    key={product.grnLineId}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid #f3f4f6',
                                                        transition: 'background-color 0.15s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => addLine(product)}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#f9fafb';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e5e7eb',
                                                            backgroundColor: '#f3f4f6',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Package size={20} color="#9ca3af" />
                                                    </div>

                                                    <div style={{ flex: 1 }}>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'start',
                                                                marginBottom: '4px',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: 500,
                                                                    color: '#1f2937',
                                                                }}
                                                            >
                                                                {product.productName}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: 600,
                                                                    color: '#2196F3',
                                                                    marginLeft: '12px',
                                                                }}
                                                            >
                                                                {formatCurrency(product.unitPrice)}
                                                            </span>
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: '12px',
                                                                fontSize: '12px',
                                                                color: '#6b7280',
                                                                flexWrap: 'wrap',
                                                            }}
                                                        >
                                                            <span>Mã: {product.sku}</span>
                                                            <span>•</span>
                                                            <span>ĐVT: {product.uom}</span>
                                                            <span>•</span>
                                                            <span>Đã nhập: {product.receivedQty}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {lines.length === 0 ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '60px 20px',
                                        color: '#9ca3af',
                                    }}
                                >
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                                        Chưa có vật tư trả nào
                                    </p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>
                                        Chọn phiếu nhập tham chiếu rồi bấm &quot;Thêm vật tư&quot;
                                    </p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                <th style={{ width: '90px', textAlign: 'right' }}>SL đã nhập</th>
                                                <th style={{ width: '120px', textAlign: 'center' }}>SL trả</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                <Package size={20} color="#9ca3af" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#2196F3' }}>
                                                                    {line.productName}
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    Mã: {line.sku} • ĐVT: {line.uom}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                                        <span style={{ fontWeight: 500, color: '#374151' }}>{line.receivedQty}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={line.receivedQty}
                                                                value={line.returnQty}
                                                                onChange={(e) => updateLine(index, 'returnQty', e.target.value)}
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px' }}
                                                            />
                                                            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                                                                / {line.receivedQty}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#374151', paddingRight: '12px' }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLine(index)}
                                                            className="btn-icon-only"
                                                            style={{ color: '#ef4444' }}
                                                            title="Xóa dòng"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '760px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={formData.createdByName}
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
                                                value={formData.createdAt}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">
                                            Phiếu nhập tham chiếu <span className="required-mark">*</span>
                                        </label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={formData.relatedGRNCode}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5', cursor: 'default' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">
                                            Ngày trả hàng <span className="required-mark">*</span>
                                        </label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type="date"
                                                name="returnDate"
                                                value={formData.returnDate}
                                                onChange={handleChange}
                                                className={`form-input ${errors.returnDate ? 'error' : ''}`}
                                            />
                                        </div>
                                        {errors.returnDate && (
                                            <span className="error-message">{errors.returnDate}</span>
                                        )}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho trả</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={formData.warehouseName}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Hoàn tiền</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Trạng thái hoàn tiền</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                                            <input
                                                type="radio"
                                                name="refundReceiveStatus"
                                                value="received"
                                                checked={formData.refundReceiveStatus === 'received'}
                                                onChange={handleChange}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            Đã nhận hoàn tiền
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                                            <input
                                                type="radio"
                                                name="refundReceiveStatus"
                                                value="later"
                                                checked={formData.refundReceiveStatus === 'later'}
                                                onChange={handleChange}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            Nhận hoàn tiền sau
                                        </label>
                                    </div>
                                </div>

                                {formData.refundReceiveStatus === 'received' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Hình thức thanh toán</label>
                                            <div className="input-wrapper">
                                                <select
                                                    name="refundMethod"
                                                    value={formData.refundMethod}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    style={{ paddingLeft: '16px' }}
                                                >
                                                    <option value="cash">Tiền mặt</option>
                                                    <option value="bank_transfer">Chuyển khoản</option>
                                                    <option value="card">Thanh toán thẻ</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Số tiền nhận hoàn</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={formatCurrency(estimatedRefundAmount)}
                                                    className="form-input"
                                                    style={{ backgroundColor: '#f5f5f5', paddingLeft: '16px' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Ngày ghi nhận</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="date"
                                                    name="refundRecordedDate"
                                                    value={formData.refundRecordedDate}
                                                    onChange={handleChange}
                                                    max={new Date().toISOString().slice(0, 10)}
                                                    min={formData.grnReceiptDate || ''}
                                                    className={`form-input ${errors.refundRecordedDate ? 'error' : ''}`}
                                                    style={{ paddingLeft: '16px' }}
                                                />
                                            </div>
                                            {errors.refundRecordedDate && (
                                                <span className="error-message">{errors.refundRecordedDate}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'stretch', marginTop: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0, flex: 1 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>

                                {formData.supplierName ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            fontSize: 14,
                                            color: '#334155',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Tên NCC: </span>
                                            <span>{formData.supplierName || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>SĐT: </span>
                                            <span>{formData.supplierPhone || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Email: </span>
                                            <span>{formData.supplierEmail || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Mã số thuế: </span>
                                            <span>{formData.supplierTaxCode || '-'}</span>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                gap: 8,
                                                marginTop: 4,
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: '#64748b',
                                                        marginBottom: 4,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Tỉnh/Thành phố
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressProvince || '—'}
                                                </div>
                                            </div>

                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: '#64748b',
                                                        marginBottom: 4,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Quận/Huyện
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressDistrict || '—'}
                                                </div>
                                            </div>

                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: '#64748b',
                                                        marginBottom: 4,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Phường/Xã
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressWard || '—'}
                                                </div>
                                            </div>

                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color: '#64748b',
                                                        marginBottom: 4,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Địa chỉ cụ thể
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressStreet || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                                        Chọn phiếu nhập tham chiếu để hiển thị thông tin nhà cung cấp
                                    </div>
                                )}
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
    <div className="section-header-with-toggle">
        <h2 className="section-title">Ghi chú trả hàng</h2>
    </div>

    <div className="form-field">
        <label className="form-label">
            Ghi chú trả hàng <span className="required-mark">*</span>
        </label>
        <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Nhập ghi chú / lý do trả hàng"
            rows={4}
            className={`form-input ${errors.reason ? 'error' : ''}`}
            style={{ resize: 'vertical' }}
        />
        {errors.reason && (
            <span className="error-message">{errors.reason}</span>
        )}
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-end',
                fontSize: '12px',
                color: formData.reason.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280',
                marginTop: '4px',
                fontWeight: 500,
            }}
        >
            {formData.reason.length}/{MAX_REASON_LENGTH} ký tự
        </div>
    </div>
</div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp phiếu trả</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Tổng số lượng trả</div>
                                            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{totalReturnQuantity} sản phẩm</div>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Giá trị hàng trả</div>
                                            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(subtotal)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Phí xử lý trả hàng</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    name="feeAmount"
                                                    value={formData.feeAmount}
                                                    onChange={handleChange}
                                                    className={`form-input ${errors.feeAmount ? 'error' : ''}`}
                                                    style={{ paddingLeft: '16px', paddingRight: '34px' }}
                                                    placeholder="Nhập phí xử lý"
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                                                    ₫
                                                </span>
                                            </div>
                                            {errors.feeAmount && <span className="error-message">{errors.feeAmount}</span>}
                                            {!errors.feeAmount && isFeeAmountExceedSubtotal && (
                                                <span className="error-message">Phí xử lý không được cao hơn Giá trị hoàn trả</span>
                                            )}
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Lý do giảm trừ</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    name="deductionReason"
                                                    value={formData.deductionReason}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    style={{ paddingLeft: '16px' }}
                                                    placeholder="Nhập lý do giảm trừ"
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: formData.deductionReason.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#6b7280', marginTop: '2px', fontWeight: 500 }}>
                                                {formData.deductionReason.length}/{MAX_NOTE_LENGTH}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginBottom: '8px' }}>
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Giá trị hàng trả</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>+ {formatCurrency(subtotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Phí xử lý</span>
                                            <span style={{ color: feeAmount > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>- {formatCurrency(feeAmount)}</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '12px', borderLeft: '4px solid #2196F3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#2196F3' }}>Số tiền hoàn dự kiến</span>
                                        <span style={{ fontSize: '22px', fontWeight: 700, color: '#2196F3' }}>{formatCurrency(estimatedRefundAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div />
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreatePurchaseReturn;