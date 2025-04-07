# Hash de Senhas em JavaScript

Proteger senhas é uma parte crítica do desenvolvimento de aplicações seguras. Este documento explica os conceitos essenciais e práticas recomendadas para implementar hash de senhas em JavaScript.

## **Por que usar Hash para Senhas?**
- **Segurança**: Evita o armazenamento de senhas em texto puro.
- **Privacidade**: Minimiza os danos em caso de vazamento de dados.
- **Proteção contra Ataques**: Mitiga riscos de ataques como *rainbow tables* e força bruta.

---

## **Hashing vs. Encryption**
| **Hashing**               | **Encryption**               |
|---------------------------|------------------------------|
| Unidirecional (não reversível) | Bidirecional (reversível com chave) |
| Ideal para armazenar senhas | Usado para dados sensíveis que precisam ser recuperados |
| Exemplo: bcrypt, SHA-256   | Exemplo: AES, RSA             |

---

## **Algoritmos Recomendados**
1. **bcrypt**: 
   - Projetado especificamente para senhas.
   - Inclui *salt* automático e custo ajustável.
2. **scrypt**:
   - Resistente a ataques de hardware customizado (ASIC/GPU).
3. **Argon2**:
   - Vencedor do *Password Hashing Competition* (2015).
   - Recomendado para novas implementações.

⚠️ **Evite**: MD5, SHA-1 ou SHA-256 para senhas (são rápidos e vulneráveis a brute-force).

---

## **Boas Práticas**
1. **Use Salt Aleatório**:
   - Gere um salt único para cada senha (evita ataques de tabelas pré-computadas).
2. **Ajuste o Custo (Work Factor)**:
   - Aumente o custo do hash para tornar ataques mais lentos (ex: `bcrypt` com `cost=12`).
3. **Nunca Armazene Senhas em Texto Puro**.
4. **Atualize Algoritmos Regularmente** conforme a evolução da segurança.

---

## **Exemplo Prático com bcrypt (Node.js)**
### Instalação
```bash
npm install bcrypt
```

### Hash de Senha (Async/Await)
```javascript
const bcrypt = require('bcrypt');
const saltRounds = 12;

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash; // Ex: $2b$12$4Q2B3Z5pXU0eKjVx5cY9LO...
  } catch (err) {
    console.error('Erro ao gerar hash:', err);
  }
}
```

### Verificação de Senha
```javascript
async function checkPassword(password, hash) {
  try {
    const match = await bcrypt.compare(password, hash);
    return match; // true ou false
  } catch (err) {
    console.error('Erro na verificação:', err);
    return false;
  }
}
```

---

## **Bibliotecas Alternativas**
| Biblioteca      | Algoritmo | Instalação           |
|-----------------|-----------|----------------------|
| `bcrypt.js`     | bcrypt    | `npm install bcryptjs` |
| `scrypt-js`     | scrypt    | `npm install scrypt-js` |
| `argon2`        | Argon2    | `npm install argon2` |

---

## **Considerações de Segurança**
- **Proteja o Salt**: Armazene o salt junto ao hash (não é um segredo).
- **HTTPS**: Sempre use HTTPS para transmitir senhas.
- **Erros Genéricos**: Evite mensagens detalhadas em falhas de login (ex: "Credenciais inválidas").

---

## **Conclusão**
Implementar hash de senhas corretamente é vital para a segurança de usuários. Utilize algoritmos modernos como bcrypt ou Argon2, ajuste parâmetros de custo e siga as práticas recomendadas para mitigar riscos.

📚 **Recursos**:
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
