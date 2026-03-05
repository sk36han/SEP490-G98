/*
 * Form tạo mới vật tư – MOCKUP THEO BẢNG [dbo].[Items].
 * Map form → Item: ItemCode, ItemName, ItemType, Description, CategoryId, BrandId, BaseUomId,
 * PackagingSpecId, RequiresCo, RequiresCq, IsActive, DefaultWarehouseId, InventoryAccount, RevenueAccount.
 * Không nhập: ItemId (PK), CreatedAt, UpdatedAt (system).
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Autocomplete,
  Divider,
} from "@mui/material";
import { ArrowLeft, ImagePlus, Package, Plus } from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import CreateUomDialog from "../components/CreateUomDialog";
import CreatePackagingSpecDialog from "../components/CreatePackagingSpecDialog";
import CreateSpecDialog from "../components/CreateSpecDialog";

/** Đơn vị tính – UnitOfMeasure (BaseUomId) */
const UOM_OPTIONS = [
  { id: 1, code: "CAI", name: "Cái" },
  { id: 2, code: "HOP", name: "Hộp" },
  { id: 3, code: "KG", name: "kg" },
  { id: 4, code: "G", name: "g" },
  { id: 5, code: "THUNG", name: "Thùng" },
];

/** Quy cách đóng gói – PackagingSpec */
const PACKAGING_OPTIONS = [
  { id: 1, name: "Hộp" },
  { id: 2, name: "Thùng" },
  { id: 3, name: "Túi" },
  { id: 4, name: "Khác" },
];

/** Danh mục – ItemCategory (map với ItemCategories.CategoryId, CategoryCode, CategoryName) */
const CATEGORY_OPTIONS = [
  { id: 1, code: "DT", name: "Điện thoại" },
  { id: 2, code: "LT", name: "Laptop" },
  { id: 3, code: "DL", name: "Điện lạnh" },
  { id: 4, code: "PK", name: "Phụ kiện" },
];

/** Nhãn hiệu – Brand */
const BRAND_OPTIONS = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Samsung" },
  { id: 3, name: "Khác" },
];

/** Kho – Warehouse (DefaultWarehouseId) */
const WAREHOUSE_OPTIONS = [
  { id: 1, name: "Kho chính" },
  { id: 2, name: "Kho phụ" },
  { id: 3, name: "Kho lạnh" },
];

/** Tài khoản kho – InventoryAccount (mã TK kế toán hàng tồn) */
const INVENTORY_ACCOUNT_OPTIONS = [
  { code: "1561", label: "1561 - Hàng tồn kho" },
  { code: "1562", label: "1562 - Hàng mua đang đi đường" },
  { code: "157", label: "157 - Hàng gửi bán" },
];

/** Tài khoản doanh thu – RevenueAccount (mã TK doanh thu) */
const REVENUE_ACCOUNT_OPTIONS = [
  { code: "5111", label: "5111 - Doanh thu bán hàng" },
  { code: "5112", label: "5112 - Doanh thu bán thành phẩm" },
  { code: "5113", label: "5113 - Doanh thu cung cấp dịch vụ" },
];

/** Thông số sản phẩm – Spec (cấu trúc giống ViewSpecList) */
const SPEC_OPTIONS = [
  { specId: 1, specCode: "MICROONG_01", specName: "microong" },
  { specId: 2, specCode: "MICROONG_02", specName: "microong" },
  { specId: 3, specCode: "MICROONG_03", specName: "microong" },
  { specId: 4, specCode: "MICROONG_04", specName: "microong" },
];

const CREATE_UOM_OPTION = {
  id: "CREATE_UOM",
  code: "",
  name: "Tạo mới đơn vị tính",
};

const CREATE_PACK_OPTION = {
  id: "CREATE_PACK",
  name: "Tạo mới quy cách đóng gói",
};

const CREATE_SPEC_OPTION = {
  specId: "CREATE_SPEC",
  specCode: "",
  specName: "Tạo mới thông số sản phẩm",
};

