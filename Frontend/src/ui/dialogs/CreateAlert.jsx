import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton } from '@mui/material';
import { X } from 'lucide-react';

/**
 * Dialog tạo cảnh báo tồn kho mới.
 * Props: open, onClose, onSuccess, warehouses, items
 */
export default function CreateAlertDialog({ open, onClose, onSuccess, warehouses = [], items = [] }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
            <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '18px' }}>Thêm cảnh báo</Typography>
                <IconButton size="small" onClick={onClose}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                <Typography sx={{ fontSize: '13px', color: '#9ca3af' }}>Chức năng đang phát triển.</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                <Button onClick={onClose} size="small" sx={{ textTransform: 'none' }}>Hủy</Button>
                <Button variant="contained" onClick={onClose} size="small" sx={{ textTransform: 'none' }}>Tạo</Button>
            </DialogActions>
        </Dialog>
    );
}
