import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
    color?: string;
}

// Sun Symbol
export const SunIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="12"
            r="4"
            fill={color}
            fillOpacity="0.8"
        />
        <path
            d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Moon Symbol (different from tarot moon)
export const MoonAstroIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill={color}
            fillOpacity="0.8"
        />
    </svg>
);

// Mercury Symbol
export const MercuryIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="8"
            r="3"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M12 11v6M9 20h6M12 5V3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M10 3h4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Venus Symbol
export const VenusIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="8"
            r="4"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M12 12v8M8 16h8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Mars Symbol
export const MarsIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="9"
            cy="15"
            r="4"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M13 11l8-8M16 3h5v5"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// Jupiter Symbol
export const JupiterIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M8 12h8M12 8v12M16 16l-4-4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M8 8h4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Saturn Symbol
export const SaturnIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 4v16M8 8h8M12 8l-4 8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Aries Symbol
export const AriesIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M9 12c0-4 1-8 3-8s3 4 3 8M6 8c2-2 4-2 6 0M12 8c2-2 4-2 6 0"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// Taurus Symbol
export const TaurusIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="14"
            r="6"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M6 10c2-4 4-6 6-6s4 2 6 6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// Gemini Symbol
export const GeminiIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 4h12M6 20h12M9 4v16M15 4v16"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Cancer Symbol
export const CancerIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="8"
            cy="8"
            r="4"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <circle
            cx="16"
            cy="16"
            r="4"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M12 8c0-2 2-4 4-4M12 16c0 2-2 4-4 4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Leo Symbol
export const LeoIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="8"
            cy="12"
            r="4"
            fill="none"
            stroke={color}
            strokeWidth="2"
        />
        <path
            d="M12 12c2 0 4-2 4-4s-2-4-4-4M16 12c0 4 2 6 4 6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// Virgo Symbol
export const VirgoIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 4v12c0 2 1 3 2 3M10 4v12c0 2 1 3 2 3M14 4v8c0 2 1 3 2 3M18 4v8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M14 12c2 0 4 2 4 4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// Libra Symbol
export const LibraIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M4 16h16M7 12l10 0M12 4c-3 0-5 4-5 8s2 8 5 8 5-4 5-8-2-8-5-8z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// Scorpio Symbol
export const ScorpioIcon: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M6 4v12c0 2 1 3 2 3M10 4v12c0 2 1 3 2 3M14 4v8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
        <path
            d="M14 12l4 0l2-2M18 12l2 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
