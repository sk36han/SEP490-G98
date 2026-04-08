/**
 * InventoryAlertSetup – Màn hình Thiết lập Cảnh báo Tồn kho (Warehouse Policy).
 *
 * Nghiệp vụ:
 *   - Mỗi vật tư tại mỗi kho có ngưỡng MinQty (tối thiểu) và ReorderQty (đặt lại).
 *   - Nếu OnHandQty < MinQty → cảnh báo "Dưới định mức" (đỏ).
 *   - Nếu OnHandQty >= MinQty → "An toàn" (xanh).
 *
 * Backend: ItemWarehousePolicyController (GET /api/itemwarehousepolicy/list).
 *
 * UI pattern: bám 1:1 theo ViewItemList (Danh sách vật tư).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    FormControl,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    Popover,
    Checkbox,
    FormGroup,
    FormControlLabel,
    Switch,
} from '@mui/material';
import {
    Columns,
    Filter,
    GripVertical,
    Package,
    RotateCcw,
    Plus,
} from 'lucide-react';
import Toast from '../../../components/Toast/Toast';
import { useToast } from '../../hooks/useToast';
import SearchInput from '../../components/SearchInput';
import AlertFilterPopup from '../../components/AlertFilterPopup';
import CreateAlertDialog from '../../components/CreateAlertDialog';
import { getItemWarehousePolicyList } from '../../lib/itemWarehousePolicyService';
import '../../styles/ListView.css';

// ─── Mock data (thay thế API thực khi backend chưa hoạt động) ───────────────
const MOCK_WAREHOUSE_POLICIES = [
    {
        alertId: 'AL-001',
        itemId: 'ITEM-001',
        itemCode: 'SKU-001',
        itemName: 'Sữa tươi Vinamilk 180ml',
        uom: 'Thùng',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 450,
        minQty: 100,
        reorderQty: 200,
        isActive: true,
        createdBy: 'Nguyễn Văn Minh',
        createdAt: '2026-03-15T08:30:00',
    },
    {
        alertId: 'AL-002',
        itemId: 'ITEM-002',
        itemCode: 'SKU-002',
        itemName: 'Nước suối Aquafina 500ml',
        uom: 'Chai',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 50,
        minQty: 200,
        reorderQty: 300,
        isActive: true,
        createdBy: 'Trần Thị Lan',
        createdAt: '2026-03-10T14:22:00',
    },
    {
        alertId: 'AL-003',
        itemId: 'ITEM-003',
        itemCode: 'SKU-003',
        itemName: 'Mì Hảo Hảo Tôm chua cay',
        uom: 'Thùng',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 1200,
        minQty: 500,
        reorderQty: 800,
        isActive: true,
        createdBy: 'Lê Hoàng Nam',
        createdAt: '2026-03-08T09:15:00',
    },
    {
        alertId: 'AL-004',
        itemId: 'ITEM-004',
        itemCode: 'SKU-004',
        itemName: 'Gạo ST25 (Túi 5kg)',
        uom: 'Túi',
        warehouseId: 'WH-002',
        warehouseName: 'Kho Quận 9',
        onHandQty: 4000,
        minQty: 1000,
        reorderQty: 2000,
        isActive: true,
        createdBy: 'Phạm Thị Hương',
        createdAt: '2026-03-20T11:45:00',
    },
    {
        alertId: 'AL-005',
        itemId: 'ITEM-005',
        itemCode: 'SKU-005',
        itemName: 'Dầu ăn Tường An 1L',
        uom: 'Chai',
        warehouseId: 'WH-002',
        warehouseName: 'Kho Quận 9',
        onHandQty: 15,
        minQty: 50,
        reorderQty: 100,
        isActive: false,
        createdBy: 'Nguyễn Văn Minh',
        createdAt: '2026-03-22T16:00:00',
    },
    {
        alertId: 'AL-006',
        itemId: 'ITEM-006',
        itemCode: 'SKU-006',
        itemName: 'Bánh Oreo vani 133g',
        uom: 'Gói',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 300,
        minQty: 150,
        reorderQty: 200,
        isActive: true,
        createdBy: 'Trần Thị Lan',
        createdAt: '2026-03-12T10:30:00',
    },
    {
        alertId: 'AL-007',
        itemId: 'ITEM-007',
        itemCode: 'SKU-007',
        itemName: 'Bia Tiger lon 330ml',
        uom: 'Lốc',
        warehouseId: 'WH-003',
        warehouseName: 'Kho Sài Gòn',
        onHandQty: 80,
        minQty: 100,
        reorderQty: 150,
        isActive: false,
        createdBy: 'Lê Hoàng Nam',
        createdAt: '2026-03-25T08:00:00',
    },
    {
        alertId: 'AL-008',
        itemId: 'ITEM-008',
        itemCode: 'SKU-008',
        itemName: 'Trứng gà ta (vỉ 10)',
        uom: 'Vỉ',
        warehouseId: 'WH-003',
        warehouseName: 'Kho Sài Gòn',
        onHandQty: 600,
        minQty: 200,
        reorderQty: 300,
        isActive: true,
        createdBy: 'Phạm Thị Hương',
        createdAt: '2026-03-18T13:20:00',
    },
    {
        alertId: 'AL-009',
        itemId: 'ITEM-009',
        itemCode: 'SKU-009',
        itemName: 'Xúc xích Vissan 500g',
        uom: 'Gói',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 250,
        minQty: 100,
        reorderQty: 180,
        isActive: true,
        createdBy: 'Nguyễn Văn Minh',
        createdAt: '2026-03-05T07:45:00',
    },
    {
        alertId: 'AL-010',
        itemId: 'ITEM-010',
        itemCode: 'SKU-010',
        itemName: 'Sữa đặc Ông Thọ 397g',
        uom: 'Hộp',
        warehouseId: 'WH-002',
        warehouseName: 'Kho Quận 9',
        onHandQty: 30,
        minQty: 80,
        reorderQty: 120,
        isActive: false,
        createdBy: 'Trần Thị Lan',
        createdAt: '2026-03-14T15:10:00',
    },
    {
        alertId: 'AL-011',
        itemId: 'ITEM-011',
        itemCode: 'SKU-011',
        itemName: 'Cà phê G7 3in1',
        uom: 'Hộp',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 900,
        minQty: 300,
        reorderQty: 500,
        isActive: true,
        createdBy: 'Lê Hoàng Nam',
        createdAt: '2026-03-28T09:00:00',
    },
    {
        alertId: 'AL-012',
        itemId: 'ITEM-012',
        itemCode: 'SKU-012',
        itemName: 'Nước mắm Nam Ngư 500ml',
        uom: 'Chai',
        warehouseId: 'WH-003',
        warehouseName: 'Kho Sài Gòn',
        onHandQty: 180,
        minQty: 100,
        reorderQty: 150,
        isActive: true,
        createdBy: 'Phạm Thị Hương',
        createdAt: '2026-03-30T10:30:00',
    },
    {
        alertId: 'AL-013',
        itemId: 'ITEM-013',
        itemCode: 'SKU-013',
        itemName: 'Gói tương ăn liền 200g',
        uom: 'Gói',
        warehouseId: 'WH-002',
        warehouseName: 'Kho Quận 9',
        onHandQty: 5,
        minQty: 60,
        reorderQty: 100,
        isActive: false,
        createdBy: 'Nguyễn Văn Minh',
        createdAt: '2026-04-01T08:15:00',
    },
    {
        alertId: 'AL-014',
        itemId: 'ITEM-014',
        itemCode: 'SKU-014',
        itemName: 'Tã dán newborn (pack 40)',
        uom: 'Pack',
        warehouseId: 'WH-001',
        warehouseName: 'Kho Tổng Hà Nội',
        onHandQty: 120,
        minQty: 50,
        reorderQty: 80,
        isActive: true,
        createdBy: 'Trần Thị Lan',
        createdAt: '2026-04-03T11:00:00',
    },
    {
        alertId: 'AL-015',
        itemId: 'ITEM-015',
        itemCode: 'SKU-015',
        itemName: 'Nước rửa chén Sunlight 750ml',
        uom: 'Chai',
        warehouseId: 'WH-003',
        warehouseName: 'Kho Sài Gòn',
        onHandQty: 95,
        minQty: 50,
        reorderQty: 100,
        isActive: true,
        createdBy: 'Lê Hoàng Nam',
        createdAt: '2026-04-05T14:45:00',
    },
];

// ─── Cột hiển thị ────────────────────────────────────────────────────────────
const ALERT_COLUMNS = [
    {
        id: 'stt',
        label: 'STT',
        sortable: false,
        getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1,
    },
    {
        id: 'alertId',
        label: 'Mã thiết lập',
        sortable: true,
        getValue: (row) => row.alertId ?? '',
    },
    {
        id: 'itemCode',
        label: 'Mã vật tư',
        sortable: true,
        getValue: (row) => row.itemCode ?? '',
    },
    {
        id: 'itemName',
        label: 'Tên vật tư',
        sortable: true,
        getValue: (row) => row.itemName ?? '',
    },
    {
        id: 'warehouse',
        label: 'Kho',
        sortable: true,
        getValue: (row) => row.warehouseName ?? '-',
    },
    {
        id: 'onHandQty',
        label: 'Tồn hiện tại',
        sortable: true,
        getValue: (row) => row.onHandQty != null ? Number(row.onHandQty).toLocaleString('vi-VN') : '-',
        getColor: (row) => {
            const qty = row.onHandQty ?? 0;
            const min = row.minQty ?? 0;
            return qty < min ? '#dc2626' : '#16a34a'; // đỏ nếu dưới định mức, xanh nếu an toàn
        },
    },
    {
        id: 'minQty',
        label: 'Ngưỡng tồn tối thiểu',
        sortable: true,
        getValue: (row) => row.minQty != null ? Number(row.minQty).toLocaleString('vi-VN') : '-',
        getColor: () => '#d97706', // cam — ngưỡng cảnh báo
    },
    {
        id: 'reorderQty',
        label: 'SL nhập đề xuất',
        sortable: true,
        getValue: (row) => row.reorderQty != null ? Number(row.reorderQty).toLocaleString('vi-VN') : '-',
        getColor: () => '#2563eb', // xanh dương — đề xuất nhập
    },
    {
        id: 'status',
        label: 'Trạng thái',
        sortable: true,
        getValue: (row) => {
            const qty = row.onHandQty ?? 0;
            const min = row.minQty ?? 0;
            if (qty < min) return 'Dưới định mức';
            return 'An toàn';
        },
    },
    {
        id: 'createdBy',
        label: 'Nhân viên tạo',
        sortable: true,
        getValue: (row) => row.createdBy ?? '-',
    },
    {
        id: 'createdAt',
        label: 'Ngày tạo',
        sortable: true,
        getValue: (row) => {
            if (!row.createdAt) return '-';
            const d = new Date(row.createdAt);
            return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        },
    },
];

const SORTABLE_COLUMN_IDS = ALERT_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

const DEFAULT_VISIBLE_COLUMN_IDS = ALERT_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const getTableColumnWidth = (colId) => {
    switch (colId) {
        case 'stt': return 56;
        case 'alertId': return 130;
        case 'itemCode': return 130;
        case 'itemName': return 230;
        case 'warehouse': return 160;
        case 'onHandQty': return 140;
        case 'minQty': return 150;
        case 'reorderQty': return 150;
        case 'status': return 150;
        case 'createdBy': return 140;
        case 'createdAt': return 120;
        default: return 160;
    }
};

const isCenterAlignedColumn = (colId) =>
    ['stt', 'onHandQty', 'minQty', 'reorderQty', 'createdAt'].includes(colId);

// ─── Styles giống ViewItemList ────────────────────────────────────────────────
const bodyCellBaseSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

// ─── Component ────────────────────────────────────────────────────────────────
const InventoryAlertSetup = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    // Dữ liệu
    const [data, setData] = useState([]);
    const [activeMap, setActiveMap] = useState({});
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Phân trang
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('alertPageSize');
        return saved ? Number(saved) : 20;
    });

    // Tìm kiếm
    const [searchTerm, setSearchTerm] = useState('');

    // Filter
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const filterValuesRef = useRef({});

    // Dialog tạo mới
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Cột
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('alertVisibleColumns');
        if (saved) {
            try { return new Set(JSON.parse(saved)); }
            catch { return new Set(DEFAULT_VISIBLE_COLUMN_IDS); }
        }
        return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });

    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('alertColumnOrder');
        return saved ? JSON.parse(saved) : ALERT_COLUMNS.map((c) => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);
    const resetRef = useRef(false);

    // Sắp xếp
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');

    // Load data (dùng mock data, bỏ comment để gọi API thật khi backend sẵn sàng)
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // ── Mock data fallback (bỏ comment dòng dưới, comment dòng API khi backend sẵn sàng) ──
            // const result = await getItemWarehousePolicyList({ ... });

            // Mock: trả về đúng cấu trúc { items, totalItems }
            const result = {
                items: MOCK_WAREHOUSE_POLICIES,
                totalItems: MOCK_WAREHOUSE_POLICIES.length,
            };

            setData(result.items);
            setTotalItems(result.totalItems);

            // Khởi tạo activeMap từ mock data
            const initActive = {};
            result.items.forEach((item) => { initActive[item.alertId] = item.isActive ?? true; });
            setActiveMap(initActive);
        } catch (err) {
            const msg = err?.message ?? err?.response?.data?.message ?? err?.response?.data?.detail ?? 'Không thể tải danh sách cảnh báo.';
            setError(msg);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Lọc + tìm kiếm
    const filteredData = data.filter((row) => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                (row.itemCode ?? '').toLowerCase().includes(term) ||
                (row.itemName ?? '').toLowerCase().includes(term);
            if (!matchSearch) return false;
        }
        if (filterValues.itemCode) {
            if (!(row.itemCode ?? '').toLowerCase().includes(filterValues.itemCode.toLowerCase())) return false;
        }
        if (filterValues.itemName) {
            if (!(row.itemName ?? '').toLowerCase().includes(filterValues.itemName.toLowerCase())) return false;
        }
        if (filterValues.warehouseId != null) {
            if (row.warehouseId !== filterValues.warehouseId) return false;
        }
        if (filterValues.statusFilter) {
            const qty = row.onHandQty ?? 0;
            const min = row.minQty ?? 0;
            const isUnder = qty < min;
            if (filterValues.statusFilter === 'under' && !isUnder) return false;
            if (filterValues.statusFilter === 'safe' && isUnder) return false;
        }
        return true;
    });

    // Sắp xếp
    const sortedData = [...filteredData].sort((a, b) => {
        if (!orderBy) return 0;
        const aVal = a[orderBy] ?? '';
        const bVal = b[orderBy] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), 'vi');
        return order === 'asc' ? cmp : -cmp;
    });

    // Phân trang
    const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const start = sortedData.length === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, sortedData.length);

    // ── Column visibility ────────────────────────────────────────────────────
    const handleColumnVisibilityChange = (columnId, checked) => {
        const next = new Set(visibleColumnIds);
        if (checked) next.add(columnId);
        else next.delete(columnId);
        setVisibleColumnIds(next);
        localStorage.setItem('alertVisibleColumns', JSON.stringify([...next]));
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(ALERT_COLUMNS.map((c) => c.id)) : new Set());
    };

    // ── Drag & drop cột trong bảng ─────────────────────────────────────────
    const handleDragStart = (e, columnId) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const newOrder = [...columnOrder];
        const draggedIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetId);
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumn);
        setColumnOrder(newOrder);
        setTempColumnOrder(newOrder);
        localStorage.setItem('alertColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };
    const handleDragEnd = () => { setDraggedColumn(null); };

    // ── Drag & drop trong popup ──────────────────────────────────────────────
    const handlePopupDragStart = (e, colId) => { setDraggedPopupColumn(colId); e.dataTransfer.effectAllowed = 'move'; };
    const handlePopupDragOver = (e) => { e.preventDefault(); };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetId) return;
        const newOrder = [...tempColumnOrder];
        const d = newOrder.indexOf(draggedPopupColumn);
        const t = newOrder.indexOf(targetId);
        newOrder.splice(d, 1);
        newOrder.splice(t, 0, draggedPopupColumn);
        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };
    const handlePopupDragEnd = () => { setDraggedPopupColumn(null); };

    // ── Sort ─────────────────────────────────────────────────────────────────
    const handleSortRequest = (colId) => {
        if (!SORTABLE_COLUMN_IDS.includes(colId)) return;
        let newOrder, newOrderBy;
        if (orderBy === colId) {
            newOrder = order === 'asc' ? 'desc' : 'asc';
            newOrderBy = colId;
        } else {
            newOrderBy = colId;
            newOrder = 'asc';
        }
        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);
    };

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleFilterApply = (values) => {
        filterValuesRef.current = values;
        setFilterValues(values);
        setPage(0);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setPageSize(newSize);
        setPage(0);
        localStorage.setItem('alertPageSize', String(newSize));
    };

    // Toggle bật/tắt cảnh báo nhanh
    const handleToggleActive = (alertId) => {
        setActiveMap((prev) => ({ ...prev, [alertId]: !prev[alertId] }));
    };

    // Thêm thiết lập mới
    const handleCreateAlert = (newAlert) => {
        const alertId = `AL-${String(MOCK_WAREHOUSE_POLICIES.length + 1).padStart(3, '0')}`;
        const newRow = { ...newAlert, alertId };
        setData((prev) => [newRow, ...prev]);
        setTotalItems((prev) => prev + 1);
        setActiveMap((prev) => ({ ...prev, [alertId]: true }));
        showToast('Thêm thiết lập cảnh báo thành công!', 'success');
    };

    const columnSelectorOpen = Boolean(columnSelectorAnchor);
    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('alertColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const handleResetColumns = () => {
        const defaultOrder = ALERT_COLUMNS.map((c) => c.id);
        const defaultVisible = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
        resetRef.current = true;
        setTempColumnOrder(defaultOrder);
        setColumnOrder(defaultOrder);
        setVisibleColumnIds(defaultVisible);
        localStorage.setItem('alertColumnOrder', JSON.stringify(defaultOrder));
        localStorage.setItem('alertVisibleColumns', JSON.stringify([...defaultVisible]));
        setColumnSelectorAnchor(null);
    };

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    useEffect(() => {
        if (!resetRef.current) {
            if (columnSelectorOpen) {
                setTempColumnOrder(columnOrder);
            }
        }
        resetRef.current = false;
    }, [columnSelectorOpen, columnOrder]);

    const visibleColumns = ALERT_COLUMNS.filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafafa',
            }}
        >
            {/* ── Header giống ViewItemList ──────────────────────────── */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 2 },
                    py: 2.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        fontWeight="600"
                        sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                    >
                        Thiết lập Cảnh báo Tồn kho
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Cấu hình ngưỡng tối thiểu và số lượng đặt lại cho từng vật tư tại mỗi kho.
                </Typography>
            </Box>

            {/* ── Main list-view container giống ViewItemList ──────────── */}
            <Box
                className="list-view"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    boxSizing: 'border-box',
                }}
            >
                {/* Wrapper border + radius giống ViewItemList */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        bgcolor: '#ffffff',
                    }}
                >
                    {/* ── Filter / Toolbar bar – Card giống ViewItemList ── */}
                    <Card
                        className="list-filter-card"
                        sx={{
                            mb: 0,
                            borderRadius: '12px 12px 0 0',
                            border: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            boxShadow: 'none',
                        }}
                    >
                        <CardContent
                            sx={{
                                '&.MuiCardContent-root:last-child': { pb: 1.5 },
                                pt: 2,
                                px: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1.5,
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {/* Search – giống ViewItemList */}
                                <SearchInput
                                    placeholder="Tìm kiếm theo mã, tên vật tư…"
                                    value={searchTerm}
                                    onChange={handleSearchTermChange}
                                    sx={{
                                        flex: '1 1 200px',
                                        minWidth: 200,
                                        maxWidth: 480,
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f3f4f6',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            '& fieldset': {
                                                border: 'none',
                                            },
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                            '&.Mui-focused': {
                                                bgcolor: '#ffffff',
                                                borderColor: '#3b82f6',
                                                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                            },
                                            '& input::placeholder': {
                                                color: '#9ca3af',
                                                fontSize: '13px',
                                            },
                                        },
                                    }}
                                />

                                {/* Column selector */}
                                <Tooltip title="Chọn cột hiển thị">
                                    <IconButton
                                        color="primary"
                                        onClick={(e) => { setColumnSelectorAnchor(e.currentTarget); setTempColumnOrder(columnOrder); }}
                                        aria-label="Chọn cột"
                                        sx={{
                                            border: '1px solid #e5e7eb',
                                            bgcolor: '#ffffff',
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                        }}
                                    >
                                        <Columns size={20} />
                                    </IconButton>
                                </Tooltip>

                                {/* Filter button */}
                                <Tooltip title="Bộ lọc">
                                    <IconButton
                                        color="primary"
                                        onClick={() => setFilterOpen(true)}
                                        aria-label="Bộ lọc"
                                        sx={{
                                            border: '1px solid #e5e7eb',
                                            bgcolor: '#ffffff',
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                        }}
                                    >
                                        <Filter size={20} />
                                    </IconButton>
                                </Tooltip>

                                {/* Nút Thêm thiết lập — đẩy sang phải */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: 'auto' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<Plus size={16} />}
                                        onClick={() => setCreateDialogOpen(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            px: 2,
                                            py: 0.75,
                                            borderRadius: '10px',
                                            boxShadow: 'none',
                                            bgcolor: '#3b82f6',
                                            '&:hover': {
                                                bgcolor: '#2563eb',
                                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                            },
                                        }}
                                    >
                                        Thêm thiết lập
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ── Column selector Popover – giống y ViewItemList ─────── */}
                    <Popover
                        open={columnSelectorOpen}
                        anchorEl={columnSelectorAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    width: 340,
                                    maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }
                            }
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>

                        {/* Body */}
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
                        }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === ALERT_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < ALERT_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {[...ALERT_COLUMNS].sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box
                                        key={col.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            borderRadius: '8px',
                                            px: 0.75,
                                            py: 0.25,
                                            '&:hover': { bgcolor: '#f9fafb' },
                                        }}
                                        onDragOver={(e) => { if (col.sortable !== false) e.preventDefault(); }}
                                        onDrop={(e) => { if (col.sortable !== false) { e.preventDefault(); handlePopupDrop(e, col.id); } }}
                                    >
                                        {col.sortable ? (
                                            <Box
                                                draggable
                                                onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                                onDragEnd={handlePopupDragEnd}
                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}
                                            >
                                                <GripVertical size={14} />
                                            </Box>
                                        ) : (
                                            <Box sx={{ width: 14, height: 14 }} />
                                        )}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={visibleColumnIds.has(col.id)}
                                                    disabled={col.id === 'stt'}
                                                    onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                                    sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.Mui-disabled': { color: '#d1d5db' } }}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontSize: '13px', color: col.id === 'stt' ? '#9ca3af' : '#374151' }}>
                                                    {col.label}
                                                    {col.id === 'stt' && (
                                                        <Typography component="span" sx={{ fontSize: '11px', color: '#9ca3af', ml: 0.5 }}>(cố định)</Typography>
                                                    )}
                                                </Typography>
                                            }
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0, alignItems: 'center' }}>
                            <Button
                                variant="text"
                                onClick={handleResetColumns}
                                startIcon={<RotateCcw size={14} />}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', color: '#6b7280', mr: 'auto',
                                    '&:hover': { bgcolor: '#f9fafb', color: '#374151' },
                                }}
                            >
                                Đặt lại
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280',
                                    '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#0284c7', boxShadow: 'none',
                                    '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)' },
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* ── Table card giống ViewItemList ─────────────────────── */}
                    <Card
                        className="list-grid-card"
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 0,
                            border: 'none',
                            boxShadow: 'none',
                            p: 0,
                        }}
                    >
                        <Box
                            className="list-grid-wrapper"
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                minWidth: 0,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                            }}
                        >
                            {/* Loading state giống ViewItemList */}
                            {loading ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 8,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <CircularProgress size={40} sx={{ mb: 2 }} />
                                    <Typography variant="body2">Đang tải danh sách cảnh báo…</Typography>
                                </Box>
                            ) : error ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        color: 'error.main',
                                        textAlign: 'center',
                                        px: 2,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        {error}
                                    </Typography>
                                    <Button variant="outlined" size="small" onClick={() => fetchData()} sx={{ textTransform: 'none' }}>
                                        Thử lại
                                    </Button>
                                </Box>
                            ) : paginatedData.length === 0 ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        px: 2,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <Typography>Chưa có dữ liệu cảnh báo</Typography>
                                </Box>
                            ) : (
                                <TableContainer
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        minWidth: 0,
                                        width: '100%',
                                        maxWidth: '100%',
                                        overflow: 'auto',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <Table
                                        size="small"
                                        stickyHeader
                                        sx={{
                                            minWidth: '100%',
                                            width: 'max-content',
                                            tableLayout: 'fixed',
                                            borderCollapse: 'separate',
                                            borderSpacing: 0,
                                        }}
                                    >
                                        <colgroup>
                                            {visibleColumns.map((col) => (
                                                <col key={col.id} style={{ width: getTableColumnWidth(col.id) }} />
                                            ))}
                                        </colgroup>

                                        <TableHead>
                                            <TableRow>
                                                {visibleColumns.map((col) => {
                                                    const isCenter = isCenterAlignedColumn(col.id);
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align={isCenter ? 'right' : 'left'}
                                                            draggable={col.sortable !== false && col.id !== 'stt'}
                                                            sx={{
                                                                bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                                borderBottom: '2px solid #e5e7eb',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: '#6b7280',
                                                                py: 1.5,
                                                                px: 2,
                                                                whiteSpace: 'nowrap',
                                                                opacity: draggedColumn === col.id ? 0.5 : 1,
                                                                transition: 'all 0.2s',
                                                                overflow: 'hidden',
                                                                ...(col.id === 'stt' && { width: 70, minWidth: 70, maxWidth: 70 }),
                                                            }}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, col.id)}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                                                                {col.sortable && col.id !== 'stt' ? (
                                                                    <Box
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, col.id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            cursor: 'grab',
                                                                            '&:active': { cursor: 'grabbing' },
                                                                            color: '#9ca3af',
                                                                            opacity: 1,
                                                                            transition: 'opacity 0.2s',
                                                                        }}
                                                                    >
                                                                        <GripVertical size={14} />
                                                                    </Box>
                                                                ) : (
                                                                    <Box sx={{ width: 14 }} />
                                                                )}
                                                                {col.sortable ? (
                                                                    <TableSortLabel
                                                                        active={orderBy === col.id}
                                                                        direction={orderBy === col.id ? order : 'asc'}
                                                                        onClick={() => handleSortRequest(col.id)}
                                                                        sx={{
                                                                            flex: 1,
                                                                            '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 },
                                                                        }}
                                                                        >
                                                                        {col.label}
                                                                    </TableSortLabel>
                                                                ) : (
                                                                    <Typography variant="inherit" sx={{ flex: 1 }}>{col.label}</Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {paginatedData.map((row, index) => {
                                                const qty = row?.onHandQty ?? 0;
                                                const min = row?.minQty ?? 0;
                                                const isUnder = qty < min;
                                                return (
                                                    <TableRow
                                                        key={row.alertId}
                                                        hover
                                                        sx={{
                                                            height: 52,
                                                            '&:hover': {
                                                                bgcolor: '#f9fafb',
                                                            },
                                                        }}
                                                    >
                                                        {visibleColumns.map((col) => {
                                                            const opts = { pageNumber: page + 1, pageSize };
                                                            const isCenter = isCenterAlignedColumn(col.id);

                                                            if (col.id === 'stt') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        align="center"
                                                                        sx={{ ...bodyCellBaseSx, px: 1 }}
                                                                    >
                                                                        {(page + 1 - 1) * pageSize + index + 1}
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'itemCode') {
                                                                return (
                                                                    <TableCell key={col.id} align="left">
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                            <Box
                                                                                component="a"
                                                                                href={`/items/${row.itemId}`}
                                                                                onClick={(e) => { e.preventDefault(); navigate(`/items/${row.itemId}`); }}
                                                                                sx={{
                                                                                    color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer',
                                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                    '&:hover': { textDecoration: 'underline' },
                                                                                }}
                                                                                title={col.getValue(row, index, opts)}
                                                                            >
                                                                                {col.getValue(row, index, opts)}
                                                                            </Box>
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'alertId') {
                                                                const isActive = activeMap[row.alertId] ?? true;
                                                                return (
                                                                    <TableCell key={col.id} align="left" sx={{ ...bodyCellBaseSx }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            <Tooltip
                                                                                title={isActive ? 'Tắt cảnh báo này' : 'Bật cảnh báo này'}
                                                                                arrow
                                                                            >
                                                                                <Switch
                                                                                    size="small"
                                                                                    checked={isActive}
                                                                                    onChange={() => handleToggleActive(row.alertId)}
                                                                                    sx={{
                                                                                        p: 0,
                                                                                        '& .MuiSwitch-switchBase': {
                                                                                            '&.Mui-checked': {
                                                                                                color: '#16a34a',
                                                                                                '& + .MuiSwitch-track': {
                                                                                                    bgcolor: '#16a34a',
                                                                                                    opacity: 0.2,
                                                                                                },
                                                                                            },
                                                                                        },
                                                                                        '& .MuiSwitch-thumb': {
                                                                                            bgcolor: isActive ? '#16a34a' : '#9ca3af',
                                                                                        },
                                                                                        '& .MuiSwitch-track': {
                                                                                            bgcolor: isActive ? 'rgba(22, 163, 74, 0.2)' : '#e5e7eb',
                                                                                            borderRadius: '10px',
                                                                                            opacity: 1,
                                                                                        },
                                                                                    }}
                                                                                />
                                                                            </Tooltip>
                                                                            <Box
                                                                                component="a"
                                                                                href="#"
                                                                                onClick={(e) => { e.preventDefault(); console.log('Open detail:', row.alertId); }}
                                                                                sx={{
                                                                                    color: '#3b82f6',
                                                                                    textDecoration: 'none',
                                                                                    fontWeight: 500,
                                                                                    cursor: 'pointer',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                    '&:hover': { textDecoration: 'underline' },
                                                                                }}
                                                                                title={col.getValue(row, index, opts)}
                                                                            >
                                                                                {col.getValue(row, index, opts)}
                                                                            </Box>
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'itemName') {
                                                                return (
                                                                    <TableCell key={col.id} align="left" sx={{ ...bodyCellBaseSx }}>
                                                                        <Box
                                                                            title={col.getValue(row, index, opts)}
                                                                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                                        >
                                                                            <Typography sx={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>
                                                                                {col.getValue(row, index, opts)}
                                                                            </Typography>
                                                                            <Typography sx={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>
                                                                                {row.uom ?? '-'}
                                                                            </Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'status') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        align="left"
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                            <Chip
                                                                                label={isUnder ? '• Dưới định mức' : '• An toàn'}
                                                                                size="small"
                                                                                sx={{
                                                                                    fontWeight: 500,
                                                                                    fontSize: '12px',
                                                                                    lineHeight: '16px',
                                                                                    borderRadius: '999px',
                                                                                    minWidth: 120,
                                                                                    height: '26px',
                                                                                    bgcolor: isUnder
                                                                                        ? 'rgba(239, 68, 68, 0.15)'
                                                                                        : 'rgba(16, 185, 129, 0.2)',
                                                                                    color: '#374151',
                                                                                    border: 'none',
                                                                                    boxShadow: 'none',
                                                                                    '& .MuiChip-label': {
                                                                                        px: 1.5,
                                                                                        py: 0,
                                                                                        textAlign: 'left',
                                                                                        display: 'block',
                                                                                        width: '100%',
                                                                                    },
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            const isNumberCol = ['onHandQty', 'minQty', 'reorderQty'].includes(col.id);

                                                            return (
                                                                <TableCell
                                                                    key={col.id}
                                                                    align={isCenter ? 'center' : 'left'}
                                                                    sx={{
                                                                        ...bodyCellBaseSx,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        ...(isNumberCol && {
                                                                            '& span': {
                                                                                color: col.getColor ? col.getColor(row) : 'inherit',
                                                                                fontWeight: 700,
                                                                            },
                                                                        }),
                                                                    }}
                                                                    title={col.getValue(row, index, opts)}
                                                                >
                                                                    {isNumberCol && col.getColor ? (
                                                                        <span style={{ fontWeight: 700, color: col.getColor(row) }}>
                                                                            {col.getValue(row, index, opts)}
                                                                        </span>
                                                                    ) : (
                                                                        col.getValue(row, index, opts)
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    </Card>

                    {/* ── Pagination footer giống ViewItemList ─────────────── */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 2,
                            py: 2,
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 2,
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
                            Số dòng / trang:
                        </Typography>

                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                sx={{
                                    height: 32,
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
                            {start}–{end} / {totalItems} (Tổng {totalPages} trang)
                        </Typography>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page <= 0}
                            onClick={() => handlePageChange(page - 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Trước
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={end >= totalItems || totalItems === 0}
                            onClick={() => handlePageChange(page + 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Box>

                {/* ── Popups ── */}
                <AlertFilterPopup
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    initialValues={filterValues}
                    onApply={handleFilterApply}
                />

                <CreateAlertDialog
                    open={createDialogOpen}
                    onClose={() => setCreateDialogOpen(false)}
                    onSubmit={handleCreateAlert}
                />

                {/* Toast đặt đúng vị trí như ViewItemList – sau list-view, trong root */}
                {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </Box>
        </Box>
    );
};

export default InventoryAlertSetup;
