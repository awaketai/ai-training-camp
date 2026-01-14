#!/usr/bin/env python3
"""测试 pg-mcp 数据库连接配置"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

async def test_connection():
    """测试数据库连接配置"""
    password = os.getenv('DB_PASSWORD', 'admin123')
    
    # 测试配置中的连接参数
    configs = [
        {
            'name': 'blog_small',
            'host': '127.0.0.1',
            'port': 5432,
            'database': 'blog_small',
            'user': 'root',
            'password': password
        }
    ]
    
    for config in configs:
        print(f"\n测试连接: {config['name']}")
        print(f"  主机: {config['host']}:{config['port']}")
        print(f"  数据库: {config['database']}")
        print(f"  用户: {config['user']}")
        
        try:
            conn = await asyncpg.connect(
                host=config['host'],
                port=config['port'],
                user=config['user'],
                password=config['password'],
                database=config['database']
            )
            
            # 检查当前数据库
            current_db = await conn.fetchval('SELECT current_database()')
            current_schema = await conn.fetchval('SELECT current_schema()')
            print(f"  当前数据库: {current_db}")
            print(f"  当前 schema: {current_schema}")
            
            # 检查 posts 表是否存在
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'posts'
                )
            """)
            print(f"  posts 表存在: {table_exists}")
            
            if table_exists:
                # 尝试执行查询
                try:
                    rows = await conn.fetch("SELECT title, published_at FROM posts WHERE status = 'published' LIMIT 3")
                    print(f"  查询成功，返回 {len(rows)} 行")
                    for row in rows:
                        print(f"    - {row['title']}: {row['published_at']}")
                except Exception as e:
                    print(f"  查询失败: {e}")
                    
                # 尝试带 schema 前缀的查询
                try:
                    rows = await conn.fetch("SELECT title, published_at FROM public.posts WHERE status = 'published' LIMIT 3")
                    print(f"  带 schema 前缀查询成功，返回 {len(rows)} 行")
                except Exception as e:
                    print(f"  带 schema 前缀查询失败: {e}")
            
            await conn.close()
            print("  ✓ 连接测试成功")
            
        except Exception as e:
            print(f"  ✗ 连接失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_connection())
