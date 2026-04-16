import { Dialog } from './Dialog';
import { DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Button } from '../buttons/Button';

/**
 * Confirmation dialog — OK/Cancel với message, custom content, hoặc custom actions.
 *
 * Props:
 *   open, onClose, onConfirm       — standard dialog control
 *   title                          — dialog header text
 *   message                        — simple text message
 *   content                        — JSX content (replaces message)
 *   confirmText / cancelText       — button labels
 *   confirmDanger                  — if true, confirm button is red
 *   loading                        — disables buttons while async action runs
 *   actions                        — JSX to replace default buttons
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, content, confirmText = 'Xác nhận', cancelText = 'Hủy', confirmDanger = false, loading, confirmDisabled, actions, PaperProps }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={PaperProps}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && <p>{message}</p>}
        {content}
      </DialogContent>
      {actions ? (
        <DialogActions>{actions}</DialogActions>
      ) : (
        <DialogActions>
          <Button variant="outlined" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button onClick={onConfirm} loading={loading} disabled={confirmDisabled} color={confirmDanger ? 'error' : 'primary'}>{confirmText}</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
