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
    { value: '',          label: 'Tất cả' },
    { value: 'PENDING',   label: 'Chờ duyệt' },
    { value: 'APPROVED',  label: 'Đã duyệt' },
    { value: 'REJECTED',  label: 'Từ chối' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
];

// Mock staff list – thay bằng API thực tế khi có backend
const STAFF_OPTIONS = [
    { value: 'Nguyễn Văn A',  label: 'Nguyễn Văn A' },
    { value: 'Phạm Thị D',    label: 'Phạm Thị D' },
    { value: 'Vũ Văn G',       label: 'Vũ Văn G' },
    { value: 'Ngô Thị K',     label: 'Ngô Thị K' },
    { value: 'Trịnh Văn N',   label: 'Trịnh Văn N' },
    { value: 'Đinh Văn R',    label: 'Đinh Văn R' },
];

// Mock receiver list
const RECEIVER_OPTIONS = [
    { value: 'Trần Thị B',    label: 'Trần Thị B' },
    { value: 'Lê Văn C',      label: 'Lê Văn C' },
    { value: 'Hoàng Văn E',   label: 'Hoàng Văn E' },
    { value: 'Đặng Thị F',    label: 'Đặng Thị F' },
    { value: 'Bùi Thị H',     label: 'Bùi Thị H' },
    { value: 'Đỗ Văn I',      label: 'Đỗ Văn I' },
    { value: 'Lý Văn L',      label: 'Lý Văn L' },
    { value: 'Mai Thị M',     label: 'Mai Thị M' },
    { value: 'Phạm Thị P',    label: 'Phạm Thị P' },
    { value: 'Vũ Thị Q',      label: 'Vũ Thị Q' },
    { value: 'Nguyễn Thị S',  label: 'Nguyễn Thị S' },
    { value: 'Chu Thị T',     label: 'Chu Thị T' },
];

const INPUT_SX = {
    '& .MuiOutlinedInput-root': {
        height: 40,
        bgcolor: '#f3f4f6',
        borderRadius: '10px',
        fontSize: '13px',
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: '#e5e7eb' },
        '&.Mui-focused': {
            bgcolor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
            '& fieldset': { border: '1px solid #3b82f6' },
        },
    },
    '& .MuiInputBase-input': { fontSize: '13px', py: 0 },
    '& .MuiInputBase-inputSizeSmall': { height: 40 },
};

const LABEL_SX = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

/**
 * Popup bộ lọc yêu cầu xuất hàng – draggable, UI only.
 */
export default function ReleaseRequestFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption,    setStatusOption]    = useState(STATUS_OPTIONS[0]);
    const [staffOption,     setStaffOption]    = useState(null);
    const [receiverOption,  setReceiverOption] = useState(null);
    const [fromExportDate,  setFromExportDate] = useState('');
    const [toExportDate,    setToExportDate]   = useState('');
    const [fromCreatedDate, setFromCreatedDate] = useState('');
    const [toCreatedDate,   setToCreatedDate] = useState('');

    const boxRef  = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) ?? STATUS_OPTIONS[0]);
        setStaffOption(STAFF_OPTIONS.find((o) => o.value === (initialValues.createdBy ?? '')) ?? null);
        setReceiverOption(RECEIVER_OPTIONS.find((o) => o.value === (initialValues.receiverName ?? '')) ?? null);
        setFromExportDate(initialValues.fromExportDate ?? '');
        setToExportDate(initialValues.toExportDate ?? '');
        setFromCreatedDate(initialValues.fromCreatedDate ?? '');
        setToCreatedDate(initialValues.toCreatedDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status:          statusOption.value    || undefined,
            createdBy:        staffOption?.value    || undefined,
            receiverName:    receiverOption?.value || undefined,
            fromExportDate:  fromExportDate        || undefined,
            toExportDate:    toExportDate          || undefined,
            fromCreatedDate: fromCreatedDate       || undefined,
            toCreatedDate:   toCreatedDate        || undefined,
        });
        onClose();
    }, [statusOption, staffOption, receiverOption, fromExportDate, toExportDate, fromCreatedDate, toCreatedDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setStaffOption(null); setReceiverOption(null);
        setFromExportDate(''); setToExportDate('');
        setFromCreatedDate(''); setToCreatedDate('');
        onApply({});
        onClose();
    }, [onApply, onClose]);

    // ── Drag ────────────────────────────────────────────────────────────────────
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
            boxRef.current.style.top  = `${dragRef.current.y}px`;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup',   onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
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
                maxHeight: '80vh',
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
            {/* ── Header (drag handle) ─────────────────────────────────────── */}
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
                    px: 2.5, py: 2,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid #f3f4f6',
                }}
            >
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                    Bộ lọc
                </Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng"
                    sx={{ p: 0.5, color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#111827' } }}>
                    <X size={18} />
                </IconButton>
            </Box>

            {/* ── Body ────────────────────────────────────────────────────────── */}
            <Box sx={{
                p: 2.5, display: 'flex', flexDirection: 'column', gap: 2,
                overflowY: 'auto', flex: 1, minHeight: 0,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
            }}>

                {/* Trạng thái */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={STATUS_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        value={statusOption}
                        onChange={(_, v) => setStatusOption(v ?? STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn trạng thái" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Nhân viên tạo */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Nhân viên tạo</Typography>
                    <Autocomplete
                        size="small"
                        options={STAFF_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        value={staffOption}
                        onChange={(_, v) => setStaffOption(v)}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn nhân viên" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Người nhận */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Người nhận</Typography>
                    <Autocomplete
                        size="small"
                        options={RECEIVER_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        value={receiverOption}
                        onChange={(_, v) => setReceiverOption(v)}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn người nhận" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Ngày xuất dự kiến */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Ngày xuất dự kiến</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={fromExportDate}
                            onChange={(e) => setFromExportDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: 36,
                                    bgcolor: '#f3f4f6',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#e5e7eb' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                                        '& fieldset': { border: '1px solid #3b82f6' },
                                    },
                                },
                                '& .MuiInputBase-input': { fontSize: '12px', py: 0 },
                            }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={toExportDate}
                            onChange={(e) => setToExportDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: 36,
                                    bgcolor: '#f3f4f6',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#e5e7eb' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                                        '& fieldset': { border: '1px solid #3b82f6' },
                                    },
                                },
                                '& .MuiInputBase-input': { fontSize: '12px', py: 0 },
                            }}
                        />
                    </Box>
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Ngày tạo</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={fromCreatedDate}
                            onChange={(e) => setFromCreatedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: 36,
                                    bgcolor: '#f3f4f6',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#e5e7eb' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                                        '& fieldset': { border: '1px solid #3b82f6' },
                                    },
                                },
                                '& .MuiInputBase-input': { fontSize: '12px', py: 0 },
                            }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={toCreatedDate}
                            onChange={(e) => setToCreatedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    height: 36,
                                    bgcolor: '#f3f4f6',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#e5e7eb' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                                        '& fieldset': { border: '1px solid #3b82f6' },
                                    },
                                },
                                '& .MuiInputBase-input': { fontSize: '12px', py: 0 },
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <Button variant="outlined" onClick={handleClear}
                    sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>
                    Xóa lọc
                </Button>
                <Button variant="contained" onClick={handleApply}
                    sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#3b82f6', boxShadow: 'none', '&:hover': { bgcolor: '#2563eb', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' } }}>
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
