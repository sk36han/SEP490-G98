/*
 * Form chinh sua vat tu - ket noi API [dbo].[Items].
 * UI dong bo voi CreateItem.jsx.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button, FormControlLabel,
  Checkbox, MenuItem, Grid, Paper, IconButton, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, Autocomplete, Divider, CircularProgress,
} from "@mui/material";
import { ArrowLeft, ImagePlus, Save, Plus } from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import { getItemForDisplayById, updateItem, uploadItemImage } from "../lib/itemService";
import { ImageDialog } from "../components/ImageDialog";
import { getPackagingSpecList, createPackagingSpec } from "../lib/packagingSpecService";
import { getItemParameterList, createItemParameter } from "../lib/itemParameterService";
import { useMasterData } from "../../app/context/MasterDataContext";
import CreateUomDialog from "../components/CreateUomDialog";
import CreatePackagingSpecDialog from "../components/CreatePackagingSpecDialog";
import CreateSpecDialog from "../components/CreateSpecDialog";
import CreateBrandDialog from "../components/CreateBrandDialog";
import UomFormDialog from "../components/UomFormDialog";

const CREATE_UOM_OPTION = { id: "CREATE_UOM", code: "", name: "Tạo mới đơn vị tính" };
const CREATE_PACK_OPTION = { id: "CREATE_PACK", name: "Tạo mới quy cách đóng gói" };
const CREATE_SPEC_OPTION = { specId: "CREATE_SPEC", specCode: "", specName: "Tạo mới thông số sản phẩm" };
const CREATE_BRAND_OPTION = { id: "CREATE_BRAND", name: "Tạo mới nhãn hiệu" };

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
  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", "& fieldset": { borderColor: "divider" }, "&:hover fieldset": { borderColor: "primary.light" }, "&.Mui-focused fieldset": { borderWidth: 2 } },
};

const selectInputSx = {
  ...inputSx,
  "& .MuiInputLabel-root": { overflow: "visible", whiteSpace: "nowrap" },
  "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], minHeight: 42, "& .MuiSelect-select": { whiteSpace: "normal", overflow: "visible", textOverflow: "clip" } },
};

const autocompleteFieldSx = {
  width: "100%", minWidth: 0,
  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", minHeight: 42, "& fieldset": { borderColor: "divider" }, "&:hover fieldset": { borderColor: "primary.light" }, "&.Mui-focused fieldset": { borderWidth: 2 } },
  "& .MuiInputBase-input": { fontSize: 13 },
};

const autocompleteRootSx = { width: "100%", minWidth: 0, "& .MuiOutlinedInput-root": { borderRadius: 2 } };
const autocompleteListboxSx = { "& li": { display: "block" } };
const selectMenuProps = { PaperProps: { sx: { borderRadius: 2, maxHeight: 280 } }, disableScrollLock: true };
const NUMBER_FIELDS = new Set(["categoryId", "brandId", "baseUomId", "packagingSpecId", "specId", "defaultWarehouseId", "purchasePrice", "onHandQty", "reservedQty"]);
const PAGE_SIZE = 100;

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const timerRef = useRef(null);

  const { categories, brands, uoms, warehouses, refreshAll } = useMasterData() || {};
  const masterCategories = categories || [];
  const masterBrands = brands || [];
  const masterUoms = uoms || [];
  const masterWarehouses = warehouses || [];

  const [packagingOptions, setPackagingOptions] = useState([]);
  const [specOptions, setSpecOptions] = useState([]);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);
  const [createUomOpen, setCreateUomOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [createSpecOpen, setCreateSpecOpen] = useState(false);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Image states
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageServerUrl, setImageServerUrl] = useState(""); // URL from backend (for existing image)
  const [imageFile, setImageFile] = useState(null);
  const [imageFileName, setImageFileName] = useState("");
  const [imageOriginalWidth, setImageOriginalWidth] = useState(0);
  const [imageOriginalHeight, setImageOriginalHeight] = useState(0);
  const [imageDialogTempUrl, setImageDialogTempUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [form, setForm] = useState({
    itemCode: "", itemName: "", itemType: "Product", description: "",
    categoryId: "", brandId: "", baseUomId: "", packagingSpecId: "", specId: "",
    laThongSo: false, requiresCO: false, requiresCQ: false, isActive: true,
    defaultWarehouseId: "",
    purchasePrice: "", onHandQty: "", reservedQty: "",
    imageUrl: "",
  });

  const loadPackagingAndSpecOptions = useCallback(async () => {
    try {
      const [packRes, specRes] = await Promise.all([getPackagingSpecList(), getItemParameterList({ page: 1, pageSize: PAGE_SIZE })]);
      console.log("[EditItem] packRes:", JSON.stringify(packRes));
      console.log("[EditItem] specRes:", JSON.stringify(specRes));
      const packItems = Array.isArray(packRes?.items) ? packRes.items : (Array.isArray(packRes) ? packRes : []);
      console.log("[EditItem] packItems:", packItems);
      setPackagingOptions(packItems.map((p) => ({ id: p.packagingSpecId ?? p.PackagingSpecId, name: p.specName ?? p.SpecName ?? "" })));
      const specItems = Array.isArray(specRes?.items) ? specRes.items : (Array.isArray(specRes) ? specRes : []);
      console.log("[EditItem] specItems:", specItems);
      setSpecOptions(specItems.map((s) => ({ specId: s.paramId ?? s.ParamId, specCode: s.paramCode ?? s.ParamCode ?? "", specName: s.paramName ?? s.ParamName ?? "" })));
      setOptionsLoaded(true);
    } catch (err) {
      console.error("[EditItem] loadPackagingAndSpecOptions error:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setOptionsLoaded(false);
    setNotFound(false);
    Promise.all([getItemForDisplayById(id), loadPackagingAndSpecOptions()])
      .then(([item]) => {
        console.log("[EditItem] item loaded:", JSON.stringify(item));
        setNotFound(false);
        if (item.purchasePrice != null && item.purchasePrice !== "") setShowPurchasePrice(true);

        // Load existing image
        const existingImageUrl = item.imageUrl ?? item.ImageUrl ?? "";
        setImageServerUrl(existingImageUrl);
        setImagePreviewUrl(existingImageUrl);

        setForm({
          itemCode: item.itemCode ?? "",
          itemName: item.itemName ?? "",
          itemType: item.itemType || "Product",
          description: item.description ?? "",
          categoryId: item.categoryId ?? "",
          brandId: item.brandId ?? "",
          baseUomId: item.baseUomId ?? "",
          packagingSpecId: item.packagingSpecId ?? "",
          specId: item.specId ?? "",
          laThongSo: item.hasSpecifications ?? false,
          requiresCO: item.requiresCO ?? false,
          requiresCQ: item.requiresCQ ?? false,
          isActive: item.isActive ?? true,
          defaultWarehouseId: item.defaultWarehouseId ?? "",
          purchasePrice: item.purchasePrice ?? "",
          onHandQty: item.onHandQty ?? "",
          reservedQty: item.reservedQty ?? "",
          imageUrl: existingImageUrl,
        });
      })
      .catch((err) => {
        console.error("[EditItem] load error:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id, loadPackagingAndSpecOptions]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Image handlers
  const handleOpenImageDialog = () => {
    setImageDialogTempUrl(imagePreviewUrl);
    setImageDialogOpen(true);
  };

  const handleDialogBrowseFile = (file) => {
    const url = URL.createObjectURL(file);
    if (imageDialogTempUrl && imageDialogTempUrl !== imagePreviewUrl && imageDialogTempUrl !== "") {
      URL.revokeObjectURL(imageDialogTempUrl);
    }
    setImageDialogTempUrl(url);
    setImageFile(file);
    setImageFileName(file.name);
    const img = new window.Image();
    img.onload = () => {
      setImageOriginalWidth(img.naturalWidth);
      setImageOriginalHeight(img.naturalHeight);
    };
    img.src = url;
  };

  const handleApplyImage = async (croppedDataUrl) => {
    setImagePreviewUrl(croppedDataUrl);
    setImageDialogOpen(false);
    setImageFile(null);

    // Convert cropped dataURL to File and upload
    setImageUploading(true);
    try {
      const fetchRes = await fetch(croppedDataUrl);
      const blob = await fetchRes.blob();
      const fileName = imageFileName || 'item-image.jpg';
      const croppedFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      setImageFile(croppedFile);
      const result = await uploadItemImage(croppedFile);
      setImageServerUrl(result.url || '');
    } catch (err) {
      console.error('[EditItem] Image upload error:', err);
      showToast('Tải ảnh lên thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (imageDialogTempUrl && imageDialogTempUrl !== "" && imageDialogTempUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imageDialogTempUrl);
    }
    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    // Reset to server URL (or empty if no existing image)
    setImagePreviewUrl(imageServerUrl || "");
    setImageFile(null);
    setImageFileName("");
    setImageOriginalWidth(0);
    setImageOriginalHeight(0);
    setImageDialogOpen(false);
    setImageDialogTempUrl("");
    setImageServerUrl("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const handleCloseImageDialog = () => {
    if (imageDialogTempUrl && imageDialogTempUrl !== imagePreviewUrl && imageDialogTempUrl !== "" && !imageDialogTempUrl.startsWith("data:")) {
      URL.revokeObjectURL(imageDialogTempUrl);
    }
    setImageDialogOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue;
    if (type === "checkbox") nextValue = checked;
    else if (name === "laThongSo") nextValue = value === "true";
    else if (NUMBER_FIELDS.has(name)) nextValue = value === "" ? "" : Number(value);
    else nextValue = value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (form.itemName ?? "").trim();
    if (!name) { showToast("Vui long nhap ten san pham.", "error"); return; }
    const categoryId = form.categoryId !== "" && form.categoryId != null ? Number(form.categoryId) : null;
    const baseUomId = form.baseUomId !== "" && form.baseUomId != null ? Number(form.baseUomId) : null;
    if (categoryId == null || Number.isNaN(categoryId)) { showToast("Vui long chon danh muc.", "error"); return; }
    if (baseUomId == null || Number.isNaN(baseUomId)) { showToast("Vui long chon don vi tinh.", "error"); return; }
    setSubmitting(true);
    try {
      await updateItem(id, {
        itemName: name,
        itemType: form.itemType || null,
        description: form.description?.trim() || null,
        categoryId,
        brandId: form.brandId !== "" && form.brandId != null ? Number(form.brandId) : null,
        baseUomId,
        packagingSpecId: form.packagingSpecId !== "" && form.packagingSpecId != null ? Number(form.packagingSpecId) : null,
        requiresCo: Boolean(form.requiresCO),
        requiresCq: Boolean(form.requiresCQ),
        isActive: Boolean(form.isActive),
        defaultWarehouseId: form.defaultWarehouseId !== "" && form.defaultWarehouseId != null ? Number(form.defaultWarehouseId) : null,
        purchasePrice: form.purchasePrice !== "" && form.purchasePrice != null && !Number.isNaN(Number(form.purchasePrice)) ? Number(form.purchasePrice) : null,
        imageUrl: form.imageUrl || null,
      });
      showToast("Cap nhat san pham thanh cong!", "success");
      timerRef.current = setTimeout(() => navigate("/products"), 1500);
    } catch (err) {
      showToast(err?.response?.data?.message || err.message || "Khong the cap nhat vat tu.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);
  const handleCancel = () => navigate("/products");

  if (loading) return <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><CircularProgress /></Box>;
  if (notFound) return (
    <Box sx={{ bgcolor: "grey.50", pt: 0, pb: 2 }}>
      <Container maxWidth="lg" sx={{ maxWidth: 1200 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, py: 2 }}>
          <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate("/products")} variant="outlined" sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Quay lai</Button>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Khong tim thay vat tu voi ID: {id}</Typography>
      </Container>
    </Box>
  );

  const warehouseList = Array.isArray(masterWarehouses) ? masterWarehouses : [];
  const defaultWarehouseName = warehouseList.find((w) => String(w.warehouseId) === String(form.defaultWarehouseId))?.warehouseName ?? "";
  const normalizeUom = (u) => ({ id: u.uomId ?? u.UomId, name: u.uomName ?? u.UomName ?? "" });
  const normalizeBrand = (b) => ({ id: b.brandId ?? b.BrandId, name: b.brandName ?? b.BrandName ?? "" });
  const uomValue = masterUoms.find((o) => String(o.uomId ?? o.UomId) === String(form.baseUomId)) ? normalizeUom(masterUoms.find((o) => String(o.uomId ?? o.UomId) === String(form.baseUomId))) : null;
  const brandValue = masterBrands.find((o) => String(o.brandId ?? o.BrandId) === String(form.brandId)) ? normalizeBrand(masterBrands.find((o) => String(o.brandId ?? o.BrandId) === String(form.brandId))) : null;

  const nbsp = String.fromCharCode(160);
  const catDisplay = (v) => {
    if (v === "") return nbsp;
    const found = masterCategories.find((o) => String(o.categoryId ?? o.CategoryId) === String(v));
    if (!found) return nbsp;
    const code = found.categoryCode ?? found.CategoryCode ?? "";
    const name = found.categoryName ?? found.CategoryName ?? "";
    return code ? code + " - " + name : name;
  };

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", pb: 4 }}>
      <Container maxWidth="lg" sx={{ maxWidth: 1200 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} size="medium" sx={{ color: "text.primary" }} aria-label="Quay lai"><ArrowLeft size={24} /></IconButton>
            <Typography variant="h5" fontWeight="700" sx={{ color: "text.primary" }}>Chỉnh sửa vật tư</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={handleCancel} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>Huy</Button>
            <Button type="submit" form="edit-item-form" variant="contained" disabled={submitting} startIcon={<Save size={18} />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>{submitting ? "Dang luu..." : "Luu thay doi"}</Button>
          </Stack>
        </Stack>

        <Box component="form" id="edit-item-form" onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, alignItems: "flex-start", width: "100%" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thông tin sản phẩm</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                  <TextField fullWidth size="small" label="Tên sản phẩm" name="itemName" value={form.itemName} onChange={handleChange} required placeholder="VD: Mũ Beanie Nam Hàn Quốc" InputLabelProps={{ shrink: true }} sx={inputSx} />
                </Box>
                <Box sx={{ mt: 2, width: "100%" }}>
                  <Box sx={{ width: "100%", mb: 2 }}>
                    <Autocomplete size="small" fullWidth options={[CREATE_UOM_OPTION, ...masterUoms.map(normalizeUom)]} getOptionLabel={(opt) => (opt && opt.name) || ""} value={uomValue}
                      onChange={(e, newValue) => { if (newValue && newValue.id === "CREATE_UOM") { setCreateUomOpen(true); return; } setForm((prev) => ({ ...prev, baseUomId: newValue?.id ?? "" })); }}
                      isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)} ListboxProps={{ sx: autocompleteListboxSx }}
                      renderOption={(props, option) => option && option.id === "CREATE_UOM" ? <Box component="li" {...props} key={option.id} sx={{ display: "block", py: 1 }}><CreateOptionContent label={option.name} /><Divider sx={{ mt: 1 }} /></Box> : <Box component="li" {...props} key={option.id}>{option.name}</Box>}
                      renderInput={(params) => <TextField {...params} label="Don vi tinh" required InputLabelProps={{ shrink: true }} sx={autocompleteFieldSx} />} sx={autocompleteRootSx} />
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, width: "100%", alignItems: "start" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Autocomplete size="small" fullWidth options={[CREATE_PACK_OPTION, ...packagingOptions]} getOptionLabel={(opt) => (opt && opt.name) || ""}
                        value={packagingOptions.find((o) => String(o.id) === String(form.packagingSpecId)) ?? null}
                        onOpen={async () => { try { const list = await getPackagingSpecList(); const items = Array.isArray(list?.items) ? list.items : (Array.isArray(list) ? list : []); setPackagingOptions(items.map((p) => ({ id: p.packagingSpecId ?? p.PackagingSpecId, name: p.specName ?? p.SpecName ?? "" }))); } catch { /* keep */ } }}
                        onChange={(e, newValue) => { if (newValue && newValue.id === "CREATE_PACK") { setCreatePackOpen(true); return; } setForm((prev) => ({ ...prev, packagingSpecId: newValue?.id ?? "" })); }}
                        isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)} ListboxProps={{ sx: autocompleteListboxSx }}
                        renderOption={(props, option) => option && option.id === "CREATE_PACK" ? <Box component="li" {...props} key={option.id} sx={{ display: "block", py: 1 }}><CreateOptionContent label={option.name} /><Divider sx={{ mt: 1 }} /></Box> : <Box component="li" {...props} key={option.id}>{option.name}</Box>}
                        renderInput={(params) => <TextField {...params} label="Quy cách đóng gói" InputLabelProps={{ shrink: true }} sx={autocompleteFieldSx} />} sx={autocompleteRootSx} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Autocomplete size="small" fullWidth options={[CREATE_SPEC_OPTION, ...specOptions]} getOptionLabel={(opt) => (opt && opt.specName) || ""}
                        value={specOptions.find((o) => String(o.specId) === String(form.specId)) ?? null}
                        onOpen={async () => { try { const res = await getItemParameterList({ page: 1, pageSize: PAGE_SIZE }); setSpecOptions((Array.isArray(res?.items) ? res.items : []).map((s) => ({ specId: s.paramId ?? s.ParamId, specCode: s.paramCode ?? s.ParamCode ?? "", specName: s.paramName ?? s.ParamName ?? "" }))); } catch { /* keep */ } }}
                        onChange={(e, newValue) => { if (newValue && newValue.specId === "CREATE_SPEC") { setCreateSpecOpen(true); return; } setForm((prev) => ({ ...prev, specId: newValue?.specId ?? "" })); }}
                        isOptionEqualToValue={(opt, val) => String(opt?.specId) === String(val?.specId)} ListboxProps={{ sx: autocompleteListboxSx }}
                        renderOption={(props, option) => option && option.specId === "CREATE_SPEC" ? <Box component="li" {...props} key={option.specId} sx={{ display: "block", py: 1 }}><CreateOptionContent label={option.specName} /><Divider sx={{ mt: 1 }} /></Box> : <Box component="li" {...props} key={option.specId}>{option.specName}</Box>}
                        renderInput={(params) => <TextField {...params} label="Thông số sản phẩm" InputLabelProps={{ shrink: true }} sx={autocompleteFieldSx} />} sx={autocompleteRootSx} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ width: "100%", mt: 2 }}>
                  <TextField fullWidth size="small" label="Mô tả" name="description" value={form.description} onChange={handleChange} multiline rows={3} placeholder="Nhập mô tả sản phẩm..." InputLabelProps={{ shrink: true }} sx={inputSx} />
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thong tin gia</Typography>
                <FormControlLabel control={<Checkbox checked={showPurchasePrice} onChange={(e) => setShowPurchasePrice(e.target.checked)} name="showPurchasePrice" />} label="Them Gia von" sx={{ mb: showPurchasePrice ? 2 : 0 }} />
                {showPurchasePrice && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth size="small" label="Gia von" name="purchasePrice" type="number" value={form.purchasePrice} onChange={handleChange} InputLabelProps={{ shrink: true }} sx={inputSx} InputProps={{ endAdornment: <InputAdornment position="end">d</InputAdornment> }} />
                    </Grid>
                  </Grid>
                )}
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Thong tin kho</Typography>
                <TextField select fullWidth size="small" label="Luu kho tai" name="defaultWarehouseId" value={String(form.defaultWarehouseId ?? "")} onChange={handleChange} sx={{ ...inputSx, mb: 2 }}
                  SelectProps={{ displayEmpty: true, renderValue: (v) => v === "" ? "Chon kho" : (warehouseList.find((o) => String(o.warehouseId) === String(v))?.warehouseName ?? "Chon kho"), MenuProps: { PaperProps: { sx: { borderRadius: 2 } } } }}
                  InputLabelProps={{ shrink: true }}>
                  <MenuItem value="">Chon kho</MenuItem>
                  {warehouseList.map((opt, idx) => <MenuItem key={opt?.warehouseId ?? "wh-" + idx} value={String(opt?.warehouseId ?? "")}>{opt?.warehouseName ?? ""}</MenuItem>)}
                </TextField>
                <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>Bang phan bo ton kho</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow sx={{ bgcolor: "grey.50" }}><TableCell sx={{ fontWeight: 600 }}>Kho luu tru</TableCell><TableCell sx={{ fontWeight: 600 }} align="right">Ton kho</TableCell></TableRow></TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2">{defaultWarehouseName || "---"}</Typography>
                          <Typography component="a" href="#" variant="caption" sx={{ color: "primary.main", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}>Vi tri luu kho</Typography>
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

            <Box sx={{ width: { xs: "100%", md: 260 }, minWidth: { xs: "100%", md: 260 }, flexShrink: 0 }}>
              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Hình ảnh sản phẩm</Typography>
                <Box
                  onClick={handleOpenImageDialog}
                  sx={{ border: "2px dashed", borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "grey.50", cursor: "pointer", "&:hover": { borderColor: "primary.light" } }}
                >
                  {imagePreviewUrl ? (
                    <Box sx={{ position: "relative" }}>
                      <img src={imagePreviewUrl} alt="Item" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                      {imageUploading && (
                        <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CircularProgress size={24} sx={{ color: "white" }} />
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
                      <Stack alignItems="center" spacing={1}>
                        <Box sx={{ color: "text.secondary" }}><ImagePlus size={40} /></Box>
                        <Typography variant="body2" color="text.secondary">Keo tha hoac them anh</Typography>
                        <Typography component="span" variant="caption" sx={{ color: "primary.main", fontWeight: 500 }}>Tai anh len tu thiet bi</Typography>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Phân loại</Typography>
                <Stack spacing={2}>
                  <TextField select fullWidth size="small" label="Danh muc" name="categoryId" value={String(form.categoryId ?? "")} onChange={handleChange} sx={selectInputSx}
                    SelectProps={{ displayEmpty: true, renderValue: (v) => catDisplay(v), MenuProps: selectMenuProps }}
                    InputLabelProps={{ shrink: true }}>
                    <MenuItem value="">Chon danh muc</MenuItem>
                    {masterCategories.map((o) => {
                      const code = o.categoryCode ?? o.CategoryCode ?? "";
                      const name = o.categoryName ?? o.CategoryName ?? "";
                      return <MenuItem key={o.categoryId ?? o.CategoryId} value={String(o.categoryId ?? o.CategoryId)}>{code ? code + " - " + name : name}</MenuItem>;
                    })}
                  </TextField>

                  <Autocomplete size="small" fullWidth options={[CREATE_BRAND_OPTION, ...masterBrands.map(normalizeBrand)]} getOptionLabel={(opt) => (opt && opt.name) || ""} value={brandValue}
                    onChange={(e, newValue) => { if (newValue && newValue.id === "CREATE_BRAND") { setCreateBrandOpen(true); return; } setForm((prev) => ({ ...prev, brandId: newValue?.id ?? "" })); }}
                    isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)} ListboxProps={{ sx: autocompleteListboxSx }}
                    renderOption={(props, option) => option && option.id === "CREATE_BRAND" ? <Box component="li" {...props} key={option.id} sx={{ display: "block", py: 1 }}><CreateOptionContent label={option.name} /><Divider sx={{ mt: 1 }} /></Box> : <Box component="li" {...props} key={option.id}>{option.name}</Box>}
                    renderInput={(params) => <TextField {...params} label="Nhan hieu" InputLabelProps={{ shrink: true }} sx={autocompleteFieldSx} />}
                    sx={autocompleteRootSx} />

                  <TextField select fullWidth size="small" label="Loại sản phẩm" name="itemType" value={form.itemType} onChange={handleChange} sx={selectInputSx} SelectProps={{ MenuProps: selectMenuProps }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="Product">Product</MenuItem><MenuItem value="Material">Material</MenuItem><MenuItem value="Service">Service</MenuItem>
                  </TextField>

                  <TextField select fullWidth size="small" label="La thong so" name="laThongSo" value={String(form.laThongSo)} onChange={handleChange} sx={selectInputSx}
                    SelectProps={{ renderValue: (v) => v === "true" ? "Co" : v === "false" ? "Khong" : nbsp, MenuProps: selectMenuProps }} InputLabelProps={{ shrink: true }}>
                    <MenuItem value="false">Khong</MenuItem><MenuItem value="true">Co</MenuItem>
                  </TextField>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2 }}>Tùy chỉnh</Typography>
                <Stack spacing={1.5}>
                  <FormControlLabel control={<Checkbox name="requiresCO" checked={form.requiresCO} onChange={handleChange} />} label="Yeu cau CO" />
                  <FormControlLabel control={<Checkbox name="requiresCQ" checked={form.requiresCQ} onChange={handleChange} />} label="Yeu cau CQ" />
                  <FormControlLabel control={<Checkbox name="isActive" checked={form.isActive} onChange={handleChange} />} label="Dang hoat dong" />
                </Stack>
              </Paper>
            </Box>
          </Box>
        </Box>

        <UomFormDialog open={createUomOpen} onClose={() => setCreateUomOpen(false)}
          onSuccess={async (newUom) => {
            try {
              const { createUom } = await import("../lib/uomService");
              const created = await createUom({ uomName: newUom.uomName });
              refreshAll?.();
              setForm((prev) => ({ ...prev, baseUomId: created.uomId ?? created.id }));
              showToast("Tao don vi tinh thanh cong.", "success");
            } catch (err) {
              showToast(err.message || "Khong tao duoc don vi tinh", "error");
              throw err;
            }
          }} />

        <CreatePackagingSpecDialog open={createPackOpen} onClose={() => setCreatePackOpen(false)}
          onSubmit={async (newItem) => {
            try {
              const created = await createPackagingSpec({ specName: newItem.specName ?? newItem.name, description: newItem.description });
              setPackagingOptions((prev) => [...prev, { id: created.packagingSpecId ?? created.id, name: created.specName ?? created.name }]);
              setForm((prev) => ({ ...prev, packagingSpecId: created.packagingSpecId ?? created.id }));
              showToast("Tao quy cach dong goi thanh cong.", "success");
            } catch (err) {
              showToast(err.message || "Khong tao duoc quy cach", "error");
            }
          }} />

        <CreateSpecDialog open={createSpecOpen} onClose={() => setCreateSpecOpen(false)}
          onSubmit={async (newItem) => {
            try {
              const created = await createItemParameter({ paramCode: newItem.specCode || newItem.paramCode, paramName: newItem.paramName });
              setSpecOptions((prev) => [...prev, { specId: created.paramId ?? created.id, specCode: created.paramCode ?? created.code, specName: created.paramName ?? created.name }]);
              setForm((prev) => ({ ...prev, specId: created.paramId ?? created.id }));
              showToast("Tao thong so san pham thanh cong.", "success");
            } catch (err) {
              showToast(err.message || "Khong tao duoc thong so", "error");
            }
          }} />

        <ImageDialog
          open={imageDialogOpen}
          onClose={handleCloseImageDialog}
          previewUrl={imageDialogTempUrl}
          fileName={imageFileName}
          originalWidth={imageOriginalWidth}
          originalHeight={imageOriginalHeight}
          onBrowseFile={handleDialogBrowseFile}
          onApply={handleApplyImage}
          onRemove={handleRemoveImage}
        />

        <CreateBrandDialog open={createBrandOpen} onClose={() => setCreateBrandOpen(false)}
          onSuccess={({ brandId }) => {
            refreshAll?.();
            if (brandId != null) {
              setForm((prev) => ({ ...prev, brandId }));
            }
          }} />

        {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      </Container>
    </Box>
  );
};

export default EditItem;
