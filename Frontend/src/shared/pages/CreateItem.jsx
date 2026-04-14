/*
 * Form tạo mới vật tư - refactor UI đồng bộ với ViewItemDetail.
 * Chỉ refactor UI/layout - không thay đổi business logic, validation, payload, API.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
  Autocomplete,
  Paper,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  ArrowLeft,
  Package,
  ImagePlus,
  Plus,
  X,
  CheckCircle,
  ChevronDown,
  Trash2,
  Upload,
} from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import CreateUomDialog from "../components/CreateUomDialog";
import CreatePackagingSpecDialog from "../components/CreatePackagingSpecDialog";
import CreateSpecDialog from "../components/CreateSpecDialog";
import CreateBrandDialog from "../components/CreateBrandDialog";
import { ImageDialog } from "../components/ImageDialog";
import { createItem as createItemApi } from "../lib/itemService";
import { getUomList, createUom } from "../lib/uomService";
import { getPackagingSpecList, createPackagingSpec } from "../lib/packagingSpecService";
import { getCategoryList, createCategory } from "../lib/categoryService";
import { getBrandList, createBrand } from "../lib/brandService";
import { getItemParameterList, createItemParameter } from "../lib/itemParameterService";
import UomFormDialog from "../components/UomFormDialog";
import "../styles/CreateSupplier.css";

// Design tokens (match ViewItemDetail)
const EDIT_BG = "#f8fafc";
const EDIT_BORDER = "#e2e8f0";
const EDIT_FOCUS_BORDER = "#94a3b8";
const EDIT_RADIUS = 8;
const FIELD_GAP = 16;
const ROW_HEIGHT = 32;

const LABEL_STYLE = { fontSize: "13px", color: "#64748b", fontWeight: 600 };
const FIELD_WRAPPER = { display: "flex", flexDirection: "column", gap: "4px" };

const baseEditInput = {
  borderRadius: EDIT_RADIUS,
  backgroundColor: EDIT_BG,
  "& fieldset": { borderColor: EDIT_BORDER, borderRadius: EDIT_RADIUS },
  "&:hover fieldset": { borderColor: "#cbd5e1" },
  "& .MuiOutlinedInput-root.Mui-focused": {
    boxShadow: "0 0 0 2px rgba(148,163,184,0.15)",
    "& fieldset": { borderColor: EDIT_FOCUS_BORDER + " !important" },
  },
};

const editTextSx = {
  "& .MuiOutlinedInput-root": {
    ...baseEditInput,
    minHeight: ROW_HEIGHT,
    fontSize: "14px",
    padding: "0 12px",
    "& .MuiInputBase-input": { padding: "0", fontSize: "14px", color: "#334155" },
    "& .MuiInputBase-input::placeholder": { color: "#9ca3af", opacity: 1 },
  },
  "& .MuiInputLabel-root": {
    fontSize: "13px", color: "#64748b", fontWeight: 600,
    transform: "none", position: "relative", marginBottom: "2px",
    "&.Mui-focused": { color: "#64748b" },
  },
};

const editTextareaSx = {
  ...editTextSx,
  "& .MuiOutlinedInput-root": {
    ...baseEditInput,
    minHeight: "auto",
    padding: "8px 12px",
    alignItems: "flex-start",
    "& .MuiInputBase-input": { padding: "0", fontSize: "14px", color: "#334155", lineHeight: 1.6 },
    "& .MuiInputBase-input::placeholder": { color: "#9ca3af", opacity: 1 },
  },
};

const selectMenuProps = {
  PaperProps: { sx: { borderRadius: 2, maxHeight: 280 } },
  disableScrollLock: true,
};

// Form constants
const INITIAL_FORM = {
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
  purchasePrice: "",
  onHandQty: "",
  reservedQty: "",
};

const NUMBER_FIELDS = new Set([
  "categoryId", "brandId", "baseUomId", "packagingSpecId", "specId",
  "purchasePrice", "onHandQty", "reservedQty",
]);

// Shared UI components (matching ViewItemDetail)
/** Giá trị gửi API giữ nguyên (backend ItemType); label hiển thị tiếng Việt. */
const ITEM_TYPE_OPTIONS = [
  { value: "Product", label: "Sản phẩm" },
  { value: "Material", label: "Nguyên vật liệu" },
  { value: "Service", label: "Dịch vụ" },
];
// StatusBadge
const StatusBadge = ({ active }) => {
  const config = active
    ? { label: "Đang giao dịch", color: "#047857", bg: "rgba(16,185,129,0.18)", icon: <CheckCircle size={16} /> }
    : { label: "Tạm dừng", color: "#b91c1c", bg: "rgba(239,68,68,0.15)", icon: <X size={16} /> };
  return (
    <div style={{
      padding: "6px 14px", borderRadius: 20,
      backgroundColor: config.bg, color: config.color,
      fontWeight: 600, fontSize: "13px",
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
    }}>
      {config.icon}
      {config.label}
    </div>
  );
};

