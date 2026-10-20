// =====================================================================
// CRIPTOGRAFIA DOS DADOS
// Gera dados.enc (versão criptografada de dados.js), que é o único arquivo
// de dados publicado no GitHub. O dados.js fica só no seu computador.
//
// Uso, a cada lançamento mensal:  node criptografar.js
//
// Mesma senha de antes  -> mantém o "sal", e quem marcou "lembrar neste
//                          computador" continua com acesso sem digitar de novo.
// Senha nova            -> todos precisam digitar a nova senha (é assim que
//                          se revoga o acesso de alguém).
// =====================================================================

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { subtle } = globalThis.crypto;
const ITERACOES = 600000; // PBKDF2-SHA256, recomendação OWASP
const SENHA_MINIMA = 12;
const ARQ_DADOS = path.join(__dirname, "dados.js");
const ARQ_CRIPTO = path.join(__dirname, "dados.enc");

// ============== LEITURA DO TERMINAL (senha sem eco) ==============
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
});
let mudo = false;
rl._writeToOutput = (s) => {
  if (!mudo) rl.output.write(s);
};
const linhas = rl[Symbol.asyncIterator]();

async function perguntar(texto, oculto = false) {
  process.stdout.write(texto);
  mudo = oculto;
  const { value } = await linhas.next();
  mudo = false;
  if (oculto) process.stdout.write("\n");
  return value ?? "";
}

// ============== CRIPTOGRAFIA (mesmo algoritmo de desbloquear.js) ==============
const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const deB64 = (texto) => new Uint8Array(Buffer.from(texto, "base64"));

async function derivarChave(senha, sal) {
  const base = await subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: ITERACOES, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function senhaConfere(senha, atual) {
  try {
    const chave = await derivarChave(senha, deB64(atual.sal));
    await subtle.decrypt({ name: "AES-GCM", iv: deB64(atual.iv) }, chave, deB64(atual.dados));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!fs.existsSync(ARQ_DADOS)) throw new Error("dados.js não encontrado nesta pasta.");
  const atual = fs.existsSync(ARQ_CRIPTO) ? JSON.parse(fs.readFileSync(ARQ_CRIPTO, "utf8")) : null;

  const senha = await perguntar("Senha do dashboard: ", true);
  let sal;
  if (atual && atual.iteracoes === ITERACOES && (await senhaConfere(senha, atual))) {
    sal = deB64(atual.sal);
    console.log("Senha atual confirmada.");
  } else {
    if (atual) console.log("Essa senha é DIFERENTE da atual: todos terão que digitar a nova senha.");
    if (senha.length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    if ((await perguntar("Confirme a nova senha: ", true)) !== senha) throw new Error("As senhas não conferem.");
    sal = globalThis.crypto.getRandomValues(new Uint8Array(16));
  }

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, sal);
  const cifrado = await subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    new TextEncoder().encode(fs.readFileSync(ARQ_DADOS, "utf8")),
  );

  const saida = { versao: 1, iteracoes: ITERACOES, sal: b64(sal), iv: b64(iv), dados: b64(new Uint8Array(cifrado)) };
  fs.writeFileSync(ARQ_CRIPTO, JSON.stringify(saida) + "\n");
  console.log("dados.enc gerado. Faça o commit/push de dados.enc (nunca de dados.js).");
}

main()
  .catch((erro) => {
    console.error("Erro:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
