"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileJson, Database, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { API_BASE_URL } from "@/lib/api";

interface Props {
    jobId: string;
    disabled?: boolean;
}

export function DownloadButton({ jobId, disabled }: Props) {
    const [downloading, setDownloading] = useState(false);
    const baseUrl = API_BASE_URL;

    const handleDownload = async (format: string) => {
        setDownloading(true);
        try {
            const response = await fetch(`${baseUrl}/jobs/${jobId}/export?format=${format}`);
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `job_${jobId}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed:", e);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={disabled || downloading} className="h-8">
                    {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Download className="mr-1 h-4 w-4" /> Export
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("csv")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("json")}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Download JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("parquet")}>
                    <Database className="mr-2 h-4 w-4" />
                    Download Parquet
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
