/**
 * ProductSearchDropdown - Component tìm kiếm và chọn sản phẩm
 * Tách từ CreatePurchaseOrder.jsx
 */

import React from 'react';
import { Search, X, Loader, Package, Image as ImageIcon, Plus } from 'lucide-react';
import './ProductSearchDropdown.css';

const ProductSearchDropdown = ({
    isOpen,
    searchKeyword,
    onSearchChange,
    onClose,
    products,
    productsLoading,
    productsError,
    selectedProductIds,
    onToggleProductSelection,
    onAddSelectedProducts,
    onReloadProducts,
    isValidImageUrl,
    imageErrors,
    onImageError,
    formatCurrency,
}) => {
    if (!isOpen) return null;

    return (
        <div className="po-search-dropdown">
            {/* Search Header */}
            <div className="po-search-header">
                {productsLoading ? 'Đang tải...' : `${products.length} vật tư`}
            </div>

            {/* Loading State */}
            {productsLoading ? (
                <div className="po-loading-container">
                    <Loader size={24} className="spinner po-loading-spinner" />
                    <p>Đang tải danh sách vật tư...</p>
                </div>
            ) : productsError ? (
                /* Error State */
                <div className="po-error-container">
                    <p>{productsError}</p>
                    <button
                        type="button"
                        onClick={onReloadProducts}
                        className="btn-retry"
                    >
                        Thử lại
                    </button>
                </div>
            ) : products.length === 0 ? (
                /* Empty State */
                <div className="po-empty-dropdown">
                    <Package size={32} />
                    <p>
                        {searchKeyword
                            ? `Không tìm thấy vật tư nào matching "${searchKeyword}"`
                            : 'Không có vật tư nào trong hệ thống'}
                    </p>
                </div>
            ) : (
                /* Product List */
                <>
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="po-search-item"
                            onMouseEnter={(e) => e.currentTarget.classList.add('hovered')}
                            onMouseLeave={(e) => e.currentTarget.classList.remove('hovered')}
                            onClick={() => {
                                // Toggle selection on click
                                const newSelected = selectedProductIds.includes(product.id)
                                    ? selectedProductIds.filter(id => id !== product.id)
                                    : [...selectedProductIds, product.id];
                                onToggleProductSelection(product.id);
                            }}
                        >
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleProductSelection(product.id);
                                }}
                                className="po-checkbox"
                            />

                            {/* Product Image */}
                            {isValidImageUrl(product.image) && !imageErrors[`product-${product.id}`] ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    onError={() => onImageError(`product-${product.id}`)}
                                    className="po-search-item-image"
                                />
                            ) : (
                                <div className="po-search-item-image-placeholder">
                                    <ImageIcon size={20} />
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="po-search-item-info">
                                <div className="po-search-item-name">
                                    {product.name}
                                </div>
                                <div className="po-search-item-meta">
                                    <span>Mã: {product.sku}</span>
                                    <span>•</span>
                                    <span>ĐVT: {product.uom}</span>
                                </div>
                            </div>

                            {/* Price */}
                            <span className="po-search-item-price">
                                {formatCurrency(product.unitPrice)}
                            </span>
                        </div>
                    ))}

                    {/* Add Selected Button */}
                    {selectedProductIds.length > 0 && (
                        <div className="po-selected-footer">
                            <button
                                type="button"
                                onClick={onAddSelectedProducts}
                                className="btn-add-selected"
                            >
                                <Plus size={16} />
                                Thêm {selectedProductIds.length} vật tư
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductSearchDropdown;
