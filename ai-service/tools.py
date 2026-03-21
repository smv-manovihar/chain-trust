import os
import re
from typing import List
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings
from models import PyObjectId

settings = get_settings()


def get_db():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    return client["ChainTrust"]


# --- Argument Schemas ---


class GetProductInfoArgs(BaseModel):
    product_id: str = Field(
        description="The unique identifier or barcode content of the product."
    )


class SearchMedicalKnowledgeArgs(BaseModel):
    query: str = Field(
        description="The medical term, drug name, or health concern to search for."
    )


class GetUserMedicinesArgs(BaseModel):
    skip: int = Field(default=0, description="Number of items to skip for pagination.")
    limit: int = Field(default=10, description="Maximum number of items to return.")
    sort_by: str = Field(
        default="updatedAt",
        description="Field to sort by (e.g., 'name', 'brand', 'updatedAt').",
    )
    order: str = Field(default="desc", description="Sort order: 'asc' or 'desc'.")


class SearchUserMedicinesArgs(BaseModel):
    query: str = Field(
        description="Regex pattern to match against medicine name or brand."
    )


class GetUserDetailsArgs(BaseModel):
    """No arguments required."""

    pass


class GetPageDetailsArgs(BaseModel):
    """No arguments required; uses implicit current route."""

    pass


class GetManufacturerBatchesArgs(BaseModel):
    skip: int = Field(default=0, description="Number of items to skip.")
    limit: int = Field(default=10, description="Maximum items to return.")
    sort_by: str = Field(default="createdAt", description="Sort field.")
    order: str = Field(default="desc", description="Sort order (asc/desc).")


class SearchManufacturerBatchesArgs(BaseModel):
    query: str = Field(description="Regex search for batch number or product name.")


class GetManufacturerProductsArgs(BaseModel):
    skip: int = Field(default=0, description="Number of items to skip.")
    limit: int = Field(default=10, description="Maximum items to return.")
    sort_by: str = Field(default="name", description="Sort field.")
    order: str = Field(default="asc", description="Sort order (asc/desc).")


class SearchManufacturerProductsArgs(BaseModel):
    query: str = Field(description="Regex search for product name or ID.")


class GetBatchDetailsArgs(BaseModel):
    batch_number: str = Field(description="The unique batch number to inspect.")


class GetCurrentViewDataArgs(BaseModel):
    """No arguments required; automatically mirrors the user's current view."""

    pass


# --- Tools Class ---


