Aqui está o arquivo atualizado com as seções adicionais sobre tipos de dados, condicionais (`IF NOT EXISTS`) e direcionamento de bancos/schemas:

---

# PostgreSQL: Comandos Básicos e Conceitos Essenciais

Este guia cobre operações básicas no PostgreSQL, tipos de dados, condicionais e boas práticas.

---

## 📋 **1. Tipos de Dados Comuns**
PostgreSQL oferece diversos tipos de dados para diferentes cenários:

### **Tipos Principais:**
| Categoria          | Exemplos                          | Descrição                          |
|---------------------|-----------------------------------|------------------------------------|
| **Numéricos**       | `INT`, `DECIMAL(10,2)`, `SERIAL`  | Números inteiros, decimais e autoincremento. |
| **Texto**           | `VARCHAR(50)`, `TEXT`, `CHAR(10)` | Strings de tamanho fixo ou variável. |
| **Data/Hora**       | `DATE`, `TIME`, `TIMESTAMP`       | Datas, horas e combinações.        |
| **Booleanos**       | `BOOLEAN`                         | Valores `TRUE`/`FALSE`/`NULL`.     |
| **Especiais**       | `UUID`, `JSONB`, `ARRAY`          | Identificadores únicos, dados semiestruturados. |

### **Exemplos Práticos:**
```sql
CREATE TABLE exemplo (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    preco DECIMAL(10,2),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT NOW()
);
```

---

## 📂 **2. Criar Tabelas com Condicionais**
Evite erros ao criar tabelas usando `IF NOT EXISTS`.

### **Sintaxe:**
```sql
CREATE TABLE IF NOT EXISTS nome_tabela (...);
```

### **Exemplo:**
```sql
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL
);
```

---

## 🗃️ **3. Direcionamento para Bancos e Schemas**
### **a) Criar Tabela em um Banco Específico**
Conecte-se ao banco de dados desejado antes de criar a tabela:
```bash
# Via terminal
psql -d nome_do_banco

# Dentro do psql
\c nome_do_banco
```

### **b) Usar Schemas**
Schemas são "namespaces" para organizar tabelas:
```sql
-- Criar schema
CREATE SCHEMA IF NOT EXISTS vendas;

-- Criar tabela no schema
CREATE TABLE vendas.pedidos (
    id SERIAL PRIMARY KEY,
    total DECIMAL(10,2)
);
```

---

## ➕ **4. Inserir Dados (`INSERT`)**
```sql
INSERT INTO clientes (nome, email)
VALUES ('Maria', 'maria@email.com');
```

---

## 🔍 **5. Consultar Dados (`SELECT`)**
```sql
SELECT * FROM clientes WHERE ativo = TRUE;
```

---

## ✏️ **6. Atualizar Dados (`UPDATE`)**
```sql
UPDATE clientes SET ativo = FALSE WHERE id = 5;
```

---

## 🗑️ **7. Excluir Dados (`DELETE`)**
```sql
DELETE FROM clientes WHERE data_criacao < '2020-01-01';
```

---

## 🛠️ **8. Gerenciamento de Bancos de Dados**
### **Criar Banco com Condicional**
```sql
CREATE DATABASE IF NOT EXISTS meu_banco;
```

### **Excluir Banco com Segurança**
```sql
DROP DATABASE IF EXISTS banco_obsoleto;
```

---

## 🧩 **Exemplo Completo**
```sql
-- Criar banco (se não existir)
CREATE DATABASE IF NOT EXISTS ecommerce;

-- Conectar ao banco
\c ecommerce

-- Criar schema
CREATE SCHEMA IF NOT EXISTS loja;

-- Criar tabela com tipos específicos
CREATE TABLE IF NOT EXISTS loja.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    preco DECIMAL(10,2) CHECK (preco > 0),
    estoque INT DEFAULT 0
);

-- Inserir dados
INSERT INTO loja.produtos (nome, preco)
VALUES ('Mouse Gamer', 299.90);
```

---

## 📌 **Dicas de Segurança**
1. **Evite DROP sem `IF EXISTS`:**  
   Sempre use condicionais para evitar exclusões acidentais.
   ```sql
   DROP TABLE IF EXISTS tabela_teste;
   ```

2. **Use Schemas:**  
   Organize tabelas em schemas para ambientes complexos.

3. **Validação de Dados:**  
   Adicione restrições (`CHECK`, `NOT NULL`) para garantir integridade.

---

## 🔗 **Documentação Útil**
- [Tipos de Dados](https://www.postgresql.org/docs/current/datatype.html)
- [Condicionais](https://www.postgresql.org/docs/current/sql-createtable.html)

---

Este guia combina conceitos básicos e recursos avançados para um uso eficiente do PostgreSQL! 🐘🚀