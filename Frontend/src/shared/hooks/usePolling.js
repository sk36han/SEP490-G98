import { useEffect, useRef, useCallback } from 'react';
import PollingManager from '../lib/pollingManager';

/**
 * Hook polling cho list pages.
 *
 * @param {string} pageKey - Key của trang (từ pollingConfig)
 * @param {Function} fetchFn - Hàm fetch dữ liệu (sẽ được gọi định kỳ)
 *
 * Usage:
 *
 *   // Cách 1: Thay thế useEffect fetch cũ
 *   const fetchRef = useRef(fetchData);
 *   usePolling('categories', () => fetchRef.current());
 *   useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);
 *
 *   // Cách 2: Truyền trực tiếp hàm có thể thay đổi (dùng ref)
 *   const fetchRef = useRef(fetchData);
 *   useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);
 *   usePolling('categories', fetchRef.current);
 *
 *   // Cách 3: Nếu fetchFn stable (không thay đổi giữa renders):
 *   usePolling('categories', fetchData);
 */
export function usePolling(pageKey, fetchFn) {
    const fetchFnRef = useRef(fetchFn);

    // Cập nhật ref mỗi khi fetchFn thay đổi (nhưng không re-register)
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    // Register với PollingManager khi mount
    useEffect(() => {
        if (!pageKey) return;

        PollingManager.startPolling(pageKey, () => {
            fetchFnRef.current?.();
        });

        return () => {
            PollingManager.stopPolling(pageKey);
        };
    }, [pageKey]);

    /**
     * Trigger manual refresh cho trang hiện tại.
     */
    const refetch = useCallback(() => {
        PollingManager.triggerRefresh(pageKey);
    }, [pageKey]);

    return { refetch };
}
