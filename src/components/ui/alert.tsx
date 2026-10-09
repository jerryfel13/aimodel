import { ReactNode } from 'react';
import { AlertCircle, Info, TriangleAlert } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
}

export function Alert({ type = 'info', title, children }: AlertProps) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = {
    error: AlertCircle,
    warning: TriangleAlert,
    info: Info,
  };
  const Icon = icons[type];

  return (
    <div className={`rounded-lg border px-4 py-3 ${styles[type]}`} role="alert">
      <div className="flex gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          {title && <p className="font-semibold">{title}</p>}
          <div className={title ? 'mt-1' : ''}>{children}</div>
        </div>
      </div>
    </div>
  );
}
