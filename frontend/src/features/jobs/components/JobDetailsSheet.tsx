"use client";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Job } from "@/types/api";
import { ErrorReport } from "@/components/ErrorReport";
import { SchemaMapper } from "@/components/SchemaMapper";
import { DownloadButton } from "@/components/DownloadButton";
import { DataProfile } from "@/components/DataProfile";

interface JobDetailsSheetProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRefresh: () => void;
}

export function JobDetailsSheet({ job, open, onOpenChange, onRefresh }: JobDetailsSheetProps) {
    if (!job) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{job.filename}</SheetTitle>
                    <SheetDescription>
                        Job ID: #{job.id} • {job.status} • {job.total_rows?.toLocaleString()} rows
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="errors">Errors</TabsTrigger>
                        <TabsTrigger value="mapping">Schema</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                        <div>
                            <h4 className="text-sm font-medium mb-2">Inferred Schema</h4>
                            <div className="rounded-md border p-3 bg-muted/30 text-sm">
                                {job.inferred_schema ? (
                                    <div className="grid gap-2">
                                        {Object.entries(job.inferred_schema).map(([col, type]) => (
                                            <div key={col} className="flex justify-between">
                                                <span className="font-medium text-muted-foreground">{col}</span>
                                                <span className="font-mono text-xs">{type}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No schema available</p>
                                )}
                            </div>
                        </div>

                        {job.status === 'completed' && (
                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-medium mb-2">Downloads</h4>
                                <DownloadButton jobId={job.id} />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="errors" className="mt-4">
                        <ErrorReport
                            errors={job.validation_errors || []}
                            summary={job.validation_summary || {}}
                        />
                    </TabsContent>

                    <TabsContent value="mapping" className="mt-4">
                        <SchemaMapper job={job} onMapped={onRefresh} />
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
