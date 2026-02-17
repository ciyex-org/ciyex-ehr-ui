import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { EnvProvider } from '@/context/EnvContext';
import { MenuProvider } from '@/context/MenuContext';
import {Metadata} from "next";
import SessionManager from '@/layout/SessionManager';

const outfit = Outfit({
  subsets: ["latin"],
});

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
            <SidebarProvider>
              <MenuProvider>
                <SessionManager />
                {children}
              </MenuProvider>
            </SidebarProvider>
          </ThemeProvider>
        </EnvProvider>
      </body>
    </html>
  );
}
