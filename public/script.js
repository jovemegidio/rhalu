/**
 * Script unificado para o Portal do Funcionário e para a Área Administrativa.
 * * O código detecta em qual página está (admin ou funcionário) e inicializa
 * apenas as funcionalidades relevantes para evitar conflitos.
 */
document.addEventListener('DOMContentLoaded', () => {

    // Verifica se estamos na página do Admin (procurando a tabela de funcionários)
    const isAdminPage = document.getElementById('tabela-funcionarios');
    
    // Verifica se estamos na página do Funcionário (procurando a mensagem de boas-vindas)
    const isEmployeePage = document.getElementById('welcome-message');

    if (isAdminPage) {
        console.log("Inicializando a Área do Administrador...");
        initAdminPage();
    } else if (isEmployeePage) {
        console.log("Inicializando o Portal do Funcionário...");
        initEmployeePage();
    } else {
        console.warn("Nenhum contexto (Admin ou Funcionário) detectado. O script não foi totalmente inicializado.");
    }

});

// ===================================================================================
// == INÍCIO - LÓGICA DA ÁREA DO ADMINISTRADOR
// ===================================================================================
function initAdminPage() {
    const API_URL = 'http://localhost:3000/api/funcionarios';
    const tabelaCorpo = document.querySelector('#tabela-funcionarios tbody');
    const formNovoFuncionario = document.getElementById('form-novo-funcionario');
    const modal = document.getElementById('modal-detalhes');
    const closeModalButton = document.querySelector('.close-button');
    let currentFuncionarioId = null;

    // --- LÓGICA PARA NAVEGAÇÃO DO MENU (ADMIN) ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        if (link.classList.contains('logout')) return; // Ignora o link de logout

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            contentSections.forEach(section => section.classList.remove('active'));
            navLinks.forEach(navLink => navLink.classList.remove('active'));

            if (targetSection) {
                targetSection.classList.add('active');
                link.classList.add('active');
            }
        });
    });

    // --- FUNÇÕES DA API (ADMIN) ---

    async function carregarFuncionarios() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Erro ao buscar dados da API.');
            const funcionarios = await response.json();
            
            tabelaCorpo.innerHTML = '';
            if (funcionarios.length === 0) {
                tabelaCorpo.innerHTML = `<tr><td colspan="5">Nenhum funcionário cadastrado.</td></tr>`;
                return;
            }

            funcionarios.forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${func.id}</td>
                    <td>${func.nome}</td>
                    <td>${func.cargo}</td>
                    <td>${func.email}</td>
                    <td><button class="btn btn-detalhes" data-id="${func.id}">Detalhes</button></td>
                `;
                tabelaCorpo.appendChild(tr);
            });
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            tabelaCorpo.innerHTML = `<tr><td colspan="5" style="color: red;">Não foi possível carregar os dados. Verifique se a API está online.</td></tr>`;
        }
    }

    async function cadastrarFuncionario(event) {
        event.preventDefault();
        const novoFuncionario = {
            nome: document.getElementById('nome').value,
            cargo: document.getElementById('cargo').value,
            email: document.getElementById('email').value,
            dataAdmissao: document.getElementById('data-admissao').value,
        };
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoFuncionario),
            });
            if (!response.ok) throw new Error('Erro ao cadastrar funcionário.');
            alert('Funcionário cadastrado com sucesso!');
            formNovoFuncionario.reset();
            carregarFuncionarios();
            document.querySelector('.nav-link[href="#dashboard-section"]').click(); // Volta para a dashboard
        } catch (error) {
            alert('Falha ao cadastrar: ' + error.message);
        }
    }

    async function uploadArquivo(tipoArquivo, inputFileId) {
        const inputFile = document.getElementById(inputFileId);
        if (inputFile.files.length === 0) {
            alert('Por favor, selecione um arquivo.');
            return;
        }
        const formData = new FormData();
        formData.append('arquivo', inputFile.files[0]);
        try {
            const response = await fetch(`${API_URL}/${currentFuncionarioId}/${tipoArquivo}`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error(`Falha no upload do arquivo.`);
            alert(`Arquivo enviado com sucesso!`);
            inputFile.value = ''; // Limpa o input
            abrirModalDetalhes(currentFuncionarioId); // Recarrega os detalhes do modal
        } catch (error) {
            alert(`Erro ao enviar o arquivo: ${error.message}`);
        }
    }

    async function abrirModalDetalhes(id) {
        currentFuncionarioId = id;
        const detalhesContent = document.getElementById('detalhes-funcionario-content');
        detalhesContent.innerHTML = '<p>Carregando...</p>';
        modal.style.display = 'block';
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (!response.ok) throw new Error('Não foi possível buscar os detalhes do funcionário.');
            const func = await response.json();
            
            const dataAdmissao = func.data_admissao ? new Date(func.data_admissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';
            const atestados = func.atestados && func.atestados.length > 0 ? func.atestados.map(a => `<li>${a}</li>`).join('') : '<li>Nenhum atestado registrado.</li>';
            const holerites = func.holerites && func.holerites.length > 0 ? func.holerites.map(h => `<li>${h}</li>`).join('') : '<li>Nenhum holerite registrado.</li>';

            detalhesContent.innerHTML = `
                <p><strong>ID:</strong> ${func.id}</p>
                <p><strong>Nome:</strong> ${func.nome}</p>
                <p><strong>Email:</strong> ${func.email}</p>
                <p><strong>Cargo:</strong> ${func.cargo}</p>
                <p><strong>Admissão:</strong> ${dataAdmissao}</p>
                <hr><h4>Atestados:</h4><ul>${atestados}</ul>
                <h4>Holerites:</h4><ul>${holerites}</ul>`;
        } catch(error) {
            detalhesContent.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    function fecharModal() {
        modal.style.display = 'none';
    }

    // --- EVENT LISTENERS (ADMIN) ---
    if(formNovoFuncionario) formNovoFuncionario.addEventListener('submit', cadastrarFuncionario);
    
    tabelaCorpo.addEventListener('click', e => {
        if (e.target.classList.contains('btn-detalhes')) {
            abrirModalDetalhes(e.target.dataset.id);
        }
    });

    document.getElementById('btn-upload-holerite').addEventListener('click', () => uploadArquivo('holerite', 'arquivo-holerite'));
    document.getElementById('btn-upload-atestado').addEventListener('click', () => uploadArquivo('atestado', 'arquivo-atestado'));
    
    if(closeModalButton) closeModalButton.addEventListener('click', fecharModal);
    window.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

    // Carga inicial
    carregarFuncionarios();
}
// ===================================================================================
// == FIM - LÓGICA DA ÁREA DO ADMINISTRADOR
// ===================================================================================



// ===================================================================================
// == INÍCIO - LÓGICA DO PORTAL DO FUNCIONÁRIO
// ===================================================================================
function initEmployeePage() {
    
    // --- LÓGICA DE AUTENTICAÇÃO E DADOS DO USUÁRIO ---
    
    // Tenta obter os dados do localStorage. Em um sistema real, isso viria de uma API.
    const authToken = localStorage.getItem('authToken');
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
    } catch {
        // Se os dados estiverem corrompidos, trata como nulos
        userData = null;
    }

    // Se não houver token ou nome de usuário, redireciona para o login
    if (!authToken || !userData || !userData.nome) {
        // Para fins de teste, podemos usar a função de simulação.
        // Em produção, a linha de redirecionamento deve ser usada.
        console.warn("Usuário não autenticado. Tentando simular login para desenvolvimento.");
        simulateLoginForEmployee(); // Chama a simulação
        // Recarrega a página para aplicar os dados simulados
        window.location.reload(); 
        // Em produção, use: window.location.href = 'login.html';
        return; // Para a execução
    }

    // --- PREENCHIMENTO DOS DADOS NA PÁGINA ---
    
    function populateUserData(data) {
        document.getElementById('welcome-message').textContent = `Bem-vindo(a), ${data.nome || 'Usuário'}`;
        document.getElementById('last-login').textContent = new Date().toLocaleString('pt-BR');
        
        const fields = {
            'nome_completo': data.nome,
            'data_nascimento': data.dataNascimento,
            'cpf': data.cpf,
            'rg': data.rg,
            'endereco': data.endereco,
            'telefone': data.telefone,
            'email': data.email,
            'estado_civil': data.estadoCivil,
            'dependentes': data.dependentes || 0,
            'data_admissao': data.dataAdmissao
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        });

        document.getElementById('banco').textContent = data.banco || 'Não informado';
        document.getElementById('agencia').textContent = data.agencia || 'Não informado';
        document.getElementById('conta_corrente').textContent = data.conta || 'Não informado';
    }

    // --- FUNÇÕES DE EVENTOS (FUNCIONÁRIO) ---

    function setupEventListeners() {
        // Menu toggle para mobile
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) menuToggle.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

        // Navegação principal
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-link, .widget-link');
        navLinks.forEach(link => link.addEventListener('click', handleNavLinkClick));

        // Logout
        document.getElementById('logout-btn').addEventListener('click', handleLogout);

        // Edição de dados
        document.getElementById('edit-btn').addEventListener('click', enableFormEditing);
        document.getElementById('dados-form').addEventListener('submit', handleFormSubmit);

        // Holerite e Ponto
        document.getElementById('view-holerite').addEventListener('click', loadHolerite);
        document.getElementById('view-ponto').addEventListener('click', loadPonto);

        // Atestado
        document.getElementById('atestado-form').addEventListener('submit', handleAtestadoSubmit);
    }
    
    function handleNavLinkClick(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href').substring(1);
        
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
        
        document.getElementById(targetId).classList.add('active');
        document.querySelector(`.sidebar-nav .nav-link[href="#${targetId}"]`).classList.add('active');
    }

    function handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        alert("Você foi desconectado.");
        window.location.href = 'login.html';
    }

    function enableFormEditing() {
        ['telefone', 'estado_civil', 'dependentes'].forEach(id => {
            document.getElementById(id).disabled = false;
        });
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('save-btn').style.display = 'inline-block';
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        // Simulação de salvamento
        alert("Dados salvos com sucesso! (Simulação)");
        ['telefone', 'estado_civil', 'dependentes'].forEach(id => {
            document.getElementById(id).disabled = true;
        });
        document.getElementById('edit-btn').style.display = 'inline-block';
        document.getElementById('save-btn').style.display = 'none';
    }

    function loadHolerite() {
        const mes = document.getElementById('holerite-mes').value;
        const viewer = document.getElementById('holerite-viewer');
        viewer.innerHTML = `<p class="loading">Carregando holerite de ${mes}...</p>
                            <iframe src="holerite_simulado.pdf" style="width:100%; height:500px;" title="Visualizador de Holerite"></iframe>`;
    }

    function loadPonto() {
        const periodo = document.getElementById('ponto-mes').options[document.getElementById('ponto-mes').selectedIndex].text;
        const viewer = document.getElementById('ponto-viewer');
        viewer.innerHTML = `<p>Exibindo espelho de ponto para o período de ${periodo}.</p> 
                            `;
    }

    function handleAtestadoSubmit(e) {
        e.preventDefault();
        const fileInput = document.getElementById('atestado-file');
        const uploadStatus = document.getElementById('upload-status');
        if (fileInput.files.length > 0) {
            uploadStatus.textContent = "Enviando...";
            uploadStatus.style.color = 'blue';
            // Simulação de upload
            setTimeout(() => {
                uploadStatus.textContent = "Atestado enviado com sucesso!";
                uploadStatus.style.color = 'green';
                e.target.reset();
            }, 1500);
        } else {
            uploadStatus.textContent = "Por favor, selecione um arquivo.";
            uploadStatus.style.color = 'red';
        }
    }

    // --- INICIALIZAÇÃO (FUNCIONÁRIO) ---
    populateUserData(userData);
    setupEventListeners();
}

/**
 * Função de simulação para desenvolvimento.
 * Cria dados de usuário no localStorage para que a página do funcionário funcione sem um login real.
 * Para usar, abra o console do navegador na página de login e digite: simulateLoginForEmployee()
 */
function simulateLoginForEmployee() {
    try {
        const userData = {
            nome: "Maria Oliveira",
            dataNascimento: "20/08/1992",
            cpf: "111.222.333-44",
            rg: "22.333.444-5",
            endereco: "Avenida Principal, 456 - São Paulo, SP",
            telefone: "(11) 91234-5678",
            email: "maria.oliveira@empresa.com",
            estadoCivil: "Solteira",
            dependentes: 0,
            dataAdmissao: "25/07/2021",
            banco: "Banco Itaú",
            agencia: "5678",
            conta: "12345-6"
        };
        localStorage.setItem('authToken', 'simulated-token-employee-789');
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('Login de funcionário simulado com sucesso!');
    } catch (error) {
        console.error('Erro ao simular login de funcionário:', error);
    }
}
// ===================================================================================
// == FIM - LÓGICA DO PORTAL DO FUNCIONÁRIO
// ===================================================================================