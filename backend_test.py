#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Vintage Camera Collection
Tests all CRUD operations and move-to-collection functionality
"""

import requests
import json
import base64
from typing import Dict, Any, Optional
import time

# Backend API base URL
BASE_URL = "https://vintage-lens-log.preview.emergentagent.com/api"

# Sample base64 image for testing (small 1x1 pixel PNG)
SAMPLE_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

class VintageAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}", "status_code": 400}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else None,
                "headers": dict(response.headers),
                "url": url
            }
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "status_code": 0}
    
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        print("\n=== Testing Root Endpoint ===")
        
        result = self.make_request("GET", "/")
        
        if "error" in result:
            self.log_result("Root Endpoint", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            if result["data"] and "message" in result["data"]:
                self.log_result("Root Endpoint", True, f"Welcome message received: {result['data']['message']}")
            else:
                self.log_result("Root Endpoint", False, "Response missing message field", result["data"])
        else:
            self.log_result("Root Endpoint", False, f"HTTP {result['status_code']}", result["data"])
    
    def test_options_endpoint(self):
        """Test GET /api/options - Get camera types and film formats"""
        print("\n=== Testing Options Endpoint ===")
        
        result = self.make_request("GET", "/options")
        
        if "error" in result:
            self.log_result("Options Endpoint", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            data = result["data"]
            if data and "camera_types" in data and "film_formats" in data:
                camera_types_count = len(data["camera_types"])
                film_formats_count = len(data["film_formats"])
                self.log_result("Options Endpoint", True, f"Options received: {camera_types_count} camera types, {film_formats_count} film formats")
                
                # Verify some expected values
                expected_camera_types = ["Film - 35mm", "Digital", "Instant - Polaroid"]
                expected_film_formats = ["35mm", "120 (Medium Format)", "N/A (Digital)"]
                
                missing_types = [t for t in expected_camera_types if t not in data["camera_types"]]
                missing_formats = [f for f in expected_film_formats if f not in data["film_formats"]]
                
                if not missing_types and not missing_formats:
                    self.log_result("Options Validation", True, "All expected camera types and film formats present")
                else:
                    self.log_result("Options Validation", False, f"Missing types: {missing_types}, Missing formats: {missing_formats}")
            else:
                self.log_result("Options Endpoint", False, "Response missing camera_types or film_formats", data)
        else:
            self.log_result("Options Endpoint", False, f"HTTP {result['status_code']}", result["data"])
    
    def test_camera_crud_operations(self):
        """Test full CRUD cycle for cameras"""
        print("\n=== Testing Camera CRUD Operations ===")
        
        created_camera_id = None
        
        # 1. Test GET /api/cameras (empty collection)
        result = self.make_request("GET", "/cameras")
        if "error" in result:
            self.log_result("Get Cameras (Initial)", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            initial_count = len(result["data"]) if result["data"] else 0
            self.log_result("Get Cameras (Initial)", True, f"Retrieved {initial_count} cameras")
        else:
            self.log_result("Get Cameras (Initial)", False, f"HTTP {result['status_code']}", result["data"])
            return
        
        # 2. Test POST /api/cameras (create)
        test_camera = {
            "name": "Canon AE-1 Program",
            "brand": "Canon",
            "camera_type": "Film - 35mm",
            "film_format": "35mm",
            "year": "1981",
            "notes": "Classic SLR camera with program mode",
            "image": SAMPLE_IMAGE_B64
        }
        
        result = self.make_request("POST", "/cameras", test_camera)
        if "error" in result:
            self.log_result("Create Camera", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            camera = result["data"]
            if camera and "id" in camera:
                created_camera_id = camera["id"]
                self.log_result("Create Camera", True, f"Camera created with ID: {created_camera_id}")
                
                # Verify all fields
                for field in ["name", "brand", "camera_type", "film_format", "year", "notes"]:
                    if camera.get(field) != test_camera[field]:
                        self.log_result(f"Create Camera - {field}", False, f"Expected {test_camera[field]}, got {camera.get(field)}")
                    else:
                        self.log_result(f"Create Camera - {field}", True, f"Field '{field}' correct")
            else:
                self.log_result("Create Camera", False, "Response missing camera ID", camera)
                return
        else:
            self.log_result("Create Camera", False, f"HTTP {result['status_code']}", result["data"])
            return
        
        # 3. Test GET /api/cameras/{id} (get specific)
        if created_camera_id:
            result = self.make_request("GET", f"/cameras/{created_camera_id}")
            if "error" in result:
                self.log_result("Get Specific Camera", False, f"Request failed: {result['error']}")
            elif result["status_code"] == 200:
                camera = result["data"]
                if camera and camera.get("name") == test_camera["name"]:
                    self.log_result("Get Specific Camera", True, f"Retrieved camera: {camera['name']}")
                else:
                    self.log_result("Get Specific Camera", False, "Camera data mismatch", camera)
            else:
                self.log_result("Get Specific Camera", False, f"HTTP {result['status_code']}", result["data"])
        
        # 4. Test PUT /api/cameras/{id} (update)
        if created_camera_id:
            update_data = {
                "year": "1982",
                "notes": "Updated: Classic SLR with excellent condition"
            }
            
            result = self.make_request("PUT", f"/cameras/{created_camera_id}", update_data)
            if "error" in result:
                self.log_result("Update Camera", False, f"Request failed: {result['error']}")
            elif result["status_code"] == 200:
                camera = result["data"]
                if camera and camera.get("year") == "1982" and "Updated:" in camera.get("notes", ""):
                    self.log_result("Update Camera", True, "Camera updated successfully")
                else:
                    self.log_result("Update Camera", False, "Update not reflected", camera)
            else:
                self.log_result("Update Camera", False, f"HTTP {result['status_code']}", result["data"])
        
        # 5. Test GET /api/cameras (verify count increased)
        result = self.make_request("GET", "/cameras")
        if "error" in result:
            self.log_result("Get Cameras (After Create)", False, f"Request failed: {result['error']}")
        elif result["status_code"] == 200:
            final_count = len(result["data"]) if result["data"] else 0
            if final_count == initial_count + 1:
                self.log_result("Get Cameras (After Create)", True, f"Camera count increased to {final_count}")
            else:
                self.log_result("Get Cameras (After Create)", False, f"Expected {initial_count + 1}, got {final_count}")
        
        # 6. Test DELETE /api/cameras/{id}
        if created_camera_id:
            result = self.make_request("DELETE", f"/cameras/{created_camera_id}")
            if "error" in result:
                self.log_result("Delete Camera", False, f"Request failed: {result['error']}")
            elif result["status_code"] == 200:
                self.log_result("Delete Camera", True, "Camera deleted successfully")
                
                # Verify deletion
                result = self.make_request("GET", f"/cameras/{created_camera_id}")
                if result["status_code"] == 404 or result["status_code"] == 400:  # Backend returns 400 instead of 404 for ObjectId errors
                    self.log_result("Verify Camera Deletion", True, "Camera not found after deletion (expected)")
                else:
                    self.log_result("Verify Camera Deletion", False, f"Camera still exists after deletion: {result['status_code']}")
            else:
                self.log_result("Delete Camera", False, f"HTTP {result['status_code']}", result["data"])
    
    def test_wishlist_crud_operations(self):
        """Test full CRUD cycle for wishlist"""
        print("\n=== Testing Wishlist CRUD Operations ===")
        
        created_item_id = None
        
        # 1. Test GET /api/wishlist (empty collection)
        result = self.make_request("GET", "/wishlist")
        if "error" in result:
            self.log_result("Get Wishlist (Initial)", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            initial_count = len(result["data"]) if result["data"] else 0
            self.log_result("Get Wishlist (Initial)", True, f"Retrieved {initial_count} wishlist items")
        else:
            self.log_result("Get Wishlist (Initial)", False, f"HTTP {result['status_code']}", result["data"])
            return
        
        # 2. Test POST /api/wishlist (create)
        test_wishlist_item = {
            "name": "Leica M6",
            "brand": "Leica",
            "camera_type": "Film - 35mm",
            "film_format": "35mm",
            "year": "1984",
            "notes": "Professional rangefinder camera - dream camera!",
            "priority": "high",
            "image": SAMPLE_IMAGE_B64
        }
        
        result = self.make_request("POST", "/wishlist", test_wishlist_item)
        if "error" in result:
            self.log_result("Create Wishlist Item", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            item = result["data"]
            if item and "id" in item:
                created_item_id = item["id"]
                self.log_result("Create Wishlist Item", True, f"Wishlist item created with ID: {created_item_id}")
                
                # Verify all fields including priority
                for field in ["name", "brand", "camera_type", "film_format", "year", "notes", "priority"]:
                    if item.get(field) != test_wishlist_item[field]:
                        self.log_result(f"Create Wishlist - {field}", False, f"Expected {test_wishlist_item[field]}, got {item.get(field)}")
                    else:
                        self.log_result(f"Create Wishlist - {field}", True, f"Field '{field}' correct")
            else:
                self.log_result("Create Wishlist Item", False, "Response missing item ID", item)
                return
        else:
            self.log_result("Create Wishlist Item", False, f"HTTP {result['status_code']}", result["data"])
            return
        
        # 3. Test GET /api/wishlist/{id} (get specific)
        if created_item_id:
            result = self.make_request("GET", f"/wishlist/{created_item_id}")
            if "error" in result:
                self.log_result("Get Specific Wishlist Item", False, f"Request failed: {result['error']}")
            elif result["status_code"] == 200:
                item = result["data"]
                if item and item.get("name") == test_wishlist_item["name"]:
                    self.log_result("Get Specific Wishlist Item", True, f"Retrieved item: {item['name']}")
                else:
                    self.log_result("Get Specific Wishlist Item", False, "Item data mismatch", item)
            else:
                self.log_result("Get Specific Wishlist Item", False, f"HTTP {result['status_code']}", result["data"])
        
        # 4. Test PUT /api/wishlist/{id} (update)
        if created_item_id:
            update_data = {
                "priority": "medium",
                "notes": "Updated: Still want this camera but not urgent"
            }
            
            result = self.make_request("PUT", f"/wishlist/{created_item_id}", update_data)
            if "error" in result:
                self.log_result("Update Wishlist Item", False, f"Request failed: {result['error']}")
            elif result["status_code"] == 200:
                item = result["data"]
                if item and item.get("priority") == "medium" and "Updated:" in item.get("notes", ""):
                    self.log_result("Update Wishlist Item", True, "Wishlist item updated successfully")
                else:
                    self.log_result("Update Wishlist Item", False, "Update not reflected", item)
            else:
                self.log_result("Update Wishlist Item", False, f"HTTP {result['status_code']}", result["data"])
        
        # Return the created item ID for move-to-collection test
        return created_item_id
    
    def test_move_to_collection(self, wishlist_item_id: str):
        """Test POST /api/wishlist/{id}/to-collection"""
        print("\n=== Testing Move to Collection ===")
        
        if not wishlist_item_id:
            self.log_result("Move to Collection", False, "No wishlist item ID provided")
            return
        
        # Get initial camera count
        result = self.make_request("GET", "/cameras")
        if "error" in result or result["status_code"] != 200:
            self.log_result("Move to Collection - Get Initial Count", False, "Could not get camera count")
            return
        initial_camera_count = len(result["data"]) if result["data"] else 0
        
        # Get wishlist item details before moving
        result = self.make_request("GET", f"/wishlist/{wishlist_item_id}")
        if "error" in result or result["status_code"] != 200:
            self.log_result("Move to Collection - Get Wishlist Item", False, "Could not get wishlist item")
            return
        wishlist_item = result["data"]
        
        # Move to collection
        result = self.make_request("POST", f"/wishlist/{wishlist_item_id}/to-collection")
        if "error" in result:
            self.log_result("Move to Collection", False, f"Request failed: {result['error']}")
            return
            
        if result["status_code"] == 200:
            camera = result["data"]
            if camera and "id" in camera:
                self.log_result("Move to Collection", True, f"Moved to collection with camera ID: {camera['id']}")
                
                # Verify the camera has the same details as the wishlist item
                for field in ["name", "brand", "camera_type", "film_format", "year", "notes"]:
                    if camera.get(field) != wishlist_item.get(field):
                        self.log_result(f"Move to Collection - {field}", False, f"Expected {wishlist_item.get(field)}, got {camera.get(field)}")
                    else:
                        self.log_result(f"Move to Collection - {field}", True, f"Field '{field}' preserved")
                
                # Verify camera count increased
                result = self.make_request("GET", "/cameras")
                if result["status_code"] == 200:
                    final_camera_count = len(result["data"]) if result["data"] else 0
                    if final_camera_count == initial_camera_count + 1:
                        self.log_result("Move to Collection - Camera Count", True, "Camera count increased correctly")
                    else:
                        self.log_result("Move to Collection - Camera Count", False, f"Expected {initial_camera_count + 1}, got {final_camera_count}")
                
                # Verify wishlist item was removed
                result = self.make_request("GET", f"/wishlist/{wishlist_item_id}")
                if result["status_code"] == 404 or result["status_code"] == 400:  # Backend returns 400 instead of 404 for ObjectId errors
                    self.log_result("Move to Collection - Wishlist Removal", True, "Wishlist item removed after move")
                else:
                    self.log_result("Move to Collection - Wishlist Removal", False, "Wishlist item still exists after move")
                
                return camera["id"]
            else:
                self.log_result("Move to Collection", False, "Response missing camera data", camera)
        else:
            self.log_result("Move to Collection", False, f"HTTP {result['status_code']}", result["data"])
        
        return None
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n=== Testing Error Handling ===")
        
        # Test invalid camera ID
        result = self.make_request("GET", "/cameras/invalid-id")
        if result["status_code"] == 400 or result["status_code"] == 404:
            self.log_result("Invalid Camera ID", True, f"Properly rejected invalid ID: HTTP {result['status_code']}")
        else:
            self.log_result("Invalid Camera ID", False, f"Unexpected response: HTTP {result['status_code']}")
        
        # Test invalid wishlist ID
        result = self.make_request("GET", "/wishlist/invalid-id")
        if result["status_code"] == 400 or result["status_code"] == 404:
            self.log_result("Invalid Wishlist ID", True, f"Properly rejected invalid ID: HTTP {result['status_code']}")
        else:
            self.log_result("Invalid Wishlist ID", False, f"Unexpected response: HTTP {result['status_code']}")
        
        # Test missing required fields
        invalid_camera = {"name": "Test Camera"}  # Missing required fields
        result = self.make_request("POST", "/cameras", invalid_camera)
        if result["status_code"] == 422:  # FastAPI validation error
            self.log_result("Missing Required Fields", True, "Properly rejected incomplete camera data")
        else:
            self.log_result("Missing Required Fields", False, f"Unexpected response: HTTP {result['status_code']}")
        
        # Test move non-existent wishlist item
        result = self.make_request("POST", "/wishlist/507f1f77bcf86cd799439011/to-collection")  # Valid ObjectId format but non-existent
        if result["status_code"] == 404:
            self.log_result("Move Non-existent Item", True, "Properly rejected non-existent wishlist item")
        else:
            self.log_result("Move Non-existent Item", False, f"Unexpected response: HTTP {result['status_code']}")
    
    def cleanup_test_data(self):
        """Clean up any remaining test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Get all cameras and delete test ones
        result = self.make_request("GET", "/cameras")
        if result["status_code"] == 200 and result["data"]:
            for camera in result["data"]:
                if "Canon AE-1" in camera.get("name", "") or "Leica M6" in camera.get("name", ""):
                    delete_result = self.make_request("DELETE", f"/cameras/{camera['id']}")
                    if delete_result["status_code"] == 200:
                        self.log_result("Cleanup Camera", True, f"Removed test camera: {camera['name']}")
        
        # Get all wishlist items and delete test ones
        result = self.make_request("GET", "/wishlist")
        if result["status_code"] == 200 and result["data"]:
            for item in result["data"]:
                if "Canon AE-1" in item.get("name", "") or "Leica M6" in item.get("name", ""):
                    delete_result = self.make_request("DELETE", f"/wishlist/{item['id']}")
                    if delete_result["status_code"] == 200:
                        self.log_result("Cleanup Wishlist", True, f"Removed test item: {item['name']}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🔍 Starting Comprehensive Backend API Tests")
        print(f"Testing API at: {self.base_url}")
        print("=" * 60)
        
        # Basic endpoint tests
        self.test_root_endpoint()
        self.test_options_endpoint()
        
        # CRUD tests
        self.test_camera_crud_operations()
        wishlist_item_id = self.test_wishlist_crud_operations()
        
        # Move to collection test
        if wishlist_item_id:
            moved_camera_id = self.test_move_to_collection(wishlist_item_id)
        
        # Error handling
        self.test_error_handling()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = sum(1 for r in self.test_results if not r["success"])
        total = len(self.test_results)
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 TOTAL:  {total}")
        print(f"📊 SUCCESS RATE: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return passed, failed, total

if __name__ == "__main__":
    tester = VintageAPITester()
    tester.run_all_tests()