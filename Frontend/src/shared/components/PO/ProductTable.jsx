/**
 * ProductTable - Component hiển thị danh sách sản phẩm/vật tư
 * Tách từ CreatePurchaseOrder.jsx
 */

import React from 'react';
import { Search, X, Plus, Trash2, Eye, Package, Image as ImageIcon, Loader } from 'lucide-react';
import './ProductTable.css';

const ProductTable = ({
    lines,
    selectedLineIds,
    showProductSearch,
    setShowProductSearch,
    searchKeyword,
    setSearchKeyword,
    filteredProducts,
    selectedProductIds,
    imageErrors,
    errors,
    productsLoading,
    productsError,
    formatCurrency,
    isValidImageUrl,
    handleImageError,
    handleSelectProduct,
    toggleProductSelection,
    addSelectedProducts,
    handleSearchChange,
    closeProductSearch,
    addLine,
    removeLine,
    updateLine,
    removeSelectedLines,
    toggleLineSelection,
    toggleSelectAll,
    getItemsForDisplay,
    setProducts,
    setProductsError,
    setFilteredProducts,
    products,
}) => {
    const handleSearchFocus = () => {
        if (!showProductSearch) {
            setShowProductSearch(true);
        }
    };

    const handleRetryLoad = () => {
        setProducts([]);
        setProductsError(null);
        getItemsForDisplay()
            .then(itemList => {
                const mapped = (Array.isArray(itemList) ? itemList : [])
                    .filter(Boolean)
                    .map(it => ({
                        id: it.itemId,
                        name: it.itemName ?? '',
                        sku: it.itemCode ?? '',
                        unitPrice: Number(it.purchasePrice ?? 0),
                        uom: it.uomName || '',
                        image: it.imageUrl || null,
                    }));
                setProducts(mapped);
                setFilteredProducts(mapped);
            })
            .catch(err => {
                setProductsError('Không thể tải danh sách vật tư');
            });
    };

    return (
        <div className="po-product-section">
            <div className="section-header-with-toggle">
                <h2 className="section-title">Chi tiết vật tư</h2>
                <div className="po-header-actions">
                    {selectedLineIds.length > 0 && (
                        <button
                            type="button"
                            onClick={removeSelectedLines}
                            className="btn btn-sm po-btn-delete-selected"
                        >
                            <Trash2 size={16} />
                            Xóa ({selectedLineIds.length})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={addLine}
                        className="btn btn-sm po-btn-add-product"
                    >
                        <Plus size={16} />
                        Thêm vật tư
                    </button>
                </div>
            </div>

            {errors.lines && <div className="error-message po-error-message">{errors.lines}</div>}

            {/* Search Bar với Animation */}
            {showProductSearch && (
                <div className="po-search-wrapper">
                    <div className="po-search-input-wrapper">
                        <Search size={20} className="po-search-icon" />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            placeholder="Tìm kiếm theo tên vật tư..."
                            autoFocus
                            className="po-search-input"
                        />
                        <button
                            type="button"
                            onClick={closeProductSearch}
                            className="po-search-close-btn"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Dropdown Results */}
                    {showProductSearch && (
                        <div className="po-search-dropdown">
                            <div className="po-search-header">
                                {productsLoading ? 'Đang tải...' : `${filteredProducts.length} vật tư`}
                            </div>

                            {productsLoading ? (
                                <div className="po-loading-container">
                                    <Loader size={24} className="po-loading-spinner" />
                                    <p>Đang tải danh sách vật tư...</p>
                                </div>
                            ) : productsError ? (
                                <div className="po-error-container">
                                    <p>{productsError}</p>
                                    <button
                                        type="button"
                                        onClick={handleRetryLoad}
                                        className="btn btn-sm"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="po-empty-dropdown">
                                    <Package size={32} className="po-empty-icon" />
                                    <p>
                                        {searchKeyword ? `Không tìm thấy vật tư nào matching "${searchKeyword}"` : 'Không có vật tư nào trong hệ thống'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {filteredProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className="po-search-item"
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.includes(product.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleProductSelection(product.id);
                                                }}
                                                className="po-checkbox"
                                            />

                                            {isValidImageUrl(product.image) && !imageErrors[`product-${product.id}`] ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    onError={() => handleImageError(`product-${product.id}`)}
                                                    className="po-search-item-image"
                                                />
                                            ) : (
                                                <div className="po-search-item-image-placeholder">
                                                    <ImageIcon size={20} color="#9ca3af" />
                                                </div>
                                            )}

                                            <div
                                                className="po-search-item-info"
                                                onClick={() => handleSelectProduct(product)}
                                            >
                                                <div className="po-search-item-name">
                                                    {product.name}
                                                    <span className="po-search-item-price">
                                                        {formatCurrency(product.unitPrice)}
                                                    </span>
                                                </div>
                                                <div className="po-search-item-meta">
                                                    <span>Mã: {product.sku}</span>
                                                    <span>•</span>
                                                    <span>ĐVT: {product.uom}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {selectedProductIds.length > 0 && (
                                        <div className="po-selected-footer">
                                            <button
                                                type="button"
                                                onClick={addSelectedProducts}
                                                className="btn btn-sm po-btn-add-selected"
                                            >
                                                <Plus size={16} />
                                                Thêm {selectedProductIds.length} vật tư
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {lines.length === 0 ? (
                <div className="po-empty-state">
                    <Package size={64} strokeWidth={1.5} className="po-empty-state-icon" />
                    <p className="po-empty-state-text">Chưa có vật tư nào</p>
                    <p className="po-empty-state-hint">Nhấn "Thêm vật tư" để bắt đầu</p>
                </div>
            ) : (
                <div className="po-table-container">
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={lines.length > 0 && selectedLineIds.length === lines.length}
                                        onChange={toggleSelectAll}
                                        className="po-checkbox po-checkbox-header"
                                    />
                                </th>
                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                <th style={{ textAlign: 'left' }}>Tên vật tư *</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>SL đặt *</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Đơn giá</th>
                                <th style={{ width: '140px', textAlign: 'center' }}>Thành tiền</th>
                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ xuất xứ (CO)">CO</th>
                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ chất lượng (CQ)">CQ</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, index) => (
                                <tr key={line.id} className="po-product-row">
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedLineIds.includes(line.id)}
                                            onChange={() => toggleLineSelection(line.id)}
                                            className="po-checkbox"
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {isValidImageUrl(line.itemImage) && !imageErrors[`line-${line.id}`] ? (
                                                <img
                                                    src={line.itemImage}
                                                    alt={line.itemName}
                                                    onError={() => handleImageError(`line-${line.id}`)}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        objectFit: 'cover',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e5e7eb',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f3f4f6',
                                                    flexShrink: 0
                                                }}>
                                                    <ImageIcon size={20} color="#9ca3af" />
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        console.log('View product detail:', line.itemId);
                                                    }}
                                                    className="po-product-link"
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {line.itemName}
                                                </a>
                                                <button
                                                    type="button"
                                                    className="btn-icon-only po-action-btn po-action-btn-view"
                                                    title="Xem chi tiết sản phẩm"
                                                    onClick={() => {
                                                        console.log('View product detail:', line.itemId);
                                                    }}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={line.orderedQty != null ? line.orderedQty : ''}
                                            onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                            min="1"
                                            className="form-input po-input-number"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={line.unitPrice != null ? line.unitPrice : ''}
                                            onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                            min="0"
                                            className="form-input po-input-number"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#2196F3' }}>
                                        {formatCurrency(line.totalPrice)}
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ xuất xứ (CO)">
                                        <input
                                            type="checkbox"
                                            checked={!!line.hasCO}
                                            readOnly
                                            disabled
                                            style={{ width: 18, height: 18, cursor: 'default', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ chất lượng (CQ)">
                                        <input
                                            type="checkbox"
                                            checked={!!line.hasCQ}
                                            readOnly
                                            disabled
                                            style={{ width: 18, height: 18, cursor: 'default', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <div className="po-action-buttons">
                                            <button
                                                type="button"
                                                className="btn-icon-only po-action-btn po-action-btn-view"
                                                title="Xem chi tiết sản phẩm"
                                                onClick={() => {
                                                    console.log('View product detail:', line.itemId);
                                                }}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeLine(index)}
                                                className="btn-icon-only po-action-btn po-action-btn-delete"
                                                title="Xóa dòng"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProductTable;
