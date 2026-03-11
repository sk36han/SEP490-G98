/*
 * Popup tạo mới Đơn vị tính (UoM).
 * Gọi API createUom, sau đó onSubmit(newUom) với newUom: { id, code, name } (để dùng trong Autocomplete).
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
import { createUom } from '../lib/uomService';

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function CreateUomDialog({ open, onClose, onSubmit }) {
    const [uomCode, setUomCode] = useState('');
    const [uomName, setUomName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            setUomCode('');
            setUomName('');
            setSubmitting(false);
            setError(null);
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const code = (uomCode || '').trim();
        const name = (uomName || '').trim();
        if (!code || !name) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await createUom({ uomCode: code, uomName: name });
            const data = response?.data ?? response;
            const id = data?.uomId ?? data?.UomId ?? data?.id;
            if (id == null) {
                setError('Không nhận được ID đơn vị tính từ server.');
                return;
            }
            const displayCode = data?.uomCode ?? data?.UomCode ?? code;
            const displayName = data?.uomName ?? data?.UomName ?? name;
            onSubmit({ id, code: displayCode, name: displayName, uomId: id, uomCode: displayCode, uomName: displayName, isActive: true });
            onClose();
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.message ??
                'Không thể tạo đơn vị tính.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới đơn vị tính</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1, overflow: 'visible' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Mã đơn vị tính"
                        value={uomCode}
                        onChange={(e) => setUomCode(e.target.value)}
                        required
                        placeholder="VD: CAI, HOP"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên đơn vị tính"
                        value={uomName}
                        onChange={(e) => setUomName(e.target.value)}
                        required
                        placeholder="VD: Cái, Hộp"
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
