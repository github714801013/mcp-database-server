# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "pymssql>=2.3.0",
# ]
# ///

import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

def query_shouhou_table():
    """查询 SQL Server 数据库中 shouhou 表的字段结构"""

    # 从环境变量读取数据库连接信息
    server = os.getenv('MSSQL_SERVER', 'localhost')
    database = os.getenv('MSSQL_DATABASE', 'your_database')
    user = os.getenv('MSSQL_USER', 'sa')
    password = os.getenv('MSSQL_PASSWORD', '')
    port = int(os.getenv('MSSQL_PORT', '1433'))

    print("=" * 60)
    print("SQL Server 表结构查询工具")
    print("=" * 60)
    print(f"服务器：{server}")
    print(f"数据库：{database}")
    print(f"端口：{port}")
    print("-" * 60)

    try:
        import pymssql

        # 连接数据库
        conn = pymssql.connect(
            server=server,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8',
            as_dict=True
        )

        cursor = conn.cursor()

        # 查询 shouhou 表的字段信息
        query = """
        SELECT
            c.COLUMN_NAME as 字段名，
            c.DATA_TYPE as 数据类型，
            c.CHARACTER_MAXIMUM_LENGTH as 字符长度，
            c.NUMERIC_PRECISION as 数值精度，
            c.NUMERIC_SCALE as 数值刻度，
            c.IS_NULLABLE as 允许空，
            c.COLUMN_DEFAULT as 默认值，
            CASE WHEN pk.CONSTRAINT_NAME IS NOT NULL THEN '是' ELSE '否' END as 主键，
            c.ORDINAL_POSITION as 列顺序
        FROM
            INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON c.TABLE_NAME = kcu.TABLE_NAME
            AND c.COLUMN_NAME = kcu.COLUMN_NAME
        LEFT JOIN
            INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk
            ON kcu.CONSTRAINT_NAME = pk.CONSTRAINT_NAME
            AND pk.CONSTRAINT_TYPE = 'PRIMARY KEY'
        WHERE
            c.TABLE_NAME = 'shouhou'
        ORDER BY
            c.ORDINAL_POSITION
        """

        print(f"\n正在查询表：shouhou")
        print("-" * 60)

        cursor.execute(query)
        rows = cursor.fetchall()

        if not rows:
            print("\n未找到表 'shouhou'，正在搜索相似的表名...")

            # 搜索相似的表名
            search_query = """
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%shouhou%' OR TABLE_NAME LIKE '%售后%'
            ORDER BY TABLE_NAME
            """
            cursor.execute(search_query)
            similar_tables = cursor.fetchall()

            if similar_tables:
                print("\n找到以下相似的表:")
                for tb in similar_tables:
                    print(f"  - {tb['TABLE_NAME']}")
            else:
                print("\n未找到包含 'shouhou' 或 '售后' 的表名")

            # 列出所有表
            print("\n数据库中的所有表:")
            list_query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
            cursor.execute(list_query)
            all_tables = cursor.fetchall()
            for tb in all_tables[:50]:  # 只显示前 50 个
                print(f"  - {tb['TABLE_NAME']}")
            if len(all_tables) > 50:
                print(f"  ... 共 {len(all_tables)} 个表")
        else:
            # 打印表头
            print(f"\n共找到 {len(rows)} 个字段:\n")
            print(f"{'序号':<4} {'字段名':<20} {'数据类型':<15} {'长度':<8} {'精度':<6} {'刻度':<6} {'允许空':<8} {'默认值':<20} {'主键':<6}")
            print("-" * 110)

            # 打印每行数据
            for row in rows:
                序号 = str(row.get('列顺序', ''))
                字段名 = str(row.get('字段名', ''))
                数据类型 = str(row.get('数据类型', ''))
                字符长度 = str(row.get('字符长度', '') if row.get('字符长度') else '')
                数值精度 = str(row.get('数值精度', '') if row.get('数值精度') else '')
                数值刻度 = str(row.get('数值刻度', '') if row.get('数值刻度') else '')
                允许空 = '是' if str(row.get('允许空', '')) == 'YES' else '否'
                默认值 = str(row.get('默认值', '') if row.get('默认值') else '')
                主键 = str(row.get('主键', ''))

                print(f"{序号:<4} {字段名:<20} {数据类型:<15} {字符长度:<8} {数值精度:<6} {数值刻度:<6} {允许空:<8} {默认值:<20} {主键:<6}")

            print("-" * 110)

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n错误：{e}")
        print("\n请确保:")
        print("  1. 已安装 pymssql: pip install pymssql")
        print("  2. 设置正确的环境变量或使用默认连接信息")
        print("\n可通过以下环境变量配置连接:")
        print("  MSSQL_SERVER - 服务器地址 (默认：localhost)")
        print("  MSSQL_DATABASE - 数据库名 (默认：your_database)")
        print("  MSSQL_USER - 用户名 (默认：sa)")
        print("  MSSQL_PASSWORD - 密码")
        print("  MSSQL_PORT - 端口 (默认：1433)")
        raise

if __name__ == "__main__":
    query_shouhou_table()
