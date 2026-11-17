import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FloatingSnackbar, ToastOptions, ToastType } from '../components/FloatingSnackbar';

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
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
  error: (message: string, title: string = 'Notice') => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'error', message, title });
    }
  },
  success: (message: string, title: string = 'Success') => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'success', message, title });
    }
  },
  info: (message: string, title: string = 'Notice') => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'info', message, title });
    }
  },
  warning: (message: string, title: string = 'Warning') => {
    if (globalToastRef) {
      globalToastRef.show({ type: 'warning', message, title });
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

  const showError = useCallback((message: string, title: string = 'Notice') => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showInfo = useCallback((message: string, title: string = 'Notice') => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  const showWarning = useCallback((message: string, title: string = 'Warning') => {
    showToast({ type: 'warning', message, title });
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
    // Graceful fallback if invoked outside ToastProvider
    return {
      showToast: Toast.show,
      showError: Toast.error,
      showSuccess: Toast.success,
      showInfo: Toast.info,
      showWarning: Toast.warning,
      hideToast: Toast.hide,
    };
  }
  return context;
};
