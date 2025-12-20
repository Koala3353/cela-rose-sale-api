import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUserOrders, searchOrder, SheetOrder } from '../services/sheetService';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Toast, { ToastType } from './Toast';

const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<SheetOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [guestOrders, setGuestOrders] = useState<SheetOrder[]>([]);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // Load guest orders from local storage
  React.useEffect(() => {
    if (!user) {
      const loadGuestOrders = async () => {
        setIsGuestLoading(true);
        try {
          const savedIdsStr = localStorage.getItem('guest_tracked_ids');
          if (savedIdsStr) {
            const ids = JSON.parse(savedIdsStr) as string[];
            const uniqueIds = [...new Set(ids)]; // Deduplicate

            const validOrders: SheetOrder[] = [];

            // Limit to last 5 requests to avoid API spam
            const recentIds = uniqueIds.slice(0, 5);

            await Promise.all(recentIds.map(async (id) => {
              try {
                const order = await searchOrder(id);
                if (order) validOrders.push(order);
              } catch (e) {
                console.warn(`Failed to reload guest order ${id}`, e);
              }
            }));

            setGuestOrders(validOrders);
          }
        } catch (error) {
          console.error('Error loading guest orders:', error);
        } finally {
          setIsGuestLoading(false);
        }
      };
      loadGuestOrders();
    } else {
      setGuestOrders([]);
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date not available';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date not available';

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Date not available';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return 'Date not available';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date not available';

      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    } catch (e) {
      return 'Date not available';
    }
  };

  const { data: userOrders, isLoading: isUserOrdersLoading, error } = useQuery<SheetOrder[], Error>({
    queryKey: ['orders', user?.email],
    queryFn: () => fetchUserOrders(user!.email!),
    enabled: !!user,
  });

  const [isSearching, setIsSearching] = useState(false);

  const { signIn } = useAuth();

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const handleGuestSearch = async (orderId: string) => {
    if (!orderId.trim()) return;

    setIsSearching(true);
    try {
      const order = await searchOrder(orderId.trim());
      if (order) {
        setSelectedOrder(order);

        // Save to local storage if not present
        if (!user) {
          const savedIdsStr = localStorage.getItem('guest_tracked_ids');
          const ids = savedIdsStr ? JSON.parse(savedIdsStr) as string[] : [];

          if (!ids.includes(order.orderId)) {
            // Add to start of list
            const newIds = [order.orderId, ...ids];
            localStorage.setItem('guest_tracked_ids', JSON.stringify(newIds));

            // Update local state
            setGuestOrders(prev => {
              // Avoid duplicates in state
              if (prev.some(o => o.orderId === order.orderId)) return prev;
              return [order, ...prev];
            });
          }
        }
      } else {
        showToast('Order not found. Please check the Order ID and try again.', 'error');
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      if (err.code === 'REQUIRES_AUTH') {
        const shouldSignIn = window.confirm(`${err.message}\n\nWould you like to sign in now?`);
        if (shouldSignIn) {
          signIn();
        }
      } else {
        showToast('Failed to search for order. Please check the ID and try again.', 'error');
      }
    } finally {
      setIsSearching(false);
    }
  };



  const orders = user ? userOrders : guestOrders;
  const isLoading = user ? isUserOrdersLoading : isGuestLoading;


  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes('completed') || normalizedStatus.includes('delivered')) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: '✓',
        label: 'Completed'
      };
    }
    if (normalizedStatus.includes('pending')) {
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: '⏳',
        label: 'Pending'
      };
    }
    if (normalizedStatus.includes('process') || normalizedStatus.includes('processing')) {
      let label = status;
      if (normalizedStatus.includes('1st')) {
        label = 'In Process (1st Attempt)';
      } else if (normalizedStatus.includes('2nd')) {
        label = 'In Process (2nd Attempt)';
      }

      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: '📦',
        label: label
      };
    }
    if (normalizedStatus.includes('cancelled') || normalizedStatus.includes('canceled')) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: '✗',
        label: 'Cancelled'
      };
    }
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: '•',
      label: status
    };
  };

  // Parse cart items string into array for display
  const parseCartItems = (cartItemsStr: string): { name: string; quantity: number }[] => {
    if (!cartItemsStr) return [];

    // Split by comma BUT ignore commas inside parentheses (for bundles)
    const items: string[] = [];
    let currentItem = '';
    let parenDepth = 0;

    for (let i = 0; i < cartItemsStr.length; i++) {
      const char = cartItemsStr[i];
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;

      if (char === ',' && parenDepth === 0) {
        items.push(currentItem.trim());
        currentItem = '';
      } else {
        currentItem += char;
      }
    }
    if (currentItem.trim()) items.push(currentItem.trim());

    return items.map(item => {
      const trimmed = item.trim();
      // Robust regex to find the LAST " x[number]" pattern
      const match = trimmed.match(/^(.*)\s+x(\d+)$/);
      if (match) {
        return { name: match[1].trim(), quantity: parseInt(match[2]) };
      }
      return { name: trimmed, quantity: 1 };
    }).filter(item => item.name);
  };

  const filterOptions = [
    'All',
    'Pending',
    'In Process',
    'Failed - 1st Attempt',
    'Failed - 2nd Attempt',
    'Payment Confirmed'
  ];

  const filteredOrders = orders?.filter(order => {
    // Search
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (order.orderId || '').toLowerCase().includes(query) ||
      (order.cartItems || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Status Filter
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Payment Confirmed') return order.paymentConfirmed;

    const status = (order.status || '').toLowerCase();
    if (statusFilter === 'Pending') return status.includes('pending');
    if (statusFilter === 'In Process') return status.includes('process');
    if (statusFilter === 'Failed - 1st Attempt') return status.includes('failed') && status.includes('1st');
    if (statusFilter === 'Failed - 2nd Attempt') return status.includes('failed') && status.includes('2nd');

    return true;
  }) || [];

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-rose-50 to-white pt-24 md:pt-28 pb-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <motion.button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-gray-600 hover:text-rose-600 font-medium transition-colors"
            whileHover={{ x: -5 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shop
          </motion.button>
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <motion.div
            className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-rose-200"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <span className="text-2xl">📋</span>
          </motion.div>
          <motion.h1
            className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Order History
          </motion.h1>
          <motion.p
            className="text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Track all your rose deliveries
          </motion.p>
        </div>

        {/* Loading State - Animated Rose Blooming */}
        {isLoading && (
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Rose Blooming Animation */}
            <div className="relative w-32 h-32 mb-6">
              {/* Center of the rose */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-6 h-6 -ml-3 -mt-3 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full z-10"
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Petals - each with different animation delay for blooming effect */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-10 h-14 -ml-5 origin-bottom"
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
            </div>

            {/* Loading text with shimmer effect */}
            <motion.p
              className="text-gray-600 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading your orders...
            </motion.p>
            <motion.div
              className="mt-2 text-sm text-rose-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              🌹 Gathering your roses
            </motion.div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">There was an error fetching your orders.</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </motion.div>
        )}

        {/* Guest Search State */}
        {!user && !isLoading && (
          <motion.div
            className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 p-8 md:p-12 text-center border border-rose-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 bg-rose-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Track Your Order</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Guests can track their order status here. If you're an Ateneo student, please sign in to see your full history.
            </p>

            {/* Guest Search Form */}
            <div className="max-w-md mx-auto mb-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('orderId') as HTMLInputElement;
                  if (input.value) {
                    handleGuestSearch(input.value);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  name="orderId"
                  type="text"
                  placeholder="Enter Order ID (e.g., ORD-ABC123456)"
                  className="flex-1 px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Track'}
                </button>
              </form>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <motion.button
              onClick={() => navigate('/')}
              className="mt-4 text-rose-600 font-semibold hover:text-rose-700 hover:underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In with Google
            </motion.button>
          </motion.div>
        )}

        {/* Empty State */}
        {orders && orders.length === 0 && (
          <motion.div
            className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 p-12 text-center border border-rose-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 bg-rose-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <span className="text-4xl">🌹</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet. Start shopping to spread some love!</p>
            <motion.button
              onClick={() => navigate('/shop')}
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold shadow-lg shadow-rose-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Roses
            </motion.button>
          </motion.div>
        )}

        {/* Orders List */}
        {orders && orders.length > 0 && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Order ID or items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-rose-100 focus:border-rose-300 focus:ring focus:ring-rose-200 focus:ring-opacity-50 outline-none transition-all bg-white/80 shadow-sm"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${statusFilter === filter
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                      : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-100'
                      }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* No Results State */}
            {filteredOrders.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 bg-white rounded-3xl border border-rose-100 shadow-sm"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-medium text-gray-800">No orders found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                  className="mt-4 text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}

            <AnimatePresence>
              {filteredOrders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                const cartItems = parseCartItems(order.cartItems);
                return (
                  <motion.div
                    key={order.orderId}
                    className="bg-white rounded-3xl shadow-lg shadow-rose-100/50 overflow-hidden border border-rose-100"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    {/* Order Header */}
                    <div className="p-6 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-gray-800">Order #{order.orderId}</h3>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                              <span>{statusConfig.icon}</span>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(order.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                            ₱{order.total.toFixed(2)}
                          </p>
                          {order.payment > 0 && order.paymentConfirmed && (
                            <p className="text-sm text-green-600 mt-1 flex items-center justify-end gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Paid: ₱{order.payment.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-6">
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Items Ordered</h4>
                      <div className="space-y-3">
                        {cartItems.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-4 p-3 bg-rose-50/50 rounded-xl">
                            <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">🌹</span>
                            </div>
                            <div className="flex-grow">
                              <p className="font-medium text-gray-800">{item.name}</p>
                              <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Delivery Info */}
                      {(order.venue1 || order.venue2) && (
                        <div className="mt-6 pt-4 border-t border-rose-100">
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Delivery Details</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            {order.venue1 && (
                              <div className="p-3 bg-rose-50/50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Delivery Option 1</p>
                                <p className="font-medium text-gray-800">{order.venue1}</p>
                                <p className="text-sm text-gray-600">
                                  {order.deliveryDate1} at {order.time1}
                                  {order.room1 && ` • Room ${order.room1}`}
                                </p>
                              </div>
                            )}
                            {order.venue2 && (
                              <div className="p-3 bg-rose-50/50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Delivery Option 2</p>
                                <p className="font-medium text-gray-800">{order.venue2}</p>
                                <p className="text-sm text-gray-600">
                                  {order.deliveryDate2} at {order.time2}
                                  {order.room2 && ` • Room ${order.room2}`}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Recipient Info */}
                      {order.recipientName && (
                        <div className="mt-4 pt-4 border-t border-rose-100">
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Recipient</h4>
                          <p className="font-medium text-gray-800">
                            {order.anonymous ? '(Anonymous)' : ''} {order.recipientName}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-rose-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {order.paymentConfirmed ? (
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Payment Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Order Confirmed</span>
                          </div>
                        )}
                      </div>
                      <motion.button
                        onClick={() => setSelectedOrder(order)}
                        className="text-rose-600 hover:text-rose-700 font-medium text-sm flex items-center gap-1"
                        whileHover={{ x: 5 }}
                      >
                        View Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
            >
              <motion.div
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Order #{selectedOrder.orderId}</h2>
                      <p className="text-rose-100 text-sm mt-1">
                        {formatDateTime(selectedOrder.timestamp)}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setSelectedOrder(null)}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white`}>
                      <span>{getStatusConfig(selectedOrder.status).icon}</span>
                      {getStatusConfig(selectedOrder.status).label || selectedOrder.status || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Purchaser Details */}
                  <div className="bg-rose-50/50 rounded-2xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-sm">👤</span>
                      Purchaser Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-medium text-gray-800">{selectedOrder.purchaserName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Student ID</p>
                        <p className="font-medium text-gray-800">{selectedOrder.studentId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium text-gray-800">{selectedOrder.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Contact Number</p>
                        <p className="font-medium text-gray-800">{selectedOrder.contactNumber}</p>
                      </div>
                      {selectedOrder.facebookLink && (
                        <div className="md:col-span-2">
                          <p className="text-gray-500">Facebook</p>
                          <a
                            href={selectedOrder.facebookLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-rose-600 hover:text-rose-700 underline break-all"
                          >
                            {selectedOrder.facebookLink}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recipient Details */}
                  {selectedOrder.recipientName && (
                    <div className="bg-pink-50/50 rounded-2xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-sm">🎁</span>
                        Recipient Details
                        {selectedOrder.anonymous && (
                          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Anonymous</span>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Name</p>
                          <p className="font-medium text-gray-800">{selectedOrder.recipientName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Contact Number</p>
                          <p className="font-medium text-gray-800">{selectedOrder.recipientContact || 'N/A'}</p>
                        </div>
                        {selectedOrder.recipientFbLink && (
                          <div className="md:col-span-2">
                            <p className="text-gray-500">Facebook</p>
                            <a
                              href={selectedOrder.recipientFbLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-rose-600 hover:text-rose-700 underline break-all"
                            >
                              {selectedOrder.recipientFbLink}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Options */}
                  {(selectedOrder.venue1 || selectedOrder.venue2) && (
                    <div className="bg-blue-50/50 rounded-2xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">🚚</span>
                        Delivery Options
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedOrder.venue1 && (
                          <div className="bg-white rounded-xl p-3 border border-blue-100">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center">1</span>
                              First Choice
                            </p>
                            <p className="font-medium text-gray-800">{selectedOrder.venue1}</p>
                            <p className="text-sm text-gray-600">
                              {selectedOrder.deliveryDate1} at {selectedOrder.time1}
                            </p>
                            {selectedOrder.room1 && (
                              <p className="text-sm text-gray-500">Room: {selectedOrder.room1}</p>
                            )}
                          </div>
                        )}
                        {selectedOrder.venue2 && (
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <span className="w-5 h-5 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
                              Second Choice
                            </p>
                            <p className="font-medium text-gray-800">{selectedOrder.venue2}</p>
                            <p className="text-sm text-gray-600">
                              {selectedOrder.deliveryDate2} at {selectedOrder.time2}
                            </p>
                            {selectedOrder.room2 && (
                              <p className="text-sm text-gray-500">Room: {selectedOrder.room2}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="bg-amber-50/50 rounded-2xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm">🌹</span>
                      Items Ordered
                    </h3>
                    <div className="space-y-2">
                      {parseCartItems(selectedOrder.cartItems).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <span>🌹</span>
                            </div>
                            <span className="font-medium text-gray-800">{item.name}</span>
                          </div>
                          <span className="text-gray-600">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {selectedOrder.bundleDetails && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-amber-100">
                        <p className="text-sm text-gray-500">Bundle Details</p>
                        <p className="text-gray-800">{selectedOrder.bundleDetails}</p>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  {(selectedOrder.msgRecipient || selectedOrder.msgBeneficiary || selectedOrder.notes) && (
                    <div className="bg-purple-50/50 rounded-2xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm">💌</span>
                        Messages & Notes
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.msgRecipient && (
                          <div className="bg-white rounded-xl p-3 border border-purple-100">
                            <p className="text-xs text-gray-500 mb-1">Message for Recipient</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{selectedOrder.msgRecipient}</p>
                          </div>
                        )}
                        {selectedOrder.msgBeneficiary && (
                          <div className="bg-white rounded-xl p-3 border border-purple-100">
                            <p className="text-xs text-gray-500 mb-1">Message for Beneficiary</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{selectedOrder.msgBeneficiary}</p>
                          </div>
                        )}
                        {selectedOrder.notes && (
                          <div className="bg-white rounded-xl p-3 border border-purple-100">
                            <p className="text-xs text-gray-500 mb-1">Special Requests / Notes</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{selectedOrder.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advocacy Donation */}
                  {selectedOrder.advocacyDonation > 0 && (
                    <div className="bg-green-50/50 rounded-2xl p-4">
                      <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">💚</span>
                        Advocacy Donation
                      </h3>
                      <p className="text-gray-600">
                        {selectedOrder.advocacyDonation} rose(s) donated = ₱{(selectedOrder.advocacyDonation * 80).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Order Total & Payment */}
                  <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Order Total</span>
                      <span className="text-2xl font-bold">₱{selectedOrder.total.toFixed(2)}</span>
                    </div>
                    {selectedOrder.payment > 0 && selectedOrder.paymentConfirmed && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/30">
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Payment Received
                        </span>
                        <span className="font-bold">₱{selectedOrder.payment.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Dove */}
                  {selectedOrder.assignedDoveEmail && (
                    <div className="text-center text-sm text-gray-500">
                      <p>Assigned Dove: {selectedOrder.assignedDoveEmail}</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-3xl border-t border-gray-100">
                  <motion.button
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold shadow-lg shadow-rose-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Toast Notification */}
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      </div>
    </motion.div>
  );
};

export default OrderHistory;