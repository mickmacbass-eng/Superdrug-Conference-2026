import React from 'react';
import { X, Download, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallGuideModalProps {
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({ onClose }) => {
  const { isInstallable, isIOS, isInstalled, install } = usePWAInstall();

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#E5007D]" />
            <h3 className="text-sm font-bold text-black">
              Install Conference PWA
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Install the official Superdrug Conference app onto your device home screen for instant zero-latency schedule access, offline accreditation pass, and live floor interactions.
          </p>

          {isInstalled ? (
            <div className="p-3 bg-neutral-100 rounded-2xl flex items-center gap-2 text-xs font-semibold text-black">
              <CheckCircle className="w-4 h-4 text-[#E5007D]" />
              <span>You are already running the installed standalone app!</span>
            </div>
          ) : isInstallable ? (
            <div className="space-y-2 pt-2">
              {/* Native Prompt Available */}
              <button
                onClick={handleTriggerInstall}
                className="w-full bg-[#E5007D] text-white text-xs font-bold py-3 px-4 rounded-full shadow-md hover:bg-[#c4006b] active:scale-95 transition-all flex items-center justify-center gap-2 tap-highlight"
              >
                <Download className="w-4 h-4" />
                <span>Add to Home Screen Now</span>
              </button>
            </div>
          ) : isIOS ? (
            /* iOS Safari Instructions */
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2 text-xs text-neutral-700">
              <div className="font-bold text-black flex items-center gap-1.5">
                <span>Install on iPhone / iPad:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-neutral-600 leading-relaxed">
                <li>
                  Tap the <strong className="text-black">Share</strong> icon <Share className="inline w-3 h-3 text-[#E5007D] mx-0.5" /> in the Safari bottom bar.
                </li>
                <li>
                  Scroll down and tap <strong className="text-black">Add to Home Screen</strong> <PlusSquare className="inline w-3 h-3 text-black mx-0.5" />.
                </li>
                <li>
                  Tap <strong className="text-black">Add</strong> in the top right corner.
                </li>
              </ol>
            </div>
          ) : (
            /* Standard Android / Desktop Chrome guidance */
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2 text-xs text-neutral-700">
              <div className="font-bold text-black">Quick Install Guide:</div>
              <p className="text-neutral-600 leading-relaxed">
                Tap your browser menu (<strong className="text-black">⋮</strong> or <strong className="text-black">···</strong>) and select <strong className="text-black">&ldquo;Install App&rdquo;</strong> or <strong className="text-black">&ldquo;Add to Home screen&rdquo;</strong>.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full border border-neutral-300 text-black text-xs font-bold py-2.5 rounded-full hover:bg-neutral-50 tap-highlight"
        >
          Close
        </button>
      </div>
    </div>
  );
};
