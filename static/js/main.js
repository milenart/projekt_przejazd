document.addEventListener('DOMContentLoaded', function() {

    // --- Referencje do elementów interfejsu ---
    const stationSelect = document.getElementById('station-select');
    const windowInput = document.getElementById('window-input');
    const searchButton = document.getElementById('search-button');
    const trainListElement = document.getElementById('train-list');

    // --- Funkcja do wypełniania listy stacji ---
    async function populateStationSelect() {
        try {
            const response = await fetch('/api/stations');
            const stations = await response.json();
            
            stationSelect.innerHTML = '';
            stations.forEach(station => {
                const option = document.createElement('option');
                option.value = station;
                option.textContent = station;
                // Używamy .includes() dla większej niezawodności
                if (station.toLowerCase().includes("nowa iwiczna")) {
                    option.selected = true;
                }
                stationSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Nie udało się pobrać listy stacji:", error);
        }
    }

    // --- Główna funkcja do pobierania i wyświetlania danych ---
    async function fetchAndDisplayTrains() {
        const station = stationSelect.value;
        const timeWindow = windowInput.value;

        trainListElement.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Wyszukuję...</p>
            </div>`;

        try {
            const apiUrl = `/api/status?station=${encodeURIComponent(station)}&window=${timeWindow}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const data = await response.json();

            trainListElement.innerHTML = '';

            if (data.trains && data.trains.length > 0) {
                data.trains.forEach(train => {
                    const card = document.createElement('div');
                    card.classList.add('train-card');

                    // --- NOWA KARTA: Przyjazd i Odjazd ---
                    card.innerHTML = `
                        <div class="time-block">
                            <div class="label">Planowany Przyjazd</div>
                            <div class="time">${train.arrival_time.substring(0, 5)}</div>
                            <div class="delay-info"></div>
                        </div>
                        <div class="time-block">
                            <div class="label">Planowany Odjazd</div>
                            <div class="time">${train.departure_time.substring(0, 5)}</div>
                            <div class="delay-info"></div>
                        </div>
                    `;
                    
                    // Logika opóźnienia (przygotowana na przyszłość)
                    if (train.delay_minutes > 0) {
                        card.querySelectorAll('.delay-info').forEach(el => {
                            el.textContent = `Opóźnienie: ${train.delay_minutes} min`;
                        });
                    }
                    
                    trainListElement.appendChild(card);
                });
            } else {
                trainListElement.innerHTML = `<p class="no-trains">Brak pociągów dla stacji "${station}" w ciągu najbliższych ${timeWindow} minut.</p>`;
            }
        } catch (error) {
            console.error("Nie udało się pobrać danych o pociągach:", error);
            trainListElement.innerHTML = '<p class="no-trains">Wystąpił błąd podczas ładowania danych.</p>';
        }
    }

    // --- Inicjalizacja Aplikacji ---
    populateStationSelect();
    searchButton.addEventListener('click', fetchAndDisplayTrains);
});