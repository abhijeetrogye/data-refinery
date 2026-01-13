"use client";

import { AppShell } from "@/components/layout/AppShell";
import { FileUploader } from "@/features/ingestion/components/FileUploader";
import { JobsTable } from "@/features/jobs/components/JobsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import { Activity, Files, Sparkles, GitMerge, Loader2, Play, Trash2, Download, Clock, FileSpreadsheet, FileJson, Database } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatsOverview } from "./components/StatsOverview";
import { ActivityChart } from "./components/ActivityChart";
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Define the dashboard data type
interface DashboardData {
    stats: {
        total: number;
        completed: number;
        failed: number;
        processing: number;
        success_rate: number;
    };
    activity: { date: string; jobs: number }[];
    volumetrics: {
        rows_processed: number;
        errors_found: number;
    };
    performance: {
        avg_upload_time: number;
        avg_processing_time: number;
    };
}

export default function DashboardPage() {
    const queryClient = useQueryClient();
    const [previousProcessing, setPreviousProcessing] = useState(0);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'parquet'>('csv');

    // Fetch dashboard stats from backend
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await api.get<DashboardData>(`${endpoints.analytics}/dashboard`);
            return res.data;
        },
        refetchInterval: 10000, // Check every 10 seconds (reduced from 3s to stop flickering)
    });

    const processAllMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`${endpoints.jobs}/process-all`);
            return res.data;
        },
        onSuccess: (data: any) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
        onError: () => toast.error("Failed to start batch processing"),
    });

    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            // For now we still need to fetch jobs to delete relevant ones, 
            // but ideally backend should support delete-all
            const { data: jobs } = await api.get(`${endpoints.jobs}`);
            let deleted = 0;
            for (const job of jobs) {
                await api.delete(`${endpoints.jobs}/${job.id}`);
                deleted++;
            }
            return deleted;
        },
        onSuccess: (count: number) => {
            toast.success(`Deleted ${count} jobs`);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
        onError: () => toast.error("Failed to delete jobs"),
    });

    const handleDeleteAll = () => {
        if (confirm(`Are you sure you want to delete all jobs? This cannot be undone.`)) {
            deleteAllMutation.mutate();
        }
    };

    const exportAllMutation = useMutation({
        mutationFn: async (format: 'csv' | 'json' | 'parquet') => {
            const response = await api.get(`${endpoints.jobs}/all/export-zip?format=${format}`, {
                responseType: 'blob'
            });
            return { blob: response.data, format };
        },
        onSuccess: ({ blob, format }) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `all_jobs_${format}_${timestamp}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`All completed jobs exported as ${format.toUpperCase()}`);
        },
        onError: () => toast.error('Failed to export jobs'),
    });

    const handleExportAll = () => {
        setShowExportDialog(true);
    };

    const confirmExport = (format: 'csv' | 'json' | 'parquet') => {
        setSelectedFormat(format);
        exportAllMutation.mutate(format);
        setShowExportDialog(false);
    };

    // Notify when all files are processed
    useEffect(() => {
        if (dashboardData?.stats) {
            const currentProcessing = dashboardData.stats.processing;

            // If processing count went from >0 to 0, all files are done
            if (previousProcessing > 0 && currentProcessing === 0) {
                toast.success('🎉 All files have been processed!', {
                    duration: 5000,
                });
            }

            setPreviousProcessing(currentProcessing);
        }
    }, [dashboardData?.stats.processing]);

    if (isLoading && !dashboardData) {
        return (
            <AppShell>
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppShell>
        );
    }

    const stats = dashboardData?.stats || { total: 0, completed: 0, failed: 0, processing: 0, success_rate: 0 };
    const activity = dashboardData?.activity || [];

    return (
        <AppShell>
            <div className="space-y-8 animate-slide-up">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Transform scattered data into structured, AI-ready datasets.</p>
                </div>

                {/* Main Action Area - Jobs and Upload */}
                <div className="grid gap-8 md:grid-cols-12">
                    {/* Recent Jobs - Left side, takes more space */}
                    <div className="md:col-span-8 space-y-8">
                        <Card className="glass-panel border-none shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Recent Jobs</CardTitle>
                                    <CardDescription>View and manage your recent data processing tasks.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => processAllMutation.mutate()}
                                        disabled={processAllMutation.isPending}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90"
                                    >
                                        {processAllMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                        ) : (
                                            <Play className="h-3 w-3 mr-2" />
                                        )}
                                        Process All
                                    </Button>
                                    <Button
                                        onClick={handleExportAll}
                                        disabled={exportAllMutation.isPending}
                                        size="sm"
                                        variant="outline"
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                        {exportAllMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                        ) : (
                                            <Download className="h-3 w-3 mr-2" />
                                        )}
                                        Export All
                                    </Button>
                                    <Button
                                        onClick={handleDeleteAll}
                                        disabled={deleteAllMutation.isPending}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        {deleteAllMutation.isPending ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="h-3 w-3 mr-2" />
                                        )}
                                        Delete All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <JobsTable />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Ingest - Right sidebar */}
                    <div className="md:col-span-4 space-y-8">
                        <Card className="glass-panel border-none shadow-md bg-sidebar/50">
                            <CardHeader>
                                <CardTitle>Quick Ingest</CardTitle>
                                <CardDescription>Upload a new dataset for processing.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FileUploader onUploadComplete={() => {
                                    queryClient.invalidateQueries({ queryKey: ["jobs"] });
                                    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                                }} />
                            </CardContent>
                        </Card>

                        {/* Feature Highlights (Mini) */}
                        <div className="grid grid-cols-1 gap-2">
                            <FeatureCard
                                icon={<Files className="h-4 w-4" />}
                                title="Multi-Source"
                                desc="CSV, Excel, JSON"
                                color="text-emerald-500"
                            />
                            <FeatureCard
                                icon={<GitMerge className="h-4 w-4" />}
                                title="Smart Mapping"
                                desc="AI schema matching"
                                color="text-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <StatsOverview stats={stats} />

                <div className="grid gap-4 md:grid-cols-7">
                    {/* Activity Chart */}
                    <div className="col-span-4">
                        <ActivityChart data={activity} />
                    </div>

                    {/* Volumetrics / Highlights */}
                    <Card className="col-span-3 glass-panel">
                        <CardHeader>
                            <CardTitle>Data Volumetrics</CardTitle>
                            <CardDescription>Total data processed across all jobs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <DatabaseIcon className="h-5 w-5 text-purple-500" />
                                    <span className="font-medium">Rows Processed</span>
                                </div>
                                <span className="text-xl font-bold">{dashboardData?.volumetrics.rows_processed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-yellow-500" />
                                    <span className="font-medium">Issues Detected</span>
                                </div>
                                <span className="text-xl font-bold text-orange-500">{dashboardData?.volumetrics.errors_found.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Performance Metrics Section */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Performance Metrics
                        </CardTitle>
                        <CardDescription>Average upload and processing times</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-secondary/30 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Avg Upload Time</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {dashboardData?.performance?.avg_upload_time
                                        ? `${dashboardData.performance.avg_upload_time.toFixed(1)}s`
                                        : '—'}
                                </p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-6 bg-secondary/30 rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Avg Processing Time</p>
                                <p className="text-3xl font-bold text-emerald-600">
                                    {dashboardData?.performance?.avg_processing_time
                                        ? `${dashboardData.performance.avg_processing_time.toFixed(1)}s`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Export Format Selection Dialog */}
                <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Export All Jobs</DialogTitle>
                            <DialogDescription>
                                Select the format to export all completed jobs
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 py-4">
                            <Button
                                onClick={() => confirmExport('csv')}
                                variant="outline"
                                className="h-16 justify-start gap-4 hover:bg-emerald-50 hover:border-emerald-500"
                            >
                                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                                <div className="text-left">
                                    <div className="font-semibold">CSV Format</div>
                                    <div className="text-xs text-muted-foreground">Export as comma-separated values</div>
                                </div>
                            </Button>
                            <Button
                                onClick={() => confirmExport('json')}
                                variant="outline"
                                className="h-16 justify-start gap-4 hover:bg-yellow-50 hover:border-yellow-500"
                            >
                                <FileJson className="h-6 w-6 text-yellow-600" />
                                <div className="text-left">
                                    <div className="font-semibold">JSON Format</div>
                                    <div className="text-xs text-muted-foreground">Export as JSON objects</div>
                                </div>
                            </Button>
                            <Button
                                onClick={() => confirmExport('parquet')}
                                variant="outline"
                                className="h-16 justify-start gap-4 hover:bg-purple-50 hover:border-purple-500"
                            >
                                <Database className="h-6 w-6 text-purple-600" />
                                <div className="text-left">
                                    <div className="font-semibold">Parquet Format</div>
                                    <div className="text-xs text-muted-foreground">Export as columnar storage</div>
                                </div>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </AppShell>
    );
}

// Feature highlight card component
function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/60 hover:bg-card transition-colors">
            <div className={`mt-0.5 ${color}`}>{icon}</div>
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
        </div>
    );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    )
}

