const firebaseConfig = {
  apiKey: "AIzaSyDXZKqEav9k40ojrrhZuRO2ytUSE_qrCMw",
  authDomain: "biblioteca-d7e7f.firebaseapp.com",
  projectId: "biblioteca-d7e7f",
  storageBucket: "biblioteca-d7e7f.firebasestorage.app",
  messagingSenderId: "575199720910",
  appId: "1:575199720910:web:a5711f7258e17ae9cb679f",
  measurementId: "G-LHD08ZQ8J7"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let editandoId = null; // variável para guardar id do item sendo editado

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
      // Removida a chamada para carregarListas aqui para evitar duplicação
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
  const imagemFileInput = document.getElementById("imagemFile");
  const imagemFile = imagemFileInput.files[0];

  if (!nome) {
    alert("Por favor, preencha o nome.");
    return;
  }
  if (avaliacao < 0 || avaliacao > 5 || isNaN(avaliacao)) {
    alert("Avaliação deve ser um número entre 0 e 5.");
    return;
  }
if (editandoId) {
  const link = document.getElementById("link").value.trim();

  if (imagemFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imagemBase64 = e.target.result;
      atualizarDocumento(editandoId, { nome, categoria, genero, avaliacao, comentario, imagem: imagemBase64, link });
    };
    reader.readAsDataURL(imagemFile);
  } else {
    atualizarDocumento(editandoId, { nome, categoria, genero, avaliacao, comentario, link });
  }
} else {
    // Adicionar novo
  // Adicionar novo
if (!imagemFile) {
  alert("Por favor, selecione uma imagem.");
  return;
}
const reader = new FileReader();
reader.onload = function (e) {
  const imagemBase64 = e.target.result;

  const link = document.getElementById("link").value.trim();

  const doc = {
    nome,
    categoria,
    genero,
    avaliacao,
    comentario,
    imagem: imagemBase64,
    userEmail: auth.currentUser.email,
    capitulos: parseInt(document.getElementById("capitulos").value) || 0,
    link
  };
  

  db.collection("animes").add(doc)
    .then(() => {
      alert("Adicionado com sucesso!");
      limparFormulario();

      // FECHA O FORMULÁRIO

      carregarListas(auth.currentUser.email);
    })
    .catch(e => alert("Erro ao adicionar: " + e.message));
};
reader.readAsDataURL(imagemFile);
  }
}

