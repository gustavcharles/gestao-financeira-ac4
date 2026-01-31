import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date
import uuid
from streamlit_option_menu import option_menu
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
from fpdf import FPDF
import matplotlib.pyplot as plt
import io
import html
import requests

# --- HELPER FUNCTIONS ---
def format_currency(value):
    """Formata valor para padrão BRL (R$ 1.234,56)"""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

# --- AUTH & CONFIG ---
if "firebase_web" in st.secrets:
    FIREBASE_WEB_API_KEY = st.secrets["firebase_web"]["api_key"]
else:
    FIREBASE_WEB_API_KEY = None

def login_user(email, password):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    res = requests.post(url, json=payload)
    if res.status_code == 200:
        return res.json()
    else:
        return {"error": res.json()}

def register_user(email, password):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_WEB_API_KEY}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    res = requests.post(url, json=payload)
    if res.status_code == 200:
        return res.json()
    else:
        return {"error": res.json()}

def auth_screen():
    # --- CUSTOM LOGIN CSS ---
    st.markdown("""
        <style>
        .login-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 40px 30px;
            background: #FFFFFF;
            border-radius: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .login-logo {
            font-size: 3rem; 
            margin-bottom: 10px;
            color: #2563EB;
        }
        .login-title {
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 1.8rem;
            color: #1E293B;
            margin-bottom: 5px;
        }
        .login-subtitle {
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            color: #64748B;
            margin-bottom: 30px;
        }
        /* Style Streamlit Widgets inside centered column */
        .stTextInput input {
            border-radius: 12px;
            padding: 10px 12px;
            border: 1px solid #E2E8F0;
            background-color: #F8FAFC;
            color: #1E293B !important; 
        }
        .stTextInput input:focus {
            border-color: #2563EB;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        div[data-testid="stForm"] {
            border: none;
            padding: 0;
        }
        /* Configurando botão Primário do Form (Entrar) - Forçando Seletor Genérico */
        div[data-testid="stForm"] button {
            background-color: #2563EB !important;
            border-color: #2563EB !important;
            color: white !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
        }
        div[data-testid="stForm"] button:hover {
            background-color: #1D4ED8 !important;
            border-color: #1D4ED8 !important;
            color: white !important;
        }
        div[data-testid="stForm"] button:active, div[data-testid="stForm"] button:focus {
            background-color: #1E40AF !important;
            border-color: #1E40AF !important;
            color: white !important;
        }
        
        /* Mobile Layout Fixes - Strong Override */
        /* Mobile Layout Fixes - Advanced Targeting */
        @media only screen and (max-width: 900px) {
            
            /* Target the wrapper of the marker, then select the immediate next wrapper which contains the columns */
            div[data-testid="element-container"]:has(.mobile-row-fix) + div[data-testid="element-container"] [data-testid="stHorizontalBlock"],
            div[data-testid="stMarkdownContainer"]:has(.mobile-row-fix) + div[data-testid="stHorizontalBlock"] {
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                width: 100% !important;
                gap: 4px !important;
            }

            div[data-testid="element-container"]:has(.mobile-row-fix) + div[data-testid="element-container"] [data-testid="column"],
            div[data-testid="stMarkdownContainer"]:has(.mobile-row-fix) + div[data-testid="stHorizontalBlock"] [data-testid="column"] {
                min-width: 0 !important;
                width: auto !important;
                flex: 1 1 auto !important;
                padding: 0 1px !important;
            }
            
            /* Button Sizing */
            button {
                padding: 0.2rem 0.4rem !important;
            }
        }
        </style>
    """, unsafe_allow_html=True)

    if not FIREBASE_WEB_API_KEY:
        st.error("⚠️ Erro de Configuração: API Key não encontrada no secrets.toml")
        return

    # Layout Centered
    c1, c2, c3 = st.columns([1, 2, 1])
    
    with c2:
        # Toggle Login vs Register (using session state to switch "modes" inside the same card feel)
        if "auth_mode" not in st.session_state: st.session_state["auth_mode"] = "login"

        # Header Area
        st.markdown(f"""
            <div style="text-align: center; margin-bottom: 20px;">
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="color: #2563EB; font-weight: bold;">🛡️</div>
                    <div style="color: #64748B; font-size: 0.8rem; font-weight: 600;">SEGURO</div>
                 </div>
                 <div style="background: #EFF6FF; width: 60px; height: 60px; border-radius: 30px; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #2563EB;">
                    🛡️
                 </div>
                 <h1 style="font-size: 1.6rem; font-weight: 800; color: #1E293B; margin: 0;">Gestão AC-4</h1>
                 <p style="color: #64748B; font-size: 0.9rem;">Acesse sua conta para gerenciar as finanças</p>
            </div>
        """, unsafe_allow_html=True)

        if st.session_state["auth_mode"] == "login":
            with st.form("login_form"):
                email = st.text_input("E-mail ou Usuário", placeholder="exemplo@ac4.com")
                password = st.text_input("Senha", type="password", placeholder="••••••••")
                
                submitted = st.form_submit_button("Entrar", type="primary", use_container_width=True)
                
                if submitted:
                    if not email or not password:
                        st.warning("Preencha todos os campos.")
                    else:
                        login_success = False
                        try:
                            resp = login_user(email, password)
                            if "error" in resp:
                                st.error("Falha no login. Verifique suas credenciais.")
                            else:
                                st.session_state['user_info'] = resp
                                login_success = True
                        except Exception as e:
                            st.error(f"Erro de conexão: {e}")
                            
                        if login_success:
                            st.rerun()
            
            st.markdown("""
                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.85rem;">
                    <label style="color: #64748B;"><input type="checkbox"> Lembrar de mim</label>
                    <a href="#" style="color: #2563EB; text-decoration: none; font-weight: 600;">Esqueceu a senha?</a>
                </div>
            """, unsafe_allow_html=True)
            
            st.markdown("---")
            if st.button("Ainda não tem acesso? **Crie sua conta**", type="tertiary", use_container_width=True):
                st.session_state["auth_mode"] = "register"
                st.rerun()

        else: # Register Mode
            with st.form("register_form"):
                new_email = st.text_input("E-mail")
                new_pass = st.text_input("Senha", type="password")
                new_pass_conf = st.text_input("Confirmar Senha", type="password")
                
                submitted_reg = st.form_submit_button("Criar Conta", type="primary", use_container_width=True)
                
                if submitted_reg:
                    if new_pass != new_pass_conf:
                        st.error("Senhas não conferem.")
                    else:
                        resp = register_user(new_email, new_pass)
                        if "error" in resp:
                             st.error("Erro ao criar conta.")
                        else:
                            st.success("Conta criada! Voltando para login...")
                            st.session_state["auth_mode"] = "login"
                            st.rerun()
            
            if st.button("Já tem uma conta? **Fazer Login**", type="tertiary", use_container_width=True):
                 st.session_state["auth_mode"] = "login"
                 st.rerun()

        st.markdown("""
            <div style="text-align: center; margin-top: 30px; font-size: 0.75rem; color: #94A3B8; font-weight: 600; letter-spacing: 1px;">
                <span style="opacity: 0.7;">🛡️ SEGURANÇA CRIPTOGRAFADA AC-4</span>
            </div>
        """, unsafe_allow_html=True)

