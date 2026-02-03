document.addEventListener('DOMContentLoaded', async () => {
    const usernameInput = document.getElementById('new-username');
    const passwordInput = document.getElementById('new-password');
    const displayUser = document.getElementById('display-username');
    const displayPoints = document.getElementById('display-points');
    const msgDiv = document.getElementById('message');

    // Pobranie danych użytkownika przy starcie
    try {
        const res = await fetch('/auth/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        const user = await res.json();
        
        // Wypełniamy interfejs
        displayUser.innerText = user.username;
        displayPoints.innerText = user.totalPoints; //Punkty
        usernameInput.value = user.username; // Domyślnie wpisujemy obecny login w pole edycji

    } catch (err) {
        console.error(err);
        msgDiv.innerText = "Błąd pobierania danych.";
    }

    // Obsługa formularza edycji (UPDATE / PATCH)
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        msgDiv.innerText = '';
        msgDiv.style.color = '#333';

        const newUsername = usernameInput.value.trim();
        const newPassword = passwordInput.value.trim();

        const body = {};
        if (newUsername) body.username = newUsername;
        if (newPassword) body.password = newPassword;

        if (Object.keys(body).length === 0) {
            msgDiv.innerText = "Nie wprowadzono żadnych zmian.";
            return;
        }

        try {
            const res = await fetch('/auth/me', {
                method: 'PATCH', // Używamy metody PATCH
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                msgDiv.style.color = 'green';
                msgDiv.innerText = data.message;
                // Aktualizacja widoku po sukcesie
                if (data.user) {
                    displayUser.innerText = data.user.username
                }
                passwordInput.value = ''; // Czyścimy pole hasła dla bezpieczeństwa
            } else {
                msgDiv.style.color = 'red';
                msgDiv.innerText = data.message || "Błąd aktualizacji.";
            }
        } catch (err) {
            msgDiv.style.color = 'red';
            msgDiv.innerText = "Błąd połączenia z serwerem.";
        }
    });

    // Obsługa usuwania konta (DELETE)
    document.getElementById('delete-btn').addEventListener('click', async () => {
        const confirmed = confirm("Czy na pewno chcesz usunąć konto? Tej operacji nie można cofnąć, a Twoje statystyki przepadną.");
        
        if (confirmed) {
            try {
                const res = await fetch('/auth/me', {
                    method: 'DELETE'
                });

                if (res.ok) {
                    alert("Konto zostało usunięte.");
                    window.location.href = 'login.html';
                } else {
                    const data = await res.json();
                    alert(data.message || "Nie udało się usunąć konta.");
                }
            } catch (err) {
                alert("Błąd serwera.");
            }
        }
    });
});