/*
 * Trang chỉnh sửa đơn vị tính – GET by id, PUT update.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Save } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getUomById, updateUom } from '../lib/uomService';

const EditUom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ uomCode: '', uomName: '', isActive: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getUomById(id);
        if (!cancelled && data) {
          setForm({
            uomCode: data.uomCode ?? '',
            uomName: data.uomName ?? '',
            isActive: data.isActive ?? true,
          });
        }
      } catch (err) {
        if (!cancelled) showToast(err?.response?.data?.message || 'Không tải được đơn vị tính.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = (form.uomCode || '').trim();
    const name = (form.uomName || '').trim();
    if (!code || code.length < 2) {
      showToast('Mã đơn vị tính phải có ít nhất 2 ký tự.', 'error');
      return;
    }
    if (!name) {
      showToast('Vui lòng nhập tên đơn vị tính.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await updateUom(id, { uomCode: code, uomName: name, isActive: form.isActive });
      showToast('Cập nhật đơn vị tính thành công.', 'success');
      setTimeout(() => navigate('/uom'), 1000);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể cập nhật.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);
  const handleCancel = () => navigate('/uom');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="sm" sx={{ maxWidth: 640 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} size="medium" sx={{ color: 'text.primary' }} aria-label="Quay lại">
              <ArrowLeft size={24} />
            </IconButton>
            <Typography variant="h5" fontWeight="700" sx={{ color: 'text.primary' }}>
              Chỉnh sửa đơn vị tính
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={handleCancel} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="edit-uom-form"
              variant="contained"
              disabled={submitting}
              startIcon={<Save size={18} />}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="edit-uom-form" onSubmit={handleSubmit}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
              Thông tin đơn vị tính
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Mã đơn vị tính"
                name="uomCode"
                value={form.uomCode}
                onChange={handleChange}
                required
                placeholder="VD: CAI, HOP, KG"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                size="small"
                label="Tên đơn vị tính"
                name="uomName"
                value={form.uomName}
                onChange={handleChange}
                required
                placeholder="VD: Cái, Hộp, Kilogram"
                InputLabelProps={{ shrink: true }}
              />
              <FormControlLabel
                control={<Checkbox checked={form.isActive} onChange={handleChange} name="isActive" />}
                label="Đơn vị tính đang hoạt động"
              />
            </Stack>
          </Paper>
        </Box>

        {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      </Container>
    </Box>
  );
};

export default EditUom;