# --- FUNÇÃO DE SANITIZAÇÃO ---
def sanitize_input(text):
    if text:
        return html.escape(text.strip())
    return text

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(
    page_title="Gestão AC-4",
    page_icon="🛡️",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# --- TOAST MANAGER (Mostra msgs após rerun) ---
if "toast_msg" in st.session_state:
    msg = st.session_state["toast_msg"]
    icon = st.session_state.get("toast_icon", "✅")
    st.toast(msg, icon=icon)
    del st.session_state["toast_msg"]
    if "toast_icon" in st.session_state: del st.session_state["toast_icon"]

# --- UTILS E CONSTANTES ---
MAPA_MESES = {
    "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4,
    "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8,
    "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
}

TEMAS = {
    "Azul Padrão": {"PRIMARY": "#3B82F6", "SUCCESS": "#10B981", "DANGER": "#EF4444"},
    "Verde Militar": {"PRIMARY": "#2F855A", "SUCCESS": "#48BB78", "DANGER": "#E53E3E"},
    "Roxo Noturno": {"PRIMARY": "#805AD5", "SUCCESS": "#9F7AEA", "DANGER": "#F56565"},
    "Laranja Outono": {"PRIMARY": "#DD6B20", "SUCCESS": "#38A169", "DANGER": "#C53030"}
}

# --- STATE & DB (Moved up for Color Logic) ---
def init_state():
    if 'mock_data' not in st.session_state:
        st.session_state['mock_data'] = [
            {"id": "1", "tipo": "Receita", "data": date(2026, 1, 15), "mes_referencia": "Janeiro 2026", "categoria": "Salário", "descricao": "Salário Mensal", "valor": 8500.00, "status": "Recebido"},
            {"id": "2", "tipo": "Despesa", "data": date(2026, 1, 10), "mes_referencia": "Janeiro 2026", "categoria": "Aluguel", "descricao": "Pagamento Aluguel", "valor": 2200.00, "status": "Pago"},
            {"id": "3", "tipo": "Receita", "data": date(2026, 1, 12), "mes_referencia": "Janeiro 2026", "categoria": "AC-4", "descricao": "Reforço Op.", "valor": 1200.00, "status": "Recebido"},
            {"id": "4", "tipo": "Despesa", "data": date(2026, 1, 18), "mes_referencia": "Janeiro 2026", "categoria": "Energia", "descricao": "Enel", "valor": 350.50, "status": "Pendente"},
            {"id": "5", "tipo": "Despesa", "data": date(2026, 1, 20), "mes_referencia": "Janeiro 2026", "categoria": "Internet", "descricao": "Claro Fibra", "valor": 120.00, "status": "Pago"},
        ]
    if 'config_categorias' not in st.session_state:
        st.session_state['config_categorias'] = {
            "receita": ["Salário", "AC-4", "Renda Extra", "Outros"],
            "despesa": ["Aluguel", "Energia", "Consórcio", "IPASGO", "Saneago", "Internet", "Cartão", "Outros"]
        }
    if 'dark_mode' not in st.session_state:
        st.session_state['dark_mode'] = False

    if 'limit_rec' not in st.session_state:
        st.session_state['limit_rec'] = 10
    if 'limit_desp' not in st.session_state:
        st.session_state['limit_desp'] = 10
        
    if 'theme_choice' not in st.session_state:
        st.session_state['theme_choice'] = "Azul Padrão"

init_state()

# Cores do Design (Dinâmicas)
theme = TEMAS.get(st.session_state.get('theme_choice', "Azul Padrão"), TEMAS["Azul Padrão"])

if st.session_state['dark_mode']:
    COLOR_BG = "#0F172A"
    COLOR_PRIMARY = theme["PRIMARY"]
    COLOR_SUCCESS = theme["SUCCESS"]
    COLOR_DANGER = theme["DANGER"]
    COLOR_TEXT = "#FFFFFF"
    COLOR_TEXT_LIGHT = "#CBD5E1"
    COLOR_CARD_BG = "#1E293B"
    COLOR_BORDER = "#334155"
    COLOR_BTN_POPOVER = "#334155" # Darker visible button for Dark Mode
else:
    COLOR_BG = "#F8FAFC"
    COLOR_PRIMARY = theme["PRIMARY"]
    COLOR_SUCCESS = theme["SUCCESS"]
    COLOR_DANGER = theme["DANGER"]
    COLOR_TEXT = "#1E293B"
    COLOR_TEXT_LIGHT = "#64748B"
    COLOR_CARD_BG = "#FFFFFF"
    COLOR_BORDER = "#E2E8F0"
    COLOR_BTN_POPOVER = theme["PRIMARY"] # Default primary for Light Mode

# --- CSS CUSTOMIZADO (VISUAL DESIGN) ---
st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Reset Geral */
    .stApp {{
        background-color: {COLOR_BG};
        color: {COLOR_TEXT};
        font-family: 'Inter', sans-serif;
    }}
    
    /* Remover Padding padrão do Streamlit para Header */
    .block-container {{
        padding-top: 5rem;
        padding-bottom: 5rem;
    }}

    /* Header e Navegação */
    h1, h2, h3, h4, h5, h6 {{
        font-family: 'Inter', sans-serif;
        color: {COLOR_TEXT};
        font-weight: 700;
        letter-spacing: -0.5px;
    }}
    
    /* CARD STYLE - O elemento central do design */
    .custom-card {{
        background-color: {COLOR_CARD_BG};
        border-radius: 24px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        margin-bottom: 20px;
        border: 1px solid {COLOR_BORDER};
    }}
    
    .metric-label {{
        color: {COLOR_TEXT_LIGHT};
        font-size: 0.85rem;
        font-weight: 500;
        margin-bottom: 5px;
    }}
    
    .metric-value {{
        color: {COLOR_TEXT};
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 5px;
    }}
    
    .metric-delta {{
        font-size: 0.8rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
    }}
    
    .delta-pos {{ color: {COLOR_SUCCESS}; background: #ECFDF5; padding: 2px 8px; border-radius: 12px; display: inline-block; }}
    .delta-neg {{ color: {COLOR_DANGER}; background: #FEF2F2; padding: 2px 8px; border-radius: 12px; display: inline-block; }}

    /* Lista de Transações */
    .tx-row {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #F1F5F9;
    }}
    .tx-row:last-child {{ border-bottom: none; }}
    
    .tx-date-box {{
        background: #F1F5F9;
        color: {COLOR_PRIMARY};
        border-radius: 12px;
        width: 50px;
        height: 50px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-weight: 700;
        font-size: 0.8rem;
        margin-right: 15px;
    }}
    
    .tx-details {{ flex-grow: 1; }}
    .tx-title {{ font-weight: 600; color: {COLOR_TEXT}; font-size: 0.95rem; }}
    .tx-cat {{ color: {COLOR_TEXT_LIGHT}; font-size: 0.8rem; }}
    
    .tx-amount {{ font-weight: 700; font-size: 0.95rem; text-align: right; }}
    .tx-pos {{ color: {COLOR_SUCCESS}; }}
    .tx-neg {{ color: {COLOR_DANGER}; }}
    
    /* Configuração do Option Menu para parecer Nav Bar */
    .nav-link {{
        border-radius: 12px !important;
        margin: 5px !important;
    }}

    /* Barra de Progresso Customizada (para Despesas) */
    .prog-bar {{
        background: #F1F5F9;
        border-radius: 8px;
        height: 8px;
        width: 100%;
        margin-top: 5px;
        overflow: hidden;
    }}
    .prog-fill {{
        height: 100%;
        border-radius: 8px;
    }}
    
    /* Streamlit Widget Labels & Expanders (Fix Dark Mode) */
    .stTextInput label, .stSelectbox label, .stMultiSelect label, .stNumberInput label, .stDateInput label, .stRadio label {{
        color: {COLOR_TEXT} !important;
    }}
    
    .stRadio div[data-testid="stMarkdownContainer"] p {{
        color: {COLOR_TEXT} !important;
    }}
    
    .streamlit-expanderHeader {{
        color: {COLOR_TEXT} !important;
        background-color: transparent !important;
    }}
    
    .streamlit-expanderHeader p, .streamlit-expanderHeader span, .streamlit-expanderHeader svg, .streamlit-expanderHeader {{
        color: {COLOR_TEXT} !important;
        fill: {COLOR_TEXT} !important;
        background-color: transparent !important;
    }}

    details, details summary, details summary p, details summary span, details summary svg {{
        color: {COLOR_TEXT} !important;
        fill: {COLOR_TEXT} !important;
    }}

    details summary {{
        background-color: transparent !important;
    }}
    
    .stCheckbox label, .stToggle label, .stToggle p, div[data-testid="stWidgetLabel"] p, div[data-testid="stWidgetLabel"] {{
        color: {COLOR_TEXT} !important;
    }}
    
    .stButton button {{
        color: {COLOR_TEXT} !important;
        border-color: {COLOR_BORDER} !important;
        background-color: {COLOR_CARD_BG} !important;
    }}
    
    .stButton button p, .stButton button span, .stDownloadButton button p, .stButton button div {{
        color: {COLOR_TEXT} !important;
    }}
    
    /* Force text color on all button states */
    button[kind="secondary"] p, button[kind="secondary"] div, button[kind="secondary"] span {{
         color: {COLOR_TEXT} !important;
    }}

    /* Estilo Específico para Botões de Popover e Download (Fix Dark Mode) */
    div[data-testid="stPopover"] button,
    div[data-testid="stDownloadButton"] button {{
        background-color: {COLOR_BTN_POPOVER} !important;
        color: white !important;
        border: 1px solid {COLOR_BORDER} !important;
    }}
    
    div[data-testid="stPopover"] button:hover,
    div[data-testid="stDownloadButton"] button:hover {{
        filter: brightness(110%);
        color: white !important;
    }}

    div[data-testid="stPopover"] button p, 
    div[data-testid="stDownloadButton"] button p,
    div[data-testid="stDownloadButton"] button div {{
        color: white !important;
    }}
    
    /* Mobile Optimizations */
    @media only screen and (max-width: 600px) {{
        .block-container {{
            padding-top: 2rem !important;
            padding-bottom: 3rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
        }}
        h1 {{ font-size: 1.8rem !important; }}
        .metric-value {{ font-size: 1.5rem !important; }}
        .tx-date-box {{ width: 40px; height: 40px; margin-right: 10px; }}
        .tx-date-box span:nth-child(2) {{ font-size: 1rem !important; }}
        .tx-title {{ font-size: 0.9rem !important; }}
        .tx-amount {{ font-size: 0.9rem !important; }}
        .plotly-graph-div {{ height: 200px !important; }}
        .custom-card {{ padding: 15px !important; }}
    }}
    
    /* Hide Streamlit Branding */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    header {{visibility: hidden;}}
    
    </style>
""", unsafe_allow_html=True)

# --- DB ---

@st.cache_resource
def init_connection():
    try:
        if "firebase" not in st.secrets: return None
        if not firebase_admin._apps:
            cred_dict = dict(st.secrets["firebase"])
            # Fallback seguro
            pk = cred_dict.get("private_key", "")
            if pk: cred_dict["private_key"] = pk.replace("\\n", "\n")
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception:
        st.warning("⚠️ Modo Visualização: Banco de dados não configurado. Usando dados de exemplo.")
        return None

db = init_connection()
COLLECTION_NAME = "transacoes"

# --- HELPER FUNCTIONS ---
def ensure_firestore_compatible(data):
    """Garante que datas sejam datetime para compatibilidade com Firestore."""
    if 'data' in data and isinstance(data['data'], date) and not isinstance(data['data'], datetime):
         data['data'] = datetime.combine(data['data'], datetime.min.time())
    return data

@st.cache_data(ttl=300)
def get_transactions():
    if db is None:
        data = st.session_state['mock_data']
        df = pd.DataFrame(data) if data else pd.DataFrame(columns=['id', 'tipo', 'data', 'valor', 'categoria'])
    else:
        try:
            # FIX: Filter by User ID
            user_id = st.session_state['user_info']['localId']
            docs = db.collection(COLLECTION_NAME).where("user_id", "==", user_id).stream()
            data = []
            for doc in docs:
                d = doc.to_dict()
                d['id'] = doc.id
                if 'data' in d and hasattr(d['data'], 'date'): d['data'] = d['data'].date()
                data.append(d)
            df = pd.DataFrame(data)
        except: df = pd.DataFrame()
    
    # Garantir colunas mínimas
    required_cols = ['id', 'tipo', 'data', 'valor', 'categoria', 'mes_referencia', 'descricao', 'status']
    for col in required_cols:
        if col not in df.columns:
            df[col] = None

    try:
        if not df.empty:
            if 'data' in df.columns:
                df['data'] = pd.to_datetime(df['data'])
            
            # Ensure 'valor' is numeric to prevent sum issues
            if 'valor' in df.columns:
                 df['valor'] = pd.to_numeric(df['valor'], errors='coerce').fillna(0.0)

            # Normalization
            if 'mes_referencia' in df.columns:
                df['mes_referencia'] = df['mes_referencia'].astype(str).str.strip()
                
            return df.sort_values(by='data', ascending=False)
        return df
    except Exception as e:
        # Fallback empty structure
        return pd.DataFrame(columns=["id", "data", "mes_referencia", "tipo", "categoria", "descricao", "valor", "status", "recorrente"])

def delete_transaction(doc_id):
    if db is None:
        st.session_state['mock_data'] = [d for d in st.session_state['mock_data'] if d['id'] != doc_id]
        return True
    else:
        try:
            db.collection(COLLECTION_NAME).document(doc_id).delete()
            get_transactions.clear()
            return True
        except Exception as e:
            st.error(f"Erro ao excluir: {e}")
            return False
            
    get_transactions.clear()
    return True

def update_transaction(doc_id, data):
    if db is None:
        for d in st.session_state['mock_data']:
            if d['id'] == doc_id:
                d.update(data)
                break
        return True
    else:
        try:
             # Refactored: Use helper
            data = ensure_firestore_compatible(data)
                
            db.collection(COLLECTION_NAME).document(doc_id).update(data)
            get_transactions.clear()
            return True
        except Exception as e:
            st.error(f"Erro ao atualizar: {e}")
            return False
            
    get_transactions.clear()
    return True


def add_transaction(data):
    # Validations
    if data.get('valor', 0) <= 0:
        st.error("Valor deve ser maior que zero!")
        return False
        
    if not data.get('descricao', '').strip():
        st.error("Descrição é obrigatória!")
        return False

    if db is None:
        data['id'] = str(uuid.uuid4())
        st.session_state['mock_data'].insert(0, data)
        get_transactions.clear()
        return True
    else:
        try:
            # Refactored: Use helper
            data = ensure_firestore_compatible(data)
            
            # FIX: Add User ID
            data['user_id'] = st.session_state['user_info']['localId']
            
            db.collection(COLLECTION_NAME).add(data)
            get_transactions.clear()
            return True
        except Exception as e:
            st.error(f"❌ Erro ao salvar: {str(e)}")
            return False

@st.dialog("✏️ Editar Transação")
def edit_transaction_dialog(row, tipo_cat_key):
    st.write(f"Editando: **{row['descricao']}**")
    
    col_cats = st.session_state['config_categorias'][tipo_cat_key]
    
    # Pre-fill
    e_val = st.number_input("Valor", value=float(row['valor']), step=100.0)
    e_desc = st.text_input("Descrição", value=row['descricao'])
    
    try:
        idx = col_cats.index(row['categoria'])
    except: idx = 0
    e_cat = st.selectbox("Categoria", col_cats, index=idx)
    
    # Date handling
    d_val = row['data']
    if isinstance(d_val, str): d_val = datetime.strptime(d_val, "%Y-%m-%d").date()
    elif isinstance(d_val, datetime): d_val = d_val.date()
    
    e_date = st.date_input("Data", value=d_val, format="DD/MM/YYYY")
    
    # Recalc ref
    e_ref = get_shifted_reference_month(e_date, e_cat, row['tipo'])
    st.caption(f"Nova Competência: **{e_ref}**")
    
    # Status handling
    status_opts = ["Pendente", "Pago"] if row['tipo'] == "Despesa" else ["Recebido", "Pendente"]
    try:
        s_idx = status_opts.index(row.get('status', 'Pendente'))
    except: s_idx = 0
    e_status = st.selectbox("Status", status_opts, index=s_idx)
    
    # Recorrente Checkbox
    e_rec = st.checkbox("Recorrente? (Repetir todo mês)", value=row.get('recorrente', False))
    
    if st.button("💾 Salvar Alterações", type="primary", use_container_width=True):
        upd = {
            "valor": e_val, "descricao": sanitize_input(e_desc), "categoria": e_cat,
            "data": e_date, "mes_referencia": e_ref, "status": e_status,
            "recorrente": e_rec
        }
        if update_transaction(row['id'], upd):
            st.session_state["toast_msg"] = "Transação atualizada com sucesso!"
            st.rerun()

    # Botão Duplicar
    if st.button("📑 Duplicar Transação", use_container_width=True):
        # Usar os dados editados no formulário para a cópia
        new_data = {
            "id": str(uuid.uuid4()),
            "descricao": sanitize_input(e_desc), # Usa o que está no input agora
            "valor": e_val,
            "categoria": e_cat,
            "data": e_date,
            "mes_referencia": e_ref,
            "status": "Pendente", # Reseta status
            "recorrente": e_rec,
            "tipo": row['tipo'] # Mantém o tipo original
        }
        
        if add_transaction(new_data):
            st.session_state["toast_msg"] = "Transação duplicada! 📑"
            st.rerun()

def get_current_month_str():
    return get_month_from_date(date.today())

def get_month_from_date(t):
    inv_map = {v: k for k, v in MAPA_MESES.items()}
    return f"{inv_map[t.month]} {t.year}"

def get_shifted_reference_month(dt, cat, tipo):
    """Calcula o mês de referência com base nas regras de negócio (Salário e AC-4)."""
    shift = 0
    if tipo == "Receita":
        if cat == "AC-4":
            shift = 2 # Work Month -> Pays Month + 2
    
    if shift > 0:
        # Date Math: Add 'shift' months
        y = dt.year + (dt.month + shift - 1) // 12
        m = (dt.month + shift - 1) % 12 + 1
        new_dt = date(y, m, 1)
        return get_month_from_date(new_dt)
    
    return get_month_from_date(dt)

def process_recurring_bills(df):
    """Verifica e gera contas recorrentes para o mês atual."""
    if df.empty: return False
    
    current_month_str = get_current_month_str()
    today = date.today()
    
    # 1. Identificar mês anterior
    first_curr = date(today.year, today.month, 1)
    last_month_date = first_curr - pd.Timedelta(days=1)
    last_month_str = get_month_from_date(last_month_date)
    
    # 2. Pegar recorrentes do mês passado (Receitas E Despesas)
    df_last = df[(df['mes_referencia'] == last_month_str) & (df.get('recorrente', False) == True)]
    
    if df_last.empty: return False
    
    # 3. Pegar transações já existentes no mês atual (para evitar duplicação)
    df_curr = df[df['mes_referencia'] == current_month_str]
    existing_sigs = set(zip(df_curr['descricao'], df_curr['categoria']))
    
    new_generated = 0
    
    for idx, row in df_last.iterrows():
        sig = (row['descricao'], row['categoria'])
        if sig not in existing_sigs:
            # Gerar para o mês atual
            try:
                # Tentar manter o mesmo dia
                new_day = row['data'].day
                # Cuidado com fevereiro (dias 29/30/31)
                import calendar
                max_days = calendar.monthrange(today.year, today.month)[1]
                target_day = min(new_day, max_days)
                new_date = date(today.year, today.month, target_day)
                
                new_data = {
                    "tipo": row['tipo'],
                    "data": new_date,
                    "mes_referencia": current_month_str,
                    "categoria": row['categoria'],
                    "descricao": row['descricao'],
                    "valor": row['valor'],
                    "status": "Pendente",
                    "recorrente": True # Mantém a recorrência para o próximo
                }
                
                add_transaction(new_data)
                new_generated += 1
            except Exception as e:
                print(f"Erro ao gerar recorrente: {e}")
                
    if new_generated > 0:
        return True
    return False

def generate_ai_insights(df, month_str):
    """Gera insights automáticos baseados nos dados."""
    if month_str == "Todos" or df.empty:
        return ["Selecione um mês específico para ver a análise de IA."]
    
    insights = []
    
    # 1. Parse Mês Atual
    try:
        parts = month_str.split()
        m_idx = MAPA_MESES[parts[0]]
        y = int(parts[1])
        
        # Mês Anterior logic
        last_m = m_idx - 1
        last_y = y
        if last_m == 0:
            last_m = 12
            last_y = y - 1
            
        inv_map = {v: k for k, v in MAPA_MESES.items()}
        prev_month_str = f"{inv_map[last_m]} {last_y}"
        
        # Filter Data
        df_curr = df[df['mes_referencia'] == month_str]
        df_prev = df[df['mes_referencia'] == prev_month_str]
        
        # MoM Receita
        rec_curr = df_curr[df_curr['tipo'] == 'Receita']['valor'].sum()
        rec_prev = df_prev[df_prev['tipo'] == 'Receita']['valor'].sum()
        if rec_prev > 0:
            delta_rec = ((rec_curr - rec_prev) / rec_prev) * 100
            if delta_rec > 0: insights.append(f"Isso aí! Suas receitas **aumentaram {delta_rec:.1f}%** em relação ao mês anterior.")
            elif delta_rec < 0: insights.append(f"Atenção: Receitas **caíram {abs(delta_rec):.1f}%** comparado a {parts[0]}/{last_y}.")
            
        # Top Categoria Despesa
        df_desp = df_curr[df_curr['tipo'] == 'Despesa']
        if not df_desp.empty:
            top_cat = df_desp.groupby('categoria')['valor'].sum().idxmax()
            top_val = df_desp.groupby('categoria')['valor'].sum().max()
            insights.append(f"Maior gasto do mês: **{top_cat}** (R$ {top_val:,.2f}).")
            
        # Alerta Pendentes
        pending = df_desp[df_desp['status'] == 'Pendente']['valor'].sum()
        if pending > 0:
            insights.append(f"Você ainda tem **R$ {pending:,.2f}** em contas pendentes para este mês.")
            
    except Exception as e:
        return [f"Não foi possível gerar insights: {e}"]
        
    if not insights:
        insights.append("Tudo parece estável. Sem variações bruscas detectadas.")
        
        
    return insights

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'Relatório Financeiro Executivo', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Pág. {self.page_no()}', 0, 0, 'C')

def backup_data(df):
    """Salva um snapshot dos dados atuais na coleção 'backups' do Firestore."""
    if db is None:
        st.warning("Backup requer conexão com banco de dados.")
        return False
        
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Converter dataframe para lista de dicionários (JSON serializable)
        # Converter datas para strings para evitar erro de serialização
        df_backup = df.copy()
        if not df_backup.empty:
            df_backup['data'] = df_backup['data'].astype(str)
            records = df_backup.to_dict(orient='records')
        else:
            records = []
            
        backup_doc = {
            "created_at": timestamp,
            "total_records": len(records),
            "data": json.dumps(records, ensure_ascii=False) # Guardar como string JSON para economizar escritas/leituras complexas
        }
        
        db.collection("backups").add(backup_doc)
        return True
    except Exception as e:
        st.error(f"Erro no backup: {e}")
        return False

def generate_advanced_insights(df, mes_sel):
    insights = []
    
    if df.empty:
        return []
    
    # Criar df apenas com despesas para análise
    df_desp = df[df['tipo'] == 'Despesa']

    # --- 1. MAIOR CATEGORIA DE GASTO ---
    if not df_desp.empty:
        cat_grp = df_desp[df_desp['mes_referencia'] == mes_sel].groupby('categoria')['valor'].sum()
        if not cat_grp.empty:
            top_cat = cat_grp.idxmax()
            top_val = cat_grp.max()
            insights.append(f"📊 **Onde você mais gastou:** A categoria **{top_cat}** consumiu **R$ {top_val:,.2f}** este mês.")

    # --- 2. MAIOR TRANSAÇÃO ÚNICA ---
    if not df_desp.empty:
        df_curr = df_desp[df_desp['mes_referencia'] == mes_sel]
        if not df_curr.empty:
            max_row = df_curr.loc[df_curr['valor'].idxmax()]
            insights.append(f"� **Maior compra:** {max_row['descricao']} no valor de **R$ {max_row['valor']:,.2f}**.")
            
    # --- 3. COMPARAÇÃO COM MÊS ANTERIOR ---
    if not df_desp.empty:
        # Calcular mês anterior
        try:
           # Extrair mês e ano do mes_sel (ex: "Janeiro 2026")
           meses_pt = {"Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, 
                       "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12}
           nome_mes, ano_str = mes_sel.split()
           mes_num = meses_pt.get(nome_mes, 0)
           
           if mes_num > 1:
               mes_ant_num = mes_num - 1
               ano_ant = int(ano_str)
           else:
               mes_ant_num = 12
               ano_ant = int(ano_str) - 1
               
           nome_mes_ant = [k for k,v in meses_pt.items() if v == mes_ant_num][0]
           mes_ref_ant = f"{nome_mes_ant} {ano_ant}"
           
           val_atual = df_desp[df_desp['mes_referencia'] == mes_sel]['valor'].sum()
           val_ant = df_desp[df_desp['mes_referencia'] == mes_ref_ant]['valor'].sum()
           
           if val_ant > 0:
               diff = val_atual - val_ant
               perc = (diff / val_ant) * 100
               if diff > 0:
                   insights.append(f"⚠️ **Atenção:** Seus gastos aumentaram **{perc:.1f}%** (R$ {diff:,.2f}) em relação a {mes_ref_ant}.")
               elif diff < 0:
                   insights.append(f"📉 **Bom sinal:** Seus gastos diminuíram **{abs(perc):.1f}%** em relação a {mes_ref_ant}.")
        except:
             pass # Erro ao calcular mês anterior (primeiro mês ou formato inválido)

    # --- 4. ALERTA DE ORÇAMENTO (GASTOS vs RECEITAS) ---
    receita_mes = df[(df['tipo'] == 'Receita') & (df['mes_referencia'] == mes_sel)]['valor'].sum()
    despesa_mes = df[(df['tipo'] == 'Despesa') & (df['mes_referencia'] == mes_sel)]['valor'].sum()
    
    if receita_mes > 0:
        comprometido = (despesa_mes / receita_mes) * 100
        if comprometido > 90:
             insights.append(f"🚨 **Alerta Vermelho:** Você já gastou **{comprometido:.1f}%** da sua renda deste mês!")
        elif comprometido > 70:
             insights.append(f"👀 **Olho vivo:** Suas despesas já somam **{comprometido:.1f}%** do que você ganhou.")

    # Padrões de gastos (Fim de semana) - Mantido
    if not df_desp.empty:
        day_of_week = df_desp['data'].dt.dayofweek
        # Check only current month for weekend trend to be more relevant
        df_curr_desp = df_desp[df_desp['mes_referencia'] == mes_sel]
        if not df_curr_desp.empty:
             day_of_week = df_curr_desp['data'].dt.dayofweek
             if not day_of_week.empty and day_of_week.mode()[0] in [5, 6]:  # Fim de semana
                 insights.append("💡 **Dica:** Neste mês, seus gastos estão concentrados no fim de semana.")
    
    return insights

def generate_pdf_report(df, month_str):
    def safe_text(text):
        if not isinstance(text, str): text = str(text)
        return text.encode('latin-1', 'ignore').decode('latin-1')

    pdf = PDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Title Context
    pdf.cell(0, 10, txt=safe_text(f"Periodo: {month_str}"), ln=True, align='C')
    pdf.ln(5)
    
    # Data Prep
    if month_str != "Todos":
        df_filt = df[df['mes_referencia'] == month_str]
    else:
        df_filt = df

    rec = df_filt[df_filt['tipo']=='Receita']['valor'].sum()
    desp = df_filt[df_filt['tipo']=='Despesa']['valor'].sum()
    saldo = rec - desp
    
    # 1. Summary
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, safe_text("1. Resumo Financeiro"), 0, 1)
    pdf.set_font("Arial", size=12)
    pdf.cell(0, 8, safe_text(f"Receitas: R$ {rec:,.2f}"), 0, 1)
    pdf.cell(0, 8, safe_text(f"Despesas: R$ {desp:,.2f}"), 0, 1)
    
    # Color logic for balance
    pdf.set_text_color(0, 150, 0) if saldo >= 0 else pdf.set_text_color(200, 0, 0)
    pdf.cell(0, 8, safe_text(f"Saldo Liquido: R$ {saldo:,.2f}"), 0, 1)
    pdf.set_text_color(0, 0, 0) # Reset
    pdf.ln(5)
    
    # 2. Insights
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, safe_text("2. Insights Financeiros"), 0, 1)
    pdf.set_font("Arial", size=10)
    
    # Generate textual insights
    insights_list = generate_advanced_insights(df, month_str)
    if insights_list:
        for insight in insights_list:
            # Clean md bold syntax for PDF & remove emojis
            clean_text = insight.replace("**", "").replace("R$", "R$").strip()
            pdf.multi_cell(0, 6, f"- {safe_text(clean_text)}")
    else:
        pdf.cell(0, 6, safe_text("Sem insights gerados para o periodo."), 0, 1)
    pdf.ln(5)
    
    # 3. Charts (Matplotlib)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, safe_text("3. Grafico: Distribuicao de Despesas"), 0, 1)
    
    if not df_filt.empty and desp > 0:
        df_d = df_filt[df_filt['tipo'] == 'Despesa']
        if not df_d.empty:
            cat_sums = df_d.groupby('categoria')['valor'].sum()
            
            # Create Pie Chart
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.pie(cat_sums, labels=[safe_text(l) for l in cat_sums.index], autopct='%1.1f%%', startangle=90)
            ax.axis('equal')
            plt.title(safe_text("Distribuicao por Categoria"))
            
            # Save to temp file (FPDF requires file path in older versions)
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                plt.savefig(tmp.name, format='png')
                tmp_path = tmp.name
                
            plt.close(fig)
            
            # PDF Image
            try:
                pdf.image(tmp_path, x=10, y=None, w=100)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
    else:
        pdf.set_font("Arial", 'I', 11)
        pdf.cell(0, 10, safe_text("Sem dados de despesas."), 0, 1)
        
    pdf.ln(5)

    # 4. Detailed Tables
    def render_table(title, dataframe):
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, safe_text(title), 0, 1)
        pdf.set_font("Arial", 'B', 9)
        
        # Header
        col_w = [30, 80, 40, 30] # Data, Desc, Cat, Valor
        headers = ["Data", "Descricao", "Categoria", "Valor"]
        
        for i in range(4):
            pdf.cell(col_w[i], 7, safe_text(headers[i]), 1, 0, 'C')
        pdf.ln()
        
        # Rows
        pdf.set_font("Arial", '', 9)
        total_val = 0.0
        
        if dataframe.empty:
            pdf.cell(sum(col_w), 7, safe_text("Sem registros."), 1, 1, 'C')
        else:
            for _, row in dataframe.iterrows():
                try:
                    d_str = row['data'].strftime("%d/%m/%Y") if hasattr(row['data'], 'strftime') else str(row['data'])[:10]
                    desc = str(row.get('descricao', '-'))[:35]
                    cat = str(row.get('categoria', '-'))[:25]
                    val_float = float(row.get('valor', 0))
                    total_val += val_float
                    val_fmt = f"R$ {val_float:,.2f}"
                    
                    pdf.cell(col_w[0], 7, safe_text(d_str), 1, 0, 'C')
                    pdf.cell(col_w[1], 7, safe_text(desc), 1, 0, 'L')
                    pdf.cell(col_w[2], 7, safe_text(cat), 1, 0, 'L')
                    pdf.cell(col_w[3], 7, safe_text(val_fmt), 1, 0, 'R')
                    pdf.ln()
                except:
                    continue
            
            # Total Row
            pdf.set_font("Arial", 'B', 9)
            pdf.cell(sum(col_w[:3]), 7, safe_text("TOTAL"), 1, 0, 'R')
            pdf.cell(col_w[3], 7, safe_text(f"R$ {total_val:,.2f}"), 1, 0, 'R')
            pdf.ln()
            
        pdf.ln(5)

    # Table: Receitas
    df_rec_curr = df_filt[df_filt['tipo'] == 'Receita'].sort_values('data')
    render_table("4. Detalhamento de Receitas", df_rec_curr)
    
    # Table: Despesas
    df_desp_curr = df_filt[df_filt['tipo'] == 'Despesa'].sort_values('data')
    render_table("5. Detalhamento de Despesas", df_desp_curr)
        
    return pdf.output(dest='S').encode('latin-1', 'replace')

# --- COMPONENTES HTML CUSTOMIZADOS ---
def card_metric(label, value, delta=None, delta_type="pos"):
    delta_html = ""
    if delta:
        cls = "delta-pos" if delta_type == "pos" else "delta-neg"
        icon = "↑" if delta_type == "pos" else "↓"
        delta_html = f"<span class='{cls}'>{icon} {delta}</span>"
        
    return f"""
    <div class="custom-card">
        <div class="metric-label">{label}</div>
        <div class="metric-value">{value}</div>
        <div class="metric-delta">{delta_html}</div>
    </div>
    """

def card_category_row(label, value, percent, color=COLOR_PRIMARY):
    return f"""
    <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; color: {COLOR_TEXT};">
            <span>{label}</span>
            <span>R$ {value:,.2f}</span>
        </div>
        <div class="prog-bar">
            <div class="prog-fill" style="width: {percent}%; background-color: {color};"></div>
        </div>
        <div style="text-align: right; font-size: 0.75rem; color: {COLOR_TEXT_LIGHT}; margin-top: 2px;">{percent:.0f}%</div>
    </div>
    """

def render_transaction_row(row):
    day = row['data'].strftime("%d")
    month_short = row['data'].strftime("%b").upper() # Ex: JAN
    
    is_rec = row['tipo'] == 'Receita'
    amount_cls = "tx-pos" if is_rec else "tx-neg"
    sign = "+" if is_rec else "-"
    
    return f"""
    <div class="tx-row">
        <div class="tx-date-box">
            <span>{month_short}</span>
            <span style="font-size: 1.2rem;">{day}</span>
        </div>
        <div class="tx-details">
            <div class="tx-title">{row['descricao']}</div>
            <div class="tx-cat">{row['categoria']} • {row['status']}</div>
        </div>
        <div class="tx-amount {amount_cls}">
            {sign} R$ {row['valor']:,.2f}
        </div>
    </div>
    """

# --- UI LAYOUT ---


# --- CHECK AUTH ---
if 'user_info' not in st.session_state:
    init_state() # Ensure basic state for theme
    auth_screen()
    st.stop()
else:
    # Sidebar Logout
    with st.sidebar:
        st.write(f"Logado como: {st.session_state['user_info'].get('email')}")
        if st.button("Sair"):
            del st.session_state['user_info']
            st.rerun()

# --- UI LAYOUT ---

# --- ONBOARDING (WELCOME MESSAGE) ---
if 'first_visit' not in st.session_state:
    st.session_state['first_visit'] = True
    
if st.session_state['first_visit']:
    with st.expander("👋 Bem-vindo ao Gestão AC-4!", expanded=True):
        st.markdown("""
        **Primeiros Passos:**
        1. Adicione sua primeira receita
        2. Configure categorias personalizadas
        3. Explore o dashboard
        """)
        if st.button("Entendi!"):
            st.session_state['first_visit'] = False
            st.rerun()

# Topo: Menu Horizontal
selected = option_menu(
    menu_title=None,
    options=["Dashboard", "Receitas", "Despesas", "Config", "Novo +"],
    icons=["grid-fill", "graph-up-arrow", "cart-x", "gear", "plus-circle-fill"],
    orientation="horizontal",
    styles={
        "container": {"background-color": "transparent", "padding": "0"},
        "nav-link": {"font-size": "14px", "text-align": "center", "margin": "0px", "--hover-color": "#E2E8F0"},
        "nav-link-selected": {"background-color": COLOR_PRIMARY, "color": "white", "font-weight": "600"},
    }
)

with st.spinner("Carregando seus dados..."):
    df = get_transactions()

if df.empty:
    st.info("👋 Bem-vindo! Parece que você ainda não tem transações cadastradas.")
    st.markdown("""
    <div style='text-align: center; padding: 30px; background-color: rgba(37, 99, 235, 0.1); border-radius: 12px; margin: 20px 0;'>
        <h3 style='color: #2563EB;'>Comece Agora!</h3>
        <p>Vá na aba <b>Novo +</b> e adicione sua primeira receita ou despesa.</p>
    </div>
    """, unsafe_allow_html=True)

if 'recorrente' not in df.columns: df['recorrente'] = False # Ensure column exists

# Auto-Run Recurrence Check
if "first_run_recurrence" not in st.session_state:
    if process_recurring_bills(df):
        st.session_state["toast_msg"] = "Contas recorrentes geradas para este mês! 📅"
        st.session_state["first_run_recurrence"] = True
        st.rerun()
    st.session_state["first_run_recurrence"] = True

df['mes_referencia'] = df['mes_referencia'].fillna("Geral")
mes_atual = get_current_month_str()

# ==========================================
# ABA 1: DASHBOARD
# ==========================================
if selected == "Dashboard":
    
    if "hide_welcome" not in st.session_state:
        st.session_state["hide_welcome"] = False

    if not st.session_state["hide_welcome"]:
        c1, c2 = st.columns([3, 1])
        c1.markdown(f"### Olá, Gestor AC-4 👋")
        with c2:
             if st.checkbox("Ocultar", key="chk_welcome"):
                 st.session_state["hide_welcome"] = True
                 st.rerun()
    else:
        # If hidden, keep columns just for layout spacing if needed, or skip.
        # Let's just create c1, c2 invisible or skip defining them if they aren't used below.
        # Checking usage below... c1, c2 seem unused for anything else in this block.
        pass
    
    # Shortcuts Listener
    st.components.v1.html(
        """
        <script>
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                // Streamlit doesn't have a direct JS hook to switch tabs easily without re-run tricks.
                // We'll simulate a click on the tab if possible or just show an alert for now.
                // A reliable way is checking if elements exist.
                // Trying to find the "Novo +" tab text and click it.
                var tabs = parent.document.querySelectorAll('a');
                for (var i = 0; i < tabs.length; i++) {
                    if (tabs[i].textContent.includes('Novo +')) {
                        tabs[i].click();
                        break;
                    }
                }
            }
        });
        </script>
        """, height=0, width=0
    )

    # ... Existing Month Filter ...
    meses = sorted(df['mes_referencia'].unique(), reverse=True)
    if not meses: meses = [mes_atual]
    mes_sel = st.selectbox("Filtrar Período", ["Todos"] + list(meses), label_visibility="collapsed")
    
    if mes_sel != "Todos":
        df_view = df[df['mes_referencia'] == mes_sel]
    else:
        df_view = df

    # KPIs
    rec = df_view[df_view['tipo']=='Receita']['valor'].sum()
    desp = df_view[df_view['tipo']=='Despesa']['valor'].sum()
    saldo = rec - desp

    # Display Saldo as a big feature
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, {COLOR_PRIMARY} 0%, {COLOR_BG} 150%); padding: 20px; border-radius: 15px; box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.2); margin-bottom: 20px; border: 1px solid {COLOR_BORDER};">
        <div style="color: #FFFFFF; font-size: 1.1rem; margin-bottom: 5px; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Saldo do Mês</div>
        <div style="font-size: 2.8rem; font-weight: 800; color: #FFFFFF; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            {format_currency(saldo)}
        </div>
        <div style="font-size: 0.95rem; color: #F1F5F9; margin-top: 5px; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
            Receitas: <span style="color: #6EE7B7; font-weight: 700;">{format_currency(rec)}</span> &nbsp;|&nbsp; 
            Despesas: <span style="color: #FCA5A5; font-weight: 700;">{format_currency(desp)}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # INSIGHTS AVANÇADOS
    insights = generate_advanced_insights(df, mes_sel)
    if insights:
        st.markdown("### 🧠 Insights Financeiros")
        for insight in insights:
            st.info(insight)
            
    # GRÁFICOS
    c1, c2 = st.columns(2)
    with c1: st.markdown(card_metric("Receita Total", format_currency(rec), "12% vs mês ant.", "pos"), unsafe_allow_html=True)
    with c2: st.markdown(card_metric("Despesas", format_currency(desp), "5% vs mês ant.", "neg"), unsafe_allow_html=True)
    
    # Forecast Logic
    recur_pending = df_view[(df_view['recorrente']==True) & (df_view['status']=='Pendente')]['valor'].sum()
    forecast_bal = saldo - recur_pending
    
    c3, c4 = st.columns(2)
    with c3: st.markdown(card_metric("Saldo Líquido", format_currency(saldo), "Atual", "pos"), unsafe_allow_html=True)
    with c4: st.markdown(card_metric("Previsão (Recorrentes)", format_currency(forecast_bal), f"- {format_currency(recur_pending)} pend.", "neg" if forecast_bal < 0 else "pos"), unsafe_allow_html=True)

    st.markdown("##### 📈 Fluxo Financeiro")
    if not df_view.empty:
        daily = df_view.groupby('data')['valor'].sum().reset_index().sort_values('data')
        fig = px.area(daily, x='data', y='valor', title=None)
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(showgrid=False, tickformat="%d/%m", fixedrange=True, title=None, tickfont=dict(color=COLOR_TEXT)), 
            yaxis=dict(showgrid=True, gridcolor='#CBD5E1', fixedrange=True, title=None, tickprefix="R$ ", tickfont=dict(color=COLOR_TEXT)),
            margin=dict(l=10, r=10, t=30, b=10), height=250, 
            showlegend=False, # Single series, title is enough
            font=dict(color=COLOR_TEXT, size=12),
            autosize=True,
            hovermode="x unified"
        )
        fig.update_traces(
            line_color=COLOR_PRIMARY, 
            fillcolor="rgba(37, 99, 235, 0.1)",
            hovertemplate="<b>%{x|%d/%m}</b><br>R$ %{y:,.2f}<extra></extra>"
        )
        st.markdown('<div class="custom-card">', unsafe_allow_html=True)
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
        st.markdown('</div>', unsafe_allow_html=True)



    # --- GRÁFICOS ADICIONAIS ---
    st.markdown("##### 📊 Análise Detalhada")
    
    # 1. Distribuição de Despesas (Pizza)
    df_desp_chart = df_view[df_view['tipo'] == 'Despesa']
    if not df_desp_chart.empty:
        c_pie, c_heat = st.columns([1, 1])
        
        with c_pie:
            st.markdown("**Distribuição de Despesas**")
            st.markdown('<div class="custom-card">', unsafe_allow_html=True)
            fig_pie = px.pie(df_desp_chart, values='valor', names='categoria', hole=0.5, color_discrete_sequence=px.colors.qualitative.Pastel)
            fig_pie.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=250, showlegend=False)
            fig_pie.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig_pie, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)

        with c_heat:
            st.markdown("**Mapa de Calor (Dia x Categoria)**")
            st.markdown('<div class="custom-card">', unsafe_allow_html=True)
            # Heatmap: Day of Week vs Category
            df_heat = df_desp_chart.copy()
            df_heat['dia_sem'] = df_heat['data'].dt.day_name().replace({
                'Monday': 'Seg', 'Tuesday': 'Ter', 'Wednesday': 'Qua', 'Thursday': 'Qui', 
                'Friday': 'Sex', 'Saturday': 'Sáb', 'Sunday': 'Dom'
            })
            # Sort order for days
            dia_order = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            
            heatmap_data = df_heat.groupby(['categoria', 'dia_sem'])['valor'].sum().reset_index()
            if not heatmap_data.empty:
                fig_heat = px.density_heatmap(
                    heatmap_data, x='dia_sem', y='categoria', z='valor', 
                    category_orders={"dia_sem": dia_order},
                    color_continuous_scale="Reds"
                )
                fig_heat.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=250, xaxis_title=None, yaxis_title=None)
                st.plotly_chart(fig_heat, use_container_width=True, config={'displayModeBar': False})
            else:
                st.info("Dados insuficientes para mapa de calor.")
            st.markdown('</div>', unsafe_allow_html=True)

    # 3. Comparativo Anual (Linha do Tempo) - Mostrar apenas se 'Todos' ou muitos dados
    if mes_sel == "Todos" or len(df['mes_referencia'].unique()) > 1:
        st.markdown("**📅 Evolução Anual (Receitas x Despesas)**")
        st.markdown('<div class="custom-card">', unsafe_allow_html=True)
        # Prepare data
        monthly_trend = df.groupby(['mes_referencia', 'tipo'])['valor'].sum().reset_index()
        
        # Sort months correctly using a helper if possible or assume date sorting if we had a date column. 
        # Since mes_referencia is string, sorting might be alpha. 

        
        # Manual Sort Map
        mes_map = {"Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, 
                   "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12}
        
        def get_sort_key(m_str):
            try:
                parts = m_str.split()
                if len(parts) == 2:
                    return int(parts[1]) * 100 + mes_map.get(parts[0], 0)
                return 0
            except:
                return 0
                
        monthly_trend['sort_val'] = monthly_trend['mes_referencia'].apply(get_sort_key)
        monthly_trend = monthly_trend.sort_values('sort_val')
        
        fig_line = px.line(monthly_trend, x='mes_referencia', y='valor', color='tipo', 
                           markers=True, color_discrete_map={'Receita': COLOR_SUCCESS, 'Despesa': COLOR_DANGER})
        fig_line.update_layout(
            margin=dict(t=20, b=10, l=10, r=10), height=300, 
            xaxis_title=None, yaxis_title=None,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        st.plotly_chart(fig_line, use_container_width=True, config={'displayModeBar': False})
        st.markdown('</div>', unsafe_allow_html=True)

# ==========================================
# ABA 2: RECEITAS
# ==========================================
elif selected == "Receitas":
    st.subheader("Receitas - Detalhes")
    
    c1, c2 = st.columns([2, 1])
    meses_r = sorted(df['mes_referencia'].unique(), reverse=True)
    if not meses_r: meses_r = [mes_atual]
    mes_sel_r = c1.selectbox("Mês:", ["Todos"] + list(meses_r), label_visibility="collapsed", key="filter_mes_rec")
    
    # Quick Add Receita
    with c2:
        with st.popover("➕ Nova Receita"):
            st.markdown("### Nova Receita")
            nr_val = st.number_input("Valor", min_value=0.0, step=100.0, key="quick_rec_val")
            nr_desc = st.text_input("Descrição", key="quick_rec_desc")
            nr_cat = st.selectbox("Categoria", st.session_state['config_categorias']['receita'], key="quick_rec_cat")
            nr_date = st.date_input("Data", date.today(), format="DD/MM/YYYY", key="quick_rec_date")
            
            # Preview
            nr_ref = get_shifted_reference_month(nr_date, nr_cat, "Receita")
            st.caption(f"Competência: **{nr_ref}**")
            
            if st.button("Salvar Receita", type="primary", use_container_width=True, key="quick_rec_btn"):
                if add_transaction({
                    "tipo": "Receita", "data": nr_date, "mes_referencia": nr_ref,
                    "categoria": nr_cat, "descricao": sanitize_input(nr_desc), "valor": nr_val, "status": "Recebido"
                }):
                    st.session_state["toast_msg"] = f"Receita adicionada! ({nr_ref})"
                    st.rerun() 

    if mes_sel_r != "Todos":
        df_r = df[(df['mes_referencia'] == mes_sel_r) & (df['tipo'] == 'Receita')]
    else:
        df_r = df[df['tipo'] == 'Receita']
    
    total_r = df_r['valor'].sum()

    st.markdown("##### Tendência diária de Receitas")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    st.markdown(f"""
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 2rem; font-weight: 700; color: {COLOR_TEXT};">R$ {total_r:,.2f}</span>
        <span style="background: #ECFDF5; color: {COLOR_SUCCESS}; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">↗ +12.5%</span>
    </div>
    """, unsafe_allow_html=True)
    
    if not df_r.empty:
        daily_r = df_r.groupby('data')['valor'].sum().reset_index().sort_values('data')
        fig_r = px.line(daily_r, x='data', y='valor', line_shape='spline')
        fig_r.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(showgrid=False, tickformat="%d %b", fixedrange=True, title=None, tickfont=dict(color=COLOR_TEXT)), 
            yaxis=dict(showgrid=True, gridcolor='#CBD5E1', showticklabels=True, fixedrange=True, title=None, tickfont=dict(color=COLOR_TEXT)),
            margin=dict(l=10, r=10, t=10, b=10), height=220,
            font=dict(color=COLOR_TEXT, size=12),
            autosize=True,
            hovermode="x unified"
        )
        fig_r.update_traces(
            line_color=COLOR_SUCCESS, 
            line_width=3,
            hovertemplate="<b>%{x|%d/%b}</b><br>R$ %{y:,.2f}<extra></extra>"
        ) 
        st.plotly_chart(fig_r, use_container_width=True, config={'displayModeBar': False})
    else:
        st.info("Sem receitas no período.")
    st.markdown('</div>', unsafe_allow_html=True)

    # 2. Transactions List
    with st.expander("📜 Histórico de Transações", expanded=False):
        c_search_r, c_filt_r = st.columns([4, 2])
        search_rec = c_search_r.text_input("Buscar", placeholder="Search by service...", label_visibility="collapsed", key="search_rec")
        
        # Sort Control Receita
        with c_filt_r:
            sort_r = st.radio("Ord.", ["⬆️ Antigas", "⬇️ Recentes"], horizontal=True, label_visibility="collapsed", key="sort_rec_v2")
        
        # Filter Logic
        if "rec_filter_cat" not in st.session_state: st.session_state["rec_filter_cat"] = "All"
        
        st.markdown('<div class="mobile-row-fix" style="display:none;"></div>', unsafe_allow_html=True)
        k1, k2, k3, k4 = st.columns([1, 1, 1, 2])
        
        if k1.button("All", key="chip_all", use_container_width=True, type="primary" if st.session_state["rec_filter_cat"] == "All" else "secondary"):
            st.session_state["rec_filter_cat"] = "All"
            st.rerun()
            
        if k2.button("Month", key="chip_m", use_container_width=True, type="primary" if st.session_state["rec_filter_cat"] == "Salário" else "secondary"):
            st.session_state["rec_filter_cat"] = "Salário"
            st.rerun()
            
        if k3.button("Serv.", key="chip_s", use_container_width=True, type="primary" if st.session_state["rec_filter_cat"] == "AC-4" else "secondary"):
            st.session_state["rec_filter_cat"] = "AC-4"
            st.rerun()

        
        st.markdown('<div class="custom-card" style="padding: 10px 20px;">', unsafe_allow_html=True)
        if not df_r.empty:
            # 1. Apply Chip Filter
            if st.session_state["rec_filter_cat"] != "All":
                 df_r = df_r[df_r['categoria'] == st.session_state["rec_filter_cat"]]
                 
            # 2. Apply Search
            if search_rec:
                df_r = df_r[df_r['descricao'].str.contains(search_rec, case=False)]
            
            # 3. Apply Sort
            if sort_r == "⬆️ Antigas":
                df_r = df_r.sort_values(by="data", ascending=True)
            else:
                df_r = df_r.sort_values(by="data", ascending=False)
                
            # Extract Years from mes_referencia for Tabs
            # mes_referencia format assumption: "Month Name YYYY" (e.g., "Janeiro 2026")
            # We need to parse valid years.
            
            def extract_year_from_ref(ref_str):
                try:
                    return int(ref_str.split()[-1])
                except:
                    return 0

            # Get unique years from the filtered dataframe (or full df_r if needed, but filtered is better for UX context if filters applied)
            # However, for History, usually we want to see all available years unless searched.
            # Let's use df_r (which already has category filters applied)
            
            # Ensure mes_referencia is string
            df_r['ref_year'] = df_r['mes_referencia'].astype(str).apply(extract_year_from_ref)
            unique_years = sorted(df_r[df_r['ref_year'] > 0]['ref_year'].unique(), reverse=True)
            
            # DEBUG
            # with st.expander("🕵️ DEBUG: Years & Data"):
            #    st.write(f"Unique Years Found: {unique_years}")
            #    st.write(df_r[['data', 'mes_referencia', 'ref_year', 'descricao']].head(20))
            
            if not unique_years:
                st.info("Nenhuma transação encontrada com ano de referência válido.")
            else:
                tabs = st.tabs([str(y) for y in unique_years])
                
                for i, year in enumerate(unique_years):
                    with tabs[i]:
                        # Filter for this year
                        df_year = df_r[df_r['ref_year'] == year].copy()
                        
                        # Prepare for Expander View - Group by REFERENCE MONTH now!
                        # We need to sort by Reference Month properly (not just alphabetically)
                        # Helper to map month names to numbers for sorting
                        map_inv = {v: k for k, v in MAPA_MESES.items()} # {1: 'Janeiro', ...} -> val is name
                        map_name_to_num = {v: k for k, v in MAPA_MESES.items()} # Wait, MAPA_MESES is {1: 'Janeiro'}? No, let's assume MAPA_MESES structure.
                        # Actually standard app.py usually has MAPA_MESES = {1: 'Janeiro' ...}
                        # We need {'Janeiro': 1, ...}
                        
                        def get_month_num(ref_s):
                            try:
                                m_name = " ".join(ref_s.split()[:-1]) # "Janeiro" from "Janeiro 2026"
                                return map_name_to_num.get(m_name, 0)
                            except:
                                return 0
                                
                        df_year['month_num'] = df_year['mes_referencia'].apply(get_month_num)
                        
                        # Apply User Sort preference
                        if sort_r == "⬆️ Antigas":
                            df_year = df_year.sort_values(by=['month_num', 'data'], ascending=[True, True])
                        else:
                            df_year = df_year.sort_values(by=['month_num', 'data'], ascending=[False, False])

                        # Group by Reference Month
                        # Note: dataframe is already sorted by month_num, so groupby(sort=False) keeps that order.
                        grouped = df_year.groupby('mes_referencia', sort=False)
                        
                        for month_name, group_df in grouped:
                            with st.expander(f"📅 {month_name.upper()}", expanded=False):
                                for idx, row in group_df.iterrows():
                                    d_day = row['data'].strftime("%d")
                                    d_month = row['data'].strftime("%b").upper()
                                    val_fmt = f"+ ${row['valor']:,.2f}"
                                    
                                    # Layout Row
                                    c_row1, c_row2 = st.columns([3.5, 1.5])
                                    with c_row1:
                                        st.markdown(f"""
                                        <div style="display: flex; align-items: center; gap: 15px; padding: 5px 0; justify-content: space-between; width: 100%;">
                                            <div style="display: flex; align-items: center; gap: 15px;">
                                                <div style="background: #EFF6FF; color: {COLOR_PRIMARY}; width: 50px; height: 50px; border-radius: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700;">
                                                     <span style="font-size: 0.65rem; color: #60A5FA;">{d_month}</span>
                                                     <span style="font-size: 1.1rem; line-height: 1;">{d_day}</span>
                                                </div>
                                                <div>
                                                    <div style="font-weight: 600; color: {COLOR_TEXT}; font-size: 0.95rem;">{row['descricao']}</div>
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                         <span style="background: #F3F4F6; color: #4B5563; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">{row['categoria']}</span>
                                                         <span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem;">Ref: {row['mes_referencia']}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style="font-weight: 700; color: {COLOR_SUCCESS}; font-size: 1rem;">
                                                {val_fmt}
                                            </div>
                                        </div>
                                        """, unsafe_allow_html=True)
                                    
                                    # Ações (Edit + Delete)
                                    with c_row2:
                                        st.markdown('<div class="mobile-row-fix" style="display:none;"></div>', unsafe_allow_html=True)
                                        c_edit, c_del = st.columns([1, 1], gap="small")
                                        
                                        # Edit Dialog Button
                                        with c_edit:
                                             if st.button("✏️", key=f"btn_edit_r_{row['id']}"):
                                                 edit_transaction_dialog(row, "receita")
                
                                        # Delete Popover
                                        with c_del:
                                            with st.popover("🗑️"):
                                                st.write("Confirma?")
                                                if st.button("Sim", key=f"del_rec_{row['id']}"):
                                                    if delete_transaction(row['id']):
                                                        st.session_state["toast_msg"] = f"Receita de R$ {row['valor']:.2f} removida."
                                                        st.rerun()
                
                                    st.markdown("<hr style='margin: 0; border-top: 1px solid #F1F5F9;'>", unsafe_allow_html=True)
             
            # Pagination Removed as requested
            st.markdown('</div>', unsafe_allow_html=True)
    
    # Floating button removed


# ==========================================
# ABA 3: DESPESAS
# ==========================================
elif selected == "Despesas":
    st.subheader("Detalhamento de Despesas")
    
    c1, c2 = st.columns([2, 1])
    meses_d = sorted(df['mes_referencia'].unique(), reverse=True)
    if not meses_d: meses_d = [mes_atual]
    mes_sel_d = c1.selectbox("Mês:", ["Todos"] + list(meses_d), label_visibility="collapsed", key="filter_mes_desp")
    
    # Quick Add Despesa
    with c2:
        with st.popover("➕ Nova Despesa"):
            st.markdown("### Nova Despesa")
            nd_val = st.number_input("Valor", min_value=0.0, step=10.0, key="quick_desp_val")
            nd_desc = st.text_input("Descrição", key="quick_desp_desc")
            nd_cat = st.selectbox("Categoria", st.session_state['config_categorias']['despesa'], key="quick_desp_cat")
            nd_date = st.date_input("Data", date.today(), format="DD/MM/YYYY", key="quick_desp_date")
            
            # Preview
            nd_ref = get_shifted_reference_month(nd_date, nd_cat, "Despesa")
            st.caption(f"Competência: **{nd_ref}**")
            
            # Opções de Repetição (Quick Add)
            nd_is_rec = st.checkbox("Repetir este lançamento?", key="quick_desp_rec")
            nd_recur_type = "Automático (Mensal)"
            nd_recur_times = 1
            
            if nd_is_rec:
                nd_recur_type = st.radio("Como repetir?", ["Automático (Recorrente)", "Parcelado / Fixo (Gerar Agora)"], horizontal=True, key="quick_desp_type")
                if nd_recur_type == "Parcelado / Fixo (Gerar Agora)":
                    nd_recur_times = st.number_input("Quantas vezes?", min_value=2, max_value=48, value=12, step=1, key="quick_desp_times")
                    st.caption(f"Serão criados **{nd_recur_times}** lançamentos.")

            if st.button("Salvar Despesa", type="primary", use_container_width=True, key="quick_desp_btn"):
                saved_ok = False
                
                if nd_is_rec and nd_recur_type == "Parcelado / Fixo (Gerar Agora)":
                    # Lote
                    prog_bar = st.progress(0)
                    for i in range(nd_recur_times):
                        f_dt = (pd.to_datetime(nd_date) + pd.DateOffset(months=i)).date()
                        f_ref = get_shifted_reference_month(f_dt, nd_cat, "Despesa")
                        add_transaction({
                            "tipo": "Despesa", "data": f_dt, "mes_referencia": f_ref,
                            "categoria": nd_cat, "descricao": f"{sanitize_input(nd_desc)} ({i+1}/{nd_recur_times})", 
                            "valor": nd_val, "status": "Pendente", "recorrente": False
                        })
                        prog_bar.progress((i+1)/nd_recur_times)
                    saved_ok = True
                    msg = f"{nd_recur_times} despesas geradas!"
                else:
                    # Único
                    if add_transaction({
                        "tipo": "Despesa", "data": nd_date, "mes_referencia": nd_ref,
                        "categoria": nd_cat, "descricao": sanitize_input(nd_desc), "valor": nd_val, "status": "Pendente",
                        "recorrente": nd_is_rec
                    }):
                        saved_ok = True
                        msg = f"Despesa adicionada! ({nd_ref})"
                
                if saved_ok:
                     st.session_state["toast_msg"] = msg
                     st.rerun()

    if mes_sel_d != "Todos":
        df_d = df[(df['mes_referencia'] == mes_sel_d) & (df['tipo'] == 'Despesa')]
    else:
        df_d = df[df['tipo'] == 'Despesa']
    
    total_d = df_d['valor'].sum()

    st.markdown(card_metric("TOTAL DE DESPESAS", f"R$ {total_d:,.2f}", "12%", "neg"), unsafe_allow_html=True)
    
    st.markdown("##### Status das Despesas")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    if not df_d.empty:
        df_status = df_d.groupby('status')['valor'].sum().reset_index()
        fig_st = px.pie(
            df_status, values='valor', names='status', hole=0.6,
            color='status',
            color_discrete_map={'Pago': COLOR_SUCCESS, 'Pendente': '#F59E0B'}
        )
        fig_st.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=0, r=0, t=20, b=20), height=180,
            showlegend=True, legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(color=COLOR_TEXT)),
            font=dict(color=COLOR_TEXT)
        )
        st.plotly_chart(fig_st, use_container_width=True, config={'displayModeBar': False})
    else:
        st.info("Sem dados.")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("##### Tendência Diária")
    st.caption("Fluxo de saída no mês")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    if not df_d.empty:
        daily_d = df_d.groupby('data')['valor'].sum().reset_index().sort_values('data')
        fig_d = px.area(daily_d, x='data', y='valor', line_shape='spline')
        fig_d.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(showgrid=False, tickformat="%d %b", fixedrange=True, title=None, tickfont=dict(color=COLOR_TEXT)), 
            yaxis=dict(showgrid=True, gridcolor='#CBD5E1', showticklabels=True, fixedrange=True, title=None, tickfont=dict(color=COLOR_TEXT)),
            margin=dict(l=10, r=10, t=10, b=10), height=220,
            font=dict(color=COLOR_TEXT, size=12),
            autosize=True,
            hovermode="x unified"
        )
        fig_d.update_traces(
            line_color=COLOR_DANGER, 
            line_width=3,
            hovertemplate="<b>%{x|%d/%b}</b><br>R$ %{y:,.2f}<extra></extra>"
        ) 
        st.plotly_chart(fig_d, use_container_width=True, config={'displayModeBar': False})
    else:
        st.info("Sem dados para o período.")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("##### Detalhamento por Categoria")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    if not df_d.empty:
        cat_grp = df_d.groupby('categoria')['valor'].sum().sort_values(ascending=False)
        colors_cat = ["#3B82F6", "#EF4444", "#F59E0B", "#64748B", "#8B5CF6"] 
        for i, (cat, val) in enumerate(cat_grp.items()):
            pct = (val / total_d) * 100 if total_d > 0 else 0
            color = colors_cat[i % len(colors_cat)]
            st.markdown(card_category_row(cat, val, pct, color), unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    with st.expander("📜 Histórico de Transações", expanded=False):
        c_search, c_filter = st.columns([4, 2])
        search_term = c_search.text_input("Buscar", placeholder="Buscar fornecedor, valor...", label_visibility="collapsed")
        
        # Sort Control Despesa
        with c_filter:
            sort_d = st.radio("Ord.", ["⬆️ Antigas", "⬇️ Recentes"], horizontal=True, label_visibility="collapsed", key="sort_desp_v2") 

        st.markdown('<div class="custom-card" style="padding: 10px 20px;">', unsafe_allow_html=True)
        if not df_d.empty:
            if search_term:
                df_d = df_d[df_d['descricao'].str.contains(search_term, case=False)]
                
            if search_term:
                df_d = df_d[df_d['descricao'].str.contains(search_term, case=False)]
                
            # Apply Sort
            if sort_d == "⬆️ Antigas":
                df_d = df_d.sort_values(by="data", ascending=True)
            else:
                df_d = df_d.sort_values(by="data", ascending=False)
                
            # Extract Years from mes_referencia for Tabs
            def extract_year_from_ref_d(ref_str):
                try:
                    return int(ref_str.split()[-1])
                except:
                    return 0

            df_d['ref_year'] = df_d['mes_referencia'].astype(str).apply(extract_year_from_ref_d)
            unique_years_d = sorted(df_d[df_d['ref_year'] > 0]['ref_year'].unique(), reverse=True)
            
            if not unique_years_d:
                st.info("Nenhuma despesa encontrada com ano de referência válido.")
            else:
                tabs_d = st.tabs([str(y) for y in unique_years_d])
                
                for i, year in enumerate(unique_years_d):
                    with tabs_d[i]:
                        # Filter for this year
                        df_year_d = df_d[df_d['ref_year'] == year].copy()
                        
                        # Prepare for Expander View - Group by REFERENCE MONTH now!
                        map_name_to_num = {v: k for k, v in MAPA_MESES.items()}
                        
                        def get_month_num_d(ref_s):
                            try:
                                m_name = " ".join(ref_s.split()[:-1])
                                return map_name_to_num.get(m_name, 0)
                            except:
                                return 0
                                
                        df_year_d['month_num'] = df_year_d['mes_referencia'].apply(get_month_num_d)
                        
                        # Apply User Sort
                        if sort_d == "⬆️ Antigas":
                            df_year_d = df_year_d.sort_values(by=['month_num', 'data'], ascending=[True, True])
                        else:
                            df_year_d = df_year_d.sort_values(by=['month_num', 'data'], ascending=[False, False])

                        # Group by Reference Month
                        grouped_d = df_year_d.groupby('mes_referencia', sort=False)
                        
                        for month_name, group_df in grouped_d:
                            with st.expander(f"📅 {month_name.upper()}", expanded=False):
                                for idx, row in group_df.iterrows():
                                    d_day = row['data'].strftime("%d")
                                    d_month = row['data'].strftime("%b").upper()
                                    val_fmt = f"- R$ {row['valor']:,.2f}"
                                    
                                    # Layout Row
                                    c_row1, c_row2 = st.columns([3.5, 1.5])
                                    with c_row1:
                                        st.markdown(f"""
                                        <div style="display: flex; align-items: center; gap: 15px; padding: 5px 0;">
                                            <div style="background: #FFF1F2; color: {COLOR_DANGER}; width: 50px; height: 50px; border-radius: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700;">
                                                    <span style="font-size: 0.65rem; color: #FDA4AF;">{d_month}</span>
                                                    <span style="font-size: 1.1rem; line-height: 1;">{d_day}</span>
                                            </div>
                                            <div>
                                                <div style="font-weight: 600; color: {COLOR_TEXT}; font-size: 0.95rem;">{row['descricao']}</div>
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                        <span style="background: #F3F4F6; color: #4B5563; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">{row['categoria']}</span>
                                                        <span style="background: {'#DEF7EC' if row.get('status')=='Pago' else '#FFFBEB'}; color: {'#03543F' if row.get('status')=='Pago' else '#92400E'}; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">{row.get('status','Pendente')}</span>
                                                        <span style="background: #F1F5F9; color: #64748B; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem;">Ref: {row['mes_referencia']}</span>
                                                        <span style="color: {COLOR_DANGER}; font-size: 0.85rem; font-weight: 700;">{val_fmt}</span>
                                                </div>
                                            </div>
                                        </div>
                                        """, unsafe_allow_html=True)
                                    with c_row2:
                                        st.markdown('<div class="mobile-row-fix" style="display:none;"></div>', unsafe_allow_html=True)
                                        c_check, c_edit_d, c_del_d = st.columns([1, 1, 1], gap="small")
                                        
                                        # Despesa Actions
                                        with c_check:
                                            if row.get('status') != 'Pago':
                                                 if st.button("✅", key=f"pay_{row['id']}", help="Marcar como Pago"):
                                                     if update_transaction(row['id'], {"status": "Pago"}):
                                                         st.session_state["toast_msg"] = "Conta paga! 💸"
                                                         st.rerun()
                    
                                        # Edit Dialog Despesa
                                        with c_edit_d:
                                             if st.button("✏️", key=f"btn_edit_d_{row['id']}"):
                                                 edit_transaction_dialog(row, "despesa")
                    
                                        with c_del_d:
                                            with st.popover("🗑️"):
                                                st.write("Confirma?")
                                                if st.button("Sim", key=f"del_desp_{row['id']}"):
                                                    if delete_transaction(row['id']):
                                                        st.session_state["toast_msg"] = f"Despesa de R$ {row['valor']:.2f} removida."
                                                        st.rerun()
                    
                                    st.markdown("<hr style='margin: 0; border-top: 1px solid #F1F5F9;'>", unsafe_allow_html=True)

            # Pagination removed
            st.markdown('</div>', unsafe_allow_html=True)


# --- ABA 4: NOVO ---
elif selected == "Novo +":
    st.markdown("### ➕ Novo Lançamento")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    tipo = st.radio("Tipo", ["Receita", "Despesa"], horizontal=True)
    val = st.number_input("Valor", min_value=0.0, step=10.0, format="%.2f")
    desc = st.text_input("Descrição", placeholder="Ex: Mercado")
    cats = st.session_state['config_categorias']['receita'] if tipo == "Receita" else st.session_state['config_categorias']['despesa']
    cat = st.selectbox("Categoria", cats)
    dt = st.date_input("Data", date.today(), format="DD/MM/YYYY")
    
    # Preview da Lógica de Negócio
    ref_preview = get_shifted_reference_month(dt, cat, tipo)
    st.info(f"📅 **Competência do Orçamento:** {ref_preview}")
    
    # Opções de Repetição
    is_rec = st.checkbox("Repetir este lançamento?", key="new_recur_check")
    recur_type = "Automático (Mensal)"
    recur_times = 1
    
    if is_rec:
        recur_type = st.radio("Como repetir?", ["Automático (Recorrente)", "Parcelado / Fixo (Gerar Agora)"], horizontal=True)
        if recur_type == "Parcelado / Fixo (Gerar Agora)":
            recur_times = st.number_input("Quantas vezes?", min_value=2, max_value=48, value=12, step=1)
            st.info(f"Serão criados **{recur_times}** lançamentos imediatamente (de {dt.strftime('%m/%Y')} até {(dt + pd.DateOffset(months=recur_times-1)).strftime('%m/%Y')}).")

    if st.button("Confirmar Lançamento", type="primary", use_container_width=True):
        saved_ok = False
        
        # LÓGICA DE SALVAMENTO
        if is_rec and recur_type == "Parcelado / Fixo (Gerar Agora)":
            # Gerar Múltiplos Lançamentos (recorrente=False pois já existem)
            prog_bar = st.progress(0)
            for i in range(recur_times):
                # Data futura
                future_dt = (pd.to_datetime(dt) + pd.DateOffset(months=i)).date()
                
                # Recalcular referência
                future_ref = get_shifted_reference_month(future_dt, cat, tipo)
                
                # Clonar dados
                batch_data = {
                    "tipo": tipo,
                    "data": future_dt,
                    "mes_referencia": future_ref,
                    "categoria": cat,
                    "descricao": f"{sanitize_input(desc)} ({i+1}/{recur_times})",
                    "valor": val,
                    "status": "Pendente",
                    "recorrente": False # Não precisa gerar auto, pois já criamos
                }
                add_transaction(batch_data)
                prog_bar.progress((i + 1) / recur_times)
            
            saved_ok = True
            msg_toast = f"{recur_times} lançamentos gerados com sucesso!"
            
        else:
            # Lançamento Único (ou Recorrente Automático)
            single_data = {
                "tipo": tipo, 
                "data": dt, 
                "mes_referencia": get_shifted_reference_month(dt, cat, tipo), 
                "categoria": cat, 
                "descricao": sanitize_input(desc), 
                "valor": val, 
                "status": "Pendente",
                "recorrente": is_rec # True se for Automático
            }
            
            if add_transaction(single_data):
                saved_ok = True
                msg_toast = f"{tipo} adicionado! (Ref: {single_data['mes_referencia']})"

        if saved_ok:
            st.session_state["toast_msg"] = msg_toast
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# --- ABA 5: CONFIG ---
elif selected == "Config":
    st.markdown("### ⚙️ Ajustes")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    
    # Theme Selector
    st.markdown("##### Personalização")
    c_theme, c_dark = st.columns([2, 1])
    
    with c_theme:
        sel_theme = st.selectbox("Tema Visual", list(TEMAS.keys()), index=list(TEMAS.keys()).index(st.session_state['theme_choice']))
        if sel_theme != st.session_state['theme_choice']:
            st.session_state['theme_choice'] = sel_theme
            st.rerun()
            
    with c_dark:
        # Dark Mode Toggle
        dm = st.toggle("Modo Escuro", value=st.session_state['dark_mode'])
        if dm != st.session_state['dark_mode']:
            st.session_state['dark_mode'] = dm
            st.rerun()
        
    st.toggle("Notificações", value=True)
    st.divider()
    
    st.markdown("##### Gerenciar Categorias")
    
    # Gerenciar Receitas
    with st.expander("Categorias de Receita"):
        new_cat_rec = st.text_input("Nova Categoria (Receita)", placeholder="Ex: Investimentos")
        if st.button("Adicionar Receita", key="add_rec"):
            if new_cat_rec and new_cat_rec not in st.session_state['config_categorias']['receita']:
                st.session_state['config_categorias']['receita'].append(new_cat_rec)
                st.session_state["toast_msg"] = f"Categoria '{new_cat_rec}' adicionada!"
                st.rerun()
                
        cats_rec_del = st.multiselect("Remover (Receita)", st.session_state['config_categorias']['receita'], key="del_rec")
        if st.button("Remover Selecionadas (Receita)", key="btn_del_rec"):
            for c in cats_rec_del:
                if c in st.session_state['config_categorias']['receita']:
                    st.session_state['config_categorias']['receita'].remove(c)
            st.session_state["toast_msg"] = "Categorias removidas com sucesso!"
            st.rerun()

    # Gerenciar Despesas
    with st.expander("Categorias de Despesa"):
        new_cat_des = st.text_input("Nova Categoria (Despesa)", placeholder="Ex: Lazer")
        if st.button("Adicionar Despesa", key="add_des"):
            if new_cat_des and new_cat_des not in st.session_state['config_categorias']['despesa']:
                st.session_state['config_categorias']['despesa'].append(new_cat_des)
                st.session_state["toast_msg"] = f"Categoria '{new_cat_des}' adicionada!"
                st.rerun()

        cats_des_del = st.multiselect("Remover (Despesa)", st.session_state['config_categorias']['despesa'], key="del_des")
        if st.button("Remover Selecionadas (Despesa)", key="btn_del_des"):
            for c in cats_des_del:
                if c in st.session_state['config_categorias']['despesa']:
                    st.session_state['config_categorias']['despesa'].remove(c)
            st.session_state["toast_msg"] = "Categorias removidas com sucesso!"
            st.rerun()
            
    st.divider()
    st.markdown("##### 📤 Exportar Dados")
    
    # CSV
    csv = df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📄 Baixar Planilha Completa (CSV)",
        data=csv,
        file_name='transacoes_financeiras.csv',
        mime='text/csv',
        use_container_width=True
    )
    
    # PDF Report
    # Filter selection for report
    meses_rep = sorted(df['mes_referencia'].unique(), reverse=True)
    if not meses_rep: meses_rep = [mes_atual]
    rep_month = st.selectbox("Selecione o mês do relatório:", ["Todos"] + list(meses_rep))
    
    if st.button("📑 Gerar Relatorio Executivo (PDF)", use_container_width=True):
        try:
            pdf_bytes = generate_pdf_report(df, rep_month)
            st.download_button(
                label="⬇️ Baixar PDF Agora",
                data=pdf_bytes,
                file_name=f"relatorio_financeiro_{rep_month.replace(' ', '_')}.pdf",
                mime='application/pdf',
                use_container_width=True,
                key='pdf_download_btn'
            )
        except Exception as e:
            st.error(f"Erro ao gerar PDF: {e}")

    # Cloud Backup Button
    if st.button("☁️ Fazer Backup na Nuvem (Firestore)", use_container_width=True):
        with st.spinner("Salvando backup seguro..."):
            if backup_data(df):
                st.session_state["toast_msg"] = "Backup realizado com sucesso! ✅"
                st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)
