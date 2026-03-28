import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative bg-white z-1 dark:bg-gray-900">
            <ThemeProvider>
                <div className="relative w-full min-h-screen">
                    {/* Auth content - full width */}
                    {children}

                    {/* Theme Toggler */}
                    <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
                        <ThemeTogglerTwo />
                    </div>
                </div>
            </ThemeProvider>
        </div>
    );
}
