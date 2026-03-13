/*
 * Popup tạo/sửa Đơn vị tính – dùng trong ViewUomList (gọi API createUom/updateUom).
 * Props: open, onClose, mode 'create'|'edit', editRow { uomId, uomName, isActive }, onSuccess()
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
  '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function UomFormDialog({ open, onClose, mode = 'create', editRow = null, onSuccess }) {
  const [uomName, setUomName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && editRow) {
        setUomName(editRow.uomName ?? '');
        setIsActive(editRow.isActive ?? true);
      } else {
        setUomName('');
        setIsActive(true);
      }
      setSubmitting(false);
    }
  }, [open, mode, editRow]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (uomName || '').trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onSuccess({ mode, uomId: editRow?.uomId, uomName: name, isActive }));
      onClose();
    } catch (_) {
      // Parent sets error; dialog stays open
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle>{mode === 'edit' ? 'Chỉnh sửa đơn vị tính' : 'Thêm đơn vị tính'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Tên đơn vị tính"
            value={uomName}
            onChange={(e) => setUomName(e.target.value)}
            required
            placeholder="VD: Cái, Hộp, Kilogram"
            sx={{ ...inputSx, mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          {mode === 'edit' && (
            <FormControlLabel
              control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Đang hoạt động"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Hủy</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none' }} disabled={submitting}>
            {submitting ? 'Đang lưu…' : (mode === 'edit' ? 'Lưu' : 'Thêm')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
