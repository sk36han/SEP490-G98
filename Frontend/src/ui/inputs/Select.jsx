import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export function Select({ label, options = [], sx, ...props }) {
  return (
    <FormControl sx={{ minWidth: 120, ...sx }} size="small">
      <InputLabel>{label}</InputLabel>
      <Select {...props} label={label}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
