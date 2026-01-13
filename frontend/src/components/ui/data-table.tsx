"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreHorizontal, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    jobId?: string; // Added to support API calls
    onDataUpdate?: () => void;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    jobId,
    onDataUpdate
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [isRepairing, setIsRepairing] = React.useState(false);

    const handleSmartRepair = async (columnName: string) => {
        if (!jobId) return;

        try {
            setIsRepairing(true);
            toast.info(`Starting Smart Repair for ${columnName}...`, {
                description: "AI is analyzing and fixing inconsistencies. This may take a moment."
            });

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await axios.post(`${baseUrl}/api/v1/jobs/${jobId}/smart-repair`, {
                column: columnName
            });

            toast.success("Smart Repair Complete", {
                description: `Fixed ${response.data.changes_applied} values.`
            });

            if (onDataUpdate) {
                onDataUpdate();
            }
        } catch (error: any) {
            console.error("Smart Repair failed", error);
            toast.error("Repair Failed", {
                description: error.response?.data?.detail || "Could not complete smart repair."
            });
        } finally {
            setIsRepairing(false);
        }
    };

    // Enhance columns with header actions if jobId is present
    const enhancedColumns = React.useMemo(() => {
        if (!jobId) return columns;

        return columns.map((col) => {
            // Only add actions to non-display columns if needed, 
            // but for now apply to all data columns
            const originalHeader = col.header;

            return {
                ...col,
                header: ({ column, header, table }: { column: any, header: any, table: any }) => { // TODO: Use proper Tanstack types if possible, e.g. HeaderContext<TData, TValue>
                    // Render original header first
                    const content = typeof originalHeader === 'function'
                        ? originalHeader({ column, header, table })
                        : originalHeader;

                    // If it's a simple string header, wrap it. 
                    // If it's already a complex component, we might be breaking layout.
                    // For safety, we append a menu trigger.

                    // Simple check: don't add to "actions" or "select" columns if named so
                    if (col.id === 'actions' || col.id === 'select') return content;

                    return (
                        <div className="flex items-center space-x-2 group">
                            <span>{content}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                                        Sort {column.getIsSorted() === "asc" ? "Desc" : "Asc"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleSmartRepair(col.id || column.id)}
                                        disabled={isRepairing}
                                    >
                                        <Sparkles className="mr-2 h-3 w-3 text-purple-500" />
                                        Smart Repair
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                }
            }
        });
    }, [columns, jobId, isRepairing]);

    const table = useReactTable({
        data,
        columns: enhancedColumns as ColumnDef<TData, TValue>[],
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-muted/50 border-b border-border">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-10 text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
