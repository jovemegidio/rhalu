const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const multer = require('multer'); // Importa o multer para upload de ficheiros
const fs = require('fs'); // Módulo para interagir com o sistema de ficheiros

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÃO DA LIGAÇÃO À BASE DE DADOS ---
const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: '@dminalu', database: 'rh_portal', port: 3306
});
db.connect((err) => {
    if (err) { console.error('ERRO AO LIGAR-SE À BASE DE DADOS:', err); process.exit(1); }
    console.log('Ligado com sucesso à base de dados MySQL "rh_portal".');
});

// --- CONFIGURAÇÃO DO UPLOAD DE FICHEIROS (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public/uploads/fotos');
        fs.mkdirSync(uploadPath, { recursive: true }); // Cria a pasta se ela não existir
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Renomeia o ficheiro para evitar duplicados: funcionario-ID-timestamp.extensao
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `funcionario-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// --- LISTA DE CARGOS DE ADMIN ---
const adminRoles = ['Analista de T.I', 'RH', 'Financeiro', 'Diretoria'];

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve a pasta public

// --- ROTAS DA API ---

// Rota de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM funcionarios WHERE email = ? AND senha = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        
        const usuario = results[0];
        if (usuario) {
            const isAdmin = adminRoles.includes(usuario.role);
            const accessRole = isAdmin ? 'admin' : 'funcionario';
            const userDataForFrontend = { ...usuario, role: accessRole };
            res.json({ message: 'Login bem-sucedido!', token: `fake-token-for-${usuario.id}`, userData: userDataForFrontend });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    });
});

// Rota para CADASTRAR um novo funcionário
app.post('/api/funcionarios', (req, res) => {
    const dados = req.body;
    const sql = `INSERT INTO funcionarios (
        email, senha, role, nome_completo, data_nascimento, nacionalidade, naturalidade,
        filiacao_mae, filiacao_pai, estado_civil, dados_conjuge, cpf, rg,
        titulo_eleitor, zona_eleitoral, secao_eleitoral, ctps_numero, ctps_serie,
        pis_pasep, cnh_numero, cnh_categoria, certificado_reservista
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        dados.email, dados.senha, dados.role, dados.nome_completo, dados.data_nascimento || null,
        dados.nacionalidade, dados.naturalidade, dados.filiacao_mae, dados.filiacao_pai,
        dados.estado_civil, dados.dados_conjuge, dados.cpf, dados.rg, dados.titulo_eleitor,
        dados.zona_eleitoral, dados.secao_eleitoral, dados.ctps_numero, dados.ctps_serie,
        dados.pis_pasep, dados.cnh_numero, dados.cnh_categoria, dados.certificado_reservista
    ];

    db.query(sql, params, (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "Erro: Email ou CPF já cadastrado." });
            return res.status(500).json({ message: "Erro interno no servidor ao tentar cadastrar." });
        }
        res.status(201).json({ message: "Funcionário cadastrado com sucesso!", id: results.insertId });
    });
});

// Rota para UPLOAD DE FOTO
app.post('/api/funcionarios/:id/foto', upload.single('foto'), (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: "Nenhum ficheiro foi enviado." });

    const fotoUrl = `/uploads/fotos/${req.file.filename}`;
    const sql = "UPDATE funcionarios SET foto_url = ? WHERE id = ?";

    db.query(sql, [fotoUrl, id], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro ao guardar a foto." });
        if (results.affectedRows === 0) return res.status(404).json({ message: "Funcionário não encontrado." });
        res.json({ message: "Foto atualizada com sucesso!", foto_url: fotoUrl });
    });
});

// Rota para buscar TODOS os funcionários (para a página de admin)
app.get('/api/funcionarios', (req, res) => {
    const sql = "SELECT id, foto_url, nome_completo AS nome, role AS cargo, email FROM funcionarios";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        res.json(results);
    });
});

// Rota para buscar UM funcionário por ID
app.get('/api/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM funcionarios WHERE id = ?";
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        if (results.length === 0) return res.status(404).json({ message: "Funcionário não encontrado." });
        const { senha, ...dadosSeguros } = results[0];
        res.json(dadosSeguros);
    });
});

// Rota para ATUALIZAR dados do funcionário
app.put('/api/funcionarios/:id', (req, res) => {
    const { id } = req.params;
    const { telefone, estado_civil, dependentes } = req.body;
    const sql = "UPDATE funcionarios SET telefone = ?, estado_civil = ?, dependentes = ? WHERE id = ?";
    db.query(sql, [telefone, estado_civil, dependentes, id], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro ao atualizar os dados." });
        if (results.affectedRows === 0) return res.status(404).json({ message: "Funcionário não encontrado." });
        res.json({ message: "Dados atualizados com sucesso!", updatedData: { telefone, estado_civil, dependentes }});
    });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor a correr! Aceda à aplicação em http://localhost:${PORT}`);
});
