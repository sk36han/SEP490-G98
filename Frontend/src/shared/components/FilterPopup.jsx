import { Popover, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';
import { useState } from 'react';

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng Hoạt Động' },
];

export function FilterPopup({ anchorEl, open, onClose, filters = {}, onApply, onClear, fields = [], title = 'Bộ lọc' }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => { onApply(localFilters); onClose(); };
  const handleClear = () => { setLocalFilters({}); onClear?.(); onClose(); };
  const handleChange = (field, value) => setLocalFilters(prev => ({ ...prev, [field]: value }));

  return (
    <Popover anchorEl={anchorEl} open={open} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
      <Box sx={{ p: 2, minWidth: 280 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>{title}</Typography>
        {fields.map(field => (
          <Box key={field.name} sx={{ mb: 2 }}>
            {field.type === 'select' ? (
              <FormControl fullWidth size="small">
                <InputLabel>{field.label}</InputLabel>
                <Select value={localFilters[field.name] || ''} label={field.label} onChange={(e) => handleChange(field.name, e.target.value)}>
                  {field.options?.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField fullWidth size="small" label={field.label} value={localFilters[field.name] || ''} onChange={(e) => handleChange(field.name, e.target.value)} type={field.type || 'text'} />
            )}
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={handleClear}>Xóa</Button>
          <Button variant="contained" size="small" onClick={handleApply}>Áp dụng</Button>
        </Box>
      </Box>
    </Popover>
  );
}

export { TRANG_THAI_OPTIONS };
