"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, AlertCircle, BarChart3, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DataProfileProps {
    jobId: string;
}

interface ColumnProfile {
    type: string;
    null_count: number;
    null_percentage: number;
    unique_count: number;
    mean?: number;
    min?: number;
    max?: number;
    zeros?: number;
    // For histograms
    distribution?: { range: string; count: number }[];
    // For categorical
    top_values?: { value: string; count: number }[];
}

interface ProfileData {
    total_rows: number;
    total_columns: number;
    columns: Record<string, ColumnProfile>;
}

export function DataProfile({ jobId }: DataProfileProps) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeColumn, setActiveColumn] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                // Assuming your backend is at localhost:8000 based on standard setup
                // In prod, use env var
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const response = await axios.get(`${baseUrl}/api/v1/analytics/jobs/${jobId}/profile`);
                setProfile(response.data);
                if (response.data.columns && Object.keys(response.data.columns).length > 0) {
                    setActiveColumn(Object.keys(response.data.columns)[0]);
                }
            } catch (err: any) {
                console.error("Failed to load profile", err);
                setError(err.response?.data?.detail || "Failed to load data profile");
                setLoading(false); // Stop loading on error
            } finally {
                if (profile) setLoading(false);
                // Small hack: if we call setProfile, we want to stop loading after. 
                // But axios is async. We put setLoading(false) in finally? 
                // Wait, if error happened, it's false. If success, it's false.
                setLoading(false);
            }
        };

        if (jobId) {
            fetchProfile();
        }
    }, [jobId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing data profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="my-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Profiling Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!profile) return null;

    const columnsList = Object.keys(profile.columns);
    const currentStat = activeColumn ? profile.columns[activeColumn] : null;

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{profile.total_rows.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Columns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{profile.total_columns}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Data Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-lg font-semibold">Unknown</span>
                            {/* Could calculate overall health score here later */}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
                {/* Column List */}
                <Card className="md:col-span-1 flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="text-lg">Columns</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full px-4 pb-4">
                            <div className="space-y-2">
                                {columnsList.map((col) => {
                                    const stat = profile.columns[col];
                                    const isSelected = activeColumn === col;
                                    // Determine health color based on nulls
                                    const healthColor = stat.null_percentage === 0 ? "bg-green-500" : stat.null_percentage < 10 ? "bg-yellow-500" : "bg-red-500";

                                    return (
                                        <div
                                            key={col}
                                            onClick={() => setActiveColumn(col)}
                                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${isSelected ? "bg-accent/50 border-primary border" : "hover:bg-accent/20 border border-transparent"}`}
                                        >
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium truncate" title={col}>{col}</span>
                                                <span className="text-xs text-muted-foreground">{stat.type}</span>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${healthColor}`} title={`${stat.null_percentage}% missing`} />
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Detailed Stats View */}
                <Card className="md:col-span-3 h-full flex flex-col overflow-hidden">
                    {currentStat ? (
                        <>
                            <CardHeader className="border-b bg-accent/5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            {activeColumn}
                                            <Badge variant="outline">{currentStat.type}</Badge>
                                        </CardTitle>
                                        <CardDescription>Column Statistics</CardDescription>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <div className="flex flex-col items-end">
                                            <span className="text-muted-foreground">Missing Values</span>
                                            <span className={`font-bold ${currentStat.null_count > 0 ? "text-red-500" : "text-green-500"}`}>
                                                {currentStat.null_count} ({currentStat.null_percentage}%)
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-muted-foreground">Unique Values</span>
                                            <span className="font-bold">{currentStat.unique_count}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 overflow-y-auto">

                                {/* Numeric Stats Grid */}
                                {currentStat.mean !== undefined && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase mb-1">Average</div>
                                            <div className="text-xl font-mono">{typeof currentStat.mean === 'number' ? currentStat.mean.toFixed(2) : currentStat.mean}</div>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase mb-1">Minimum</div>
                                            <div className="text-xl font-mono">{currentStat.min}</div>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase mb-1">Maximum</div>
                                            <div className="text-xl font-mono">{currentStat.max}</div>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <div className="text-xs text-muted-foreground uppercase mb-1">Zeros</div>
                                            <div className="text-xl font-mono">{currentStat.zeros}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Distribution Chart */}
                                <div className="h-[300px] w-full mt-6">
                                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Value Distribution
                                    </h3>

                                    {currentStat.distribution ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={currentStat.distribution}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
                                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                />
                                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : currentStat.top_values ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={currentStat.top_values} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                                                <XAxis type="number" fontSize={12} hide />
                                                <YAxis dataKey="value" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
                                                />
                                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                            No distribution data available for this column type
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            Select a column to view details
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
