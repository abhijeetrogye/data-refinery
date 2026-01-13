"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import { Job } from "@/types/api";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Trash2, FileText, Database, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { JobDetailsSheet } from "./JobDetailsSheet";

import { useRouter } from "next/navigation";

export function JobsTable() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    const getJobId = (job: Job) => job.id || (job as any)._id;

    const { data: jobs = [], isLoading, error, refetch } = useQuery({
        queryKey: ["jobs"],
        queryFn: async () => {
            const { data } = await api.get<Job[]>(endpoints.jobs);
            return data;
        },
        // Only poll when there are jobs in progress
        refetchInterval: (query) => {
            const jobs = query?.state?.data;
            const hasActiveJobs = jobs?.some(job =>
                ['queued', 'processing', 'cleaning', 'validating'].includes(job.status)
            );
            return hasActiveJobs ? 1000 : false; // Poll every 3s if active jobs, otherwise don't poll
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`${endpoints.jobs}/${id}`);
        },
        onSuccess: () => {
            toast.success("Job deleted");
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: () => toast.error("Failed to delete job"),
    });

    const processMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`${endpoints.jobs}/${id}/process`);
        },
        onSuccess: () => {
            toast.success("Processing started");
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: () => toast.error("Failed to start processing"),
    });

    const columns: ColumnDef<Job>[] = [
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">#{getJobId(row.original)}</span>,
        },
        {
            accessorKey: "filename",
            header: "File",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/jobs/${getJobId(row.original)}`)}
                    className="flex items-center gap-2 hover:underline decoration-primary underline-offset-4 text-left h-auto p-0"
                >
                    <div className="p-1.5 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{row.original.filename}</span>
                </Button>
            ),
        },
        {
            accessorKey: "source_type",
            header: "Type",
            cell: ({ row }) => <span className="uppercase text-xs font-semibold text-muted-foreground">{row.original.source_type}</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                const processed = row.original.processed_rows || 0;
                const total = row.original.total_rows || 1;
                const progress = Math.round((processed / total) * 100);

                return (
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "status-badge capitalize",
                                status === "completed" && "status-completed",
                                status === "processing" && "status-processing",
                                status === "cleaning" && "status-processing",
                                status === "uploaded" && "status-uploaded",
                                status === "failed" && "status-failed"
                            )}
                        >
                            {status}
                        </span>
                        {(status === "processing" || status === "cleaning") && (
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                        )}
                        {status === "failed" && row.original.message && (
                            <span className="text-xs text-destructive max-w-[150px] truncate" title={row.original.message}>
                                {row.original.message}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: "Created",
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.created_at).toLocaleString()}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const job = row.original;
                const jobId = getJobId(job);
                return (
                    <div className="flex items-center gap-2 justify-end">
                        {job.status === "uploaded" && (
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => processMutation.mutate(jobId)}
                                disabled={processMutation.isPending}
                            >
                                <Play className="h-3 w-3 mr-1" /> Process
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => router.push(`/jobs/${jobId}`)}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                                if (confirm("Delete this job?")) deleteMutation.mutate(jobId);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-destructive">
                <p>Failed to load jobs.</p>
                <p className="text-sm text-muted-foreground">{String(error)}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <>
            <DataTable columns={columns} data={jobs} />
            <JobDetailsSheet
                job={selectedJob}
                open={!!selectedJob}
                onOpenChange={(open) => !open && setSelectedJob(null)}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["jobs"] })}
            />
        </>
    );
}
