/**
 * PollingManager — singleton quản lý polling intervals cho tất cả list pages.
 *
 * - Đăng ký trang cần poll → bắt đầu interval
 * - Hủy đăng ký → dừng interval
 * - Trigger refresh → gọi callback của trang đã đăng ký
 * - Cleanup toàn bộ khi logout / unmount
 */

import { pollingConfig, POLLING_INTERVAL_MS } from './pollingConfig';

class PollingManagerClass {
    constructor() {
        /** @type {Map<string, { intervalId: number, fetchFn: Function, lastRun: number, inFlight: boolean }>} */
        this._entries = new Map();
    }

    _isPageVisible() {
        if (typeof document === 'undefined') return true;
        return document.visibilityState === 'visible';
    }

    _runFetch(pageKey, { force = false } = {}) {
        const entry = this._entries.get(pageKey);
        if (!entry || !entry.fetchFn) return;
        if (entry.inFlight) return;
        if (!force && !this._isPageVisible()) return;

        entry.inFlight = true;
        Promise.resolve()
            .then(() => entry.fetchFn())
            .catch((err) => {
                console.warn(`[PollingManager] fetchFn failed for "${pageKey}":`, err);
            })
            .finally(() => {
                const current = this._entries.get(pageKey);
                if (current) {
                    current.inFlight = false;
                    current.lastRun = Date.now();
                }
            });
    }

    /**
     * Đăng ký một trang để polling.
     * @param {string} pageKey - Key của trang (từ pollingConfig)
     * @param {Function} fetchFn - Hàm gọi khi cần refresh
     * @param {number} [intervalMs] - Override interval cho trang này
     */
    startPolling(pageKey, fetchFn, intervalMs) {
        if (this._entries.has(pageKey)) {
            // Đã có → chỉ cập nhật fetchFn nếu khác
            const entry = this._entries.get(pageKey);
            entry.fetchFn = fetchFn;
            return;
        }

        const cfg = pollingConfig[pageKey];
        const interval = intervalMs ?? cfg?.interval ?? POLLING_INTERVAL_MS;

        const intervalId = setInterval(() => {
            this._runFetch(pageKey);
        }, interval);

        this._entries.set(pageKey, {
            intervalId,
            fetchFn,
            lastRun: Date.now(),
            inFlight: false,
        });
    }

    /**
     * Hủy polling cho một trang.
     * @param {string} pageKey
     */
    stopPolling(pageKey) {
        const entry = this._entries.get(pageKey);
        if (entry) {
            clearInterval(entry.intervalId);
            this._entries.delete(pageKey);
        }
    }

    /**
     * Trigger refresh cho một hoặc nhiều trang.
     * @param {string|string[]} pageKeys - Key(s) của trang(s) cần refresh
     */
    triggerRefresh(pageKeys) {
        const keys = Array.isArray(pageKeys) ? pageKeys : [pageKeys];
        keys.forEach((key) => {
            this._runFetch(key, { force: true });
        });
    }

    /**
     * Trigger refresh theo fetchKey (VD: 'Category', 'Supplier').
     * Tự động tìm tất cả pageKeys liên quan.
     * @param {string} fetchKey
     */
    triggerRefreshByFetchKey(fetchKey) {
        const keys = Object.values(pollingConfig)
            .filter((cfg) => cfg.fetchKey === fetchKey)
            .map((cfg) => cfg.pageKey);
        this.triggerRefresh(keys);
    }

    /**
     * Dừng tất cả polling (gọi khi logout).
     */
    stopAll() {
        this._entries.forEach((entry) => clearInterval(entry.intervalId));
        this._entries.clear();
    }

    /**
     * Kiểm tra trang đang được poll.
     * @param {string} pageKey
     * @returns {boolean}
     */
    isPolling(pageKey) {
        return this._entries.has(pageKey);
    }
}

/** Singleton instance */
const PollingManager = new PollingManagerClass();

/**
 * Named export alias — dùng trong service files.
 * VD: import { invalidate } from './pollingManager';
 * @param {string} fetchKey
 */
const invalidate = (fetchKey) => {
    if (!fetchKey) return;
    const normalized = fetchKey.charAt(0).toUpperCase() + fetchKey.slice(1);
    PollingManager.triggerRefreshByFetchKey(normalized);
};

export default PollingManager;
export { invalidate, PollingManager };
