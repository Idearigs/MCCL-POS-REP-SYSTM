import React, { useState, useEffect } from 'react';
import { Toast, ToastProps } from './toast';

type ToastType = ToastProps & { id: string };

interface ToasterContextType {
  toasts: ToastType[];
  addToast: (toast: Omit<ToastProps, 'onClose'>) => void;
  removeToast: (id: string) => void;
}

const ToasterContext = React.createContext<ToasterContextType | undefined>(undefined);

export const useToaster = () => {
  const context = React.useContext(ToasterContext);
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider');
  }
  return context;
};

export const ToasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = (toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);

    // Auto remove toast after 5 seconds unless it's destructive
    if (toast.variant !== 'destructive') {
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const value = {
    toasts,
    addToast,
    removeToast,
  };

  return <ToasterContext.Provider value={value}>{children}</ToasterContext.Provider>;
};

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToaster();

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col p-4 space-y-4 max-w-md w-full">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          action={toast.action}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Standalone toaster that doesn't require context
let toastCounter = 0;
const toastQueue: ToastType[] = [];
let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const toast = {
  show: (props: Omit<ToastProps, 'onClose'>) => {
    const id = `toast-${toastCounter++}`;
    const newToast = { ...props, id };
    toastQueue.push(newToast);
    notifyListeners();

    // Auto remove after 5 seconds unless it's destructive
    if (props.variant !== 'destructive') {
      setTimeout(() => {
        toast.dismiss(id);
      }, 5000);
    }

    return id;
  },
  dismiss: (id: string) => {
    const index = toastQueue.findIndex((t) => t.id === id);
    if (index !== -1) {
      toastQueue.splice(index, 1);
      notifyListeners();
    }
  },
  error: (title: string, description?: string) => {
    return toast.show({ variant: 'destructive', title, description });
  },
  success: (title: string, description?: string) => {
    return toast.show({ title, description });
  },
};

// Standalone Toaster component that doesn't require context
export const StandaloneToaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const updateToasts = () => {
      setToasts([...toastQueue]);
    };

    listeners.push(updateToasts);
    updateToasts();

    return () => {
      listeners = listeners.filter((listener) => listener !== updateToasts);
    };
  }, []);

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col p-4 space-y-4 max-w-md w-full">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          action={toast.action}
          onClose={() => toast.dismiss(toast.id)}
        />
      ))}
    </div>
  );
};
