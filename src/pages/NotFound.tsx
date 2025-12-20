import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StickmanLost } from '../components/StickmanComponents';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-rose-50/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
            >
                <div className="mb-8 flex justify-center">
                    <StickmanLost className="w-64 h-48 text-gray-600" />
                </div>

                <h1 className="text-6xl font-bold text-rose-300 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Are we lost?</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    We can't seem to find the page you're looking for. The map says we should be here, but there are no roses to be found!
                </p>

                <Link to="/">
                    <motion.button
                        className="px-8 py-3 bg-rose-500 text-white rounded-full font-medium shadow-lg hover:bg-rose-600 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Take Us Home
                    </motion.button>
                </Link>
            </motion.div>
        </div>
    );
};

export default NotFound;
