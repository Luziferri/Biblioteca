const firebaseConfig = {
  apiKey: "AIzaSyBxG9YzkSMv_RFawngigcYWq_sJ-buElxQ",
  authDomain: "bibliotecaeu-a8e28.firebaseapp.com",
  projectId: "bibliotecaeu-a8e28",
  storageBucket: "bibliotecaeu-a8e28.firebasestorage.app",
  messagingSenderId: "798168137210",
  appId: "1:798168137210:web:12a29138943c8f0dacf843",
  measurementId: "G-FRVRZZ4J8G"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let editandoId = null;
let imagemAtual = ""; // Guarda a imagem atual durante edição

document.getElementById("filtro-genero").addEventListener("change", () => {
  carregarListas(auth.currentUser.email);
});

const toggleThemeBtn = document.getElementById("toggle-theme");

function atualizarEmoji(tema) {  toggleThemeBtn.textContent = tema === "dark" ? "☀️" : "🌙";
}

toggleThemeBtn.addEventListener("click", () => {
  const atual = document.documentElement.getAttribute("data-theme");
  const novoTema = atual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novoTema);
  localStorage.setItem("tema", novoTema);
  atualizarEmoji(novoTema);
});

window.onload = () => {
  const temaSalvo = localStorage.getItem("tema") || "light";
  document.documentElement.setAttribute("data-theme", temaSalvo);
  atualizarEmoji(temaSalvo);
};

function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById("login").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("user-email").innerText = email;
    })
    .catch(e => alert(e.message));
}

function logout() {
  auth.signOut().then(() => location.reload());
}

function adicionar() {
  const nome = document.getElementById("nome").value.trim();
  const categoria = document.getElementById("categoria").value;
  const genero = document.getElementById("genero").value;
  const avaliacao = parseFloat(document.getElementById("avaliacao").value);
  const comentario = document.getElementById("comentario").value.trim();
  const imagemFile = document.getElementById("imagemFile").files[0];
  const link = document.getElementById("link").value.trim();
  const capitulos = parseInt(document.getElementById("capitulos").value) || 0;

  if (!nome) return alert("Por favor, preencha o nome.");
  if (avaliacao < 0 || avaliacao > 5 || isNaN(avaliacao)) return alert("Avaliação deve ser um número entre 0 e 5.");

  const salvar = (imagemBase64 = "") => {
    if (!imagemBase64 && editandoId) {
      imagemBase64 = imagemAtual; // mantém a imagem atual se não foi selecionada nova imagem durante edição
    }

    const doc = {
      nome, categoria, genero, avaliacao, comentario, imagem: imagemBase64, userEmail: auth.currentUser.email, capitulos, link
    };

    const op = editandoId
      ? db.collection("animes").doc(editandoId).update(doc)
      : db.collection("animes").add(doc);

    op.then(() => {
      alert(editandoId ? "Atualizado com sucesso!" : "Adicionado com sucesso!");
      limparFormulario();
      editandoId = null;
      imagemAtual = ""; // limpa imagem armazenada após salvar
      carregarListas(auth.currentUser.email);
      document.getElementById("formulario-adicionar").classList.add("hidden"); // Fecha o formulário de edição
    }).catch(e => alert("Erro: " + e.message));
  };

  if (imagemFile) {
    const reader = new FileReader();
    reader.onload = e => salvar(e.target.result);
    reader.readAsDataURL(imagemFile);
  } else {
    if (!editandoId) return alert("Por favor, selecione uma imagem.");
    salvar();
  }
}

// Função para observar os cards e fechar quando saírem da área visível
function observarCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      if (!entry.isIntersecting && card.classList.contains('expandido')) {
        card.classList.remove('expandido');
        card.querySelector('.detalhes-extra').classList.add('hidden');
        card.querySelectorAll('.btn-remover, .btn-editar').forEach(btn => {
          btn.classList.add('hidden'); // Oculta os botões
        });
      }
    });
  }, { threshold: 0.1 }); // Define o quanto do card precisa estar visível (10%)

  // Seleciona todos os cards e os observa
  document.querySelectorAll('.anime-card').forEach(card => observer.observe(card));
}

// Chame a função após carregar os cards
let cachedData = []; // Cache for storing fetched data

