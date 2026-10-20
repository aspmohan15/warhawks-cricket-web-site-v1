import React, { useState } from 'react';
import {
  BookOpenCheck,
  Plus,
  Play,
  Edit,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Video
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const RulesVideosView = ({
  tournament,
  rules,
  currentUser,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [videoPlayUrl, setVideoPlayUrl] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: 'Match Playing Conditions',
    content: '',
    videoUrl: '',
    isPublished: true
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!tournament?.id) {
      setCreateModalOpen(false);
      return;
    }
    onCreateRule({
      tournamentId: tournament?.id || '',
      title: form.title,
      category: form.category,
      content: form.content,
      videoUrl: form.videoUrl || undefined,
      isPublished: form.isPublished
    });
    setCreateModalOpen(false);
  };

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          📜
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Official tournament rules and demo videos are organized by edition. Select or create an edition to view sanctioned policies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tournament Rules & Official Demo Videos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official playing conditions, disciplinary code, auction policies, and video guides sanctioned by Warhawks for {tournament?.name || 'Tournament'}.
          </p>
        </div>

        {isOrganizer ? (
          <button
            onClick={() => {
              setForm({
                title: '',
                category: 'Match Playing Conditions',
                content: '',
                videoUrl: '',
                isPublished: true
              });
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Rule Article
          </button>
        ) : (
          <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 inline-flex items-center gap-1.5">
            <img src={WARHAWKS_LOGO_URL} alt="Warhawks" className="w-3.5 h-3.5 object-contain rounded-xs bg-white p-0.2 shrink-0" />
            <span>Official Rules Sanctioned by Warhawks</span>
          </span>
        )}
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                    {rule.category}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-2">{rule.title}</h3>
                </div>

                {isOrganizer && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit rule"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete rule "${rule.title}"?`)) {
                          onDeleteRule(rule.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {rule.content}
              </p>

              {rule.videoUrl && (
                <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 truncate">
                    <Video className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Attached Tutorial / Walkthrough Video</span>
                  </div>
                  <button
                    onClick={() => setVideoPlayUrl(rule.videoUrl || null)}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-emerald-700" /> Watch
                  </button>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                Updated: {new Date(rule.updatedAt).toLocaleDateString()}
              </span>

              <button
                onClick={() => onUpdateRule(rule.id, { isPublished: !rule.isPublished })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  rule.isPublished
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {rule.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{rule.isPublished ? 'Published to Teams' : 'Draft Only'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {videoPlayUrl && (
        <Modal
          isOpen={true}
          onClose={() => setVideoPlayUrl(null)}
          title="Video Playback"
          maxWidth="2xl"
        >
          <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
            <video controls className="w-full h-full object-cover" src={videoPlayUrl}>
              Browser does not support HTML5 video.
            </video>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Tournament Regulation / Policy"
        subtitle={`Rules will be enforced by Warhawks Tournament Operations across ${tournament?.name || 'Tournament Edition'}`}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rule Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Super Over & Tie-Breaker Protocol"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
            >
              <option value="Match Playing Conditions">Match Playing Conditions</option>
              <option value="Tournament General">Tournament General</option>
              <option value="Auction Rules">Auction Rules</option>
              <option value="Player Eligibility">Player Eligibility</option>
              <option value="Code of Conduct">Code of Conduct</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clause Content</label>
            <textarea
              rows={4}
              required
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Demo Video URL (MP4 / WebM / Cloudinary)</label>
            <input
              type="url"
              placeholder="https://..."
              value={form.videoUrl}
              onChange={e => setForm({ ...form, videoUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={form.isPublished}
              onChange={e => setForm({ ...form, isPublished: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="isPublished" className="font-semibold text-slate-700 cursor-pointer">
              Publish immediately to team captains and public portal
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Save Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {editingRule && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRule(null)}
          title={`Edit ${editingRule.title}`}
          subtitle="Update regulatory content"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              onUpdateRule(editingRule.id, editingRule);
              setEditingRule(null);
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={editingRule.title}
                onChange={e => setEditingRule({ ...editingRule, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Content</label>
              <textarea
                rows={4}
                required
                value={editingRule.content}
                onChange={e => setEditingRule({ ...editingRule, content: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
