import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "danger" | "outline";
}

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
    const base =
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";

    const variants: Record<string, string> = {
        default: "bg-blue-100 text-blue-800",
        success: "bg-green-100 text-green-800",
        danger: "bg-red-100 text-red-800",
        outline: "border border-gray-300 text-gray-700",
    };

    return (
        <span className={`${base} ${variants[variant]} ${className}`} {...props} />
    );
}
