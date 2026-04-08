import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { X, Edit2, Save, Package } from 'lucide-react';

const isValidUrl = (str) => str && (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/'));

const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const UnderlineField = ({ label, value, editable, onChange, placeholder, type = 'text', error }) => (
    <>
        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {label}
        </Typography>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={!editable}
            autoFocus={editable}
            style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                borderBottom: `1px solid ${error ? '#ef4444' : editable ? '#0284c7' : 'rgba(0,0,0,0.06)'}`,
                paddingBottom: '4px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: 'transparent',
                fontFamily: 'inherit',
            }}
        />
        {error && <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{error}</Typography>}
    </>
);

export default function AlertDetailDialog({ open, onClose, alertData, onSave }) {
    const [editing, setEditing] = useState(false);
    const [minQty, setMinQty] = useState('');
    const [reorderQty, setReorderQty] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && alertData) {
            setEditing(false);
            setMinQty(alertData.minQty != null ? String(alertData.minQty) : '');
            setReorderQty(alertData.reorderQty != null ? String(alertData.reorderQty) : '');
            setErrors({});
            setSaving(false);
        }
    }, [open, alertData]);

    const handleEdit = () => {
        setEditing(true);
        setErrors({});
    };

    const handleCancel = () => {
        setEditing(false);
        setMinQty(alertData?.minQty != null ? String(alertData.minQty) : '');
        setReorderQty(alertData?.reorderQty != null ? String(alertData.reorderQty) : '');
        setErrors({});
    };

    const validate = () => {
        const errs = {};
        if (!minQty.trim() || isNaN(Number(minQty)) || Number(minQty) < 0) {
            errs.minQty = 'Nhập ngưỡng tối thiểu hợp lệ.';
        }
        if (!reorderQty.trim() || isNaN(Number(reorderQty)) || Number(reorderQty) < 0) {
            errs.reorderQty = 'Nhập SL đề xuất hợp lệ.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await Promise.resolve(onSave?.({
                ...alertData,
                minQty: Number(minQty),
                reorderQty: Number(reorderQty),
            }));
            setEditing(false);
        } catch (err) {
            setErrors({ submit: err?.message ?? 'Không thể lưu.' });
        } finally {
            setSaving(false);
        }
    };

    if (!open || !alertData) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.06)',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    px: 3,
                    py: 2,
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            flexShrink: 0,
                        }}
                    >
                        <Edit2 size={16} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '17px', color: 'text.primary', lineHeight: 1.3 }}>
                            Chi tiết thiết lập cảnh báo
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>
                            {alertData.alertId}
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                >
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            {/* Body */}
            <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    {/* Ảnh vật tư */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5 }}>
                        {/* Avatar box */}
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '10px',
                                overflow: 'hidden',
                                bgcolor: '#fafafa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e5e7eb',
                                position: 'relative',
                                flexShrink: 0,
                            }}
                        >
                            {/* Placeholder icon */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Package size={22} style={{ color: '#9e9e9e' }} />
                            </Box>

                            {/* Hình ảnh */}
                            {isValidUrl(alertData.itemImage) && (
                                <img
                                    src={alertData.itemImage}
                                    alt=""
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            )}
                        </Box>

                        {/* Tên + mã */}
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
                                {alertData.itemName ?? '-'}
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.4 }}>
                                {alertData.itemCode ?? '-'} · {alertData.uom ?? '-'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Kho */}
                    <UnderlineField label="Kho" value={alertData.warehouseName ?? '-'} />

                    {/* Tồn hiện tại */}
                    <UnderlineField label="Tồn hiện tại" value={alertData.onHandQty != null ? Number(alertData.onHandQty).toLocaleString('vi-VN') : '-'} />

                    {/* Ngưỡng + SL nhập đề xuất */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineField
                                label="Ngưỡng tồn tối thiểu"
                                value={minQty}
                                editable={editing}
                                onChange={(e) => { setMinQty(e.target.value); setErrors((p) => ({ ...p, minQty: null })); }}
                                placeholder="VD: 100"
                                error={errors.minQty}
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineField
                                label="SL nhập đề xuất"
                                value={reorderQty}
                                editable={editing}
                                onChange={(e) => { setReorderQty(e.target.value); setErrors((p) => ({ ...p, reorderQty: null })); }}
                                placeholder="VD: 200"
                                error={errors.reorderQty}
                            />
                        </Box>
                    </Box>

                    {/* Nhân viên tạo + Ngày tạo */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineField label="Nhân viên tạo" value={alertData.createdBy ?? '-'} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <UnderlineField label="Ngày tạo" value={formatDate(alertData.createdAt)} />
                        </Box>
                    </Box>

                    {errors.submit && (
                        <Typography sx={{ fontSize: '12px', color: '#ef4444' }}>{errors.submit}</Typography>
                    )}
                </Box>
            </DialogContent>

            {/* Footer */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    gap: 1.5,
                }}
            >
                {editing ? (
                    <>
                        <Button
                            onClick={handleCancel}
                            size="small"
                            sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            variant="contained"
                            size="small"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px', px: 3, py: 0.75, borderRadius: '8px', boxShadow: 'none', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                        >
                            {saving ? 'Đang lưu…' : 'Lưu'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            onClick={onClose}
                            size="small"
                            sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                        >
                            Đóng
                        </Button>
                        <Button
                            onClick={handleEdit}
                            variant="contained"
                            size="small"
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px', px: 3, py: 0.75, borderRadius: '8px', boxShadow: 'none', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                        >
                            Chỉnh sửa
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}