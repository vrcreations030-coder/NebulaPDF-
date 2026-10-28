import React from 'react';

interface CosmicLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const CosmicLogo: React.FC<CosmicLogoProps> = ({
  className = '',
  size = 32,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-[#171329] via-[#151923] to-[#0B0D12] border border-[#282D3A] shadow-[0_0_15px_rgba(139,92,246,0.15)] group"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5 transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="nebulaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#7DD3FC" />
            </linearGradient>
            <linearGradient id="orbitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Background orbital rings */}
          <ellipse
            cx="16"
            cy="16"
            rx="12"
            ry="5.5"
            stroke="url(#orbitGrad)"
            strokeWidth="1.5"
            transform="rotate(-28 16 16)"
            strokeDasharray="2 1.5"
          />

          {/* Central PDF Core Shield / Star */}
          <rect
            x="11"
            y="9"
            width="10"
            height="14"
            rx="2"
            fill="#151923"
            stroke="#8B5CF6"
            strokeWidth="1.5"
          />
          {/* Folded corner */}
          <path
            d="M17 9 L21 13 L17 13 Z"
            fill="#8B5CF6"
            opacity="0.8"
          />

          {/* Mini document lines */}
          <line x1="13" y1="15" x2="18" y2="15" stroke="#7DD3FC" strokeWidth="1" strokeLinecap="round" />
          <line x1="13" y1="18" x2="19" y2="18" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />
          <line x1="13" y1="20" x2="16" y2="20" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round" />

          {/* Orbiting Satellite Particle */}
          <circle cx="24" cy="11.5" r="1.75" fill="#7DD3FC" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center leading-none">
            Nebula<span className="text-[#8B5CF6]">PDF</span>
          </span>
          <span className="text-[10px] tracking-wider text-[#9CA3AF] uppercase font-mono mt-0.5 leading-none">
            Infinite Documents
          </span>
        </div>
      )}
    </div>
  );
};
