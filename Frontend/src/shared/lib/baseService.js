import apiClient from './axios';

function mapRow(row, mapping) {
  if (!row) return null;
  const mapped = {};
  for (const [key, fn] of Object.entries(mapping)) {
    mapped[key] = fn(row);
  }
  return mapped;
}

function parseResponse(response) {
  const body = response?.data ?? {};
  const paged = body.data ?? body;
  return {
    items: Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []),
    totalItems: paged?.totalItems ?? paged?.total ?? paged?.count ?? 0,
  };
}

export function createService(endpoint, mapping = {}) {
  return {
    async getList(params = {}) {
      const response = await apiClient.get(endpoint, { params });
      const { items, ...pagination } = parseResponse(response);
      return { ...pagination, items: items.map(row => mapRow(row, mapping)) };
    },
    async getById(id) {
      const response = await apiClient.get(`${endpoint}/${id}`);
      return mapRow(response?.data, mapping);
    },
    async create(data) {
      const response = await apiClient.post(endpoint, data);
      return response?.data;
    },
    async update(id, data) {
      const response = await apiClient.put(`${endpoint}/${id}`, data);
      return response?.data;
    },
    async delete(id) {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response?.data;
    },
  };
}
