'use client';

export function CosmicBackdrop() {
    return (
        <>
            <style>{`
                @keyframes cosmos-drift {
                    to { background-position: 600px 600px; }
                }
                .cosmos-layer {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                    background:
                        radial-gradient(ellipse 60% 50% at 18% 12%, rgba(168, 85, 247, 0.18), transparent 60%),
                        radial-gradient(ellipse 50% 40% at 92% 85%, rgba(245, 185, 66, 0.07), transparent 65%),
                        radial-gradient(ellipse 80% 60% at 50% 100%, rgba(56, 189, 248, 0.06), transparent 60%),
                        #07071a;
                }
                .cosmos-stars-a, .cosmos-stars-b {
                    position: absolute;
                    inset: 0;
                    background-image:
                        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent),
                        radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.5), transparent),
                        radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.7), transparent),
                        radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.4), transparent),
                        radial-gradient(1px 1px at 45% 50%, rgba(255,255,255,0.5), transparent),
                        radial-gradient(1px 1px at 90% 60%, rgba(255,255,255,0.6), transparent),
                        radial-gradient(1px 1px at 30% 90%, rgba(255,255,255,0.5), transparent),
                        radial-gradient(2px 2px at 75% 35%, rgba(245,185,66,0.4), transparent),
                        radial-gradient(2px 2px at 15% 55%, rgba(168,85,247,0.4), transparent);
                    background-size: 600px 600px;
                    background-repeat: repeat;
                    opacity: 0.7;
                    animation: cosmos-drift 90s linear infinite;
                }
                .cosmos-stars-b {
                    background-size: 800px 800px;
                    background-position: 200px 100px;
                    opacity: 0.4;
                    animation-duration: 140s;
                    animation-direction: reverse;
                }
            `}</style>
            <div className="cosmos-layer" aria-hidden="true">
                <div className="cosmos-stars-a" />
                <div className="cosmos-stars-b" />
            </div>
        </>
    );
}
