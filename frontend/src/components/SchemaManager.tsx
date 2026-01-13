"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Database, Code, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Schema {
    _id: string; // Key returned by backend is _id
    name: string;
    description: string;
    schema_def: Record<string, string>;
    created_at: string;
}

export function SchemaManager() {
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [loading, setLoading] = useState(false);
    const [newSchema, setNewSchema] = useState({ name: "", description: "", def_json: '{\n  "column_name": "string"\n}' });
    const [error, setError] = useState("");

    const fetchSchemas = async () => {
        try {
            const res = await api.get("/schemas");
            setSchemas(res.data);
        } catch (e) {
            console.error("Failed to list schemas");
        }
    };

    useEffect(() => {
        fetchSchemas();
    }, []);

    const handleCreate = async () => {
        if (!newSchema.name) return;
        setLoading(true);
        setError("");

        try {
            let schemaDef = {};
            try {
                schemaDef = JSON.parse(newSchema.def_json);
            } catch (e) {
                throw new Error("Invalid JSON definition");
            }

            await api.post("/schemas", {
                name: newSchema.name,
                description: newSchema.description,
                schema_def: schemaDef
            });

            setNewSchema({ name: "", description: "", def_json: '{\n  "column_name": "string"\n}' });
            fetchSchemas();
        } catch (e: any) {
            setError(e.message || "Failed to create schema");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Create Target Schema</CardTitle>
                        <CardDescription>Define the expected structure of your output data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Schema Name</label>
                            <Input
                                placeholder="e.g. Customer Data"
                                value={newSchema.name}
                                onChange={e => setNewSchema({ ...newSchema, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Optional description"
                                value={newSchema.description}
                                onChange={e => setNewSchema({ ...newSchema, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Field Definitions (JSON)</label>
                            <textarea
                                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                value={newSchema.def_json}
                                onChange={e => setNewSchema({ ...newSchema, def_json: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Define column names and their expected types.</p>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button className="w-full" onClick={handleCreate} disabled={loading || !newSchema.name}>
                            {loading ? "Creating..." : <><Plus className="mr-2 h-4 w-4" /> Create Schema</>}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-8">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Existing Schemas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Fields</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schemas.map((schema, index) => (
                                    <TableRow key={schema._id || index}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Database className="h-4 w-4 text-purple-500" /> {schema.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.keys(schema.schema_def).slice(0, 3).map(key => (
                                                    <span key={key} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10">
                                                        {key}
                                                    </span>
                                                ))}
                                                {Object.keys(schema.schema_def).length > 3 && (
                                                    <span className="text-xs text-muted-foreground">+{Object.keys(schema.schema_def).length - 3} more</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {new Date(schema.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={async () => {
                                                    if (confirm("Are you sure you want to delete this schema?")) {
                                                        try {
                                                            await api.delete(`/schemas/${schema._id}`);
                                                            fetchSchemas();
                                                        } catch (e) {
                                                            alert("Failed to delete schema");
                                                        }
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {schemas.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                            No schemas defined yet. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
