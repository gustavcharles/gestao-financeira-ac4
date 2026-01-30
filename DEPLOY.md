# Guia de Deploy - Gestão Financeira AC-4

Este guia explica como colocar seu app online para acessar de qualquer lugar (Web App).

## Pré-requisitos
*   Uma conta no **GitHub** (github.com).
*   Uma conta no **Streamlit Cloud** (streamlit.io).

## Passo 1: Preparar o Repositório Git
O Streamlit Cloud lê o código diretamente do GitHub.

1.  Crie um novo repositório no GitHub chamado `gestao-financeira-ac4`.
2.  No seu computador (onde estão os arquivos), inicialize o git e suba os arquivos:
    ```bash
    git init
    git add .
    git commit -m "Upload inicial do App"
    git branch -M main
    git remote add origin https://github.com/gustavcharles/gestao-financeira-ac4.git
    git push -u origin main
    ```
    *(Troque SEU_USUARIO pelo seu nome de usuário do GitHub)*.

## Passo 2: Deploy no Streamlit Cloud
1.  Acesse [share.streamlit.io](https://share.streamlit.io/).
2.  Clique em **"New app"**.
3.  Selecione o repositório `gestao-financeira-ac4`.
4.  **Main file path:** `app.py`.
5.  Clique em **"Advanced settings"** (Avançado).

## Passo 3: Configurar os Segredos (Firebase)
Esta é a parte mais importante. Não subimos o arquivo `.streamlit/secrets.toml` para o GitHub por segurança (ele deve estar no `.gitignore`). Precisamos colocar as chaves no Streamlit Cloud manualmente.

1.  Na tela de configurações avançadas do Streamlit Cloud, procure a área **"Secrets"**.
2.  Copie TODO o conteúdo do seu arquivo local `c:/Users/Usuario/gestão-financeira-ac4/.streamlit/secrets.toml`.
3.  Cole na caixa de texto do Secrets no site.
4.  Deve ficar parecido com isso:
    ```toml
    [firebase]
    type = "service_account"
    project_id = "..."
    ...
    ```
5.  Clique em **Save**.

## Passo 4: Finalizar
1.  Clique em **"Deploy!"**.
2.  Aguarde alguns minutos enquanto o Streamlit instala as dependências (que estão no arquivo `requirements.txt`).
3.  Pronto! Você receberá um link (ex: `https://gestao-ac4.streamlit.app`) para usar no seu celular ou computador.

## Dicas para Mobile (PWA)
*   **Android (Chrome):** Abra o link, clique nos 3 pontinhos > **"Adicionar à tela inicial"**. Ele vai parecer um app nativo.
*   **iPhone (Safari):** Abra o link, clique em Compartilhar > **"Adicionar à Tela de Início"**.
