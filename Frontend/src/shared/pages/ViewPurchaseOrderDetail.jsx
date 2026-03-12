import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Switch,
    TextField,
    Collapse,
    Box,
} from '@mui/material';
import {
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Calendar,
    Package,
    Eye,
    ImageIcon,
    Edit,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    Save,
    X,
    Loader,
    Plus,
    Trash2,
    Search,
    Phone,
    Warehouse,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getPurchaseOrderDetail, approvePurchaseOrder, rejectPurchaseOrder } from '../lib/purchaseOrderService';
import { getItemsForDisplay } from '../lib/itemService';
import '../styles/CreateSupplier.css';

const MAX_REASON_LENGTH = 250;

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState('approve'); // 'approve' | 'reject'
    const [includeReason, setIncludeReason] = useState(false);
    const [reasonText, setReasonText] = useState('');
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // Item search states
    const [itemsCache, setItemsCache] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState(null);

    // Fetch items when opening product search (with caching)
    useEffect(() => {
        if (showProductSearch && itemsCache.length === 0 && !itemsLoading) {
            const fetchItems = async () => {
                setItemsLoading(true);
                setItemsError(null);
                try {
                    const items = await getItemsForDisplay();
                    // Transform to match the format used in the component
                    const transformedItems = (items || []).map(item => ({
                        id: item.itemId,
                        name: item.itemName,
                        sku: item.itemCode,
                        unitPrice: item.purchasePrice || 0,
                        uom: '', // API may not return UOM, will need to handle
                        image: null,
                    }));
                    setItemsCache(transformedItems);
                } catch (error) {
                    console.error('Error fetching items:', error);
                    setItemsError('Không thể tải danh sách vật tư');
                } finally {
                    setItemsLoading(false);
                }
            };
            fetchItems();
        }
    }, [showProductSearch]);

    const MAX_JUSTIFICATION_LENGTH = 250;

    // Mock data - sau này sẽ load từ API
    const [orderData, setOrderData] = useState({
        purchaseOrderId: 1,
        orderCode: 'PO-2025-001',
        supplierName: 'Công ty TNHH ABC',
        supplierPhone: '0901 234 567',
        supplierEmail: 'ncc.abc@example.com',
        supplierTaxCode: '0101234567',
        supplierAddressStreet: 'Số 1 Đường A',
        supplierAddressWard: 'Phường 1',
        supplierAddressDistrict: 'Quận 1',
        supplierAddressProvince: 'TP. Hồ Chí Minh',
        warehouseName: 'Kho Hà Nội',
        creatorName: 'Nguyễn Văn A',
        responsiblePersonName: 'Trần Thị B',
        expectedReceiptDate: '2025-03-15',
        justification: 'Đặt hàng bổ sung tồn kho cho quý 1/2025',
        discountType: 'percent', // 'percent' | 'amount'
        discount: 5,
        discountAmountFixed: 0,
        additionalCosts: [], // [{ id, name, amount }]
        approvalStatus: 'Approved', // Pending, Approved, Rejected
        receivingStatus: 'Partial', // Pending, Partial, Completed
        createdAt: '2025-03-01',
        lines: [
            {
                id: 1,
                itemId: 1,
                itemName: 'Laptop Dell XPS 13',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 10,
                receivedQty: 5,
                unitPrice: 25000000,
                totalPrice: 250000000,
                hasCO: false,
                hasCQ: false,
                note: 'Cần giao trước ngày 15/3'
            },
            {
                id: 2,
                itemId: 2,
                itemName: 'Màn hình LG 27 inch',
                itemImage: null,
                orderedQty: 20,
                receivedQty: 20,
                unitPrice: 5000000,
                totalPrice: 100000000,
                hasCO: false,
                hasCQ: false,
                note: ''
            },
            {
                id: 3,
                itemId: 3,
                itemName: 'Bàn phím cơ Keychron',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 15,
                receivedQty: 0,
                unitPrice: 2000000,
                totalPrice: 30000000,
                hasCO: false,
                hasCQ: false,
                note: 'Ưu tiên giao sớm'
            },
            {
                id: 4,
                itemId: 4,
                itemName: 'Chuột Logitech MX Master 3',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 25,
                receivedQty: 15,
                unitPrice: 1500000,
                totalPrice: 37500000,
                hasCO: false,
                hasCQ: false,
                note: ''
            },
            {
                id: 5,
                itemId: 5,
                itemName: 'Tai nghe Sony WH-1000XM4',
                itemImage: null,
                orderedQty: 12,
                receivedQty: 12,
                unitPrice: 7000000,
                totalPrice: 84000000,
                hasCO: false,
                hasCQ: false,
                note: 'Đã nhập đủ'
            },
            {
                id: 6,
                itemId: 6,
                itemName: 'Webcam Logitech C920',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 30,
                receivedQty: 10,
                unitPrice: 1800000,
                totalPrice: 54000000,
                hasCO: false,
                hasCQ: false,
                note: 'Còn thiếu 20 cái'
            },
            {
                id: 7,
                itemId: 7,
                itemName: 'USB Hub Anker 7-Port',
                itemImage: null,
                orderedQty: 40,
                receivedQty: 0,
                unitPrice: 500000,
                totalPrice: 20000000,
                hasCO: false,
                hasCQ: false,
                note: 'Chưa nhập'
            },
            {
                id: 8,
                itemId: 8,
                itemName: 'Đế tản nhiệt laptop Cooler Master',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 18,
                receivedQty: 18,
                unitPrice: 800000,
                totalPrice: 14400000,
                hasCO: false,
                hasCQ: false,
                note: ''
            },
            {
                id: 9,
                itemId: 9,
                itemName: 'Ổ cứng SSD Samsung 1TB',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 50,
                receivedQty: 25,
                unitPrice: 2500000,
                totalPrice: 125000000,
                hasCO: false,
                hasCQ: false,
                note: 'Nhập từng đợt'
            },
            {
                id: 10,
                itemId: 10,
                itemName: 'RAM Corsair 16GB DDR4',
                itemImage: null,
                orderedQty: 35,
                receivedQty: 35,
                unitPrice: 1200000,
                totalPrice: 42000000,
                note: 'Hoàn thành'
            },
            {
                id: 11,
                itemId: 11,
                itemName: 'Cable HDMI 2.1 - 2m',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 100,
                receivedQty: 50,
                unitPrice: 150000,
                totalPrice: 15000000,
                note: 'Giao nốt 50 cái'
            },
            {
                id: 12,
                itemId: 12,
                itemName: 'Loa Bluetooth JBL Flip 5',
                itemImage: null,
                orderedQty: 22,
                receivedQty: 0,
                unitPrice: 2200000,
                totalPrice: 48400000,
                note: 'Đang chờ hàng về'
            },
            {
                id: 13,
                itemId: 13,
                itemName: 'Bộ chuyển đổi USB-C Hub',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 45,
                receivedQty: 22,
                unitPrice: 650000,
                totalPrice: 29250000,
                note: 'Còn thiếu 23 cái'
            },
            {
                id: 14,
                itemId: 14,
                itemName: 'Micro không dây Rode Wireless Go',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 8,
                receivedQty: 8,
                unitPrice: 5500000,
                totalPrice: 44000000,
                note: ''
            },
            {
                id: 15,
                itemId: 15,
                itemName: 'Đèn LED ring light 18 inch',
                itemImage: null,
                orderedQty: 16,
                receivedQty: 5,
                unitPrice: 1100000,
                totalPrice: 17600000,
                note: 'Đợt 1: 5 cái'
            }
        ],
        history: [
            { time: '14:30', phone: '0866563616', action: 'Đã phê duyệt đơn hàng', date: '2025-03-02' },
            { time: '10:15', phone: '0866563616', action: 'Gửi yêu cầu phê duyệt', date: '2025-03-01' },
            { time: '09:00', phone: '0866563616', action: 'Thêm mới đơn nhập hàng PO-2025-001', date: '2025-03-01' }
        ]
    });

    // Load data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getPurchaseOrderDetail(id);
                if (data) {
                    // Map API response to state
                    setOrderData({
                        purchaseOrderId: data.purchaseOrderId || data.purchaseOrderId || null,
                        orderCode: data.pocode || data.poCode || '',
                        supplierName: data.supplierName || '',
                        warehouseName: data.warehouseName || '',
                        creatorName: data.requestedBy || data.RequestedBy || '',
                        responsiblePersonName: data.responsiblePersonName || '',
                        expectedReceiptDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().slice(0, 10) : '',
                        justification: data.justification || '',
                        // Handle all status types: DRAFT, PENDING, APPROVED, REJECTED
                        approvalStatus: (data.status || 'DRAFT').toUpperCase(),
                        receivingStatus: data.receivingStatus || 'Pending',
                        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10) : '',
                        lines: (data.lines || []).map((line, index) => ({
                            id: line.purchaseOrderLineId || line.PurchaseOrderLineId || index + 1,
                            itemId: line.itemId || line.ItemId || null,
                            itemName: line.itemName || line.ItemName || '',
                            itemImage: line.itemImage || null,
                            orderedQty: line.orderedQty || line.OrderedQty || 0,
                            receivedQty: line.receivedQty || line.ReceivedQty || 0,
                            unitPrice: line.unitPrice || line.UnitPrice || 0,
                            totalPrice: (line.orderedQty || line.OrderedQty || 0) * (line.unitPrice || line.UnitPrice || 0),
                            uom: line.uomName || line.UomName || '',
                            hasCO: line.requiresCocq || false,
                            hasCQ: false,
                            note: line.note || ''
                        })),
                        history: []
                    });
                }
            } catch (error) {
                console.error('Lỗi khi tải chi tiết đơn mua:', error);
                showToast('Không thể tải thông tin đơn mua', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const handleImageError = (id) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
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

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const totalQuantity = orderData.lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = orderData.lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = orderData.discountType === 'amount'
        ? (Number(orderData.discountAmountFixed) || 0)
        : (subtotal * (Number(orderData.discount) || 0)) / 100;
    const totalAdditionalCosts = (orderData.additionalCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    const getApprovalStatusStyle = (status) => {
        // Normalize status to handle both uppercase and title case
        const normalizedStatus = status?.toUpperCase();
        const styles = {
            'DRAFT': { label: 'Bản nháp', color: '#374151', bgColor: 'rgba(107,114,128,0.15)' },
            'PENDING': { label: 'Chờ duyệt', color: '#374151', bgColor: 'rgba(59,130,246,0.15)' },
            'PENDING_ACC': { label: 'Chờ duyệt', color: '#374151', bgColor: 'rgba(59,130,246,0.15)' },
            'APPROVED': { label: 'Đã duyệt', color: '#374151', bgColor: 'rgba(16,185,129,0.18)' },
            'REJECTED': { label: 'Từ chối', color: '#374151', bgColor: 'rgba(239,68,68,0.15)' }
        };
        return styles[normalizedStatus] || { label: status, color: '#374151', bgColor: 'rgba(107,114,128,0.15)' };
    };

    const getReceivingStatusStyle = (status) => {
        const styles = {
            'Pending': { label: 'Chờ nhập', color: '#374151', bgColor: 'rgba(107,114,128,0.15)' },
            'Partial': { label: 'Nhập một phần', color: '#374151', bgColor: 'rgba(251,191,36,0.20)' },
            'Completed': { label: 'Hoàn thành', color: '#374151', bgColor: 'rgba(16,185,129,0.18)' }
        };
        return styles[status] || { label: status, color: '#374151', bgColor: 'rgba(107,114,128,0.15)' };
    };

    const approvalStyle = getApprovalStatusStyle(orderData.approvalStatus);
    const receivingStyle = getReceivingStatusStyle(orderData.receivingStatus);

    // Mock search-select data (giống CreatePurchaseOrder)
    const MOCK_SUPPLIERS = [
        {
            id: 'SUP-001',
            name: 'Nhà cung cấp A',
            phone: '0901 234 567',
            email: 'ncc.a@example.com',
            taxCode: '0101234567',
            address: {
                street: 'Số 1 Đường A',
                ward: 'Phường 1',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
            },
        },
        {
            id: 'SUP-002',
            name: 'Nhà cung cấp B',
            phone: '0908 765 432',
            email: 'ncc.b@example.com',
            taxCode: '0312345678',
            address: {
                street: 'Số 99 Đường B',
                ward: 'Phường Bến Nghé',
                district: 'Quận 1',
                province: 'TP. Hồ Chí Minh',
            },
        },
    ];

    const MOCK_EMPLOYEES = [
        { id: 'EMP-001', name: 'Nguyễn Văn A' },
        { id: 'EMP-002', name: 'Trần Thị B' },
    ];

    const MOCK_WAREHOUSES = [
        { id: 'WH-001', name: 'Kho Hà Nội' },
        { id: 'WH-002', name: 'Kho Hồ Chí Minh' },
    ];

    const [supplierQuery, setSupplierQuery] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);

    const filteredSuppliers = useMemo(() => {
        const q = supplierQuery.trim().toLowerCase();
        if (!q) return MOCK_SUPPLIERS;
        return MOCK_SUPPLIERS.filter(
            (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
        );
    }, [supplierQuery]);

    const filteredEmployees = useMemo(() => {
        const q = employeeQuery.trim().toLowerCase();
        if (!q) return MOCK_EMPLOYEES;
        return MOCK_EMPLOYEES.filter(
            (e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
        );
    }, [employeeQuery]);

    const filteredWarehouses = useMemo(() => {
        const q = warehouseQuery.trim().toLowerCase();
        if (!q) return MOCK_WAREHOUSES;
        return MOCK_WAREHOUSES.filter(
            (w) => w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)
        );
    }, [warehouseQuery]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Giới hạn 250 ký tự cho trường justification
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Product search functions - using cached items
    // Remove MOCK_PRODUCTS - using API data now

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);

        if (keyword.trim() === '') {
            // When search is empty, show all cached items
            setFilteredProducts(itemsCache);
            return;
        }

        // Filter from cached items
        const filtered = itemsCache.filter(
            (product) =>
                (product.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
                (product.sku || '').toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const handleSearchFocus = () => {
        // When user focuses on search bar, show all cached items
        if (itemsCache.length > 0) {
            setFilteredProducts(itemsCache);
        }
    };

    const handleSelectProduct = (product) => {
        setOrderData((prev) => {
            const existing = prev.lines.find((l) => l.itemId === product.id);
            if (existing) {
                showToast('Sản phẩm đã có trong danh sách!', 'warning');
                return prev;
            }

            const newLine = {
                id: Date.now(),
                itemId: product.id,
                itemName: product.name,
                itemImage: product.image,
                uom: product.uom ?? '',
                orderedQty: 1,
                unitPrice: product.unitPrice,
                totalPrice: product.unitPrice,
                hasCO: false,
                hasCQ: false,
                note: '',
            };

            return {
                ...prev,
                lines: [...prev.lines, newLine],
            };
        });

        setSearchKeyword('');
        setFilteredProducts(itemsCache); // Reset to show all items
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

        const productsToAdd = itemsCache.filter((p) => selectedProductIds.includes(p.id));

        setOrderData((prev) => {
            const newLines = [];
            let duplicateCount = 0;

            productsToAdd.forEach((product) => {
                const existingLine = prev.lines.find((l) => l.itemId === product.id);
                if (!existingLine) {
                    newLines.push({
                        id: Date.now() + Math.random(),
                        itemId: product.id,
                        itemName: product.name,
                        itemImage: product.image,
                        uom: product.uom ?? '',
                        orderedQty: 1,
                        unitPrice: product.unitPrice,
                        totalPrice: product.unitPrice,
                        hasCO: false,
                        hasCQ: false,
                        note: '',
                    });
                } else {
                    duplicateCount++;
                }
            });

            if (duplicateCount > 0) {
                showToast(`${duplicateCount} sản phẩm đã có trong danh sách`, 'warning');
            }

            if (!newLines.length) return prev;

            showToast(`Đã thêm ${newLines.length} sản phẩm vào danh sách`, 'success');

            return {
                ...prev,
                lines: [...prev.lines, ...newLines],
            };
        });

        setSearchKeyword('');
        setFilteredProducts(itemsCache);
        setShowProductSearch(false);
        setSelectedProductIds([]);
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
        // Show all cached items when opening search
        setFilteredProducts(itemsCache);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setFilteredProducts([]);
        setSelectedProductIds([]);
    };

    const addLine = () => {
        openProductSearch();
    };

    const removeLine = (index) => {
        setOrderData((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index),
        }));
        setSelectedLineIds((prev) => {
            const target = orderData.lines[index]?.id;
            return target ? prev.filter((id) => id !== target) : prev;
        });
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (!orderData.lines?.length) return;
        if (selectedLineIds.length === orderData.lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(orderData.lines.map((l) => l.id));
        }
    };

    const removeSelectedLines = () => {
        if (!selectedLineIds.length) return;
        setOrderData((prev) => ({
            ...prev,
            lines: prev.lines.filter((l) => !selectedLineIds.includes(l.id)),
        }));
        setSelectedLineIds([]);
    };

    const setDiscountType = (type) => {
        setOrderData(prev => ({ ...prev, discountType: type }));
    };

    const addAdditionalCost = () => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: [
                ...(prev.additionalCosts || []),
                { id: Date.now(), name: '', amount: 0 }
            ]
        }));
    };

    const removeAdditionalCost = (id) => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).filter(c => c.id !== id)
        }));
    };

    const updateAdditionalCost = (id, field, value) => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).map(c =>
                c.id === id ? { ...c, [field]: field === 'amount' ? (Number(value) || 0) : value } : c
            )
        }));
    };

    const updateLine = (index, field, value) => {
        setOrderData(prev => ({
            ...prev,
            lines: prev.lines.map((line, i) => {
                if (i === index) {
                    const updated = { ...line, [field]: value };
                    if (field === 'orderedQty' || field === 'unitPrice') {
                        updated.totalPrice = (Number(updated.orderedQty) || 0) * (Number(updated.unitPrice) || 0);
                    }
                    return updated;
                }
                return line;
            })
        }));
    };

    const validateOrderSummary = () => {
        if (orderData.discountType === 'percent') {
            const v = Number(orderData.discount);
            if (isNaN(v) || v < 0 || v > 100) {
                showToast('Chiết khấu (%) phải từ 0 đến 100.', 'error');
                return false;
            }
        } else {
            const v = Number(orderData.discountAmountFixed);
            if (isNaN(v) || v < 0) {
                showToast('Chiết khấu (số tiền) phải lớn hơn hoặc bằng 0.', 'error');
                return false;
            }
        }
        const costs = orderData.additionalCosts || [];
        for (let i = 0; i < costs.length; i++) {
            const amount = Number(costs[i].amount) || 0;
            const name = (costs[i].name || '').trim();
            if (amount > 0 && !name) {
                showToast(`Dòng chi phí thứ ${i + 1}: nhập tên chi phí khi có số tiền.`, 'error');
                return false;
            }
            if (amount < 0) {
                showToast(`Dòng chi phí thứ ${i + 1}: số tiền phải lớn hơn hoặc bằng 0.`, 'error');
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateOrderSummary()) return;
        try {
            setSubmitting(true);
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Cập nhật đơn mua hàng thành công!', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reload data
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setIncludeReason(false);
        setReasonText('');
        setConfirmDialogOpen(true);
    };
    const closeConfirmDialog = () => {
        if (submitting) return;
        setConfirmDialogOpen(false);
        setIncludeReason(false);
        setReasonText('');
    };
    const handleReasonChange = (e) => {
        setReasonText(e.target.value.slice(0, MAX_REASON_LENGTH));
    };
    const canConfirmAction = !submitting;

    const handleConfirmAction = async () => {
        if (!canConfirmAction) return;
        try {
            setSubmitting(true);
            const reason = includeReason ? reasonText.trim() : '';
            const isApprove = confirmDialogType === 'approve';
            const poId = orderData.purchaseOrderId;

            if (isApprove) {
                await approvePurchaseOrder(poId, reason || null);
            } else {
                await rejectPurchaseOrder(poId, reason);
            }

            setOrderData((prev) => ({
                ...prev,
                approvalStatus: isApprove ? 'Approved' : 'Rejected',
            }));
            showToast(isApprove ? 'Đã duyệt đơn mua hàng.' : 'Đã từ chối đơn mua hàng.', 'success');
            closeConfirmDialog();
        } catch (error) {
            console.error('Lỗi khi xử lý duyệt/từ chối:', error);
            showToast(error?.response?.data?.message || error?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = () => openConfirmDialog('approve');
    const handleReject = () => openConfirmDialog('reject');

    const handleCreateGoodReceiptNote = () => {
        // Navigate to CreateGoodReceiptNote with PO code as query param
        navigate(`/create-good-receipt-note?poCode=${orderData.orderCode}`);
    };

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Popup xác nhận Duyệt đơn / Hủy đơn */}
            <Dialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                fullWidth
                maxWidth="sm"
                disableEscapeKeyDown={submitting}
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '620px',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        overflow: 'hidden',
                        m: 2,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        pt: 2.25,
                        pb: 1.75,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#111827',
                        borderBottom: '1px solid #eef2f7',
                    }}
                >
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận hủy đơn'}
                </DialogTitle>

                <DialogContent
                    sx={{
                        px: 3,
                        pt: 3.5,
                        pb: 2.5,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 1.5,
                            mb: includeReason ? 1.5 : 0,
                            pl: 0.5,
                        }}
                    >
                        <Switch
                            checked={includeReason}
                            onChange={(e) => setIncludeReason(e.target.checked)}
                            size="small"
                            sx={{
                                mr: 1,
                                width: 40,
                                height: 24,
                                p: 0,
                                display: 'flex',
                                '& .MuiSwitch-switchBase': {
                                    p: '3px',
                                    '&.Mui-checked': {
                                        transform: 'translateX(16px)',
                                        color: '#ffffff',
                                        '& + .MuiSwitch-track': {
                                            backgroundColor: '#0ea5e9',
                                            opacity: 1,
                                        },
                                    },
                                },
                                '& .MuiSwitch-thumb': {
                                    width: 18,
                                    height: 18,
                                    boxShadow: 'none',
                                },
                                '& .MuiSwitch-track': {
                                    borderRadius: 12,
                                    backgroundColor: '#cfefff',
                                    opacity: 1,
                                },
                            }}
                        />

                        <Box
                            component="span"
                            sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#374151',
                                userSelect: 'none',
                            }}
                        >
                            Kèm lý do
                        </Box>
                    </Box>

                    <Collapse in={includeReason} timeout={200}>
                        <Box>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                maxRows={5}
                                value={reasonText}
                                onChange={handleReasonChange}
                                placeholder="Nhập lý do (tùy chọn)"
                                variant="outlined"
                                inputProps={{ maxLength: MAX_REASON_LENGTH }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        alignItems: 'flex-start',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '12px',
                                        '& fieldset': {
                                            border: '1px solid transparent',
                                        },
                                        '&:hover fieldset': {
                                            border: '1px solid transparent',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: '1px solid #d1d5db',
                                        },
                                        '& textarea': {
                                            padding: '16px 18px !important',
                                            fontSize: '14px',
                                            lineHeight: 1.5,
                                            color: '#111827',
                                        },
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        color: '#9ca3af',
                                        opacity: 1,
                                    },
                                }}
                            />

                            <Box
                                sx={{
                                    mt: 0.75,
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    lineHeight: 1,
                                }}
                            >
                                {reasonText.length}/{MAX_REASON_LENGTH}
                            </Box>
                        </Box>
                    </Collapse>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        gap: 1.5,
                        justifyContent: 'flex-end',
                        borderTop: '1px solid #eef2f7',
                    }}
                >
                    <Button
                        onClick={closeConfirmDialog}
                        disabled={submitting}
                        disableRipple
                        sx={{
                            minWidth: '72px',
                            height: 40,
                            px: 1,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: '#4b5563',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAction}
                        disabled={!canConfirmAction}
                        sx={{
                            minWidth: '110px',
                            height: 40,
                            px: 2,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: confirmDialogType === 'approve' ? '#0ea5e9' : '#ef4444',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: confirmDialogType === 'approve' ? '#0284c7' : '#dc2626',
                                boxShadow: 'none',
                            },
                            '&:disabled': {
                                backgroundColor: '#bae6fd',
                                color: '#ffffff',
                            },
                        }}
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    {!isEditing ? (
                        <>
                            {permissionRole === 'ACCOUNTANTS' && orderData.approvalStatus && (orderData.approvalStatus.toUpperCase() === 'PENDING_ACC' || orderData.approvalStatus.toUpperCase() === 'DRAFT') && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-cancel"
                                        disabled={submitting}
                                        onClick={handleReject}
                                    >
                                        <XCircle size={16} className="btn-icon" />
                                        Hủy đơn
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={submitting}
                                        onClick={handleApprove}
                                    >
                                        <CheckCircle size={16} className="btn-icon" />
                                        Duyệt đơn
                                    </button>
                                </>
                            )}
                            {orderData.approvalStatus === 'APPROVED' && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCreateGoodReceiptNote}
                                >
                                    <Warehouse size={16} className="btn-icon" />
                                    Tạo Phiếu Nhập Kho
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit size={16} className="btn-icon" />
                                Chỉnh sửa
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-cancel"
                                disabled={submitting}
                            >
                                <X size={16} className="btn-icon" />
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={handleSave}
                            >
                                {submitting ? (
                                    <>
                                        <Loader size={16} className="btn-icon spinner" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} className="btn-icon" />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <div className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h1 className="page-title">Chi tiết đơn mua</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã đơn: <span style={{ fontWeight: 600, color: '#2196F3' }}>{orderData.orderCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: approvalStyle.bgColor,
                                    color: approvalStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.approvalStatus === 'APPROVED' && <CheckCircle size={16} />}
                                    {orderData.approvalStatus === 'REJECTED' && <XCircle size={16} />}
                                    {(orderData.approvalStatus?.toUpperCase() === 'PENDING' || orderData.approvalStatus?.toUpperCase() === 'DRAFT') && <Clock size={16} />}
                                    {approvalStyle.label}
                                </div>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: receivingStyle.bgColor,
                                    color: receivingStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.receivingStatus === 'Completed' && <CheckCircle size={16} />}
                                    {orderData.receivingStatus === 'Partial' && <Clock size={16} />}
                                    {orderData.receivingStatus === 'Pending' && <Clock size={16} />}
                                    {receivingStyle.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Chi tiết sản phẩm (trái) + (Thông tin chung + Lịch sử) (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* 1. Chi tiết sản phẩm (Trái) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm</h2>
                                {isEditing && (
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
                                            onClick={addLine}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Plus size={16} />
                                            Thêm sản phẩm
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditing && showProductSearch && (
                                <div
                                    style={{
                                        marginTop: 12,
                                        marginBottom: 12,
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
                                            onChange={handleSearchChange}
                                            onFocus={handleSearchFocus}
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
                                    {/* Product Search Dropdown - Show when search is open */}
                                    {showProductSearch && (
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
                                            {/* Loading State */}
                                            {itemsLoading ? (
                                                <div
                                                    style={{
                                                        padding: '24px',
                                                        textAlign: 'center',
                                                        color: '#9ca3af',
                                                    }}
                                                >
                                                    <Loader
                                                        size={24}
                                                        className="spinner"
                                                        style={{ margin: '0 auto 8px', animation: 'spin 1s linear infinite' }}
                                                    />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                                        Đang tải danh sách vật tư...
                                                    </p>
                                                </div>
                                            ) : itemsError ? (
                                                /* Error State */
                                                <div
                                                    style={{
                                                        padding: '24px',
                                                        textAlign: 'center',
                                                        color: '#ef4444',
                                                    }}
                                                >
                                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                                        {itemsError}
                                                    </p>
                                                </div>
                                            ) : filteredProducts.length === 0 ? (
                                                /* Empty State */
                                                <div
                                                    style={{
                                                        padding: '24px',
                                                        textAlign: 'center',
                                                        color: '#9ca3af',
                                                    }}
                                                >
                                                    <Package
                                                        size={32}
                                                        style={{ margin: '0 auto 8px', opacity: 0.5 }}
                                                    />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                                        {searchKeyword ? 'Không tìm thấy vật tư nào' : 'Không có vật tư nào'}
                                                    </p>
                                                </div>
                                            ) : (
                                                /* Product List */
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
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    '#f9fafb')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    'transparent')
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(
                                                                    product.id
                                                                )}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleProductSelection(product.id);
                                                                }}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            {isValidImageUrl(product.image) &&
                                                            !imageErrors[`product-${product.id}`] ? (
                                                                <img
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    onError={() =>
                                                                        handleImageError(
                                                                            `product-${product.id}`
                                                                        )
                                                                    }
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
                                                            <div
                                                                style={{ flex: 1, cursor: 'pointer' }}
                                                                onClick={() => handleSelectProduct(product)}
                                                            >
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
                                                                        {product.name}
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
                                                                    }}
                                                                >
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

                            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            {isEditing && (
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            orderData.lines.length > 0 &&
                                                            selectedLineIds.length === orderData.lines.length
                                                        }
                                                        onChange={toggleSelectAll}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </th>
                                            )}
                                            <th style={{ width: '40px' }}>STT</th>
                                            <th>Sản phẩm</th>
                                            <th style={{ width: '100px' }}>SL đặt</th>
                                            <th style={{ width: '110px' }}>SL đã nhận</th>
                                            <th style={{ width: '120px' }}>Đơn giá</th>
                                            <th style={{ width: '140px' }}>Thành tiền</th>
                                            <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ xuất xứ (CO)">CO</th>
                                            <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ chất lượng (CQ)">CQ</th>
                                            <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                                            <th style={{ width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderData.lines.map((line, index) => {
                                            return (
                                                <tr key={line.id}>
                                                    {isEditing && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLineIds.includes(line.id)}
                                                                onChange={() => toggleLineSelection(line.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            {/* Ảnh hoặc Icon sản phẩm */}
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
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Tên sản phẩm + ĐVT */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            console.log('View product detail:', line.itemId);
                                                                        }}
                                                                        style={{
                                                                            color: '#2196F3',
                                                                            textDecoration: 'none',
                                                                            fontSize: '14px',
                                                                            fontWeight: 500,
                                                                            flex: 1
                                                                        }}
                                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                    >
                                                                        {line.itemName || (isEditing ? 'Nhập tên sản phẩm' : '')}
                                                                    </a>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#6b7280',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    ĐVT: {line.uom || '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.orderedQty}
                                                                onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                                min="1"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            line.orderedQty
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {/* SL đã nhận – mock hiển thị, không chỉnh sửa tại đây */}
                                                        {Number(line.receivedQty) || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.unitPrice}
                                                                onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                                                min="0"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            formatCurrency(line.unitPrice)
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td
                                                        style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                                        title="Chứng chỉ xuất xứ (CO)"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCO}
                                                            readOnly
                                                            disabled
                                                            style={{
                                                                width: 18,
                                                                height: 18,
                                                                cursor: 'default',
                                                                margin: 0,
                                                            }}
                                                        />
                                                    </td>
                                                    <td
                                                        style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                                        title="Chứng chỉ chất lượng (CQ)"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCQ}
                                                            readOnly
                                                            disabled
                                                            style={{
                                                                width: 18,
                                                                height: 18,
                                                                cursor: 'default',
                                                                margin: 0,
                                                            }}
                                                        />
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {Number(line.receivedQty) >= Number(line.orderedQty) ? (
                                                            <span style={{ color: '#16a34a' }}>Đã nhận đủ</span>
                                                        ) : (
                                                            <span style={{ color: '#dc2626' }}>Chưa nhận đủ</span>
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="btn-icon-only"
                                                                style={{ color: '#2196F3' }}
                                                                title="Xem chi tiết sản phẩm"
                                                                onClick={() => {
                                                                    console.log('View product detail:', line.itemId);
                                                                }}
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-only"
                                                                    style={{ color: '#ef4444' }}
                                                                    onClick={() => removeLine(index)}
                                                                    title="Xóa dòng"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Nhà cung cấp */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Nhà cung cấp</h2>
                            </div>
                            <div className="form-field">
                                <label className="form-label">Nhà cung cấp</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <Building2 className="input-icon" size={16} />
                                    <input
                                        type="text"
                                        name="supplierName"
                                        value={
                                            isEditing
                                                ? supplierQuery || orderData.supplierName || ''
                                                : orderData.supplierName || ''
                                        }
                                        onChange={(e) => {
                                            if (!isEditing) return;
                                            setSupplierQuery(e.target.value);
                                            setSupplierDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            if (isEditing) setSupplierDropdownOpen(true);
                                        }}
                                        readOnly={!isEditing}
                                        className="form-input"
                                        style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        placeholder={isEditing ? 'Tìm hoặc chọn nhà cung cấp' : '-'}
                                        autoComplete="off"
                                    />
                                    {isEditing && supplierDropdownOpen && (
                                        <ul
                                            className="form-input"
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
                                            {filteredSuppliers.length === 0 ? (
                                                <li
                                                    style={{
                                                        padding: '8px 12px',
                                                        color: '#6b7280',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    Không có nhà cung cấp phù hợp
                                                </li>
                                            ) : (
                                                filteredSuppliers.map((supplier) => (
                                                    <li
                                                        key={supplier.id}
                                                        onClick={() => {
                                                            setOrderData((prev) => ({
                                                                ...prev,
                                                                supplierName: supplier.name,
                                                                supplierId: supplier.id,
                                                            }));
                                                            setSupplierQuery(supplier.name);
                                                            setSupplierDropdownOpen(false);
                                                        }}
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
                                                        {supplier.name} ({supplier.id})
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Mã số thuế */}
                            <div className="form-field">
                                <label className="form-label">Mã số thuế</label>
                                <div className="input-wrapper">
                                    <FileText className="input-icon" size={16} />
                                    <input
                                        type="text"
                                        value={orderData.supplierTaxCode || '-'}
                                        readOnly
                                        className="form-input"
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>

                            {/* Số điện thoại */}
                            <div className="form-field">
                                <label className="form-label">Số điện thoại</label>
                                <div className="input-wrapper">
                                    <Phone className="input-icon" size={16} />
                                    <input
                                        type="text"
                                        value={orderData.supplierPhone || '-'}
                                        readOnly
                                        className="form-input"
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>

                            {/* Địa chỉ */}
                            <div className="form-field">
                                <label className="form-label">Địa chỉ</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <input
                                        type="text"
                                        value={orderData.supplierAddress || '-'}
                                        readOnly
                                        className="form-input"
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>
                        </div>
                        </div>

                        {/* 2. Thông tin chung (Phải) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={orderData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Nhân viên phụ trách - search select khi Edit */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên phụ trách</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="responsiblePersonName"
                                            value={
                                                isEditing
                                                    ? employeeQuery || orderData.responsiblePersonName || ''
                                                    : orderData.responsiblePersonName || ''
                                            }
                                            onChange={(e) => {
                                                if (!isEditing) return;
                                                setEmployeeQuery(e.target.value);
                                                setEmployeeDropdownOpen(true);
                                            }}
                                            onFocus={() => {
                                                if (isEditing) setEmployeeDropdownOpen(true);
                                            }}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                            placeholder={isEditing ? 'Tìm hoặc chọn nhân viên' : '-'}
                                            autoComplete="off"
                                        />
                                        {isEditing && employeeDropdownOpen && (
                                            <ul
                                                className="form-input"
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
                                                {filteredEmployees.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có nhân viên phù hợp
                                                    </li>
                                                ) : (
                                                    filteredEmployees.map((emp) => (
                                                        <li
                                                            key={emp.id}
                                                            onClick={() => {
                                                                setOrderData((prev) => ({
                                                                    ...prev,
                                                                    responsiblePersonName: emp.name,
                                                                }));
                                                                setEmployeeQuery(emp.name);
                                                                setEmployeeDropdownOpen(false);
                                                            }}
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
                                                            {emp.name} ({emp.id})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Kho nhận - search select khi Edit */}
                                <div className="form-field">
                                    <label className="form-label">Kho nhận</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="warehouseName"
                                            value={
                                                isEditing
                                                    ? warehouseQuery || orderData.warehouseName || ''
                                                    : orderData.warehouseName || ''
                                            }
                                            onChange={(e) => {
                                                if (!isEditing) return;
                                                setWarehouseQuery(e.target.value);
                                                setWarehouseDropdownOpen(true);
                                            }}
                                            onFocus={() => {
                                                if (isEditing) setWarehouseDropdownOpen(true);
                                            }}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                            placeholder={isEditing ? 'Tìm hoặc chọn kho nhận' : '-'}
                                            autoComplete="off"
                                        />
                                        {isEditing && warehouseDropdownOpen && (
                                            <ul
                                                className="form-input"
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
                                                {filteredWarehouses.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có kho phù hợp
                                                    </li>
                                                ) : (
                                                    filteredWarehouses.map((wh) => (
                                                        <li
                                                            key={wh.id}
                                                            onClick={() => {
                                                                setOrderData((prev) => ({
                                                                    ...prev,
                                                                    warehouseName: wh.name,
                                                                }));
                                                                setWarehouseQuery(wh.name);
                                                                setWarehouseDropdownOpen(false);
                                                            }}
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
                                                            {wh.name} ({wh.id})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Ngày dự kiến nhập */}
                                <div className="form-field">
                                    <label className="form-label">Ngày nhập dự kiến</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type={isEditing ? "date" : "text"}
                                            name="expectedReceiptDate"
                                            value={isEditing ? orderData.expectedReceiptDate : new Date(orderData.expectedReceiptDate).toLocaleDateString('vi-VN')}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Ngày tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={new Date(orderData.createdAt).toLocaleDateString('vi-VN')}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lịch sử đơn đặt hàng nhập */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử đơn đặt hàng nhập</h2>
                            </div>
                            
                            <div
                                style={{
                                    padding: '16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {orderData.history.map((item, index) => (
                                        <div
                                            key={index}
                                            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                                        >
                                            <div
                                                style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: index === 0 ? '#2196F3' : '#9ca3af',
                                                    marginTop: '6px',
                                                    flexShrink: 0,
                                                }}
                                            ></div>
                                            <div
                                                style={{
                                                    flex: 1,
                                                    borderLeft:
                                                        index < orderData.history.length - 1
                                                            ? '2px solid #e5e7eb'
                                                            : 'none',
                                                    paddingLeft: '16px',
                                                    paddingBottom:
                                                        index < orderData.history.length - 1 ? '12px' : '0',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '4px',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            color: '#111827',
                                                        }}
                                                    >
                                                        {item.time}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                        {item.phone}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        color: '#2563eb',
                                                        marginBottom: '2px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    {item.date}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Nhà cung cấp + Ghi chú + Tổng hợp */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 350px',
                            gap: '24px',
                            alignItems: 'start',
                        }}
                    >
                        {/* Bên trái: Nhà cung cấp + Ghi chú + Tổng hợp */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 3. Nhà cung cấp - search-select khi Edit + chi tiết NCC */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="supplierName"
                                            value={
                                                isEditing
                                                    ? supplierQuery || orderData.supplierName || ''
                                                    : orderData.supplierName || ''
                                            }
                                            onChange={(e) => {
                                                if (!isEditing) return;
                                                setSupplierQuery(e.target.value);
                                                setSupplierDropdownOpen(true);
                                            }}
                                            onFocus={() => {
                                                if (isEditing) setSupplierDropdownOpen(true);
                                            }}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                            placeholder={isEditing ? 'Tìm hoặc chọn nhà cung cấp' : '-'}
                                            autoComplete="off"
                                        />
                                        {isEditing && supplierDropdownOpen && (
                                            <ul
                                                className="form-input"
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
                                                {filteredSuppliers.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có nhà cung cấp phù hợp
                                                    </li>
                                                ) : (
                                                    filteredSuppliers.map((sup) => (
                                                        <li
                                                            key={sup.id}
                                                            onClick={() => {
                                                                setOrderData((prev) => ({
                                                                    ...prev,
                                                                    supplierName: sup.name,
                                                                    supplierPhone: sup.phone,
                                                                    supplierEmail: sup.email,
                                                                    supplierTaxCode: sup.taxCode,
                                                                    supplierAddressStreet: sup.address?.street || '',
                                                                    supplierAddressWard: sup.address?.ward || '',
                                                                    supplierAddressDistrict: sup.address?.district || '',
                                                                    supplierAddressProvince: sup.address?.province || '',
                                                                }));
                                                                setSupplierQuery(sup.name);
                                                                setSupplierDropdownOpen(false);
                                                            }}
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
                                                            {sup.name} ({sup.id})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Chi tiết nhà cung cấp (read-only, mock) */}
                                {orderData.supplierName && (
                                    <div
                                        style={{
                                            marginTop: '16px',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            fontSize: 13,
                                            color: '#374151',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                            Chi tiết nhà cung cấp
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Tên NCC: </span>
                                            <span>{orderData.supplierName || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>SĐT: </span>
                                            <span>{orderData.supplierPhone || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Email: </span>
                                            <span>{orderData.supplierEmail || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Mã số thuế: </span>
                                            <span>{orderData.supplierTaxCode || '-'}</span>
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
                                                    {orderData.supplierAddressProvince || '—'}
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
                                                    {orderData.supplierAddressDistrict || '—'}
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
                                                    {orderData.supplierAddressWard || '—'}
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
                                                    {orderData.supplierAddressStreet || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do đặt hàng</label>
                                    <textarea
                                        name="justification"
                                        value={orderData.justification || ''}
                                        onChange={handleChange}
                                        readOnly={!isEditing}
                                        rows={4}
                                        className="form-input"
                                        placeholder={isEditing ? "Nhập ghi chú / lý do đặt hàng" : ""}
                                        style={{ resize: 'vertical', backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                    />
                                    {isEditing && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                fontSize: '12px',
                                                color:
                                                    orderData.justification.length >= MAX_JUSTIFICATION_LENGTH
                                                        ? '#ef4444'
                                                        : '#6b7280',
                                                marginTop: '4px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {orderData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Tổng hợp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                
                                {/* Khi chỉnh sửa: dùng lại UI Tổng hợp đơn hàng giống CreatePurchaseOrder (không có Chi phí) */}
                                {isEditing ? (
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {totalQuantity} sản phẩm
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
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

                                        <div
                                            style={{
                                                gridColumn: '1 / -1',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '24px',
                                                alignItems: 'start',
                                            }}
                                        >
                                            <div className="form-field">
                                                <label className="form-label">Chiết khấu</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${
                                                                orderData.discountType === 'amount'
                                                                    ? 'btn-primary'
                                                                    : 'btn-card-text'
                                                            }`}
                                                            onClick={() => setDiscountType('amount')}
                                                        >
                                                            Số tiền
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${
                                                                orderData.discountType === 'percent'
                                                                    ? 'btn-primary'
                                                                    : 'btn-card-text'
                                                            }`}
                                                            onClick={() => setDiscountType('percent')}
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                    {orderData.discountType === 'percent' ? (
                                                        <input
                                                            type="number"
                                                            name="discount"
                                                            value={orderData.discount}
                                                            onChange={handleChange}
                                                            min="0"
                                                            max="100"
                                                            className="form-input"
                                                            placeholder="0–100"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            name="discountAmountFixed"
                                                            value={orderData.discountAmountFixed || ''}
                                                            onChange={handleChange}
                                                            min="0"
                                                            className="form-input"
                                                            placeholder="Nhập số tiền (VND)"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-field span-2" style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>
                                                        - {formatCurrency(discountAmount)}
                                                    </span>
                                                </div>
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
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '24px',
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                    }}
                                                >
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Khi chỉ xem: layout đơn giản, không có Chi phí
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {totalQuantity} sản phẩm
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
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

                                        <div className="form-field span-2">
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>
                                                        - {formatCurrency(discountAmount)}
                                                    </span>
                                                </div>
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
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '24px',
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                    }}
                                                >
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default ViewPurchaseOrderDetail;
