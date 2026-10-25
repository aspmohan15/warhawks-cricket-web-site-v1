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
  Video,
  ChevronDown,
  Gavel,
  Layers,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { WARHAWKS_LOGO_URL } from '../../constants';

// Canonical order for Tournament General chapters as sanctioned in Warhawks Tournament Rules - S4
const TOURNAMENT_GENERAL_ORDER = [
  'general rules',
  'match format & timings',
  'batting rules',
  'bowling rules',
  'bowling guard rules',
  'fielding rules',
  'powerplay & super over',
  'extras rules',
  'no-ball conditions',
  'other rules'
];

const getCleanTitle = (title) => {
  if (!title) return '';
  return title.replace(/^chapter\s*\d+[:\-.]?\s*/i, '').trim();
};

const getChapterNumber = (title, fallbackIndex) => {
  const match = title?.match(/^chapter\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return fallbackIndex;
};

const getFormattedTitleWithChapter = (title, chapterNumber) => {
  const clean = getCleanTitle(title);
  return `Chapter ${chapterNumber}: ${clean || title}`;
};

const sortTournamentGeneralRules = (items) => {
  return [...items].sort((a, b) => {
    const chapA = a.title?.match(/^chapter\s*(\d+)/i);
    const chapB = b.title?.match(/^chapter\s*(\d+)/i);
    if (chapA && chapB) {
      return parseInt(chapA[1], 10) - parseInt(chapB[1], 10);
    }
    const cleanA = getCleanTitle(a.title).toLowerCase();
    const cleanB = getCleanTitle(b.title).toLowerCase();
    const idxA = TOURNAMENT_GENERAL_ORDER.indexOf(cleanA);
    const idxB = TOURNAMENT_GENERAL_ORDER.indexOf(cleanB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.id || '').localeCompare(b.id || '');
  });
};

export const RulesVideosView = ({
  tournament,
  rules = [],
  currentUser,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}) => {
  const isOrganizer = currentUser?.role === 'organizer';
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [videoPlayUrl, setVideoPlayUrl] = useState(null);

  // Expandable category banners (starts collapsed so user clicks banner to view rules)
  const [expandedCategories, setExpandedCategories] = useState({
    'Tournament general': false,
    'Auction rules': false
  });

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const allExpanded = Boolean(expandedCategories['Tournament general'] && expandedCategories['Auction rules']);
  const toggleAll = () => {
    const nextState = !allExpanded;
    setExpandedCategories({
      'Tournament general': nextState,
      'Auction rules': nextState
    });
  };

  const [form, setForm] = useState({
    title: '',
    category: 'Tournament general',
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

  // Category Banners Configuration
  const categorySections = [
    {
      id: 'Tournament general',
      name: 'Tournament General',
      description: 'Official playing conditions, match formats, bowling guards, and on-field regulations',
      icon: BookOpenCheck,
      iconBg: 'bg-emerald-100 text-emerald-800',
      iconColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      bannerBorder: 'hover:border-emerald-300',
      activeHeaderBg: 'bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 border-b border-emerald-100',
      emptyText: 'No general tournament rules added yet for this tournament edition.',
      getRules: (list) => {
        const filtered = list.filter(r => {
          const cat = (r.category || '').toLowerCase();
          return cat.includes('general') || (!cat.includes('auction') && cat !== '');
        });
        return sortTournamentGeneralRules(filtered);
      }
    },
    {
      id: 'Auction rules',
      name: 'Auction Rules',
      description: 'Player bidding guidelines, squad purse baselines, retention rules, and tie-breakers',
      icon: Gavel,
      iconBg: 'bg-blue-100 text-blue-800',
      iconColor: 'text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800 border border-blue-200',
      bannerBorder: 'hover:border-blue-300',
      activeHeaderBg: 'bg-gradient-to-r from-blue-50/70 to-blue-50/20 border-b border-blue-100',
      emptyText: 'No auction rules published yet for this tournament edition. Organizers can add auction regulations using the "+ Add Rule Article" button.',
      getRules: (list) => {
        const filtered = list.filter(r => (r.category || '').toLowerCase().includes('auction'));
        return [...filtered].sort((a, b) => {
          const chapA = a.title?.match(/^chapter\s*(\d+)/i);
          const chapB = b.title?.match(/^chapter\s*(\d+)/i);
          if (chapA && chapB) return parseInt(chapA[1], 10) - parseInt(chapB[1], 10);
          return (a.id || '').localeCompare(b.id || '');
        });
      }
    }
  ];

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

        <div className="flex items-center gap-2">
          {isOrganizer ? (
            <button
              onClick={() => {
                setForm({
                  title: '',
                  category: 'Tournament general',
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
      </div>

      {/* Subheader banner info with Quick Toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-500">
          Click any category banner below to view chapters and full regulatory clauses.
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
        >
          {allExpanded ? 'Collapse All Banners' : 'Expand All Banners'}
        </button>
      </div>

      {/* Category Banners with Click-to-Expand */}
      <div className="space-y-4">
        {categorySections.map(cat => {
          const isExpanded = Boolean(expandedCategories[cat.id]);
          const catRules = cat.getRules(rules);
          const count = catRules.length;

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 ${cat.bannerBorder}`}
            >
              {/* Clickable Banner Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                  isExpanded ? cat.activeHeaderBg : 'hover:bg-slate-50/80 bg-white'
                }`}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${cat.iconBg}`}>
                    <cat.icon className={`w-5 h-5 ${cat.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {cat.name}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${cat.badgeBg}`}>
                        {count} {count === 1 ? 'Chapter' : 'Chapters'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate sm:whitespace-normal">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
                    {isExpanded ? 'Click to collapse' : 'Click to view rules'}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180 bg-slate-100 text-slate-900' : 'bg-white text-slate-500'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Expandable Content Area */}
              {isExpanded && (
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/40">
                  {count === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center max-w-md mx-auto my-2">
                      <div className={`w-10 h-10 rounded-xl ${cat.iconBg} mx-auto flex items-center justify-center mb-3`}>
                        <cat.icon className={`w-5 h-5 ${cat.iconColor}`} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">No {cat.name} Added Yet</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        {cat.emptyText}
                      </p>
                      {isOrganizer && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              title: '',
                              category: cat.id,
                              content: '',
                              videoUrl: '',
                              isPublished: true
                            });
                            setCreateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add {cat.name} Article</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {catRules.map((rule, idx) => {
                        const chapterNum = getChapterNumber(rule.title, idx + 1);
                        const formattedTitle = getFormattedTitleWithChapter(rule.title, chapterNum);

                        return (
                          <div
                            key={rule.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 pr-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-mono">
                                      Chapter {chapterNum}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      · {rule.category}
                                    </span>
                                  </div>
                                  <h3 className="font-bold text-base text-slate-900 mt-2">
                                    {formattedTitle}
                                  </h3>
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
                                        if (confirm(`Delete rule "${formattedTitle}"?`)) {
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

                              <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line font-normal">
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
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
              placeholder="e.g. Chapter 11: Super Over & Tie-Breaker Protocol"
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
              <option value="Tournament general">Tournament general</option>
              <option value="Auction rules">Auction rules</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clause Content</label>
            <textarea
              rows={4}
              required
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono text-[11px]"
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
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={editingRule.category || 'Tournament general'}
                onChange={e => setEditingRule({ ...editingRule, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="Tournament general">Tournament general</option>
                <option value="Auction rules">Auction rules</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Content</label>
              <textarea
                rows={5}
                required
                value={editingRule.content}
                onChange={e => setEditingRule({ ...editingRule, content: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Demo Video URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={editingRule.videoUrl || ''}
                onChange={e => setEditingRule({ ...editingRule, videoUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
