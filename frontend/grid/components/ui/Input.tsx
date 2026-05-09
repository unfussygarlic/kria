import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseInput = "w-full bg-surface-3 border border-white/10 rounded-xl px-4 text-text text-sm placeholder:text-text-muted outline-none focus:border-primary transition-colors disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...rest }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-semibold text-text-sub uppercase tracking-wide">{label}</label>}
      <input className={`${baseInput} h-11 ${error ? "border-error" : ""} ${className}`} {...rest} />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, children, className = "", ...rest }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-semibold text-text-sub uppercase tracking-wide">{label}</label>}
      <select className={`${baseInput} h-11 cursor-pointer ${error ? "border-error" : ""} ${className}`} {...rest}>
        {children}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...rest }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-semibold text-text-sub uppercase tracking-wide">{label}</label>}
      <textarea
        className={`${baseInput} py-3 resize-none ${error ? "border-error" : ""} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