function carregarListas(userEmail) {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");

  const filtroGenero = document.getElementById("filtro-genero").value;

  // Use onSnapshot to listen for real-time updates
  db.collection("animes").orderBy("nome").onSnapshot(snapshot => {
    cachedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Cache the data

    const minhaLista = document.getElementById("minha-lista");
    const outraLista = document.getElementById("outra-lista");
    minhaLista.innerHTML = "";
    outraLista.innerHTML = "";

    let totalAnimes = 0, totalMangas = 0, totalAnimesOutra = 0, totalMangasOutra = 0;

    // Filter and sort data locally
    const dadosOrdenados = cachedData
      .filter(data => !filtroGenero || data.genero === filtroGenero)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    dadosOrdenados.forEach(data => {
      const id = data.id;
      const minha = data.userEmail === userEmail;

      if (minha) {
        if (data.categoria === "anime") totalAnimes++;
        if (data.categoria === "manga") totalMangas++;
      } else {
        if (data.categoria === "anime") totalAnimesOutra++;
        if (data.categoria === "manga") totalMangasOutra++;
      }

      const nomeUsuario = (data.userEmail.split("@")[0] || "").split(/[\.\_\-\s]/)[0];
      const card = `
        <div class="anime-card" onclick="event.stopPropagation()">
          ${minha ? `
            <button class="btn-remover hidden" onclick="removerAnime('${id}')">✖️</button>
            <button class="btn-editar hidden" onclick="editarAnime('${id}')">Editar</button>
          ` : ""}
          ${data.imagem ? `<img src="${data.imagem}" alt="${data.nome}" />` : `<div class="sem-imagem"></div>`}
          <h3>Nome: ${data.link ? `<a href="${data.link}" target="_blank">${data.nome}</a>` : data.nome}</h3>
          <div class="detalhes-extra hidden" id="detalhes-${id}">
            <p><strong>Categoria:</strong> ${data.categoria}</p>
            <p><strong>Gênero:</strong> ${data.genero}</p>
            <p><strong>Avaliação:</strong> ${gerarEstrelas(data.avaliacao)}</p>
            <p><strong>Comentário:</strong> ${data.comentario}</p>
            <p><strong>Capítulos:</strong> ${data.capitulos}</p>
            <p><strong>Utilizador:</strong> ${nomeUsuario}</p>
          </div>
          <button class="btn-expandir" onclick="toggleDetalhes('${id}')">⋯</button>
        </div>
      `;

      (minha ? minhaLista : outraLista).insertAdjacentHTML("beforeend", card);
    });

    document.getElementById("contagem-animes").textContent = totalAnimes;
    document.getElementById("contagem-mangas").textContent = totalMangas;
    document.getElementById("contagem-animes-outra").textContent = totalAnimesOutra;
    document.getElementById("contagem-mangas-outra").textContent = totalMangasOutra;

    const btnRemoverTudo = document.getElementById("btn-remover-tudo");
    if (btnRemoverTudo) {
      btnRemoverTudo.classList.toggle("hidden", totalAnimes + totalMangas === 0);
    }

    // Inicia a observação dos cards
    observarCards();
    loader.classList.add("hidden");
  });
}

function removerAnime(id) {
  if (confirm("Tem certeza que deseja remover este item?")) {
    db.collection("animes").doc(id).delete().then(() => carregarListas(auth.currentUser.email));
  }
}

function editarAnime(id) {
  db.collection("animes").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Item não encontrado");
    const data = doc.data();

    editandoId = id;
    imagemAtual = data.imagem || ""; // Guarda a imagem atual para manter se não trocar

    document.getElementById("nome").value = data.nome;
    document.getElementById("categoria").value = data.categoria;
    document.getElementById("genero").value = data.genero;
    document.getElementById("avaliacao").value = data.avaliacao;
    document.getElementById("comentario").value = data.comentario;
    document.getElementById("capitulos").value = data.capitulos || 0;
    document.getElementById("link").value = data.link || "";

    document.getElementById("form-title").innerText = "Editar Item";
    document.getElementById("btn-submit").innerText = "Salvar";
    document.getElementById("btn-cancelar").classList.remove("hidden");
    document.getElementById("formulario-adicionar").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function cancelarEdicao() {
  editandoId = null;
  imagemAtual = ""; // limpa imagem atual
  limparFormulario();
  document.getElementById("form-title").innerText = "Adicionar Novo";
  document.getElementById("btn-submit").innerText = "Adicionar";
  document.getElementById("btn-cancelar").classList.add("hidden");
  document.getElementById("formulario-adicionar").classList.add("hidden");
}

function limparFormulario() {
  ["nome", "categoria", "genero", "avaliacao", "comentario", "imagemFile", "capitulos", "link"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.type === "select-one" ? el.options[0].value : "";
  });
  imagemAtual = ""; // limpa imagem armazenada
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("user-email").innerText = user.email;
    carregarListas(user.email);
  } else {
    document.getElementById("login").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }
});

