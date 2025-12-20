import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const RunningAnimation: React.FC = () => {
    const [animationKey, setAnimationKey] = useState(0);

    const handleAnimationComplete = () => {
        setAnimationKey(prev => prev + 1);
    };

    const duration = 20;

    return (
        <div className="fixed bottom-0 left-0 right-0 overflow-hidden pointer-events-none h-16 md:h-24 z-30">
            <motion.div
                key={animationKey}
                className="flex items-end absolute bottom-0"
                style={{ gap: 0 }}
                initial={{ x: '-20vw' }}
                animate={{ x: '110vw' }}
                transition={{
                    duration: duration,
                    repeat: 0,
                    ease: "linear",
                    delay: 0
                }}
                onAnimationComplete={handleAnimationComplete}
            >
                {/* Guy Chasing Girl Configuration */}
                <Guy />
                <Girl />
            </motion.div>
        </div>
    );
};

// Components

const Guy: React.FC = () => (
    <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
        className="w-10 h-10 md:w-14 md:h-14 text-gray-500 transform scale-x-100"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="overflow-visible">
            <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.2" />
            <path d="M12 8 L12 15" />
            <motion.path
                d="M12 15 L9 22"
            />
            <motion.path
                d="M12 15 L15 21"
            />
            {/* Arms: Chasing Mode */}
            <path d="M12 10 L9 13" /> <path d="M12 10 L16 12" />
            <g transform="translate(16, 10)"><circle cx="0" cy="-1" r="1.5" className="text-rose-500" fill="currentColor" stroke="none" /><circle cx="-1.5" cy="0.5" r="1.5" className="text-pink-500" fill="currentColor" stroke="none" /><circle cx="1.5" cy="0.5" r="1.5" className="text-red-500" fill="currentColor" stroke="none" /></g>
        </svg>
    </motion.div>
);

const Girl: React.FC = () => (
    <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.4, repeat: Infinity }}
        className="w-10 h-10 md:w-14 md:h-14 text-rose-400 transform scale-x-100"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="overflow-visible">
            <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.2" />
            {/* Chasing Mode Body */}
            <path d="M12 9 L9 12" /> <path d="M12 9 L15 12" />

            <path d="M12 8 L9 16 Q 12 18 15 16 Z" fill="currentColor" fillOpacity="0.1" />
            <motion.path
                d="M11 16 L9 22"
            />
            <motion.path
                d="M13 16 L15 21"
            />
            <path d="M9 5 Q 6 6 8 10" />
        </svg>
    </motion.div>
);

export default RunningAnimation;
