
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { api, endpoints } from "@/lib/api";
import { Job } from "@/types/api";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle, History, Database, FileSpreadsheet, FileJson, FileArchive, Download, GitMerge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TransformationTimeline } from "@/features/jobs/components/TransformationTimeline";
import { IssuesList } from "@/features/jobs/components/IssuesList";
import { MappingEditor } from "@/features/jobs/components/MappingEditor";
import { DataEditor } from "@/features/jobs/components/DataEditor";

export default function JobDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;

    const { data: job, isLoading } = useQuery({
        queryKey: ['job', jobId],
        queryFn: async () => (await api.get<Job>(`${endpoints.jobs}/${jobId}`)).data,
        refetchInterval: 5000
    });

    if (isLoading || !job) {
        return <AppShell><div className="flex items-center justify-center h-full">Loading...</div></AppShell>;
    }

    return (
        <AppShell>
            <div className="space-y-6 animate-slide-up">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {job.filename}
                            <span className="text-sm font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
                                {job.status}
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground">ID: {job.id} • Processed {job.processed_rows} rows</p>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 max-w-[750px] h-11 bg-secondary/50 p-1 rounded-lg">
                        <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileText className="h-4 w-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="mapping" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <GitMerge className="h-4 w-4" /> Mapping
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <History className="h-4 w-4" /> History
                        </TabsTrigger>
                        <TabsTrigger value="issues" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <AlertTriangle className="h-4 w-4" /> Issues
                            {job.validation_summary?.total_errors ?
                                <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 rounded-full">{job.validation_summary.total_errors}</span>
                                : null
                            }
                        </TabsTrigger>
                        <TabsTrigger value="data" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Database className="h-4 w-4" /> Data
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-6">
                                <Card className="glass-panel">
                                    <CardContent className="pt-6">
                                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Pipeline Status</h3>

                                        {/* Progress Bar */}
                                        {job.status !== 'completed' && job.status !== 'failed' && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Progress</span>
                                                    <span>{getProgressPercent(job)}%</span>
                                                </div>
                                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-500 ease-out"
                                                        style={{ width: `${getProgressPercent(job)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm">Total Rows</span>
                                                <span className="font-medium">{job.total_rows}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm">Valid Rows</span>
                                                <span className="font-medium text-emerald-500">{job.validation_summary?.valid_rows || 0}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-sm">Errors Found</span>
                                                <span className="font-medium text-rose-500">{job.validation_summary?.total_errors || 0}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Export Section */}
                            {job.status === 'completed' && (
                                <div className="space-y-6">
                                    <Card className="glass-panel">
                                        <CardContent className="pt-6">
                                            <h3 className="text-sm font-medium text-muted-foreground mb-4">Export Data</h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                <ExportButton jobId={job.id} format="csv" label="CSV" icon={<FileSpreadsheet className="h-4 w-4" />} />
                                                <ExportButton jobId={job.id} format="json" label="JSON" icon={<FileJson className="h-4 w-4" />} />
                                                <ExportButton jobId={job.id} format="parquet" label="Parquet" icon={<FileArchive className="h-4 w-4" />} />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-3">Download your processed data in your preferred format</p>

                                            {/* Export All Button */}
                                            <div className="mt-4 pt-4 border-t">
                                                <ExportAllButton />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="mapping" className="mt-6">
                        <MappingEditor
                            jobId={job.id}
                            sourceFields={job.inferred_schema || {}}
                            targetSchemaId={job.target_schema_id}
                            currentMapping={job.field_mapping}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="mt-6">
                        <TransformationTimeline logs={job.transformation_log || []} />
                    </TabsContent>

                    <TabsContent value="issues" className="mt-6">
                        <IssuesList errors={job.validation_errors || []} jobId={job.id} />
                    </TabsContent>

                    <TabsContent value="data" className="mt-6">
                        <Card className="glass-panel">
                            <CardContent className="pt-6">
                                <DataEditor jobId={job.id} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell >
    );
}

// Helper function to calculate progress percentage
function getProgressPercent(job: Job): number {
    if (job.status === 'completed') return 100;
    if (job.status === 'failed') return 0;
    if (job.status === 'uploaded' || job.status === 'queued') return 0;
    if (job.total_rows && job.total_rows > 0 && job.processed_rows) {
        return Math.min(100, Math.round((job.processed_rows / job.total_rows) * 100));
    }
    // Default progress for processing states
    const progressMap: Record<string, number> = {
        'processing': 25,
        'cleaning': 50,
        'validating': 75
    };
    return progressMap[job.status] || 50;
}

// Export button component
function ExportButton({ jobId, format, label, icon }: { jobId: string; format: string; label: string; icon: React.ReactNode }) {
    const [downloading, setDownloading] = React.useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const response = await api.get(`${endpoints.jobs}/${jobId}/export?format=${format}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `export.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={handleDownload}
            disabled={downloading}
        >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            <span className="text-xs">{label}</span>
        </Button>
    );
}

// Export All button component
function ExportAllButton() {
    const [downloading, setDownloading] = React.useState(false);

    const handleDownloadAll = async () => {
        setDownloading(true);
        try {
            const response = await api.get(`${endpoints.jobs}/all/export-zip`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `all_jobs_export_${timestamp}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download all failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Button
            variant="default"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            onClick={handleDownloadAll}
            disabled={downloading}
        >
            {downloading ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating zip file...
                </>
            ) : (
                <>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Files as Zip
                </>
            )}
        </Button>
    );
}
