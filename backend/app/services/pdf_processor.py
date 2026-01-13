"""
PDF Processing Service
- Extracts text and tables from PDF files
- Supports scanned documents (basic OCR-like extraction)
"""
import pdfplumber
from pathlib import Path
import polars as pl
from typing import Optional
import re


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file"""
    text_content = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
    return "\n".join(text_content)


def extract_tables_from_pdf(file_path: str) -> list[pl.DataFrame]:
    """Extract tables from PDF and convert to DataFrames"""
    tables = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            for table in page_tables:
                if table and len(table) > 1:
                    # First row as headers
                    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(table[0])]
                    # Remaining rows as data
                    data = table[1:]
                    if data:
                        # Create dict for polars
                        table_dict = {headers[i]: [row[i] if i < len(row) else None for row in data] 
                                     for i in range(len(headers))}
                        df = pl.DataFrame(table_dict)
                        tables.append(df)
    return tables


def parse_structured_text(text: str) -> Optional[pl.DataFrame]:
    """
    Try to parse structured text (key-value pairs) into a DataFrame
    Handles formats like:
    - "Name: John Doe"
    - "Age: 25"
    """
    lines = text.strip().split('\n')
    data = {}
    
    for line in lines:
        # Try key: value format
        if ':' in line:
            parts = line.split(':', 1)
            if len(parts) == 2:
                key = parts[0].strip()
                value = parts[1].strip()
                if key and value:
                    data[key] = [value]
    
    if data and len(data) >= 2:
        return pl.DataFrame(data)
    return None


def process_pdf(file_path: str) -> pl.DataFrame:
    """
    Main PDF processing function
    1. Try to extract tables first
    2. If no tables, try to parse structured text
    3. Fall back to raw text as single column
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    # Try extracting tables
    tables = extract_tables_from_pdf(file_path)
    if tables:
        # Return the largest table
        return max(tables, key=lambda t: t.height)
    
    # Try parsing structured text
    text = extract_text_from_pdf(file_path)
    if text:
        structured = parse_structured_text(text)
        if structured is not None:
            return structured
        
        # Fall back to raw text lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        return pl.DataFrame({"text_content": lines, "line_number": range(1, len(lines) + 1)})
    
    # Empty PDF
    return pl.DataFrame({"content": ["Empty PDF"]})
