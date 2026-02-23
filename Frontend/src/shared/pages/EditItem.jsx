import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Grid,
  Paper,
  Divider,
} from "@mui/material";
import { ArrowLeft, Save } from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";

/** Danh sách quy cách đóng gói (mock – có thể thay bằng API) */
const PACKAGING_OPTIONS = [
  { id: 1, name: "Hộp" },
  { id: 2, name: "Thùng" },
  { id: 3, name: "Túi" },
  { id: 4, name: "Khác" },
];

/** Danh sách kho (mock – có thể thay bằng API) */
const WAREHOUSE_OPTIONS = [
  { id: 1, name: "Kho chính" },
  { id: 2, name: "Kho phụ" },
  { id: 3, name: "Kho lạnh" },
];

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "background.paper",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.light" },
    "&.Mui-focused fieldset": { borderWidth: 2 },
  },
};

const sectionSx = {
  p: 1.75,
  borderRadius: 2,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  "&:not(:last-of-type)": { mb: 1.25 },
};

const sectionTitleSx = {
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: "text.secondary",
  mb: 1,
  pb: 0.75,
  borderBottom: "1px solid",
  borderColor: "divider",
  display: "block",
};

const NUMBER_FIELDS = new Set([
  "categoryId",
  "brandId",
  "baseUomId",
  "packagingSpecId",
  "defaultWarehouseId",
]);

