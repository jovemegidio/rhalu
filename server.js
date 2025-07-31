// server.js (VERSÃO FINAL COM TODOS OS CAMPOS E LÓGICA DE UPDATE COMPLETA)

const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// --- CONFIGURAÇÕES GERAIS ---
const app = express();
const PORT = 3000;
const JWT_SECRET = 'grupolaboreletric';
const adminRoles = ['Analista de T.I', 'RH', 'Financeiro', 'Diretoria'];

// --- CONFIGURAÇÃO DA LIGAÇÃO À BASE DE DADOS ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '@dminalu',
    database: 'rh_portal',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true // Garante que datas venham como strings
});

// --- CONFIGURAÇÃO DO UPLOAD DE ARQUIVOS ---
const createStorage = (folder) => {
    const uploadPath = path.join(__dirname, `public/uploads/${folder}`);
    fs.mkdirSync(uploadPath, { recursive: true });
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadPath),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileExtension = path.extname(file.originalname);
            const baseName = folder.slice(0, -1);
            const userId = req.params.id || req.user.id;
            cb(null, `${baseName}-${userId}-${uniqueSuffix}${fileExtension}`);
        }
    });
};
const uploadFoto = multer({ storage: createStorage('fotos') });
const uploadAtestado = multer({ storage: createStorage('atestados') });
const uploadHolerite = multer({ storage: createStorage('holerites') });

// --- MIDDLEWARES GLOBAIS ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// --- ROTAS PÚBLICAS ---
// =========================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

        const [results] = await db.query("SELECT * FROM funcionarios WHERE email = ?", [email]);
        if (results.length === 0) return res.status(401).json({ message: 'Credenciais inválidas.' });

        const usuario = results[0];
        if (usuario.status !== 'Ativo') return res.status(401).json({ message: 'Usuário inativo.' });

        if (password !== usuario.senha) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        const isAdmin = adminRoles.includes(usuario.cargo);
        const accessRole = isAdmin ? 'admin' : 'funcionario';
        // ATUALIZADO: Adicionado email ao token para verificação no frontend
        const token = jwt.sign({ id: usuario.id, role: accessRole, email: usuario.email }, JWT_SECRET, { expiresIn: '8h' });

        delete usuario.senha;
        res.json({ message: 'Login bem-sucedido!', token, userData: { ...usuario, role: accessRole } });
    } catch (dbError) {
        console.error("Erro na rota de login:", dbError);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// --- MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO ---
const protectRoute = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Requer permissão de administrador.' });
    }
    next();
};

app.use('/api', protectRoute);

// =========================================================================
// --- ROTAS PROTEGIDAS DA API ---
// =========================================================================

// --- ROTA DO DASHBOARD ---
app.get('/api/dashboard', isAdmin, async (req, res) => {
    try {
        const [stats] = await db.query("SELECT COUNT(*) as totalFuncionarios FROM funcionarios WHERE status = 'Ativo'");
        const [aniversariantes] = await db.query("SELECT nome_completo, data_nascimento FROM funcionarios WHERE MONTH(data_nascimento) = MONTH(CURDATE()) AND status = 'Ativo' ORDER BY DAY(data_nascimento)");
        res.json({ stats: stats[0], aniversariantes });
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar dados do dashboard." });
    }
});

// --- AVISOS ---
app.get('/api/avisos', async (req, res) => {
    const [avisos] = await db.query("SELECT id, titulo, conteudo, DATE_FORMAT(data_publicacao, '%Y-%m-%d') as data_publicacao FROM avisos ORDER BY data_publicacao DESC");
    res.json(avisos);
});
app.post('/api/avisos', isAdmin, async (req, res) => {
    const { titulo, conteudo } = req.body;
    await db.query("INSERT INTO avisos (titulo, conteudo) VALUES (?, ?)", [titulo, conteudo]);
    res.status(201).json({ message: "Aviso criado com sucesso!" });
});
app.delete('/api/avisos/:id', isAdmin, async (req, res) => {
    await db.query("DELETE FROM avisos WHERE id = ?", [req.params.id]);
    res.json({ message: "Aviso deletado com sucesso!" });
});

