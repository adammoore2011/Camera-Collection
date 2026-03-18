from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import httpx
import bcrypt
import jwt
import secrets

# JWT Secret Key
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Camera Types
CAMERA_TYPES = [
    "Film - 35mm",
    "Film - Medium Format",
    "Film - Large Format",
    "Digital",
    "Video/Movie Camera",
    "Instant - Polaroid",
    "Instant - Instax",
    "Manual/Mechanical",
    "Single Use/Disposable",
    "Box Camera",
    "Folding Camera",
    "TLR (Twin Lens Reflex)",
    "SLR (Single Lens Reflex)",
    "Rangefinder",
    "Point & Shoot",
    "Other"
]

# Film Formats - Based on TheDarkroom.com and motion picture formats
FILM_FORMATS = [
    # Still Photography - Common
    "35mm (135 Film)",
    "120 (Medium Format)",
    "220 (Medium Format)",
    "620 (Medium Format)",
    "110 Film Cartridge",
    "126 Film Cartridge",
    "127 Film (Vest Pocket)",
    "APS (Advanced Photo System/Advantix)",
    
    # Still Photography - Large Format Sheet Film
    "4x5 Sheet Film",
    "5x7 Sheet Film",
    "8x10 Sheet Film",
    "11x14 Sheet Film",
    
    # Still Photography - Discontinued/Rare
    "116 Film",
    "616 Film",
    "828 Film",
    "Disc Film",
    "Minox (Subminiature)",
    "Half Frame 35mm",
    "122 Film",
    
    # Instant Film
    "Instant - Polaroid 600",
    "Instant - Polaroid SX-70",
    "Instant - Polaroid i-Type",
    "Instant - Polaroid Spectra",
    "Instant - Polaroid Pack Film",
    "Instant - Instax Mini",
    "Instant - Instax Wide",
    "Instant - Instax Square",
    "Instant - Fuji FP-100C",
    
    # Motion Picture / Movie Film
    "Standard 8mm",
    "Super 8",
    "Single 8",
    "16mm",
    "Super 16",
    "35mm Motion Picture",
    "65mm/70mm",
    "IMAX",
    "VistaVision",
    
    # Digital/Other
    "N/A (Digital)",
    "Other"
]

# Accessory Categories
ACCESSORY_TYPES = [
    "Lens",
    "Filter",
    "Flash/Strobe",
    "Light Meter",
    "Tripod/Monopod",
    "Camera Bag/Case",
    "Strap",
    "Battery Grip",
    "Viewfinder",
    "Film Back",
    "Lens Hood",
    "Cable Release",
    "Light/Lighting",
    "Reflector",
    "Diffuser",
    "Memory Card",
    "Battery",
    "Charger",
    "Cleaning Kit",
    "Film Scanner",
    "Darkroom Equipment",
    "Other"
]

# ============ AUTH MODELS ============

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class SessionData(BaseModel):
    session_id: str

# ============ CAMERA MODELS ============

# Condition options
CONDITIONS = ["Mint", "Excellent", "Good", "Fair", "For Parts"]

# Film types
FILM_TYPES = ["Color Negative", "Black & White", "Slide/Reversal", "Instant", "Movie Film", "Other"]

# Film formats for stock
FILM_STOCK_FORMATS = ["35mm", "120/Medium Format", "4x5 Sheet", "8x10 Sheet", "110", "127", "Instant", "Super 8", "16mm", "Other"]

class ServiceHistoryEntry(BaseModel):
    date: str
    description: str
    cost: Optional[float] = None

# ============ FILM STOCK MODEL ============

class FilmStockBase(BaseModel):
    name: str  # e.g., "Kodak Portra 400"
    brand: str  # e.g., "Kodak"
    film_type: str  # Color Negative, B&W, Slide, etc.
    iso: Optional[int] = None  # e.g., 400
    format: str  # 35mm, 120, etc.
    quantity: int = 1  # Number of rolls
    expiration_date: Optional[str] = None  # YYYY-MM or YYYY-MM-DD
    storage_location: Optional[str] = None  # e.g., "Freezer", "Fridge"
    notes: Optional[str] = None
    favorite_cameras: Optional[List[str]] = None  # Camera IDs this film works well with

