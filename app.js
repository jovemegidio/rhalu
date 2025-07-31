/**
 * Script unificado para o Portal do Funcionário e para a Área Administrativa.
 * v18.0 - Adicionada funcionalidade de navegação entre portais para admins especiais.
 * - CRUD completo para Funcionários (Criar, Ler, Atualizar, Apagar).
 * - Ficha de detalhes do admin e portal do funcionário totalmente sincronizadas.
 * - Lógica de atualização robusta para salvar todas as alterações do formulário.
 */
document.addEventListener('DOMContentLoaded', () => {
    const isAdminPage = document.querySelector('body.admin-page');
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
// == FUNÇÕES AUXILIARES GLOBAIS
// ===================================================================================

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            alert("Sessão inválida ou expirada. Por favor, faça login novamente.");
            window.location.href = '/login.html';
            return Promise.reject(new Error('Não autorizado'));
        }
        return response;
    } catch (error) {
        console.error('Erro de conexão:', error);
        showToast('Erro de conexão com o servidor.', 'error');
        return Promise.reject(error);
    }
}

function formatDateToBR(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const correctedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return correctedDate.toLocaleDateString('pt-BR', {});
}

function formatDateToInput(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const correctedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return correctedDate.toISOString().split('T')[0];
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '';
    const number = Number(value);
    if (isNaN(number)) return '';
    return number.toFixed(2).replace('.', ',');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}

