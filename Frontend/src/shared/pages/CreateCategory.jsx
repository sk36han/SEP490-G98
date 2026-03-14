import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
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
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      await createCategory({ categoryCode: code, categoryName: name, parentId: null });
      showToast("Tạo danh mục thành công.", "success");
      timerRef.current = setTimeout(() => navigate("/categories"), 1000);
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Không tạo được danh mục.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    setForm({ ...INITIAL_FORM });
    navigate("/categories");
  };

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", pb: 4 }}>
      <Container maxWidth="lg" sx={{ maxWidth: 1200 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.5}
          sx={{ py: 2 }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton
              onClick={handleBack}
              size="medium"
              sx={{ color: "text.primary" }}
              aria-label="Quay lại"
            >
              <ArrowLeft size={24} />
            </IconButton>
            <Typography
              variant="h5"
              fontWeight="700"
              sx={{ color: "text.primary" }}
            >
              Thêm danh mục
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="create-category-form"
              variant="contained"
              disabled={submitting}
              startIcon={<Save size={18} />}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              {submitting ? "Đang lưu…" : "Thêm danh mục"}
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="create-category-form" onSubmit={handleSubmit}>
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="700"
                  sx={{ mb: 2 }}
                >
                  Thông tin danh mục
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tên danh mục"
                    name="categoryName"
                    value={form.categoryName}
                    onChange={handleChange}
                    required
                    placeholder="Nhập tên danh mục"
                    InputLabelProps={{ shrink: true }}
                  />

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

                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1 }}
                      color="text.primary"
                    >
                      Mô tả
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={5}
                      maxRows={10}
                      placeholder="Nhập mô tả cho danh mục..."
                      value={form.description}
                      name="description"
                      onChange={handleChange}
                    />
                  </Box>

                  <FormControlLabel
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

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="700"
                  sx={{ mb: 1.5 }}
                >
                  Điều kiện
                </Typography>
                <RadioGroup
                  row
                  name="assignManually"
                  value={form.assignManually ? "manual" : "auto"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assignManually: e.target.value === "manual",
                    }))
                  }
                >
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label="Thủ công"
                  />
                  <FormControlLabel
                    value="auto"
                    control={<Radio />}
                    label="Tự động"
                  />
                </RadioGroup>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Thiết lập cách sản phẩm được gán vào danh mục này trong tương
                  lai.
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1" fontWeight="700">
                    Tối ưu SEO
                  </Typography>
                  <Button
                    size="small"
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                    }}
                  >
                    Tùy chỉnh SEO
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Thiết lập mô tả để giúp khách hàng dễ dàng tìm thấy danh mục
                  này trên các công cụ tìm kiếm như Google.
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="700"
                    sx={{ mb: 1.5 }}
                  >
                    Ảnh danh mục
                  </Typography>
                  <Card
                    variant="outlined"
                    sx={{
                      borderStyle: "dashed",
                      borderRadius: 2,
                      borderColor: "divider",
                    }}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        py: 4,
                      }}
                    >
                      <ImagePlus size={32} color="#9e9e9e" />
                      <Typography variant="body2" color="text.secondary">
                        Kéo thả hoặc thêm ảnh từ URL
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          mt: 1,
                          textTransform: "none",
                          borderRadius: 2,
                        }}
                      >
                        Tải ảnh từ thiết bị
                      </Button>
                    </CardContent>
                  </Card>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="700"
                    sx={{ mb: 1.5 }}
                  >
                    Khung giao diện
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Khung giao diện"
                    defaultValue="collection"
                    InputLabelProps={{ shrink: true }}
                  >
                    <option value="collection">Collection</option>
                    <option value="grid">Lưới sản phẩm</option>
                  </TextField>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="700"
                      sx={{ mr: 1 }}
                    >
                      Gán lên menu
                    </Typography>
                    <Button
                      size="small"
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                      }}
                    >
                      Chọn menu
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Thêm danh mục này vào các menu điều hướng phù hợp.
                  </Typography>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
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

