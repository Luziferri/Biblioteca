const firebaseConfig = {
  apiKey: "AIzaSyBxG9YzkSMv_RFawngigcYWq_sJ-buElxQ",
  authDomain: "bibliotecaeu-a8e28.firebaseapp.com",
  projectId: "bibliotecaeu-a8e28",
  storageBucket: "bibliotecaeu-a8e28.appspot.com",
  messagingSenderId: "798168137210",
  appId: "1:798168137210:web:12a29138943c8f0dacf843",
  measurementId: "G-FRVRZZ4J8G"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let editandoId = null;
let imagemAtual = "";
let outraListaExpandida = localStorage.getItem('outraListaExpandida') === 'true' || false;

// Variáveis para controle dos listeners
let unsubscribeUser = null;
let unsubscribeOthers = null;
let currentUserEmail = null;
let cachedUserData = [];
let cachedOtherData = [];

document.getElementById("filtro-genero").addEventListener("change", () => {
  carregarListas(auth.currentUser.email);
});

const toggleThemeBtn = document.getElementById("toggle-theme");

function atualizarEmoji(tema) {  
  toggleThemeBtn.textContent = tema === "dark" ? "☀️" : "🌙";
}

toggleThemeBtn.addEventListener("click", () => {
  const atual = document.documentElement.getAttribute("data-theme");
  const novoTema = atual === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novoTema);
  localStorage.setItem("tema", novoTema);
  atualizarEmoji(novoTema);
});

// Função para atualizar a visibilidade da lista de outros
function atualizarVisibilidadeOutraLista() {
  const outraListaElement = document.getElementById('outra-lista');
  const toggleIcon = document.getElementById('toggle-icon');
  
  if (outraListaExpandida) {
    outraListaElement.classList.remove('hidden');
    toggleIcon.textContent = '▼';
  } else {
    outraListaElement.classList.add('hidden');
    toggleIcon.textContent = '▶';
  }
}

// Evento para alternar a visibilidade da lista de outros
document.getElementById('toggle-outra-lista').addEventListener('click', () => {
  outraListaExpandida = !outraListaExpandida;
  localStorage.setItem('outraListaExpandida', outraListaExpandida.toString());
  atualizarVisibilidadeOutraLista();

  if (outraListaExpandida) {
    // Se já temos dados em cache, use-os
    if (cachedOtherData.length > 0) {
      processarListaOutros(cachedOtherData);
    } else {
      // Senão, carregue do Firebase
      carregarListaOutros(currentUserEmail);
    }
  } else {
    // Ao recolher, destrua o listener para evitar leituras
    if (unsubscribeOthers) {
      unsubscribeOthers();
      unsubscribeOthers = null;
    }
  }
});

window.onload = () => {
  const temaSalvo = localStorage.getItem("tema") || "light";
  document.documentElement.setAttribute("data-theme", temaSalvo);
  atualizarEmoji(temaSalvo);
  
  // Inicializa visibilidade da lista de outros
  atualizarVisibilidadeOutraLista();
};

// Função para carregar apenas os itens do usuário atual
function carregarListaUsuario(userEmail) {
  if (unsubscribeUser) unsubscribeUser();
  
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");

  let query = db.collection("animes")
  .where("userEmail", "==", userEmail)
  .orderBy("userEmail") // Add this line
  .orderBy("nome");

  const filtroGenero = document.getElementById("filtro-genero").value;
  if (filtroGenero) {
    query = query.where("genero", "==", filtroGenero);
  }

  unsubscribeUser = query.onSnapshot(snapshot => {
    cachedUserData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processarListaUsuario(cachedUserData);
    loader.classList.add("hidden");
  }, error => {
    loader.classList.add("hidden");
    console.error(error);
  });
}

// Função para carregar apenas os itens de outros usuários
// Adicione um elemento de carregamento de tela no seu HTML
const loader = document.getElementById("loader");