function CreateOptionContent({ label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Plus size={16} strokeWidth={2.5} />
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: "primary.main",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "background.paper",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.light" },
    "&.Mui-focused fieldset": { borderWidth: 2 },
  },
};

const selectInputSx = {
  ...inputSx,
  "& .MuiInputLabel-root": {
    overflow: "visible",
    whiteSpace: "nowrap",
  },
  "& .MuiOutlinedInput-root": {
    ...inputSx["& .MuiOutlinedInput-root"],
    minHeight: 42,
    "& .MuiSelect-select": {
      whiteSpace: "normal",
      overflow: "visible",
      textOverflow: "clip",
    },
  },
};

const autocompleteFieldSx = {
  width: "100%",
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "background.paper",
    minHeight: 42,
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.light" },
    "&.Mui-focused fieldset": { borderWidth: 2 },
  },
  "& .MuiInputBase-input": {
    fontSize: 13,
  },
};

const autocompleteRootSx = {
  width: "100%",
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
  },
};

const autocompleteListboxSx = {
  "& li": {
    display: "block",
  },
};

const selectMenuProps = {
  PaperProps: { sx: { borderRadius: 2, maxHeight: 280 } },
  disableScrollLock: true,
};

const INITIAL_FORM = {
  itemCode: "",
  itemName: "",
  itemType: "Product",
  description: "",
  categoryId: "",
  brandId: "",
  baseUomId: "",
  packagingSpecId: "",
  specId: "",
  laThongSo: false,
  requiresCO: false,
  requiresCQ: false,
  isActive: true,
  defaultWarehouseId: "",
  inventoryAccount: "",
  revenueAccount: "",
  purchasePrice: "",
  salePrice: "",
  onHandQty: "",
  reservedQty: "",
};

const NUMBER_FIELDS = new Set([
  "categoryId",
  "brandId",
  "baseUomId",
  "packagingSpecId",
  "specId",
  "defaultWarehouseId",
  "purchasePrice",
  "salePrice",
  "onHandQty",
  "reservedQty",
]);

