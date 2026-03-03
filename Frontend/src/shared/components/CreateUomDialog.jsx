/*
 * Popup tạo mới Đơn vị tính (UoM).
 * Props: open, onClose, onSubmit(newUom) với newUom: { id, code, name } (để dùng trong Autocomplete).
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

export default function CreateUomDialog({ open, onClose, onSubmit }) {
    const [uomCode, setUomCode] = useState('');
    const [uomName, setUomName] = useState('');

    useEffect(() => {
        if (open) {
            setUomCode('');
            setUomName('');
        }
    }, [open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const code = (uomCode || '').trim();
        const name = (uomName || '').trim();
        if (!code || !name) return;
        const newId = Date.now();
        onSubmit({ id: newId, code, name, uomId: newId, uomCode: code, uomName: name, isActive: true });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới đơn vị tính</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 0 }}>
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
