import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Button, Typography, IconButton, Tooltip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Popover, FormGroup,
    FormControlLabel, Checkbox, FormControl, Select, MenuItem, Chip,
    CircularProgress, TableSortLabel
} from '@mui/material';
import { Package, Download, Plus, Columns, Filter, RefreshCw, GripVertical } from 'lucide-react';

import authService from '../lib/authService';
import { getItemsForDisplay, updateItemStatus } from '../lib/itemService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { removeDiacritics } from '../utils/stringUtils';
import { useToast } from '../hooks/useToast';
import Toast from '../../components/Toast/Toast';
import SearchInput from '../components/SearchInput';
import ItemFilterPopup from '../components/ItemFilterPopup';

// Import CSS
import '../styles/ItemList.css';

const ITEM_LIST_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false },
    { id: 'itemCode', label: 'Mã vật tư', sortable: true },
    { id: 'itemName', label: 'Tên vật tư', sortable: true },
    { id: 'itemType', label: 'Dạng', sortable: true },
    { id: 'category', label: 'Danh mục', sortable: true },
    { id: 'brand', label: 'Thương hiệu', sortable: true },
    { id: 'availableQty', label: 'Có thể bán', sortable: true },
    { id: 'onHandQty', label: 'Tồn kho', sortable: true },
    { id: 'purchasePrice', label: 'Giá nhập', sortable: true, accountantOnly: true },
    { id: 'salePrice', label: 'Giá xuất', sortable: true, accountantOnly: true },
    { id: 'isActive', label: 'Trạng thái', sortable: true },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <div className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', flex: '1 1 200px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} color={color} />
        </div>
        <div>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>{label}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>{value}</Typography>
        </div>
    </div>
);

