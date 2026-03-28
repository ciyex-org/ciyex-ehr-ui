import * as React from "react";

export function Input({
                          className = "",
                          type,
                          ...props
                      }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            className={
                "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm " +
                "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 " +
                "disabled:cursor-not-allowed disabled:opacity-50 " +
                className
            }
            {...props}
        />
    );
}
