/*
 * Popup tạo/sửa Quy cách đóng gói. editRow set = chế độ sửa.
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function CreatePackagingSpecDialog({ open, onClose, onSubmit, editRow = null }) {
    const isEdit = Boolean(editRow);
    const [specName, setSpecName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (editRow) {
                setSpecName(editRow.specName ?? '');
                setDescription(editRow.description ?? '');
                setIsActive(editRow.isActive ?? true);
            } else {
                setSpecName('');
                setDescription('');
                setIsActive(true);
            }
            setSubmitting(false);
        }
    }, [open, editRow]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (specName || '').trim();
        if (!name) return;
        setSubmitting(true);
        try {
            await Promise.resolve(onSubmit({
                isEdit,
                packagingSpecId: editRow?.packagingSpecId,
                specName: name,
                name: name,
                description: (description || '').trim() || null,
                isActive,
            }));
            onClose();
        } catch (_) {}
        finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>{isEdit ? 'Chỉnh sửa quy cách đóng gói' : 'Tạo mới quy cách đóng gói'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1, overflow: 'visible' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên quy cách"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        required
                        placeholder="VD: Hộp, Thùng carton"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Mô tả (tùy chọn)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả quy cách"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    {isEdit && (
                        <FormControlLabel
                            control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                            label="Đang hoạt động"
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Hủy</Button>
                    <Button type="submit" variant="contained" sx={{ textTransform: 'none' }} disabled={submitting}>
                        {submitting ? 'Đang lưu…' : (isEdit ? 'Lưu' : 'Tạo')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
