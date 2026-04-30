import { useMemo, useState } from 'react';
import {
    createReleaseRequest,
    uploadReleaseRequestAttachments,
    updateReleaseRequest,
} from '../../../lib/releaseRequestService';

export function useReleaseRequestSubmit({
    isEditMode,
    editId,
    navigate,
    showToast,
    form,
    selectedCompanyId,
    selectedReceiverId,
    selectedAddressId,
    selectedAddress,
    lineItems,
    quotationFile,
    contractFile,
    appendixFile,
    baseValidationError,
    validateLineItems,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    const canCreateRequest = useMemo(() => (
        Boolean(selectedCompanyId)
        && Boolean(selectedReceiverId)
        && Boolean(form.warehouseId)
        && Boolean(form.purpose.trim())
        && lineItems.length > 0
    ), [selectedCompanyId, selectedReceiverId, form.warehouseId, form.purpose, lineItems]);

    const canSubmitForApproval = useMemo(() => (
        canCreateRequest
        && Boolean(quotationFile)
        && Boolean(contractFile)
    ), [canCreateRequest, quotationFile, contractFile]);

    const canSaveDraft = useMemo(() => !baseValidationError, [baseValidationError]);
    const canCreateQuotationDraft = useMemo(() => canSaveDraft, [canSaveDraft]);

    const buildPayload = ({ isQuotationFlow } = {}) => {
        let address = '';
        let city = '';
        let district = '';
        let ward = '';
        let addressId = null;

        if (selectedAddress) {
            addressId = Number(selectedAddress.addressId ?? selectedAddress.AddressId);
            address = selectedAddress.addressDetail || selectedAddress.AddressDetail || selectedAddress.addressName || selectedAddress.AddressName || '';
            city = selectedAddress.city || selectedAddress.City || '';
            district = selectedAddress.district || selectedAddress.District || '';
            ward = selectedAddress.ward || selectedAddress.Ward || '';
        }

        return {
            warehouseId: Number(form.warehouseId),
            receiverId: Number(selectedReceiverId),
            companyId: Number(selectedCompanyId),
            expectedDate: form.expectedDate || null,
            purpose: form.purpose.trim() || null,
            note: form.note.trim() || null,
            isPartialDeliveryAllowed: Boolean(form.isPartialDeliveryAllowed),
            isQuotationFlow: Boolean(isQuotationFlow ?? form.isQuotationFlow),
            addressId,
            address,
            city,
            district,
            ward,
            lines: lineItems.map((line) => ({
                itemId: Number(line.itemId),
                requestedQty: Number(line.quantity),
                uomId: line.uomId ? Number(line.uomId) : null,
                note: line.note?.trim() || null,
                unitPrice: line.unitPrice === '' || line.unitPrice == null ? null : Number(line.unitPrice),
                packagingSpecId: line.packagingSpecId ? Number(line.packagingSpecId) : null,
            })),
        };
    };

    const handleSaveDraft = async (e, options = {}) => {
        e?.preventDefault();
        if (baseValidationError) {
            showToast(baseValidationError, 'error');
            return;
        }
        const isQuotationFlow = Boolean(options.isQuotationFlow);
        setSavingDraft(true);
        try {
            const res = isEditMode
                ? await updateReleaseRequest(editId, { ...buildPayload({ isQuotationFlow }), status: 'DRAFT' })
                : await createReleaseRequest({ ...buildPayload({ isQuotationFlow }), status: 'DRAFT' });
            const rrId = Number(editId) || res?.releaseRequestId || res?.ReleaseRequestId;
            let uploadWarning = '';
            if (rrId && (quotationFile || contractFile || appendixFile)) {
                try {
                    await uploadReleaseRequestAttachments(rrId, {
                        quotationFile,
                        contractFile,
                        appendixFile,
                    });
                } catch (uploadErr) {
                    const data = uploadErr?.response?.data;
                    uploadWarning = data?.message || uploadErr?.message || 'Không thể tải tệp đính kèm.';
                }
            }
            showToast(
                uploadWarning
                    ? `${isEditMode ? 'Cập nhật nháp' : 'Lưu nháp'} thành công, nhưng upload file lỗi: ${uploadWarning}`
                    : `${isEditMode ? 'Cập nhật nháp' : 'Lưu nháp'} thành công!`,
                uploadWarning ? 'warning' : 'success'
            );
            const nextPath = (() => {
                if (isEditMode) return `/release-request/${editId}`;
                if (isQuotationFlow && rrId) return `/release-request/${rrId}`;
                return '/release-request';
            })();
            setTimeout(() => navigate(nextPath), 1200);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Lưu nháp thất bại.';
            showToast(msg, 'error');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleCreateRequest = async (e) => {
        e?.preventDefault();

        if (!selectedCompanyId) {
            showToast('Vui lòng chọn công ty.', 'error');
            return;
        }
        if (!selectedReceiverId) {
            showToast('Vui lòng chọn người nhận.', 'error');
            return;
        }
        if (!form.warehouseId) {
            showToast('Vui lòng chọn kho xuất.', 'error');
            return;
        }
        if (!form.purpose.trim()) {
            showToast('Vui lòng nhập lý do xuất hàng.', 'error');
            return;
        }
        if (lineItems.length === 0) {
            showToast('Vui lòng thêm ít nhất 1 vật tư.', 'error');
            return;
        }
        if (!validateLineItems()) return;
        if (!selectedAddressId) {
            showToast('Vui lòng nhập địa chỉ giao hàng.', 'error');
            return;
        }
        if (!quotationFile || !contractFile) {
            showToast('Vui lòng tải lên đủ Báo giá và Hợp đồng trước khi gửi duyệt.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = buildPayload({ isQuotationFlow: false });
            let rrId = Number(editId) || null;
            let res;

            if (isEditMode) {
                await updateReleaseRequest(editId, { ...payload, status: 'DRAFT' });
                rrId = Number(editId);
                await uploadReleaseRequestAttachments(rrId, {
                    quotationFile,
                    contractFile,
                    appendixFile,
                });
                res = await updateReleaseRequest(editId, { ...payload, status: 'PENDING_ACC' });
            } else {
                const draftRes = await createReleaseRequest({ ...payload, status: 'DRAFT' });
                rrId = draftRes?.releaseRequestId || draftRes?.ReleaseRequestId;
                if (!rrId) throw new Error('Không xác định được mã yêu cầu sau khi tạo nháp.');

                await uploadReleaseRequestAttachments(rrId, {
                    quotationFile,
                    contractFile,
                    appendixFile,
                });
                res = await updateReleaseRequest(rrId, { ...payload, status: 'PENDING_ACC' });
            }

            showToast(
                `${isEditMode ? 'Cập nhật RR' : 'Tạo yêu cầu xuất hàng'} thành công${res?.releaseRequestCode || res?.ReleaseRequestCode ? ` (${res.releaseRequestCode ?? res.ReleaseRequestCode})` : ''}!`,
                'success'
            );
            setTimeout(() => navigate(isEditMode ? `/release-request/${editId}` : '/release-request'), 1200);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Tạo yêu cầu xuất hàng thất bại.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateQuotationDraft = (e) => handleSaveDraft(e, { isQuotationFlow: true });

    return {
        submitting,
        savingDraft,
        canCreateRequest,
        canSubmitForApproval,
        canSaveDraft,
        canCreateQuotationDraft,
        handleSaveDraft,
        handleCreateRequest,
        handleCreateQuotationDraft,
    };
}
