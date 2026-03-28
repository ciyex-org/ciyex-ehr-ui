import * as React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: { label: string; value: string }[];
}

export function Select({
                           className = "",
                           options,
                           ...props
                       }: SelectProps) {
    return (
        <select
            className={
                "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm " +
                "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 " +
                "disabled:cursor-not-allowed disabled:opacity-50 " +
                className
            }
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
