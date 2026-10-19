/* Extrato Fácil — M Machado Contábil
 * ====== CONFIGURAÇÃO DO ESCRITÓRIO — pode editar este bloco ====== */
const CONFIG = {
  escritorio: "M Machado Contábil",
  nome: "Marcos Antonio dos Santos Machado",
  crc: "CRC SP 265642/O-7",
  email: "",      // ex.: "contato@mmachadocontabil.com.br"
  whatsapp: ""    // só números com DDD, ex.: "41999998888"
};
/* Lista padrão de categorias (vale para quem abrir a página pela primeira vez) */
const CATS_DEFAULT = {
  pag: ["Fornecedores / mercadorias","Combustível","Manutenção de veículos","Peças e pneus","Pedágio","Fretes e carretos","Salários e encargos","Pró-labore","Impostos e taxas","Aluguel","Energia, água, telefone e internet","Serviços de terceiros","Honorários contábeis","Tarifas bancárias","Juros e multas","Empréstimos e financiamentos","Seguros","Material de escritório e consumo","Retirada de sócios","Transferência entre contas","Aplicação financeira","Outros pagamentos"],
  rec: ["Venda de mercadorias","Prestação de serviços / fretes","Recebimento de clientes","Rendimento de aplicação","Resgate de aplicação","Empréstimo recebido","Aporte de sócios","Transferência entre contas","Estorno / devolução","Outros recebimentos"]
};
/* ====== fim da configuração ====== */