function atualizarDocumento(id, dados) {
  db.collection("animes").doc(id).update(dados)
    .then(() => {
      alert("Atualizado com sucesso!");
      limparFormulario();
      editandoId = null;
      document.getElementById("form-title").innerText = "Adicionar Novo";
      document.getElementById("btn-submit").innerText = "Adicionar";
      document.getElementById("btn-cancelar").classList.add("hidden");

      // FECHA O FORMULÁRIO APÓS EDITAR
      document.getElementById("formulario-adicionar").classList.add("hidden");

      carregarListas(auth.currentUser.email);
    })
    .catch(e => alert("Erro ao atualizar: " + e.message));
}
function carregarListas(meuEmail) {
  const filtroGenero = document.getElementById("filtro-genero").value;
  db.collection("animes").where("userEmail", "==", meuEmail).get().then(snapshotUserItems => {
    const minhaLista = document.getElementById("minha-lista");
    const outraLista = document.getElementById("outra-lista");
    minhaLista.innerHTML = "";
    outraLista.innerHTML = "";

    const btnRemoverTudo = document.getElementById("btn-remover-tudo");
    if (btnRemoverTudo) {
      if (snapshotUserItems.size > 0) {
        btnRemoverTudo.classList.remove("hidden");
      } else {
        btnRemoverTudo.classList.add("hidden");
      }
    }

    db.collection("animes")
      .orderBy("nome")
      .get()
      .then(snapshot => {
        let totalAnimes = 0;
        let totalMangas = 0;
        let totalAnimesOutra = 0;
        let totalMangasOutra = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const id = doc.id;
        
          if (filtroGenero && data.genero !== filtroGenero) return;
        
          if (data.userEmail === meuEmail) {
            if (data.categoria === "anime") totalAnimes++;
            if (data.categoria === "manga") totalMangas++;
          } else {
            if (data.categoria === "anime") totalAnimesOutra++;
            if (data.categoria === "manga") totalMangasOutra++;
          }

          function pegarNomeDoEmail(email) {
            if (!email) return "";
            const username = email.split("@")[0];
            return username.split(/[\.\_\-\s]/)[0];
          }

          const nomeUsuario = pegarNomeDoEmail(data.userEmail);
          const card = `
            <div class="anime-card" onclick="event.stopPropagation()">
              ${data.userEmail === meuEmail ? `
                <button class="btn-remover hidden" onclick="removerAnime('${id}')">✖️</button>
                <button class="btn-editar hidden" onclick="editarAnime('${id}')">Editar</button>
              ` : ""}
          
              ${data.imagem ? `<img src="${data.imagem}" alt="${data.nome}" />` : `<div class="sem-imagem"></div>`}
              <h3>Nome: ${data.link ? `<a href="${data.link}" target="_blank" rel="noopener noreferrer">${data.nome}</a>` : data.nome}</h3>

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

          if (data.userEmail === meuEmail) {
            minhaLista.insertAdjacentHTML("beforeend", card);
          } else {
            outraLista.insertAdjacentHTML("beforeend", card);
          }
        });

        // Atualizar as contagens na interface
        document.getElementById("contagem-animes").textContent = totalAnimes;
        document.getElementById("contagem-mangas").textContent = totalMangas;
        document.getElementById("contagem-animes-outra").textContent = totalAnimesOutra;
        document.getElementById("contagem-mangas-outra").textContent = totalMangasOutra;
      });
  });
}


function toggleDetalhes(id) {
  const detalhes = document.getElementById(`detalhes-${id}`);
  detalhes.classList.toggle("hidden");

  // Mostra/esconde os botões editar e remover dentro do card
  const card = detalhes.closest('.anime-card');
  const btnRemover = card.querySelector('.btn-remover');
  const btnEditar = card.querySelector('.btn-editar');

  if (btnRemover && btnEditar) {
    const isHidden = btnRemover.classList.contains('hidden');
    if (isHidden) {
      btnRemover.classList.remove('hidden');
      btnEditar.classList.remove('hidden');
    } else {
      btnRemover.classList.add('hidden');
      btnEditar.classList.add('hidden');
    }
  }
}

function removerAnime(id) {
  if (confirm("Tem certeza que deseja remover este item?")) {
    db.collection("animes").doc(id).delete()
      .then(() => carregarListas(auth.currentUser.email))
      .catch(e => alert("Erro ao remover: " + e.message));
  }
}
function editarAnime(id) {
  db.collection("animes").doc(id).get()
    .then(doc => {
      if (!doc.exists) return alert("Item não encontrado");
      const data = doc.data();

      editandoId = id;
      document.getElementById("nome").value = data.nome;
      document.getElementById("categoria").value = data.categoria;
      document.getElementById("genero").value = data.genero;
      document.getElementById("avaliacao").value = data.avaliacao;
      document.getElementById("comentario").value = data.comentario;
      document.getElementById("capitulos").value = data.capitulos || 0;
      document.getElementById("link").value = data.link || ""; // <<< aqui

      document.getElementById("form-title").innerText = "Editar Item";
      document.getElementById("btn-submit").innerText = "Salvar";
      document.getElementById("btn-cancelar").classList.remove("hidden");
      document.getElementById("formulario-adicionar").classList.remove("hidden");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
    .catch(e => alert("Erro ao carregar item: " + e.message));
}


function cancelarEdicao() {
  editandoId = null;
  limparFormulario();
  document.getElementById("form-title").innerText = "Adicionar Novo";
  document.getElementById("btn-submit").innerText = "Adicionar";
  document.getElementById("btn-cancelar").classList.add("hidden");

  // FECHA O FORMULÁRIO
  document.getElementById("formulario-adicionar").classList.add("hidden");
}

function limparFormulario() {
  document.getElementById("nome").value = "";
  document.getElementById("categoria").value = "anime";
  document.getElementById("genero").value = "";
  document.getElementById("avaliacao").value = "";
  document.getElementById("comentario").value = "";
  document.getElementById("imagemFile").value = "";
  document.getElementById("capitulos").value = "";
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
  const linhas = textarea.value.split("\n").map(l => l.trim()).filter(l => l !== "");

  if (linhas.length === 0) {
    alert("Insira pelo menos um nome.");
    return;
  }

  const userEmail = auth.currentUser.email;

  const promessas = linhas.map(linhaOriginal => {
    let linha = linhaOriginal.replace(/&/g, "and"); // Substitui & por "and"
    
    // Regex para capturar nome + capítulo opcional
    const match = linha.match(/(.*?)(?:\s+(?:cap|ch|chap|chapter|ep|side|pag|v\d+)?\.?\s*(\d+(\.\d+)?))?$/i);

    let nome = linha;
    let capitulos = 0;

    if (match) {
      nome = match[1].trim();
      if (match[2]) {
        capitulos = parseFloat(match[2]);
      }
    }

    const doc = {
      nome,
      categoria: "",
      genero: "",
      avaliacao: "",
      comentario: "",
      imagem: "", // padrão se não tiver imagem
      userEmail,
      capitulos
    };

    return db.collection("animes").add(doc);
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
  if (!confirm("Tem certeza que deseja remover TODOS os itens da sua lista? Essa ação não pode ser desfeita.")) {
    return;
  }

  const btn = document.getElementById("btn-remover-tudo");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Removendo...";
  }

  db.collection("animes")
    .where("userEmail", "==", userEmail)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      return batch.commit();
    })
    .then(() => {
      alert("Todos os itens foram removidos com sucesso!");
      carregarListas(userEmail);
    })
    .catch(e => alert("Erro ao remover todos os itens: " + e.message))
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Remover Tudo";
      }
    });
}

function toggleFormulario() {
  const form = document.getElementById("formulario-adicionar");
  form.classList.toggle("hidden");
}

function toggleImportarLista() {
  const importar = document.getElementById("importar-lista");
  importar.classList.toggle("hidden");
}
function gerarEstrelas(avaliacao) {
  const estrelasMax = 5;
  let estrelasValor = avaliacao;  // avaliação já de 0 a 5

  // percentual para o gradiente
  const percent = (estrelasValor / estrelasMax) * 100;

  const div = document.createElement('div');
  div.className = 'Stars';
  div.style.setProperty('--percent', percent + '%');

  return div.outerHTML;
}

function filtrarPorNome() {
  const termo = document.getElementById("campo-busca").value.toLowerCase();
  const minhaLista = document.getElementById("minha-lista");
  const cards = minhaLista.querySelectorAll(".anime-card");

  cards.forEach(card => {
    const nome = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = nome.includes(termo) ? "block" : "none";
  });
}
