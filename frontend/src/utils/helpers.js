// Format currency in INR
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format month year
export const formatMonthYear = (month, year) => {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Category icons (emoji)
export const CATEGORY_ICONS = {
  Rent: '🏠',
  Electricity: '⚡',
  WiFi: '📶',
  Grocery: '🛒',
  Gas: '🔥',
  Maid: '🧹',
  Repair: '🔧',
  Other: '📦',
};

// Category colors
export const CATEGORY_COLORS = {
  Rent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Electricity: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  WiFi: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Grocery: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Gas: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Maid: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Repair: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export const CATEGORIES = ['Rent', 'Electricity', 'WiFi', 'Grocery', 'Gas', 'Maid', 'Repair', 'Other'];

// Get avatar color based on name
export const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Truncate text
export const truncate = (str, n) => {
  return str?.length > n ? str.substring(0, n) + '...' : str;
};
