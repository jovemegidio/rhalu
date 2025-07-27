document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessageDiv.classList.remove('visible');
        errorMessageDiv.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }

            // Guarda os dados no localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.userData));

            // --- LÓGICA DE REDIRECIONAMENTO CORRETA E DEFINITIVA ---
            // Verifica o 'role' do utilizador para decidir para onde ir.
            if (data.userData.role === 'admin') {
                console.log("Login de Admin bem-sucedido. Redirecionando para /areaadm.html");
                window.location.href = '/areaadm.html'; // Caminho para a página de admin
            } else {
                console.log("Login de Funcionário bem-sucedido. Redirecionando para /area.html");
                window.location.href = '/area.html'; // Caminho para a página de funcionário
            }

        } catch (error) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.classList.add('visible');
        }
    });
});
