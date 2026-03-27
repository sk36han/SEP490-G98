/**
 * Dữ liệu giả lập cho phần cảnh báo tồn kho
 */
export const MOCK_PRODUCTS = [
    { id: 'PRD-001', name: 'Sữa tươi Vinamilk 180ml', currentStock: 450, minStock: 100, maxStock: 1000, unit: 'Thùng' },
    { id: 'PRD-002', name: 'Nước suối Aquafina 500ml', currentStock: 50, minStock: 200, maxStock: 1500, unit: 'Chai' },
    { id: 'PRD-003', name: 'Mì Hảo Hảo Tôm chua cay', currentStock: 1200, minStock: 500, maxStock: 3000, unit: 'Thùng' },
    { id: 'PRD-004', name: 'Gạo ST25 (Túi 5kg)', currentStock: 4000, minStock: 1000, maxStock: 5000, unit: 'Túi' },
    { id: 'PRD-005', name: 'Dầu ăn Tường An 1L', currentStock: 15, minStock: 50, maxStock: 500, unit: 'Chai' },
];

/**
 * Dữ liệu giả lập cho phần mục tiêu doanh thu
 */
export const MOCK_TARGETS = [
    { id: 1, period: 'Tháng 1', target: 500000000, actual: 480000000 },
    { id: 2, period: 'Tháng 2', target: 550000000, actual: 610000000 },
    { id: 3, period: 'Tháng 3', target: 600000000, actual: 0 },
];
