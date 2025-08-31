import pandas as pd
import requests
import zipfile
import io
import sqlite3

GTFS_URL = "https://gtfs.ztm.waw.pl/"
DB_FILE = "database.db"

def prepare_database():
    print(f"Pobieranie danych GTFS z: {GTFS_URL}")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(GTFS_URL, headers=headers)
        response.raise_for_status()
        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
    except Exception as e:
        print(f"Błąd pobierania lub otwierania pliku ZIP: {e}")
        return

    print("Przetwarzanie i łączenie wszystkich danych GTFS...")
    stops_df = pd.read_csv(zip_file.open('stops.txt'))
    stop_times_df = pd.read_csv(zip_file.open('stop_times.txt'))
    trips_df = pd.read_csv(zip_file.open('trips.txt'))
    calendar_df = pd.read_csv(zip_file.open('calendar.txt'))
    
    # Łączymy wszystkie tabele w jedną, dużą tabelę 'full_schedule'
    merged1 = pd.merge(stop_times_df, trips_df, on='trip_id')
    merged2 = pd.merge(merged1, calendar_df, on='service_id')
    full_schedule_df = pd.merge(merged2, stops_df, on='stop_id')
    
    # Wybieramy tylko te kolumny, których potrzebujemy
    final_df = full_schedule_df[[
        'stop_name', 'arrival_time', 'trip_headsign',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'start_date', 'end_date'
    ]]
    
    # Tworzymy listę unikalnych stacji
    if 'location_type' in stops_df.columns:
        stations_df = stops_df[stops_df['location_type'] == 1]
    else:
        stations_df = stops_df
    unique_stations_df = stations_df[['stop_name']].drop_duplicates().sort_values(by='stop_name')
    
    # Zapisujemy obie tabele
    conn = sqlite3.connect(DB_FILE)
    print(f"Zapisuję pełny rozkład jazdy ({len(final_df)} wpisów) do tabeli 'schedule'...")
    final_df.to_sql('schedule', conn, if_exists='replace', index=False)
    
    print(f"Zapisuję {len(unique_stations_df)} unikalnych stacji do tabeli 'stations'...")
    unique_stations_df.to_sql('stations', conn, if_exists='replace', index=False)
    
    conn.close()
    
    print(f"\n✅ Gotowe! Baza '{DB_FILE}' została pomyślnie utworzona.")

if __name__ == "__main__":
    prepare_database()