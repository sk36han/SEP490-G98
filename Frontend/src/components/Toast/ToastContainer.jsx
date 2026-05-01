import { useToastContext } from '../../app/context/ToastContext';
import Toast from './Toast';

export function ToastContainer() {
  const { toast, clearToast } = useToastContext();

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={clearToast}
      duration={3000}
    />
  );
}
