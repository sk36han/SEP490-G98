/**
 * DiscountSection - Component hiển thị phần chiết khấu và tổng tiền
 * Tách từ CreatePurchaseOrder.jsx
 */

import React from 'react';
import './DiscountSection.css';

const DiscountSection = ({
    formData,
    errors,
    discountType,
    setDiscountType,
    subtotal,
    discountAmount,
    grandTotal,
    totalQuantity,
    formatCurrency,
    handleChange,
}) => {
    return (
        <div className="po-summary-section">
            <div className="section-header-with-toggle">
                <h2 className="section-title">Tổng hợp đơn hàng</h2>
            </div>

            <div className="po-summary-grid">
                {/* Tổng số lượng đặt & Tạm tính */}
                <div className="po-summary-row">
                    <div className="po-summary-item">
                        <label className="form-label">Tổng số lượng đặt</label>
                        <div className="po-summary-value">
                            {totalQuantity} sản phẩm
                        </div>
                    </div>

                    <div className="po-summary-item">
                        <label className="form-label">Tạm tính</label>
                        <div className="po-summary-value">
                            {formatCurrency(subtotal)}
                        </div>
                    </div>
                </div>

                {/* Chiết khấu */}
                <div className="po-form-two-columns">
                    <div className="form-field">
                        <label className="form-label">Chiết khấu</label>
                        <div className="po-discount-section">
                            <div className="po-discount-buttons">
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
                                    className={`form-input po-discount-input ${errors.discount ? 'error' : ''}`}
                                    placeholder="0-100"
                                />
                            ) : (
                                <input
                                    type="number"
                                    name="discountAmountFixed"
                                    value={formData.discountAmountFixed || ''}
                                    onChange={handleChange}
                                    min="0"
                                    className={`form-input po-discount-input ${errors.discountAmountFixed ? 'error' : ''}`}
                                    placeholder="Nhập số tiền (VND)"
                                />
                            )}
                            {errors.discount && (
                                <span className="error-message">{errors.discount}</span>
                            )}
                            {errors.discountAmountFixed && (
                                <span className="error-message">{errors.discountAmountFixed}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tổng tiền */}
                <div className="po-total-section">
                    <span className="po-total-label">
                        Tổng giá trị đơn:
                    </span>
                    <div className="po-total-right">
                        <span className="po-discount-value">- {formatCurrency(discountAmount)}</span>
                        <span className="po-total-value">
                            {formatCurrency(grandTotal)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscountSection;
