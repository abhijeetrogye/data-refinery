"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, FileUp, Settings, BarChart3, Database, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Jobs', href: '/jobs', icon: Database },
    { name: 'Schemas', href: '/schemas', icon: FileUp },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-secondary/30">
            {/* Sidebar */}
            <div className="hidden border-r bg-sidebar md:block w-64 fixed inset-y-0 z-50">
                <div className="flex h-36 items-center justify-center p-2 border-b">
                    <img
                        src="/logo.png"
                        alt="DataRefinery - Raw Data to AI Insights"
                        className="w-full h-auto object-contain"
                    />
                </div>
                <div className="flex flex-col gap-1 p-4">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-primary"
                                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:pl-64">
                <div className="container mx-auto p-6 md:p-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
