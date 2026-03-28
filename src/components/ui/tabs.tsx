import * as React from "react";

interface TabsProps {
    tabs: { id: string; label: string; content: React.ReactNode }[];
    defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
    const [activeTab, setActiveTab] = React.useState(
        defaultTab || (tabs.length > 0 ? tabs[0].id : "")
    );

    return (
        <div>
            <div className="flex border-b">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={
                            "px-4 py-2 text-sm font-medium -mb-px border-b-2 " +
                            (activeTab === tab.id
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700")
                        }
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="mt-4">
                {tabs.map(
                    (tab) =>
                        tab.id === activeTab && (
                            <div key={tab.id} className="text-sm">
                                {tab.content}
                            </div>
                        )
                )}
            </div>
        </div>
    );
}
