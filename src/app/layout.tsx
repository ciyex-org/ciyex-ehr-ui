import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { EnvProvider } from '@/context/EnvContext';
import { MenuProvider } from '@/context/MenuContext';
import { PermissionProvider } from '@/context/PermissionContext';
import { PluginRegistryProvider } from '@/context/PluginRegistryContext';
import { PluginEventBusProvider } from '@/context/PluginEventBus';
import { PluginContextProvider } from '@/context/PluginContextProvider';
import { DisplaySettingsProvider } from '@/context/DisplaySettingsContext';
import NativePluginLoader from '@/components/plugins/NativePluginLoader';
import PluginSlot from '@/components/plugins/PluginSlot';
import {Metadata} from "next";
import SessionManager from '@/layout/SessionManager';

const outfit = Outfit({
  subsets: ["latin"],
});

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

// 🔹 Global metadata
export const metadata: Metadata = {
    title: {
        default: "Ciyex",
        template: "Ciyex | %s",
    },
    description: "Ciyex Admin Dashboard",
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '32x32' },
            { url: '/images/ciyex-favicon-new.png', sizes: '16x16' },
            { url: '/images/ciyex-favicon-new.png', sizes: '32x32' }
        ],
        shortcut: '/favicon.ico',
        apple: [{ url: '/images/ciyex-favicon-new.png', sizes: '180x180' }],
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <EnvProvider>
          <ThemeProvider>
            <DisplaySettingsProvider>
              <SidebarProvider>
                <MenuProvider>
                  <PermissionProvider>
                  <PluginEventBusProvider>
                    <PluginRegistryProvider>
                      <PluginContextProvider>
                        <NativePluginLoader />
                        <SessionManager />
                        {children}
                        <PluginSlot name="global:floating-widget" as="fragment" />
                      </PluginContextProvider>
                    </PluginRegistryProvider>
                  </PluginEventBusProvider>
                  </PermissionProvider>
                </MenuProvider>
              </SidebarProvider>
            </DisplaySettingsProvider>
          </ThemeProvider>
        </EnvProvider>
      </body>
    </html>
  );
}
