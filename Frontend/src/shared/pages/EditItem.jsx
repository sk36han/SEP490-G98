/*
 * Form chỉnh sửa vật tư – MOCKUP THEO BẢNG [dbo].[Items] (WAREHOUSE_KEEPER).
 * Đã kiểm duyệt với DB: Item.ItemCode, ItemName, ItemType, Description, CategoryId, BrandId, BaseUomId,
 * PackagingSpecId, RequiresCo, RequiresCq, IsActive, DefaultWarehouseId, InventoryAccount, RevenueAccount.
 * Không có trường ngoài bảng Item. Không nhập: ItemId (PK), CreatedAt, UpdatedAt (system).
 */
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
import { ArrowLeft, Save, ImagePlus, Plus } from "lucide-react";
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

/** Tài khoản kho – InventoryAccount */
const INVENTORY_ACCOUNT_OPTIONS = [
  { code: "1561", label: "1561 - Hàng tồn kho" },
  { code: "1562", label: "1562 - Hàng mua đang đi đường" },
  { code: "157", label: "157 - Hàng gửi bán" },
];

/** Tài khoản doanh thu – RevenueAccount */
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

const CREATE_UOM_OPTION = { id: "CREATE_UOM", code: "", name: "Tạo mới đơn vị tính" };
const CREATE_PACK_OPTION = { id: "CREATE_PACK", name: "Tạo mới quy cách đóng gói" };
const CREATE_SPEC_OPTION = { specId: "CREATE_SPEC", specCode: "", specName: "Tạo mới thông số sản phẩm" };

