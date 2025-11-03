import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    // Generate stable ID using React's useId hook (prevents hydration mismatch)
    const generatedId = useId();
    const inputId = props.id || props.name || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={props.name || inputId}
            className={`
              w-full px-4 py-3
              ${icon ? 'pl-10' : ''}
              bg-background-secondary
              border border-border
              rounded-lg
              text-foreground
              placeholder:text-foreground-muted
              focus:outline-none
              focus:ring-2
              focus:ring-primary/50
              focus:border-primary
              transition-all duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              ${error ? 'border-error focus:ring-error/50 focus:border-error' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-error mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-foreground-muted mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
