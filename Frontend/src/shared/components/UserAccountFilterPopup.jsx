import React, { useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import { X } from 'lucide-react';
import { ROLE_OPTIONS } from '../constants/roles';

const TRANG_THAI_OPTIONS = [
    { value: null, label: 'Tất cả' },
    { value: true, label: 'Hoạt động' },
    { value: false, label: 'Vô hiệu' },
];

const POPUP_WIDTH = 260;
const POPUP_HEIGHT_ESTIMATE = 400;
const DEFAULT_LEFT = 280;
const DEFAULT_TOP = 120;

function clampPosition(x, y) {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const h = typeof window !== 'undefined' ? window.innerHeight : 768;
    const x2 = Math.max(0, Math.min(x, w - POPUP_WIDTH));
    const y2 = Math.max(0, Math.min(y, h - POPUP_HEIGHT_ESTIMATE));
    return { x: x2, y: y2 };
}

/**
 * Popup bộ lọc người dùng – draggable, luôn nằm trong viewport, lọc theo Vai trò, Trạng thái và khoảng ngày tạo.
 */
export default function UserAccountFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [role, setRole] = React.useState('');
    const [trangThai, setTrangThai] = React.useState(TRANG_THAI_OPTIONS[0]);
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [position, setPosition] = React.useState(() => clampPosition(DEFAULT_LEFT, DEFAULT_TOP));
    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setRole(initialValues.role ?? '');
        const isActive = initialValues.isActive;
        setTrangThai(
            isActive === true ? TRANG_THAI_OPTIONS[1]
            : isActive === false ? TRANG_THAI_OPTIONS[2]
            : TRANG_THAI_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
        setPosition((prev) => clampPosition(prev.x, prev.y));
    }, [open, initialValues.role, initialValues.isActive, initialValues.fromDate, initialValues.toDate]);

    const handleApply = useCallback(() => {
        onApply({
            role: role.trim() || undefined,
            isActive: trangThai.value,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [role, trangThai, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setRole('');
        setTrangThai(TRANG_THAI_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({ role: undefined, isActive: null, fromDate: undefined, toDate: undefined });
        onClose();
    }, [onApply, onClose]);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { x: position.x, y: position.y, startX: e.clientX, startY: e.clientY };
        const onMouseMove = (ev) => {
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            const newX = dragRef.current.x + dx;
            const newY = dragRef.current.y + dy;
            const clamped = clampPosition(newX, newY);
            dragRef.current.x = clamped.x;
            dragRef.current.y = clamped.y;
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
            setPosition(clamped);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [position.x, position.y]);

    if (!open) return null;

    const compactSx = { fontSize: '0.8125rem', '& .MuiInputBase-input': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

    return (
        <Paper
            ref={boxRef}
            elevation={8}
            sx={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: POPUP_WIDTH,
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
                role="button"
                tabIndex={0}
                aria-label="Kéo để di chuyển bộ lọc"
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
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>Bộ lọc người dùng</Typography>
                <IconButton size="small" onClick={onClose} onMouseDown={(e) => e.stopPropagation()} aria-label="Đóng" sx={{ p: 0.25 }}>
                    <X size={16} />
                </IconButton>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <FormControl size="small" fullWidth sx={compactSx}>
                    <InputLabel id="user-filter-role-label">Vai trò</InputLabel>
                    <Select
                        labelId="user-filter-role-label"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        label="Vai trò"
                        renderValue={(v) => v || 'Tất cả vai trò'}
                    >
                        <MenuItem value="">Tất cả vai trò</MenuItem>
                        {Object.entries(ROLE_OPTIONS).map(([id, label]) => (
                            <MenuItem key={id} value={label}>{label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>IsActive</Typography>
                <FormControl size="small" fullWidth sx={compactSx}>
                    <InputLabel id="user-filter-status-label">Trạng thái</InputLabel>
                    <Select
                        labelId="user-filter-status-label"
                        value={trangThai.value === null ? '' : String(trangThai.value)}
                        onChange={(e) => {
                            const v = e.target.value;
                            const opt = v === '' ? TRANG_THAI_OPTIONS[0] : TRANG_THAI_OPTIONS.find((o) => o.value !== null && String(o.value) === v) || TRANG_THAI_OPTIONS[0];
                            setTrangThai(opt);
                        }}
                        label="Trạng thái"
                        renderValue={(v) => (TRANG_THAI_OPTIONS.find((o) => (o.value === null ? '' : String(o.value)) === v) || {}).label || 'Tất cả'}
                    >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="true">Hoạt động</MenuItem>
                        <MenuItem value="false">Vô hiệu</MenuItem>
                    </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>Ngày tạo tài khoản</Typography>
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
