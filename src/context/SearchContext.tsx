"use client";
import React, { createContext, useContext, useState } from "react";

interface SearchContextType {
    query: string;
    setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
    const [query, setQuery] = useState("");
    return (
        <SearchContext.Provider value={{ query, setQuery }}>
            {children}
        </SearchContext.Provider>
    );
};

// ✅ Safe fallback so app won't crash if used outside provider
export const useSearch = (): SearchContextType => {
    const ctx = useContext(SearchContext);
    if (!ctx) {
        return {
            query: "",
            setQuery: () => {}, // no-op
        };
    }
    return ctx;
};