function importarListaRapida() {
  const textarea = document.getElementById("textarea-importar");
  const linhas = textarea.value.split("\n").map(l => l.trim()).filter(Boolean);

  if (!linhas.length) return alert("Insira pelo menos um nome.");

  const userEmail = auth.currentUser.email;
  const promessas = linhas.map(linhaOriginal => {
    let linha = linhaOriginal.replace(/&/g, "and");
    const match = linha.match(/(.*?)(?:\s+(?:cap|ch|chapter|ep|v\d+)?\.?\s*(\d+(\.\d+)?))?$/i);
    const nome = match ? match[1].trim() : linha;
    const capitulos = match && match[2] ? parseFloat(match[2]) : 0;

    return db.collection("animes").add({ nome, categoria: "", genero: "", avaliacao: "", comentario: "", imagem: "", userEmail, capitulos });
  });

  Promise.all(promessas)
    .then(() => {
      alert("Importação concluída!");
      textarea.value = "";
      carregarListas(userEmail);
    })
    .catch(e => alert("Erro na importação: " + e.message));
}

function removerTudo() {
  const userEmail = auth.currentUser.email;
  if (!confirm("Deseja remover TODOS os itens da sua lista?")) return;

  const btn = document.getElementById("btn-remover-tudo");
  btn.disabled = true;
  btn.innerText = "Removendo...";

  db.collection("animes").where("userEmail", "==", userEmail).get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
  }).then(() => {
    alert("Todos os itens foram removidos.");
    carregarListas(userEmail);
  }).catch(e => alert("Erro: " + e.message)).finally(() => {
    btn.disabled = false;
    btn.innerText = "Remover Tudo";
  });
}

function toggleFormulario() {
  document.getElementById("formulario-adicionar").classList.toggle("hidden");
}

function toggleImportarLista() {
  document.getElementById("importar-lista").classList.toggle("hidden");
}

function toggleDetalhes(id) {
  const card = document.getElementById(`detalhes-${id}`).closest('.anime-card');
  const lista = card.parentElement;

  // Verifica se o card já está expandido
  const isExpanded = card.classList.contains('expandido');

  // Recolhe todos os cards antes de expandir/recolher o atual
  lista.querySelectorAll('.anime-card.expandido').forEach(expandido => {
    expandido.classList.remove('expandido');
    expandido.querySelector('.detalhes-extra').classList.add('hidden');
    expandido.querySelectorAll('.btn-remover, .btn-editar').forEach(btn => {
      btn.classList.add('hidden'); // Oculta os botões
    });
  });

  // Alterna o estado do card atual
  if (!isExpanded) {
    card.classList.add('expandido');
    card.querySelector('.detalhes-extra').classList.remove('hidden');
    card.querySelectorAll('.btn-remover, .btn-editar').forEach(btn => {
      btn.classList.remove('hidden'); // Exibe os botões
    });
  } else {
    card.classList.remove('expandido');
    card.querySelector('.detalhes-extra').classList.add('hidden');
    card.querySelectorAll('.btn-remover, .btn-editar').forEach(btn => {
      btn.classList.add('hidden'); // Oculta os botões
    });
  }
}

function gerarEstrelas(avaliacao) {
  const percent = (avaliacao / 5) * 100;
  const div = document.createElement('div');
  div.className = 'Stars';
  div.style.setProperty('--percent', percent + '%');
  return div.outerHTML;
}

let buscaTimeout = null;
function filtrarPorNome() {
  clearTimeout(buscaTimeout);
  buscaTimeout = setTimeout(() => {
    const termo = document.getElementById("campo-busca").value.toLowerCase();
    document.querySelectorAll("#minha-lista .anime-card").forEach(card => {
      const nome = card.querySelector("h3").innerText.toLowerCase();
      card.style.display = nome.includes(termo) ? "" : "none";
    });
  }, 300);
}
