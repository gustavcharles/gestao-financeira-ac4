# 💰 Gestão Financeira AC-4

Sistema web para controle financeiro inteligente, focado em gerenciamento de orçamentos e fluxo de caixa (Regime de Competência).

🔗 **Acesse Online:** [https://gestao-financeira-ac4.streamlit.app/](https://gestao-financeira-ac4.streamlit.app/)

## ✨ Funcionalidades

*   **Dashboard Interativo:** Visão geral de saldo, receitas e despesas por competência.
*   **Lançamentos Inteligentes:**
    *   Formulário "Mobile First" rápido e fácil.
    *   **Regra de Salário:** Aloca automaticamente o salário recebido no mês X para o orçamento do mês X+1.
    *   **Regra AC-4:** Aloca automaticamente o serviço do mês X para o recebimento/orçamento do mês X+2.
*   **Gestão de Despesas:** Controle detalhado com categorização e alertas visuais.
*   **Integração Web:** Funciona como um app nativo no celular (PWA).
*   **Banco de Dados na Nuvem:** Todos os dados são salvos com segurança no Google Firebase.

## 🚀 Como rodar localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/gustavcharles/gestao-financeira-ac4.git
    cd gestao-financeira-ac4
    ```

2.  Crie um ambiente virtual e instale as dependências:
    ```bash
    python -m venv .venv
    .venv\Scripts\activate  # Windows
    pip install -r requirements.txt
    ```

3.  Configure os Segredos:
    *   Crie uma pasta `.streamlit`
    *   Crie um arquivo `.streamlit/secrets.toml` com suas credenciais do Firebase.

4.  Execute o app:
    ```bash
    streamlit run app.py
    ```

## 🛠️ Tecnologias
*   Python 3.10+
*   Streamlit
*   Pandas & Plotly
*   Google Firebase (Firestore)

---
*Desenvolvido para gestão financeira pessoal otimizada.*
