import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    Save,
    Loader,
    Calendar,
    Trash2,
    Package,
    Search,
    FileText,
    MapPin,
    User,
    Send,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getGRNDetail } from '../lib/goodReceiptNoteService';
import { createPurchaseReturn, uploadPurchaseReturnAttachments } from '../lib/purchaseReturnNoteService';
import '../styles/CreateSupplier.css';


const MAX_REASON_LENGTH = 250;
const MAX_NOTE_LENGTH = 250;
const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024; // 10MB/file
const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const generateLineId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toNumber = (val) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

/** Map 1 dong GRN API -> dong form tra hang (receivedQty = SL nhap kho, maxReturnQty = con co the tra). */
const mapGrnLineToReturnLine = (item, idx) => {
    const actual = toNumber(item.ActualQty ?? item.actualQty ?? item.ExpectedQty ?? item.expectedQty ?? 0);
    const committed = toNumber(item.QtyCommittedForReturn ?? item.qtyCommittedForReturn ?? 0);
    const availableRaw = item.QtyAvailableForReturn ?? item.qtyAvailableForReturn;
    const available =
        availableRaw !== null && availableRaw !== undefined && availableRaw !== ''
            ? toNumber(availableRaw)
            : Math.max(0, actual - committed);
    const maxReturnQty = Math.max(0, available);
    const resolvedGrnLineId =
        item.GrnLineId
        ?? item.grnLineId
        ?? item.GrnlineId
        ?? item.grnlineId
        ?? idx;
    return {
        id: generateLineId(),
        grnLineId: resolvedGrnLineId,
        productId: item.ItemId ?? item.itemId ?? idx,
        sku: item.ItemCode ?? item.itemCode ?? '-',
        productName: item.ItemName ?? item.itemName ?? '-',
        uom: item.UomName ?? item.uomName ?? '-',
        receivedQty: actual,
        qtyCommittedForReturn: committed,
        maxReturnQty,
        returnQty: maxReturnQty > 0 ? Math.min(1, maxReturnQty) : 0,
        unitPrice: toNumber(item.UnitPrice ?? item.unitPrice ?? 0),
        totalPrice: (maxReturnQty > 0 ? Math.min(1, maxReturnQty) : 0) * toNumber(item.UnitPrice ?? item.unitPrice ?? 0),
    };
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(value));
};

/** Hiển thị chuỗi NCC: rỗng/null -> — */
const displaySupplierField = (v) => {
    if (v === null || v === undefined) return '—';
    const s = String(v).trim();
    return s.length ? s : '—';
};

