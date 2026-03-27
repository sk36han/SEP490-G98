/**
 * GRNConfirmation - Mockup man hinh xac nhan thanh toan va duyet GRN
 * Hien thi sau khi tao GRN thanh cong
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Paper,
    Divider,
    Chip,
} from '@mui/material';
import {
    CheckCircle,
    CreditCard,
    DollarSign,
    FileText,
    Package,
    AlertCircle,
} from 'lucide-react';
import authService from '../../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../../permissions/roleUtils';
import './GRNConfirmation.css';

const MOCK_GRN_DATA = {
    grnId: 1,
    grnCode: 'GRN-2025-0001',
    purchaseOrderCode: 'PO-2025-0002',
    receiptDate: '2025-03-16',
    warehouseName: 'Kho Ha Noi',
    supplierName: 'Cong ty TNHH ABC',
    status: 'PENDING_ACC',
    createdByName: 'Nguyen Van A',
    createdAt: '2025-03-16T10:30:00',
    lines: [
        { itemId: 1, itemName: 'Vat tu A', sku: 'VT-001', orderedQty: 100, actualQty: 100, unitPrice: 50000, totalPrice: 5000000 },
        { itemId: 2, itemName: 'Vat tu B', sku: 'VT-002', orderedQty: 50, actualQty: 50, unitPrice: 30000, totalPrice: 1500000 },
        { itemId: 3, itemName: 'Vat tu C', sku: 'VT-003', orderedQty: 200, actualQty: 198, unitPrice: 10000, totalPrice: 1980000 },
    ],
    subtotal: 8480000,
    discountType: 'percent',
    discountValue: 5,
    discountAmount: 424000,
    shippingFee: 500000,
    netAmount: 8556000,
    note: '',
};

const GRNConfirmation = () => {
    const { id } = useParams();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    // Ke toan: co the duyet GRN
    // Thủ Kho: chi xem (readonly)
    const isAccountant = permissionRole === 'ACCOUNTANTS';
    const isWarehouseKeeper = permissionRole === 'WAREHOUSE_KEEPER';
    const isReadOnly = isWarehouseKeeper;

    const [formData, setFormData] = useState({
        isPaid: false,
        paymentMethod: 'cash',
        approvalNote: '',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleApprove = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
        alert('Duyet GRN thanh cong!');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            'PENDING_ACC': { label: 'Cho duyet', color: 'warning' },
            'POSTED': { label: 'Da duyet', color: 'success' },
            'REJECTED': { label: 'Tu choi', color: 'error' },
        };
        const config = statusConfig[status] || { label: status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    return (
        <Box className="grn-confirmation-page">
            <Box className="grn-confirmation-header">
                <Box className="grn-confirmation-header-content">
                    <Typography variant="h5" className="grn-confirmation-title">
                        Xac nhan & Duyet phieu nhap kho
                    </Typography>
                    <Typography variant="body2" className="grn-confirmation-subtitle">
                        Vui long xac nhan thanh toan va duyet phieu nhap kho
                    </Typography>
                </Box>
            </Box>

            <Box className="grn-confirmation-content">
                <Box className="grn-confirmation-left">
                    <Paper className="grn-summary-card" elevation={0}>
                        <Box className="card-header">
                            <FileText size={20} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Thong tin phieu nhap kho
                            </Typography>
                        </Box>
                        <Box className="card-content">
                            <Box className="info-row">
                                <span className="info-label">Ma phieu nhap:</span>
                                <span className="info-value">{MOCK_GRN_DATA.grnCode}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Ma don mua hang:</span>
                                <span className="info-value">{MOCK_GRN_DATA.purchaseOrderCode}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Ngay nhap:</span>
                                <span className="info-value">{MOCK_GRN_DATA.receiptDate}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Kho nhap:</span>
                                <span className="info-value">{MOCK_GRN_DATA.warehouseName}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Nha cung cap:</span>
                                <span className="info-value">{MOCK_GRN_DATA.supplierName}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Trang thai:</span>
                                <span className="info-value">{getStatusChip(MOCK_GRN_DATA.status)}</span>
                            </Box>
                            <Box className="info-row">
                                <span className="info-label">Nguoi tao:</span>
                                <span className="info-value">{MOCK_GRN_DATA.createdByName}</span>
                            </Box>
                        </Box>
                    </Paper>

                    <Paper className="grn-lines-card" elevation={0}>
                        <Box className="card-header">
                            <Package size={20} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Chi tiet vat tu
                            </Typography>
                        </Box>
                        <Box className="lines-table-wrapper">
                            <table className="lines-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Ma VT</th>
                                        <th>Ten vat tu</th>
                                        <th className="text-right">SL dat</th>
                                        <th className="text-right">SL nhap</th>
                                        <th className="text-right">Don gia</th>
                                        <th className="text-right">Thanh tien</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_GRN_DATA.lines.map((line, index) => (
                                        <tr key={line.itemId}>
                                            <td>{index + 1}</td>
                                            <td>{line.sku}</td>
                                            <td>{line.itemName}</td>
                                            <td className="text-right">{line.orderedQty}</td>
                                            <td className="text-right">{line.actualQty}</td>
                                            <td className="text-right">{formatCurrency(line.unitPrice)}</td>
                                            <td className="text-right">{formatCurrency(line.totalPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </Paper>

                    <Paper className="grn-summary-total-card" elevation={0}>
                        <Box className="card-header">
                            <DollarSign size={20} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                Tong hop
                            </Typography>
                        </Box>
                        <Box className="card-content">
                            <Box className="summary-row">
                                <span>Tam tinh:</span>
                                <span>{formatCurrency(MOCK_GRN_DATA.subtotal)}</span>
                            </Box>
                            <Box className="summary-row">
                                <span>Chiet khau ({MOCK_GRN_DATA.discountValue}%):</span>
                                <span className="discount">-{formatCurrency(MOCK_GRN_DATA.discountAmount)}</span>
                            </Box>
                            <Box className="summary-row">
                                <span>Phi van chuyen:</span>
                                <span>{formatCurrency(MOCK_GRN_DATA.shippingFee)}</span>
                            </Box>
                            <Divider sx={{ my: 1.5 }} />
                            <Box className="summary-row total">
                                <span>Tong cong:</span>
                                <span>{formatCurrency(MOCK_GRN_DATA.netAmount)}</span>
                            </Box>
                        </Box>
                    </Paper>
                </Box>

                <Box className="grn-confirmation-right">
                    <Paper className="grn-approval-card" elevation={0}>
                        <Box className="card-header">
                            <CreditCard size={20} />
                            <Typography variant="subtitle1" fontWeight={600}>
                                {isReadOnly ? 'Thong tin phieu nhap kho' : 'Xac nhan thanh toan & Duyet'}
                            </Typography>
                        </Box>
                        <Box className="card-content">
                            {isReadOnly ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Package size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                    <Typography variant="body1" sx={{ color: '#6b7280' }}>
                                        Ban khong co quyen duyet phieu nhap kho
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
                                        Vui lien he Ke toan de duyet phieu
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    <FormControl component="fieldset" className="payment-section">
                                        <FormLabel component="legend" className="section-label">
                                            <DollarSign size={16} style={{ marginRight: 8 }} />
                                            Da thanh toan?
                                        </FormLabel>
                                        <RadioGroup
                                            row
                                            value={formData.isPaid ? 'yes' : 'no'}
                                            onChange={(e) => handleInputChange('isPaid', e.target.value === 'yes')}
                                        >
                                            <FormControlLabel
                                                value="yes"
                                                control={<Radio />}
                                                label="Da thanh toan"
                                            />
                                            <FormControlLabel
                                                value="no"
                                                control={<Radio />}
                                                label="Chua thanh toan"
                                            />
                                        </RadioGroup>
                                    </FormControl>

                                    {formData.isPaid && (
                                        <FormControl component="fieldset" className="payment-section">
                                            <FormLabel component="legend" className="section-label">
                                                Phuong thuc thanh toan
                                            </FormLabel>
                                            <RadioGroup
                                                row
                                                value={formData.paymentMethod}
                                                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                                            >
                                                <FormControlLabel
                                                    value="cash"
                                                    control={<Radio />}
                                                    label="Tien mat"
                                                />
                                                <FormControlLabel
                                                    value="bank_transfer"
                                                    control={<Radio />}
                                                    label="Chuyen khoan"
                                                />
                                                <FormControlLabel
                                                    value="credit"
                                                    control={<Radio />}
                                                    label="Credit"
                                                />
                                            </RadioGroup>
                                        </FormControl>
                                    )}

                                    <Divider sx={{ my: 2 }} />

                                    <FormControl fullWidth className="approval-note-section">
                                        <FormLabel component="legend" className="section-label">
                                            <CheckCircle size={16} style={{ marginRight: 8 }} />
                                            Ghi chu duyet
                                        </FormLabel>
                                        <TextField
                                            multiline
                                            rows={3}
                                            placeholder="Nhap ghi chu (khong bat buoc)"
                                            value={formData.approvalNote}
                                            onChange={(e) => handleInputChange('approvalNote', e.target.value)}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </FormControl>

                                    <Box className="approval-warning">
                                        <AlertCircle size={16} />
                                        <Typography variant="body2">
                                            Sau khi duyet, ton kho se duoc cap nhat va khong the hoan tac.
                                        </Typography>
                                    </Box>

                                    <Box className="approval-actions">
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            className="btn-cancel"
                                        >
                                            Huy
                                        </Button>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            className="btn-approve"
                                            onClick={handleApprove}
                                            disabled={loading}
                                            startIcon={loading ? null : <CheckCircle size={18} />}
                                        >
                                            {loading ? 'Dang xu ly...' : 'Duyet & Ghi so'}
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

export default GRNConfirmation;
