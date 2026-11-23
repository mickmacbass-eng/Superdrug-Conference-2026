import React, { useState } from 'react';
import { useBrand } from '../config/BrandContext';
import {
  QrCode,
  ShieldCheck,
  Download,
  Share2,
  CheckCircle,
  Sparkles,
  Edit3,
  User,
  MapPin,
  Utensils,
  Award,
  Wallet,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DelegateInfo {
  name: string;
  role: string;
  store: string; // company / brand
  badgeId: string;
  seatZone: string;
  dietary: string;
  checkedInSessions: string[];
}

interface MyPassViewProps {
  onOpenQRCode?: () => void;
}

export const MyPassView: React.FC<MyPassViewProps> = ({ onOpenQRCode }) => {
  const { config } = useBrand();
  const [delegate, setDelegate] = useState<DelegateInfo>(() => {
    const saved = localStorage.getItem('sd_supplier_pass');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      name: 'Mark Henderson',
      role: 'Commercial Director',
      store: 'L’Oréal UK & Ireland',
      badgeId: 'SD-SUPP-2026-4198',
      seatZone: 'The Porter Tun · Table 8 · Seat 3',
      dietary: 'Standard Menu',
      checkedInSessions: ['The Brewery London — Supplier Registration & Plenary'],
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(delegate.name);
  const [editRole, setEditRole] = useState(delegate.role);
  const [editStore, setEditStore] = useState(delegate.store);
  const [editDietary, setEditDietary] = useState(delegate.dietary);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [lastCheckInToast, setLastCheckInToast] = useState<string | null>(null);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...delegate,
      name: editName.trim() || 'Mark Henderson',
      role: editRole.trim() || 'Commercial Director',
      store: editStore.trim() || 'L’Oréal UK & Ireland',
      dietary: editDietary.trim() || 'Standard Menu',
    };
    setDelegate(updated);
    localStorage.setItem('sd_supplier_pass', JSON.stringify(updated));
    setIsEditing(false);
  };

  const handleSimulateCheckIn = () => {
    const newSession = `The Porter Tun Stage — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updated = {
      ...delegate,
      checkedInSessions: [newSession, ...delegate.checkedInSessions],
    };
    setDelegate(updated);
    localStorage.setItem('sd_supplier_pass', JSON.stringify(updated));

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: [config.colors.primaryAccent, '#000000', '#ffffff'],
      });
    } catch {
      // Fallback
    }

    setLastCheckInToast(`Pass verified! Welcome to ${config.venue}.`);
    setTimeout(() => setLastCheckInToast(null), 3500);
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight">
            My Pass
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Digital delegate accreditation · {config.date}
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs font-semibold text-neutral-700 hover:text-black flex items-center gap-1 border border-neutral-200 px-3 py-1.5 rounded-full hover:bg-neutral-50 transition-colors tap-highlight"
        >
          <Edit3 className="w-3.5 h-3.5 text-brand" />
          <span>{isEditing ? 'Cancel' : 'Edit Badge'}</span>
        </button>
      </div>

      {/* Profile Edit Form */}
      {isEditing && (
        <form
          onSubmit={saveProfile}
          className="border-2 border-black rounded-3xl p-5 bg-neutral-50 space-y-3"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-black">
            Update Delegate Badge Details
          </h3>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white text-black font-semibold"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
              Role / Job Title
            </label>
            <input
              type="text"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white text-black font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
              Company / Brand Partner
            </label>
            <input
              type="text"
              value={editStore}
              onChange={(e) => setEditStore(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white text-black font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
              Dietary Preference
            </label>
            <input
              type="text"
              value={editDietary}
              onChange={(e) => setEditDietary(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white text-black font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-brand text-white text-xs font-bold py-2 px-5 rounded-full shadow-sm hover:opacity-90 tap-highlight"
            >
              Save to Badge
            </button>
          </div>
        </form>
      )}

      {/* Digital Delegate Pass Card (High-Contrast Minimalist) */}
      <div className="relative border-2 border-black rounded-3xl bg-white p-6 shadow-xl space-y-5 overflow-hidden">
        {/* Pass Top Ribbon */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: config.colors.primaryAccent }}>
                <path d="M12 2l2.4 6.8H21l-5.6 4.3 2.1 6.9-5.5-4.2-5.5 4.2 2.1-6.9L3 8.8h6.6z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-black">
                {config.eventName}
              </div>
              <div className="text-[10px] text-neutral-500 font-semibold tracking-widest uppercase">
                {config.venue.toUpperCase()} · {config.date.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            <span>PARTNER</span>
          </div>
        </div>

        {/* QR Code Centerpiece */}
        <div className="flex flex-col items-center justify-center py-2 space-y-3">
          <div className="p-3 bg-white border-2 border-black rounded-2xl shadow-sm relative group">
            {/* High-Contrast SVG QR Pattern */}
            <svg
              className="w-48 h-48"
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Corner position markers */}
              <rect x="10" y="10" width="50" height="50" fill="none" stroke="#000000" strokeWidth="8" rx="6" />
              <rect x="25" y="25" width="20" height="20" fill="#000000" />

              <rect x="140" y="10" width="50" height="50" fill="none" stroke="#000000" strokeWidth="8" rx="6" />
              <rect x="155" y="25" width="20" height="20" fill="#000000" />

              <rect x="10" y="140" width="50" height="50" fill="none" stroke="#000000" strokeWidth="8" rx="6" />
              <rect x="25" y="155" width="20" height="20" fill="#000000" />

              {/* Data matrix dots */}
              <rect x="70" y="15" width="10" height="10" fill="#000000" />
              <rect x="90" y="15" width="10" height="10" fill="#000000" />
              <rect x="115" y="15" width="10" height="10" fill="#000000" />

              <rect x="70" y="35" width="20" height="10" fill="#000000" />
              <rect x="105" y="35" width="10" height="20" fill="#000000" />
              <rect x="120" y="45" width="10" height="10" fill="#000000" />

              <rect x="15" y="70" width="10" height="10" fill="#000000" />
              <rect x="35" y="70" width="20" height="10" fill="#000000" />
              <rect x="70" y="70" width="10" height="10" fill="#000000" />
              <rect x="95" y="70" width="15" height="15" fill="#000000" />
              <rect x="120" y="70" width="10" height="10" fill="#000000" />
              <rect x="145" y="70" width="25" height="10" fill="#000000" />
              <rect x="180" y="70" width="10" height="20" fill="#000000" />

              {/* Center Superdrug Star insignia */}
              <circle cx="100" cy="100" r="24" fill="#000000" />
              <path
                d="M100 86 L103 95 L112 95 L105 101 L108 110 L100 104 L92 110 L95 101 L88 95 L97 95 Z"
                fill="#E5007D"
              />

              <rect x="15" y="90" width="10" height="20" fill="#000000" />
              <rect x="35" y="105" width="10" height="10" fill="#000000" />
              <rect x="55" y="90" width="10" height="10" fill="#000000" />
              <rect x="135" y="95" width="10" height="10" fill="#000000" />
              <rect x="155" y="105" width="20" height="10" fill="#000000" />

              <rect x="70" y="125" width="15" height="10" fill="#000000" />
              <rect x="95" y="135" width="10" height="15" fill="#000000" />
              <rect x="115" y="125" width="10" height="10" fill="#000000" />
              <rect x="140" y="130" width="10" height="10" fill="#000000" />
              <rect x="160" y="125" width="15" height="10" fill="#000000" />
              <rect x="180" y="135" width="10" height="15" fill="#000000" />

              <rect x="70" y="155" width="10" height="15" fill="#000000" />
              <rect x="90" y="165" width="20" height="10" fill="#000000" />
              <rect x="120" y="155" width="10" height="10" fill="#000000" />
              <rect x="140" y="155" width="10" height="20" fill="#000000" />
              <rect x="160" y="165" width="20" height="10" fill="#000000" />

              <rect x="70" y="180" width="25" height="10" fill="#000000" />
              <rect x="110" y="180" width="15" height="10" fill="#000000" />
              <rect x="135" y="180" width="30" height="10" fill="#000000" />
              <rect x="175" y="180" width="15" height="10" fill="#000000" />
            </svg>
          </div>

          <div className="font-mono text-xs font-black text-black tracking-widest tabular-nums">
            {delegate.badgeId}
          </div>

          {onOpenQRCode && (
            <button
              onClick={onOpenQRCode}
              type="button"
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#E5007D] hover:text-[#c4006b] bg-pink-50 hover:bg-pink-100 px-3.5 py-1.5 rounded-full transition-colors active:scale-95 shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Display / Print Conference QR Code (with Star)</span>
            </button>
          )}
        </div>

        {/* Delegate Details Grid */}
        <div className="space-y-3 pt-3 border-t border-neutral-200">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Supplier Delegate
            </div>
            <div className="text-lg font-black text-black tracking-tight">
              {delegate.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Brand &amp; Title
              </div>
              <div className="font-semibold text-black mt-0.5">{delegate.role}</div>
              <div className="text-[#E5007D] font-bold text-[11px]">{delegate.store}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Seating &amp; Dietary
              </div>
              <div className="font-semibold text-black mt-0.5">{delegate.seatZone}</div>
              <div className="text-neutral-500 font-medium text-[11px]">
                {delegate.dietary}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Check In Simulator */}
        <div className="pt-2 space-y-2">
          {/* Pill-shaped CTA button strictly using #E5007D */}
          <button
            onClick={handleSimulateCheckIn}
            className="w-full bg-[#E5007D] text-white text-xs font-bold py-3 px-6 rounded-full shadow-md hover:bg-[#c4006b] active:scale-[0.98] transition-all tap-highlight flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Scan In to Plenary / Meeting Suite</span>
          </button>

          <button
            onClick={() => setShowWalletModal(true)}
            className="w-full border border-neutral-300 text-black text-xs font-bold py-2.5 px-4 rounded-full hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-[#E5007D]" />
            <span>Add to Apple / Google Wallet</span>
          </button>
        </div>

        {lastCheckInToast && (
          <div className="p-3 bg-black text-white rounded-2xl text-xs font-medium text-center animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#E5007D]" />
            <span>{lastCheckInToast}</span>
          </div>
        )}
      </div>

      {/* Verified Check-in History */}
      <div className="border border-neutral-200 rounded-3xl p-5 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Check-in History ({delegate.checkedInSessions.length})
          </h3>
          <span className="text-[11px] text-[#E5007D] font-bold">Live Verified</span>
        </div>

        <div className="divide-y divide-neutral-100">
          {delegate.checkedInSessions.map((session, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#E5007D] shrink-0" />
                <span className="font-semibold text-black">{session}</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Recorded</span>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Wallet Preview Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#E5007D]" />
                <h3 className="text-sm font-bold text-black">Digital Wallet Card</h3>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-neutral-400 hover:text-black text-xs font-bold p-1"
              >
                Close
              </button>
            </div>

            <div className="bg-black text-white p-5 rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#E5007D] uppercase tracking-wider">
                  SUPERDRUG
                </span>
                <span className="text-[10px] text-neutral-400">{delegate.badgeId}</span>
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-300">Supplier Delegate</div>
                <div className="text-base font-extrabold">{delegate.name}</div>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span className="text-white font-semibold">{delegate.store}</span>
                <span className="text-[#E5007D] font-bold">LONDON · 15 OCT 26</span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              This card is ready to link with Apple Wallet or Google Wallet. On mobile devices, tap below to register NFC rapid tap.
            </p>

            {/* Pill CTA button */}
            <button
              onClick={() => {
                setShowWalletModal(false);
                setLastCheckInToast('Supplier pass saved to mobile wallet device cache!');
                setTimeout(() => setLastCheckInToast(null), 3000);
              }}
              className="w-full bg-[#E5007D] text-white text-xs font-bold py-3 rounded-full shadow-sm hover:bg-[#c4006b] tap-highlight"
            >
              Add to Wallet Simulator
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