const ViewItemList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast, toast, clearToast } = useToast();
    
    // Auth & Roles
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const showAccountantCols = permissionRole === 'ACCOUNTANTS';

    // States
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    
    // Column Management
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('itemVisibleColumns');
        return saved ? new Set(JSON.parse(saved)) : new Set(ITEM_LIST_COLUMNS.map(c => c.id));
    });
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('itemColumnOrder');
        return saved ? JSON.parse(saved) : ITEM_LIST_COLUMNS.map(c => c.id);
    });
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    // Fetch Data
    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const list = await getItemsForDisplay();
            setItems(Array.isArray(list) ? list : []);
        } catch (err) {
            showToast('Không thể tải danh sách vật tư', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Handlers
    const handleSort = (id) => {
        const isAsc = orderBy === id && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(id);
    };

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            localStorage.setItem('itemVisibleColumns', JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectAllItemColumns = (checked) => {
        const newSet = checked 
            ? new Set(ITEM_LIST_COLUMNS.filter(c => !c.accountantOnly || showAccountantCols).map(c => c.id)) 
            : new Set(['stt', 'itemCode']); // Giữ lại các cột tối thiểu
        setVisibleColumnIds(newSet);
        localStorage.setItem('itemVisibleColumns', JSON.stringify([...newSet]));
    };

    // Drag and drop for Table Head
    const handleDragStart = (e, id) => { setDraggedColumn(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const newOrder = [...columnOrder];
        const oldIdx = newOrder.indexOf(draggedColumn);
        const newIdx = newOrder.indexOf(targetId);
        newOrder.splice(oldIdx, 1);
        newOrder.splice(newIdx, 0, draggedColumn);
        setColumnOrder(newOrder);
        localStorage.setItem('itemColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    // Drag and drop for Popover Menu
    const handlePopupDragStart = (e, id) => { setDraggedPopupColumn(id); };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        const newOrder = [...tempColumnOrder];
        const oldIdx = newOrder.indexOf(draggedPopupColumn);
        const newIdx = newOrder.indexOf(targetId);
        newOrder.splice(oldIdx, 1);
        newOrder.splice(newIdx, 0, draggedPopupColumn);
        setTempColumnOrder(newOrder);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('itemColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    // Data Processing
    const filteredItems = useMemo(() => {
        let result = [...items];
        const term = removeDiacritics(searchTerm.toLowerCase().trim());
        if (term) {
            result = result.filter(it => 
                removeDiacritics(it.itemCode || '').toLowerCase().includes(term) ||
                removeDiacritics(it.itemName || '').toLowerCase().includes(term)
            );
        }
        if (orderBy) {
            result.sort((a, b) => {
                const aVal = a[orderBy] ?? '';
                const bVal = b[orderBy] ?? '';
                const res = (aVal < bVal) ? -1 : (aVal > bVal) ? 1 : 0;
                return order === 'asc' ? res : -res;
            });
        }
        return result;
    }, [items, searchTerm, orderBy, order]);

    const displayColumns = useMemo(() => {
        return columnOrder
            .map(id => ITEM_LIST_COLUMNS.find(c => c.id === id))
            .filter(col => {
                if (!col || !visibleColumnIds.has(col.id)) return false;
                if (col.accountantOnly && !showAccountantCols) return false;
                return true;
            });
    }, [columnOrder, visibleColumnIds, showAccountantCols]);

    return (
        <div className="item-page-container">
            <div className="item-header-section">
                <div className="item-title-group">
                    <h1>Danh sách vật tư</h1>
                    <p>Quản lý danh mục hàng hóa, tồn kho và giá chính sách.</p>
                </div>
                <div className="item-summary-grid">
                    <SummaryCard icon={Package} label="Tổng vật tư" value={items.length} color="#64748b" bgColor="#f1f5f9" />
                    <SummaryCard icon={Package} label="Đang giao dịch" value={items.filter(i => i.isActive).length} color="#059669" bgColor="#ecfdf5" />
                    <SummaryCard icon={Package} label="Tạm dừng" value={items.filter(i => !i.isActive).length} color="#d97706" bgColor="#fff7ed" />
                </div>
            </div>

            <div className="item-main-content">
                <div className="item-paper-wrapper">
                    <div className="item-toolbar">
                        <SearchInput 
                            placeholder="Tìm kiếm mã hoặc tên vật tư..." 
                            value={searchTerm} 
                            onChange={(e) => {setSearchTerm(e.target.value); setPage(0);}}
                            style={{ flex: 1, maxWidth: 450 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Bộ lọc"><IconButton onClick={() => setFilterOpen(true)}><Filter size={20} /></IconButton></Tooltip>
                            <Tooltip title="Làm mới"><IconButton onClick={fetchItems}><RefreshCw size={20} /></IconButton></Tooltip>
                            <Tooltip title="Cột hiển thị"><IconButton onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}><Columns size={20} /></IconButton></Tooltip>
                            <Button variant="outlined" startIcon={<Download size={18} />} onClick={() => showToast('Chức năng xuất đang phát triển', 'info')}>Xuất Excel</Button>
                            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/items/create')} sx={{ bgcolor: '#0284c7', textTransform: 'none' }}>
                                Tạo vật tư
                            </Button>
                        </Box>
                    </div>

                    <TableContainer className="item-table-container">
                        <Table stickyHeader size="small" className="item-table">
                            <TableHead>
                                <TableRow>
                                    {displayColumns.map(col => (
                                        <TableCell 
                                            key={col.id}
                                            align={['availableQty', 'onHandQty', 'stt'].includes(col.id) ? 'center' : 'left'}
                                            draggable={col.id !== 'stt'}
                                            onDragStart={(e) => handleDragStart(e, col.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, col.id)}
                                            className={draggedColumn === col.id ? 'is-dragging' : ''}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {col.id !== 'stt' && <GripVertical size={12} style={{ color: '#ccc', cursor: 'grab' }} />}
                                                {col.sortable ? (
                                                    <TableSortLabel 
                                                        active={orderBy === col.id} 
                                                        direction={orderBy === col.id ? order : 'asc'}
                                                        onClick={() => handleSort(col.id)}
                                                    >
                                                        {col.label}
                                                    </TableSortLabel>
                                                ) : col.label}
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={displayColumns.length} align="center" sx={{ py: 10 }}><CircularProgress /></TableCell></TableRow>
                                ) : filteredItems.slice(page * pageSize, (page + 1) * pageSize).map((item, idx) => (
                                    <TableRow key={item.itemId} hover>
                                        {displayColumns.map(col => {
                                            if (col.id === 'stt') return <TableCell key={col.id} align="center">{page * pageSize + idx + 1}</TableCell>;
                                            if (col.id === 'itemCode') return (
                                                <TableCell key={col.id} className="col-item-code" onClick={() => navigate(`/items/${item.itemId}`)}>
                                                    {item.itemCode}
                                                </TableCell>
                                            );
                                            if (col.id === 'isActive') return (
                                                <TableCell key={col.id}>
                                                    <Chip label={item.isActive ? 'Giao dịch' : 'Tạm dừng'} size="small" color={item.isActive ? 'success' : 'default'} variant="outlined" />
                                                </TableCell>
                                            );
                                            const value = item[col.id];
                                            const isPrice = col.id.toLowerCase().includes('price');
                                            return (
                                                <TableCell key={col.id} align={col.id.includes('Qty') ? 'center' : 'left'}>
                                                    {isPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0) : value ?? '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <div className="item-pagination">
                        <Typography variant="caption" color="text.secondary">
                            Hiển thị {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredItems.length)} / {filteredItems.length}
                        </Typography>
                        <Select size="small" value={pageSize} onChange={(e) => {setPageSize(e.target.value); setPage(0);}} sx={{ height: 32, fontSize: 12 }}>
                            {ROWS_PER_PAGE_OPTIONS.map(v => <MenuItem key={v} value={v}>{v} dòng</MenuItem>)}
                        </Select>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
                            <Button size="small" disabled={(page + 1) * pageSize >= filteredItems.length} onClick={() => setPage(p => p + 1)}>Sau</Button>
                        </Box>
                    </div>
                </div>
            </div>

            <ItemFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} onApply={setFilterValues} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            {/* Column Selector Popover */}
            <Popover
                open={columnSelectorOpen}
                anchorEl={columnSelectorAnchor}
                onClose={handleCancelColumnOrder}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { borderRadius: '14px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' } } }}
            >
                <div className="column-selector-popover">
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1e293b' }}>Cấu hình cột hiển thị</Typography>
                    <FormGroup sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={visibleColumnIds.size === displayColumns.length} onChange={(e) => handleSelectAllItemColumns(e.target.checked)} />}
                            label={<Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Tất cả</Typography>}
                            sx={{ mb: 1 }}
                        />
                        {tempColumnOrder.map((colId) => {
                            const col = ITEM_LIST_COLUMNS.find(c => c.id === colId);
                            if (!col || (col.accountantOnly && !showAccountantCols)) return null;
                            return (
                                <div 
                                    key={colId} className="column-item" draggable
                                    onDragStart={(e) => handlePopupDragStart(e, colId)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handlePopupDrop(e, colId)}
                                    onDragEnd={() => setDraggedPopupColumn(null)}
                                    style={{ opacity: draggedPopupColumn === colId ? 0.4 : 1 }}
                                >
                                    <div className="column-drag-handle"><GripVertical size={14} /></div>
                                    <FormControlLabel
                                        sx={{ flex: 1, m: 0 }}
                                        control={<Checkbox size="small" checked={visibleColumnIds.has(colId)} onChange={(e) => handleColumnVisibilityChange(colId, e.target.checked)} disabled={colId === 'stt' || colId === 'itemCode'} />}
                                        label={<Typography sx={{ fontSize: '13px' }}>{col.label}</Typography>}
                                    />
                                </div>
                            );
                        })}
                    </FormGroup>
                    <div className="popover-footer">
                        <Button size="small" onClick={handleCancelColumnOrder} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                        <Button size="small" variant="contained" onClick={handleSaveColumnOrder} sx={{ textTransform: 'none', bgcolor: '#0284c7' }}>Lưu cấu hình</Button>
                    </div>
                </div>
            </Popover>
        </div>
    );
};

export default ViewItemList;