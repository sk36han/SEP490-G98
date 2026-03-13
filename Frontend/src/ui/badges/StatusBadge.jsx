import { Chip } from '@mui/material';

const statusColors = {
  active: 'success',
  inactive: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  draft: 'info',
};

export function StatusBadge({ status, label, colors, sx }) {
  const color = colors?.[status] || statusColors[status] || 'default';
  const displayLabel = label ?? status;

  return (
    <Chip
      label={displayLabel}
      color={color}
      size="small"
      sx={{ fontWeight: 500, ...sx }}
    />
  );
}
