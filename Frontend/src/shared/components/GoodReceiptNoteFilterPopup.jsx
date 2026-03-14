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
    { value: 'Draft',     label: 'Nháp' },
    { value: 'Submitted', label: 'Đã gửi duyệt' },
    { value: 'Approved',  label: 'Đã duyệt' },
    { value: 'Rejected',  label: 'Từ chối' },
    { value: 'Posted',    label: 'Đã ghi sổ' },
];

const RECEIVING_STATUS_OPTIONS = [
    { value: '',           label: 'Tất cả' },
    { value: 'NotStarted', label: 'Chưa nhập' },
    { value: 'Partial',    label: 'Nhập một phần' },
    { value: 'Completed',  label: 'Đã nhập đủ' },
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
    '& .MuiInputBase-input': { fontSize: '13px' },
};

const LABEL_SX = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

/**
 * Popup bộ lọc phiếu nhập kho (GRN) – draggable, UI only.
 */
export default function GoodReceiptNoteFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [supplier,     setSupplier]     = useState('');
    const [warehouse,    setWarehouse]    = useState('');
    const [createdBy,    setCreatedBy]    = useState('');
    const [product,      setProduct]      = useState('');
    const [fromDate,     setFromDate]     = useState('');
    const [toDate,       setToDate]       = useState('');
    const [receivingStatusOption, setReceivingStatusOption] = useState(RECEIVING_STATUS_OPTIONS[0]);

    const boxRef  = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) ?? STATUS_OPTIONS[0]);
        setSupplier(initialValues.supplier   ?? '');
        setWarehouse(initialValues.warehouse  ?? '');
        setCreatedBy(initialValues.createdBy  ?? '');
        setProduct(initialValues.product    ?? '');
        setFromDate(initialValues.fromDate   ?? '');
        setToDate(initialValues.toDate     ?? '');
        setReceivingStatusOption(RECEIVING_STATUS_OPTIONS.find((o) => o.value === (initialValues.receivingStatus ?? '')) ?? RECEIVING_STATUS_OPTIONS[0]);
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status:    statusOption.value || undefined,
            supplier:  supplier   || undefined,
            warehouse: warehouse  || undefined,
            createdBy: createdBy  || undefined,
            product:          product                      || undefined,
            fromDate:         fromDate                     || undefined,
            toDate:           toDate                       || undefined,
            receivingStatus:  receivingStatusOption.value  || undefined,
        });
        onClose();
    }, [statusOption, receivingStatusOption, supplier, warehouse, createdBy, product, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setSupplier(''); setWarehouse(''); setCreatedBy('');
        setProduct(''); setFromDate(''); setToDate('');
        setReceivingStatusOption(RECEIVING_STATUS_OPTIONS[0]);
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

                {/* Ngày nhập */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Ngày nhập</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Box>
                            <Typography variant="body2" sx={{ ...LABEL_SX, mb: 0.5, fontSize: '11px' }}>Từ ngày</Typography>
                            <TextField size="small" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} fullWidth sx={INPUT_SX} />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ ...LABEL_SX, mb: 0.5, fontSize: '11px' }}>Đến ngày</Typography>
                            <TextField size="small" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} fullWidth sx={INPUT_SX} />
                        </Box>
                    </Box>
                </Box>

                {/* Kho nhập */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Kho nhập</Typography>
                    <TextField size="small" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}
                        fullWidth placeholder="Tìm theo tên kho" sx={INPUT_SX} />
                </Box>

                {/* Nhà cung cấp */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Nhà cung cấp</Typography>
                    <TextField size="small" value={supplier} onChange={(e) => setSupplier(e.target.value)}
                        fullWidth placeholder="Tìm theo tên nhà cung cấp" sx={INPUT_SX} />
                </Box>

                {/* Nhân viên tạo */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Nhân viên tạo</Typography>
                    <TextField size="small" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}
                        fullWidth placeholder="Tìm theo tên nhân viên" sx={INPUT_SX} />
                </Box>

                {/* Sản phẩm */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Sản phẩm</Typography>
                    <TextField size="small" value={product} onChange={(e) => setProduct(e.target.value)}
                        fullWidth placeholder="Tìm theo tên sản phẩm" sx={INPUT_SX} />
                </Box>

                {/* Trạng thái nhập */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Trạng thái nhập</Typography>
                    <Autocomplete
                        size="small"
                        options={RECEIVING_STATUS_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        value={receivingStatusOption}
                        onChange={(_, v) => setReceivingStatusOption(v ?? RECEIVING_STATUS_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn trạng thái nhập" sx={INPUT_SX} />}
                    />
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
