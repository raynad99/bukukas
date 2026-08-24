import React from 'react';
import {
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Coffee,
  CreditCard,
  DollarSign,
  Film,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  Shield,
  ShoppingBag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from 'lucide-react';

interface IconHelperProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconHelper: React.FC<IconHelperProps> = ({ name, className = 'w-5 h-5', size }) => {
  const iconProps = { className, ...(size ? { size } : {}) };

  switch (name?.toLowerCase()) {
    case 'briefcase':
      return <Briefcase {...iconProps} />;
    case 'laptop':
      return <Laptop {...iconProps} />;
    case 'trendingup':
    case 'trending-up':
      return <TrendingUp {...iconProps} />;
    case 'utensils':
      return <Utensils {...iconProps} />;
    case 'shoppingbag':
    case 'shopping-bag':
      return <ShoppingBag {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'film':
      return <Film {...iconProps} />;
    case 'heartpulse':
    case 'heart-pulse':
      return <HeartPulse {...iconProps} />;
    case 'bookopen':
    case 'book-open':
      return <BookOpen {...iconProps} />;
    case 'coffee':
      return <Coffee {...iconProps} />;
    case 'gift':
      return <Gift {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'plane':
      return <Plane {...iconProps} />;
    case 'wifi':
      return <Wifi {...iconProps} />;
    case 'landmark':
      return <Landmark {...iconProps} />;
    case 'building2':
    case 'building':
      return <Building2 {...iconProps} />;
    case 'wallet':
      return <Wallet {...iconProps} />;
    case 'banknote':
      return <Banknote {...iconProps} />;
    case 'creditcard':
    case 'credit-card':
      return <CreditCard {...iconProps} />;
    case 'piggybank':
    case 'piggy-bank':
      return <PiggyBank {...iconProps} />;
    case 'shield':
      return <Shield {...iconProps} />;
    default:
      return <DollarSign {...iconProps} />;
  }
};

export const AVAILABLE_CATEGORY_ICONS = [
  'Utensils',
  'ShoppingBag',
  'Car',
  'Zap',
  'Film',
  'HeartPulse',
  'BookOpen',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'Coffee',
  'Gift',
  'Home',
  'Plane',
  'Wifi',
  'Wallet',
  'CreditCard',
];
