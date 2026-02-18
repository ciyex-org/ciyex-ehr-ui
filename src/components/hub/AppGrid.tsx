"use client";

import React from "react";
import AppCard, { type AppCardProps } from "./AppCard";

interface AppGridProps {
    apps: AppCardProps[];
    emptyMessage?: string;
    compareSet?: Set<string>;
    onToggleCompare?: (slug: string) => void;
}

export default function AppGrid({ apps, emptyMessage, compareSet, onToggleCompare }: AppGridProps) {
    if (apps.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400">
                    {emptyMessage || "No apps found"}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map((app) => (
                <AppCard
                    key={app.slug}
                    {...app}
                    comparing={compareSet?.has(app.slug)}
                    onToggleCompare={onToggleCompare}
                />
            ))}
        </div>
    );
}
