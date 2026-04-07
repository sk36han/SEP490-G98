// Popup tạo/sửa Thông số (Item Parameter) – giống UomFormDialog (underline input style).
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton } from '@mui/material';
import { X } from 'lucide-react';

const toCode = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase().slice(0, 50);
};

export default function CreateSpecDialog({ open, onClose, mode = 'create', editRow = null, onSubmit }) {
    const isEdit = Boolean(editRow);
    const [paramName, setParamName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            if (editRow) {
                setParamName(editRow.paramName ?? '');
                setIsActive(editRow.isActive ?? true);
            } else {
                setParamName('');
                setIsActive(true);
            }
            setSubmitting(false);
            setError(null);
        }
    }, [open, editRow]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (paramName || '').trim();
        if (!name) return;
        setSubmitting(true);
        setError(null);
        try {
            await Promise.resolve(onSubmit({ paramId: editRow?.paramId, paramName: name, paramCode: toCode(name), dataType: 'string', isActive: isEdit ? isActive : true, isEdit }));
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Không thể tạo thông số.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' } }}>
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}>
                        {isEdit ? 'Sửa thông số kỹ thuật' : 'Thêm thông số kỹ thuật'}
                    </Typography>
                    <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Tên thông số
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={paramName}
                        onChange={(e) => setParamName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                        placeholder="VD: Đường kính ống"
                        autoFocus
                        sx={{
                            width: '100%', border: 'none', outline: 'none',
                            borderBottom: `1px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.1)'}`,
                            pb: 1, fontSize: '14px', color: 'text.primary', bgcolor: 'transparent',
                            '&:focus': { borderBottom: error ? '#ef4444' : '#0284c7' },
                            '&::placeholder': { color: '#9ca3af', fontSize: '14px' },
                        }}
                    />
                    {error && <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{error}</Typography>}
                    {isEdit && (
                        <>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5, mt: 2 }}>
                                Trạng thái
                            </Typography>
                            <Box
                                component="select"
                                value={isActive}
                                onChange={(e) => setIsActive(e.target.value === 'true')}
                                sx={{
                                    width: '100%', border: 'none', outline: 'none',
                                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                                    pb: 1, fontSize: '14px', color: isActive ? '#10b981' : '#ef4444',
                                    fontWeight: 500, bgcolor: 'transparent', cursor: 'pointer',
                                    '&:focus': { outline: 'none' },
                                }}
                            >
                                <option value="true" style={{ color: '#10b981' }}>Hoạt động</option>
                                <option value="false" style={{ color: '#ef4444' }}>Ngừng hoạt động</option>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                    <Button onClick={onClose} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting || !paramName.trim()} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', px: 3, py: 0.75, borderRadius: '8px', boxShadow: 'none', '&:hover': { boxShadow: '0 2px 8px rgba(25,118,210,0.24)' } }}>
                        {submitting ? 'Đang lưu…' : (isEdit ? 'Lưu' : 'Thêm')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
