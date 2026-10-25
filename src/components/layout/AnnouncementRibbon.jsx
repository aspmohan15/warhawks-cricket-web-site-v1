import React from 'react';

export const AnnouncementRibbon = ({ announcements = [] }) => {
  // Deduplicate by ID to ensure unique items only
  const uniqueMap = new Map();
  for (const a of (announcements || [])) {
    if (a && a.id && a.isActive !== false) {
      uniqueMap.set(a.id, a);
    }
  }
  const activeAnnouncements = Array.from(uniqueMap.values());

  if (activeAnnouncements.length === 0) {
    return null;
  }

  // Duplicate items for continuous seamless loop without stutter
  const items = [...activeAnnouncements, ...activeAnnouncements];

  return (
    <div
      className="relative z-20 w-full bg-slate-900 border-b border-slate-800/80 text-white select-none shadow-xs"
      role="region"
      aria-label="Tournament Announcements"
    >
      <div className="w-full flex items-center h-8 sm:h-9 overflow-hidden">
        {/* Continuous Marquee Track */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          {/* Subtle fade edges for smooth transition */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-900 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900 to-transparent z-10" />

          <div className="animate-marquee flex items-center whitespace-nowrap">
            {items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={`inline-flex items-center gap-3 text-xs sm:text-[13px] text-slate-200 font-medium tracking-normal ${
                  activeAnnouncements.length === 1 ? 'px-32 sm:px-64' : 'px-8 sm:px-14'
                }`}
              >
                <span>{item.message}</span>
                <span className="text-emerald-500/70 text-xs select-none" aria-hidden="true">
                  ✦
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
