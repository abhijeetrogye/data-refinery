import polars as pl
from typing import Dict, Any, List
import math

class DataProfiler:
    def __init__(self, df: pl.DataFrame):
        self.df = df
        
    def get_profile(self) -> Dict[str, Any]:
        """Generate a comprehensive profile of the dataset"""
        stats = {
            "total_rows": len(self.df),
            "total_columns": len(self.df.columns),
            "columns": {}
        }
        
        for col_name in self.df.columns:
            stats["columns"][col_name] = self._profile_column(col_name)
            
        return stats
    
    def _profile_column(self, col: str) -> Dict[str, Any]:
        """Generate statistics for a single column"""
        s = self.df[col]
        null_count = s.null_count()
        total_count = len(s)
        
        profile = {
            "type": str(s.dtype),
            "null_count": null_count,
            "null_percentage": round((null_count / total_count) * 100, 2) if total_count > 0 else 0,
            "unique_count": s.n_unique(),
        }
        
        # Numeric Stats
        if s.dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32]:
            profile.update({
                "mean": s.mean(),
                "min": s.min(),
                "max": s.max(),
                "std": s.std(),
                "zeros": (s == 0).sum()
            })
            
            # Simple histogram (bucketed)
            try:
                # Basic hist logic - Polars hist is distinct
                # Use approximate method for speed
                min_val = s.min()
                max_val = s.max()
                if min_val is not None and max_val is not None and min_val != max_val:
                    # Create 10 bins
                    profile["distribution"] = self._get_numeric_distribution(s)
            except Exception:
                pass
                
        # String/Categorical Stats
        elif s.dtype == pl.Utf8:
            # Top 5 most frequent values
            value_counts = s.value_counts().sort("count", descending=True).head(5)
            profile["top_values"] = [
                {"value": str(row[col]), "count": row["count"]} 
                for row in value_counts.to_dicts()
            ]
            
        return profile
        
    def _get_numeric_distribution(self, s: pl.Series) -> List[Dict]:
        """Get approximate simple histogram"""
        try:
            # Remove nulls for stats
            s_clean = s.drop_nulls()
            if len(s_clean) == 0:
                return []
                
            min_v = s_clean.min()
            max_v = s_clean.max()
            
            if min_v is None or max_v is None:
                 return []
            
            if min_v == max_v:
                return [{"range": f"{min_v}", "count": len(s_clean)}]
            
            # Use cut to bin
            bin_cuts = [min_v + (max_v - min_v) * (i/5) for i in range(6)]
            
            # Since polars cut/hist acts differently across versions, 
            # let's do a simple python-side count or use polars expressions to filter
            # For speed on large data, we want polars native, but precise bins are tricky without 'cut'.
            # We'll rely on a simplified approach:
            
            bins = []
            step = (max_v - min_v) / 5
            
            for i in range(5):
                start = min_v + (step * i)
                end = min_v + (step * (i + 1))
                # Last bin should include max
                if i == 4:
                    count = s_clean.filter((s_clean >= start) & (s_clean <= end)).len()
                else:
                    count = s_clean.filter((s_clean >= start) & (s_clean < end)).len()
                    
                bins.append({
                    "range": f"{start:.1f} - {end:.1f}",
                    "count": count
                })
                
            return bins
        except:
            return []
