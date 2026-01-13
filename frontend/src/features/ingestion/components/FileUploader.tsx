"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileType, X, FileSpreadsheet, FileJson, FileText, FileImage, Database, Sparkles, Check, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { CleaningConfig } from "@/types/api";
import { Badge } from "@/components/ui/badge";

interface FileUploaderProps {
    onUploadComplete: () => void;
}

const SUPPORTED_FORMATS = [
    { ext: "CSV", icon: FileSpreadsheet, color: "text-emerald-500" },
    { ext: "JSON", icon: FileJson, color: "text-yellow-500" },
    { ext: "Parquet", icon: Database, color: "text-purple-500" },
    { ext: "Excel", icon: FileSpreadsheet, color: "text-green-600" },
    { ext: "XML", icon: FileText, color: "text-orange-500" },
    { ext: "PDF", icon: FileImage, color: "text-rose-500" },
    { ext: "TXT", icon: FileText, color: "text-blue-500" },
];

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [autoProcess, setAutoProcess] = useState(false);

    // Load auto-process setting from localStorage and listen for changes
    useEffect(() => {
        // Initial load
        const saved = localStorage.getItem('autoProcess');
        setAutoProcess(saved === 'true');

        // Listen for changes to localStorage (from settings page)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'autoProcess' && e.newValue !== null) {
                setAutoProcess(e.newValue === 'true');
            }
        };

        // Also listen for changes in the same tab by using a custom event
        const handleCustomStorageChange = () => {
            const saved = localStorage.getItem('autoProcess');
            setAutoProcess(saved === 'true');
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('localStorageChange', handleCustomStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('localStorageChange', handleCustomStorageChange);
        };
    }, []);

    const [config, setConfig] = useState<CleaningConfig>({
        remove_duplicates: true,
        fill_missing: true,
        normalize_text: false,
    });

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setProgress(0);
        let successCount = 0;
        let failCount = 0;

        // Process files in batches of 5 for maximum parallel upload speed
        const batchSize = 5;  // Increased from 3 to 5
        const batches = [];
        for (let i = 0; i < files.length; i += batchSize) {
            batches.push(files.slice(i, i + batchSize));
        }

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            setCurrentFileIndex(batchIndex * batchSize);

            // Upload files in parallel within each batch
            const uploadPromises = batch.map(async (file, indexInBatch) => {
                const formData = new FormData();
                formData.append("file", file);

                // Auto-detect source type
                const ext = file.name.split(".").pop()?.toLowerCase();
                let sourceType = "csv";
                if (["json", "parquet", "xlsx", "xls", "xml", "pdf", "txt"].includes(ext || "")) {
                    sourceType = ext === "xls" ? "excel" : ext || "csv";
                }
                formData.append("source_type", sourceType);
                formData.append("cleaning_config", JSON.stringify(config));

                try {
                    console.log(`Starting upload for ${file.name}...`);
                    const uploadResponse = await api.post(endpoints.upload, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                        onUploadProgress: (progressEvent) => {
                            const fileProgress = progressEvent.total
                                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                                : 0;
                            // Calculate total progress across all files
                            const globalIndex = batchIndex * batchSize + indexInBatch;
                            const overallProgress = Math.round(((globalIndex + fileProgress / 100) / files.length) * 100);
                            setProgress(overallProgress);
                        },
                    });
                    console.log(`Upload successful for ${file.name}`);

                    // Auto-process if enabled
                    if (autoProcess && uploadResponse.data?.id) {
                        try {
                            await api.post(`${endpoints.jobs}/${uploadResponse.data.id}/process`);
                            console.log(`Auto-processing started for job ${uploadResponse.data.id}`);
                        } catch (processError) {
                            console.error('Auto-process failed:', processError);
                        }
                    }

                    return { success: true, file: file.name };
                } catch (error: any) {
                    console.error(`Upload error for ${file.name}:`, error);
                    if (error.response) {
                        console.error("Response data:", error.response.data);
                        toast.error(`Error: ${error.response.data.detail || "Upload failed"}`);
                    } else if (error.request) {
                        console.error("No response received");
                        toast.error("Server not responding. Please check if backend is running.");
                    } else {
                        toast.error(`Request error: ${error.message}`);
                    }
                    return { success: false, file: file.name };
                }
            });

            // Wait for all uploads in this batch to complete
            const results = await Promise.allSettled(uploadPromises);
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            });
        }

        if (successCount > 0) {
            toast.success(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''} successfully`);
        }
        if (failCount > 0) {
            toast.error(`Failed to upload ${failCount} file${failCount > 1 ? 's' : ''}`);
        }

        setFiles([]);
        setUploading(false);
        setProgress(0);
        setCurrentFileIndex(0);
        onUploadComplete();
    };

    return (
        <div className="w-full space-y-4">
            {/* Supported Formats Header */}
            <div className="flex flex-wrap gap-2 justify-center">
                {SUPPORTED_FORMATS.map(({ ext, icon: Icon, color }) => (
                    <Badge key={ext} variant="outline" className="flex items-center gap-1 py-1">
                        <Icon className={cn("h-3 w-3", color)} />
                        <span className="text-xs">{ext}</span>
                    </Badge>
                ))}
            </div>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer",
                    files.length > 0
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => document.getElementById("file-upload")?.click()}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".csv,.json,.parquet,.xlsx,.xls,.xml,.pdf,.txt"
                    multiple
                />

                {files.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium">Drop your files here</p>
                        <p className="text-xs text-muted-foreground">or click to browse (multiple files supported)</p>
                    </div>
                ) : (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2 text-primary">
                            <Files className="h-5 w-5" />
                            <span className="font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                        </div>

                        {/* File List */}
                        <div className="max-h-40 overflow-y-auto space-y-2">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg border text-left"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileType className="h-4 w-4 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add more files button */}
                        {!uploading && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); document.getElementById("file-upload")?.click(); }}
                            >
                                <Upload className="h-3 w-3 mr-2" />
                                Add More Files
                            </Button>
                        )}

                        {uploading && (
                            <div className="w-full space-y-1">
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-center text-muted-foreground">
                                    Uploading file {currentFileIndex + 1} of {files.length}... {progress}%
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Cleaning Options */}
            {files.length > 0 && !uploading && (
                <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Auto-Cleaning Options
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { key: 'remove_duplicates', label: 'Remove Duplicates', desc: 'Delete identical rows' },
                            { key: 'fill_missing', label: 'Handle Missing Values', desc: 'Smart imputation' },
                            { key: 'normalize_text', label: 'Normalize Text', desc: 'Standardize formats' },
                        ].map((opt) => (
                            <label
                                key={opt.key}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                                    config[opt.key as keyof CleaningConfig]
                                        ? "bg-primary/5 border-primary/30"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <div className={cn(
                                    "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                                    config[opt.key as keyof CleaningConfig]
                                        ? "bg-primary border-primary"
                                        : "border-border"
                                )}>
                                    {config[opt.key as keyof CleaningConfig] && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config[opt.key as keyof CleaningConfig]}
                                    onChange={(e) => setConfig(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                                    className="sr-only"
                                />
                                <div>
                                    <p className="text-sm font-medium">{opt.label}</p>
                                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <Button onClick={uploadFiles} className="w-full" size="lg">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {files.length} File{files.length > 1 ? 's' : ''}
                    </Button>
                </div>
            )}
        </div>
    );
}


