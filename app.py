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

init_state()

# Cores do Design (Dinâmicas)
if st.session_state['dark_mode']:
    COLOR_BG = "#0F172A"
    COLOR_PRIMARY = "#3B82F6"
    COLOR_SUCCESS = "#10B981"
    COLOR_DANGER = "#EF4444"
    COLOR_TEXT = "#FFFFFF"
    COLOR_TEXT_LIGHT = "#CBD5E1"
    COLOR_CARD_BG = "#1E293B"
    COLOR_BORDER = "#334155"
else:
    COLOR_BG = "#F8FAFC"
    COLOR_PRIMARY = "#2563EB"
    COLOR_SUCCESS = "#10B981"
    COLOR_DANGER = "#EF4444"
    COLOR_TEXT = "#1E293B"
    COLOR_TEXT_LIGHT = "#64748B"
    COLOR_CARD_BG = "#FFFFFF"
    COLOR_BORDER = "#E2E8F0"

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

    /* Estilo Específico para Botões de Popover (Nova Receita/Despesa) */
    div[data-testid="stPopover"] > button {{
        background-color: {COLOR_PRIMARY} !important;
        color: white !important;
        border: none !important;
    }}
    div[data-testid="stPopover"] > button p {{
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
@st.cache_data(ttl=300)
def get_transactions():
    if db is None:
        data = st.session_state['mock_data']
        df = pd.DataFrame(data) if data else pd.DataFrame(columns=['id', 'tipo', 'data', 'valor', 'categoria'])
    else:
        try:
            docs = db.collection(COLLECTION_NAME).stream()
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

    if not df.empty:
        df['data'] = pd.to_datetime(df['data'])
        df['valor'] = df['valor'].astype(float)
        return df.sort_values(by='data', ascending=False)
    return df

def delete_transaction(doc_id):
    if db is None:
        st.session_state['mock_data'] = [d for d in st.session_state['mock_data'] if d['id'] != doc_id]
        return True
    else:
        try:
            db.collection(COLLECTION_NAME).document(doc_id).delete()
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
             # Converter date para datetime para o Firestore (apenas se 'data' estiver no update)
            if 'data' in data and isinstance(data['data'], date) and not isinstance(data['data'], datetime):
                data['data'] = datetime.combine(data['data'], datetime.min.time())
                
            db.collection(COLLECTION_NAME).document(doc_id).update(data)
            return True
        except Exception as e:
            st.error(f"Erro ao atualizar: {e}")
            return False
            
    get_transactions.clear()
    return True


def add_transaction(data):
    if db is None:
        data['id'] = str(uuid.uuid4())
        st.session_state['mock_data'].insert(0, data)
        return True
    else:
        try:
            # Converter date para datetime para o Firestore (se necessário)
            # Firestore aceita datetime, mas st.date_input retorna date
            if isinstance(data['data'], date) and not isinstance(data['data'], datetime):
                data['data'] = datetime.combine(data['data'], datetime.min.time())
                
            db.collection(COLLECTION_NAME).add(data)
            return True
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")
            db.collection(COLLECTION_NAME).add(data)
            return True
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")
            return False
            
    get_transactions.clear()
    return True

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
            "valor": e_val, "descricao": e_desc, "categoria": e_cat,
            "data": e_date, "mes_referencia": e_ref, "status": e_status,
            "recorrente": e_rec
        }
        if update_transaction(row['id'], upd):
            st.session_state["toast_msg"] = "Transação atualizada com sucesso!"
            st.rerun()

    # Botão Duplicar
    if st.button("📑 Duplicar Transação", use_container_width=True):
        new_data = row.copy()
        new_data['id'] = str(uuid.uuid4())
        new_data['descricao'] = f"{row['descricao']} (Cópia)"
        new_data['status'] = "Pendente"
        # Mantém a data original ou muda para hoje? Vamos manter original para facilitar
        
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
        if cat == "Salário":
            shift = 1 # Salário Reference -> Pays Next Month
        elif cat == "AC-4":
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
    
    # 2. Pegar recorrentes do mês passado
    df_last = df[(df['mes_referencia'] == last_month_str) & (df.get('recorrente', False) == True) & (df['tipo'] == 'Despesa')]
    
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
                    "tipo": "Despesa",
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

def generate_pdf_report(df, month_str):
    pdf = PDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Title Context
    pdf.cell(0, 10, txt=f"Periodo: {month_str}", ln=True, align='C')
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
    pdf.cell(0, 10, "1. Resumo Financeiro", 0, 1)
    pdf.set_font("Arial", size=12)
    pdf.cell(0, 8, f"Receitas: R$ {rec:,.2f}", 0, 1)
    pdf.cell(0, 8, f"Despesas: R$ {desp:,.2f}", 0, 1)
    
    # Color logic for balance
    pdf.set_text_color(0, 150, 0) if saldo >= 0 else pdf.set_text_color(200, 0, 0)
    pdf.cell(0, 8, f"Saldo Liquido: R$ {saldo:,.2f}", 0, 1)
    pdf.set_text_color(0, 0, 0) # Reset
    pdf.ln(5)
    
    # 2. Charts (Matplotlib)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "2. Detalhamento de Despesas", 0, 1)
    
    if not df_filt.empty and desp > 0:
        df_d = df_filt[df_filt['tipo'] == 'Despesa']
        if not df_d.empty:
            cat_sums = df_d.groupby('categoria')['valor'].sum()
            
            # Create Pie Chart
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.pie(cat_sums, labels=cat_sums.index, autopct='%1.1f%%', startangle=90)
            ax.axis('equal')
            plt.title("Distribuicao por Categoria")
            
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
        pdf.cell(0, 10, "Sem dados de despesas.", 0, 1)
        
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
    
    c1, c2 = st.columns([3, 1])
    c1.markdown(f"### Olá, Gestor AC-4 👋")
    
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
    
    c1, c2 = st.columns(2)
    with c1: st.markdown(card_metric("Receita Total", f"R$ {rec:,.2f}", "12% vs mês ant.", "pos"), unsafe_allow_html=True)
    with c2: st.markdown(card_metric("Despesas", f"R$ {desp:,.2f}", "5% vs mês ant.", "neg"), unsafe_allow_html=True)
    
    # Forecast Logic
    recur_pending = df_view[(df_view['recorrente']==True) & (df_view['status']=='Pendente')]['valor'].sum()
    forecast_bal = saldo - recur_pending
    
    c3, c4 = st.columns(2)
    with c3: st.markdown(card_metric("Saldo Líquido", f"R$ {saldo:,.2f}", "Atual", "pos"), unsafe_allow_html=True)
    with c4: st.markdown(card_metric("Previsão (Recorrentes)", f"R$ {forecast_bal:,.2f}", f"- R$ {recur_pending:.2f} pend.", "neg" if forecast_bal < 0 else "pos"), unsafe_allow_html=True)

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

    # AI Section
    st.markdown("##### 🤖 Análise Inteligente")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    ai_msgs = generate_ai_insights(df, mes_sel)
    for msg in ai_msgs:
        st.markdown(f"- {msg}")
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
                    "categoria": nr_cat, "descricao": nr_desc, "valor": nr_val, "status": "Recebido"
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
            sort_r = st.radio("Ord.", ["⬇️ Recentes", "⬆️ Antigas"], horizontal=True, label_visibility="collapsed", key="sort_rec")
        
        # Filter Logic
        if "rec_filter_cat" not in st.session_state: st.session_state["rec_filter_cat"] = "All"
        
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
                
            last_m_header = None
            for idx, row in df_r.head(st.session_state['limit_rec']).iterrows():
                current_m_header = get_month_from_date(row['data'])
                if current_m_header != last_m_header:
                    st.markdown(f"<div style='background: #F8FAFC; padding: 5px 10px; border-radius: 5px; font-weight: 600; font-size: 0.8rem; color: #64748B; margin-top: 15px; margin-bottom: 5px;'>{current_m_header.upper()}</div>", unsafe_allow_html=True)
                    last_m_header = current_m_header

                d_day = row['data'].strftime("%d")
                d_month = row['data'].strftime("%b").upper()
                val_fmt = f"+ ${row['valor']:,.2f}"
                
                # Row Layout
                c_row1, c_row2 = st.columns([5, 1])
                with c_row1:
                    st.markdown(f"""
                    <div style="display: flex; align-items: center; gap: 15px; padding: 5px 0;">
                        <div style="background: #EFF6FF; color: {COLOR_PRIMARY}; width: 50px; height: 50px; border-radius: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700;">
                             <span style="font-size: 0.65rem; color: #60A5FA;">{d_month}</span>
                             <span style="font-size: 1.1rem; line-height: 1;">{d_day}</span>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: {COLOR_TEXT}; font-size: 0.95rem;">{row['descricao']}</div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                 <span style="background: #F3F4F6; color: #4B5563; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">{row['categoria']}</span>
                                 <span style="color: #9CA3AF; font-size: 0.75rem;">AC-4 Rec.</span>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                    # Ações (Edit + Delete)
                    with c_row2:
                        c_edit, c_del = st.columns([1, 1], gap="small")
                        
                        # Edit Dialog Button
                        with c_edit:
                             if st.button("✏️", key=f"btn_edit_r_{row['id']}"):
                                 edit_transaction_dialog(row, "receita")

                        # Delete Popover (No Key to fix crash)
                        with c_del:
                            with st.popover("🗑️"):
                                st.write("Confirma?")
                                if st.button("Sim", key=f"del_rec_{row['id']}"):
                                    if delete_transaction(row['id']):
                                        st.session_state["toast_msg"] = f"Receita de R$ {row['valor']:.2f} removida."
                                        st.rerun()

                st.markdown("<hr style='margin: 0; border-top: 1px solid #F1F5F9;'>", unsafe_allow_html=True)

            if len(df_r) > st.session_state['limit_rec']:
                if st.button("+ Carregar mais transações", key="load_more_rec", type="tertiary"):
                    st.session_state['limit_rec'] += 10
                    st.rerun()

        else:
            st.write("No transactions.")
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
            
            if st.button("Salvar Despesa", type="primary", use_container_width=True, key="quick_desp_btn"):
                if add_transaction({
                    "tipo": "Despesa", "data": nd_date, "mes_referencia": nd_ref,
                    "categoria": nd_cat, "descricao": nd_desc, "valor": nd_val, "status": "Pendente"
                }):
                     st.session_state["toast_msg"] = f"Despesa adicionada! ({nd_ref})"
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
        daily_d = df_d.groupby('data')['valor'].sum().reset_index()
        fig_d = px.bar(daily_d, x='data', y='valor')
        fig_d.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(showgrid=False, tickformat="%d"), 
            yaxis=dict(showgrid=False, showticklabels=False),
            margin=dict(l=10, r=10, t=10, b=10), height=180,
            bargap=0.6,
            font=dict(color=COLOR_TEXT)
        )
        try:
            fig_d.update_traces(marker_color=COLOR_DANGER, marker_cornerradius=4)
        except:
            fig_d.update_traces(marker_color=COLOR_DANGER)
        st.plotly_chart(fig_d, use_container_width=True, config={'displayModeBar': False})
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
            sort_d = st.radio("Ord.", ["⬇️ Recentes", "⬆️ Antigas"], horizontal=True, label_visibility="collapsed", key="sort_desp") 

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
                
            last_m_header_d = None
            for idx, row in df_d.head(st.session_state['limit_desp']).iterrows():
                current_m_header_d = get_month_from_date(row['data'])
                if current_m_header_d != last_m_header_d:
                    st.markdown(f"<div style='background: #F8FAFC; padding: 5px 10px; border-radius: 5px; font-weight: 600; font-size: 0.8rem; color: #64748B; margin-top: 15px; margin-bottom: 5px;'>{current_m_header_d.upper()}</div>", unsafe_allow_html=True)
                    last_m_header_d = current_m_header_d

                d_day = row['data'].strftime("%d")
                d_month = row['data'].strftime("%b").upper()
                val_fmt = f"- R$ {row['valor']:,.2f}"
                
                # Layout Row
                c_row1, c_row2 = st.columns([5, 1])
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
                                    <span style="color: {COLOR_DANGER}; font-size: 0.85rem; font-weight: 700;">{val_fmt}</span>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                with c_row2:
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

            if len(df_d) > st.session_state['limit_desp']:
                if st.button("+ Carregar mais transações", key="load_more_desp", type="tertiary"):
                    st.session_state['limit_desp'] += 10
                    st.rerun()
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
    
    if st.button("Confirmar Lançamento", type="primary", use_container_width=True):
        new_data = {
            "tipo": tipo, 
            "data": dt, 
            "mes_referencia": get_shifted_reference_month(dt, cat, tipo), 
            "categoria": cat, 
            "descricao": desc, 
            "valor": val, 
            "valor": val, 
            "status": "Pendente"
        }
        
        # Add checkbox for recurrence in New Tab
        is_rec = st.checkbox("Transação Recorrente? (Repetir mensalmente)", key="new_recur_check")
        new_data["recorrente"] = is_rec
        
        if add_transaction(new_data):
            # st.success... removido em favor do Toast persistente
            st.session_state["toast_msg"] = f"{tipo} adicionado! (Ref: {new_data['mes_referencia']})"
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# --- ABA 5: CONFIG ---
elif selected == "Config":
    st.markdown("### ⚙️ Ajustes")
    st.markdown('<div class="custom-card">', unsafe_allow_html=True)
    
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

    st.markdown('</div>', unsafe_allow_html=True)
