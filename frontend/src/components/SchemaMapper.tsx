"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Schema {
    id: string;
    name: string;
    schema_def: Record<string, string>;
}

interface Props {
    job: any;
    onMapped: () => void;
}

export function SchemaMapper({ job, onMapped }: Props) {
    const [schemas, setSchemas] = useState<Schema[]>([]);
    const [selectedSchemaId, setSelectedSchemaId] = useState<string>(
        job.target_schema_id ? String(job.target_schema_id) : ""
    );
    const [mapping, setMapping] = useState<Record<string, string>>(job.field_mapping || {});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Fetch available schemas
    useEffect(() => {
        const fetchSchemas = async () => {
            try {
                const res = await api.get("/schemas");
                setSchemas(res.data);
            } catch (e) {
                console.error("Failed to load schemas");
            }
        };
        fetchSchemas();
    }, []);

    const selectedSchema = schemas.find(s => s.id === selectedSchemaId);
    const jobColumns = job.inferred_schema ? Object.keys(job.inferred_schema) : [];

    const handleSave = async () => {
        if (!selectedSchemaId) return;
        setSaving(true);
        try {
            await api.post(`/jobs/${job.id}/map`, {
                target_schema_id: selectedSchemaId,
                field_mapping: mapping
            });
            onMapped();
        } catch (e) {
            setError("Failed to save mapping");
        } finally {
            setSaving(false);
        }
    };

    const autoMap = (schema: Schema) => {
        // Simple heuristic: exact name match (case-insensitive)
        const newMapping: Record<string, string> = {};
        Object.keys(schema.schema_def).forEach(targetCol => {
            const match = jobColumns.find(c => c.toLowerCase() === targetCol.toLowerCase());
            if (match) {
                newMapping[targetCol] = match;
            }
        });
        setMapping(newMapping);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium">Target Schema</label>
                <Select
                    value={selectedSchemaId}
                    onValueChange={(val) => {
                        setSelectedSchemaId(val);
                        const schema = schemas.find(s => s.id === val);
                        if (schema) autoMap(schema);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a schema to map to..." />
                    </SelectTrigger>
                    <SelectContent>
                        {schemas.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedSchema && (
                <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                        <span>Target Field ({selectedSchema.name})</span>
                        <span>Source Column ({job.filename})</span>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(selectedSchema.schema_def).map(([targetCol, type]) => (
                            <div key={targetCol} className="flex items-center gap-4">
                                <div className="w-1/2 flex flex-col">
                                    <span className="font-medium text-sm">{targetCol}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{type as string}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="w-1/2">
                                    <Select
                                        value={mapping[targetCol] || ""}
                                        onValueChange={(val) => setMapping(prev => ({ ...prev, [targetCol]: val }))}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select column..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobColumns.map(col => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>

                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                    <div className="pt-2 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Mapping</>}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
