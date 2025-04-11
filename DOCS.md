# 📚 Documentação do Projeto

Este documento detalha o funcionamento do projeto, incluindo a configuração, endpoints disponíveis, e exemplos de uso. Para testar os endpoints, você pode acessar o workspace do Postman no link abaixo:

🔗 [Workspace do Postman](https://yyaxisperfect.postman.co/workspace/Yyax-IsPerfect's-Workspace~6deefc71-4f34-47f3-8e6b-281e72bb27fb)

---

## 🛠️ **Configuração do Ambiente**

### **1. Dependências**
Certifique-se de instalar as dependências do projeto antes de iniciar o servidor. Use o comando abaixo:

```bash
npm install
```

### **2. Variáveis de Ambiente**
O arquivo `.env` contém as configurações sensíveis do projeto. Certifique-se de configurar corretamente as variáveis:

```plaintext
# Configurações do Servidor
PORT=3001

# Configurações do PostgreSQL
PGSQL_HOST=localhost
PG_PORT=5432
PGSQL_USER=superyyax
PGSQL_PASS=superyyax
PGSQL_DB_DESAFIOS_BACK_04_04_25=desafio-back-04-04-25

# Configurações de Hash
HASH_SALT=13
```

### **3. Inicialização**
Para rodar o servidor em modo de desenvolvimento, utilize:

```bash
npm run dev
```

Para rodar o servidor em modo de produção:

```bash
npm run run
```

---

## 📂 **Estrutura do Projeto**

- **`server.js`**: Arquivo principal que inicializa o servidor e define os endpoints.
- **`db.js`**: Configuração e conexão com o banco de dados PostgreSQL.
- **`.env`**: Configurações sensíveis do ambiente.
- **`package.json`**: Gerenciamento de dependências e scripts.
- **`como usar pg.md`**: Guia de comandos básicos do PostgreSQL.
- **`como usar hashs.md`**: Guia sobre hash de senhas em JavaScript.

---

## 📋 **Endpoints Disponíveis**

### **1. Cadastro de Usuário**
**Rota**: `/api/sign-up`  
**Método**: `POST`  
**Descrição**: Cadastra um novo mago no sistema.  

**Body**:
```json
{
  "username": "NomeDoUsuario",
  "userpass": "SenhaDoUsuario"
}
```

**Resposta**:
```json
{
  "status": 201,
  "success": true,
  "message": "Mago cadastrado, UID: 1"
}
```

---

### **2. Login de Usuário**
**Rota**: `/api/sign-in`  
**Método**: `POST`  
**Descrição**: Realiza o login de um mago.  

**Body**:
```json
{
  "uName": "NomeDoUsuario",
  "uPass": "SenhaDoUsuario"
}
```

**Resposta**:
```json
{
  "status": 200,
  "success": true,
  "message": "User sucessfuly loged in"
}
```

---

### **3. Buscar Jogador**
**Rota**: `/api/search-player`  
**Método**: `GET`  
**Descrição**: Retorna informações detalhadas de um jogador.  

**Query Params**:
- `uname`: Nome do jogador a ser buscado.
- `cl`: Nível do jogador que está realizando a busca.

**Resposta**:
```json
{
  "UID": 1,
  "UserName": "NomeDoUsuario",
  "Power": 100,
  "Itens": [1, 2, 3],
  "Posição": "Iniciante",
  "Jail": "Livre",
  "LastItemID": 3,
  "RandomInt": 2
}
```

---

### **4. Inserir Item**
**Rota**: `/api/insert-item`  
**Método**: `POST`  
**Descrição**: Insere um novo item no inventário de um jogador.  

**Body**:
```json
{
  "playerID": 1,
  "ItemName": "Espada Mágica",
  "Category": 1,
  "Risk": 2,
  "AcessLevel": 3,
  "Power": 50,
  "ItemLore": "Uma espada lendária.",
  "ItemDescription": "Forjada pelos deuses."
}
```

**Resposta**:
```json
{
  "status": 201,
  "success": true,
  "message": "A inserção foi um sucesso, o poder do player e os itens dele já foram atualizados",
  "others": {
    "ItemID": 4
  }
}
```

---

### **5. Buscar Item**
**Rota**: `/api/search-item`  
**Método**: `GET`  
**Descrição**: Retorna informações detalhadas de um item.  

**Query Params**:
- `iid`: ID do item a ser buscado.

**Resposta**:
```json
{
  "ID": 4,
  "Name": "Espada Mágica",
  "Category": "Armamento",
  "Risk": "Querubins",
  "AcessLevel": 3,
  "Power": 50,
  "Data": {
    "Lore": "Uma espada lendária.",
    "Description": "Forjada pelos deuses."
  }
}
```

---

### **6. Usar Tomo**
**Rota**: `/api/tomo`  
**Método**: `POST`  
**Descrição**: Executa um feitiço de um tomo mágico.  

**Body**:
```json
{
  "spellName": "Ego coniecto",
  "spellTarget": "Guardian",
  "spellCaller": 1
}
```

**Resposta**:
```json
{
  "status": 200,
  "success": true,
  "message": "Sucessfully Ego coniecto",
  "others": {
    "secret": "19.1.16.9.5.14.20.9.1"
  }
}
```

---

### **7. Buscar Cofres**
**Rota**: `/api/find-vaults`  
**Método**: `GET`  
**Descrição**: Retorna IDs de cofres disponíveis.  

**Query Params**:
- `n`: Número de cofres a serem retornados.

**Resposta**:
```json
{
  "status": 200,
  "success": true,
  "message": "A seguir, os VIDs requisitados",
  "others": [1, 2, 3]
}
```

---

### **8. Abrir Cofre**
**Rota**: `/api/guardian-quest`  
**Método**: `GET`  
**Descrição**: Abre um cofre após resolver o desafio do Guardião.  

**Query Params**:
- `PId`: ID do jogador.
- `VId`: ID do cofre.
- `SSBPlayer`: Palavra secreta enviada pelo jogador.

**Resposta**:
```json
{
  "status": 200,
  "success": true,
  "message": "O cofre 1 foi aberto com sucesso pelo player de ID 1",
  "others": {
    "newItensAdded": [4, 5],
    "playerId": 1
  }
}
```

---

### **9. Roubar Item**
**Rota**: `/api/steal-item`  
**Método**: `POST`  
**Descrição**: Permite que um jogador roube um item de outro jogador.  

**Body**:
```json
{
  "targetID": 2,
  "callerID": 1,
  "itemID": 4
}
```

**Resposta**:
```json
{
  "status": 200,
  "success": true,
  "message": "O item foi furtado com sucesso"
}
```

---

## 🧩 **Considerações Finais**

Este projeto combina conceitos avançados de segurança, como hashing de senhas e organização de dados em schemas, com funcionalidades criativas para um sistema de RPG. Utilize os endpoints com responsabilidade e siga as boas práticas descritas nos guias anexos.

Para dúvidas ou sugestões, entre em contato com o desenvolvedor. 🚀