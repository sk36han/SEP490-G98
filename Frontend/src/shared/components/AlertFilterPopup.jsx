import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    IconButton,
    Autocomplete,
} from '@mui/material';
import { X } from 'lucide-react';

const ALL_DATA = [
    { alertId: 'AL-001', itemCode: 'SKU-001', itemName: 'Sữa tươi Vinamilk 180ml', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-002', itemCode: 'SKU-002', itemName: 'Nước suối Aquafina 500ml', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-003', itemCode: 'SKU-003', itemName: 'Mì Hảo Hảo Tôm chua cay', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-004', itemCode: 'SKU-004', itemName: 'Gạo ST25 (Túi 5kg)', warehouseName: 'Kho Quận 9', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-005', itemCode: 'SKU-005', itemName: 'Dầu ăn Tường An 1L', warehouseName: 'Kho Quận 9', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-006', itemCode: 'SKU-006', itemName: 'Bánh Oreo vani 133g', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-007', itemCode: 'SKU-007', itemName: 'Bia Tiger lon 330ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-008', itemCode: 'SKU-008', itemName: 'Trứng gà ta (vỉ 10)', warehouseName: 'Kho Sài Gòn', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-009', itemCode: 'SKU-009', itemName: 'Xúc xích Vissan 500g', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-010', itemCode: 'SKU-010', itemName: 'Sữa đặc Ông Thọ 397g', warehouseName: 'Kho Quận 9', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-011', itemCode: 'SKU-011', itemName: 'Cà phê G7 3in1', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-012', itemCode: 'SKU-012', itemName: 'Nước mắm Nam Ngư 500ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-013', itemCode: 'SKU-013', itemName: 'Gói tương ăn liền 200g', warehouseName: 'Kho Quận 9', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-014', itemCode: 'SKU-014', itemName: 'Tã dán newborn (pack 40)', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-015', itemCode: 'SKU-015', itemName: 'Nước rửa chén Sunlight 750ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Lê Hoàng Nam' },
];

const WAREHOUSE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'WH-001', label: 'Kho Tổng Hà Nội' },
    { value: 'WH-002', label: 'Kho Quận 9' },
    { value: 'WH-003', label: 'Kho Sài Gòn' },
];

const dropdownPaperSx = {
    borderRadius: '10px',
    mt: 1,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    '& .MuiAutocomplete-listbox': {
        fontSize: '13px',
        padding: '4px 0',
        maxHeight: '240px',
    },
    '& .MuiAutocomplete-option': {
        fontSize: '13px',
        padding: '8px 12px',
        '&:hover': { bgcolor: '#f3f4f6' },
        '&[aria-selected="true"]': { bgcolor: '#e0f2fe' },
    },
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        height: 40,
        bgcolor: '#f3f4f6',
        borderRadius: '10px',
        fontSize: '13px',
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: '#e5e7eb' },
        '&.Mui-focused': {
            bgcolor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
            '& fieldset': { border: '1px solid #3b82f6' },
        },
    },
    '& .MuiInputBase-input': { fontSize: '13px' },
};

const labelSx = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

