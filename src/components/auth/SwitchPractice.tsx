"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessibleTenants, setSelectedTenant, getSelectedTenant, AccessibleTenantsResponse } from '@/utils/tenantService';

interface SwitchPracticeProps {
  onClose?: () => void;
}

export default function SwitchPractice({ onClose }: SwitchPracticeProps) {
  const [tenants, setTenants] = useState<string[]>([]);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTenants, setFilteredTenants] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(tenant =>
        tenant.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTenants(filtered);
    }
  }, [searchQuery, tenants]);

  const loadTenants = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/signin');
        return;
      }

      const current = getSelectedTenant();
      setCurrentTenant(current);

      const data: AccessibleTenantsResponse = await getAccessibleTenants(token);
      setTenants(data.tenants);
      setFilteredTenants(data.tenants);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load practices:', err);
      setError('Failed to load practices. Please try again.');
      setLoading(false);
    }
  };

  const handleSwitchPractice = (tenantName: string) => {
    setSelectedTenant(tenantName);
    setCurrentTenant(tenantName);
    
    // Close the modal/dropdown if provided
    if (onClose) {
      onClose();
    }
    
    // Reload the page to apply the new tenant context
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-3"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading practices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Search bar - show if more than 2 practices */}
      {tenants.length > 2 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search practices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Practice list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTenants.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No practices found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredTenants.map((tenant) => (
              <button
                key={tenant}
                onClick={() => handleSwitchPractice(tenant)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  currentTenant === tenant ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentTenant === tenant 
                      ? 'bg-brand-100 dark:bg-brand-900/40' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <svg 
                      className={`w-5 h-5 ${
                        currentTenant === tenant 
                          ? 'text-brand-600 dark:text-brand-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className={`font-medium ${
                      currentTenant === tenant 
                        ? 'text-brand-700 dark:text-brand-300' 
                        : 'text-gray-800 dark:text-white'
                    }`}>
                      {tenant}
                    </p>
                    {currentTenant === tenant && (
                      <p className="text-xs text-brand-600 dark:text-brand-400">Current practice</p>
                    )}
                  </div>
                </div>
                {currentTenant === tenant && (
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {filteredTenants.length} of {tenants.length} practice{tenants.length !== 1 ? 's' : ''} shown
        </p>
      </div>
    </div>
  );
}