class Tools:
    def __init__(
        self,
        user_id: str,
        role: str = "customer",
        current_route: str = "/",
        query_params: dict = None,
    ):
        self.user_id = user_id
        self.role = role.lower()
        self.current_route = current_route
        self.query_params = query_params or {}
        self.db = get_db()
    
    @staticmethod
    def get_tool_message(name: str, args: dict, tense: str = "present") -> str:
        """Map tool names to human-readable messages in present or past tense."""
        templates = {
            "get_user_medicines": {
                "present": "Fetching your medicines",
                "past": "Fetched your medicines"
            },
            "search_user_medicines": {
                "present": "Searching for '{query}' in your medicines",
                "past": "Searched for '{query}' in your medicines"
            },
            "get_manufacturer_batches": {
                "present": "Loading production batches",
                "past": "Loaded production batches"
            },
            "search_manufacturer_batches": {
                "present": "Searching for batches matching '{query}'",
                "past": "Searched for batches matching '{query}'"
            },
            "get_manufacturer_products": {
                "present": "Retrieving product catalog",
                "past": "Retrieved product catalog"
            },
            "search_manufacturer_products": {
                "present": "Searching products matching '{query}'",
                "past": "Searched products matching '{query}'"
            },
            "get_product_info": {
                "present": "Getting details for product {product_id}",
                "past": "Got details for product {product_id}"
            },
            "get_user_details": {
                "present": "Fetching your profile",
                "past": "Fetched your profile"
            },
            "get_page_details": {
                "present": "Loading UI specifications",
                "past": "Loaded UI specifications"
            },
            "get_batch_details": {
                "present": "Inspecting batch {batch_number}",
                "past": "Inspected batch {batch_number}"
            },
            "get_current_view_data": {
                "present": "Syncing with your current view",
                "past": "Synced with your current view"
            }
        }

        template_group = templates.get(name)
        if not template_group:
            return f"{'Executing' if tense == 'present' else 'Executed'} {name}"
        
        template = template_group.get(tense, template_group["present"])
        try:
            return template.format(**args)
        except (KeyError, ValueError):
            return template  # Fallback to template if formatting fails

    # --- Customer Tools ---

    async def get_user_medicines(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "updatedAt",
        order: str = "desc",
    ) -> str:
        """Fetch a list of the user's saved medications from their 'My Medicines' cabinet."""
        sort_order = -1 if order == "desc" else 1
        cursor = (
            self.db["cabinet-items"]
            .find({"userId": PyObjectId(self.user_id)}, {"_id": 0})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        medicines = await cursor.to_list(length=limit)

        if not medicines:
            return "No medications found in your cabinet."

        # Relational check: Get recall status for these batches
        batch_numbers = [med["batchNumber"] for med in medicines]
        batches_cursor = self.db["batches"].find(
            {"batchNumber": {"$in": batch_numbers}},
            {"batchNumber": 1, "isRecalled": 1, "isOnBlockchain": 1},
        )
        batches_info = {b["batchNumber"]: b for b in await batches_cursor.to_list(length=len(batch_numbers))}

        table_header = "| Medicine Name | Brand | Batch Number | SKU | Expiry Date | Status | Blockchain |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = []
        for med in medicines:
            b_info = batches_info.get(med["batchNumber"], {})
            status = "RECALLED" if b_info.get("isRecalled") else "Active"
            blockchain = "Yes" if b_info.get("isOnBlockchain") else "No"
            rows.append(
                f"| {med['name']} | {med['brand']} | {med['batchNumber']} | {med['productId']} | {med.get('expiryDate', 'N/A')} | {status} | {blockchain} |"
            )
        return "### User's Medicines (with Real-time Status) ###\n" + table_header + "\n" + "\n".join(rows)

    async def search_user_medicines(self, query: str) -> str:
        """Search for specific medications in the user's cabinet using a regex query."""
        try:
            regex = re.compile(query, re.IGNORECASE)
        except re.error:
            return f"Invalid regex pattern: {query}"

        cursor = self.db["cabinet-items"].find(
            {
                "userId": PyObjectId(self.user_id),
                "$or": [{"name": {"$regex": regex}}, {"brand": {"$regex": regex}}],
            },
            {"_id": 0},
        )
        medicines = await cursor.to_list(length=20)

        if not medicines:
            return f"No medications matching '{query}' found."

        # Relational check: Get recall status for these batches
        batch_numbers = [med["batchNumber"] for med in medicines]
        batches_cursor = self.db["batches"].find(
            {"batchNumber": {"$in": batch_numbers}},
            {"batchNumber": 1, "isRecalled": 1, "isOnBlockchain": 1},
        )
        batches_info = {b["batchNumber"]: b for b in await batches_cursor.to_list(length=len(batch_numbers))}

        table_header = "| Medicine Name | Brand | Batch Number | Product ID | Expiry Date | Status | Blockchain |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = []
        for med in medicines:
            b_info = batches_info.get(med["batchNumber"], {})
            status = "RECALLED" if b_info.get("isRecalled") else "Active"
            blockchain = "Yes" if b_info.get("isOnBlockchain") else "No"
            rows.append(
                f"| {med['name']} | {med['brand']} | {med['batchNumber']} | {med['productId']} | {med.get('expiryDate', 'N/A')} | {status} | {blockchain} |"
            )
        return f"### Search Results for '{query}' (with Real-time Status) ###\n" + table_header + "\n" + "\n".join(rows)

    # --- Manufacturer Tools ---

    async def get_manufacturer_batches(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "createdAt",
        order: str = "desc",
    ) -> str:
        """List production batches created by the manufacturer."""
        sort_order = -1 if order == "desc" else 1
        cursor = (
            self.db["batches"]
            .find({"createdBy": PyObjectId(self.user_id)}, {"_id": 0})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        batches = await cursor.to_list(length=limit)

        if not batches:
            return "You haven't created any batches yet."

        table_header = "| Batch # | Product Name | Brand | Qty | Created | Blockchain | Recalled |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {b['batchNumber']} | {b['productName']} | {b['brand']} | {b['quantity']} | {b['createdAt'].strftime('%Y-%m-%d')} | {'Yes' if b.get('isOnBlockchain') else 'No'} | {'RECALLED' if b.get('isRecalled') else 'No'} |"
            for b in batches
        ]
        return "### Your Production Batches ###\n" + table_header + "\n" + "\n".join(rows)

    async def search_manufacturer_batches(self, query: str) -> str:
        """Search for specific batches using a regex query on batchNumber or productName."""
        try:
            regex = re.compile(query, re.IGNORECASE)
        except re.error:
            return f"Invalid regex pattern: {query}"

        cursor = self.db["batches"].find(
            {
                "createdBy": PyObjectId(self.user_id),
                "$or": [
                    {"batchNumber": {"$regex": regex}},
                    {"productName": {"$regex": regex}},
                ],
            },
            {"_id": 0},
        )
        batches = await cursor.to_list(length=20)

        if not batches:
            return f"No batches matching '{query}' found."

        table_header = "| Batch # | Product Name | Brand | Created | Blockchain | Recalled |\n| :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {b['batchNumber']} | {b['productName']} | {b['brand']} | {b['createdAt'].strftime('%Y-%m-%d')} | {'Yes' if b.get('isOnBlockchain') else 'No'} | {'RECALLED' if b.get('isRecalled') else 'No'} |"
            for b in batches
        ]
        return f"### Search Results for '{query}' ###\n" + table_header + "\n" + "\n".join(rows)

    async def get_manufacturer_products(
        self, skip: int = 0, limit: int = 10, sort_by: str = "name", order: str = "asc"
    ) -> str:
        """List registered SKU/Product catalog entries for the manufacturer."""
        sort_order = 1 if order == "asc" else -1
        cursor = (
            self.db["products"]
            .find({"createdBy": PyObjectId(self.user_id)}, {"_id": 0})
            .sort(sort_by, sort_order)
            .skip(skip)
            .limit(limit)
        )
        products = await cursor.to_list(length=limit)

        if not products:
            return "No products registered in your catalog."

        # Relational check: Get batch counts for these products
        product_ids = [p["_id"] for p in products]
        batch_counts = await self.db["batches"].aggregate([
            {"$match": {"product": {"$in": product_ids}}},
            {"$group": {"_id": "$product", "count": {"$sum": 1}}}
        ]).to_list(length=len(product_ids))
        counts_map = {item["_id"]: item["count"] for item in batch_counts}

        table_header = "| Product Name | Product ID | Brand | Price | Batches | Categories |\n| :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {p['name']} | {p['productId']} | {p['brand']} | ${p.get('price', 0)} | {counts_map.get(p['_id'], 0)} | {', '.join(p.get('categories', []))} |"
            for p in products
        ]
        return "### Product Catalog (with Production Stats) ###\n" + table_header + "\n" + "\n".join(rows)

    async def search_manufacturer_products(self, query: str) -> str:
        """Search registered products using regex on name or productId."""
        try:
            regex = re.compile(query, re.IGNORECASE)
        except re.error:
            return f"Invalid regex pattern: {query}"

        cursor = self.db["products"].find(
            {
                "createdBy": PyObjectId(self.user_id),
                "$or": [{"name": {"$regex": regex}}, {"productId": {"$regex": regex}}],
            },
            {"_id": 0},
        )
        products = await cursor.to_list(length=20)

        if not products:
            return f"No products matching '{query}' found."

        # Relational check: Get batch counts for these products
        product_ids = [p["_id"] for p in products]
        batch_counts = await self.db["batches"].aggregate([
            {"$match": {"product": {"$in": product_ids}}},
            {"$group": {"_id": "$product", "count": {"$sum": 1}}}
        ]).to_list(length=len(product_ids))
        counts_map = {item["_id"]: item["count"] for item in batch_counts}

        table_header = "| Product Name | Product ID | Brand | Batches |\n| :--- | :--- | :--- | :--- |"
        rows = [
            f"| {p['name']} | {p['productId']} | {p['brand']} | {counts_map.get(p['_id'], 0)} |"
            for p in products
        ]
        return f"### Search Results for '{query}' (with Production Stats) ###\n" + table_header + "\n" + "\n".join(rows)

    # --- Shared Tools ---

    async def get_product_info(self, product_id: str) -> str:
        """Get comprehensive details about a verified pharmaceutical product by its ID or barcode."""
        product = await self.db["products"].find_one(
            {"productId": product_id}, {"_id": 0}
        )
        if not product:
            return f"Product with ID/Barcode '{product_id}' not found in the verified registry."

        details = [
            f"**Name:** {product['name']}",
            f"**Brand:** {product['brand']}",
            f"**Product ID:** {product['productId']}",
            f"**Categories:** {', '.join(product.get('categories', []))}",
            f"**Description:** {product.get('description', 'N/A')}",
        ]
        return "### Verified Product Information ###\n" + "\n".join(details)

    async def get_user_details(self) -> str:
        """Fetch the profile details of the current user."""
        user = await self.db["users"].find_one(
            {"_id": PyObjectId(self.user_id)}, {"password": 0, "_id": 0}
        )
        if not user:
            return "User profile not found."

        details = [
            f"**Name:** {user.get('name')}",
            f"**Email:** {user.get('email')}",
            f"**Role:** {user.get('role').capitalize()}",
        ]
        return "### User Profile Details ###\n" + "\n".join(details)

    async def get_page_details(self) -> str:
        """Fetch the detailed UI specification for a specific frontend page."""
        route = "/" + self.current_route.strip("/")
        route_map = {
            "/customer/cabinet": "customer-cabinet.md",
            "/manufacturer/batches": "manufacturer-batches.md",
            "/manufacturer/products": "manufacturer-products.md",
            "/verify": "verify.md",
        }
        filename = route_map.get(route)

        if not filename:
            if route.startswith("/manufacturer/batches/"):
                filename = "manufacturer-batches.md"
            elif route.startswith("/manufacturer/products/"):
                filename = "manufacturer-products.md"

        if not filename:
            return f"No UI specification found for '{route}'."

        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(base_dir, "tutorials", filename)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                return f"### UI Specification for {route} ###\n\n{content}"
        except Exception as e:
            return f"Failed to retrieve page details: {str(e)}"

    async def get_batch_details(self, batch_number: str) -> str:
        """Get detailed stats, blockchain hash, and scan counts for a specific batch number."""
        batch = await self.db["batches"].find_one(
            {"batchNumber": batch_number}, {"_id": 0}
        )
        if not batch:
            return f"Batch '{batch_number}' not found."

        scan_counts = batch.get("scanCounts", {})
        total_scans = sum(scan_counts.values()) if isinstance(scan_counts, dict) else 0

        # Fetch full product details for description and price if needed
        product_info = {}
        if "product" in batch:
            product_info = await self.db["products"].find_one(
                {"_id": batch["product"]}, {"description": 1, "price": 1, "_id": 0}
            ) or {}

        # Relational check: Get latest 3 alerts for this batch
        alerts_cursor = self.db["alerts"].find(
            {"metadata.batchId": batch.get("_id")},
            {"type": 1, "message": 1, "createdAt": 1, "_id": 0}
        ).sort("createdAt", -1).limit(3)
        recent_alerts = await alerts_cursor.to_list(length=3)

        details = [
            f"**Batch Number:** {batch['batchNumber']}",
            f"**Product:** {batch['productName']} ({batch['productId']})",
            f"**Brand:** {batch['brand']}",
            f"**Quantity:** {batch['quantity']}",
            f"**Price:** ${product_info.get('price', 'N/A')}",
            f"**Status:** {'RECALLED' if batch.get('isRecalled') else 'Active'}",
            f"**Blockchain Protection:** {'Enabled' if batch.get('isOnBlockchain') else 'Disabled'}",
            f"**Blockchain Hash:** `{batch.get('blockchainHash', 'N/A')}`",
            f"**Total Scans:** {total_scans}",
            f"**Manufactured Date:** {batch['manufactureDate'].strftime('%Y-%m-%d') if 'manufactureDate' in batch else 'N/A'}",
            f"**Expiry Date:** {batch['expiryDate'].strftime('%Y-%m-%d') if batch.get('expiryDate') else 'N/A'}",
            f"**Full Description:** {product_info.get('description', batch.get('description', 'No description available'))}",
        ]

        output = f"### Detail for Batch {batch_number} ###\n" + "\n".join(details)
        if recent_alerts:
            output += "\n\n**Recent Alerts:**\n" + "\n".join([f"- [{a['type'].replace('_', ' ').capitalize()}] {a['message']} ({a['createdAt'].strftime('%Y-%m-%d')})" for a in recent_alerts])
        return output

    async def get_current_view_data(self) -> str:
        """Mirrors the user's current view by fetching the relevant dynamic data using route and query params."""
        route = self.current_route or "/"
        params = self.query_params or {}

        if route == "/customer/cabinet":
            if params.get("search"):
                return await self.search_user_medicines(query=params["search"])
            return await self.get_user_medicines(
                skip=int(params.get("skip", 0)),
                limit=int(params.get("limit", 10)),
                sort_by=params.get("sortBy", "updatedAt"),
                order=params.get("order", "desc"),
            )

        if route == "/manufacturer/batches":
            if params.get("search"):
                return await self.search_manufacturer_batches(query=params["search"])
            return await self.get_manufacturer_batches(
                skip=int(params.get("skip", 0)),
                limit=int(params.get("limit", 10)),
                sort_by=params.get("sortBy", "createdAt"),
                order=params.get("order", "desc"),
            )

        if route == "/manufacturer/products":
            if params.get("search"):
                return await self.search_manufacturer_products(query=params["search"])
            return await self.get_manufacturer_products(
                skip=int(params.get("skip", 0)),
                limit=int(params.get("limit", 10)),
                sort_by=params.get("sortBy", "name"),
                order=params.get("order", "asc"),
            )

        if route.startswith("/manufacturer/batches/"):
            b_num = route.split("/")[-1]
            if b_num and b_num != "batches":
                return await self.get_batch_details(batch_number=b_num)

        if route == "/verify":
            b_num = params.get("batch")
            if b_num:
                return await self.get_batch_details(batch_number=b_num)
            return "Awaiting product verification input (scan/lookup)."

        return f"No dynamic content mapping for route: {route}"

    # --- Tool Registration Router ---

    def get_tools(self) -> List[StructuredTool]:
        """Returns the list of tools permitted for the instantiated user's role."""

        # Common tools available to all authenticated roles
        tools_list = [
            StructuredTool.from_function(
                coroutine=self.get_user_details,
                name="get_user_details",
                description=self.get_user_details.__doc__,
                args_schema=GetUserDetailsArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_page_details,
                name="get_page_details",
                description=self.get_page_details.__doc__,
                args_schema=GetPageDetailsArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_current_view_data,
                name="get_current_view_data",
                description=self.get_current_view_data.__doc__,
                args_schema=GetCurrentViewDataArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_product_info,
                name="get_product_info",
                description=self.get_product_info.__doc__,
                args_schema=GetProductInfoArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_batch_details,
                name="get_batch_details",
                description=self.get_batch_details.__doc__,
                args_schema=GetBatchDetailsArgs,
            ),
        ]

        # Role-specific tools
        if self.role == "manufacturer":
            tools_list.extend(
                [
                    StructuredTool.from_function(
                        coroutine=self.get_manufacturer_batches,
                        name="get_manufacturer_batches",
                        description=self.get_manufacturer_batches.__doc__,
                        args_schema=GetManufacturerBatchesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_manufacturer_batches,
                        name="search_manufacturer_batches",
                        description=self.search_manufacturer_batches.__doc__,
                        args_schema=SearchManufacturerBatchesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.get_manufacturer_products,
                        name="get_manufacturer_products",
                        description=self.get_manufacturer_products.__doc__,
                        args_schema=GetManufacturerProductsArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_manufacturer_products,
                        name="search_manufacturer_products",
                        description=self.search_manufacturer_products.__doc__,
                        args_schema=SearchManufacturerProductsArgs,
                    ),
                ]
            )

        elif self.role == "customer":
            tools_list.extend(
                [
                    StructuredTool.from_function(
                        coroutine=self.get_user_medicines,
                        name="get_user_medicines",
                        description=self.get_user_medicines.__doc__,
                        args_schema=GetUserMedicinesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_user_medicines,
                        name="search_user_medicines",
                        description=self.search_user_medicines.__doc__,
                        args_schema=SearchUserMedicinesArgs,
                    ),
                ]
            )

        return tools_list
