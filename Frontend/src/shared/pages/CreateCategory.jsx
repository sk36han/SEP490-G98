import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, Save } from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import { createCategory } from "../lib/categoryService";

const INITIAL_FORM = {
  categoryCode: "",
  categoryName: "",
  description: "",
  isActive: true,
  assignManually: true,
};

const CreateCategory = () => {
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const timerRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const code = (form.categoryCode || "").trim();
    const name = (form.categoryName || "").trim();

    if (!code || code.length < 2) {
      showToast("Mã danh mục phải có ít nhất 2 ký tự.", "error");
      return;
    }

    if (!name || name.length < 2) {
      showToast("Tên danh mục phải có ít nhất 2 ký tự.", "error");
      return;
    }

    setSubmitting(true);

    try {
      await createCategory({
        categoryCode: code,
        categoryName: name,
        parentId: null,
      });
      showToast("Tạo danh mục thành công.", "success");
      timerRef.current = setTimeout(() => navigate("/categories"), 1000);
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Không tạo được danh mục.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    setForm(INITIAL_FORM);
    navigate("/categories");
  };

  return (
    <Box sx={{ bgcolor: "#f7f8fa", minHeight: "100vh", pb: 4 }}>
      <Container maxWidth={false} sx={{ maxWidth: "1200px !important", pt: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              onClick={handleBack}
              size="small"
              sx={{ color: "text.primary" }}
              aria-label="Quay lại"
            >
              <ArrowLeft size={22} />
            </IconButton>

            <Typography variant="h5" fontWeight={700}>
              Thêm danh mục
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                minWidth: 88,
              }}
            >
              Hủy
            </Button>

            <Button
              type="submit"
              form="create-category-form"
              variant="contained"
              disabled={submitting}
              startIcon={<Save size={16} />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
                minWidth: 148,
                boxShadow: "none",
              }}
            >
              {submitting ? "Đang lưu..." : "Thêm danh mục"}
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="create-category-form" onSubmit={handleSubmit}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 380,
              p: 2.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "#fff",
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>
              Thông tin danh mục
            </Typography>
            <TextField
                fullWidth
                size="small"
                label="Mã danh mục"
                name="categoryCode"
                value={form.categoryCode}
                onChange={handleChange}
                placeholder="VD: DT, LT..."
                InputLabelProps={{ shrink: true }}
              />

            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Tên danh mục *"
                name="categoryName"
                value={form.categoryName}
                onChange={handleChange}
                placeholder="Nhập tên danh mục"
                InputLabelProps={{ shrink: true }}
              />

              

              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{ mb: 1 }}
                >
                  Mô tả
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  placeholder="Nhập mô tả cho danh mục..."
                  value={form.description}
                  name="description"
                  onChange={handleChange}
                />
              </Box>

              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Checkbox
                    checked={form.isActive}
                    onChange={handleChange}
                    name="isActive"
                  />
                }
                label="Danh mục đang hoạt động"
              />
            </Stack>
          </Paper>
        </Box>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={clearToast}
          />
        )}
      </Container>
    </Box>
  );
};

export default CreateCategory;