// ===================================================================================
// == ÁREA DO ADMINISTRADOR
// ===================================================================================
function initAdminPage() {
    const localUserData = JSON.parse(localStorage.getItem('userData'));
    if (!localUserData || localUserData.role !== 'admin') {
        alert("Acesso negado. Apenas administradores podem aceder a esta página.");
        window.location.href = '/login.html';
        return;
    }
    
    // Lista de administradores que também são colaboradores
    const specialAdmins = ['antonio.egidio@aluforce.ind.br', 'isa@aluforce.ind.br'];
    if (specialAdmins.includes(localUserData.email)) {
        const meuPortalLink = document.getElementById('ver-meu-portal-link');
        if (meuPortalLink) {
            meuPortalLink.style.display = 'list-item';
        }
    }

    const API_URL = '/api';
    let activeEmployeeId = null;
    let debounceTimer;

    const elements = {
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults'),
        employeeDetailsContainer: document.getElementById('employeeDetailsContainer'),
        dashboardContainer: document.getElementById('dashboard-widgets-container'),
        formNovoFuncionario: document.getElementById('form-novo-funcionario'),
        formNovoAviso: document.getElementById('form-novo-aviso'),
        listaAvisosAdmin: document.getElementById('lista-avisos-admin'),
    };

    // --- FUNCIONALIDADE DE DASHBOARD ---
    async function initDashboard() {
        if (!elements.dashboardContainer) return;
        elements.dashboardContainer.innerHTML = '<p>A carregar métricas...</p>';
        try {
            const response = await fetchWithAuth(`${API_URL}/dashboard`);
            if (!response.ok) throw new Error('Não foi possível carregar os dados do dashboard.');
            const data = await response.json();
            const { stats = {}, aniversariantes = [] } = data;

            const aniversariantesHtml = aniversariantes.length > 0
                ? aniversariantes.map(a => `<li>${a.nome_completo} (${formatDateToBR(a.data_nascimento).slice(0, 5)})</li>`).join('')
                : '<li>Nenhum aniversário este mês.</li>';

            elements.dashboardContainer.innerHTML = `
                <div class="widget-card">
                    <i class="fas fa-users"></i>
                    <div class="widget-info">
                        <span class="widget-value">${stats.totalFuncionarios || 0}</span>
                        <span class="widget-label">Total de Funcionários Ativos</span>
                    </div>
                </div>
                <div class="widget-card">
                    <i class="fas fa-birthday-cake"></i>
                    <div class="widget-info">
                        <span class="widget-label">Aniversariantes do Mês</span>
                        <ul class="widget-list">${aniversariantesHtml}</ul>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
            elements.dashboardContainer.innerHTML = `<p style="color: var(--cor-erro);">Não foi possível carregar os widgets.</p>`;
        }
    }

    // --- FUNCIONALIDADES DE AVISOS ---
    async function loadAvisosAdmin() {
        if (!elements.listaAvisosAdmin) return;
        elements.listaAvisosAdmin.innerHTML = '<li>A carregar avisos...</li>';
        try {
            const response = await fetchWithAuth(`${API_URL}/avisos`);
            const avisos = await response.json();
            
            elements.listaAvisosAdmin.innerHTML = avisos.length > 0
                ? avisos.map(aviso => `
                    <li>
                        <div class="aviso-content">
                            <strong>${aviso.titulo}</strong>
                            <p>${aviso.conteudo}</p>
                            <small>Publicado em: ${formatDateToBR(aviso.data_publicacao)}</small>
                        </div>
                        <button class="btn-excluir-aviso" data-id="${aviso.id}"><i class="fas fa-trash"></i></button>
                    </li>`).join('')
                : '<li>Nenhum aviso publicado.</li>';
        } catch (error) {
            elements.listaAvisosAdmin.innerHTML = '<li>Erro ao carregar avisos.</li>';
        }
    }

    async function handleCreateAviso(event) {
        event.preventDefault();
        const titulo = document.getElementById('aviso-titulo').value;
        const conteudo = document.getElementById('aviso-mensagem').value;

        try {
            const response = await fetchWithAuth(`${API_URL}/avisos`, {
                method: 'POST',
                body: JSON.stringify({ titulo, conteudo }),
            });
            if (!response.ok) throw new Error('Falha ao criar aviso.');
            
            showToast('Aviso publicado com sucesso!');
            elements.formNovoAviso.reset();
            loadAvisosAdmin();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function handleDeleteAviso(avisoId) {
        if (!confirm('Tem a certeza que deseja apagar este aviso?')) return;
        try {
            const response = await fetchWithAuth(`${API_URL}/avisos/${avisoId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao apagar o aviso.');
            showToast('Aviso apagado com sucesso!');
            loadAvisosAdmin();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // --- FUNCIONALIDADES DE GESTÃO DE FUNCIONÁRIOS ---
    async function searchEmployees(query) {
        if (!query || query.length < 2) {
            elements.searchResults.innerHTML = '';
            elements.searchResults.style.display = 'none';
            return;
        }
        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios?search=${query}`);
            if (!response.ok) throw new Error('A busca falhou.');
            const employees = await response.json();
            displaySearchResults(employees);
        } catch (error) {
            elements.searchResults.innerHTML = `<div class="search-result-item"><span class="nome" style="color: red;">Erro ao buscar.</span></div>`;
            elements.searchResults.style.display = 'block';
        }
    }

    function displaySearchResults(employees) {
        if (employees.length === 0) {
            elements.searchResults.innerHTML = '<div class="search-result-item"><span class="nome">Nenhum resultado encontrado.</span></div>';
        } else {
            elements.searchResults.innerHTML = employees.map(emp => `
                <div class="search-result-item" data-id="${emp.id}">
                    <span class="nome">${emp.nome_completo}</span>
                    <span class="cargo">${emp.cargo || 'N/A'}</span>
                </div>
            `).join('');
        }
        elements.searchResults.style.display = 'block';
    }
    
    function generateDetailsHTML(employee) {
        const getValue = (field) => employee[field] || '';
        const holerites = employee.holerites || [];
        const atestados = employee.atestados || [];

        return `
            <div class="details-header">
                <h3>Detalhes de ${getValue('nome_completo')}</h3>
                <img src="${getValue('foto_perfil_url') || './uploads/fotos/foto-1-1753728536917-312098578.png'}" alt="Foto" class="details-foto" id="detailsFotoPreview">
            </div>
            <div class="details-grid">
                <div class="details-column">
                    <form id="editEmployeeForm" class="form-container" style="padding:0; box-shadow:none;">
                        <fieldset>
                            <legend>Dados Pessoais</legend>
                            <div class="form-group"><label>Nome Completo</label><input type="text" name="nome_completo" value="${getValue('nome_completo')}"></div>
                            <div class="form-grid-3">
                                <div class="form-group"><label>Data de Nascimento</label><input type="date" name="data_nascimento" value="${formatDateToInput(getValue('data_nascimento'))}"></div>
                                <div class="form-group"><label>Nacionalidade</label><input type="text" name="nacionalidade" value="${getValue('nacionalidade')}"></div>
                                <div class="form-group"><label>Naturalidade</label><input type="text" name="naturalidade" value="${getValue('naturalidade')}"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label>Nome da Mãe</label><input type="text" name="filiacao_mae" value="${getValue('filiacao_mae')}"></div>
                                <div class="form-group"><label>Nome do Pai</label><input type="text" name="filiacao_pai" value="${getValue('filiacao_pai')}"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label>Estado Civil</label><input type="text" name="estado_civil" value="${getValue('estado_civil')}"></div>
                                <div class="form-group"><label>Nome do Cônjuge</label><input type="text" name="dados_conjuge" value="${getValue('dados_conjuge')}"></div>
                            </div>
                            <div class="form-group"><label>Endereço</label><input type="text" name="endereco" value="${getValue('endereco')}"></div>
                            <div class="form-group"><label>Nº Dependentes</label><input type="number" name="dependentes" value="${getValue('dependentes')}"></div>
                        </fieldset>
                        <fieldset>
                            <legend>Documentação</legend>
                             <div class="form-grid">
                                <div class="form-group"><label>CPF</label><input type="text" name="cpf" value="${getValue('cpf')}"></div>
                                <div class="form-group"><label>RG</label><input type="text" name="rg" value="${getValue('rg')}"></div>
                            </div>
                            <div class="form-grid-3">
                                <div class="form-group"><label>Título de Eleitor</label><input type="text" name="titulo_eleitor" value="${getValue('titulo_eleitor')}"></div>
                                <div class="form-group"><label>Zona</label><input type="text" name="zona_eleitoral" value="${getValue('zona_eleitoral')}"></div>
                                <div class="form-group"><label>Seção</label><input type="text" name="secao_eleitoral" value="${getValue('secao_eleitoral')}"></div>
                            </div>
                            <div class="form-grid-3">
                                <div class="form-group"><label>Nº da CTPS</label><input type="text" name="ctps_numero" value="${getValue('ctps_numero')}"></div>
                                <div class="form-group"><label>Série</label><input type="text" name="ctps_serie" value="${getValue('ctps_serie')}"></div>
                                <div class="form-group"><label>PIS/PASEP</label><input type="text" name="pis_pasep" value="${getValue('pis_pasep')}"></div>
                            </div>
                             <div class="form-grid">
                                <div class="form-group"><label>Nº da CNH</label><input type="text" name="cnh_numero" value="${getValue('cnh_numero')}"></div>
                                <div class="form-group"><label>Categoria CNH</label><input type="text" name="cnh_categoria" value="${getValue('cnh_categoria')}"></div>
                            </div>
                             <div class="form-group"><label>Cert. Reservista</label><input type="text" name="certificado_reservista" value="${getValue('certificado_reservista')}"></div>
                        </fieldset>
                        <fieldset>
                            <legend>Informações Contratuais</legend>
                            <div class="form-grid">
                                <div class="form-group"><label>Email</label><input type="email" name="email" value="${getValue('email')}"></div>
                                <div class="form-group"><label>Telefone</label><input type="tel" name="telefone" value="${getValue('telefone')}"></div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group"><label>Cargo</label><input type="text" name="cargo" value="${getValue('cargo')}"></div>
                                <div class="form-group"><label>Departamento</label><input type="text" name="departamento" value="${getValue('departamento')}"></div>
                            </div>
                            <div class="form-grid-3">
                                <div class="form-group"><label>Data de Admissão</label><input type="date" name="data_admissao" value="${formatDateToInput(getValue('data_admissao'))}"></div>
                                <div class="form-group"><label>Data de Demissão</label><input type="date" name="data_demissao" value="${formatDateToInput(getValue('data_demissao'))}"></div>
                                 <div class="form-group"><label>Salário (R$)</label><input type="number" step="0.01" name="salario" value="${getValue('salario')}"></div>
                            </div>
                             <div class="form-group"><label>Dados Bancários</label><input type="text" name="dados_bancarios" value="${getValue('dados_bancarios')}"></div>
                        </fieldset>
                        <div class="form-actions">
                            <button type="button" class="btn-excluir" id="btnExcluirFuncionario">Excluir</button>
                            <button type="submit" class="btn-salvar">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
                <div class="details-column">
                    <div class="upload-section" style="margin-top:0;">
                        <h4><i class="fas fa-camera"></i> Alterar Foto de Perfil</h4>
                        <form id="formUploadFoto" class="upload-form-inline"><input type="file" name="foto" accept="image/*"><button type="submit" class="btn-upload">Enviar</button></form>
                    </div>
                    <div class="document-section">
                        <h4><i class="fas fa-file-invoice-dollar"></i> Holerites</h4>
                        <ul class="document-list">${holerites.length > 0 ? holerites.map(h => `<li><a href="${h.arquivo_url}" target="_blank">${h.mes_referencia}</a></li>`).join('') : '<li>Nenhum holerite.</li>'}</ul>
                        <form id="formUploadHolerite" class="upload-form-inline"><input type="text" name="mes_referencia" placeholder="Mês (ex: 2025-07)" required><input type="file" name="holerite" accept=".pdf" required><button type="submit" class="btn-upload">Anexar</button></form>
                    </div>
                    <div class="document-section">
                        <h4><i class="fas fa-file-medical"></i> Atestados</h4>
                        <ul class="document-list">${atestados.length > 0 ? atestados.map(a => `<li><a href="${a.arquivo_url}" target="_blank">${formatDateToBR(a.data_atestado)}</a></li>`).join('') : '<li>Nenhum atestado.</li>'}</ul>
                    </div>
                </div>
            </div>`;
    }

    async function fetchAndDisplayEmployeeDetails(id) {
        elements.employeeDetailsContainer.style.display = 'block';
        elements.employeeDetailsContainer.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> A carregar...</h3>`;
        try {
            activeEmployeeId = id;
            elements.searchResults.innerHTML = '';
            elements.searchResults.style.display = 'none';
            
            const [employeeRes, holeritesRes, atestadosRes] = await Promise.all([
                fetchWithAuth(`${API_URL}/funcionarios/${id}`),
                fetchWithAuth(`${API_URL}/funcionarios/${id}/holerites`),
                fetchWithAuth(`${API_URL}/atestados?funcionario_id=${id}`)
            ]);

            if (!employeeRes.ok) throw new Error('Funcionário não encontrado.');
            
            const employee = await employeeRes.json();
            employee.holerites = await holeritesRes.json();
            employee.atestados = await atestadosRes.json();
            
            elements.searchInput.value = employee.nome_completo;
            elements.employeeDetailsContainer.innerHTML = generateDetailsHTML(employee);

            document.getElementById('editEmployeeForm').addEventListener('submit', handleUpdateEmployee);
            document.getElementById('btnExcluirFuncionario').addEventListener('click', handleDeleteEmployee);
            document.getElementById('formUploadFoto').addEventListener('submit', handleUploadDocument);
            document.getElementById('formUploadHolerite').addEventListener('submit', handleUploadDocument);

        } catch (error) {
            console.error('Erro ao buscar detalhes:', error);
            elements.employeeDetailsContainer.innerHTML = `<p style="color: red;">Falha ao carregar detalhes. ${error.message}</p>`;
        }
    }
    
    async function handleUploadDocument(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const docType = form.id.includes('Foto') ? 'foto' : 'holerites';
        
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length === 0) {
            showToast(`Por favor, selecione um ficheiro.`, 'error');
            return;
        }
        
        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios/${activeEmployeeId}/${docType}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `Falha no upload.`);
            }
            
            showToast(`Documento enviado com sucesso!`);
            fetchAndDisplayEmployeeDetails(activeEmployeeId);
            form.reset();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function handleUpdateEmployee(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const updatedData = Object.fromEntries(formData.entries());

        if (!updatedData.data_demissao) {
            updatedData.data_demissao = null;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios/${activeEmployeeId}`, {
                method: 'PUT',
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.message || 'Falha ao atualizar os dados.');
            }
            showToast('Dados do funcionário guardados com sucesso!');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async function handleDeleteEmployee() {
        if (!confirm('Tem a certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.')) return;
        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios/${activeEmployeeId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Falha ao excluir o funcionário.');
            }
            showToast('Funcionário excluído com sucesso!', 'success');
            elements.employeeDetailsContainer.innerHTML = '';
            elements.employeeDetailsContainer.style.display = 'none';
            elements.searchInput.value = '';
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    elements.searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => searchEmployees(elements.searchInput.value), 300);
    });

    elements.searchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if(item && item.dataset.id) {
            fetchAndDisplayEmployeeDetails(item.dataset.id);
        }
    });
    
    if (elements.formNovoFuncionario) {
        elements.formNovoFuncionario.addEventListener('submit', async (event) => {
             event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const funcionarioData = Object.fromEntries(formData.entries());

            if (!funcionarioData.nome_completo || !funcionarioData.email || !funcionarioData.senha || !funcionarioData.cpf) {
                showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }

            try {
                const response = await fetchWithAuth(`${API_URL}/funcionarios`, {
                    method: 'POST',
                    body: JSON.stringify(funcionarioData)
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Falha ao criar funcionário.');
                }
                showToast('Funcionário cadastrado com sucesso!');
                form.reset();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    if (elements.formNovoAviso) {
        elements.formNovoAviso.addEventListener('submit', handleCreateAviso);
    }
    
    if (elements.listaAvisosAdmin) {
        elements.listaAvisosAdmin.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.btn-excluir-aviso');
            if (deleteButton) handleDeleteAviso(deleteButton.dataset.id);
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.parentElement.id === 'ver-meu-portal-link') return;
        if (link.classList.contains('logout')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '/login.html';
            });
            return;
        }
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            document.querySelectorAll('.content-section, .nav-link').forEach(el => el.classList.remove('active'));
            
            document.getElementById(targetId).classList.add('active');
            link.classList.add('active');
            
            if (targetId === 'dashboard-section') initDashboard();
            if (targetId === 'avisos-section') loadAvisosAdmin();
        });
    });
    
    initDashboard(); // Carrega o dashboard por defeito
}

// ===================================================================================
// == PORTAL DO FUNCIONÁRIO
// ===================================================================================
async function initEmployeePage() {
    const localUserData = JSON.parse(localStorage.getItem('userData'));
    if (!localUserData || !localUserData.id) {
        alert("Sessão inválida. Por favor, faça login novamente.");
        window.location.href = '/login.html';
        return;
    }

    // ATUALIZADO: Lógica para exibir link de volta ao admin e redirecionar outros admins
    const specialAdmins = ['antonio.egidio@aluforce.ind.br', 'isa@aluforce.ind.br'];
    if (localUserData.role === 'admin') {
        if (specialAdmins.includes(localUserData.email)) {
            const adminLink = document.getElementById('ir-para-admin-link');
            if (adminLink) {
                adminLink.style.display = 'list-item';
            }
        } else {
            // Redireciona admins que não são especiais para a área de admin
            window.location.href = '/areaadm.html';
            return;
        }
    }
    
    const API_URL = '/api';

    async function loadInitialData() {
        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios/${localUserData.id}`);
            if (!response.ok) throw new Error("Não foi possível carregar os seus dados.");
            
            const employeeData = await response.json();
            populateEmployeeData(employeeData);
            setupEmployeeEventListeners(employeeData);
            loadAvisosFuncionario();
            loadHoleritesDropdown(localUserData.id);
        } catch (error) {
            console.error("Falha ao inicializar página do funcionário:", error);
        }
    }

    async function loadAvisosFuncionario() {
        const listaAvisos = document.querySelector('.announcements ul');
        if (!listaAvisos) return;
        listaAvisos.innerHTML = '<li>A carregar comunicados...</li>';
        try {
            const response = await fetchWithAuth(`${API_URL}/avisos`);
            const avisos = await response.json();

            listaAvisos.innerHTML = avisos.length > 0
                ? avisos.map(aviso => `<li><span>${formatDateToBR(aviso.data_publicacao)}:</span> ${aviso.titulo}</li>`).join('')
                : '<li>Nenhum comunicado recente.</li>';
        } catch (error) {
            listaAvisos.innerHTML = '<li>Não foi possível carregar os comunicados.</li>';
        }
    }
    
    async function loadHoleritesDropdown(userId) {
        const select = document.getElementById('holerite-mes');
        try {
            const response = await fetchWithAuth(`${API_URL}/funcionarios/${userId}/holerites`);
            const holerites = await response.json();
            select.innerHTML = '<option value="">Selecione um mês</option>';
            holerites.forEach(h => {
                const option = document.createElement('option');
                option.value = h.arquivo_url;
                option.textContent = h.mes_referencia;
                select.appendChild(option);
            });
        } catch(e) {
            console.error(e);
        }
    }

    function populateEmployeeData(data) {
        document.getElementById('welcome-message').textContent = `Bem-vindo(a), ${data.nome_completo || 'Funcionário'}`;
        
        const fields = {
            'nome_completo': data.nome_completo,
            'data_nascimento': formatDateToBR(data.data_nascimento),
            'nacionalidade': data.nacionalidade,
            'naturalidade': data.naturalidade,
            'filiacao_mae': data.filiacao_mae,
            'filiacao_pai': data.filiacao_pai,
            'estado_civil': data.estado_civil,
            'dados_conjuge': data.dados_conjuge,
            'cpf': data.cpf,
            'rg': data.rg,
            'titulo_eleitor': data.titulo_eleitor,
            'zona_eleitoral': data.zona_eleitoral,
            'secao_eleitoral': data.secao_eleitoral,
            'ctps_numero': data.ctps_numero,
            'ctps_serie': data.ctps_serie,
            'pis_pasep': data.pis_pasep,
            'cnh_numero': data.cnh_numero,
            'cnh_categoria': data.cnh_categoria,
            'certificado_reservista': data.certificado_reservista,
            'endereco': data.endereco,
            'telefone': data.telefone,
            'email': data.email,
            'dependentes': data.dependentes,
            'data_admissao': formatDateToBR(data.data_admissao),
            'data_demissao': formatDateToBR(data.data_demissao),
            'salario': data.salario ? `R$ ${formatCurrency(data.salario)}` : 'Não informado',
        };

        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element) {
                if(element.tagName === 'INPUT') {
                    element.value = value || '';
                } else {
                    element.textContent = value || 'Não informado';
                }
            }
        }
        
        const bancoSpan = document.getElementById('banco');
        const agenciaSpan = document.getElementById('agencia');
        const contaSpan = document.getElementById('conta_corrente');
        if (data.dados_bancarios && bancoSpan && agenciaSpan && contaSpan) {
            const [banco, agencia, conta] = data.dados_bancarios.split('|').map(s => s.trim());
            bancoSpan.textContent = banco || 'Não informado';
            agenciaSpan.textContent = agencia || '';
            contaSpan.textContent = conta || '';
        } else if (bancoSpan) {
            bancoSpan.textContent = data.dados_bancarios || 'Não informado';
        }
    }

    function setupEmployeeEventListeners(employeeData) {
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            showToast("Logout bem-sucedido!");
            setTimeout(() => window.location.href = '/login.html', 1000);
        });

        document.querySelectorAll('.nav-link:not(#logout-btn), .widget-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('href').substring(1);
                
                document.querySelectorAll('.content-section, .sidebar-nav .nav-link').forEach(el => el.classList.remove('active'));
                
                document.getElementById(targetId).classList.add('active');
                const navLink = document.querySelector(`.sidebar-nav .nav-link[href="#${targetId}"]`);
                if (navLink) navLink.classList.add('active');
            });
        });

        document.getElementById('edit-btn').addEventListener('click', () => {
             ['telefone', 'estado_civil', 'dependentes', 'endereco'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = false;
             });
             document.getElementById('edit-btn').style.display = 'none';
             document.getElementById('save-btn').style.display = 'inline-block';
        });

        document.getElementById('dados-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                telefone: document.getElementById('telefone').value,
                estado_civil: document.getElementById('estado_civil').value,
                dependentes: parseInt(document.getElementById('dependentes').value, 10),
                endereco: document.getElementById('endereco').value,
            };
            try {
                const response = await fetchWithAuth(`${API_URL}/funcionarios/${employeeData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedData)
                });
                if(!response.ok) throw new Error('Falha ao atualizar dados.');
                showToast('Dados atualizados com sucesso!');
                 ['telefone', 'estado_civil', 'dependentes', 'endereco'].forEach(id => {
                     const el = document.getElementById(id);
                    if(el) el.disabled = true;
                 });
                document.getElementById('edit-btn').style.display = 'inline-block';
                document.getElementById('save-btn').style.display = 'none';
            } catch(error) {
                showToast(error.message, 'error');
            }
        });

        document.getElementById('atestado-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const input = form.querySelector('#atestado-file');
            const statusDiv = form.querySelector('#upload-status');

            if(input.files.length === 0) {
                statusDiv.textContent = 'Por favor, selecione um ficheiro.';
                statusDiv.style.color = 'red';
                return;
            }

            const formData = new FormData();
            formData.append('atestado', input.files[0]);
            statusDiv.textContent = 'A enviar...';
            statusDiv.style.color = 'blue';

            try {
                const response = await fetchWithAuth(`${API_URL}/atestados`, {
                    method: 'POST',
                    body: formData
                });
                if(!response.ok) throw new Error('Falha no envio.');
                statusDiv.textContent = 'Atestado enviado com sucesso!';
                statusDiv.style.color = 'green';
                form.reset();
            } catch(error) {
                statusDiv.textContent = `Erro: ${error.message}`;
                statusDiv.style.color = 'red';
            }
        });
        
        document.getElementById('view-holerite').addEventListener('click', () => {
            const select = document.getElementById('holerite-mes');
            const viewer = document.getElementById('holerite-viewer');
            if (select.value) {
                viewer.innerHTML = `<iframe src="${select.value}" style="width:100%; height:600px;" title="Visualizador de Holerite"></iframe>`;
            } else {
                viewer.innerHTML = '<p>Por favor, selecione um mês para visualizar.</p>';
            }
        });
    }

    loadInitialData() }