// Exiba o carregamento de tela enquanto a lista é carregada
function carregarListaOutros(userEmail) {
  if (unsubscribeOthers) unsubscribeOthers();

  loader.classList.remove("hidden"); // Exiba o carregamento de tela

  let query = db.collection("animes")
    .where("userEmail", "!=", userEmail)
    .orderBy("userEmail") // Add this line
    .orderBy("nome");

  const filtroGenero = document.getElementById("filtro-genero").value;
  if (filtroGenero) {
    query = query.where("genero", "==", filtroGenero);
  }

  unsubscribeOthers = query.onSnapshot(snapshot => {
    cachedOtherData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processarListaOutros(cachedOtherData);
    loader.classList.add("hidden"); // Oculte o carregamento de tela
  }, error => {
    loader.classList.add("hidden"); // Oculte o carregamento de tela
    console.error(error);
  });
}
// Função principal que gerencia o carregamento
function carregarListas(userEmail) {
  currentUserEmail = userEmail;
  carregarListaUsuario(userEmail);

  // Só carrega outros se a lista estiver expandida
  if (outraListaExpandida) {
    carregarListaOutros(userEmail);
  }
}

// Processa os dados do usuário atual
function processarListaUsuario(dados) {
  const listaLidos = document.getElementById("lista-lidos");
  const listaPorLer = document.getElementById("lista-por-ler");
  
  listaLidos.innerHTML = "";
  listaPorLer.innerHTML = "";

  let totalAnimesPorLer = 0, totalMangasPorLer = 0, 
      totalAnimesLidos = 0, totalMangasLidos = 0;

  dados.forEach(data => {
    const id = data.id;
    const card = criarCard(data, id, true);
    
    const status = data.statusLeitura || "lido";
    if (status === "lido") {
      listaLidos.insertAdjacentHTML("beforeend", card);
      if (data.categoria === "anime") totalAnimesLidos++;
      if (data.categoria === "manga") totalMangasLidos++;
    } else if (status === "porLer") {
      listaPorLer.insertAdjacentHTML("beforeend", card);
      if (data.categoria === "anime") totalAnimesPorLer++;
      if (data.categoria === "manga") totalMangasPorLer++;
    }
  });

  document.getElementById("contagem-animes-por-ler").textContent = totalAnimesPorLer;
  document.getElementById("contagem-mangas-por-ler").textContent = totalMangasPorLer;
  document.getElementById("contagem-animes-lidos").textContent = totalAnimesLidos;
  document.getElementById("contagem-mangas-lidos").textContent = totalMangasLidos;

  const btnRemoverTudo = document.getElementById("btn-remover-tudo");
  if (btnRemoverTudo) {
    btnRemoverTudo.classList.toggle("hidden", dados.length === 0);
  }

  observarCards();
}

// Processa os dados de outros usuários
function processarListaOutros(dados) {
  const outraLista = document.getElementById("outra-lista");
  outraLista.innerHTML = "";

  let totalAnimesOutra = 0, totalMangasOutra = 0;

  dados.forEach(data => {
    const id = data.id;
    const card = criarCard(data, id, false);
    outraLista.insertAdjacentHTML("beforeend", card);
    
    if (data.categoria === "anime") totalAnimesOutra++;
    if (data.categoria === "manga") totalMangasOutra++;
  });

  document.getElementById("contagem-animes-outra").textContent = totalAnimesOutra;
  document.getElementById("contagem-mangas-outra").textContent = totalMangasOutra;

  observarCards();
}

