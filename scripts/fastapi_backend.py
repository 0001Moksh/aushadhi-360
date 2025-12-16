"""
FastAPI Backend for Aushadhi 360
Run this with: python scripts/fastapi_backend.py
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Aushadhi 360 API")

# CORS middleware to allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Models ==============

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    email: str
    name: str

class CartItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    unit: str

class BillingRequest(BaseModel):
    items: List[CartItem]
    customer_email: Optional[str]
    subtotal: float
    gst: float
    total: float

class AIRequest(BaseModel):
    symptoms: str

class Suggestion(BaseModel):
    name: str
    usage: str
    quantity: str
    available: bool

# ============== Endpoints ==============

@app.get("/")
async def root():
    return {"message": "Aushadhi 360 API - Running", "version": "1.0.0"}

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user
    In production: Verify against database with approved users
    """
    # Mock authentication
    if request.email == "demo@aushadhi360.com" and request.password == "demo123":
        return LoginResponse(
            token="mock_jwt_token_12345",
            email=request.email,
            name="Demo User"
        )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/billing/create")
async def create_bill(request: BillingRequest):
    """
    Create billing record
    In production: Save to database with timestamp
    """
    print(f"[Billing] Created bill for {len(request.items)} items, Total: ₹{request.total}")
    
    # Simulate database save
    bill_id = "BILL-" + str(hash(str(request.items)))[:8].upper()
    
    return {
        "success": True,
        "bill_id": bill_id,
        "total": request.total,
        "timestamp": "2025-01-10T10:30:00Z"
    }

@app.post("/api/email/invoice")
async def send_invoice(email: str, invoice_data: dict):
    """
    Send invoice via email
    In production: Use SMTP service with email template
    """
    print(f"[Email] Sending invoice to {email}")
    
    # Simulate email sending with failover
    try:
        # Primary: Gmail SMTP
        # Fallback: Queue for later
        return {"success": True, "message": "Invoice sent successfully"}
    except Exception as e:
        return {"success": False, "message": "Email queued for retry", "queued": True}

@app.post("/api/ai/suggest")
async def ai_suggest(request: AIRequest):
    """
    AI-based medicine suggestions
    In production: Call Gemini API with failover to rule-based logic
    """
    print(f"[AI] Processing symptoms: {request.symptoms[:50]}...")
    
    # Simulate Gemini AI call with fallback
    try:
        # Primary: Gemini API
        # Fallback: Rule-based suggestions
        suggestions = [
            Suggestion(
                name="Paracetamol 500mg",
                usage="Take 1 tablet every 6 hours after meals",
                quantity="1 strip (10 tablets)",
                available=True
            ),
            Suggestion(
                name="Gelusil Syrup",
                usage="Take 2 teaspoons after meals",
                quantity="1 bottle",
                available=True
            )
        ]
        
        return {"success": True, "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI service unavailable")

@app.post("/api/ocr/process")
async def process_ocr(file: UploadFile = File(...)):
    """
    OCR processing for medicine bill
    In production: Use OCR service (Tesseract, Google Vision, etc.)
    """
    print(f"[OCR] Processing file: {file.filename}")
    
    # Simulate OCR processing with failover
    try:
        # Primary: Google Vision API
        # Fallback: Ask for manual entry
        
        extracted_medicines = [
            {"name": "Paracetamol 500mg", "quantity": 100, "price": 5},
            {"name": "Cyclopam Tablet", "quantity": 50, "price": 45}
        ]
        
        return {
            "success": True,
            "medicines": extracted_medicines,
            "message": "Bill processed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="OCR service unavailable")

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "ai": "available",
            "ocr": "available",
            "email": "available"
        }
    }

# ============== Run Server ==============

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Aushadhi 360 FastAPI Backend...")
    print("📡 API available at: http://localhost:8000")
    print("📖 Docs available at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
