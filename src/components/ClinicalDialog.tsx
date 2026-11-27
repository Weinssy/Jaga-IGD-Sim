import { ReactNode, useLayoutEffect, useRef } from 'react';

interface ClinicalDialogProps {
  labelledBy: string;
  onDismiss: () => void;
  className?: string;
  children: ReactNode;
}

export function ClinicalDialog({ labelledBy, onDismiss, className = '', children }: ClinicalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={`clinical-dialog ${className}`}
      onClose={(event) => {
        if (!event.currentTarget.open) onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}
