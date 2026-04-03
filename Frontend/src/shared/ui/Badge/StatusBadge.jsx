import React from 'react';
import './Badge.css';

/**
 * Status Badge component
 * @param {Object} props
 * @param {string} props.status - Status value ('Approved', 'Pending', 'Rejected', etc.)
 * @param {string} props.label - Custom label (optional)
 */
const StatusBadge = ({ status, label }) => {
    const getStatusConfig = (statusKey) => {
        const statusMap = {
            // Purchase Order Status
            'Approved': { class: 'badge-success', label: 'Đã duyệt' },
            'PENDING_ACC': { class: 'badge-warning', label: 'Chờ duyệt' },
            'PENDING': { class: 'badge-warning', label: 'Chờ duyệt' },
            'REJECTED': { class: 'badge-danger', label: 'Từ chối' },
            'DRAFT': { class: 'badge-secondary', label: 'Nháp' },
            'CANCELLED': { class: 'badge-danger', label: 'Đã hủy' },

            // GRN Status
            'COMPLETED': { class: 'badge-success', label: 'Hoàn thành' },
            'IN_PROGRESS': { class: 'badge-warning', label: 'Đang xử lý' },

            // Generic
            'active': { class: 'badge-success', label: 'Hoạt động' },
            'inactive': { class: 'badge-secondary', label: 'Không hoạt động' },
            'true': { class: 'badge-success', label: 'Có' },
            'false': { class: 'badge-secondary', label: 'Không' },
        };

        return statusMap[statusKey] || { class: 'badge-secondary', label: statusKey || 'Unknown' };
    };

    const config = getStatusConfig(status);

    return (
        <span className={`badge ${config.class}`}>
            {label || config.label}
        </span>
    );
};

export default StatusBadge;
