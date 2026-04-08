import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    Popover,
    List,
    ListItem,
    ListItemButton,
} from '@mui/material';
import { Search, X } from 'lucide-react';

const MOCK_ITEMS = [
    { itemId: 'ITEM-001', itemCode: 'SKU-001', itemName: 'Sữa tươi Vinamilk 180ml', uom: 'Thùng' },
    { itemId: 'ITEM-002', itemCode: 'SKU-002', itemName: 'Nước suối Aquafina 500ml', uom: 'Chai' },
    { itemId: 'ITEM-003', itemCode: 'SKU-003', itemName: 'Mì Hảo Hảo Tôm chua cay', uom: 'Thùng' },
    { itemId: 'ITEM-004', itemCode: 'SKU-004', itemName: 'Gạo ST25 (Túi 5kg)', uom: 'Túi' },
    { itemId: 'ITEM-005', itemCode: 'SKU-005', itemName: 'Dầu ăn Tường An 1L', uom: 'Chai' },
    { itemId: 'ITEM-006', itemCode: 'SKU-006', itemName: 'Bánh Oreo vani 133g', uom: 'Gói' },
    { itemId: 'ITEM-007', itemCode: 'SKU-007', itemName: 'Bia Tiger lon 330ml', uom: 'Lốc' },
    { itemId: 'ITEM-008', itemCode: 'SKU-008', itemName: 'Trứng gà ta (vỉ 10)', uom: 'Vỉ' },
    { itemId: 'ITEM-009', itemCode: 'SKU-009', itemName: 'Xúc xích Vissan 500g', uom: 'Gói' },
    { itemId: 'ITEM-010', itemCode: 'SKU-010', itemName: 'Sữa đặc Ông Thọ 397g', uom: 'Hộp' },
    { itemId: 'ITEM-011', itemCode: 'SKU-011', itemName: 'Cà phê G7 3in1', uom: 'Hộp' },
    { itemId: 'ITEM-012', itemCode: 'SKU-012', itemName: 'Nước mắm Nam Ngư 500ml', uom: 'Chai' },
    { itemId: 'ITEM-013', itemCode: 'SKU-013', itemName: 'Gói tương ăn liền 200g', uom: 'Gói' },
    { itemId: 'ITEM-014', itemCode: 'SKU-014', itemName: 'Tã dán newborn (pack 40)', uom: 'Pack' },
    { itemId: 'ITEM-015', itemCode: 'SKU-015', itemName: 'Nước rửa chén Sunlight 750ml', uom: 'Chai' },
];

const ITEM_WAREHOUSES = {
    'ITEM-001': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 300 }, { warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 150 }],
    'ITEM-002': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 50 }, { warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 0 }],
    'ITEM-003': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 800 }, { warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 400 }],
    'ITEM-004': [{ warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 4000 }],
    'ITEM-005': [{ warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 15 }, { warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 0 }],
    'ITEM-006': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 300 }],
    'ITEM-007': [{ warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 80 }],
    'ITEM-008': [{ warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 600 }],
    'ITEM-009': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 250 }],
    'ITEM-010': [{ warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 30 }],
    'ITEM-011': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 900 }],
    'ITEM-012': [{ warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 180 }],
    'ITEM-013': [{ warehouseId: 'WH-002', warehouseName: 'Kho Quận 9', onHandQty: 5 }],
    'ITEM-014': [{ warehouseId: 'WH-001', warehouseName: 'Kho Tổng Hà Nội', onHandQty: 120 }],
    'ITEM-015': [{ warehouseId: 'WH-003', warehouseName: 'Kho Sài Gòn', onHandQty: 95 }],
};

const UnderlineInput = ({ label, value, onChange, placeholder, type = 'text', error, disabled, required }) => (
    <>
        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
        </Typography>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={!disabled}
            style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                borderBottom: `1px solid ${error ? '#ef4444' : disabled ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.1)'}`,
                paddingBottom: '4px',
                fontSize: '14px',
                color: disabled ? '#9ca3af' : '#111827',
                backgroundColor: 'transparent',
                fontFamily: 'inherit',
            }}
        />
        {error && <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{error}</Typography>}
    </>
);

const ReadOnlyField = ({ label, value }) => (
    <>
        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {label}
        </Typography>
        <input
            value={value}
            readOnly
            style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                paddingBottom: '4px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: 'transparent',
                fontFamily: 'inherit',
            }}
        />
    </>
);

