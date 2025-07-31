// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.textContent = '';
            errorMessageDiv.classList.remove('visible');

            // --- SENHA PADRÃO PARA TODOS OS USUÁRIOS ---
            const senhaPadrao = 'aluforce@2025';

            // --- LISTA DE USUÁRIOS AUTORIZADOS ---
            const adminsAutorizados = [
                'ti@aluforce.ind.br',
                'isabella@aluforce.ind.br'
            ];
            const funcionariosAutorizados = [
                'augusto@aluforce.ind.br',
                'thaina.freitas@aluforce.ind.br',
                'renata@aluforce.ind.br',
                'fabiano.marques@aluforce.ind.br',
                'fabiola@marques.ind.br',
                'marcia@aluforce.ind.br',
                'guilherme@aluforce.ind.br',
                'marcos@aluforce.ind.br',
                'ariel.silva@aluforce.ind.br',
                'clemerson@aluforce.ind.br',
                'thiago@aluforce.ind.br',
                'paula@aluforce.ind.br'
            ];
            
            const emailDigitado = document.getElementById('username').value.toLowerCase();
            const passwordDigitada = document.getElementById('password').value;

            try {
                // ETAPA 1: Validar a senha padrão
                if (passwordDigitada !== senhaPadrao) {
                    throw new Error("Senha incorreta. Verifique a senha e tente novamente.");
                }

                // ETAPA 2: Validar o e-mail (só acontece se a senha estiver correta)
                let userData;
                const nomeExtraido = emailDigitado.split('@')[0];
                const nomeCompleto = nomeExtraido.charAt(0).toUpperCase() + nomeExtraido.slice(1);

                if (adminsAutorizados.includes(emailDigitado)) {
                    userData = {
                        id: 1,
                        nome_completo: `Admin (${nomeCompleto})`,
                        email: emailDigitado,
                        role: "admin"
                    };
                }
                else if (funcionariosAutorizados.includes(emailDigitado)) {
                    userData = {
                        id: 2,
                        nome_completo: nomeCompleto,
                        email: emailDigitado,
                        role: "employee"
                    };
                }
                else {
                    throw new Error("Email não cadastrado. Verifique o e-mail digitado ou contate o RH.");
                }

                // Salva os dados do usuário e redireciona
                localStorage.setItem('token', 'local_test_token');
                localStorage.setItem('userData', JSON.stringify(userData));

                if (userData.role === 'admin') {
                    window.location.href = 'areaadm.html';
                } else {
                    window.location.href = 'index.html';
                }

            } catch (error) {
                console.error('Falha no login:', error);
                errorMessageDiv.textContent = error.message;
                errorMessageDiv.classList.add('visible');
            }
        });
    }
});
