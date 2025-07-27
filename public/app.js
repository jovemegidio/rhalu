/**
 * Script unificado para o Portal do Funcionário e para a Área Administrativa.
 * Detecta a página (admin ou funcionário) e inicializa as funcionalidades relevantes.
 */
document.addEventListener('DOMContentLoaded', () => {
    const isAdminPage = document.getElementById('tabela-funcionarios');
    const isEmployeePage = document.getElementById('welcome-message');

    if (isAdminPage) {
        console.log("Inicializando a Área do Administrador...");
        initAdminPage();
    } else if (isEmployeePage) {
        console.log("Inicializando o Portal do Funcionário...");
        initEmployeePage();
    }
});

// ===================================================================================
// == FUNÇÃO AUXILIAR PARA FORMATAR DATAS
// ===================================================================================
function formatDateToBR(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("Erro ao formatar data:", isoString, error);
        return '';
    }
}

// ===================================================================================
// == ÁREA DO ADMINISTRADOR
// ===================================================================================
function initAdminPage() {
    // --- Validação de Acesso ---
    const localUserData = JSON.parse(localStorage.getItem('userData'));
    if (!localUserData || localUserData.role !== 'admin') {
        alert("Acesso negado. Apenas administradores podem aceder a esta página.");
        window.location.href = '/login.html';
        return;
    }

    // --- Seletores de Elementos ---
    const API_URL = 'http://localhost:3000/api/funcionarios';
    const tabelaCorpo = document.querySelector('#tabela-funcionarios tbody');
    const modal = document.getElementById('modal-detalhes');
    const closeModalButton = document.querySelector('.close-button');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const formNovoFuncionario = document.getElementById('form-novo-funcionario');
    const formUploadFoto = document.getElementById('form-upload-foto');
    const formUploadHolerite = document.getElementById('form-upload-holerite');
    let currentFuncionarioId = null;

    // --- Funções ---
    async function carregarFuncionarios() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Erro ao buscar dados da API.');
            const funcionarios = await response.json();
            
            tabelaCorpo.innerHTML = '';
            funcionarios.forEach(func => {
                const tr = document.createElement('tr');
                const fotoUrl = func.foto_url || 'placeholder.png';
                tr.innerHTML = `
                    <td>${func.id}</td>
                    <td><img src="${fotoUrl}" alt="Foto de ${func.nome}" class="foto-funcionario"></td>
                    <td>${func.nome}</td>
                    <td>${func.cargo}</td>
                    <td>${func.email}</td>
                    <td><button class="btn btn-detalhes" data-id="${func.id}">Detalhes</button></td>
                `;
                tabelaCorpo.appendChild(tr);
            });
        } catch (error) {
            tabelaCorpo.innerHTML = `<tr><td colspan="6" style="color: red;">${error.message}</td></tr>`;
        }
    }

    async function abrirModalDetalhes(id) {
        currentFuncionarioId = id;
        const detalhesContent = document.getElementById('detalhes-funcionario-content');
        const fotoPreview = document.getElementById('modal-foto-preview');
        const listaAtestados = document.getElementById('lista-atestados');
        const listaHolerites = document.getElementById('lista-holerites');

        detalhesContent.innerHTML = '<p>Carregando...</p>';
        listaAtestados.innerHTML = '';
        listaHolerites.innerHTML = '';
        modal.style.display = 'block';
        
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (!response.ok) throw new Error('Não foi possível buscar os detalhes.');
            const func = await response.json();
            
            fotoPreview.src = func.foto_url || 'placeholder.png';
            detalhesContent.innerHTML = `
                <p><strong>ID:</strong> ${func.id}</p>
                <p><strong>Nome:</strong> ${func.nome_completo}</p>
                <p><strong>Email:</strong> ${func.email}</p>
                <p><strong>Cargo (Role):</strong> ${func.role}</p>
                <p><strong>Admissão:</strong> ${formatDateToBR(func.data_admissao)}</p>
            `;

            // Preenche a lista de atestados
            if (func.atestados && func.atestados.length > 0) {
                func.atestados.forEach(atestado => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="${atestado.url_arquivo}" target="_blank">${atestado.nome_arquivo}</a> <span>(Enviado em: ${formatDateToBR(atestado.data_envio)})</span>`;
                    listaAtestados.appendChild(li);
                });
            } else {
                listaAtestados.innerHTML = '<li>Nenhum atestado anexado.</li>';
            }

            // Preenche a lista de holerites
            if (func.holerites && func.holerites.length > 0) {
                 func.holerites.forEach(holerite => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="${holerite.url_pdf}" target="_blank">Competência ${holerite.competencia.substring(5, 7)}/${holerite.competencia.substring(0, 4)}</a>`;
                    listaHolerites.appendChild(li);
                });
            } else {
                listaHolerites.innerHTML = '<li>Nenhum holerite anexado.</li>';
            }

        } catch(error) {
            detalhesContent.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    function fecharModal() { modal.style.display = 'none'; }

    // --- Event Listeners ---
    if (menuToggle) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.classList.contains('logout')) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const targetSection = document.getElementById(link.getAttribute('href').substring(1));
            if (targetSection) targetSection.classList.add('active');
            link.classList.add('active');
        });
    });

    tabelaCorpo.addEventListener('click', e => {
        if (e.target.classList.contains('btn-detalhes')) abrirModalDetalhes(e.target.dataset.id);
    });
    
    if(closeModalButton) closeModalButton.addEventListener('click', fecharModal);
    window.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

    formNovoFuncionario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formNovoFuncionario);
        const dadosFuncionario = Object.fromEntries(formData.entries());
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFuncionario)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('Funcionário cadastrado com sucesso!');
            formNovoFuncionario.reset();
            carregarFuncionarios();
            document.querySelector('.nav-link[href="#dashboard-section"]').click();
        } catch (error) {
            alert(`Erro ao cadastrar: ${error.message}`);
        }
    });

    formUploadFoto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusDiv = document.getElementById('upload-foto-status');
        const fotoInput = document.getElementById('arquivo-foto');
        if (!currentFuncionarioId || fotoInput.files.length === 0) {
            statusDiv.textContent = "Selecione um funcionário e um ficheiro.";
            return;
        }
        const formData = new FormData();
        formData.append('foto', fotoInput.files[0]);
        statusDiv.textContent = 'A enviar...';
        try {
            const response = await fetch(`${API_URL}/${currentFuncionarioId}/foto`, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            statusDiv.textContent = "Foto enviada com sucesso!";
            document.getElementById('modal-foto-preview').src = result.foto_url;
            fotoInput.value = '';
            carregarFuncionarios();
        } catch (error) {
            statusDiv.textContent = `Erro: ${error.message}`;
        }
    });

    formUploadHolerite.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusDiv = document.getElementById('upload-holerite-status');
        const fileInput = document.getElementById('arquivo-holerite');
        const competenciaInput = document.getElementById('holerite-competencia');

        if (!currentFuncionarioId || fileInput.files.length === 0 || !competenciaInput.value) {
            statusDiv.textContent = "Selecione um ficheiro e a competência.";
            return;
        }

        const formData = new FormData();
        formData.append('holerite', fileInput.files[0]);
        formData.append('competencia', competenciaInput.value);
        statusDiv.textContent = 'A enviar...';

        try {
            const response = await fetch(`${API_URL}/${currentFuncionarioId}/holerite`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            statusDiv.textContent = result.message;
            formUploadHolerite.reset();
            abrirModalDetalhes(currentFuncionarioId); // Recarrega os detalhes do modal
        } catch (error) {
            statusDiv.textContent = `Erro: ${error.message}`;
        }
    });

    carregarFuncionarios();
}

