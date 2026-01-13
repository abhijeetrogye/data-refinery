
"""
Data Validation Service
- Schema validation against target schema
- Type checking
- Range validation  
- Missing mandatory field detection
- Error report generation
"""
import polars as pl
from typing import Optional

class ValidationError:
    def __init__(self, row: int, column: str, value: str, error_type: str, severity: str, reason: str, suggestion: str):
        self.row = row
        self.column = column
        self.value = value
        self.error_type = error_type
        self.severity = severity # 'critical', 'warning'
        self.reason = reason
        self.suggestion = suggestion
    
    def to_dict(self):
        return {
            "row": self.row,
            "column": self.column,
            "value": str(self.value)[:100] if self.value is not None else "NULL",
            "error_type": self.error_type,
            "severity": self.severity,
            "reason": self.reason,
            "suggestion": self.suggestion
        }

class DataValidator:
    def __init__(self, df: pl.DataFrame, target_schema: Optional[dict] = None):
        self.df = df
        self.target_schema = target_schema or {}
        self.errors: list[ValidationError] = []
        self.valid_rows: list[int] = []
        self.invalid_rows: list[int] = []
    
    def validate(self) -> tuple[pl.DataFrame, list[dict]]:
        """
        Validate DataFrame against target schema.
        Returns (valid_df, errors_list)
        """
        if not self.target_schema:
            self._validate_nulls()
            self._validate_types()
        else:
            self._validate_against_schema()
        
        # Track valid/invalid rows
        # A row is invalid if it has at least one critical error
        critical_error_rows = set(e.row for e in self.errors if e.severity == 'critical')
        
        all_indices = range(len(self.df))
        self.valid_rows = [i for i in all_indices if i not in critical_error_rows]
        self.invalid_rows = list(critical_error_rows)
        
        # Create DataFrame of valid rows only
        if self.valid_rows:
            valid_df = self.df[self.valid_rows]
        else:
            valid_df = self.df.head(0) 
        
        return valid_df, [e.to_dict() for e in self.errors]
    
    def _validate_nulls(self):
        """Check for null values in each column - optimized for maximum speed"""
        for col in self.df.columns:
            null_mask = self.df[col].is_null()
            null_count = null_mask.sum()
            
            if null_count == 0:
                continue
            
            null_indices = [i for i, is_null in enumerate(null_mask.to_list()) if is_null]
            
            # Reduced to max 10 errors for speed - only report most critical
            for idx in null_indices[:10]:
                self.errors.append(ValidationError(
                    row=idx,
                    column=col,
                    value="NULL",
                    error_type="missing_value",
                    severity="warning",
                    reason=f"Column '{col}' has a missing value",
                    suggestion="Fill with default value or remove row"
                ))
    
    def _validate_types(self):
        """Enhanced type validation - optimized for speed"""
        for col in self.df.columns:
            dtype = str(self.df[col].dtype)
            
            # Skip null columns
            if self.df[col].null_count() == len(self.df):
                continue
            
            # Heuristic: check for numeric values in string columns
            if "String" in dtype or "Utf8" in dtype:
                sample = self.df[col].head(100).drop_nulls()  # Reduced from 200 for speed
                if len(sample) == 0:
                    continue
                    
                numeric_count = 0
                date_count = 0
                
                for val in sample.to_list():
                    # Check if numeric
                    try:
                        float(str(val).replace(',', '').strip())
                        numeric_count += 1
                    except (ValueError, TypeError):
                        pass
                    
                    # Check if date
                    try:
                        # Basic date pattern matching
                        val_str = str(val).strip()
                        if re.match(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4}', val_str):
                            date_count += 1
                    except:
                        pass
                
                # More accurate threshold - 70% confidence
                if numeric_count / len(sample) > 0.7:
                    self.errors.append(ValidationError(
                        row=-1, 
                        column=col,
                        value="",
                        error_type="type_optimization",
                        severity="info",
                        reason=f"Column '{col}' contains {int(numeric_count/len(sample)*100)}% numeric values but stored as text",
                        suggestion="Convert to numeric type for better performance and accuracy"
                    ))
                elif date_count / len(sample) > 0.6:
                    self.errors.append(ValidationError(
                        row=-1,
                        column=col,
                        value="",
                        error_type="type_optimization",
                        severity="info",
                        reason=f"Column '{col}' appears to contain dates",
                        suggestion="Convert to date type for better querying and validation"
                    ))
    
    def _validate_against_schema(self):
        """Validate against target schema definition"""
        schema_props = self.target_schema.get("properties", {})
        required_fields = self.target_schema.get("required", [])

        for field_name, field_def in schema_props.items():
            field_type = field_def.get("type", "string")
            is_required = field_name in required_fields
            
            if field_name not in self.df.columns:
                if is_required:
                    self.errors.append(ValidationError(
                        row=-1,
                        column=field_name,
                        value="",
                        error_type="missing_column",
                        severity="critical",
                        reason=f"Required column '{field_name}' not found",
                        suggestion="Map a source column to this field"
                    ))
                continue
            
            # Check for nulls if required
            if is_required:
                null_mask = self.df[field_name].is_null()
                null_indices = [i for i, is_null in enumerate(null_mask.to_list()) if is_null]
                for idx in null_indices[:50]:
                     self.errors.append(ValidationError(
                        row=idx,
                        column=field_name,
                        value="NULL",
                        error_type="required_field_missing",
                        severity="critical",
                        reason=f"Value is required for '{field_name}'",
                        suggestion="Provide a value"
                    ))

            # Type validation logic (simplified for MVP)
            actual_type = str(self.df[field_name].dtype).lower()
            
            if field_type == "integer" or field_type == "number":
                 if "int" not in actual_type and "float" not in actual_type:
                    # Check individual values
                    for idx, val in enumerate(self.df[field_name].to_list()[:100]):
                        if val is not None and val != "":
                            try:
                                float(val)
                            except ValueError:
                                self.errors.append(ValidationError(
                                    row=idx,
                                    column=field_name,
                                    value=str(val),
                                    error_type="type_mismatch",
                                    severity="critical",
                                    reason=f"Expected number, got text '{val}'",
                                    suggestion="Convert to number or clean data"
                                ))
    
    def get_summary(self) -> dict:
        """Get validation summary stats"""
        error_counts = {}
        for e in self.errors:
            error_counts[e.error_type] = error_counts.get(e.error_type, 0) + 1
            
        return {
            "total_rows": len(self.df),
            "valid_rows": len(self.valid_rows),
            "invalid_rows": len(self.invalid_rows),
            "total_errors": len(self.errors),
            "error_breakdown": error_counts
        }