(function(){
"use strict";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const RULES=[
  [/TARIFA|TAR\.?\s|CESTA|PACOTE\s+SERV|MANUT.*CONTA/i,"pag","Tarifas bancárias"],
  [/\bIOF\b|DARF|DAS\b|GPS\b|SIMPLES\s+NAC|FGTS|INSS|ICMS|IPVA/i,"pag","Impostos e taxas"],
  [/JUROS|MULTA|MORA/i,"pag","Juros e multas"],
  [/SEM\s*PARAR|CONECTCAR|VELOE|PED[ÁA]GIO|MOVE\s*MAIS/i,"pag","Pedágio"],
  [/POSTO|COMBUST|DIESEL/i,"pag","Combustível"],
  [/RENDIMENTO|REND\.?\s+APLIC|REMUNERA/i,"rec","Rendimento de aplicação"],
  [/RESGATE/i,"rec","Resgate de aplicação"],
  [/APLICA[ÇC][ÃA]O|APLIC\.?\s/i,"pag","Aplicação financeira"],
  [/ESTORNO|DEVOLU/i,"rec","Estorno / devolução"],
  [/SEGURO/i,"pag","Seguros"],
  [/FOLHA|SAL[ÁA]RIO/i,"pag","Salários e encargos"]
];
const BANCOS={1:"Banco do Brasil",3:"Banco da Amazônia",4:"Banco do Nordeste",33:"Santander",41:"Banrisul",70:"BRB",77:"Inter",85:"Ailos",102:"XP",104:"Caixa",133:"Cresol",136:"Unicred",197:"Stone",208:"BTG Pactual",212:"Banco Original",237:"Bradesco",260:"Nubank",290:"PagBank",318:"BMG",323:"Mercado Pago",336:"C6 Bank",341:"Itaú",380:"PicPay",403:"Cora",422:"Safra",623:"Banco Pan",748:"Sicredi",756:"Sicoob"};

const brl=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>"r"+Math.random().toString(36).slice(2,10);
const pad=n=>String(n).padStart(2,"0");
const clone=o=>JSON.parse(JSON.stringify(o));
const digits=s=>String(s||"").replace(/\D/g,"");
const fmtDate=iso=>{if(!iso)return"";const[y,m,d]=iso.split("-");return`${d}/${m}/${y}`};
const tipoOf=r=>r.valor<0?"pag":"rec";
const isDone=r=>!!(r.nota&&r.cat&&String(r.nome||"").trim());
const normKey=s=>String(s||"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[0-9]/g,"").replace(/[^A-Z ]/g," ").replace(/\s+/g," ").trim();
function cnpjFmt(c){const d=digits(c);return d.length===14?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`:c}
function cnpjOk(c){const d=digits(c).split("").map(Number);if(d.length!==14||/^(\d)\1+$/.test(d.join("")))return false;
  const dv=n=>{const w=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];const s=w.reduce((a,x,i)=>a+x*d[i],0)%11;return s<2?0:11-s};
  return dv(12)===d[12]&&dv(13)===d[13]}

/* ---------- armazenamento local ---------- */
const LS={get(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
let PREFS=LS.get("ef-prefs")||{cats:clone(CATS_DEFAULT)};
const savePrefs=()=>LS.set("ef-prefs",PREFS);
let MODE=null;      // "cliente" | "avulso" | "escritorio"
let LOCKED=false;   // empresa com cadastro (nome/CNPJ não editáveis)
let S=null;         // empresa aberta
let saveT=null;
function save(){clearTimeout(saveT);const cur=S;saveT=setTimeout(()=>{if(cur)LS.set("ef-emp-"+cur.empresa.id,cur)},200)}
function flush(){clearTimeout(saveT);if(S)LS.set("ef-emp-"+S.empresa.id,S)}
window.addEventListener("pagehide",flush);

/* ---------- criptografia (cadastro de clientes) ---------- */
const ITER=150000;
const te=new TextEncoder(),td=new TextDecoder();
const b64=u8=>{let s="";for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function sha(s){const h=new Uint8Array(await crypto.subtle.digest("SHA-256",te.encode(s)));return[...h].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function keyFrom(secret,salt){const base=await crypto.subtle.importKey("raw",te.encode(secret),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITER,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function enc(obj,secret){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFrom(secret,salt),te.encode(JSON.stringify(obj))));
  return{s:b64(salt),i:b64(iv),c:b64(ct)}}
async function dec(rec,secret){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(rec.i)},await keyFrom(secret,unb64(rec.s)),unb64(rec.c));return JSON.parse(td.decode(pt))}
const normCode=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const fmtCode=c=>normCode(c).replace(/(.{4})(?=.)/g,"$1-");
function newCode(){const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",r=crypto.getRandomValues(new Uint8Array(12));return[...r].map(x=>A[x%A.length]).join("")}

/* ---------- telas ---------- */
function show(v){for(const id of["v-gate","v-login","v-office","v-app"])$("#"+id).hidden=id!==v;window.scrollTo(0,0)}
function renderModebar(){
  const m=$("#modebar");
  if(MODE==="escritorio"){
    m.innerHTML=`<span>Área do escritório</span>${S?'<button type="button" id="mb-list">← Lista de clientes</button>':""}<button type="button" id="mb-out" class="btn-ghost">Sair</button>`;
    const l=$("#mb-list");if(l)l.onclick=()=>{flush();S=null;renderOffice();show("v-office");renderModebar()};
    $("#mb-out").onclick=()=>{flush();S=null;OFF=null;MODE=null;history.replaceState(null,"",location.pathname);m.innerHTML="";show("v-gate")};
  }else if(MODE==="cliente"&&S){m.innerHTML=`<span>Acesso exclusivo de <b>${esc(S.empresa.fantasia||S.empresa.nome)}</b></span>`}
  else m.innerHTML="";
}
function renderContador(){
  const c=CONFIG;
  $("#foot-nome").textContent=`${c.escritorio} · ${c.nome} · ${c.crc}`;
  const parts=[];
  if(c.email)parts.push(`<span>E-mail: <code>${esc(c.email)}</code></span>`);
  if(c.whatsapp){const w=digits(c.whatsapp);parts.push(`<span>WhatsApp: <a href="https://wa.me/55${w}" target="_blank" rel="noopener">${esc(c.whatsapp)}</a></span>`)}
  if(parts.length){$("#contato").hidden=false;$("#contato").innerHTML=`<span><b>Envie para ${esc(c.escritorio)}</b></span>`+parts.join("")}
}

/* ---------- entrada do cliente ---------- */
function gateMsg(t){const g=$("#gate-msg");g.hidden=!t;g.textContent=t||""}
async function enterCode(raw){
  const code=normCode(raw);
  if(code.length<8){gateMsg("Digite o código completo, como aparece no link enviado pelo contador.");show("v-gate");return}
  const db=window.EF_CLIENTES||{};
  const rec=db[await sha("ef:"+code)];
  if(!rec){gateMsg("Código de acesso não encontrado. Confira o link enviado pelo seu contador.");show("v-gate");return}
  try{const info=await dec(rec,code);MODE="cliente";openEmpresa(info,true)}
  catch(e){gateMsg("Não foi possível abrir o cadastro com este código.");show("v-gate")}
}
$("#gate-form").addEventListener("submit",e=>{e.preventDefault();enterCode($("#gate-code").value)});
$("#gate-avulso").addEventListener("click",()=>{MODE="avulso";openEmpresa({id:"avulso"},false)});

/* ---------- escritório ---------- */
let OFF=null; // {senha, clientes:[{id,nome,fantasia,cnpj,cidade,codigo}], dirty}
$("#go-office").addEventListener("click",()=>{if(MODE==="escritorio"){flush();S=null;renderOffice();show("v-office");renderModebar();return}$("#login-msg").hidden=true;show("v-login");$("#login-pw").focus()});
$("#login-back").addEventListener("click",()=>show(S?"v-app":"v-gate"));
$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();const pw=$("#login-pw").value;const msg=$("#login-msg");
  if(!window.EF_ESCRITORIO){msg.hidden=false;msg.textContent="Arquivo clientes.js não encontrado. Ele precisa estar na mesma pasta do index.html.";return}
  msg.hidden=false;msg.className="status";msg.textContent="Verificando…";
  try{const data=await dec(window.EF_ESCRITORIO,pw);flush();OFF={senha:pw,clientes:data.clientes||[],dirty:false};MODE="escritorio";S=null;$("#login-pw").value="";msg.hidden=true;renderOffice();show("v-office");renderModebar()}
  catch(err){msg.className="status warn";msg.textContent="Senha incorreta."}
});
function linkFor(c){return location.origin+location.pathname+"#acesso="+fmtCode(c.codigo)}
function offMsg(h,kind){const m=$("#off-msg");m.hidden=!h;m.className="status"+(kind?" "+kind:"");m.innerHTML=h||""}
function renderOffice(){
  const list=[...OFF.clientes].sort((a,b)=>a.nome.localeCompare(b.nome));
  $("#off-list").innerHTML=`<tr><th>Empresa</th><th>CNPJ</th><th>Cidade</th><th>Lançamentos neste computador</th><th></th></tr>`+
    (list.length?list.map(c=>{const d=LS.get("ef-emp-"+c.id);const n=d&&d.rows?d.rows.length:0;
      return`<tr data-id="${c.id}"><td><b>${esc(c.nome)}</b>${c.fantasia?`<br><span class="hint">${esc(c.fantasia)}</span>`:""}</td><td class="mono">${esc(cnpjFmt(c.cnpj))}</td><td>${esc(c.cidade||"")}</td><td class="mono">${n||"—"}</td>
      <td class="acts"><button type="button" data-a="abrir">Abrir</button> <button type="button" data-a="link">Copiar link</button> <button type="button" data-a="codigo" title="Invalida o link antigo">Novo código</button> <button type="button" data-a="del" class="btn-danger">Excluir</button></td></tr>`}).join("")
    :`<tr><td colspan="5" class="hint">Nenhum cliente cadastrado.</td></tr>`);
  const d=$("#off-dirty");d.hidden=!OFF.dirty;d.innerHTML="Há alterações que ainda não estão no GitHub. Clique em <b>Baixar clientes.js</b> e substitua o arquivo no repositório.";
}
$("#off-list").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-a]");if(!b)return;const id=b.closest("tr").dataset.id;const c=OFF.clientes.find(x=>x.id===id);if(!c)return;
  const a=b.dataset.a;
  if(a==="abrir"){const{codigo,...info}=c;openEmpresa(info,true)}
  else if(a==="link"){const l=linkFor(c);try{await navigator.clipboard.writeText(l);offMsg(`Link de <b>${esc(c.fantasia||c.nome)}</b> copiado: <code>${esc(l)}</code>`,"ok")}catch(err){offMsg(`Link de <b>${esc(c.fantasia||c.nome)}</b>: <code>${esc(l)}</code>`)}}
  else if(a==="codigo"){if(!b.dataset.confirm){b.dataset.confirm="1";b.textContent="Confirmar";setTimeout(()=>{if(b.isConnected){delete b.dataset.confirm;b.textContent="Novo código"}},4000);return}
    c.codigo=newCode();OFF.dirty=true;renderOffice();offMsg(`Novo código gerado para <b>${esc(c.nome)}</b>. O link antigo para de funcionar depois que o clientes.js for atualizado.`,"ok")}
  else if(a==="del"){if(!b.dataset.confirm){b.dataset.confirm="1";b.textContent="Confirmar exclusão";setTimeout(()=>{if(b.isConnected){delete b.dataset.confirm;b.textContent="Excluir"}},4000);return}
    OFF.clientes=OFF.clientes.filter(x=>x!==c);OFF.dirty=true;renderOffice();offMsg(`${esc(c.nome)} removido do cadastro.`,"ok")}
});
$("#cad-form").addEventListener("submit",e=>{
  e.preventDefault();
  const nome=$("#cad-nome").value.trim(),fant=$("#cad-fant").value.trim(),cnpj=digits($("#cad-cnpj").value),cid=$("#cad-cid").value.trim();
  if(!nome){offMsg("Informe a razão social.","warn");return}
  if(!cnpjOk(cnpj)){offMsg("CNPJ inválido. Confira os números.","warn");return}
  if(OFF.clientes.some(x=>x.id===cnpj)){offMsg("Este CNPJ já está cadastrado.","warn");return}
  OFF.clientes.push({id:cnpj,nome,fantasia:fant,cnpj:cnpjFmt(cnpj),cidade:cid,codigo:newCode()});OFF.dirty=true;
  e.target.reset();renderOffice();offMsg(`<b>${esc(nome)}</b> cadastrado. Baixe o clientes.js e envie ao GitHub para o link funcionar.`,"ok");
});
$("#cad-pdf").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{
    const texts=await pdfLines(f);const all=texts.join("\n");
    if(all.replace(/\s/g,"").length<30){offMsg("Este cartão CNPJ é uma imagem (escaneado). Preencha os campos à mão.","warn");return}
    const m=all.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);if(m)$("#cad-cnpj").value=m[0];
    const after=lbl=>{const i=texts.findIndex(t=>t.toUpperCase().includes(lbl));if(i<0)return"";for(let j=i+1;j<Math.min(i+3,texts.length);j++){const t=texts[j].trim();if(t)return t}return""};
    const nome=after("NOME EMPRESARIAL");if(nome)$("#cad-nome").value=nome.replace(/\s{2,}.*/,"");
    const fan=after("NOME DE FANTASIA");if(fan){const v=fan.replace(/\s{2,}\S+$/,"").replace(/\*+/g,"").trim();$("#cad-fant").value=v}
    const cepLine=texts.find(t=>/^\s*\d{2}\.\d{3}-\d{3}\b/.test(t));
    if(cepLine){const parts=cepLine.trim().split(/\s{2,}/);if(parts.length>=4)$("#cad-cid").value=`${parts[parts.length-2]} / ${parts[parts.length-1]}`}
    offMsg("Dados lidos do cartão CNPJ. Confira e clique em Cadastrar.","ok");
  }catch(err){offMsg("Não foi possível ler este PDF. Preencha à mão.","warn")}
});
function download(name,data,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
$("#off-export").addEventListener("click",async()=>{
  offMsg("Gerando arquivo…");
  const cl={};
  for(const c of OFF.clientes){const{codigo,...info}=c;cl[await sha("ef:"+normCode(codigo))]=await enc(info,normCode(codigo))}
  const esc_=await enc({clientes:OFF.clientes},OFF.senha);
  const js=`/* Extrato Fácil — cadastro de clientes (criptografado).\n   Gerado em ${new Date().toLocaleString("pt-BR")} pela Área do escritório. Não edite à mão. */\nwindow.EF_ESCRITORIO=${JSON.stringify(esc_)};\nwindow.EF_CLIENTES=${JSON.stringify(cl,null,0)};\n`;
  download("clientes.js",js,"text/javascript");
  OFF.dirty=false;renderOffice();offMsg("clientes.js baixado. No GitHub, substitua o arquivo clientes.js por este (Add file → Upload files).","ok");
});
$("#pw-form").addEventListener("submit",e=>{
  e.preventDefault();const p=$("#pw-new").value;
  if(p.length<10){offMsg("A nova senha precisa ter pelo menos 10 caracteres.","warn");return}
  OFF.senha=p;OFF.dirty=true;$("#pw-new").value="";renderOffice();offMsg("Senha trocada nesta sessão. Baixe o clientes.js e envie ao GitHub para a nova senha valer.","ok");
});

/* ---------- abrir empresa ---------- */
function openEmpresa(info,locked){
  flush();
  let d=LS.get("ef-emp-"+info.id);
  if(!d||!Array.isArray(d.rows))d={empresa:{competencia:""},contas:[],rows:[]};
  if(!Array.isArray(d.contas))d.contas=[];
  d.empresa=Object.assign({nome:"",fantasia:"",cnpj:"",cidade:"",competencia:""},d.empresa||{},info);
  S=d;LOCKED=locked;filter="todos";q="";fconta="";$("#q").value="";
  $("#status").hidden=true;$("#map").hidden=true;$("#exp-warn").hidden=true;
  show("v-app");renderModebar();renderEmpresa();renderCats();renderContas();renderNames();renderList();
}

/* ---------- empresa ---------- */
function renderEmpresa(){
  const e=S.empresa;
  if(LOCKED){
    $("#emp-view").innerHTML=`<div class="emp-id"><strong>${esc(e.nome)}</strong>${e.fantasia?`<span>${esc(e.fantasia)}</span>`:""}<span class="mono">CNPJ ${esc(cnpjFmt(e.cnpj))}${e.cidade?" · "+esc(e.cidade):""}</span></div>`;
  }else{
    $("#emp-view").innerHTML=`<div class="emp-edit"><label><span class="lbl">Empresa (razão social)</span><input id="emp-nome" value="${esc(e.nome)}" autocomplete="organization"></label><label><span class="lbl">CNPJ</span><input id="emp-cnpj" value="${esc(e.cnpj)}" inputmode="numeric" placeholder="00.000.000/0000-00"></label></div>`;
    $("#emp-nome").addEventListener("input",ev=>{S.empresa.nome=ev.target.value;save();renderSummary()});
    $("#emp-cnpj").addEventListener("input",ev=>{S.empresa.cnpj=ev.target.value;save();renderSummary()});
  }
  $("#emp-comp").value=e.competencia||"";
}
$("#emp-comp").addEventListener("input",e=>{S.empresa.competencia=e.target.value;save();renderSummary()});

/* ---------- categorias ---------- */
function renderCats(){
  for(const t of["pag","rec"])
    $("#cs-"+t).innerHTML=PREFS.cats[t].map((c,i)=>`<span class="cchip">${esc(c)}<button type="button" data-t="${t}" data-i="${i}" aria-label="Remover ${esc(c)}">×</button></span>`).join("")||'<span class="hint">Nenhuma categoria.</span>';
}
$$("#cs-pag,#cs-rec").forEach(cs=>cs.addEventListener("click",e=>{const b=e.target.closest("button[data-t]");if(!b)return;PREFS.cats[b.dataset.t].splice(+b.dataset.i,1);savePrefs();renderCats();renderList()}));
$$(".addcat").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();const t=f.dataset.t,inp=f.querySelector("input"),n=inp.value.trim();if(!n)return;
  if(!PREFS.cats[t].some(c=>c.toLowerCase()===n.toLowerCase()))PREFS.cats[t].push(n);inp.value="";savePrefs();renderCats();renderList();inp.focus()}));
const cReset=$("#c-reset");
cReset.addEventListener("click",()=>{if(!cReset.dataset.confirm){cReset.dataset.confirm="1";cReset.textContent="Confirmar: voltar à lista padrão";setTimeout(()=>{delete cReset.dataset.confirm;cReset.textContent="Restaurar lista padrão"},4000);return}
  delete cReset.dataset.confirm;cReset.textContent="Restaurar lista padrão";PREFS.cats=clone(CATS_DEFAULT);savePrefs();renderCats();renderList()});

/* ---------- contas bancárias ---------- */
const contaNome=id=>{const c=S.contas.find(c=>c.id===id);return c?c.nome:""};
function addConta(nome,chave){const c={id:"c"+Math.random().toString(36).slice(2,9),nome,chave:chave||""};S.contas.push(c);save();renderContas();return c}
function renderContas(){
  const cnt={};for(const r of S.rows)cnt[r.conta]=(cnt[r.conta]||0)+1;
  $("#contas").innerHTML=S.contas.length?S.contas.map(c=>`<span class="cchip"><button type="button" class="ren" data-ren="${c.id}" title="Renomear">${esc(c.nome)}</button>${cnt[c.id]?`<span class="hint" style="margin-left:6px">${cnt[c.id]}</span>`:""}<button type="button" data-del="${c.id}" aria-label="Remover ${esc(c.nome)}">×</button></span>`).join(""):'<span class="hint">Nenhuma conta ainda.</span>';
  const opts=S.contas.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  const imp=$("#imp-conta"),prev=imp.value;
  imp.innerHTML=(S.contas.length?opts:'<option value="">Conta principal (criada ao importar)</option>')+'<option value="__new__">+ Outra conta…</option>';
  if(S.contas.some(c=>c.id===prev))imp.value=prev;
  $("#n-conta").innerHTML=S.contas.length?opts:'<option value="">Conta principal</option>';
  const f=$("#f-conta");f.innerHTML=`<option value="">Todas as contas</option>`+opts;f.value=fconta;f.hidden=S.contas.length<2;
}
$("#contas").addEventListener("click",e=>{
  const r=e.target.closest("[data-ren]"),d=e.target.closest("[data-del]");
  if(r){const c=S.contas.find(x=>x.id===r.dataset.ren);const n=(prompt("Nome da conta:",c.nome)||"").trim();if(n){c.nome=n;save();renderContas();renderList()}}
  if(d){const id=d.dataset.del;const n=S.rows.filter(x=>x.conta===id).length;
    if(n){showStatus(`Esta conta tem ${n} lançamento${n>1?"s":""}. Apague os lançamentos dela antes de remover a conta.`,"warn");return}
    S.contas=S.contas.filter(x=>x.id!==id);save();renderContas()}
});
$("#conta-form").addEventListener("submit",e=>{e.preventDefault();const n=$("#conta-nome").value.trim();if(!n)return;const c=addConta(n);$("#conta-nome").value="";$("#imp-conta").value=c.id});
$("#imp-conta").addEventListener("change",e=>{if(e.target.value==="__new__"){const n=(prompt("Banco / agência / conta:")||"").trim();if(n){const c=addConta(n);e.target.value=c.id}else renderContas()}});
function importConta(){let v=$("#imp-conta").value;if(v&&v!=="__new__"&&S.contas.some(c=>c.id===v))return v;
  if(S.contas.length)return S.contas[0].id;return addConta("Conta principal").id}

/* ---------- lista de lançamentos ---------- */
let filter="todos",q="",fconta="";
function catOptions(r){
  const list=PREFS.cats[tipoOf(r)]||[];
  let h=`<option value="">Escolha…</option>`;
  if(r.cat&&!list.includes(r.cat))h+=`<option selected>${esc(r.cat)}</option>`;
  for(const c of list)h+=`<option${c===r.cat?" selected":""}>${esc(c)}</option>`;
  return h+`<option value="__new__">+ Nova categoria…</option>`;
}
function similarCount(r){const k=normKey(r.desc),t=tipoOf(r);return S.rows.filter(o=>o!==r&&tipoOf(o)===t&&normKey(o.desc)===k&&!isDone(o)).length}
function rowHTML(r){
  const t=tipoOf(r),done=isDone(r),sim=(r.cat||r.nome||r.nota)?similarCount(r):0;
  return `<article class="row" data-id="${r.id}" data-state="${done?"ok":"pend"}">
  <div class="r-top">
    <span class="r-date">${fmtDate(r.data)}</span>
    <span class="r-desc">${esc(r.desc)}${S.contas.length>1?`<span class="r-conta">${esc(contaNome(r.conta))}</span>`:""}</span>
    <span class="r-state">${done?"Classificado":"Pendente"}</span>
    <button type="button" class="r-tipo ${t}" data-act="tipo" title="Clique para inverter entre pagamento e recebimento">${t==="pag"?"Pagamento":"Recebimento"}</button>
    <span class="r-val ${t==="pag"?"neg":"pos"}">${t==="pag"?"− ":"+ "}${brl.format(Math.abs(r.valor))}</span>
  </div>
  <div class="r-fields">
    <div class="f f-nota"><span class="lbl">Tem nota fiscal?</span><div class="seg" role="group">
      <button type="button" data-act="nota" data-v="sim" aria-pressed="${r.nota==="sim"}">Sim</button><button type="button" data-act="nota" data-v="nao" aria-pressed="${r.nota==="nao"}">Não</button></div></div>
    <label class="f f-num"><span class="lbl">Nº da nota</span><input id="num-${r.id}" data-k="numNota" value="${esc(r.numNota)}" ${r.nota==="sim"?"":"disabled"}></label>
    <label class="f f-cat"><span class="lbl">Categoria</span><select id="cat-${r.id}" data-k="cat">${catOptions(r)}</select></label>
    <label class="f f-nome"><span class="lbl">${t==="pag"?"Fornecedor (quem recebeu)":"Cliente (quem pagou)"}</span><input id="nome-${r.id}" data-k="nome" list="dl-nomes" value="${esc(r.nome)}" placeholder="Nome"></label>
    <label class="f f-obs"><span class="lbl">Observação</span><input id="obs-${r.id}" data-k="obs" value="${esc(r.obs)}"></label>
    <div class="f f-acts">${sim?`<button type="button" data-act="sim" title="Copia nota, categoria e nome para lançamentos com a mesma descrição">Repetir em ${sim} igual${sim>1?"is":""}</button>`:""}<button type="button" class="btn-danger" data-act="del">Excluir</button></div>
  </div></article>`;
}
function visible(){
  const qq=normKey(q);
  return S.rows.map((r,i)=>[r,i]).filter(([r])=>{
    if(fconta&&r.conta!==fconta)return false;
    if(filter==="pend"&&isDone(r))return false;
    if(filter==="pag"&&tipoOf(r)!=="pag")return false;
    if(filter==="rec"&&tipoOf(r)!=="rec")return false;
    if(filter==="sn"&&r.nota!=="nao")return false;
    if(qq&&!normKey(r.desc+" "+r.nome+" "+r.cat+" "+r.obs).includes(qq))return false;
    return true;
  }).sort((a,b)=>(a[0].data||"").localeCompare(b[0].data||"")||a[1]-b[1]).map(x=>x[0]);
}
function renderList(){
  if(!S)return;
  const v=visible();
  $("#rows").innerHTML=v.length?v.map(rowHTML).join(""):`<div class="empty">${S.rows.length?"Nenhum lançamento neste filtro.":"Nenhum lançamento ainda. Importe o extrato no passo 2."}</div>`;
  renderStats();
}
function renderStats(){
  const rows=S.rows,done=rows.filter(isDone).length;
  $("#k-prog").textContent=`${done} de ${rows.length}`;
  $("#k-bar").style.width=rows.length?(done/rows.length*100)+"%":"0";
  const ent=rows.filter(r=>r.valor>0).reduce((a,r)=>a+r.valor,0),sai=rows.filter(r=>r.valor<0).reduce((a,r)=>a-r.valor,0);
  const sn=rows.filter(r=>r.nota==="nao");
  $("#k-in").textContent=brl.format(ent);$("#k-out").textContent=brl.format(sai);
  $("#k-sn").textContent=`${brl.format(sn.reduce((a,r)=>a+Math.abs(r.valor),0))} (${sn.length})`;
  const counts={todos:rows.length,pend:rows.length-done,pag:rows.filter(r=>r.valor<0).length,rec:rows.filter(r=>r.valor>0).length,sn:sn.length};
  const names={todos:"Todos",pend:"Pendentes",pag:"Pagamentos",rec:"Recebimentos",sn:"Sem nota"};
  $("#chips").innerHTML=Object.keys(names).map(k=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${filter===k}">${names[k]}<b>${counts[k]}</b></button>`).join("");
  renderSummary();
}
function renderNames(){const set=new Set(S.rows.map(r=>String(r.nome||"").trim()).filter(Boolean));$("#dl-nomes").innerHTML=[...set].sort().map(n=>`<option value="${esc(n)}">`).join("")}
function replaceRow(r){const el=$(`#rows [data-id="${r.id}"]`);if(el)el.outerHTML=rowHTML(r);renderStats();save()}
function findRow(el){const a=el.closest(".row");return a?S.rows.find(r=>r.id===a.dataset.id):null}
$("#chips").addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(!b)return;filter=b.dataset.f;renderList()});
$("#q").addEventListener("input",e=>{q=e.target.value;renderList()});
$("#f-conta").addEventListener("change",e=>{fconta=e.target.value;renderList()});
const rowsEl=$("#rows");
rowsEl.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;const r=findRow(b);if(!r)return;const act=b.dataset.act;
  if(act==="nota"){r.nota=r.nota===b.dataset.v?"":b.dataset.v;replaceRow(r)}
  else if(act==="tipo"){r.valor=-r.valor;if(r.cat&&!(PREFS.cats[tipoOf(r)]||[]).includes(r.cat))r.cat="";replaceRow(r)}
  else if(act==="sim"){const k=normKey(r.desc),t=tipoOf(r);let n=0;
    for(const o of S.rows){if(o===r||tipoOf(o)!==t||normKey(o.desc)!==k||isDone(o))continue;
      if(!o.nota&&r.nota)o.nota=r.nota;if(!o.cat&&r.cat)o.cat=r.cat;if(!String(o.nome||"").trim()&&r.nome)o.nome=r.nome;n++}
    save();renderList();showStatus(`Classificação repetida em ${n} lançamento${n>1?"s":""}.`,"ok")}
  else if(act==="del"){if(b.dataset.confirm){S.rows=S.rows.filter(x=>x!==r);save();renderContas();renderList();return}
    b.dataset.confirm="1";b.textContent="Confirmar exclusão";setTimeout(()=>{if(b.isConnected){delete b.dataset.confirm;b.textContent="Excluir"}},3500)}
});
rowsEl.addEventListener("input",e=>{
  const k=e.target.dataset.k;if(!k||e.target.value==="__new__")return;const r=findRow(e.target);if(!r)return;
  r[k]=e.target.value;const art=e.target.closest(".row"),done=isDone(r);
  art.dataset.state=done?"ok":"pend";art.querySelector(".r-state").textContent=done?"Classificado":"Pendente";renderStats();save();
});
rowsEl.addEventListener("change",e=>{
  if(e.target.dataset.k==="cat"&&e.target.value==="__new__"){const r=findRow(e.target);if(!r)return;
    const n=(prompt("Nome da nova categoria de "+(tipoOf(r)==="pag"?"pagamento":"recebimento")+":")||"").trim();
    if(n){const l=PREFS.cats[tipoOf(r)];if(!l.includes(n))l.push(n);savePrefs();r.cat=n;renderCats()}replaceRow(r);return}
  if(e.target.dataset.k==="nome"||e.target.dataset.k==="cat"){renderNames();const r=findRow(e.target);if(r){const id=document.activeElement&&document.activeElement.id;replaceRow(r);if(id&&document.getElementById(id))document.getElementById(id).focus()}}
});
function showStatus(msg,kind){const s=$("#status");s.hidden=false;s.className="status"+(kind?" "+kind:"");s.innerHTML=msg}