// --- FUNCIONÁRIOS ---
app.get('/api/funcionarios', isAdmin, async (req, res) => {
    const searchTerm = req.query.search || '';
    const query = `
        SELECT id, nome_completo, email, cargo, departamento, status 
        FROM funcionarios 
        WHERE nome_completo LIKE ? 
        ORDER BY nome_completo ASC
    `;
    const [funcionarios] = await db.query(query, [`%${searchTerm}%`]);
    res.json(funcionarios);
});

// ATUALIZADO: Rota de criação de funcionário com todos os campos
app.post('/api/funcionarios', isAdmin, async (req, res) => {
    try {
        const {
            nome_completo, email, senha, cargo, departamento, data_admissao,
            cpf, rg, data_nascimento, endereco, telefone, ctps, pis_pasep,
            titulo_eleitor, certificado_reservista, cnh, registro_profissional,
            dados_bancarios, salario
        } = req.body;
        
        const sql = `
            INSERT INTO funcionarios (
                nome_completo, email, senha, cargo, departamento, data_admissao,
                cpf, rg, data_nascimento, endereco, telefone, ctps_numero, pis_pasep,
                titulo_eleitor, certificado_reservista, cnh_numero, registro_profissional,
                dados_bancarios, salario, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo')
        `;
        
        await db.query(sql, [
            nome_completo, email, senha, cargo, departamento, data_admissao,
            cpf, rg, data_nascimento, endereco, telefone, ctps, pis_pasep,
            titulo_eleitor, certificado_reservista, cnh, registro_profissional,
            dados_bancarios, salario
        ]);
        
        res.status(201).json({ message: 'Funcionário criado com sucesso!' });
    } catch (error) {
        console.error("Erro ao criar funcionário:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Erro: Email ou CPF já cadastrado.' });
        }
        res.status(500).json({ message: 'Erro ao criar funcionário.', error: error.message });
    }
});


app.get('/api/funcionarios/:id', async (req, res) => {
    const requestedId = parseInt(req.params.id, 10);
    if (req.user.role !== 'admin' && req.user.id !== requestedId) {
        return res.status(403).json({ message: "Acesso negado." });
    }
    const [results] = await db.query("SELECT * FROM funcionarios WHERE id = ?", [requestedId]);
    if (results.length === 0) return res.status(404).json({ message: "Funcionário não encontrado." });
    
    const funcionario = results[0];
    delete funcionario.senha;
    res.json(funcionario);
});

// ATUALIZADO: Rota de atualização com todos os campos do formulário
app.put('/api/funcionarios/:id', async (req, res) => {
    const requestedId = parseInt(req.params.id, 10);
    if (req.user.role !== 'admin' && req.user.id !== requestedId) {
        return res.status(403).json({ message: "Acesso negado." });
    }
    
    try {
        if (req.user.role === 'admin') {
            // Lógica completa para o admin atualizar qualquer campo
            const fields = [
                'nome_completo', 'email', 'cargo', 'departamento', 'data_nascimento', 'cpf', 'rg', 
                'telefone', 'estado_civil', 'dados_conjuge', 'nacionalidade', 'naturalidade', 
                'filiacao_mae', 'filiacao_pai', 'endereco', 'dependentes', 'titulo_eleitor', 
                'zona_eleitoral', 'secao_eleitoral', 'ctps_numero', 'ctps_serie', 'pis_pasep', 
                'cnh_numero', 'cnh_categoria', 'certificado_reservista', 'data_admissao', 
                'data_demissao', 'salario', 'dados_bancarios'
            ];
            
            const setClauses = [];
            const values = [];
            
            for (const field of fields) {
                if (req.body[field] !== undefined) {
                    setClauses.push(`${field} = ?`);
                    values.push(req.body[field]);
                }
            }

            if (setClauses.length === 0) {
                return res.status(400).json({ message: "Nenhum dado para atualizar." });
            }

            values.push(requestedId);
            const sql = `UPDATE funcionarios SET ${setClauses.join(', ')} WHERE id = ?`;
            
            await db.query(sql, values);

        } else {
            // Lógica para o próprio funcionário atualizar apenas campos permitidos
            const { telefone, estado_civil, dependentes, endereco } = req.body;
            await db.query("UPDATE funcionarios SET telefone = ?, estado_civil = ?, dependentes = ?, endereco = ? WHERE id = ?", [telefone, estado_civil, dependentes, endereco, requestedId]);
        }
        res.json({ message: "Dados do funcionário atualizados com sucesso." });

    } catch (error) {
        console.error("Erro ao atualizar funcionário:", error);
        res.status(500).json({ message: "Erro interno ao atualizar dados." });
    }
});


