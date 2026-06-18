'use client';

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface CardDrawingAnimationProps {
    count?: number;
}

/**
 * Suspense animation shown while the reading is being drawn. Renders a row of
 * face-down tarot card backs that rise, flip, and shimmer in a loop until the
 * real cards are revealed. Driven by framer-motion so it plays regardless of
 * the OS reduce-motion setting.
 */
export function CardDrawingAnimation({ count = 3 }: CardDrawingAnimationProps) {
    const { t } = useTranslation('home');
    const cards = Array.from({ length: Math.min(Math.max(count, 1), 10) });

    return (
        <div className="flex justify-start" role="status" aria-live="polite">
            <div className="max-w-full md:max-w-2xl p-4 md:p-6 rounded-2xl card-mystical shadow-lg w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <div className="spinner-mystical w-5 h-5" />
                        <div className="absolute inset-0 spinner-mystical-dual w-5 h-5" />
                    </div>
                    <span className="text-base text-purple-400 font-medium font-mystical">
                        {t('page.shufflingCards')}
                    </span>
                </div>

                <div className="flex flex-wrap gap-3 md:gap-4 justify-center py-2" style={{ perspective: 1000 }}>
                    {cards.map((_, i) => (
                        <motion.div
                            key={i}
                            className="relative w-16 h-24 md:w-20 md:h-32 rounded-lg border-2 border-purple-400/50 shadow-lg overflow-hidden"
                            style={{
                                background:
                                    'linear-gradient(135deg, #4c1d95 0%, #6d28d9 45%, #1e1b4b 100%)',
                                transformOrigin: 'center',
                            }}
                            initial={{ rotateY: 0, y: 0 }}
                            animate={{
                                rotateY: [0, 180, 360],
                                y: [0, -14, 0],
                            }}
                            transition={{
                                duration: 1.6,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.18,
                            }}
                        >
                            {/* Mystical card-back sigil */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-yellow-300/80 text-xl md:text-2xl">✦</span>
                            </div>
                            <div className="absolute inset-1 rounded border border-yellow-300/30" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
