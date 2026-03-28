"use client";

import React, { createContext, useState, useContext, useEffect } from "react";

export type FontSize = "small" | "default" | "large" | "x-large";

interface DisplaySettings {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
}

const SCALE_MAP: Record<FontSize, string> = {
    small: "0.875",
    default: "1",
    large: "1.125",
    "x-large": "1.25",
};

const DisplaySettingsContext = createContext<DisplaySettings | undefined>(undefined);

export const DisplaySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontSize, setFontSizeState] = useState<FontSize>("default");
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("ciyex-font-size") as FontSize | null;
        if (saved && saved in SCALE_MAP) {
            setFontSizeState(saved);
        }
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (!initialized) return;
        localStorage.setItem("ciyex-font-size", fontSize);
        // Set CSS variable for text scaling — does NOT change root font-size
        // so padding/margin/width (rem-based) stay unchanged
        document.documentElement.style.setProperty("--text-scale", SCALE_MAP[fontSize]);
        document.documentElement.dataset.fontSize = fontSize;
        // Clean up old approach that set root font-size directly
        document.documentElement.style.removeProperty("font-size");
    }, [fontSize, initialized]);

    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
    };

    return (
        <DisplaySettingsContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </DisplaySettingsContext.Provider>
    );
};

export const useDisplaySettings = () => {
    const context = useContext(DisplaySettingsContext);
    if (!context) {
        throw new Error("useDisplaySettings must be used within DisplaySettingsProvider");
    }
    return context;
};
