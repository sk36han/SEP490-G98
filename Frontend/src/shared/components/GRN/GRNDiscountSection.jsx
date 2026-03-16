/**
 * GRNDiscountSection - Component hiển thị phần chiết khấu và tổng tiền cho GRN
 * Bao gồm: Tổng số lượng, Tạm tính, Chiết khấu, Chi phí thêm, Tổng tiền
 * Tách từ CreateGoodReceiptNote.jsx
 */

import React from 'react';
import './GRNDiscountSection.css';

const GRNDiscountSection = ({
    formData,
    discountType,
    setDiscountType,
    subtotal,
    discountAmount,
    grandTotal,
    totalQuantityOrdered,
    totalAdditionalCosts,
    formatCurrency,
    handleChange,
    addAdditionalCost,
    removeAdditionalCost,
    updateAdditionalCost,
}) => {
    return (
        <div className="grn-summary-section">
            <div className="section-header-with-toggle">
                <h2 className="section-title">Tổng hợp đơn hàng</h2>
            </div>

            <div className="grn-summary-grid">
                {/* Tổng số lượng đặt & Tạm tính */}
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

                {/* Chiết khấu & Chi phí thêm */}
                <div className="grn-form-two-columns">
                    {/* Chiết khấu */}
                    <div className="form-field">
                        <label className="form-label">Chiết khấu</label>
                        <div className="grn-discount-section">
                            <div className="grn-discount-buttons">
                                <button
                                    type="button"
                                    className={`btn btn-sm ${discountType === 'amount' ? 'btn-primary' : 'btn-card-text'}`}
                                    onClick={() => setDiscountType('amount')}
                                >
                                    Số tiền
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${discountType === 'percent' ? 'btn-primary' : 'btn-card-text'}`}
                                    onClick={() => setDiscountType('percent')}
                                >
                                    %
                                </button>
                            </div>
                            {discountType === 'percent' ? (
                                <input
                                    type="number"
                                    name="discount"
                                    value={formData.discount}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    className="form-input grn-discount-input"
                                    placeholder="0-100"
                                />
                            ) : (
                                <input
                                    type="number"
                                    name="discountAmountFixed"
                                    value={formData.discountAmountFixed || ''}
                                    onChange={handleChange}
                                    min="0"
                                    className="form-input grn-discount-input"
                                    placeholder="Nhập số tiền (VND)"
                                />
                            )}
                        </div>
                    </div>

                    {/* Chi phí thêm */}
                    <div className="form-field">
                        <label className="form-label">Chi phí</label>
                        <div className="grn-costs-section">
                            {(formData.additionalCosts || []).map((cost) => (
                                <div key={cost.id} className="grn-cost-row">
                                    <input
                                        type="text"
                                        value={cost.name}
                                        onChange={(e) => updateAdditionalCost(cost.id, 'name', e.target.value)}
                                        placeholder="Tên"
                                        className="form-input grn-cost-name"
                                    />
                                    <input
                                        type="number"
                                        value={cost.amount || ''}
                                        onChange={(e) => updateAdditionalCost(cost.id, 'amount', e.target.value)}
                                        placeholder="Số tiền"
                                        className="form-input grn-cost-amount"
                                        min="0"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-cancel grn-cost-remove"
                                        onClick={() => removeAdditionalCost(cost.id)}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-sm btn-card-text grn-cost-add"
                                onClick={addAdditionalCost}
                            >
                                + Thêm chi phí
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tổng tiền */}
                <div className="grn-total-section">
                    <div className="grn-total-details">
                        <div className="grn-discount-row">
                            <span className="grn-total-label">Chiết khấu:</span>
                            <span className="grn-discount-value">- {formatCurrency(discountAmount)}</span>
                        </div>
                        {(formData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).map((c) => (
                            <div key={c.id} className="grn-cost-item">
                                <span>{c.name?.trim() ? c.name.trim() : 'Chi phí'}:</span>
                                <span className="grn-cost-value">+ {formatCurrency(Number(c.amount) || 0)}</span>
                            </div>
                        ))}
                        {(formData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).length > 0 && (
                            <div className="grn-total-cost-row">
                                <span className="grn-total-label">Tổng chi phí:</span>
                                <span className="grn-cost-value">+ {formatCurrency(totalAdditionalCosts)}</span>
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
