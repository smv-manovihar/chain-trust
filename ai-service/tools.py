import os
import json
from loguru import logger
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from tool_store import tool_store
from store import chat_store


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
    categories: Optional[List[str]] = Field(
        default=None, description="List of categories to filter by."
    )


class AddToCabinetArgs(BaseModel):
    name: str = Field(description="The name of the medicine.")
    brand: str = Field(description="The brand or manufacturer name.")
    batch_number: Optional[str] = Field(
        default=None, description="Optional batch number for manual tracking."
    )
    expiry_date: Optional[str] = Field(
        default=None, description="Optional expiry date in YYYY-MM-DD format."
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


class GetViewDataArgs(BaseModel):
    route: Optional[str] = Field(
        default=None,
        description="Optional route to fetch data for (overrides current page context).",
    )
    params: Optional[dict] = Field(
        default=None,
        description="JSON parameters for the API call (e.g., query, page, limit).",
    )


class GetGeographicScanDistributionArgs(BaseModel):
    """No arguments required."""

    pass


class GetThreatIntelligenceArgs(BaseModel):
    """No arguments required."""

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

    def _normalize_route(self, route: str) -> str:
        """Standardizes a route string (leading slash, no trailing slash)."""
        if not route:
            return "/"
        clean = "/" + route.strip("/")
        return clean

    @staticmethod
    def get_tool_message(
        name: str, args: dict, tense: str = "present", context: dict = None
    ) -> str:
        """Map tool names to human-readable messages in present or past tense."""
        templates = {
            "get_user_medicines": {
                "present": "Reviewing your medication list",
                "past": "Reviewed your medication list",
            },
            "search_user_medicines": {
                "present": "Searching for '{query}' in your medicines",
                "past": "Searched for '{query}' in your medicines",
            },
            "get_manufacturer_batches": {
                "present": "Retrieving production batch records",
                "past": "Retrieved production batch records",
            },
            "search_manufacturer_batches": {
                "present": "Searching for batches matching '{query}'",
                "past": "Searched for batches matching '{query}'",
            },
            "get_manufacturer_products": {
                "present": "Accessing product catalog",
                "past": "Accessed product catalog",
            },
            "search_manufacturer_products": {
                "present": "Searching catalog for '{query}'",
                "past": "Searched catalog for '{query}'",
            },
            "get_product_info": {
                "present": "Verifying product {product_id}",
                "past": "Verified product {product_id}",
            },
            "get_user_details": {
                "present": "Retrieving your account profile",
                "past": "Retrieved your account profile",
            },
            "get_page_details": {
                "present": "Analyzing interface specifications",
                "past": "Analyzed interface specifications",
            },
            "get_batch_details": {
                "present": "Inspecting batch {batch_number}",
                "past": "Inspected batch {batch_number}",
            },
            "get_view_data": {
                "present": "Synchronizing with {route_infix}{params_infix}",
                "past": "Synchronized with {route_infix}{params_infix}",
            },
            "add_to_cabinet": {
                "present": "Registering {name} to My Medicines",
                "past": "Registered {name} to My Medicines",
            },
        }

        template_group = templates.get(name)
        if not template_group:
            return f"Executing {name}..."

        template = template_group.get(tense, template_group["present"])

        # Prepare dynamic infixes
        category_infix = ""
        categories = args.get("categories")
        if categories:
            category_infix = f"in {categories}"

        # Prepare route infix for view data
        route_infix = "your current view"
        params_infix = ""

        if name == "get_view_data":
            requested_route = args.get("route")
            requested_params = args.get("params")

            # Context-extracted values
            ctx_route = context.get("route") if context else "/"
            ctx_params = context.get("params") if context else {}

            # Normalize routes for comparison
            def norm(r):
                return "/" + r.strip("/") if r else "/"

            is_same_route = not requested_route or (
                norm(requested_route) == norm(ctx_route)
            )
            # Compare parameters robustly
            is_same_params = requested_params is None or (
                requested_params == ctx_params
            )

            if not (is_same_route and is_same_params):
                route_infix = norm(requested_route or ctx_route)
                target_params = (
                    requested_params if requested_params is not None else ctx_params
                )
                if target_params:
                    params_infix = f" (filters: {json.dumps(target_params)})"

        # Merge args with common defaults for safe formatting
        display_args = {
            "query": args.get("query", ""),
            "product_id": args.get("product_id", "N/A"),
            "batch_number": args.get("batch_number", "N/A"),
            "name": args.get("name", "item"),
            "category_infix": category_infix,
            "route_infix": route_infix,
            "params_infix": params_infix,
            **args,
        }

        try:
            return template.format(**display_args)
        except Exception:
            return template  # Fallback to template if formatting fails

    # --- Customer Tools ---

    async def get_user_medicines(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "updatedAt",
        order: str = "desc",
    ) -> str:
        """Fetch a list of the user's saved medications from their 'My Medicines' list."""
        medicines = await tool_store.list_cabinet_items(
            user_id=self.user_id, skip=skip, limit=limit, sort_by=sort_by, order=order
        )

        if not medicines:
            return "No medications found in your My Medicines list."

        table_header = "| Medicine Name | Brand | Batch Number | SKU | Expiry Date | Status | Blockchain |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = []
        for med in medicines:
            blockchain = "Yes" if med.get("blockchainVerified") else "No"
            rows.append(
                f"| {med['name']} | {med['brand']} | {med['batchNumber']} | {med.get('productId', 'N/A')} | {med.get('expiryDate', 'N/A')} | {med['status']} | {blockchain} |"
            )
        return (
            "### User's Medicines (with Real-time Status) ###\n"
            + table_header
            + "\n"
            + "\n".join(rows)
        )

    async def search_user_medicines(
        self, query: str = None, categories: List[str] = None
    ) -> str:
        """Search for specific medications in the user's 'My Medicines' list using a query and/or categories."""
        medicines = await tool_store.search_cabinet_items(
            user_id=self.user_id, query=query, categories=categories
        )

        if not medicines:
            filter_desc = query or (", ".join(categories) if categories else "")
            return f"No medications matching '{filter_desc}' found."

        filter_title = query or (", ".join(categories) if categories else "All")

        table_header = "| Medicine Name | Brand | Batch Number | SKU | Expiry Date | Status | Blockchain |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = []
        for med in medicines:
            blockchain = "Yes" if med.get("blockchainVerified") else "No"
            rows.append(
                f"| {med['name']} | {med['brand']} | {med['batchNumber']} | {med.get('productId', 'N/A')} | {med.get('expiryDate', 'N/A')} | {med['status']} | {blockchain} |"
            )
        return (
            f"### Search Results for '{filter_title}' (with Real-time Status) ###\n"
            + table_header
            + "\n"
            + "\n".join(rows)
        )

    async def add_to_cabinet(
        self, name: str, brand: str, batch_number: str = None, expiry_date: str = None
    ) -> str:
        """Adds a medicine manually to the user's cabinet. ALWAYS ask for user confirmation with the details before calling this."""
        success = await tool_store.add_medicine_to_cabinet(
            user_id=self.user_id,
            name=name,
            brand=brand,
            batch_number=batch_number,
            expiry_date=expiry_date,
        )
        if success:
            return f"Successfully added {name} ({brand}) to your My Medicines list."
        return "Failed to add medicine to cabinet."

    # --- Manufacturer Tools ---

    async def get_manufacturer_batches(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "createdAt",
        order: str = "desc",
    ) -> str:
        """List production batches created by the manufacturer."""
        batches = await tool_store.list_batches(
            user_id=self.user_id, skip=skip, limit=limit, sort_by=sort_by, order=order
        )

        if not batches:
            return "You haven't created any batches yet."

        table_header = "| Batch # | Product Name | Brand | Qty | Created | Blockchain | Recalled |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {b['batchNumber']} | {b['productName']} | {b['brand']} | {b['quantity']} | {b['createdAt']} | {'Yes' if b.get('isOnBlockchain') else 'No'} | {'RECALLED' if b.get('isRecalled') else 'No'} |"
            for b in batches
        ]
        return (
            "### Your Production Batches ###\n" + table_header + "\n" + "\n".join(rows)
        )

    async def search_manufacturer_batches(
        self, query: str = None, categories: List[str] = None
    ) -> str:
        """Search for specific production batches using a query and/or categories."""
        batches = await tool_store.search_batches(
            user_id=self.user_id, query=query, categories=categories
        )

        if not batches:
            filter_desc = query or (", ".join(categories) if categories else "")
            return f"No batches matching '{filter_desc}' found."

        filter_title = query or (", ".join(categories) if categories else "All")
        table_header = "| Batch # | Product Name | Brand | Created | Blockchain | Recalled |\n| :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {b['batchNumber']} | {b['productName']} | {b['brand']} | {b['createdAt']} | {'Yes' if b.get('isOnBlockchain') else 'No'} | {'RECALLED' if b.get('isRecalled') else 'No'} |"
            for b in batches
        ]
        return (
            f"### Search Results for '{filter_title}' ###\n"
            + table_header
            + "\n"
            + "\n".join(rows)
        )

    async def get_manufacturer_products(
        self, skip: int = 0, limit: int = 10, sort_by: str = "name", order: str = "asc"
    ) -> str:
        """List registered SKU/Product catalog entries for the manufacturer."""
        products = await tool_store.list_products(
            user_id=self.user_id, skip=skip, limit=limit, sort_by=sort_by, order=order
        )

        if not products:
            return "No products registered in your catalog."

        table_header = "| Product Name | Product ID | Brand | Price | Batches | Categories |\n| :--- | :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {p['name']} | {p['productId']} | {p['brand']} | ${p.get('price', 0)} | {p.get('batchCount', 0)} | {p.get('categories', 'N/A')} |"
            for p in products
        ]
        return (
            "### Product Catalog (with Production Stats) ###\n"
            + table_header
            + "\n"
            + "\n".join(rows)
        )

    async def search_manufacturer_products(
        self, query: str = None, categories: List[str] = None
    ) -> str:
        """Search registered products using a query and/or categories."""
        products = await tool_store.search_products(
            user_id=self.user_id, query=query, categories=categories
        )

        if not products:
            filter_desc = query or (", ".join(categories) if categories else "")
            return f"No products matching '{filter_desc}' found."

        filter_title = query or (", ".join(categories) if categories else "All")
        table_header = "| Product Name | Product ID | Brand | Batches | Categories |\n| :--- | :--- | :--- | :--- | :--- |"
        rows = [
            f"| {p['name']} | {p['productId']} | {p['brand']} | {p.get('batchCount', 0)} | {p.get('categories', 'N/A')} |"
            for p in products
        ]
        return (
            f"### Search Results for '{filter_title}' (with Production Stats) ###\n"
            + table_header
            + "\n"
            + "\n".join(rows)
        )

    # --- Shared Tools ---

    async def get_product_info(self, product_id: str) -> str:
        """Get comprehensive details about a verified pharmaceutical product by its SKU or barcode."""
        product = await tool_store.get_product_by_id(product_id)
        if not product:
            return f"Product with SKU/Barcode '{product_id}' not found in the verified registry."

        details = [
            f"**Name:** {product['name']}",
            f"**Brand:** {product['brand']}",
            f"**Product ID (SKU):** {product['productId']}",
            f"**Categories:** {product.get('categories', 'N/A')}",
            f"**Description:** {product.get('description', 'N/A')}",
            f"**Price:** ${product.get('price', 'N/A')}",
        ]
        return "### Verified Product Information ###\n" + "\n".join(details)

    async def get_user_details(self) -> str:
        """Fetch the profile details of the current user."""
        user = await tool_store.get_user_profile(self.user_id)
        if not user:
            return "User profile not found."

        details = [
            f"**Name:** {user.get('name', 'N/A')}",
            f"**Email:** {user.get('email', 'N/A')} (Verified: {user.get('isEmailVerified', False)})",
            f"**Role:** {user.get('role', 'N/A').capitalize()}",
            f"**Google Connected:** {'Yes' if user.get('isGoogleConnected') else 'No'}",
        ]

        if self.role == "manufacturer":
            details.extend([
                f"**Company Name:** {user.get('companyName', 'N/A')}",
                f"**Business Website:** {user.get('website', 'N/A')}",
                f"**Phone:** {user.get('phoneNumber', 'Not provided')}",
            ])
        else:
            details.extend([
                f"**Phone:** {user.get('phoneNumber', 'Not provided')}",
                f"**Location:** {user.get('city', 'N/A')}, {user.get('country', 'N/A')}",
                f"**Address:** {user.get('address', 'N/A')} ({user.get('postalCode', 'N/A')})",
            ])

        return "### User Profile Details ###\n" + "\n".join(details)

    async def get_page_details(self) -> str:
        """Fetch the detailed UI specification for a specific frontend page."""
        route = "/" + self.current_route.strip("/")
        route_map = {
            "/customer": "customer-dashboard.md",
            "/customer/cabinet": "customer-cabinet.md",
            "/manufacturer": "manufacturer-dashboard.md",
            "/manufacturer/batches": "manufacturer-batches.md",
            "/manufacturer/batches/new": "manufacturer-batches-new.md",
            "/manufacturer/products": "manufacturer-products.md",
            "/manufacturer/products/new": "manufacturer-products-new.md",
            "/customer/settings": "customer-settings.md",
            "/manufacturer/settings": "manufacturer-settings.md",
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
        batch = await tool_store.get_batch_details(batch_number)
        if not batch:
            return f"Batch '{batch_number}' not found."

        scan_counts = batch.get("scanCounts", {})
        total_scans = sum(scan_counts.values()) if isinstance(scan_counts, dict) else 0
        product_info = batch.get("productDetails", {})

        details = [
            f"**Batch Number:** {batch['batchNumber']}",
            f"**Product:** {batch['productName']} ({batch['productId']})",
            f"**Brand:** {batch['brand']}",
            f"**Quantity:** {batch['quantity']}",
            f"**Price:** ${product_info.get('price', 'N/A')}",
            f"**Status:** {batch['status']}",
            f"**Blockchain Protection:** {'Enabled' if batch.get('isOnBlockchain') else 'Disabled'}",
            f"**Blockchain Hash:** `{batch.get('blockchainHash', 'N/A')}`",
            f"**Total Scans:** {total_scans}",
            f"**Manufactured Date:** {batch.get('manufactureDate', 'N/A')}",
            f"**Expiry Date:** {batch.get('expiryDate', 'N/A')}",
            f"**Full Description:** {product_info.get('description', batch.get('description', 'No description available'))}",
        ]

        output = f"### Detail for Batch {batch_number} ###\n" + "\n".join(details)
        if batch.get("recentAlerts"):
            output += "\n\n**Recent Alerts:**\n" + "\n".join(
                [
                    f"- [{a['type']}] {a['message']} ({a['date']})"
                    for a in batch["recentAlerts"]
                ]
            )
        return output


    async def get_view_data(
        self, route: str = None, params: dict = None
    ) -> str:
        """Fetch current or specified route view data, providing a situational snapshot for the agent."""
        target_route = self._normalize_route(route or self.current_route)
        raw_params = params or self.query_params or {}

        try:
            # Delegate to store for centralized view data aggregation
            data = await chat_store.get_view_data(
                route=target_route, user_id=self.user_id, role=self.role, params=raw_params
            )
            logger.info(
                f"[VIEW DATA] Route: {target_route} | Params: {json.dumps(raw_params)} | Output Length: {len(data)}"
            )
            logger.debug(f"[VIEW DATA CONTENT] {data}")
            return data
        except Exception as e:
            return f"Error simulating view data for {target_route}: {str(e)}"

    async def get_geographic_scan_distribution(self, args: GetGeographicScanDistributionArgs) -> dict:
        """
        Fetches the geographic distribution of product scans (top countries and cities).
        Useful for market analysis and identifying high-engagement regions.
        """
        try:
            target_route = "/batches/analytics/geo"
            data = await self._api_get(target_route)
            return data
        except Exception as e:
            return {"error": str(e)}

    async def get_threat_intelligence(self, args: GetThreatIntelligenceArgs) -> dict:
        """
        Fetches threat intelligence data, identifying suspicious scanning patterns 
        (e.g., single units scanned by many unique visitors), which may indicate counterfeiting.
        """
        try:
            target_route = "/batches/analytics/threats"
            data = await self._api_get(target_route)
            return data
        except Exception as e:
            return {"error": str(e)}

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
                coroutine=self.get_view_data,
                name="get_view_data",
                description=self.get_view_data.__doc__,
                args_schema=GetViewDataArgs,
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
                    StructuredTool.from_function(
                        coroutine=self.get_geographic_scan_distribution,
                        name="get_geographic_scan_distribution",
                        description=self.get_geographic_scan_distribution.__doc__,
                        args_schema=GetGeographicScanDistributionArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.get_threat_intelligence,
                        name="get_threat_intelligence",
                        description=self.get_threat_intelligence.__doc__,
                        args_schema=GetThreatIntelligenceArgs,
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
                    StructuredTool.from_function(
                        coroutine=self.add_to_cabinet,
                        name="add_to_cabinet",
                        description=self.add_to_cabinet.__doc__,
                        args_schema=AddToCabinetArgs,
                    ),
                ]
            )

        return tools_list
