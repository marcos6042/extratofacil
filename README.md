# Extrato Fácil

Ferramenta web para o cliente classificar o extrato bancário (tem nota fiscal?, categoria, fornecedor/cliente) e enviar a planilha ao contador.

**M Machado Contábil** · Marcos Antonio dos Santos Machado · CRC SP 265642/O-7

## Arquivos

```
index.html      a página
app.js          o funcionamento (no topo: e-mail, WhatsApp e categorias padrão)
clientes.js     cadastro de clientes, CRIPTOGRAFADO (gerado pela Área do escritório)
assets/         logo, ícone e bibliotecas de leitura de Excel e PDF
.nojekyll       faz o GitHub Pages servir os arquivos sem alteração
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `extrato`).
2. **Add file → Upload files**: arraste todo o conteúdo desta pasta (inclusive `assets`) e clique em **Commit changes**.
3. **Settings → Pages**: *Deploy from a branch*, branch **main**, pasta **/(root)**, **Save**.
4. Em 1–2 minutos o endereço aparece: `https://SEU-USUARIO.github.io/extrato/`

## Como cada cliente acessa

Cada cliente tem um código próprio. O link fica assim:

```
https://SEU-USUARIO.github.io/extrato/#acesso=XXXX-XXXX-XXXX
```

Com o link, o cliente vê **somente a própria empresa**. Não há lista de clientes visível: o cadastro no `clientes.js` é criptografado e cada empresa só abre com o próprio código. Os extratos nunca saem do navegador do cliente.

## Área do escritório

Abra `https://SEU-USUARIO.github.io/extrato/#escritorio` (ou o link no rodapé) e entre com a senha do escritório. Lá você:

- vê a lista de clientes e copia o link de cada um;
- cadastra cliente novo (pode ler o cartão CNPJ em PDF);
- gera novo código para um cliente (o link antigo deixa de funcionar);
- troca a senha.

Depois de qualquer alteração, clique em **Baixar clientes.js** e substitua o arquivo no GitHub (Add file → Upload files). As mudanças só valem depois disso.

**Guarde a senha do escritório.** Sem ela não é possível abrir o cadastro; seria preciso cadastrar os clientes de novo.

## E-mail e WhatsApp

Edite o início do `app.js` no GitHub (lápis), preencha `email` e `whatsapp` e faça **Commit changes**.
