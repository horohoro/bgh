import React, { useState } from 'react';
import { CardSet } from '../../types/index';
import { Sparkles, Globe, AlertCircle } from 'lucide-react';

interface CardFormModalProps {
  set: CardSet;
  onClose: () => void;
  onCardCreated: () => void;
}

export const CardFormModal: React.FC<CardFormModalProps> = ({ set, onClose, onCardCreated }) => {
  // Initialize form state dynamically from set fields
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const f of set.fields) {
      if (f.key === 'edition' || f.key === 'source') {
        initial[f.key] = 'Custom';
      } else if (f.type === 'multilingual' || f.type === 'wikipedia') {
        initial[f.key] = { en: '', fr: '', ja: '' };
      } else if (f.type === 'select' && f.options && f.options.length > 0) {
        initial[f.key] = f.options[0];
      } else {
        initial[f.key] = '';
      }
    }
    return initial;
  });

  // Wikipedia auto-fill state
  const hasWikiField = set.fields.some(f => f.type === 'wikipedia');
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiLang, setWikiLang] = useState<'en' | 'fr' | 'ja'>('en');
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleWikiAutoFill = async () => {
    if (!wikiQuery.trim()) return;
    setWikiLoading(true);
    setWikiError(null);
    try {
      const res = await fetch(`/api/wiki/enrich?query=${encodeURIComponent(wikiQuery.trim())}&lang=${wikiLang}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'No Wikipedia article found');
      }
      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        wikipedia: data.wikipedia || prev.wikipedia,
        imageUrl: data.imageUrl || prev.imageUrl
      }));
    } catch (err: any) {
      setWikiError(err.message || 'Auto-fill failed');
    } finally {
      setWikiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const dataToSend = { ...formData };
      if (dataToSend.edition) dataToSend.source = dataToSend.edition;
      if (dataToSend.source && !dataToSend.edition) dataToSend.edition = dataToSend.source;

      const res = await fetch(`/api/sets/${set.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSend })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to create card');
      }

      onCardCreated();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl my-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Add Card to {set.name}</h2>
            <p className="text-xs text-slate-400">Fill in the card details below</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Wikipedia Auto-fill Bar if set supports it */}
        {hasWikiField && (
          <div className="mb-5 p-3.5 bg-slate-800/80 border border-emerald-500/30 rounded-xl space-y-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={14} />
              Wikipedia Auto-Enrich
            </span>
            <p className="text-[11px] text-slate-400">
              Type a famous name in EN, FR, or JA to auto-fill names, links, and image thumbnail:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={wikiQuery}
                onChange={e => setWikiQuery(e.target.value)}
                placeholder="e.g. Marie Curie or ジークムント・フロイト"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleWikiAutoFill();
                  }
                }}
              />
              <select
                value={wikiLang}
                onChange={e => setWikiLang(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value="en">🇬🇧 EN</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="ja">🇯🇵 JA</option>
              </select>
              <button
                type="button"
                onClick={handleWikiAutoFill}
                disabled={wikiLoading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                {wikiLoading ? 'Searching...' : 'Auto-fill'}
              </button>
            </div>
            {wikiError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {wikiError}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Fields Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {set.fields.map(field => {
            // Multilingual (title / names)
            if (field.type === 'multilingual') {
              const multiVal = formData[field.key] || {};
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">{field.label}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">🇬🇧</span>
                      <input
                        type="text"
                        placeholder="English"
                        value={multiVal.en || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.key]: { ...(prev[field.key] || {}), en: e.target.value }
                          }))
                        }
                        className="bg-transparent text-xs text-white w-full focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">🇫🇷</span>
                      <input
                        type="text"
                        placeholder="French"
                        value={multiVal.fr || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.key]: { ...(prev[field.key] || {}), fr: e.target.value }
                          }))
                        }
                        className="bg-transparent text-xs text-white w-full focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">🇯🇵</span>
                      <input
                        type="text"
                        placeholder="Japanese"
                        value={multiVal.ja || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.key]: { ...(prev[field.key] || {}), ja: e.target.value }
                          }))
                        }
                        className="bg-transparent text-xs text-white w-full focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            // Wikipedia Links
            if (field.type === 'wikipedia') {
              const wikiVal = formData[field.key] || {};
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">{field.label}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="🇬🇧 EN URL"
                      value={wikiVal.en || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          [field.key]: { ...(prev[field.key] || {}), en: e.target.value }
                        }))
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="🇫🇷 FR URL"
                      value={wikiVal.fr || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          [field.key]: { ...(prev[field.key] || {}), fr: e.target.value }
                        }))
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="🇯🇵 JA URL"
                      value={wikiVal.ja || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          [field.key]: { ...(prev[field.key] || {}), ja: e.target.value }
                        }))
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              );
            }

            // Image URL
            if (field.type === 'image') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{field.label}</label>
                  <input
                    type="url"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {formData[field.key] && (
                    <div className="mt-2 w-20 h-20 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                      <img src={formData[field.key]} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              );
            }

            // Edition Selector with Expansion support
            if (field.key === 'edition' || field.key === 'source') {
              const currentVal = formData[field.key] || 'Custom';
              const isExpansion = currentVal.startsWith('Expansion');
              const expansionName = isExpansion ? currentVal.replace(/^Expansion\s*\(?/, '').replace(/\)$/, '') : '';

              return (
                <div key={field.key} className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">{field.label}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Custom', 'Base', 'Expansion'].map(mode => {
                      const isSelected = mode === 'Expansion' ? isExpansion : currentVal === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            if (mode === 'Expansion') {
                              setFormData(prev => ({ ...prev, [field.key]: 'Expansion (New)' }));
                            } else {
                              setFormData(prev => ({ ...prev, [field.key]: mode }));
                            }
                          }}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                  {isExpansion && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Expansion Name (e.g. La Catrina)"
                        value={expansionName}
                        onChange={e => {
                          const name = e.target.value.trim();
                          setFormData(prev => ({
                            ...prev,
                            [field.key]: name ? `Expansion (${name})` : 'Expansion'
                          }));
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  )}
                </div>
              );
            }

            // General Select
            if (field.type === 'select') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{field.label}</label>
                  <select
                    value={formData[field.key] || field.options?.[0] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            // Text / Textarea
            return (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{field.label}</label>
                <textarea
                  rows={2}
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            );
          })}

          {saveError && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition"
            >
              {saving ? 'Saving...' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
