
"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles, Download, FileSpreadsheet, FileJson, FileArchive, Check, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import { toast } from "sonner";

interface ValueError {
    row: number;
    column: string;
    value: string;
    error_type: string;
    severity: string;
    reason: string;
    suggestion: string;
}

interface IssuesListProps {
    errors: ValueError[];
    jobId: string;
}

export function IssuesList({ errors, jobId }: IssuesListProps) {
    const queryClient = useQueryClient();
    const [fixResult, setFixResult] = useState<{ fixes: string[]; message: string } | null>(null);
    const [showExport, setShowExport] = useState(false);

    // AI Auto-fix mutation
    const fixMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`${endpoints.jobs}/${jobId}/auto-fix`);
            return res.data;
        },
        onSuccess: (data) => {
            setFixResult(data);
            setShowExport(true);
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
        },
        onError: () => toast.error("Failed to auto-fix issues")
    });

    // Export handler
    const handleExport = async (format: string) => {
        try {
            const response = await api.get(`${endpoints.jobs}/${jobId}/export?format=${format}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fixed_data.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Downloaded as ${format.toUpperCase()}`);
        } catch (error) {
            toast.error(`Export failed`);
        }
    };

    if (!errors || errors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">No Issues Found</h3>
                <p>Your data passed all validation checks.</p>

                {/* Export options for clean data */}
                <div className="mt-6 space-y-2">
                    <p className="text-sm text-muted-foreground">Export your clean data:</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                            <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                            <FileJson className="h-4 w-4 mr-1" /> JSON
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('parquet')}>
                            <FileArchive className="h-4 w-4 mr-1" /> Parquet
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className="glass-panel">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-rose-500 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Validation Issues
                        </CardTitle>
                        <CardDescription>
                            Found {errors.length} issues that need attention.
                        </CardDescription>
                    </div>

                    {/* AI Fix Button */}
                    <Button
                        onClick={() => fixMutation.mutate()}
                        disabled={fixMutation.isPending}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                        {fixMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Fixing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                AI Fix All Issues
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Fix Results & Export Options */}
                {fixResult && showExport && (
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{fixResult.message}</span>
                        </div>

                        {fixResult.fixes.length > 0 && (
                            <ul className="text-sm text-emerald-600 dark:text-emerald-500 space-y-1 ml-6">
                                {fixResult.fixes.map((fix, idx) => (
                                    <li key={idx}>• {fix}</li>
                                ))}
                            </ul>
                        )}

                        <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                <Download className="h-4 w-4" /> Export Fixed Data
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="bg-white dark:bg-background">
                                    <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-500" /> CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('json')} className="bg-white dark:bg-background">
                                    <FileJson className="h-4 w-4 mr-1 text-yellow-500" /> JSON
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('parquet')} className="bg-white dark:bg-background">
                                    <FileArchive className="h-4 w-4 mr-1 text-blue-500" /> Parquet
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Issues Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Severity</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Issue</TableHead>
                            <TableHead>Suggestion</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {errors.map((error, idx) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                                        {error.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs">
                                        <span className="font-medium">Row: {error.row}</span>
                                        <span className="text-muted-foreground">Col: {error.column}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs bg-muted/50 p-2 rounded">
                                    {error.value}
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="font-medium text-sm">{error.error_type}</div>
                                        <div className="text-xs text-muted-foreground">{error.reason}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-emerald-600 font-medium">
                                    {error.suggestion}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

