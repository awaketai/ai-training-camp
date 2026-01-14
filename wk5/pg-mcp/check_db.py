#!/usr/bin/env python3
"""检查数据库连接和表状态"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_db():
    try:
        password = os.getenv('DB_PASSWORD', 'admin123')
        conn = await asyncpg.connect(
            host='127.0.0.1',
            port=5432,
            user='root',
            password=password,
            database='blog_small'
        )
        
        # 检查表是否存在
        tables = await conn.fetch("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'posts'
        """)
        
        print(f'找到 {len(tables)} 个 posts 表')
        for table in tables:
            print(f'  Schema: {table["table_schema"]}, Table: {table["table_name"]}')
        
        # 检查 posts 表的数据
        count = await conn.fetchval("SELECT COUNT(*) FROM posts WHERE status = $1", 'published')
        print(f'\n已发布的文章数量: {count}')
        
        # 查询前几条数据
        rows = await conn.fetch("SELECT title, published_at FROM posts WHERE status = $1 LIMIT 5", 'published')
        print(f'\n前5条已发布的文章:')
        for row in rows:
            print(f'  - {row["title"]}: {row["published_at"]}')
        
        await conn.close()
    except Exception as e:
        print(f'错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(check_db())
