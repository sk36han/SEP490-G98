/**
 * deliveryService – Quản lý giao hàng / vận chuyển
 *
 * Backend endpoints (tùy backend hỗ trợ):
 *   GET  /api/TransportInfo       – Danh sách giao hàng (phân trang + filter)
 *   GET  /api/TransportInfo/{id}   – Chi tiết giao hàng
 *   POST /api/TransportInfo        – Tạo giao hàng
 *   PUT  /api/TransportInfo/{id}  – Cập nhật giao hàng
 *
 * Nếu backend chưa hỗ trợ endpoint, dùng mock data.
 */
import apiClient, { extractBody } from './axios';
import { invalidate } from './pollingManager';
import { normalizeApiError } from './apiErrorNormalizer';

function getPayload(data) {
    return data?.data ?? data?.Data ?? data ?? null;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_DELIVERIES = [
    { transportId: 1, gdnId: 101, gdnCode: 'GDN-2026-001', carrierName: 'Giao Hàng Nhanh', driverName: 'Nguyễn Văn A', driverPhone: '0901234567', licensePlate: '59A-123.45', note: 'Giao giờ hành chính', isActive: true, createdAt: '2026-04-01T08:30:00Z', status: 'ASSIGNED' },
    { transportId: 2, gdnId: 102, gdnCode: 'GDN-2026-002', carrierName: 'Viettel Post', driverName: 'Trần Văn B', driverPhone: '0912345678', licensePlate: '51B-234.56', note: 'Giao buổi sáng', isActive: true, createdAt: '2026-04-02T09:00:00Z', status: 'IN_TRANSIT' },
    { transportId: 3, gdnId: 103, gdnCode: 'GDN-2026-003', carrierName: 'Giao Hàng Nhanh', driverName: 'Lê Văn C', driverPhone: '0934567890', licensePlate: '43C-345.67', note: '', isActive: true, createdAt: '2026-04-03T10:15:00Z', status: 'DELIVERED' },
    { transportId: 4, gdnId: 104, gdnCode: 'GDN-2026-004', carrierName: 'Ninja Van', driverName: 'Phạm Văn D', driverPhone: '0945678901', licensePlate: '60D-456.78', note: 'Liên hệ trước 30 phút', isActive: false, createdAt: '2026-04-04T07:45:00Z', status: 'CANCELLED' },
    { transportId: 5, gdnId: 105, gdnCode: 'GDN-2026-005', carrierName: 'Viettel Post', driverName: 'Hoàng Văn E', driverPhone: '0956789012', licensePlate: '47E-567.89', note: 'Giao tầng 3', isActive: true, createdAt: '2026-04-05T11:00:00Z', status: 'ASSIGNED' },
    { transportId: 6, gdnId: 106, gdnCode: 'GDN-2026-006', carrierName: 'Giao Hàng Nhanh', driverName: 'Đặng Văn F', driverPhone: '0967890123', licensePlate: '55F-678.90', note: '', isActive: true, createdAt: '2026-04-06T08:00:00Z', status: 'IN_TRANSIT' },
    { transportId: 7, gdnId: 107, gdnCode: 'GDN-2026-007', carrierName: 'Ninja Van', driverName: 'Vũ Văn G', driverPhone: '0978901234', licensePlate: '65G-789.01', note: 'Khách không nhận lần 1', isActive: false, createdAt: '2026-04-07T14:30:00Z', status: 'FAILED' },
    { transportId: 8, gdnId: 108, gdnCode: 'GDN-2026-008', carrierName: 'Viettel Post', driverName: 'Đinh Văn H', driverPhone: '0989012345', licensePlate: '49H-890.12', note: 'Giao giờ hành chính', isActive: true, createdAt: '2026-04-08T09:30:00Z', status: 'DELIVERED' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function mapDeliveryRow(row) {
    if (!row) return null;
    const gdnId = row.gdnId ?? row.GdnId ?? row.gdnid ?? row.Gdnid ?? null;
    const gdnCode = row.gdnCode ?? row.GdnCode ?? '';
    return {
        transportId: row.transportId ?? row.TransportId ?? row.id ?? row.Id ?? null,
        gdnId,
        gdnCode: gdnCode || (gdnId != null ? `#${gdnId}` : ''),
        carrierName: row.carrierName ?? row.CarrierName ?? '',
        driverName: row.driverName ?? row.DriverName ?? '',
        driverPhone: row.driverPhone ?? row.DriverPhone ?? '',
        licensePlate: row.licensePlate ?? row.LicensePlate ?? '',
        note: row.note ?? row.Note ?? '',
        isActive: row.isActive ?? row.IsActive ?? true,
        status: row.status ?? row.Status ?? '',
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
    };
}

// ── API ────────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách giao hàng (phân trang + filter).
 * Backend: GET /api/TransportInfo — FilterTransportInfoRequest (PageNumber, PageSize, Keyword, Gdnid).
 * Ưu tiên dùng API thật, fallback mock data.
 */
export async function getDeliveries(params = {}) {
    const { page = 1, pageSize = 20, searchTerm = '', isActive, status, carrierName, gdnId } = params;
    const query = new URLSearchParams();
    query.append('PageNumber', String(page));
    query.append('PageSize', String(pageSize));
    const kw = (searchTerm && String(searchTerm).trim())
        || (carrierName && String(carrierName).trim())
        || '';
    if (kw) query.append('Keyword', kw);
    if (gdnId !== undefined && gdnId !== null && gdnId !== '') query.append('Gdnid', String(gdnId));
    if (isActive !== undefined && isActive !== null && isActive !== '') {
        const want = isActive === 'true' || isActive === true;
        query.append('IsActive', want ? 'true' : 'false');
    }

    try {
        const response = await apiClient.get(`/TransportInfo?${query.toString()}`);
        const body = response?.data ?? {};
        const paged = body.data ?? body.Data ?? body;
        const rawItems = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
        const items = rawItems.map(mapDeliveryRow).filter(Boolean);

        const serverTotal = paged?.totalItems ?? paged?.TotalItems ?? rawItems.length;
        return {
            items,
            totalItems: serverTotal,
            page: paged?.page ?? paged?.Page ?? page,
            pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
            totalPages: paged?.totalPages ?? 1,
        };
    } catch {
        // Fallback mock
        let data = [...MOCK_DELIVERIES];
        if (searchTerm) {
            const kw = searchTerm.toLowerCase();
            data = data.filter(r =>
                (r.gdnCode || '').toLowerCase().includes(kw) ||
                (r.carrierName || '').toLowerCase().includes(kw) ||
                (r.driverName || '').toLowerCase().includes(kw) ||
                (r.driverPhone || '').includes(kw) ||
                (r.licensePlate || '').toLowerCase().includes(kw)
            );
        }
        if (isActive !== undefined && isActive !== null && isActive !== '') {
            data = data.filter(r => r.isActive === (isActive === 'true'));
        }
        if (status) {
            data = data.filter(r => r.status === status);
        }
        if (carrierName) {
            data = data.filter(r => (r.carrierName || '').toLowerCase().includes(carrierName.toLowerCase()));
        }
        const start = (page - 1) * pageSize;
        const pagedItems = data.slice(start, start + pageSize);
        return {
            items: pagedItems.map(mapDeliveryRow),
            totalItems: data.length,
            page,
            pageSize,
            totalPages: Math.ceil(data.length / pageSize),
        };
    }
}

/**
 * Lấy lịch sử thông tin vận chuyển (không phụ thuộc gdnId), dùng làm template nhanh.
 * Backend: GET /api/TransportInfo/history
 */
export async function getDeliveryHistory() {
    try {
        const response = await apiClient.get('/TransportInfo/history');
        const payload = getPayload(response?.data);
        const rows = Array.isArray(payload) ? payload : [];

        return rows
            .map((row, index) => ({
                transportId: `history-${index + 1}`,
                gdnId: null,
                gdnCode: '',
                carrierName: row?.carrierName ?? row?.CarrierName ?? '',
                driverName: row?.driverName ?? row?.DriverName ?? '',
                driverPhone: row?.driverPhone ?? row?.DriverPhone ?? '',
                licensePlate: row?.licensePlate ?? row?.LicensePlate ?? '',
                note: '',
                isActive: true,
                status: 'HISTORY',
                createdAt: null,
            }))
            .filter((x) => x.carrierName || x.driverName || x.driverPhone || x.licensePlate);
    } catch {
        return [];
    }
}

/**
 * Lấy chi tiết giao hàng.
 */
export async function getDeliveryDetail(id) {
    try {
        const response = await apiClient.get(`/TransportInfo/${id}`);
        return getPayload(response?.data);
    } catch {
        const row = MOCK_DELIVERIES.find(r => r.transportId === Number(id));
        return row ? mapDeliveryRow(row) : null;
    }
}

const trimOrNull = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
};

/**
 * Chuẩn hóa các trường vận chuyển (giống CreateDelivery / CreateTransportInfoRequest), không gồm gdnid.
 * Dùng cho form dialog trước khi có phiếu xuất; `transportNote` map sang `note`.
 * @returns {{ carrierName: string|null, driverName: string|null, driverPhone: string|null, licensePlate: string|null, note: string|null }}
 */
export function normalizeTransportInfoFields(input) {
    let driverPhone = trimOrNull(input?.driverPhone ?? input?.DriverPhone);
    if (driverPhone) {
        driverPhone = driverPhone.replace(/\D/g, '');
        driverPhone = driverPhone.length ? driverPhone : null;
    }
    return {
        carrierName: trimOrNull(input?.carrierName ?? input?.CarrierName),
        driverName: trimOrNull(input?.driverName ?? input?.DriverName),
        driverPhone,
        licensePlate: trimOrNull(input?.licensePlate ?? input?.LicensePlate),
        note: trimOrNull(input?.note ?? input?.Note ?? input?.transportNote),
    };
}

/**
 * Body JSON cho POST /api/TransportInfo (camelCase, khớp CreateTransportInfoRequest khi serialize).
 * @param {object} input – form: { gdnId, carrierName, driverName, driverPhone, licensePlate, note }
 * @returns {{ gdnid: number, carrierName: string|null, driverName: string|null, driverPhone: string|null, licensePlate: string|null, note: string|null }}
 */
export function buildCreateTransportInfoBody(input) {
    const gdnid = Number(input?.gdnId ?? input?.gdnid ?? input?.Gdnid);
    if (!Number.isFinite(gdnid) || gdnid <= 0) {
        throw new Error('Mã phiếu xuất (gdnid) không hợp lệ.');
    }
    const fields = normalizeTransportInfoFields(input);
    return { gdnid, ...fields };
}

/**
 * Tạo giao hàng (POST /api/TransportInfo).
 * @param {object} input – cùng shape với buildCreateTransportInfoBody (vd. formData từ CreateDelivery)
 */
export async function createDelivery(input) {
    const body = buildCreateTransportInfoBody(input);
    try {
        const response = await apiClient.post('/TransportInfo', body);
        invalidate('deliveries');
        return getPayload(response?.data);
    } catch (error) {
        if (error?.response?.status === 404) {
            throw new Error('Backend chưa hỗ trợ API tạo giao hàng.');
        }
        throw normalizeApiError(error, { defaultMessage: 'Không thể tạo thông tin vận chuyển.' });
    }
}

/**
 * Cập nhật giao hàng.
 */
export async function updateDelivery(id, payload) {
    try {
        const response = await apiClient.put(`/TransportInfo/${id}`, payload);
        invalidate('deliveries');
        return extractBody(response);
    } catch (error) {
        throw normalizeApiError(error, { defaultMessage: 'Không thể cập nhật thông tin vận chuyển.' });
    }
}