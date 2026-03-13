import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            { grnLineId: 1, productId: 1, sku: 'ONP-021', productName: 'Ống nhựa PVC Ø21', uom: 'Cây 4m', receivedQty: 30, unitPrice: 45000 },
            { grnLineId: 2, productId: 2, sku: 'KDN-500', productName: 'Keo dán nhựa PVC 500ml', uom: 'Chai', receivedQty: 20, unitPrice: 35000 },
            { grnLineId: 3, productId: 3, sku: 'BNR-001', productName: 'Bát nhựa rửa chén', uom: 'Cái', receivedQty: 50, unitPrice: 28000 },
            { grnLineId: 4, productId: 4, sku: 'VND-021', productName: 'Van nhựa DN21', uom: 'Cái', receivedQty: 12, unitPrice: 120000 },
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
            { grnLineId: 5, productId: 5, sku: 'CN-90-021', productName: 'Co nhựa 90 độ Ø21', uom: 'Cái', receivedQty: 100, unitPrice: 8500 },
            { grnLineId: 6, productId: 6, sku: 'TN-021', productName: 'Tê nhựa Ø21', uom: 'Cái', receivedQty: 80, unitPrice: 7500 },
            { grnLineId: 7, productId: 7, sku: 'ONNL-021', productName: 'Ống nước nóng lạnh PN20 Ø21', uom: 'Cây 4m', receivedQty: 25, unitPrice: 52000 },
            { grnLineId: 8, productId: 8, sku: 'BNN-030', productName: 'Bình nước nóng 30L', uom: 'Cái', receivedQty: 10, unitPrice: 1850000 },
        ],
    },
];

const CreatePurchaseReturn = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = { userId: 1, fullName: 'Nguyễn Văn A' };

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
        feeAmount: 0,
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

        setFormData((prev) => ({
            ...prev,
            [name]: name === 'feeAmount' ? Number(value) || 0 : value,
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
            relatedGRNCode: '',
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

                const next = {
                    ...line,
                    [field]: field === 'returnQty' ? Number(value) || 0 : value,
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
    const estimatedRefundAmount = Math.max(subtotal - feeAmount, 0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(value) || 0);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.relatedGRNId) {
            newErrors.relatedGRNCode = 'Phiếu nhập tham chiếu là bắt buộc';
        }

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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư trả</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={lines.length > 0 && selectedLineIds.length === lines.length}
                                                        onChange={toggleSelectAll}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </th>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th>Mã vật tư</th>
                                                <th>Tên vật tư</th>
                                                <th style={{ width: '90px' }}>ĐVT</th>
                                                <th style={{ width: '110px', textAlign: 'right' }}>SL đã nhập</th>
                                                <th style={{ width: '110px', textAlign: 'right' }}>SL trả</th>
                                                <th style={{ width: '130px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '150px', textAlign: 'right' }}>Thành tiền</th>
                                                <th style={{ width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLineIds.includes(line.id)}
                                                            onChange={() => toggleLineSelection(line.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>{line.sku}</td>
                                                    <td>{line.productName}</td>
                                                    <td>{line.uom}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {line.receivedQty}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={line.receivedQty}
                                                            value={line.returnQty}
                                                            onChange={(e) => updateLine(index, 'returnQty', e.target.value)}
                                                            className="form-input"
                                                            style={{ textAlign: 'right', width: '100%' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
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
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <FileText className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnQuery || formData.relatedGRNCode}
                                            onChange={(e) => {
                                                setGrnQuery(e.target.value);
                                                setGrnDropdownOpen(true);
                                            }}
                                            onFocus={() => setGrnDropdownOpen(true)}
                                            placeholder="Tìm hoặc chọn phiếu nhập"
                                            className={`form-input ${errors.relatedGRNCode ? 'error' : ''}`}
                                            autoComplete="off"
                                        />

                                        {grnDropdownOpen && (
                                            <ul
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    maxHeight: '220px',
                                                    overflowY: 'auto',
                                                    listStyle: 'none',
                                                    padding: '8px 0',
                                                    zIndex: 10,
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                {filteredGrns.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có phiếu nhập phù hợp
                                                    </li>
                                                ) : (
                                                    filteredGrns.map((grn) => (
                                                        <li
                                                            key={grn.id}
                                                            onClick={() => handleSelectGrn(grn)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                fontSize: '14px',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: 500 }}>{grn.grnCode}</div>
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {grn.supplierName} • {grn.warehouseName}
                                                            </div>
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.relatedGRNCode && (
                                        <span className="error-message">{errors.relatedGRNCode}</span>
                                    )}
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start', marginTop: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>

                                {formData.supplierName ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            fontSize: 13,
                                            color: '#374151',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Tên NCC: </span>
                                            <span>{formData.supplierName || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>SĐT: </span>
                                            <span>{formData.supplierPhone || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Email: </span>
                                            <span>{formData.supplierEmail || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Mã số thuế: </span>
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
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
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
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
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
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
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
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
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

                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng trả</label>
                                        <div
                                            style={{
                                                padding: '10px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {totalReturnQuantity} sản phẩm
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Giá trị hàng trả</label>
                                        <div
                                            style={{
                                                padding: '10px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {formatCurrency(subtotal)}
                                        </div>
                                    </div>

                                    <div className="form-field span-2" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Phí xử lý trả hàng</label>
                                        <input
                                            type="number"
                                            name="feeAmount"
                                            value={formData.feeAmount}
                                            onChange={handleChange}
                                            min="0"
                                            className={`form-input ${errors.feeAmount ? 'error' : ''}`}
                                            placeholder="Nhập phí xử lý"
                                        />
                                        {errors.feeAmount && (
                                            <span className="error-message">{errors.feeAmount}</span>
                                        )}
                                    </div>

                                    <div className="form-field span-2" style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '13px', color: '#666' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600 }}>Giá trị hàng trả:</span>
                                                <span style={{ color: '#10b981' }}>
                                                    + {formatCurrency(subtotal)}
                                                </span>
                                            </div>
                                            {feeAmount > 0 && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        marginTop: 6,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <span>Phí xử lý:</span>
                                                    <span style={{ color: '#ef4444' }}>
                                                        - {formatCurrency(feeAmount)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: '16px',
                                                padding: '20px',
                                                backgroundColor: '#e3f2fd',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #2196F3',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '18px',
                                                    fontWeight: 700,
                                                    color: '#2196F3',
                                                }}
                                            >
                                                Số tiền hoàn dự kiến:
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '24px',
                                                    fontWeight: 700,
                                                    color: '#2196F3',
                                                }}
                                            >
                                                {formatCurrency(estimatedRefundAmount)}
                                            </span>
                                        </div>
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