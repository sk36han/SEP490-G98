import apiClient from './axios';

export async function getCompanies() {
    const response = await apiClient.get('/Company/list-all-company');
    const data = response?.data ?? {};
    const raw = Array.isArray(data)
        ? data
        : (data.items ?? data.Items ?? data.data ?? data.Data ?? []);
    return raw.map(row => ({
        companyId: row.companyId ?? row.CompanyId,
        companyCode: row.companyCode ?? row.CompanyCode ?? '',
        companyName: row.companyName ?? row.CompanyName ?? '',
    }));
}

export async function createCompany(payload) {
    const response = await apiClient.post('/Company/create-company', payload);
    const data = response?.data ?? response;
    return {
        companyId: data?.companyId ?? data?.CompanyId ?? null,
        companyCode: data?.companyCode ?? data?.CompanyCode ?? '',
        companyName: data?.companyName ?? data?.CompanyName ?? '',
    };
}
