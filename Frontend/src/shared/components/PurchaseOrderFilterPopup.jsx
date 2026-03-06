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

const APPROVAL_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Pending', label: 'Chờ duyệt' },
    { value: 'Approved', label: 'Đã duyệt' },
    { value: 'Rejected', label: 'Từ chối' },
];

const RECEIVING_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Pending', label: 'Chờ nhập' },
    { value: 'Partial', label: 'Nhập một phần' },
    { value: 'Completed', label: 'Nhập toàn bộ' },
];

/**
 * Popup bộ lọc đơn mua (PO) – UI only, tiếng Việt, draggable.
 */
export default function PurchaseOrderFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [approvalStatusOption, setApprovalStatusOption] = useState(APPROVAL_STATUS_OPTIONS[0]);
    const [receivingStatusOption, setReceivingStatusOption] = useState(RECEIVING_STATUS_OPTIONS[0]);
    const [supplier, setSupplier] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [creator, setCreator] = useState('');
    const [product, setProduct] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        const approvalStatus = initialValues.approvalStatus ?? '';
        const receivingStatus = initialValues.receivingStatus ?? '';
        setApprovalStatusOption(
            APPROVAL_STATUS_OPTIONS.find((o) => o.value === approvalStatus) || APPROVAL_STATUS_OPTIONS[0]
        );
        setReceivingStatusOption(
            RECEIVING_STATUS_OPTIONS.find((o) => o.value === receivingStatus) || RECEIVING_STATUS_OPTIONS[0]
        );
        setSupplier(initialValues.supplier ?? '');
        setWarehouse(initialValues.warehouse ?? '');
        setCreator(initialValues.creator ?? '');
        setProduct(initialValues.product ?? '');
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            approvalStatus: approvalStatusOption.value || undefined,
            receivingStatus: receivingStatusOption.value || undefined,
            supplier: supplier || undefined,
            warehouse: warehouse || undefined,
            creator: creator || undefined,
            product: product || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [approvalStatusOption, receivingStatusOption, supplier, warehouse, creator, product, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setApprovalStatusOption(APPROVAL_STATUS_OPTIONS[0]);
        setReceivingStatusOption(RECEIVING_STATUS_OPTIONS[0]);
        setSupplier('');
        setWarehouse('');
        setCreator('');
        setProduct('');
        setFromDate('');
        setToDate('');
        onApply({
            approvalStatus: undefined,
            receivingStatus: undefined,
            supplier: undefined,
            warehouse: undefined,
            creator: undefined,
            product: undefined,
            fromDate: undefined,
            toDate: undefined,
        });
        onClose();
    }, [onApply, onClose]);

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
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#d1d5db',
                    borderRadius: '3px',
                    '&:hover': {
                        bgcolor: '#9ca3af',
                    },
                },
            }}>
                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Trạng thái duyệt
                    </Typography>
                    <Autocomplete
                        size="small"
                        options={APPROVAL_STATUS_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={approvalStatusOption}
                        onChange={(_, v) => setApprovalStatusOption(v || APPROVAL_STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                placeholder="Chọn trạng thái"
                                sx={{
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
                                }}
                            />
                        )}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Trạng thái nhập hàng
                    </Typography>
                    <Autocomplete
                        size="small"
                        options={RECEIVING_STATUS_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={receivingStatusOption}
                        onChange={(_, v) => setReceivingStatusOption(v || RECEIVING_STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                placeholder="Chọn trạng thái"
                                sx={{
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
                                }}
                            />
                        )}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Nhà cung cấp
                    </Typography>
                    <TextField
                        size="small"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        fullWidth
                        placeholder="Tìm theo tên nhà cung cấp"
                        sx={{
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
                        }}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Kho/Chi nhánh
                    </Typography>
                    <TextField
                        size="small"
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        fullWidth
                        placeholder="Tìm theo tên kho"
                        sx={{
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
                        }}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Nhân viên tạo
                    </Typography>
                    <TextField
                        size="small"
                        value={creator}
                        onChange={(e) => setCreator(e.target.value)}
                        fullWidth
                        placeholder="Tìm theo tên nhân viên"
                        sx={{
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
                        }}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                        Sản phẩm
                    </Typography>
                    <TextField
                        size="small"
                        value={product}
                        onChange={(e) => setProduct(e.target.value)}
                        fullWidth
                        placeholder="Tìm theo tên sản phẩm"
                        sx={{
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
                        }}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                        <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                            Từ ngày
                        </Typography>
                        <TextField
                            size="small"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            sx={{
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
                            }}
                        />
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 }}>
                            Đến ngày
                        </Typography>
                        <TextField
                            size="small"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            sx={{
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
                            }}
                        />
                    </Box>
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
