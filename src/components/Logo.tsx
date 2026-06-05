import type { Component } from 'solid-js';

/** The Habeas Clockus clock badge (matches the app icon). */
const Logo: Component<{ size?: number }> = (props) => {
  const s = () => props.size ?? 30;
  return (
    <svg width={s()} height={s()} viewBox="0 0 48 48" aria-hidden="true" class="logo">
      <defs>
        <linearGradient id="hc-logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a86a8" />
          <stop offset="1" stop-color="#1f5066" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#hc-logo-bg)" />
      <circle cx="24" cy="24" r="14" fill="#ffffff" />
      <g stroke="#2f6f8f" stroke-width="1.6" stroke-linecap="round">
        <line x1="24" y1="11.5" x2="24" y2="14" />
        <line x1="36.5" y1="24" x2="34" y2="24" />
        <line x1="24" y1="36.5" x2="24" y2="34" />
        <line x1="11.5" y1="24" x2="14" y2="24" />
      </g>
      <g stroke="#1f2933" stroke-linecap="round">
        <line x1="24" y1="24" x2="32" y2="19.5" stroke-width="1.8" />
        <line x1="24" y1="24" x2="18" y2="20.5" stroke-width="2.1" />
      </g>
      <circle cx="24" cy="24" r="1.9" fill="#1f2933" />
    </svg>
  );
};

export default Logo;
