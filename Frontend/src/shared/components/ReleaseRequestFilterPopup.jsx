import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Autocomplete } from '@mui/material';
import { X } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: '',            label: 'Tất cả' },
    { value: 'DRAFT',       label: 'Nháp' },
    { value: 'PENDING_ACC', label: 'Chờ duyệt' },
    { value: 'APPROVED',    label: 'Đã duyệt' },
    { value: 'REJECTED',    label: 'Từ chối' },
    { value: 'CANCELLED',   label: 'Đã hủy' },
];

const STAFF_OPTIONS = [
    { value: 'Nguyen Van A',  label: 'Nguyen Van A' },
    { value: 'Pham Thi B',     label: 'Pham Thi B' },
    { value: 'Tran Van C',    label: 'Tran Van C' },
    { value: 'Le Thi D',      label: 'Le Thi D' },
    { value: 'Hoang Van E',    label: 'Hoang Van E' },
    { value: 'Dinh Van F',     label: 'Dinh Van F' },
];

const RECEIVER_OPTIONS = [
    { value: 'Tran Thi B',    label: 'Tran Thi B' },
    { value: 'Le Van C',      label: 'Le Van C' },
    { value: 'Hoang Van E',   label: 'Hoang Van E' },
    { value: 'Dang Thi F',    label: 'Dang Thi F' },
    { value: 'Nguyen Van G',   label: 'Nguyen Van G' },
    { value: 'Pham Thi H',     label: 'Pham Thi H' },
];

const INPUT_SX = {
    '& .MuiOutlinedInput-root': {
        height: 40, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px',
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: '#e5e7eb' },
        '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } },
    },
    '& .MuiInputBase-input': { fontSize: '13px', py: 0 },
    '& .MuiInputBase-inputSizeSmall': { height: 40 },
};

const LABEL_SX = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

export default function ReleaseRequestFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption,      setStatusOption]      = useState(STATUS_OPTIONS[0]);
    const [requestedByOption, setRequestedByOption] = useState(null);
    const [receiverOption,    setReceiverOption]    = useState(null);
    const [fromExportDate,    setFromExportDate]    = useState('');
    const [toExportDate,      setToExportDate]      = useState('');
    const [fromCreatedDate,   setFromCreatedDate]   = useState('');
    const [toCreatedDate,     setToCreatedDate]     = useState('');

    const boxRef  = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) ?? STATUS_OPTIONS[0]);
        setRequestedByOption(STAFF_OPTIONS.find((o) => o.value === (initialValues.requestedBy ?? '')) ?? null);
        setReceiverOption(RECEIVER_OPTIONS.find((o) => o.value === (initialValues.receiverName ?? '')) ?? null);
        setFromExportDate(initialValues.fromExportDate ?? '');
        setToExportDate(initialValues.toExportDate ?? '');
        setFromCreatedDate(initialValues.fromCreatedDate ?? '');
        setToCreatedDate(initialValues.toCreatedDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status:          statusOption.value       || undefined,
            requestedBy:     requestedByOption?.value || undefined,
            receiverName:    receiverOption?.value   || undefined,
            fromExportDate:  fromExportDate          || undefined,
            toExportDate:    toExportDate            || undefined,
            fromCreatedDate: fromCreatedDate         || undefined,
            toCreatedDate:   toCreatedDate          || undefined,
        });
        onClose();
    }, [statusOption, requestedByOption, receiverOption, fromExportDate, toExportDate, fromCreatedDate, toCreatedDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setRequestedByOption(null);
        setReceiverOption(null);
        setFromExportDate('');
        setToExportDate('');
        setFromCreatedDate('');
        setToCreatedDate('');
        onApply({});
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
            boxRef.current.style.left = dragRef.current.x + 'px';
            boxRef.current.style.top  = dragRef.current.y + 'px';
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
        <Paper ref={boxRef} elevation={0} sx={{
            position: 'fixed', left: 280, top: 120, width: 340, maxHeight: '80vh',
            borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden', zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: '#ffffff',
        }}>
            <Box onMouseDown={handleMouseDown} sx={{
                cursor: 'move', px: 2.5, py: 2, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #f3f4f6',
            }}>
                <Typography variant='subtitle2' fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Bộ lọc</Typography>
                <IconButton size='small' onClick={onClose} aria-label='Đóng'
                    sx={{ p: 0.5, color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#111827' } }}>
                    <X size={18} />
                </IconButton>
            </Box>
            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1, minHeight: 0,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
            }}>
                <Box>
                    <Typography variant='body2' sx={LABEL_SX}>Trạng thái</Typography>
                    <Autocomplete size='small' options={STATUS_OPTIONS} getOptionLabel={(o) => o.label}
                        value={statusOption}
                        onChange={(_, v) => setStatusOption(v ?? STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder='Chọn trạng thái' sx={INPUT_SX} />}
                    />
                </Box>
                <Box>
                    <Typography variant='body2' sx={LABEL_SX}>Nhân viên yêu cầu</Typography>
                    <Autocomplete size='small' options={STAFF_OPTIONS} getOptionLabel={(o) => o.label}
                        value={requestedByOption}
                        onChange={(_, v) => setRequestedByOption(v)}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder='Chọn nhân viên' sx={INPUT_SX} />}
                    />
                </Box>
                <Box>
                    <Typography variant='body2' sx={LABEL_SX}>Người nhận</Typography>
                    <Autocomplete size='small' options={RECEIVER_OPTIONS} getOptionLabel={(o) => o.label}
                        value={receiverOption}
                        onChange={(_, v) => setReceiverOption(v)}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder='Chọn người nhận' sx={INPUT_SX} />}
                    />
                </Box>
                <Box>
                    <Typography variant='body2' sx={LABEL_SX}>Ngày xuất dự kiến</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <TextField size='small' type='date' value={fromExportDate}
                            onChange={(e) => setFromExportDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} placeholder='Từ'
                            sx={{ '& .MuiOutlinedInput-root': { height: 36, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } }, '& .MuiInputBase-input': { fontSize: '12px', py: 0 } }}
                        />
                        <TextField size='small' type='date' value={toExportDate}
                            onChange={(e) => setToExportDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} placeholder='Đến'
                            sx={{ '& .MuiOutlinedInput-root': { height: 36, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } }, '& .MuiInputBase-input': { fontSize: '12px', py: 0 } }}
                        />
                    </Box>
                </Box>
                <Box>
                    <Typography variant='body2' sx={LABEL_SX}>Ngày tạo</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <TextField size='small' type='date' value={fromCreatedDate}
                            onChange={(e) => setFromCreatedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} placeholder='Từ'
                            sx={{ '& .MuiOutlinedInput-root': { height: 36, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } }, '& .MuiInputBase-input': { fontSize: '12px', py: 0 } }}
                        />
                        <TextField size='small' type='date' value={toCreatedDate}
                            onChange={(e) => setToCreatedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} placeholder='Đến'
                            sx={{ '& .MuiOutlinedInput-root': { height: 36, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } }, '& .MuiInputBase-input': { fontSize: '12px', py: 0 } }}
                        />
                    </Box>
                </Box>
            </Box>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <Button variant='outlined' onClick={handleClear}
                    sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>
                    Xóa lọc
                </Button>
                <Button variant='contained' onClick={handleApply}
                    sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#3b82f6', boxShadow: 'none', '&:hover': { bgcolor: '#2563eb', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' } }}>
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