// Função auxiliar para criar o HTML do card
function criarCard(data, id, minha) {
  const nomeUsuario = (data.userEmail.split("@")[0] || "").split(/[\.\_\-\s]/)[0];
  return `
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
        <p><strong>Status:</strong> ${data.statusLeitura === "lido" ? "Lido" : "Por Ler"}</p>
        <p><strong>Avaliação:</strong> ${gerarEstrelas(data.avaliacao)}</p>
        <p><strong>Comentário:</strong> ${data.comentario}</p>
        <p><strong>Capítulos:</strong> ${data.capitulos}</p>
        <p><strong>Utilizador:</strong> ${nomeUsuario}</p>
      </div>
      <button class="btn-expandir" onclick="toggleDetalhes('${id}')">⋯</button>
    </div>
  `;
}

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
  auth.signOut().then(() => {
    // Limpar listeners ao deslogar
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribeOthers) unsubscribeOthers();
    location.reload();
  });
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
  const statusLeitura = document.getElementById("statusLeitura").value;

  if (!nome) return alert("Por favor, preencha o nome.");
  if (avaliacao < 0 || avaliacao > 5 || isNaN(avaliacao)) return alert("A avaliação deve ser um número entre 0 e 5.");
  if (!statusLeitura) return alert("Seleciona o status da leitura.");

  const salvar = (imagemBase64 = "") => {
    if (!imagemBase64 && editandoId) {
      imagemBase64 = imagemAtual;
    }

    const doc = {
      nome, categoria, genero, avaliacao, comentario, imagem: imagemBase64, 
      userEmail: auth.currentUser.email, capitulos, link, statusLeitura
    };

    const op = editandoId
      ? db.collection("animes").doc(editandoId).update(doc)
      : db.collection("animes").add(doc);

    op.then(() => {
      alert(editandoId ? "Atualizado com sucesso!" : "Adicionado com sucesso!");
      limparFormulario();
      editandoId = null;
      imagemAtual = "";
      carregarListaUsuario(auth.currentUser.email); // Atualiza apenas a lista do usuário
      document.getElementById("formulario-adicionar").classList.add("hidden");
    }).catch(e => alert("Erro: " + e.message));
  };

  if (imagemFile) {
    const reader = new FileReader();
    reader.onload = e => salvar(e.target.result);
    reader.readAsDataURL(imagemFile);
  } else {
    if (!editandoId) return alert("Por favor, seleciona uma imagem.");
    salvar();
  }
}

function observarCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      if (!entry.isIntersecting && card.classList.contains('expandido')) {
        card.classList.remove('expandido');
        card.querySelector('.detalhes-extra').classList.add('hidden');
        card.querySelectorAll('.btn-remover, .btn-editar').forEach(btn => {
          btn.classList.add('hidden');
        });
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.anime-card').forEach(card => observer.observe(card));
}

function removerAnime(id) {
  if (confirm("Tem certeza que deseja remover este item?")) {
    db.collection("animes").doc(id).delete().then(() => {
      carregarListaUsuario(auth.currentUser.email); // Atualiza apenas a lista do usuário
    });
  }
}

function editarAnime(id) {
  db.collection("animes").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Item não encontrado");
    const data = doc.data();

    editandoId = id;
    imagemAtual = data.imagem || "";

    document.getElementById("nome").value = data.nome;
    document.getElementById("categoria").value = data.categoria;
    document.getElementById("genero").value = data.genero;
    document.getElementById("avaliacao").value = data.avaliacao;
    document.getElementById("comentario").value = data.comentario;
    document.getElementById("capitulos").value = data.capitulos || 0;
    document.getElementById("link").value = data.link || "";
    document.getElementById("statusLeitura").value = data.statusLeitura || "porLer";

    document.getElementById("form-title").innerText = "Editar Item";
    document.getElementById("btn-submit").innerText = "Salvar";
    document.getElementById("btn-cancelar").classList.remove("hidden");
    document.getElementById("formulario-adicionar").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function cancelarEdicao() {
  editandoId = null;
  imagemAtual = "";
  limparFormulario();
  document.getElementById("form-title").innerText = "Adicionar Novo";
  document.getElementById("btn-submit").innerText = "Adicionar";
  document.getElementById("btn-cancelar").classList.add("hidden");
  document.getElementById("formulario-adicionar").classList.add("hidden");
}

function limparFormulario() {
  ["nome", "categoria", "genero", "avaliacao", "comentario", "imagemFile", "capitulos", "link", "statusLeitura"].forEach(id => {
    if (id === "avaliacao") {
      document.getElementById(id).value = 0;
    } else if (id === "statusLeitura") {
      document.getElementById(id).value = "porLer";
    } else if (id === "imagemFile") {
      document.getElementById(id).value = "";
    } else {
      document.getElementById(id).value = "";
    }
  });
}

function gerarEstrelas(avaliacao) {
  const percent = (avaliacao / 5) * 100;
  const div = document.createElement('div');
  div.className = 'Stars';
  div.style.setProperty('--percent', percent + '%');
  return div.outerHTML;
}

function toggleDetalhes(id) {
  const card = document.querySelector(`.anime-card button[onclick="toggleDetalhes('${id}')"]`).parentElement;
  const detalhes = card.querySelector(`#detalhes-${id}`);
  const btnRemover = card.querySelector(".btn-remover");
  const btnEditar = card.querySelector(".btn-editar");

  if (detalhes.classList.contains("hidden")) {
    detalhes.classList.remove("hidden");
    card.classList.add("expandido");
    if (btnRemover) btnRemover.classList.remove("hidden");
    if (btnEditar) btnEditar.classList.remove("hidden");
  } else {
    detalhes.classList.add("hidden");
    card.classList.remove("expandido");
    if (btnRemover) btnRemover.classList.add("hidden");
    if (btnEditar) btnEditar.classList.add("hidden");
  }
}

function removerTudo() {
  if (confirm("Queres remover todos os seus itens?")) {
    const promessas = cachedUserData.map(d => 
      db.collection("animes").doc(d.id).delete()
    );
    
    Promise.all(promessas).then(() => {
      carregarListaUsuario(auth.currentUser.email);
    });
  }
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("user-email").innerText = user.email;
    carregarListas(user.email);
    
    // Inicializa visibilidade da lista de outros
    atualizarVisibilidadeOutraLista();
  } else {
    document.getElementById("login").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    
    // Limpar listeners ao deslogar
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribeOthers) unsubscribeOthers();
  }
});

