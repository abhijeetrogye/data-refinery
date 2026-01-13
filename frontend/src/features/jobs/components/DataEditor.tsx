"use client";

import React, { useState, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import { Loader2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PaginationControls } from "@/components/ui/pagination";

interface DataEditorProps {
    jobId: string;
}

interface DataPreviewResponse {
    columns: string[];
    data: any[];
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
    message?: string;
}


export function DataEditor({ jobId }: DataEditorProps) {
    const queryClient = useQueryClient();
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on new search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const offset = (currentPage - 1) * pageSize;

    const { data: previewData, isLoading, refetch } = useQuery({
        queryKey: ["jobData", jobId, pageSize, offset, debouncedSearch],
        queryFn: async () => {
            const params: any = {
                limit: pageSize,
                offset: offset
            };
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            const res = await api.get<DataPreviewResponse>(`${endpoints.jobs}/${jobId}/data`, {
                params
            });
            return res.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: { updates: { row_index: number; column: string; value: string }[] }) => {
            await api.put(`${endpoints.jobs}/${jobId}/data/update`, payload);
        },
        onSuccess: () => {
            toast.success("Data updated");
            refetch(); // Reload to confirm
        },
        onError: () => toast.error("Failed to update data"),
    });

    // Editable Cell Component
    const EditableCell = ({ getValue, row, column, table }: any) => {
        const initialValue = getValue();
        const [value, setValue] = useState(initialValue);
        const [isEditing, setIsEditing] = useState(false);

        const onBlur = () => {
            setIsEditing(false);
            if (value !== initialValue) {
                updateMutation.mutate({
                    updates: [{
                        row_index: offset + row.index, // Adjust for pagination offset
                        column: column.id,
                        value: String(value)
                    }]
                });
            }
        };

        useEffect(() => {
            setValue(initialValue);
        }, [initialValue]);

        if (isEditing) {
            return (
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={onBlur}
                    autoFocus
                    className="h-8 w-full"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            onBlur();
                        }
                    }}
                />
            );
        }

        return (
            <div
                className="h-8 flex items-center px-2 cursor-pointer hover:bg-muted/50 rounded"
                onClick={() => setIsEditing(true)}
            >
                {value}
            </div>
        );
    };

    // Dynamic Columns
    const columns = React.useMemo(() => {
        if (!previewData?.columns) return [];
        const helper = createColumnHelper<any>();
        return previewData.columns.map((col) =>
            helper.accessor(col, {
                header: col,
                cell: EditableCell,
            })
        );
    }, [previewData?.columns]);


    const table = useReactTable({
        data: previewData?.data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!previewData?.data) {
        return <div>No data available</div>;
    }

    const hasResults = previewData.data.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search across all columns..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    Click cells to edit. Changes save automatically.
                </span>
            </div>

            {!hasResults ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery ? `No data matches "${searchQuery}"` : "No data available"}
                    </p>
                    {searchQuery && (
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setSearchQuery("")}
                        >
                            Clear search
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id} className="border-b bg-muted/50">
                                        {headerGroup.headers.map((header) => (
                                            <th key={header.id} className="h-10 px-4 text-left font-medium">
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map((row) => (
                                    <tr key={row.id} className="border-b hover:bg-muted/20">
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="p-1">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationControls
                        currentPage={currentPage}
                        totalRows={previewData.total}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1); // Reset to first page
                        }}
                        hasMore={previewData.has_more}
                    />
                </>
            )}
        </div>
    );
}