const CreatePurchaseReturn = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [submittingType, setSubmittingType] = useState(null); // 'draft' | 'submit' | null

    // --- State definitions (all before useEffect) ---
    const [formData, setFormData] = useState({
        relatedGRNId: '',
        relatedGRNCode: '',
        supplierId: '',
        supplierCode: '',
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
        createdById: 1,
        createdByName: 'Nguyễn Văn A',
        createdAt: TODAY,
        returnDate: '',
        reason: '',
        feeAmount: '',
        deductionReason: '',
        refundReceiveStatus: 'later',
        refundMethod: 'cash',
        grnReceiptDate: '',
        refundRecordedDate: TODAY,
    });

    const [lines, setLines] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [selectedSearchProductIds, setSelectedSearchProductIds] = useState([]);
    const [grnQuery, setGrnQuery] = useState('');
    const [errors, setErrors] = useState({});
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [prefillFromLot, setPrefillFromLot] = useState({
        lotId: '',
        grnLineId: '',
        locationCode: '',
        qty: '',
    });

    // Load GRN from URL params
    useEffect(() => {
        const grnId = searchParams.get('grnId');
        const grnLineIdParam = searchParams.get('grnLineId');
        const lotIdParam = searchParams.get('lotId');
        const locationCodeParam = searchParams.get('locationCode');
        const qtyParam = searchParams.get('qty');
        if (!grnId) return;

        const fetchGRN = async () => {
            try {
                const data = await getGRNDetail(grnId);
                if (!data) return;

                const grnLines = data.Lines ?? data.lines ?? [];
                const grnCode = data.GrnCode ?? data.grnCode ?? searchParams.get('grnCode') ?? '';
                const grnReceiptDateRaw = data.ReceiptDate ?? data.receiptDate ?? data.CreatedAt ?? data.createdAt;
                const grnReceiptDate = grnReceiptDateRaw
                    ? new Date(grnReceiptDateRaw).toLocaleDateString('en-CA')
                    : '';

                setFormData((prev) => ({
                    ...prev,
                    relatedGRNId: Number(grnId),
                    relatedGRNCode: grnCode,
                    supplierId: data.SupplierId ?? data.supplierId ?? '',
                    supplierCode: data.SupplierCode ?? data.supplierCode ?? '',
                    supplierName: data.SupplierName ?? data.supplierName ?? '',
                    supplierPhone: data.SupplierPhone ?? data.supplierPhone ?? '',
                    supplierEmail: data.SupplierEmail ?? data.supplierEmail ?? '',
                    supplierTaxCode: data.SupplierTaxCode ?? data.supplierTaxCode ?? '',
                    supplierAddressProvince: data.SupplierAddressProvince ?? data.supplierAddressProvince ?? '',
                    supplierAddressDistrict: data.SupplierAddressDistrict ?? data.supplierAddressDistrict ?? '',
                    supplierAddressWard: data.SupplierAddressWard ?? data.supplierAddressWard ?? '',
                    supplierAddressStreet: data.SupplierAddressStreet ?? data.supplierAddressStreet ?? '',
                    warehouseId: data.WarehouseId ?? data.warehouseId ?? '',
                    warehouseName: data.WarehouseName ?? data.warehouseName ?? '-',
                    createdByName: data.CreatedByName ?? data.createdByName ?? 'Nguyễn Văn A',
                    grnReceiptDate: grnReceiptDate,
                }));

                const autoLines = grnLines.map((item, idx) => mapGrnLineToReturnLine(item, idx));
                const usable = autoLines.filter((l) => l.maxReturnQty > 0);

                let linesForForm = usable;
                const targetGrnLineId = Number(grnLineIdParam);
                const hasTargetGrnLineId = Number.isFinite(targetGrnLineId) && targetGrnLineId > 0;
                if (hasTargetGrnLineId) {
                    const matched = usable.find((l) => Number(l.grnLineId) === targetGrnLineId);
                    if (matched) {
                        const qtyFromLot = Number(qtyParam);
                        const lotQtyCap = Number.isFinite(qtyFromLot) && qtyFromLot > 0
                            ? Math.min(qtyFromLot, matched.maxReturnQty)
                            : matched.maxReturnQty;
                        const suggestedQty = Number.isFinite(qtyFromLot) && qtyFromLot > 0
                            ? Math.min(qtyFromLot, lotQtyCap)
                            : Math.min(1, matched.maxReturnQty);
                        linesForForm = [{
                            ...matched,
                            // Tạo từ lot: hiển thị và giới hạn theo số lượng hiện tại ở lot.
                            receivedQty: lotQtyCap,
                            maxReturnQty: lotQtyCap,
                            qtyCommittedForReturn: 0,
                            returnQty: suggestedQty,
                            totalPrice: suggestedQty * matched.unitPrice,
                        }];
                    } else {
                        showToast('Không tìm thấy dòng GRN tương ứng lô đã chọn, hiển thị toàn bộ dòng khả dụng.', 'warning');
                    }
                }

                if (linesForForm.length === 0 && autoLines.length > 0) {
                    showToast('Các dòng trên phiếu nhập này không còn số lượng khả dụng để trả (đã bị giữ bởi phiếu trả khác).', 'warning');
                }
                setLines(linesForForm);
                setSelectedProductIds(linesForForm.map((item) => item.productId));
                setGrnQuery(grnCode);
                setPrefillFromLot({
                    lotId: lotIdParam || '',
                    grnLineId: hasTargetGrnLineId ? String(targetGrnLineId) : '',
                    locationCode: locationCodeParam || '',
                    qty: qtyParam || '',
                });
            } catch (error) {
                console.error('Lỗi tải GRN:', error);
                showToast(error?.response?.data?.message || 'Không thể tải dữ liệu GRN', 'error');
            }
        };

        fetchGRN();
    }, [searchParams, showToast]);

    // --- Derived ---
    const selectedGrn = { lines };

    const filteredGrns = [];

    const availableProducts = useMemo(() => {
        return (selectedGrn?.lines || []).filter((item) => !selectedProductIds.includes(item.productId));
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

    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedSearchProductIds.includes(p.productId));
    const someFilteredSelected = filteredProducts.some((p) => selectedSearchProductIds.includes(p.productId));

    const totalReturnQuantity = lines.reduce((sum, line) => sum + toNumber(line.returnQty), 0);
    const subtotal = lines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);
    const feeAmount = toNumber(formData.feeAmount);
    const isFeeAmountExceedSubtotal = feeAmount > subtotal;
    const estimatedRefundAmount = Math.max(subtotal - feeAmount, 0);

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Enforce max length for text fields
        if (name === 'reason' && value.length > MAX_REASON_LENGTH) return;
        if (name === 'deductionReason' && value.length > MAX_NOTE_LENGTH) return;

        // Validate returnDate on change
        if (name === 'returnDate') {
            if (value && formData.grnReceiptDate && value < formData.grnReceiptDate) {
                setErrors((prev) => ({ ...prev, returnDate: 'Ngày trả hàng không được trước ngày nhập của GRN' }));
            } else {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next.returnDate;
                    return next;
                });
            }
        }

        // Validate returnDate on change
        if (name === 'returnDate') {
            if (value && formData.grnReceiptDate && value < formData.grnReceiptDate) {
                setErrors((prev) => ({ ...prev, returnDate: 'Ngày trả hàng không được trước ngày nhập của GRN' }));
            } else {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next.returnDate;
                    return next;
                });
            }
        }

        // Validate refundRecordedDate on change
        if (name === 'refundRecordedDate') {
            if (value && value > TODAY) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được ở tương lai' }));
            } else if (value && formData.grnReceiptDate && value < formData.grnReceiptDate) {
                setErrors((prev) => ({ ...prev, refundRecordedDate: 'Ngày ghi nhận không được sớm hơn Ngày nhập của GRN' }));
            } else {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next.refundRecordedDate;
                    return next;
                });
            }
        }

        // feeAmount: digits only
        if (name === 'feeAmount') {
            const digitsOnly = value.replace(/\D/g, '');
            const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
            setFormData((prev) => ({ ...prev, feeAmount: normalized }));
            if (errors.feeAmount) {
                setErrors((prev) => {
                    const next = { ...prev };
                    delete next.feeAmount;
                    return next;
                });
            }
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSelectGrn = (grn) => {
        setFormData((prev) => ({
            ...prev,
            relatedGRNId: grn.id,
            relatedGRNCode: grn.grnCode,
            supplierId: grn.supplierId,
            supplierCode: grn.supplierCode ?? '',
            supplierName: grn.supplierName,
            supplierPhone: grn.supplierPhone ?? '',
            supplierEmail: grn.supplierEmail ?? '',
            supplierTaxCode: grn.supplierTaxCode ?? '',
            supplierAddressProvince: grn.supplierAddressProvince ?? '',
            supplierAddressDistrict: grn.supplierAddressDistrict ?? '',
            supplierAddressWard: grn.supplierAddressWard ?? '',
            supplierAddressStreet: grn.supplierAddressStreet ?? '',
            warehouseId: grn.warehouseId,
            warehouseName: grn.warehouseName,
            refundRecordedDate: TODAY,
        }));

        setGrnQuery(grn.grnCode);
        setGrnDropdownOpen(false);
        setLines([]);
        setSelectedProductIds([]);
        setShowProductSearch(false);
        setSearchKeyword('');
        setErrors((prev) => {
            const next = { ...prev };
            delete next.lines;
            delete next.relatedGRNCode;
            return next;
        });
    };

    const openProductSearch = () => {
        if (!formData.relatedGRNId) {
            showToast('Vui lòng chọn phiếu nhập tham chiếu trước.', 'warning');
            setErrors((prev) => ({ ...prev, relatedGRNCode: 'Phiếu nhập tham chiếu là bắt buộc' }));
            return;
        }
        setShowProductSearch(true);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
        setSelectedSearchProductIds([]);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
    };

    const addLine = (product) => {
        if (lines.some((line) => line.productId === product.productId)) {
            showToast('Vật tư đã có trong danh sách trả.', 'warning');
            return;
        }

        const unitPrice = toNumber(product.unitPrice);
        const maxReturnQty = toNumber(product.maxReturnQty ?? product.receivedQty);
        const rq = maxReturnQty > 0 ? Math.min(1, maxReturnQty) : 0;
        const newLine = {
            id: generateLineId(),
            grnLineId: product.grnLineId,
            productId: product.productId,
            sku: product.sku,
            productName: product.productName,
            uom: product.uom,
            receivedQty: toNumber(product.receivedQty),
            qtyCommittedForReturn: toNumber(product.qtyCommittedForReturn ?? 0),
            maxReturnQty,
            returnQty: rq,
            unitPrice,
            totalPrice: rq * unitPrice,
        };

        setLines((prev) => [...prev, newLine]);
        setSelectedProductIds((prev) => [...prev, product.productId]);

        if (errors.lines) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.lines;
                return next;
            });
        }
    };

    const toggleSearchProductSelection = (productId) => {
        setSelectedSearchProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const addSelectedProducts = () => {
        if (!selectedSearchProductIds.length) return;

        const productsToAdd = filteredProducts.filter((p) => selectedSearchProductIds.includes(p.productId));
        if (!productsToAdd.length) return;

        productsToAdd.forEach((product) => addLine(product));
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
    };

    const toggleSelectAllFilteredProducts = (checked) => {
        if (checked) {
            setSelectedSearchProductIds((prev) => {
                const set = new Set(prev);
                filteredProducts.forEach((p) => set.add(p.productId));
                return [...set];
            });
        } else {
            const filteredIds = new Set(filteredProducts.map((p) => p.productId));
            setSelectedSearchProductIds((prev) => prev.filter((id) => !filteredIds.has(id)));
        }
    };

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;

                if (field === 'returnQty') {
                    const cap = toNumber(line.maxReturnQty ?? line.receivedQty);
                    const numValue = toNumber(value);
                    const processedValue = Math.min(Math.max(numValue, 0), cap);
                    const safeQty = isNaN(processedValue) ? 0 : processedValue;
                    const safeUnit = isNaN(line.unitPrice) ? 0 : line.unitPrice;
                    return {
                        ...line,
                        returnQty: safeQty,
                        totalPrice: safeQty * safeUnit,
                    };
                }

                return { ...line, [field]: value };
            })
        );
    };

    const removeLine = (index) => {
        const removed = lines[index];
        setLines((prev) => prev.filter((_, i) => i !== index));
        setSelectedProductIds((prev) => prev.filter((id) => id !== removed.productId));
    };

    const removeSelectedLines = (selectedIds) => {
        if (!selectedIds?.length) return;
        const removedProductIds = lines
            .filter((line) => selectedIds.includes(line.id))
            .map((line) => line.productId);

        setLines((prev) => prev.filter((line) => !selectedIds.includes(line.id)));
        setSelectedProductIds((prev) => prev.filter((id) => !removedProductIds.includes(id)));
    };

    // --- Validation ---
    const validateForm = () => {
        const newErrors = {};

        if (!formData.returnDate) {
            newErrors.returnDate = 'Ngày trả hàng là bắt buộc';
        } else if (formData.grnReceiptDate && formData.returnDate < formData.grnReceiptDate) {
            newErrors.returnDate = 'Ngày trả hàng không được trước ngày nhập của GRN';
        }

        if (!lines.length) {
            newErrors.lines = 'Vui lòng thêm ít nhất 1 vật tư trả';
        } else {
            const invalidLine = lines.find((line) => {
                const cap = toNumber(line.maxReturnQty ?? line.receivedQty);
                return toNumber(line.returnQty) <= 0 || toNumber(line.returnQty) > cap;
            });
            if (invalidLine) {
                newErrors.lines = 'Số lượng trả phải lớn hơn 0 và không vượt quá số lượng còn có thể trả trên phiếu nhập';
            }
        }

        if (feeAmount < 0) {
            newErrors.feeAmount = 'Phí giảm trừ phải lớn hơn hoặc bằng 0';
        } else if (feeAmount > subtotal) {
            newErrors.feeAmount = 'Phí giảm trừ không được cao hơn Giá trị hoàn trả';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildCreatePayload = (status) => ({
        RelatedGrnId: Number(formData.relatedGRNId),
        ReturnDate: formData.returnDate,
        Reason: formData.reason.trim() || null,
        Note: formData.deductionReason?.trim() || null,
        FeeAmount: feeAmount,
        // Trạng thái hoàn tiền chỉ do kế toán xác nhận ở màn chi tiết PRN.
        RefundMethod: null,
        Status: status,
        RefundStatus: 'NotRefunded',
        Lines: lines.map((line) => ({
            RelatedGrnlineId: Number(line.grnLineId),
            ReturnQty: toNumber(line.returnQty),
            Reason: formData.reason.trim() || null,
            Note: formData.deductionReason?.trim() || null,
        })),
    });

    const handleSelectEvidenceFiles = (event) => {
        const incoming = Array.from(event.target.files || []);
        if (incoming.length === 0) return;

        const allowedPrefix = 'image/';
        const validIncoming = incoming.filter((f) => f.type?.startsWith(allowedPrefix));
        if (validIncoming.length !== incoming.length) {
            showToast('Chỉ chấp nhận tệp ảnh (jpg, png, webp...).', 'warning');
        }

        const tooLarge = validIncoming.find((f) => f.size > MAX_EVIDENCE_FILE_SIZE);
        if (tooLarge) {
            showToast(`Ảnh "${tooLarge.name}" vượt quá 10MB.`, 'warning');
            event.target.value = '';
            return;
        }

        const merged = [...evidenceFiles, ...validIncoming];
        if (merged.length > MAX_EVIDENCE_FILES) {
            showToast(`Chỉ được tải tối đa ${MAX_EVIDENCE_FILES} ảnh minh chứng.`, 'warning');
            event.target.value = '';
            return;
        }

        setEvidenceFiles(merged);
        event.target.value = '';
    };

    const removeEvidenceFile = (idx) => {
        setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    // --- Save Draft ---
    const handleSaveDraft = async () => {
        if (submitting) return;

        if (!formData.relatedGRNId) {
            showToast('Vui lòng chọn phiếu nhập tham chiếu trước khi lưu nháp.', 'warning');
            return;
        }

        try {
            setSubmitting(true);
            setSubmittingType('draft');
            const created = await createPurchaseReturn(buildCreatePayload('DRAFT'));
            const prnId =
                created?.purchaseReturnId
                ?? created?.PurchaseReturnId
                ?? created?.data?.purchaseReturnId
                ?? created?.data?.PurchaseReturnId;

            let uploadWarning = '';
            if (prnId && evidenceFiles.length > 0) {
                try {
                    await uploadPurchaseReturnAttachments(prnId, evidenceFiles);
                } catch (uploadErr) {
                    uploadWarning = uploadErr?.response?.data?.message || uploadErr?.message || 'Không thể tải ảnh minh chứng.';
                }
            }

            showToast(
                uploadWarning
                    ? `Lưu nháp thành công, nhưng upload ảnh lỗi: ${uploadWarning}`
                    : 'Lưu nháp thành công!',
                uploadWarning ? 'warning' : 'success',
            );
            setTimeout(() => navigate('/purchase-returns'), 1200);
        } catch (error) {
            showToast(error?.response?.data?.message || error?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
            setSubmittingType(null);
        }
    };

    // --- Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin.', 'error');
            return;
        }

        if (submitting) return;

        try {
            setSubmitting(true);
            setSubmittingType('submit');
            const created = await createPurchaseReturn(buildCreatePayload('SUBMITTED'));
            const prnId =
                created?.purchaseReturnId
                ?? created?.PurchaseReturnId
                ?? created?.data?.purchaseReturnId
                ?? created?.data?.PurchaseReturnId;

            let uploadWarning = '';
            if (prnId && evidenceFiles.length > 0) {
                try {
                    await uploadPurchaseReturnAttachments(prnId, evidenceFiles);
                } catch (uploadErr) {
                    uploadWarning = uploadErr?.response?.data?.message || uploadErr?.message || 'Không thể tải ảnh minh chứng.';
                }
            }

            showToast(
                uploadWarning
                    ? `Tạo phiếu trả hàng thành công, nhưng upload ảnh lỗi: ${uploadWarning}`
                    : 'Tạo phiếu trả hàng thành công!',
                uploadWarning ? 'warning' : 'success',
            );
            setTimeout(() => navigate('/purchase-returns'), 1200);
        } catch (error) {
            showToast(error?.response?.data?.message || error?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
            setSubmittingType(null);
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
                        className="btn btn-sm"
                        disabled={submitting}
                        onClick={handleSaveDraft}
                        style={{ fontSize: '14px', fontWeight: 600 }}
                    >
                        {submitting && submittingType === 'draft' ? (
                            <>
                                <Loader size={15} className="spinner" />
                                Đang lưu nháp...
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                Lưu nháp
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting && submittingType === 'submit' ? (
                            <>
                                <Loader size={15} className="spinner" />
                                Đang tạo phiếu...
                            </>
                        ) : (
                            <>
                                <Send size={15} />
                                Tạo phiếu trả hàng
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
                        {/* LEFT COLUMN: Product lines */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '760px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư trả</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: 600 }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={lines.length > 0 && lines.every((line) => line.returnQty === toNumber(line.maxReturnQty ?? line.receivedQty))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setLines((prev) => prev.map((line) => {
                                                        const cap = toNumber(line.maxReturnQty ?? line.receivedQty);
                                                        return {
                                                            ...line,
                                                            returnQty: cap,
                                                            totalPrice: cap * line.unitPrice,
                                                        };
                                                    }));
                                                } else {
                                                    setLines((prev) => prev.map((line) => ({
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
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư phù hợp</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f8fafc' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={allFilteredSelected}
                                                            ref={(el) => {
                                                                if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                                                            }}
                                                            onChange={(e) => toggleSelectAllFilteredProducts(e.target.checked)}
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                        Chọn tất cả ({filteredProducts.length})
                                                    </label>
                                                </div>
                                                {filteredProducts.map((product) => {
                                                    const isChecked = selectedSearchProductIds.includes(product.productId);
                                                    return (
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
                                                                backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                                            }}
                                                            onClick={() => toggleSearchProductSelection(product.productId)}
                                                            onMouseEnter={(e) => {
                                                                if (!isChecked) e.currentTarget.style.backgroundColor = '#f9fafb';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : 'transparent';
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleSearchProductSelection(product.productId)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                                                            />
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
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{product.productName}</span>
                                                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2196F3', marginLeft: '12px' }}>
                                                                        {formatCurrency(product.unitPrice)}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                                                                    <span>Mã: {product.sku}</span>
                                                                    <span>•</span>
                                                                    <span>ĐVT: {product.uom}</span>
                                                                    <span>•</span>
                                                                    <span>Đã nhập: {product.receivedQty}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                                        Đã chọn: {selectedSearchProductIds.length} vật tư
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm"
                                                        onClick={addSelectedProducts}
                                                        disabled={selectedSearchProductIds.length === 0}
                                                        style={{ fontSize: '13px', fontWeight: 600 }}
                                                    >
                                                        Thêm đã chọn
                                                    </button>
                                                </div>
                                            </>
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
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư trả nào</p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>Chọn phiếu nhập tham chiếu rồi bấm &quot;Thêm vật tư&quot;</p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                <th style={{ width: '110px', textAlign: 'right' }}>
                                                    {prefillFromLot.lotId ? 'SL lot hiện tại / còn trả' : 'SL nhập / còn trả'}
                                                </th>
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
                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#2196F3' }}>{line.productName}</span>
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    Mã: {line.sku} • ĐVT: {line.uom}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                            <span style={{ fontWeight: 500, color: '#374151' }}>{line.receivedQty}</span>
                                                            {toNumber(line.qtyCommittedForReturn) > 0 && (
                                                                <span style={{ fontSize: '11px', color: '#d97706' }}>Đang giữ trả: {line.qtyCommittedForReturn}</span>
                                                            )}
                                                            <span style={{ fontSize: '11px', color: '#059669' }}>Tối đa: {toNumber(line.maxReturnQty ?? line.receivedQty)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={toNumber(line.maxReturnQty ?? line.receivedQty)}
                                                                value={line.returnQty}
                                                                onChange={(e) => updateLine(index, 'returnQty', e.target.value)}
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px' }}
                                                            />
                                                            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {toNumber(line.maxReturnQty ?? line.receivedQty)}</span>
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

                        {/* RIGHT COLUMN: General info + Refund */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

                                    {(prefillFromLot.lotId || prefillFromLot.grnLineId || prefillFromLot.locationCode) && (
                                        <div
                                            style={{
                                                marginTop: '-4px',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #bfdbfe',
                                                backgroundColor: '#eff6ff',
                                                fontSize: '12px',
                                                color: '#1e3a8a',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            <strong>Tạo nhanh từ lô kho:</strong>{' '}
                                            {prefillFromLot.lotId ? `Lô #${prefillFromLot.lotId}` : '—'}
                                            {prefillFromLot.locationCode ? ` | Vị trí: ${prefillFromLot.locationCode}` : ''}
                                            {prefillFromLot.grnLineId ? ` | GRN Line: ${prefillFromLot.grnLineId}` : ''}
                                        </div>
                                    )}

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
                                                min={formData.grnReceiptDate || ''}
                                                className={`form-input ${errors.returnDate ? 'error' : ''}`}
                                            />
                                        </div>
                                        {errors.returnDate && <span className="error-message">{errors.returnDate}</span>}
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
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #fde68a',
                                            backgroundColor: '#fffbeb',
                                            fontSize: '13px',
                                            color: '#92400e',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        Khi tạo phiếu trả hàng, hệ thống mặc định là <strong>Chưa hoàn tiền</strong>. Trạng thái hoàn tiền sẽ do kế toán xác nhận tại trang chi tiết phiếu trả.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM ROW: Supplier + Notes + Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'stretch', marginTop: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Supplier info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>

                                {formData.supplierName ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#334155' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 16px' }}>
                                            <div><span style={{ fontWeight: 600 }}>Tên NCC: </span><span>{displaySupplierField(formData.supplierName)}</span></div>
                                            <div><span style={{ fontWeight: 600 }}>Mã NCC: </span><span>{displaySupplierField(formData.supplierCode)}</span></div>
                                            <div><span style={{ fontWeight: 600 }}>SĐT: </span><span>{displaySupplierField(formData.supplierPhone)}</span></div>
                                            <div><span style={{ fontWeight: 600 }}>Email: </span><span>{displaySupplierField(formData.supplierEmail)}</span></div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <span style={{ fontWeight: 600 }}>Mã số thuế: </span>
                                                <span>{displaySupplierField(formData.supplierTaxCode)}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Địa chỉ</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                            {[
                                                { label: 'Tỉnh/Thành phố', value: formData.supplierAddressProvince },
                                                { label: 'Quận/Huyện', value: formData.supplierAddressDistrict },
                                                { label: 'Phường/Xã', value: formData.supplierAddressWard },
                                                { label: 'Địa chỉ cụ thể', value: formData.supplierAddressStreet },
                                            ].map(({ label, value }) => (
                                                <div key={label}>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                                                    <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                                                        {displaySupplierField(value)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 13, color: '#475569' }}>
                                            <span style={{ fontWeight: 600 }}>Địa chỉ gộp: </span>
                                            {[
                                                displaySupplierField(formData.supplierAddressStreet),
                                                displaySupplierField(formData.supplierAddressWard),
                                                displaySupplierField(formData.supplierAddressDistrict),
                                                displaySupplierField(formData.supplierAddressProvince),
                                            ]
                                                .filter((p) => p !== '—')
                                                .join(', ') || '—'}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                                        Chọn phiếu nhập tham chiếu để hiển thị thông tin nhà cung cấp
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú trả hàng</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">
                                        Ghi chú trả hàng
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
                                    {errors.reason && <span className="error-message">{errors.reason}</span>}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: formData.reason.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280', marginTop: '4px', fontWeight: 500 }}>
                                        {formData.reason.length}/{MAX_REASON_LENGTH} ký tự
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ảnh minh chứng ({evidenceFiles.length}/{MAX_EVIDENCE_FILES})</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleSelectEvidenceFiles}
                                        className="form-input"
                                        style={{ padding: '8px 10px' }}
                                    />
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        Hỗ trợ nhiều ảnh, tối đa {MAX_EVIDENCE_FILES} ảnh, mỗi ảnh không quá 10MB.
                                    </div>
                                    {evidenceFiles.length > 0 && (
                                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {evidenceFiles.map((file, idx) => (
                                                <div
                                                    key={`${file.name}-${idx}`}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        fontSize: '12px',
                                                        padding: '6px 8px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#f8fafc',
                                                    }}
                                                >
                                                    <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {file.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEvidenceFile(idx)}
                                                        className="btn-icon-only"
                                                        style={{ width: 24, height: 24, color: '#ef4444' }}
                                                        title="Xóa ảnh"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Summary */}
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
                                            <label className="form-label">Phí giảm trừ trả hàng</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    name="feeAmount"
                                                    value={formData.feeAmount}
                                                    onChange={handleChange}
                                                    className={`form-input ${errors.feeAmount ? 'error' : ''}`}
                                                    style={{ paddingLeft: '16px', paddingRight: '34px' }}
                                                    placeholder="Nhập phí giảm trừ"
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>₫</span>
                                            </div>
                                            {errors.feeAmount && <span className="error-message">{errors.feeAmount}</span>}
                                            {!errors.feeAmount && isFeeAmountExceedSubtotal && (
                                                <span className="error-message">Phí xử lí trả hàng không được phép lớn hơn Giá trị hàng trả</span>
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
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Phí giảm trừ</span>
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
