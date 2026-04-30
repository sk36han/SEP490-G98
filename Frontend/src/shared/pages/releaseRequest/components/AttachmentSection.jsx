import React from 'react';
import { FileSpreadsheet, FileText, FileStack } from 'lucide-react';

export function AttachmentSection({
    isEditMode,
    quotationFile,
    setQuotationFile,
    contractFile,
    setContractFile,
    appendixFile,
    setAppendixFile,
    existingQuotationAttachment,
    existingContractAttachment,
    existingAppendixAttachment,
    toAbsoluteFileUrl,
}) {
    return (
        <div className="info-section" style={{ margin: 0 }}>
            <div className="section-header-with-toggle">
                <h2 className="section-title">Tệp đính kèm</h2>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                Khi Tạo & Gửi duyệt, bắt buộc có Báo giá và Hợp đồng. Lưu nháp có thể bỏ qua hoặc chỉ đính kèm một phần.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-field" style={{ margin: 0 }}>
                    <label htmlFor="rr-quotation-file" className="form-label">
                        File báo giá <span className="required-mark">*</span> <span style={{ fontWeight: 400, color: '#94a3b8' }}>(khi gửi duyệt)</span>
                    </label>
                    <div className="input-wrapper">
                        <FileSpreadsheet className="input-icon" size={16} />
                        <input
                            id="rr-quotation-file"
                            type="file"
                            className="form-input"
                            onChange={(e) => setQuotationFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    {quotationFile && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Đã chọn: {quotationFile.name}
                        </div>
                    )}
                    {!quotationFile && isEditMode && existingQuotationAttachment && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Hiện có: <a href={toAbsoluteFileUrl(existingQuotationAttachment.fileUrl)} target="_blank" rel="noreferrer">{existingQuotationAttachment.fileName}</a>
                        </div>
                    )}
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                    <label htmlFor="rr-contract-file" className="form-label">
                        Hợp đồng <span className="required-mark">*</span> <span style={{ fontWeight: 400, color: '#94a3b8' }}>(khi gửi duyệt)</span>
                    </label>
                    <div className="input-wrapper">
                        <FileText className="input-icon" size={16} />
                        <input
                            id="rr-contract-file"
                            type="file"
                            className="form-input"
                            onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    {contractFile && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Đã chọn: {contractFile.name}
                        </div>
                    )}
                    {!contractFile && isEditMode && existingContractAttachment && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Hiện có: <a href={toAbsoluteFileUrl(existingContractAttachment.fileUrl)} target="_blank" rel="noreferrer">{existingContractAttachment.fileName}</a>
                        </div>
                    )}
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                    <label htmlFor="rr-appendix-file" className="form-label">
                        Phụ lục hợp đồng <span style={{ fontWeight: 400, color: '#94a3b8' }}>(tùy chọn)</span>
                    </label>
                    <div className="input-wrapper">
                        <FileStack className="input-icon" size={16} />
                        <input
                            id="rr-appendix-file"
                            type="file"
                            className="form-input"
                            onChange={(e) => setAppendixFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    {appendixFile && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Đã chọn: {appendixFile.name}
                        </div>
                    )}
                    {!appendixFile && isEditMode && existingAppendixAttachment && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                            Hiện có: <a href={toAbsoluteFileUrl(existingAppendixAttachment.fileUrl)} target="_blank" rel="noreferrer">{existingAppendixAttachment.fileName}</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
