/** Mock data cho các trang Mockup Release Request */

export const MOCK_RELEASE_REQUESTS = [
    {
        releaseRequestId: 12,
        releaseRequestCode: 'RR-2409-0012',
        requestedBy: 'Marcus Kane',
        requestedByInitials: 'MK',
        receiverName: 'Zone B Facility',
        status: 'PENDING_ACC',
        requestedDate: '2023-10-12',
        expectedDate: '2023-10-15',
        purpose: 'Urgent release for Q3 infrastructure overhaul.',
        lifecycleStatus: 'IssuePending',
    },
    {
        releaseRequestId: 11,
        releaseRequestCode: 'RR-2409-0011',
        requestedBy: 'Janet Lawson',
        requestedByInitials: 'JL',
        receiverName: 'Port Delta Terminal',
        status: 'APPROVED',
        requestedDate: '2023-10-11',
        expectedDate: '2023-10-13',
        purpose: 'Standard replenishment cycle.',
        lifecycleStatus: 'IssuePending',
    },
    {
        releaseRequestId: 10,
        releaseRequestCode: 'RR-2409-0010',
        requestedBy: 'Marcus Kane',
        requestedByInitials: 'MK',
        receiverName: 'Zone A Inventory',
        status: 'DRAFT',
        requestedDate: '2023-10-10',
        expectedDate: null,
        purpose: 'Emergency stock transfer.',
        lifecycleStatus: 'IssuePending',
    },
    {
        releaseRequestId: 9,
        releaseRequestCode: 'RR-2409-0009',
        requestedBy: 'Robert Blake',
        requestedByInitials: 'RB',
        receiverName: 'External Transit',
        status: 'REJECTED',
        requestedDate: '2023-10-09',
        expectedDate: null,
        purpose: 'External delivery request.',
        lifecycleStatus: 'IssuePending',
    },
    {
        releaseRequestId: 8,
        releaseRequestCode: 'RR-2409-0008',
        requestedBy: 'Janet Lawson',
        requestedByInitials: 'JL',
        receiverName: 'Zone C Storage',
        status: 'APPROVED',
        requestedDate: '2023-10-08',
        expectedDate: '2023-10-12',
        purpose: 'Quarterly stock rebalancing.',
        lifecycleStatus: 'IssuePending',
    },
];

export const MOCK_RR_DETAIL = {
    releaseRequestId: 11,
    releaseRequestCode: 'RR-2409-0011',
    status: 'PENDING_ACC',
    requestedBy: 'Sarah Jenkins',
    requestedByRole: 'Floor Supervisor',
    companyName: 'Titan Logistics Global Ltd.',
    receiverName: 'Alexander Murphy (Representative)',
    receiverInitials: 'AM',
    orderingCompany: 'Quantum Manufacturing Hub',
    originWarehouse: 'WH-HCM',
    purpose: '"Urgent release for Q3 infrastructure overhaul. Ref Code: #OM-9921-A. High priority transit."',
    requestedDate: '2023-10-11',
    expectedDate: '2023-10-13',
    totalWeight: '4,280 kg',
    estimatedValue: '$18,440.00',
    history: [
        { time: 'HÔM NAY, 09:12 SA', title: 'Yêu cầu đã được gửi', subtitle: 'bởi Sarah Jenkins (Floor Supervisor)', active: true },
        { time: 'HÔM NAY, 08:45 SA', title: 'Bản nháp tạo xong', subtitle: 'Lựa chọn hàng hóa hoàn tất', active: false },
        { time: 'HÔM QUA, 16:20 CH', title: 'Đặt trước lô hàng', subtitle: 'Hệ thống tự động giữ chỗ', active: false },
    ],
    lines: [
        { itemCode: 'CUP-TITAN-09', itemName: 'Industrial Coupling System X1', stockAvail: 1402, requested: 250, approvedQty: 250, uom: 'Unit (EA)', status: 'RESERVED' },
        { itemCode: 'HLD-BRKT-22', itemName: 'Heavy Load Bracket Assembly', stockAvail: 48, requested: 40, approvedQty: 40, uom: 'Unit (EA)', status: 'LOW_STOCK' },
        { itemCode: 'PNL-INS-V3', itemName: 'Insulated Panel V3 - Grade A', stockAvail: 9200, requested: 1200, approvedQty: 1200, uom: 'Square Meter', status: 'RESERVED' },
    ],
};

export const MOCK_WAREHOUSES = [
    { id: 1, code: 'WH-HCM', name: 'Kho HCM' },
    { id: 2, code: 'WH-HN', name: 'Kho Hà Nội' },
];

export const MOCK_RECEIVERS = [
    { id: 1, name: 'Bộ phận sản xuất', address: 'KCN Demo' },
    { id: 2, name: 'Bộ phận R&D', address: '123 Nguyễn Huệ' },
];

export const MOCK_ITEMS_FOR_RR = [
    { itemCode: 'ISO-8822-PL', itemName: 'Heavy Duty Industrial Pallet Jack', stockAvail: 42, uom: 'Unit', pkg: 'Standard Box' },
    { itemCode: 'CAB-NT-600', itemName: 'Copper Core Network Cable 600m', stockAvail: 15, uom: 'Spool', pkg: 'Wooden Reel' },
    { itemCode: 'SNS-MT-04', itemName: 'Motion Sensor Node Gen 4', stockAvail: 3, uom: 'Unit', pkg: 'Bubble Pack', lowStock: true },
];
