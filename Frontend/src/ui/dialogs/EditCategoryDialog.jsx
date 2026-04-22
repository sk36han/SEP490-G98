import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Switch,
    Typography,
    CircularProgress,
} from '@mui/material';
import { X } from 'lucide-react';
import { getCategoryById, updateCategory } from '../../shared/lib/categoryService';

/**
 * Dialog chỉnh sửa danh mục.
 * categoryCode auto-gen ở backend -> FE lưu và echo lại khi update.
 */
const EditCategoryDialog = ({ open, onClose, onSuccess, categoryId }) => {
    const [form, setForm] = useState({ categoryCode: '', categoryName: '', isActive: true });
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && categoryId) {
            setLoading(true);
            getCategoryById(categoryId)
                .then((data) => {
                    setForm({
                        categoryCode: data.categoryCode || '',
                        categoryName: data.categoryName || '',
                        isActive: data.isActive ?? true,
                    });
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [open, categoryId]);

    const handleClose = () => {
        if (submitting) return;
        setForm({ categoryCode: '', categoryName: '', isActive: true });
        onClose();
    };

    const handleSubmit = () => {
        const name = (form.categoryName || '').trim();
        if (!name || name.length < 2) return;

        setSubmitting(true);
        updateCategory(categoryId, {
            categoryCode: form.categoryCode,
            categoryName: name,
            isActive: form.isActive,
        })
            .then(() => {
                setForm({ categoryCode: '', categoryName: '', isActive: true });
                onSuccess();
                onClose();
            })
            .catch(() => {})
            .finally(() => setSubmitting(false));
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
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
            <DialogTitle
                component="span"
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Typography
                    component="span"
                    sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}
                >
                    Sửa danh mục
                </Typography>
                <IconButton
                    onClick={handleClose}
                    disabled={submitting}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                >
                    <X size={20} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 500,
                                fontSize: '12px',
                                color: 'text.secondary',
                                display: 'block',
                                mb: 1,
                                mt: 1,
                            }}
                        >
                            Mã danh mục
                        </Typography>
                        <Box
                            component="input"
                            type="text"
                            value={form.categoryCode}
                            readOnly
                            sx={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                pb: 1,
                                fontSize: '14px',
                                color: '#6b7280',
                                bgcolor: 'transparent',
                                cursor: 'not-allowed',
                            }}
                        />

                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 500,
                                fontSize: '12px',
                                color: 'text.secondary',
                                display: 'block',
                                mb: 1,
                                mt: 2,
                            }}
                        >
                            Tên danh mục
                        </Typography>
                        <Box
                            component="input"
                            type="text"
                            value={form.categoryName}
                            onChange={(e) => setForm((prev) => ({ ...prev, categoryName: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                            }}
                            placeholder="Nhập tên danh mục"
                            sx={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                pb: 1,
                                fontSize: '14px',
                                color: 'text.primary',
                                bgcolor: 'transparent',
                                '&:focus': {
                                    borderBottom: '1px solid #0284c7',
                                },
                                '&::placeholder': {
                                    color: '#9ca3af',
                                    fontSize: '14px',
                                },
                            }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2.5 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    mr: 2,
                                }}
                            >
                                Trạng thái hoạt động
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={form.isActive}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                                        }
                                    />
                                }
                                label=""
                                sx={{ m: 0 }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: '12px',
                                    color: form.isActive ? '#16a34a' : '#9ca3af',
                                    fontWeight: 500,
                                    ml: 0.5,
                                    transition: 'color 0.2s',
                                }}
                            >
                                {form.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                            </Typography>
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    borderTop: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.06)',
                    gap: 1.5,
                }}
            >
                <Button
                    onClick={handleClose}
                    disabled={submitting}
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
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting}
                    size="small"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '13px',
                        px: 3,
                        py: 0.75,
                        borderRadius: '8px',
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                        },
                    }}
                >
                    Lưu
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditCategoryDialog;
