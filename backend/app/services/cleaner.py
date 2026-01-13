
import polars as pl
from datetime import datetime
import re

class DataCleaner:
    def __init__(self, df: pl.DataFrame, config: dict):
        self.df = df
        self.config = config
        self.stats = {"removed_duplicates": 0, "filled_missing": 0}
        self.transformation_log = []

    def clean(self) -> tuple[pl.DataFrame, list[dict]]:
        if self.config.get("remove_duplicates"):
            self._remove_duplicates()

        # Always fix headers first to avoid confusion in later steps
        self._fix_headers()
        
        if self.config.get("fill_missing"):
            self._fill_missing_values()
            
        if self.config.get("normalize_text"):
            self._normalize_text()
        
        if self.config.get("detect_outliers"):
            self._flag_outliers()
            
        # Smart Structuring enabled by default for accuracy
        if self.config.get("smart_structure", True):
            self._smart_structure_dates()
            self._standardize_phone_numbers()
            
        return self.df, self.transformation_log

    def _fix_headers(self):
        """
        Handle 'duplicate' columns (case-insensitive) and remove 'UNNAMED' columns
        Strategies:
        1. Coalesce case-insensitive duplicates (e.g. 'Email' and 'EMAIL')
        2. Remove columns starting with '__UNNAMED__'
        3. Standardize to snake_case (optional, but good for consistency)
        """
        
        # 1. Identify case-insensitive duplicates
        col_map = {} # normalized_name -> [original_names]
        
        for col in self.df.columns:
            # Skip identifying UNNAMED columns as duplicates of each other (handled later)
            if str(col).startswith("__UNNAMED"):
                continue
                
            norm = col.lower().strip()
            if norm not in col_map:
                col_map[norm] = []
            col_map[norm].append(col)
            
        # Apply Coalescing
        new_cols = []
        dropped_cols = []
        
        for norm, originals in col_map.items():
            if len(originals) > 1:
                # Coalesce: Use first non-null value from the set of columns
                # e.g. coalesce(col("Email"), col("EMAIL")).alias("email")
                expr = pl.coalesce([pl.col(o) for o in originals]).alias(originals[0].title()) # Use Title Case for niceness
                new_cols.append(expr)
                
                # Log the merge
                self.transformation_log.append({
                    "step": "Header Fix",
                    "row": -1,
                    "column": f"{originals}",
                    "message": f"Merged duplicate columns {originals} into '{originals[0].title()}'",
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                # Keep original
                new_cols.append(pl.col(originals[0]))

        # Select the new coalesced columns + any that weren't in the map (unnamed ones)
        # Actually, we should handle unnamed ones here too
        
        # Perform the select to update DF structure
        if new_cols:
            self.df = self.df.select(new_cols)
            
        # 2. Handle __UNNAMED__ columns
        # Polars often names them like "__UNNAMED__1"
        to_drop = [c for c in self.df.columns if str(c).startswith("__UNNAMED")]
        
        if to_drop:
            self.df = self.df.drop(to_drop)
            self.transformation_log.append({
                "step": "Header Fix",
                "row": -1,
                "column": "Multiple",
                "message": f"Removed unnamed/empty header columns: {to_drop}",
                "timestamp": datetime.utcnow().isoformat()
            })

    def _remove_duplicates(self):
        initial_count = len(self.df)
        
        # For better accuracy, try to identify key columns (ID, email, etc.)
        key_cols = [col for col in self.df.columns if any(keyword in col.lower() for keyword in ['id', 'email', 'phone', 'uuid'])]
        
        if key_cols:
            # Remove duplicates based on key columns only (more accurate)
            self.df = self.df.unique(subset=key_cols, maintain_order=True)
            removed = initial_count - len(self.df)
            # Skip logging for speed - just track stats
        else:
            # Remove complete row duplicates
            self.df = self.df.unique(maintain_order=True)
        
        self.stats["removed_duplicates"] = initial_count - len(self.df)

    def _fill_missing_values(self):
        # Batch transformations for better performance
        transformations = []
        
        for col, dtype in zip(self.df.columns, self.df.dtypes):
            null_count = self.df[col].null_count()
            if null_count > 0:
                if dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32]:
                    transformations.append(pl.col(col).fill_null(0).alias(col))
                    val = "0"
                elif dtype == pl.Utf8:
                    transformations.append(pl.col(col).fill_null("N/A").alias(col))
                    val = "N/A"
                else:
                    continue
                    
                self.transformation_log.append({
                    "step": "Fill Missing",
                    "row": -1,
                    "column": col,
                    "message": f"Filled {null_count} missing values with default '{val}'",
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        # Apply all transformations in one operation for better performance
        if transformations:
            self.df = self.df.with_columns(transformations)
            
        self.stats["filled_missing"] = "Applied Global"

    def _normalize_text(self):
        for col, dtype in zip(self.df.columns, self.df.dtypes):
            if dtype == pl.Utf8:
                # Skip normalization for emails and URLs to preserve accuracy
                sample = self.df[col].head(10).drop_nulls()
                if len(sample) > 0:
                    sample_vals = sample.to_list()
                    # Check if column contains emails or URLs
                    is_email = any('@' in str(val) for val in sample_vals)
                    is_url = any(str(val).startswith(('http://', 'https://')) for val in sample_vals)
                    
                    if is_email or is_url:
                        # Only trim whitespace for emails/URLs, preserve case
                        self.df = self.df.with_columns(
                            pl.col(col).str.strip_chars()
                        )
                        continue
                
                # Normal text - trim and titlecase
                self.df = self.df.with_columns(
                    pl.col(col).str.strip_chars().str.to_titlecase()
                )
                self.transformation_log.append({
                    "step": "Normalization",
                    "row": -1,
                    "column": col,
                    "message": "Trimmed whitespace and normalized text case",
                    "timestamp": datetime.utcnow().isoformat()
                })

    def _smart_structure_dates(self):
        """Attempt to identify and standardize date columns to ISO format"""
        date_patterns = [
            (r'\d{2}/\d{2}/\d{4}', '%m/%d/%Y'), # US style
            (r'\d{4}-\d{2}-\d{2}', '%Y-%m-%d'), # ISO
            (r'\d{2}-\d{2}-\d{4}', '%d-%m-%Y'), # EU style
        ]
        
        for col, dtype in zip(self.df.columns, self.df.dtypes):
            if dtype == pl.Utf8:
                # heuristic: check first non-null value
                sample = self.df[col].drop_nulls().head(1)
                if len(sample) == 0: continue
                val = sample[0]
                
                for pat, fmt in date_patterns:
                    if re.match(pat, str(val)):
                        try:
                            # Try converting column
                            self.df = self.df.with_columns(
                                pl.col(col).str.to_date(fmt, strict=False).cast(pl.Utf8)
                            )
                            self.transformation_log.append({
                                "step": "Smart Structuring",
                                "row": -1,
                                "column": col,
                                "message": f"Detected date format {fmt}, standardized to YYYY-MM-DD",
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            break
                        except:
                            pass

    def _standardize_phone_numbers(self):
        """Standardize phone numbers to E.164 if possible"""
        # Heuristic: look for columns with 'phone' or 'tel' in name
        for col in self.df.columns:
            if 'phone' in col.lower() or 'tel' in col.lower() or 'mobile' in col.lower():
                # Remove non-numeric chars
                if self.df[col].dtype == pl.Utf8:
                    self.df = self.df.with_columns(
                        pl.col(col).str.replace_all(r"[^0-9+]", "")
                    )
                    self.transformation_log.append({
                        "step": "Smart Structuring",
                        "row": -1,
                        "column": col,
                        "message": "Standardized phone number format (removed formatting characters)",
                        "timestamp": datetime.utcnow().isoformat()
                    })
