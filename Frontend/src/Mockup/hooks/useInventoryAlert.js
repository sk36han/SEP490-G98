import { useState } from 'react';

/**
 * Hook quản lý trạng thái của danh sách cảnh báo tồn kho
 * @param {Array} initialData - Dữ liệu khởi tạo mảng sản phẩm
 * @returns {Object} State và các hàm xử lý logic
 */
export const useInventoryAlert = (initialData = []) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [alerts, setAlerts] = useState(initialData);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ minStock: 0, maxStock: 0 });

    /**
     * Bắt đầu chế độ chỉnh sửa cho một sản phẩm
     * @param {Object} product - Sản phẩm cần chỉnh sửa
     */
    const handleEdit = (product) => {
        setEditingId(product.id);
        setEditForm({ minStock: product.minStock, maxStock: product.maxStock });
    };

    /**
     * Lưu thông tin cấu hình cảnh báo tồn kho sau khi chỉnh sửa
     * @param {string} id - Mã định danh của sản phẩm
     */
    const handleSave = (id) => {
        setAlerts((prevAlerts) =>
            prevAlerts.map((p) =>
                p.id === id ? { ...p, minStock: Number(editForm.minStock), maxStock: Number(editForm.maxStock) } : p
            )
        );
        setEditingId(null);
    };

    /**
     * Hủy chế độ chỉnh sửa hiện tại
     */
    const handleCancel = () => {
        setEditingId(null);
    };

    const filteredAlerts = alerts.filter(
        (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        searchTerm,
        setSearchTerm,
        alerts,
        filteredAlerts,
        editingId,
        editForm,
        setEditForm,
        handleEdit,
        handleSave,
        handleCancel,
    };
};
