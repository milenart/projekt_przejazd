import sqlite3
import pandas as pd
from flask import Flask, jsonify, render_template
from datetime import datetime, timedelta
import requests

app = Flask(__name__)
DB_FILE = "database.db"

def get_upcoming_trains(time_window_minutes=120): # Zostawiamy większe okno
    try:
        conn = sqlite3.connect(DB_FILE)
        now = datetime.now()
        weekday_map = {0: 'monday', 1: 'tuesday', 2: 'wednesday', 3: 'thursday', 4: 'friday', 5: 'saturday', 6: 'sunday'}
        today_column = weekday_map[now.weekday()]
        today_date_int = int(now.strftime("%Y%m%d"))
        current_time_str = now.strftime("%H:%M:%S")
        end_time = now + timedelta(minutes=time_window_minutes)
        end_time_str = end_time.strftime("%H:%M:%S")
        query = f"""
            SELECT * FROM schedule WHERE ({today_column} = 1) AND 
            (start_date <= {today_date_int}) AND (end_date >= {today_date_int}) AND
            (arrival_time BETWEEN '{current_time_str}' AND '{end_time_str}')
            ORDER BY arrival_time
        """
        upcoming_df = pd.read_sql_query(query, conn)
        conn.close()
        return upcoming_df.to_dict(orient='records')
    except Exception as e:
        print(f"Błąd podczas odczytu z bazy danych: {e}")
        return []

def get_live_data_from_portal(station_name: str):
    try:
        url = "https://portalpasazera.pl/API/Search"
        payload = {"query": station_name, "type": "Station"}
        headers = {'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest'}
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        live_data = response.json()
        return live_data.get('trains', [])
    except Exception as e:
        print(f"Błąd podczas komunikacji z API: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def get_status():
    scheduled_trains = get_upcoming_trains()
    live_trains_info = get_live_data_from_portal("Nowa Iwiczna")
    
    final_results = []
    for scheduled_train in scheduled_trains:
        train_data = scheduled_train.copy()
        
        # Ustawiamy domyślny status - pociąg jest 'planowy', ale bez danych live
        train_data['live_status'] = 'SCHEDULED_ONLY'
        train_data['delay_minutes'] = None
        train_data['actual_arrival'] = None

        try:
            scheduled_dt = datetime.strptime(train_data['arrival_time'], "%H:%M:%S")
        except (ValueError, TypeError):
            continue

        best_match = None
        smallest_diff = timedelta(minutes=5)

        for live_train in live_trains_info:
            live_scheduled_time_str = live_train.get('scheduledArrival')
            if not live_scheduled_time_str:
                continue
            
            try:
                live_scheduled_dt = datetime.strptime(live_scheduled_time_str, "%H:%M:%S")
                diff = abs(live_scheduled_dt - scheduled_dt)
                if diff < smallest_diff:
                    smallest_diff = diff
                    best_match = live_train
            except ValueError:
                continue

        if best_match:
            print(f"Znaleziono dopasowanie dla pociągu o {train_data['arrival_time']}!")
            train_data['live_status'] = 'FOUND_LIVE' # Nowy, lepszy status
            train_data['delay_minutes'] = best_match.get('delay')
            train_data['actual_arrival'] = best_match.get('actualArrival')
        
        final_results.append(train_data)

    return jsonify({
        "info": "Production Mode",
        "trains": final_results
    })