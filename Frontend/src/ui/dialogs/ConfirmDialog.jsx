import { Dialog as MuiDialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Button } from '../buttons/Button';

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', loading }) {
  return (
    <MuiDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <p>{message}</p>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={loading}>{cancelText}</Button>
        <Button onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </DialogActions>
    </MuiDialog>
  );
}
