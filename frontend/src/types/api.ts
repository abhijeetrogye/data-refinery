export interface Job {
    id: string;
    filename: string;
    status: 'uploaded' | 'queued' | 'processing' | 'cleaning' | 'validating' | 'completed' | 'failed';
    message?: string;
    source_type: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    total_rows?: number;
    processed_rows?: number;
    inferred_schema?: Record<string, string>;
    transformation_log?: any[];
    validation_errors?: any[];
    validation_summary?: {
        total_rows: number;
        valid_rows: number;
        invalid_rows: number;
        total_errors: number;
        error_breakdown: Record<string, number>;
    };
    output_path?: string;
    target_schema_id?: string;
    field_mapping?: Record<string, string>;
}

export interface CleaningConfig {
    remove_duplicates: boolean;
    fill_missing: boolean;
    normalize_text: boolean;
}
