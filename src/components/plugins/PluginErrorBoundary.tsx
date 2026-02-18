"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    pluginName: string;
    slotName: string;
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class PluginErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `Plugin "${this.props.pluginName}" crashed in slot "${this.props.slotName}":`,
            error,
            errorInfo
        );
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                        Plugin &ldquo;{this.props.pluginName}&rdquo; encountered an error
                    </span>
                </div>
            );
        }

        return this.props.children;
    }
}
