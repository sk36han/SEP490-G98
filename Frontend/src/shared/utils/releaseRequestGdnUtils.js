/**
 * Điều kiện hiển thị nút "Tạo phiếu xuất hàng" từ chi tiết yêu cầu xuất (RR).
 *
 * Backend (ReleaseRequest.LifecycleStatus, StatusBadge):
 * - status APPROVED → "Đã duyệt"
 * - lifecycleStatus IssuePending → "Đang đợi xuất hàng"
 * - lifecycleStatus IssuePartial → "Xuất một phần hàng" (đã xuất một phần, còn nợ xuất)
 */

const RR_STATUS_APPROVED = 'APPROVED';

/** Giá trị lifecycle sau khi chuẩn hóa (uppercase, bỏ khoảng trắng / gạch) */
const LIFECYCLE_ALLOW_CREATE_GDN = new Set(['ISSUEPENDING', 'ISSUEPARTIAL']);

/** Khớp route /good-delivery-notes/create (ROLES_DW) */
export const ROLES_ALLOWED_CREATE_GDN_FROM_RR = ['DIRECTOR', 'WAREHOUSE_KEEPER'];

export function normalizeRrStatusForGdn(status) {
    return String(status ?? '').trim().toUpperCase();
}

/**
 * @param {string} [lifecycleStatus] — ví dụ IssuePending, IssuePartial
 * @returns {string} khóa dạng ISSUEPENDING | ISSUEPARTIAL | ...
 */
export function normalizeRrLifecycleForGdn(lifecycleStatus) {
    const s = String(lifecycleStatus ?? '').trim();
    if (!s) return '';
    return s.replace(/[\s_-]+/g, '').toUpperCase();
}

/**
 * @param {object} p
 * @param {string} [p.status] — RR status (APPROVED, …)
 * @param {string} [p.lifecycleStatus] — IssuePending | IssuePartial | …
 * @param {string|null} [p.permissionRole] — getPermissionRole(...)
 * @param {string[]} [p.rolesAllowed] — mặc định DIRECTOR + WAREHOUSE_KEEPER (giống route tạo GDN)
 */
export function canShowCreateGdnFromReleaseRequest({
    status,
    lifecycleStatus,
    permissionRole,
    rolesAllowed = ROLES_ALLOWED_CREATE_GDN_FROM_RR,
}) {
    if (!permissionRole || !rolesAllowed.includes(permissionRole)) return false;
    if (normalizeRrStatusForGdn(status) !== RR_STATUS_APPROVED) return false;
    const lc = normalizeRrLifecycleForGdn(lifecycleStatus);
    return LIFECYCLE_ALLOW_CREATE_GDN.has(lc);
}