app.delete('/api/funcionarios/:id', isAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM holerites WHERE funcionario_id = ?", [req.params.id]);
        await db.query("DELETE FROM atestados WHERE funcionario_id = ?", [req.params.id]);
        await db.query("DELETE FROM funcionarios WHERE id = ?", [req.params.id]);
        res.json({ message: "Funcionário e todos os seus registos foram excluídos com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir funcionário.', error: error.message });
    }
});

// --- DOCUMENTOS ---
app.post('/api/funcionarios/:id/foto', isAdmin, uploadFoto.single('foto'), async (req, res) => {
    const filePath = `/uploads/fotos/${req.file.filename}`;
    await db.query("UPDATE funcionarios SET foto_perfil_url = ? WHERE id = ?", [filePath, req.params.id]);
    res.json({ message: "Foto de perfil atualizada!", filePath });
});

app.post('/api/funcionarios/:id/holerites', isAdmin, uploadHolerite.single('holerite'), async (req, res) => {
    const { mes_referencia } = req.body;
    const filePath = `/uploads/holerites/${req.file.filename}`;
    await db.query("INSERT INTO holerites (funcionario_id, mes_referencia, arquivo_url) VALUES (?, ?, ?)", [req.params.id, mes_referencia, filePath]);
    res.status(201).json({ message: "Holerite enviado com sucesso!" });
});

app.post('/api/atestados', uploadAtestado.single('atestado'), async (req, res) => {
    const { data_atestado, dias_afastado, motivo } = req.body;
    const filePath = `/uploads/atestados/${req.file.filename}`;
    await db.query("INSERT INTO atestados (funcionario_id, data_atestado, dias_afastado, motivo, arquivo_url) VALUES (?, ?, ?, ?, ?)", [req.user.id, data_atestado || new Date(), dias_afastado || 0, motivo || '', filePath]);
    res.status(201).json({ message: "Atestado enviado com sucesso!" });
});

app.get('/api/funcionarios/:id/holerites', async (req, res) => {
    const requestedId = parseInt(req.params.id, 10);
     if (req.user.role !== 'admin' && req.user.id !== requestedId) {
        return res.status(403).json({ message: "Acesso negado." });
    }
    const [holerites] = await db.query("SELECT * FROM holerites WHERE funcionario_id = ? ORDER BY mes_referencia DESC", [req.params.id]);
    res.json(holerites);
});

app.get('/api/atestados', isAdmin, async (req, res) => {
    const { funcionario_id } = req.query;
    let sql = `SELECT a.*, f.nome_completo FROM atestados a JOIN funcionarios f ON a.funcionario_id = f.id`;
    const params = [];
    if (funcionario_id) {
        sql += ` WHERE a.funcionario_id = ?`;
        params.push(funcionario_id);
    }
    sql += ` ORDER BY a.data_atestado DESC`;
    const [atestados] = await db.query(sql, params);
    res.json(atestados);
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`\n🚀 SERVIDOR PRONTO! Acesse em http://localhost:${PORT}`);
});
