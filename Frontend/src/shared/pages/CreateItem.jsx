/*
 * Form tạo mới vật tư - refactor UI đồng bộ với ViewItemDetail.
 * Chỉ refactor UI/layout - không thay đổi business logic, validation, payload, API.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  MenuItem,
  Divider,
  Popover,
} from "@mui/material";
import {
  ArrowLeft,
  Package,
  ImagePlus,
  Plus,
  X,
  ChevronDown,
} from "lucide-react";
import Toast from "../../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import { CreateCategoryDialog, CreatePackagingSpecDialog, CreateSpecDialog, ImageDialog, UomFormDialog } from "@ui/dialogs";
import { createItem as createItemApi, uploadItemImage } from "../lib/itemService";
import { getUomList, createUom } from "../lib/uomService";
import { getCategoryList } from "../lib/categoryService";
import { getBrandList } from "../lib/brandService";
import { getPackagingSpecList } from "../lib/packagingSpecService";
import { getItemParameterList } from "../lib/itemParameterService";
import "../styles/CreateSupplier.css";

const FIELD_GAP = 16;
const ROW_HEIGHT = 32;

const LABEL_STYLE = { fontSize: "13px", color: "#64748b", fontWeight: 600 };
const FIELD_WRAPPER = { display: "flex", flexDirection: "column", gap: "4px" };

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
const toArray = (value) => (Array.isArray(value) ? value : []);
const fromPagedResult = (value) => {
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value)) return value;
  return [];
};

const mapUomOption = (u) => ({ id: u.uomId ?? u.UomId ?? u.id, name: u.uomName ?? u.UomName ?? u.name ?? "" });
const mapPackagingOption = (p) => ({ id: p.packagingSpecId ?? p.PackagingSpecId ?? p.id, name: p.specName ?? p.SpecName ?? p.name ?? "" });
const mapCategoryOption = (c) => ({
  id: c.categoryId ?? c.CategoryId ?? c.id,
  code: c.categoryCode ?? c.CategoryCode ?? c.code ?? "",
  name: c.categoryName ?? c.CategoryName ?? c.name ?? "",
});
const mapBrandOption = (b) => ({ id: b.brandId ?? b.BrandId ?? b.id, name: b.brandName ?? b.BrandName ?? b.name ?? "" });
const mapSpecOption = (s) => ({
  specId: s.specificationId ?? s.paramId ?? s.ParamId ?? s.id,
  specCode: s.specificationCode ?? s.paramCode ?? s.ParamCode ?? "",
  specName: s.specificationName ?? s.paramName ?? s.ParamName ?? s.name ?? "",
});

const resolveUomCreated = (raw, fallbackName = "") => {
  const data = raw?.data ?? raw;
  return {
    id: data?.uomId ?? data?.UomId ?? data?.id ?? data?.data?.uomId ?? data?.data?.id,
    name: data?.uomName ?? data?.UomName ?? data?.data?.uomName ?? data?.data?.UomName ?? fallbackName,
  };
};
const resolveCategoryCreated = (raw) => {
  const data = raw?.data ?? raw;
  return {
    id: data?.categoryId ?? data?.id ?? data?.data?.categoryId ?? data?.data?.id,
    name: data?.categoryName ?? data?.CategoryName ?? data?.name ?? data?.data?.categoryName ?? data?.data?.CategoryName ?? "",
    code: data?.categoryCode ?? data?.CategoryCode ?? data?.data?.categoryCode ?? data?.data?.CategoryCode ?? "",
  };
};
const resolvePackagingCreated = (created) => ({
  id: created?.packagingSpecId ?? created?.PackagingSpecId ?? created?.id ?? created?.data?.packagingSpecId ?? created?.data?.id,
  name: created?.specName ?? created?.SpecName ?? created?.data?.specName ?? created?.data?.SpecName ?? "",
});
const resolveSpecCreated = (created) => ({
  id: created?.specificationId ?? created?.paramId ?? created?.ParamId ?? created?.id ?? created?.data?.specificationId ?? created?.data?.id,
  name: created?.specificationName ?? created?.paramName ?? created?.ParamName ?? created?.data?.specificationName ?? created?.data?.paramName ?? "",
});

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

  const [createUomOpen, setCreateUomOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createPackOpen, setCreatePackOpen] = useState(false);
  const [createSpecOpen, setCreateSpecOpen] = useState(false);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  // Image states
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageFileName, setImageFileName] = useState("");
  const [imageOriginalWidth, setImageOriginalWidth] = useState(0);
  const [imageOriginalHeight, setImageOriginalHeight] = useState(0);
  const [imageDialogTempUrl, setImageDialogTempUrl] = useState("");
  const [, setImageUploading] = useState(false);

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
  const handleApplyImage = async (croppedDataUrl) => {
    setImagePreviewUrl(croppedDataUrl);
    setImageDialogOpen(false);

    // Upload cropped image to server immediately
    setImageUploading(true);
    try {
      const fetchRes = await fetch(croppedDataUrl);
      const blob = await fetchRes.blob();
      const fileName = imageFileName || 'item-image.jpg';
      const croppedFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      setImageFile(croppedFile);
      await uploadItemImage(croppedFile);
    } catch (err) {
      console.error('[CreateItem] Image upload error:', err);
      showToast('Tải ảnh lên thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setImageUploading(false);
    }
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
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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
      setUomOptions(toArray(fromPagedResult(uomRes)).map(mapUomOption));
      setPackagingOptions(toArray(fromPagedResult(packList)).map(mapPackagingOption));
      setCategoryOptions(toArray(fromPagedResult(catRes)).map(mapCategoryOption));
      setBrandOptions(toArray(fromPagedResult(brandRes)).map(mapBrandOption));
      setSpecOptions(toArray(fromPagedResult(specRes)).map(mapSpecOption));
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

      // Upload image first if user selected one
      let imageUrl = null;
      if (imageFile) {
        setImageUploading(true);
        try {
          const result = await uploadItemImage(imageFile);
          imageUrl = result.url;
        } catch (uploadErr) {
          console.warn("[CreateItem] Image upload failed:", uploadErr);
        } finally {
          setImageUploading(false);
        }
      }

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
        imageUrls: imageUrl ? [imageUrl] : null,
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
  const allBrandOptions = [...brandOptions];

  return (
    <div className="create-supplier-page create-item-page">
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
            const created = resolveUomCreated(response, uomName);
            if (created.id) {
              setUomOptions((prev) => [...prev, { id: created.id, name: created.name }]);
              setForm((prev) => ({ ...prev, baseUomId: created.id }));
              showToast("Tạo đơn vị tính thành công.", "success");
            }
          } catch (err) {
            showToast(err?.message || "Không tạo được đơn vị tính.", "error");
            throw err;
          }
        }}
      />

      

      <CreateCategoryDialog
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSuccess={async (result) => {
            const created = resolveCategoryCreated(result);
            if (created.id) {
              setLocalMasterCategories((prev) => [...prev, { categoryId: created.id, categoryName: created.name, categoryCode: created.code }]);
              setForm((prev) => ({ ...prev, categoryId: created.id }));
              showToast('Tạo danh mục thành công.', 'success');
            }
        }}
      />

      <CreatePackagingSpecDialog
        open={createPackOpen}
        onClose={() => setCreatePackOpen(false)}
        onSuccess={(created) => {
          const mapped = resolvePackagingCreated(created);
          if (mapped.id) {
            setPackagingOptions((prev) => [...prev, { id: mapped.id, name: mapped.name }]);
            setForm((prev) => ({ ...prev, packagingSpecId: mapped.id }));
            showToast("Tạo quy cách đóng gói thành công.", "success");
          }
        }}
      />

      <CreateSpecDialog
        open={createSpecOpen}
        onClose={() => setCreateSpecOpen(false)}
        onSuccess={(created) => {
          const mapped = resolveSpecCreated(created);
          if (mapped.id) {
            setSpecOptions((prev) => [...prev, { specId: mapped.id, specName: mapped.name, specCode: "" }]);
            setForm((prev) => ({ ...prev, specId: mapped.id }));
            showToast("Tạo thông số thành công.", "success");
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