const MOCK_ITEMS = [
  {
    itemId: 1,
    itemCode: "SP001",
    itemName: "iPhone 15 Pro Max 256GB",
    itemType: "Product",
    description: "Điện thoại iPhone 15 Pro Max bản 256GB",
    categoryId: 1,
    brandId: 1,
    baseUomId: 1,
    productSpec: "",
    packagingSpecId: 1,
    requiresCO: true,
    requiresCQ: true,
    isActive: true,
    defaultWarehouseId: 1,
    inventoryAccount: "1561",
    revenueAccount: "5111",
  },
  {
    itemId: 2,
    itemCode: "SP002",
    itemName: "Samsung Galaxy S24 Ultra",
    itemType: "Product",
    description: "Điện thoại Samsung Galaxy S24 Ultra",
    categoryId: 1,
    brandId: 2,
    baseUomId: 1,
    productSpec: "",
    packagingSpecId: 1,
    requiresCO: true,
    requiresCQ: true,
    isActive: true,
    defaultWarehouseId: 1,
    inventoryAccount: "1561",
    revenueAccount: "5111",
  },
];

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const timerRef = useRef(null);
  const [form, setForm] = useState({
    itemCode: "",
    itemName: "",
    itemType: "Product",
    description: "",
    categoryId: "",
    brandId: "",
    baseUomId: 1,
    productSpec: "",
    packagingSpecId: "",
    requiresCO: false,
    requiresCQ: false,
    isActive: true,
    defaultWarehouseId: "",
    inventoryAccount: "",
    revenueAccount: "",
  });

  useEffect(() => {
    const item = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
    if (!item) return;
    const next = {
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType || "Product",
      description: item.description || "",
      categoryId: item.categoryId ?? "",
      brandId: item.brandId ?? "",
      baseUomId: item.baseUomId ?? 1,
      productSpec: item.productSpec ?? "",
      packagingSpecId: item.packagingSpecId ?? "",
      requiresCO: item.requiresCO ?? false,
      requiresCQ: item.requiresCQ ?? false,
      isActive: item.isActive ?? true,
      defaultWarehouseId: item.defaultWarehouseId ?? "",
      inventoryAccount: item.inventoryAccount || "",
      revenueAccount: item.revenueAccount || "",
    };
    const t = setTimeout(() => setForm(next), 0);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let nextValue;
    if (type === "checkbox") {
      nextValue = checked;
    } else if (NUMBER_FIELDS.has(name)) {
      nextValue = value === "" ? "" : Number(value);
    } else {
      nextValue = value;
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast(
      "Mock: Cập nhật thành công. Kết nối API khi backend sẵn sàng.",
      "success",
    );
    timerRef.current = setTimeout(() => navigate("/products"), 1500);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    navigate("/products");
  };

  return (
    <Box sx={{ bgcolor: "grey.50", pt: 0, pb: 2, mt: -3 }}>
      <Container maxWidth="lg" sx={{ maxWidth: 1100 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={handleBack}
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Quay lại
          </Button>
        </Box>

        <Typography
          variant="h5"
          component="h1"
          fontWeight="700"
          gutterBottom
          sx={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            color: "primary.main",
            mb: 0.5,
          }}
        >
          Chỉnh sửa vật tư{form.itemCode ? ` (${form.itemCode})` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cập nhật thông tin vật tư/sản phẩm.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box component="form" onSubmit={handleSubmit} sx={{ p: 0 }}>
            <Box sx={sectionSx}>
              <Typography component="span" sx={sectionTitleSx}>
                Thông tin cơ bản
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mã vật tư"
                    name="itemCode"
                    value={form.itemCode}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tên vật tư"
                    name="itemName"
                    value={form.itemName}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Dạng vật tư"
                    name="itemType"
                    value={form.itemType}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  >
                    <MenuItem value="Product">Product</MenuItem>
                    <MenuItem value="Material">Material</MenuItem>
                    <MenuItem value="Service">Service</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            <Box sx={sectionSx}>
              <Typography component="span" sx={sectionTitleSx}>
                Mô tả
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Mô tả"
                name="description"
                value={form.description}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="Nhập mô tả vật tư/sản phẩm..."
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Box>

            <Box sx={sectionSx}>
              <Typography component="span" sx={sectionTitleSx}>
                Phân loại
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Category ID"
                    name="categoryId"
                    type="number"
                    value={form.categoryId}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Brand ID"
                    name="brandId"
                    type="number"
                    value={form.brandId}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={sectionSx}>
              <Typography component="span" sx={sectionTitleSx}>
                Đơn vị & kho
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Đơn vị tính cơ bản"
                    name="baseUomId"
                    type="number"
                    value={form.baseUomId}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ minWidth: 0 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thông số sản phẩm"
                    name="productSpec"
                    value={form.productSpec}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ minWidth: 0 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Quy cách đóng gói"
                    name="packagingSpecId"
                    value={String(form.packagingSpecId ?? "")}
                    onChange={handleChange}
                    sx={inputSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (v) => {
                        if (v === "") return "Hãy chọn quy cách";
                        const opt = PACKAGING_OPTIONS.find(
                          (o) => String(o.id) === String(v),
                        );
                        return opt?.name ?? "Hãy chọn quy cách";
                      },
                      MenuProps: { PaperProps: { sx: { borderRadius: 2 } } },
                    }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="" disabled>
                      Hãy chọn quy cách
                    </MenuItem>
                    {PACKAGING_OPTIONS.map((opt) => (
                      <MenuItem key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={3} sx={{ minWidth: 0 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Kho mặc định"
                    name="defaultWarehouseId"
                    value={String(form.defaultWarehouseId ?? "")}
                    onChange={handleChange}
                    sx={inputSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (v) => {
                        if (v === "") return "Hãy chọn kho";
                        const opt = WAREHOUSE_OPTIONS.find(
                          (o) => String(o.id) === String(v),
                        );
                        return opt?.name ?? "Hãy chọn kho";
                      },
                      MenuProps: { PaperProps: { sx: { borderRadius: 2 } } },
                    }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="" disabled>
                      Hãy chọn kho
                    </MenuItem>
                    {WAREHOUSE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            <Box sx={sectionSx}>
              <Typography component="span" sx={sectionTitleSx}>
                Tùy chọn & tài khoản
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="requiresCO"
                        checked={form.requiresCO}
                        onChange={handleChange}
                      />
                    }
                    label="Yêu cầu CO"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="requiresCQ"
                        checked={form.requiresCQ}
                        onChange={handleChange}
                      />
                    }
                    label="Yêu cầu CQ"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                      />
                    }
                    label="Đang hoạt động"
                  />
                </Grid>
              </Grid>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tài khoản kho"
                    name="inventoryAccount"
                    value={form.inventoryAccount}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Tài khoản doanh thu"
                    name="revenueAccount"
                    value={form.revenueAccount}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mx: 0 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1.5,
                p: 2,
                bgcolor: "grey.50",
              }}
            >
              <Button
                type="button"
                variant="outlined"
                onClick={handleCancel}
                sx={{ textTransform: "none", borderRadius: 2, px: 2.5 }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save size={18} />}
                sx={{ textTransform: "none", borderRadius: 2, px: 2.5 }}
              >
                Lưu
              </Button>
            </Box>
          </Box>
        </Paper>

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

export default EditItem;
