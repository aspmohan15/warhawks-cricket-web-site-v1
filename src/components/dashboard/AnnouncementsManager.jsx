import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpDown,
  Calendar,
  AlertCircle
} from 'lucide-react';

const QUICK_EXAMPLES = [
  'Tournament 2 scheduled on 17-12-2026',
  'Auction on 10-12-2026',
  'Squad registration closing in 48 hours'
];

export const AnnouncementsManager = ({
  announcements = [],
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onSwapAnnouncements,
  tournamentId
}) => {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Deduplicate announcements by ID
  const uniqueMap = new Map();
  for (const a of (announcements || [])) {
    if (a && a.id) uniqueMap.set(a.id, a);
  }
  const sortedAnnouncements = Array.from(uniqueMap.values()).sort(
    (a, b) => (Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)) || (new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
  );

  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    const text = newText.trim();
    if (!text) return;

    // Guard against duplicate announcement text
    const exists = sortedAnnouncements.some(
      a => a.message?.trim().toLowerCase() === text.toLowerCase()
    );
    if (exists) {
      setFeedbackMsg('This announcement is already present in the list.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      setNewText('');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateAnnouncement({
        message: text,
        tournamentId: tournamentId || null,
        isActive: true
      });
      setNewText('');
      setFeedbackMsg('Announcement added and live on ribbon!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      alert('Error creating announcement: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.message);
  };

  const handleSaveEdit = async (id) => {
    const text = editText.trim();
    if (!text) return;

    try {
      await onUpdateAnnouncement(id, { message: text });
      setEditingId(null);
      setEditText('');
      setFeedbackMsg('Announcement updated successfully.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      alert('Error saving announcement: ' + err.message);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await onUpdateAnnouncement(item.id, { isActive: !item.isActive });
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await onDeleteAnnouncement(id);
        setFeedbackMsg('Announcement removed.');
        setTimeout(() => setFeedbackMsg(''), 3000);
      } catch (err) {
        alert('Error deleting announcement: ' + err.message);
      }
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const current = sortedAnnouncements[index];
    const previous = sortedAnnouncements[index - 1];
    try {
      await onSwapAnnouncements(current.id, previous.id);
    } catch (err) {
      alert('Error reordering: ' + err.message);
    }
  };

  const handleMoveDown = async (index) => {
    if (index >= sortedAnnouncements.length - 1) return;
    const current = sortedAnnouncements[index];
    const next = sortedAnnouncements[index + 1];
    try {
      await onSwapAnnouncements(current.id, next.id);
    } catch (err) {
      alert('Error reordering: ' + err.message);
    }
  };

  const activeCount = sortedAnnouncements.filter(a => a.isActive !== false).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Tournament Announcements</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {activeCount} live on ribbon
                </span>
              </div>
              <p className="text-xs text-slate-500">
                To-do list manager for the continuously scrolling player marquee.
              </p>
            </div>
          </div>

          {feedbackMsg && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-fade-in self-start sm:self-auto">
              ✓ {feedbackMsg}
            </span>
          )}
        </div>
      </div>

      {/* Free-Text Input Area (To-Do style) */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
        <form onSubmit={handleAdd} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type an announcement (e.g., Tournament 2 scheduled on 17-12-2026 or Auction on 10-12-2026)..."
                className="w-full pl-3.5 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition-all"
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={!newText.trim() || isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add Announcement</span>
            </button>
          </div>

          {/* Quick suggestions pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick templates:
            </span>
            {QUICK_EXAMPLES.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNewText(example)}
                className="text-[11px] bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-left truncate max-w-full"
              >
                + {example}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Announcements List with Reorder, Edit, Delete */}
      <div className="p-4 sm:p-5">
        {sortedAnnouncements.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <Megaphone className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No announcements created yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Type a message above or pick a quick template. Once added, it will scroll continuously on the player ribbon below the top header.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1">
              <span>Display Order & Message</span>
              <span>Reorder / Controls</span>
            </div>

            {sortedAnnouncements.map((item, index) => {
              const isEditing = editingId === item.id;
              const isFirst = index === 0;
              const isLast = index === sortedAnnouncements.length - 1;

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-2.5 ${
                    item.isActive === false
                      ? 'bg-slate-50/80 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Left: Position & Content */}
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                    {/* Order Badge */}
                    <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {index + 1}
                    </span>

                    {/* Content or Edit Form */}
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs sm:text-sm border border-emerald-500 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer"
                          title="Save change"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 break-words leading-relaxed">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              item.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.isActive !== false ? 'Live on Ticker' : 'Hidden'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Order index: {item.displayOrder ?? index}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions (Reorder Swap + Edit + Toggle + Delete) */}
                  <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Up button */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={isFirst}
                      className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                      title={isFirst ? 'Already at top' : 'Move up (swap order)'}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Down button */}
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={isLast}
                      className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                      title={isLast ? 'Already at bottom' : 'Move down (swap order)'}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-0.5" />

                    {/* Toggle Active Status */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                        item.isActive !== false
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}
                      title={item.isActive !== false ? 'Hide from public ribbon' : 'Show on public ribbon'}
                      aria-label="Toggle active status"
                    >
                      {item.isActive !== false ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Inline Edit */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title="Edit text"
                      aria-label="Edit announcement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-md border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Delete announcement"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Tip */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Announcements are saved directly in Supabase and displayed immediately to all players.</span>
        </span>
        <span className="font-mono text-slate-400 hidden sm:inline">Order priority: Top to Bottom</span>
      </div>
    </div>
  );
};