function toggleFormulario() {
  document.getElementById("formulario-adicionar").classList.toggle("hidden");
}

function toggleImportarLista() {
  document.getElementById("importar-lista").classList.toggle("hidden");
}

function importarListaRapida() {
  const textarea = document.getElementById("textarea-importar");
  const linhas = textarea.value.split("\n").map(l => l.trim()).filter(Boolean);

  if (!linhas.length) return alert("Escreve pelo menos um nome.");

  const userEmail = auth.currentUser.email;
  const promessas = linhas.map(linhaOriginal => {
    let linha = linhaOriginal.replace(/&/g, "and");
    const match = linha.match(/(.*?)(?:\s+(?:cap|ch|chapter|ep|v\d+)?\.?\s*(\d+(\.\d+)?))?$/i);
    const nome = match ? match[1].trim() : linha;
    const capitulos = match && match[2] ? parseFloat(match[2]) : 0;

    return db.collection("animes").add({ 
      nome, 
      categoria: "", 
      genero: "", 
      avaliacao: "", 
      comentario: "", 
      imagem: "", 
      userEmail, 
      capitulos,
      statusLeitura: "porLer"
    });
  });

  Promise.all(promessas)
    .then(() => {
      alert("Importação concluída!");
      textarea.value = "";
      carregarListaUsuario(userEmail);
    })
    .catch(e => alert("Erro na importação: " + e.message));
}

let buscaTimeout = null;

function filtrarPorNome() {
  clearTimeout(buscaTimeout);
  buscaTimeout = setTimeout(() => {
    const termo = document.getElementById("campo-busca").value.toLowerCase();
    
    // Filtra todas as listas visíveis
    document.querySelectorAll("#lista-lidos .anime-card, #lista-por-ler .anime-card").forEach(card => {
      const nome = card.querySelector("h3").innerText.toLowerCase();
      card.style.display = nome.includes(termo) ? "" : "none";
    });
    
    // Só filtra a lista de outros se estiver visível
    if (outraListaExpandida) {
      document.querySelectorAll("#outra-lista .anime-card").forEach(card => {
        const nome = card.querySelector("h3").innerText.toLowerCase();
        card.style.display = nome.includes(termo) ? "" : "none";
      });
    }
  }, 300);
}

// Limpar listeners ao sair da página
window.addEventListener('beforeunload', () => {
  if (unsubscribeUser) unsubscribeUser();
  if (unsubscribeOthers) unsubscribeOthers();
});
