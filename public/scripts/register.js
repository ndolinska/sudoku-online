document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const msgDiv = document.getElementById('message');

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            msgDiv.style.color = 'lightgreen';
            msgDiv.innerText = 'Konto stworzone! Za chwilę zostaniesz przekierowany...';
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
            msgDiv.style.color = '#ff6b6b';
            msgDiv.innerText = data.message || 'Błąd rejestracji';
        }
    } catch (err) {
        msgDiv.innerText = 'Błąd połączenia z serwerem';
    }
});