document.addEventListener('DOMContentLoaded', function() {

    // --- Referencje do elementów interfejsu ---
    const stationInput = document.getElementById('station-input');
    const windowInput = document.getElementById('window-input');
    const searchButton = document.getElementById('search-button');
    const trainListElement = document.getElementById('train-list');

    // Zmienna do przechowywania wszystkich nazw stacji pobranych z API
    let allStations = [];

    // --- NOWA FUNKCJA: Inicjalizacja autouzupełniania ---
    async function initAutocomplete() {
        // Krok 1: Pobierz wszystkie stacje z naszego API
        try {
            const response = await fetch('/api/stations');
            if (!response.ok) throw new Error('Błąd sieci');
            allStations = await response.json();
        } catch (error) {
            console.error("Nie udało się pobrać listy stacji dla autouzupełniania:", error);
            // Jeśli nie uda się pobrać stacji, autouzupełnianie po prostu nie zadziała
            return; 
        }

        // Krok 2: Stwórz dynamicznie kontener na sugestie
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'suggestions-container';
        // Wstaw kontener tuż po polu do wpisywania
        stationInput.parentNode.insertBefore(suggestionsContainer, stationInput.nextSibling);

        // Krok 3: Dodaj nasłuchiwanie na wpisywanie tekstu w pole
        stationInput.addEventListener('input', () => {
            const query = stationInput.value.toLowerCase();
            suggestionsContainer.innerHTML = ''; // Wyczyść stare sugestie

            if (query.length < 2) { // Nie pokazuj sugestii dla mniej niż 2 znaków
                suggestionsContainer.style.display = 'none';
                return;
            }
            
            // Filtruj stacje, które pasują do wpisanego tekstu
            const filteredStations = allStations.filter(station => 
                station.toLowerCase().includes(query)
            );

            // Wyświetl przefiltrowane sugestie
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

        // Krok 4: Dodaj nasłuchiwanie na kliknięcie w sugestię
        suggestionsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('suggestion-item')) {
                stationInput.value = event.target.textContent; // Wstaw wybraną stację do pola
                suggestionsContainer.innerHTML = ''; // Wyczyść sugestie
                suggestionsContainer.style.display = 'none'; // Ukryj kontener
            }
        });

        // Krok 5: Ukryj sugestie, jeśli użytkownik kliknie gdziekolwiek indziej
        document.addEventListener('click', (event) => {
            if (event.target !== stationInput) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    // --- Główna funkcja do pobierania i wyświetlania pociągów (bez zmian) ---
    async function fetchAndDisplayTrains() {
        const station = stationInput.value; // Zmieniono z stationSelect na stationInput
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
                    card.innerHTML = `
                        <div class="time-block">
                            <div class="label">Planowany Przyjazd</div>
                            <div class="time">${train.arrival_time?.substring(0, 5) ?? '---'}</div>
                            <div class="delay-info"></div>
                        </div>
                        <div class="time-block">
                            <div class="label">Planowany Odjazd</div>
                            <div class="time">${train.departure_time?.substring(0, 5) ?? '---'}</div>
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
    initAutocomplete(); // Uruchom nową funkcję autouzupełniania
    searchButton.addEventListener('click', fetchAndDisplayTrains);
});