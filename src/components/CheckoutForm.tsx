import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { submitOrder } from '../services/sheetService';
import { motion, AnimatePresence } from 'framer-motion';
import { DeliveryVenue } from '../types';

interface CheckoutFormProps {
  onBack: () => void;
}

type DeliveryType = 'deliver' | 'pickup';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

const ADD_ONS: AddOn[] = [
  { id: 'card-heart', name: "Valentine's Day Card Rose Heart", price: 20 },
  { id: 'card-ribbon', name: "Valentine's Day Card Rose Ribbon", price: 20 },
  { id: 'card-tulip', name: "Valentine's Day Card Tulip", price: 20 },
];

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onBack }) => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  // ... (existing state) ...

  const [email, setEmail] = useState(user?.email || '');
  const [purchaserName, setPurchaserName] = useState(user?.name || '');
  // Purchaser Details
  const [studentId, setStudentId] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [contactNumberError, setContactNumberError] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [facebookLinkError, setFacebookLinkError] = useState('');

  // Delivery Type
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('deliver');
  const [pickupDate, setPickupDate] = useState('');

  // Recipient Details
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientContactError, setRecipientContactError] = useState('');
  const [recipientFbLink, setRecipientFbLink] = useState('');
  const [recipientFbLinkError, setRecipientFbLinkError] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  // Delivery Choice 1
  const [deliveryDate1, setDeliveryDate1] = useState('');
  const [venue1, setVenue1] = useState('');
  const [room1, setRoom1] = useState('');
  const [time1, setTime1] = useState('');

  // Delivery Choice 2
  const [deliveryDate2, setDeliveryDate2] = useState('');
  const [venue2, setVenue2] = useState('');
  const [room2, setRoom2] = useState('');
  const [time2, setTime2] = useState('');

  // Payment & Messages
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState('');
  const [advocacyDonation, setAdvocacyDonation] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [messageForRecipient, setMessageForRecipient] = useState('');
  const [messageForBeneficiary, setMessageForBeneficiary] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Form State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  // 8MB in bytes
  const MAX_FILE_SIZE = 8 * 1024 * 1024;

  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setPaymentProofError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is 8MB.`);
        setPaymentProof(null);
        e.target.value = ''; // Reset the input
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setPaymentProofError('Invalid file type. Please upload a JPG or PNG image.');
        setPaymentProof(null);
        e.target.value = '';
        return;
      }

      setPaymentProofError('');
      setPaymentProof(file);
    } else {
      setPaymentProof(null);
    }
  };

  // Calculate fees
  const deliveryFee = deliveryType === 'deliver' ? 20 : 0;

  const addonsTotal = selectedAddons.reduce((acc, id) => {
    const addon = ADD_ONS.find(a => a.id === id);
    return acc + (addon?.price || 0);
  }, 0);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0) + (advocacyDonation * 80) + addonsTotal + deliveryFee;

  // ... (rest of component code until rendering total) ...



  // Update email when user logs in
  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.name) setPurchaserName(user.name);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setStudentId('000000');
    }
  }, [user]);

  // Load saved details from localStorage on mount
  useEffect(() => {
    try {
      const savedDetails = localStorage.getItem('rose_sale_checkout_details');
      if (savedDetails) {
        const parsed = JSON.parse(savedDetails);
        // Prioritize saved data for fields not controlled by auth
        if (parsed.studentId) setStudentId(parsed.studentId);
        if (parsed.contactNumber) setContactNumber(parsed.contactNumber);
        if (parsed.facebookLink) setFacebookLink(parsed.facebookLink);

        // For name/email, only set if empty (to avoid overriding auth)
        if (parsed.purchaserName && !purchaserName) setPurchaserName(parsed.purchaserName);
        if (parsed.email && !email) setEmail(parsed.email);
      }
    } catch (error) {
      console.warn('Failed to load checkout details:', error);
    }
  }, []);

  // Save specific details to localStorage when they change
  useEffect(() => {
    const details = {
      purchaserName,
      email,
      studentId,
      contactNumber,
      facebookLink
    };
    // Debounce or just save (localStorage is sync and fast enough for text content)
    localStorage.setItem('rose_sale_checkout_details', JSON.stringify(details));
  }, [purchaserName, email, studentId, contactNumber, facebookLink]);

  // Validate Student ID (6 digits, 200000-260000)
  const validateStudentId = (value: string): boolean => {
    // Allow default guest ID
    if (value === '000000') {
      setStudentIdError('');
      return true;
    }

    const numValue = parseInt(value, 10);
    if (!/^\d{6}$/.test(value)) {
      setStudentIdError('Student ID must be 6 digits');
      return false;
    }
    if (numValue < 200000 || numValue > 260000) {
      setStudentIdError('Invalid ID (must be between 200000-260000)');
      return false;
    }
    setStudentIdError('');
    return true;
  };

  // Format phone number as xxxx xxx xxxx
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  };

  // Validate phone number format
  const validatePhoneNumber = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11;
  };

  // Validate Facebook URL
  const validateFacebookUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase().trim();
    return lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com');
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setContactNumber(formatted);
    if (formatted && !validatePhoneNumber(formatted)) {
      setContactNumberError('Phone number must be 11 digits (xxxx xxx xxxx)');
    } else {
      setContactNumberError('');
    }
  };

  const handleRecipientContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setRecipientContact(formatted);
    if (formatted && !validatePhoneNumber(formatted)) {
      setRecipientContactError('Phone number must be 11 digits (xxxx xxx xxxx)');
    } else {
      setRecipientContactError('');
    }
  };

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setStudentId(value);
    if (value.length === 6) {
      validateStudentId(value);
    } else {
      setStudentIdError('');
    }
  };

  // Validate delivery dates (1st must be before 2nd)
  const validateDeliveryDates = (): boolean => {
    if (!deliveryDate1 || !time1 || !deliveryDate2 || !time2) return true;

    const date1 = new Date(`${deliveryDate1}T${time1}`);
    const date2 = new Date(`${deliveryDate2}T${time2}`);

    if (date1 >= date2) {
      setError('First delivery option must be before the second delivery option');
      return false;
    }
    return true;
  };

  // Comprehensive step validation
  const validateCurrentStep = (): boolean => {
    setError('');

    if (currentStep === 1) {
      // Validate purchaser details
      if (!email.trim()) {
        setError('Please enter your email address');
        return false;
      }
      if (!purchaserName.trim()) {
        setError('Please enter your full name');
        return false;
      }
      if (!studentId.trim() || !validateStudentId(studentId)) {
        if (!studentIdError) setStudentIdError('Student ID must be 6 digits');
        setError('Please enter a valid student ID');
        return false;
      }
      if (!contactNumber.trim() || !validatePhoneNumber(contactNumber)) {
        setContactNumberError('Phone number must be 11 digits (xxxx xxx xxxx)');
        setError('Please enter a valid contact number');
        return false;
      }
      if (!facebookLink.trim()) {
        setFacebookLinkError('Please enter your Facebook link');
        setError('Please enter your Facebook link');
        return false;
      }
      if (!validateFacebookUrl(facebookLink)) {
        setFacebookLinkError('Please enter a valid Facebook URL (must contain facebook.com or fb.com)');
        setError('Please enter a valid Facebook URL');
        return false;
      }
      setFacebookLinkError('');
      return true;
    }

    if (currentStep === 2) {
      if (deliveryType === 'pickup') {
        // Validate pickup details
        if (!pickupDate) {
          setError('Please select a pickup date');
          return false;
        }
      } else {
        // Validate recipient details
        if (!recipientName.trim()) {
          setError('Please enter the recipient\'s name');
          return false;
        }
        if (!recipientContact.trim() || !validatePhoneNumber(recipientContact)) {
          setRecipientContactError('Phone number must be 11 digits (xxxx xxx xxxx)');
          setError('Please enter a valid recipient contact number');
          return false;
        }
        if (!recipientFbLink.trim()) {
          setRecipientFbLinkError('Please enter the recipient\'s Facebook link');
          setError('Please enter the recipient\'s Facebook link');
          return false;
        }
        if (!validateFacebookUrl(recipientFbLink)) {
          setRecipientFbLinkError('Please enter a valid Facebook URL (must contain facebook.com or fb.com)');
          setError('Please enter a valid Facebook URL for the recipient');
          return false;
        }
        setRecipientFbLinkError('');
      }
      return true;
    }

    if (currentStep === 3 && deliveryType === 'deliver') {
      // Validate delivery details
      if (!deliveryDate1) {
        setError('Please select the first delivery date');
        return false;
      }
      if (!time1) {
        setError('Please select the first delivery time');
        return false;
      }
      if (!venue1) {
        setError('Please select the first delivery venue');
        return false;
      }
      if (!room1.trim()) {
        setError('Please enter the first room number');
        return false;
      }
      if (!deliveryDate2) {
        setError('Please select the second delivery date');
        return false;
      }
      if (!time2) {
        setError('Please select the second delivery time');
        return false;
      }
      if (!venue2) {
        setError('Please select the second delivery venue');
        return false;
      }
      if (!room2.trim()) {
        setError('Please enter the second room number');
        return false;
      }
      if (!validateDeliveryDates()) {
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit triggered');
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    if (cart.length === 0) {
      console.log('Validation failed: Cart empty');
      setError('Your cart is empty.');
      setIsSubmitting(false);
      return;
    }

    if (!validateStudentId(studentId)) {
      console.log('Validation failed: Student ID');
      setStudentIdError('Please enter a valid Student ID');
      setCurrentStep(1);
      setIsSubmitting(false);
      return;
    }

    if (!validatePhoneNumber(contactNumber)) {
      console.log('Validation failed: Contact Number');
      setContactNumberError('Phone number must be 11 digits (xxxx xxx xxxx)');
      setCurrentStep(1);
      setIsSubmitting(false);
      return;
    }

    if (deliveryType === 'deliver' && !validatePhoneNumber(recipientContact)) {
      console.log('Validation failed: Recipient Contact');
      setRecipientContactError('Phone number must be 11 digits (xxxx xxx xxxx)');
      setCurrentStep(2);
      setIsSubmitting(false);
      return;
    }

    if (deliveryType === 'deliver' && !validateDeliveryDates()) {
      console.log('Validation failed: Delivery Dates');
      setCurrentStep(3);
      setIsSubmitting(false);
      return;
    }

    if (!paymentProof) {
      console.log('Validation failed: Missing Payment Proof');
      setError('Please upload proof of payment.');
      setIsSubmitting(false);
      return;
    }

    const orderData = {
      email,
      purchaserName,
      studentId,
      contactNumber,
      facebookLink,
      deliveryType,
      pickupDate: deliveryType === 'pickup' ? pickupDate : '',
      recipientName: deliveryType === 'deliver' ? recipientName : '',
      recipientContact: deliveryType === 'deliver' ? recipientContact : '',
      recipientFbLink: deliveryType === 'deliver' ? recipientFbLink : '',
      anonymous: deliveryType === 'deliver' ? anonymous : false,
      deliveryDate1: deliveryType === 'deliver' ? deliveryDate1 : '',
      venue1: deliveryType === 'deliver' ? venue1 : '',
      room1: deliveryType === 'deliver' ? room1 : '',
      time1: deliveryType === 'deliver' ? time1 : '',
      deliveryDate2: deliveryType === 'deliver' ? deliveryDate2 : '',
      venue2: deliveryType === 'deliver' ? venue2 : '',
      room2: deliveryType === 'deliver' ? room2 : '',
      time2: deliveryType === 'deliver' ? time2 : '',
      advocacyDonation,
      msgRecipient: selectedAddons.length > 0 ? messageForRecipient : '',
      msgBeneficiary: '', // Field removed from UI per user request
      notes: specialRequests,
      items: cart,
      cartItems: [
        ...cart.map(item => {
          let details = '';
          if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
            // Prioritize the pre-formatted bundle details string if available
            if (item.selectedOptions['bundle-details']) {
              details = ` (${item.selectedOptions['bundle-details']})`;
            } else {
              // Fallback for simple options not using the new configurator
              details = ` (${Object.values(item.selectedOptions).join(', ')})`;
            }
          }
          return `${item.name}${details} x${item.quantity}`;
        }),
        ...selectedAddons
          .filter(id => !(id === 'service-delivery' && deliveryType !== 'deliver'))
          .map(id => {
            const addon = ADD_ONS.find(a => a.id === id);
            return addon ? `${addon.name} x1` : '';
          })
      ].filter(Boolean).join(', '),
      bundleDetails: cart
        .filter(item => item.selectedOptions && Object.keys(item.selectedOptions).length > 0)
        .map(item => {
          // Keep this field for backward compatibility/extra column, but use same logic
          if (item.selectedOptions?.['bundle-details']) {
            return `${item.name}: [${item.selectedOptions['bundle-details']}]`;
          }
          const options = Object.values(item.selectedOptions || {}).join(', ');
          return `${item.name}: [${options}]`;
        })
        .join('; '),
      total,
    };

    try {
      const orderId = await submitOrder(orderData, paymentProof);
      if (orderId) {
        setSubmittedOrderId(orderId);
        setSuccess(true);
        clearCart();
      } else {
        setError('There was an error submitting your order. Please try again.');
      }
    } catch (err) {
      setError('There was an error submitting your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SVG Icon Components
  const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const GiftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );

  const TruckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );

  const EnvelopeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const CreditCardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  const PackageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  const RoseIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" />
    </svg>
  );

  const LightbulbIcon = () => (
    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const getStepIcon = (iconType: string, isSmall = false) => {
    const sizeClass = isSmall ? "w-4 h-4" : "w-5 h-5";
    switch (iconType) {
      case 'user':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'gift':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>;
      case 'truck':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>;
      case 'envelope':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
      case 'card':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'package':
        return <svg className={sizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
      case 'rose':
        return <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" /></svg>;
      default:
        return null;
    }
  };

  const steps = deliveryType === 'deliver'
    ? [
      { id: 1, name: 'Your Details', icon: 'user' },
      { id: 2, name: 'Recipient', icon: 'gift' },
      { id: 3, name: 'Delivery', icon: 'truck' },
      { id: 4, name: 'Messages', icon: 'envelope' },
      { id: 5, name: 'Payment', icon: 'card' },
    ]
    : [
      { id: 1, name: 'Your Details', icon: 'user' },
      { id: 2, name: 'Pickup', icon: 'package' },
      { id: 3, name: 'Messages', icon: 'envelope' },
      { id: 4, name: 'Payment', icon: 'card' },
    ];

  const totalSteps = steps.length;

  const inputClass = "w-full px-4 py-3 bg-white border-2 border-rose-100 rounded-xl focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all duration-300 text-gray-800 placeholder-gray-400";
  const inputErrorClass = "w-full px-4 py-3 bg-white border-2 border-red-300 rounded-xl focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all duration-300 text-gray-800 placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const errorTextClass = "text-red-500 text-sm mt-1";

  const venueOptions = Object.entries(DeliveryVenue).map(([key, value]) => ({
    key,
    value
  }));

  if (success) {
    return (
      <motion.div
        className="min-h-[70vh] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >

        <div className="max-w-md w-full text-center relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center mb-8 shadow-lg shadow-green-200"
          >
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
            </svg>
          </motion.div>

          <motion.h2
            className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Order Confirmed!
            <svg className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" />
            </svg>
          </motion.h2>

          {submittedOrderId && (
            <motion.div
              className="mb-6 p-4 bg-rose-50 rounded-xl border border-rose-100 inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-sm text-gray-500 mb-1">Your Order ID:</p>
              <p className="text-2xl font-mono font-bold text-rose-600 select-all">
                {submittedOrderId}
              </p>
              <p className="text-xs text-gray-400 mt-2">Please save this ID to track your order.</p>
            </motion.div>
          )}

          <motion.p
            className="text-gray-600 text-lg mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Thank you for your purchase! Your roses will be delivered with love.
          </motion.p>

          <div className="relative inline-block">
            <motion.button
              ref={buttonRef}
              onClick={onBack}
              className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold text-lg shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300 relative z-20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Continue Shopping
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-rose-50 to-white pt-24 md:pt-28 pb-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Checkout
          </motion.h1>
          <p className="text-gray-600">Complete your order in just a few steps</p>
        </div>

        <div className="max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl my-10 relative overflow-hidden">

          {!user && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-amber-800 font-bold text-sm mb-1">Checking out as Guest</h4>
                <p className="text-amber-700 text-sm">
                  If you are an Ateneo student, please sign in with Google.
                  Guests must ensure all details (Email, Name) are 100% accurate as we cannot verify them automatically.
                </p>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex justify-between items-center relative min-w-max">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-rose-100 -translate-y-1/2 z-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {steps.map((step) => (
                <motion.button
                  key={step.id}
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={`relative z-10 flex flex-col items-center px-2 ${step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  whileHover={step.id <= currentStep ? { scale: 1.1 } : {}}
                  whileTap={step.id <= currentStep ? { scale: 0.95 } : {}}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${step.id === currentStep
                    ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200'
                    : step.id < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-white border-2 border-rose-200 text-gray-400'
                    }`}>
                    {step.id < currentStep ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : getStepIcon(step.icon)}
                  </div>
                  <span className={`mt-2 text-xs md:text-sm font-medium whitespace-nowrap ${step.id === currentStep ? 'text-rose-600' : 'text-gray-500'
                    }`}>
                    {step.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-3">
              <motion.div
                className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 p-6 md:p-8 border border-rose-100"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {error && (
                  <motion.div
                    className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {/* Step 1: Purchaser Details */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Your Details</h3>
                        </div>

                        <div>
                          <label className={labelClass}>Email Address</label>
                          <input
                            type="email"
                            placeholder="your.email@student.ateneo.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Purchaser's Full Name</label>
                          <input
                            type="text"
                            placeholder="Enter your full name"
                            value={purchaserName}
                            onChange={(e) => setPurchaserName(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ID Number {!user && <span className="text-gray-400 font-normal">(Default for Guest)</span>}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={studentId}
                            onChange={(e) => {
                              if (!user) return; // Prevent editing as guest
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 6) {
                                setStudentId(val);
                                if (val.length > 0 && val.length !== 6) {
                                  setStudentIdError('ID Number must be 6 digits');
                                } else {
                                  setStudentIdError('');
                                }
                              }
                            }}
                            disabled={!user}
                            className={`input-field w-full ${!user ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} ${studentIdError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
                            placeholder="123456"
                          />
                          {studentIdError && (
                            <p className="text-red-500 text-xs mt-1">{studentIdError}</p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>Purchaser's Contact Number</label>
                          <input
                            type="tel"
                            placeholder="0917 123 4567"
                            value={contactNumber}
                            onChange={handleContactNumberChange}
                            required
                            className={contactNumberError ? inputErrorClass : inputClass}
                          />
                          {contactNumberError && <p className={errorTextClass}>{contactNumberError}</p>}
                        </div>

                        <div>
                          <label className={labelClass}>Purchaser's Facebook Link</label>
                          <input
                            type="url"
                            placeholder="https://www.facebook.com/yourprofile"
                            value={facebookLink}
                            onChange={(e) => {
                              setFacebookLink(e.target.value);
                              if (e.target.value && !validateFacebookUrl(e.target.value)) {
                                setFacebookLinkError('URL must contain facebook.com or fb.com');
                              } else {
                                setFacebookLinkError('');
                              }
                            }}
                            required
                            className={facebookLinkError ? inputErrorClass : inputClass}
                          />
                          {facebookLinkError && <p className={errorTextClass}>{facebookLinkError}</p>}
                        </div>

                        <div>
                          <label className={labelClass}>I would like to...</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setDeliveryType('deliver')}
                              className={`p-4 rounded-xl border-2 transition-all duration-300 ${deliveryType === 'deliver'
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-rose-100 bg-white text-gray-600 hover:border-rose-300'
                                }`}
                            >
                              <span className="mb-2 block">
                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                              </span>
                              <span className="font-medium">Have it delivered</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryType('pickup')}
                              className={`p-4 rounded-xl border-2 transition-all duration-300 ${deliveryType === 'pickup'
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-rose-100 bg-white text-gray-600 hover:border-rose-300'
                                }`}
                            >
                              <span className="mb-2 block">
                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </span>
                              <span className="font-medium">Pick it up myself</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2 for Pickup */}
                    {deliveryType === 'pickup' && currentStep === 2 && (
                      <motion.div
                        key="step2-pickup"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Pickup Details</h3>
                        </div>

                        <div>
                          <label className={labelClass}>When will the order be picked up?</label>
                          <input
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            required
                            className={inputClass}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-rose-600 inline-flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Note:
                            </span> You will be notified about the pickup location and time via email.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2 for Delivery: Recipient Details */}
                    {deliveryType === 'deliver' && currentStep === 2 && (
                      <motion.div
                        key="step2-deliver"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Recipient Details</h3>
                        </div>

                        <div>
                          <label className={labelClass}>Recipient's Full Name</label>
                          <input
                            type="text"
                            placeholder="Who will receive the roses?"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            required
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Recipient's Contact Number</label>
                          <input
                            type="tel"
                            placeholder="0917 123 4567"
                            value={recipientContact}
                            onChange={handleRecipientContactChange}
                            required
                            className={recipientContactError ? inputErrorClass : inputClass}
                          />
                          {recipientContactError && <p className={errorTextClass}>{recipientContactError}</p>}
                        </div>

                        <div>
                          <label className={labelClass}>Recipient's Facebook Link</label>
                          <input
                            type="url"
                            placeholder="https://www.facebook.com/recipientprofile"
                            value={recipientFbLink}
                            onChange={(e) => {
                              setRecipientFbLink(e.target.value);
                              if (e.target.value && !validateFacebookUrl(e.target.value)) {
                                setRecipientFbLinkError('URL must contain facebook.com or fb.com');
                              } else {
                                setRecipientFbLinkError('');
                              }
                            }}
                            required
                            className={recipientFbLinkError ? inputErrorClass : inputClass}
                          />
                          {recipientFbLinkError && <p className={errorTextClass}>{recipientFbLinkError}</p>}
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
                          <input
                            type="checkbox"
                            id="anonymous"
                            checked={anonymous}
                            onChange={(e) => setAnonymous(e.target.checked)}
                            className="w-5 h-5 text-rose-500 rounded border-rose-300 focus:ring-rose-500"
                          />
                          <label htmlFor="anonymous" className="text-gray-700 cursor-pointer">
                            <span className="font-medium">Anonymous Delivery?</span>
                            <p className="text-sm text-gray-500">The recipient won't know who sent the roses</p>
                          </label>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3 for Delivery: Delivery Details */}
                    {deliveryType === 'deliver' && currentStep === 3 && (
                      <motion.div
                        key="step3-deliver"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Delivery Details</h3>
                        </div>

                        {/* First Choice */}
                        <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-rose-500 text-white rounded-full text-sm flex items-center justify-center">1</span>
                            First Choice (Preferred)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Delivery Date</label>
                              <input
                                type="date"
                                value={deliveryDate1}
                                onChange={(e) => setDeliveryDate1(e.target.value)}
                                required
                                className={inputClass}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Delivery Time</label>
                              <input
                                type="time"
                                value={time1}
                                onChange={(e) => setTime1(e.target.value)}
                                required
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Venue</label>
                              <select
                                value={venue1}
                                onChange={(e) => setVenue1(e.target.value)}
                                required
                                className={inputClass}
                              >
                                <option value="">Select venue...</option>
                                {venueOptions.map((venue) => (
                                  <option key={venue.key} value={venue.value}>
                                    {venue.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Room Number</label>
                              <input
                                type="text"
                                placeholder="e.g., 301"
                                value={room1}
                                onChange={(e) => setRoom1(e.target.value)}
                                required
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Second Choice */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-500 text-white rounded-full text-sm flex items-center justify-center">2</span>
                            Second Choice (Backup)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Delivery Date</label>
                              <input
                                type="date"
                                value={deliveryDate2}
                                onChange={(e) => setDeliveryDate2(e.target.value)}
                                required
                                className={inputClass}
                                min={deliveryDate1 || new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Delivery Time</label>
                              <input
                                type="time"
                                value={time2}
                                onChange={(e) => setTime2(e.target.value)}
                                required
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Venue</label>
                              <select
                                value={venue2}
                                onChange={(e) => setVenue2(e.target.value)}
                                required
                                className={inputClass}
                              >
                                <option value="">Select venue...</option>
                                {venueOptions.map((venue) => (
                                  <option key={venue.key} value={venue.value}>
                                    {venue.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Room Number</label>
                              <input
                                type="text"
                                placeholder="e.g., 202"
                                value={room2}
                                onChange={(e) => setRoom2(e.target.value)}
                                required
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-rose-600 inline-flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Tip:
                            </span> The first option must be earlier than the second option. Provide a backup in case the recipient is unavailable.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Messages Step */}
                    {((deliveryType === 'deliver' && currentStep === 4) || (deliveryType === 'pickup' && currentStep === 3)) && (
                      <motion.div
                        key="step-messages"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Messages & Donations</h3>
                        </div>

                        <div>
                          <label className={labelClass}>How many advocacy roses will you be donating to our beneficiaries?</label>
                          <div className="flex items-center gap-4">
                            <input
                              type="number"
                              min="0"
                              value={advocacyDonation}
                              onChange={(e) => setAdvocacyDonation(Math.max(0, parseInt(e.target.value) || 0))}
                              className={`${inputClass} w-32`}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Each advocacy rose costs ₱80</p>
                        </div>

                        <div>
                          <label className={labelClass}>Add-ons</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                            {ADD_ONS.filter(addon => {
                              // Hide delivery service if pickup is selected
                              if (addon.id === 'service-delivery' && deliveryType !== 'deliver') return false;
                              return true;
                            }).map((addon) => (
                              <div
                                key={addon.id}
                                onClick={() => {
                                  setSelectedAddons(prev =>
                                    prev.includes(addon.id)
                                      ? prev.filter(id => id !== addon.id)
                                      : [...prev, addon.id]
                                  );
                                }}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${selectedAddons.includes(addon.id)
                                  ? 'border-rose-500 bg-rose-50'
                                  : 'border-rose-100 bg-white hover:border-rose-300'
                                  }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-800 text-sm">{addon.name}</span>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedAddons.includes(addon.id)
                                    ? 'bg-rose-500 border-rose-500'
                                    : 'border-gray-300 bg-white'
                                    }`}>
                                    {selectedAddons.includes(addon.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <p className="text-rose-600 font-semibold">₱{addon.price}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500">Select an add-on card to include a personal message!</p>
                        </div>



                        {selectedAddons.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <label className={labelClass}>Letter/Message for Recipient</label>
                            <textarea
                              placeholder="Write a sweet message for the recipient..."
                              value={messageForRecipient}
                              onChange={(e) => setMessageForRecipient(e.target.value)}
                              rows={4}
                              className={`${inputClass} resize-none`}
                            />
                          </motion.div>
                        )}

                        <div>
                          <label className={labelClass}>Other Notes and Concerns/Special Request</label>
                          <textarea
                            placeholder="e.g., lego flower built, specific delivery instructions..."
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            rows={3}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Payment Step */}
                    {((deliveryType === 'deliver' && currentStep === 5) || (deliveryType === 'pickup' && currentStep === 4)) && (
                      <motion.div
                        key="step-payment"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-800">Payment</h3>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl text-white">
                          <p className="text-sm opacity-80 mb-1">Transfer to</p>
                          <p className="text-2xl font-bold mb-4">GCash: 0917 XXX XXXX</p>
                          <p className="text-sm opacity-80">Amount: <span className="font-bold text-lg">₱{total.toFixed(2)}</span></p>
                        </div>

                        <div>
                          <label className={labelClass}>Upload Proof of Payment (Max 8MB)</label>
                          <div className="relative">
                            <input
                              type="file"
                              onChange={handlePaymentProofChange}
                              required
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              accept=".jpg,.jpeg,.png"
                            />
                            <div className={`${inputClass} flex items-center justify-center gap-3 border-dashed cursor-pointer hover:border-rose-400 hover:bg-rose-50 ${paymentProofError ? 'border-red-300 bg-red-50' : ''}`}>
                              {paymentProof ? (
                                <>
                                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-gray-700">{paymentProof.name}</span>
                                  <span className="text-xs text-gray-500">({(paymentProof.size / 1024 / 1024).toFixed(1)}MB)</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-gray-500">Click to upload payment screenshot</span>
                                </>
                              )}
                            </div>
                          </div>
                          {paymentProofError && (
                            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {paymentProofError}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center mt-8 pt-6 border-t border-rose-100">
                    <button
                      type="button"
                      onClick={() => currentStep === 1 ? onBack() : setCurrentStep(currentStep - 1)}
                      className="flex items-center gap-2 text-gray-600 hover:text-rose-600 font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      {currentStep === 1 ? 'Back to Shop' : 'Previous'}
                    </button>

                    {currentStep < totalSteps ? (
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (validateCurrentStep()) {
                            setCurrentStep(currentStep + 1);
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Next Step
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            Place Order
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" />
                            </svg>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <motion.div
                className="bg-white rounded-3xl shadow-xl shadow-rose-100/50 p-6 border border-rose-100 sticky top-24"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h3>

                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-500">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.7 3.7-.4.5-.7 1.1-.7 1.8 0 1.5 1.3 2.8 2.8 2.8.3 0 .5 0 .7-.1v5.3c0 1 .8 2 2 2s2-1 2-2v-5.3c.2.1.5.1.7.1 1.5 0 2.8-1.3 2.8-2.8 0-.7-.3-1.3-.7-1.8 1-1 1.7-2.2 1.7-3.7C16.5 4 14.5 2 12 2z" />
                        </svg>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {/* Check if item has pre-calculated bundle details (from recursive configurator) */}
                            {item.selectedOptions['bundle-details'] ? (
                              <p className="text-xs text-gray-500 truncate pl-2 border-l-2 border-rose-200">
                                {item.selectedOptions['bundle-details']}
                              </p>
                            ) : (
                              /* Legacy fallback for flat bundles */
                              Object.values(item.selectedOptions).map((opt, idx) => (
                                <p key={idx} className="text-xs text-gray-500 truncate pl-2 border-l-2 border-rose-200">
                                  {opt}
                                </p>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-rose-600">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-rose-100 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{(total - (advocacyDonation * 80) - addonsTotal).toFixed(2)}</span>
                  </div>
                  {selectedAddons.length > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Add-ons ({selectedAddons.length})</span>
                      <span>₱{addonsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {advocacyDonation > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Advocacy Donation ({advocacyDonation} roses)</span>
                      <span>₱{(advocacyDonation * 80).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={deliveryFee > 0 ? "text-gray-800" : "text-green-600"}>
                      {deliveryFee > 0 ? `₱${deliveryFee.toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-rose-100">
                    <span>Total</span>
                    <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-rose-50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure checkout</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckoutForm;
