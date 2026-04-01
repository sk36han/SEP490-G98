import { Chip } from '@mui/material';

const statusColors = {
  // Generic
  active: 'success',
  inactive: 'default',
  true: 'success',
  false: 'default',

  // Common status
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  draft: 'info',

  // Purchase Order Status
  PENDING_ACC: 'warning',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  DRAFT: 'info',
  CANCELLED: 'error',

  // GRN Status
  COMPLETED: 'success',
  IN_PROGRESS: 'warning',
};

// Map status với label tiếng Việt
const statusLabels = {
  // Generic
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  true: 'Có',
  false: 'Không',

  // Common
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  draft: 'Nháp',

  // Purchase Order Status
  PENDING_ACC: 'Chờ duyệt',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  DRAFT: 'Nháp',
  CANCELLED: 'Đã hủy',

  // GRN Status
  COMPLETED: 'Hoàn thành',
  IN_PROGRESS: 'Đang xử lý',
};

export function StatusBadge({ status, label, colors, sx }) {
  const color = colors?.[status] || statusColors[status] || 'default';
  const displayLabel = label ?? statusLabels[status] ?? status;

  return (
    <Chip
      label={displayLabel}
      color={color}
      size="small"
      sx={{ fontWeight: 500, ...sx }}
    />
  );
}