/* ---------- inclusão de lançamentos ---------- */
function suggest(r){if(r.cat)return;for(const[re,t,c]of RULES){if(re.test(r.desc)&&tipoOf(r)===t&&(PREFS.cats[t]||[]).includes(c)){r.cat=c;return}}}
const rowKey=r=>r.fitid?("F"+r.conta+"|"+r.fitid):(r.conta+"|"+r.data+"|"+Number(r.valor).toFixed(2)+"|"+normKey(r.desc));
function addRows(list){
  const keys=new Set(S.rows.map(rowKey));let add=0,dup=0;
  for(const r of list){
    if(!r.data||!isFinite(r.valor)||r.valor===0)continue;
    const k=rowKey(r);if(keys.has(k)){dup++;continue}keys.add(k);
    const row=Object.assign({id:uid(),nota:"",numNota:"",cat:"",nome:"",obs:""},r);suggest(row);S.rows.push(row);add++;
  }
  if(!S.empresa.competencia&&S.rows.length){const d=S.rows.map(r=>r.data).sort();S.empresa.competencia=d[d.length-1].slice(0,7);$("#emp-comp").value=S.empresa.competencia}
  save();filter="todos";renderNames();renderContas();renderList();
  return{add,dup};
}

/* ---------- leitura de arquivos ---------- */
async function readText(file){const buf=await file.arrayBuffer();try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(e){return new TextDecoder("windows-1252").decode(buf)}}
function parseNum(v){
  if(typeof v==="number")return v;let s=String(v??"").trim();if(!s)return NaN;let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}if(/-/.test(s))neg=true;if(/\bD\s*$/i.test(s))neg=true;
  s=s.replace(/R\$|\s|[+-]|[DC]$/gi,"");const lc=s.lastIndexOf(","),ld=s.lastIndexOf(".");
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"")}
  else if(lc>-1){s=s.replace(/\./g,"").replace(",",".")}
  else if(ld>-1&&/^\d{1,3}(\.\d{3})+$/.test(s)){s=s.replace(/\./g,"")}
  const n=parseFloat(s);return isNaN(n)?NaN:(neg?-Math.abs(n):n);
}
function validISO(y,m,d){y=+y;m=+m;d=+d;if(y<100)y+=2000;if(m<1||m>12||d<1||d>31||y<1990||y>2100)return"";return`${y}-${pad(m)}-${pad(d)}`}
function parseDate(v,yF){
  if(typeof v==="number"&&v>20000&&v<90000){const p=XLSX.SSF.parse_date_code(v);return p?validISO(p.y,p.m,p.d):""}
  if(v instanceof Date&&!isNaN(v))return validISO(v.getFullYear(),v.getMonth()+1,v.getDate());
  const s=String(v??"").trim();let m;
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return validISO(m[1],m[2],m[3]);
  if((m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/)))return validISO(m[3]||yF,m[2],m[1]);
  return"";
}
const fallbackYear=()=>{const c=S.empresa.competencia;return c?+c.slice(0,4):new Date().getFullYear()};

