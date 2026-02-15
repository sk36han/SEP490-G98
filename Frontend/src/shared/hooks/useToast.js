import { useState, useCallback } from 'react';

/**
 * Hook for toast notifications
 * @returns {{ toast: object|null, showToast: function, clearToast: function }}
 */
export const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    const clearToast = useCallback(() => {
        setToast(null);
    }, []);

    return { toast, showToast, clearToast };
};
