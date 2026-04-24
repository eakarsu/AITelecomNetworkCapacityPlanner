import React, { useEffect } from 'react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <div className={`toast toast-${toast.type}`} onClick={onRemove}>
      {toast.type === 'success' && '\u2713'}{toast.type === 'error' && '\u2717'}{toast.type === 'info' && '\u2139'} {toast.message}
    </div>
  );
}
