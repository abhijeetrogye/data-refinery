"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, FileWarning, CheckCircle2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ValidationError {
    row: number;
    column: string;
    value: string;
    error_type: string;
    reason: string;
    suggestion: string;
}

interface Props {
    errors: ValidationError[];
    summary: {
        total_rows?: number;
        valid_rows?: number;
        invalid_rows?: number;
        total_errors?: number;
        error_breakdown?: Record<string, number>;
    };
}

export function ErrorReport({ errors, summary }: Props) {
    const [searchTerm, setSearchTerm] = useState("");

    if (!errors || errors.length === 0) {
        return (
            <div className="py-8 text-center animate-slide-up">
                <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800">Perfect Validation!</h3>
                <p className="text-slate-500 mt-2">All data rows conform to the defined schema and quality standards.</p>
            </div>
        );
    }

    const filteredErrors = errors.filter(e =>
        e.column.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.error_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card shadow-sm border-0">
                    <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rows</p>
                        <p className="text-2xl font-bold text-slate-800">{(summary.total_rows || 0).toLocaleString()}</p>
                    </div>
                </Card>
                <Card className="glass-card shadow-sm border-0">
                    <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Rows</p>
                        <p className="text-2xl font-bold text-emerald-600">{(summary.valid_rows || 0).toLocaleString()}</p>
                    </div>
                </Card>
                <Card className="glass-card shadow-sm border-0">
                    <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Failed Rows</p>
                        <p className="text-2xl font-bold text-red-500">{(summary.invalid_rows || 0).toLocaleString()}</p>
                    </div>
                </Card>
                <Card className="glass-card shadow-sm border-0">
                    <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Error Count</p>
                        <p className="text-2xl font-bold text-amber-600">{(summary.total_errors || errors.length).toLocaleString()}</p>
                    </div>
                </Card>
            </div>

            <Card className="premium-card border-0">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <FileWarning className="h-5 w-5 text-red-500" />
                                Error Details
                            </CardTitle>
                            <CardDescription>Pinpoint and fix specific issues in your dataset</CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Filter errors..."
                                className="pl-9 h-9 glass border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                        <div className="overflow-x-auto max-h-[500px]">
                            <Table className="premium-table">
                                <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                                        <TableHead className="w-20 font-bold text-slate-700">ROW</TableHead>
                                        <TableHead className="font-bold text-slate-700">COLUMN</TableHead>
                                        <TableHead className="font-bold text-slate-700">ERROR TYPE</TableHead>
                                        <TableHead className="font-bold text-slate-700">REASON</TableHead>
                                        <TableHead className="font-bold text-slate-700">AI SUGGESTION</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredErrors.length > 0 ? (
                                        filteredErrors.map((error, idx) => (
                                            <TableRow key={idx} className="group hover:bg-violet-50/50 transition-colors">
                                                <TableCell className="font-mono text-slate-400">
                                                    {error.row === -1 ? "Global" : `#${error.row + 1}`}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-xs">
                                                        {error.column}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`status-badge flex w-fit items-center gap-1.5 ${error.error_type.includes('missing') ? 'bg-amber-100 text-amber-700' :
                                                            error.error_type.includes('type') ? 'bg-orange-100 text-orange-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {error.error_type.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-slate-600 max-w-xs">{error.reason}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100/50 text-blue-700 text-xs">
                                                        <span className="font-bold flex-shrink-0">AI:</span>
                                                        {error.suggestion}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                                                No matches found for "{searchTerm}"
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