/* OFX */
function parseOFX(text){
  const tag=(b,n)=>{const m=b.match(new RegExp("<"+n+">([^<\\r\\n]*)","i"));return m?m[1].trim():""};
  const bank=tag(text,"BANKID"),branch=tag(text,"BRANCHID"),acct=tag(text,"ACCTID"),org=tag(text,"ORG");
  const bn=BANCOS[parseInt(bank,10)]||org||(bank?"Banco "+bank:"Banco");
  const nome=[bn,branch?"ag. "+branch:"",acct?"c/c "+acct:""].filter(Boolean).join(" · ");
  const rows=[];
  for(const part of text.split(/<STMTTRN>/i).slice(1)){
    const b=part.split(/<\/STMTTRN>/i)[0];const dt=tag(b,"DTPOSTED").slice(0,8);
    const data=dt.length===8?validISO(dt.slice(0,4),dt.slice(4,6),dt.slice(6,8)):"";
    const valor=parseFloat(tag(b,"TRNAMT").replace(",","."));
    const desc=[...new Set([tag(b,"MEMO"),tag(b,"NAME")].filter(Boolean))].join(" · ")||tag(b,"TRNTYPE");
    rows.push({data,valor:Math.round(valor*100)/100,desc,fitid:tag(b,"FITID")});
  }
  return{conta:{nome,chave:(bank||org)+"|"+acct},rows};
}

