"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SchemaManager } from "@/components/SchemaManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SchemasPage() {
    return (
        <AppShell>
            <div className="space-y-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Schema Management</h1>
                    <p className="text-muted-foreground">Define and manage schemas for your data sources.</p>
                </div>
                <Card className="glass-panel border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Schemas</CardTitle>
                        <CardDescription>Configure validation rules and types.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SchemaManager />
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
