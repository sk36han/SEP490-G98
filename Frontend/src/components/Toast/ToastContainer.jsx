import { Snackbar, Alert } from '@mui/material';
import { useToastContext } from '../../app/context/ToastContext';

export function ToastContainer() {
  const { toast, clearToast } = useToastContext();

  if (!toast) return null;

  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={3000}
      onClose={clearToast}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={clearToast}
        severity={toast.type}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
}
