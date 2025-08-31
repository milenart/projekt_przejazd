document.addEventListener('DOMContentLoaded', function() {

    // --- Referencje do elementów interfejsu ---
    const stationInput = document.getElementById('station-input');
    const windowInput = document.getElementById('window-input');
    const searchButton = document.getElementById('search-button');
    const trainListElement = document.getElementById('train-list');
    const lastUpdatedElement = document.getElementById('last-updated');

    // --- LOGIKA INTELIGENTNEJ WYSZUKIWARKI ---
    let allStations = []; // Tu przechowamy wszystkie stacje pobrane z API
    
    // Tworzymy kontener na dynamiczne sugestie i dodajemy go do drzewa DOM
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-container';
    stationInput.parentNode.appendChild(suggestionsContainer);

    // Funkcja pobierająca listę stacji z naszego backendu
    async function populateStationList() {
        try {
            const response = await fetch('/api/stations');
            allStations = await response.json();
            // Inicjalnie ładujemy dane dla stacji domyślnej
            fetchAndDisplayTrains();
        } catch (error) {
            console.error("Nie udało się pobrać listy stacji:", error);
        }
    }

    // Nasłuchujemy na wpisywanie tekstu w polu
    stationInput.addEventListener('input', () => {
        const query = stationInput.value.toLowerCase();
        suggestionsContainer.innerHTML = '';
        if (query.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        // Filtrujemy stacje, które pasują do wpisanego tekstu
        const filteredStations = allStations.filter(station => 
            station.toLowerCase().includes(query)
        ).slice(0, 10); // Ograniczamy do 10 sugestii dla wydajności

        if (filteredStations.length > 0) {
            filteredStations.forEach(station => {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = station;
                suggestionItem.classList.add('suggestion-item');
                // Po kliknięciu na sugestię:
                suggestionItem.addEventListener('click', () => {
                    stationInput.value = station; // Ustaw wartość pola na klikniętą stację
                    suggestionsContainer.style.display = 'none'; // Ukryj sugestie
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.style.display = 'block'; // Pokaż kontener z sugestiami
        } else {
            suggestionsContainer.style.display = 'none'; // Ukryj, jeśli brak pasujących
        }
    });

    // Ukrywamy sugestie, gdy użytkownik kliknie gdziekolwiek indziej na stronie
    document.addEventListener('click', (e) => {
        if (e.target !== stationInput) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // --- Główna funkcja do pobierania i wyświetlania danych ---
    async function fetchAndDisplayTrains() {
        const station = stationInput.value;
        const timeWindow = windowInput.value;

        trainListElement.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Wyszukuję pociągi...</p>
            </div>`;

        try {
            const apiUrl = `/api/status?station=${encodeURIComponent(station)}&window=${timeWindow}`;
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const data = await response.json();

            trainListElement.innerHTML = '';
            lastUpdatedElement.textContent = `Wyniki dla "${station}" z ${new Date().toLocaleTimeString()}`;

            if (data.trains && data.trains.length > 0) {
                data.trains.forEach(train => {
                    const card = document.createElement('div');
                    card.classList.add('train-card');
                    card.innerHTML = `
                        <div class="train-header">
                            <span class="train-headsign">${train.trip_headsign}</span>
                            <span class="train-time">${train.arrival_time.substring(0, 5)}</span>
                        </div>
                        <div class="train-details">
                            <span>Planowy przyjazd</span>
                        </div>
                    `;
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
    
    // 1. Pobierz listę wszystkich stacji w tle
    populateStationList();

    // 2. Ustaw nasłuchiwanie na KLIKNIĘCIE PRZYCISKU "Szukaj"
    searchButton.addEventListener('click', fetchAndDisplayTrains);
});