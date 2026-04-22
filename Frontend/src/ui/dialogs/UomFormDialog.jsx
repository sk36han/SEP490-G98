/*
 * Popup tao/sua Don vi tinh – giong Brand Dialog (underline input style).
 * Props: open, onClose, mode 'create'|'edit', editRow { uomId, uomName, isActive }, onSuccess
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton } from '@mui/material';
import { X } from 'lucide-react';

export default function UomFormDialog({ open, onClose, mode = 'create', editRow = null, onSuccess }) {
    const [uomName, setUomName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && editRow) {
                setUomName(editRow.uomName ?? '');
                setIsActive(editRow.isActive ?? true);
            } else {
                setUomName('');
                setIsActive(true);
            }
            setSubmitting(false);
        }
    }, [open, mode, editRow]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (uomName || '').trim();
        if (!name) return;
        setSubmitting(true);
        try {
            await Promise.resolve(onSuccess({ mode, uomId: editRow?.uomId, uomName: name, isActive }));
            onClose();
        } catch (_) {
            // parent handles error
        } finally {
            setSubmitting(false);
        }
    };

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
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                },
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}>
                        {mode === 'edit' ? 'Sửa đơn vị tính' : 'Thêm đơn vị tính'}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}
                    >
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
                    {mode === 'edit' && editRow?.uomCode && (
                        <>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5, mt: 1 }}>
                                Mã đơn vị tính
                            </Typography>
                            <Box sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', pb: 1, mb: 2 }}>
                                <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                                    {editRow.uomCode}
                                </Typography>
                            </Box>
                        </>
                    )}

                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Tên đơn vị tính
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={uomName}
                        onChange={(e) => setUomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                        placeholder="VD: Cây, Chai, Kilogram"
                        autoFocus
                        sx={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                            pb: 1,
                            fontSize: '14px',
                            color: 'text.primary',
                            bgcolor: 'transparent',
                            '&:focus': { borderBottom: '1px solid #0284c7' },
                            '&::placeholder': { color: '#9ca3af', fontSize: '14px' },
                        }}
                    />

                    {mode === 'edit' && (
                        <>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5, mt: 2.5 }}>
                                Trạng thái
                            </Typography>
                            <Box
                                component="select"
                                value={isActive}
                                onChange={(e) => setIsActive(e.target.value === 'true')}
                                sx={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                    pb: 1,
                                    fontSize: '14px',
                                    color: isActive ? '#10b981' : '#ef4444',
                                    fontWeight: 500,
                                    bgcolor: 'transparent',
                                    cursor: 'pointer',
                                    '&:focus': { outline: 'none' },
                                }}
                            >
                                <option value="true" style={{ color: '#10b981' }}>Hoạt động</option>
                                <option value="false" style={{ color: '#ef4444' }}>Ngừng hoạt động</option>
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0, 0, 0, 0.06)', gap: 1.5 }}>
                    <Button
                        onClick={onClose}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: 'text.secondary',
                            px: 2,
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting || !uomName.trim()}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            px: 3,
                            py: 0.75,
                            borderRadius: '8px',
                            boxShadow: 'none',
                            '&:hover': { boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)' },
                        }}
                    >
                        {submitting ? 'Đang lưu…' : (mode === 'edit' ? 'Lưu' : 'Thêm')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
