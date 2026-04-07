import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import { X, Settings2, Upload, Trash2 } from 'lucide-react';

export function ImageDialog({
  open,
  onClose,
  previewUrl,
  fileName,
  originalWidth,
  originalHeight,
  onBrowseFile,
  onApply,
  onRemove,
}) {
  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const measureRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const CROP_SIZE_PX = 240;
  const MAX_SCALE = 4;

  useEffect(() => {
    if (!previewUrl) return;
    const img = new window.Image();
    img.onload = () => {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const getContainerSize = () => {
    const el = measureRef.current;
    if (!el) return { w: 0, h: 0 };
    return { w: el.clientWidth, h: el.clientHeight };
  };

  const clampOffset = (sx, sy, currentScale) => {
    const container = getContainerSize();
    if (!container.w || !naturalWidth) return { x: 0, y: 0 };
    const fitScale = Math.min(container.w / naturalWidth, container.h / naturalHeight);
    const imgDisplayW = naturalWidth * fitScale;
    const imgDisplayH = naturalHeight * fitScale;

    const scaledW = imgDisplayW * currentScale;
    const scaledH = imgDisplayH * currentScale;
    const cropHalf = CROP_SIZE_PX / 2;

    const maxOffsetX = Math.max(0, (scaledW / 2) - cropHalf);
    const maxOffsetY = Math.max(0, (scaledH / 2) - cropHalf);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, sx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, sy)),
    };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offsetX,
      baseY: offsetY,
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const clamped = clampOffset(
      dragRef.current.baseX + dx,
      dragRef.current.baseY + dy,
      scale
    );
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!naturalWidth || !naturalHeight) return;

      e.preventDefault();
      e.stopPropagation();

      const container = getContainerSize();
      if (!container.w) return;

      const fitScale = Math.min(container.w / naturalWidth, container.h / naturalHeight);
      const imgDisplayW = naturalWidth * fitScale;
      const imgDisplayH = naturalHeight * fitScale;

      const minScale = Math.max(
        CROP_SIZE_PX / imgDisplayW,
        CROP_SIZE_PX / imgDisplayH
      );

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(minScale, Math.min(MAX_SCALE, scale + delta * scale));
      if (Math.abs(newScale - scale) < 0.001) return;

      const maxOld = Math.max(0, (imgDisplayW * scale / 2) - CROP_SIZE_PX / 2);
      const maxNew = Math.max(0, (imgDisplayW * newScale / 2) - CROP_SIZE_PX / 2);
      const ratioX = maxOld > 0 ? offsetX / maxOld : 0;
      const ratioY = maxOld > 0 ? offsetY / maxOld : 0;
      const newOffsetX = maxNew > 0 ? ratioX * maxNew : 0;
      const newOffsetY = maxNew > 0 ? ratioY * maxNew : 0;

      setScale(newScale);
      const clamped = clampOffset(newOffsetX, newOffsetY, newScale);
      setOffsetX(clamped.x);
      setOffsetY(clamped.y);
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [open, naturalWidth, naturalHeight, scale, offsetX, offsetY]);

  const performCrop = useCallback((callback) => {
    if (!previewUrl || !naturalWidth || !naturalHeight) return;

    const container = getContainerSize();
    if (!container.w || !container.h) return;

    const fitScale = Math.min(container.w / naturalWidth, container.h / naturalHeight);
    const centerX = container.w / 2;
    const centerY = container.h / 2;
    const imgDisplayW = naturalWidth * fitScale;
    const imgDisplayH = naturalHeight * fitScale;

    const imgLayoutX = centerX - (imgDisplayW / 2) * scale + offsetX;
    const imgLayoutY = centerY - (imgDisplayH / 2) * scale + offsetY;

    const frameLayoutX = centerX - CROP_SIZE_PX / 2;
    const frameLayoutY = centerY - CROP_SIZE_PX / 2;

    const cropRect = {
      x: (frameLayoutX - imgLayoutX) / (imgDisplayW * scale),
      y: (frameLayoutY - imgLayoutY) / (imgDisplayH * scale),
      w: CROP_SIZE_PX / (imgDisplayW * scale),
      h: CROP_SIZE_PX / (imgDisplayH * scale),
    };

    const squareSize = Math.min(cropRect.w, cropRect.h);
    const squareX = cropRect.x + (cropRect.w - squareSize) / 2;
    const squareY = cropRect.y + (cropRect.h - squareSize) / 2;

    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 320;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgEl = new window.Image();
    imgEl.onload = () => {
      const srcX = Math.max(0, squareX * imgEl.naturalWidth);
      const srcY = Math.max(0, squareY * imgEl.naturalHeight);
      const srcW = Math.min(imgEl.naturalWidth - srcX, squareSize * imgEl.naturalWidth);
      const srcH = Math.min(imgEl.naturalHeight - srcY, squareSize * imgEl.naturalHeight);
      ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    imgEl.onerror = () => {};
    imgEl.src = previewUrl;
  }, [previewUrl, naturalWidth, naturalHeight, scale, offsetX, offsetY]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onBrowseFile(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleApply = () => {
    performCrop((croppedDataUrl) => {
      onApply(croppedDataUrl);
    });
  };

  const container = getContainerSize();
  const fitScale = container.w && naturalWidth
    ? Math.min(container.w / naturalWidth, container.h / naturalHeight)
    : 1;
  const imgDisplayW = naturalWidth * fitScale;
  const imgDisplayH = naturalHeight * fitScale;
  const centerX = container.w / 2;
  const centerY = container.h / 2;
  const frameHalf = CROP_SIZE_PX / 2;

  const dialogPaperSx = { borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' };
  const dialogTitleSx = {
    px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };
  const dialogContentSx = { px: 3, pt: 2.5, pb: 2 };
  const dialogActionsSx = {
    px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5
  };
  const iconBtnSx = { color: 'text.secondary' };
  const dropZoneStyle = {
    backgroundColor: isDragOver ? '#eff6ff' : '#f8fafc',
    borderRadius: 10,
    border: `2px dashed ${isDragOver ? '#0284c7' : '#e2e8f0'}`,
    padding: 16,
    display: 'block',
    minHeight: 320,
    height: 320,
    marginBottom: 12,
    overflow: 'hidden',
    cursor: !previewUrl ? 'pointer' : 'default',
    position: 'relative',
    userSelect: 'none',
  };
  const emptyStateStyle = {
    textAlign: 'center', color: '#9ca3af', pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', paddingTop: 40,
  };
  const fileChipSx = { fontSize: '12px', bgcolor: '#eff6ff', color: '#0284c7', border: '1px solid #dbeafe' };
  const deleteBtnSx = {
    textTransform: 'none', fontWeight: 500, fontSize: '13px', color: '#dc2626',
    px: 2, mr: 'auto', '&:hover': { bgcolor: 'rgba(220,38,38,0.08)' },
  };
  const cancelBtnSx = { textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary', px: 2 };
  const applyBtnSx = {
    textTransform: 'none', fontWeight: 500, fontSize: '13px', px: 3, py: 0.75, borderRadius: '8px', boxShadow: 'none',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={dialogTitleSx}>
        <Typography component="div" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings2 size={20} />
          Chỉnh ảnh vật tư
        </Typography>
        <IconButton size="small" onClick={onClose} sx={iconBtnSx}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={!previewUrl ? handleBrowseClick : undefined}
          style={dropZoneStyle}
          ref={measureRef}
        >
          {!previewUrl && (
            <div style={emptyStateStyle}>
              <Upload size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
                Kéo thả ảnh vào đây
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#9ca3af', mt: 0.5 }}>
                hoặc nhấn để chọn từ máy
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#cbd5e1', mt: 1 }}>
                Hỗ trợ JPG, PNG, GIF, WEBP
              </Typography>
            </div>
          )}

          {previewUrl && (
            <div
              ref={stageRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                overflow: 'hidden',
                touchAction: 'none',
                userSelect: 'none',
              }}
              onMouseDown={handleMouseDown}
            >
              <div
                style={{
                  position: 'absolute',
                  left: centerX,
                  top: centerY,
                  width: imgDisplayW,
                  height: imgDisplayH,
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
                  transformOrigin: 'center center',
                  willChange: 'transform',
                  zIndex: 1,
                }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: centerX - frameHalf,
                  top: centerY - frameHalf,
                  width: CROP_SIZE_PX,
                  height: CROP_SIZE_PX,
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 12px rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                  zIndex: 10,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: centerX - frameHalf,
                  top: centerY - frameHalf,
                  width: CROP_SIZE_PX,
                  height: CROP_SIZE_PX,
                  pointerEvents: 'none',
                  zIndex: 11,
                }}
              >
                {[33.333, 66.666].map((pct) => (
                  <div key={`h${pct}`} style={{
                    position: 'absolute',
                    top: `${pct}%`,
                    left: 0, right: 0,
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                  }} />
                ))}
                {[33.333, 66.666].map((pct) => (
                  <div key={`v${pct}`} style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 0, bottom: 0,
                    width: 1,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                  }} />
                ))}
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 5,
                  pointerEvents: 'none',
                  clipPath: `polygon(
                    0% 0%, 0% 100%,
                    ${centerX - frameHalf}px 100%,
                    ${centerX - frameHalf}px ${centerY - frameHalf}px,
                    ${centerX + frameHalf}px ${centerY - frameHalf}px,
                    ${centerX + frameHalf}px ${centerY + frameHalf}px,
                    ${centerX - frameHalf}px ${centerY + frameHalf}px,
                    ${centerX - frameHalf}px 100%,
                    100% 100%, 100% 0%
                  )`,
                }}
              />
            </div>
          )}
        </div>

        <Typography sx={{ fontSize: '12px', color: '#94a3b8', mb: 2, textAlign: 'center' }}>
          {previewUrl
            ? 'Kéo ảnh để di chuyển • Cuộn chuột để phóng to / thu nhỏ'
            : 'Kéo thả hoặc nhấn để chọn ảnh'}
        </Typography>

        {fileName && (
          <div style={{ marginBottom: 12 }}>
            <Chip label={fileName} size="small" sx={fileChipSx} />
            {originalWidth && originalHeight && (
              <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.5, display: 'inline-block', ml: 1 }}>
                {originalWidth} x {originalHeight} px
              </Typography>
            )}
          </div>
        )}
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        {previewUrl && (
          <Button
            onClick={onRemove}
            size="small"
            startIcon={<Trash2 size={14} />}
            sx={deleteBtnSx}
          >
            Xóa ảnh
          </Button>
        )}
        <Button onClick={onClose} size="small" sx={cancelBtnSx}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!previewUrl}
          size="small"
          sx={applyBtnSx}
        >
          Áp dụng
        </Button>
      </DialogActions>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file) onBrowseFile(file);
          e.target.value = '';
        }}
      />
    </Dialog>
  );
}
