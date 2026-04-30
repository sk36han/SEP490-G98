import React from 'react';

export function ShippingInfoSection({ form, setForm }) {
    return (
        <div className="info-section" style={{ margin: 0 }}>
            <div className="section-header-with-toggle">
                <h2 className="section-title">Thông tin xuất hàng</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-field" style={{ margin: 0 }}>
                    <label className="form-label">Ngày xuất dự kiến</label>
                    <input type="date" value={form.expectedDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))} className="form-input" />
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                    <label className="form-label">Lý do xuất hàng <span className="required-mark">*</span> <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12 }}>(khi gửi duyệt)</span></label>
                    <input type="text" value={form.purpose} onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))} className="form-input" placeholder="Nhập lý do xuất hàng" />
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151', lineHeight: 1.45 }}>
                        <input
                            type="checkbox"
                            checked={Boolean(form.isPartialDeliveryAllowed)}
                            onChange={(e) => setForm((prev) => ({ ...prev, isPartialDeliveryAllowed: e.target.checked }))}
                            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: '#2196F3' }}
                        />
                        Cho phép xuất kho từng phần (không bắt buộc đủ tồn một lần khi gửi duyệt)
                    </label>
                </div>
                <div
                    style={{
                        marginTop: 4,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.25)',
                        fontSize: 13,
                        color: '#1e3a8a',
                        lineHeight: 1.55,
                    }}
                >
                    Người dùng có thể chọn 1 trong 2 nút ở đầu trang:
                    <br />• Tạo báo giá: lưu RR dạng báo giá (nháp), tiếp tục xử lý ở màn chi tiết.
                    <br />• Tạo &amp; Gửi duyệt: gửi kế toán duyệt ngay (bắt buộc có Báo giá + Hợp đồng).
                </div>
            </div>
        </div>
    );
}
