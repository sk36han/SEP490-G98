/*
 * Trang tạo mới đơn vị tính – gửi API UnitOfMeasure POST.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft, Save } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { createUom } from '../lib/uomService';

const INITIAL_FORM = { uomCode: '', uomName: '' };

const CreateUom = () => {
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

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
    if (!code) {
      showToast('Vui lòng nhập mã đơn vị tính.', 'error');
      return;
    }
    if (code.length < 2) {
      showToast('Mã đơn vị tính phải có ít nhất 2 ký tự.', 'error');
      return;
    }
    if (!name) {
      showToast('Vui lòng nhập tên đơn vị tính.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createUom({ uomCode: code, uomName: name });
      showToast('Tạo đơn vị tính thành công.', 'success');
      setTimeout(() => navigate('/uom'), 1000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo đơn vị tính.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);
  const handleCancel = () => navigate('/uom');

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="sm" sx={{ maxWidth: 640 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.5}
          sx={{ py: 2 }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} size="medium" sx={{ color: 'text.primary' }} aria-label="Quay lại">
              <ArrowLeft size={24} />
            </IconButton>
            <Typography variant="h5" fontWeight="700" sx={{ color: 'text.primary' }}>
              Thêm đơn vị tính
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={handleCancel} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="create-uom-form"
              variant="contained"
              disabled={submitting}
              startIcon={<Save size={18} />}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              {submitting ? 'Đang lưu…' : 'Thêm đơn vị tính'}
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="create-uom-form" onSubmit={handleSubmit}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
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
                helperText="Từ 2 đến 50 ký tự, chữ cái, số, gạch dưới, gạch ngang"
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
            </Stack>
          </Paper>
        </Box>

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={clearToast} />
        )}
      </Container>
    </Box>
  );
};

export default CreateUom;
