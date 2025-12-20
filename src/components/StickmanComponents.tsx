import React from 'react';
import { motion } from 'framer-motion';

// Common props for sizing/styling
interface StickmanProps {
    className?: string;
    scale?: number;
}

/**
 * Couple sitting side-by-side, maybe swinging legs.
 * Good for Footer.
 */
export const StickmanSitting: React.FC<StickmanProps> = ({ className = "w-24 h-24", scale = 1 }) => {
    return (
        <motion.svg
            viewBox="0 0 50 30"
            className={`text-gray-400 ${className}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ scale }}
        >
            {/* Guy (Left) */}
            <g transform="translate(10, 5)">
                <circle cx="5" cy="2" r="2.5" fill="currentColor" fillOpacity="0.1" />
                <path d="M5 5 L5 12" /> {/* Body */}
                <path d="M5 12 L8 12 L8 18" /> {/* Sitting Leg 1 */}
                <motion.path
                    d="M5 12 L2 12 L2 18"
                    animate={{ rotate: [0, -15, 0] }} // Reversed from 15
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ originX: "5px", originY: "12px" }}
                /> {/* Swinging Leg 2 - adjusted origin */}
                <path d="M5 7 L2 9" /> {/* Arm leaned back */}
                <path d="M5 7 L8 9" /> {/* Arm */}
            </g>

            {/* Girl (Right) */}
            <g transform="translate(25, 5)">
                {/* Leaning Upper Body */}
                <motion.g
                    animate={{ rotate: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    style={{ originX: "5px", originY: "12px" }}
                >
                    <circle cx="5" cy="2" r="2.5" fill="currentColor" fillOpacity="0.1" className="text-rose-300" />
                    <path d="M5 5 L5 12" />
                    <path d="M5 7 L8 9" />
                    <path d="M5 7 L2 9" />
                    {/* Dress - attached to body */}
                    <path d="M2 12 Q 5 14 8 12" fill="currentColor" fillOpacity="0.1" className="text-rose-200" />
                </motion.g>

                {/* Legs - static base relative to lean */}
                <motion.path
                    d="M5 12 L8 12 L8 18"
                    animate={{ rotate: [0, 15, 0] }} // Reversed from -15
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    style={{ originX: "5px", originY: "12px" }}
                />
                <path d="M5 12 L2 12 L2 18" />
            </g>

            {/* Heart between them */}
            <motion.path
                d="M20 5 C20 4, 19 3, 18 3 C17 3, 16 4, 16 5 C16 7, 20 10, 20 10 C20 10, 24 7, 24 5 C24 4, 23 3, 22 3 C21 3, 20 4, 20 5"
                fill="#f43f5e"
                stroke="none"
                initial={{ scale: 0 }}
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
        </motion.svg>
    );
};

/**
 * Guy peeking from behind something (left or right).
 * Good for Login Modal.
 */
export const StickmanPeeking: React.FC<StickmanProps & { side?: 'left' | 'right' }> = ({ className = "w-20 h-20", scale = 1, side = 'left' }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`text-gray-500 ${className}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ scale, transform: side === 'right' ? 'scaleX(-1)' : undefined }}
        >
            <motion.g
                initial={{ x: -10, rotate: -5 }}
                animate={{ x: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.5 }}
                style={{ originX: "22px", originY: "15px" }}
            >
                {/* Hands holding the edge (at x=22) - simplified */}
                <path d="M21 15 C21 15, 19 15, 19 17" />
                <path d="M21 19 C21 19, 19 19, 19 21" />

                {/* Body leaning out from x=20 */}
                <path d="M17 12 L20 20" />

                {/* Head */}
                <circle cx="15" cy="10" r="3.5" fill="currentColor" fillOpacity="0.1" />

                {/* Waving Arm (Left side) */}
                <motion.path
                    d="M13 13 L9 10 L7 12"
                    animate={{ rotate: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                    style={{ originX: "13px", originY: "13px" }}
                />
            </motion.g>
        </svg>
    );
};

/**
 * Guy looking confused/lost.
 * Good for Empty Cart.
 */
export const StickmanConfused: React.FC<StickmanProps> = ({ className = "w-24 h-24", scale = 1 }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`text-gray-500 ${className}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ scale }}
        >
            {/* Head */}
            <motion.circle
                cx="12" cy="6" r="3"
                fill="currentColor" fillOpacity="0.1"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            {/* Question Mark */}
            <motion.path
                d="M18 4 C18 4, 20 2, 22 4 C22 6, 20 7, 20 7 M20 9 L20 9"
                strokeWidth="2"
                className="text-rose-500"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            />

            {/* Body */}
            <path d="M12 9 L12 16" />
            {/* Legs */}
            <path d="M12 16 L10 22" />
            <path d="M12 16 L14 22" />
            {/* Arms - scratching head */}
            <path d="M12 11 L9 13" /> {/* Left arm normal */}
            <path d="M12 11 L15 8 L13 5" /> {/* Right arm scratching head */}

            {/* Empty Basket/Box at feet */}
            <rect x="18" y="18" width="6" height="4" rx="1" transform="rotate(-15 21 20)" className="text-gray-300" />
        </svg>
    );
};

/**
 * Couple looking at a map, looking lost.
 * Good for 404.
 */
export const StickmanLost: React.FC<StickmanProps> = ({ className = "w-48 h-32", scale = 1 }) => {
    return (
        <svg
            viewBox="0 0 100 60"
            className={`text-gray-500 ${className}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ scale }}
        >
            {/* Map */}
            <motion.path
                d="M35 15 L65 15 L65 40 L35 40 Z"
                fill="white"
                className="text-gray-300"
                animate={{ rotateY: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
            <path d="M45 20 L55 35 M55 20 L45 35" className="text-gray-300" strokeWidth="1" />

            {/* Guy (Left) */}
            <g transform="translate(25, 10)">
                <circle cx="5" cy="5" r="3" fill="currentColor" fillOpacity="0.1" />
                <path d="M5 8 L5 25" />
                <path d="M5 25 L2 35" />
                <path d="M5 25 L8 35" />
                {/* Arms pointing at map */}
                <path d="M5 12 L15 15" />
                <path d="M5 12 L15 25" />
            </g>

            {/* Girl (Right) */}
            <g transform="translate(65, 10)">
                <circle cx="5" cy="5" r="3" fill="currentColor" fillOpacity="0.1" className="text-rose-300" />
                <path d="M5 8 L5 25" />
                {/* Dress */}
                <path d="M5 15 L1 28 Q 5 30 9 28 Z" fill="currentColor" fillOpacity="0.1" className="text-rose-100" />
                <path d="M3 28 L3 35" />
                <path d="M7 28 L7 35" />
                {/* Arms holding map */}
                <path d="M5 12 L-5 15" />
            </g>
        </svg>
    );
};
