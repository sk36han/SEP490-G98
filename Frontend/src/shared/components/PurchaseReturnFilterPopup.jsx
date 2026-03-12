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

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Pending', label: 'Chờ xử lý' },
    { value: 'Approved', label: 'Đã duyệt' },
    { value: 'Rejected', label: 'Từ chối' },
    { value: 'Posted', label: 'Đã hạch toán' },
    { value: 'Completed', label: 'Hoàn tất' },
];

const REFUND_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Pending', label: 'Chờ hoàn tiền' },
    { value: 'Partial', label: 'Hoàn một phần' },
    { value: 'Completed', label: 'Đã hoàn tiền' },
    { value: 'Failed', label: 'Hoàn tiền thất bại' },
    { value: 'NotRequired', label: 'Không cần hoàn tiền' },
];

const REFUND_METHOD_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Tiền mặt', label: 'Tiền mặt' },
    { value: 'Chuyển khoản', label: 'Chuyển khoản' },
    { value: 'Ví điện tử', label: 'Ví điện tử' },
];

export default function PurchaseReturnFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [refundStatusOption, setRefundStatusOption] = useState(REFUND_STATUS_OPTIONS[0]);
    const [refundMethodOption, setRefundMethodOption] = useState(REFUND_METHOD_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    const dropdownPaperSx = {
        borderRadius: '10px',
        mt: 1,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        '& .MuiAutocomplete-listbox': {
            fontSize: '13px',
            fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '4px 0',
            maxHeight: '240px',
        },
        '& .MuiAutocomplete-option': {
            fontSize: '13px',
            fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '8px 12px',
            '&:hover': {
                bgcolor: '#f3f4f6',
            },
            '&[aria-selected="true"]': {
                bgcolor: '#e0f2fe',
            },
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

    const labelSx = {
        fontSize: '12px',
        color: '#6b7280',
        mb: 0.75,
        fontWeight: 500,
    };

    useEffect(() => {
        if (!open) return;

        const status = initialValues.status ?? '';
        const refundStatus = initialValues.refundStatus ?? '';
        const refundMethod = initialValues.refundMethod ?? '';

        setStatusOption(STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0]);
        setRefundStatusOption(REFUND_STATUS_OPTIONS.find((o) => o.value === refundStatus) || REFUND_STATUS_OPTIONS[0]);
        setRefundMethodOption(REFUND_METHOD_OPTIONS.find((o) => o.value === refundMethod) || REFUND_METHOD_OPTIONS[0]);
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            refundStatus: refundStatusOption.value || undefined,
            refundMethod: refundMethodOption.value || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [statusOption, refundStatusOption, refundMethodOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setRefundStatusOption(REFUND_STATUS_OPTIONS[0]);
        setRefundMethodOption(REFUND_METHOD_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({
            status: undefined,
            refundStatus: undefined,
            refundMethod: undefined,
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
                left: 300,
                top: 110,
                width: 320,
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
            }}
        >
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

            <Box
                sx={{
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' },
                }}
            >
                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái phiếu trả hàng</Typography>
                    <Autocomplete
                        size="small"
                        options={STATUS_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={statusOption}
                        onChange={(_, v) => setStatusOption(v || STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn trạng thái"
                                sx={inputSx}
                            />
                        )}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái hoàn tiền</Typography>
                    <Autocomplete
                        size="small"
                        options={REFUND_STATUS_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={refundStatusOption}
                        onChange={(_, v) => setRefundStatusOption(v || REFUND_STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn trạng thái hoàn tiền"
                                sx={inputSx}
                            />
                        )}
                    />
                </Box>

                

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

            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: 1,
                }}
            >
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
                        '&:hover': {
                            bgcolor: '#f3f4f6',
                            borderColor: '#9ca3af',
                        },
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
                        '&:hover': {
                            bgcolor: '#2563eb',
                        },
                    }}
                >
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}