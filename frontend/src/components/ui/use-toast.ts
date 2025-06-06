import { toast as toastImpl } from './toaster';

/**
 * Hook to use toast notifications
 */
export const useToast = () => {
  /**
   * Show a success toast notification
   */
  const success = (title: string, description?: string) => {
    return toastImpl.success(title, description);
  };
  
  /**
   * Show an error toast notification
   */
  const error = (title: string, description?: string) => {
    return toastImpl.error(title, description);
  };
  
  /**
   * Show a default toast notification
   */
  const show = (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    return toastImpl.show(props);
  };
  
  /**
   * Dismiss a toast by its ID
   */
  const dismiss = (id: string) => {
    toastImpl.dismiss(id);
  };

  return {
    success,
    error,
    show,
    dismiss
  };
};
