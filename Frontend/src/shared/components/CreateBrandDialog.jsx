/*
 * Popup tạo mới Nhãn hiệu (Brand).
 * Gọi API createBrand, sau đó onSubmit(newBrand) với newBrand: { id, name }.
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from '@mui/material';
import { createBrand } from '../lib/brandService';

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function CreateBrandDialog({ open, onClose, onSubmit }) {
    const [brandName, setBrandName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            setBrandName('');
            setSubmitting(false);
            setError(null);
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (brandName || '').trim();
        if (!name) return;
        setSubmitting(true);
        setError(null);
        try {
            const data = await createBrand({ brandName: name });
            const id = data?.brandId ?? data?.BrandId ?? data?.id;
            const displayName = data?.brandName ?? data?.BrandName ?? data?.name ?? name;
            if (id != null) {
                onSubmit({ id, name: displayName });
                onClose();
            } else {
                setError('Không nhận được ID thương hiệu từ server.');
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.message ??
                'Không thể tạo nhãn hiệu.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới nhãn hiệu</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1, overflow: 'visible' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên nhãn hiệu"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        required
                        placeholder="VD: Apple, Samsung"
                        error={Boolean(error)}
                        helperText={error}
                        sx={{ ...inputSx, mb: 0 }}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="contained" onClick={handleSubmit} sx={{ textTransform: 'none' }} disabled={submitting}>
                        {submitting ? 'Đang tạo…' : 'Tạo'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
