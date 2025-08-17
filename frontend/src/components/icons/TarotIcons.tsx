import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
    color?: string;
}

// ArcanaAI Logo (Main App Logo)
export const TarotAgentLogo: React.FC<IconProps> = ({
    className = '',
    size = 24,
    color = 'currentColor'
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill={color} stroke="none">
            <path d="M6180 7278 c-36 -18 -51 -34 -72 -78 -22 -45 -164 -510 -247 -809
l-20 -72 66 -30 c48 -22 68 -26 74 -18 11 18 179 611 179 633 0 16 6 17 49 11
90 -12 170 28 222 112 19 31 25 34 53 29 26 -5 1186 -369 1551 -486 l120 -39
6 -73 c3 -40 13 -87 22 -104 21 -40 73 -86 118 -104 18 -7 35 -14 37 -16 2 -1
-24 -87 -57 -190 -109 -344 -527 -1671 -829 -2635 l-46 -145 -58 4 c-62 5
-125 -13 -163 -46 -16 -13 -74 -85 -80 -99 -1 -2 -102 31 -226 72 -123 41
-227 74 -230 73 -12 -5 -99 -116 -99 -126 0 -12 172 -74 503 -182 267 -87 286
-89 353 -49 43 26 57 51 92 155 43 127 337 1055 487 1534 69 223 153 488 185
590 250 790 380 1229 380 1282 0 88 -50 136 -190 178 -118 36 -379 117 -1135
355 -792 249 -944 295 -974 295 -15 0 -47 -10 -71 -22z"/>
            <path d="M3315 7013 c-1133 -368 -1614 -528 -1635 -542 -40 -28 -70 -90 -70
-143 0 -36 81 -291 331 -1040 496 -1487 738 -2198 764 -2244 28 -47 75 -74
130 -74 30 0 701 207 742 229 15 8 -72 142 -89 136 -7 -3 -113 -38 -235 -79
l-222 -73 -29 48 c-17 26 -49 60 -73 76 -37 24 -52 28 -116 28 -40 0 -73 0
-73 0 -1 1 -915 2732 -922 2755 -7 25 -7 35 1 38 7 2 31 18 54 36 55 42 88
108 94 190 l6 64 71 25 c74 26 998 329 1214 399 68 21 129 41 136 44 8 3 18
-8 26 -25 17 -41 78 -96 125 -111 20 -7 59 -10 86 -8 l48 5 20 -61 c11 -34 58
-180 105 -326 48 -146 90 -271 95 -278 6 -11 20 -6 61 24 50 36 52 39 46 73
-12 72 -255 804 -279 840 -31 46 -81 71 -139 70 -24 -1 -144 -34 -273 -76z"/>
            <path d="M6808 6163 c7 -3 16 -2 19 1 4 3 -2 6 -13 5 -11 0 -14 -3 -6 -6z" />
            <path d="M6785 6053 c-68 -14 -64 -10 -60 -58 4 -59 18 -75 69 -75 30 0 37 -3
26 -10 -8 -5 -11 -10 -5 -10 5 0 4 -5 -3 -12 -7 -7 -12 -15 -12 -19 0 -3 21
15 48 41 163 164 442 43 442 -191 0 -151 -112 -263 -263 -262 l-68 0 3 -41 c3
-41 3 -41 53 -49 70 -11 205 -1 300 23 81 21 240 94 284 131 l25 20 -33 67
c-113 230 -282 377 -497 432 -72 19 -248 26 -309 13z"/>
            <path d="M7480 5946 c0 -2 8 -10 18 -17 15 -13 16 -12 3 4 -13 16 -21 21 -21
13z"/>
            <path d="M6964 5842 c-137 -64 -68 -276 83 -259 88 10 140 99 108 183 -30 80
-112 112 -191 76z"/>
            <path d="M5930 5656 c-28 -85 -81 -145 -159 -180 -34 -15 -61 -31 -61 -36 0
-5 13 -11 29 -15 46 -10 118 -61 144 -102 13 -21 34 -66 47 -101 12 -34 26
-62 30 -62 4 0 15 28 25 61 21 67 60 129 100 155 13 9 51 27 82 39 l58 24 -30
11 c-17 7 -39 16 -50 20 -56 23 -104 71 -139 141 -20 39 -36 78 -36 85 0 7 -4
15 -9 18 -5 4 -19 -23 -31 -58z"/>
            <path d="M4982 5639 c-87 -10 -231 -57 -321 -105 -242 -127 -422 -355 -492
-622 -27 -101 -36 -295 -19 -399 64 -400 340 -707 727 -810 84 -22 119 -26
253 -26 167 -1 236 12 373 69 189 80 391 273 477 455 35 75 48 129 31 129 -6
0 -55 -36 -109 -81 -114 -94 -238 -160 -348 -184 -91 -21 -245 -16 -339 9
-258 70 -473 291 -535 549 -50 208 -8 436 117 624 110 167 261 263 492 312 41
9 76 21 78 28 5 15 -74 40 -170 53 -87 11 -110 11 -215 -1z"/>
            <path d="M6820 5546 c0 -2 8 -10 18 -17 15 -13 16 -12 3 4 -13 16 -21 21 -21
13z"/>
            <path d="M3715 4979 c-192 -428 -191 -873 2 -1252 191 -373 535 -630 975 -728
116 -26 397 -37 508 -20 79 12 167 37 175 50 2 5 -49 14 -115 20 -284 29 -575
135 -826 302 -142 95 -335 286 -423 418 -121 183 -212 414 -252 640 -25 140
-35 409 -21 536 6 50 9 91 8 93 -2 1 -16 -25 -31 -59z"/>
            <path d="M5371 4894 c-82 -74 -25 -204 83 -190 53 6 87 42 93 98 5 39 2 49
-24 78 -22 25 -39 33 -74 37 -40 5 -50 2 -78 -23z"/>
            <path d="M6290 4057 c0 -13 -12 -48 -27 -78 -22 -43 -38 -59 -75 -79 -54 -28
-58 -35 -25 -44 40 -10 87 -60 110 -116 12 -30 26 -57 30 -60 5 -3 16 19 26
48 22 64 50 96 107 119 24 10 44 20 44 23 -1 3 -24 16 -53 30 -58 28 -92 70
-109 137 -11 46 -28 58 -28 20z"/>
            <path d="M5720 3440 c-11 -11 -20 -29 -20 -40 0 -27 43 -70 70 -70 27 0 70 43
70 70 0 29 -35 60 -70 60 -17 0 -39 -9 -50 -20z"/>
            <path d="M6429 3223 c-13 -16 -12 -17 4 -4 9 7 17 15 17 17 0 8 -8 3 -21 -13z" />
            <path d="M6374 3168 l-29 -33 33 29 c17 17 32 31 32 33 0 8 -8 1 -36 -29z" />
            <path d="M3853 2889 c-77 -38 -123 -112 -123 -196 0 -65 13 -108 55 -177 19
-32 35 -60 35 -62 0 -1 -25 -19 -55 -39 -68 -46 -122 -110 -169 -201 -45 -88
-47 -138 -10 -213 96 -192 547 -340 1194 -391 172 -14 546 -14 720 0 165 13
493 64 445 69 -5 1 12 22 37 49 58 58 78 104 78 179 0 68 -33 148 -73 180 -25
19 -30 20 -109 7 -385 -64 -854 -71 -1208 -19 -224 33 -414 86 -545 151 -116
57 -149 84 -140 113 8 27 17 27 100 -8 335 -141 982 -181 1520 -95 423 67 771
212 842 348 59 113 13 236 -110 294 -76 36 -147 25 -147 -22 0 -16 9 -27 28
-35 49 -20 92 -67 92 -99 0 -51 -93 -110 -233 -146 -76 -20 -302 -53 -452 -65
-179 -16 -529 -13 -680 4 -375 44 -695 152 -885 297 -144 111 -141 110 -207
77z m118 -225 c156 -130 537 -221 1019 -243 108 -4 195 -13 208 -20 25 -13 28
-33 8 -50 -43 -36 -489 -47 -691 -17 -314 47 -552 141 -622 245 -27 40 -29 68
-7 99 21 30 35 28 85 -14z"/>
            <path d="M6390 2368 c-18 -24 -37 -48 -42 -54 -6 -8 6 -21 36 -38 146 -85 175
-314 54 -429 l-33 -31 64 35 c91 48 164 122 180 181 17 59 11 141 -14 192 -26
55 -87 133 -126 161 -50 37 -79 33 -119 -17z"/>
            <path d="M3441 2011 c0 -8 -13 -39 -28 -69 -53 -108 -40 -204 38 -302 78 -96
313 -204 599 -275 286 -70 490 -94 850 -102 554 -11 735 33 893 216 l29 33
-29 -6 c-190 -42 -747 -59 -1045 -32 -578 51 -1006 175 -1200 345 -59 53 -88
98 -98 159 -4 26 -8 41 -9 33z"/>
        </g>
    </svg>
);

// Enhanced Crystal Ball Icon (Alternative)
export const CrystalBallIcon: React.FC<IconProps> = ({
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
        {/* Background glow */}
        <circle
            cx="12"
            cy="12"
            r="11"
            fill="url(#logoGlow)"
            fillOpacity="0.3"
        />

        {/* Main crystal ball */}
        <circle
            cx="12"
            cy="11"
            r="7"
            fill="url(#crystalGradient)"
            fillOpacity="0.4"
            stroke={color}
            strokeWidth="1.5"
        />

        {/* Inner crystal structure */}
        <circle
            cx="12"
            cy="11"
            r="5"
            fill="url(#innerCrystal)"
            fillOpacity="0.2"
        />

        {/* Crystal highlight */}
        <circle
            cx="10"
            cy="9"
            r="2"
            fill="white"
            fillOpacity="0.9"
        />

        {/* Secondary highlight */}
        <circle
            cx="13"
            cy="8"
            r="1"
            fill="white"
            fillOpacity="0.6"
        />

        {/* Base shadow */}
        <ellipse
            cx="12"
            cy="18.5"
            rx="5"
            ry="1.2"
            fill={color}
            fillOpacity="0.3"
        />

        {/* Mystical sparkles */}
        <circle
            cx="6"
            cy="6"
            r="0.8"
            fill="#fbbf24"
            fillOpacity="0.8"
        />
        <circle
            cx="18"
            cy="8"
            r="0.6"
            fill="#fbbf24"
            fillOpacity="0.7"
        />
        <circle
            cx="20"
            cy="16"
            r="0.5"
            fill="#fbbf24"
            fillOpacity="0.6"
        />

        <defs>
            <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="innerCrystal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
            </linearGradient>
        </defs>
    </svg>
);

// Moon Phases Icon
export const MoonIcon: React.FC<IconProps> = ({
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
            d="M12 3a9 9 0 0 0 0 18c2.5-2.5 2.5-6.5 0-9a9 9 0 0 0 0-9z"
            fill={color}
            fillOpacity="0.8"
        />
        <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
        />
    </svg>
);

// Star Icon
export const StarIcon: React.FC<IconProps> = ({
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
            d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
            fill={color}
            stroke={color}
            strokeWidth="1"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="1" fill="white" fillOpacity="0.8" />
    </svg>
);

// Pentacle Icon
export const PentacleIcon: React.FC<IconProps> = ({
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
            r="10"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
        />
        <path
            d="M12 4l2.351 7.234h7.649l-6.195 4.532 2.351 7.234-6.156-4.532-6.156 4.532 2.351-7.234-6.195-4.532h7.649z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
    </svg>
);

// Eye of Providence
export const EyeIcon: React.FC<IconProps> = ({
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
            d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
        />
        <circle
            cx="12"
            cy="12"
            r="3"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
        />
        <circle
            cx="12"
            cy="12"
            r="1"
            fill={color}
        />
    </svg>
);

// Ankh Symbol
export const AnkhIcon: React.FC<IconProps> = ({
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
            d="M12 11v10M9 14h6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

// Mystical Candle
export const CandleIcon: React.FC<IconProps> = ({
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
        <rect
            x="10"
            y="8"
            width="4"
            height="12"
            rx="0.5"
            fill={color}
            fillOpacity="0.8"
        />
        <ellipse
            cx="12"
            cy="20"
            rx="3"
            ry="1"
            fill={color}
            fillOpacity="0.3"
        />
        <path
            d="M12 8c0-2 1-3 0-4s-1 2 0 4z"
            fill="#f59e0b"
            fillOpacity="0.8"
        />
        <path
            d="M12 6c0-1 0.5-1.5 0-2s-0.5 1 0 2z"
            fill="#fbbf24"
        />
    </svg>
);

// Sacred Geometry - Flower of Life
export const FlowerOfLifeIcon: React.FC<IconProps> = ({
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
        <g fill="none" stroke={color} strokeWidth="0.8">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="7" r="3" />
            <circle cx="12" cy="17" r="3" />
            <circle cx="7.5" cy="9.5" r="3" />
            <circle cx="16.5" cy="9.5" r="3" />
            <circle cx="7.5" cy="14.5" r="3" />
            <circle cx="16.5" cy="14.5" r="3" />
        </g>
    </svg>
);

// Tarot Card Back Design
export const TarotCardIcon: React.FC<IconProps> = ({
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
        <rect
            x="5"
            y="3"
            width="14"
            height="18"
            rx="2"
            fill={color}
            fillOpacity="0.1"
            stroke={color}
            strokeWidth="1.5"
        />
        <rect
            x="7"
            y="5"
            width="10"
            height="14"
            rx="1"
            fill="none"
            stroke={color}
            strokeWidth="1"
        />
        <circle cx="12" cy="12" r="2" fill="none" stroke={color} strokeWidth="1" />
        <path d="M10 10l4 4M14 10l-4 4" stroke={color} strokeWidth="1" />
    </svg>
);

// Infinity Symbol
export const InfinityIcon: React.FC<IconProps> = ({
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
            d="M9.5 9c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5c1.1 0 2.04-.7 2.39-1.68.35.98 1.29 1.68 2.39 1.68 1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5c-1.1 0-2.04.7-2.39 1.68-.35-.98-1.29-1.68-2.39-1.68z"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
        />
    </svg>
);
