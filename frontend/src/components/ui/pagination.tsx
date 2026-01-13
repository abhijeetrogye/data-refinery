import React from "react";
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface PaginationControlsProps {
    currentPage: number;
    totalRows: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    hasMore?: boolean;
}

export function PaginationControls({
    currentPage,
    totalRows,
    pageSize,
    onPageChange,
    onPageSizeChange,
    hasMore = false,
}: PaginationControlsProps) {
    const totalPages = Math.ceil(totalRows / pageSize);
    const startRow = (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, totalRows);

    return (
        <div className="flex items-center justify-between px-2 py-3 border-t">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    Showing {startRow} to {endRow} of {totalRows} rows
                </span>
            </div>

            <div className="flex items-center gap-6">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => onPageSizeChange(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || !hasMore}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
