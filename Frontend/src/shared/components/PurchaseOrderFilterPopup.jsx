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

const PO_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Draft', label: 'Nháp' },
    { value: 'Submitted', label: 'Đã gửi' },
    { value: 'Approved', label: 'Đã duyệt' },
];

/**
 * Popup bộ lọc đơn mua (PO) – UI only, tiếng Việt, draggable.
 */
export default function PurchaseOrderFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState(PO_STATUS_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        const status = initialValues.status ?? '';
        setStatusOption(
            PO_STATUS_OPTIONS.find((o) => o.value === status) || PO_STATUS_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.status, initialValues.fromDate, initialValues.toDate]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [statusOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(PO_STATUS_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({
            status: undefined,
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

    const compactSx = { fontSize: '0.8125rem', '& .MuiInputBase-input': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

    return (
        <Paper
            ref={boxRef}
            elevation={8}
            sx={{
                position: 'fixed',
                left: 280,
                top: 120,
                width: 240,
                maxHeight: 'min(85vh, 380px)',
                borderRadius: 2,
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
                    px: 1,
                    py: 0.5,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: 'grey.50',
                }}
            >
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>Bộ lọc đơn mua</Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng" sx={{ p: 0.25 }}>
                    <X size={16} />
                </IconButton>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <Autocomplete
                    size="small"
                    options={PO_STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v || PO_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => <TextField {...params} label="Trạng thái" />}
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Từ ngày"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Đến ngày"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                    <Button size="small" variant="contained" onClick={handleApply} sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}>Áp dụng</Button>
                    <Button size="small" variant="outlined" onClick={handleClear} sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}>Xóa lọc</Button>
                </Box>
            </Box>
        </Paper>
    );
}