/* PDF */
function loadScript(src){return new Promise((ok,err)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>err(new Error("Falha ao carregar "+src));document.head.appendChild(s)})}
let pdfReady=null;
function loadPdfJs(){
  if(!pdfReady)pdfReady=(async()=>{
    if(!window.pdfjsLib)await loadScript(new URL("assets/lib/pdf.min.js",document.baseURI).href);
    if(!window.pdfjsLib?.getDocument)throw new Error("Biblioteca PDF indisponível. Atualize a página com Ctrl+F5.");
    const embedded=document.getElementById("pdf-worker-source");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=embedded
      ? URL.createObjectURL(new Blob([embedded.textContent],{type:"text/javascript"}))
      : new URL("assets/lib/pdf.worker.min.js",document.baseURI).href;
  })().catch(error=>{pdfReady=null;throw error});
  return pdfReady;
}
async function pdfLines(file){
  await loadPdfJs();
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  const lines=[];
  for(let p=1;p<=pdf.numPages;p++){
    const tc=await (await pdf.getPage(p)).getTextContent();
    const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],w:i.width,s:i.str}));
    items.sort((a,b)=>b.y-a.y||a.x-b.x);let cur=null;
    for(const it of items){if(!cur||Math.abs(cur.y-it.y)>3){cur={y:it.y,items:[]};lines.push(cur)}cur.items.push(it)}
  }
  return lines.map(l=>{l.items.sort((a,b)=>a.x-b.x);let t="",end=null;for(const it of l.items){if(end!==null&&it.x-end>1)t+=it.x-end>12?"   ":" ";t+=it.s;end=it.x+it.w}return t.replace(/\s+$/,"")});
}
const MONEY=/(^|\s)([-+])?\s?(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?:\s?([-+]|[DC])(?=\s|$|\*))?/g;
const DEB=/\b(PAG|PGTO|PAGTO|PAGAMENTO|DEB|D[EÉ]BITO|TARIFA|TAR|SAQUE|ENVIAD[OA]?|ENVIO|COMPRA|IOF|JUROS|APLIC|EMITID[OA])/i;
const CRED=/\b(RECEB|RECEBID[OA]|CRED|CR[EÉ]DITO|DEP[OÓ]SITO|RESGATE|RENDIMENTO|ESTORNO|DEVOLU)/i;
async function parsePDF(file){
  const texts=await pdfLines(file);const all=texts.join("\n");
  if(all.replace(/\s/g,"").length<30)throw new Error("Este PDF não tem texto legível (provavelmente é uma imagem escaneada). Peça ao banco o extrato em OFX ou Excel.");
  const ym=all.match(/\b\d{2}\/\d{2}\/(20\d{2})\b/);const yF=ym?+ym[1]:fallbackYear();
  const out=[];let lastDate="",pendDesc="";
  for(const raw of texts){
    let line=raw.trim();
    const dm=line.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?(?=\s|$)/);let date="";
    if(dm){date=validISO(dm[3]||yF,dm[2],dm[1]);if(date)line=line.slice(dm[0].length).trim()}
    const vals=[];let m;MONEY.lastIndex=0;while((m=MONEY.exec(line)))vals.push({sign:m[2]||"",num:m[3],suf:m[4]||"",raw:m[0]});
    let desc=line;for(const v of vals)desc=desc.replace(v.raw.trim(),"");
    desc=desc.replace(/\s{2,}/g," ").replace(/^[\s\-|*]+|[\s\-|*]+$/g,"").trim();
    if(date&&!vals.length){lastDate=date;pendDesc=desc;continue}
    if(!vals.length)continue;
    if(!date){if(!lastDate)continue;date=lastDate}else lastDate=date;
    if(!desc&&pendDesc)desc=pendDesc;pendDesc="";
    if(!desc||/saldo|s\s*a\s*l\s*d\s*o|total|limite/i.test(desc))continue;
    const v=vals[0];const n=parseNum(v.num);let sign=0;
    if(v.sign==="-"||v.suf==="-"||/^D$/i.test(v.suf))sign=-1;else if(v.sign==="+"||v.suf==="+"||/^C$/i.test(v.suf))sign=1;
    if(!sign)sign=DEB.test(desc)?-1:CRED.test(desc)?1:-1;
    out.push({data:date,valor:sign*Math.abs(n),desc});
  }
  return out;
}