// ===================================================================================
// == PORTAL DO FUNCIONÁRIO
// ===================================================================================
async function initEmployeePage() {
    const authToken = localStorage.getItem('authToken');
    const localUserData = JSON.parse(localStorage.getItem('userData'));

    if (localUserData && localUserData.role === 'admin') {
        window.location.href = '/areaadm.html';
        return;
    }

    if (!authToken || !localUserData || !localUserData.id) {
        alert("Sessão inválida. Por favor, faça o login novamente.");
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/funcionarios/${localUserData.id}`);
        if (!response.ok) throw new Error("Não foi possível carregar os seus dados.");
        
        const freshUserData = await response.json();
        localStorage.setItem('userData', JSON.stringify(freshUserData));
        
        populateUserData(freshUserData);
        setupEmployeeEventListeners(freshUserData);

    } catch (error) {
        alert(error.message);
        localStorage.clear();
        window.location.href = '/login.html';
    }
}

function populateUserData(userData) {
    document.getElementById('welcome-message').textContent = `Bem-vindo(a), ${userData.nome_completo || 'Utilizador'}`;
    document.getElementById('last-login').textContent = new Date().toLocaleString('pt-BR');

    const fields = {
        'nome_completo': userData.nome_completo,
        'data_nascimento': formatDateToBR(userData.data_nascimento),
        'cpf': userData.cpf, 'rg': userData.rg, 'endereco': userData.endereco,
        'telefone': userData.telefone, 'email': userData.email,
        'estado_civil': userData.estado_civil, 'dependentes': userData.dependentes,
        'data_admissao': formatDateToBR(userData.data_admissao)
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = (value !== null && value !== undefined) ? value : '';
    });

    document.getElementById('banco').textContent = userData.banco || 'Não informado';
    document.getElementById('agencia').textContent = userData.agencia || 'Não informado';
    document.getElementById('conta_corrente').textContent = userData.conta_corrente || 'Não informado';

    // Preenche o seletor de holerites
    const holeriteSelect = document.getElementById('holerite-mes');
    holeriteSelect.innerHTML = '<option value="">Selecione um mês</option>';
    if (userData.holerites && userData.holerites.length > 0) {
        userData.holerites.forEach(h => {
            const option = document.createElement('option');
            option.value = h.url_pdf;
            option.textContent = `Competência ${h.competencia.substring(5, 7)}/${h.competencia.substring(0, 4)}`;
            holeriteSelect.appendChild(option);
        });
    }
}

function setupEmployeeEventListeners(userData) {
    document.querySelectorAll('.sidebar-nav .nav-link, .widget-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('href').substring(1);
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            const targetLink = document.querySelector(`.sidebar-nav .nav-link[href="#${targetId}"]`);
            if (targetSection) targetSection.classList.add('active');
            if (targetLink) targetLink.classList.add('active');
        });
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        alert("Você foi desconectado.");
        window.location.href = '/login.html';
    });

    document.getElementById('edit-btn').addEventListener('click', () => {
        ['telefone', 'estado_civil', 'dependentes'].forEach(id => {
            document.getElementById(id).disabled = false;
        });
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('save-btn').style.display = 'inline-block';
    });

    document.getElementById('dados-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-btn');
        saveBtn.textContent = 'Salvando...';
        saveBtn.disabled = true;
        const dadosParaSalvar = {
            telefone: document.getElementById('telefone').value,
            estado_civil: document.getElementById('estado_civil').value,
            dependentes: document.getElementById('dependentes').value
        };
        try {
            const response = await fetch(`http://localhost:3000/api/funcionarios/${userData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaSalvar),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message);
            ['telefone', 'estado_civil', 'dependentes'].forEach(id => {
                document.getElementById(id).disabled = true;
            });
            document.getElementById('edit-btn').style.display = 'inline-block';
            document.getElementById('save-btn').style.display = 'none';
        } catch (error) {
            alert(`Falha ao salvar: ${error.message}`);
        } finally {
            saveBtn.textContent = 'Salvar Alterações';
            saveBtn.disabled = false;
        }
    });

    // Event listener para o formulário de atestado
    const atestadoForm = document.getElementById('atestado-form');
    if (atestadoForm) {
        atestadoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('upload-status');
            const fileInput = document.getElementById('atestado-file');
            if (fileInput.files.length === 0) {
                statusDiv.textContent = "Por favor, selecione um ficheiro.";
                return;
            }
            const formData = new FormData();
            formData.append('atestado', fileInput.files[0]);
            statusDiv.textContent = 'A enviar...';
            try {
                const response = await fetch(`http://localhost:3000/api/funcionarios/${userData.id}/atestado`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                statusDiv.textContent = result.message;
                atestadoForm.reset();
            } catch (error) {
                statusDiv.textContent = `Erro: ${error.message}`;
            }
        });
    }

    // Event listener para o botão de visualizar holerite
    const viewHoleriteBtn = document.getElementById('view-holerite');
    const holeriteViewer = document.getElementById('holerite-viewer');
    if(viewHoleriteBtn) {
        viewHoleriteBtn.addEventListener('click', () => {
            const selectedUrl = document.getElementById('holerite-mes').value;
            if (selectedUrl) {
                holeriteViewer.innerHTML = `<iframe src="${selectedUrl}" width="100%" height="600px" title="Visualizador de Holerite"></iframe>`;
            } else {
                holeriteViewer.innerHTML = '<p>Por favor, selecione um holerite para visualizar.</p>';
            }
        });
    }
}
