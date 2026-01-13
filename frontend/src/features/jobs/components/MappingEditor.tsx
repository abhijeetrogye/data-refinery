"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MappingEditorProps {
    jobId: string;
    sourceFields: Record<string, string>;
    targetSchemaId?: string;
    currentMapping?: Record<string, string>;
    onSave?: () => void;
}

interface TargetSchema {
    _id: string;
    name: string;
    schema_def: {
        properties?: Record<string, { type: string; description?: string }>;
    };
}

interface MappingSuggestion {
    source_field: string;
    target_field: string;
    confidence: number;
    method: string;
}

export function MappingEditor({ jobId, sourceFields, targetSchemaId, currentMapping = {}, onSave }: MappingEditorProps) {
    const queryClient = useQueryClient();
    const [mapping, setMapping] = useState<Record<string, string>>(currentMapping);
    const [selectedSchema, setSelectedSchema] = useState<string | null>(targetSchemaId || null);

    // Fetch available schemas
    const { data: schemas } = useQuery({
        queryKey: ['schemas'],
        queryFn: async () => (await api.get<TargetSchema[]>('/schemas/')).data
    });

    // Fetch AI suggestions when schema is selected
    const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
        queryKey: ['mapping-suggestions', jobId, selectedSchema],
        queryFn: async () => (await api.get<{ suggestions: MappingSuggestion[] }>(`${endpoints.jobs}/${jobId}/suggest-mappings?target_schema_id=${selectedSchema}`)).data,
        enabled: !!selectedSchema
    });

    // Apply suggestions when they load
    useEffect(() => {
        if (suggestions?.suggestions) {
            const suggestedMapping: Record<string, string> = {};
            suggestions.suggestions.forEach(s => {
                if (s.confidence > 0.5) {
                    suggestedMapping[s.source_field] = s.target_field;
                }
            });
            setMapping(prev => ({ ...suggestedMapping, ...prev }));
        }
    }, [suggestions]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            return api.post(`${endpoints.jobs}/${jobId}/map`, {
                target_schema_id: selectedSchema,
                field_mapping: mapping
            });
        },
        onSuccess: () => {
            toast.success("Mapping saved successfully");
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
            onSave?.();
        },
        onError: () => toast.error("Failed to save mapping")
    });

    // Get target schema fields
    const targetSchema = schemas?.find(s => s._id === selectedSchema);
    const targetFields = Object.keys(targetSchema?.schema_def?.properties || {});

    // Get confidence for a field from suggestions
    const getConfidence = (sourceField: string): number => {
        const suggestion = suggestions?.suggestions?.find(s => s.source_field === sourceField);
        return suggestion?.confidence || 0;
    };

    return (
        <Card className="glass-panel">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Field Mapping Editor
                </CardTitle>
                <CardDescription>
                    Map source fields to your target schema. AI suggestions are highlighted.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Schema Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Target Schema</label>
                    <Select
                        value={selectedSchema || ""}
                        onValueChange={(v) => setSelectedSchema(v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a target schema..." />
                        </SelectTrigger>
                        <SelectContent>
                            {schemas?.map((schema, index) => (
                                <SelectItem key={schema._id || `schema-${index}`} value={schema._id}>
                                    {schema.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Mapping Table */}
                {selectedSchema && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                            <span>Source Field</span>
                            <span></span>
                            <span>Target Field</span>
                            <span>Confidence</span>
                        </div>

                        {Object.keys(sourceFields).map((sourceField) => {
                            const confidence = getConfidence(sourceField);
                            const isAiSuggested = confidence > 0.7;

                            return (
                                <div
                                    key={sourceField}
                                    className={cn(
                                        "grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center p-2 rounded-lg",
                                        isAiSuggested && "bg-primary/5 border border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono bg-secondary px-2 py-1 rounded">
                                            {sourceField}
                                        </code>
                                        <span className="text-xs text-muted-foreground">
                                            ({sourceFields[sourceField]})
                                        </span>
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                                    <Select
                                        value={mapping[sourceField] || "__skip__"}
                                        onValueChange={(v) => setMapping(prev => ({ ...prev, [sourceField]: v === "__skip__" ? "" : v }))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__skip__">-- Skip --</SelectItem>
                                            {targetFields.map(field => (
                                                <SelectItem key={field} value={field}>
                                                    {field}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="w-20 text-center">
                                        {confidence > 0 && (
                                            <Badge
                                                variant={confidence > 0.8 ? "default" : confidence > 0.5 ? "secondary" : "outline"}
                                                className="text-xs"
                                            >
                                                {Math.round(confidence * 100)}%
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Actions */}
                {selectedSchema && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setMapping({})}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Mapping
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {loadingSuggestions && (
                    <div className="text-center py-4 text-muted-foreground">
                        <Sparkles className="h-5 w-5 animate-pulse inline mr-2" />
                        Loading AI suggestions...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
