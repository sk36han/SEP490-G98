import apiClient from './axios';
import { normalizeApiError } from './apiErrorNormalizer';

function extractBody(response) {
    const body = response?.data ?? {};
    return body.data ?? body.Data ?? body;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function mapPeriodRow(row) {
    if (!row || typeof row !== 'object') return null;
    return {
        id: row.id ?? row.Id ?? '',
        parentId: row.parentId ?? row.ParentId ?? null,
        level: row.level ?? row.Level ?? '',
        periodLabel: row.periodLabel ?? row.PeriodLabel ?? '',
        year: row.year ?? row.Year ?? null,
        quarter: row.quarter ?? row.Quarter ?? null,
        month: row.month ?? row.Month ?? null,
        deliveryNotes: toNumber(row.deliveryNotes ?? row.DeliveryNotes, 0),
        totalQty: toNumber(row.totalQty ?? row.TotalQty, 0),
        totalValue: toNumber(row.totalValue ?? row.TotalValue, 0),
        prevValue: row.prevValue ?? row.PrevValue ?? null,
        change: row.change ?? row.Change ?? null,
        growth: row.growth ?? row.Growth ?? null,
        grnNotes: toNumber(row.grnNotes ?? row.GrnNotes, 0),
        grnQty: toNumber(row.grnQty ?? row.GrnQty, 0),
        grnValue: toNumber(row.grnValue ?? row.GrnValue, 0),
        grnPrev: row.grnPrev ?? row.GrnPrev ?? null,
        grnChange: row.grnChange ?? row.GrnChange ?? null,
        grnGrowth: row.grnGrowth ?? row.GrnGrowth ?? null,
        lineItems: row.lineItems ?? row.LineItems ?? null,
    };
}

function buildQuery(params = {}) {
    const query = {};
    if (params.mode) query.mode = params.mode;
    if (params.year != null) query.year = params.year;
    if (params.quickFilter) query.quickFilter = params.quickFilter;
    if (params.keyword) query.keyword = params.keyword;
    if (params.chartLevel) query.chartLevel = params.chartLevel;
    if (params.chartYear != null) query.chartYear = params.chartYear;
    if (params.warehouseId != null && params.warehouseId !== 'all') query.warehouseId = params.warehouseId;
    return query;
}

export async function getSalesReportList(params = {}) {
    try {
        const response = await apiClient.get('/SalesReport/list', { params: buildQuery(params) });
        const body = extractBody(response);
        const rows = Array.isArray(body?.rows ?? body?.Rows) ? (body.rows ?? body.Rows) : [];
        return rows.map(mapPeriodRow).filter(Boolean);
    } catch (error) {
        throw normalizeApiError(error, { defaultMessage: 'Khong the tai du lieu bao cao doanh so.' });
    }
}

export async function getSalesReportSummary(params = {}) {
    try {
        const response = await apiClient.get('/SalesReport/summary', { params: buildQuery(params) });
        const body = extractBody(response) ?? {};
        return {
            totalSales: toNumber(body.totalSales ?? body.TotalSales, 0),
            totalNotes: toNumber(body.totalNotes ?? body.TotalNotes, 0),
            totalQty: toNumber(body.totalQty ?? body.TotalQty, 0),
            totalGrnNotes: toNumber(body.totalGrnNotes ?? body.TotalGrnNotes, 0),
            totalGrnQty: toNumber(body.totalGrnQty ?? body.TotalGrnQty, 0),
            totalGrnValue: toNumber(body.totalGrnValue ?? body.TotalGrnValue, 0),
        };
    } catch (error) {
        throw normalizeApiError(error, { defaultMessage: 'Khong the tai tong hop bao cao doanh so.' });
    }
}
