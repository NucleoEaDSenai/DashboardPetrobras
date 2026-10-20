// Desbloqueio do dashboard: baixa dados.enc, decifra com a senha e só então
// executa os dados (equivalente ao antigo dados.js) e carrega script.js.
// O arquivo dados.enc é gerado por criptografar.js.

(() => {
  const CHAVE_SALVA = "dashboardPetrobras.chave";
  const tela = document.getElementById("bloqueio");
  const form = document.getElementById("bloqueioForm");
  const campoSenha = document.getElementById("bloqueioSenha");
  const campoLembrar = document.getElementById("bloqueioLembrar");
  const erro = document.getElementById("bloqueioErro");
  const botao = form.querySelector("button");
  const btnSair = document.getElementById("btnSair");

  const deB64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
  const b64 = (bytes) => btoa(String.fromCharCode(...bytes));

  const lerChaveSalva = () => {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SALVA));
    } catch {
      return null;
    }
  };
  const salvarChave = (valor) => {
    try {
      if (valor) localStorage.setItem(CHAVE_SALVA, JSON.stringify(valor));
      else localStorage.removeItem(CHAVE_SALVA);
    } catch {
      // navegador sem armazenamento: a senha só será pedida de novo
    }
  };

  async function derivarChave(senha, cripto) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: deB64(cripto.sal), iterations: cripto.iteracoes, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"],
    );
  }

  const importarChave = (bytes) => crypto.subtle.importKey("raw", deB64(bytes), "AES-GCM", true, ["decrypt"]);

  async function decifrar(chave, cripto) {
    const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(cripto.iv) }, chave, deB64(cripto.dados));
    return new TextDecoder().decode(bytes);
  }

  function iniciarDashboard(codigoDados) {
    // Script clássico: os const de dados ficam globais, como no antigo <script src="dados.js">
    const dados = document.createElement("script");
    dados.textContent = codigoDados;
    document.body.appendChild(dados);

    const principal = document.createElement("script");
    principal.src = "script.js";
    document.body.appendChild(principal);

    tela.hidden = true;
    btnSair.hidden = false;
  }

  function mostrarErro(texto) {
    erro.textContent = texto;
    erro.hidden = false;
  }

  btnSair.addEventListener("click", () => {
    salvarChave(null);
    location.reload();
  });

  async function iniciar() {
    let cripto;
    try {
      const resp = await fetch("dados.enc", { cache: "no-cache" });
      if (!resp.ok) throw new Error(resp.status);
      cripto = await resp.json();
    } catch {
      tela.hidden = false;
      botao.disabled = true;
      mostrarErro("Não foi possível carregar os dados. Tente recarregar a página.");
      return;
    }

    // Chave lembrada neste computador: só vale enquanto a senha não mudar (mesmo sal)
    const salva = lerChaveSalva();
    if (salva && salva.sal === cripto.sal) {
      try {
        iniciarDashboard(await decifrar(await importarChave(salva.chave), cripto));
        return;
      } catch {
        salvarChave(null);
      }
    }

    tela.hidden = false;
    campoSenha.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro.hidden = true;
      botao.disabled = true;
      botao.textContent = "Verificando…";
      try {
        const chave = await derivarChave(campoSenha.value, cripto);
        const codigo = await decifrar(chave, cripto);
        if (campoLembrar.checked) {
          const bruta = new Uint8Array(await crypto.subtle.exportKey("raw", chave));
          salvarChave({ sal: cripto.sal, chave: b64(bruta) });
        }
        iniciarDashboard(codigo);
      } catch {
        mostrarErro("Senha incorreta.");
        campoSenha.select();
      } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
      }
    });
  }

  iniciar();
})();
