import re
import httpx
from urllib.parse import unquote
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from models import PyObjectId
from database import get_db
from config import get_settings


class ToolStore:
    def __init__(self):
        self.db = get_db()

    def _to_obj_id(self, id_str: str) -> Optional[PyObjectId]:
        """Safe wrapper to convert string to PyObjectId."""
        if not id_str:
            return None
        try:
            return PyObjectId(id_str)
        except Exception:
            return None

    def _serialize_doc(self, doc: dict, keep_id: bool = False) -> dict:
        """Helper to serialize MongoDB documents, joined categories, and handle _id."""
        if not doc:
            return None

        # Create a shallow copy to avoid destroying the original MongoDB document 
        # which might be needed for further processing in the caller (e.g. ID lookups).
        doc = doc.copy()

        if keep_id and "_id" in doc:
            doc["id"] = str(doc["_id"])

        if "_id" in doc:
            del doc["_id"]

        # Serialize categories array to comma-separated string
        if "categories" in doc:
            if isinstance(doc["categories"], list) and doc["categories"]:
                doc["categories"] = ", ".join(doc["categories"])
            elif not doc["categories"]:
                doc["categories"] = "N/A"

        if "category" in doc:
            if isinstance(doc["category"], list) and doc["category"]:
                doc["categories"] = ", ".join(doc["category"])
            elif not doc["category"]:
                doc["categories"] = "N/A"
            else:
                doc["categories"] = doc["category"]

        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.strftime("%Y-%m-%d %H:%M:%S")
            elif isinstance(value, PyObjectId):
                doc[key] = str(value)

        return doc

    async def get_product_by_id(
        self, product_id: str, user_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch a single manufacturer product by its SKU, optionally enforcing ownership."""
        query = {"productId": product_id}
        if user_id:
            query["createdBy"] = self._to_obj_id(user_id)

        product = await self.db["products"].find_one(query)
        return self._serialize_doc(product, keep_id=False)

    async def list_products(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "name",
        order: str = "asc",
    ) -> List[Dict[str, Any]]:
        """List manufacturer products with batch counts."""
        sort_order = 1 if order == "asc" else -1

        cursor = (
            self.db["products"]
            .find({"createdBy": self._to_obj_id(user_id)})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        products = await cursor.to_list(length=limit)

        if not products:
            return []

        # Get batch counts using productId
        product_skus = [p["productId"] for p in products]
        batch_counts = (
            await self.db["batches"]
            .aggregate(
                [
                    {"$match": {"productId": {"$in": product_skus}}},
                    {"$group": {"_id": "$productId", "count": {"$sum": 1}}},
                ]
            )
            .to_list(length=len(product_skus))
        )
        counts_map = {item["_id"]: item["count"] for item in batch_counts}

        serialized = []
        for p in products:
            p_doc = self._serialize_doc(p, keep_id=False)
            p_doc["batchCount"] = counts_map.get(p["productId"], 0)
            serialized.append(p_doc)

        return serialized

    async def search_products(
        self, user_id: str, query: str = None, categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search manufacturer products."""
        filter_query = {"createdBy": self._to_obj_id(user_id)}

        if query:
            try:
                regex = re.compile(query, re.IGNORECASE)
                filter_query["$or"] = [
                    {"name": {"$regex": regex}},
                    {"productId": {"$regex": regex}},
                ]
            except re.error:
                return []

        if categories:
            cat_list = (
                categories
                if isinstance(categories, list)
                else [c.strip() for c in categories.split(",") if c.strip()]
            )
            if cat_list:
                filter_query["categories"] = {"$in": cat_list}

        cursor = self.db["products"].find(filter_query)
        products = await cursor.to_list(length=10)

        if not products:
            return []

        product_skus = [p["productId"] for p in products]
        batch_counts = (
            await self.db["batches"]
            .aggregate(
                [
                    {"$match": {"productId": {"$in": product_skus}}},
                    {"$group": {"_id": "$productId", "count": {"$sum": 1}}},
                ]
            )
            .to_list(length=len(product_skus))
        )
        counts_map = {item["_id"]: item["count"] for item in batch_counts}

        serialized = []
        for p in products:
            p_doc = self._serialize_doc(p, keep_id=False)
            p_doc["batchCount"] = counts_map.get(p["productId"], 0)
            serialized.append(p_doc)

        return serialized

    async def list_batches(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "createdAt",
        order: str = "desc",
    ) -> List[Dict[str, Any]]:
        """List manufacturer production batches with scan counts."""
        u_id = self._to_obj_id(user_id)
        sort_order = -1 if order == "desc" else 1
        
        cursor = (
            self.db["batches"]
            .find({"createdBy": u_id})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        batches = await cursor.to_list(length=limit)
        
        if not batches:
            return []

        # Logic Sync: Add scan counts like batch.controller.ts
        batch_ids = [b["_id"] for b in batches]
        scan_pipeline = [
            {"$match": {"batch": {"$in": batch_ids}}},
            {"$group": {"_id": "$batch", "count": {"$sum": 1}}},
        ]
        scan_counts = await self.db["scans"].aggregate(scan_pipeline).to_list(length=len(batch_ids))
        counts_map = {str(item["_id"]): item["count"] for item in scan_counts}

        serialized = []
        for b in batches:
            b_doc = self._serialize_doc(b, keep_id=False)
            b_doc["totalScans"] = counts_map.get(str(b["_id"]), 0)
            serialized.append(b_doc)
            
        return serialized

    async def search_batches(
        self, user_id: str, query: str = None, categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search manufacturer batches with scan counts."""
        u_id = self._to_obj_id(user_id)
        filter_query = {"createdBy": u_id}

        if query:
            try:
                regex = re.compile(query, re.IGNORECASE)
                filter_query["$or"] = [
                    {"batchNumber": {"$regex": regex}},
                    {"productName": {"$regex": regex}},
                ]
            except re.error:
                return []

        if categories:
            cat_list = (
                categories
                if isinstance(categories, list)
                else [c.strip() for c in categories.split(",") if c.strip()]
            )
            if cat_list:
                products_cursor = self.db["products"].find(
                    {"categories": {"$in": cat_list}}, {"productId": 1}
                )
                product_skus = [
                    p["productId"] for p in await products_cursor.to_list(length=100)
                ]
                filter_query["productId"] = {"$in": product_skus}

        cursor = self.db["batches"].find(filter_query).limit(20)
        batches = await cursor.to_list(length=20)
        
        if not batches:
            return []
            
        batch_ids = [b["_id"] for b in batches]
        scan_pipeline = [
            {"$match": {"batch": {"$in": batch_ids}}},
            {"$group": {"_id": "$batch", "count": {"$sum": 1}}},
        ]
        scan_counts = await self.db["scans"].aggregate(scan_pipeline).to_list(length=len(batch_ids))
        counts_map = {str(item["_id"]): item["count"] for item in scan_counts}

        serialized = []
        for b in batches:
            b_doc = self._serialize_doc(b, keep_id=False)
            b_doc["totalScans"] = counts_map.get(str(b["_id"]), 0)
            serialized.append(b_doc)
            
        return serialized

    async def get_batch_details(
        self, batch_number: str, user_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch detailed manufacturer batch info and linked product info with ownership verification."""
        query = {"batchNumber": batch_number}
        if user_id:
            query["createdBy"] = self._to_obj_id(user_id)

        batch = await self.db["batches"].find_one(query)
        if not batch:
            return None

        # Fetch linked product info by productId and owner
        product_info = await self.get_product_by_id(batch["productId"], user_id=user_id)

        # Fetch recent alerts
        alerts_cursor = (
            self.db["alerts"]
            .find(
                {"metadata.batchId": batch["_id"]},
                {"type": 1, "message": 1, "createdAt": 1, "_id": 0},
            )
            .sort("createdAt", -1)
            .limit(3)
        )
        recent_alerts = await alerts_cursor.to_list(length=3)

        # Fetch real-time scan counts (FIX-003)
        scan_pipeline = [
            {"$match": {"batch": batch["_id"]}},
            {"$group": {"_id": "$unitIndex", "count": {"$sum": 1}}},
        ]
        scan_cursor = self.db.scans.aggregate(scan_pipeline)
        scan_counts = {str(item["_id"]): item["count"] async for item in scan_cursor}

        serialized_batch = self._serialize_doc(batch, keep_id=False)
        serialized_batch["productDetails"] = product_info
        serialized_batch["scanCounts"] = scan_counts
        serialized_batch["recentAlerts"] = [
            {
                "type": a["type"].replace("_", " ").capitalize(),
                "message": a["message"],
                "date": a["createdAt"].strftime("%Y-%m-%d"),
            }
            for a in recent_alerts
        ]

        return serialized_batch

    async def list_cabinet_items(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "updatedAt",
        order: str = "desc",
    ) -> List[Dict[str, Any]]:
        """List user's cabinet items with enrichment for scans, streaks, and prescriptions."""
        u_id = self._to_obj_id(user_id)
        sort_order = -1 if order == "desc" else 1
        cursor = (
            self.db["cabinet_items"]
            .find({"userId": u_id})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        items = await cursor.to_list(length=limit)

        if not items:
            return []

        # Batch & Recall Status Lookup
        batch_ids = [i["batchId"] for i in items if i.get("batchId")]
        batches_cursor = self.db["batches"].find(
            {"_id": {"$in": batch_ids}},
            {"isRecalled": 1, "isOnBlockchain": 1},
        )
        batches_info = {str(b["_id"]): b for b in await batches_cursor.to_list(length=len(batch_ids))}

        # Prescription Labels Lookup
        all_presc_ids = []
        for i in items:
            all_presc_ids.extend(i.get("prescriptionIds", []))
        
        presc_labels = {}
        if all_presc_ids:
            presc_cursor = self.db["prescriptions"].find(
                {"_id": {"$in": all_presc_ids}},
                {"label": 1}
            )
            presc_labels = {str(p["_id"]): p["label"] for p in await presc_cursor.to_list(length=len(all_presc_ids))}

        # Live Scan Counts Logic Sync with cabinet.controller.ts
        scan_pairs = []
        for i in items:
            if i.get("batchId") and i.get("salt") and ":" in i["salt"]:
                try:
                    unit_idx = int(i["salt"].split(":")[1])
                    scan_pairs.append({"batch": i["batchId"], "unitIndex": unit_idx})
                except Exception:
                    pass
        
        counts_map = {}
        if scan_pairs:
            scan_counts = await self.db["scans"].aggregate([
                {"$match": {"$or": scan_pairs}},
                {"$group": {"_id": {"batch": "$batch", "unit": "$unitIndex"}, "count": {"$sum": 1}}}
            ]).to_list(length=len(scan_pairs))
            for c in scan_counts:
                counts_map[f"{str(c['_id']['batch'])}:{c['_id']['unit']}"] = c["count"]

        serialized = []
        for i in items:
            i_doc = self._serialize_doc(i, keep_id=True)
            
            # Enrich Recall & Blockchain
            b_id_str = str(i.get("batchId"))
            b_info = batches_info.get(b_id_str, {})
            i_doc["status"] = "RECALLED" if b_info.get("isRecalled") else "Active"
            i_doc["blockchainVerified"] = b_info.get("isOnBlockchain", False)
            
            # Enrich Prescription Labels
            p_ids = [str(pid) for pid in i.get("prescriptionIds", [])]
            i_doc["prescriptionLabels"] = [presc_labels.get(pid, "Unknown") for pid in p_ids if pid in presc_labels]
            
            # Enrich Live Scan Count
            if i.get("batchId") and i.get("salt") and ":" in i["salt"]:
                unit_idx = i["salt"].split(":")[1]
                count_key = f"{b_id_str}:{unit_idx}"
                i_doc["liveScanCount"] = counts_map.get(count_key, 0)
            else:
                i_doc["liveScanCount"] = 0
                
            serialized.append(i_doc)

        return serialized

    async def search_cabinet_items(
        self, user_id: str, query: str = None, categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search user's cabinet items with full enrichment."""
        u_id = self._to_obj_id(user_id)
        filter_query = {"userId": u_id}

        if query:
            try:
                regex = re.compile(query, re.IGNORECASE)
                filter_query["$or"] = [
                    {"name": {"$regex": regex}},
                    {"brand": {"$regex": regex}},
                    {"composition": {"$regex": regex}},
                    {"doctorName": {"$regex": regex}},
                    {"notes": {"$regex": regex}},
                    {"productId": {"$regex": regex}},
                ]
            except re.error:
                return []

        if categories:
            cat_list = (
                categories
                if isinstance(categories, list)
                else [c.strip() for c in categories.split(",") if c.strip()]
            )
            if cat_list:
                filter_query["category"] = {"$in": cat_list}

        cursor = self.db["cabinet_items"].find(filter_query).limit(20)
        items = await cursor.to_list(length=20)

        if not items:
            return []

        # Enrichment (Reuse logic from list_cabinet_items if this was a larger project, but for now inline is fine for AI speed)
        # Identical enrichment logic to list_cabinet_items
        batch_ids = [i["batchId"] for i in items if i.get("batchId")]
        batches_info = {}
        if batch_ids:
            batches_cursor = self.db["batches"].find({"_id": {"$in": batch_ids}}, {"isRecalled": 1, "isOnBlockchain": 1})
            batches_info = {str(b["_id"]): b for b in await batches_cursor.to_list(length=len(batch_ids))}

        all_presc_ids = []
        for i in items:
            all_presc_ids.extend(i.get("prescriptionIds", []))
        
        presc_labels = {}
        if all_presc_ids:
            presc_cursor = self.db["prescriptions"].find({"_id": {"$in": all_presc_ids}}, {"label": 1})
            presc_labels = {str(p["_id"]): p["label"] for p in await presc_cursor.to_list(length=len(all_presc_ids))}

        serialized = []
        for i in items:
            i_doc = self._serialize_doc(i, keep_id=True)
            b_id_str = str(i.get("batchId"))
            b_info = batches_info.get(b_id_str, {})
            i_doc["status"] = "RECALLED" if b_info.get("isRecalled") else "Active"
            i_doc["blockchainVerified"] = b_info.get("isOnBlockchain", False)
            p_ids = [str(pid) for pid in i.get("prescriptionIds", [])]
            i_doc["prescriptionLabels"] = [presc_labels.get(pid, "Unknown") for pid in p_ids if pid in presc_labels]
            serialized.append(i_doc)

        return serialized

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile excluding password and sensitive fields."""
        user = await self.db["users"].find_one({"_id": self._to_obj_id(user_id)})
        if not user:
            return None

        # Standard serialization
        profile = self._serialize_doc(user, keep_id=True)
        if "password" in profile:
            del profile["password"]

        # Enrich with company metadata if available
        if "companyId" in profile and profile["companyId"]:
            company = await self.db["companies"].find_one(
                {"_id": self._to_obj_id(profile["companyId"])}
            )
            if company:
                profile["companyName"] = company.get("name", "N/A")
                profile["companyDomain"] = company.get("domain", "N/A")

        # Add helper flags for the agent
        profile["isGoogleConnected"] = profile.get("provider") == "google"

        return profile

    async def add_medicine_to_cabinet(
        self,
        user_id: str,
        name: str,
        brand: str,
        expiry_date: str,
        composition: str = None,
        medicine_code: str = None,
        batch_number: str = None,
        prescription_ids: list = None,
        dosage: float = None,
        unit: str = "pills",
        frequency: str = None,
        quantity: int = None,
        doctor_name: str = None,
        notes: str = None,
    ) -> bool:
        """Manually add a medicine to the user's cabinet with explicit schema enforced."""
        u_id = self._to_obj_id(user_id)
        if not u_id:
            return False

        # Generate slug-based productId matching backend's generateIdSlug(name)
        import re as _re
        product_id = _re.sub(r'^-+|-+$', '', _re.sub(r'[^a-z0-9]+', '-', name.lower().strip()))

        # Parse expiry date if provided
        parsed_expiry = None
        if expiry_date:
            try:
                if "T" in expiry_date:
                    parsed_expiry = datetime.fromisoformat(
                        expiry_date.replace("Z", "+00:00")
                    )
                else:
                    parsed_expiry = datetime.strptime(expiry_date, "%Y-%m-%d")
            except Exception:
                pass

        item = {
            "userId": u_id,
            "name": name,
            "brand": brand,
            "composition": composition or "N/A",
            "medicineCode": medicine_code or "N/A",
            "productId": product_id,
            "batchNumber": batch_number or "N/A",
            "expiryDate": parsed_expiry,
            "prescriptionIds": [
                self._to_obj_id(pid) for pid in prescription_ids if self._to_obj_id(pid)
            ]
            if prescription_ids
            else [],
            "isUserAdded": True,
            "dosage": dosage if dosage is not None else 1,
            "unit": unit or "pills",
            "frequency": frequency,
            "currentQuantity": quantity or 0,
            "totalQuantity": quantity or 0,
            "doctorName": doctor_name,
            "notes": notes,
            "status": "active",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
        }

        result = await self.db["cabinet_items"].insert_one(item)
        return bool(result.inserted_id)

    async def update_cabinet_item(
        self, item_id: str, user_id: str, updates: Dict[str, Any]
    ) -> bool:
        """Update an existing medicine in the user's cabinet."""
        updates["updatedAt"] = datetime.now()
        result = await self.db["cabinet_items"].update_one(
            {"_id": self._to_obj_id(item_id), "userId": self._to_obj_id(user_id)},
            {"$set": updates},
        )
        return result.modified_count > 0

    async def remove_cabinet_item(self, item_id: str, user_id: str) -> bool:
        """Remove a medicine from the user's cabinet."""
        result = await self.db["cabinet_items"].delete_one(
            {"_id": self._to_obj_id(item_id), "userId": self._to_obj_id(user_id)}
        )
        return result.deleted_count > 0

    async def _sync_streak(self, item_id: str, user_timezone: str = "UTC") -> int:
        """Notifies the backend to recalculate the streak for an item. FIX-002 sync logic."""
        settings = get_settings()
        url = f"{settings.BACKEND_URL}/api/cabinet/refresh-streak/{item_id}"
        headers = {
            "X-Internal-Secret": settings.INTERNAL_API_KEY,
            "x-timezone": user_timezone
        }
        try:
            async with httpx.AsyncClient() as client:
                # Note: This is an internal call. Backend refreshStreakHandler handles auth via secret or skip
                # Actually, our backend router uses 'authenticate' middleware. 
                # We should use the internal secret or provide a way to skip auth.
                # Since we are an agent, we don't have the user's JWT here easily.
                # RELIABILITY FIX: I added 'X-Internal-Secret' but backend router needs to support it.
                # I will update backend router later to allow internal secret for this specific route.
                response = await client.post(url, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    return response.json().get("streak", 0)
        except Exception as e:
            print(f"Failed to sync streak with backend: {e}")
        return 0

    async def mark_dose_taken(self, item_id: str, user_id: str, user_timezone: str = "UTC") -> dict:
        """Decrement currentQuantity for a medicine and log a dosage event.
        Returns a dict with success flag, currentQuantity, currentStreak, and isDoseDoneToday."""
        obj_id = self._to_obj_id(item_id)
        u_id = self._to_obj_id(user_id)
        item = await self.db["cabinet_items"].find_one(
            {"_id": obj_id, "userId": u_id}
        )
        if not item or item.get("currentQuantity", 0) <= 0:
            return {"success": False, "reason": "no_stock"}

        # Atomic Update
        result = await self.db["cabinet_items"].update_one(
            {"_id": obj_id},
            {"$inc": {"currentQuantity": -1}, "$set": {"updatedAt": datetime.now()}},
        )
        if result.modified_count == 0:
            return {"success": False, "reason": "update_failed"}

        # Create a dosage log
        was_punctual = False
        now_utc = datetime.now(timezone.utc)
        
        # Logic Parity: Check punctuality against reminderTimes (FIX-003)
        WINDOW_MINUTES = 180
        reminders = item.get("reminderTimes", [])
        if reminders:
            for r in reminders:
                # reminder['time'] is a datetime stored as UTC 'today' at HH:MM
                r_time = r.get("time")
                if isinstance(r_time, datetime):
                    # We only care about HH:MM for today's punctuality
                    scheduled = now_utc.replace(hour=r_time.hour, minute=r_time.minute, second=0, microsecond=0)
                    diff_mins = abs((now_utc - scheduled).total_seconds()) / 60
                    if diff_mins <= WINDOW_MINUTES:
                        was_punctual = True
                        break

        await self.db["dosage_logs"].insert_one({
            "cabinetItemId": obj_id,
            "userId": u_id,
            "timestamp": now_utc,
            "doseAmount": item.get("dosage", 1),
            "wasPunctual": was_punctual,
        })

        # Sync with backend to refresh streak (FIX-002)
        current_streak = await self._sync_streak(item_id, user_timezone)

        # Compute isDoseDoneToday
        start_of_today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        logs_today = await self.db["dosage_logs"].count_documents({
            "cabinetItemId": obj_id,
            "timestamp": {"$gte": start_of_today_utc}
        })
        reminders_count = len(item.get("reminderTimes", []))
        is_done_today = reminders_count > 0 and logs_today >= reminders_count

        new_quantity = item.get("currentQuantity", 1) - 1

        return {
            "success": True,
            "currentQuantity": new_quantity,
            "currentStreak": current_streak,
            "isDoseDoneToday": is_done_today,
        }

    async def undo_dose(self, item_id: str, user_id: str, user_timezone: str = "UTC") -> bool:
        """Revert the last recorded dose log: restore inventory and delete the log."""
        u_id = self._to_obj_id(user_id)
        obj_id = self._to_obj_id(item_id)
        if not u_id or not obj_id:
            return False

        item = await self.db["cabinet_items"].find_one({"_id": obj_id, "userId": u_id})
        if not item:
            return False

        latest_log = await self.db["dosage_logs"].find_one(
            {"cabinetItemId": obj_id, "userId": u_id},
            sort=[("timestamp", -1)],
        )
        if not latest_log:
            return False

        await self.db["dosage_logs"].delete_one({"_id": latest_log["_id"]})
        dose_amount = latest_log.get("doseAmount", 1)
        await self.db["cabinet_items"].update_one(
            {"_id": obj_id},
            {"$inc": {"currentQuantity": dose_amount}, "$set": {"updatedAt": datetime.now()}},
        )

        # Sync with backend (FIX-002)
        await self._sync_streak(item_id, user_timezone)
        return True

    async def add_reminder_to_cabinet_item(
        self,
        item_id: str,
        user_id: str,
        time: str,
        meal_context: str = "no_preference",
        frequency_type: str = "daily",
        days_of_week: list = None,
        interval: int = 1,
    ) -> bool:
        """Append a new reminder to the cabinet item's reminderTimes array."""
        u_id = self._to_obj_id(user_id)
        obj_id = self._to_obj_id(item_id)
        if not u_id or not obj_id:
            return False

        # Parse HH:MM time into a full datetime stored as UTC today
        try:
            h, m = map(int, time.split(":"))
            now = datetime.now()
            reminder_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
        except Exception:
            return False

        reminder = {
            "time": reminder_dt,
            "mealContext": meal_context,
            "frequencyType": frequency_type,
            "daysOfWeek": days_of_week or [],
            "interval": interval or 1,
        }

        result = await self.db["cabinet_items"].update_one(
            {"_id": obj_id, "userId": u_id},
            {"$push": {"reminderTimes": reminder}, "$set": {"updatedAt": datetime.now()}},
        )
        return result.modified_count > 0

    async def remove_reminder_from_cabinet_item(
        self, item_id: str, user_id: str, reminder_index: int
    ) -> bool:
        """Remove a reminder from reminderTimes by its 0-based index."""
        u_id = self._to_obj_id(user_id)
        obj_id = self._to_obj_id(item_id)
        if not u_id or not obj_id:
            return False

        item = await self.db["cabinet_items"].find_one({"_id": obj_id, "userId": u_id})
        if not item:
            return False

        reminders = item.get("reminderTimes", [])
        if reminder_index < 0 or reminder_index >= len(reminders):
            return False

        # MongoDB array element removal by index: set to null then pull
        await self.db["cabinet_items"].update_one(
            {"_id": obj_id},
            {"$unset": {f"reminderTimes.{reminder_index}": 1}},
        )
        await self.db["cabinet_items"].update_one(
            {"_id": obj_id},
            {"$pull": {"reminderTimes": None}, "$set": {"updatedAt": datetime.now()}},
        )
        return True

    async def list_prescriptions(
        self, user_id: str, skip: int = 0, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """List user's prescriptions."""
        cursor = (
            self.db["prescriptions"]
            .find({"userId": self._to_obj_id(user_id)}, {"content": 0})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        prescriptions = await cursor.to_list(length=limit)
        return [self._serialize_doc(p, keep_id=True) for p in prescriptions]

    async def get_prescription(
        self, prescription_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a single prescription to access its URL."""
        p = await self.db["prescriptions"].find_one(
            {
                "_id": self._to_obj_id(prescription_id),
                "userId": self._to_obj_id(user_id),
            }
        )
        return self._serialize_doc(p, keep_id=True)

    async def search_prescriptions_content(
        self, user_id: str, query: str
    ) -> List[Dict[str, Any]]:
        """
        Regex-based search across all user prescriptions directly in MongoDB.
        Reliability fix for O(N) scaling issues in ai-service/tools.py.
        """
        cursor = self.db["prescriptions"].find(
            {"userId": self._to_obj_id(user_id), "content": {"$regex": query, "$options": "i"}}
        ).limit(31)
        
        results = await cursor.to_list(length=31)
        return [self._serialize_doc(r, keep_id=True) for r in results]

    async def get_scan_geography(
        self,
        user_id: str,
        from_date: str = None,
        to_date: str = None,
        product_id: str = None,
        batch_number: str = None,
    ) -> List[Dict[str, Any]]:
        """Get geographic scan distribution for manufacturer with filtered depth."""
        match_query = {"manufacturer": self._to_obj_id(user_id)}

        # Add date range filter
        date_filter = {}
        if from_date:
            try:
                date_filter["$gte"] = datetime.fromisoformat(
                    from_date.replace("Z", "+00:00")
                )
            except Exception:
                pass
        if to_date:
            try:
                date_filter["$lte"] = datetime.fromisoformat(
                    to_date.replace("Z", "+00:00")
                )
            except Exception:
                pass

        if date_filter:
            match_query["createdAt"] = date_filter

        # Add entity filters
        if product_id:
            match_query["productId"] = product_id
        if batch_number:
            match_query["batchNumber"] = batch_number

        pipeline = [
            {"$match": match_query},
            {
                "$group": {
                    "_id": {"country": "$country", "city": "$city"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 20},
        ]
        results = await self.db["scans"].aggregate(pipeline).to_list(length=20)
        return [
            {
                "country": r["_id"].get("country", "Unknown"),
                "city": r["_id"].get("city", "Unknown"),
                "count": r["count"],
            }
            for r in results
        ]

    async def get_threat_data(
        self,
        user_id: str,
        from_date: str = None,
        to_date: str = None,
        product_id: str = None,
        batch_number: str = None,
    ) -> List[Dict[str, Any]]:
        """Get suspicious scan patterns (multiple visitors per unit) with filtered depth."""
        match_query = {"manufacturer": self._to_obj_id(user_id)}

        # Add date range filter
        date_filter = {}
        if from_date:
            try:
                date_filter["$gte"] = datetime.fromisoformat(
                    from_date.replace("Z", "+00:00")
                )
            except Exception:
                pass
        if to_date:
            try:
                date_filter["$lte"] = datetime.fromisoformat(
                    to_date.replace("Z", "+00:00")
                )
            except Exception:
                pass

        if date_filter:
            match_query["createdAt"] = date_filter

        # Add entity filters
        if product_id:
            match_query["productId"] = product_id
        if batch_number:
            match_query["batchNumber"] = batch_number

        pipeline = [
            {"$match": match_query},
            {
                "$group": {
                    "_id": {"batch": "$batch", "unit": "$unitIndex"},
                    "uniqueVisitors": {"$addToSet": "$visitorId"},
                    "totalScans": {"$sum": 1},
                }
            },
            {
                "$project": {
                    "batchId": "$_id.batch",
                    "unit": "$_id.unit",
                    "visitorCount": {"$size": "$uniqueVisitors"},
                    "totalScans": 1,
                }
            },
            {"$match": {"visitorCount": {"$gt": 3}}},
            {"$sort": {"visitorCount": -1}},
            {"$limit": 10},
        ]
        results = await self.db["scans"].aggregate(pipeline).to_list(length=10)

        # Enrich with batch numbers
        batch_ids = [r["batchId"] for r in results if r.get("batchId")]
        batches = (
            await self.db["batches"]
            .find({"_id": {"$in": batch_ids}})
            .to_list(length=len(batch_ids))
        )
        batch_map = {b["_id"]: b["batchNumber"] for b in batches}

        return [
            {
                "batchNumber": batch_map.get(r["batchId"], "Unknown"),
                "unit": r["unit"],
                "visitorCount": r["visitorCount"],
                "totalScans": r["totalScans"],
            }
            for r in results
        ]

    # --- View Data & Dashboard Aggregators (Shifted from ChatStore & Enhanced) ---

    async def get_view_data(
        self, route: str, user_id: str, role: str, params: dict = None
    ) -> str:
        """Centralized aggregator for view-specific data digests, mimicking frontend fetching."""
        params = params or {}
        route = "/" + route.strip("/")

        # Safeguard: Detect 'wrong' IDs like null/undefined/batches early
        if any(wrong in route for wrong in ["/null", "/undefined"]):
            return f"The identifier in the route appears to be wrong (null/undefined). Please check the context or ask the user for a valid ID. Current route: {route}"

        try:
            if route in ["/customer", "/customer/cabinet"]:
                return await self.get_customer_dashboard_data(user_id)

            if route == "/customer/prescriptions":
                return await self.get_customer_prescriptions_data(user_id)

            if route.startswith("/customer/cabinet/"):
                identifier = unquote(route.split("/")[-1])
                if identifier and identifier != "cabinet":
                    return await self.get_cabinet_item_summary(identifier, user_id)

            if route == "/manufacturer":
                return await self.get_manufacturer_dashboard_data(user_id)

            if route == "/manufacturer/batches":
                return await self.get_manufacturer_batches_data(user_id)

            if route == "/manufacturer/products":
                return await self.get_manufacturer_products_data(user_id)

            if route.startswith("/manufacturer/batches/"):
                identifier = unquote(route.split("/")[-1])
                if identifier == "new":
                    return "You are on the Batch Enrollment page. I can help you with regulatory naming, batch sizing, or salt derivation logic."
                if identifier and identifier != "batches":
                    return await self.get_batch_summary_by_id_or_number(
                        identifier, user_id
                    )

            if route.startswith("/manufacturer/products/"):
                identifier = unquote(route.split("/")[-1])
                if identifier == "new":
                    return "You are in the Product Catalog editor. Tell me about the medication's composition or brand to help you register it."
                if identifier and identifier != "products":
                    return await self.get_product_summary_by_id_or_code(
                        identifier, user_id
                    )

            if route == "/manufacturer/analytics":
                return await self.get_manufacturer_analytics_summary(user_id, params)

            if route == "/manufacturer/analytics/scans":
                return await self.get_manufacturer_analytics_deep_dive(user_id, params)

            if route.endswith("/notifications"):
                return await self.get_notifications_summary(user_id)

            if route == "/verify":
                # Situational Hand-off Logic: check params, then persistent activeData
                salt = params.get("salt") or params.get("id")
                
                # If cleared from URL, look in the persistent active_data provided by AgentContext
                # 'context' is passed in higher-level but we are inside get_view_data
                # We need to ensure tools.py passes the full context if possible, 
                # or main.py merges it into params.
                if not salt and params.get("active_data"):
                    salt = params["active_data"].get("salt")

                if salt:
                    if salt in ["null", "undefined"]:
                        return "The verification identifier (salt) is wrong or missing. Please ensure you are viewing a valid verification page."
                    return await self.get_verification_data(salt)
                return "Ready to verify. Please scan a QR code or enter a product salt."

            return f"No data available for route: {route} Use get_page_details tool to get static page details."
        except Exception as e:
            return f"Error gathering situational view data: {str(e)}"

    async def get_manufacturer_dashboard_data(self, user_id: str) -> str:
        """Aggregates metrics and recent activity for the manufacturer dashboard."""
        u_id = self._to_obj_id(user_id)

        # Core Stats
        product_count = await self.db.products.count_documents({"createdBy": u_id})
        batch_count = await self.db.batches.count_documents({"createdBy": u_id})
        unread_count = await self.db.notifications.count_documents(
            {"user": u_id, "isRead": False}
        )

        # Scans Today Logic (Optimized using denormalized manufacturer field)
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        scans_today = await self.db.scans.count_documents(
            {"manufacturer": u_id, "createdAt": {"$gte": today_start}}
        )

        # Recent Notifications
        notifications_cursor = (
            self.db.notifications.find({"user": u_id}).sort("createdAt", -1).limit(5)
        )
        notifications = await notifications_cursor.to_list(length=5)

        summary = [
            "## Manufacturer Dashboard Overview",
            f"- **Enrolled Products:** {product_count}",
            f"- **Registered Batches:** {batch_count}",
            f"- **Verified Scans Today:** {scans_today}",
            f"- **Unread Security Alerts:** {unread_count}",
            "\n### Recent Activity",
        ]

        if notifications:
            for n in notifications:
                n_type = n.get("type", "alert").replace("_", " ").title()
                timestamp = (
                    n.get("createdAt").strftime("%H:%M")
                    if n.get("createdAt")
                    else "N/A"
                )
                summary.append(
                    f"- **[{n_type}]** {n.get('title')}: {n.get('message')} ({timestamp})"
                )
        else:
            summary.append("- No recent activity recorded.")

        return "\n".join(summary)

    async def get_customer_dashboard_data(self, user_id: str) -> str:
        """Aggregates overview data for the customer 'My Medicines' dashboard."""
        u_id = self._to_obj_id(user_id)
        total_items = await self.db.cabinet_items.count_documents({"userId": u_id})
        verified_items = await self.db.cabinet_items.count_documents(
            {"userId": u_id, "isUserAdded": False}
        )
        manual_items = await self.db.cabinet_items.count_documents(
            {"userId": u_id, "isUserAdded": True}
        )
        # Backend Alignment: Expiring Soon (7 days)
        now = datetime.now()
        one_week_later = (now + timedelta(days=7)).strftime("%Y-%m-%d")
        expiring_soon = await self.db.cabinet_items.count_documents({
            "userId": u_id,
            "expiryDate": {"$lte": one_week_later}
        })

        # Backend Alignment: Scheduled Today (Items with at least one reminder)
        scheduled_today = await self.db.cabinet_items.count_documents({
            "userId": u_id,
            "reminderTimes.0": {"$exists": True}
        })

        
        
        # Get max streak
        max_streak_doc = await self.db.cabinet_items.find({"userId": u_id}).sort("currentStreak", -1).limit(1).to_list(length=1)
        max_streak = max_streak_doc[0].get("currentStreak", 0) if max_streak_doc else 0

        # Optimized Recall Check: Only check batches associated with THIS user's cabinet
        # 1. Get unique batch IDs from user's verified items
        user_batch_ids = await self.db.cabinet_items.distinct("batchId", {"userId": u_id, "isUserAdded": False, "batchId": {"$ne": None}})
        # 2. Count how many of those specific batches are recalled
        recall_warnings = 0
        if user_batch_ids:
            recall_warnings = await self.db.batches.count_documents(
                {"_id": {"$in": user_batch_ids}, "isRecalled": True}
            )

        recent_cursor = (
            self.db.cabinet_items.find({"userId": u_id}).sort("updatedAt", -1).limit(3)
        )
        recent = await recent_cursor.to_list(length=3)

        # Count items with ALL today's doses already completed (isDoseDoneToday logic)
        # Approximate: count items that have logs today >= number of reminders.
        # For the dashboard summary we use a lightweight heuristic: items with at least one log today.
        start_of_today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        doses_logged_today = await self.db.dosage_logs.count_documents({
            "userId": u_id,
            "timestamp": {"$gte": start_of_today_utc}
        })

        summary = [
            "## My Medicines Dashboard Overview",
            f"- **Total Items in Cabinet:** {total_items}",
            f"- **Verified Authentic:** {verified_items}",
            f"- **Manually Added:** {manual_items}",
            f"- **Scheduled for Today:** {scheduled_today} Medications",
            f"- **Doses Logged Today:** {doses_logged_today}",
            f"- **Expiring within 7 Days:** {expiring_soon}",
            f"- **Current Best Streak:** {max_streak} Days",
            f"- **Safety Recall Alerts (DANGER):** {recall_warnings}",
            "\n### Recently Updated",
        ]

        if recent:
            for r in recent:
                type_label = "Verified" if not r.get("isUserAdded") else "Manual"
                summary.append(f"- **{r['name']}** ({r['brand']}) - {type_label}")
        else:
            summary.append("- Your My Medicines list is currently empty.")

        return "\n".join(summary)

    async def get_customer_prescriptions_data(self, user_id: str) -> str:
        """Aggregates overview data for the customer Prescriptions page."""
        u_id = self._to_obj_id(user_id)
        total_items = await self.db.prescriptions.count_documents({"userId": u_id})

        recent_cursor = (
            self.db.prescriptions.find({"userId": u_id}).sort("createdAt", -1).limit(3)
        )
        recent = await recent_cursor.to_list(length=3)

        summary = [
            "## Prescriptions Overview",
            f"- **Total Prescriptions Uploaded:** {total_items}",
            "\n### Recent Prescriptions",
        ]

        if recent:
            for r in recent:
                summary.append(
                    f"- **{r.get('label', 'Untitled')}** (Dr. {r.get('doctorName', 'Unknown')})"
                )
        else:
            summary.append("- You have not uploaded any prescriptions yet.")

        return "\n".join(summary)

    async def get_manufacturer_batches_data(self, user_id: str) -> str:
        """Returns a digest of production batches with real-time scan volume (FIX-003)."""
        batches = await self.list_batches(user_id, limit=20)

        summary = ["## Production Batches List"]
        if not batches:
            summary.append("- No batches enrolled yet.")
        else:
            # Aggregate scan counts for all batches in this view
            batch_numbers = [b["batchNumber"] for b in batches]
            scan_pipeline = [
                {"$match": {"batchNumber": {"$in": batch_numbers}}},
                {"$group": {"_id": "$batchNumber", "count": {"$sum": 1}}},
            ]
            scan_counts_cursor = self.db.scans.aggregate(scan_pipeline)
            counts_map = {
                item["_id"]: item["count"] async for item in scan_counts_cursor
            }

            summary.append("| Batch # | Product | Scans | Status |")
            summary.append("| :--- | :--- | :--- | :--- |")
            for b in batches:
                total_scans = counts_map.get(b["batchNumber"], 0)
                status = "Recalled" if b.get("isRecalled") else "Active"
                summary.append(
                    f"| {b['batchNumber']} | {b['productName']} | {total_scans} | {status} |"
                )

        return "\n".join(summary)

    async def get_manufacturer_products_data(self, user_id: str) -> str:
        """Returns a digest of the manufacturer's product catalog."""
        products = await self.list_products(user_id, limit=20)

        summary = ["## Product Catalog Management"]
        if not products:
            summary.append("- No products registered in catalog.")
        else:
            summary.append("| Product Name | Brand | Batches | Categories |")
            summary.append("| :--- | :--- | :--- | :--- |")
            for p in products:
                summary.append(
                    f"| {p['name']} | {p['brand']} | {p.get('batchCount', 0)} | {p.get('categories', 'N/A')} |"
                )

        return "\n".join(summary)

    async def get_verification_data(self, salt: str) -> str:
        """Fetch and return a digest of verification result for a specific salt."""
        # Handle internal salt (batchSalt:unitIndex)
        batch_salt = salt.split(":")[0] if ":" in salt else salt
        unit_idx = salt.split(":")[1] if ":" in salt else "0"

        batch = await self.db.batches.find_one({"batchSalt": batch_salt})
        if not batch:
            return (
                f"Verification Failed: No record found for salt `{salt}` on ChainTrust."
            )

        # Real-time scan lookup (FIX-003)
        scan_count = await self.db.scans.count_documents(
            {
                "batchNumber": batch["batchNumber"],
                "unitIndex": int(unit_idx) if unit_idx.isdigit() else 0,
            }
        )

        status = (
            "RECALLED"
            if batch.get("isRecalled")
            else ("SUSPICIOUS" if scan_count > 5 else "AUTHENTIC")
        )

        summary = [
            f"## Verification Result: {status}",
            f"- **Product:** {batch['productName']}",
            f"- **Brand:** {batch['brand']}",
            f"- **Batch Number:** {batch['batchNumber']}",
            f"- **Unit Index:** {unit_idx}",
            f"- **Scan Count for this Unit:** {scan_count}",
            f"- **Blockchain Hash:** `{batch.get('blockchainHash', 'Verified')[:16]}...`",
            "\n**Verdict:** "
            + (
                "🚨 SAFETY RECALL • DO NOT USE"
                if batch.get("isRecalled")
                else (
                    "⚠️ SUSPICIOUS UNIT • POTENTIAL COUNTERFEIT"
                    if scan_count > 5
                    else "✅ AUTHENTIC PRODUCT • SECURE RECORD MATCH"
                )
            ),
        ]

        return "\n".join(summary)

    async def get_batch_summary_by_id_or_number(
        self, identifier: str, user_id: str
    ) -> str:
        """Fetch and format batch summary for view data using either _id or batchNumber."""
        
        # Safeguard: Detect 'wrong' IDs like null/undefined
        if identifier in ["null", "undefined"]:
            return "The identifier is wrong (null/undefined). Please provide a valid Batch Number or ID."

        u_id = PyObjectId(user_id)
        batch = await self.db.batches.find_one(
            {"batchNumber": identifier, "createdBy": u_id}
        )
        if not batch:
            try:
                batch = await self.db.batches.find_one(
                    {"_id": PyObjectId(identifier), "createdBy": u_id}
                )
            except Exception:
                pass

        if not batch:
            return f"Synchronized with batch route, but identifier '{identifier}' was not found."

        # Re-use the detailed fetch logic with owner verification
        details = await self.get_batch_details(batch["batchNumber"], user_id=user_id)
        if not details:
            return f"Failed to retrieve details for batch {identifier}."

        scan_counts = details.get("scanCounts", {})
        total_scans = sum(scan_counts.values()) if isinstance(scan_counts, dict) else 0

        summary = [
            f"## Batch Detail: {details['batchNumber']}",
            f"- **Product:** {details['productName']} ({details['productId']})",
            f"- **Brand:** {details['brand']}",
            f"- **Status:** {'Recalled' if details.get('isRecalled') else 'Active'} (Blockchain: {'Enabled' if details.get('isOnBlockchain') else 'Disabled'})",
            f"- **Total Scans:** {total_scans}",
            f"- **Expiry Date:** {details.get('expiryDate', 'N/A')}",
        ]

        if details.get("recentAlerts"):
            summary.append("\n### Recent Alerts")
            for a in details["recentAlerts"]:
                summary.append(f"- [{a['type']}] {a['message']} ({a['date']})")

        return "\n".join(summary)

    async def get_product_summary_by_id_or_code(
        self, identifier: str, user_id: str
    ) -> str:
        """Fetch and format product summary for view data using either _id or productId."""

        # Safeguard: Detect 'wrong' IDs like null/undefined
        if identifier in ["null", "undefined"]:
            return "The identifier is wrong (null/undefined). Please provide a valid Product ID or SKU."

        u_id = PyObjectId(user_id)
        product = await self.db.products.find_one(
            {"productId": identifier, "createdBy": u_id}
        )
        if not product:
            try:
                product = await self.db.products.find_one(
                    {"_id": PyObjectId(identifier), "createdBy": u_id}
                )
            except Exception:
                pass

        if not product:
            return f"Synchronized with product route, but identifier '{identifier}' was not found."

        # Enrich with batch count
        batch_count = await self.db.batches.count_documents(
            {"productId": product["productId"]}
        )

        summary = [
            f"## Product Information: {product['name']}",
            f"- **Brand:** {product['brand']}",
            f"- **SKU/Product ID:** {product['productId']}",
            f"- **Price:** ${product.get('price', 'N/A')}",
            f"- **Enrolled Batches:** {batch_count}",
            f"- **Categories:** {product.get('categories', 'N/A')}",
            f"\n**Description:** {product.get('description', 'No description available.')}",
        ]

        return "\n".join(summary)

    async def get_upcoming_doses_summary(self, user_id: str) -> str:
        """Dashboard-style summary of upcoming medication doses."""
        # This logic should ideally match backend/controllers/cabinet.controller.ts:getUpcomingDoses
        # For the agent, we provide a human-readable list of what's due soon.
        u_id = self._to_obj_id(user_id)
        active_items = await self.db["cabinet_items"].find({
            "userId": u_id,
            "status": "active",
            "reminderTimes": {"$exists": True, "$not": {"$size": 0}}
        }).to_list(length=50)

        if not active_items:
            return "No upcoming doses scheduled."

        now = datetime.now()
        start_of_day = datetime(now.year, now.month, now.day)
        end_of_day = start_of_day + timedelta(days=1, microseconds=-1)

        summary = ["## Upcoming Medication Schedule"]
        
        upcoming = []
        for item in active_items:
            # Get logs for this item today
            logs_today_count = await self.db["dosage_logs"].count_documents({
                "cabinetItemId": item["_id"],
                "timestamp": {"$gte": start_of_day, "$lte": end_of_day}
            })

            # Sort reminder times for this item chronologically
            reminders = sorted(item.get("reminderTimes", []), key=lambda x: x.get("time"))
            for idx, r in enumerate(reminders):
                # Logic: If index < logs_today_count, it's fulfilled
                r_time_str = r.get("time")
                
                # Parse time parts
                try:
                    if "T" in r_time_str:
                        # Full ISO
                        dt = datetime.fromisoformat(r_time_str.replace("Z", "+00:00"))
                        h, m = dt.hour, dt.minute
                    else:
                        # HH:MM
                        h, m = map(int, r_time_str.split(":"))
                    
                    scheduled_today = start_of_day.replace(hour=h, minute=m)
                except Exception:
                    continue

                status = "Upcoming"
                if idx < logs_today_count:
                    status = "✅ Fulfilled Today"
                elif scheduled_today < now:
                    # Past time and not fulfilled
                    status = "⚠️ Missed?"
                
                upcoming.append({
                    "time": scheduled_today,
                    "display_time": f"{h:02d}:{m:02d}",
                    "name": item["name"],
                    "brand": item.get("brand", "N/A"),
                    "status": status,
                    "ctx": r.get("mealContext", "No context")
                })

        if not upcoming:
            return "No doses scheduled or remaining for today."

        # Sort all by actual time
        upcoming.sort(key=lambda x: x["time"])
        
        for u in upcoming:
            summary.append(f"- **{u['display_time']}**: {u['name']} ({u['brand']}) - {u['status']} [{u['ctx']}]")

        return "\n".join(summary)

    async def get_cabinet_item_summary(self, identifier: str, user_id: str) -> str:
        """Fetch and format detailed summary for a specific cabinet item."""
        u_id = self._to_obj_id(user_id)
        
        # Detect malformed identifier
        if identifier in ["null", "undefined"]:
            return "Identifier is wrong (null/undefined). Please provide a valid Cabinet Item ID."

        item = await self.db["cabinet_items"].find_one(
            {"_id": self._to_obj_id(identifier), "userId": u_id}
        )
        if not item:
            return f"Cabinet item '{identifier}' was not found. Verify the ID in your cabinet."

        # Fetch batch and scan context
        batch_info = await self.db["batches"].find_one(
            {"batchNumber": item.get("batchNumber")},
            {"isRecalled": 1, "isOnBlockchain": 1, "productName": 1}
        )
        
        status = "RECALLED" if batch_info and batch_info.get("isRecalled") else "Active"
        verified = batch_info.get("isOnBlockchain", False) if batch_info else False

        dosage_display = item.get("dosage", "N/A")
        unit = item.get("unit", "pills") or "pills"
        dosage_str = f"{dosage_display} {unit}" if dosage_display not in (None, "N/A") else "N/A"

        # Compute isDoseDoneToday for the detail view
        start_of_today_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        logs_today = await self.db["dosage_logs"].count_documents({
            "cabinetItemId": item["_id"],
            "timestamp": {"$gte": start_of_today_utc}
        })
        reminders_count = len(item.get("reminderTimes", []))
        is_done_today = reminders_count > 0 and logs_today >= reminders_count

        summary = [
            f"## Medication Details: {item['name']}",
            f"- **Brand:** {item['brand']}",
            f"- **Status:** {status}",
            f"- **Authenticity:** {'Blockchain Verified' if verified else 'Manually Added'}",
            f"- **Composition:** {item.get('composition', 'N/A')}",
            f"- **Doctor:** {item.get('doctorName', 'N/A')}",
            f"- **Current Stock:** {item.get('currentQuantity', 0)} {unit}",
            f"- **Dosage Per Intake:** {dosage_str}",
            f"- **Frequency:** {item.get('frequency', 'N/A')}",
            f"- **Adherence Streak:** {item.get('currentStreak', 0)} Days",
            f"- **All Doses Done Today:** {'Yes' if is_done_today else 'No'}",
            f"- **Doses Logged Today:** {logs_today} / {reminders_count if reminders_count else 'N/A'} scheduled",
            f"- **Expiry Date:** {item.get('expiryDate', 'N/A')}",
            f"- **Notes:** {item.get('notes', 'None')}",
        ]

        reminders = item.get("reminderTimes", [])
        if reminders:
            summary.append(f"\n### Reminders ({len(reminders)} scheduled)")
            freq_labels = {
                "daily": "Daily",
                "weekly": "Weekly",
                "interval_days": "Every N days",
                "interval_months": "Every N months",
            }
            meal_labels = {
                "before_meal": "Before Meal",
                "after_meal": "After Meal",
                "with_meal": "With Meal",
                "no_preference": "No meal preference",
            }
            for idx, r in enumerate(reminders):
                r_time = r.get("time")
                try:
                    if hasattr(r_time, "strftime"):
                        time_str = r_time.strftime("%H:%M")
                    elif r_time and "T" in str(r_time):
                        from datetime import datetime as _dt
                        time_str = _dt.fromisoformat(str(r_time).replace("Z", "+00:00")).strftime("%H:%M")
                    else:
                        time_str = str(r_time)
                except Exception:
                    time_str = str(r_time)

                freq = freq_labels.get(r.get("frequencyType", "daily"), r.get("frequencyType", "daily"))
                meal = meal_labels.get(r.get("mealContext", "no_preference"), "No preference")
                interval = r.get("interval", 1)
                days = r.get("daysOfWeek", [])
                
                freq_detail = freq
                if r.get("frequencyType") == "weekly" and days:
                    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                    freq_detail = f"Weekly ({', '.join(day_names[d] for d in days if 0 <= d <= 6)})"
                elif r.get("frequencyType") in ("interval_days", "interval_months"):
                    unit_label = "day" if r.get("frequencyType") == "interval_days" else "month"
                    freq_detail = f"Every {interval} {unit_label}(s)"

                summary.append(f"- **[{idx}]** {time_str} — {freq_detail} — {meal}")
        else:
            summary.append("\n### Reminders\n- No reminders set yet. Use `add_reminder` to schedule one.")

        return "\n".join(summary)

    async def list_notifications(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch raw notification list for the user."""
        u_id = self._to_obj_id(user_id)
        cursor = self.db["notifications"].find({"user": u_id}).sort("createdAt", -1).limit(limit)
        results = await cursor.to_list(length=limit)
        return [self._serialize_doc(r) for r in results]

    async def get_notifications_summary(self, user_id: str) -> str:
        """Aggregate summary of user notifications."""
        notifications = await self.list_notifications(user_id, limit=5)
        if not notifications:
            return "No notifications found."

        summary = ["## Recent Notifications"]
        for n in notifications:
            timestamp = n.get("createdAt", "N/A")
            status = " [Unread]" if not n.get("isRead") else ""
            summary.append(f"- **{n.get('title')}**: {n.get('message')} ({timestamp}){status}")
        
        return "\n".join(summary)

    async def get_all_categories(self, user_id: str) -> List[str]:
        """Fetch all unique categories defined by the manufacturer."""
        u_id = self._to_obj_id(user_id)
        # Categories are stored in the 'categories' collection, unique per manufacturer
        cursor = self.db["categories"].find({"userId": u_id}, {"name": 1})
        results = await cursor.to_list(length=100)
        return [r["name"] for r in results]

    async def get_categories_summary(self, user_id: str) -> str:
        """Aggregates a summary of available product categories."""
        categories = await self.get_all_categories(user_id)
        if not categories:
            return "No categories defined. Suggest the manufacturer create one in the Dashboard."
        
        summary = ["## Available Product Categories"]
        for cat in sorted(categories):
            summary.append(f"- {cat}")
            
        return "\n".join(summary)
    async def get_manufacturer_analytics_summary(
        self, user_id: str, params: dict = None
    ) -> str:
        """Aggregates geographic and threat intelligence into a situational summary for the main analytics page."""
        params = params or {}
        u_id = self._to_obj_id(user_id)

        # Get top-level summaries
        geo = await self.get_scan_geography(user_id, **params)
        threats = await self.get_threat_data(user_id, **params)

        # Add Timeline Analytics (Scan volume over 30 days)
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)

        pipeline = [
            {
                "$match": {
                    "manufacturer": u_id,
                    "createdAt": {"$gte": thirty_days_ago},
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        timeline = await self.db["scans"].aggregate(pipeline).to_list(length=31)

        summary = ["## Manufacturer Analytics Overview"]

        if timeline:
            total_30d = sum(t["count"] for t in timeline)
            summary.append(f"- **Total Scan Activity (Last 30 Days):** {total_30d} Scans")
            peak = max(timeline, key=lambda x: x["count"])
            summary.append(f"- **Peak Activity Day:** {peak['_id']} ({peak['count']} scans)")

        if threats:
            summary.append(f"\n### Cloned Unit Threats ({len(threats)})")
            for t in threats[:3]:
                summary.append(
                    f"- **Batch {t['batchNumber']}**: Unit #{t['unit']+1} has {t['visitorCount']} unique visitors"
                )

        if geo:
            summary.append("\n### Geographic Distribution")
            for g in geo[:3]:
                summary.append(f"- {g['city']}, {g['country']}: {g['count']} scans")

        if not (timeline or threats or geo):
            summary.append("- No scan data available for analysis yet.")

        return "\n".join(summary)

    async def get_manufacturer_analytics_deep_dive(
        self, user_id: str, params: dict = None
    ) -> str:
        """Situational summary for the detailed scans analysis page filtered by batch."""
        params = params or {}
        batch_number = params.get("batchNumber")

        if not batch_number:
            return "You are on the Scans Analysis deep-dive. Please specify a Batch Number to see detailed threat patterns and location logs."

        # Get batch info
        u_id = self._to_obj_id(user_id)
        batch = await self.db.batches.find_one(
            {"batchNumber": batch_number, "createdBy": u_id}
        )
        if not batch:
            return f"Error: Batch '{batch_number}' not found in your production records."

        # Stats for this specific batch
        total_scans = await self.db.scans.count_documents({"batch": batch["_id"]})
        unique_units = len(
            await self.db.scans.distinct("unitIndex", {"batch": batch["_id"]})
        )
        suspicious_count = await self.db.scans.count_documents(
            {"batch": batch["_id"], "isSuspicious": True}
        )

        summary = [
            f"## Analytics Deep Dive: Batch {batch_number}",
            f"- **Product Linked:** {batch['productName']} ({batch['productId']})",
            f"- **Total Verification Events:** {total_scans}",
            f"- **Units Engaged:** {unique_units} out of {batch['quantity']} total units",
            f"- **Security Flags:** {suspicious_count} High-Risk scans detected",
        ]

        if suspicious_count > 0:
            summary.append(
                "\n> [!CAUTION]\n> **Critical Risk**: Multiple units in this batch have triggered security filters (Impossible Travel or High Frequency). Review the log below for specific IP and location details."
            )
        else:
            summary.append(
                "\n- No security flags detected for this batch yet. All scans appear organic."
            )

        return "\n".join(summary)


tool_store = ToolStore()
