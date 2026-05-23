'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface DrawnCardRevealProps {
    index?: number;
    className?: string;
    children: ReactNode;
}

/**
 * Reveal wrapper for a freshly-drawn tarot card. Uses framer-motion so the
 * animation reliably runs on mount (independent of CSS-class timing or the
 * remote card image's load time) and applies a real 3D flip via perspective.
 *
 * The reveal is intentionally always played — it's a core part of the reading
 * experience — so it is not gated behind prefers-reduced-motion.
 */
export function DrawnCardReveal({ index = 0, className, children }: DrawnCardRevealProps) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, rotateY: 90, y: 26, scale: 0.92 }}
            animate={{ opacity: 1, rotateY: 0, y: 0, scale: 1 }}
            transition={{
                duration: 0.65,
                delay: index * 0.15,
                ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{ transformPerspective: 900, transformOrigin: 'center' }}
        >
            {children}
        </motion.div>
    );
}
