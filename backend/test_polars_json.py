import polars as pl
import io

df = pl.DataFrame({"a": [1, 2], "b": ["x", "y"]})
f_buf = io.BytesIO()

try:
    print("Attempting write_json to BytesIO...")
    df.write_json(f_buf)
    print("Success! Content (first 10 bytes):", f_buf.getvalue()[:10])
except Exception as e:
    print(f"Failed: {e}")

f_buf = io.BytesIO()
try:
    print("Attempting write_csv to BytesIO...")
    df.write_csv(f_buf)
    print("Success! Content (first 10 bytes):", f_buf.getvalue()[:10])
except Exception as e:
    print(f"Failed: {e}")
