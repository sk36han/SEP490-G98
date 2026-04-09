import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    CircularProgress,
} from '@mui/material';
import { X } from 'lucide-react';
import { createCategory, getCategoryById, updateCategory } from '../lib/categoryService';

/**
 * Dialog tạo mới danh mục.
 * @param {boolean} open - Dialog có đang mở không
 * @param {function} onClose - Callback đóng dialog
 * @param {function} onSuccess - Callback khi tạo thành công
 */
const CreateCategoryDialog = ({ open, onClose, onSuccess }) => {
    const [form, setForm] = useState({ categoryName: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleClose = () => {
        if (submitting) return;
        setForm({ categoryName: '' });
        onClose();
    };

    const handleSubmit = () => {
        const name = (form.categoryName || '').trim();
        if (!name || name.length < 2) return;

        setSubmitting(true);
        createCategory({ categoryName: name, parentId: null })
            .then(() => {
                setForm({ categoryName: '' });
                onSuccess();
                onClose();
            })
            .catch(() => {
                // keep dialog open on error
            })
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
                    Thêm danh mục
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
                    Tên danh mục
                </Typography>
                <Box
                    component="input"
                    type="text"
                    value={form.categoryName}
                    onChange={(e) => setForm({ categoryName: e.target.value })}
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
                    Tạo
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateCategoryDialog;
