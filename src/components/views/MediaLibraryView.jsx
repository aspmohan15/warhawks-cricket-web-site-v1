import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Tag,
  FileText,
  Video,
  CheckCircle,
  CloudUpload
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const MediaLibraryView = ({
  tournament,
  mediaAssets,
  onAddMediaAsset,
  onDeleteMediaAsset
}) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Player Photos',
    fileUrl: '',
    fileType: 'image/jpeg',
    fileSizeKb: 450,
    tagsString: 'player, official'
  });

  const categories = [
    'all',
    'Player Photos',
    'Team Crests',
    'Sponsor Logos',
    'Tournament Banners',
    'Auction Demo Videos',
    'Receipt Documents'
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm({
          ...uploadForm,
          title: uploadForm.title || file.name.replace(/\.[^/.]+$/, ''),
          fileUrl: reader.result,
          fileType: file.type || 'image/jpeg',
          fileSizeKb: Math.round(file.size / 1024)
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadForm.fileUrl) {
      return;
    }
    const tags = uploadForm.tagsString.split(',').map(t => t.trim()).filter(Boolean);
    onAddMediaAsset({
      tournamentId: tournament?.id || '',
      title: uploadForm.title,
      category: uploadForm.category,
      fileUrl: uploadForm.fileUrl,
      fileType: uploadForm.fileType,
      fileSizeKb: uploadForm.fileSizeKb,
      tags
    });
    setUploadModalOpen(false);
  };

  const filteredAssets = mediaAssets.filter(asset => {
    if (activeCategory !== 'all' && asset.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.title.toLowerCase().includes(q) ||
        asset.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (!tournament) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-xs">
          🖼️
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">No Active Tournament Edition</h2>
        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Media assets and branding files are organized by tournament edition. Select or initialize a tournament edition to upload logos and assets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-semibold mb-1">
            <span className="text-emerald-400">🦅 Warhawks Media Assets</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-200">Broadcast & Marketing Repository</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Media Library & Cloudinary Assets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud-backed digital asset repository for team logos, tournament banners, receipts, and broadcast clips for {tournament?.name} (Organized by Warhawks).
          </p>
        </div>

        <button
          onClick={() => {
            setUploadForm({
              title: '',
              category: 'Player Photos',
              fileUrl: '',
              fileType: 'image/jpeg',
              fileSizeKb: 350,
              tagsString: 'player, squad'
            });
            setUploadModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
        >
          <CloudUpload className="w-4 h-4" />
          <span>Upload Asset</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? `All Files (${mediaAssets.length})` : cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assets by title or tag..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No media files match this category or search query.
          </div>
        ) : (
          filteredAssets.map(asset => {
            const isVideo = asset.fileType?.includes('video') || asset.fileUrl?.endsWith('.mp4');

            return (
              <div
                key={asset.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => setPreviewAsset(asset)}
                  className="aspect-video bg-slate-100 relative cursor-pointer overflow-hidden flex items-center justify-center border-b border-slate-100"
                >
                  {isVideo ? (
                    <div className="flex flex-col items-center text-slate-400">
                      <Video className="w-8 h-8 text-emerald-600" />
                      <span className="text-[10px] font-semibold mt-1">Video Clip</span>
                    </div>
                  ) : (
                    <img
                      src={asset.fileUrl}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  )}
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
                    {asset.fileSizeKb} KB
                  </span>
                </div>

                {/* Content */}
                <div className="p-3">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                    {asset.category}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 mt-1 truncate" title={asset.title}>
                    {asset.title}
                  </h4>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags?.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setPreviewAsset(asset)}
                    className="text-emerald-700 hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    View Asset
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${asset.title}" from library?`)) {
                        onDeleteMediaAsset(asset.id);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Media Asset to Cloudinary"
        subtitle="Assets will be processed with responsive transformations"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Asset Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Titans Official Jersey 2026"
              value={uploadForm.title}
              onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={uploadForm.category}
              onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Player Photos">Player Photos</option>
              <option value="Team Crests">Team Crests</option>
              <option value="Sponsor Logos">Sponsor Logos</option>
              <option value="Tournament Banners">Tournament Banners</option>
              <option value="Auction Demo Videos">Auction Demo Videos</option>
              <option value="Receipt Documents">Receipt Documents</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Upload File (Image / Video)</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Or Direct Media URL</label>
            <input
              type="url"
              placeholder="https://res.cloudinary.com/..."
              value={uploadForm.fileUrl}
              onChange={e => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Search Tags (comma separated)</label>
            <input
              type="text"
              placeholder="banner, edition5, jersey, hd"
              value={uploadForm.tagsString}
              onChange={e => setUploadForm({ ...uploadForm, tagsString: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Confirm Upload
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewAsset && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewAsset(null)}
          title={previewAsset.title}
          subtitle={`${previewAsset.category} · ${previewAsset.fileSizeKb} KB`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center">
              {previewAsset.fileType?.includes('video') ? (
                <video controls className="max-h-[55vh] w-auto" src={previewAsset.fileUrl} />
              ) : (
                <img
                  src={previewAsset.fileUrl}
                  alt={previewAsset.title}
                  className="max-h-[55vh] w-auto object-contain"
                />
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Tags: {previewAsset.tags?.join(', ')}</span>
              <a
                href={previewAsset.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                Open Original in New Tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
