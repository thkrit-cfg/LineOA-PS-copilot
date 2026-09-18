import React from 'react';
import { Tag } from 'lucide-react';
import { UpsellRecommendation } from '../types';

const fmtBaht = (n: number) => `฿${n.toLocaleString()}`;

interface RecCardProps {
  rec: UpsellRecommendation;
  onInsert: (rec: UpsellRecommendation) => void;
}

// Compact tappable product-rec card shown in the thread header (Sprint 1).
// Tapping it inserts a ready-to-send product message into the composer.
export const RecCard: React.FC<RecCardProps> = ({ rec, onInsert }) => (
  <button
    onClick={() => onInsert(rec)}
    className="w-44 shrink-0 text-left rounded-xl bg-[#0b0f17] border border-slate-800 hover:border-emerald-500/50 p-2.5 transition-colors"
    title="Tap to insert into composer"
  >
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-white truncate flex-1">{rec.product.nameEn}</span>
      <span className="shrink-0 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1 py-0.5">
        {rec.confidenceScore}%
      </span>
    </div>
    <div className="text-[9px] font-semibold text-slate-500 mt-0.5">{fmtBaht(rec.product.price)}</div>
    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">{rec.reason}</p>
    <div className="mt-1.5 flex items-center gap-1 text-[9px] text-amber-300/90">
      <Tag className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{rec.suggestedPromo}</span>
    </div>
  </button>
);
