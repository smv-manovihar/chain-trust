from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import re
from models import PyObjectId
from database import get_db


class ToolStore:
    def __init__(self):
        self.db = get_db()

    def _serialize_doc(self, doc: dict, keep_id: bool = False) -> dict:
        """Helper to serialize MongoDB documents, joined categories, and handle _id."""
        if not doc:
            return None

        if keep_id:
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

    async def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single product by its productId (SKU/Barcode)."""
        product = await self.db["products"].find_one({"productId": product_id})
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
            .find({"createdBy": PyObjectId(user_id)})
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
        filter_query = {"createdBy": PyObjectId(user_id)}

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
        """List manufacturer production batches."""
        sort_order = -1 if order == "desc" else 1
        cursor = (
            self.db["batches"]
            .find({"createdBy": PyObjectId(user_id)})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        batches = await cursor.to_list(length=limit)
        return [self._serialize_doc(b, keep_id=False) for b in batches]

    async def search_batches(
        self, user_id: str, query: str = None, categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search manufacturer batches."""
        filter_query = {"createdBy": PyObjectId(user_id)}

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

        cursor = self.db["batches"].find(filter_query)
        batches = await cursor.to_list(length=20)
        return [self._serialize_doc(b, keep_id=False) for b in batches]

    async def get_batch_details(self, batch_number: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed batch info and linked product info."""
        batch = await self.db["batches"].find_one({"batchNumber": batch_number})
        if not batch:
            return None

        # Fetch linked product info by productId
        product_info = await self.get_product_by_id(batch["productId"])

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

        serialized_batch = self._serialize_doc(batch, keep_id=False)
        serialized_batch["productDetails"] = product_info
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
        """List user's cabinet items (My Medicines)."""
        sort_order = -1 if order == "desc" else 1
        cursor = (
            self.db["cabinet_items"]
            .find({"userId": PyObjectId(user_id)})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        items = await cursor.to_list(length=limit)

        if not items:
            return []

        # Enrich with batch status
        batch_numbers = [i["batchNumber"] for i in items if "batchNumber" in i]
        batches_cursor = self.db["batches"].find(
            {"batchNumber": {"$in": batch_numbers}},
            {"batchNumber": 1, "isRecalled": 1, "isOnBlockchain": 1},
        )
        batches_info = {
            b["batchNumber"]: b
            for b in await batches_cursor.to_list(length=len(batch_numbers))
        }

        serialized = []
        for i in items:
            i_doc = self._serialize_doc(
                i, keep_id=True
            )  # User requested keeping _id for cabinet items
            b_info = batches_info.get(i.get("batchNumber"), {})
            i_doc["status"] = "RECALLED" if b_info.get("isRecalled") else "Active"
            i_doc["blockchainVerified"] = b_info.get("isOnBlockchain", False)
            serialized.append(i_doc)

        return serialized

    async def search_cabinet_items(
        self, user_id: str, query: str = None, categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search user's cabinet items."""
        filter_query = {"userId": PyObjectId(user_id)}

        if query:
            try:
                regex = re.compile(query, re.IGNORECASE)
                filter_query["$or"] = [
                    {"name": {"$regex": regex}},
                    {"brand": {"$regex": regex}},
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

        cursor = self.db["cabinet_items"].find(filter_query)
        items = await cursor.to_list(length=20)

        if not items:
            return []

        batch_numbers = [i["batchNumber"] for i in items if "batchNumber" in i]
        batches_cursor = self.db["batches"].find(
            {"batchNumber": {"$in": batch_numbers}},
            {"batchNumber": 1, "isRecalled": 1, "isOnBlockchain": 1},
        )
        batches_info = {
            b["batchNumber"]: b
            for b in await batches_cursor.to_list(length=len(batch_numbers))
        }

        serialized = []
        for i in items:
            i_doc = self._serialize_doc(i, keep_id=True)
            b_info = batches_info.get(i.get("batchNumber"), {})
            i_doc["status"] = "RECALLED" if b_info.get("isRecalled") else "Active"
            i_doc["blockchainVerified"] = b_info.get("isOnBlockchain", False)
            serialized.append(i_doc)

        return serialized

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile excluding password."""
        user = await self.db["users"].find_one(
            {"_id": PyObjectId(user_id)}, {"password": 0, "_id": 0}
        )
        return user

    async def add_medicine_to_cabinet(
        self,
        user_id: str,
        name: str,
        brand: str,
        batch_number: str = None,
        expiry_date: str = None,
    ) -> bool:
        """Manually add a medicine to the user's cabinet."""
        item = {
            "userId": PyObjectId(user_id),
            "name": name,
            "brand": brand,
            "batchNumber": batch_number or "N/A",
            "expiryDate": expiry_date,
            "isUserAdded": True,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
        }
        result = await self.db["cabinet_items"].insert_one(item)
        return bool(result.inserted_id)

    # --- View Data & Dashboard Aggregators (Shifted from ChatStore & Enhanced) ---

    async def get_view_data(
        self, route: str, user_id: str, role: str, params: dict = None
    ) -> str:
        """Centralized aggregator for view-specific data digests, mimicking frontend fetching."""
        params = params or {}
        route = "/" + route.strip("/")

        try:
            if route in ["/customer", "/customer/cabinet"]:
                return await self.get_customer_dashboard_data(user_id)

            if route == "/manufacturer":
                return await self.get_manufacturer_dashboard_data(user_id)

            if route == "/manufacturer/batches":
                return await self.get_manufacturer_batches_data(user_id)

            if route == "/manufacturer/products":
                return await self.get_manufacturer_products_data(user_id)

            if route.startswith("/manufacturer/batches/"):
                identifier = route.split("/")[-1]
                if identifier and identifier != "batches":
                    return await self.get_batch_summary_by_id_or_number(identifier)

            if route.startswith("/manufacturer/products/"):
                identifier = route.split("/")[-1]
                if identifier and identifier != "products":
                    return await self.get_product_summary_by_id_or_code(identifier)

            if route == "/verify":
                salt = params.get("salt") or params.get("id")
                if salt:
                    return await self.get_verification_data(salt)
                return "Ready to verify. Please scan a QR code or enter a product salt."

            return f"Synchronized with route: {route}. Situational context is active."
        except Exception as e:
            return f"Error gathering situational view data: {str(e)}"

    async def get_manufacturer_dashboard_data(self, user_id: str) -> str:
        """Aggregates metrics and recent activity for the manufacturer dashboard."""
        u_id = PyObjectId(user_id)
        
        # Core Stats
        product_count = await self.db.products.count_documents({"createdBy": u_id})
        batch_count = await self.db.batches.count_documents({"createdBy": u_id})
        unread_count = await self.db.notifications.count_documents(
            {"user": u_id, "isRead": False}
        )

        # Scans Today Logic
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        batches = await self.db.batches.find({"createdBy": u_id}, {"_id": 1}).to_list(length=None)
        batch_ids = [b["_id"] for b in batches]
        
        scans_today = 0
        if batch_ids:
            scans_today = await self.db.scans.count_documents({
                "batch": {"$in": batch_ids},
                "createdAt": {"$gte": today_start}
            })

        # Recent Notifications
        notifications_cursor = (
            self.db.notifications.find({"user": u_id}).sort("createdAt", -1).limit(5)
        )
        notifications = await notifications_cursor.to_list(length=5)

        summary = [
            "## Manufacturer Dashboard Overview",
            f"- **Total Products in Catalog:** {product_count}",
            f"- **Active Production Batches:** {batch_count}",
            f"- **Scans Recorded Today:** {scans_today}",
            f"- **Unread Security Alerts:** {unread_count}",
            "\n### Recent Activity",
        ]

        if notifications:
            for n in notifications:
                n_type = n.get("type", "alert").replace("_", " ").title()
                timestamp = n.get("createdAt").strftime("%H:%M") if n.get("createdAt") else "N/A"
                summary.append(
                    f"- **[{n_type}]** {n.get('title')}: {n.get('message')} ({timestamp})"
                )
        else:
            summary.append("- No recent activity recorded.")

        return "\n".join(summary)

    async def get_customer_dashboard_data(self, user_id: str) -> str:
        """Aggregates overview data for the customer 'My Medicines' dashboard."""
        u_id = PyObjectId(user_id)
        total_items = await self.db.cabinet_items.count_documents({"userId": u_id})
        verified_items = await self.db.cabinet_items.count_documents(
            {"userId": u_id, "isUserAdded": False}
        )
        manual_items = await self.db.cabinet_items.count_documents(
            {"userId": u_id, "isUserAdded": True}
        )

        recent_cursor = (
            self.db.cabinet_items.find({"userId": u_id}).sort("updatedAt", -1).limit(3)
        )
        recent = await recent_cursor.to_list(length=3)

        summary = [
            "## My Medicines Dashboard Overview",
            f"- **Total Items in Cabinet:** {total_items}",
            f"- **Verified Authentic:** {verified_items}",
            f"- **Manually Added:** {manual_items}",
            "\n### Recently Updated",
        ]

        if recent:
            for r in recent:
                type_label = "Verified" if not r.get("isUserAdded") else "Manual"
                summary.append(f"- **{r['name']}** ({r['brand']}) - {type_label}")
        else:
            summary.append("- Your My Medicines list is currently empty.")

        return "\n".join(summary)

    async def get_manufacturer_batches_data(self, user_id: str) -> str:
        """Returns a digest of production batches with scan volume."""
        batches = await self.list_batches(user_id, limit=20)
        
        summary = ["## Production Batches List"]
        if not batches:
            summary.append("- No batches enrolled yet.")
        else:
            summary.append("| Batch # | Product | Scans | Status |")
            summary.append("| :--- | :--- | :--- | :--- |")
            for b in batches:
                # Sum up scan counts from the scanCounts map
                scan_counts = b.get("scanCounts", {})
                total_scans = sum(scan_counts.values()) if isinstance(scan_counts, dict) else 0
                status = "Recalled" if b.get("isRecalled") else "Active"
                summary.append(f"| {b['batchNumber']} | {b['productName']} | {total_scans} | {status} |")
        
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
                summary.append(f"| {p['name']} | {p['brand']} | {p.get('batchCount', 0)} | {p.get('categories', 'N/A')} |")
        
        return "\n".join(summary)

    async def get_verification_data(self, salt: str) -> str:
        """Fetch and return a digest of verification result for a specific salt."""
        # Handle internal salt (batchSalt:unitIndex)
        batch_salt = salt.split(":")[0] if ":" in salt else salt
        unit_idx = salt.split(":")[1] if ":" in salt else "0"
        
        batch = await self.db.batches.find_one({"batchSalt": batch_salt})
        if not batch:
            return f"Verification Failed: No record found for salt `{salt}` on ChainTrust."

        scan_count = batch.get("scanCounts", {}).get(unit_idx, 0)
        status = "RECALLED" if batch.get("isRecalled") else ("SUSPICIOUS" if scan_count > 5 else "AUTHENTIC")
        
        summary = [
            f"## Verification Result: {status}",
            f"- **Product:** {batch['productName']}",
            f"- **Brand:** {batch['brand']}",
            f"- **Batch Number:** {batch['batchNumber']}",
            f"- **Unit Index:** {unit_idx}",
            f"- **Scan Count for this Unit:** {scan_count}",
            f"- **Blockchain Hash:** `{batch.get('blockchainHash', 'Verified')[:16]}...`",
            "\n**Verdict:** " + ("This product has been flagged due to high scan counts or recall." if scan_count > 5 or batch.get("isRecalled") else "This product matches the secure blockchain record.")
        ]
        
        return "\n".join(summary)

    async def get_batch_summary_by_id_or_number(self, identifier: str) -> str:
        """Fetch and format batch summary for view data using either _id or batchNumber."""
        batch = await self.db.batches.find_one({"batchNumber": identifier})
        if not batch:
            try:
                # Use find_one instead of get_batch_details to avoid double serialization for now
                batch = await self.db.batches.find_one({"_id": PyObjectId(identifier)})
            except Exception:
                pass

        if not batch:
            return f"Synchronized with batch route, but identifier '{identifier}' was not found."

        # Re-use the detailed fetch logic
        details = await self.get_batch_details(batch["batchNumber"])
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

    async def get_product_summary_by_id_or_code(self, identifier: str) -> str:
        """Fetch and format product summary for view data using either _id or productId."""
        product = await self.db.products.find_one({"productId": identifier})
        if not product:
            try:
                product = await self.db.products.find_one({"_id": PyObjectId(identifier)})
            except Exception:
                pass

        if not product:
            return f"Synchronized with product route, but identifier '{identifier}' was not found."

        # Enrich with batch count
        batch_count = await self.db.batches.count_documents({"productId": product["productId"]})
        
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


tool_store = ToolStore()
