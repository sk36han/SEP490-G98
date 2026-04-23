// 1. React/External libraries
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

// 2. React Router
import { useNavigate, useSearchParams } from 'react-router-dom';

// 3. MUI Components
import Tooltip from '@mui/material/Tooltip';
import { ConfirmDialog } from '@ui/dialogs';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';

// 4. Icons
import {
    ArrowLeft,
    Plus,
    X,
    MapPin,
    User,
    Send,
    Loader,
    Calendar,
    Trash2,
    Package,
    FileText,
    ImageIcon,
    Search,
    Eye,
    Building2,
} from 'lucide-react';

// 5. Internal - Components
import Toast from '../../components/Toast/Toast';
import GRNDiscountSection from '../components/GRN/GRNDiscountSection';

// 6. Internal - Services
import { getAllPurchaseOrdersForSelection, getPurchaseOrderDetail } from '../lib/purchaseOrderService';
import { getItemsForDisplay } from '../lib/itemService';
import { createGoodReceiptNote } from '../lib/goodReceiptNoteService';
import { getSupplierById } from '../lib/supplierService';
import authService from '../lib/authService';
import { getStorageLocationList } from '../lib/storageLocationService';

// 7. Internal - Hooks
import { useToast } from '../hooks/useToast';

// 8. Internal - Utils
import {
    formatCurrency,
    validateGRNForm,
    getLocalDateYmd,
    calculateGRNTotals,
    getPoGrossTotalForDiscount,
    MAX_JUSTIFICATION_LENGTH,
} from '../utils/goodReceiptNoteUtils';

// 9. Styles
import '../styles/CreateGoodReceiptNote.css';
import '../styles/CreateSupplier.css';

// Helper functions cho lifecycleStatus
const getLifecycleStatusLabel = (status) => {
    const statusMap = {
        'PENDINGRCV': 'Chờ nhận hàng',
        'PARTRCV': 'Nhận một phần',
        'FULLRCV': 'Đã nhận đủ',
    };
    return statusMap[status?.toUpperCase()] || status || '-';
};

const getLifecycleStatusColor = (status) => {
    const colorMap = {
        'PENDINGRCV': '#f59e0b',  // Vàng - chờ
        'PARTRCV': '#3b82f6',     // Xanh dương - đang nhận
        'FULLRCV': '#10b981',     // Xanh lá - hoàn thành
    };
    return colorMap[status?.toUpperCase()] || '#6b7280';
};

const normalizeSupplier = (supplier) => ({
    supplierId: supplier?.supplierId ?? supplier?.SupplierId ?? null,
    supplierCode: supplier?.supplierCode ?? supplier?.SupplierCode ?? '',
    supplierName: supplier?.supplierName ?? supplier?.SupplierName ?? '',
    taxCode: supplier?.taxCode ?? supplier?.TaxCode ?? '',
    phone: supplier?.phone ?? supplier?.Phone ?? '',
    email: supplier?.email ?? supplier?.Email ?? '',
    address: supplier?.address ?? supplier?.Address ?? '',
    ward: supplier?.ward ?? supplier?.Ward ?? '',
    district: supplier?.district ?? supplier?.District ?? '',
    city: supplier?.city ?? supplier?.City ?? '',
});

/** Tên ĐVT từ dòng PO (API có thể trả uomName / UomName / uom). */
const resolvePoLineUomLabel = (line) =>
    line?.uomName ??
    line?.UomName ??
    line?.baseUomName ??
    line?.BaseUomName ??
    line?.uom ??
    line?.Uom ??
    '';

const resolvePoLineItemCode = (line) =>
    line?.itemCode ??
    line?.ItemCode ??
    line?.sku ??
    line?.Sku ??
    '';

const formatLocationQty = (value) => {
    const qty = Number(value);
    if (!Number.isFinite(qty)) return '0';
    return Number.isInteger(qty) ? String(qty) : qty.toString();
};

const normalizeSummaryQtyText = (text) =>
    (text || '').replace(/\b(\d+)\.0+\b/g, '$1');

/** Ô chỉ đọc trên form GRN — nền xám, dễ phân biệt với ô nhập liệu. */
const READONLY_FIELD_STYLE = {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    cursor: 'default',
};

