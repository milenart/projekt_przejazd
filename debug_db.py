import sqlite3
import pandas as pd

DB_FILE = "database.db"

def inspect_database():
    print(f"--- Analiza pliku bazy danych: {DB_FILE} ---\n")
    try:
        conn = sqlite3.connect(DB_FILE)
        
        print("[INFO] Sprawdzam, jakie tabele istnieją w bazie danych...")
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("[BŁĄD] Baza danych jest pusta lub nie zawiera żadnych tabel.")
            return

        table_name = tables[0][0]  # Zakładamy, że nasza tabela jest pierwsza
        print(f"Znaleziono tabelę: '{table_name}'\n")

        print(f"[INFO] Wyświetlam pierwszych 10 wierszy z tabeli '{table_name}':")
        
        # Używamy Pandas, aby ładnie wyświetlić dane
        df = pd.read_sql_query(f"SELECT * FROM {table_name} LIMIT 10", conn)
        
        # Wyświetlamy całą ramkę danych bez skracania
        print(df.to_string())
        
        conn.close()

        print("\n\n--- Koniec analizy ---")
        
    except Exception as e:
        print(f"\n[BŁĄD] Wystąpił błąd podczas analizy bazy danych: {e}")

if __name__ == "__main__":
    inspect_database()