class FilmStock(FilmStockBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# ============ SHOOTING LOG MODEL ============

class ShootingLogBase(BaseModel):
    date: str  # Date of shoot
    camera_id: Optional[str] = None  # Which camera was used
    camera_name: Optional[str] = None  # Camera name for display
    film_stock_id: Optional[str] = None  # Which film was used
    film_name: Optional[str] = None  # Film name for display
    location: Optional[str] = None  # Where the shoot took place
    shots_taken: Optional[int] = None  # Number of shots/frames
    notes: Optional[str] = None
    weather: Optional[str] = None  # Sunny, Cloudy, etc.
    rating: Optional[int] = None  # 1-5 rating for the session

class ShootingLog(ShootingLogBase):
    id: str
    user_id: str
    created_at: datetime

class CameraBase(BaseModel):
    name: str
    brand: str
    camera_type: str
    film_format: str
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    # Value tracking
    estimated_value: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    purchase_location: Optional[str] = None
    # Condition
    condition: Optional[str] = None
    # Service history
    service_history: Optional[List[dict]] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    camera_type: Optional[str] = None
    film_format: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    estimated_value: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    purchase_location: Optional[str] = None
    condition: Optional[str] = None
    service_history: Optional[List[dict]] = None

class Camera(CameraBase):
    id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WishlistItemBase(BaseModel):
    name: str
    brand: str
    camera_type: str
    film_format: str
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    priority: str = "medium"

class WishlistItemCreate(WishlistItemBase):
    pass

class WishlistItemUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    camera_type: Optional[str] = None
    film_format: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    priority: Optional[str] = None

class WishlistItem(WishlistItemBase):
    id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Accessory Models
class AccessoryBase(BaseModel):
    name: str
    brand: str
    accessory_type: str
    compatible_with: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None

class AccessoryCreate(AccessoryBase):
    pass

class AccessoryUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    accessory_type: Optional[str] = None
    compatible_with: Optional[str] = None
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None

class Accessory(AccessoryBase):
    id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Email/Password Auth Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

# ============ AUTH HELPERS ============

async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # First try to find session in database
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if session:
        # Check expiry
        expires_at = session.get("expires_at")
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                return None
        
        user = await db.users.find_one(
            {"user_id": session["user_id"]},
            {"_id": 0, "password_hash": 0}
        )
        return user
    
    # If not found in sessions, try to decode as JWT
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id:
            user = await db.users.find_one(
                {"user_id": user_id},
                {"_id": 0, "password_hash": 0}
            )
            return user
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        pass
    
    return None

async def require_auth(request: Request) -> dict:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def get_user_or_device(request: Request) -> dict:
    """Get authenticated user or create/return a device-based anonymous user"""
    # First try to get authenticated user
    user = await get_current_user(request)
    if user:
        return user
    
    # Check for device_id header (for anonymous/local users)
    device_id = request.headers.get("X-Device-ID")
    if device_id:
        # Look for existing device user
        device_user = await db.users.find_one({"device_id": device_id})
        if device_user:
            return {
                "user_id": device_user["user_id"],
                "device_id": device_id,
                "email": device_user.get("email"),
                "name": device_user.get("name", "Local User"),
                "is_device_user": True
            }
        else:
            # Create new device user
            user_id = f"device_{device_id[:12]}"
            new_user = {
                "user_id": user_id,
                "device_id": device_id,
                "name": "Local User",
                "is_device_user": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.users.insert_one(new_user)
            return {
                "user_id": user_id,
                "device_id": device_id,
                "name": "Local User",
                "is_device_user": True
            }
    
    # No auth and no device ID - use a default anonymous user for this request
    return {
        "user_id": "anonymous",
        "name": "Anonymous",
        "is_device_user": True
    }

# Helper functions
def camera_helper(camera) -> dict:
    return {
        "id": str(camera["_id"]),
        "user_id": camera.get("user_id", ""),
        "name": camera["name"],
        "brand": camera["brand"],
        "camera_type": camera["camera_type"],
        "film_format": camera["film_format"],
        "year": camera.get("year"),
        "notes": camera.get("notes"),
        "image": camera.get("image"),
        "images": camera.get("images", []),
        # Value tracking fields
        "estimated_value": camera.get("estimated_value"),
        "purchase_price": camera.get("purchase_price"),
        "purchase_date": camera.get("purchase_date"),
        "purchase_location": camera.get("purchase_location"),
        # Condition and service history
        "condition": camera.get("condition"),
        "service_history": camera.get("service_history", []),
        "created_at": camera.get("created_at", datetime.utcnow()),
        "updated_at": camera.get("updated_at", datetime.utcnow())
    }

def wishlist_helper(item) -> dict:
    return {
        "id": str(item["_id"]),
        "user_id": item.get("user_id", ""),
        "name": item["name"],
        "brand": item["brand"],
        "camera_type": item["camera_type"],
        "film_format": item["film_format"],
        "year": item.get("year"),
        "notes": item.get("notes"),
        "image": item.get("image"),
        "priority": item.get("priority", "medium"),
        "created_at": item.get("created_at", datetime.utcnow()),
        "updated_at": item.get("updated_at", datetime.utcnow())
    }

def accessory_helper(accessory) -> dict:
    return {
        "id": str(accessory["_id"]),
        "user_id": accessory.get("user_id", ""),
        "name": accessory["name"],
        "brand": accessory["brand"],
        "accessory_type": accessory["accessory_type"],
        "compatible_with": accessory.get("compatible_with"),
        "year": accessory.get("year"),
        "notes": accessory.get("notes"),
        "image": accessory.get("image"),
        "created_at": accessory.get("created_at", datetime.utcnow()),
        "updated_at": accessory.get("updated_at", datetime.utcnow())
    }

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def exchange_session(data: SessionData, response: Response):
    """Exchange session_id from OAuth callback for session token"""
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc)
        })
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}

