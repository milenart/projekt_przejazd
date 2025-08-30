import pandas as pd
import requests
import zipfile
import io
import sqlite3

# --- Konfiguracja ---
# OFICJALNY, AGREGOWANY LINK ZTM DLA AGLOMERACJI WARSZAWSKIEJ
GTFS_URL = "https://gtfs.ztm.waw.pl/"
STATION_NAME = "Nowa Iwiczna"
DB_FILE = "database.db"

def prepare_database():
    print(f"Krok 1: Pobieranie oficjalnych danych GTFS ZTM z linku: {GTFS_URL}")
    try:
        # Ten serwer wymaga nagłówka User-Agent
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(GTFS_URL, headers=headers)
        response.raise_for_status()
        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
    except Exception as e:
        print(f"Błąd: {e}")
        return

    print("Krok 2: Wczytywanie plików (w tym kalendarza)...")
    stops_df = pd.read_csv(zip_file.open('stops.txt'))
    stop_times_df = pd.read_csv(zip_file.open('stop_times.txt'))
    trips_df = pd.read_csv(zip_file.open('trips.txt'))
    calendar_df = pd.read_csv(zip_file.open('calendar.txt'))
    
    print(f"Krok 3: Wyszukiwanie ID stacji dla '{STATION_NAME}'...")
    try:
        target_stop = stops_df[stops_df['stop_name'] == STATION_NAME]
        target_stop_id = target_stop['stop_id'].iloc[0]
        print(f"Znaleziono! ID stacji: {target_stop_id}")
    except (IndexError, AttributeError):
        print(f"Błąd: Nie można było odnaleźć ID dla stacji '{STATION_NAME}'.")
        return

    print("Krok 4: Łączenie danych z kalendarzem...")
    station_stop_times_df = stop_times_df[stop_times_df['stop_id'] == target_stop_id]
    merged_df = pd.merge(station_stop_times_df, trips_df, on='trip_id')
    final_schedule_df = pd.merge(merged_df, calendar_df, on='service_id')

    schedule_df = final_schedule_df[[
        'trip_id', 'arrival_time', 'departure_time', 'stop_sequence', 
        'trip_headsign', 'direction_id', 'shape_id',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'start_date', 'end_date'
    ]]

    print(f"Krok 5: Zapisywanie przetworzonych danych do bazy '{DB_FILE}'...")
    conn = sqlite3.connect(DB_FILE)
    schedule_df.to_sql('schedule', conn, if_exists='replace', index=False)
    conn.close()
    
    print("\n✅ Gotowe! Baza danych została zaktualizowana o aktualny, oficjalny rozkład jazdy.")

if __name__ == "__main__":
    prepare_database()