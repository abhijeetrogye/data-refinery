"use client";

import { AppShell } from "@/components/layout/AppShell";
import { JobsTable } from "@/features/jobs/components/JobsTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function JobsPage() {
    return (
        <AppShell>
            <div className="space-y-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Jobs History</h1>
                    <p className="text-muted-foreground">Detailed history of all data processing jobs.</p>
                </div>
                <Card className="glass-panel border-none shadow-md">
                    <CardHeader>
                        <CardTitle>All Jobs</CardTitle>
                        <CardDescription>Manage and monitor your data pipelines.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <JobsTable />
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
