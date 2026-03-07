from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from bson import ObjectId

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

# Define Models
class CameraBase(BaseModel):
    name: str
    brand: str
    camera_type: str
    film_format: str
    year: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None  # Base64 encoded image

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

class Camera(CameraBase):
    id: str
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
    priority: str = "medium"  # low, medium, high

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Accessory Models
class AccessoryBase(BaseModel):
    name: str
    brand: str
    accessory_type: str
    compatible_with: Optional[str] = None  # e.g., "Canon EOS", "Nikon F-Mount"
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper function to convert MongoDB document to dict
def camera_helper(camera) -> dict:
    return {
        "id": str(camera["_id"]),
        "name": camera["name"],
        "brand": camera["brand"],
        "camera_type": camera["camera_type"],
        "film_format": camera["film_format"],
        "year": camera.get("year"),
        "notes": camera.get("notes"),
        "image": camera.get("image"),
        "created_at": camera.get("created_at", datetime.utcnow()),
        "updated_at": camera.get("updated_at", datetime.utcnow())
    }

def wishlist_helper(item) -> dict:
    return {
        "id": str(item["_id"]),
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

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Vintage Camera Collection API"}

# Get options (camera types, film formats, and accessory types)
@api_router.get("/options")
async def get_options():
    return {
        "camera_types": CAMERA_TYPES,
        "film_formats": FILM_FORMATS,
        "accessory_types": ACCESSORY_TYPES
    }

# ============ COLLECTION ENDPOINTS ============

@api_router.get("/cameras", response_model=List[Camera])
async def get_all_cameras():
    cameras = []
    async for camera in db.cameras.find().sort("created_at", -1):
        cameras.append(camera_helper(camera))
    return cameras

@api_router.get("/cameras/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str):
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if camera:
            return camera_helper(camera)
        raise HTTPException(status_code=404, detail="Camera not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/cameras", response_model=Camera)
async def create_camera(camera: CameraCreate):
    camera_dict = camera.dict()
    camera_dict["created_at"] = datetime.utcnow()
    camera_dict["updated_at"] = datetime.utcnow()
    result = await db.cameras.insert_one(camera_dict)
    new_camera = await db.cameras.find_one({"_id": result.inserted_id})
    return camera_helper(new_camera)

@api_router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, camera_update: CameraUpdate):
    try:
        update_data = {k: v for k, v in camera_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.cameras.update_one(
            {"_id": ObjectId(camera_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.cameras.find_one({"_id": ObjectId(camera_id)})
            if not existing:
                raise HTTPException(status_code=404, detail="Camera not found")
        
        updated_camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        return camera_helper(updated_camera)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str):
    try:
        result = await db.cameras.delete_one({"_id": ObjectId(camera_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Camera not found")
        return {"message": "Camera deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ WISHLIST ENDPOINTS ============

@api_router.get("/wishlist", response_model=List[WishlistItem])
async def get_all_wishlist_items():
    items = []
    async for item in db.wishlist.find().sort("created_at", -1):
        items.append(wishlist_helper(item))
    return items

@api_router.get("/wishlist/{item_id}", response_model=WishlistItem)
async def get_wishlist_item(item_id: str):
    try:
        item = await db.wishlist.find_one({"_id": ObjectId(item_id)})
        if item:
            return wishlist_helper(item)
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/wishlist", response_model=WishlistItem)
async def create_wishlist_item(item: WishlistItemCreate):
    item_dict = item.dict()
    item_dict["created_at"] = datetime.utcnow()
    item_dict["updated_at"] = datetime.utcnow()
    result = await db.wishlist.insert_one(item_dict)
    new_item = await db.wishlist.find_one({"_id": result.inserted_id})
    return wishlist_helper(new_item)

@api_router.put("/wishlist/{item_id}", response_model=WishlistItem)
async def update_wishlist_item(item_id: str, item_update: WishlistItemUpdate):
    try:
        update_data = {k: v for k, v in item_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.wishlist.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.wishlist.find_one({"_id": ObjectId(item_id)})
            if not existing:
                raise HTTPException(status_code=404, detail="Wishlist item not found")
        
        updated_item = await db.wishlist.find_one({"_id": ObjectId(item_id)})
        return wishlist_helper(updated_item)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/wishlist/{item_id}")
async def delete_wishlist_item(item_id: str):
    try:
        result = await db.wishlist.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        return {"message": "Wishlist item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Move wishlist item to collection
@api_router.post("/wishlist/{item_id}/to-collection", response_model=Camera)
async def move_to_collection(item_id: str):
    try:
        item = await db.wishlist.find_one({"_id": ObjectId(item_id)})
        if not item:
            raise HTTPException(status_code=404, detail="Wishlist item not found")
        
        # Create camera from wishlist item
        camera_dict = {
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
        
        # Delete from wishlist
        await db.wishlist.delete_one({"_id": ObjectId(item_id)})
        
        new_camera = await db.cameras.find_one({"_id": result.inserted_id})
        return camera_helper(new_camera)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ ACCESSORIES ENDPOINTS ============

@api_router.get("/accessories", response_model=List[Accessory])
async def get_all_accessories():
    accessories = []
    async for accessory in db.accessories.find().sort("created_at", -1):
        accessories.append(accessory_helper(accessory))
    return accessories

@api_router.get("/accessories/{accessory_id}", response_model=Accessory)
async def get_accessory(accessory_id: str):
    try:
        accessory = await db.accessories.find_one({"_id": ObjectId(accessory_id)})
        if accessory:
            return accessory_helper(accessory)
        raise HTTPException(status_code=404, detail="Accessory not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/accessories", response_model=Accessory)
async def create_accessory(accessory: AccessoryCreate):
    accessory_dict = accessory.dict()
    accessory_dict["created_at"] = datetime.utcnow()
    accessory_dict["updated_at"] = datetime.utcnow()
    result = await db.accessories.insert_one(accessory_dict)
    new_accessory = await db.accessories.find_one({"_id": result.inserted_id})
    return accessory_helper(new_accessory)

@api_router.put("/accessories/{accessory_id}", response_model=Accessory)
async def update_accessory(accessory_id: str, accessory_update: AccessoryUpdate):
    try:
        update_data = {k: v for k, v in accessory_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updated_at"] = datetime.utcnow()
        result = await db.accessories.update_one(
            {"_id": ObjectId(accessory_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            existing = await db.accessories.find_one({"_id": ObjectId(accessory_id)})
            if not existing:
                raise HTTPException(status_code=404, detail="Accessory not found")
        
        updated_accessory = await db.accessories.find_one({"_id": ObjectId(accessory_id)})
        return accessory_helper(updated_accessory)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/accessories/{accessory_id}")
async def delete_accessory(accessory_id: str):
    try:
        result = await db.accessories.delete_one({"_id": ObjectId(accessory_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Accessory not found")
        return {"message": "Accessory deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
