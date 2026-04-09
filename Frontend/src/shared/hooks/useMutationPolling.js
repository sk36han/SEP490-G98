import { useCallback } from 'react';
import PollingManager from '../lib/pollingManager';

/**
 * Hook wrap mutation function để tự động trigger polling refresh
 * cho các trang liên quan sau khi mutation thành công.
 *
 * @param {string} fetchKey - Key của entity (từ pollingConfig, VD: 'Category', 'Supplier')
 * @returns {{
 *   wrapMutation: (mutationFn: Function) => (...args: any[]) => Promise<any>,
 *   triggerRefresh: () => void,
 * }}
 *
 * Usage:
 *
 *   // Cách 1: Wrap mutation
 *   const { wrapMutation } = useMutationPolling('Category');
 *   const handleCreate = wrapMutation(createCategory);
 *   const handleUpdate = wrapMutation(updateCategory);
 *
 *   // Sau khi mutation thành công, useMutationPolling sẽ tự gọi
 *   // PollingManager.triggerRefreshByFetchKey('Category')
 *
 *   // Cách 2: Chỉ trigger refresh thủ công
 *   const { triggerRefresh } = useMutationPolling('Category');
 *   // ... sau mutation
 *   triggerRefresh();
 *
 *   // Cách 3: Gộp nhiều fetchKey (VD: Supplier affects cả Supplier và Receiver)
 *   const { wrapMutation } = useMutationPolling(['Supplier', 'Receiver']);
 */
export function useMutationPolling(fetchKeys) {
    const keys = Array.isArray(fetchKeys) ? fetchKeys : [fetchKeys];

    /**
     * Gọi trigger refresh cho tất cả fetchKeys liên quan.
     */
    const triggerRefresh = useCallback(() => {
        keys.forEach((key) => {
            PollingManager.triggerRefreshByFetchKey(key);
        });
    }, [keys]);

    /**
     * Wrap một mutation function — tự động trigger refresh sau khi thành công.
     * @param {Function} mutationFn - Hàm mutation gốc (VD: createCategory)
     * @returns {Function} - Hàm wrapped
     */
    const wrapMutation = useCallback(
        (mutationFn) => {
            return async (...args) => {
                const result = await mutationFn(...args);
                // Chỉ trigger khi có thay đổi thành công
                triggerRefresh();
                return result;
            };
        },
        [triggerRefresh]
    );

    return { wrapMutation, triggerRefresh };
}
