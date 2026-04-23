let toastHandler = null;

export const registerGlobalToastHandler = (handler) => {
    toastHandler = handler;
    return () => {
        if (toastHandler === handler) {
            toastHandler = null;
        }
    };
};

export const emitGlobalToast = (message, type = 'info') => {
    if (!message) return;
    if (typeof toastHandler === 'function') {
        toastHandler(message, type);
    }
};