// EditUnderline - TextField gạch chân
const EditUnderline = ({ value, onChange, placeholder, name, ...props }) => (
  <TextField
    fullWidth size="small"
    name={name}
    value={value ?? ""}
    onChange={onChange}
    placeholder={placeholder}
    variant="standard"
    sx={{
      "& .MuiInput-root": {
        fontSize: "14px", fontWeight: 500, color: "#334155",
        minHeight: ROW_HEIGHT,
        padding: "0 0 6px 0",
        alignItems: "center",
        "&:before": { borderBottom: "1px solid rgba(0,0,0,0.1)" },
        "&:hover:not(.Mui-disabled):before": { borderBottom: "1px solid #3b82f6" },
        "&:after": { borderBottom: "1px solid #3b82f6" },
      },
      "& .MuiInput-input": {
        padding: "0 0 0 0", fontSize: "14px", fontWeight: 500, color: "#334155",
        "&::placeholder": { color: "#9ca3af", opacity: 1 },
      },
    }}
    {...props}
  />
);

// CheckboxToggle (matches Detail style)
const CheckboxToggle = ({ checked, onChange, labelTrue, labelFalse, name, onValueChange }) => {
  const handleToggle = (e) => {
    e.preventDefault();
    const newVal = !checked;
    if (onValueChange) {
      onValueChange(newVal);
    } else if (onChange) {
      onChange({ target: { name, value: newVal, type: "checkbox", checked: newVal } });
    }
  };
  return (
    <span
      onClick={handleToggle}
      style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        cursor: "pointer", userSelect: "none", padding: "4px 0",
        fontSize: "14px", fontWeight: 500,
        color: checked ? "#1d4ed8" : "#334155",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 4,
        border: "2px solid " + (checked ? "#3b82f6" : "#cbd5e1"),
        backgroundColor: checked ? "#3b82f6" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", flexShrink: 0,
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span>{checked ? labelTrue : labelFalse}</span>
    </span>
  );
};

// EditSelectUnderline - Select kiểu gạch chân (match Detail)
const EditSelectUnderline = ({ value, onChange, options, placeholder, renderValue, name = "", onAddNew }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    handleClose();
  };

  const selected = options.find((o) => String(o.value ?? o.id ?? o) === String(value));
  const display = selected ? (renderValue ? renderValue(selected) : (selected.label ?? selected.name ?? selected)) : (placeholder || "Chọn...");

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          padding: "0 0 6px 0",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          fontSize: "14px", fontWeight: 500,
          color: selected ? "#334155" : "#9ca3af",
          minHeight: ROW_HEIGHT,
          display: "flex", alignItems: "center",
          cursor: "pointer", gap: 4,
          position: "relative",
        }}
      >
        <span style={{ flex: 1 }}>{display}</span>
        <ChevronDown size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
      </div>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: anchorEl?.offsetWidth || 220 } }}
      >
        {options.map((opt) => {
          const optVal = opt.value ?? opt.id ?? opt;
          const optLabel = opt.label ?? opt.name ?? opt;
          const isSelected = String(optVal) === String(value);
          const itemFontWeight = isSelected ? 600 : 400;
          const itemColor = isSelected ? "#3b82f6" : "#334155";
          return (
            <MenuItem
              key={optVal}
              value={optVal}
              onClick={() => handleSelect(optVal)}
              sx={{ fontSize: "14px", fontWeight: itemFontWeight, color: itemColor, gap: 1 }}
            >
              {optLabel}
            </MenuItem>
          );
        })}
        {onAddNew && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => { handleClose(); onAddNew(); }}
              sx={{ fontSize: "14px", color: "#3b82f6", gap: 1 }}
            >
              <Plus size={14} />
              Thêm mới
            </MenuItem>
          </>
        )}
      </Popover>
    </>
  );
};

