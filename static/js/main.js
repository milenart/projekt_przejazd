document.addEventListener('DOMContentLoaded', function() {

    // --- Referencje do elementów interfejsu ---
    const stationInput = document.getElementById('station-input');
    const windowInput = document.getElementById('window-input');
    const searchButton = document.getElementById('search-button');
    const trainListElement = document.getElementById('train-list');

    // Zmienna do przechowywania wszystkich nazw stacji pobranych z API
    let allStations = [];

    // --- Funkcja: Inicjalizacja autouzupełniania ---
    async function initAutocomplete() {
        try {
            const response = await fetch('/api/stations');
            if (!response.ok) throw new Error('Błąd sieci');
            allStations = await response.json();
        } catch (error) {
            console.error("Nie udało się pobrać listy stacji dla autouzupełniania:", error);
            return; 
        }

        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'suggestions-container';
        stationInput.parentNode.insertBefore(suggestionsContainer, stationInput.nextSibling);

        stationInput.addEventListener('input', () => {
            const query = stationInput.value.toLowerCase();
            suggestionsContainer.innerHTML = '';

            if (query.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }
            
            const filteredStations = allStations.filter(station => 
                station.toLowerCase().includes(query)
            );

            if (filteredStations.length > 0) {
                filteredStations.forEach(station => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.classList.add('suggestion-item');
                    suggestionItem.textContent = station;
                    suggestionsContainer.appendChild(suggestionItem);
                });
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        suggestionsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('suggestion-item')) {
                stationInput.value = event.target.textContent;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target !== stationInput) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    // --- Główna funkcja do pobierania i wyświetlania pociągów ---
    async function fetchAndDisplayTrains() {
        const station = stationInput.value;
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
                    
                    // --- MODYFIKACJA: Zmieniony HTML karty pociągu ---
                    // Używamy `closure_estimate` z API, aby dynamicznie dodać klasę CSS (np. 'closure-high')
                    // i wyświetlić tekst z oszacowaniem.
                    card.innerHTML = `
                        <div class="time-block">
                            <div class="label">Planowany Przyjazd</div>
                            <div class="time">${train.arrival_time?.substring(0, 5) ?? '---'}</div>
                            <div class="delay-info"></div>
                        </div>
                        <div class="time-block closure-${train.closure_estimate.category}">
                            <div class="label">Szacowany Czas Zamknięcia Przejazdu</div>
                            <div class="time">${train.closure_estimate.text}</div>
                            <div class="delay-info"></div>
                        </div>
                    `;
                    
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
            trainListElement.innerHTML = '<p class="no-trains">Wystąpił błąd podczas ładowania danych. Sprawdź konsolę, aby uzyskać więcej informacji.</p>';
        }
    }

    // --- Inicjalizacja Aplikacji ---
    initAutocomplete();
    searchButton.addEventListener('click', fetchAndDisplayTrains);
});