export default function CreateAlertDialog({ open, onClose, onSubmit }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const [warehouseId, setWarehouseId] = useState('');
    const [minQty, setMinQty] = useState('');
    const [reorderQty, setReorderQty] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [searchText, setSearchText] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const availableWarehouses = selectedItem ? (ITEM_WAREHOUSES[selectedItem.itemId] || []) : [];
    const selectedWarehouseData = availableWarehouses.find((w) => w.warehouseId === warehouseId);

    const filteredItems = MOCK_ITEMS.filter((item) => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return item.itemCode.toLowerCase().includes(q) || item.itemName.toLowerCase().includes(q);
    });

    useEffect(() => {
        if (open) {
            setSelectedItem(null);
            setWarehouseId('');
            setMinQty('');
            setReorderQty('');
            setErrors({});
            setSubmitting(false);
            setSearchText('');
            setDropdownOpen(false);
        }
    }, [open]);

    // Click outside to close
    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [dropdownOpen]);

    const validate = () => {
        const errs = {};
        if (!selectedItem) errs.selectedItem = 'Vui lòng chọn vật tư.';
        if (!warehouseId) errs.warehouseId = 'Vui lòng chọn kho chứa.';
        if (!minQty.trim() || isNaN(Number(minQty)) || Number(minQty) < 0) errs.minQty = 'Nhập ngưỡng tối thiểu hợp lệ.';
        if (!reorderQty.trim() || isNaN(Number(reorderQty)) || Number(reorderQty) < 0) errs.reorderQty = 'Nhập SL nhập đề xuất hợp lệ.';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const wh = selectedWarehouseData;
            await Promise.resolve(onSubmit({
                itemId: selectedItem.itemId,
                itemCode: selectedItem.itemCode,
                itemName: selectedItem.itemName,
                uom: selectedItem.uom,
                warehouseId: wh.warehouseId,
                warehouseName: wh.warehouseName,
                onHandQty: wh.onHandQty,
                minQty: Number(minQty),
                reorderQty: Number(reorderQty),
                isActive: true,
                createdAt: new Date().toISOString(),
                createdBy: 'Nguyễn Văn Minh',
            }));
            onClose();
        } catch (err) {
            setErrors({ submit: err?.message ?? 'Không thể tạo thiết lập.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setWarehouseId('');
        setSearchText('');
        setDropdownOpen(false);
        setErrors((prev) => ({ ...prev, selectedItem: null }));
    };

    const handleClearItem = () => {
        setSelectedItem(null);
        setWarehouseId('');
        setSearchText('');
        setErrors((prev) => ({ ...prev, selectedItem: null }));
        searchInputRef.current?.focus();
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchText(val);
        if (selectedItem) setSelectedItem(null);
        if (!dropdownOpen) setDropdownOpen(true);
    };

    const handleInputFocus = () => {
        setDropdownOpen(true);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const displayValue = selectedItem
        ? `${selectedItem.itemCode} - ${selectedItem.itemName}`
        : searchText;

    const borderColor = errors.selectedItem ? '#ef4444' : 'rgba(0,0,0,0.1)';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.06)',
                },
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}>
                        Thêm thiết lập cảnh báo
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
                    {/* Vật tư — search underline input + dropdown */}
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Vật tư <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <Box sx={{ position: 'relative' }} ref={dropdownRef}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderBottom: `1px solid ${borderColor}`,
                                pb: 1,
                            }}
                        >
                            <Search size={16} style={{ color: '#9ca3af', marginRight: '8px', flexShrink: 0 }} />
                            <input
                                ref={searchInputRef}
                                value={displayValue}
                                onChange={handleInputChange}
                                onFocus={handleInputFocus}
                                placeholder="Tìm mã, tên vật tư…"
                                autoComplete="off"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '14px',
                                    color: '#111827',
                                    backgroundColor: 'transparent',
                                    fontFamily: 'inherit',
                                }}
                            />
                            {selectedItem && (
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={handleClearItem}
                                    onMouseDown={(e) => e.preventDefault()}
                                    sx={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        color: '#9ca3af',
                                        lineHeight: 0,
                                        '&:hover': { color: '#374151' },
                                    }}
                                >
                                    <X size={14} />
                                </Box>
                            )}
                        </Box>

                        {/* Dropdown list */}
                        {dropdownOpen && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 10,
                                    mt: 0.5,
                                    bgcolor: '#fff',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                    maxHeight: 280,
                                    overflowY: 'auto',
                                }}
                            >
                                <Box sx={{ py: 0.5 }}>
                                    {filteredItems.length === 0 ? (
                                        <Box sx={{ py: 1.5, px: 2, fontSize: '14px', color: '#9ca3af' }}>
                                            Không tìm thấy vật tư
                                        </Box>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <Box
                                                key={item.itemId}
                                                component="button"
                                                type="button"
                                                onClick={() => handleSelectItem(item)}
                                                sx={{
                                                    display: 'block',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    py: 1.25,
                                                    px: 2,
                                                    '&:hover': { bgcolor: '#f3f4f6' },
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>
                                                    {item.itemName}
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#9ca3af' }}>
                                                    {item.itemCode} · {item.uom}
                                                </Typography>
                                            </Box>
                                        ))
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Box>
                    {errors.selectedItem && (
                        <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{errors.selectedItem}</Typography>
                    )}

                    {/* Kho chứa */}
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5, mt: 2.5 }}>
                        Kho chứa <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>

                    {!selectedItem ? (
                        <Box
                            component="input"
                            value=""
                            readOnly
                            placeholder="Chọn kho sau khi chọn vật tư…"
                            sx={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                pb: 1,
                                fontSize: '14px',
                                color: '#9ca3af',
                                bgcolor: 'transparent',
                                fontFamily: 'inherit',
                            }}
                        />
                    ) : availableWarehouses.length === 0 ? (
                        <Box
                            component="input"
                            value="Vật tư chưa có trong kho nào"
                            readOnly
                            sx={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                pb: 1,
                                fontSize: '14px',
                                color: '#9ca3af',
                                bgcolor: 'transparent',
                                fontFamily: 'inherit',
                            }}
                        />
                    ) : (
                        <Box
                            component="select"
                            value={warehouseId}
                            onChange={(e) => {
                                setWarehouseId(e.target.value);
                                setErrors((prev) => ({ ...prev, warehouseId: null }));
                            }}
                            sx={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                borderBottom: `1px solid ${errors.warehouseId ? '#ef4444' : 'rgba(0,0,0,0.1)'}`,
                                pb: 1,
                                fontSize: '14px',
                                color: warehouseId ? '#111827' : '#9ca3af',
                                bgcolor: 'transparent',
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                '&:focus': { borderBottom: errors.warehouseId ? '#ef4444' : '#0284c7' },
                            }}
                        >
                            <option value="">— Chọn kho chứa —</option>
                            {availableWarehouses.map((wh) => (
                                <option key={wh.warehouseId} value={wh.warehouseId}>
                                    {wh.warehouseName}
                                </option>
                            ))}
                        </Box>
                    )}
                    {errors.warehouseId && (
                        <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{errors.warehouseId}</Typography>
                    )}

                    {/* Tồn hiện tại */}
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5, mt: 2.5 }}>
                        Tồn hiện tại
                    </Typography>
                    <Box
                        component="input"
                        value={selectedWarehouseData ? selectedWarehouseData.onHandQty.toLocaleString('vi-VN') : '-'}
                        readOnly
                        sx={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            pb: 1,
                            fontSize: '14px',
                            color: '#111827',
                            bgcolor: 'transparent',
                            fontFamily: 'inherit',
                        }}
                    />

                    {/* Ngưỡng + SL nhập */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2.5 }}>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineInput
                                label="Ngưỡng tồn tối thiểu"
                                value={minQty}
                                onChange={(e) => {
                                    setMinQty(e.target.value);
                                    setErrors((prev) => ({ ...prev, minQty: null }));
                                }}
                                placeholder="VD: 100"
                                error={errors.minQty}
                                required
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineInput
                                label="SL nhập đề xuất"
                                value={reorderQty}
                                onChange={(e) => {
                                    setReorderQty(e.target.value);
                                    setErrors((prev) => ({ ...prev, reorderQty: null }));
                                }}
                                placeholder="VD: 200"
                                error={errors.reorderQty}
                                required
                            />
                        </Box>
                    </Box>

                    {/* Read-only fields */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2.5 }}>
                        <Box sx={{ flex: 1 }}>
                            <ReadOnlyField label="Nhân viên tạo" value="Nguyễn Văn Minh" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <ReadOnlyField label="Ngày tạo" value={formatDate(new Date().toISOString())} />
                        </Box>
                    </Box>

                    {errors.submit && (
                        <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 1.5 }}>{errors.submit}</Typography>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderTop: '1px solid rgba(0,0,0,0.06)',
                        gap: 1.5,
                    }}
                >
                    <Button
                        onClick={onClose}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: 'text.secondary',
                            px: 2,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            px: 3,
                            py: 0.75,
                            borderRadius: '8px',
                            boxShadow: 'none',
                            '&:hover': { boxShadow: '0 2px 8px rgba(25,118,210,0.24)' },
                        }}
                    >
                        {submitting ? 'Đang lưu…' : 'Thêm'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
