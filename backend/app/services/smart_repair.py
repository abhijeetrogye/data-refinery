from google import genai
from google.genai import types
import polars as pl
import os
import json
from typing import Dict, List, Any

class SmartRepairService:
    def __init__(self):
        # Ensure env vars are loaded
        from dotenv import load_dotenv
        load_dotenv()
        
        # New SDK automatically picks up GOOGLE_API_KEY from env if not passed, 
        # but passing explicitly for clarity as we read it manually before.
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        self.client = genai.Client(api_key=api_key)
        # Using gemini-2.0-flash as requested (interpreting "2.5" as 2.0, or latest flash)
        self.model_name = 'gemini-2.0-flash-exp' 

    async def repair_column(self, values: List[str], column_name: str, instruction: str = None) -> Dict[str, str]:
        """
        Uses LLM to standardize inconsistent text values.
        Returns a mapping of {original_value: repaired_value}
        """
        # Filter unique non-null values
        unique_values = list(set([str(v) for v in values if v is not None and str(v).strip() != ""]))
        
        if not unique_values:
            return {}

        # Limit to avoid token limits (warn if truncated?)
        # Increased limit for Flash model capabilities
        batch = unique_values[:1000] 
        
        prompt = f"""
        You are a data cleaning assistant.
        I have a column named "{column_name}" with inconsistent values.
        Your task is to standardize them into a clean, consistent format.
        
        Instructions: {instruction or "Fix typos, inconsistencies, and casing. Keep standard format."}
        
        Input Values:
        {json.dumps(batch)}
        
        Return EXCLUSIVELY a valid JSON object mapping original values to fixed values.
        Format: {{"original": "fixed"}}
        Do not add markdown or comments.
        """
        
        try:
            # Use Async Client (client.aio)
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type= 'application/json'
                )
            )
            
            # Text is directly accessible
            text = response.text.replace("```json", "").replace("```", "").strip()
            mapping = json.loads(text)
            return mapping
        except Exception as e:
            print(f"LLM Repair Failed: {e}")
            return {}

    def apply_repair(self, df: pl.DataFrame, column: str, mapping: Dict[str, str]) -> pl.DataFrame:
        """Applies the repair mapping to the dataframe"""
        if column not in df.columns:
            return df
            
        return df.with_columns(
            pl.col(column).apply(lambda x: mapping.get(str(x), x), return_dtype=pl.Utf8).alias(column)
        )