/* Planilha / CSV */
let mapCtx=null;
const KW={data:/^(data|dt\.?|date)\b|data\s+(do\s+)?(lan|mov)/i,desc:/hist[oó]rico|descri|lan[cç]amento|memo|detalhe|estabelec/i,valor:/^valor(\s*\(r\$\))?$|^valor\s+(do\s+)?lan|montante|quantia|^amount$/i,deb:/d[eé]bito|sa[ií]da/i,cred:/cr[eé]dito|entrada/i,dc:/^(d\/c|c\/d|natureza|tipo)$/i};
async function parseSheet(file){
  const ext=file.name.split(".").pop().toLowerCase();let wb;
  if(ext==="csv"||ext==="txt"){const text=await readText(file);const first=text.split(/\r?\n/).slice(0,10).join("\n");const cnt=c=>first.split(c).length;
    const FS=[";","\t",","].sort((a,b)=>cnt(b)-cnt(a))[0];wb=XLSX.read(text,{type:"string",raw:true,FS})}
  else wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:"array"});
  if(wb.SheetNames.includes("Lançamentos")){const aoa=XLSX.utils.sheet_to_json(wb.Sheets["Lançamentos"],{header:1,raw:true,defval:""});if(aoa[0]&&aoa[0].includes("Possui nota?"))return restore(wb,aoa)}
  let best=null;for(const n of wb.SheetNames){const a=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:""});if(!best||a.length>best.length)best=a}
  const aoa=(best||[]).filter(r=>r.some(c=>String(c).trim()!==""));if(!aoa.length)throw new Error("A planilha está vazia.");
  let hi=-1;
  for(let i=0;i<Math.min(40,aoa.length);i++){const cells=aoa[i].map(c=>String(c).trim());if(cells.some(c=>KW.data.test(c))&&cells.filter(c=>Object.values(KW).some(re=>re.test(c))).length>=2){hi=i;break}}
  const width=Math.max(...aoa.slice(0,60).map(r=>r.length));
  const heads=[];for(let c=0;c<width;c++){const h=hi>=0?String(aoa[hi][c]??"").trim():"";heads.push(h||("Coluna "+XLSX.utils.encode_col(c)))}
  const data=aoa.slice(hi+1);
  const pick=re=>{const i=heads.findIndex(h=>re.test(h));return i<0?"":String(i)};
  const sel={data:pick(KW.data),desc:pick(KW.desc),valor:pick(KW.valor),deb:pick(KW.deb),cred:pick(KW.cred),dc:pick(KW.dc)};
  if(sel.valor!==""){sel.deb="";sel.cred=""}
  if(sel.data===""){for(let c=0;c<width;c++){if(data.slice(0,8).filter(r=>parseDate(r[c],2000)).length>=3){sel.data=String(c);break}}}
  mapCtx={heads,data,file:file.name};
  const opts=`<option value="">(nenhuma)</option>`+heads.map((h,i)=>`<option value="${i}">${esc(h)}</option>`).join("");
  const ids={data:"m-data",desc:"m-desc",valor:"m-valor",deb:"m-deb",cred:"m-cred",dc:"m-dc"};
  for(const k in ids){const s=$("#"+ids[k]);s.innerHTML=opts;s.value=sel[k]}
  $("#map-title").innerHTML=`<b>${esc(file.name)}</b>: confira quais colunas correspondem a data, descrição e valor. Use "Valor (único)" quando houver uma só coluna com sinal, ou "Débito" e "Crédito" quando forem separadas.`;
  $("#map-prev").innerHTML=`<tr>${heads.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>`+data.slice(0,6).map(r=>`<tr>${heads.map((_,i)=>`<td>${esc(r[i])}</td>`).join("")}</tr>`).join("");
  $("#map").hidden=false;showStatus("Planilha carregada. Confirme as colunas abaixo.");
  return new Promise(res=>{mapCtx.done=res});
}
$("#map-cancel").addEventListener("click",()=>{$("#map").hidden=true;if(mapCtx&&mapCtx.done)mapCtx.done(null);mapCtx=null;$("#status").hidden=true});
$("#map-ok").addEventListener("click",()=>{
  if(!mapCtx)return;const g=id=>$("#"+id).value===""?-1:+$("#"+id).value;
  const c={data:g("m-data"),desc:g("m-desc"),valor:g("m-valor"),deb:g("m-deb"),cred:g("m-cred"),dc:g("m-dc")};
  if(c.data<0||(c.valor<0&&c.deb<0&&c.cred<0)){showStatus("Escolha pelo menos a coluna de Data e a de Valor (ou Débito/Crédito).","warn");return}
  const yF=fallbackYear(),out=[];
  for(const r of mapCtx.data){
    const data=parseDate(r[c.data],yF);if(!data)continue;let valor;
    if(c.valor>=0)valor=parseNum(r[c.valor]);
    else{const d=c.deb>=0?parseNum(r[c.deb]):NaN,cr=c.cred>=0?parseNum(r[c.cred]):NaN;
      if(isFinite(cr)&&cr!==0)valor=Math.abs(cr);else if(isFinite(d)&&d!==0)valor=-Math.abs(d);else continue}
    if(!isFinite(valor))continue;
    if(c.dc>=0){const n=String(r[c.dc]).trim().toUpperCase();if(n.startsWith("D"))valor=-Math.abs(valor);else if(n.startsWith("C"))valor=Math.abs(valor)}
    const desc=c.desc>=0?String(r[c.desc]).trim():"";if(/saldo/i.test(desc))continue;
    out.push({data,valor:Math.round(valor*100)/100,desc:desc||"(sem descrição)"});
  }
  $("#map").hidden=true;const done=mapCtx.done;mapCtx=null;done(out);
});
function restore(wb,aoa){
  if(wb.Sheets["Empresa"]){
    const e=XLSX.utils.sheet_to_json(wb.Sheets["Empresa"],{header:1,raw:false,defval:""});
    const get=k=>{const row=e.find(x=>x[0]===k);return row?String(row[1]):""};
    const cn=digits(get("CNPJ"));
    if(LOCKED&&cn&&cn!==digits(S.empresa.cnpj))throw new Error("Esta planilha é de outra empresa (CNPJ diferente). Ela não foi importada.");
    if(!LOCKED){S.empresa.nome=S.empresa.nome||get("Empresa");S.empresa.cnpj=S.empresa.cnpj||get("CNPJ")}
    const comp=get("Competência").match(/(\d{2})\/(\d{4})/);if(comp)S.empresa.competencia=`${comp[2]}-${comp[1]}`;
    renderEmpresa();
  }
  const h=aoa[0].map(String),ix=n=>h.indexOf(n);
  const I={data:ix("Data"),desc:ix("Descrição do extrato"),valor:ix("Valor"),nota:ix("Possui nota?"),num:ix("Nº da nota"),cat:ix("Categoria"),nome:ix("Fornecedor / Cliente"),obs:ix("Observação"),conta:ix("Conta")};
  const out=[];
  for(const r of aoa.slice(1)){
    const data=parseDate(r[I.data],fallbackYear()),valor=parseNum(r[I.valor]);if(!data||!isFinite(valor))continue;
    const nt=String(r[I.nota]||"").toLowerCase();const cnome=String(I.conta>=0?r[I.conta]:"").trim()||"Conta principal";
    let ct=S.contas.find(c=>c.nome===cnome);if(!ct)ct=addConta(cnome);
    out.push({data,valor,desc:String(r[I.desc]||""),nota:nt.startsWith("s")?"sim":nt.startsWith("n")?"nao":"",numNota:String(r[I.num]??""),cat:String(r[I.cat]||""),nome:String(r[I.nome]||""),obs:String(r[I.obs]||""),conta:ct.id});
  }
  out.restored=true;return out;
}

