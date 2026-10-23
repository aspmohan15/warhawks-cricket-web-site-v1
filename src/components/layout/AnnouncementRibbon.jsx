import React from 'react';

export const AnnouncementRibbon = ({ announcements = [] }) => {
  // Filter only active announcements
  const activeAnnouncements = (announcements || []).filter(a => a && a.isActive !== false);

  if (activeAnnouncements.length === 0) {
    return null;
  }

  // Duplicate items to ensure uninterrupted seamless infinite looping
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
                className="inline-flex items-center gap-3 text-xs sm:text-[13px] text-slate-200 font-medium px-6 tracking-normal"
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
