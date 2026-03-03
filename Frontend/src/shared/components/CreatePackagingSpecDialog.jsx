/*
 * Popup tạo mới Quy cách đóng gói.
 * Props: open, onClose, onSubmit(newItem) với newItem: { id, name } (Autocomplete) hoặc { packagingSpecId, specCode, specName } (list).
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

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
};

export default function CreatePackagingSpecDialog({ open, onClose, onSubmit }) {
    const [specCode, setSpecCode] = useState('');
    const [specName, setSpecName] = useState('');

    useEffect(() => {
        if (open) {
            setSpecCode('');
            setSpecName('');
        }
    }, [open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const code = (specCode || '').trim();
        const name = (specName || '').trim();
        if (!code || !name) return;
        const newId = Date.now();
        onSubmit({ id: newId, packagingSpecId: newId, specCode: code, specName: name, name });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới quy cách đóng gói</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 0 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Mã quy cách"
                        value={specCode}
                        onChange={(e) => setSpecCode(e.target.value)}
                        required
                        placeholder="VD: BOX, CARTON"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên quy cách"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        required
                        placeholder="VD: Hộp, Thùng carton"
                        sx={inputSx}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="contained" onClick={handleSubmit} sx={{ textTransform: 'none' }}>
                        Tạo
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
