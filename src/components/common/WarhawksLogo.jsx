import React from 'react';
import { WARHAWKS_LOGO_URL } from '../../constants';

export const WarhawksLogo = ({
  className = '',
  size = 'md',
  rounded = 'rounded-md',
  withBorder = false,
  withBackground = true,
  alt = 'Warhawks Official Logo'
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
    '2xl': 'w-16 h-16 sm:w-20 sm:h-20'
  };

  const finalClass = className || sizeMap[size] || sizeMap.md;

  return (
    <img
      src={WARHAWKS_LOGO_URL}
      alt={alt}
      className={`object-contain shrink-0 inline-block align-middle ${finalClass} ${rounded} ${
        withBackground ? 'bg-white p-0.5' : ''
      } ${withBorder ? 'border border-slate-200/80 shadow-xs' : ''}`}
    />
  );
};