# ============ EMAIL/PASSWORD AUTH ============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    """Create a JWT token for a user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    """Register a new user with email and password"""
    # Validate email format
    if not data.email or '@' not in data.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(data.password)
    
    await db.users.insert_one({
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hashed_password,
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create session token
    session_token = create_jwt_token(user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "picture": None,
        "token": session_token
    }

@api_router.post("/auth/login")
async def login_email(data: UserLogin, response: Response):
    """Login with email and password"""
    # Find user by email
    user = await db.users.find_one({"email": data.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user has a password (might be Google-only user)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google login. Please sign in with Google.")
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session token
    session_token = create_jwt_token(user["user_id"])
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
        "token": session_token
    }

# Apple Sign-In models
class AppleAuthRequest(BaseModel):
    identityToken: str
    user: Optional[str] = None
    email: Optional[str] = None
    fullName: Optional[dict] = None

@api_router.post("/auth/apple")
async def apple_auth(request: AppleAuthRequest, response: Response):
    """Handle Apple Sign-In authentication"""
    try:
        # Decode the identity token (JWT from Apple)
        # Note: In production, you should verify the token signature with Apple's public keys
        # For now, we'll decode without verification since Apple tokens are trusted
        
        # The identity token is a JWT - we'll decode it to get user info
        # Apple's JWT contains: sub (unique user ID), email, email_verified, etc.
        
        token_parts = request.identityToken.split('.')
        if len(token_parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid identity token format")
        
        # Decode the payload (middle part)
        import base64
        # Add padding if needed
        payload_part = token_parts[1]
        padding = 4 - len(payload_part) % 4
        if padding != 4:
            payload_part += '=' * padding
        
        try:
            payload_bytes = base64.urlsafe_b64decode(payload_part)
            payload = json.loads(payload_bytes.decode('utf-8'))
        except Exception as e:
            logger.error(f"Failed to decode Apple token: {e}")
            raise HTTPException(status_code=400, detail="Invalid identity token")
        
        # Get Apple user ID (sub = subject)
        apple_user_id = payload.get('sub')
        if not apple_user_id:
            raise HTTPException(status_code=400, detail="Missing user identifier in token")
        
        # Get email from token or from request
        email = payload.get('email') or request.email
        
        # Get name from request (only provided on first sign-in)
        name = None
        if request.fullName:
            given_name = request.fullName.get('givenName', '')
            family_name = request.fullName.get('familyName', '')
            name = f"{given_name} {family_name}".strip() or None
        
        logger.info(f"Apple Sign-In: apple_id={apple_user_id}, email={email}, name={name}")
        
        # Check if user exists (by Apple ID)
        existing_user = await db.users.find_one({"apple_id": apple_user_id})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update email/name if provided and different
            updates = {}
            if email and email != existing_user.get("email"):
                updates["email"] = email
            if name and name != existing_user.get("name"):
                updates["name"] = name
            if updates:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": updates}
                )
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        else:
            # Check if user exists by email (link accounts)
            if email:
                existing_by_email = await db.users.find_one({"email": email})
                if existing_by_email:
                    # Link Apple ID to existing account
                    await db.users.update_one(
                        {"email": email},
                        {"$set": {"apple_id": apple_user_id}}
                    )
                    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
                    user_id = user["user_id"]
                else:
                    # Create new user
                    user_id = f"user_{uuid.uuid4().hex[:12]}"
                    new_user = {
                        "user_id": user_id,
                        "apple_id": apple_user_id,
                        "email": email,
                        "name": name or "Apple User",
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    await db.users.insert_one(new_user)
                    user = {k: v for k, v in new_user.items() if k != "_id"}
            else:
                # No email provided - create user with just Apple ID
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "user_id": user_id,
                    "apple_id": apple_user_id,
                    "email": f"{apple_user_id}@privaterelay.appleid.com",  # Placeholder
                    "name": name or "Apple User",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await db.users.insert_one(new_user)
                user = {k: v for k, v in new_user.items() if k != "_id"}
        
        # Create session token (JWT)
        session_token = jwt.encode(
            {
                "user_id": user_id,
                "email": user.get("email"),
                "exp": datetime.now(timezone.utc) + timedelta(days=30)
            },
            JWT_SECRET,
            algorithm="HS256"
        )
        
        # Store session
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=30 * 24 * 60 * 60
        )
        
        logger.info(f"Apple Sign-In successful for user: {user_id}")
        
        return {
            "user_id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "token": session_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple Sign-In error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

# ============ PUBLIC ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Vintage Camera Collection API"}

@api_router.get("/options")
async def get_options():
    return {
        "camera_types": CAMERA_TYPES,
        "film_formats": FILM_FORMATS,
        "accessory_types": ACCESSORY_TYPES,
        "conditions": CONDITIONS,
        "film_types": FILM_TYPES,
        "film_stock_formats": FILM_STOCK_FORMATS
    }

# ============ FILM STOCK ENDPOINTS ============

@api_router.get("/film-stock")
async def get_film_stock(request: Request):
    """Get all film stock for the user"""
    user = await get_user_or_device(request)
    
    cursor = db.film_stock.find({"user_id": user["user_id"]})
    film_stock = []
    async for stock in cursor:
        film_stock.append({
            "id": str(stock["_id"]),
            "name": stock["name"],
            "brand": stock["brand"],
            "film_type": stock["film_type"],
            "iso": stock.get("iso"),
            "format": stock["format"],
            "quantity": stock.get("quantity", 1),
            "expiration_date": stock.get("expiration_date"),
            "storage_location": stock.get("storage_location"),
            "notes": stock.get("notes"),
            "favorite_cameras": stock.get("favorite_cameras", []),
            "created_at": stock.get("created_at"),
            "updated_at": stock.get("updated_at")
        })
    
    return film_stock

@api_router.post("/film-stock")
async def create_film_stock(request: Request, stock: FilmStockBase):
    """Add new film stock"""
    user = await get_user_or_device(request)
    
    now = datetime.utcnow()
    stock_dict = {
        "user_id": user["user_id"],
        "name": stock.name,
        "brand": stock.brand,
        "film_type": stock.film_type,
        "iso": stock.iso,
        "format": stock.format,
        "quantity": stock.quantity,
        "expiration_date": stock.expiration_date,
        "storage_location": stock.storage_location,
        "notes": stock.notes,
        "favorite_cameras": stock.favorite_cameras or [],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.film_stock.insert_one(stock_dict)
    return {"id": str(result.inserted_id), "message": "Film stock added"}

@api_router.get("/film-stock/{stock_id}")
async def get_film_stock_by_id(stock_id: str, request: Request):
    """Get a specific film stock item"""
    user = await get_user_or_device(request)
    
    stock = await db.film_stock.find_one({
        "_id": ObjectId(stock_id),
        "user_id": user["user_id"]
    })
    
    if not stock:
        raise HTTPException(status_code=404, detail="Film stock not found")
    
    return {
        "id": str(stock["_id"]),
        "name": stock["name"],
        "brand": stock["brand"],
        "film_type": stock["film_type"],
        "iso": stock.get("iso"),
        "format": stock["format"],
        "quantity": stock.get("quantity", 1),
        "expiration_date": stock.get("expiration_date"),
        "storage_location": stock.get("storage_location"),
        "notes": stock.get("notes"),
        "favorite_cameras": stock.get("favorite_cameras", []),
        "created_at": stock.get("created_at"),
        "updated_at": stock.get("updated_at")
    }

@api_router.put("/film-stock/{stock_id}")
async def update_film_stock(stock_id: str, request: Request, stock: FilmStockBase):
    """Update film stock"""
    user = await get_user_or_device(request)
    
    update_data = {
        "name": stock.name,
        "brand": stock.brand,
        "film_type": stock.film_type,
        "iso": stock.iso,
        "format": stock.format,
        "quantity": stock.quantity,
        "expiration_date": stock.expiration_date,
        "storage_location": stock.storage_location,
        "notes": stock.notes,
        "favorite_cameras": stock.favorite_cameras or [],
        "updated_at": datetime.utcnow()
    }
    
    result = await db.film_stock.update_one(
        {"_id": ObjectId(stock_id), "user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Film stock not found")
    
    return {"message": "Film stock updated"}

@api_router.delete("/film-stock/{stock_id}")
async def delete_film_stock(stock_id: str, request: Request):
    """Delete film stock"""
    user = await get_user_or_device(request)
    
    result = await db.film_stock.delete_one({
        "_id": ObjectId(stock_id),
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Film stock not found")
    
    return {"message": "Film stock deleted"}

# ============ SHOOTING LOG ENDPOINTS ============

@api_router.get("/shooting-log")
async def get_shooting_log(request: Request):
    """Get all shooting log entries for the user"""
    user = await get_user_or_device(request)
    
    cursor = db.shooting_log.find({"user_id": user["user_id"]}).sort("date", -1)
    logs = []
    async for log in cursor:
        logs.append({
            "id": str(log["_id"]),
            "date": log["date"],
            "camera_id": log.get("camera_id"),
            "camera_name": log.get("camera_name"),
            "film_stock_id": log.get("film_stock_id"),
            "film_name": log.get("film_name"),
            "location": log.get("location"),
            "shots_taken": log.get("shots_taken"),
            "notes": log.get("notes"),
            "weather": log.get("weather"),
            "rating": log.get("rating"),
            "created_at": log.get("created_at")
        })
    
    return logs

@api_router.post("/shooting-log")
async def create_shooting_log(request: Request, log: ShootingLogBase):
    """Add new shooting log entry"""
    user = await get_user_or_device(request)
    
    now = datetime.utcnow()
    log_dict = {
        "user_id": user["user_id"],
        "date": log.date,
        "camera_id": log.camera_id,
        "camera_name": log.camera_name,
        "film_stock_id": log.film_stock_id,
        "film_name": log.film_name,
        "location": log.location,
        "shots_taken": log.shots_taken,
        "notes": log.notes,
        "weather": log.weather,
        "rating": log.rating,
        "created_at": now
    }
    
    result = await db.shooting_log.insert_one(log_dict)
    
    # If a camera was used, increment its usage count
    if log.camera_id:
        await db.cameras.update_one(
            {"_id": ObjectId(log.camera_id)},
            {"$inc": {"times_used": 1}}
        )
    
    # If film stock was used, decrement quantity
    if log.film_stock_id:
        await db.film_stock.update_one(
            {"_id": ObjectId(log.film_stock_id)},
            {"$inc": {"quantity": -1}}
        )
    
    return {"id": str(result.inserted_id), "message": "Shooting log added"}

@api_router.delete("/shooting-log/{log_id}")
async def delete_shooting_log(log_id: str, request: Request):
    """Delete shooting log entry"""
    user = await get_user_or_device(request)
    
    result = await db.shooting_log.delete_one({
        "_id": ObjectId(log_id),
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    return {"message": "Log entry deleted"}

@api_router.get("/shooting-stats")
async def get_shooting_stats(request: Request):
    """Get shooting statistics"""
    user = await get_user_or_device(request)
    
    # Get all logs
    logs = await db.shooting_log.find({"user_id": user["user_id"]}).to_list(length=1000)
    
    # Calculate stats
    total_sessions = len(logs)
    total_shots = sum(log.get("shots_taken", 0) for log in logs)
    
    # Most used cameras
    camera_usage = {}
    for log in logs:
        cam_name = log.get("camera_name")
        if cam_name:
            camera_usage[cam_name] = camera_usage.get(cam_name, 0) + 1
    
    most_used_cameras = sorted(camera_usage.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Most used films
    film_usage = {}
    for log in logs:
        film_name = log.get("film_name")
        if film_name:
            film_usage[film_name] = film_usage.get(film_name, 0) + 1
    
    most_used_films = sorted(film_usage.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "total_sessions": total_sessions,
        "total_shots": total_shots,
        "most_used_cameras": [{"name": name, "count": count} for name, count in most_used_cameras],
        "most_used_films": [{"name": name, "count": count} for name, count in most_used_films]
    }

# ============ STATS ENDPOINT ============

@api_router.get("/stats")
async def get_collection_stats(request: Request):
    """Get comprehensive collection statistics"""
    user = await get_user_or_device(request)
    
    cameras = []
    async for camera in db.cameras.find({"user_id": user["user_id"]}):
        cameras.append(camera)
    
    wishlist = []
    async for item in db.wishlist.find({"user_id": user["user_id"]}):
        wishlist.append(item)
    
    accessories = []
    async for acc in db.accessories.find({"user_id": user["user_id"]}):
        accessories.append(acc)
    
    # Calculate value statistics
    total_estimated_value = sum(c.get("estimated_value", 0) or 0 for c in cameras)
    total_purchase_price = sum(c.get("purchase_price", 0) or 0 for c in cameras)
    cameras_with_value = [c for c in cameras if c.get("estimated_value")]
    avg_camera_value = total_estimated_value / len(cameras_with_value) if cameras_with_value else 0
    
    # Value appreciation
    value_appreciation = total_estimated_value - total_purchase_price if total_purchase_price > 0 else 0
    appreciation_percentage = (value_appreciation / total_purchase_price * 100) if total_purchase_price > 0 else 0
    
    # Count by type
    type_counts = {}
    type_values = {}
    for camera in cameras:
        cam_type = camera.get("camera_type", "Unknown")
        type_counts[cam_type] = type_counts.get(cam_type, 0) + 1
        type_values[cam_type] = type_values.get(cam_type, 0) + (camera.get("estimated_value", 0) or 0)
    
    # Count by film format
    format_counts = {}
    for camera in cameras:
        fmt = camera.get("film_format", "Unknown")
        format_counts[fmt] = format_counts.get(fmt, 0) + 1
    
    # Count by condition
    condition_counts = {}
    for camera in cameras:
        cond = camera.get("condition", "Not Specified")
        condition_counts[cond] = condition_counts.get(cond, 0) + 1
    
    # Count by decade
    decade_counts = {}
    for camera in cameras:
        year_str = camera.get("year", "")
        if year_str:
            try:
                # Extract first 4 digits that look like a year
                import re
                year_match = re.search(r'\d{4}', year_str)
                if year_match:
                    year = int(year_match.group())
                    decade = (year // 10) * 10
                    decade_label = f"{decade}s"
                    decade_counts[decade_label] = decade_counts.get(decade_label, 0) + 1
            except:
                pass
    
    # Sort decades
    decade_counts = dict(sorted(decade_counts.items()))
    
    # Count by brand
    brand_counts = {}
    for camera in cameras:
        brand = camera.get("brand", "Unknown")
        brand_counts[brand] = brand_counts.get(brand, 0) + 1
    
    # Top 5 most valuable cameras
    valuable_cameras = sorted(
        [c for c in cameras if c.get("estimated_value")],
        key=lambda x: x.get("estimated_value", 0),
        reverse=True
    )[:5]
    
    top_valuable = [
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "brand": c["brand"],
            "estimated_value": c.get("estimated_value")
        }
        for c in valuable_cameras
    ]
    
    return {
        "total_cameras": len(cameras),
        "total_wishlist": len(wishlist),
        "total_accessories": len(accessories),
        # Value statistics
        "total_estimated_value": round(total_estimated_value, 2),
        "total_purchase_price": round(total_purchase_price, 2),
        "average_camera_value": round(avg_camera_value, 2),
        "value_appreciation": round(value_appreciation, 2),
        "appreciation_percentage": round(appreciation_percentage, 1),
        "cameras_with_value_count": len(cameras_with_value),
        # Breakdowns
        "by_type": type_counts,
        "by_type_value": type_values,
        "by_format": format_counts,
        "by_condition": condition_counts,
        "by_decade": decade_counts,
        "by_brand": brand_counts,
        # Top valuable
        "top_valuable_cameras": top_valuable
    }

# ============ COLLECTION ENDPOINTS (Protected) ============

@api_router.get("/cameras", response_model=List[Camera])
async def get_all_cameras(request: Request):
    user = await get_user_or_device(request)
    cameras = []
    async for camera in db.cameras.find({"user_id": user["user_id"]}).sort("created_at", -1):
        cameras.append(camera_helper(camera))
    return cameras

@api_router.get("/cameras/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        camera = await db.cameras.find_one({
            "_id": ObjectId(camera_id),
            "user_id": user["user_id"]
        })
        if camera:
            return camera_helper(camera)
        raise HTTPException(status_code=404, detail="Camera not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/cameras", response_model=Camera)
async def create_camera(camera: CameraCreate, request: Request):
    user = await get_user_or_device(request)
    camera_dict = camera.dict()
    camera_dict["user_id"] = user["user_id"]
    camera_dict["created_at"] = datetime.utcnow()
    camera_dict["updated_at"] = datetime.utcnow()
    result = await db.cameras.insert_one(camera_dict)
    new_camera = await db.cameras.find_one({"_id": result.inserted_id})
    return camera_helper(new_camera)

@api_router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, camera_update: CameraUpdate, request: Request):
    user = await get_user_or_device(request)
    try:
        update_data = {k: v for k, v in camera_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.cameras.update_one(
            {"_id": ObjectId(camera_id), "user_id": user["user_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.cameras.find_one({
                "_id": ObjectId(camera_id),
                "user_id": user["user_id"]
            })
            if not existing:
                raise HTTPException(status_code=404, detail="Camera not found")
        
        updated_camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        return camera_helper(updated_camera)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        result = await db.cameras.delete_one({
            "_id": ObjectId(camera_id),
            "user_id": user["user_id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
        return {"message": "Camera deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ WISHLIST ENDPOINTS (Protected) ============

@api_router.get("/wishlist", response_model=List[WishlistItem])
async def get_all_wishlist_items(request: Request):
    user = await get_user_or_device(request)
    items = []
    async for item in db.wishlist.find({"user_id": user["user_id"]}).sort("created_at", -1):
        items.append(wishlist_helper(item))
    return items

@api_router.get("/wishlist/{item_id}", response_model=WishlistItem)
async def get_wishlist_item(item_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        item = await db.wishlist.find_one({
            "_id": ObjectId(item_id),
            "user_id": user["user_id"]
        })
        if item:
            return wishlist_helper(item)
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/wishlist", response_model=WishlistItem)
async def create_wishlist_item(item: WishlistItemCreate, request: Request):
    user = await get_user_or_device(request)
    item_dict = item.dict()
    item_dict["user_id"] = user["user_id"]
    item_dict["created_at"] = datetime.utcnow()
    item_dict["updated_at"] = datetime.utcnow()
    result = await db.wishlist.insert_one(item_dict)
    new_item = await db.wishlist.find_one({"_id": result.inserted_id})
    return wishlist_helper(new_item)

@api_router.put("/wishlist/{item_id}", response_model=WishlistItem)
async def update_wishlist_item(item_id: str, item_update: WishlistItemUpdate, request: Request):
    user = await get_user_or_device(request)
    try:
        update_data = {k: v for k, v in item_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.wishlist.update_one(
            {"_id": ObjectId(item_id), "user_id": user["user_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.wishlist.find_one({
                "_id": ObjectId(item_id),
                "user_id": user["user_id"]
            })
            if not existing:
                raise HTTPException(status_code=404, detail="Wishlist item not found")
        
        updated_item = await db.wishlist.find_one({"_id": ObjectId(item_id)})
        return wishlist_helper(updated_item)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/wishlist/{item_id}")
async def delete_wishlist_item(item_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        result = await db.wishlist.delete_one({
            "_id": ObjectId(item_id),
            "user_id": user["user_id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        return {"message": "Wishlist item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/wishlist/{item_id}/to-collection", response_model=Camera)
async def move_to_collection(item_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        item = await db.wishlist.find_one({
            "_id": ObjectId(item_id),
            "user_id": user["user_id"]
        })
        if not item:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        
        camera_dict = {
            "user_id": user["user_id"],
            "name": item["name"],
            "brand": item["brand"],
            "camera_type": item["camera_type"],
            "film_format": item["film_format"],
            "year": item.get("year"),
            "notes": item.get("notes"),
            "image": item.get("image"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.cameras.insert_one(camera_dict)
        await db.wishlist.delete_one({"_id": ObjectId(item_id)})
        
        new_camera = await db.cameras.find_one({"_id": result.inserted_id})
        return camera_helper(new_camera)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ ACCESSORIES ENDPOINTS (Protected) ============

@api_router.get("/accessories", response_model=List[Accessory])
async def get_all_accessories(request: Request):
    user = await get_user_or_device(request)
    accessories = []
    async for accessory in db.accessories.find({"user_id": user["user_id"]}).sort("created_at", -1):
        accessories.append(accessory_helper(accessory))
    return accessories

@api_router.get("/accessories/{accessory_id}", response_model=Accessory)
async def get_accessory(accessory_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        accessory = await db.accessories.find_one({
            "_id": ObjectId(accessory_id),
            "user_id": user["user_id"]
        })
        if accessory:
            return accessory_helper(accessory)
        raise HTTPException(status_code=404, detail="Accessory not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/accessories", response_model=Accessory)
async def create_accessory(accessory: AccessoryCreate, request: Request):
    user = await get_user_or_device(request)
    accessory_dict = accessory.dict()
    accessory_dict["user_id"] = user["user_id"]
    accessory_dict["created_at"] = datetime.utcnow()
    accessory_dict["updated_at"] = datetime.utcnow()
    result = await db.accessories.insert_one(accessory_dict)
    new_accessory = await db.accessories.find_one({"_id": result.inserted_id})
    return accessory_helper(new_accessory)

@api_router.put("/accessories/{accessory_id}", response_model=Accessory)
async def update_accessory(accessory_id: str, accessory_update: AccessoryUpdate, request: Request):
    user = await get_user_or_device(request)
    try:
        update_data = {k: v for k, v in accessory_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.accessories.update_one(
            {"_id": ObjectId(accessory_id), "user_id": user["user_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.accessories.find_one({
                "_id": ObjectId(accessory_id),
                "user_id": user["user_id"]
            })
            if not existing:
                raise HTTPException(status_code=404, detail="Accessory not found")
        
        updated_accessory = await db.accessories.find_one({"_id": ObjectId(accessory_id)})
        return accessory_helper(updated_accessory)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/accessories/{accessory_id}")
async def delete_accessory(accessory_id: str, request: Request):
    user = await get_user_or_device(request)
    try:
        result = await db.accessories.delete_one({
            "_id": ObjectId(accessory_id),
            "user_id": user["user_id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Accessory not found")
        return {"message": "Accessory deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ CAMERA DATABASE / IMPORT ENDPOINTS ============

# Brand URLs for camera database
CAMERA_BRAND_URLS = {
    "AGFA": "https://en.wikipedia.org/wiki/Agfa_digital_cameras",
    "Ansco": "https://camera-wiki.org/wiki/Ansco",
    "Argus": "https://camera-wiki.org/wiki/Argus",
    "Canon": "https://camera-wiki.org/wiki/Canon",
    "Chinon": "https://camera-wiki.org/wiki/Chinon",
    "Concord": "https://camera-wiki.org/wiki/Concord",
    "Imperial": "https://camera-wiki.org/wiki/Imperial",
    "Kodak": "https://camera-wiki.org/wiki/Kodak",
    "Kyocera": "https://camera-wiki.org/wiki/Kyocera",
    "Leidolf": "https://camera-wiki.org/wiki/Leidolf",
    "Mamiya": "https://camera-wiki.org/wiki/Mamiya",
    "Minolta": "https://camera-wiki.org/wiki/Minolta",
    "Nishika": "https://camera-wiki.org/wiki/Nishika",
    "Olympus": "https://camera-wiki.org/wiki/Olympus",
    "Pentacon": "https://camera-wiki.org/wiki/Pentacon",
    "Pentax": "https://camera-wiki.org/wiki/Pentax",
    "Polaroid": "https://camera-wiki.org/wiki/Polaroid",
    "Sakar": "https://camera-wiki.org/wiki/Sakar",
    "Samsung": "https://camera-wiki.org/wiki/Samsung",
    "Sears/Tower": "https://camera-wiki.org/wiki/Sears",
    "Spartus": "https://camera-wiki.org/wiki/Spartus",
    "Vivitar": "https://camera-wiki.org/wiki/Vivitar",
}

# In-memory cache for scraped camera data (TTL: 1 hour)
camera_database_cache = {}
cache_timestamps = {}
CACHE_TTL = 3600  # 1 hour

import re
from bs4 import BeautifulSoup

def detect_camera_type(name: str, context: str = "") -> str:
    """Detect camera type from name and context"""
    name_lower = name.lower()
    context_lower = context.lower()
    combined = f"{name_lower} {context_lower}"
    
    if any(x in combined for x in ["digital", "dslr", "mirrorless", "megapixel", "mp "]):
        return "Digital"
    if any(x in combined for x in ["polaroid", "instant", "instax"]):
        return "Instant - Polaroid"
    if any(x in combined for x in ["movie", "cine", "video", "8mm movie", "super 8", "16mm"]):
        return "Video/Movie Camera"
    if any(x in combined for x in ["medium format", "120", "220", "6x", "mamiya rb", "mamiya rz", "hasselblad"]):
        return "Film - Medium Format"
    if any(x in combined for x in ["large format", "4x5", "8x10", "view camera"]):
        return "Film - Large Format"
    if any(x in combined for x in ["tlr", "twin lens", "rolleiflex"]):
        return "TLR (Twin Lens Reflex)"
    if any(x in combined for x in ["slr", "reflex"]) and "twin" not in combined:
        return "SLR (Single Lens Reflex)"
    if any(x in combined for x in ["rangefinder", "leica m"]):
        return "Rangefinder"
    if any(x in combined for x in ["box camera", "brownie"]):
        return "Box Camera"
    if any(x in combined for x in ["folding", "folder"]):
        return "Folding Camera"
    if any(x in combined for x in ["point", "shoot", "compact", "pocket"]):
        return "Point & Shoot"
    if any(x in combined for x in ["disposable", "single use"]):
        return "Single Use/Disposable"
    
    # Default to 35mm film for older cameras
    return "Film - 35mm"

def detect_film_format(name: str, camera_type: str, context: str = "") -> str:
    """Detect film format from name and context"""
    name_lower = name.lower()
    context_lower = context.lower()
    combined = f"{name_lower} {context_lower}"
    
    if "digital" in camera_type.lower():
        return "N/A (Digital)"
    if "instant" in camera_type.lower():
        if "instax" in combined:
            return "Instant - Instax Mini"
        return "Instant - Polaroid 600"
    if "medium format" in camera_type.lower():
        return "120 (Medium Format)"
    if "large format" in camera_type.lower():
        return "4x5 Sheet Film"
    if "video" in camera_type.lower() or "movie" in camera_type.lower():
        if "super 8" in combined or "super8" in combined:
            return "Super 8"
        if "16mm" in combined:
            return "16mm"
        return "Standard 8mm"
    
    # Check for specific formats in name
    if "110" in combined:
        return "110 Film Cartridge"
    if "126" in combined:
        return "126 Film Cartridge"
    if "127" in combined:
        return "127 Film (Vest Pocket)"
    if "aps" in combined or "advantix" in combined:
        return "APS (Advanced Photo System/Advantix)"
    if "disc" in combined:
        return "Disc Film"
    if "half frame" in combined:
        return "Half Frame 35mm"
    
    # Default
    return "35mm (135 Film)"

def extract_year(text: str) -> Optional[str]:
    """Extract year from text"""
    # Look for 4-digit years between 1880 and 2030
    years = re.findall(r'\b(1[89]\d{2}|20[0-2]\d)\b', text)
    if years:
        return years[0]
    return None

async def scrape_camera_wiki(brand: str, url: str) -> List[dict]:
    """Scrape camera data from camera-wiki.org"""
    cameras = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the main content
            content = soup.find('div', {'id': 'mw-content-text'}) or soup.find('div', {'class': 'mw-parser-output'})
            
            if not content:
                content = soup
            
            # Look for camera links and list items
            seen_names = set()
            
            # Method 1: Find links that look like camera models
            for link in content.find_all('a', href=True):
                text = link.get_text(strip=True)
                href = link.get('href', '')
                
                # Skip navigation, category, and meta links
                if any(x in href.lower() for x in ['category:', 'special:', 'file:', 'help:', '#']):
                    continue
                if any(x in text.lower() for x in ['edit', 'view', 'talk', 'history', 'page']):
                    continue
                if len(text) < 3 or len(text) > 100:
                    continue
                
                # Check if it looks like a camera model
                if brand.lower() in text.lower() or re.search(r'\d', text):
                    name = text.strip()
                    if name and name not in seen_names:
                        seen_names.add(name)
                        
                        # Get surrounding context for better type detection
                        parent = link.parent
                        context = parent.get_text() if parent else ""
                        
                        camera_type = detect_camera_type(name, context)
                        film_format = detect_film_format(name, camera_type, context)
                        year = extract_year(context)
                        
                        cameras.append({
                            "name": name,
                            "brand": brand,
                            "camera_type": camera_type,
                            "film_format": film_format,
                            "year": year
                        })
            
            # Method 2: Look for list items that might be camera models
            for li in content.find_all('li'):
                text = li.get_text(strip=True)
                
                # Skip if too long or too short
                if len(text) < 3 or len(text) > 150:
                    continue
                
                # Take first part before comma or dash as the camera name
                name = re.split(r'[,\-–—:]', text)[0].strip()
                
                if name and name not in seen_names and len(name) >= 3:
                    # Check if it looks like a camera model
                    if brand.lower() in name.lower() or re.search(r'\d', name):
                        seen_names.add(name)
                        
                        camera_type = detect_camera_type(name, text)
                        film_format = detect_film_format(name, camera_type, text)
                        year = extract_year(text)
                        
                        cameras.append({
                            "name": name,
                            "brand": brand,
                            "camera_type": camera_type,
                            "film_format": film_format,
                            "year": year
                        })
            
            # Method 3: Look for headings followed by content
            for heading in content.find_all(['h2', 'h3', 'h4']):
                heading_text = heading.get_text(strip=True)
                if brand.lower() in heading_text.lower() or re.search(r'\d', heading_text):
                    name = re.sub(r'\[edit\]', '', heading_text).strip()
                    if name and name not in seen_names:
                        seen_names.add(name)
                        
                        # Get next sibling for context
                        next_elem = heading.find_next_sibling()
                        context = next_elem.get_text() if next_elem else ""
                        
                        camera_type = detect_camera_type(name, context)
                        film_format = detect_film_format(name, camera_type, context)
                        year = extract_year(context) or extract_year(heading_text)
                        
                        cameras.append({
                            "name": name,
                            "brand": brand,
                            "camera_type": camera_type,
                            "film_format": film_format,
                            "year": year
                        })
    
    except Exception as e:
        logger.error(f"Error scraping {brand}: {str(e)}")
    
    return cameras

async def scrape_wikipedia_agfa(url: str) -> List[dict]:
    """Special scraper for Wikipedia AGFA page"""
    cameras = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Wikipedia has tables with camera info
            seen_names = set()
            
            # Find tables
            for table in soup.find_all('table', {'class': 'wikitable'}):
                for row in table.find_all('tr')[1:]:  # Skip header
                    cells = row.find_all(['td', 'th'])
                    if cells:
                        name = cells[0].get_text(strip=True)
                        if name and name not in seen_names:
                            seen_names.add(name)
                            
                            row_text = row.get_text()
                            year = extract_year(row_text)
                            
                            cameras.append({
                                "name": f"AGFA {name}" if "agfa" not in name.lower() else name,
                                "brand": "AGFA",
                                "camera_type": "Digital",
                                "film_format": "N/A (Digital)",
                                "year": year
                            })
            
            # Also check list items
            content = soup.find('div', {'id': 'mw-content-text'})
            if content:
                for li in content.find_all('li'):
                    text = li.get_text(strip=True)
                    if 'agfa' in text.lower() and len(text) < 100:
                        name = re.split(r'[,\-–—:]', text)[0].strip()
                        if name and name not in seen_names:
                            seen_names.add(name)
                            cameras.append({
                                "name": name,
                                "brand": "AGFA",
                                "camera_type": "Digital",
                                "film_format": "N/A (Digital)",
                                "year": extract_year(text)
                            })
                            
    except Exception as e:
        logger.error(f"Error scraping AGFA Wikipedia: {str(e)}")
    
    return cameras

@api_router.get("/camera-database")
async def get_camera_database():
    """Get list of available camera brands"""
    return {
        "brands": list(CAMERA_BRAND_URLS.keys()),
        "total_brands": len(CAMERA_BRAND_URLS)
    }

@api_router.get("/camera-database/{brand}")
async def get_cameras_by_brand(brand: str):
    """Get cameras for a specific brand (on-demand scraping with caching)"""
    
    # Normalize brand name
    brand_normalized = None
    for b in CAMERA_BRAND_URLS.keys():
        if b.lower() == brand.lower():
            brand_normalized = b
            break
    
    if not brand_normalized:
        raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found")
    
    # Check cache
    current_time = datetime.now(timezone.utc).timestamp()
    if brand_normalized in camera_database_cache:
        cache_time = cache_timestamps.get(brand_normalized, 0)
        if current_time - cache_time < CACHE_TTL:
            return {
                "brand": brand_normalized,
                "cameras": camera_database_cache[brand_normalized],
                "count": len(camera_database_cache[brand_normalized]),
                "cached": True
            }
    
    # Scrape data
    url = CAMERA_BRAND_URLS[brand_normalized]
    
    if brand_normalized == "AGFA":
        cameras = await scrape_wikipedia_agfa(url)
    else:
        cameras = await scrape_camera_wiki(brand_normalized, url)
    
    # Sort cameras by name
    cameras.sort(key=lambda x: x['name'].lower())
    
    # Remove duplicates
    seen = set()
    unique_cameras = []
    for cam in cameras:
        if cam['name'] not in seen:
            seen.add(cam['name'])
            unique_cameras.append(cam)
    
    # Cache results
    camera_database_cache[brand_normalized] = unique_cameras
    cache_timestamps[brand_normalized] = current_time
    
    return {
        "brand": brand_normalized,
        "cameras": unique_cameras,
        "count": len(unique_cameras),
        "cached": False
    }

# ============ EXPORT ENDPOINTS ============

@api_router.get("/export/collection")
async def export_collection(request: Request):
    """Export entire collection as JSON"""
    user = await get_user_or_device(request)
    
    cameras = []
    async for camera in db.cameras.find({"user_id": user["user_id"]}):
        cam = camera_helper(camera)
        # Remove base64 images for export (too large)
        cam.pop('image', None)
        cam.pop('images', None)
        cameras.append(cam)
    
    wishlist = []
    async for item in db.wishlist.find({"user_id": user["user_id"]}):
        wi = wishlist_helper(item)
        wi.pop('image', None)
        wishlist.append(wi)
    
    accessories = []
    async for acc in db.accessories.find({"user_id": user["user_id"]}):
        a = accessory_helper(acc)
        a.pop('image', None)
        accessories.append(a)
    
    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user_email": user.get("email"),
        "cameras": cameras,
        "cameras_count": len(cameras),
        "wishlist": wishlist,
        "wishlist_count": len(wishlist),
        "accessories": accessories,
        "accessories_count": len(accessories)
    }

@api_router.get("/export/csv")
async def export_csv(request: Request):
    """Export cameras as CSV format data"""
    user = await get_user_or_device(request)
    
    cameras = []
    async for camera in db.cameras.find({"user_id": user["user_id"]}):
        cameras.append({
            "name": camera.get("name", ""),
            "brand": camera.get("brand", ""),
            "type": camera.get("camera_type", ""),
            "film_format": camera.get("film_format", ""),
            "year": camera.get("year", ""),
            "notes": camera.get("notes", "").replace("\n", " ") if camera.get("notes") else "",
            "created_at": camera.get("created_at", "").isoformat() if camera.get("created_at") else ""
        })
    
    # Create CSV content
    headers = ["name", "brand", "type", "film_format", "year", "notes", "created_at"]
    csv_lines = [",".join(headers)]
    
    for cam in cameras:
        row = [f'"{cam.get(h, "")}"' for h in headers]
        csv_lines.append(",".join(row))
    
    return {
        "csv_content": "\n".join(csv_lines),
        "filename": f"camera_collection_{datetime.now().strftime('%Y%m%d')}.csv",
        "cameras_count": len(cameras)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
