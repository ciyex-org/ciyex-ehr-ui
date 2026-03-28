# Switch Practice Integration Guide

## Overview

The "Switch Practice" feature allows users to change their active practice without logging out. This document shows how to integrate it into your user menu.

## Component Location

```
src/components/auth/SwitchPractice.tsx
```

## Integration Example

### Option 1: Modal/Dialog

```tsx
"use client";
import { useState } from 'react';
import SwitchPractice from '@/components/auth/SwitchPractice';

export default function UserMenu() {
  const [showSwitchPractice, setShowSwitchPractice] = useState(false);

  return (
    <>
      {/* User Menu Dropdown */}
      <div className="user-menu-dropdown">
        <button onClick={() => setShowSwitchPractice(true)}>
          <span>Switch Practice</span>
        </button>
      </div>

      {/* Modal */}
      {showSwitchPractice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Switch Practice</h2>
              <button 
                onClick={() => setShowSwitchPractice(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SwitchPractice onClose={() => setShowSwitchPractice(false)} />
          </div>
        </div>
      )}
    </>
  );
}
```

### Option 2: Dropdown Panel

```tsx
"use client";
import { useState } from 'react';
import SwitchPractice from '@/components/auth/SwitchPractice';

export default function UserMenu() {
  const [showSwitchPractice, setShowSwitchPractice] = useState(false);

  return (
    <div className="relative">
      {/* User Menu Button */}
      <button onClick={() => setShowSwitchPractice(!showSwitchPractice)}>
        Switch Practice
      </button>

      {/* Dropdown Panel */}
      {showSwitchPractice && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <SwitchPractice onClose={() => setShowSwitchPractice(false)} />
        </div>
      )}
    </div>
  );
}
```

### Option 3: Dedicated Page

```tsx
// src/app/switch-practice/page.tsx
import SwitchPractice from '@/components/auth/SwitchPractice';

export default function SwitchPracticePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <SwitchPractice />
      </div>
    </div>
  );
}
```

## Features

### 1. **Current Practice Indicator**
- Shows which practice is currently selected
- Highlighted with brand colors
- Checkmark icon for current practice

### 2. **Search Functionality**
- Appears when user has more than 5 practices
- Real-time filtering
- Clear button to reset search
- Shows result count

### 3. **Auto-Reload**
- Automatically reloads the page after switching
- Applies new tenant context immediately
- Updates all API calls with new tenant

### 4. **Responsive Design**
- Works on mobile, tablet, and desktop
- Scrollable list for many practices
- Touch-friendly buttons

## User Flow

1. User clicks "Switch Practice" in menu
2. Modal/dropdown opens showing all accessible practices
3. Current practice is highlighted
4. User can search if they have many practices
5. User clicks on a practice to switch
6. Page reloads with new practice context
7. All subsequent API calls use the new practice

## Behavior

### First Login (No Practice Selected)
```
Login → Practice Selection Page → Select Practice → Dashboard
```

### Subsequent Logins (Practice Already Selected)
```
Login → Dashboard (skips practice selection)
```

### Switching Practice
```
Click "Switch Practice" → Select New Practice → Page Reloads → Dashboard with New Practice
```

## localStorage Keys

```javascript
// Current selected practice
localStorage.getItem('selectedTenant')  // e.g., "CareWell"

// User's accessible practices (from backend)
// Fetched via API: /api/tenants/accessible
```

## API Integration

The component uses these utilities from `tenantService.ts`:

```typescript
// Get list of accessible practices
getAccessibleTenants(token: string): Promise<AccessibleTenantsResponse>

// Set selected practice
setSelectedTenant(tenantName: string): void

// Get current selected practice
getSelectedTenant(): string | null
```

## Styling

The component uses:
- Tailwind CSS classes
- Dark mode support
- Brand colors (brand-500, brand-600, etc.)
- Responsive breakpoints

## Props

```typescript
interface SwitchPracticeProps {
  onClose?: () => void;  // Optional callback when practice is switched
}
```

## Example: Full User Menu Integration

```tsx
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwitchPractice from '@/components/auth/SwitchPractice';
import { getSelectedTenant } from '@/utils/tenantService';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSwitchPractice, setShowSwitchPractice] = useState(false);
  const router = useRouter();
  const currentPractice = getSelectedTenant();

  const handleSignOut = () => {
    localStorage.clear();
    router.push('/signin');
  };

  return (
    <>
      {/* User Avatar Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-semibold">
          AJ
        </div>
        <span className="font-medium">Alice</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-gray-800 dark:text-white">Alice Johnson</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">alice@example.com</p>
            {currentPractice && (
              <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
                📍 {currentPractice}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Edit Profile</span>
            </button>

            <button className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Support</span>
            </button>

            <button 
              onClick={() => {
                setIsOpen(false);
                setShowSwitchPractice(true);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 bg-gray-50 dark:bg-gray-700/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Switch Practice</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-200 dark:border-gray-700 py-2">
            <button 
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-red-600 dark:text-red-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Switch Practice Modal */}
      {showSwitchPractice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Switch Practice</h2>
              <button 
                onClick={() => setShowSwitchPractice(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SwitchPractice onClose={() => setShowSwitchPractice(false)} />
          </div>
        </div>
      )}
    </>
  );
}
```

## Summary

✅ **Callback Logic Updated**: Checks localStorage for existing practice  
✅ **Switch Practice Component**: Ready to integrate into user menu  
✅ **Search Functionality**: Works for users with many practices  
✅ **Current Practice Indicator**: Shows which practice is active  
✅ **Auto-Reload**: Applies new practice context immediately  

Users will only see the practice selection page on **first login**. After that, they can switch practices using the menu! 🎉