async function handleFiles(files){
  for(const f of files){
    const ext=f.name.split(".").pop().toLowerCase();
    try{
      let list,note="";
      if(ext==="ofx"||ext==="qfx"){const o=parseOFX(await readText(f));let c=S.contas.find(x=>x.chave&&x.chave===o.conta.chave);if(!c)c=addConta(o.conta.nome,o.conta.chave);o.rows.forEach(r=>r.conta=c.id);list=o.rows;note=` Conta: ${esc(c.nome)}.`}
      else if(ext==="pdf"){showStatus(`Lendo ${esc(f.name)}…`);list=await parsePDF(f);const cid=importConta();list.forEach(r=>r.conta=cid);note=` Conta: ${esc(contaNome(cid))}. Leitura de PDF: confira datas, valores e se cada lançamento é pagamento ou recebimento (clique na etiqueta para inverter).`}
      else if(["xlsx","xls","xlsm","ods","csv","txt"].includes(ext)){list=await parseSheet(f);if(!list)continue;
        if(list.restored)note=" Classificação anterior restaurada.";else{const cid=importConta();list.forEach(r=>r.conta=cid);note=` Conta: ${esc(contaNome(cid))}.`}}
      else{showStatus(`Formato não reconhecido: ${esc(f.name)}. Use OFX, Excel, CSV ou PDF.`,"warn");continue}
      if(!list.length){showStatus(`Nenhum lançamento encontrado em ${esc(f.name)}.`,"warn");continue}
      const{add,dup}=addRows(list);
      showStatus(`<b>${esc(f.name)}</b>: ${add} lançamento${add!==1?"s":""} importado${add!==1?"s":""}${dup?`, ${dup} repetido${dup>1?"s":""} ignorado${dup>1?"s":""}`:""}.${note}`,ext==="pdf"?"warn":"ok");
    }catch(err){console.error(err);showStatus(`Não foi possível ler ${esc(f.name)}: ${esc(err.message||err)}`,"warn")}
  }
}
$("#file").addEventListener("change",e=>{handleFiles([...e.target.files]);e.target.value=""});
const drop=$("#drop");
["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>{if(e.dataTransfer.files.length)handleFiles([...e.dataTransfer.files])});

$("#n-add").addEventListener("click",()=>{
  const data=$("#n-data").value,desc=$("#n-desc").value.trim();let v=parseNum($("#n-valor").value);
  if(!data||!desc||!isFinite(v)||!v){showStatus("Para adicionar, preencha data, descrição e valor.","warn");return}
  v=Math.abs(v)*($("#n-tipo").value==="pag"?-1:1);const cid=$("#n-conta").value||importConta();
  addRows([{data,desc,valor:v,conta:cid}]);$("#n-desc").value="";$("#n-valor").value="";showStatus("Lançamento adicionado.","ok");
});
const clr=$("#btn-clear");
clr.addEventListener("click",()=>{
  if(!clr.dataset.confirm){clr.dataset.confirm="1";clr.textContent="Confirmar: apagar os lançamentos desta empresa";setTimeout(()=>{delete clr.dataset.confirm;clr.textContent="Apagar lançamentos desta empresa"},4000);return}
  delete clr.dataset.confirm;clr.textContent="Apagar lançamentos desta empresa";S.rows=[];save();renderNames();renderContas();renderList();$("#status").hidden=true;
});

/* ---------- resumo e exportação ---------- */
const compLabel=()=>{const c=S.empresa.competencia;return c?`${c.slice(5,7)}/${c.slice(0,4)}`:""};
function summaryText(){
  const rows=S.rows,done=rows.filter(isDone).length;
  const ent=rows.filter(r=>r.valor>0).reduce((a,r)=>a+r.valor,0),sai=rows.filter(r=>r.valor<0).reduce((a,r)=>a-r.valor,0);
  const sn=rows.filter(r=>r.nota==="nao");
  const L=[`Extrato Fácil – ${S.empresa.nome||"Empresa"}${S.empresa.cnpj?" ("+cnpjFmt(S.empresa.cnpj)+")":""}`,`Competência: ${compLabel()||"—"}`];
  if(S.contas.length)L.push(`Contas: ${S.contas.map(c=>c.nome).join("; ")}`);
  L.push(`Lançamentos: ${rows.length} (${done} classificados, ${rows.length-done} pendentes)`,`Recebimentos: ${brl.format(ent)}`,`Pagamentos: ${brl.format(sai)}`,`Sem nota fiscal: ${sn.length} lançamento(s), ${brl.format(sn.reduce((a,r)=>a+Math.abs(r.valor),0))}`);
  return L.join("\n");
}
function renderSummary(){$("#sumtxt").textContent=summaryText()}
$("#btn-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(summaryText());showExp("Resumo copiado.","ok")}catch(e){const r=document.createRange();r.selectNodeContents($("#sumtxt"));const s=getSelection();s.removeAllRanges();s.addRange(r);showExp("Texto selecionado. Use Ctrl+C para copiar.","")}});
function showExp(msg,kind){const w=$("#exp-warn");w.hidden=false;w.className="status"+(kind?" "+kind:"");w.innerHTML=msg}
const serial=iso=>{const[y,m,d]=iso.split("-").map(Number);return(Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000};
function buildWorkbook(){
  const wb=XLSX.utils.book_new();const rows=[...S.rows].sort((a,b)=>(a.data||"").localeCompare(b.data||""));
  const H=["Data","Descrição do extrato","Tipo","Valor","Possui nota?","Nº da nota","Categoria","Fornecedor / Cliente","Observação","Situação","Conta"];
  const line=r=>[serial(r.data),r.desc,tipoOf(r)==="pag"?"Pagamento":"Recebimento",r.valor,r.nota==="sim"?"Sim":r.nota==="nao"?"Não":"",r.numNota,r.cat,r.nome,r.obs,isDone(r)?"Classificado":"Pendente",contaNome(r.conta)];
  const sheet=(list,name)=>{const ws=XLSX.utils.aoa_to_sheet([H,...list.map(line)]);
    for(let i=1;i<=list.length;i++){const a=ws["A"+(i+1)];if(a)a.z="dd/mm/yyyy";const v=ws["D"+(i+1)];if(v)v.z="#,##0.00;[Red]-#,##0.00"}
    ws["!cols"]=[12,46,13,14,12,12,30,32,30,13,30].map(w=>({wch:w}));ws["!autofilter"]={ref:"A1:K"+(list.length+1)};XLSX.utils.book_append_sheet(wb,ws,name)};
  sheet(rows,"Lançamentos");
  const g={};
  for(const r of rows){const k=tipoOf(r)+"|"+(r.cat||"(sem categoria)");g[k]=g[k]||{t:tipoOf(r),c:r.cat||"(sem categoria)",n:0,tot:0,cn:0,sn:0,pd:0};const o=g[k];o.n++;o.tot+=Math.abs(r.valor);if(r.nota==="sim")o.cn+=Math.abs(r.valor);else if(r.nota==="nao")o.sn+=Math.abs(r.valor);else o.pd+=Math.abs(r.valor)}
  const res=[["Tipo","Categoria","Qtde","Total","Com nota","Sem nota","Nota não informada"]];
  for(const t of["rec","pag"]){const list=Object.values(g).filter(o=>o.t===t).sort((a,b)=>b.tot-a.tot);
    for(const o of list)res.push([t==="pag"?"Pagamento":"Recebimento",o.c,o.n,o.tot,o.cn,o.sn,o.pd]);
    if(list.length)res.push(["Total "+(t==="pag"?"pagamentos":"recebimentos"),"",list.reduce((a,o)=>a+o.n,0),list.reduce((a,o)=>a+o.tot,0),list.reduce((a,o)=>a+o.cn,0),list.reduce((a,o)=>a+o.sn,0),list.reduce((a,o)=>a+o.pd,0)]);res.push([])}
  const wr=XLSX.utils.aoa_to_sheet(res);for(const addr in wr){if(addr[0]==="!")continue;if(/^[D-G]\d+$/.test(addr)&&typeof wr[addr].v==="number")wr[addr].z="#,##0.00"}
  wr["!cols"]=[22,34,8,15,15,15,18].map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,wr,"Resumo por categoria");
  const rc=[["Conta","Lançamentos","Recebimentos","Pagamentos","Saldo do período","Pendentes"]];
  for(const c of S.contas){const l=rows.filter(r=>r.conta===c.id);if(!l.length)continue;const e=l.filter(r=>r.valor>0).reduce((a,r)=>a+r.valor,0),s=l.filter(r=>r.valor<0).reduce((a,r)=>a-r.valor,0);rc.push([c.nome,l.length,e,s,e-s,l.filter(r=>!isDone(r)).length])}
  const wc=XLSX.utils.aoa_to_sheet(rc);for(const addr in wc){if(/^[C-E]\d+$/.test(addr)&&typeof wc[addr].v==="number")wc[addr].z="#,##0.00;[Red]-#,##0.00"}
  wc["!cols"]=[40,12,15,15,16,10].map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,wc,"Resumo por banco");
  sheet(rows.filter(r=>r.nota==="nao"),"Sem nota");
  const pend=rows.filter(r=>!isDone(r));if(pend.length)sheet(pend,"Pendentes");
  const e=XLSX.utils.aoa_to_sheet([["Empresa",S.empresa.nome],["Nome fantasia",S.empresa.fantasia||""],["CNPJ",cnpjFmt(S.empresa.cnpj)],["Contas bancárias",S.contas.map(c=>c.nome).join("; ")],["Competência",compLabel()],["Contador",`${CONFIG.escritorio} – ${CONFIG.nome} – ${CONFIG.crc}`],["Gerado em",new Date().toLocaleString("pt-BR")],["Lançamentos",rows.length],["Classificados",rows.filter(isDone).length],["Pendentes",pend.length]]);
  e["!cols"]=[{wch:18},{wch:60}];XLSX.utils.book_append_sheet(wb,e,"Empresa");
  return wb;
}
let exportConfirmed=false;
$("#btn-export").addEventListener("click",()=>{
  if(!S.rows.length){showExp("Não há lançamentos para exportar.","warn");return}
  const pend=S.rows.filter(r=>!isDone(r)).length;
  if(pend&&!exportConfirmed){exportConfirmed=true;showExp(`Ainda há <b>${pend}</b> lançamento${pend>1?"s":""} pendente${pend>1?"s":""} (sem nota, categoria ou nome). Clique em "Baixar planilha Excel" de novo para baixar assim mesmo; os pendentes vão numa aba separada.`,"warn");setTimeout(()=>{exportConfirmed=false},15000);return}
  exportConfirmed=false;
  const out=XLSX.write(buildWorkbook(),{bookType:"xlsx",type:"array"});
  const slug=(S.empresa.fantasia||S.empresa.nome||"empresa").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,40);
  const comp=S.empresa.competencia?S.empresa.competencia.replace("-","_"):"";
  download(`ExtratoFacil_${slug}${comp?"_"+comp:""}.xlsx`,out,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  showExp("Planilha baixada. Agora é só enviar ao contador.","ok");
});

/* ---------- início ---------- */
renderContador();
(function start(){
  const h=location.hash.slice(1);
  if(!window.isSecureContext||!window.crypto||!crypto.subtle){gateMsg("Abra esta página pelo endereço https:// do site (GitHub Pages).");show("v-gate");return}
  const p=new URLSearchParams(h);
  if(p.get("acesso")){enterCode(p.get("acesso"));return}
  if(h==="escritorio"){show("v-login");return}
  show("v-gate");
})();
window.addEventListener("hashchange",()=>{const p=new URLSearchParams(location.hash.slice(1));if(p.get("acesso")){flush();enterCode(p.get("acesso"))}});
})();
