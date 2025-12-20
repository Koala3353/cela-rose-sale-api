import { motion } from 'framer-motion';

interface RoseLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'bloom' | 'delivery';
    message?: string;
    submessage?: string;
}

const RoseLoader = ({ size = 'md', variant = 'bloom', message, submessage }: RoseLoaderProps) => {
    const dimensions = {
        sm: { container: 'w-20 h-20', petal: 'w-6 h-8 -ml-3', center: 'w-4 h-4 -ml-2 -mt-2' },
        md: { container: 'w-28 h-28', petal: 'w-8 h-12 -ml-4', center: 'w-5 h-5 -ml-2.5 -mt-2.5' },
        lg: { container: 'w-32 h-32', petal: 'w-10 h-14 -ml-5', center: 'w-6 h-6 -ml-3 -mt-3' },
    };

    const config = dimensions[size];

    return (
        <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Animation Container */}
            <div className={`relative ${config.container} mb-6`}>

                {variant === 'delivery' ? (
                    // Mini Running Guy
                    <motion.div
                        className="w-full h-full flex items-center justify-center p-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <svg viewBox="0 0 24 24" className="w-full h-full text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* Running Guy Path - simplified from RunningAnimation */}
                            <motion.g animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 0.3 }}>
                                <circle cx="12" cy="5" r="3" fill="currentColor" fillOpacity="0.1" />
                                <path d="M12 8 L12 15" />
                                <motion.path d="M12 15 L9 22" animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 0.3 }} style={{ originY: "15px", originX: "12px" }} />
                                <motion.path d="M12 15 L15 22" animate={{ rotate: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 0.3, delay: 0.15 }} style={{ originY: "15px", originX: "12px" }} />
                                <path d="M12 10 L16 12" />
                                <path d="M12 10 L9 13" />
                                {/* Flowers */}
                                <g transform="translate(16, 10)">
                                    <circle cx="0" cy="-1" r="1.5" className="text-rose-500" fill="currentColor" stroke="none" />
                                    <circle cx="-1.5" cy="0.5" r="1.5" className="text-pink-500" fill="currentColor" stroke="none" />
                                </g>
                            </motion.g>
                            {/* Ground moving */}
                            <motion.path
                                d="M0 22 L24 22"
                                strokeDasharray="4 4"
                                animate={{ x: [-4, 0] }}
                                transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
                            />
                        </svg>
                    </motion.div>
                ) : (
                    // Default Rose Bloom
                    <>
                        {/* Center of the rose */}
                        <motion.div
                            className={`absolute top-1/2 left-1/2 ${config.center} bg-gradient-to-br from-rose-400 to-rose-600 rounded-full z-10`}
                            animate={{ scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* Petals - each with different animation delay for blooming effect */}
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <motion.div
                                key={i}
                                className={`absolute top-1/2 left-1/2 ${config.petal} origin-bottom`}
                                style={{
                                    rotate: `${i * 45}deg`,
                                    transformOrigin: 'center bottom'
                                }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: [0, 1, 1, 0],
                                    opacity: [0, 1, 1, 0],
                                    y: [0, -20, -20, 0]
                                }}
                                transition={{
                                    duration: 3,
                                    delay: i * 0.15,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <svg viewBox="0 0 40 56" className="w-full h-full drop-shadow-lg">
                                    <defs>
                                        <linearGradient id={`petalGradient${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#fda4af" />
                                            <stop offset="50%" stopColor="#fb7185" />
                                            <stop offset="100%" stopColor="#f43f5e" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M20 0 C30 10, 40 25, 35 40 C30 50, 25 56, 20 56 C15 56, 10 50, 5 40 C0 25, 10 10, 20 0"
                                        fill={`url(#petalGradient${i})`}
                                    />
                                </svg>
                            </motion.div>
                        ))}

                        {/* Floating particles */}
                        {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={`particle-${i}`}
                                className="absolute w-2 h-2 bg-rose-300 rounded-full"
                                style={{
                                    left: `${20 + i * 15}%`,
                                    top: '50%'
                                }}
                                animate={{
                                    y: [-20, -60, -20],
                                    x: [0, (i % 2 === 0 ? 20 : -20), 0],
                                    opacity: [0, 1, 0],
                                    scale: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 2.5,
                                    delay: i * 0.4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}

                    </>
                )}
            </div>

            {/* Loading text with shimmer effect */}
            {message && (
                <motion.p
                    className="text-gray-600 font-medium"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    {message}
                </motion.p>
            )}

            {/* Submessage */}
            {submessage && (
                <motion.div
                    className="mt-2 text-sm text-rose-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    {submessage}
                </motion.div>
            )}
        </motion.div>
    );
};

export default RoseLoader;
