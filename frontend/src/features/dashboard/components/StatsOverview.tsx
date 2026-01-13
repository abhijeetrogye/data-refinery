import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Clock } from "lucide-react";

interface StatsOverviewProps {
    stats: {
        total: number;
        completed: number;
        failed: number;
        processing: number;
        success_rate: number;
    };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card className="glass-panel">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                        All time volume
                    </p>
                </CardContent>
            </Card>
            <Card className="glass-panel">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">{stats.success_rate}%</div>
                    <p className="text-xs text-muted-foreground">
                        Completed successfully
                    </p>
                </CardContent>
            </Card>
            <Card className="glass-panel">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Processing</CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
                    <p className="text-xs text-muted-foreground">
                        Active pipelines
                    </p>
                </CardContent>
            </Card>
            <Card className="glass-panel">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                    <Clock className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-rose-600">{stats.failed}</div>
                    <p className="text-xs text-muted-foreground">
                        Requires attention
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
