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

const TRANG_THAI_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'under', label: 'Dưới định mức' },
    { value: 'safe', label: 'An toàn' },
];

const WAREHOUSE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: '1', label: 'Kho HCM' },
];

/**
 * Popup bộ lọc cảnh báo tồn kho – new-gen Paper draggable, giống PurchaseOrderFilterPopup.
 */
export default function AlertFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [warehouseOption, setWarehouseOption] = useState(WAREHOUSE_OPTIONS[0]);
    const [trangThaiOption, setTrangThaiOption] = useState(TRANG_THAI_OPTIONS[0]);

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

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

    useEffect(() => {
        if (!open) return;
        setItemCode(initialValues.itemCode ?? '');
        setItemName(initialValues.itemName ?? '');
        setWarehouseOption(
            WAREHOUSE_OPTIONS.find((o) => o.value === String(initialValues.warehouseId ?? '')) ?? WAREHOUSE_OPTIONS[0]
        );
        setTrangThaiOption(
            TRANG_THAI_OPTIONS.find((o) => o.value === (initialValues.statusFilter ?? '')) ?? TRANG_THAI_OPTIONS[0]
        );
    }, [open, initialValues.itemCode, initialValues.itemName, initialValues.warehouseId, initialValues.statusFilter]);

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
            itemCode: itemCode.trim() || undefined,
            itemName: itemName.trim() || undefined,
            warehouseId: warehouseOption.value ? Number(warehouseOption.value) : undefined,
            statusFilter: trangThaiOption.value || undefined,
        });
        onClose();
    }, [itemCode, itemName, warehouseOption, trangThaiOption, onApply, onClose]);

    const handleClear = useCallback(() => {
        setItemCode('');
        setItemName('');
        setWarehouseOption(WAREHOUSE_OPTIONS[0]);
        setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        onApply({
            itemCode: undefined,
            itemName: undefined,
            warehouseId: undefined,
            statusFilter: undefined,
        });
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
                width: 340,
                maxHeight: '70vh',
                borderRadius: '14px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
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
                <IconButton
                    size="small"
                    onClick={onClose}
                    aria-label="Đóng"
                    sx={{
                        p: 0.5,
                        color: '#6b7280',
                        '&:hover': {
                            bgcolor: '#f3f4f6',
                            color: '#111827',
                        },
                    }}
                >
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
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#d1d5db',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: '#9ca3af' },
                },
            }}>
                {/* Mã vật tư */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Mã vật tư</Typography>
                    <TextField
                        size="small"
                        value={itemCode}
                        onChange={(e) => setItemCode(e.target.value)}
                        fullWidth
                        placeholder="Nhập mã vật tư"
                        sx={inputSx}
                    />
                </Box>

                {/* Tên vật tư */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Tên vật tư</Typography>
                    <TextField
                        size="small"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        fullWidth
                        placeholder="Nhập tên vật tư"
                        sx={inputSx}
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
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Chọn kho" sx={inputSx} />
                        )}
                    />
                </Box>

                {/* Trạng thái */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={TRANG_THAI_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={trangThaiOption}
                        onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Chọn trạng thái" sx={inputSx} />
                        )}
                    />
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
                px: 2.5,
                py: 2,
                display: 'flex',
                gap: 1.5,
                borderTop: '1px solid #f3f4f6',
                flexShrink: 0,
            }}>
                <Button
                    variant="outlined"
                    onClick={handleClear}
                    sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontSize: '13px',
                        fontWeight: 500,
                        height: 38,
                        borderRadius: '10px',
                        borderColor: '#e5e7eb',
                        color: '#6b7280',
                        '&:hover': {
                            borderColor: '#d1d5db',
                            bgcolor: '#f9fafb',
                        },
                    }}
                >
                    Xóa lọc
                </Button>
                <Button
                    variant="contained"
                    onClick={handleApply}
                    sx={{
                        flex: 1,
                        textTransform: 'none',
                        fontSize: '13px',
                        fontWeight: 500,
                        height: 38,
                        borderRadius: '10px',
                        bgcolor: '#3b82f6',
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: '#2563eb',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        },
                    }}
                >
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
