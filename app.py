from flask import Flask, jsonify, render_template, request
from datetime import datetime, timedelta
import sqlite3
import pandas as pd

app = Flask(__name__)
DB_FILE = "database.db"

@app.route('/api/stations')
def get_stations():
    """Pobiera listę stacji z dedykowanej tabeli."""
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
    """
    Pobiera i filtruje pociągi dla DOWOLNEJ stacji wybranej przez użytkownika.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        now = datetime.now()
        
        weekday_map = {0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday', 4: 'friday', 5: 'saturday', 6: 'sunday'}
        today_column = weekday_map[now.weekday()]
        today_date_int = int(now.strftime("%Y%m%d"))
        
        current_time_str = now.strftime("%H:%M:%S")
        end_time = now + timedelta(minutes=time_window_minutes)
        end_time_str = end_time.strftime("%H:%M:%S")

        # --- POPRAWKA 1: Zmodyfikowane zapytanie SQL ---
        # Teraz szukamy pociągów, których PRZYJAZD lub ODJAZD mieści się w oknie czasowym
        query = f"""
            SELECT * FROM schedule 
            WHERE 
                (stop_name = ?) AND 
                ({today_column} = 1) AND 
                (start_date <= {today_date_int}) AND 
                (end_date >= {today_date_int}) AND
                (
                    (arrival_time BETWEEN '{current_time_str}' AND '{end_time_str}') OR
                    (departure_time BETWEEN '{current_time_str}' AND '{end_time_str}')
                )
            ORDER BY departure_time, arrival_time
        """
        
        upcoming_df = pd.read_sql_query(query, conn, params=(station_name,))
        conn.close()
        print(f"Znaleziono {len(upcoming_df)} pociągów dla stacji '{station_name}'.")
        return upcoming_df.to_dict(orient='records')
        
    except Exception as e:
        print(f"Błąd podczas odczytu z bazy danych: {e}")
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
        # --- POPRAWKA 2: Dodajemy 'departure_time' do odpowiedzi JSON ---
        final_results.append({
            "arrival_time": train.get('arrival_time'),
            "departure_time": train.get('departure_time'),
            "trip_headsign": train.get('trip_headsign'),
            "live_status": 'SCHEDULED_ONLY',
            "delay_minutes": 0,
        })
    
    return jsonify({
        "info": f"Schedule data for {station} in the next {window} minutes.",
        "trains": final_results
    })

# Jeśli chcesz uruchamiać ten plik bezpośrednio
if __name__ == '__main__':
    app.run(debug=True)