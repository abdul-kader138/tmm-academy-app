import React, { createContext, useContext, useState, useCallback } from 'react';
import { FloatingSnackbar, ToastOptions, ToastType } from '../components/FloatingSnackbar';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  showError: (message: string, title?: string, onConfirm?: () => void) => void;
  showSuccess: (message: string, title?: string, onConfirm?: () => void) => void;
  showInfo: (message: string, title?: string, onConfirm?: () => void) => void;
  showWarning: (message: string, title?: string, onConfirm?: () => void) => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global static reference for use outside React component hooks (e.g., API interceptors, utilities)
type GlobalToastRef = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

let globalToastRef: GlobalToastRef | null = null;

export const Toast = {
  show: (options: ToastOptions) => {
    if (globalToastRef) {
      globalToastRef.show(options);
    }
  },
  error: (message: string, title: string = 'Notice', onConfirm?: () => void) => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'error', message, title, onConfirm });
    }
  },
  success: (message: string, title: string = 'Success', onConfirm?: () => void) => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'success', message, title, onConfirm });
    }
  },
  info: (message: string, title: string = 'Notice', onConfirm?: () => void) => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'info', message, title, onConfirm });
    }
  },
  warning: (message: string, title: string = 'Warning', onConfirm?: () => void) => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'warning', message, title, onConfirm });
    }
  },
  confirm: (options: ConfirmOptions) => {
    if (globalToastRef) {
      globalToastRef.show({
        title: options.title || 'Confirm',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    }
  },
  hide: () => {
    if (globalToastRef) {
      globalToastRef.hide();
    }
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<ToastOptions | null>(null);

  const hideToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    setActiveToast({ ...options });
  }, []);

  const showError = useCallback((message: string, title: string = 'Notice', onConfirm?: () => void) => {
    showToast({ type: 'error', message, title, onConfirm });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title: string = 'Success', onConfirm?: () => void) => {
    showToast({ type: 'success', message, title, onConfirm });
  }, [showToast]);

  const showInfo = useCallback((message: string, title: string = 'Notice', onConfirm?: () => void) => {
    showToast({ type: 'info', message, title, onConfirm });
  }, [showToast]);

  const showWarning = useCallback((message: string, title: string = 'Warning', onConfirm?: () => void) => {
    showToast({ type: 'warning', message, title, onConfirm });
  }, [showToast]);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    showToast({
      title: options.title || 'Confirm',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, [showToast]);

  // Connect global ref
  globalToastRef = {
    show: showToast,
    hide: hideToast,
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showInfo,
        showWarning,
        showConfirm,
        hideToast,
      }}
    >
      {children}
      <FloatingSnackbar toast={activeToast} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: Toast.show,
      showError: Toast.error,
      showSuccess: Toast.success,
      showInfo: Toast.info,
      showWarning: Toast.warning,
      showConfirm: Toast.confirm,
      hideToast: Toast.hide,
    };
  }
  return context;
};
