# Configuração do Firebase para Gestão Financeira

Para que o aplicativo funcione e salve os dados na nuvem, você precisa configurar o Firebase e adicionar as credenciais ao Streamlit.

## 1. Criar Projeto no Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com/).
2. Clique em **"Adicionar projeto"**.
3. Dê um nome ao projeto (ex: `gestao-ac4`) e continue (pode desativar o Google Analytics para este teste).

## 2. Configurar o Firestore Database
1. No menu lateral esquerdo, clique em **Criação** > **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha um local (ex: `nam5 (us-central)` ou `sao-paulo` se disponível).
4. **Importante:** Nas regras de segurança, escolha **"Iniciar no modo de teste"** (Start in test mode).
   * *Nota: Isso permite leitura/escrita por 30 dias. Para produção, configure as regras corretamente.*

## 3. Gerar Chave Privada (JSON)
1. No menu lateral, clique na engrenagem ⚙️ (ao lado de "Visão geral do projeto") > **Configurações do projeto**.
2. Vá na aba **Contas de serviço**.
3. Clique em **Gerar nova chave privada**.
4. Um arquivo `.json` será baixado para o seu computador.

## 4. Configurar Secrets no Streamlit (Localmente)

Se você estiver rodando localmente:

1. Crie uma pasta chamada `.streamlit` na raiz do seu projeto.
2. Crie um arquivo chamado `secrets.toml` dentro dessa pasta.
3. Abra o arquivo JSON que você baixou.
4. Copie o conteúdo e formate-o dentro do `secrets.toml` seguindo o padrão TOML.

O arquivo `secrets.toml` deve ficar assim:

```toml
[firebase]
type = "service_account"
project_id = "seu-project-id"
private_key_id = "seu-private-key-id"
private_key = "-----BEGIN PRIVATE KEY-----\nSuaChaveGiganteAqui...\n-----END PRIVATE KEY-----\n"
client_email = "firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com"
client_id = "seu-client-id"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/..."
```

**Dica:** Copie cada campo do JSON para a chave correspondente no `secrets.toml` sob o cabeçalho `[firebase]`.

## 5. Rodar o App
No terminal, execute:
```bash
streamlit run app.py
```
