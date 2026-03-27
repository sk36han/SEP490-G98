import axiosInstance from './axios';

const RELEASE_REQUEST_API = '/api/release-requests';

export const createReleaseRequest = async (payload) => {
    const response = await axiosInstance.post(RELEASE_REQUEST_API, payload);
    return response.data;
};

export const getReleaseRequests = async (params = {}) => {
    const response = await axiosInstance.get(RELEASE_REQUEST_API, { params });
    return response.data;
};

export const getReleaseRequestById = async (id) => {
    const response = await axiosInstance.get(`${RELEASE_REQUEST_API}/${id}`);
    return response.data;
};
