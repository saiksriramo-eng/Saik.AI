import os
import re
import hashlib
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI, BadRequestError
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("saikai")

load_dotenv()

# --- Initialization ---
app = FastAPI(title="SaikAI Core Engine")

# --- Robust CORS Configuration ---
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]

FRONTEND_URL = os.getenv("FRONTEND_URL")
if FRONTEND_URL:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Secure Environment Keys ---
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("🚨 Supabase credentials missing from .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(base_url="https://models.github.ai/inference", api_key=GITHUB_TOKEN) if GITHUB_TOKEN else None
MODEL = "gpt-4o"

# ==========================================
# 📦 DATA MODELS (PYDANTIC)
# ==========================================
class AuthRequest(BaseModel):
    identity: str
    password: str

class ParseRequest(BaseModel):
    identity: str  
    text: str
    target_lang: str = "English"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    identity: str  
    messages: list[ChatMessage]

# ==========================================
# 🛡️ SECURITY & VALIDATION FUNCTIONS
# ==========================================
def hash_password(password: str) -> str:
    salt = "saikai_security_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def validate_identity(identity: str) -> bool:
    email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    phone_pattern = r'^\d{10}$'
    return bool(re.match(email_pattern, identity) or re.match(phone_pattern, identity))

def is_content_filter_error(e: Exception) -> bool:
    """Detect Azure OpenAI / GitHub Models content filter rejections gracefully."""
    err_str = str(e).lower()
    if isinstance(e, BadRequestError):
        # Azure surfaces content policy errors as 400 BadRequestError
        # Check the error body for filter codes
        try:
            body = str(getattr(e, 'body', '') or '').lower()
            if any(k in body for k in ['content_filter', 'responsibleai', 'filtered', 'policy']):
                return True
        except Exception:
            pass
    content_filter_signals = [
        'content_filter', 'content filter', 'responsibleaipolicy',
        'filtered', 'content_policy_violation', 'prompt_blocked',
        'azure.content_filter', 'flagged', 'policy violation',
        'violates', 'harmful content', 'safety system',
    ]
    return any(signal in err_str for signal in content_filter_signals)

def content_filter_response(mode: str) -> dict:
    """Return a graceful user-facing payload when content is filtered by Azure."""
    messages = {
        'Srotra': [{'text': 'Input flagged by safety filter — please rephrase.', 'urgency': 1}],
        'Vadatibru': {'spoken': 'I could not process that input. Please try rephrasing.'},
        'Companion': {'reply': 'That message was flagged by my safety filter. Feel free to rephrase or ask me something else — I am still here!'},
    }
    return messages.get(mode, {'detail': 'Content filtered by safety policy.'})

# ==========================================
# 🚀 API ENDPOINTS
# ==========================================

@app.post("/api/auth/register")
async def register_user(req: AuthRequest):
    clean_id = req.identity.strip()
    if not validate_identity(clean_id):
        raise HTTPException(status_code=400, detail="Invalid email or phone number format.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    existing = supabase.table("profiles").select("*").eq("identity", clean_id).execute()
    if len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Identity already registered.")
    
    supabase.table("profiles").insert({"identity": clean_id, "password": hash_password(req.password)}).execute()
    return {"status": "success", "message": "User registered."}

@app.post("/api/auth/login")
async def login_user(req: AuthRequest):
    clean_id = req.identity.strip()
    response = supabase.table("profiles").select("*").eq("identity", clean_id).eq("password", hash_password(req.password)).execute()
    if len(response.data) > 0:
        return {"status": "success", "message": "Authenticated"}
    raise HTTPException(status_code=401, detail="Invalid credentials.")

@app.post("/api/parse")
async def parse_audio_text(req: ParseRequest):
    if not client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized. Check GITHUB_TOKEN.")
    
    # 🚀 NEW: Captures EVERYTHING. No more ignored words.
    system_prompt = f"""You are SaikAI's Srotra engine, a real-time environmental audio decoder.
Your job is to take raw speech and extract its core meaning for a deaf user.

CRITICAL RULES:
1. NEVER return empty or UNKNOWN. You must process EVERY input the user gives.
2. If it is a simple greeting, casual chat, or single word (e.g., "Hello", "How are you"), return it exactly as the token.
3. Assign an URGENCY SCORE to each token:
   - 1: Routine/Casual (Greetings, normal chat, random words)
   - 2: Important (Direct questions, instructions, names)
   - 3: Critical (Emergencies, warnings, alarms)
4. Translate and output the tokens STRICTLY in {req.target_lang}. Keep vocabulary simple.
5. FORMAT: Token text|Urgency Number, Token text|Urgency Number
Do NOT output anything else.
"""
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": req.text},
            ],
            max_tokens=80, temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        
        parsed_tokens = []
        for item in raw.split(","):
            if "|" in item:
                parts = item.split("|")
                try: urgency = int(parts[1].strip())
                except: urgency = 1
                parsed_tokens.append({"text": parts[0].strip(), "urgency": urgency})
            else:
                # Fallback if AI forgets the pipe
                parsed_tokens.append({"text": item.strip(), "urgency": 1})
        
        # PERSISTENCE STEP: Save to Supabase History
        supabase.table("user_history").insert({
            "identity": req.identity,
            "app_mode": "Srotra",
            "user_input": req.text,
            "ai_output": parsed_tokens
        }).execute()

        return {"status": "success", "tokens": parsed_tokens}
    except Exception as e:
        logger.error("Srotra parse error: %s", e, exc_info=True)
        if is_content_filter_error(e):
            filtered = content_filter_response("Srotra")
            # Still log the attempt to Supabase
            try:
                supabase.table("user_history").insert({
                    "identity": req.identity, "app_mode": "Srotra",
                    "user_input": req.text, "ai_output": filtered
                }).execute()
            except Exception:
                pass
            return {"status": "filtered", "tokens": filtered}
        raise HTTPException(status_code=500, detail=f"Srotra engine error: {str(e)}")

@app.post("/api/chat")
async def chat_with_saikai(req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized.")
    
    companion_prompt = """You are SaikAI, an empathetic, highly intelligent, and soulful personal companion.
Your user might be deaf or hard-of-hearing, and they are using you to chat, relax, or seek advice.
RULES:
1. Be warm, conversational, and genuinely interested in the user.
2. Do not sound like a robot. Use a natural, friendly, and slightly casual tone.
3. Keep responses concise but meaningful (2-4 sentences max unless explaining something complex).
4. Do NOT output the | urgency formats here. This is a normal conversation."""
    
    try:
        system_msg = [{"role": "system", "content": companion_prompt}]
        formatted_messages = system_msg + [{"role": msg.role, "content": msg.content} for msg in req.messages]
        
        response = client.chat.completions.create(
            model=MODEL,
            messages=formatted_messages,
            max_tokens=300,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
        
        # PERSISTENCE STEP: Save to Supabase History
        last_user_msg = req.messages[-1].content if req.messages else ""
        if last_user_msg:
            supabase.table("user_history").insert({
                "identity": req.identity,
                "app_mode": "Companion",
                "user_input": last_user_msg,
                "ai_output": {"reply": reply}
            }).execute()

        return {"status": "success", "reply": reply}
    except Exception as e:
        logger.error("Mitram chat error: %s", e, exc_info=True)
        if is_content_filter_error(e):
            filtered = content_filter_response("Companion")
            return {"status": "filtered", "reply": filtered["reply"]}
        raise HTTPException(status_code=500, detail=f"Mitram engine error: {str(e)}")

# Fetch persistent logging data array for sidebar views
@app.get("/api/history/{identity}")
async def get_user_history(identity: str):
    try:
        res = supabase.table("user_history").select("*").eq("identity", identity).order("created_at", descending=True).execute()
        return {"status": "success", "history": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "SaikAI Neural Engine Online."}

# ==========================================
# 🚀 VADATIBRU AAC SPEECH ENGINE
# ==========================================
@app.post("/api/vadatibru")
async def vadatibru_translate(req: ParseRequest):
    if not client:
        raise HTTPException(status_code=500, detail="LLM Client not initialized.")
    
    aac_prompt = """You are SaikAI, a strict Augmentative and Alternative Communication (AAC) speech engine.
Your ONLY task is to convert the user's input into a natural, grammatically correct spoken sentence.

CRITICAL RULES:
1. NEVER summarize. NEVER remove details, nouns, or context.
2. If the input is already a full sentence, you MUST output the exact same sentence, only fixing punctuation.
3. Output ONLY the final spoken sentence. No quotes, no explanations.

EXAMPLES:
User: "ME WATER WANT"
Output: I want water.

User: "Where is my chessboard, the king piece is missing"
Output: Where is my chessboard? The king piece is missing.

User: "STORE GO LATER"
Output: I will go to the store later.
"""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": aac_prompt},
                {"role": "user",   "content": req.text},
            ],
            max_tokens=150, 
            temperature=0.1, # Extremely low temperature forces strict adherence to the examples
        )
        spoken_output = response.choices[0].message.content.strip()
        
        # PERSISTENCE STEP: Save to our working history log
        supabase.table("user_history").insert({
            "identity": req.identity,
            "app_mode": "Vadatibru",
            "user_input": req.text,
            "ai_output": {"spoken": spoken_output}
        }).execute()

        return {"status": "success", "spoken": spoken_output}
    except Exception as e:
        logger.error("Vadatibru error: %s", e, exc_info=True)
        if is_content_filter_error(e):
            filtered = content_filter_response("Vadatibru")
            return {"status": "filtered", "spoken": filtered["spoken"]}
        raise HTTPException(status_code=500, detail=f"Vadatibru engine error: {str(e)}")