const CreateGoodReceiptNote = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();

    const [formData, setFormData] = useState({
        warehouseId: '',
        warehouseName: '',
        purchaseOrderCode: '',
        supplierId: '',
        supplierName: '',
        receiptDate: getLocalDateYmd(),
        creatorId: currentUser?.userId || '',
        creatorName: currentUser?.fullName || currentUser?.FullName || '',
        justification: '',
        shippingFee: 0,
        isPaid: false,
        paymentMethod: 'CASH',
    });

    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [imageErrors, setImageErrors] = useState({});
    const [errors, setErrors] = useState({});
    const [poDropdownOpen, setPoDropdownOpen] = useState(false);
    const [confirmImportPoOpen, setConfirmImportPoOpen] = useState(false);
    const [selectedPODetails, setSelectedPODetails] = useState(null);
    const [poImportLoading, setPoImportLoading] = useState(false);
    const poDropdownRef = useRef(null);

    // State và effect để load danh sách PO từ API
    const [poList, setPoList] = useState([]);
    const [poListLoading, setPoListLoading] = useState(true);
    const [poListError, setPoListError] = useState(null);
    const [supplierDetail, setSupplierDetail] = useState(null);
    const [locationOptions, setLocationOptions] = useState([]);
    const [locationLoading, setLocationLoading] = useState(false);

    const fetchAndSetSupplierDetail = useCallback(async (supplierId, fallbackName = '') => {
        if (!supplierId) {
            setSupplierDetail(null);
            return;
        }
        try {
            const supplier = await getSupplierById(supplierId);
            const normalized = normalizeSupplier(supplier);
            setSupplierDetail(normalized);
            setFormData((prev) => ({
                ...prev,
                supplierId: normalized.supplierId ?? prev.supplierId,
                supplierName: normalized.supplierName || fallbackName || prev.supplierName,
                warehouseId: prev.warehouseId || normalized.warehouseId || null,
            }));
        } catch (err) {
            // Fallback hiển thị tối thiểu theo PO nếu API chi tiết NCC bị lỗi
            setSupplierDetail({
                supplierId,
                supplierCode: '',
                supplierName: fallbackName || '',
                taxCode: '',
                phone: '',
                email: '',
                address: '',
                ward: '',
                district: '',
                city: '',
            });
            setFormData((prev) => ({
                ...prev,
                supplierId: supplierId ?? prev.supplierId,
                supplierName: fallbackName || prev.supplierName,
            }));
        }
    }, []);

    // Load danh sách PO từ API
    useEffect(() => {
        const fetchPOList = async () => {
            setPoListLoading(true);
            setPoListError(null);
            try {
                const items = await getAllPurchaseOrdersForSelection('Approved');
                // Map dữ liệu từ API
                const mappedPOs = items.map(po => ({
                    poCode: po.poCode ?? po.PoCode ?? '',
                    supplierName: po.supplierName ?? po.SupplierName ?? '',
                    warehouseName: po.warehouseName ?? po.WarehouseName ?? '',
                    status: po.status ?? po.Status ?? '',
                    lifecycleStatus: po.lifecycleStatus ?? po.LifecycleStatus ?? '',
                    requestedDate: po.requestedDate ?? po.RequestedDate ?? '',
                    expectedDeliveryDate: po.expectedDeliveryDate ?? po.ExpectedDeliveryDate ?? '',
                    supplierId: po.supplierId ?? po.SupplierId ?? null,
                    warehouseId: po.warehouseId ?? po.WarehouseId ?? null,
                    poId: po.purchaseOrderId ?? po.PurchaseOrderId ?? null,
                    // Lines sẽ được lấy chi tiết khi chọn PO
                    lines: po.lines ?? po.Lines ?? [],
                }));
                setPoList(mappedPOs);
            } catch (err) {
                console.error('Lỗi load PO list:', err);
                setPoListError(err?.message || 'Không tải được danh sách đơn mua');
            } finally {
                setPoListLoading(false);
            }
        };
        fetchPOList();
    }, []);

    // Tìm PO theo mã - define BEFORE the useEffect that uses it
    const getPOByCode = useCallback((code) => {
        return poList.find(po => po.poCode === code);
    }, [poList]);

    // Handler khi xác nhận nhập từ PO - define BEFORE the useEffect that uses it
    const handleConfirmImportPO = async (poCodeOverride = null) => {
        const poCode = poCodeOverride || formData.purchaseOrderCode;
        if (!poCode) return;

        const po = getPOByCode(poCode);
        if (!po) {
            if (!poCodeOverride) {
                showToast('Không tìm thấy đơn mua hàng!', 'error');
                setConfirmImportPoOpen(false);
            }
            return;
        }

        setPoImportLoading(true);

        try {
            // Gọi API lấy chi tiết PO nếu chưa có lines
            let poDetail = po;
            if (!po.lines || po.lines.length === 0) {
                const detail = await getPurchaseOrderDetail(po.poId);
                if (detail) {
                    poDetail = {
                        ...po,
                        ...detail,
                        poId: detail.purchaseOrderId ?? detail.PurchaseOrderId ?? po.poId,
                        poCode: detail.poCode ?? detail.POCode ?? po.poCode,
                        lifecycleStatus: detail.lifecycleStatus ?? detail.LifecycleStatus ?? po.lifecycleStatus ?? po.LifecycleStatus ?? '',
                        lines: detail.lines ?? detail.Lines ?? [],
                    };
                }
            }

            setSelectedPODetails(poDetail);
            setConfirmImportPoOpen(false);

            // Fill form data từ PO
            setFormData(prev => ({
                ...prev,
                supplierId: poDetail.supplierId ?? poDetail.SupplierId ?? prev.supplierId,
                supplierName: poDetail.supplierName ?? poDetail.SupplierName ?? '',
                warehouseId: poDetail.warehouseId ?? poDetail.WarehouseId ?? prev.warehouseId,
                warehouseName: poDetail.warehouseName ?? poDetail.WarehouseName ?? '',
            }));
            await fetchAndSetSupplierDetail(
                poDetail.supplierId ?? poDetail.SupplierId,
                poDetail.supplierName ?? poDetail.SupplierName ?? ''
            );

            // Kiểm tra lifecycleStatus để xác định cách fill số lượng
            const isPartRcv = (poDetail.lifecycleStatus ?? '').toUpperCase() === 'PARTRCV';

            // Fill lines từ PO (chỉ những item chưa nhập đủ)
            const poLines = (poDetail.lines ?? [])
                .filter(line => (line.receivedQty ?? 0) < (line.orderedQty ?? 0))
                .map(line => {
                    const ordered = line.orderedQty ?? line.OrderedQty ?? 0;
                    const received = line.receivedQty ?? 0;
                    const remaining = ordered - received;

                    // PartRcv: mặc định = số còn thiếu; vẫn cho sửa trong giới hạn remaining
                    const defaultReceivedQty = isPartRcv ? remaining : ordered;

                    return {
                        id: Date.now() + Math.random(),
                        itemId: line.itemId ?? line.ItemId,
                        itemName: line.itemName ?? line.ItemName ?? '',
                        itemSku: resolvePoLineItemCode(line),
                        uom: resolvePoLineUomLabel(line),
                        uomId: line.uomId ?? line.UomId ?? null,
                        orderedQty: ordered,
                        remainingQty: remaining,
                        receivedQty: defaultReceivedQty,
                        unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
                        totalPrice: (line.unitPrice ?? line.UnitPrice ?? 0) * defaultReceivedQty,
                        locationId: '',
                        note: '',
                        hasCO: !!(line.requiresCo ?? line.requiresCO ?? false),
                        hasCQ: !!(line.requiresCq ?? line.requiresCQ ?? false),
                    };
                });

            setLines(prev => {
                // Merge với lines hiện tại, tránh trùng item
                const existingItemIds = new Set(prev.map(l => l.itemId));
                const newLines = poLines.filter(l => !existingItemIds.has(l.itemId));
                return [...prev, ...newLines];
            });

            showToast(`Đã nhập ${poLines.length} sản phẩm từ ${poDetail.poCode}`, 'success');
        } catch (err) {
            console.error('Lỗi khi import từ PO:', err);
            showToast(err?.message || 'Lỗi khi nhập từ đơn mua', 'error');
        } finally {
            setPoImportLoading(false);
        }
    };

    useEffect(() => {
        // Auto-fill từ query param poCode hoặc poId
        const handleAutoFillFromQueryParams = async () => {
            if (poList.length === 0) return;

            const poCodeFromUrl = searchParams.get('poCode');
            const poIdFromUrl = searchParams.get('poId');

            // Tìm PO theo poId hoặc poCode
            let selectedPO = null;
            if (poIdFromUrl) {
                selectedPO = poList.find(p => p.poId?.toString() === poIdFromUrl.toString() || p.poId === parseInt(poIdFromUrl));
            }
            if (!selectedPO && poCodeFromUrl) {
                selectedPO = poList.find(p => p.poCode === poCodeFromUrl);
            }

            if (!selectedPO) return;

            setFormData(prev => ({
                ...prev,
                purchaseOrderCode: selectedPO.poCode,
            }));

            // Gọi API lấy chi tiết PO
            setPoImportLoading(true);
            try {
                let poDetail = selectedPO;
                if (!selectedPO.lines || selectedPO.lines.length === 0) {
                    const detail = await getPurchaseOrderDetail(selectedPO.poId);
                    if (detail) {
                        poDetail = {
                            ...selectedPO,
                            ...detail,
                            poId: detail.purchaseOrderId ?? detail.PurchaseOrderId ?? selectedPO.poId,
                            poCode: detail.poCode ?? detail.POCode ?? selectedPO.poCode,
                            lifecycleStatus: detail.lifecycleStatus ?? detail.LifecycleStatus ?? selectedPO.lifecycleStatus ?? selectedPO.LifecycleStatus ?? '',
                            lines: detail.lines ?? detail.Lines ?? [],
                        };
                    }
                }

                setSelectedPODetails(poDetail);

                // Fill form data từ PO
                setFormData(prev => ({
                    ...prev,
                    supplierId: poDetail.supplierId ?? prev.supplierId,
                    supplierName: poDetail.supplierName,
                    warehouseId: poDetail.warehouseId ?? prev.warehouseId,
                    warehouseName: poDetail.warehouseName,
                }));
                await fetchAndSetSupplierDetail(
                    poDetail.supplierId ?? poDetail.SupplierId,
                    poDetail.supplierName ?? poDetail.SupplierName ?? ''
                );

                // Kiểm tra lifecycleStatus để xác định cách fill số lượng
                const isPartRcv = (poDetail.lifecycleStatus ?? '').toUpperCase() === 'PARTRCV';

                // Fill lines từ PO (chỉ những item chưa nhập đủ)
                const poLines = (poDetail.lines ?? [])
                    .filter(line => (line.receivedQty ?? 0) < (line.orderedQty ?? 0))
                    .map(line => {
                        const ordered = line.orderedQty ?? line.OrderedQty ?? 0;
                        const received = line.receivedQty ?? 0;
                        const remaining = ordered - received;

                        const defaultReceivedQty = isPartRcv ? remaining : ordered;

                        return {
                            id: line.purchaseOrderLineId || line.PurchaseOrderLineId || line.id || Date.now() + Math.random(),
                            poLineId: line.purchaseOrderLineId || line.PurchaseOrderLineId || null,
                            itemId: line.itemId ?? line.ItemId,
                            itemName: line.itemName ?? line.ItemName ?? '',
                            itemSku: resolvePoLineItemCode(line),
                            orderedQty: ordered,
                            remainingQty: remaining,
                            receivedQty: defaultReceivedQty,
                            unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
                            totalPrice: (line.unitPrice ?? line.UnitPrice ?? 0) * defaultReceivedQty,
                            locationId: '',
                            uom: resolvePoLineUomLabel(line),
                            uomId: line.uomId ?? line.UomId ?? null,
                            note: '',
                            hasCO: !!(line.requiresCo ?? line.requiresCO ?? false),
                            hasCQ: !!(line.requiresCq ?? line.requiresCQ ?? false),
                        };
                    });

                setLines(poLines);
                setSelectedLineIds(poLines.map(l => l.id));
            } catch (err) {
                console.error('Lỗi import PO từ query:', err);
                showToast('Không thể tải thông tin đơn mua hàng', 'error');
            } finally {
                setPoImportLoading(false);
            }
        };

        handleAutoFillFromQueryParams();
    }, [searchParams, poList, showToast, fetchAndSetSupplierDetail]);

    // Xóa PO đã chọn
    const handleClearSelectedPO = () => {
        setSelectedPODetails(null);
        setSupplierDetail(null);
        setFormData(prev => ({
            ...prev,
            purchaseOrderCode: '',
            supplierId: '',
            supplierName: '',
        }));
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (poDropdownRef.current && !poDropdownRef.current.contains(e.target)) {
                setPoDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadLocations = async () => {
            if (!formData.warehouseId) {
                setLocationOptions([]);
                return;
            }

            try {
                setLocationLoading(true);
                const locationRes = await getStorageLocationList({
                    page: 1,
                    pageSize: 200,
                    warehouseId: Number(formData.warehouseId),
                    isActive: true,
                });
                setLocationOptions(locationRes.items ?? []);
            } catch (err) {
                setLocationOptions([]);
                showToast('Không tải được danh sách vị trí kho', 'error');
            } finally {
                setLocationLoading(false);
            }
        };

        loadLocations();
    }, [formData.warehouseId, showToast]);

    // Load items from API when opening product search
    const [productList, setProductList] = useState([]);
    const [productListLoading, setProductListLoading] = useState(false);

    const loadProductList = useCallback(async () => {
        setProductListLoading(true);
        try {
            const items = await getItemsForDisplay();
            // Filter only active items and map to GRN format
            const mappedItems = (items ?? [])
                .filter(item => item.isActive !== false)
                .map(item => ({
                    id: item.itemId,
                    name: item.itemName,
                    sku: item.itemCode,
                    unitPrice: item.purchasePrice || 0,
                    uom: item.baseUomName || '',
                    uomId: item.baseUomId || null,
                    image: null,
                    requiresCo: !!(item.requiresCo || item.requiresCO),
                    requiresCq: !!(item.requiresCq || item.requiresCQ),
                }));
            setProductList(mappedItems);
        } catch (err) {
            console.error('Lỗi load danh sách sản phẩm:', err);
        } finally {
            setProductListLoading(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);
        if (keyword.trim() === '') {
            setFilteredProducts([]);
            return;
        }
        const filtered = productList.filter(
            (product) =>
                product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                product.sku.toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const handleImageError = (id) => {
        setImageErrors((prev) => ({ ...prev, [id]: true }));
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSelectProduct = (product) => {
        const existingLine = lines.find((line) => line.itemId === product.id);
        if (existingLine) {
            showToast('Sản phẩm đã có trong danh sách!', 'warning');
            return;
        }
        const newLine = {
            id: Date.now(),
            itemId: product.id,
            itemName: product.name,
            itemSku: product.sku ?? '',
            itemImage: product.image,
            uom: product.uom ?? '',
            uomId: product.uomId || null,
            orderedQty: 1,
            receivedQty: 1,
            unitPrice: product.unitPrice,
            totalPrice: product.unitPrice,
            locationId: '',
            note: '',
            hasCO: !!(product.requiresCo || product.requiresCO),
            hasCQ: !!(product.requiresCq || product.requiresCQ),
        };
        setLines((prev) => [...prev, newLine]);
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
        showToast('Đã thêm sản phẩm vào danh sách', 'success');
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const addSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm', 'warning');
            return;
        }
        const productsToAdd = productList.filter((p) => selectedProductIds.includes(p.id));
        const newLines = [];
        let duplicateCount = 0;
        productsToAdd.forEach((product) => {
            const existingLine = lines.find((line) => line.itemId === product.id);
            if (!existingLine) {
                newLines.push({
                    id: Date.now() + Math.random(),
                    itemId: product.id,
                    itemName: product.name,
                    itemSku: product.sku ?? '',
                    itemImage: product.image,
                    uom: product.uom ?? '',
                    uomId: product.uomId || null,
                    orderedQty: 1,
                    receivedQty: 1,
                    unitPrice: product.unitPrice,
                    totalPrice: product.unitPrice,
                    locationId: '',
                    note: '',
                    hasCO: !!(product.requiresCo || product.requiresCO),
                    hasCQ: !!(product.requiresCq || product.requiresCQ),
                });
            } else {
                duplicateCount++;
            }
        });
        if (newLines.length > 0) {
            setLines((prev) => [...prev, ...newLines]);
            showToast(`Đã thêm ${newLines.length} sản phẩm vào danh sách`, 'success');
        }
        if (duplicateCount > 0) {
            showToast(`${duplicateCount} sản phẩm đã có trong danh sách`, 'warning');
        }
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
        setFilteredProducts([]);
        // Load product list if not already loaded
        if (productList.length === 0) {
            loadProductList();
        }
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setFilteredProducts([]);
        setSelectedProductIds([]);
    };

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;
                let safeValue = value;
                // Giới hạn receivedQty không vượt quá remainingQty, phải > 0, và phải là số nguyên
                if (field === 'receivedQty') {
                    const maxQty = Number(line.remainingQty) || Number(line.orderedQty) || 0;
                    const intValue = Math.floor(Number(value));
                    safeValue = Math.max(1, Math.min(intValue, maxQty)); // Luôn >= 1, số nguyên
                }
                const updatedLine = { ...line, [field]: safeValue };
                // Tự động tính totalPrice khi receivedQty hoặc unitPrice thay đổi
                if (field === 'receivedQty' || field === 'unitPrice') {
                    updatedLine.totalPrice = (Number(updatedLine.receivedQty) || 0) * (Number(updatedLine.unitPrice) || 0);
                }
                return updatedLine;
            })
        );
        // Xóa lỗi cho dòng này khi thay đổi receivedQty
        if (field === 'receivedQty') {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`line_${index}`];
                delete next.lines;
                return next;
            });
        }
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
        setSelectedLineIds((prev) => prev.filter((id) => id !== lines[index].id));
    };

    const removeSelectedLines = () => {
        setLines((prev) => prev.filter((line) => !selectedLineIds.includes(line.id)));
        setSelectedLineIds([]);
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map((line) => line.id));
        }
    };

    const totals = useMemo(() => calculateGRNTotals(lines, formData, selectedPODetails), [lines, formData, selectedPODetails]);
    const { subtotal, discountAmount, grandTotal, totalQuantityOrdered } = totals;

    const validateForm = () => {
        const result = validateGRNForm(formData, lines);
        setErrors(result.errors);
        return result.isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }
        if (lines.some((line) => !line.locationId)) {
            showToast('Vui lòng chọn vị trí kho cho tất cả dòng hàng!', 'error');
            return;
        }
        const selectedLocationIds = lines.map((line) => String(line.locationId));
        if (new Set(selectedLocationIds).size !== selectedLocationIds.length) {
            showToast('Không được chọn trùng vị trí kho cho nhiều dòng trong cùng phiếu nhập!', 'error');
            return;
        }
        try {
            setSubmitting(true);
            if (formData.isPaid && !formData.paymentMethod) {
                showToast('Vui lòng chọn phương thức thanh toán.', 'error');
                return;
            }
            // Chuẩn bị payload cho API
            const payload = {
                PurchaseOrderId: Number(selectedPODetails?.poId ?? selectedPODetails?.purchaseOrderId ?? selectedPODetails?.PurchaseOrderId),
                ReceiptDate: formData.receiptDate,
                WarehouseId: Number(formData.warehouseId),
                SupplierId: Number(formData.supplierId),
                DiscountType: 'Amount',
                DiscountValue: Number(discountAmount) || 0,
                Note: formData.justification || null,
                ShippingFee: Number(formData.shippingFee) || 0,
                Lines: lines.map(line => ({
                    ItemId: Number(line.itemId),
                    ExpectedQty: Number(line.orderedQty) || 0,
                    ActualQty: Number(line.receivedQty) || 0,
                    UomId: Number(line.uomId) || 1,
                    LocationId: Number(line.locationId),
                    HasCO: line.hasCO || false,
                    HasCQ: line.hasCQ || false,
                    PurchaseOrderLineId: line.poLineId ? Number(line.poLineId) : null,
                    UnitPrice: Number(line.unitPrice) || 0,
                })),
                IsPaid: formData.isPaid,
                PaymentMethod: formData.isPaid ? formData.paymentMethod : null,
            };
            const result = await createGoodReceiptNote(payload);
            showToast(`Tạo phiếu nhập kho thành công${result?.grnCode ? ` (${result.grnCode})` : ''}.`, 'success');
            const grnId = result?.grnId ?? result?.GrnId;
            setTimeout(
                () => navigate(grnId ? `/good-receipt-notes/${grnId}` : '/good-receipt-notes'),
                1500
            );
        } catch (error) {
            const msg = error?.response?.data?.message ?? error?.message ?? 'Có lỗi xảy ra';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => navigate(-1);

    const canSubmit = useMemo(
        () =>
            Boolean(formData.warehouseName) &&
            lines.length > 0 &&
            !submitting &&
            !lines.some((l) => !l.itemName?.trim()) &&
            !lines.some((l) => Number(l.receivedQty) <= 0),
        [formData.warehouseName, lines, submitting]
    );

    const submitTooltip = !formData.warehouseName
        ? 'Vui lòng chọn kho nhận'
        : lines.length === 0
            ? 'Vui lòng thêm ít nhất 1 sản phẩm'
            : lines.some((l) => Number(l.receivedQty) <= 0)
                ? 'Số lượng nhập của mỗi sản phẩm phải lớn hơn 0'
                : '';

    // Lọc PO theo từ khóa
    const filteredPoCodes = useMemo(() => {
        const q = (formData.purchaseOrderCode || '').trim().toLowerCase();
        if (!q) return poList.map(po => po.poCode);
        return poList.filter(po =>
            po.poCode.toLowerCase().includes(q) ||
            po.supplierName.toLowerCase().includes(q)
        ).map(po => po.poCode);
    }, [formData.purchaseOrderCode, poList]);

    return (
        <div className="create-supplier-page">
            {/* Popup xác nhận nhập từ đơn mua hàng */}
            <ConfirmDialog
                open={confirmImportPoOpen}
                onClose={() => setConfirmImportPoOpen(false)}
                onConfirm={handleConfirmImportPO}
                title="Xác nhận"
                message="Bạn có chắc muốn nhập dữ liệu từ đơn mua hàng này?"
                confirmText="Xác nhận"
                cancelText="Hủy"
                loading={poImportLoading}
            />

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-cancel"
                        disabled={submitting}
                    >
                        <X size={15} />
                        Hủy
                    </button>
                    <Tooltip title={!canSubmit && !submitting ? submitTooltip : ''} arrow placement="top">
                        <span style={{ display: 'inline-flex' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!canSubmit}
                                onClick={handleSubmit}
                                style={!canSubmit ? { pointerEvents: 'none' } : {}}
                            >
                                {submitting ? (
                                    <>
                                        <Loader size={15} className="spinner" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        Tạo Phiếu Nhập Kho
                                    </>
                                )}
                            </button>
                        </span>
                    </Tooltip>
                </div>
            </div>

            <div className="form-card">
                <form id="create-grn-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo phiếu nhập kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Chi tiết sản phẩm</h2>
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
                                    </div>
                                </div>

                                {errors.lines && (
                                    <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                                )}

                                {showProductSearch && (
                                    <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
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
                                                onChange={handleSearchChange}
                                                placeholder="Tìm kiếm theo tên hoặc mã SKU..."
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
                                        {searchKeyword !== '' && (
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
                                                        <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy sản phẩm nào</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {filteredProducts.map((product) => (
                                                            <div
                                                                key={product.id}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderBottom: '1px solid #f3f4f6',
                                                                    transition: 'background-color 0.15s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px',
                                                                }}
                                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedProductIds.includes(product.id)}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleProductSelection(product.id);
                                                                    }}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                                                                />
                                                                {isValidImageUrl(product.image) && !imageErrors[`product-${product.id}`] ? (
                                                                    <img
                                                                        src={product.image}
                                                                        alt={product.name}
                                                                        onError={() => handleImageError(`product-${product.id}`)}
                                                                        style={{
                                                                            width: '40px',
                                                                            height: '40px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #e5e7eb',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                ) : (
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
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                )}
                                                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSelectProduct(product)}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{product.name}</span>
                                                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#2196F3', marginLeft: '12px' }}>
                                                                            {formatCurrency(product.unitPrice)}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                                                                        <span>Mã: {product.sku}</span>
                                                                        <span>•</span>
                                                                        <span>ĐVT: {product.uom}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {selectedProductIds.length > 0 && (
                                                            <div
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderTop: '2px solid #e5e7eb',
                                                                    backgroundColor: '#f9fafb',
                                                                    position: 'sticky',
                                                                    bottom: 0,
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={addSelectedProducts}
                                                                    className="btn btn-sm"
                                                                    style={{
                                                                        width: '100%',
                                                                        backgroundColor: '#2196F3',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        fontWeight: 600,
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <Plus size={16} />
                                                                    Thêm {selectedProductIds.length} sản phẩm
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
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
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có sản phẩm nào</p>
                                        <p style={{ fontSize: '14px', margin: 0 }}>Chọn đơn mua hàng để tải danh sách sản phẩm</p>
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
                                                    <th style={{ width: '40px' }}>STT</th>
                                                    <th>Sản phẩm *</th>
                                                    <th style={{ width: '100px' }}>SL đặt</th>
                                                    <th style={{ width: '100px' }}>SL nhập *</th>
                                                    <th style={{ width: '170px' }}>Vị trí kho *</th>
                                                    <th style={{ width: '70px', textAlign: 'center' }}>ĐVT</th>
                                                    <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ xuất xứ (CO)">CO</th>
                                                    <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ chất lượng (CQ)">CQ</th>
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
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                {isValidImageUrl(line.itemImage) && !imageErrors[`line-${line.id}`] ? (
                                                                    <img
                                                                        src={line.itemImage}
                                                                        alt={line.itemName}
                                                                        onError={() => handleImageError(`line-${line.id}`)}
                                                                        style={{
                                                                            width: '40px',
                                                                            height: '40px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #e5e7eb',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                ) : (
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
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                        }}
                                                                        style={{
                                                                            color: '#2196F3',
                                                                            textDecoration: 'none',
                                                                            fontSize: '14px',
                                                                            fontWeight: 500,
                                                                            flex: 1,
                                                                        }}
                                                                        onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                                                                        onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                                                                    >
                                                                        {line.itemName}
                                                                    </a>
                                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                                                        {line.itemSku ? `Mã: ${line.itemSku}` : 'Mã: —'}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-icon-only"
                                                                        style={{ color: '#2196F3' }}
                                                                        title="Xem chi tiết sản phẩm"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                readOnly
                                                                value={line.orderedQty != null ? line.orderedQty : ''}
                                                                className="form-input"
                                                                title="Số lượng đặt theo đơn mua hàng (chỉ xem)"
                                                                style={{
                                                                    textAlign: 'right',
                                                                    ...READONLY_FIELD_STYLE,
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={line.receivedQty != null ? line.receivedQty : ''}
                                                                onChange={(e) => updateLine(index, 'receivedQty', Number(e.target.value))}
                                                                min="1"
                                                                step="1"
                                                                className={`form-input ${errors[`line_${index}`] ? 'error' : ''}`}
                                                                style={{ textAlign: 'right' }}
                                                                title={errors[`line_${index}`] || 'Tối đa bằng số còn thiếu trên đơn'}
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={line.locationId || ''}
                                                                onChange={(e) => updateLine(index, 'locationId', e.target.value)}
                                                                className="form-input"
                                                                disabled={locationLoading || locationOptions.length === 0}
                                                            >
                                                                <option value="">
                                                                    {locationLoading
                                                                        ? 'Đang tải vị trí...'
                                                                        : locationOptions.length === 0
                                                                            ? 'Không có vị trí'
                                                                            : 'Chọn vị trí'}
                                                                </option>
                                                                {locationOptions.map((loc) => (
                                                                    <option key={loc.locationId} value={loc.locationId}>
                                                                        {loc.locationCode}
                                                                        {loc.locationName ? ` - ${loc.locationName}` : ''}
                                                                        {` | Tồn: ${formatLocationQty(loc.currentQty)}`}
                                                                        {loc.currentItemsSummary ? ` (${normalizeSummaryQtyText(loc.currentItemsSummary)})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', color: 'var(--slate-700)' }}>
                                                            {line.uom ?? '—'}
                                                        </td>
                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ xuất xứ (CO)">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!line.hasCO}
                                                                readOnly
                                                                disabled
                                                                style={{ width: '18px', height: '18px', cursor: 'default', margin: 0 }}
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ chất lượng (CQ)">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!line.hasCQ}
                                                                readOnly
                                                                disabled
                                                                style={{ width: '18px', height: '18px', cursor: 'default', margin: 0 }}
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLine(index)}
                                                                className="btn-icon-only"
                                                                style={{ color: '#ef4444' }}
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
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label htmlFor="supplierName" className="form-label">
                                            Nhà cung cấp
                                        </label>
                                        <div className="input-wrapper">
                                            <Building2 className="input-icon" size={16} />
                                            <input
                                                id="supplierName"
                                                type="text"
                                                name="supplierName"
                                                value={formData.supplierName || ''}
                                                readOnly
                                                placeholder="Nhà cung cấp được lấy từ PO"
                                                className="form-input"
                                                style={READONLY_FIELD_STYLE}
                                            />
                                        </div>
                                    </div>
                                    {supplierDetail && (
                                        <div
                                            style={{
                                                marginTop: '4px',
                                                padding: '12px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                backgroundColor: '#f8fafc',
                                                fontSize: '13px',
                                                color: '#334155',
                                                display: 'grid',
                                                gap: '6px',
                                            }}
                                        >
                                            <div><strong>Mã NCC:</strong> {supplierDetail.supplierCode || '—'}</div>
                                            <div><strong>MST:</strong> {supplierDetail.taxCode || '—'}</div>
                                            <div><strong>SĐT:</strong> {supplierDetail.phone || '—'}</div>
                                            <div><strong>Email:</strong> {supplierDetail.email || '—'}</div>
                                            <div>
                                                <strong>Địa chỉ:</strong>{' '}
                                                {[supplierDetail.address, supplierDetail.ward, supplierDetail.district, supplierDetail.city]
                                                    .filter(Boolean)
                                                    .join(', ') || '—'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label htmlFor="warehouseName" className="form-label">
                                        Kho nhận <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            id="warehouseName"
                                            type="text"
                                            name="warehouseName"
                                            value={formData.warehouseName}
                                            onChange={handleChange}
                                            placeholder="Chọn kho nhận"
                                            className={`form-input ${errors.warehouseName ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.warehouseName && (
                                        <span className="error-message">{errors.warehouseName}</span>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="receiptDate" className="form-label">
                                        Ngày nhập
                                    </label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            id="receiptDate"
                                            type="date"
                                            name="receiptDate"
                                            value={formData.receiptDate}
                                            min={getLocalDateYmd()}
                                            onChange={handleChange}
                                            className={`form-input ${errors.receiptDate ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.receiptDate && (
                                        <span className="error-message">{errors.receiptDate}</span>
                                    )}
                                </div>
                                <div className="form-field" ref={poDropdownRef}>
                                    <label htmlFor="purchaseOrderCode" className="form-label">
                                        Đơn mua hàng
                                    </label>
                                    {/* Chỉ hiển thị thông tin PO đã chọn, không cho phép chọn/sửa */}
                                    <div></div>

                                    {/* Hiển thị thông tin PO đã chọn */}
                                    {selectedPODetails !== null && selectedPODetails !== undefined && selectedPODetails.poCode && (
                                        <div
                                            style={{
                                                marginTop: '12px',
                                                padding: '12px',
                                                backgroundColor: '#f0f9ff',
                                                borderRadius: '8px',
                                                border: '1px solid #bae6fd'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                                                        {selectedPODetails.poCode}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                        {selectedPODetails.supplierName}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelectedPO}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        color: '#64748b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                    title="Xóa"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Kho: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.warehouseName}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Ngày đặt: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.requestedDate}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Trạng thái: </span>
                                                    <span style={{
                                                        fontWeight: 500,
                                                        color: selectedPODetails.status === 'APPROVED' ? '#10b981' :
                                                            selectedPODetails.status === 'PENDING_ACC' ? '#f59e0b' : '#ef4444'
                                                    }}>
                                                        {selectedPODetails.status === 'APPROVED' ? 'Đã duyệt' :
                                                            selectedPODetails.status === 'PENDING_ACC' ? 'Chờ duyệt' :
                                                                selectedPODetails.status === 'REJECTED' ? 'Từ chối' : 'Bị lỗi status'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Sản phẩm: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.lines.length} items</span>
                                                </div>
                                                {selectedPODetails.lifecycleStatus?.toUpperCase() === 'PARTRCV' && (
                                                    <div style={{ gridColumn: '1 / -1', padding: '8px 12px', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '12px' }}>
                                                        <strong>Lưu ý:</strong> Đơn hàng đã được nhập một phần. SL nhập mặc định theo số còn thiếu; có thể chỉnh trong giới hạn đó.
                                                    </div>
                                                )}
                                                {selectedPODetails.lifecycleStatus?.toUpperCase() === 'PENDINGRCV' && (
                                                    <div style={{ gridColumn: '1 / -1', padding: '8px 12px', backgroundColor: '#dbeafe', borderRadius: '6px', color: '#1e40af', fontSize: '12px' }}>
                                                        <strong>Thông tin:</strong> Đơn hàng chưa được nhập. Số lượng thực tế được fill theo số lượng đặt, bạn có thể chỉnh sửa.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="creatorName" className="form-label">
                                        Người tạo
                                    </label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            id="creatorName"
                                            type="text"
                                            name="creatorName"
                                            value={formData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={READONLY_FIELD_STYLE}
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Đã thanh toán?</label>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            padding: '10px 12px',
                                            borderRadius: 12,
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#f8fafc',
                                        }}
                                    >
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                            Đã thanh toán?
                                        </span>
                                        <Switch
                                            checked={formData.isPaid}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isPaid: e.target.checked,
                                                }))
                                            }
                                            disabled={submitting}
                                        />
                                    </div>

                                    {formData.isPaid && (
                                        <div style={{ marginTop: 10 }}>
                                            <label className="form-label">Phương thức thanh toán</label>
                                            <select
                                                className="form-input"
                                                value={formData.paymentMethod}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        paymentMethod: e.target.value,
                                                    }))
                                                }
                                                disabled={submitting}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 12,
                                                    border: '1px solid #d1d5db',
                                                    backgroundColor: '#ffffff',
                                                }}
                                            >
                                                <option value="CASH">Tiền mặt</option>
                                                <option value="BANK_TRANSFER">Chuyển khoản</option>
                                                <option value="CREDIT_CARD">Thẻ tín dụng</option>
                                                <option value="OTHER">Khác</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="justification" className="form-label">
                                        Ghi chú / Lý do nhập kho
                                    </label>
                                    <textarea
                                        id="justification"
                                        name="justification"
                                        value={formData.justification}
                                        onChange={handleChange}
                                        placeholder="Nhập ghi chú (tối đa 250 ký tự)"
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical' }}
                                    />
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            fontSize: '12px',
                                            color:
                                                formData.justification.length >= MAX_JUSTIFICATION_LENGTH
                                                    ? '#ef4444'
                                                    : '#6b7280',
                                            marginTop: '4px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {formData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            <GRNDiscountSection
                                subtotal={subtotal}
                                discountAmount={discountAmount}
                                grandTotal={grandTotal}
                                totalQuantityOrdered={totalQuantityOrdered}
                                formatCurrency={formatCurrency}
                                shippingFee={formData.shippingFee}
                                setShippingFee={(val) => setFormData(prev => ({ ...prev, shippingFee: val }))}
                                poHeaderDiscount={Number(selectedPODetails?.discountAmount ?? selectedPODetails?.DiscountAmount ?? 0)}
                                poHeaderTotal={getPoGrossTotalForDiscount(selectedPODetails)}
                            />
                        </div>
                        <div />
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreateGoodReceiptNote;
