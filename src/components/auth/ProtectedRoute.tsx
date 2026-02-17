"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/utils/authUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to allow callback to complete token storage
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      
      if (!authenticated) {
        console.log('🔒 Not authenticated, redirecting to signin...');
        router.replace('/signin');
      } else {
        setIsChecking(false);
      }
    };

    // Delay check slightly to avoid race condition with callback
    const timer = setTimeout(checkAuth, 100);

    // Listen for storage changes (e.g., when user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        console.log('🔒 Token removed, redirecting to signin...');
        router.replace('/signin');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router, pathname]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
