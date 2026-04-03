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

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_RELEASE_REQUESTS = [
    {
        releaseRequestId: 1,
        releaseRequestCode: 'YCX-2026-001',
        status: 'APPROVED',
        lifecycleStatus: 'IssuePending',
        requestedDate: '2026-02-01',
        expectedDate: '2026-02-15',
        purpose: 'Xuất hàng bán lẻ',
        warehouseId: 11,
        warehouseName: 'Kho Hà Nội',
        receiverId: 201,
        receiverName: 'Nguyễn Văn Minh',
        companyName: 'Công ty TNHH Thương mại ABC',
        receiverAddress: 'Số 45 Đường Nguyễn Trãi, Quận 1',
        requestedBy: 1,
        requestedByName: 'Trần Thị Lan',
        totalItems: 3,
        totalRequestedQty: 120,
        createdAt: '2026-02-01T08:30:00',
        lines: [
            {
                releaseRequestLineId: 101,
                itemId: 1,
                itemCode: 'PEN-001',
                itemName: 'Bút bi Thiên Long TL-057',
                requestedQty: 50,
                uomId: 1,
                uomName: 'Cây',
                note: '',
                approvedQty: 50,
                allocatedQty: 50,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 200,
            },
            {
                releaseRequestLineId: 102,
                itemId: 2,
                itemCode: 'NOTE-001',
                itemName: 'Vở note 5 chấm A5',
                requestedQty: 40,
                uomId: 2,
                uomName: 'Quyển',
                note: '',
                approvedQty: 40,
                allocatedQty: 40,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 80,
            },
            {
                releaseRequestLineId: 103,
                itemId: 3,
                itemCode: 'PAPER-001',
                itemName: 'Giấy A4 Double A 80gsm',
                requestedQty: 30,
                uomId: 3,
                uomName: 'Ram',
                note: 'Ưu tiên giao trước 15/2',
                approvedQty: 30,
                allocatedQty: 30,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 60,
            },
        ],
    },
    {
        releaseRequestId: 2,
        releaseRequestCode: 'YCX-2026-002',
        status: 'PENDING',
        lifecycleStatus: 'IssuePending',
        requestedDate: '2026-02-05',
        expectedDate: '2026-02-20',
        purpose: 'Xuất hàng cho dự án',
        warehouseId: 12,
        warehouseName: 'Kho TP.HCM',
        receiverId: 202,
        receiverName: 'Lê Hoàng Nam',
        companyName: 'Công ty CP Đầu tư XYZ',
        receiverAddress: 'Tầng 5, Tòa nhà Bitexco, Quận 1',
        requestedBy: 2,
        requestedByName: 'Phạm Quốc Trung',
        totalItems: 2,
        totalRequestedQty: 75,
        createdAt: '2026-02-05T10:15:00',
        lines: [
            {
                releaseRequestLineId: 201,
                itemId: 4,
                itemCode: 'CLIP-001',
                itemName: 'Kẹp giấy 33mm (hộp 50 cái)',
                requestedQty: 50,
                uomId: 4,
                uomName: 'Hộp',
                note: '',
                approvedQty: 50,
                allocatedQty: 50,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 100,
            },
            {
                releaseRequestLineId: 202,
                itemId: 5,
                itemCode: 'GLUE-001',
                itemName: 'Keo dán Thiên Long 15g',
                requestedQty: 25,
                uomId: 5,
                uomName: 'Tuýp',
                note: '',
                approvedQty: 25,
                allocatedQty: 25,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 60,
            },
        ],
    },
    {
        releaseRequestId: 3,
        releaseRequestCode: 'YCX-2026-003',
        status: 'DRAFT',
        lifecycleStatus: 'IssuePending',
        requestedDate: '2026-02-10',
        expectedDate: '2026-02-25',
        purpose: 'Xuất mẫu thử nghiệm',
        warehouseId: 11,
        warehouseName: 'Kho Hà Nội',
        receiverId: 203,
        receiverName: 'Phạm Thị Hương',
        companyName: 'Trung tâm Nghiên cứu Quốc gia',
        receiverAddress: 'Số 12 Đường Hoàng Quốc Việt, Cầu Giấy',
        requestedBy: 1,
        requestedByName: 'Trần Thị Lan',
        totalItems: 1,
        totalRequestedQty: 10,
        createdAt: '2026-02-10T14:00:00',
        lines: [
            {
                releaseRequestLineId: 301,
                itemId: 6,
                itemCode: 'SAMPLE-001',
                itemName: 'Mẫu thử nghiệm sản phẩm mới',
                requestedQty: 10,
                uomId: 6,
                uomName: 'Bộ',
                note: 'Cần đầy đủ giấy chứng nhận chất lượng',
                approvedQty: 10,
                allocatedQty: 10,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 15,
            },
        ],
    },
    {
        releaseRequestId: 4,
        releaseRequestCode: 'YCX-2026-004',
        status: 'APPROVED',
        lifecycleStatus: 'IssuePending',
        requestedDate: '2026-02-08',
        expectedDate: '2026-02-18',
        purpose: 'Xuất hàng bảo hành',
        warehouseId: 13,
        warehouseName: 'Kho Đà Nẵng',
        receiverId: 204,
        receiverName: 'Hoàng Minh Tuấn',
        companyName: 'Công ty TNHH Bảo hành Việt',
        receiverAddress: '42 Trần Hưng Đạo, Quận Hải Châu',
        requestedBy: 3,
        requestedByName: 'Ngô Thị Mai',
        totalItems: 2,
        totalRequestedQty: 60,
        createdAt: '2026-02-08T09:00:00',
        lines: [
            {
                releaseRequestLineId: 401,
                itemId: 7,
                itemCode: 'REPAIR-001',
                itemName: 'Bộ phụ kiện sửa chữa laptop',
                requestedQty: 30,
                uomId: 7,
                uomName: 'Bộ',
                note: '',
                approvedQty: 30,
                allocatedQty: 30,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 45,
            },
            {
                releaseRequestLineId: 402,
                itemId: 8,
                itemCode: 'TOOL-001',
                itemName: 'Dụng cụ sửa chữa chuyên dụng',
                requestedQty: 30,
                uomId: 8,
                uomName: 'Bộ',
                note: 'Bảo quản cẩn thận',
                approvedQty: 30,
                allocatedQty: 30,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 30,
            },
        ],
    },
    {
        releaseRequestId: 5,
        releaseRequestCode: 'YCX-2026-005',
        status: 'REJECTED',
        lifecycleStatus: 'IssuePending',
        requestedDate: '2026-02-12',
        expectedDate: '2026-02-28',
        purpose: 'Xuất hàng nội bộ',
        warehouseId: 11,
        warehouseName: 'Kho Hà Nội',
        receiverId: 205,
        receiverName: 'Vũ Thị Lan',
        companyName: 'Chi nhánh Hải Phòng',
        receiverAddress: 'Số 88 Đường Lê Hồng Phong, Hải Phòng',
        requestedBy: 2,
        requestedByName: 'Phạm Quốc Trung',
        totalItems: 1,
        totalRequestedQty: 20,
        createdAt: '2026-02-12T11:30:00',
        lines: [
            {
                releaseRequestLineId: 501,
                itemId: 9,
                itemCode: 'OFFICE-001',
                itemName: 'Bộ văn phòng phẩm cho chi nhánh',
                requestedQty: 20,
                uomId: 9,
                uomName: 'Bộ',
                note: '',
                approvedQty: 20,
                allocatedQty: 20,
                issuedQty: 0,
                lineStatus: 'Open',
                stockQty: 25,
            },
        ],
    },
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

const getStatusMeta = (status) =>
    RELEASE_REQUEST_STATUS_META[String(status || '').toUpperCase()]
    ?? { label: status || '-', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' };

const getRemainingQty = (line) => {
    const approvedQty = toNumber(line?.approvedQty);
    const allocatedQty = toNumber(line?.allocatedQty);
    const issuedQty = toNumber(line?.issuedQty);
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
        requestedQty: toNumber(line.requestedQty),
        approvedQty: toNumber(line.approvedQty),
        allocatedQty: toNumber(line.allocatedQty),
        issuedQty: toNumber(line.issuedQty),
        remainingQty: getRemainingQty(line),
        availableQty: toNumber(line.stockQty),
        unitPrice: 0,
        lineTotal: 0,
        note: line.note || '',
    };
}

function mapSelectableLineToFormLine(selectableLine) {
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
        unitPrice: selectableLine.unitPrice,
        lineTotal: 0,
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

    const releaseRequestDropdownRef = useRef(null);
    const [releaseRequestDropdownOpen, setReleaseRequestDropdownOpen] = useState(false);
    const [releaseRequestQuery, setReleaseRequestQuery] = useState('');
    const [selectedReleaseRequestDetail, setSelectedReleaseRequestDetail] = useState(null);

    // Load from URL params on mount
    useEffect(() => {
        const queryId = searchParams.get('releaseRequestId') || searchParams.get('rrId');
        const queryCode = searchParams.get('releaseRequestCode') || searchParams.get('rrCode');

        if (!queryId && !queryCode) return;

        const matched = queryId
            ? MOCK_RELEASE_REQUESTS.find((r) => String(r.releaseRequestId) === String(queryId))
            : MOCK_RELEASE_REQUESTS.find((r) => r.releaseRequestCode === queryCode);

        if (matched) {
            handleSelectReleaseRequest(matched, { silentToast: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (!keyword) return MOCK_RELEASE_REQUESTS;

        return MOCK_RELEASE_REQUESTS.filter(
            (r) =>
                normalizeText(r.releaseRequestCode).includes(keyword) ||
                normalizeText(r.receiverName).includes(keyword) ||
                normalizeText(r.warehouseName).includes(keyword) ||
                normalizeText(r.requestedByName).includes(keyword)
        );
    }, [releaseRequestQuery]);

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
        (summary, options = {}) => {
            if (!summary?.releaseRequestId) return;

            const initialLines = (summary.lines || [])
                .map((line, idx) => buildSelectableLine(line, idx))
                .filter((line) => line.remainingQty > 0)
                .map(mapSelectableLineToFormLine);

            setSelectedReleaseRequestDetail(summary);
            setReleaseRequestQuery(summary.releaseRequestCode || '');
            setReleaseRequestDropdownOpen(false);
            setLines(initialLines);
            setSearchKeyword('');
            setSelectedSearchLineIds([]);
            setShowProductSearch(false);

            setFormData((prev) => ({
                ...prev,
                releaseRequestId: String(summary.releaseRequestId),
                releaseRequestCode: summary.releaseRequestCode || '',
                warehouseId: String(summary.warehouseId || ''),
                warehouseName: summary.warehouseName || '',
                receiverId: String(summary.receiverId || ''),
                receiverName: summary.receiverName || '',
                receiverPhone: '',
                receiverEmail: '',
                receiverCompanyName: summary.companyName || '',
                receiverAddress: summary.receiverAddress || '',
                receiverCity: '',
                receiverDistrict: '',
                receiverWard: '',
                requestedByName: summary.requestedByName || '',
                requestedDate: summary.requestedDate || '',
                expectedDate: summary.expectedDate || '',
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
        [showToast]
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
        setLines((prev) => [...prev, mapSelectableLineToFormLine(selectableLine)]);
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
        releaseRequestId: Number(formData.releaseRequestId),
        warehouseId: Number(formData.warehouseId),
        issueDate: formData.issueDate,
        status: 'DRAFT',
        note: formData.note.trim() || null,
        shippingFee,
        isPaid: Boolean(formData.isPaid),
        paymentMethod: formData.isPaid ? formData.paymentMethod : null,
        totalDeliveredQty,
        totalDeliveredAmount: grandTotal,
        lines: lines.map((line) => ({
            itemId: Number(line.itemId),
            requestedQty: toNumber(line.remainingQty),
            actualQty: toNumber(line.actualQty),
            uomId: Number(line.uomId),
            releaseRequestLineId: Number(line.releaseRequestLineId),
            unitPrice: toNumber(line.unitPrice),
            lineTotal: toNumber(line.lineTotal),
            requiresCertificateCopy: Boolean(line.requiresCertificateCopy),
            note: line.note?.trim() || null,
        })),
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

            // Mock API call - delay 1s
            await new Promise((resolve) => setTimeout(resolve, 1000));

            console.log('Create Goods Delivery Note payload:', payload);
            console.log('Transport payload:', buildTransportPayload());

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
                                                        const meta = getStatusMeta(rr.status);
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
                                                                    <span
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            padding: '2px 8px',
                                                                            borderRadius: '9999px',
                                                                            backgroundColor: meta.bg,
                                                                            color: meta.color,
                                                                        }}
                                                                    >
                                                                        {meta.label}
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
