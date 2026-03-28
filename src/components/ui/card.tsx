import * as React from "react";

export function Card({
                         className = "",
                         ...props
                     }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-lg border bg-white shadow-sm dark:bg-gray-800 ${className}`}
            {...props}
        />
    );
}

export function CardHeader({
                               className = "",
                               ...props
                           }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-4 border-b font-semibold ${className}`} {...props} />
    );
}

export function CardContent({
                                className = "",
                                ...props
                            }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`p-4 ${className}`} {...props} />;
}

export function CardFooter({
                               className = "",
                               ...props
                           }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-4 border-t flex justify-end gap-2 ${className}`} {...props} />
    );
}
