import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { createPackagingSpec } from '../../shared/lib/packagingSpecService';

/**
 * Dialog tạo nhanh Quy cách đóng gói (PackagingSpec).
 * Props: open, onClose, onSuccess(result)
 */
export function CreatePackagingSpecDialog({ open, onClose, onSuccess }) {
    const [specName, setSpecName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            setSpecName('');
            setDescription('');
            setSubmitting(false);
            setError(null);
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        const name = (specName || '').trim();
        if (!name) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await createPackagingSpec({
                specName: name,
                description: (description || '').trim() || null,
            });
            setSpecName('');
            setDescription('');
            onSuccess?.(result);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Không thể tạo quy cách đóng gói.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.06)',
                },
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle
                    sx={{
                        px: 3, py: 2.5,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}>
                        Thêm quy cách đóng gói
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Tên quy cách
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                        placeholder="VD: Hộp, Thùng carton"
                        autoFocus
                        sx={{
                            width: '100%',
                            border: '1px solid rgba(0,0,0,0.12)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            '&:focus': { borderColor: '#1976d2', boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.1)' },
                            mb: 2,
                        }}
                    />

                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Mô tả (tùy chọn)
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả quy cách"
                        sx={{
                            width: '100%',
                            border: '1px solid rgba(0,0,0,0.12)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            '&:focus': { borderColor: '#1976d2', boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.1)' },
                        }}
                    />

                    {error && (
                        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1 }}>
                            {error}
                        </Typography>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button
                        type="button"
                        className="btn btn-cancel"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Đang tạo...' : 'Tạo'}
                    </button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

