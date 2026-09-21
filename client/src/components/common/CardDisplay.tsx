import React, { useState } from 'react';
import { Card, CardSet } from '../../types/index';
import { ExternalLink, Maximize2, X } from 'lucide-react';

interface CardDisplayProps {
  card: Card;
  set?: CardSet | null;
  compact?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({ card, set, compact = false }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const data = card.data || {};

  // Extract fields based on set definition
  const fields = set?.fields || [];
  // Decked metadata: used to partition cards into decks AND displayed on the card
  const deckedFields = fields.filter(f => f.isDecked || f.isFilter);
  // Display-only fields: displayed on card face, but not used for deck grouping
  const displayOnlyFields = fields.filter(f => !f.isDecked && !f.isFilter);

  const getBadgeStyle = (key: string, val: string) => {
    const lowerKey = key.toLowerCase();
    const lowerVal = val.toLowerCase();

    // Edition styling
    if (lowerKey === 'edition' || lowerKey === 'source') {
      if (lowerVal === 'base') return 'bg-sky-950/60 text-sky-300 border-sky-700/60';
      if (lowerVal === 'custom') return 'bg-purple-950/60 text-purple-300 border-purple-700/60';
      return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
    }

    // Difficulty styling
    if (lowerKey === 'difficulty') {
      if (lowerVal === 'easy') return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
      if (lowerVal === 'hard') return 'bg-rose-900/60 text-rose-300 border-rose-700/50';
      return 'bg-amber-900/60 text-amber-300 border-amber-700/50';
    }

    // Level / Stars styling
    if (lowerKey === 'level' || lowerVal.includes('star')) {
      return 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50';
    }

    // Category styling
    if (lowerKey === 'category') {
      return 'bg-slate-700/80 text-slate-200 border-slate-600';
    }

    // Generic decked metadata styling
    return 'bg-teal-950/60 text-teal-300 border-teal-700/50';
  };

  const formatBadgeLabel = (f: { key: string; label: string }, val: string) => {
    const lowerKey = f.key.toLowerCase();
    if (lowerKey === 'edition' || lowerKey === 'source') {
      return val;
    }
    if (lowerKey === 'difficulty') {
      return val.toUpperCase();
    }
    if (lowerKey === 'level') {
      return val.startsWith('★') ? val : `★ ${val}`;
    }
    if (lowerKey === 'category') {
      return val;
    }
    return `${f.label}: ${val}`;
  };

  // Fallback title resolution
  const titleData = data.title || data.name || data.text;
  let titleStr = '';
  if (typeof titleData === 'string') {
    titleStr = titleData;
  } else if (titleData && typeof titleData === 'object') {
    titleStr = titleData.en || Object.values(titleData)[0] || 'Untitled';
  }

  const imageUrl = data.imageUrl || data.image;

  // Filter valid Wikipedia links (ignore internal MongoDB _id artifacts)
  const validWikiLinks = data.wikipedia && typeof data.wikipedia === 'object'
    ? Object.entries(data.wikipedia).filter(([lang, url]) => lang !== '_id' && typeof url === 'string' && url.startsWith('http'))
    : [];

  return (
    <>
      <div className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg transition-all ${compact ? 'p-3' : 'p-4'}`}>
        {/* Card Portrait Image - Spacious container with object-contain so full faces and figures fit without aggressive cropping */}
        {imageUrl && (
          <div
            onClick={() => setShowFullImage(true)}
            className={`relative w-full ${
              compact ? 'h-48 sm:h-56' : 'h-64 sm:h-72'
            } mb-3 bg-slate-950/90 rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-slate-700/60 cursor-pointer group`}
            title="Click to view full image"
          >
            <img
              src={imageUrl}
              alt={titleStr}
              className="w-full h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute bottom-2 right-2 bg-slate-900/80 p-1 rounded-md text-slate-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition shadow">
              <Maximize2 size={13} />
            </div>
          </div>
        )}

        {/* Main Title or Primary Text */}
        {titleStr && (
          <div className="text-lg font-bold text-white mb-2 leading-snug">
            {titleStr}
          </div>
        )}

        {/* Multilingual Names or Rules if present (ignoring _id) */}
        {(() => {
          const multi = (data.title && typeof data.title === 'object') ? data.title : (data.text && typeof data.text === 'object') ? data.text : null;
          if (!multi) return null;
          return (
            <div className="flex flex-wrap gap-2 mb-3">
              {multi.en && typeof multi.en === 'string' && (
                <span className="text-xs bg-slate-700/80 px-2 py-1 rounded-md text-slate-200 font-medium">
                  🇬🇧 {multi.en}
                </span>
              )}
              {multi.fr && typeof multi.fr === 'string' && (
                <span className="text-xs bg-slate-700/80 px-2 py-1 rounded-md text-slate-200 font-medium">
                  🇫🇷 {multi.fr}
                </span>
              )}
              {multi.ja && typeof multi.ja === 'string' && (
                <span className="text-xs bg-slate-700/80 px-2 py-1 rounded-md text-slate-200 font-medium">
                  🇯🇵 {multi.ja}
                </span>
              )}
            </div>
          );
        })()}

        {/* Wikipedia Links if present */}
        {validWikiLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 pt-1 border-t border-slate-700/50">
            <span className="text-xs text-slate-400 font-medium">Wikipedia:</span>
            {validWikiLinks.map(([lang, url]) => (
              <a
                key={lang}
                href={String(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded transition"
              >
                <span>{lang.toUpperCase()}</span>
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        )}

        {/* Display-only text/custom fields from set definition */}
        {displayOnlyFields.map(f => {
          if (
            f.key === 'title' ||
            f.key === 'text' ||
            f.key === 'name' ||
            f.key === 'imageUrl' ||
            f.key === 'wikipedia' ||
            f.type === 'multilingual' ||
            f.type === 'image' ||
            f.type === 'wikipedia'
          ) {
            return null;
          }
          const val = data[f.key];
          if (val === undefined || val === null || val === '') return null;
          if (typeof val === 'object') return null;
          if (f.type === 'text' && f.key === 'text' && val === titleStr) return null;

          return (
            <div key={f.key} className="flex items-center justify-between bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-xs text-slate-300 mb-1.5">
              <span className="text-slate-400 font-medium">{f.label}:</span>
              <span className="font-semibold text-slate-100">{String(val)}</span>
            </div>
          );
        })}

        {/* Decked Metadata Badges (Group-by fields: Difficulty, Edition, Level, Category, etc.) */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {deckedFields.length > 0 ? (
            deckedFields.map(f => {
              const rawVal = data[f.key] ?? (f.key === 'edition' ? data.source : undefined);
              if (rawVal === undefined || rawVal === null || rawVal === '') return null;
              const valStr = String(rawVal);
              const badgeClass = getBadgeStyle(f.key, valStr);
              const formattedLabel = formatBadgeLabel(f, valStr);

              return (
                <span
                  key={f.key}
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border shadow-sm ${badgeClass}`}
                  title={`${f.label}: ${valStr}`}
                >
                  {formattedLabel}
                </span>
              );
            })
          ) : (
            // Fallback if set definition is not yet available
            <>
              {data.difficulty && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                  {String(data.difficulty)}
                </span>
              )}
              {data.level && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  ★ {String(data.level)}
                </span>
              )}
              {data.category && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-200 border border-slate-600">
                  {String(data.category)}
                </span>
              )}
              {(data.edition || data.source) && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-sky-950/60 text-sky-300 border-sky-700/60">
                  {String(data.edition || data.source)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enlarged Image Lightbox Modal */}
      {showFullImage && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-lg w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -top-10 right-0 p-1 text-slate-400 hover:text-white transition"
              title="Close image"
            >
              <X size={24} />
            </button>
            <img
              src={imageUrl}
              alt={titleStr}
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-slate-700"
            />
            {titleStr && (
              <span className="text-white font-bold text-sm mt-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                {titleStr}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
};
