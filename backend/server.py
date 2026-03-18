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

class ServiceHistoryEntry(BaseModel):
    date: str
    description: str
    cost: Optional[float] = None

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
        "conditions": CONDITIONS
    }

# ============ STATS ENDPOINT ============

@api_router.get("/stats")
async def get_collection_stats(request: Request):
    """Get comprehensive collection statistics"""
    user = await require_auth(request)
    
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
    user = await require_auth(request)
    cameras = []
    async for camera in db.cameras.find({"user_id": user["user_id"]}).sort("created_at", -1):
        cameras.append(camera_helper(camera))
    return cameras

@api_router.get("/cameras/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
    camera_dict = camera.dict()
    camera_dict["user_id"] = user["user_id"]
    camera_dict["created_at"] = datetime.utcnow()
    camera_dict["updated_at"] = datetime.utcnow()
    result = await db.cameras.insert_one(camera_dict)
    new_camera = await db.cameras.find_one({"_id": result.inserted_id})
    return camera_helper(new_camera)

@api_router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, camera_update: CameraUpdate, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
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
    user = await require_auth(request)
    items = []
    async for item in db.wishlist.find({"user_id": user["user_id"]}).sort("created_at", -1):
        items.append(wishlist_helper(item))
    return items

@api_router.get("/wishlist/{item_id}", response_model=WishlistItem)
async def get_wishlist_item(item_id: str, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
    item_dict = item.dict()
    item_dict["user_id"] = user["user_id"]
    item_dict["created_at"] = datetime.utcnow()
    item_dict["updated_at"] = datetime.utcnow()
    result = await db.wishlist.insert_one(item_dict)
    new_item = await db.wishlist.find_one({"_id": result.inserted_id})
    return wishlist_helper(new_item)

@api_router.put("/wishlist/{item_id}", response_model=WishlistItem)
async def update_wishlist_item(item_id: str, item_update: WishlistItemUpdate, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
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
    user = await require_auth(request)
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
    user = await require_auth(request)
    accessories = []
    async for accessory in db.accessories.find({"user_id": user["user_id"]}).sort("created_at", -1):
        accessories.append(accessory_helper(accessory))
    return accessories

@api_router.get("/accessories/{accessory_id}", response_model=Accessory)
async def get_accessory(accessory_id: str, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
    accessory_dict = accessory.dict()
    accessory_dict["user_id"] = user["user_id"]
    accessory_dict["created_at"] = datetime.utcnow()
    accessory_dict["updated_at"] = datetime.utcnow()
    result = await db.accessories.insert_one(accessory_dict)
    new_accessory = await db.accessories.find_one({"_id": result.inserted_id})
    return accessory_helper(new_accessory)

@api_router.put("/accessories/{accessory_id}", response_model=Accessory)
async def update_accessory(accessory_id: str, accessory_update: AccessoryUpdate, request: Request):
    user = await require_auth(request)
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
    user = await require_auth(request)
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

# ============ EXPORT ENDPOINTS ============

@api_router.get("/export/collection")
async def export_collection(request: Request):
    """Export entire collection as JSON"""
    user = await require_auth(request)
    
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
    user = await require_auth(request)
    
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
