import { useState } from 'react';

/**
 * Hook quản lý trạng thái của danh sách mục tiêu doanh thu
 * @param {Array} initialData - Dữ liệu khởi tạo mảng mục tiêu
 * @returns {Object} State và các hàm xử lý logic
 */
export const useSalesTarget = (initialData = []) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [quarter, setQuarter] = useState(1);
    
    const [targets, setTargets] = useState(initialData);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    /**
     * Bắt đầu chế độ chỉnh sửa cho một mục tiêu
     * @param {Object} row - Dòng dữ liệu mục tiêu cần chỉnh sửa
     */
    const handleEdit = (row) => {
        setEditingId(row.id);
        setEditValue(row.target);
    };

    /**
     * Lưu thông tin mục tiêu doanh thu sau khi chỉnh sửa
     * @param {number} id - Mã định danh của tháng/quý
     */
    const handleSave = (id) => {
        setTargets((prevTargets) =>
            prevTargets.map((t) =>
                t.id === id ? { ...t, target: Number(editValue) } : t
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

    /**
     * Tính toán tỷ lệ phần trăm hoàn thành mục tiêu
     * @param {number} actual - Doanh thu thực tế đạt được
     * @param {number} target - Mục tiêu đề ra
     * @returns {number} Tỷ lệ hoàn thành theo phần trăm (tối đa 100%)
     */
    const calculateAchievement = (actual, target) => {
        if (target === 0) return 0;
        return Math.min(Math.round((actual / target) * 100), 100);
    };

    const totalTarget = targets.reduce((sum, item) => sum + item.target, 0);
    const totalActual = targets.reduce((sum, item) => sum + item.actual, 0);
    const totalAchievement = calculateAchievement(totalActual, totalTarget);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return {
        year,
        setYear,
        quarter,
        setQuarter,
        targets,
        editingId,
        editValue,
        setEditValue,
        handleEdit,
        handleSave,
        handleCancel,
        calculateAchievement,
        totalTarget,
        totalActual,
        totalAchievement,
        years,
    };
};
