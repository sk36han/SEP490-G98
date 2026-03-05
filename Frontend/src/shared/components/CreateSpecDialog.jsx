/*
 * Popup tạo mới Thông số sản phẩm.
 * Props: open, onClose, onSubmit(newItem) với newItem: { specId, specCode, specName }.
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
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function CreateSpecDialog({ open, onClose, onSubmit }) {
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
        onSubmit({ specId: newId, specCode: code, specName: name });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới thông số sản phẩm</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1, overflow: 'visible' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Mã thông số"
                        value={specCode}
                        onChange={(e) => setSpecCode(e.target.value)}
                        required
                        placeholder="VD: MICROONG_01"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên thông số"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        required
                        placeholder="VD: microong"
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
