"use client";

import React from "react";
import Link from "next/link";
import { Star, CheckCircle2, GitCompareArrows } from "lucide-react";
import { getAppIcon, getAppColorClass } from "./appIcons";

export interface AppCardProps {
    slug: string;
    name: string;
    category: string;
    description: string;
    iconUrl?: string;
    avgRating?: number;
    reviewCount?: number;
    installed?: boolean;
    pricingLabel?: string;
    comparing?: boolean;
    onToggleCompare?: (slug: string) => void;
}

export default function AppCard({
    slug,
    name,
    category,
    description,
    iconUrl,
    avgRating,
    reviewCount,
    installed,
    pricingLabel,
    comparing,
    onToggleCompare,
}: AppCardProps) {
    const IconComponent = getAppIcon(slug);
    const colorClass = getAppColorClass(slug);

    return (
        <div className="relative h-full">
            <Link href={`/hub/${slug}`}>
                <div className={`group relative bg-white dark:bg-slate-800 rounded-xl border p-5 hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col ${
                    comparing
                        ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                        : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
                }`}>
                    {/* Installed badge */}
                    {installed && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Installed
                        </div>
                    )}

                    {/* Icon + Name */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0`}>
                            <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {category}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3 flex-1">
                        {description}
                    </p>

                    {/* Footer: Rating + Price */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
                        {avgRating != null && avgRating > 0 ? (
                            <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {avgRating.toFixed(1)}
                                </span>
                                {reviewCount != null && reviewCount > 0 && (
                                    <span className="text-xs text-gray-400">
                                        ({reviewCount})
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400">No reviews</span>
                        )}
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {pricingLabel || "Free"}
                        </span>
                    </div>
                </div>
            </Link>

            {/* Compare toggle — outside Link to prevent navigation on click */}
            {onToggleCompare && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleCompare(slug);
                    }}
                    className={`absolute bottom-14 right-3 p-1.5 rounded-lg transition-all z-10 ${
                        comparing
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    }`}
                    title={comparing ? "Remove from comparison" : "Add to comparison"}
                >
                    <GitCompareArrows className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
