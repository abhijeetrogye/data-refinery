import polars as pl

def infer_schema(df: pl.DataFrame) -> dict:
    """
    Infers the schema of the dataframe.
    Returns a dictionary of column_name -> data_type.
    """
    schema = {}
    for col, dtype in zip(df.columns, df.dtypes):
        # Convert Polars DataType to string representation
        schema[col] = str(dtype)
    return schema
