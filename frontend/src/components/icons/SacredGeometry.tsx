import React from 'react';

interface GeometryProps {
    className?: string;
    size?: number;
    color?: string;
    strokeWidth?: number;
}

// Metatron's Cube
export const MetatronsCube: React.FC<GeometryProps> = ({
    className = '',
    size = 100,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g stroke={color} strokeWidth={strokeWidth} fill="none">
            {/* Central hexagon */}
            <polygon points="50,20 65,30 65,50 50,60 35,50 35,30" />

            {/* Outer circles */}
            <circle cx="50" cy="20" r="8" />
            <circle cx="65" cy="30" r="8" />
            <circle cx="65" cy="50" r="8" />
            <circle cx="50" cy="60" r="8" />
            <circle cx="35" cy="50" r="8" />
            <circle cx="35" cy="30" r="8" />
            <circle cx="50" cy="40" r="8" />

            {/* Connecting lines */}
            <line x1="50" y1="20" x2="35" y2="30" />
            <line x1="35" y1="30" x2="35" y2="50" />
            <line x1="35" y1="50" x2="50" y2="60" />
            <line x1="50" y1="60" x2="65" y2="50" />
            <line x1="65" y1="50" x2="65" y2="30" />
            <line x1="65" y1="30" x2="50" y2="20" />

            {/* Inner connections */}
            <line x1="50" y1="20" x2="50" y2="40" />
            <line x1="65" y1="30" x2="50" y2="40" />
            <line x1="65" y1="50" x2="50" y2="40" />
            <line x1="50" y1="60" x2="50" y2="40" />
            <line x1="35" y1="50" x2="50" y2="40" />
            <line x1="35" y1="30" x2="50" y2="40" />
        </g>
    </svg>
);

// Sri Yantra
export const SriYantra: React.FC<GeometryProps> = ({
    className = '',
    size = 100,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g stroke={color} strokeWidth={strokeWidth} fill="none">
            {/* Outer square */}
            <rect x="10" y="10" width="80" height="80" />

            {/* Outer circles */}
            <circle cx="50" cy="50" r="35" />
            <circle cx="50" cy="50" r="30" />

            {/* Triangles pointing up */}
            <polygon points="50,20 35,45 65,45" />
            <polygon points="50,25 40,42 60,42" />
            <polygon points="50,30 42,40 58,40" />

            {/* Triangles pointing down */}
            <polygon points="50,80 35,55 65,55" />
            <polygon points="50,75 40,58 60,58" />
            <polygon points="50,70 42,60 58,60" />

            {/* Central bindu */}
            <circle cx="50" cy="50" r="2" fill={color} />
        </g>
    </svg>
);

// Vesica Piscis
export const VesicaPiscis: React.FC<GeometryProps> = ({
    className = '',
    size = 100,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g stroke={color} strokeWidth={strokeWidth} fill="none">
            <circle cx="35" cy="50" r="25" />
            <circle cx="65" cy="50" r="25" />
        </g>
    </svg>
);

// Tree of Life
export const TreeOfLife: React.FC<GeometryProps> = ({
    className = '',
    size = 100,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g stroke={color} strokeWidth={strokeWidth} fill="none">
            {/* Sephiroth (spheres) */}
            <circle cx="50" cy="15" r="5" /> {/* Kether */}
            <circle cx="40" cy="25" r="4" /> {/* Chokmah */}
            <circle cx="60" cy="25" r="4" /> {/* Binah */}
            <circle cx="40" cy="40" r="4" /> {/* Chesed */}
            <circle cx="60" cy="40" r="4" /> {/* Geburah */}
            <circle cx="50" cy="50" r="4" /> {/* Tiphareth */}
            <circle cx="40" cy="65" r="4" /> {/* Netzach */}
            <circle cx="60" cy="65" r="4" /> {/* Hod */}
            <circle cx="50" cy="75" r="4" /> {/* Yesod */}
            <circle cx="50" cy="90" r="5" /> {/* Malkuth */}

            {/* Paths */}
            <line x1="50" y1="15" x2="40" y2="25" />
            <line x1="50" y1="15" x2="60" y2="25" />
            <line x1="40" y1="25" x2="60" y2="25" />
            <line x1="40" y1="25" x2="40" y2="40" />
            <line x1="60" y1="25" x2="60" y2="40" />
            <line x1="40" y1="40" x2="50" y2="50" />
            <line x1="60" y1="40" x2="50" y2="50" />
            <line x1="40" y1="40" x2="60" y2="40" />
            <line x1="50" y1="50" x2="40" y2="65" />
            <line x1="50" y1="50" x2="60" y2="65" />
            <line x1="40" y1="65" x2="60" y2="65" />
            <line x1="40" y1="65" x2="50" y2="75" />
            <line x1="60" y1="65" x2="50" y2="75" />
            <line x1="50" y1="75" x2="50" y2="90" />
        </g>
    </svg>
);

// Mystical Border Ornament
export const MysticalBorder: React.FC<{
    className?: string;
    width?: number;
    height?: number;
    color?: string;
}> = ({
    className = '',
    width = 200,
    height = 50,
    color = 'currentColor'
}) => (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g stroke={color} strokeWidth="1" fill="none">
                {/* Central ornament */}
                <circle cx={width / 2} cy={height / 2} r="8" />
                <path d={`M${width / 2 - 15},${height / 2} L${width / 2 - 5},${height / 2 - 5} L${width / 2 - 5},${height / 2 + 5} Z`} />
                <path d={`M${width / 2 + 15},${height / 2} L${width / 2 + 5},${height / 2 - 5} L${width / 2 + 5},${height / 2 + 5} Z`} />

                {/* Side flourishes */}
                <path d={`M20,${height / 2} Q30,${height / 2 - 10} 40,${height / 2} Q30,${height / 2 + 10} 20,${height / 2}`} />
                <path d={`M${width - 20},${height / 2} Q${width - 30},${height / 2 - 10} ${width - 40},${height / 2} Q${width - 30},${height / 2 + 10} ${width - 20},${height / 2}`} />

                {/* Corner elements */}
                <circle cx="10" cy={height / 2} r="3" fill={color} />
                <circle cx={width - 10} cy={height / 2} r="3" fill={color} />
            </g>
        </svg>
    );

// Mystical Divider
export const MysticalDivider: React.FC<{
    className?: string;
    width?: number;
    color?: string;
}> = ({
    className = '',
    width = 300,
    color = 'currentColor'
}) => (
        <svg
            width={width}
            height="20"
            viewBox={`0 0 ${width} 20`}
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g stroke={color} strokeWidth="1" fill={color}>
                {/* Central star */}
                <path d={`M${width / 2},2 L${width / 2 + 3},8 L${width / 2 + 8},8 L${width / 2 + 3},12 L${width / 2 + 5},18 L${width / 2},14 L${width / 2 - 5},18 L${width / 2 - 3},12 L${width / 2 - 8},8 L${width / 2 - 3},8 Z`} />

                {/* Side lines with dots */}
                <line x1="20" y1="10" x2={width / 2 - 20} y2="10" strokeWidth="1" />
                <line x1={width / 2 + 20} y1="10" x2={width - 20} y2="10" strokeWidth="1" />

                <circle cx="30" cy="10" r="1.5" />
                <circle cx="50" cy="10" r="1" />
                <circle cx={width - 30} cy="10" r="1.5" />
                <circle cx={width - 50} cy="10" r="1" />
            </g>
        </svg>
    );

// Pentagram
export const Pentagram: React.FC<GeometryProps> = ({
    className = '',
    size = 50,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M25,5 L30,18 L44,18 L34,27 L38,40 L25,32 L12,40 L16,27 L6,18 L20,18 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
        />
    </svg>
);

// Hexagram (Star of David)
export const Hexagram: React.FC<GeometryProps> = ({
    className = '',
    size = 50,
    color = 'currentColor',
    strokeWidth = 1
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <g stroke={color} strokeWidth={strokeWidth} fill="none">
            <polygon points="25,5 35,20 15,20" />
            <polygon points="25,45 35,30 15,30" />
        </g>
    </svg>
);