const CreateItem = () => {
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const timerRef = useRef(null);

  const [uomOptions, setUomOptions] = useState([...UOM_OPTIONS]);
  const [packagingOptions, setPackagingOptions] = useState([
    ...PACKAGING_OPTIONS,
  ]);
  const [specOptions, setSpecOptions] = useState([...SPEC_OPTIONS]);

  const [createUomOpen, setCreateUomOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [createSpecOpen, setCreateSpecOpen] = useState(false);

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
    } else if (name === "laThongSo") {
      nextValue = value === "true";
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
      "Mock: Lưu thành công. Kết nối API khi backend sẵn sàng.",
      "success",
    );
    timerRef.current = setTimeout(() => navigate("/products"), 1500);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    setForm({ ...INITIAL_FORM });
    navigate("/products");
  };

  const defaultWarehouseName =
    WAREHOUSE_OPTIONS.find(
      (w) => String(w.id) === String(form.defaultWarehouseId),
    )?.name ?? "";

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
              Tạo mới vật tư
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
              form="create-item-form"
              variant="contained"
              startIcon={<Package size={18} />}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
            >
              Thêm sản phẩm
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="create-item-form" onSubmit={handleSubmit}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Thông tin sản phẩm
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: "100%",
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Mã sản phẩm"
                      name="itemCode"
                      value={form.itemCode}
                      onChange={handleChange}
                      placeholder="VD: SKU112"
                      InputLabelProps={{ shrink: true }}
                      sx={inputSx}
                    />
                  </Box>

                  <Box sx={{ width: "100%" }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Tên sản phẩm"
                      name="itemName"
                      value={form.itemName}
                      onChange={handleChange}
                      required
                      placeholder="VD: Mũ Beanie Nam Đẹp"
                      InputLabelProps={{ shrink: true }}
                      sx={inputSx}
                    />
                  </Box>
                </Box>

                <Box sx={{ mt: 2, width: "100%" }}>
                  <Box sx={{ width: "100%", mb: 2 }}>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={[CREATE_UOM_OPTION, ...uomOptions]}
                      getOptionLabel={(opt) => (opt && opt.name) || ""}
                      value={
                        uomOptions.find(
                          (o) => String(o.id) === String(form.baseUomId),
                        ) ?? null
                      }
                      onChange={(e, newValue) => {
                        if (newValue && newValue.id === "CREATE_UOM") {
                          setCreateUomOpen(true);
                          return;
                        }
                        setForm((prev) => ({
                          ...prev,
                          baseUomId: newValue?.id ?? "",
                        }));
                      }}
                      isOptionEqualToValue={(opt, val) =>
                        String(opt?.id) === String(val?.id)
                      }
                      ListboxProps={{ sx: autocompleteListboxSx }}
                      renderOption={(props, option) => {
                        if (option && option.id === "CREATE_UOM") {
                          return (
                            <Box
                              component="li"
                              {...props}
                              key={option.id}
                              sx={{ display: "block", py: 1 }}
                            >
                              <CreateOptionContent label={option.name} />
                              <Divider sx={{ mt: 1 }} />
                            </Box>
                          );
                        }

                        return (
                          <Box component="li" {...props} key={option.id}>
                            {option.name}
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Đơn vị tính"
                          required
                          InputLabelProps={{ shrink: true }}
                          sx={autocompleteFieldSx}
                        />
                      )}
                      sx={autocompleteRootSx}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr 1fr",
                      },
                      gap: 2,
                      width: "100%",
                      alignItems: "start",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Autocomplete
                        size="small"
                        fullWidth
                        options={[CREATE_PACK_OPTION, ...packagingOptions]}
                        getOptionLabel={(opt) => (opt && opt.name) || ""}
                        value={
                          packagingOptions.find(
                            (o) =>
                              String(o.id) === String(form.packagingSpecId),
                          ) ?? null
                        }
                        onChange={(e, newValue) => {
                          if (newValue && newValue.id === "CREATE_PACK") {
                            setCreatePackOpen(true);
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            packagingSpecId: newValue?.id ?? "",
                          }));
                        }}
                        isOptionEqualToValue={(opt, val) =>
                          String(opt?.id) === String(val?.id)
                        }
                        ListboxProps={{ sx: autocompleteListboxSx }}
                        renderOption={(props, option) => {
                          if (option && option.id === "CREATE_PACK") {
                            return (
                              <Box
                                component="li"
                                {...props}
                                key={option.id}
                                sx={{ display: "block", py: 1 }}
                              >
                                <CreateOptionContent label={option.name} />
                                <Divider sx={{ mt: 1 }} />
                              </Box>
                            );
                          }

                          return (
                            <Box component="li" {...props} key={option.id}>
                              {option.name}
                            </Box>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Quy cách đóng gói"
                            InputLabelProps={{ shrink: true }}
                            sx={autocompleteFieldSx}
                          />
                        )}
                        sx={autocompleteRootSx}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Autocomplete
                        size="small"
                        fullWidth
                        options={[CREATE_SPEC_OPTION, ...specOptions]}
                        getOptionLabel={(opt) => (opt && opt.specName) || ""}
                        value={
                          specOptions.find(
                            (o) => String(o.specId) === String(form.specId),
                          ) ?? null
                        }
                        onChange={(e, newValue) => {
                          if (newValue && newValue.specId === "CREATE_SPEC") {
                            setCreateSpecOpen(true);
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            specId: newValue?.specId ?? "",
                          }));
                        }}
                        isOptionEqualToValue={(opt, val) =>
                          String(opt?.specId) === String(val?.specId)
                        }
                        ListboxProps={{ sx: autocompleteListboxSx }}
                        renderOption={(props, option) => {
                          if (option && option.specId === "CREATE_SPEC") {
                            return (
                              <Box
                                component="li"
                                {...props}
                                key={option.specId}
                                sx={{ display: "block", py: 1 }}
                              >
                                <CreateOptionContent label={option.specName} />
                                <Divider sx={{ mt: 1 }} />
                              </Box>
                            );
                          }

                          return (
                            <Box component="li" {...props} key={option.specId}>
                              {option.specName}
                            </Box>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Thông số sản phẩm"
                            InputLabelProps={{ shrink: true }}
                            sx={autocompleteFieldSx}
                          />
                        )}
                        sx={autocompleteRootSx}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ width: "100%", mt: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mô tả"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    placeholder="Nhập mô tả sản phẩm..."
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Box>
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Thông tin giá
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Giá bán"
                      name="salePrice"
                      type="number"
                      value={form.salePrice}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      sx={inputSx}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">đ</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Giá vốn"
                      name="purchasePrice"
                      type="number"
                      value={form.purchasePrice}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      sx={inputSx}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">đ</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Thông tin kho
                </Typography>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Lưu kho tại"
                  name="defaultWarehouseId"
                  value={String(form.defaultWarehouseId ?? "")}
                  onChange={handleChange}
                  sx={{ ...inputSx, mb: 2 }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (v) =>
                      v === ""
                        ? "Chọn kho"
                        : WAREHOUSE_OPTIONS.find(
                            (o) => String(o.id) === String(v),
                          )?.name ?? "Chọn kho",
                    MenuProps: { PaperProps: { sx: { borderRadius: 2 } } },
                  }}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="">Chọn kho</MenuItem>
                  {WAREHOUSE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.id} value={String(opt.id)}>
                      {opt.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography
                  variant="subtitle2"
                  fontWeight="600"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Bảng phân bổ tồn kho
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Kho lưu trữ
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          Tồn kho
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2">
                            {defaultWarehouseName || "–"}
                          </Typography>
                          <Typography
                            component="a"
                            href="#"
                            variant="caption"
                            sx={{
                              color: "primary.main",
                              cursor: "pointer",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            Vị trí lưu kho
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            name="onHandQty"
                            value={form.onHandQty}
                            onChange={handleChange}
                            sx={{ ...inputSx, width: 100 }}
                            inputProps={{ style: { textAlign: "right" } }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box
              sx={{
                width: { xs: "100%", md: 260 },
                minWidth: { xs: "100%", md: 260 },
                flexShrink: 0,
              }}
            >
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Ảnh sản phẩm
                </Typography>

                <Box
                  sx={{
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    py: 4,
                    px: 2,
                    textAlign: "center",
                    bgcolor: "grey.50",
                    "&:hover": {
                      borderColor: "primary.light",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Stack alignItems="center" spacing={1}>
                    <Box sx={{ color: "text.secondary" }}>
                      <ImagePlus size={40} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Kéo thả hoặc thêm ảnh từ URL
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        color: "primary.main",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Tải ảnh lên từ thiết bị
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (Dung lượng ảnh tối đa 2MB)
                    </Typography>
                  </Stack>
                </Box>
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Phân loại
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Danh mục"
                    name="categoryId"
                    value={String(form.categoryId ?? "")}
                    onChange={handleChange}
                    sx={selectInputSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (v) => {
                        if (v === "") return "\u00A0";
                        const found = CATEGORY_OPTIONS.find(
                          (o) => String(o.id) === String(v),
                        );
                        if (!found) return "\u00A0";
                        return found.code
                          ? `${found.code} - ${found.name}`
                          : found.name;
                      },
                      MenuProps: selectMenuProps,
                    }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Chọn danh mục</MenuItem>
                    {CATEGORY_OPTIONS.map((o) => (
                      <MenuItem key={o.id} value={String(o.id)}>
                        {o.code ? `${o.code} - ${o.name}` : o.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Nhãn hiệu"
                    name="brandId"
                    value={String(form.brandId ?? "")}
                    onChange={handleChange}
                    sx={selectInputSx}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (v) =>
                        v === ""
                          ? "\u00A0"
                          : BRAND_OPTIONS.find(
                              (o) => String(o.id) === String(v),
                            )?.name ?? "\u00A0",
                      MenuProps: selectMenuProps,
                    }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="">Chọn nhãn hiệu</MenuItem>
                    {BRAND_OPTIONS.map((o) => (
                      <MenuItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Loại sản phẩm"
                    name="itemType"
                    value={form.itemType}
                    onChange={handleChange}
                    sx={selectInputSx}
                    SelectProps={{ MenuProps: selectMenuProps }}
                    InputLabelProps={{ shrink: true }}
                  >
                    <MenuItem value="Product">Product</MenuItem>
                    <MenuItem value="Material">Material</MenuItem>
                    <MenuItem value="Service">Service</MenuItem>
                  </TextField>
                </Stack>
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
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>
                  Tùy chọn & tài khoản
                </Typography>

                <Stack spacing={1.5}>
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

                  <Autocomplete
                    size="small"
                    fullWidth
                    options={INVENTORY_ACCOUNT_OPTIONS}
                    getOptionLabel={(opt) =>
                      typeof opt === "string" ? opt : opt?.label ?? ""
                    }
                    value={
                      INVENTORY_ACCOUNT_OPTIONS.find(
                        (o) => o.code === form.inventoryAccount,
                      ) ?? null
                    }
                    onChange={(_, newValue) =>
                      setForm((prev) => ({
                        ...prev,
                        inventoryAccount: newValue?.code ?? "",
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tài khoản kho"
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                    )}
                    sx={{
                      "& .MuiOutlinedInput-root":
                        inputSx["& .MuiOutlinedInput-root"],
                    }}
                  />

                  <Autocomplete
                    size="small"
                    fullWidth
                    options={REVENUE_ACCOUNT_OPTIONS}
                    getOptionLabel={(opt) =>
                      typeof opt === "string" ? opt : opt?.label ?? ""
                    }
                    value={
                      REVENUE_ACCOUNT_OPTIONS.find(
                        (o) => o.code === form.revenueAccount,
                      ) ?? null
                    }
                    onChange={(_, newValue) =>
                      setForm((prev) => ({
                        ...prev,
                        revenueAccount: newValue?.code ?? "",
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tài khoản doanh thu"
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                    )}
                    sx={{
                      "& .MuiOutlinedInput-root":
                        inputSx["& .MuiOutlinedInput-root"],
                    }}
                  />
                </Stack>
              </Paper>
            </Box>
          </Box>
        </Box>

        <CreateUomDialog
          open={createUomOpen}
          onClose={() => setCreateUomOpen(false)}
          onSubmit={(newUom) => {
            setUomOptions((prev) => [
              ...prev,
              {
                id: newUom.id,
                code: newUom.code,
                name: newUom.name,
              },
            ]);
            setForm((prev) => ({ ...prev, baseUomId: newUom.id }));
            setCreateUomOpen(false);
          }}
        />

        <CreatePackagingSpecDialog
          open={createPackOpen}
          onClose={() => setCreatePackOpen(false)}
          onSubmit={(newItem) => {
            setPackagingOptions((prev) => [
              ...prev,
              {
                id: newItem.id,
                name: newItem.specName ?? newItem.name,
              },
            ]);
            setForm((prev) => ({ ...prev, packagingSpecId: newItem.id }));
            setCreatePackOpen(false);
          }}
        />

        <CreateSpecDialog
          open={createSpecOpen}
          onClose={() => setCreateSpecOpen(false)}
          onSubmit={(newItem) => {
            setSpecOptions((prev) => [
              ...prev,
              {
                specId: newItem.specId,
                specCode: newItem.specCode,
                specName: newItem.specName,
              },
            ]);
            setForm((prev) => ({ ...prev, specId: newItem.specId }));
            setCreateSpecOpen(false);
          }}
        />

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

export default CreateItem;