import { Chip } from '@mui/material';

/**
 * Unified StatusBadge component.
 * Renders MUI Chip with standardized colors and Vietnamese labels for all domains.
 *
 * @param {string}   props.status     - Status key (e.g. 'APPROVED', 'COMPLETED', 'DRAFT')
 * @param {string}   [props.label]    - Override label (optional)
 * @param {string}   [props.dot]      - Prefix dot character (optional, e.g. '•')
 * @param {string}   [props.variant]  - 'filled' (default) | 'dot' (dot + label)
 * @param {object}   [props.colors]    - Per-status color override map
 * @param {object}   [props.sx]        - MUI sx prop
 */
export function StatusBadge({ status, label, dot, variant = 'filled', colors, sx }) {
  const config = {
    // Generic boolean (for isActive, active flag)
    true:              { bgcolor: 'rgba(16,185,129,0.15)',  color: '#16a34a', label: 'Hoạt động' },
    false:             { bgcolor: 'rgba(239,68,68,0.15)',   color: '#dc2626', label: 'Ngừng hoạt động' },
    active:            { bgcolor: 'rgba(16,185,129,0.15)',  color: '#16a34a', label: 'Hoạt động' },
    inactive:          { bgcolor: 'rgba(239,68,68,0.15)',   color: '#dc2626', label: 'Ngừng hoạt động' },
    isActive:          { bgcolor: 'rgba(16,185,129,0.15)',  color: '#16a34a', label: 'Hoạt động' },
    isInactive:        { bgcolor: 'rgba(239,68,68,0.15)',   color: '#dc2626', label: 'Ngừng hoạt động' },

    // Common
    pending:           { bgcolor: 'rgba(251,191,36,0.20)',  color: '#92400e', label: 'Chờ duyệt' },
    approved:          { bgcolor: 'rgba(16,185,129,0.18)',  color: '#065f46', label: 'Đã duyệt' },
    rejected:          { bgcolor: 'rgba(239,68,68,0.15)',   color: '#991b1b', label: 'Từ chối' },
    draft:             { bgcolor: 'rgba(107,114,128,0.15)', color: '#374151', label: 'Nháp' },

    // Purchase Order Status
    PENDING:           { bgcolor: 'rgba(251,191,36,0.20)',  color: '#b45309', label: 'Chờ duyệt' },
    PENDING_ACC:       { bgcolor: 'rgba(251,191,36,0.20)',  color: '#b45309', label: 'Chờ kế toán duyệt' },
    PENDING_DIR:       { bgcolor: 'rgba(251,191,36,0.20)',  color: '#b45309', label: 'Chờ giám đốc duyệt' },
    PENDING_ISSUE:     { bgcolor: 'rgba(14,165,233,0.18)',  color: '#0369a1', label: 'Chuẩn bị hàng' },
    APPROVED:          { bgcolor: 'rgba(16,185,129,0.18)',  color: '#047857', label: 'Đã duyệt' },
    REJECTED:          { bgcolor: 'rgba(239,68,68,0.18)',   color: '#b91c1c', label: 'Từ chối' },
    DRAFT:             { bgcolor: 'rgba(107,114,128,0.2)', color: '#4b5563', label: 'Nháp' },
    SENT:              { bgcolor: 'rgba(59,130,246,0.15)', color: '#1d4ed8', label: 'Đã gửi báo giá' },
    CONFIRMED:         { bgcolor: 'rgba(16,185,129,0.18)', color: '#047857', label: 'Đã chốt báo giá' },
    CANCELLED:         { bgcolor: 'rgba(239,68,68,0.18)',   color: '#b91c1c', label: 'Đã hủy' },

    // Purchase Order - Receiving Status
    PendingRcv:        { bgcolor: 'rgba(59,130,246,0.18)', color: '#1d4ed8', label: 'Đang đợi hàng về' },
    /** Alias backend / API spelling */
    PartiallyRcv:      { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Nhận một phần' },
    PartialRcv:        { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Đã về một phần hàng' },
    PartRcv:           { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Đã về một phần hàng' },
    Received:          { bgcolor: 'rgba(16,185,129,0.18)', color: '#065f46', label: 'Đã về đủ hàng' },
    FullRcv:           { bgcolor: 'rgba(16,185,129,0.18)', color: '#065f46', label: 'Đã về đủ hàng' },
    Closed:            { bgcolor: 'rgba(107,114,128,0.2)', color: '#4b5563', label: 'Đã đóng' },
    Cancelled:         { bgcolor: 'rgba(239,68,68,0.18)', color: '#b91c1c', label: 'Đã hủy' },

    // GRN / Good Receipt Note Status
    SUBMITTED:         { bgcolor: 'rgba(59,130,246,0.15)',  color: '#1d4ed8', label: 'Đã gửi duyệt' },
    COMPLETED:         { bgcolor: 'rgba(16,185,129,0.18)',  color: '#065f46', label: 'Hoàn thành' },
    IN_PROGRESS:       { bgcolor: 'rgba(251,191,36,0.20)',  color: '#92400e', label: 'Đang xử lý' },
    POSTED:            { bgcolor: 'rgba(139,92,246,0.15)',  color: '#7c3aed', label: 'Đã ghi sổ' },

    // GRN Receiving Status
    NotStarted:        { bgcolor: 'rgba(107,114,128,0.15)', color: '#374151', label: 'Chưa nhập' },
    Partial:           { bgcolor: 'rgba(251,191,36,0.20)',  color: '#92400e', label: 'Nhập một phần' },

    // GDN / Good Delivery Note Status
    ISSUED:            { bgcolor: 'rgba(139,92,246,0.18)',  color: '#6d28d9', label: 'Đã xuất hàng' },
    DELIVERING:        { bgcolor: 'rgba(59,130,246,0.18)',  color: '#1d4ed8', label: 'Đang giao' },
    DELIVERED:         { bgcolor: 'rgba(16,185,129,0.18)',  color: '#047857', label: 'Đã giao' },

    // Purchase Return Status
    RETURNED:          { bgcolor: 'rgba(16,185,129,0.18)', color: '#065f46', label: 'Đã trả hàng' },
    PARTIAL_RETURN:    { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Trả một phần' },

    // Stocktake Status
    STOCK_DRAFT:           { bgcolor: 'rgba(107,114,128,0.2)',  color: '#4b5563', label: 'Nháp' },
    STOCK_IN_PROGRESS:     { bgcolor: 'rgba(59,130,246,0.18)', color: '#1d4ed8', label: 'Đang thực hiện' },
    STOCK_PENDING_APPROVAL:{ bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Chờ duyệt kế hoạch' },
    STOCK_PENDING_RESULTADJ:{ bgcolor: 'rgba(245,158,11,0.22)', color: '#b45309', label: 'Chờ duyệt kết quả' },
    STOCK_COMPLETED:       { bgcolor: 'rgba(16,185,129,0.18)', color: '#047857', label: 'Hoàn thành' },
    STOCK_APPROVED:        { bgcolor: 'rgba(16,185,129,0.18)', color: '#047857', label: 'Được duyệt' },

    // Stocktake Mode
    PERIODIC:         { bgcolor: 'rgba(59,130,246,0.18)', color: '#1d4ed8', label: 'Định kỳ' },
    ADHOC:            { bgcolor: 'rgba(168,85,247,0.18)', color: '#7c3aed', label: 'Đột xuất' },

    // Release Request Lifecycle
    IssueFull:        { bgcolor: 'rgba(16,185,129,0.15)', color: '#065f46', label: 'Xuất đủ hàng' },
    IssuePartial:     { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Xuất một phần hàng' },
    IssuePending:     { bgcolor: 'rgba(59,130,246,0.15)', color: '#1e40af', label: 'Đang đợi xuất hàng' },
    RR_DRAFT_PENDING_SUBMIT: { bgcolor: 'rgba(107,114,128,0.15)', color: '#4b5563', label: 'Chưa gửi duyệt' },

    // Release Request Status
    RELEASED:         { bgcolor: 'rgba(16,185,129,0.15)', color: '#065f46', label: 'Đã xuất kho' },
    PARTIAL_RELEASE:  { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Xuất kho một phần' },

    // Inventory Adjustment Status
    ADJUSTED:         { bgcolor: 'rgba(16,185,129,0.18)', color: '#065f46', label: 'Đã điều chỉnh' },

    // Supplier Status
    ACTIVE:           { bgcolor: 'rgba(16,185,129,0.15)', color: '#16a34a', label: 'Hoạt động' },
    INACTIVE:         { bgcolor: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Ngừng hoạt động' },

    // Delivery Status
    PENDING_DELIVERY: { bgcolor: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Chờ giao' },
  };

  const merged = { ...config, ...(colors ?? {}) };
  const matched = merged[status]
    ?? merged[String(status).toLowerCase()]
    ?? merged[String(status).toUpperCase()]
    ?? { bgcolor: 'rgba(107,114,128,0.15)', color: '#374151', label: status ?? '—' };

  const displayLabel = label ?? matched.label;
  const chipLabel = (dot || matched.dot) ? `${matched.dot || dot} ${displayLabel}` : displayLabel;

  const baseSx = {
    fontWeight: 500,
    fontSize: '12px',
    lineHeight: '16px',
    borderRadius: variant === 'dot' ? '999px' : '8px',
    height: 26,
    minWidth: variant === 'dot' ? 100 : 0,
    border: 'none',
    boxShadow: 'none',
    ...(variant === 'dot' && {
      '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
    }),
  };

  return (
    <Chip
      label={chipLabel}
      size="small"
      sx={{ bgcolor: matched.bgcolor, color: matched.color, ...baseSx, ...sx }}
    />
  );
}