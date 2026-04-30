import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Plus, MapPin, User, Package, Search, Trash2,
    Building2, Phone, Mail, Briefcase, CircleHelp,
} from 'lucide-react';
import {
    CircularProgress,
} from '@mui/material';
import {
    CreateCompanyDialog,
    CreateAddressDialog,
    CreateReceiverDialog,
} from '@ui/dialogs';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getCompanies } from '../lib/companyService';
import { getReceiversByCompany } from '../lib/receiverService';
import { getAddressesByCompany } from '../lib/addressService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsByWarehouse } from '../lib/itemService';
import {
    getReleaseRequestDetail,
} from '../lib/releaseRequestService';
import { useReleaseRequestSubmit } from './releaseRequest/hooks/useReleaseRequestSubmit';
import { ReleaseRequestHeaderActions } from './releaseRequest/components/ReleaseRequestHeaderActions';
import { ShippingInfoSection } from './releaseRequest/components/ShippingInfoSection';
import { AttachmentSection } from './releaseRequest/components/AttachmentSection';
import { ConfirmActionDialog } from './releaseRequest/components/ConfirmActionDialog';
import {
    formatVndInteger,
    formatLineTotalVnd,
    normalizeId,
    formatAddress,
    getLineItemsValidationError,
    findAttachmentByType,
    toAbsoluteFileUrl,
} from './releaseRequest/createReleaseRequest.utils';
import '../styles/CreateSupplier.css';
const MAX_NOTE = 250;
const MAX_LINE_NOTE = 500;

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const isEditMode = Boolean(editId);
    const { toast, showToast, clearToast } = useToast();

    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const [companies, setCompanies] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [addresses, setAddresses] = useState([]);

    const [loading, setLoading] = useState(true);
    const [editLoading, setEditLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [isHydratingEdit, setIsHydratingEdit] = useState(false);

    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedReceiverId, setSelectedReceiverId] = useState('');
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [receiverDetail, setReceiverDetail] = useState(null);

    const [form, setForm] = useState({
        warehouseId: '',
        warehouseName: '',
        expectedDate: new Date().toISOString().slice(0, 10),
        purpose: '',
        note: '',
        isPartialDeliveryAllowed: true,
        isQuotationFlow: false,
    });

    const [lineItems, setLineItems] = useState([]);
    const [quotationFile, setQuotationFile] = useState(null);
    const [contractFile, setContractFile] = useState(null);
    const [appendixFile, setAppendixFile] = useState(null);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [itemKeyword, setItemKeyword] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState([]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [companyResult, warehouseResult] = await Promise.all([
                    getCompanies(),
                    getWarehouseList({ pageSize: 100 }),
                ]);

                setCompanies(Array.isArray(companyResult) ? companyResult : (companyResult?.items ?? []));
                setWarehouses(warehouseResult?.items ?? []);
            } catch {
                showToast('Không tải được danh sách. Vui lòng thử lại.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [showToast]);

    useEffect(() => {
        if (!form.warehouseId) {
            setItems([]);
            if (!isEditMode && !isHydratingEdit) setLineItems([]);
            return;
        }

        const fetchItems = async () => {
            setItemsLoading(true);
            if (!isEditMode && !isHydratingEdit) setLineItems([]);
            try {
                const data = await getItemsByWarehouse(Number(form.warehouseId));
                setItems(Array.isArray(data) ? data : []);
            } catch {
                showToast('Không tải được danh sách vật tư. Vui lòng thử lại.', 'error');
            } finally {
                setItemsLoading(false);
            }
        };

        fetchItems();
    }, [form.warehouseId, showToast, isHydratingEdit, isEditMode]);

    const loadReceivers = useCallback(async (companyId) => {
        if (!companyId) {
            setReceivers([]);
            return;
        }

        try {
            const list = await getReceiversByCompany(Number(companyId));
            setReceivers(Array.isArray(list) ? list : []);
        } catch {
            setReceivers([]);
        }
    }, []);

    const loadAddresses = useCallback(async (companyId) => {
        if (!companyId) {
            setAddresses([]);
            setSelectedAddressId('');
            return;
        }

        try {
            const list = await getAddressesByCompany(Number(companyId));
            const normalizedList = Array.isArray(list) ? list : [];
            setAddresses(normalizedList);

            const defaultAddr = normalizedList.find((a) => a?.isDefault || a?.IsDefault);
            if (defaultAddr) {
                setSelectedAddressId(normalizeId(defaultAddr.addressId ?? defaultAddr.AddressId));
            } else if (normalizedList.length > 0) {
                setSelectedAddressId(normalizeId(normalizedList[0].addressId ?? normalizedList[0].AddressId));
            } else {
                setSelectedAddressId('');
            }
        } catch {
            setAddresses([]);
            setSelectedAddressId('');
        }
    }, []);

    const handleCompanyChange = (e) => {
        const companyId = normalizeId(e.target.value);
        setSelectedCompanyId(companyId);
        setSelectedReceiverId('');
        setSelectedAddressId('');
        setReceiverDetail(null);
        loadReceivers(companyId);
        loadAddresses(companyId);
    };

    const handleReceiverChange = (e) => {
        const receiverId = normalizeId(e.target.value);
        setSelectedReceiverId(receiverId);

        if (!receiverId) {
            setReceiverDetail(null);
            return;
        }

        const receiver = receivers.find((r) => normalizeId(r.receiverId ?? r.ReceiverId) === receiverId);
        setReceiverDetail(receiver || null);
        loadAddresses(selectedCompanyId);
    };

    const handleWarehouseChange = (e) => {
        const warehouseId = normalizeId(e.target.value);
        const found = warehouses.find((w) => normalizeId(w.warehouseId ?? w.WarehouseId) === warehouseId);
        setForm((prev) => ({
            ...prev,
            warehouseId,
            warehouseName: found?.warehouseName ?? found?.WarehouseName ?? '',
        }));
    };

    useEffect(() => {
        const loadEditData = async () => {
            if (!isEditMode || !editId) return;
            setEditLoading(true);
            setIsHydratingEdit(true);
            try {
                const detail = await getReleaseRequestDetail(editId);
                if (!detail || detail.status !== 'DRAFT') {
                    showToast('Chỉ cho phép chỉnh sửa RR ở trạng thái DRAFT.', 'warning');
                    navigate(`/release-request/${editId}`);
                    return;
                }

                const companyId = normalizeId(detail.companyId ?? detail.receiver?.companyId);
                const receiverId = normalizeId(detail.receiverId ?? detail.receiver?.receiverId);
                const warehouseId = normalizeId(detail.warehouseId);

                setSelectedCompanyId(companyId);
                setSelectedReceiverId(receiverId);
                setReceiverDetail(detail.receiver ?? null);
                setForm((prev) => ({
                    ...prev,
                    warehouseId,
                    warehouseName: detail.warehouseName ?? '',
                    expectedDate: detail.expectedDate ?? '',
                    purpose: detail.purpose ?? '',
                    isPartialDeliveryAllowed: Boolean(detail.isPartialDeliveryAllowed),
                    isQuotationFlow: Boolean(detail.isQuotationFlow),
                }));

                await Promise.all([loadReceivers(companyId), loadAddresses(companyId)]);

                const warehouseItems = await getItemsByWarehouse(Number(detail.warehouseId));
                const normalizedItems = Array.isArray(warehouseItems) ? warehouseItems : [];
                setItems(normalizedItems);
                const itemMap = new Map(
                    normalizedItems.map((it) => [normalizeId(it.itemId ?? it.ItemId), it])
                );

                const mappedLines = (detail.lines ?? []).map((line) => {
                    const item = itemMap.get(normalizeId(line.itemId));
                    return {
                        id: `${Date.now()}-${line.releaseRequestLineId ?? line.itemId}`,
                        itemId: normalizeId(line.itemId),
                        itemName: line.itemName ?? '',
                        itemCode: line.itemCode ?? '',
                        uomName: line.uomName ?? '',
                        uomId: normalizeId(line.uomId),
                        availableQty: Number(item?.availableQty ?? item?.AvailableQty ?? line.stockQty ?? 0),
                        quantity: Number(line.requestedQty ?? 0),
                        warehousePrice: line.costPrice ?? null,
                        unitPrice: line.unitPrice ?? '',
                        packagingSpecId: line.packagingSpecId != null ? normalizeId(line.packagingSpecId) : '',
                        packagingSpecName: line.packagingSpecName ?? '',
                        note: line.note ?? '',
                    };
                });
                setLineItems(mappedLines);
                setExistingAttachments(Array.isArray(detail.attachments) ? detail.attachments : []);
            } catch (err) {
                showToast(err?.message || 'Không tải được dữ liệu chỉnh sửa RR.', 'error');
                navigate('/release-request');
            } finally {
                setIsHydratingEdit(false);
                setEditLoading(false);
            }
        };

        loadEditData();
    }, [isEditMode, editId, loadReceivers, loadAddresses, navigate, showToast]);

    const handleCreateCompanySuccess = (result) => {
        const newCompany = {
            companyId: result?.companyId ?? result?.CompanyId,
            companyCode: result?.companyCode ?? result?.CompanyCode ?? '',
            companyName: result?.companyName ?? result?.CompanyName ?? '',
        };
        setCompanies((prev) => [newCompany, ...prev]);
        const id = normalizeId(newCompany.companyId);
        setSelectedCompanyId(id);
        setSelectedReceiverId('');
        setSelectedAddressId('');
        setReceiverDetail(null);
        loadReceivers(id);
        loadAddresses(id);
        showToast('Tạo công ty thành công!', 'success');
    };

    const handleCreateReceiverSuccess = (result) => {
        const newReceiver = {
            receiverId: result?.receiverId ?? result?.ReceiverId,
            receiverName: result?.receiverName ?? result?.ReceiverName ?? '',
            phone: result?.phone ?? result?.Phone ?? '',
            email: result?.email ?? result?.Email ?? '',
            address: result?.address ?? result?.Address ?? '',
            city: result?.city ?? result?.City ?? '',
            district: result?.district ?? result?.District ?? '',
            ward: result?.ward ?? result?.Ward ?? '',
            position: result?.position ?? result?.Position ?? '',
        };
        setReceivers((prev) => [newReceiver, ...prev]);
        const id = normalizeId(newReceiver.receiverId);
        setSelectedReceiverId(id);
        setReceiverDetail(newReceiver);
        loadAddresses(selectedCompanyId);
        showToast('Tạo người nhận thành công!', 'success');
    };

    const handleCreateAddressSuccess = (result) => {
        const newAddress = {
            addressId: result?.addressId ?? result?.AddressId,
            companyId: result?.companyId ?? result?.CompanyId ?? selectedCompanyId,
            addressName: result?.addressName ?? result?.AddressName ?? '',
            addressDetail: result?.addressDetail ?? result?.AddressDetail ?? '',
            district: result?.district ?? result?.District ?? '',
            city: result?.city ?? result?.City ?? '',
            ward: result?.ward ?? result?.Ward ?? '',
            isDefault: result?.isDefault ?? result?.IsDefault ?? false,
        };
        setAddresses((prev) => [...prev, newAddress]);
        setSelectedAddressId(normalizeId(newAddress.addressId));
        showToast('Tạo địa chỉ thành công!', 'success');
    };

    const filteredItems = useMemo(() => {
        const keyword = itemKeyword.trim().toLowerCase();
        return items.filter((item) => {
            const availableQty = Number(item.availableQty ?? item.AvailableQty ?? 0);
            if (availableQty <= 0) return false;
            if (!keyword) return true;
            return String(item.itemName ?? item.ItemName ?? '').toLowerCase().includes(keyword)
                || String(item.itemCode ?? item.ItemCode ?? '').toLowerCase().includes(keyword);
        });
    }, [items, itemKeyword]);

    const handleSelectItem = (item) => {
        const itemId = normalizeId(item.itemId ?? item.ItemId);
        if (lineItems.some((line) => normalizeId(line.itemId ?? line.ItemId) === itemId)) {
            showToast('Vật tư đã có trong danh sách!', 'warning');
            return;
        }

        const defaultUnit = item.unitPrice ?? item.UnitPrice;
        const warehousePrice =
            defaultUnit != null && defaultUnit !== '' && Number.isFinite(Number(defaultUnit))
                ? Math.max(0, Math.round(Number(defaultUnit)))
                : null;
        const specId = item.packagingSpecId ?? item.PackagingSpecId;
        setLineItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random()}`,
                itemId,
                itemName: item.itemName ?? item.ItemName ?? '',
                itemCode: item.itemCode ?? item.ItemCode ?? '',
                uomName: item.uomName ?? item.baseUomName ?? item.UomName ?? '',
                uomId: normalizeId(item.uomId ?? item.UomId),
                availableQty: Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0),
                quantity: 1,
                warehousePrice,
                unitPrice: warehousePrice ?? '',
                packagingSpecId: specId != null && specId !== '' ? normalizeId(specId) : '',
                packagingSpecName: item.packagingSpecName ?? item.PackagingSpecName ?? '',
                note: '',
            },
        ]);
        setItemKeyword('');
        setShowItemSearch(false);
        showToast('Đã thêm vật tư', 'success');
    };

    const toggleItem = (id) => {
        setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const addSelectedItems = () => {
        if (!selectedItemIds.length) {
            showToast('Chọn ít nhất 1 vật tư', 'warning');
            return;
        }

        const existingIds = new Set(lineItems.map((line) => normalizeId(line.itemId ?? line.ItemId)));
        const newLines = items
            .filter((item) => selectedItemIds.includes(normalizeId(item.itemId ?? item.ItemId)))
            .filter((item) => !existingIds.has(normalizeId(item.itemId ?? item.ItemId)))
            .map((item) => {
                const defaultUnit = item.unitPrice ?? item.UnitPrice;
                const warehousePrice =
                    defaultUnit != null && defaultUnit !== '' && Number.isFinite(Number(defaultUnit))
                        ? Math.max(0, Math.round(Number(defaultUnit)))
                        : null;
                const specId = item.packagingSpecId ?? item.PackagingSpecId;
                return {
                    id: `${Date.now()}-${Math.random()}`,
                    itemId: normalizeId(item.itemId ?? item.ItemId),
                    itemName: item.itemName ?? item.ItemName ?? '',
                    itemCode: item.itemCode ?? item.ItemCode ?? '',
                    uomName: item.uomName ?? item.baseUomName ?? item.UomName ?? '',
                    uomId: normalizeId(item.uomId ?? item.UomId),
                    availableQty: Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0),
                    quantity: 1,
                    warehousePrice,
                    unitPrice: warehousePrice ?? '',
                    packagingSpecId: specId != null && specId !== '' ? normalizeId(specId) : '',
                    packagingSpecName: item.packagingSpecName ?? item.PackagingSpecName ?? '',
                    note: '',
                };
            });

        if (newLines.length) {
            setLineItems((prev) => [...prev, ...newLines]);
        }

        setItemKeyword('');
        setShowItemSearch(false);
        setSelectedItemIds([]);
        showToast(`Đã thêm ${newLines.length} vật tư`, 'success');
    };

    const updateLine = (index, field, value) => {
        setLineItems((prev) => prev.map((line, lineIndex) => {
            if (lineIndex !== index) return line;
            return { ...line, [field]: value };
        }));
    };

    const validateLineItems = useCallback(() => {
        for (const line of lineItems) {
            const qty = Number(line.quantity);
            if (!Number.isFinite(qty) || qty <= 0) {
                showToast(`Số lượng của vật tư "${line.itemName || line.itemCode || 'không xác định'}" phải lớn hơn 0.`, 'error');
                return false;
            }

            const unit = line.unitPrice === '' || line.unitPrice == null ? null : Number(line.unitPrice);
            if (unit != null && Number.isFinite(unit) && line.warehousePrice != null && unit < Number(line.warehousePrice)) {
                showToast('Đơn giá không thể nhỏ hơn giá bình quân trong kho', 'error');
                return false;
            }
        }
        return true;
    }, [lineItems, showToast]);

    const removeLine = (index) => {
        setLineItems((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    };

    const selectedCompany = useMemo(
        () => companies.find((c) => normalizeId(c.companyId ?? c.CompanyId) === selectedCompanyId) || null,
        [companies, selectedCompanyId]
    );

    const selectedAddress = useMemo(
        () => addresses.find((a) => normalizeId(a.addressId ?? a.AddressId) === selectedAddressId) || null,
        [addresses, selectedAddressId]
    );
    const existingQuotationAttachment = useMemo(
        () => findAttachmentByType(existingAttachments, 'QUOTATION'),
        [existingAttachments]
    );
    const existingContractAttachment = useMemo(
        () => findAttachmentByType(existingAttachments, 'CO') || findAttachmentByType(existingAttachments, 'CONTRACT'),
        [existingAttachments]
    );
    const existingAppendixAttachment = useMemo(
        () => findAttachmentByType(existingAttachments, 'CONTRACT_APPENDIX'),
        [existingAttachments]
    );

    /** Tóm tắt Đơn Xuất (cột phải): tổng loại vật tư + tổng tiền ước tính */
    const issueOrderSummary = useMemo(() => {
        let total = 0;
        let hasAny = false;
        for (const line of lineItems) {
            const qty = Number(line.quantity) || 0;
            const unit = line.unitPrice === '' || line.unitPrice == null ? null : Number(line.unitPrice);
            if (unit != null && !Number.isNaN(unit)) {
                total += qty * unit;
                hasAny = true;
            }
        }
        return {
            materialCount: lineItems.length,
            totalVndLabel: hasAny ? formatVndInteger(total) : null,
        };
    }, [lineItems]);

    /**
     * Trường * chung (công ty, người nhận, kho, địa chỉ, ≥1 vật tư + dòng hợp lệ) — dùng cho Lưu nháp & Gửi duyệt.
     * Lý do / file báo giá & hợp đồng chỉ bắt buộc khi gửi duyệt (submitValidationError).
     */
    const baseValidationError = useMemo(() => {
        if (!selectedCompanyId) return 'Vui lòng chọn công ty.';
        if (!selectedReceiverId) return 'Vui lòng chọn người nhận.';
        if (!form.warehouseId) return 'Vui lòng chọn kho xuất.';
        if (lineItems.length === 0) return 'Vui lòng thêm ít nhất 1 vật tư.';
        if (!selectedAddressId) {
            return 'Vui lòng chọn địa chỉ giao hàng.';
        }
        return getLineItemsValidationError(lineItems);
    }, [selectedCompanyId, selectedReceiverId, form.warehouseId, lineItems, selectedAddressId]);

    const {
        submitting,
        savingDraft,
        canCreateRequest,
        canSubmitForApproval,
        canCreateQuotationDraft,
        handleCreateRequest,
        handleCreateQuotationDraft,
    } = useReleaseRequestSubmit({
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
    });
    const openConfirmDialog = (actionType) => setConfirmAction(actionType);
    const closeConfirmDialog = () => {
        if (submitting || savingDraft) return;
        setConfirmAction(null);
    };
    const handleConfirmAction = async () => {
        const action = confirmAction;
        if (!action) return;
        setConfirmAction(null);
        if (action === 'quotation') {
            await handleCreateQuotationDraft();
            return;
        }
        if (action === 'submit') {
            await handleCreateRequest();
        }
    };

    if (loading || editLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="create-supplier-page create-release-request-page">
            <ReleaseRequestHeaderActions
                onBack={() => navigate(-1)}
                canCreateQuotationDraft={canCreateQuotationDraft}
                canSubmitForApproval={canSubmitForApproval}
                canCreateRequest={canCreateRequest}
                savingDraft={savingDraft}
                submitting={submitting}
                onCreateQuotation={() => openConfirmDialog('quotation')}
                onSubmitApproval={() => openConfirmDialog('submit')}
            />

            <div className="form-card">
                <form id="create-rr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">{isEditMode ? 'Chỉnh sửa yêu cầu xuất hàng' : 'Tạo yêu cầu xuất hàng'}</h1>
                        <p className="form-card-required-note">Các trường <span className="required-mark">*</span> là bắt buộc</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div className="create-release-request-layout">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>1</span>
                                        Người giao hàng
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Công ty <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <Building2 className="input-icon" size={16} />
                                                <select value={selectedCompanyId} onChange={handleCompanyChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                    <option value="">Chọn công ty</option>
                                                    {companies.map((company) => (
                                                        <option key={normalizeId(company.companyId ?? company.CompanyId)} value={normalizeId(company.companyId ?? company.CompanyId)}>
                                                            {[
                                                                company.companyCode ?? company.CompanyCode ?? '',
                                                                company.companyName ?? company.CompanyName ?? '',
                                                            ].filter(Boolean).join(' - ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => setCompanyDialogOpen(true)} className="btn btn-secondary" title="Tạo công ty mới">
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người nhận <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <User className="input-icon" size={16} />
                                                <select value={selectedReceiverId} onChange={handleReceiverChange} className="form-input" style={{ paddingLeft: 40 }} disabled={!selectedCompanyId}>
                                                    <option value="">{!selectedCompanyId ? 'Chọn công ty trước' : 'Chọn người nhận'}</option>
                                                    {receivers.map((receiver) => (
                                                        <option key={normalizeId(receiver.receiverId ?? receiver.ReceiverId)} value={normalizeId(receiver.receiverId ?? receiver.ReceiverId)}>
                                                            {receiver.receiverName ?? receiver.ReceiverName ?? ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => setReceiverDialogOpen(true)} className="btn btn-secondary" disabled={!selectedCompanyId} title="Tạo người nhận mới">
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {receiverDetail && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Số điện thoại</label>
                                                <div className="input-wrapper">
                                                    <Phone className="input-icon" size={16} />
                                                    <input type="text" value={receiverDetail.phone || receiverDetail.Phone || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                </div>
                                            </div>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <Mail className="input-icon" size={16} />
                                                    <input type="email" value={receiverDetail.email || receiverDetail.Email || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                </div>
                                            </div>
                                            {(receiverDetail.position || receiverDetail.Position) && (
                                                <div className="form-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                                    <label className="form-label">Chức vụ</label>
                                                    <div className="input-wrapper">
                                                        <Briefcase className="input-icon" size={16} />
                                                        <input type="text" value={receiverDetail.position || receiverDetail.Position || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {receiverDetail && (
                                        <div className="form-field" style={{ margin: 0 }}>
                                            <label className="form-label">Địa chỉ giao hàng <span className="required-mark">*</span></label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <div className="input-wrapper" style={{ flex: 1 }}>
                                                    <MapPin className="input-icon" size={16} />
                                                    <select
                                                        value={selectedAddressId}
                                                        onChange={(e) => {
                                                            setSelectedAddressId(normalizeId(e.target.value));
                                                        }}
                                                        className="form-input"
                                                        style={{ paddingLeft: 40 }}
                                                    >
                                                        <option value="">Chọn địa chỉ</option>
                                                        {addresses.map((address) => {
                                                            const id = normalizeId(address.addressId ?? address.AddressId);
                                                            const isDefault = address.isDefault ?? address.IsDefault;
                                                            const label = address.addressName || address.AddressName
                                                                ? `${address.addressName ?? address.AddressName} - ${formatAddress(address.addressDetail ?? address.AddressDetail, address.ward ?? address.Ward, address.district ?? address.District, address.city ?? address.City)}`
                                                                : formatAddress(address.addressDetail ?? address.AddressDetail, address.ward ?? address.Ward, address.district ?? address.District, address.city ?? address.City) || 'Địa chỉ';
                                                            return (
                                                                <option key={id} value={id}>
                                                                    {label}{isDefault ? ' (Mặc định)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <button type="button" onClick={() => setAddressDialogOpen(true)} className="btn btn-secondary" disabled={!selectedCompanyId} title="Tạo địa chỉ mới">
                                                    <MapPin size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>2</span>
                                        Danh sách vật tư <span className="required-mark">*</span>
                                        <span style={{ fontWeight: 400, fontSize: 13, color: '#64748b', marginLeft: 6 }}>(ít nhất 1 dòng)</span>
                                    </h2>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowItemSearch((prev) => !prev)} disabled={!form.warehouseId || itemsLoading}>
                                            <Search size={14} />
                                            Thêm vật tư
                                        </button>
                                    </div>
                                </div>

                                <div className="form-field" style={{ margin: '0 0 16px' }}>
                                    <label className="form-label">Kho xuất <span className="required-mark">*</span></label>
                                    <div className="input-wrapper">
                                        <Package className="input-icon" size={16} />
                                        <select value={form.warehouseId} onChange={handleWarehouseChange} className="form-input" style={{ paddingLeft: 40 }}>
                                            <option value="">Chọn kho xuất</option>
                                            {warehouses.map((warehouse) => (
                                                <option key={normalizeId(warehouse.warehouseId ?? warehouse.WarehouseId)} value={normalizeId(warehouse.warehouseId ?? warehouse.WarehouseId)}>
                                                    {warehouse.warehouseName ?? warehouse.WarehouseName ?? ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {showItemSearch && (
                                    <div style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <Search className="input-icon" size={16} />
                                                <input type="text" value={itemKeyword} onChange={(e) => setItemKeyword(e.target.value)} className="form-input" style={{ paddingLeft: 40 }} placeholder="Tìm vật tư theo tên hoặc mã" />
                                            </div>
                                            <button type="button" className="btn btn-secondary" onClick={addSelectedItems} disabled={!selectedItemIds.length}>
                                                <Plus size={14} />Thêm đã chọn
                                            </button>
                                        </div>

                                        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
                                            {itemsLoading ? (
                                                <div style={{ padding: 20, textAlign: 'center' }}><CircularProgress size={24} /></div>
                                            ) : filteredItems.length === 0 ? (
                                                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Không có vật tư phù hợp</div>
                                            ) : (
                                                filteredItems.map((item) => {
                                                    const id = normalizeId(item.itemId ?? item.ItemId);
                                                    const checked = selectedItemIds.includes(id);
                                                    return (
                                                        <label key={id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleItem(id)} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.itemName ?? item.ItemName ?? ''}</div>
                                                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                                                    Mã: {item.itemCode ?? item.ItemCode ?? '-'} • Còn trống: {Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.preventDefault(); handleSelectItem(item); }}>
                                                                Chọn
                                                            </button>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!lineItems.length ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                        Chưa có vật tư nào.
                                    </div>
                                ) : (
                                    <div className="table-container" style={{ overflowX: 'auto', marginBottom: 0 }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 50, textAlign: 'center' }}>STT</th>
                                                    <th>Vật tư</th>
                                                    <th style={{ width: 120, textAlign: 'right' }}>Tồn kho</th>
                                                    <th style={{ width: 120, textAlign: 'center' }}>Số lượng</th>
                                                    <th style={{ width: 140, textAlign: 'right' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            Giá bình quân kho
                                                            <CircleHelp size={14} title="Giá bình quân kho" style={{ color: '#64748b', cursor: 'help' }} />
                                                        </span>
                                                    </th>
                                                    <th style={{ width: 140, textAlign: 'right' }}>Đơn giá (VNĐ)</th>
                                                    <th style={{ width: 150, textAlign: 'right' }}>Thành tiền (VNĐ)</th>
                                                    <th style={{ minWidth: 120, maxWidth: 180, textAlign: 'left' }}>Ghi chú</th>
                                                    <th style={{ width: 60 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lineItems.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td style={{ maxWidth: 280, verticalAlign: 'top' }}>
                                                            <div className="rr-line-item-title" style={{ fontWeight: 600 }} title={line.itemName}>
                                                                {line.itemName}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
                                                                Mã: {line.itemCode || '—'}
                                                                {line.packagingSpecName ? ` • Quy cách: ${line.packagingSpecName}` : ''}
                                                                {' • '}DVT: {line.uomName || '—'}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>{Number(line.availableQty || 0).toLocaleString()}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={line.availableQty || 1}
                                                                value={line.quantity}
                                                                onChange={(e) => {
                                                                    const value = Math.max(1, Math.min(Number(e.target.value || 1), Number(line.availableQty || 1)));
                                                                    updateLine(index, 'quantity', value);
                                                                }}
                                                                className="form-input rr-number-no-spin"
                                                                style={{ width: 72, minWidth: 72, maxWidth: 72, textAlign: 'right', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#111827', fontSize: 13 }}>
                                                            {line.warehousePrice == null
                                                                ? <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                                                                : formatVndInteger(line.warehousePrice)}
                                                        </td>
                                                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                step={1}
                                                                inputMode="numeric"
                                                                value={line.unitPrice === '' || line.unitPrice == null ? '' : line.unitPrice}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value;
                                                                    if (raw === '') {
                                                                        updateLine(index, 'unitPrice', '');
                                                                        return;
                                                                    }
                                                                    const n = Number(raw);
                                                                    if (!Number.isFinite(n)) return;
                                                                    updateLine(index, 'unitPrice', Math.max(0, Math.round(n)));
                                                                }}
                                                                className="form-input rr-number-no-spin"
                                                                placeholder="VNĐ"
                                                                style={{ minWidth: 96, maxWidth: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                                                                title="Đơn giá (VNĐ, số nguyên, không nhỏ hơn giá bình quân kho)"
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#111827', fontSize: 13 }}>
                                                            {formatLineTotalVnd(line) ?? <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>}
                                                        </td>
                                                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                                            <input
                                                                type="text"
                                                                value={line.note ?? ''}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    if (v.length <= MAX_LINE_NOTE) updateLine(index, 'note', v);
                                                                }}
                                                                className="form-input"
                                                                placeholder="Ghi chú"
                                                                style={{ minWidth: 100, maxWidth: 180, width: '100%' }}
                                                                title={line.note || undefined}
                                                            />
                                                        </td>
                                                        <td>
                                                            <button type="button" className="btn btn-cancel btn-sm" onClick={() => removeLine(index)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div
                                    style={{
                                        marginTop: 16,
                                        paddingTop: 16,
                                        borderTop: '1px solid #e5e7eb',
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Tóm tắt Đơn Xuất</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 14 }}>
                                            <span style={{ color: '#64748b', flexShrink: 0 }}>Tổng số vật tư xuất ra:</span>
                                            <span style={{ fontWeight: 700, color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                {issueOrderSummary.materialCount.toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 14 }}>
                                            <span style={{ color: '#64748b', flexShrink: 0 }}>Tổng giá tiền Đơn Xuất:</span>
                                            <span style={{ fontWeight: 700, color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}>
                                                {issueOrderSummary.totalVndLabel ?? <span style={{ color: '#94a3b8', fontWeight: 500 }}>—</span>}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <ShippingInfoSection form={form} setForm={setForm} />

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <textarea
                                        name="note"
                                        value={form.note}
                                        onChange={(e) => {
                                            if (e.target.value.length <= MAX_NOTE) {
                                                setForm((prev) => ({ ...prev, note: e.target.value }));
                                            }
                                        }}
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Nhập ghi chú (nếu có)"
                                        style={{ width: '100%', minHeight: 100 }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 12, color: form.note.length >= MAX_NOTE ? '#ef4444' : '#6b7280' }}>
                                        {form.note.length}/{MAX_NOTE}
                                    </div>
                                </div>
                            </div>

                            <AttachmentSection
                                isEditMode={isEditMode}
                                quotationFile={quotationFile}
                                setQuotationFile={setQuotationFile}
                                contractFile={contractFile}
                                setContractFile={setContractFile}
                                appendixFile={appendixFile}
                                setAppendixFile={setAppendixFile}
                                existingQuotationAttachment={existingQuotationAttachment}
                                existingContractAttachment={existingContractAttachment}
                                existingAppendixAttachment={existingAppendixAttachment}
                                toAbsoluteFileUrl={toAbsoluteFileUrl}
                            />
                        </div>
                    </div>
                    </div>
                </form>
            </div>

            <CreateCompanyDialog open={companyDialogOpen} onClose={() => setCompanyDialogOpen(false)} onSuccess={handleCreateCompanySuccess} />
            <CreateReceiverDialog open={receiverDialogOpen} onClose={() => setReceiverDialogOpen(false)} onSuccess={handleCreateReceiverSuccess} companyId={selectedCompanyId} companyName={selectedCompany?.companyName ?? selectedCompany?.CompanyName ?? ''} />
            <CreateAddressDialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} onSuccess={handleCreateAddressSuccess} companyId={selectedCompanyId} />
            <ConfirmActionDialog
                confirmAction={confirmAction}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmAction}
                submitting={submitting}
                savingDraft={savingDraft}
                isEditMode={isEditMode}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
