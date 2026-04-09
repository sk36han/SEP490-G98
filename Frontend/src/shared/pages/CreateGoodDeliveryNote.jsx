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
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';
import '../styles/CreateGoodDeliveryNote.css';
import { createGoodsDeliveryNote } from '../lib/goodsDeliveryNoteService';
import { getReleaseRequestDetail, getReleaseRequests } from '../lib/releaseRequestService';
import { getItemsForDisplay } from '../lib/itemService';

// ─── Constants ────────────────────────────────────────────────────────────────
const TODAY = new Date().toLocaleDateString('en-CA');
const MAX_NOTE_LENGTH = 1000;
const MAX_LINE_NOTE_LENGTH = 500;
const MAX_TRANSPORT_NOTE_LENGTH = 500;

const PAYMENT_METHOD_OPTIONS = [
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
    { value: 'CARD', label: 'Thẻ thanh toán' },
    { value: 'E_WALLET', label: 'Ví điện tử' },
    { value: 'OTHER', label: 'Khác' },
];

const RELEASE_REQUEST_STATUS_META = {
    DRAFT: { label: 'Nháp', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' },
    PENDING: { label: 'Chờ duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_ACC: { label: 'Chờ kế toán duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_APPROVAL: { label: 'Chờ duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    APPROVED: { label: 'Đã duyệt', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    COMPLETED: { label: 'Hoàn thành', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8' },
    REJECTED: { label: 'Từ chối', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
    CANCELLED: { label: 'Đã hủy', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
};

const LIFECYCLE_STATUS_META = {
    ISSUE_PENDING: { label: 'Chờ xuất', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    ISSUE_PARTIAL: { label: 'Xuất một phần', bg: 'rgba(14, 165, 233, 0.18)', color: '#0369a1' },
    ISSUE_FULL: { label: 'Đã xuất đủ', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    CANCELLED: { label: 'Đã hủy', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
    CLOSED: { label: 'Đã đóng', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8' },
};

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

const getStatusMeta = (status) =>
    RELEASE_REQUEST_STATUS_META[String(status || '').toUpperCase()]
    ?? { label: status || '-', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' };

const getLifecycleStatusMeta = (lifecycleStatus) =>
    LIFECYCLE_STATUS_META[String(lifecycleStatus || '').toUpperCase().replace(/[ _-]/g, '')]
    ?? {
        label: lifecycleStatus || '-',
        bg: 'rgba(107, 114, 128, 0.15)',
        color: '#4b5563',
      };

const getRemainingQty = (line) => {
    const approvedQty = toNumber(line?.approvedQty ?? line?.ApprovedQty ?? 0);
    const allocatedQty = toNumber(line?.allocatedQty ?? line?.AllocatedQty ?? 0);
    const issuedQty = toNumber(line?.issuedQty ?? line?.IssuedQty ?? 0);
    const baseQty = allocatedQty > 0 ? allocatedQty : approvedQty;
    return Math.max(baseQty - issuedQty, 0);
};

// ─── Initial State ────────────────────────────────────────────────────────────
const createInitialFormData = () => ({
    releaseRequestId: '',
    releaseRequestCode: '',
    warehouseId: '',
    warehouseName: '',
    receiverId: '',
    receiverName: '',
    receiverPhone: '',
    receiverEmail: '',
    receiverCompanyName: '',
    receiverAddress: '',
    receiverCity: '',
    receiverDistrict: '',
    receiverWard: '',
    requestedByName: '',
    requestedDate: '',
    expectedDate: '',
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

// ─── Line Builder ─────────────────────────────────────────────────────────────
function buildSelectableLine(line, index) {
    return {
        id: line.id ?? line.releaseRequestLineId ?? `line-${index}`,
        releaseRequestLineId: line.releaseRequestLineId,
        itemId: line.itemId,
        itemCode: line.itemCode || '',
        itemName: line.itemName || '',
        uomId: line.uomId,
        uomName: line.uomName || '',
        requestedQty: toNumber(line.requestedQty ?? line.RequestedQty),
        approvedQty: toNumber(line.approvedQty ?? line.ApprovedQty),
        allocatedQty: toNumber(line.allocatedQty ?? line.AllocatedQty),
        issuedQty: toNumber(line.issuedQty ?? line.IssuedQty),
        remainingQty: getRemainingQty(line),
        availableQty: toNumber(line.availableQty ?? line.AvailableQty ?? line.stockQty ?? line.StockQty ?? 0),
        unitPrice: 0,
        lineTotal: 0,
        note: line.note || '',
    };
}

function mapSelectableLineToFormLine(selectableLine, itemPrices = {}) {
    const price = itemPrices[selectableLine.itemId] ?? selectableLine.unitPrice ?? 0;
    return {
        id: generateLineId(),
        releaseRequestLineId: selectableLine.releaseRequestLineId,
        itemId: selectableLine.itemId,
        itemCode: selectableLine.itemCode,
        itemName: selectableLine.itemName,
        uomId: selectableLine.uomId,
        uomName: selectableLine.uomName,
        requestedQty: selectableLine.requestedQty,
        approvedQty: selectableLine.approvedQty,
        allocatedQty: selectableLine.allocatedQty,
        issuedQty: selectableLine.issuedQty,
        remainingQty: selectableLine.remainingQty,
        actualQty: selectableLine.remainingQty,
        availableQty: selectableLine.availableQty,
        unitPrice: price,
        lineTotal: price * selectableLine.remainingQty,
        requiresCertificateCopy: false,
        note: selectableLine.note || '',
    };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateGoodDeliveryNote() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();

    const [formData, setFormData] = useState(() => createInitialFormData());
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

    // Load from URL params on mount
    useEffect(() => {
        const queryId = searchParams.get('releaseRequestId') || searchParams.get('rrId');
        if (!queryId) return;

        const loadRR = async () => {
            try {
                const data = await getReleaseRequestDetail(queryId);
                if (data) {
                    handleSelectReleaseRequest(data, { silentToast: true });
                }
            } catch (err) {
                console.error('Failed to load release request:', err);
                showToast('Không tải được yêu cầu xuất hàng.', 'error');
            }
        };

        loadRR();
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch release request list
    useEffect(() => {
        const loadRRList = async () => {
            setRrListLoading(true);
            try {
                const result = await getReleaseRequests({ page: 1, pageSize: 100 });
                setRrList(result.items || []);
            } catch (err) {
                console.error('Failed to load release request list:', err);
            } finally {
                setRrListLoading(false);
            }
        };
        loadRRList();
    }, []);

    // Load items on mount
    useEffect(() => {
        const loadItems = async () => {
            try {
                const itemList = await getItemsForDisplay();
                setItems(Array.isArray(itemList) ? itemList : []);
            } catch (err) {
                console.error('Failed to load items:', err);
            }
        };
        loadItems();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (releaseRequestDropdownRef.current && !releaseRequestDropdownRef.current.contains(event.target)) {
                setReleaseRequestDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Derived ───────────────────────────────────────────────────────────────
    const filteredReleaseRequests = useMemo(() => {
        const keyword = normalizeText(releaseRequestQuery.trim());
        if (!keyword) return rrList;
        return rrList.filter(
            (r) =>
                normalizeText(r.releaseRequestCode).includes(keyword) ||
                normalizeText(r.receiverName).includes(keyword) ||
                normalizeText(r.warehouseName).includes(keyword) ||
                normalizeText(r.requestedByName).includes(keyword)
        );
    }, [releaseRequestQuery, rrList]);

    const remainingSelectableLines = useMemo(() => {
        if (!selectedReleaseRequestDetail) return [];
        const selectedLineIds = new Set(lines.map((line) => line.releaseRequestLineId));
        return (selectedReleaseRequestDetail.lines || [])
            .map((line, idx) => buildSelectableLine(line, idx))
            .filter((line) => line.remainingQty > 0 && !selectedLineIds.has(line.releaseRequestLineId));
    }, [selectedReleaseRequestDetail, lines]);

    const filteredProducts = useMemo(() => {
        const keyword = normalizeText(searchKeyword.trim());
        if (!keyword) return remainingSelectableLines;
        return remainingSelectableLines.filter(
            (line) =>
                normalizeText(line.itemName).includes(keyword) ||
                normalizeText(line.itemCode).includes(keyword) ||
                normalizeText(line.uomName).includes(keyword)
        );
    }, [remainingSelectableLines, searchKeyword]);

    const allFilteredSelected =
        filteredProducts.length > 0 &&
        filteredProducts.every((line) => selectedSearchLineIds.includes(line.releaseRequestLineId));
    const someFilteredSelected = filteredProducts.some((line) =>
        selectedSearchLineIds.includes(line.releaseRequestLineId)
    );

    const totalDeliveredQty = useMemo(
        () => lines.reduce((sum, line) => sum + toNumber(line.actualQty), 0),
        [lines]
    );
    const subtotal = useMemo(
        () => lines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0),
        [lines]
    );
    const shippingFee = toNumber(formData.shippingFee);
    const grandTotal = subtotal + shippingFee;
    const currentReleaseRequestMeta = getStatusMeta(selectedReleaseRequestDetail?.status);
    const currentLifecycleMeta = getLifecycleStatusMeta(selectedReleaseRequestDetail?.lifecycleStatus);

    // ─── Handlers ───────────────────────────────────────────────────────────────
    const handleSelectReleaseRequest = useCallback(
        async (summary, options = {}) => {
            if (!summary?.releaseRequestId) return;

            let detail = summary;
            if (!summary.lines || summary.lines.length === 0) {
                try {
                    detail = await getReleaseRequestDetail(summary.releaseRequestId);
                } catch {
                    showToast('Không tải được chi tiết yêu cầu xuất.', 'error');
                    return;
                }
            }

            const itemPrices = {};
            items.forEach((it) => {
                if (it.itemId) {
                    itemPrices[it.itemId] = toNumber(it.salePrice ?? it.purchasePrice ?? 0);
                }
            });

            const linesFromDetail = detail?.lines || summary?.lines || [];
            const initialLines = linesFromDetail
                .map((line, idx) => buildSelectableLine(line, idx))
                .filter((line) => line.remainingQty > 0)
                .map((line) => mapSelectableLineToFormLine(line, itemPrices));

            setSelectedReleaseRequestDetail(detail);
            setReleaseRequestQuery(detail.releaseRequestCode || summary.releaseRequestCode || '');
            setReleaseRequestDropdownOpen(false);
            setLines(initialLines);
            setSearchKeyword('');
            setSelectedSearchLineIds([]);
            setShowProductSearch(false);

            setFormData((prev) => ({
                ...prev,
                releaseRequestId: String(detail.releaseRequestId || detail.ReleaseRequestId || summary.releaseRequestId),
                releaseRequestCode: detail.releaseRequestCode || detail.ReleaseRequestCode || summary.releaseRequestCode || '',
                warehouseId: String(detail.warehouseId || detail.WarehouseId || summary.warehouseId),
                warehouseName: detail.warehouseName || detail.WarehouseName || summary.warehouseName || '',
                receiverId: String(detail.receiverId || detail.ReceiverId || summary.receiverId || (detail.Receiver?.receiverId ?? detail.Receiver?.ReceiverId)),
                receiverName: detail.receiverName || detail.ReceiverName || summary.receiverName || detail.Receiver?.receiverName || detail.Receiver?.ReceiverName || '',
                receiverPhone: detail.receiverPhone || detail.Receiver?.phone || detail.Receiver?.Phone || summary.receiverPhone || '',
                receiverEmail: detail.receiverEmail || detail.Receiver?.email || detail.Receiver?.Email || summary.receiverEmail || '',
                receiverCompanyName: detail.companyName || detail.CompanyName || summary.companyName || detail.Receiver?.companyName || detail.Receiver?.CompanyName || '',
                receiverAddress: detail.address || detail.Address || summary.receiverAddress || summary.address || detail.Receiver?.address || detail.Receiver?.Address || '',
                receiverCity: detail.city || detail.City || summary.city || detail.Receiver?.city || detail.Receiver?.City || '',
                receiverDistrict: detail.district || detail.District || summary.district || detail.Receiver?.district || detail.Receiver?.District || '',
                receiverWard: detail.ward || detail.Ward || summary.ward || detail.Receiver?.ward || detail.Receiver?.Ward || '',
                requestedByName: detail.requestedByName || detail.RequestedByName || summary.requestedByName || '',
                requestedDate: detail.requestedDate || detail.RequestedDate || summary.requestedDate || '',
                expectedDate: detail.expectedDate || detail.ExpectedDate || summary.expectedDate || '',
            }));

            setErrors((prev) => {
                const next = { ...prev };
                delete next.releaseRequestCode;
                delete next.lines;
                return next;
            });

            if (!options.silentToast) {
                if (initialLines.length > 0) {
                    showToast(`Đã nạp ${initialLines.length} dòng vật tư từ yêu cầu xuất`, 'success');
                } else {
                    showToast('Yêu cầu xuất này không còn số lượng phải xuất.', 'warning');
                }
            }
        },
        [showToast, items]
    );

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        if (name === 'note' && value.length > MAX_NOTE_LENGTH) return;
        if (name === 'transportNote' && value.length > MAX_TRANSPORT_NOTE_LENGTH) return;

        if (name === 'shippingFee') {
            const digitsOnly = value.replace(/[^\d]/g, '');
            const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
            setFormData((prev) => ({ ...prev, shippingFee: normalized }));
        } else if (name === 'driverPhone') {
            const digitsOnly = value.replace(/[^\d]/g, '').slice(0, 20);
            setFormData((prev) => ({ ...prev, driverPhone: digitsOnly }));
        } else if (type === 'checkbox') {
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleReleaseRequestSearchChange = (event) => {
        setReleaseRequestQuery(event.target.value);
        setReleaseRequestDropdownOpen(true);
        if (errors.releaseRequestCode) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.releaseRequestCode;
                return next;
            });
        }
    };

    const clearReleaseRequestSelection = () => {
        setSelectedReleaseRequestDetail(null);
        setLines([]);
        setFormData((prev) => ({
            ...prev,
            releaseRequestId: '',
            releaseRequestCode: '',
            warehouseId: '',
            warehouseName: '',
            receiverId: '',
            receiverName: '',
            receiverPhone: '',
            receiverEmail: '',
            receiverCompanyName: '',
            receiverAddress: '',
            receiverCity: '',
            receiverDistrict: '',
            receiverWard: '',
            requestedByName: '',
            requestedDate: '',
            expectedDate: '',
        }));
        setReleaseRequestQuery('');
        setErrors((prev) => {
            const next = { ...prev };
            delete next.releaseRequestCode;
            delete next.lines;
            return next;
        });
    };

    const openProductSearch = () => {
        if (!formData.releaseRequestId) {
            setErrors((prev) => ({ ...prev, releaseRequestCode: 'Yêu cầu xuất tham chiếu là bắt buộc' }));
            showToast('Vui lòng chọn yêu cầu xuất tham chiếu trước.', 'warning');
            return;
        }
        if (!remainingSelectableLines.length) {
            showToast('Không còn vật tư nào chưa xuất để thêm vào phiếu.', 'warning');
            return;
        }
        setShowProductSearch(true);
        setSearchKeyword('');
        setSelectedSearchLineIds([]);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchLineIds([]);
    };

    const addLineFromReleaseRequest = (selectableLine) => {
        const itemPrices = {};
        items.forEach((it) => {
            if (it.itemId) {
                itemPrices[it.itemId] = toNumber(it.salePrice ?? it.purchasePrice ?? 0);
            }
        });
        setLines((prev) => [...prev, mapSelectableLineToFormLine(selectableLine, itemPrices)]);
        if (errors.lines) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.lines;
                return next;
            });
        }
    };

    const toggleSearchLineSelection = (releaseRequestLineId) => {
        setSelectedSearchLineIds((prev) =>
            prev.includes(releaseRequestLineId)
                ? prev.filter((id) => id !== releaseRequestLineId)
                : [...prev, releaseRequestLineId]
        );
    };

    const toggleSelectAllFilteredProducts = (checked) => {
        if (checked) {
            setSelectedSearchLineIds((prev) => {
                const merged = new Set(prev);
                filteredProducts.forEach((line) => merged.add(line.releaseRequestLineId));
                return [...merged];
            });
        } else {
            const filteredIds = new Set(filteredProducts.map((line) => line.releaseRequestLineId));
            setSelectedSearchLineIds((prev) => prev.filter((id) => !filteredIds.has(id)));
        }
    };

    const addSelectedProducts = () => {
        const linesToAdd = filteredProducts.filter((line) =>
            selectedSearchLineIds.includes(line.releaseRequestLineId)
        );
        if (!linesToAdd.length) return;
        linesToAdd.forEach(addLineFromReleaseRequest);
        closeProductSearch();
    };

    const fillAllRemainingQuantities = () => {
        setLines((prev) =>
            prev.map((line) => ({
                ...line,
                actualQty: line.remainingQty,
                lineTotal: line.remainingQty * toNumber(line.unitPrice),
            }))
        );
        showToast('Đã điền số lượng còn phải xuất cho tất cả dòng.', 'success');
    };

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, lineIndex) => {
                if (lineIndex !== index) return line;
                if (field === 'actualQty') {
                    const actualQty = Math.min(Math.max(toNumber(value), 0), line.remainingQty);
                    return { ...line, actualQty, lineTotal: actualQty * toNumber(line.unitPrice) };
                }
                if (field === 'requiresCertificateCopy') {
                    return { ...line, requiresCertificateCopy: Boolean(value) };
                }
                if (field === 'note') {
                    return { ...line, note: String(value).slice(0, MAX_LINE_NOTE_LENGTH) };
                }
                return line;
            })
        );
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    };

    // ─── Validation ─────────────────────────────────────────────────────────────
    const validateForm = () => {
        const nextErrors = {};
        if (!formData.releaseRequestId) {
            nextErrors.releaseRequestCode = 'Yêu cầu xuất tham chiếu là bắt buộc';
        }
        if (!formData.issueDate) {
            nextErrors.issueDate = 'Ngày xuất hàng là bắt buộc';
        }
        if (!lines.length) {
            nextErrors.lines = 'Vui lòng thêm ít nhất 1 vật tư vào phiếu xuất';
        } else {
            const invalidLine = lines.find(
                (line) => toNumber(line.actualQty) <= 0 || toNumber(line.actualQty) > toNumber(line.remainingQty)
            );
            if (invalidLine) {
                nextErrors.lines = 'Số lượng xuất phải lớn hơn 0 và không vượt quá số lượng còn phải xuất';
            }
        }
        if (shippingFee < 0) {
            nextErrors.shippingFee = 'Phí vận chuyển phải lớn hơn hoặc bằng 0';
        }
        if (formData.isPaid && !formData.paymentMethod) {
            nextErrors.paymentMethod = 'Vui lòng chọn phương thức thanh toán';
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    // ─── Submit ────────────────────────────────────────────────────────────────
    const buildPayload = () => ({
        ReleaseRequestId: Number(formData.releaseRequestId),
        WarehouseId: Number(formData.warehouseId),
        IssueDate: formData.issueDate,
        Status: 'PENDING_ACC',
        PickingStrategy: formData.pickingStrategy || 'FIFO',
        Note: formData.note.trim() || null,
        ShippingFee: shippingFee,
        IsPaid: Boolean(formData.isPaid),
        PaymentMethod: formData.isPaid ? formData.paymentMethod : null,
        Lines: lines.map((line) => ({
            ItemId: Number(line.itemId),
            RequestedQty: toNumber(line.remainingQty),
            ActualQty: toNumber(line.actualQty),
            UomId: Number(line.uomId),
            ReleaseRequestLineId: Number(line.releaseRequestLineId),
            UnitPrice: toNumber(line.unitPrice),
            RequiresCertificateCopy: Boolean(line.requiresCertificateCopy),
            Note: line.note?.trim() || null,
        })),
        TransportInfo: {
            CarrierName: formData.carrierName.trim() || null,
            DriverName: formData.driverName.trim() || null,
            DriverPhone: formData.driverPhone.trim() || null,
            LicensePlate: formData.licensePlate.trim() || null,
            Note: formData.transportNote.trim() || null,
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin phiếu xuất.', 'error');
            return;
        }
        if (submitting) return;
        const payload = buildPayload();
        try {
            setSubmitting(true);
            await createGoodsDeliveryNote(payload);
            showToast('Tạo phiếu xuất hàng thành công!', 'success');
            setTimeout(() => navigate('/goods-delivery-notes'), 1200);
        } catch (error) {
            showToast(error?.message || 'Không thể tạo phiếu xuất hàng.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="create-supplier-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting}>
                        <X size={15} />
                        Hủy
                    </button>
                    <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                        {submitting ? (
                            <>
                                <Loader size={15} className="spinner" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <Save size={15} />
                                Tạo phiếu xuất
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="form-card">
                <form id="create-gdn-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo phiếu xuất hàng</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* ── Card 1: Thông tin phiếu xuất ── */}
                    <div className="gdn-card gdn-card-info">
                        <div className="gdn-card-header">
                            <FileText size={18} className="gdn-card-header-icon" />
                            <h2 className="gdn-card-title">Thông tin phiếu xuất</h2>
                        </div>
                        <div className="gdn-info-grid">
                            <div className="gdn-info-field" ref={releaseRequestDropdownRef}>
                                <label className="form-label">
                                    Yêu cầu xuất tham chiếu <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Search size={15} className="input-icon-left" />
                                    <input
                                        type="text"
                                        value={releaseRequestQuery}
                                        onChange={handleReleaseRequestSearchChange}
                                        onFocus={() => setReleaseRequestDropdownOpen(true)}
                                        placeholder="Tìm theo mã yêu cầu, người nhận, kho..."
                                        className={`form-input ${errors.releaseRequestCode ? 'error' : ''}`}
                                    />
                                </div>
                                {errors.releaseRequestCode && (
                                    <span className="error-message">{errors.releaseRequestCode}</span>
                                )}

                                {releaseRequestDropdownOpen && (
                                    <div className="gdn-rr-dropdown">
                                        {rrListLoading ? (
                                            <div className="gdn-rr-dropdown-loading">Đang tải...</div>
                                        ) : filteredReleaseRequests.length === 0 ? (
                                            <div className="gdn-rr-dropdown-empty">Không tìm thấy yêu cầu xuất nào</div>
                                        ) : (
                                            filteredReleaseRequests.map((rr) => {
                                                const sMeta = getStatusMeta(rr.status);
                                                const lMeta = getLifecycleStatusMeta(rr.lifecycleStatus);
                                                return (
                                                    <div
                                                        key={rr.releaseRequestId}
                                                        className="gdn-rr-item"
                                                        onClick={() => handleSelectReleaseRequest(rr)}
                                                    >
                                                        <div className="gdn-rr-item-header">
                                                            <span className="gdn-rr-item-code">{rr.releaseRequestCode}</span>
                                                            <div className="gdn-rr-item-badges">
                                                                <span className="gdn-badge" style={{ backgroundColor: sMeta.bg, color: sMeta.color }}>
                                                                    {sMeta.label}
                                                                </span>
                                                                <span className="gdn-badge" style={{ backgroundColor: lMeta.bg, color: lMeta.color }}>
                                                                    {lMeta.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="gdn-rr-item-meta">
                                                            <span>{rr.receiverName}</span>
                                                            <span>•</span>
                                                            <span>{rr.warehouseName}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {formData.releaseRequestId && (
                                    <div className="gdn-rr-selected">
                                        <div className="gdn-rr-selected-inner">
                                            <span className="gdn-rr-selected-code">{formData.releaseRequestCode}</span>
                                            <div className="gdn-rr-selected-badges">
                                                <span className="gdn-badge" style={{ backgroundColor: currentReleaseRequestMeta.bg, color: currentReleaseRequestMeta.color }}>
                                                    {currentReleaseRequestMeta.label}
                                                </span>
                                                <span className="gdn-badge" style={{ backgroundColor: currentLifecycleMeta.bg, color: currentLifecycleMeta.color }}>
                                                    {currentLifecycleMeta.label}
                                                </span>
                                            </div>
                                        </div>
                                        <button type="button" className="gdn-rr-clear-btn" onClick={clearReleaseRequestSelection} title="Bỏ chọn">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="gdn-info-field">
                                <label className="form-label">Kho xuất</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.warehouseName}
                                        readOnly
                                        className="form-input"
                                        placeholder="—"
                                    />
                                </div>
                            </div>

                            <div className="gdn-info-field">
                                <label className="form-label">Ngày xuất hàng <span className="required-mark">*</span></label>
                                <div className="input-wrapper">
                                    <input
                                        type="date"
                                        name="issueDate"
                                        value={formData.issueDate}
                                        onChange={handleChange}
                                        className={`form-input ${errors.issueDate ? 'error' : ''}`}
                                    />
                                </div>
                                {errors.issueDate && <span className="error-message">{errors.issueDate}</span>}
                            </div>

                            <div className="gdn-info-field">
                                <label className="form-label">Người tạo</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.createdByName}
                                        readOnly
                                        className="form-input"
                                        placeholder="—"
                                    />
                                </div>
                            </div>

                            <div className="gdn-info-field">
                                <label className="form-label">Người yêu cầu</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.requestedByName}
                                        readOnly
                                        className="form-input"
                                        placeholder="—"
                                    />
                                </div>
                            </div>

                            <div className="gdn-info-field">
                                <label className="form-label">Ngày yêu cầu</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        value={formData.requestedDate}
                                        readOnly
                                        className="form-input"
                                        placeholder="—"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Main Grid ── */}
                    <div className="gdn-main-grid">
                        {/* LEFT: Chi tiết vật tư xuất */}
                        <div className="gdn-main-left">
                            <div className="gdn-card">
                                <div className="gdn-card-header">
                                    <ClipboardList size={18} className="gdn-card-header-icon" />
                                    <h2 className="gdn-card-title">Chi tiết vật tư xuất</h2>
                                </div>
                                <div className="gdn-product-actions">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={fillAllRemainingQuantities} disabled={!lines.length}>
                                        <Save size={14} />
                                        Điền SL còn lại
                                    </button>
                                    <button type="button" className="btn btn-sm" onClick={openProductSearch}>
                                        <Plus size={16} />
                                        Thêm vật tư
                                    </button>
                                </div>

                                {errors.lines && (
                                    <div className="error-message gdn-error">{errors.lines}</div>
                                )}

                                {/* Product Search */}
                                {showProductSearch && (
                                    <div className="gdn-product-search-panel">
                                        <div className="gdn-product-search-bar">
                                            <Search size={16} className="gdn-search-icon" />
                                            <input
                                                type="text"
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                placeholder="Tìm vật tư còn phải xuất..."
                                                autoFocus
                                            />
                                            <button type="button" className="gdn-search-close" onClick={closeProductSearch}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="gdn-product-search-dropdown">
                                            {filteredProducts.length === 0 ? (
                                                <div className="gdn-product-search-empty">
                                                    <Package size={28} />
                                                    <p>Không còn vật tư phù hợp để thêm</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="gdn-product-search-select-all">
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={allFilteredSelected}
                                                                ref={(el) => { if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected; }}
                                                                onChange={(e) => toggleSelectAllFilteredProducts(e.target.checked)}
                                                            />
                                                            Chọn tất cả ({filteredProducts.length})
                                                        </label>
                                                    </div>
                                                    {filteredProducts.map((product) => {
                                                        const checked = selectedSearchLineIds.includes(product.releaseRequestLineId);
                                                        return (
                                                            <div
                                                                key={product.id}
                                                                className={`gdn-product-search-item ${checked ? 'selected' : ''}`}
                                                                onClick={() => toggleSearchLineSelection(product.releaseRequestLineId)}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleSearchLineSelection(product.releaseRequestLineId)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <div className="gdn-product-search-item-thumb">
                                                                    <Package size={16} />
                                                                </div>
                                                                <div className="gdn-product-search-item-info">
                                                                    <span className="gdn-product-search-item-name">{product.itemName}</span>
                                                                    <span className="gdn-product-search-item-sub">
                                                                        Mã: {product.itemCode || '-'} • DVT: {product.uomName || '-'} • Còn phải xuất: {formatQuantity(product.remainingQty)}
                                                                    </span>
                                                                </div>
                                                                <span className="gdn-product-search-item-price">{formatCurrency(product.unitPrice)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="gdn-product-search-footer">
                                                        <span>Đã chọn: {selectedSearchLineIds.length} dòng</span>
                                                        <button type="button" className="btn btn-sm" onClick={addSelectedProducts} disabled={!selectedSearchLineIds.length}>
                                                            Thêm đã chọn
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Lines Table or Empty State */}
                                {!lines.length ? (
                                    <div className="gdn-empty-state">
                                        <div className="gdn-empty-icon">
                                            <Package size={48} strokeWidth={1.5} />
                                        </div>
                                        <p className="gdn-empty-title">Chưa có vật tư xuất nào</p>
                                        <p className="gdn-empty-desc">Chọn yêu cầu xuất tham chiếu rồi thêm vật tư cần xuất vào phiếu.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="table-container gdn-table-container">
                                            <table className="product-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                        <th style={{ minWidth: '240px' }}>Vật tư</th>
                                                        <th style={{ width: '85px', textAlign: 'right' }}>SL YC</th>
                                                        <th style={{ width: '80px', textAlign: 'right' }}>Đã cấp</th>
                                                        <th style={{ width: '80px', textAlign: 'right' }}>Đã xuất</th>
                                                        <th style={{ width: '90px', textAlign: 'right' }}>Còn xuất</th>
                                                        <th style={{ width: '130px', textAlign: 'center' }}>SL thực xuất</th>
                                                        <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                        <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền</th>
                                                        <th style={{ width: '70px', textAlign: 'center' }}>CC</th>
                                                        <th style={{ width: '160px' }}>Ghi chú</th>
                                                        <th style={{ width: '46px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lines.map((line, index) => (
                                                        <tr key={line.id}>
                                                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                            <td>
                                                                <div className="gdn-line-item">
                                                                    <div className="gdn-line-thumb"><Package size={18} /></div>
                                                                    <div className="gdn-line-info">
                                                                        <span className="gdn-line-name">{line.itemName}</span>
                                                                        <span className="gdn-line-sub">Mã: {line.itemCode || '-'} • DVT: {line.uomName || '-'} • Tồn: {formatQuantity(line.availableQty)}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>{formatQuantity(line.requestedQty)}</td>
                                                            <td style={{ textAlign: 'right' }}>{formatQuantity(line.allocatedQty)}</td>
                                                            <td style={{ textAlign: 'right' }}>{formatQuantity(line.issuedQty)}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>{formatQuantity(line.remainingQty)}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <div className="gdn-qty-input-wrap">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={line.remainingQty}
                                                                        step="0.001"
                                                                        value={line.actualQty}
                                                                        onChange={(e) => updateLine(index, 'actualQty', e.target.value)}
                                                                        className="form-input gdn-qty-input"
                                                                    />
                                                                    <span className="gdn-qty-suffix">/ {formatQuantity(line.remainingQty)}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>{formatCurrency(line.unitPrice)}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>{formatCurrency(line.lineTotal)}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={line.requiresCertificateCopy}
                                                                    onChange={(e) => updateLine(index, 'requiresCertificateCopy', e.target.checked)}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={line.note}
                                                                    onChange={(e) => updateLine(index, 'note', e.target.value)}
                                                                    placeholder="Ghi chú"
                                                                    className="form-input gdn-note-input"
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button type="button" onClick={() => removeLine(index)} className="btn-icon-only gdn-remove-btn" title="Xóa dòng">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Summary bar */}
                                        <div className="gdn-lines-summary">
                                            <span><strong>{lines.length}</strong> dòng vật tư</span>
                                            <span>•</span>
                                            <span>Tổng SL thực xuất: <strong>{totalDeliveredQty.toLocaleString('vi-VN')}</strong></span>
                                            <span>•</span>
                                            <span>Tổng tiền hàng: <strong className="gdn-summary-total">{formatCurrency(subtotal)}</strong></span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Sidebar cards */}
                        <div className="gdn-main-right">
                            {/* Người nhận hàng */}
                            <div className="gdn-card">
                                <div className="gdn-card-header">
                                    <h2 className="gdn-card-title">Người nhận hàng</h2>
                                </div>
                                {formData.receiverName ? (
                                    <div className="gdn-receiver-info">
                                        <div className="gdn-receiver-row">
                                            <span className="gdn-receiver-label">Tên</span>
                                            <span className="gdn-receiver-value">{formData.receiverName}</span>
                                        </div>
                                        {formData.receiverPhone && (
                                            <div className="gdn-receiver-row">
                                                <span className="gdn-receiver-label">SĐT</span>
                                                <span className="gdn-receiver-value gdn-receiver-value-icon">
                                                    <Phone size={13} />{formData.receiverPhone}
                                                </span>
                                            </div>
                                        )}
                                        {formData.receiverCompanyName && (
                                            <div className="gdn-receiver-row">
                                                <span className="gdn-receiver-label">Công ty</span>
                                                <span className="gdn-receiver-value">{formData.receiverCompanyName}</span>
                                            </div>
                                        )}
                                        {formData.receiverAddress && (
                                            <div className="gdn-receiver-row">
                                                <span className="gdn-receiver-label">Địa chỉ</span>
                                                <span className="gdn-receiver-value gdn-receiver-value-icon">
                                                    <MapPin size={13} />{formData.receiverAddress}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="gdn-empty-inline">Chọn yêu cầu xuất tham chiếu để hiển thị.</div>
                                )}
                            </div>

                            {/* Vận chuyển */}
                            <div className="gdn-card">
                                <div className="gdn-card-header">
                                    <Truck size={16} className="gdn-card-header-icon" />
                                    <h2 className="gdn-card-title">Vận chuyển</h2>
                                </div>
                                <div className="gdn-transport-grid">
                                    <div className="form-field">
                                        <label className="form-label">Hãng vận chuyển</label>
                                        <div className="input-wrapper">
                                            <input type="text" name="carrierName" value={formData.carrierName} onChange={handleChange} placeholder="Tên hãng vận chuyển" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Tài xế</label>
                                        <div className="input-wrapper">
                                            <input type="text" name="driverName" value={formData.driverName} onChange={handleChange} placeholder="Tên tài xế" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">SĐT tài xế</label>
                                        <div className="input-wrapper">
                                            <input type="text" name="driverPhone" value={formData.driverPhone} onChange={handleChange} placeholder="Số điện thoại" className="form-input" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Biển số xe</label>
                                        <div className="input-wrapper">
                                            <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="Biển số xe" className="form-input" />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú vận chuyển</label>
                                    <textarea
                                        name="transportNote"
                                        value={formData.transportNote}
                                        onChange={handleChange}
                                        placeholder="Ghi chú vận chuyển..."
                                        rows={2}
                                        className="form-input"
                                    />
                                    <span className="gdn-char-counter">{formData.transportNote.length}/{MAX_TRANSPORT_NOTE_LENGTH}</span>
                                </div>
                            </div>

                            {/* Chiến lược xuất kho */}
                            <div className="gdn-card">
                                <div className="gdn-card-header">
                                    <h2 className="gdn-card-title">Chiến lược xuất kho</h2>
                                </div>
                                <div className="gdn-strategy-options">
                                    {[
                                        { value: 'FIFO', label: 'FIFO', desc: 'Nhập trước xuất trước' },
                                        { value: 'LIFO', label: 'LIFO', desc: 'Nhập sau xuất trước' },
                                    ].map((opt) => {
                                        const selected = formData.pickingStrategy === opt.value;
                                        return (
                                            <label key={opt.value} className={`gdn-strategy-option ${selected ? 'selected' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="pickingStrategy"
                                                    value={opt.value}
                                                    checked={selected}
                                                    onChange={(e) => setFormData((prev) => ({ ...prev, pickingStrategy: e.target.value }))}
                                                />
                                                <div className="gdn-strategy-option-body">
                                                    <span className="gdn-strategy-option-label">{opt.label}</span>
                                                    <span className="gdn-strategy-option-desc">{opt.desc}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="gdn-helper-note">
                                    Chiến lược xác định lô hàng được xuất trước dựa theo ngày nhập kho.
                                </div>
                            </div>

                            {/* Thanh toán & Tổng tiền */}
                            <div className="gdn-card gdn-card-payment">
                                <div className="gdn-card-header">
                                    <h2 className="gdn-card-title">Thanh toán & Tổng tiền</h2>
                                </div>
                                <div className="gdn-payment-section">
                                    <label className="gdn-payment-checkbox">
                                        <input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} />
                                        <span>Đã thanh toán</span>
                                    </label>

                                    {formData.isPaid && (
                                        <div className="form-field">
                                            <label className="form-label">Phương thức</label>
                                            <div className="input-wrapper">
                                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={`form-input ${errors.paymentMethod ? 'error' : ''}`}>
                                                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.paymentMethod && <span className="error-message">{errors.paymentMethod}</span>}
                                        </div>
                                    )}

                                    <div className="form-field">
                                        <label className="form-label">Phí vận chuyển</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                name="shippingFee"
                                                value={formData.shippingFee}
                                                onChange={handleChange}
                                                className={`form-input ${errors.shippingFee ? 'error' : ''}`}
                                                placeholder="0"
                                            />
                                            <span className="input-suffix">₫</span>
                                        </div>
                                        {errors.shippingFee && <span className="error-message">{errors.shippingFee}</span>}
                                    </div>
                                </div>

                                <div className="gdn-payment-summary">
                                    <div className="gdn-payment-row">
                                        <span>Tiền hàng</span>
                                        <span className="gdn-payment-amount">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="gdn-payment-row">
                                        <span>Phí vận chuyển</span>
                                        <span className={`gdn-payment-amount ${shippingFee > 0 ? 'accent' : ''}`}>+ {formatCurrency(shippingFee)}</span>
                                    </div>
                                    <div className="gdn-payment-total-row">
                                        <span>Thành tiền</span>
                                        <span className="gdn-payment-total-amount">{formatCurrency(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Card cuối: Ghi chú phiếu xuất ── */}
                    <div className="gdn-card gdn-card-note">
                        <div className="gdn-card-header">
                            <h2 className="gdn-card-title">Ghi chú phiếu xuất</h2>
                        </div>
                        <div className="form-field">
                            <textarea
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                placeholder="Nhập ghi chú cho phiếu xuất hàng (nếu có)..."
                                rows={3}
                                className={`form-input ${errors.note ? 'error' : ''}`}
                            />
                            <span className="gdn-char-counter">{formData.note.length}/{MAX_NOTE_LENGTH}</span>
                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
