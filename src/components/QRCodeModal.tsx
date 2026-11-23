import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Wifi,
  AlertTriangle,
  Globe,
  QrCode as QrCodeIcon,
  Star,
} from 'lucide-react';
import { useBrand } from '../config/BrandContext';

interface QRCodeModalProps {
  onClose: () => void;
  defaultUrl?: string;
}

type QRMode = 'compact-star' | 'pure-qr';
type StarStyle = 'solid-pink' | 'outline-pink' | 'gradient-glow';

const PUBLIC_SHARED_FALLBACK =
  'https://ais-pre-j2uqq5lojobtsqdimbf55f-665703813414.europe-west2.run.app';

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ onClose, defaultUrl }) => {
  const { config } = useBrand();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const storageKey = `conference_custom_qr_url_${config.id}`;

  // Resolve initial URL for active client brand:
  // 1. Explicit defaultUrl prop
  // 2. Per-brand saved custom production URL in localStorage
  // 3. Legacy global custom URL in localStorage
  // 4. Current window origin (normalized away from ais-dev- if needed)
  const detectedInitialUrl = React.useMemo(() => {
    if (defaultUrl) return defaultUrl;
    if (typeof window !== 'undefined') {
      try {
        const brandSaved = localStorage.getItem(storageKey);
        if (brandSaved) return brandSaved;
        const legacySaved = localStorage.getItem('conference_custom_qr_url');
        if (legacySaved) return legacySaved;
      } catch {
        // ignore storage restrictions
      }
      const origin = window.location.origin;
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return PUBLIC_SHARED_FALLBACK;
      }
      return origin;
    }
    return PUBLIC_SHARED_FALLBACK;
  }, [defaultUrl, storageKey]);

  const [targetUrl, setTargetUrl] = useState<string>(detectedInitialUrl);
  const [qrMode, setQrMode] = useState<QRMode>('compact-star');
  const [starStyle, setStarStyle] = useState<StarStyle>('solid-pink');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Keep targetUrl synced if brand switches while modal stays open
  useEffect(() => {
    setTargetUrl(detectedInitialUrl);
  }, [detectedInitialUrl]);

  // Persist non-sandbox custom URL per brand
  const handleUrlChange = (newUrl: string) => {
    setTargetUrl(newUrl);
    try {
      const trimmed = newUrl.trim();
      if (trimmed && !trimmed.includes('.run.app') && !trimmed.includes('localhost')) {
        localStorage.setItem(storageKey, trimmed);
      }
    } catch {
      // ignore
    }
  };

  // Validate URL safely
  const parsedUrl = React.useMemo(() => {
    try {
      return new URL(targetUrl.trim());
    } catch {
      return null;
    }
  }, [targetUrl]);

  const isValidUrl = Boolean(parsedUrl && (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'));

  // Helper to build preset route onto whatever base domain is currently entered
  const applyRoutePreset = (paramsToSet: Record<string, string | null>) => {
    const baseStr = isValidUrl ? targetUrl.trim() : detectedInitialUrl;
    try {
      const next = new URL(baseStr);
      // Clear previous view presets before applying
      next.searchParams.delete('feedback');
      next.searchParams.delete('splash');
      next.searchParams.delete('moderator');
      Object.entries(paramsToSet).forEach(([key, value]) => {
        if (value === null) {
          next.searchParams.delete(key);
        } else {
          next.searchParams.set(key, value);
        }
      });
      handleUrlChange(next.toString());
    } catch {
      // fallback silently if user cleared the input completely
    }
  };

  // Draw crisp 5-point star on 2D canvas context
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  // Render high-res QR Code onto canvas
  useEffect(() => {
    let isCancelled = false;

    const renderQR = async () => {
      const urlToEncode = targetUrl.trim();
      if (!urlToEncode) {
        setQrError('Enter a web app URL above to generate the QR code.');
        setQrDataUrl('');
        return;
      }

      setIsGenerating(true);
      setQrError(null);

      try {
        const size = 1000;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        // ISO/IEC 18004 compliant 4-module quiet zone + Level H (30% error correction)
        await QRCode.toCanvas(canvas, urlToEncode, {
          errorCorrectionLevel: 'H',
          margin: 4,
          width: size,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        // Only draw center emblem in Compact Star mode; Pure QR leaves 100% of modules untouched
        if (qrMode === 'compact-star') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const center = size / 2;
            // Compact ~13.6% diameter badge (< 2.2% total matrix occlusion)
            // Keeps Apple Vision / iOS Camera alignment tracks completely clear
            const badgeRadius = size * 0.068;

            // Outer white protective halo
            ctx.save();
            ctx.beginPath();
            ctx.arc(center, center, badgeRadius + 9, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.fill();
            ctx.restore();

            // Subtle accent ring around crisp white disc
            ctx.beginPath();
            ctx.arc(center, center, badgeRadius + 5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.lineWidth = 6;
            ctx.strokeStyle = config.colors.primaryAccent || '#E5007D';
            ctx.stroke();

            // Clean inner white disc
            ctx.beginPath();
            ctx.arc(center, center, badgeRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // Center Superdrug 5-point Star
            const starOuter = badgeRadius * 0.78;
            const starInner = starOuter * 0.45;
            const accent = config.colors.primaryAccent || '#E5007D';

            if (starStyle === 'gradient-glow') {
              const grad = ctx.createLinearGradient(
                center - starOuter,
                center - starOuter,
                center + starOuter,
                center + starOuter
              );
              grad.addColorStop(0, '#FF40B4');
              grad.addColorStop(0.5, accent);
              grad.addColorStop(1, '#9E0054');

              drawStar(ctx, center, center, 5, starOuter, starInner);
              ctx.fillStyle = grad;
              ctx.fill();

              drawStar(ctx, center, center, 5, starOuter * 0.46, starInner * 0.46);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            } else if (starStyle === 'outline-pink') {
              drawStar(ctx, center, center, 5, starOuter, starInner);
              ctx.lineWidth = 9;
              ctx.lineJoin = 'round';
              ctx.strokeStyle = accent;
              ctx.stroke();
            } else {
              drawStar(ctx, center, center, 5, starOuter, starInner);
              ctx.fillStyle = accent;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(center, center, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            }
          }
        }

        if (!isCancelled) {
          const dataUrl = canvas.toDataURL('image/png');
          setQrDataUrl(dataUrl);

          if (canvasRef.current) {
            const displayCtx = canvasRef.current.getContext('2d');
            if (displayCtx) {
              canvasRef.current.width = size;
              canvasRef.current.height = size;
              displayCtx.drawImage(canvas, 0, 0);
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error generating QR code:', err);
          setQrError('Unable to encode that URL. Check formatting and try again.');
        }
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    renderQR();
    return () => {
      isCancelled = true;
    };
  }, [targetUrl, qrMode, starStyle, config.colors.primaryAccent]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const modeSlug = qrMode === 'pure-qr' ? 'Pure' : 'Star';
    const brandSlug = (config.name || 'Conference').replace(/[^a-z0-9]/gi, '-');
    link.download = `${brandSlug}-2026-QR-${modeSlug}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrintPlacard = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const accent = config.colors.primaryAccent || '#E5007D';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.eventName || 'Conference'} - QR Code Placard</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #000;
              margin: 0;
              padding: 20px;
              text-align: center;
              background: #fff;
            }
            .card {
              border: 3px solid ${accent};
              border-radius: 28px;
              padding: 40px 30px;
              max-width: 580px;
              margin: 0 auto;
            }
            .badge {
              display: inline-block;
              background: #000;
              color: #fff;
              padding: 6px 18px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 32px;
              margin: 0 0 8px 0;
              font-weight: 900;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }
            .tagline {
              font-size: 15px;
              color: ${accent};
              font-weight: 700;
              margin-bottom: 24px;
            }
            .qr-container {
              margin: 20px auto;
              width: 320px;
              height: 320px;
              padding: 12px;
              background: #fff;
              border: 2px solid #000;
              border-radius: 24px;
            }
            .qr-container img {
              width: 100%;
              height: 100%;
              display: block;
            }
            .instructions {
              font-size: 18px;
              font-weight: 800;
              color: #000;
              margin: 20px 0 6px 0;
            }
            .subtext {
              font-size: 13px;
              color: #555;
              margin-bottom: 20px;
            }
            .meta-box {
              background: #f7f7f7;
              border-radius: 16px;
              padding: 16px;
              margin-top: 24px;
              font-size: 12px;
              text-align: left;
              line-height: 1.6;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px solid #e5e5e5;
            }
            .meta-row:last-child { border-bottom: none; }
            .meta-label { font-weight: 700; color: #222; }
            .meta-val { font-weight: 600; color: ${accent}; }
            .footer {
              margin-top: 24px;
              font-size: 13px;
              font-weight: 700;
              color: #888;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Official Conference Web App</div>
            <h1>${config.name || 'SUPERDRUG'}</h1>
            <div class="tagline">${config.eventName || 'Supplier Conference 2026'}</div>

            <div class="qr-container">
              <img src="${qrDataUrl}" alt="Conference QR Code" />
            </div>

            <div class="instructions">Scan With Any Phone Camera</div>
            <div class="subtext">iPhone iOS &amp; Android compatible · Instant access to agenda, Q&amp;A, and live polls</div>

            <div class="meta-box">
              <div class="meta-row">
                <span class="meta-label">Venue</span>
                <span class="meta-val">${config.venue || 'The Brewery, London'}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Complimentary Wi-Fi</span>
                <span class="meta-val">TheBrewery-Guest</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Wi-Fi Password</span>
                <span class="meta-val">SuperSuppliers26</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Direct App URL</span>
                <span class="meta-val" style="word-break: break-all; font-size: 11px;">${targetUrl}</span>
              </div>
            </div>

            <div class="footer">${config.tagline || 'Partnering for Growth'}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: config.colors.primaryAccent }}>
                <path d="M12 2l2.4 6.8H21l-5.6 4.3 2.1 6.9-5.5-4.2-5.5 4.2 2.1-6.9L3 8.8h6.6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-black leading-tight">
                Web App QR Code
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {config.name} · {qrMode === 'pure-qr' ? 'Pure Scan Mode' : 'Compact Star Mode'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
            aria-label="Close QR Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-5 flex-1">
          {/* Mode Toggle: Pure QR vs Compact Star */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-800">QR Compatibility Mode</span>
              <span className="text-neutral-500 font-medium">iPhone &amp; Android</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-xl">
              <button
                type="button"
                onClick={() => setQrMode('compact-star')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  qrMode === 'compact-star'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Star className="w-3.5 h-3.5 shrink-0" style={{ color: config.colors.primaryAccent }} />
                <span>Compact Star</span>
              </button>
              <button
                type="button"
                onClick={() => setQrMode('pure-qr')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  qrMode === 'pure-qr'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <QrCodeIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Pure QR</span>
              </button>
            </div>
          </div>

          {/* QR Display Canvas */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-white rounded-2xl border-2 border-black shadow-sm">
              {qrError ? (
                <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-center p-4 bg-neutral-50 rounded-xl text-xs text-neutral-600">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
                  <span>{qrError}</span>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg block mx-auto cursor-pointer"
                  title="Tap to copy web app link"
                  onClick={handleCopyLink}
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 font-medium text-center">
              <span>Level H (30% recovery)</span>
              <span aria-hidden="true">·</span>
              <span>4-module quiet zone</span>
              <span aria-hidden="true">·</span>
              <span>{qrMode === 'pure-qr' ? '0% center occlusion' : 'Compact 13.6% star'}</span>
            </div>
          </div>

          {/* Star Sub-Styles (Only shown when Compact Star is active) */}
          {qrMode === 'compact-star' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800">Center Star Finish</span>
                <span className="text-neutral-500 text-[11px]">Brand Mark</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'solid-pink' as const, label: 'Solid Pink' },
                  { id: 'outline-pink' as const, label: 'Outline' },
                  { id: 'gradient-glow' as const, label: '3D Gloss' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStarStyle(opt.id)}
                    className={`min-h-[40px] px-2 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                      starStyle === opt.id
                        ? 'bg-[#E5007D] text-white border-[#E5007D]'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                    style={
                      starStyle === opt.id
                        ? { backgroundColor: config.colors.primaryAccent, borderColor: config.colors.primaryAccent }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Destination URL & Sandbox vs Public Gate Status */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label htmlFor="qr-target-url" className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-neutral-500" />
                <span>Destination URL</span>
              </label>
              {isValidUrl && (
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold flex items-center gap-1 hover:underline"
                  style={{ color: config.colors.primaryAccent }}
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                id="qr-target-url"
                type="url"
                value={targetUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1 min-h-[44px] text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black truncate"
                placeholder="https://events.yourclient.com"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95'
                }`}
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Deep-link presets that preserve custom public domain */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyRoutePreset({ feedback: null, splash: null, brand: null })}
                className="min-h-[36px] text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors whitespace-nowrap"
              >
                App Home
              </button>
              <button
                type="button"
                onClick={() => applyRoutePreset({ feedback: 'true', splash: null })}
                className="min-h-[36px] text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors whitespace-nowrap"
              >
                Direct Feedback
              </button>
              <button
                type="button"
                onClick={() => applyRoutePreset({ splash: 'true', feedback: null })}
                className="min-h-[36px] text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors whitespace-nowrap"
              >
                Welcome Splash
              </button>
              <button
                type="button"
                onClick={() => applyRoutePreset({ brand: config.id })}
                className="min-h-[36px] text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors whitespace-nowrap"
                title={`Append ?brand=${config.id} for multi-client hosting`}
              >
                Lock {config.name} Brand
              </button>
            </div>

            {/* URL Validation Warning */}
            {!isValidUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Enter a valid https:// URL</div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Include https:// at the start so iPhone Camera recognizes it immediately as a website link.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Event Wi-Fi Reference */}
          <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200 flex items-start gap-2.5 text-xs text-neutral-600">
            <Wifi className="w-4 h-4 shrink-0 mt-0.5" style={{ color: config.colors.primaryAccent }} />
            <div className="space-y-0.5">
              <div className="font-bold text-black text-[11px]">
                Event Wi-Fi Information
              </div>
              <div className="text-[11px]">
                Network: <span className="font-mono font-semibold text-black">TheBrewery-Guest</span>
                <span aria-hidden="true"> · </span>
                Password: <span className="font-mono font-semibold text-black">SuperSuppliers26</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/80 rounded-b-3xl flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={!qrDataUrl || isGenerating}
            className="w-full sm:flex-1 min-h-[44px] bg-[#E5007D] hover:opacity-95 active:scale-95 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-full shadow-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            style={{ backgroundColor: config.colors.primaryAccent }}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download High-Res PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPlacard}
            disabled={!qrDataUrl || isGenerating}
            className="w-full sm:w-auto min-h-[44px] bg-black hover:bg-neutral-800 active:scale-95 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            title="Print an A4 table tent or standee placard"
          >
            <Printer className="w-4 h-4 shrink-0" style={{ color: config.colors.primaryAccent }} />
            <span>Print Placard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
