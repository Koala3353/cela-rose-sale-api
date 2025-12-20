import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface OrderSuccessAnimationProps {
    targetRef: React.RefObject<HTMLElement>;
}

const OrderSuccessAnimation: React.FC<OrderSuccessAnimationProps> = ({ targetRef }) => {
    const controls = useAnimation();
    const [flowersVisible, setFlowersVisible] = useState(false);
    const [finalPose, setFinalPose] = useState(false);

    // Initial state: start at bottom left
    const startX = '10%';
    const startY = 0; // relative to bottom

    useEffect(() => {
        const sequence = async () => {
            if (!targetRef.current) return;

            // 1. Wait a bit
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Bend down to pick flowers
            await controls.start({
                y: 10,
                rotate: 15,
                transition: { duration: 0.5 }
            });

            setFlowersVisible(true);

            // 3. Stand up
            await controls.start({
                y: 0,
                rotate: 0,
                transition: { duration: 0.5 }
            });

            // 4. Calculate target position
            const targetRect = targetRef.current.getBoundingClientRect();
            // We want to land just to the left of the button center
            // Since this component is fixed at bottom:0, left:0, we need to calculate absolute coords
            // However, it's easier if we position this component fixed fullscreen and animate stickman absolutely
            // Or typically, `y` would be negative (upwards)

            const windowHeight = window.innerHeight;
            // Target Y (top of button) - Window Height (bottom) gives us negative Y to travel
            // Adjusted slightly so he stands ON the button or just next to it.
            // Let's aim for the left side of the button.
            const targetX = targetRect.left - 50; // 50px to the left of button
            const targetY = -(windowHeight - targetRect.bottom); // Move up from bottom

            // 5. Walk to target
            await controls.start({
                x: targetX,
                y: targetY,
                transition: {
                    duration: 3,
                    type: "spring",
                    stiffness: 50,
                    damping: 20
                }
            });

            // 6. Give flowers (extend arm)
            setFinalPose(true);
        };

        sequence();
    }, [controls, targetRef]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            <motion.div
                className="absolute bottom-0 text-gray-600"
                style={{ left: startX }} // Starting horizontal position
                animate={controls}
            >
                <div className="relative w-16 h-16 md:w-20 md:h-20">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Head */}
                        <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.1" />

                        {/* Body */}
                        <path d="M12 8 L12 15" />

                        {/* Legs - Walking animation handled by CSS/Framer if needed, but for now static legs or simple wobble */}
                        {finalPose ? (
                            // Standing still
                            <>
                                <path d="M12 15 L10 22" />
                                <path d="M12 15 L14 22" />
                            </>
                        ) : (
                            // Running/Walking pose
                            <motion.g
                                animate={{ rotateX: [0, 20, 0] }}
                                transition={{ repeat: Infinity, duration: 0.2 }}
                            >
                                <path d="M12 15 L9 22" />
                                <path d="M12 15 L15 22" />
                            </motion.g>
                        )}

                        {/* Arms */}
                        {finalPose ? (
                            // Giving flowers pose
                            <>
                                <path d="M12 10 L16 10" /> {/* Arm extended right */}
                            </>
                        ) : (
                            // Normal/Walking arms
                            <>
                                <path d="M12 10 L9 13" />
                                <path d="M12 10 L15 13" />
                            </>
                        )}

                        {/* Flowers */}
                        {flowersVisible && (
                            <motion.g
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{
                                    originX: "0px",
                                    originY: "0px",
                                    x: finalPose ? 16 : 15,
                                    y: finalPose ? 10 : 13
                                }}
                            >
                                <circle cx="0" cy="-2" r="2" className="text-rose-500" fill="currentColor" stroke="none" />
                                <circle cx="-2" cy="0" r="2" className="text-pink-500" fill="currentColor" stroke="none" />
                                <circle cx="2" cy="0" r="2" className="text-red-500" fill="currentColor" stroke="none" />
                                <path d="M0 0 L0 5" stroke="green" strokeWidth="1" />
                            </motion.g>
                        )}
                    </svg>
                </div>
            </motion.div>
        </div>
    );
};

export default OrderSuccessAnimation;
