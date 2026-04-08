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
        // fallback for camelCase keys from backend (e.g. IssuePartial, IssueFull)
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

    // Load from URL params on mount (fetch from API)
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

    // Fetch release request list for dropdown
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

    // Load items with prices on mount
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

    // ─── Handlers ───────────────────────────────────────────────────────────────
    const handleSelectReleaseRequest = useCallback(
        async (summary, options = {}) => {
            if (!summary?.releaseRequestId) return;

            // Fetch full detail to get lines (dropdown only returns header, not lines)
            let detail = summary;
            if (!summary.lines || summary.lines.length === 0) {
                try {
                    detail = await getReleaseRequestDetail(summary.releaseRequestId);
                } catch {
                    showToast('Không tải được chi tiết yêu cầu xuất.', 'error');
                    return;
                }
            }

            // Build item price lookup from items state
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
                    return {
                        ...line,
                        actualQty,
                        lineTotal: actualQty * toNumber(line.unitPrice),
                    };
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

    const buildTransportPayload = () => ({
        gdnid: 0,
        carrierName: formData.carrierName.trim() || null,
        driverName: formData.driverName.trim() || null,
        driverPhone: formData.driverPhone.trim() || null,
        licensePlate: formData.licensePlate.trim() || null,
        note: formData.transportNote.trim() || null,
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

            // Real API call
            await createGoodsDeliveryNote(payload);

            console.log('Create Goods Delivery Note payload:', payload);

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

                    {/* Main Grid */}
                    <div className="gdn-create-main-grid" style={{ height: '760px' }}>
                        {/* LEFT: Product lines */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '760px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư xuất</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={fillAllRemainingQuantities}
                                        disabled={!lines.length}
                                    >
                                        <Save size={14} />
                                        Điền SL còn lại
                                    </button>
                                    <button type="button" className="btn btn-sm" onClick={openProductSearch}>
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

                            {/* Product Search Dropdown */}
                            {showProductSearch && (
                                <div className="gdn-product-search-panel">
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
                                            onChange={(event) => setSearchKeyword(event.target.value)}
                                            placeholder="Tìm vật tư còn phải xuất trong yêu cầu tham chiếu..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 44px',
                                                border: '2px solid #0284c7',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(2, 132, 199, 0.08)',
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
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="gdn-product-search-dropdown">
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                <Package
                                                    size={32}
                                                    style={{ margin: '0 auto 8px', opacity: 0.5 }}
                                                />
                                                <p style={{ margin: 0, fontSize: '13px' }}>
                                                    Không còn vật tư phù hợp để thêm
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div
                                                    style={{
                                                        padding: '10px 16px',
                                                        borderBottom: '1px solid #f3f4f6',
                                                        backgroundColor: '#f8fafc',
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            color: '#334155',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={allFilteredSelected}
                                                            ref={(element) => {
                                                                if (element) {
                                                                    element.indeterminate =
                                                                        !allFilteredSelected && someFilteredSelected;
                                                                }
                                                            }}
                                                            onChange={(event) =>
                                                                toggleSelectAllFilteredProducts(event.target.checked)
                                                            }
                                                            style={{
                                                                cursor: 'pointer',
                                                                width: '16px',
                                                                height: '16px',
                                                            }}
                                                        />
                                                        Chọn tất cả ({filteredProducts.length})
                                                    </label>
                                                </div>

                                                {filteredProducts.map((product) => {
                                                    const checked = selectedSearchLineIds.includes(
                                                        product.releaseRequestLineId
                                                    );
                                                    return (
                                                        <div
                                                            key={product.id}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f3f4f6',
                                                                transition: 'background-color 0.15s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                cursor: 'pointer',
                                                                backgroundColor: checked ? '#eff6ff' : 'transparent',
                                                            }}
                                                            onClick={() =>
                                                                toggleSearchLineSelection(product.releaseRequestLineId)
                                                            }
                                                            onMouseEnter={(event) => {
                                                                if (!checked)
                                                                    event.currentTarget.style.backgroundColor = '#f9fafb';
                                                            }}
                                                            onMouseLeave={(event) => {
                                                                event.currentTarget.style.backgroundColor = checked
                                                                    ? '#eff6ff'
                                                                    : 'transparent';
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() =>
                                                                    toggleSearchLineSelection(product.releaseRequestLineId)
                                                                }
                                                                onClick={(event) => event.stopPropagation()}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    flexShrink: 0,
                                                                }}
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
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'start',
                                                                        marginBottom: '4px',
                                                                        gap: '16px',
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 500,
                                                                            color: '#1f2937',
                                                                        }}
                                                                    >
                                                                        {product.itemName}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 600,
                                                                            color: '#0284c7',
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
                                                                    <span>Mã: {product.itemCode || '-'}</span>
                                                                    <span>•</span>
                                                                    <span>DVT: {product.uomName || '-'}</span>
                                                                    <span>•</span>
                                                                    <span>
                                                                        Còn phải xuất:{' '}
                                                                        {formatQuantity(product.remainingQty)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <div
                                                    style={{
                                                        padding: '12px 16px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        backgroundColor: '#fff',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '13px',
                                                            color: '#64748b',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Đã chọn: {selectedSearchLineIds.length} dòng vật tư
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm"
                                                        onClick={addSelectedProducts}
                                                        disabled={!selectedSearchLineIds.length}
                                                    >
                                                        Thêm đã chọn
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Empty state */}
                            {!lines.length ? (
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
                                        textAlign: 'center',
                                    }}
                                >
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                                        Chưa có vật tư xuất nào
                                    </p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>
                                        Chọn yêu cầu xuất tham chiếu rồi thêm vật tư cần xuất vào phiếu.
                                    </p>
                                </div>
                            ) : (
                                /* Lines table */
                                <div
                                    className="table-container"
                                    style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
                                >
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ minWidth: '260px' }}>Vật tư</th>
                                                <th style={{ width: '90px', textAlign: 'right' }}>SL YC</th>
                                                <th style={{ width: '90px', textAlign: 'right' }}>Đã cấp</th>
                                                <th style={{ width: '90px', textAlign: 'right' }}>Đã xuất</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>Còn xuất</th>
                                                <th style={{ width: '120px', textAlign: 'center' }}>SL thực xuất</th>
                                                <th style={{ width: '130px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Bản sao CC</th>
                                                <th style={{ width: '180px' }}>Ghi chú dòng</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 2,
                                                                    minWidth: 0,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 500,
                                                                        color: '#0284c7',
                                                                    }}
                                                                >
                                                                    {line.itemName}
                                                                </span>
                                                                <span
                                                                    style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}
                                                                >
                                                                    Mã: {line.itemCode || '-'} • DVT: {line.uomName || '-'}
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                                    Tồn: {formatQuantity(line.availableQty)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.requestedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.allocatedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.issuedQty)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontWeight: 700,
                                                            color: '#0f766e',
                                                        }}
                                                    >
                                                        {formatQuantity(line.remainingQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={line.remainingQty}
                                                                step="0.001"
                                                                value={line.actualQty}
                                                                onChange={(event) =>
                                                                    updateLine(index, 'actualQty', event.target.value)
                                                                }
                                                                className="form-input"
                                                                style={{
                                                                    textAlign: 'right',
                                                                    width: '76px',
                                                                    padding: '4px 6px',
                                                                    fontSize: '13px',
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    fontSize: '12px',
                                                                    color: '#9ca3af',
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                / {formatQuantity(line.remainingQty)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                                                        {formatCurrency(line.lineTotal)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={line.requiresCertificateCopy}
                                                            onChange={(event) =>
                                                                updateLine(
                                                                    index,
                                                                    'requiresCertificateCopy',
                                                                    event.target.checked
                                                                )
                                                            }
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={line.note}
                                                            onChange={(event) =>
                                                                updateLine(index, 'note', event.target.value)
                                                            }
                                                            placeholder="Ghi chú dòng"
                                                            className="form-input"
                                                            style={{ padding: '8px 10px', fontSize: '13px' }}
                                                        />
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

                        {/* RIGHT: Info panels */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '760px', overflowY: 'auto' }}>
                            {/* General Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Release Request Selector */}
                                    <div className="form-field" ref={releaseRequestDropdownRef}>
                                        <label className="form-label">
                                            Yêu cầu xuất tham chiếu{' '}
                                            <span className="required-mark">*</span>
                                        </label>

                                        <div style={{ position: 'relative' }}>
                                            <Search
                                                style={{
                                                    position: 'absolute',
                                                    left: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    color: '#9ca3af',
                                                }}
                                                size={16}
                                            />
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
                                                    maxHeight: '320px',
                                                    overflowY: 'auto',
                                                    zIndex: 200,
                                                }}
                                            >
                                                {filteredReleaseRequests.length === 0 ? (
                                                    <div
                                                        style={{
                                                            padding: '20px',
                                                            textAlign: 'center',
                                                            color: '#9ca3af',
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        Không tìm thấy yêu cầu xuất nào
                                                    </div>
                                                ) : (
                                                    filteredReleaseRequests.map((rr) => {
                                                        const statusMeta = getStatusMeta(rr.status);
                                                        const lifecycleMeta = getLifecycleStatusMeta(rr.lifecycleStatus);
                                                        return (
                                                            <div
                                                                key={rr.releaseRequestId}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderBottom: '1px solid #f3f4f6',
                                                                    cursor: 'pointer',
                                                                    transition: 'background-color 0.15s',
                                                                }}
                                                                onClick={() => handleSelectReleaseRequest(rr)}
                                                                onMouseEnter={(e) =>
                                                                    (e.currentTarget.style.backgroundColor = '#f9fafb')
                                                                }
                                                                onMouseLeave={(e) =>
                                                                    (e.currentTarget.style.backgroundColor = 'transparent')
                                                                }
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        marginBottom: '6px',
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 600,
                                                                            color: '#1f2937',
                                                                        }}
                                                                    >
                                                                        {rr.releaseRequestCode}
                                                                    </span>
                                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                        <span
                                                                            style={{
                                                                                fontSize: '10px',
                                                                                fontWeight: 600,
                                                                                padding: '1px 6px',
                                                                                borderRadius: '9999px',
                                                                                backgroundColor: statusMeta.bg,
                                                                                color: statusMeta.color,
                                                                            }}
                                                                        >
                                                                            {statusMeta.label}
                                                                        </span>
                                                                        <span
                                                                            style={{
                                                                                fontSize: '10px',
                                                                                fontWeight: 600,
                                                                                padding: '1px 6px',
                                                                                borderRadius: '9999px',
                                                                                backgroundColor: lifecycleMeta.bg,
                                                                                color: lifecycleMeta.color,
                                                                            }}
                                                                            title="Trạng thái xuất kho"
                                                                        >
                                                                            {lifecycleMeta.label}
                                                                        </span>
                                                                    </div>
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
                                    </div>

                                    {/* Show selected RR info */}
                                    {formData.releaseRequestId && (
                                        <div
                                            style={{
                                                padding: '10px 12px',
                                                backgroundColor: '#f0fdf4',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span
                                                    style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#15803d',
                                                    }}
                                                >
                                                    {formData.releaseRequestCode}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '12px',
                                                        color: '#166534',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            padding: '1px 6px',
                                                            borderRadius: '9999px',
                                                            backgroundColor: getLifecycleStatusMeta(selectedReleaseRequestDetail?.lifecycleStatus).bg,
                                                            color: getLifecycleStatusMeta(selectedReleaseRequestDetail?.lifecycleStatus).color,
                                                        }}
                                                        title="Trạng thái xuất kho"
                                                    >
                                                        {getLifecycleStatusMeta(selectedReleaseRequestDetail?.lifecycleStatus).label}
                                                    </span>
                                                    <span>•</span>
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            padding: '1px 6px',
                                                            borderRadius: '9999px',
                                                            backgroundColor: currentReleaseRequestMeta.bg,
                                                            color: currentReleaseRequestMeta.color,
                                                        }}
                                                    >
                                                        {currentReleaseRequestMeta.label}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{formData.warehouseName}</span>
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearReleaseRequestSelection}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#9ca3af',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                                title="Bỏ chọn"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
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
                                        <label className="form-label">
                                            Ngày xuất hàng <span className="required-mark">*</span>
                                        </label>
                                        <div className="input-wrapper">
                                            <input
                                                type="date"
                                                name="issueDate"
                                                value={formData.issueDate}
                                                onChange={handleChange}
                                                className={`form-input ${errors.issueDate ? 'error' : ''}`}
                                            />
                                        </div>
                                        {errors.issueDate && (
                                            <span className="error-message">{errors.issueDate}</span>
                                        )}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho xuất</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                value={formData.warehouseName}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người yêu cầu</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                value={formData.requestedByName}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày yêu cầu</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                value={formData.requestedDate}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày dự kiến</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                value={formData.expectedDate}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Receiver Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Người nhận hàng</h2>
                                </div>

                                {formData.receiverName ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            fontSize: '14px',
                                            color: '#334155',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Tên: </span>
                                            <span>{formData.receiverName}</span>
                                        </div>
                                        {formData.receiverPhone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={14} color="#6b7280" />
                                                <span>{formData.receiverPhone}</span>
                                            </div>
                                        )}
                                        {formData.receiverCompanyName && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Công ty: </span>
                                                <span>{formData.receiverCompanyName}</span>
                                            </div>
                                        )}
                                        {formData.receiverAddress && (
                                            <div style={{ display: 'flex', alignItems: 'start', gap: '6px' }}>
                                                <MapPin size={14} color="#6b7280" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>{formData.receiverAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                                        Chọn yêu cầu xuất tham chiếu để hiển thị thông tin người nhận
                                    </div>
                                )}
                            </div>

                            {/* Transport Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <Truck size={16} style={{ marginRight: '6px' }} />
                                        Vận chuyển
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Tên hãng vận chuyển</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="carrierName"
                                                value={formData.carrierName}
                                                onChange={handleChange}
                                                placeholder="Nhập tên hãng vận chuyển"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Tên tài xế</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="driverName"
                                                value={formData.driverName}
                                                onChange={handleChange}
                                                placeholder="Nhập tên tài xế"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">SĐT tài xế</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="driverPhone"
                                                value={formData.driverPhone}
                                                onChange={handleChange}
                                                placeholder="Nhập số điện thoại tài xế"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Biển số xe</label>
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                name="licensePlate"
                                                value={formData.licensePlate}
                                                onChange={handleChange}
                                                placeholder="Nhập biển số xe"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ghi chú vận chuyển</label>
                                        <textarea
                                            name="transportNote"
                                            value={formData.transportNote}
                                            onChange={handleChange}
                                            placeholder="Ghi chú vận chuyển..."
                                            rows={3}
                                            className="form-input"
                                            style={{ resize: 'vertical' }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                fontSize: '12px',
                                                color:
                                                    formData.transportNote.length >= MAX_TRANSPORT_NOTE_LENGTH
                                                        ? '#ef4444'
                                                        : '#6b7280',
                                                marginTop: '4px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {formData.transportNote.length}/{MAX_TRANSPORT_NOTE_LENGTH} ký tự
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="gdn-create-bottom-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                            {/* Notes */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú phiếu xuất</h2>
                                </div>
                                <div className="form-field">
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleChange}
                                        placeholder="Nhập ghi chú cho phiếu xuất hàng..."
                                        rows={4}
                                        className={`form-input ${errors.note ? 'error' : ''}`}
                                        style={{ resize: 'vertical' }}
                                    />
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            fontSize: '12px',
                                            color:
                                                formData.note.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#6b7280',
                                            marginTop: '4px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {formData.note.length}/{MAX_NOTE_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp phiếu xuất</h2>
                                </div>
                                <div className="gdn-summary-cards">
                                    <div
                                        style={{
                                            padding: '12px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                color: '#64748b',
                                                marginBottom: '6px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Tổng số lượng xuất
                                        </div>
                                        <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                                            {totalDeliveredQty} sản phẩm
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            padding: '12px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                color: '#64748b',
                                                marginBottom: '6px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Số dòng vật tư
                                        </div>
                                        <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                                            {lines.length} dòng
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    <div
                                        style={{
                                            padding: '14px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '14px',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Tổng tiền hàng</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>
                                                + {formatCurrency(subtotal)}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '14px',
                                            }}
                                        >
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Phí vận chuyển</span>
                                            <span
                                                style={{
                                                    color: shippingFee > 0 ? '#ef4444' : '#64748b',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                + {formatCurrency(shippingFee)}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            padding: '16px',
                                            backgroundColor: '#e0f2fe',
                                            borderRadius: '12px',
                                            borderLeft: '4px solid #0284c7',
                                            marginTop: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>
                                            Tổng tiền
                                        </span>
                                        <span style={{ fontSize: '22px', fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Picking Strategy */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chiến lược xuất kho</h2>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                                {[
                                    { value: 'FIFO', label: 'FIFO', desc: 'Nhập trước xuất trước' },
                                    { value: 'LIFO', label: 'LIFO', desc: 'Nhập sau xuất trước' },
                                ].map((opt) => {
                                    const selected = formData.pickingStrategy === opt.value;
                                    return (
                                        <label
                                            key={opt.value}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: '14px 16px',
                                                borderRadius: '10px',
                                                border: selected ? '2px solid #0284c7' : '2px solid #e2e8f0',
                                                backgroundColor: selected ? '#f0f9ff' : '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    type="radio"
                                                    name="pickingStrategy"
                                                    value={opt.value}
                                                    checked={selected}
                                                    onChange={(e) => {
                                                        setFormData((prev) => ({ ...prev, pickingStrategy: e.target.value }));
                                                    }}
                                                    style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748b', paddingLeft: '26px' }}>
                                                {opt.desc}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div
                                style={{
                                    marginTop: '10px',
                                    padding: '8px 12px',
                                    backgroundColor: '#fefce8',
                                    border: '1px solid #fde68a',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#854d0e',
                                    lineHeight: '1.5',
                                }}
                            >
                                ⚠ Chiến lược xác định lô hàng được xuất trước dựa theo ngày nhập kho.
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thanh toán</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#334155',
                                            fontWeight: 500,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            name="isPaid"
                                            checked={formData.isPaid}
                                            onChange={handleChange}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Đã thanh toán
                                    </label>
                                </div>

                                {formData.isPaid && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            animation: 'slideDown 0.2s ease-out',
                                        }}
                                    >
                                        <div className="form-field">
                                            <label className="form-label">Phương thức thanh toán</label>
                                            <div className="input-wrapper">
                                                <select
                                                    name="paymentMethod"
                                                    value={formData.paymentMethod}
                                                    onChange={handleChange}
                                                    className={`form-input ${errors.paymentMethod ? 'error' : ''}`}
                                                    style={{ paddingLeft: '16px' }}
                                                >
                                                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {errors.paymentMethod && (
                                                <span className="error-message">{errors.paymentMethod}</span>
                                            )}
                                        </div>
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
                                            style={{ paddingLeft: '16px', paddingRight: '34px' }}
                                            placeholder="0"
                                        />
                                        <span
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#64748b',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            ₫
                                        </span>
                                    </div>
                                    {errors.shippingFee && (
                                        <span className="error-message">{errors.shippingFee}</span>
                                    )}
                                </div>

                                <div
                                    style={{
                                        padding: '14px',
                                        backgroundColor: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '10px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '14px',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        <span style={{ color: '#475569', fontWeight: 600 }}>Tiền hàng</span>
                                        <span style={{ color: '#10b981', fontWeight: 700 }}>
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '14px',
                                        }}
                                    >
                                        <span style={{ color: '#475569', fontWeight: 600 }}>Phí vận chuyển</span>
                                        <span
                                            style={{
                                                color: shippingFee > 0 ? '#f59e0b' : '#64748b',
                                                fontWeight: 700,
                                            }}
                                        >
                                            + {formatCurrency(shippingFee)}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        padding: '16px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '12px',
                                        borderLeft: '4px solid #16a34a',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#15803d' }}>
                                        Thành tiền
                                    </span>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