function CreateOptionContent({ label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Plus size={16} strokeWidth={2.5} />
      </Box>
      <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</Typography>
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

/** Dropdown: label một dòng không vỡ chữ, value không cắt */
const selectInputSx = {
  ...inputSx,
  "& .MuiInputLabel-root": {
    overflow: "visible",
    whiteSpace: "nowrap",
  },
  "& .MuiOutlinedInput-root": {
    ...inputSx["& .MuiOutlinedInput-root"],
    minHeight: 42,
    "& .MuiSelect-select": { whiteSpace: "normal", overflow: "visible", textOverflow: "clip" },
  },
};

/** MenuProps dùng chung cho Select – bo góc, giới hạn chiều cao */
const selectMenuProps = {
  PaperProps: { sx: { borderRadius: 2, maxHeight: 280 } },
  disableScrollLock: true,
};

const NUMBER_FIELDS = new Set([
  "categoryId",
  "brandId",
  "baseUomId",
  "packagingSpecId",
  "specId",
  "defaultWarehouseId",
  "purchasePrice",
  "onHandQty",
  "reservedQty",
]);

/** Mock danh sách vật tư – Item + giá/tồn (ItemPrices, InventoryOnHand). */
const MOCK_ITEMS = [
  { itemId: 1, itemCode: "SP001", itemName: "iPhone 15 Pro Max 256GB", itemType: "Product", description: "Điện thoại iPhone 15 Pro Max bản 256GB", categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 26500000, salePrice: 28500000, onHandQty: 42, reservedQty: 2 },
  { itemId: 2, itemCode: "SP002", itemName: "Samsung Galaxy S24 Ultra", itemType: "Product", description: "Điện thoại Samsung Galaxy S24 Ultra", categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 24900000, salePrice: 26900000, onHandQty: 28, reservedQty: 0 },
  { itemId: 3, itemCode: "SP003", itemName: "MacBook Pro 14\" M3", itemType: "Product", description: "Laptop MacBook Pro 14 inch chip M3", categoryId: 2, brandId: 1, baseUomId: 1, packagingSpecId: 2, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 39900000, salePrice: 42900000, onHandQty: 15, reservedQty: 1 },
  { itemId: 4, itemCode: "SP004", itemName: "Tủ lạnh Samsung 234L", itemType: "Product", description: "Tủ lạnh Samsung 234 lít", categoryId: 3, brandId: 2, baseUomId: 1, packagingSpecId: 3, requiresCO: true, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 12000000, salePrice: 14500000, onHandQty: 8, reservedQty: 0 },
  { itemId: 5, itemCode: "SP005", itemName: "Tai nghe AirPods Pro 2", itemType: "Product", description: "Tai nghe không dây AirPods Pro thế hệ 2", categoryId: 4, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 4800000, salePrice: 5490000, onHandQty: 56, reservedQty: 3 },
  { itemId: 6, itemCode: "SP006", itemName: "Cáp sạc USB-C 2m", itemType: "Product", description: "Cáp sạc USB-C dài 2 mét", categoryId: 4, brandId: null, baseUomId: 1, packagingSpecId: null, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: "1561", revenueAccount: "5111", purchasePrice: 45000, salePrice: 89000, onHandQty: 120, reservedQty: 0 },
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
    onHandQty: "",
    reservedQty: "",
  });
  const [notFound, setNotFound] = useState(false);
  const [uomOptions, setUomOptions] = useState([...UOM_OPTIONS]);
  const [packagingOptions, setPackagingOptions] = useState([...PACKAGING_OPTIONS]);
  const [specOptions, setSpecOptions] = useState([...SPEC_OPTIONS]);
  const [createUomOpen, setCreateUomOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [createSpecOpen, setCreateSpecOpen] = useState(false);

  useEffect(() => {
    const item = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
    if (!item) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setForm({
      itemCode: item.itemCode ?? "",
      itemName: item.itemName ?? "",
      itemType: item.itemType || "Product",
      description: item.description ?? "",
      categoryId: item.categoryId ?? "",
      brandId: item.brandId ?? "",
      baseUomId: item.baseUomId ?? 1,
      packagingSpecId: item.packagingSpecId ?? "",
      specId: item.specId ?? "",
      laThongSo: item.laThongSo ?? false,
      requiresCO: item.requiresCO ?? false,
      requiresCQ: item.requiresCQ ?? false,
      isActive: item.isActive ?? true,
      defaultWarehouseId: item.defaultWarehouseId ?? "",
      inventoryAccount: item.inventoryAccount ?? "",
      revenueAccount: item.revenueAccount ?? "",
      purchasePrice: item.purchasePrice ?? "",
      onHandQty: item.onHandQty ?? "",
      reservedQty: item.reservedQty ?? "",
    });
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

  if (notFound) {
    return (
      <Box sx={{ bgcolor: "grey.50", pt: 0, pb: 2, mt: -3 }}>
        <Container maxWidth="lg" sx={{ maxWidth: 1100 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate("/products")} variant="outlined" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Quay lại
            </Button>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ py: 4 }}>
            Không tìm thấy vật tư với ID: {id}
          </Typography>
        </Container>
      </Box>
    );
  }

  const defaultWarehouseName = WAREHOUSE_OPTIONS.find((w) => String(w.id) === String(form.defaultWarehouseId))?.name ?? "";

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", pb: 4 }}>
      <Container maxWidth="lg" sx={{ maxWidth: 1200 }}>
        {/* Header: Back + title trái; Hủy + Lưu phải */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} size="medium" sx={{ color: "text.primary" }} aria-label="Quay lại">
              <ArrowLeft size={24} />
            </IconButton>
            <Typography variant="h5" fontWeight="700" sx={{ color: "text.primary" }}>
              {form.itemName || "Chỉnh sửa vật tư"}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={handleCancel} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>
              Hủy
            </Button>
            <Button type="submit" form="edit-item-form" variant="contained" startIcon={<Save size={18} />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>
              Lưu
            </Button>
          </Stack>
        </Stack>

        <Box component="form" id="edit-item-form" onSubmit={handleSubmit}>
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
              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thông tin sản phẩm</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                  <Box sx={{ width: "100%" }}>
                    <TextField fullWidth size="small" label="Mã sản phẩm" name="itemCode" value={form.itemCode} onChange={handleChange} placeholder="VD: SKU112" InputLabelProps={{ shrink: true }} sx={inputSx} />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <TextField fullWidth size="small" label="Tên sản phẩm" name="itemName" value={form.itemName} onChange={handleChange} required placeholder="VD: Mũ Beanie Nam Đẹp" InputLabelProps={{ shrink: true }} sx={inputSx} />
                  </Box>
                </Box>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={[CREATE_UOM_OPTION, ...uomOptions]}
                      getOptionLabel={(opt) => (opt && opt.name) || ""}
                      value={uomOptions.find((o) => String(o.id) === String(form.baseUomId)) ?? null}
                      onChange={(e, newValue) => {
                        if (newValue && newValue.id === "CREATE_UOM") {
                          setCreateUomOpen(true);
                          return;
                        }
                        setForm((prev) => ({ ...prev, baseUomId: newValue?.id ?? "" }));
                      }}
                      isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)}
                      renderOption={(props, option) => {
                        if (option && option.id === "CREATE_UOM") {
                          return (
                            <li {...props} key={option.id}>
                              <CreateOptionContent label={option.name} />
                              <Divider sx={{ mt: 1 }} />
                            </li>
                          );
                        }
                        return <li {...props} key={option.id}>{option.name}</li>;
                      }}
                      ListboxProps={{ sx: { minWidth: 320 } }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Đơn vị tính" 
                          required 
                          InputLabelProps={{ shrink: true }} 
                          sx={{ 
                            ...selectInputSx, 
                            "& .MuiInputBase-input": { fontSize: 13 } 
                          }} 
                        />
                      )}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={[CREATE_PACK_OPTION, ...packagingOptions]}
                      getOptionLabel={(opt) => (opt && opt.name) || ""}
                      value={packagingOptions.find((o) => String(o.id) === String(form.packagingSpecId)) ?? null}
                      onChange={(e, newValue) => {
                        if (newValue && newValue.id === "CREATE_PACK") {
                          setCreatePackOpen(true);
                          return;
                        }
                        setForm((prev) => ({ ...prev, packagingSpecId: newValue?.id ?? "" }));
                      }}
                      isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)}
                      renderOption={(props, option) => {
                        if (option && option.id === "CREATE_PACK") {
                          return (
                            <li {...props} key={option.id}>
                              <CreateOptionContent label={option.name} />
                              <Divider sx={{ mt: 1 }} />
                            </li>
                          );
                        }
                        return <li {...props} key={option.id}>{option.name}</li>;
                      }}
                      ListboxProps={{ sx: { minWidth: 320 } }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Quy cách đóng gói" 
                          InputLabelProps={{ shrink: true }} 
                          sx={{ 
                            ...selectInputSx, 
                            "& .MuiInputBase-input": { fontSize: 13 } 
                          }} 
                        />
                      )}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      size="small"
                      fullWidth
                      options={[CREATE_SPEC_OPTION, ...specOptions]}
                      getOptionLabel={(opt) => (opt && opt.specName) || ""}
                      value={specOptions.find((o) => String(o.specId) === String(form.specId)) ?? null}
                      onChange={(e, newValue) => {
                        if (newValue && newValue.specId === "CREATE_SPEC") {
                          setCreateSpecOpen(true);
                          return;
                        }
                        setForm((prev) => ({ ...prev, specId: newValue?.specId ?? "" }));
                      }}
                      isOptionEqualToValue={(opt, val) => String(opt?.specId) === String(val?.specId)}
                      renderOption={(props, option) => {
                        if (option && option.specId === "CREATE_SPEC") {
                          return (
                            <li {...props} key={option.specId}>
                              <CreateOptionContent label={option.specName} />
                              <Divider sx={{ mt: 1 }} />
                            </li>
                          );
                        }
                        return <li {...props} key={option.specId}>{option.specName}</li>;
                      }}
                      ListboxProps={{ sx: { minWidth: 320 } }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Thông số sản phẩm" 
                          InputLabelProps={{ shrink: true }} 
                          sx={{ 
                            ...selectInputSx, 
                            "& .MuiInputBase-input": { fontSize: 13 } 
                          }} 
                        />
                      )}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
                {/* Mô tả: riêng một dòng, full width (dưới Đơn vị + Quy cách) */}
                <Box sx={{ width: "100%", mt: 2 }}>
                  <TextField fullWidth size="small" label="Mô tả" name="description" value={form.description} onChange={handleChange} multiline rows={3} placeholder="Nhập mô tả sản phẩm..." InputLabelProps={{ shrink: true }} sx={inputSx} />
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thông tin giá</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Giá vốn" name="purchasePrice" type="number" value={form.purchasePrice} onChange={handleChange} InputLabelProps={{ shrink: true }} sx={inputSx} InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thông tin kho</Typography>
                <TextField select fullWidth size="small" label="Lưu kho tại" name="defaultWarehouseId" value={String(form.defaultWarehouseId ?? "")} onChange={handleChange} sx={{ ...inputSx, mb: 2 }} SelectProps={{ displayEmpty: true, renderValue: (v) => (v === "" ? "Chọn kho" : WAREHOUSE_OPTIONS.find((o) => String(o.id) === String(v))?.name ?? "Chọn kho"), MenuProps: { PaperProps: { sx: { borderRadius: 2 } } } }} InputLabelProps={{ shrink: true }}>
                  <MenuItem value="">Chọn kho</MenuItem>
                  {WAREHOUSE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.id} value={String(opt.id)}>{opt.name}</MenuItem>
                  ))}
                </TextField>
                <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>Bảng phân bổ tồn kho</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: 600 }}>Kho lưu trữ</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Tồn kho</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2">{defaultWarehouseName || "–"}</Typography>
                          <Typography component="a" href="#" variant="caption" sx={{ color: "primary.main", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>Vị trí lưu kho</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <TextField type="number" size="small" name="onHandQty" value={form.onHandQty} onChange={handleChange} sx={{ ...inputSx, width: 100 }} inputProps={{ style: { textAlign: "right" } }} />
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
              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Ảnh sản phẩm</Typography>
                <Box
                  sx={{
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    py: 4,
                    px: 2,
                    textAlign: "center",
                    bgcolor: "grey.50",
                    "&:hover": { borderColor: "primary.light", bgcolor: "action.hover" },
                  }}
                >
                  <Stack alignItems="center" spacing={1}>
                    <Box sx={{ color: "text.secondary" }}><ImagePlus size={40} /></Box>
                    <Typography variant="body2" color="text.secondary">Kéo thả hoặc thêm ảnh từ URL</Typography>
                    <Typography component="span" variant="caption" sx={{ color: "primary.main", cursor: "pointer", fontWeight: 500 }}>Tải ảnh lên từ thiết bị</Typography>
                    <Typography variant="caption" color="text.secondary">(Dung lượng ảnh tối đa 2MB)</Typography>
                  </Stack>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Phân loại</Typography>
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
                  <TextField select fullWidth size="small" label="Nhãn hiệu" name="brandId" value={String(form.brandId ?? "")} onChange={handleChange} sx={selectInputSx} SelectProps={{ displayEmpty: true, renderValue: (v) => (v === "" ? "\u00A0" : BRAND_OPTIONS.find((o) => String(o.id) === String(v))?.name ?? "\u00A0"), MenuProps: selectMenuProps }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="">Chọn nhãn hiệu</MenuItem>
                    {BRAND_OPTIONS.map((o) => (
                      <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select fullWidth size="small" label="Loại sản phẩm" name="itemType" value={form.itemType} onChange={handleChange} sx={selectInputSx} SelectProps={{ MenuProps: selectMenuProps }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="Product">Product</MenuItem>
                    <MenuItem value="Material">Material</MenuItem>
                    <MenuItem value="Service">Service</MenuItem>
                  </TextField>
                  <TextField select fullWidth size="small" label="Là thông số" name="laThongSo" value={String(form.laThongSo)} onChange={handleChange} sx={selectInputSx} SelectProps={{ renderValue: (v) => LA_THONG_SO_OPTIONS.find((o) => String(o.value) === String(v))?.label ?? "\u00A0", MenuProps: selectMenuProps }} InputLabelProps={{ shrink: true }}>
                    {LA_THONG_SO_OPTIONS.map((o) => (
                      <MenuItem key={String(o.value)} value={String(o.value)}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Tùy chọn & tài khoản</Typography>
                <Stack spacing={1.5}>
                  <FormControlLabel control={<Checkbox name="requiresCO" checked={form.requiresCO} onChange={handleChange} />} label="Yêu cầu CO" />
                  <FormControlLabel control={<Checkbox name="requiresCQ" checked={form.requiresCQ} onChange={handleChange} />} label="Yêu cầu CQ" />
                  <FormControlLabel control={<Checkbox name="isActive" checked={form.isActive} onChange={handleChange} />} label="Đang hoạt động" />
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={INVENTORY_ACCOUNT_OPTIONS}
                    getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt?.label ?? "")}
                    value={INVENTORY_ACCOUNT_OPTIONS.find((o) => o.code === form.inventoryAccount) ?? null}
                    onChange={(_, newValue) => setForm((prev) => ({ ...prev, inventoryAccount: newValue?.code ?? "" }))}
                    renderInput={(params) => <TextField {...params} label="Tài khoản kho" InputLabelProps={{ shrink: true }} sx={inputSx} />}
                    sx={{ "& .MuiOutlinedInput-root": inputSx["& .MuiOutlinedInput-root"] }}
                  />
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={REVENUE_ACCOUNT_OPTIONS}
                    getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt?.label ?? "")}
                    value={REVENUE_ACCOUNT_OPTIONS.find((o) => o.code === form.revenueAccount) ?? null}
                    onChange={(_, newValue) => setForm((prev) => ({ ...prev, revenueAccount: newValue?.code ?? "" }))}
                    renderInput={(params) => <TextField {...params} label="Tài khoản doanh thu" InputLabelProps={{ shrink: true }} sx={inputSx} />}
                    sx={{ "& .MuiOutlinedInput-root": inputSx["& .MuiOutlinedInput-root"] }}
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
            setUomOptions((prev) => [...prev, { id: newUom.id, code: newUom.code, name: newUom.name }]);
            setForm((prev) => ({ ...prev, baseUomId: newUom.id }));
            setCreateUomOpen(false);
          }}
        />
        <CreatePackagingSpecDialog
          open={createPackOpen}
          onClose={() => setCreatePackOpen(false)}
          onSubmit={(newItem) => {
            setPackagingOptions((prev) => [...prev, { id: newItem.id, name: newItem.specName ?? newItem.name }]);
            setForm((prev) => ({ ...prev, packagingSpecId: newItem.id }));
            setCreatePackOpen(false);
          }}
        />
        <CreateSpecDialog
          open={createSpecOpen}
          onClose={() => setCreateSpecOpen(false)}
          onSubmit={(newItem) => {
            setSpecOptions((prev) => [...prev, { specId: newItem.specId, specCode: newItem.specCode, specName: newItem.specName }]);
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

export default EditItem;
