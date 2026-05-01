import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography, TextField } from '@mui/material';
import { X } from 'lucide-react';
import { createPackagingSpec, validatePackagingSpecFields } from '../../shared/lib/packagingSpecService';

/**
 * Dialog tạo nhanh Quy cách đóng gói (PackagingSpec).
 * Props: open, onClose, onSuccess(result)
 */
export function CreatePackagingSpecDialog({ open, onClose, onSuccess }) {
    const [specName, setSpecName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (open) {
            setSpecName('');
            setDescription('');
            setSubmitting(false);
            setError(null);
            setFieldErrors({});
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        const v = validatePackagingSpecFields(specName, description);
        if (!v.valid) {
            setFieldErrors(v.errors);
            setError(null);
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        setError(null);
        try {
            const result = await createPackagingSpec({
                specName: specName.trim(),
                description: description.trim(),
            });
            setSpecName('');
            setDescription('');
            onSuccess?.(result);
            onClose();
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Không thể tạo quy cách đóng gói.';
            setError(msg);
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
                    <TextField
                        label="Tên quy cách"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        placeholder="VD: Hộp, Thùng carton"
                        autoFocus
                        fullWidth
                        size="small"
                        error={Boolean(fieldErrors.specName)}
                        helperText={fieldErrors.specName || ' '}
                        FormHelperTextProps={{ sx: { mt: 0, minHeight: 20 } }}
                        sx={{ mb: 1 }}
                    />

                    <TextField
                        label="Mô tả"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả quy cách đóng gói (bắt buộc)"
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        required
                        error={Boolean(fieldErrors.description)}
                        helperText={fieldErrors.description || 'Tối thiểu 2 ký tự, tối đa 500 ký tự.'}
                        FormHelperTextProps={{ sx: { mt: 0 } }}
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
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Đang tạo...' : 'Tạo'}
                    </button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
