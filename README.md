# Portal RH Aluforce

## 1. Descrição

O **Portal RH Aluforce** é uma aplicação web completa desenvolvida para modernizar e centralizar a gestão de recursos humanos. O sistema oferece duas interfaces distintas:

* **Portal do Funcionário:** Uma área onde os colaboradores podem aceder aos seus dados pessoais, visualizar holerites, enviar atestados e gerir as suas informações de forma autónoma e segura.
* **Painel Administrativo:** Uma plataforma robusta para o departamento de RH e T.I., permitindo o cadastro completo de novos funcionários, a gestão de dados, o upload de documentos (fotos, holerites) e a visualização de atestados enviados pelos colaboradores.

A aplicação foi construída com um backend em **Node.js + Express** e um frontend em **HTML, CSS e JavaScript puro**, ligando-se a uma base de dados **MySQL** para garantir a persistência e a segurança dos dados.

## 2. Funcionalidades

### Painel Administrativo (RH / T.I)
- **Autenticação Segura:** Sistema de login que diferencia administradores de funcionários com base nos cargos definidos.
- **Dashboard de Funcionários:** Visualização de todos os funcionários cadastrados com as suas informações principais (ID, Foto, Nome, Cargo, Email).
- **Cadastro Completo:** Formulário detalhado para registar novos colaboradores, incluindo dados pessoais, documentos, informações de contacto e de acesso.
- **Gestão de Detalhes:** Pop-up (modal) para visualizar todos os dados de um funcionário específico.
- **Upload de Fotos:** Funcionalidade para adicionar ou alterar a foto de perfil de qualquer colaborador.
- **Gestão de Holerites:** Ferramenta para anexar os holerites mensais (em PDF) para cada funcionário.
- **Visualização de Atestados:** Acesso à lista de atestados médicos enviados pelos funcionários, com links diretos para os ficheiros.
- **Layout Responsivo:** A interface adapta-se a diferentes tamanhos de ecrã, funcionando bem em computadores, tablets e telemóveis.

### Portal do Funcionário
- **Login Individual:** Cada funcionário acede ao sistema com o seu email e senha únicos.
- **Dashboard Pessoal:** Mensagem de boas-vindas personalizada e acesso rápido às principais funcionalidades.
- **Consulta de Dados:** Visualização de todos os seus dados cadastrais.
- **Edição de Dados:** Permissão para atualizar informações de contacto (telefone, estado civil, etc.), que são guardadas diretamente na base de dados.
- **Visualização de Holerites:** Acesso ao histórico de holerites, com a possibilidade de selecionar o mês e visualizar o documento PDF no próprio portal.
- **Envio de Atestados:** Ferramenta para anexar e enviar atestados médicos diretamente para o RH.

## 3. Tecnologias Utilizadas

* **Backend:** Node.js, Express.js
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Base de Dados:** MySQL
* **Gestão de Uploads:** Multer

## 4. Pré-requisitos

Antes de começar, garanta que tem os seguintes softwares instalados na sua máquina:
* [Node.js](https://nodejs.org/) (versão LTS recomendada)
* Um servidor de base de dados MySQL (como o XAMPP, WAMP, MySQL Community Server, etc.)

## 5. Instalação e Execução

Siga estes passos para configurar e executar o projeto localmente:

**1. Configurar a Base de Dados:**
   - Abra a sua ferramenta de gestão de base de dados (DBeaver, MySQL Workbench, phpMyAdmin, etc.).
   - Execute o `script_sql_final.sql` para criar a base de dados `rh_portal`, as tabelas `funcionarios`, `atestados` e `holerites`, e para popular o sistema com os utilizadores iniciais.

**2. Configurar o Servidor (Backend):**
   - Navegue para a pasta do projeto (ex: `RH/`).
   - Abra o ficheiro `server.js`.
   - Verifique se as credenciais de ligação à base de dados estão corretas:
     ```javascript
     const db = mysql.createConnection({
         host: 'localhost',
         user: 'root',
         password: '@dminalu', // <-- Altere se a sua senha for diferente
         database: 'rh_portal',
         port: 3306
     });
     ```

**3. Instalar as Dependências:**
   - Abra um terminal na pasta do projeto (`RH/`).
   - Execute o seguinte comando para instalar todas as bibliotecas necessárias (Express, Multer, etc.):
     ```bash
     npm install
     ```

**4. Iniciar o Servidor:**
   - No mesmo terminal, execute o comando:
     ```bash
     node server.js
     ```
   - Se tudo estiver correto, verá a mensagem: `Ligado com sucesso à base de dados MySQL "rh_portal".` e `Servidor a correr! Aceda à aplicação em http://localhost:3000`.

**5. Aceder à Aplicação:**
   - Abra o seu navegador e aceda a **http://localhost:3000**.
   - A página de login será exibida.

## 6. Como Utilizar

### Acessos de Teste

**Administradores:**
* **Email:** `ti@aluforce.ind.br` / **Senha:** `1910`
* **Email:** `isabella.oliveira@aluforce.ind.br` / **Senha:** `IO123`

**Funcionários:**
* **Email:** `ariel.silva@aluforce.ind.br` / **Senha:** `AS123`
* **Email:** `clemerson.leandro@aluforce.ind.br` / **Senha:** `CL123`

### Estrutura de Ficheiros

* `/public`: Contém todos os ficheiros do frontend (HTML, CSS, JS do cliente e imagens).
    * `/public/uploads/fotos`: Onde as fotos de perfil dos funcionários são guardadas.
    * `/public/uploads/atestados`: Onde os atestados enviados são guardados.
    * `/public/uploads/holerites`: Onde os holerites enviados pelo RH são guardados.
* `server.js`: O ficheiro principal do backend, que controla todas as rotas da API e a lógica de negócio.
* `script_sql_final.sql`: O script para configurar a base de dados.
* `package.json`: Lista todas as dependências do projeto.