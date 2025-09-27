from flask import Flask, jsonify, render_template, request
from datetime import datetime, timedelta, time
import sqlite3
import pandas as pd

app = Flask(__name__)
DB_FILE = "database.db"

# --- NOWA FUNKCJA DO SZACOWANIA CZASU ZAMKNIĘCIA PRZEJAZDU ---
def estimate_closure_time(arrival_time_str):
    """
    Szacuje czas zamknięcia przejazdu na podstawie pory dnia.
    Zwraca słownik z tekstem dla użytkownika i kategorią do stylowania.
    """
    if not arrival_time_str:
        return {"text": "Brak danych", "category": "low"}

    try:
        # Konwertujemy czas z tekstu na obiekt czasu
        arrival_time = datetime.strptime(arrival_time_str, "%H:%M:%S").time()

        # Definiujemy godziny szczytu
        morning_rush_start = time(6, 30)
        morning_rush_end = time(9, 0)
        afternoon_rush_start = time(15, 30)
        afternoon_rush_end = time(18, 30)

        # Sprawdzamy, czy czas wpada w godziny szczytu
        is_morning_rush = morning_rush_start <= arrival_time <= morning_rush_end
        is_afternoon_rush = afternoon_rush_start <= arrival_time <= afternoon_rush_end

        if is_morning_rush:
            return {"text": "Ok. 7-10 min (Ruch poranny)", "category": "high"}
        elif is_afternoon_rush:
            return {"text": "Ok. 10-15 min (Szczyt popołudniowy)", "category": "high"}
        elif time(23, 0) <= arrival_time or arrival_time <= time(4, 0):
            return {"text": "Ok. 2-3 min (Ruch nocny)", "category": "low"}
        else:
            return {"text": "Ok. 4-6 min (Poza szczytem)", "category": "medium"}
            
    except (ValueError, TypeError):
        return {"text": "Błąd czasu", "category": "low"}


@app.route('/api/stations')
def get_stations():
    # Ta funkcja pozostaje bez zmian
    try:
        conn = sqlite3.connect(DB_FILE)
        query = "SELECT stop_name FROM stations ORDER BY stop_name"
        stations_df = pd.read_sql_query(query, conn)
        conn.close()
        return jsonify(stations_df['stop_name'].dropna().tolist())
    except Exception as e:
        print(f"Błąd podczas pobierania listy stacji: {e}")
        return jsonify([])

def get_scheduled_trains(station_name, time_window_minutes=60):
    # Ta funkcja pozostaje bez zmian
    try:
        conn = sqlite3.connect(DB_FILE)
        now = datetime.now()
        end_time = now + timedelta(minutes=time_window_minutes)
        dates_to_check_ints = set()
        current_scan_date = now.date()
        while current_scan_date <= end_time.date():
            dates_to_check_ints.add(int(current_scan_date.strftime("%Y%m%d")))
            current_scan_date += timedelta(days=1)
        dates_tuple_str = tuple(dates_to_check_ints)
        if len(dates_tuple_str) == 1:
            dates_tuple_str = f"({dates_tuple_str[0]})"
        query = f"SELECT * FROM schedule WHERE stop_name = ? AND start_date IN {dates_tuple_str}"
        all_potential_trains_df = pd.read_sql_query(query, conn, params=(station_name,))
        conn.close()
        if all_potential_trains_df.empty:
            return []
        all_potential_trains_df['departure_datetime'] = pd.to_datetime(all_potential_trains_df['start_date'].astype(str) + ' ' + all_potential_trains_df['departure_time'], errors='coerce')
        all_potential_trains_df['arrival_datetime'] = pd.to_datetime(all_potential_trains_df['start_date'].astype(str) + ' ' + all_potential_trains_df['arrival_time'], errors='coerce')
        final_df = all_potential_trains_df[((all_potential_trains_df['departure_datetime'] >= now) & (all_potential_trains_df['departure_datetime'] <= end_time)) | ((all_potential_trains_df['arrival_datetime'] >= now) & (all_potential_trains_df['arrival_datetime'] <= end_time))]
        print(f"Znaleziono {len(final_df)} pociągów po precyzyjnym filtrowaniu w Pythonie.")
        return final_df.to_dict(orient='records')
    except Exception as e:
        print(f"Błąd krytyczny w get_scheduled_trains: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def get_status():
    station = request.args.get('station', 'Nowa Iwiczna')
    try:
        window = int(request.args.get('window', 60))
    except ValueError:
        window = 60

    scheduled_trains = get_scheduled_trains(station_name=station, time_window_minutes=window)
    
    final_results = []
    for train in scheduled_trains:
        # --- MODYFIKACJA: Używamy nowej funkcji i zmieniamy strukturę odpowiedzi ---
        closure_estimate = estimate_closure_time(train.get('arrival_time'))

        final_results.append({
            "arrival_time": train.get('arrival_time'),
            "trip_headsign": train.get('trip_headsign'),
            "closure_estimate": closure_estimate, # Zamiast departure_time wysyłamy obiekt z szacunkami
            "live_status": 'SCHEDULED_ONLY',
            "delay_minutes": 0,
        })
    
    return jsonify({
        "info": f"Schedule data for {station} in the next {window} minutes.",
        "trains": final_results
    })

if __name__ == '__main__':
    app.run(debug=True)