export default function AlertFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [warehouseOption, setWarehouseOption] = useState(WAREHOUSE_OPTIONS[0]);
    const [createdBy, setCreatedBy] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    // Options
    const itemCodeOptions = [...new Set(ALL_DATA.map((d) => d.itemCode))].map((v) => ({ label: v }));
    const itemNameOptions = ALL_DATA.map((d) => ({ label: d.itemName, sub: d.itemCode }));
    const createdByOptions = [...new Set(ALL_DATA.map((d) => d.createdBy))].map((v) => ({ label: v }));

    useEffect(() => {
        if (!open) return;
        setItemCode(initialValues.itemCode ?? '');
        setItemName(initialValues.itemName ?? '');
        setWarehouseOption(WAREHOUSE_OPTIONS.find((o) => o.label === (initialValues.warehouseName ?? 'Tất cả')) ?? WAREHOUSE_OPTIONS[0]);
        setCreatedBy(initialValues.createdBy ?? '');
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open]);

    const handleMouseDown = useCallback((e) => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        dragRef.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY };
        const onMouseMove = (ev) => {
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            dragRef.current.x += dx;
            dragRef.current.y += dy;
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
            boxRef.current.style.left = `${dragRef.current.x}px`;
            boxRef.current.style.top = `${dragRef.current.y}px`;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    const handleApply = useCallback(() => {
        onApply({
            itemCode: itemCode || undefined,
            itemName: itemName || undefined,
            warehouseName: warehouseOption.label !== 'Tất cả' ? warehouseOption.label : undefined,
            createdBy: createdBy || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [itemCode, itemName, warehouseOption, createdBy, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setItemCode('');
        setItemName('');
        setWarehouseOption(WAREHOUSE_OPTIONS[0]);
        setCreatedBy('');
        setFromDate('');
        setToDate('');
        onApply({});
        onClose();
    }, [onApply, onClose]);

    if (!open) return null;

    return (
        <Paper
            ref={boxRef}
            elevation={0}
            sx={{
                position: 'fixed',
                left: 280,
                top: 120,
                width: 360,
                borderRadius: '14px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
            }}
        >
            {/* Header */}
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
                    px: 2.5,
                    py: 2,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f3f4f6',
                }}
            >
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                    Bộ lọc
                </Typography>
                <IconButton size="small" onClick={onClose} sx={{ p: 0.5, color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#111827' } }}>
                    <X size={18} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
            }}>
                {/* Mã vật tư */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Mã vật tư</Typography>
                    <Autocomplete
                        size="small"
                        options={itemCodeOptions}
                        getOptionLabel={(opt) => opt.label}
                        value={itemCodeOptions.find((o) => o.label === itemCode) || null}
                        onChange={(_, v) => setItemCode(v?.label ?? '')}
                        isOptionEqualToValue={(a, b) => a.label === b.label}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Tìm mã vật tư…" sx={inputSx} />
                        )}
                    />
                </Box>

                {/* Tên vật tư */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Tên vật tư</Typography>
                    <Autocomplete
                        size="small"
                        options={itemNameOptions}
                        getOptionLabel={(opt) => opt.label}
                        value={itemNameOptions.find((o) => o.label === itemName) || null}
                        onChange={(_, v) => setItemName(v?.label ?? '')}
                        isOptionEqualToValue={(a, b) => a.label === b.label}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Tìm tên vật tư…" sx={inputSx} />
                        )}
                    />
                </Box>

                {/* Kho */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Kho</Typography>
                    <Autocomplete
                        size="small"
                        options={WAREHOUSE_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={warehouseOption}
                        onChange={(_, v) => setWarehouseOption(v || WAREHOUSE_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Chọn kho" sx={inputSx} />
                        )}
                    />
                </Box>

                {/* Nhân viên tạo */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Nhân viên tạo</Typography>
                    <Autocomplete
                        size="small"
                        options={createdByOptions}
                        getOptionLabel={(opt) => opt.label}
                        value={createdByOptions.find((o) => o.label === createdBy) || null}
                        onChange={(_, v) => setCreatedBy(v?.label ?? '')}
                        isOptionEqualToValue={(a, b) => a.label === b.label}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Tìm nhân viên tạo…" sx={inputSx} />
                        )}
                    />
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến ngày"
                            fullWidth
                            sx={inputSx}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <Button
                    fullWidth
                    size="small"
                    onClick={handleClear}
                    sx={{
                        fontSize: '13px',
                        fontWeight: 500,
                        textTransform: 'none',
                        height: 36,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        '&:hover': { bgcolor: '#f3f4f6', borderColor: '#9ca3af' },
                    }}
                >
                    Xóa lọc
                </Button>
                <Button
                    fullWidth
                    size="small"
                    onClick={handleApply}
                    sx={{
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'none',
                        height: 36,
                        borderRadius: '8px',
                        bgcolor: '#3b82f6',
                        color: '#ffffff',
                        '&:hover': { bgcolor: '#2563eb' },
                    }}
                >
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}