
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LogEntry {
    step: string;
    row: number;
    column: string;
    message: string;
    timestamp: string;
}

interface TransformationTimelineProps {
    logs: LogEntry[];
}

export function TransformationTimeline({ logs }: TransformationTimelineProps) {
    if (!logs || logs.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No transformation history available.</div>;
    }

    return (
        <Card className="glass-panel">
            <CardHeader>
                <CardTitle>Transformation History</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                    <div className="relative border-l border-muted ml-4 space-y-8 pb-4">
                        {logs.map((log, index) => (
                            <div key={index} className="relative pl-8">
                                <span className={cn(
                                    "absolute -left-[9px] top-1 h-4 w-4 rounded-full border bg-background flex items-center justify-center",
                                    "border-primary"
                                )}>
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                </span>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none flex items-center gap-2">
                                        {log.step}
                                        <span className="text-xs text-muted-foreground font-normal">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {log.message}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-1.5 rounded w-fit">
                                        <span>Row: {log.row === -1 ? 'All' : log.row}</span>
                                        <span>•</span>
                                        <span>Column: {log.column}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="relative pl-8">
                            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border bg-emerald-500 flex items-center justify-center border-none">
                                <CheckCircle2 className="h-3 w-3 text-white" />
                            </span>
                            <p className="text-sm font-medium leading-none text-emerald-600">Processing Completed</p>
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
