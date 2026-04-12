/**
 * GRNDiscountSection - Tổng hợp GRN: chiết khấu theo PO (readonly), phí vận chuyển, tổng tiền
 */

import React from 'react';
import './GRNDiscountSection.css';

const READONLY_BOX = {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    lineHeight: 1.45,
};

const GRNDiscountSection = ({
    subtotal,
    discountAmount,
    grandTotal,
    totalQuantityOrdered,
    formatCurrency,
    shippingFee,
    setShippingFee,
    poHeaderDiscount = 0,
    poHeaderTotal = 0,
}) => {
    return (
        <div className="grn-summary-section">
            <div className="section-header-with-toggle">
                <h2 className="section-title">Tổng hợp đơn hàng</h2>
            </div>

            <div className="grn-summary-grid">
                <div className="grn-summary-row">
                    <div className="grn-summary-item">
                        <label className="form-label">Tổng số lượng đặt</label>
                        <div className="grn-summary-value">
                            {totalQuantityOrdered} sản phẩm
                        </div>
                    </div>

                    <div className="grn-summary-item">
                        <label className="form-label">Tạm tính</label>
                        <div className="grn-summary-value">
                            {formatCurrency(subtotal)}
                        </div>
                    </div>
                </div>

                <div className="grn-form-two-columns">
                    <div className="form-field">
                        <label className="form-label">Chiết khấu</label>
                        <div style={READONLY_BOX}>
                            <div style={{ fontWeight: 600 }}>
                                − {formatCurrency(discountAmount)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                Lấy theo đơn mua hàng (PO). Không nhập chiết khấu tại phiếu nhập kho.
                            </div>
                            {poHeaderTotal > 0 && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Trên đơn mua: chiết khấu {formatCurrency(poHeaderDiscount)} · tổng tiền hàng{' '}
                                    {formatCurrency(poHeaderTotal)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label">Phí vận chuyển</label>
                        <div className="grn-costs-section">
                            <div className="grn-cost-row" style={{ marginBottom: 0 }}>
                                <input
                                    type="text"
                                    value="Phí vận chuyển"
                                    className="form-input grn-cost-name"
                                    readOnly
                                    style={{ backgroundColor: '#e5e7eb', color: '#374151', cursor: 'default' }}
                                />
                                <input
                                    type="number"
                                    value={shippingFee || ''}
                                    onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                                    placeholder="Số tiền"
                                    className="form-input grn-cost-amount"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grn-total-section">
                    <div className="grn-total-details">
                        <div className="grn-discount-row">
                            <span className="grn-total-label">Chiết khấu (theo PO):</span>
                            <span className="grn-discount-value">− {formatCurrency(discountAmount)}</span>
                        </div>
                        {(shippingFee || 0) > 0 && (
                            <div className="grn-cost-item">
                                <span>Phí vận chuyển:</span>
                                <span className="grn-cost-value">+ {formatCurrency(shippingFee || 0)}</span>
                            </div>
                        )}
                    </div>
                    <div className="grn-grand-total">
                        <span className="grn-total-label">Tổng giá trị đơn:</span>
                        <span className="grn-total-value">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GRNDiscountSection;
