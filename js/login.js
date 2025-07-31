// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form'); 
    const errorMessageDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.textContent = ''; 
            errorMessageDiv.classList.remove('visible');

            const email = document.getElementById('username').value; 
            const password = document.getElementById('password').value;

            try {
                // Usando caminho relativo, que é mais seguro para o servidor
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro desconhecido');
                }
                
                // Salva os dados no localStorage para serem usados por outros scripts
                localStorage.setItem('token', data.token);
                localStorage.setItem('userData', JSON.stringify(data.userData));

                // Redireciona para a página correta após o login
                if (data.userData.role === 'admin') {
                    window.location.href = 'areaadm.html'; // CORRIGIDO
                } else {
                    // CORREÇÃO: Redirecionando para index.html para funcionários
                    window.location.href = 'index.html'; // CORRIGIDO
                }

            } catch (error) {
                console.error('Falha no login:', error);
                errorMessageDiv.textContent = error.message;
                errorMessageDiv.classList.add('visible'); // Mostra a mensagem de erro no CSS
            }
        });
    }
});
