import React from 'react';
import { ArrowLeft, X, Loader, Send } from 'lucide-react';

export function ReleaseRequestHeaderActions({
    onBack,
    canCreateQuotationDraft,
    canSubmitForApproval,
    canCreateRequest,
    savingDraft,
    submitting,
    onCreateQuotation,
    onSubmitApproval,
}) {
    return (
        <div className="page-header">
            <div className="page-header-left">
                <button type="button" onClick={onBack} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Quay lại</span>
                </button>
            </div>
            <div className="page-header-actions">
                <button type="button" onClick={onBack} className="btn btn-cancel" disabled={submitting || savingDraft}>
                    <X size={15} />Hủy
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!canCreateQuotationDraft || savingDraft || submitting}
                    onClick={onCreateQuotation}
                    title={!canCreateQuotationDraft ? 'Vui lòng nhập đủ thông tin bắt buộc để tạo báo giá.' : undefined}
                    style={{ minWidth: 150 }}
                >
                    {savingDraft ? <><Loader size={15} className="spinner" />Đang tạo...</> : <><Send size={15} />Tạo báo giá</>}
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSubmitForApproval || submitting || savingDraft}
                    onClick={onSubmitApproval}
                    title={!canSubmitForApproval && canCreateRequest ? 'Cần tải Báo giá và Hợp đồng' : undefined}
                >
                    {submitting ? (
                        <><Loader size={15} className="spinner" />Đang gửi...</>
                    ) : (
                        <><Send size={15} />Tạo & Gửi duyệt</>
                    )}
                </button>
            </div>
        </div>
    );
}
