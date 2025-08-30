// Czekaj, aż cały dokument HTML zostanie załadowany
document.addEventListener('DOMContentLoaded', function() {

    const trainListElement = document.getElementById('train-list');
    const lastUpdatedElement = document.getElementById('last-updated');

    // Funkcja do formatowania czasu i obliczania opóźnień
    function formatTime(timeString, delayMinutes) {
        if (!timeString) return "Brak danych";
        const [hours, minutes] = timeString.split(':');
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        if (delayMinutes > 0) {
            const actualDate = new Date(scheduledDate.getTime() + delayMinutes * 60000);
            const actualHours = String(actualDate.getHours()).padStart(2, '0');
            const actualMinutes = String(actualDate.getMinutes()).padStart(2, '0');
            return `<s>${hours}:${minutes}</s> <span class="delay">→ ${actualHours}:${actualMinutes}</span>`;
        }
        return `${hours}:${minutes}`;
    }

    // Główna funkcja do pobierania i wyświetlania danych
    async function fetchAndDisplayTrains() {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) {
                throw new Error(`Błąd HTTP: ${response.status}`);
            }
            const data = await response.json();

            // Czyścimy kontener przed dodaniem nowych danych
            trainListElement.innerHTML = '';

            // Aktualizujemy czas ostatniej aktualizacji
            lastUpdatedElement.textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

            if (data.trains && data.trains.length > 0) {
                data.trains.forEach(train => {
                    const card = document.createElement('div');
                    card.classList.add('train-card');
                    
                    // Ustaw kolor ramki w zależności od statusu
                    if (train.live_status === 'FOUND_LIVE') {
                        card.classList.add('status-live');
                    } else {
                        card.classList.add('status-scheduled');
                    }

                    const delayText = train.delay_minutes > 0 ? `Opóźnienie: ${train.delay_minutes} min` : "Brak opóźnień";
                    const statusText = train.live_status === 'FOUND_LIVE' ? `Status na żywo (${delayText})` : "Tylko wg rozkładu";

                    card.innerHTML = `
                        <div class="train-header">
                            <span class="train-headsign">${train.trip_headsign}</span>
                            <span class="train-time">${formatTime(train.arrival_time, train.delay_minutes)}</span>
                        </div>
                        <div class="train-details">
                            <span>${statusText}</span>
                        </div>
                    `;
                    trainListElement.appendChild(card);
                });
            } else {
                trainListElement.innerHTML = '<p class="no-trains">Brak pociągów w najbliższym czasie.</p>';
            }

        } catch (error) {
            console.error("Nie udało się pobrać danych o pociągach:", error);
            trainListElement.innerHTML = '<p class="no-trains">Wystąpił błąd podczas ładowania danych. Spróbuj ponownie później.</p>';
        }
    }

    // Uruchom funkcję od razu po załadowaniu strony
    fetchAndDisplayTrains();

    // Ustaw automatyczne odświeżanie co 30 sekund
    setInterval(fetchAndDisplayTrains, 30000); 
});