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
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Ngưng' },
];

/**
 * Popup bộ lọc người nhận – nhỏ gọn, draggable, dùng chung layout với SupplierFilterPopup.
 * UI only (lọc trên dữ liệu đã tải).
 */
export default function ReceiverFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [receiverCode, setReceiverCode] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [ward, setWard] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setReceiverCode(initialValues.receiverCode ?? '');
        setReceiverName(initialValues.receiverName ?? '');
        setPhone(initialValues.phone ?? '');
        setEmail(initialValues.email ?? '');
        setWard(initialValues.ward ?? '');
        setProvince(initialValues.province ?? '');
        setCountry(initialValues.country ?? '');
        const isActive = initialValues.isActive;
        setStatusOption(
            isActive === true ? STATUS_OPTIONS[1]
                : isActive === false ? STATUS_OPTIONS[2]
                    : STATUS_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [
        open,
        initialValues.receiverCode,
        initialValues.receiverName,
        initialValues.phone,
        initialValues.email,
        initialValues.isActive,
        initialValues.fromDate,
        initialValues.toDate,
    ]);

    const handleApply = useCallback(() => {
        const isActive =
            statusOption.value === ''
                ? null
                : statusOption.value === 'true';
        onApply({
            receiverCode: receiverCode.trim() || undefined,
            receiverName: receiverName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            ward: ward.trim() || undefined,
            province: province.trim() || undefined,
            country: country.trim() || undefined,
            isActive,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [receiverCode, receiverName, phone, email, statusOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setReceiverCode('');
        setReceiverName('');
        setPhone('');
        setEmail('');
        setWard('');
        setProvince('');
        setCountry('');
        setStatusOption(STATUS_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({
            receiverCode: undefined,
            receiverName: undefined,
            phone: undefined,
            email: undefined,
            ward: undefined,
            province: undefined,
            country: undefined,
            isActive: null,
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

    const compactSx = {
        fontSize: '0.8125rem',
        '& .MuiInputBase-input': { fontSize: '0.8125rem' },
        '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
    };

    return (
        <Paper
            ref={boxRef}
            elevation={8}
            sx={{
                position: 'fixed',
                left: 280,
                top: 120,
                width: 260,
                maxHeight: 'min(85vh, 420px)',
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
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                    Bộ lọc người nhận
                </Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng" sx={{ p: 0.25 }}>
                    <X size={16} />
                </IconButton>
            </Box>
            <Box
                sx={{
                    p: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                <TextField
                    size="small"
                    label="Mã người nhận"
                    value={receiverCode}
                    onChange={(e) => setReceiverCode(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Tên người nhận"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Phường"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Tỉnh"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Quốc gia"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <Autocomplete
                    size="small"
                    options={STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v || STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => <TextField {...params} label="Trạng thái" />}
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Từ ngày tạo"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Đến ngày tạo"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleApply}
                        sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}
                    >
                        Áp dụng
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleClear}
                        sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}
                    >
                        Xóa lọc
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