// DescriptionBlock - textarea gạch chân
const DescriptionBlock = ({ value, onChange, maxLength = 250, placeholder = "Nhập mô tả vật tư..." }) => (
  <div>
    <TextField
      fullWidth size="small"
      name="description"
      value={value}
      onChange={onChange}
      multiline rows={3} variant="standard"
      inputProps={{ maxLength }}
      placeholder={placeholder}
      sx={{
        "& .MuiInput-root": {
          fontSize: "14px", color: "#334155",
          lineHeight: 1.6,
          "&:before": { borderBottom: "1px solid rgba(0,0,0,0.1)" },
          "&:hover:not(.Mui-disabled):before": { borderBottom: "1px solid #3b82f6" },
          "&:after": { borderBottom: "1px solid #3b82f6" },
        },
        "& .MuiInput-inputMultiline": { padding: "0" },
      }}
    />
  </div>
);

// Inline CreateCategoryDialog
function InlineCreateCategoryDialog({ open, onClose, onSubmit }) {
  const [categoryName, setCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setCategoryName(""); setSubmitting(false); setError(null); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (categoryName || "").trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ categoryName: name });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? "Không thể tạo danh mục.");
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)" } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "18px", color: "text.primary" }}>Thêm danh mục</Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary", "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}><X size={20} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: "12px", color: "text.secondary", display: "block", mb: 0.5 }}>Tên danh mục</Typography>
          <Box
            component="input" type="text" value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(e); }}
            placeholder="VD: Vật tư điện tử" autoFocus
            sx={{
              width: "100%", border: "none", outline: "none",
              borderBottom: `1px solid ${error ? "#ef4444" : "rgba(0,0,0,0.1)"}`,
              pb: 1, fontSize: "14px", color: "text.primary", bgcolor: "transparent",
              "&:focus": { borderBottom: error ? "#ef4444" : "#0284c7" },
              "&::placeholder": { color: "#9ca3af", fontSize: "14px" },
            }}
          />
          {error && <Typography sx={{ fontSize: "12px", color: "#ef4444", mt: 0.5 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, borderTop: "1px solid rgba(0,0,0,0.06)", gap: 1.5 }}>
          <Button onClick={onClose} size="small" sx={{ textTransform: "none", fontWeight: 500, fontSize: "13px", color: "text.secondary", px: 2, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}>Hủy</Button>
          <Button type="submit" variant="contained" disabled={submitting || !categoryName.trim()} size="small" sx={{ textTransform: "none", fontWeight: 500, fontSize: "13px", px: 3, py: 0.75, borderRadius: "8px", boxShadow: "none", "&:hover": { boxShadow: "0 2px 8px rgba(25,118,210,0.24)" } }}>
            {submitting ? "Đang lưu…" : "Thêm"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}


// Main Component
const CreateItem = () => {
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const timerRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const [uomOptions, setUomOptions] = useState([]);
  const [packagingOptions, setPackagingOptions] = useState([]);
  const [specOptions, setSpecOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);

  // Local options for create-new
  const [localMasterCategories, setLocalMasterCategories] = useState([]);
  const [localMasterBrands, setLocalMasterBrands] = useState([]);

  const [createUomOpen, setCreateUomOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [createSpecOpen, setCreateSpecOpen] = useState(false);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  // Image states
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageFileName, setImageFileName] = useState("");
  const [imageOriginalWidth, setImageOriginalWidth] = useState(0);
  const [imageOriginalHeight, setImageOriginalHeight] = useState(0);
  const [imageDialogTempUrl, setImageDialogTempUrl] = useState("");

  // Open image dialog
  const handleOpenImageDialog = () => {
    setImageDialogTempUrl(imagePreviewUrl);
    setImageDialogOpen(true);
  };

  // Handle file selected from dialog
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

  // Apply cropped image from dialog (receives pre-cropped dataURL from ImageDialog)
  const handleApplyImage = (croppedDataUrl) => {
    setImagePreviewUrl(croppedDataUrl);
    setImageDialogOpen(false);
  };

  // Remove image
  const handleRemoveImage = () => {
    if (imageDialogTempUrl && imageDialogTempUrl !== "" && imageDialogTempUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imageDialogTempUrl);
    }
    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl("");
    setImageFile(null);
    setImageFileName("");
    setImageOriginalWidth(0);
    setImageOriginalHeight(0);
    setImageDialogOpen(false);
    setImageDialogTempUrl("");
  };

  // Close dialog without applying
  const handleCloseImageDialog = () => {
    if (imageDialogTempUrl && imageDialogTempUrl !== imagePreviewUrl && imageDialogTempUrl !== "" && !imageDialogTempUrl.startsWith("data:")) {
      URL.revokeObjectURL(imageDialogTempUrl);
    }
    setImageDialogOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, []);

  const PAGE_SIZE = 100;

  const loadOptions = useCallback(async () => {
    try {
      const [uomRes, packList, catRes, brandRes, specRes] = await Promise.all([
        getUomList({ page: 1, pageSize: PAGE_SIZE }),
        getPackagingSpecList(),
        getCategoryList({ page: 1, pageSize: PAGE_SIZE }),
        getBrandList({ page: 1, pageSize: PAGE_SIZE }),
        getItemParameterList({ page: 1, pageSize: PAGE_SIZE }),
      ]);
      const uomItems = Array.isArray(uomRes?.items) ? uomRes.items : (Array.isArray(uomRes) ? uomRes : []);
      setUomOptions(uomItems.map((u) => ({ id: u.uomId ?? u.UomId, name: u.uomName ?? u.UomName ?? "" })));
      const packArr = Array.isArray(packList) ? packList : [];
      setPackagingOptions(packArr.map((p) => ({ id: p.packagingSpecId ?? p.PackagingSpecId, name: p.specName ?? p.SpecName ?? "" })));
      const catItems = Array.isArray(catRes?.items) ? catRes.items : (Array.isArray(catRes) ? catRes : []);
      setCategoryOptions(catItems.map((c) => ({
        id: c.categoryId ?? c.CategoryId,
        code: c.categoryCode ?? c.CategoryCode ?? "",
        name: c.categoryName ?? c.CategoryName ?? "",
      })));
      const brandItems = Array.isArray(brandRes?.items) ? brandRes.items : (Array.isArray(brandRes) ? brandRes : []);
      setBrandOptions(brandItems.map((b) => ({ id: b.brandId ?? b.BrandId, name: b.brandName ?? b.BrandName ?? "" })));
      const specItems = Array.isArray(specRes?.items) ? specRes.items : (Array.isArray(specRes) ? specRes : []);
      setSpecOptions(specItems.map((s) => ({
        specId: s.paramId ?? s.ParamId,
        specCode: s.paramCode ?? s.ParamCode ?? "",
        specName: s.paramName ?? s.ParamName ?? "",
      })));
    } catch { /* keep empty on error */ }
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = (form.itemName ?? "").trim();
    if (!name) {
      showToast("Vui lòng nhập tên sản phẩm.", "error");
      return;
    }
    const categoryId = form.categoryId !== "" && form.categoryId != null ? Number(form.categoryId) : null;
    const baseUomId = form.baseUomId !== "" && form.baseUomId != null ? Number(form.baseUomId) : null;
    if (categoryId == null || Number.isNaN(categoryId)) {
      showToast("Vui lòng chọn danh mục.", "error");
      return;
    }
    if (baseUomId == null || Number.isNaN(baseUomId)) {
      showToast("Vui lòng chọn đơn vị tính.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const specId = form.specId !== "" && form.specId != null ? Number(form.specId) : null;
      const payload = {
        itemName: name,
        itemType: form.itemType || null,
        description: form.description?.trim() || null,
        categoryId,
        brandId: form.brandId !== "" && form.brandId != null ? Number(form.brandId) : null,
        baseUomId,
        packagingSpecId: form.packagingSpecId !== "" && form.packagingSpecId != null ? Number(form.packagingSpecId) : null,
        specId: specId,
        hasSpecifications: Boolean(form.laThongSo),
        requiresCo: Boolean(form.requiresCO),
        requiresCq: Boolean(form.requiresCQ),
        isActive: Boolean(form.isActive),
        initialPurchasePrice: form.purchasePrice !== "" && form.purchasePrice != null && !Number.isNaN(Number(form.purchasePrice)) ? Number(form.purchasePrice) : null,
        priceEffectiveFrom: null,
      };
      await createItemApi(payload);
      showToast("Tạo sản phẩm thành công.", "success");
      timerRef.current = setTimeout(() => navigate("/products"), 1200);
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Không tạo được vật tư. Vui lòng thử lại.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => { navigate(-1); };
  const handleCancel = () => { setForm({ ...INITIAL_FORM }); navigate("/products"); };

  const allCategoryOptions = [...categoryOptions, ...localMasterCategories];
  const allBrandOptions = [...brandOptions, ...localMasterBrands];

  return (
    <div className="create-supplier-page">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-left">
          <button type="button" onClick={handleBack} className="back-button">
            <ArrowLeft size={20} />
            <span>Quay lại danh sách</span>
          </button>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-cancel" onClick={handleCancel} disabled={submitting}>
            <X size={15} />
            Hủy
          </button>
          <button
            type="submit"
            form="create-item-form"
            className="btn btn-primary"
            disabled={submitting}
          >
            <Package size={15} />
            Tạo vật tư
          </button>
        </div>
      </div>

      <div className="form-card">
        <form id="create-item-form" onSubmit={handleSubmit}>
          <div className="form-wrapper">
            {/* FORM CARD INTRO */}
            <div className="form-card-intro">
              <h1 className="page-title">Tạo mới vật tư</h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "8px 0 0 0" }}>
                Mã vật tư sẽ được hệ thống tự sinh sau khi tạo.
              </p>
            </div>

            {/* MAIN GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: "24px", alignItems: "start" }}>

              {/* ══════════════════════════════════════════════ */}
              {/* LEFT COLUMN */}
              {/* ══════════════════════════════════════════════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* CARD 1: Thông tin chung */}
                <div className="info-section" style={{ margin: 0 }}>
                  <div className="section-header-with-toggle">
                    <h2 className="section-title">Thông tin chung</h2>
                  </div>

                  {/* Ảnh bên trái | Tên + Thương hiệu + Mô tả bên phải */}
                  <div style={{ display: "flex", gap: FIELD_GAP, alignItems: "flex-start" }}>
                    {/* Ảnh vật tư */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {/* Ô ảnh */}
                      <div style={{
                        width: 160, minWidth: 160, height: 160, borderRadius: 12,
                        border: "1px solid #e5e7eb", backgroundColor: "#f1f5f9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", flexShrink: 0,
                      }}>
                        {imagePreviewUrl ? (
                          <img
                            src={imagePreviewUrl}
                            alt="Vật tư"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <ImagePlus size={72} color="#cbd5e1" />
                        )}
                      </div>

                      {/* Nút hành động bên dưới ảnh */}
                      <button
                        type="button"
                        className={`btn-image-action ${imagePreviewUrl ? "btn-image-primary" : "btn-image-primary"}`}
                        onClick={handleOpenImageDialog}
                      >
                        <ImagePlus size={13} />
                        {imagePreviewUrl ? "Đổi ảnh" : "Thêm ảnh"}
                      </button>
                    </div>

                    {/* Info panel */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                      {/* Tên vật tư */}
                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Tên vật tư</div>
                        <EditUnderline
                          name="itemName"
                          value={form.itemName}
                          onChange={handleChange}
                          placeholder="VD: Mũ Beanie Nam Đẹp"
                        />
                      </div>

                      {/* Thương hiệu */}
                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Loại vật tư</div>
                        <EditSelectUnderline
                          name="itemType"
                          value={form.itemType || "Product"}
                          onChange={handleChange}
                          options={ITEM_TYPE_OPTIONS}
                          placeholder="Chọn loại vật tư"
                        />
                      </div>

                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Thương hiệu</div>
                        <EditSelectUnderline
                          name="brandId"
                          value={String(form.brandId ?? "")}
                          onChange={handleChange}
                          options={allBrandOptions.map((o) => ({
                            value: String(o.brandId ?? o.id),
                            label: o.brandName ?? o.name,
                          }))}
                          placeholder="Chọn nhãn hiệu"
                          onAddNew={() => setCreateBrandOpen(true)}
                        />
                      </div>

                      {/* Mô tả */}
                      <div style={FIELD_WRAPPER}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={LABEL_STYLE}>Mô tả</div>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {form.description?.length ?? 0}/250
                          </span>
                        </div>
                        <DescriptionBlock
                          value={form.description}
                          onChange={handleChange}
                          maxLength={250}
                          placeholder="Nhập mô tả vật tư..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Thông tin giá */}
                <div className="info-section" style={{ margin: 0 }}>
                  <div className="section-header-with-toggle">
                    <h2 className="section-title">Thông tin giá</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={FIELD_WRAPPER}>
                      <CheckboxToggle
                        checked={showPurchasePrice}
                        onValueChange={(val) => setShowPurchasePrice(val)}
                        labelTrue="Thêm giá vốn"
                        labelFalse="Thêm giá vốn"
                      />
                    </div>

                    {showPurchasePrice && (
                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Giá vốn</div>
                        <EditUnderline
                          name="purchasePrice"
                          value={form.purchasePrice}
                          onChange={handleChange}
                          placeholder="0"
                          type="number"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* RIGHT COLUMN */}
              {/* ══════════════════════════════════════════════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* CARD: Thông tin hệ thống */}
                <div className="info-section" style={{ margin: 0 }}>
                  <div className="section-header-with-toggle">
                    <h2 className="section-title">Thông tin hệ thống</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                    {/* Nhóm 1 */}
                    <div style={FIELD_WRAPPER}>
                      <div style={LABEL_STYLE}>Trạng thái</div>
                      <CheckboxToggle
                        checked={form.isActive}
                        onChange={handleChange}
                        name="isActive"
                        labelTrue="Đang giao dịch"
                        labelFalse="Tạm dừng"
                      />
                    </div>

                    <div style={FIELD_WRAPPER}>

                      <div style={LABEL_STYLE}>Danh mục</div>
                      <EditSelectUnderline
                        name="categoryId"
                        value={String(form.categoryId ?? "")}
                        onChange={handleChange}
                        options={allCategoryOptions.map((o) => ({
                          value: String(o.categoryId ?? o.id),
                          label: o.categoryCode ? o.categoryCode + " - " + (o.categoryName ?? o.name) : (o.categoryName ?? o.name),
                        }))}
                        placeholder="Chọn danh mục"
                        onAddNew={() => setCreateCategoryOpen(true)}
                      />
                    </div>

                    {/* Nhóm 2 */}
                    <div style={FIELD_WRAPPER}>
                      <div style={LABEL_STYLE}>Đơn vị tính</div>
                      <EditSelectUnderline
                        name="baseUomId"
                        value={String(form.baseUomId ?? "")}
                        onChange={handleChange}
                        options={uomOptions.map((o) => ({ value: String(o.id), label: o.name }))}
                        placeholder="Chọn đơn vị tính"
                        onAddNew={() => setCreateUomOpen(true)}
                      />
                    </div>

                    <div style={FIELD_WRAPPER}>
                      <div style={LABEL_STYLE}>Quy cách đóng gói</div>
                      <EditSelectUnderline
                        name="packagingSpecId"
                        value={String(form.packagingSpecId ?? "")}
                        onChange={handleChange}
                        options={packagingOptions.map((o) => ({ value: String(o.id), label: o.name }))}
                        placeholder="Chọn quy cách đóng gói"
                        onAddNew={() => setCreatePackOpen(true)}
                      />
                    </div>

                    <div style={FIELD_WRAPPER}>
                      <div style={LABEL_STYLE}>Thông số sản phẩm</div>
                      <EditSelectUnderline
                        name="specId"
                        value={String(form.specId ?? "")}
                        onChange={handleChange}
                        options={specOptions.map((o) => ({ value: String(o.specId), label: o.specName }))}
                        placeholder="Chọn thông số sản phẩm"
                        onAddNew={() => setCreateSpecOpen(true)}
                      />
                    </div>

                    {/* Nhóm 3: CO + CQ */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: FIELD_GAP }}>
                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Yêu cầu CO</div>
                        <CheckboxToggle
                          checked={form.requiresCO}
                          onChange={handleChange}
                          name="requiresCO"
                          labelTrue="Có"
                          labelFalse="Không"
                        />
                      </div>
                      <div style={FIELD_WRAPPER}>
                        <div style={LABEL_STYLE}>Yêu cầu CQ</div>
                        <CheckboxToggle
                          checked={form.requiresCQ}
                          onChange={handleChange}
                          name="requiresCQ"
                          labelTrue="Có"
                          labelFalse="Không"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Image Dialog */}
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

      {/* Dialogs */}
      <UomFormDialog
        open={createUomOpen}
        onClose={() => setCreateUomOpen(false)}
        onSuccess={async ({ uomName }) => {
          try {
            const response = await createUom({ uomName });
            const data = response?.data ?? response;
            const newId = data?.uomId ?? data?.UomId ?? data?.id;
            if (newId) {
              setUomOptions((prev) => [...prev, { id: newId, name: data?.uomName ?? uomName }]);
              setForm((prev) => ({ ...prev, baseUomId: newId }));
              showToast("Tạo đơn vị tính thành công.", "success");
            }
          } catch (err) {
            showToast(err?.message || "Không tạo được đơn vị tính.", "error");
            throw err;
          }
        }}
      />

      <CreatePackagingSpecDialog
        open={createPackOpen}
        onClose={() => setCreatePackOpen(false)}
        onSubmit={async (newItem) => {
          try {
            const created = await createPackagingSpec({ specName: newItem.specName ?? newItem.name, description: newItem.description });
            const newId = created?.packagingSpecId ?? created?.id;
            if (newId) {
              setPackagingOptions((prev) => [...prev, { id: newId, name: created.specName ?? created.name }]);
              setForm((prev) => ({ ...prev, packagingSpecId: newId }));
              showToast("Tạo quy cách đóng gói thành công.", "success");
            }
          } catch (err) {
            showToast(err?.message || "Không tạo được quy cách.", "error");
          }
        }}
      />

      <CreateSpecDialog
        open={createSpecOpen}
        onClose={() => setCreateSpecOpen(false)}
        onSubmit={async (newItem) => {
          try {
            const created = await createItemParameter({ paramCode: newItem.specCode || newItem.paramCode, paramName: newItem.paramName });
            const newId = created?.paramId ?? created?.id;
            if (newId) {
              setSpecOptions((prev) => [...prev, {
                specId: newId,
                specCode: created?.paramCode ?? created?.code ?? "",
                specName: created?.paramName ?? created?.name ?? "",
              }]);
              setForm((prev) => ({ ...prev, specId: newId }));
              showToast("Tạo thông số sản phẩm thành công.", "success");
            }
          } catch (err) {
            showToast(err?.message || "Không tạo được thông số.", "error");
          }
        }}
      />

      <CreateBrandDialog
        open={createBrandOpen}
        onClose={() => setCreateBrandOpen(false)}
        onSuccess={async ({ brandId, brandName }) => {
          if (brandId != null) {
            const newBrand = { brandId, brandName };
            setLocalMasterBrands((prev) => [...prev, newBrand]);
            setForm((prev) => ({ ...prev, brandId }));
            showToast("Tạo nhãn hiệu thành công.", "success");
          }
        }}
      />

      <InlineCreateCategoryDialog
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSubmit={async ({ categoryName }) => {
          try {
            const response = await createCategory({ categoryName });
            const data = response?.data ?? response;
            const newId = data?.categoryId ?? data?.id;
            if (newId) {
              const newCategory = {
                categoryId: newId,
                categoryName: data?.categoryName ?? data?.name ?? categoryName,
                categoryCode: data?.categoryCode ?? "",
              };
              setLocalMasterCategories((prev) => [...prev, newCategory]);
              setForm((prev) => ({ ...prev, categoryId: newId }));
              showToast("Tạo danh mục thành công.", "success");
            }
          } catch (err) {
            showToast(err?.message || "Không tạo được danh mục.", "error");
            throw err;
          }
        }}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </div>
  );
};

export default CreateItem;
