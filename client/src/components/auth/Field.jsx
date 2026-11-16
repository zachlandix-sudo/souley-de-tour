import { useId, useState } from 'react';

// One labelled input for the sign-in pages: hint, inline error, show/hide for passwords, Caps Lock warning.
export default function Field({ label, hint, error, type = 'text', inputRef, children, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error && `${id}-err`, !error && hint && `${id}-hint`, caps && `${id}-caps`].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`field-line ${isPassword ? 'pr-14' : ''}`}
          onKeyUp={isPassword ? (e) => setCaps(!!e.getModifierState?.('CapsLock')) : undefined}
          onBlur={isPassword ? () => setCaps(false) : undefined}
          {...props}
        />
        {isPassword && (
          <button type="button" aria-pressed={shown} aria-label={`${shown ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setShown((s) => !s)}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-1 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink">
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {caps && <p id={`${id}-caps`} className="mt-1 text-xs font-medium text-ember">Caps Lock is on.</p>}
      {error
        ? <p id={`${id}-err`} className="mt-1 text-sm text-danger">{error}</p>
        : hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}
