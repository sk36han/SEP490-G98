import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import {
    ArrowLeft,
    User,
    Warehouse,
    Calendar,
    CheckCircle,
    XCircle,
    Edit,
    Save,
    X,
    Search,
    Printer,
    Package,
    ImageIcon,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { StatusBadge } from '@ui/badges';

import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import {
    getStocktakeDetail,
    getStocktakeLines,
    updateCountedQty,
    bulkMatchSystemQty,
    submitStocktakeResults,
    submitStocktakePlan,
    approveStocktakePlan,
    startStocktakeExecution,
    approveAndFinalizeStocktakeResults,
} from '../lib/stocktakeService';
import { getStocktakeStatusBadgeKey, normalizeStocktakeStatus } from '../lib/stocktakeStatusBadge';
import { getItemsByWarehouse } from '../lib/itemService';
import '../styles/CreateSupplier.css';
import { formatDateTimeUtc } from '../lib/dateUtils';

const ViewStocktakeDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));

    // API data
    const [loading, setLoading] = useState(true);
    const [detailData, setDetailData] = useState(null);
    const [lines, setLines] = useState([]);
    const [totalLines, setTotalLines] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [basicEditing, setBasicEditing] = useState(false);
    const [isCounting, setIsCounting] = useState(false);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [savedLineIds, setSavedLineIds] = useState([]);

    // Variance filter state
    const [varianceFilter, setVarianceFilter] = useState('all');
    const [lineSearchKeyword, setLineSearchKeyword] = useState('');
    const [pendingMarkSufficient, setPendingMarkSufficient] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [bulkMatchDialogOpen, setBulkMatchDialogOpen] = useState(false);
    /** Cột phải: 'info' = thông tin chung + ghi chú | 'summary' = kết quả / tổng kết */
    const [rightColumnTab, setRightColumnTab] = useState('info');

    // Biến kiểm tra role/creator — đặt sau useState để tránh lỗi temporal dead zone
    const isDirector = permissionRole === 'DIRECTOR';
    const isAccountant = permissionRole === 'ACCOUNTANTS';
    const isWarehouseKeeper = permissionRole === 'WAREHOUSE_KEEPER';
    const isAdmin = permissionRole === 'ADMIN';
    /** Nháp / gửi duyệt kế hoạch — chủ yếu kế toán (và admin) */
    const canEditDraftPlan = isAccountant || isAdmin;
    /** Bắt đầu kiểm kê: chỉ thủ kho + admin */
    const canStartExecution = isWarehouseKeeper;
    /** Nhập số đếm, gửi kết quả — kế toán + thủ kho (+ admin) */
    const canRunExecution = isAccountant || isWarehouseKeeper ;
    // Derive stocktakeData from detail + lines
    const stocktakeData = useMemo(() => {
        if (!detailData) return null;
        return {
            ...detailData,
            lines,
            totalLines,
        };
    }, [detailData, lines, totalLines]);

    // Load header + lines
    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const detail = await getStocktakeDetail(id);
            setDetailData(detail);

            let lineItems = [];
            let lineTotal = 0;
            try {
                const lineResult = await getStocktakeLines(id);
                lineItems = lineResult.items ?? [];
                lineTotal = lineResult.totalItems ?? 0;
            } catch {
                // Endpoint Execution/Lines có thể lỗi nếu phiếu chưa bắt đầu
            }

            if (lineItems.length === 0 && detail?.warehouseId) {
                try {
                    const allItems = await getItemsByWarehouse(detail.warehouseId);
                    lineItems = allItems.map(item => ({
                        id: item.itemId,
                        stocktakeLineId: item.itemId,
                        itemId: item.itemId,
                        itemCode: item.itemCode,
                        itemName: item.itemName,
                        itemImage: item.itemImage ?? null,
                        uom: item.uomName ?? '-',
                        uomName: item.uomName ?? '-',
                        systemQtySnapshot: item.onHandQty ?? 0,
                        countedQty: null,
                        varianceQty: null,
                        note: '',
                    }));
                    lineTotal = lineItems.length;
                } catch {
                    // silent
                }
            }

            setLines(lineItems);
            setTotalLines(lineTotal);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không tải được chi tiết phiếu kiểm kê.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reload lines after any count action
    const reloadLines = useCallback(async () => {
        try {
            const lineResult = await getStocktakeLines(id);
            setLines(lineResult.items ?? []);
            setTotalLines(lineResult.totalItems ?? 0);
            const detail = await getStocktakeDetail(id);
            setDetailData(detail);
        } catch {
            // silent reload
        }
    }, [id]);

    // Count editing handlers
    const startCounting = async () => {
        const execId = stocktakeData.id ?? stocktakeData.stocktakeId;
        if (!execId) return;
        if (!canStartExecution) {
            showToast('Bạn không có quyền bắt đầu kiểm kê.', 'warning');
            return;
        }
        try {
            setSubmitting(true);
            const result = await startStocktakeExecution(execId);
            setDetailData(prev => prev ? { ...prev, ...result } : null);
            setIsCounting(true);
            // Reload lines from execution endpoint
            try {
                const lineResult = await getStocktakeLines(execId);
                setLines(lineResult.items ?? []);
                setTotalLines(lineResult.totalItems ?? 0);
            } catch { /* silent */ }
            showToast('Đã bắt đầu kiểm kê!', 'success');
        } catch (err) {
            console.error('[DEBUG] startCounting error:', err);
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi bắt đầu kiểm kê.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const endCounting = async () => {
        try {
            setSubmitting(true);
            await submitStocktakeResults(id);
            setIsCounting(false);
            setSelectedLineIds([]);
            setPendingMarkSufficient(false);
            await fetchData();
            showToast('Đã gửi kết quả — phiếu đã hoàn tất (COMPLETED).', 'success');
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi kết thúc kiểm kê.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev =>
            prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        const emptyIds = filteredLines.filter(l => l.countedQty === '' || l.countedQty === null || l.countedQty === undefined).map(l => l.id);
        if (selectedLineIds.length === emptyIds.length && emptyIds.every(id => selectedLineIds.includes(id))) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(emptyIds);
        }
    };

    const handleMarkAllSufficient = () => {
        if (selectedLineIds.length === 0) return;
        setPendingMarkSufficient(true);
        setConfirmDialogOpen(true);
    };

    /** Khớp hàng loạt: API BulkMatchSystemQty — gán SL thực tế = tồn hệ thống cho mọi dòng chưa đếm */
    const handleBulkMatchSystemQtyConfirm = async () => {
        setBulkMatchDialogOpen(false);
        try {
            setSubmitting(true);
            await bulkMatchSystemQty(id);
            await reloadLines();
            setSelectedLineIds([]);
            showToast('Đã khớp số thực tế với tồn hệ thống cho các dòng chưa nhập.', 'success');
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                (typeof err === 'string' ? err : null) ||
                'Không thể khớp số lượng hàng loạt.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const hasValue = (val) => val !== null && val !== undefined && val !== '';

    // Summary stats
    const summary = useMemo(() => {
        const totalSystemQty = (stocktakeData?.lines || []).reduce((sum, l) => sum + (parseFloat(l.systemQtySnapshot) || 0), 0);
        const countedLines = (stocktakeData?.lines || []).filter(l => hasValue(l.countedQty));
        const totalCountedQty = countedLines.reduce((sum, line) => sum + (parseFloat(line.countedQty) || 0), 0);
        const totalVariance = countedLines.reduce((sum, line) => sum + (line.varianceQty || 0), 0);

        const missing = countedLines.filter(l => l.varianceQty < 0).length;
        const excess = countedLines.filter(l => l.varianceQty > 0).length;
        const sufficient = countedLines.filter(l => l.varianceQty === 0).length;
        const varianceLines = missing + excess;

        return {
            totalItems: stocktakeData?.lines?.length ?? 0,
            totalSystemQty,
            totalCountedQty,
            totalVariance,
            totalCounted: countedLines.length,
            missing,
            excess,
            sufficient,
            varianceLines,
        };
    }, [stocktakeData?.lines]);

    // Filtered lines based on variance filter and search
    const filteredLines = useMemo(() => {
        let lines = stocktakeData?.lines || [];

        if (lineSearchKeyword.trim()) {
            const kw = lineSearchKeyword.toLowerCase();
            lines = lines.filter(l =>
                (l.itemName ?? '').toLowerCase().includes(kw) ||
                (l.itemCode ?? '').toLowerCase().includes(kw)
            );
        }

        if (varianceFilter === 'negative') {
            lines = lines.filter(l => hasValue(l.varianceQty) && l.varianceQty < 0);
        } else if (varianceFilter === 'positive') {
            lines = lines.filter(l => hasValue(l.varianceQty) && l.varianceQty > 0);
        } else if (varianceFilter === 'sufficient') {
            lines = lines.filter(l => hasValue(l.varianceQty) && l.varianceQty === 0);
        }

        return lines;
    }, [stocktakeData?.lines, varianceFilter, lineSearchKeyword]);

    const handleCancel = () => {
        if (isCounting) {
            setConfirmDialogOpen(true);
            return;
        }
        navigate(-1);
    };

    // Warn on browser close/refresh during counting
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isCounting) {
                e.preventDefault();
                e.returnValue = 'Đang trong quá trình kiểm kê, không được thoát khỏi trang này.';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isCounting]);

    const isInProgressStatus = (status) => {
        const normalized = normalizeStocktakeStatus(status);
        return normalized === 'IN_PROGRESS' || normalized === 'EXECUTING' || normalized === 'STARTED';
    };

    // Determine counting state dựa trên backend status
    useEffect(() => {
        if (!detailData) return;
        const wasCounting = isInProgressStatus(detailData.status);
        setIsCounting(wasCounting);
        // Reset saved lines khi bắt đầu hoặc kết thúc kiểm kê
        if (!wasCounting) {
            setSavedLineIds([]);
            setSelectedLineIds([]);
        }
    }, [detailData]);

    // Gửi kế hoạch kiểm kê (Acc + Creator)
    const handleSubmitPlan = async () => {
        try {
            setSubmitting(true);
            await submitStocktakePlan(stocktakeData.id);
            showToast('Đã gửi duyệt kế hoạch kiểm kê!', 'success');
            await fetchData();
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi gửi duyệt kế hoạch.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const stStatus = () => normalizeStocktakeStatus(stocktakeData?.status);

    /** Giai đoạn 1: duyệt kế hoạch — POST /StocktakePlan/{id}/ApproveStocktakePlan (DRAFT → … → PENDING_APPROVAL) */
    /** Giai đoạn 2: duyệt kết quả có chênh lệch — POST /StocktakeExecution/{id}/ApproveAndFinalizeResults (PENDING_RESULTADJ) */
    const handleDirectorApprove = async () => {
        try {
            setSubmitting(true);
            if (stStatus() === 'PENDING_APPROVAL') {
                await approveStocktakePlan(stocktakeData.id, { decision: 'APPROVE', reason: null });
                showToast('Phê duyệt kế hoạch kiểm kê thành công!', 'success');
            } else if (stStatus() === 'PENDING_RESULTADJ') {
                await approveAndFinalizeStocktakeResults(stocktakeData.id, { decision: 'APPROVE', reason: null });
                showToast('Đã duyệt và chốt kết quả kiểm kê (ghi nhận điều chỉnh nếu có lệch).', 'success');
            } else {
                showToast('Trạng thái phiếu không cho phép thao tác duyệt này.', 'warning');
            }
            await fetchData();
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi duyệt phiếu.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDirectorReject = async () => {
        const rejectReason = 'Từ chối theo quyết định giám đốc.';
        try {
            setSubmitting(true);
            if (stStatus() === 'PENDING_APPROVAL') {
                await approveStocktakePlan(stocktakeData.id, { decision: 'REJECT', reason: rejectReason });
                showToast('Đã từ chối kế hoạch kiểm kê.', 'success');
            } else if (stStatus() === 'PENDING_RESULTADJ') {
                await approveAndFinalizeStocktakeResults(stocktakeData.id, { decision: 'REJECT', reason: rejectReason });
                showToast('Đã từ chối kết quả kiểm kê.', 'success');
            } else {
                showToast('Trạng thái phiếu không cho phép từ chối.', 'warning');
                return;
            }
            setTimeout(() => navigate('/inventory/stocktakes'), 1500);
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi từ chối phiếu.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle count input
    const handleCountChange = async (lineId, value) => {
        // Cho phép rỗng tạm thời để người dùng xóa/sửa số cũ.
        if (value === '') {
            setLines(prev => prev.map(l => l.id === lineId ? { ...l, countedQty: '' } : l));
            return;
        }

        // Chuẩn hóa số thập phân, chặn ký tự không hợp lệ.
        const normalized = String(value).replace(',', '.');
        if (!/^\d*\.?\d*$/.test(normalized)) return;

        const num = parseFloat(normalized);
        if (isNaN(num) || num < 0) return;

        try {
            setLines(prev => prev.map(l => l.id === lineId ? { ...l, countedQty: normalized } : l));
        } catch {
            showToast('Lỗi khi cập nhật số lượng.', 'error');
        }
    };

    const handleSaveLineCount = async (lineId) => {
        const line = lines.find(l => l.id === lineId);
        if (!line) return;
        const num = parseFloat(line.countedQty);
        if (isNaN(num) || num < 0) {
            showToast('Số lượng không hợp lệ.', 'warning');
            return;
        }
        try {
            setSubmitting(true);
            const updatedLine = await updateCountedQty(lineId, { countedQty: num });
            // Chỉ cập nhật đúng dòng vừa lưu để tránh reset các dòng khác.
            if (updatedLine?.id !== undefined && updatedLine?.id !== null) {
                setLines(prev =>
                    prev.map(l => (l.id === lineId ? { ...l, ...updatedLine } : l))
                );
            }
            setSavedLineIds(prev => [...new Set([...prev, lineId])]);
            showToast('Lưu số lượng thành công!', 'success');
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu số lượng.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAllLines = async () => {
        const unsavedLines = lines.filter(l => l.countedQty !== null && l.countedQty !== undefined && l.countedQty !== '');
        if (unsavedLines.length === 0) {
            showToast('Không có số lượng nào để lưu.', 'warning');
            return;
        }
        try {
            setSubmitting(true);
            let savedCount = 0;
            const newlySaved = [];
            for (const line of unsavedLines) {
                const num = parseFloat(line.countedQty);
                if (!isNaN(num) && num >= 0) {
                    await updateCountedQty(line.id, { countedQty: num });
                    newlySaved.push(line.id);
                    savedCount++;
                }
            }
            await reloadLines();
            setSavedLineIds(prev => [...new Set([...prev, ...newlySaved])]);
            showToast(`Đã lưu ${savedCount} / ${unsavedLines.length} vật tư!`, 'success');
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi lưu số lượng.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSave = async () => {
        try {
            setSubmitting(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Lưu thay đổi thành công!', 'success');
            setBasicEditing(false);
        } catch {
            showToast('Lỗi khi lưu thay đổi.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </div>
        );
    }

    if (!stocktakeData) {
        return (
            <div className="create-supplier-page view-stocktake-detail-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#ef4444' }}>Không tìm thấy dữ liệu phiếu kiểm kê.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page view-stocktake-detail-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* DRAFT: Acc + Creator - Chỉnh sửa / Gửi duyệt */}
                    {!isCounting && !basicEditing && normalizeStocktakeStatus(stocktakeData?.status) === 'DRAFT' && canEditDraftPlan && (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={() => setBasicEditing(true)}>
                                <Edit size={15} />
                                Chỉnh sửa
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSubmitPlan} disabled={submitting}>
                                <CheckCircle size={15} />
                                Gửi duyệt
                            </button>
                        </>
                    )}
                    {/* DRAFT: WK - chỉ xem, không thao tác */}
                    {!isCounting && !basicEditing && stocktakeData?.status === 'DRAFT' && isWarehouseKeeper && (
                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>Bạn chỉ có quyền xem phiếu này</span>
                    )}
                    {basicEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={() => setBasicEditing(false)} disabled={submitting}>
                                <X size={15} />
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }}></span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Lưu
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    {/* Giai đoạn 1 — PENDING_APPROVAL: Giám đốc duyệt kế hoạch (StocktakePlan API) */}
                    {!isCounting && !basicEditing && normalizeStocktakeStatus(stocktakeData?.status) === 'PENDING_APPROVAL' && isDirector && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={handleDirectorReject}>
                                <XCircle size={15} />
                                Từ chối kế hoạch
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleDirectorApprove}>
                                <CheckCircle size={15} />
                                Duyệt kế hoạch
                            </button>
                        </>
                    )}
                    {/* Giai đoạn 2 — PENDING_RESULTADJ: Giám đốc duyệt kết quả / chốt (StocktakeExecution API) */}
                    {!isCounting && !basicEditing && normalizeStocktakeStatus(stocktakeData?.status) === 'PENDING_RESULTADJ' && isDirector && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={handleDirectorReject}>
                                <XCircle size={15} />
                                Từ chối kết quả
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleDirectorApprove}>
                                <CheckCircle size={15} />
                                Duyệt kết quả
                            </button>
                        </>
                    )}
                    {/* IN_PROGRESS: Acc + Creator đang đếm - Lưu / Gửi kết quả */}
                    {!basicEditing && isCounting && canRunExecution && (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={handleSaveAllLines} disabled={submitting}>
                                <Save size={15} />
                                Lưu tất cả
                            </button>
                            <button type="button" className="btn btn-primary" onClick={endCounting} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }}></span>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={15} />
                                        Gửi Kết Quả
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    {/* IN_PROGRESS: Director/Acc (không phải creator) - In */}
                    {!basicEditing && !isCounting && normalizeStocktakeStatus(stocktakeData?.status) === 'IN_PROGRESS' && !canRunExecution && (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={() => showToast('In PDF', 'info')}>
                                <Printer size={15} />
                                In PDF
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => showToast('In A4', 'info')}>
                                <Printer size={15} />
                                In A4
                            </button>
                        </>
                    )}
                    {/* PENDING_RESULTADJ: kế toán / người tạo — chờ giám đốc duyệt kết quả có chênh lệch */}
                    {!basicEditing && normalizeStocktakeStatus(stocktakeData?.status) === 'PENDING_RESULTADJ' && !isDirector && !isWarehouseKeeper && (
                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>Đang chờ giám đốc duyệt kết quả kiểm kê</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {stocktakeData.mode && (
                        <StatusBadge status={stocktakeData.mode} dot="•" variant="dot" />
                    )}
                    {stocktakeData.status && (
                        <StatusBadge
                            status={getStocktakeStatusBadgeKey(stocktakeData.status)}
                            dot="•"
                            variant="dot"
                        />
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu kiểm kê kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu: <span style={{ fontWeight: 600, color: '#2196F3' }}>{stocktakeData.code}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Danh sách vật tư (trái) | Tab thông tin + ghi chú / kết quả (phải, 350px) */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 350px',
                            gap: '24px',
                            alignItems: 'flex-start',
                        }}
                    >
                        {/* Trái: chiều cao card theo nội dung; bảng chỉ scroll khi vượt maxHeight */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px',
                                minWidth: 0,
                            }}
                        >
                            {/* 1. Danh sách vật tư */}
                            <div
                                className="info-section"
                                style={{
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div className="section-header-with-toggle" style={{ flexShrink: 0 }}>
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
                                    {!isCounting && normalizeStocktakeStatus(stocktakeData?.status) === 'APPROVED' && canStartExecution && !submitting && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={startCounting}
                                        >
                                            <Package size={15} />
                                            Bắt đầu kiểm kê
                                        </button>
                                    )}
                                </div>

                                {/* Search + filters */}
                                {isCounting && (
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
                                        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input
                                                type="text"
                                                placeholder="Tìm vật tư..."
                                                value={lineSearchKeyword}
                                                onChange={e => setLineSearchKeyword(e.target.value)}
                                                style={{ width: '100%', paddingLeft: '36px', height: '38px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                                            />
                                        </div>
                                        {isInProgressStatus(stocktakeData?.status) && canRunExecution && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setBulkMatchDialogOpen(true)}
                                                disabled={submitting}
                                                title="Điền số thực tế = tồn hệ thống cho tất cả dòng chưa đếm (khi kiểm kê khớp hệ thống)"
                                                style={{ fontSize: '12px', height: '38px', whiteSpace: 'nowrap' }}
                                            >
                                                <CheckCircle size={15} />
                                                Tự động khớp tồn hệ thống
                                            </button>
                                        )}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[
                                                { key: 'all', label: 'Tất cả' },
                                                { key: 'negative', label: 'Thiếu' },
                                                { key: 'positive', label: 'Thừa' },
                                                { key: 'sufficient', label: 'Đủ' },
                                            ].map(f => (
                                                <button
                                                    key={f.key}
                                                    type="button"
                                                    onClick={() => setVarianceFilter(f.key)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid',
                                                        borderColor: varianceFilter === f.key ? '#2196F3' : '#d1d5db',
                                                        backgroundColor: varianceFilter === f.key ? '#e0f2fe' : '#fff',
                                                        color: varianceFilter === f.key ? '#2196F3' : '#6b7280',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                        {selectedLineIds.length > 0 && (
                                            <button type="button" className="btn btn-secondary" onClick={handleMarkAllSufficient} style={{ fontSize: '12px', height: '38px' }}>
                                                <CheckCircle size={15} />
                                                Khớp ({selectedLineIds.length})
                                            </button>
                                        )}
                                        {selectedLineIds.length > 0 && (
                                            <button type="button" className="btn btn-secondary" onClick={toggleSelectAll} style={{ fontSize: '12px', height: '38px' }}>
                                                <X size={15} />
                                                Bỏ chọn
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Empty state - no lines at all */}
                                {(!stocktakeData?.lines || stocktakeData?.lines?.length === 0) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '60px 20px', color: '#9ca3af', minHeight: '240px' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        {stocktakeData?.status === 'PENDING_APPROVAL' ? (
                                            <>
                                                <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Phiếu đang chờ giám đốc duyệt</p>
                                                <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, color: '#6b7280' }}>Vui lòng đợi phê duyệt trước khi bắt đầu kiểm kê</p>
                                            </>
                                        ) : stocktakeData?.status === 'DRAFT' ? (
                                            <>
                                                <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Phiếu đang ở trạng thái bản nháp</p>
                                                <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, color: '#6b7280' }}>Gửi duyệt phiếu để bắt đầu kiểm kê</p>
                                            </>
                                        ) : stocktakeData?.status === 'APPROVED' ? (
                                            <>
                                                <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Sẵn sàng kiểm kê</p>
                                                <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, color: '#6b7280' }}>Vui lòng bắt đầu kiểm kê để tải danh sách vật tư</p>
                                            </>
                                        ) : (
                                            <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                        )}
                                    </div>
                                )}

                                {/* Lines table */}
                                {stocktakeData?.lines && stocktakeData?.lines?.length > 0 && (
                                    <div
                                        className="table-container"
                                        style={{
                                            overflow: 'auto',
                                            maxHeight: 'min(65vh, 560px)',
                                        }}
                                    >
                                        <table className="product-table" style={{ width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    {isCounting && (
                                                        <th style={{ width: '60px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLineIds.length === filteredLines.length && filteredLines.length > 0}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                    )}
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    {isCounting && (
                                                        <>
                                                            <th style={{ width: '120px', textAlign: 'right' }}>SL thực tế</th>
                                                            <th style={{ width: '100px', textAlign: 'right' }}>Chênh lệch</th>
                                                            <th style={{ width: '70px', textAlign: 'center' }}>Đã lưu</th>
                                                            <th style={{ width: '80px', textAlign: 'center' }}></th>
                                                        </>
                                                    )}
                                                    {!isCounting && (
                                                        <>
                                                            <th style={{ width: '100px', textAlign: 'right' }}>SL thực tế</th>
                                                            <th style={{ width: '100px', textAlign: 'right' }}>Chênh lệch</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLines.map((line, index) => {
                                                    const variance = hasValue(line.countedQty) ? (parseFloat(line.countedQty) || 0) - (parseFloat(line.systemQtySnapshot) || 0) : null;
                                                    const isNegative = variance !== null && variance < 0;
                                                    const isPositive = variance !== null && variance > 0;

                                                    return (
                                                        <tr key={line.id ?? index}>
                                                            {isCounting && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedLineIds.includes(line.id)}
                                                                        onChange={() => toggleLineSelection(line.id)}
                                                                    />
                                                                </td>
                                                            )}
                                                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                    {isValidImageUrl(line.itemImage) ? (
                                                                        <img src={line.itemImage} alt={line.itemName} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                                    ) : (
                                                                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                            <ImageIcon size={20} color="#9ca3af" />
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        <a
                                                                            href="#"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                navigate(`/items/${line.itemId}`);
                                                                            }}
                                                                            style={{
                                                                                color: '#2196F3',
                                                                                textDecoration: 'none',
                                                                                fontSize: 14,
                                                                                fontWeight: 500,
                                                                            }}
                                                                            onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                                                            onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                                                        >
                                                                            {line.itemName}
                                                                        </a>
                                                                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                            Mã: {line.itemCode} • ĐVT: {line.uom}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                    {line.systemQtySnapshot || 0}
                                                                </div>
                                                            </td>
                                                            {isCounting ? (
                                                                <>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={line.countedQty ?? ''}
                                                                            onFocus={e => e.target.select()}
                                                                            onChange={e => handleCountChange(line.id, e.target.value)}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '4px 8px',
                                                                                borderRadius: '6px',
                                                                                border: '1px solid #d1d5db',
                                                                                textAlign: 'right',
                                                                                fontSize: '14px',
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <div style={{
                                                                            textAlign: 'right',
                                                                            paddingRight: '8px',
                                                                            fontWeight: 600,
                                                                            color: variance === null ? '#9ca3af' : isNegative ? '#dc2626' : isPositive ? '#2563eb' : '#16a34a'
                                                                        }}>
                                                                            {variance !== null ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {savedLineIds.includes(line.id) ? (
                                                                            <CheckCircle size={18} color="#16a34a" />
                                                                        ) : hasValue(line.countedQty) ? (
                                                                            <XCircle size={18} color="#9ca3af" />
                                                                        ) : (
                                                                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveLineCount(line.id)}
                                                                            className="btn btn-primary"
                                                                            style={{ fontSize: '11px', height: '30px', padding: '0 8px' }}
                                                                        >
                                                                            <Save size={12} />
                                                                            Lưu
                                                                        </button>
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td>
                                                                        <div style={{
                                                                            textAlign: 'right',
                                                                            paddingRight: '8px',
                                                                            fontWeight: 500,
                                                                            color: hasValue(line.countedQty) ? '#374151' : '#9ca3af'
                                                                        }}>
                                                                            {hasValue(line.countedQty) ? line.countedQty : '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{
                                                                            textAlign: 'right',
                                                                            paddingRight: '8px',
                                                                            fontWeight: 600,
                                                                            color: variance === null ? '#9ca3af' : isNegative ? '#dc2626' : isPositive ? '#2563eb' : '#16a34a'
                                                                        }}>
                                                                            {variance !== null ? (variance > 0 ? `+${variance}` : variance) : '-'}
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phải: Tab — Thông tin chung (+ ghi chú) | Kết quả phiếu kiểm kê — cùng chiều rộng 350px */}
                        <div
                            className="info-section"
                            style={{
                                margin: 0,
                                width: '100%',
                                maxWidth: '350px',
                                minWidth: 0,
                                alignSelf: 'start',
                                boxSizing: 'border-box',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    borderBottom: '2px solid #e5e7eb',
                                    marginBottom: '16px',
                                    gap: 0,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setRightColumnTab('info')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 8px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: rightColumnTab === 'info' ? 600 : 500,
                                        color: rightColumnTab === 'info' ? '#2196F3' : '#6b7280',
                                        borderBottom: rightColumnTab === 'info' ? '2px solid #2196F3' : '2px solid transparent',
                                        marginBottom: '-2px',
                                        lineHeight: 1.25,
                                        textAlign: 'center',
                                    }}
                                >
                                    Thông tin chung
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRightColumnTab('summary')}
                                    style={{
                                        flex: 1,
                                        padding: '10px 8px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: rightColumnTab === 'summary' ? 600 : 500,
                                        color: rightColumnTab === 'summary' ? '#2196F3' : '#6b7280',
                                        borderBottom: rightColumnTab === 'summary' ? '2px solid #2196F3' : '2px solid transparent',
                                        marginBottom: '-2px',
                                        lineHeight: 1.25,
                                        textAlign: 'center',
                                    }}
                                >
                                    Kết Quả Phiếu Kiểm kê Kho
                                </button>
                            </div>

                            {rightColumnTab === 'info' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input type="text" value={stocktakeData.createdByName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho</label>
                                        <div className="input-wrapper">
                                            <Warehouse className="input-icon" size={16} />
                                            <input type="text" value={stocktakeData.warehouseName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày giờ dự kiến kiểm kê</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            {basicEditing && !isCounting ? (
                                                <input
                                                    type="datetime-local"
                                                    name="plannedAt"
                                                    value={stocktakeData.plannedAt ? stocktakeData.plannedAt.slice(0, 16) : ''}
                                                    onChange={e => setDetailData(prev => ({ ...prev, plannedAt: e.target.value }))}
                                                    className="form-input"
                                                />
                                            ) : (
                                                <input type="text" value={formatDateTimeUtc(stocktakeData.plannedAt, '')} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                            )}
                                        </div>
                                    </div>

                                    {stocktakeData.startedAt && (
                                        <div className="form-field">
                                            <label className="form-label">Ngày giờ bắt đầu kiểm kê</label>
                                            <div className="input-wrapper">
                                                <Calendar className="input-icon" size={16} />
                                                <input type="text" value={formatDateTimeUtc(stocktakeData.startedAt, '')} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                            </div>
                                        </div>
                                    )}

                                    {stocktakeData.endedAt && (
                                        <div className="form-field">
                                            <label className="form-label">Ngày giờ kết thúc kiểm kê</label>
                                            <div className="input-wrapper">
                                                <Calendar className="input-icon" size={16} />
                                                <input type="text" value={formatDateTimeUtc(stocktakeData.endedAt, '')} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-field">
                                        <label className="form-label">Ghi chú</label>
                                        {basicEditing ? (
                                            <textarea
                                                name="note"
                                                value={stocktakeData.note ?? ''}
                                                onChange={e => setDetailData(prev => ({ ...prev, note: e.target.value }))}
                                                className="form-textarea"
                                                rows={4}
                                                placeholder="Nhập ghi chú (nếu có)"
                                                style={{ width: '100%', minHeight: '100px', boxSizing: 'border-box' }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    padding: '10px 12px',
                                                    color: stocktakeData.note ? '#374151' : '#9ca3af',
                                                    fontSize: '14px',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    minHeight: '72px',
                                                    boxSizing: 'border-box',
                                                }}
                                            >
                                                {stocktakeData.note || 'Không có ghi chú'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {rightColumnTab === 'summary' && (
                                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số vật tư:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalItems}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Đã kiểm kê:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalCounted} / {summary.totalItems}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Vật tư thiếu:</span>
                                            <span style={{ fontWeight: 600, color: '#dc2626' }}>{summary.missing}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Vật tư thừa:</span>
                                            <span style={{ fontWeight: 600, color: '#2196F3' }}>{summary.excess}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Vật tư đủ:</span>
                                            <span style={{ fontWeight: 600, color: '#16a34a' }}>{summary.sufficient}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số lượng hệ thống:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalSystemQty}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số lượng kiểm kê:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalCounted === 0 ? 'Chưa thực hiện kiểm kê kho' : summary.totalCountedQty}</span>
                                        </div>
                                        {summary.totalCounted > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                                                <span style={{ color: '#64748b' }}>Chênh lệch:</span>
                                                <span style={{ fontWeight: 700, color: summary.totalVariance < 0 ? '#dc2626' : summary.totalVariance > 0 ? '#2563eb' : '#16a34a' }}>
                                                    {summary.totalVariance > 0 ? `+${summary.totalVariance}` : summary.totalVariance}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Xác nhận: khớp toàn bộ dòng chưa đếm với tồn hệ thống (BulkMatchSystemQty) */}
            {bulkMatchDialogOpen && (
                <ConfirmDialog
                    open={bulkMatchDialogOpen}
                    onClose={() => setBulkMatchDialogOpen(false)}
                    onConfirm={handleBulkMatchSystemQtyConfirm}
                    title="Tự động khớp tồn hệ thống?"
                    message="Mọi dòng chưa nhập số thực tế sẽ được đặt bằng số lượng tồn hệ thống (chênh lệch = 0). Dùng khi kiểm kê thực tế trùng với sổ."
                    confirmText="Xác nhận"
                />
            )}

            {/* Confirm dialog: marking selected lines sufficient (cùng API bulk match — chỉ khi đã chọn dòng) */}
            {confirmDialogOpen && pendingMarkSufficient && (
                <ConfirmDialog
                    open={confirmDialogOpen}
                    onClose={() => {
                        setConfirmDialogOpen(false);
                        setPendingMarkSufficient(false);
                    }}
                    onConfirm={async () => {
                        setConfirmDialogOpen(false);
                        setPendingMarkSufficient(false);
                        try {
                            await bulkMatchSystemQty(id);
                            await reloadLines();
                            setSelectedLineIds([]);
                            showToast('Đã khớp số lượng hàng loạt!', 'success');
                        } catch (err) {
                            showToast(err?.response?.data?.message || err?.message || 'Lỗi khi khớp số lượng.', 'error');
                        }
                    }}
                    title="Xác nhận khớp số lượng"
                    message={`Bạn có chắc muốn đánh dấu ${selectedLineIds.length} vật tư đã chọn là "đủ" (số thực tế = số hệ thống)? Hệ thống sẽ khớp tất cả dòng chưa đếm qua API BulkMatchSystemQty.`}
                    confirmText="Xác nhận"
                />
            )}

            {/* Confirm dialog: cannot exit during counting */}
            {confirmDialogOpen && isCounting && (
                <ConfirmDialog
                    open={confirmDialogOpen}
                    onClose={() => setConfirmDialogOpen(false)}
                    title="Không thể thoát"
                    message="Đang trong quá trình kiểm kê, không được thoát khỏi trang này. Vui lòng kết thúc kiểm kê trước khi quay lại."
                    confirmText="Đóng"
                    onConfirm={() => setConfirmDialogOpen(false)}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default ViewStocktakeDetail;
