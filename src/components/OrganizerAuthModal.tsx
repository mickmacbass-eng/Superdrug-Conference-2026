import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, Shield } from 'lucide-react';
import { useBrand } from '../config/BrandContext';
import { verifyOrganizerPasscode } from '../utils/organizerAuth';

interface OrganizerAuthModalProps {
  targetLabel: string;
  onAuthenticated: () => void;
  onCancel: () => void;
}

export const OrganizerAuthModal: React.FC<OrganizerAuthModalProps> = ({
  targetLabel,
  onAuthenticated,
  onCancel,
}) => {
  const { config } = useBrand();
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Enter the organizer passcode to continue.');
      inputRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const valid = await verifyOrganizerPasscode(passcode, config.id);
      if (valid) {
        onAuthenticated();
      } else {
        setErrorMessage('Incorrect organizer passcode. Please try again.');
        setPasscode('');
        inputRef.current?.focus();
      }
    } catch {
      setErrorMessage('Unable to verify passcode. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organizer-auth-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" style={{ color: config.colors.primaryAccent }} />
            </div>
            <div>
              <h2
                id="organizer-auth-title"
                className="text-base font-extrabold tracking-tight text-black leading-tight"
              >
                Organizer Access
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {targetLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
            aria-label="Close organizer password prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            This area is restricted to conference organizers. Enter the event organizer passcode to unlock admin tools for this session.
          </p>

          <div className="space-y-1.5">
            <label
              htmlFor="organizer-passcode-input"
              className="block text-xs font-bold text-neutral-800"
            >
              Organizer Passcode
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="organizer-passcode-input"
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoComplete="current-password"
                placeholder="Enter passcode"
                className={`w-full min-h-[44px] pl-3.5 pr-12 py-2.5 text-sm font-semibold rounded-xl border bg-white text-black placeholder:text-neutral-400 placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                  errorMessage
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-neutral-300 focus:border-black focus:ring-neutral-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                className="absolute right-0.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-500 hover:text-black transition-colors"
                aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-full text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
              style={{ backgroundColor: config.colors.primaryAccent }}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>{isVerifying ? 'Checking...' : 'Unlock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
