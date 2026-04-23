import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import notificationService from '../../shared/lib/notificationService';
import authService from '../../shared/lib/authService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const getHubUrl = () => {
    const apiBase = import.meta?.env?.VITE_API_BASE_URL;
    if (apiBase && String(apiBase).trim()) {
        return `${String(apiBase).trim().replace(/\/api\/?$/, '')}/hubs/notification`;
    }
    if (import.meta?.env?.DEV) {
        return 'http://localhost:5141/hubs/notification';
    }
    return '/hubs/notification';
};

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const connectionRef = useRef(null);
    const isAuthenticated = Boolean(user) && authService.isFullyAuthenticated();

    const refreshUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return 0;
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
        return count;
    }, [isAuthenticated]);

    const refreshNotifications = useCallback(async (options = {}) => {
        if (!isAuthenticated) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await notificationService.getMyNotifications({
                pageNumber: 1,
                pageSize: 50,
                ...options,
            });
            setNotifications(result.items);
            return result;
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không thể tải thông báo');
            return null;
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const markAsRead = useCallback(async (notificationId) => {
        if (!notificationId) return;
        await notificationService.markAsRead(notificationId);
        setNotifications((prev) =>
            prev.map((item) =>
                item.notificationId === notificationId ? { ...item, isRead: true } : item
            )
        );
        await refreshUnreadCount();
    }, [refreshUnreadCount]);

    const markAllAsRead = useCallback(async () => {
        await notificationService.markAllAsRead();
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            if (!isAuthenticated) {
                setNotifications([]);
                setUnreadCount(0);
                return;
            }
            await Promise.all([refreshNotifications(), refreshUnreadCount()]);
        };

        bootstrap();

        const handleReady = () => {
            bootstrap();
        };
        window.addEventListener('mk-auth-ready', handleReady);
        return () => window.removeEventListener('mk-auth-ready', handleReady);
    }, [isAuthenticated, refreshNotifications, refreshUnreadCount]);

    useEffect(() => {
        if (!isAuthenticated) {
            if (connectionRef.current) {
                connectionRef.current.stop().catch(() => {});
                connectionRef.current = null;
            }
            return;
        }

        const connection = new HubConnectionBuilder()
            .withUrl(getHubUrl(), {
                accessTokenFactory: () => authService.getToken() || '',
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        connection.on('ReceiveNotification', (notification) => {
            const normalized = {
                notificationId: notification.notificationId ?? notification.NotificationId ?? 0,
                title: notification.title ?? notification.Title ?? '',
                message: notification.message ?? notification.Message ?? '',
                refType: notification.refType ?? notification.RefType ?? null,
                refId: notification.refId ?? notification.RefId ?? null,
                isRead: notification.isRead ?? notification.IsRead ?? false,
                createdAt: notification.createdAt ?? notification.CreatedAt ?? null,
                type: notification.type ?? notification.Type ?? null,
                severity: notification.severity ?? notification.Severity ?? 0,
                expiresAt: notification.expiresAt ?? notification.ExpiresAt ?? null,
            };

            setNotifications((prev) => {
                if (prev.some((x) => x.notificationId === normalized.notificationId)) return prev;
                return [normalized, ...prev].slice(0, 100);
            });
        });

        connection.on('UpdateUnreadCount', (count) => {
            setUnreadCount(Number(count) || 0);
        });

        connection
            .start()
            .then(() => {
                connectionRef.current = connection;
            })
            .catch(() => {});

        return () => {
            connection.stop().catch(() => {});
            connectionRef.current = null;
        };
    }, [isAuthenticated]);

    const value = useMemo(
        () => ({
            notifications,
            unreadCount,
            loading,
            error,
            refreshNotifications,
            refreshUnreadCount,
            markAsRead,
            markAllAsRead,
        }),
        [notifications, unreadCount, loading, error, refreshNotifications, refreshUnreadCount, markAsRead, markAllAsRead]
    );

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}
