"""
Database Exporter Service
- Export data to PostgreSQL/MySQL databases
"""
import polars as pl
from typing import Dict, Any, Optional
import asyncio


async def export_to_postgresql(
    df: pl.DataFrame,
    connection_string: str,
    table_name: str,
    if_exists: str = 'replace'  # 'replace', 'append', 'fail'
) -> Dict[str, Any]:
    """
    Export DataFrame to PostgreSQL table
    """
    try:
        import asyncpg
    except ImportError:
        raise ImportError("asyncpg required. Install with: pip install asyncpg")
    
    conn = await asyncpg.connect(connection_string)
    try:
        # Get column info
        columns = df.columns
        dtypes = {col: str(df[col].dtype) for col in columns}
        
        # Map Polars types to PostgreSQL types
        type_map = {
            'Int64': 'BIGINT',
            'Int32': 'INTEGER',
            'Float64': 'DOUBLE PRECISION',
            'Float32': 'REAL',
            'Utf8': 'TEXT',
            'Boolean': 'BOOLEAN',
            'Date': 'DATE',
            'Datetime': 'TIMESTAMP',
        }
        
        pg_columns = []
        for col in columns:
            pg_type = type_map.get(dtypes[col], 'TEXT')
            pg_columns.append(f'"{col}" {pg_type}')
        
        # Drop and create table if replace
        if if_exists == 'replace':
            await conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
            create_sql = f'CREATE TABLE "{table_name}" ({", ".join(pg_columns)})'
            await conn.execute(create_sql)
        
        # Insert data
        rows = df.to_dicts()
        if rows:
            placeholders = ', '.join(f'${i+1}' for i in range(len(columns)))
            col_names = ', '.join(f'"{c}"' for c in columns)
            insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
            
            for row in rows:
                values = [row[col] for col in columns]
                await conn.execute(insert_sql, *values)
        
        return {
            "success": True,
            "table": table_name,
            "rows_inserted": len(rows),
            "columns": columns
        }
    finally:
        await conn.close()


async def export_to_mysql(
    df: pl.DataFrame,
    connection_string: str,
    table_name: str,
    if_exists: str = 'replace'
) -> Dict[str, Any]:
    """
    Export DataFrame to MySQL table
    """
    try:
        import aiomysql
        import urllib.parse
    except ImportError:
        raise ImportError("aiomysql required. Install with: pip install aiomysql")
    
    parsed = urllib.parse.urlparse(connection_string)
    conn = await aiomysql.connect(
        host=parsed.hostname or 'localhost',
        port=parsed.port or 3306,
        user=parsed.username,
        password=parsed.password,
        db=parsed.path.lstrip('/')
    )
    
    try:
        columns = df.columns
        dtypes = {col: str(df[col].dtype) for col in columns}
        
        type_map = {
            'Int64': 'BIGINT',
            'Int32': 'INT',
            'Float64': 'DOUBLE',
            'Float32': 'FLOAT',
            'Utf8': 'TEXT',
            'Boolean': 'BOOLEAN',
            'Date': 'DATE',
            'Datetime': 'DATETIME',
        }
        
        async with conn.cursor() as cursor:
            if if_exists == 'replace':
                await cursor.execute(f'DROP TABLE IF EXISTS `{table_name}`')
                
                mysql_columns = []
                for col in columns:
                    mysql_type = type_map.get(dtypes[col], 'TEXT')
                    mysql_columns.append(f'`{col}` {mysql_type}')
                
                create_sql = f'CREATE TABLE `{table_name}` ({", ".join(mysql_columns)})'
                await cursor.execute(create_sql)
            
            rows = df.to_dicts()
            if rows:
                placeholders = ', '.join('%s' for _ in columns)
                insert_sql = f'INSERT INTO `{table_name}` ({", ".join(f"`{c}`" for c in columns)}) VALUES ({placeholders})'
                
                for row in rows:
                    values = tuple(row[col] for col in columns)
                    await cursor.execute(insert_sql, values)
            
            await conn.commit()
        
        return {
            "success": True,
            "table": table_name,
            "rows_inserted": len(rows),
            "columns": columns
        }
    finally:
        conn.close()


async def export_to_database(
    df: pl.DataFrame,
    db_type: str,
    connection_string: str,
    table_name: str,
    if_exists: str = 'replace'
) -> Dict[str, Any]:
    """
    Universal database export function
    """
    if db_type == 'postgresql':
        return await export_to_postgresql(df, connection_string, table_name, if_exists)
    elif db_type == 'mysql':
        return await export_to_mysql(df, connection_string, table_name, if_exists)
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
