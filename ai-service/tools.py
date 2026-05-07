import os
import json
from enum import Enum
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from tool_store import tool_store
from utils.file_reader import fetch_and_parse

# --- Argument Schemas ---


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class MedicationSortBy(str, Enum):
    NAME = "name"
    UPDATED_AT = "updatedAt"
    CREATED_AT = "createdAt"


class BatchSortBy(str, Enum):
    CREATED_AT = "createdAt"
    BATCH_NUMBER = "batchNumber"


class ProductSortBy(str, Enum):
    NAME = "name"
    PRODUCT_ID = "productId"


class GetUserProfileArgs(BaseModel):
    pass


class GetPageGuidesListArgs(BaseModel):
    pass


class GetPageGuideArgs(BaseModel):
    guide_name: Optional[str] = Field(
        default=None,
        description="[Optional] Specific guide filename (e.g., 'customer-cabinet.md'). If omitted, the tool resolves the guide based on the user's current page/route.",
    )


class GetViewDataArgs(BaseModel):
    route: Optional[str] = Field(
        default=None,
        description="[Optional] The route to fetch data for (e.g. /customer/cabinet)",
    )
    params: Optional[dict] = Field(
        default=None, description="[Optional] parameters for the view data request"
    )


class ListMyMedicinesArgs(BaseModel):
    skip: int = Field(
        default=0,
        ge=0,
        description="[Optional] Number of items to skip for pagination (default: 0)",
    )
    limit: int = Field(
        default=10,
        le=50,
        description="[Optional] Max number of items to return (max: 50, default: 10)",
    )
    sort_by: MedicationSortBy = Field(
        default=MedicationSortBy.UPDATED_AT,
        description="[Optional] Field to sort by. Allowed values: name, updatedAt, createdAt",
    )
    order: SortOrder = Field(
        default=SortOrder.DESC,
        description="[Optional] Sort direction. Allowed values: asc, desc",
    )


class SearchMyMedicinesArgs(BaseModel):
    query: str = Field(
        description="[Required] Regex pattern to search medicine name or brand"
    )
    categories: Optional[List[str]] = Field(
        default=None, description="[Optional] Filter results by categories"
    )


class AddMedicineArgs(BaseModel):
    name: str = Field(description="[Required] Name of the medicine")
    brand: str = Field(description="[Required] Manufacturer or brand name")
    composition: Optional[str] = Field(
        default=None,
        description="[Optional] Molecules and strength, e.g. 'Paracetamol 500mg'",
    )
    medicine_code: Optional[str] = Field(
        default=None, description="[Optional] UPC or Barcode from packaging"
    )
    batch_number: Optional[str] = Field(
        default=None, description="[Optional] Production Lot ID (often found on labels)"
    )
    expiry_date: str = Field(
        description="[Required] Expiry date in YYYY-MM-DD format. Always ask the user for this before adding a medicine."
    )
    prescription_ids: Optional[List[str]] = Field(
        default=None,
        description="[Optional] List of string IDs for attached prescriptions",
    )
    dosage: Optional[float] = Field(
        default=None,
        description="[Optional] Dose amount as a number (e.g. 1, 2.5). Do not include units.",
    )
    unit: Optional[str] = Field(
        default="pills",
        description="[Optional] Dose unit (e.g. 'pills', 'ml', 'tablets', 'drops'). Defaults to 'pills'.",
    )
    frequency: Optional[str] = Field(
        default=None,
        description="[Optional] How often (e.g. 'Twice daily', 'Once a week')",
    )
    quantity: Optional[int] = Field(
        default=None,
        description="[Optional] Initial inventory quantity (number of units/pills)",
    )
    doctor_name: Optional[str] = Field(
        default=None, description="[Optional] Name of the prescribing doctor"
    )
    notes: Optional[str] = Field(
        default=None,
        description="[Optional] Personal notes or instructions about this medicine",
    )


class UpdateMedicineArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine entry"
    )
    composition: Optional[str] = Field(
        default=None, description="[Optional] Updated composition/strength"
    )
    medicine_code: Optional[str] = Field(
        default=None, description="[Optional] Updated barcode/UPC"
    )
    batch_number: Optional[str] = Field(
        default=None, description="[Optional] Updated production lot ID"
    )
    expiry_date: Optional[str] = Field(
        default=None, description="[Optional] Updated expiry date (YYYY-MM-DD)"
    )
    dosage: Optional[float] = Field(
        default=None,
        description="[Optional] Updated dose amount as a number (e.g. 1, 2.5). Do not include units.",
    )
    unit: Optional[str] = Field(
        default=None,
        description="[Optional] Updated dose unit (e.g. 'pills', 'ml', 'tablets')",
    )
    frequency: Optional[str] = Field(
        default=None,
        description="[Optional] Updated frequency (e.g. 'Once daily', 'Twice weekly')",
    )
    quantity: Optional[int] = Field(
        default=None,
        description="[Optional] Updated inventory count (number of units/pills)",
    )
    doctor_name: Optional[str] = Field(
        default=None, description="[Optional] Updated prescribing doctor name"
    )
    notes: Optional[str] = Field(
        default=None, description="[Optional] Updated personal notes or reminders"
    )


class RemoveMedicineArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine to permanently remove"
    )


class MarkDoseTakenArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine to decrement quantity for"
    )


class UndoDoseArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine whose last recorded dose should be reverted"
    )


class MealContext(str, Enum):
    BEFORE_MEAL = "before_meal"
    AFTER_MEAL = "after_meal"
    WITH_MEAL = "with_meal"
    NO_PREFERENCE = "no_preference"


class FrequencyType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    INTERVAL_DAYS = "interval_days"
    INTERVAL_MONTHS = "interval_months"


class DayOfWeek(int, Enum):
    SUNDAY = 0
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6


class AddReminderArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine to add a reminder for"
    )
    time: str = Field(
        description="[Required] Time for the reminder in HH:MM format (24-hour), e.g. '08:00', '13:30', '21:00'"
    )
    meal_context: MealContext = Field(
        default=MealContext.NO_PREFERENCE,
        description="[Optional] Meal relationship: 'before_meal', 'after_meal', 'with_meal', or 'no_preference'",
    )
    frequency_type: FrequencyType = Field(
        default=FrequencyType.DAILY,
        description="[Optional] Recurrence pattern: 'daily' (every day), 'weekly' (specific days of week), 'interval_days' (every N days), 'interval_months' (every N months)",
    )
    days_of_week: Optional[List[int]] = Field(
        default=None,
        description="[Optional] Required if frequency_type is 'weekly'. List of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)",
    )
    interval: Optional[int] = Field(
        default=1,
        ge=1,
        description="[Optional] Required if frequency_type is 'interval_days' or 'interval_months'. The N in 'every N days/months'. Default: 1.",
    )


class RemoveReminderArgs(BaseModel):
    medicine_id: str = Field(
        description="[Required] The unique string ID of the medicine to remove a reminder from"
    )
    reminder_index: int = Field(
        ge=0,
        description="[Required] The 0-based index of the reminder to remove (0 = first reminder, 1 = second, etc.). Use get_view_data first to see the current list of reminders.",
    )


class ListPrescriptionsArgs(BaseModel):
    skip: int = Field(
        default=0, ge=0, description="[Optional] Number of items to skip (default: 0)"
    )
    limit: int = Field(
        default=10,
        le=50,
        description="[Optional] Max items to return (max: 50, default: 10)",
    )


class ReadPrescriptionArgs(BaseModel):
    doc_id: int = Field(
        description="[Required] The integer index [1], [2]... from list_prescriptions output"
    )
    start_line: int = Field(
        default=1,
        ge=1,
        description="[Optional] Starting line number to read (1-indexed)",
    )
    end_line: int = Field(
        default=100, ge=1, description="[Optional] Ending line number to read"
    )


class SearchPrescriptionsArgs(BaseModel):
    query: str = Field(
        description="[Required] Regex pattern to search across digitized content of all user prescriptions"
    )


class GetProductInfoArgs(BaseModel):
    product_id: str = Field(
        description="[Required] The unique SKU or Product ID string from catalog"
    )


class GetBatchDetailsArgs(BaseModel):
    batch_number: str = Field(
        description="[Required] The unique production run batch number string"
    )


class ListBatchesArgs(BaseModel):
    skip: int = Field(default=0, ge=0, description="[Optional] Pagination skip")
    limit: int = Field(
        default=10, le=50, description="[Optional] Pagination limit (max: 50)"
    )
    sort_by: BatchSortBy = Field(
        default=BatchSortBy.CREATED_AT,
        description="[Optional] Field to sort by. Allowed values: createdAt, batchNumber",
    )
    order: SortOrder = Field(
        default=SortOrder.DESC,
        description="[Optional] Sort direction. Allowed values: asc, desc",
    )


class SearchBatchesArgs(BaseModel):
    query: str = Field(
        description="[Required] Regex pattern for searching batch number or product name"
    )


class ListProductsArgs(BaseModel):
    skip: int = Field(default=0, ge=0, description="[Optional] Pagination skip")
    limit: int = Field(
        default=10, le=50, description="[Optional] Pagination limit (max: 50)"
    )
    sort_by: ProductSortBy = Field(
        default=ProductSortBy.NAME,
        description="[Optional] Field to sort by. Allowed values: name, productId",
    )
    order: SortOrder = Field(
        default=SortOrder.ASC,
        description="[Optional] Sort direction. Allowed values: asc, desc",
    )


class SearchProductsArgs(BaseModel):
    query: str = Field(
        description="[Required] Regex pattern to find product by name or ID"
    )


class GetScanGeographyArgs(BaseModel):
    from_date: Optional[str] = Field(
        default=None,
        description="[Optional] Start date filter (ISO format, e.g., 2026-03-01)",
    )
    to_date: Optional[str] = Field(
        default=None,
        description="[Optional] End date filter (ISO format, e.g., 2026-03-31)",
    )
    product_id: Optional[str] = Field(
        default=None,
        description="[Optional] Filter geography for a specific product SKU",
    )
    batch_number: Optional[str] = Field(
        default=None,
        description="[Optional] Filter geography for a specific production batch",
    )


class GetThreatIntelligenceArgs(BaseModel):
    from_date: Optional[str] = Field(
        default=None, description="[Optional] Analysis start date (ISO format)"
    )
    to_date: Optional[str] = Field(
        default=None, description="[Optional] Analysis end date (ISO format)"
    )
    product_id: Optional[str] = Field(
        default=None,
        description="[Optional] Analyze threats for a specific product SKU",
    )
    batch_number: Optional[str] = Field(
        default=None,
        description="[Optional] Analyze threats for a specific production batch",
    )


class ListNotificationsArgs(BaseModel):
    limit: int = Field(
        default=20,
        le=50,
        description="[Optional] Max number of notifications to return (max: 50, default: 20)",
    )


class ListUpcomingDosesArgs(BaseModel):
    pass


class ListCategoriesArgs(BaseModel):
    pass


# --- Prescription Registry ---


class PrescriptionRegistry:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.registry: Dict[int, Dict[str, Any]] = {}
        self._is_built = False
        self._total_count = 0

    async def build(self, skip: int = 0, limit: int = 50):
        """Builds a registry of prescriptions with proxy IDs. Optimized for pagination."""
        # Note: We build incremently if skip > 0, or rebuild if skip=0
        if skip == 0:
            self.registry = {}

        prescriptions = await tool_store.list_prescriptions(
            self.user_id, skip=skip, limit=limit
        )

        # Start indexing from where we left off or from 1
        current_max = max(self.registry.keys()) if self.registry else 0

        for p in prescriptions:
            current_max += 1
            self.registry[current_max] = {
                "index": current_max,
                "real_id": str(p["id"]),
                "label": p.get("label", "Untitled"),
                "doctorName": p.get("doctorName", "Unknown"),
                "issuedDate": p.get("issuedDate", "Unknown"),
                "url": p.get("url", ""),
                "content": None,
            }
        self._is_built = True

    def get_by_id(self, doc_id: int) -> Optional[Dict[str, Any]]:
        return self.registry.get(doc_id)


# --- Tools Class ---


class Tools:
    def __init__(
        self,
        user_id: str,
        role: str = "customer",
        current_route: str = "/",
        query_params: dict = None,
        user_timezone: str = "UTC",
    ):
        self.user_id = user_id
        self.role = role.lower()
        self.current_route = current_route
        self.query_params = query_params or {}
        self.user_timezone = user_timezone
        self.prescription_registry = PrescriptionRegistry(user_id)

    async def _resolve_medicine_name(self, medicine_id: str) -> str:
        """Helper to get a human-readable name for a medicine ID. FIX-009 logic."""
        try:
            item = await tool_store.db["cabinet_items"].find_one(
                {"_id": tool_store._to_obj_id(medicine_id), "userId": tool_store._to_obj_id(self.user_id)},
                {"name": 1}
            )
            return item.get("name") if item else f"Medication {medicine_id}"
        except Exception:
            return f"Medication {medicine_id}"

    def _normalize_route(self, route: str) -> str:
        if not route:
            return "/"
        return "/" + route.strip("/")

    def _format_output(
        self,
        status: Literal["SUCCESS", "ERROR", "WARNING"],
        message: str,
        data: str = "",
    ) -> str:
        """Strict Markdown Return Template for Master Agentic Tool Architecture."""
        return f"STATUS: {status}\nMESSAGE: {message}\n\nDATA:\n{data if data else ''}"

    async def get_tool_message(
        self,
        name: str,
        args: dict,
        tense: str = "present",
        context: dict = None,
        **kwargs,
    ) -> str:
        templates = {
            "get_user_profile": {
                "present": "Retrieving your profile...",
                "past": "Retrieved your profile.",
            },
            "list_page_guides": {
                "present": "Listing available page guides...",
                "past": "Listed available page guides.",
            },
            "get_page_guide": {
                "present": "Checking the page guide...",
                "past": "Checked the page guide.",
            },
            "get_view_data": {
                "present": "Synchronizing view data...",
                "past": "Synchronized view data.",
            },
            "list_my_medicines": {
                "present": "Listing your medications...",
                "past": "Listed your medications.",
            },
            "search_my_medicines": {
                "present": "Searching for '{query}'...",
                "past": "Found results for '{query}'.",
            },
            "add_medicine": {
                "present": "Adding {name}...",
                "past": "Added {name} to My Medicines.",
            },
            "update_medicine": {
                "present": "Updating medication records...",
                "past": "Updated medication records.",
            },
            "remove_medicine": {
                "present": "Removing medication...",
                "past": "Removed medication.",
            },
            "mark_dose_taken": {
                "present": "Recording dose for {name}...",
                "past": "Recorded dose for {name}.",
            },
            "undo_dose": {
                "present": "Reverting last dose for {name}...",
                "past": "Reverted last dose for {name}.",
            },
            "add_reminder": {
                "present": "Setting reminder for {name}...",
                "past": "Reminder added for {name}.",
            },
            "remove_reminder": {
                "present": "Removing reminder [{reminder_index}] from {name}...",
                "past": "Reminder [{reminder_index}] removed from {name}.",
            },
            "list_prescriptions": {
                "present": "Accessing prescriptions...",
                "past": "Accessed prescriptions.",
            },
            "read_prescription": {
                "present": "Reading {doc_name}...",
                "past": "Read {doc_name}.",
            },
            "search_prescriptions": {
                "present": "Searching prescriptions for '{query}'...",
                "past": "Searched prescriptions for '{query}'.",
            },
            "get_product_info": {
                "present": "Fetching info for product {product_id}...",
                "past": "Fetched product info for {product_id}.",
            },
            "get_batch_details": {
                "present": "Inspecting batch {batch_number}...",
                "past": "Inspected batch {batch_number}.",
            },
            "list_batches": {
                "present": "Listing production batches...",
                "past": "Listed production batches.",
            },
            "search_batches": {
                "present": "Searching batches for '{query}'...",
                "past": "Searched batches for '{query}'.",
            },
            "list_products": {
                "present": "Listing catalog products...",
                "past": "Listed catalog products.",
            },
            "search_products": {
                "present": "Searching catalog for '{query}'...",
                "past": "Searched catalog for '{query}'.",
            },
            "get_scan_geography": {
                "present": "Analyzing geography...",
                "past": "Analyzed geography data.",
            },
            "get_threat_intelligence": {
                "present": "Checking security threats...",
                "past": "Checked security threats.",
            },
            "list_notifications": {
                "present": "Fetching your notifications...",
                "past": "Retrieved latest notifications.",
            },
            "list_upcoming_doses": {
                "present": "Checking upcoming medication doses...",
                "past": "Retrieved upcoming doses.",
            },
            "list_categories": {
                "present": "Fetching product categories...",
                "past": "Retrieved available categories.",
            },
        }

        # Enrich args with resolved names where possible
        enriched_args = dict(args)
        if name == "read_prescription":
            doc_id = args.get("doc_id")
            doc_label = None

            # 1. Try registry
            doc = self.prescription_registry.get_by_id(doc_id) if doc_id else None
            if doc:
                doc_label = doc["label"]

            # 2. Try context fallback (if registry is not yet populated)
            if not doc_label and context:
                active_data = context.get("active_data")
                if isinstance(active_data, dict):
                    # Logic to find label by index in common summary patterns
                    prescriptions = active_data.get("recentPrescriptions", [])
                    if isinstance(prescriptions, list) and 0 <= (doc_id - 1) < len(
                        prescriptions
                    ):
                        doc_label = prescriptions[doc_id - 1].get("label")

            enriched_args["doc_name"] = doc_label or f"Document [{doc_id}]"

        if name in ("add_reminder", "remove_reminder", "mark_dose_taken", "undo_dose", "update_medicine", "remove_medicine"):
            medicine_id = args.get("medicine_id")
            resolved_name = medicine_id  # default fallback
            if medicine_id:
                try:
                    item = await tool_store.db["cabinet_items"].find_one(
                        {"_id": tool_store._to_obj_id(medicine_id)},
                        {"name": 1},
                    )
                    if item and item.get("name"):
                        resolved_name = item["name"]
                except Exception:
                    pass
            enriched_args["name"] = resolved_name or "medication"

        group = templates.get(
            name, {"present": f"Executing {name}...", "past": f"Executed {name}."}
        )
        template = group.get(tense, group["present"])
        try:
            return template.format(**enriched_args)
        except Exception:
            return template

    # --- Common Tools ---

    async def get_user_profile(self) -> str:
        """Retrieves user role and company details. **Use** to identify persona. **Do NOT use** for route data."""
        user = await tool_store.get_user_profile(self.user_id)
        if not user:
            return self._format_output(
                "ERROR", "User profile not found. Verify your session and try again."
            )

        # Build address string
        addr_parts = [
            user.get("address"),
            user.get("city"),
            user.get("postalCode"),
            user.get("country"),
        ]
        address = ", ".join([p for p in addr_parts if p]) or "N/A"

        # Safe extraction of labels
        is_google = user.get("isGoogleConnected")
        provider_name = user.get("provider", "local")
        auth_label = "Google" if is_google else f"Email/Password ({provider_name})"
        account_status = (
            "Verified" if user.get("isEmailVerified") else "Pending Verification"
        )

        details = [
            f"- **Name:** {user.get('name', 'N/A')}",
            f"- **Role:** {user.get('role', 'N/A').title()}",
            f"- **Email:** {user.get('email', 'N/A')}",
            f"- **Phone:** {user.get('phoneNumber', 'N/A')}",
            f"- **Location:** {address}",
            f"- **Auth Provider:** {auth_label}",
            f"- **Account Status:** {account_status}",
            f"- **Member Since:** {user.get('createdAt', 'N/A')}",
        ]

        if self.role == "manufacturer":
            details.append(f"- **Company:** {user.get('companyName', 'N/A')}")
            details.append(f"- **Company Domain:** {user.get('companyDomain', 'N/A')}")
            approval = "Yes" if user.get("isApprovedByAdmin") else "Pending"
            details.append(f"- **Admin Approval:** {approval}")

        return self._format_output("SUCCESS", "Profile retrieved.", "\n".join(details))

    async def list_page_guides(self) -> str:
        """Returns a list of all available UI tutorials/manuals. **Use** to discover what pages can be explained."""
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            tutorials_dir = os.path.join(base_dir, "tutorials")
            if not os.path.exists(tutorials_dir):
                return self._format_output("ERROR", "Tutorials directory not found.")

            files = [f for f in os.listdir(tutorials_dir) if f.endswith(".md")]
            if not files:
                return self._format_output("SUCCESS", "No page guides available.")

            data = "\n".join([f"- {f}" for f in sorted(files)])
            return self._format_output(
                "SUCCESS", f"Found {len(files)} available guides.", data
            )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list guides: {e}")

    async def get_page_guide(self, guide_name: str = None) -> str:
        """Retrieves the visual context and behavioral reference for a page. **Use** as your own guide on how to behave on the page. **CRITICAL**: Do not leak internal tool integration details to the user."""
        filename = guide_name
        route = self._normalize_route(self.current_route)

        if not filename:
            # Static route mapping
            route_map = {
                "/customer": "customer-dashboard.md",
                "/customer/cabinet": "customer-cabinet.md",
                "/customer/agent": "customer-agent.md",
                "/customer/notifications": "customer-notifications.md",
                "/customer/prescriptions": "customer-prescriptions.md",
                "/customer/settings": "customer-settings.md",
                "/manufacturer": "manufacturer-dashboard.md",
                "/manufacturer/batches": "manufacturer-batches.md",
                "/manufacturer/batches/new": "manufacturer-batches-new.md",
                "/manufacturer/products": "manufacturer-products.md",
                "/manufacturer/products/new": "manufacturer-products-new.md",
                "/manufacturer/agent": "manufacturer-agent.md",
                "/manufacturer/notifications": "manufacturer-notifications.md",
                "/manufacturer/analytics": "manufacturer-analytics.md",
                "/manufacturer/analytics/scans": "manufacturer-analytics-scans.md",
                "/manufacturer/settings": "manufacturer-settings.md",
                "/verify": "verify.md",
            }
            filename = route_map.get(route)

            # Dynamic route matching (Fallthrough)
            if not filename:
                # Handle /manufacturer/batches/[batchNumber] or [id]
                if (
                    route.startswith("/manufacturer/batches/")
                    and route != "/manufacturer/batches/new"
                ):
                    filename = "manufacturer-batches-id.md"

        if not filename:
            return self._format_output(
                "ERROR",
                f"No guide automatically mapped for route '{route}'. FALLBACK: Use `list_page_guides` to see all available manuals and explicitly specify one via the 'guide_name' parameter.",
            )

        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            path = os.path.join(base_dir, "tutorials", filename)
            if not os.path.exists(path):
                return self._format_output(
                    "ERROR",
                    f"Guide file '{filename}' not found. Verify the name using list_page_guides.",
                )

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                params_info = (
                    f" [Active URL Filters: {self.query_params}]"
                    if self.query_params
                    else ""
                )
                return self._format_output(
                    "SUCCESS", f"Manual for {filename} loaded.{params_info}", content
                )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to read guide: {e}")

    async def get_view_data(self, route: str = None, params: dict = None) -> str:
        """Fetches route-specific data snapshot. **Use** for situational awareness. **Do NOT use** for global search."""
        target_route = self._normalize_route(route or self.current_route)
        raw_params = params or self.query_params or {}
        try:
            data = await tool_store.get_view_data(
                target_route, self.user_id, self.role, raw_params
            )
            return self._format_output(
                "SUCCESS", 
                f"View data for {target_route} synchronized. NEXT STEP: If you need to understand the visual layout or user actions for this data, run `get_page_guide` for this route.", 
                data
            )
        except Exception as e:
            return self._format_output(
                "ERROR", 
                f"View data synchronization failed for {target_route}: {e}. FALLBACK: The route might be unsupported or invalid. Try running `list_page_guides` to find the correct page manual, or manually fetch data using specific tools like `list_batches` or `list_my_medicines`."
            )

    async def list_notifications(self, limit: int = 20) -> str:
        """Retrieves a list of personal notifications (alerts, recalls, stock warnings). **Use** to see recent system events."""
        try:
            data = await tool_store.get_notifications_summary(self.user_id)
            return self._format_output("SUCCESS", "Notifications retrieved.", data)
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list notifications: {e}")

    async def list_upcoming_doses(self) -> str:
        """[Customer Only] Retrieves upcoming medication doses/events for the next 24 hours. **Use** to see the user's schedule."""
        try:
            data = await tool_store.get_upcoming_doses_summary(self.user_id)
            return self._format_output("SUCCESS", "Upcoming doses retrieved.", data)
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list upcoming doses: {e}")

    # --- Customer Tools ---

    async def list_my_medicines(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: MedicationSortBy = MedicationSortBy.UPDATED_AT,
        order: SortOrder = SortOrder.DESC,
    ) -> str:
        """Retrieves paginated medicine list. **Use** for overview. **Do NOT use** for specific lookup."""
        try:
            items = await tool_store.list_cabinet_items(
                self.user_id, skip, limit, sort_by.value, order.value
            )
            if not items:
                return self._format_output(
                    "SUCCESS", "No medications found in My Medicines."
                )

            rows = [
                "| ID | Medicine | Brand | Status | Scans | Streak | Done Today | Blockchain |",
                "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
            ]
            for i in items:
                v_label = "Yes" if i["blockchainVerified"] else "No"
                done_label = "Yes" if i.get("isDoseDoneToday") else "-"
                rows.append(
                    f"| {i['id']} | {i['name']} | {i['brand']} | {i['status']} | {i['liveScanCount']} | {i.get('currentStreak', 0)}d | {done_label} | {v_label} |"
                )
            return self._format_output(
                "SUCCESS",
                f"Retrieved {len(items)} items. [Use skip={skip + limit} to see more]",
                "\n".join(rows),
            )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list medicines: {str(e)}")

    async def search_my_medicines(
        self, query: str, categories: List[str] = None
    ) -> str:
        """Regex-based name search. **Use** for finding specific meds. **Do NOT use** for listing."""
        items = await tool_store.search_cabinet_items(self.user_id, query, categories)
        if not items:
            return self._format_output(
                "SUCCESS", f"No matches found for pattern '{query}'."
            )

        rows = ["| ID | Medicine | Brand | Status |", "| :--- | :--- | :--- | :--- |"]

        # Anti-Data Dump Safeguard
        max_matches = 20
        total_items = len(items)
        display_items = items[:max_matches]

        for i in display_items:
            rows.append(f"| {i['id']} | {i['name']} | {i['brand']} | {i['status']} |")

        if total_items > max_matches:
            rows.append(
                f"| ... | *Truncated* | *({total_items - max_matches} more)* | ... |"
            )
            return self._format_output(
                "SUCCESS",
                f"Found {total_items} matches. Showing first {max_matches}. [NOTE: Please refine your query to see specific results.]",
                "\n".join(rows),
            )

        return self._format_output(
            "SUCCESS", f"Found {total_items} matches.", "\n".join(rows)
        )

    async def add_medicine(self, **kwargs) -> str:
        """Adds new med to cabinet. **IMPORTANT:** Confirm final details with the user before calling this. **Use** for creation. **Do NOT use** for updates."""
        try:
            # Resolve prescription proxy IDs ([1], [2]...) to real MongoDB ObjectId strings.
            # The agent always receives proxy integer IDs from list_prescriptions.
            raw_ids = kwargs.get("prescription_ids")
            if raw_ids:
                await self.prescription_registry.build()
                resolved_ids = []
                unresolved = []
                for pid in raw_ids:
                    # Proxy IDs are integers; real IDs are hex strings (len 24)
                    try:
                        proxy_int = int(pid)
                        doc = self.prescription_registry.get_by_id(proxy_int)
                        if doc:
                            resolved_ids.append(doc["real_id"])
                        else:
                            unresolved.append(pid)
                    except (ValueError, TypeError):
                        # Already a real ID string — pass through
                        resolved_ids.append(str(pid))
                if unresolved:
                    return self._format_output(
                        "ERROR",
                        f"Prescription ID(s) {unresolved} not found. FALLBACK: Run `list_prescriptions` to see valid IDs.",
                    )
                kwargs["prescription_ids"] = resolved_ids

            success = await tool_store.add_medicine_to_cabinet(self.user_id, **kwargs)
            if success:
                return self._format_output(
                    "SUCCESS", f"Added '{kwargs.get('name')}' to My Medicines."
                )
            return self._format_output(
                "ERROR",
                "Failed to add medication. Ensure 'name' and 'brand' are provided. FALLBACK: If it already exists, use `update_medicine` instead.",
            )
        except Exception as e:
            return self._format_output(
                "ERROR",
                f"Operation failed: {e}. Ask the user for any missing details if necessary.",
            )

    async def update_medicine(self, medicine_id: str, **kwargs) -> str:
        """Modifies existing med record. **IMPORTANT:** Confirm final details with the user before calling this. **Use** for dosage/unit/notes/doctor updates. **Do NOT use** for removal."""
        try:
            updates = {k: v for k, v in kwargs.items() if v is not None}
            if not updates:
                return self._format_output(
                    "ERROR",
                    "No update fields provided. Specify fields to modify (e.g. dosage, unit, notes, doctor_name).",
                )

            # Remap snake_case arg names to camelCase MongoDB field names
            field_remap = {
                "medicine_code": "medicineCode",
                "batch_number": "batchNumber",
                "expiry_date": "expiryDate",
                "prescription_ids": "prescriptionIds",
                "doctor_name": "doctorName",
            }
            remapped = {field_remap.get(k, k): v for k, v in updates.items()}

            # Remap quantity to currentQuantity
            if "quantity" in remapped:
                q = remapped.pop("quantity")
                remapped["currentQuantity"] = q

            success = await tool_store.update_cabinet_item(
                medicine_id, self.user_id, remapped
            )
            if success:
                return self._format_output(
                    "SUCCESS", f"Medication {medicine_id} updated."
                )
            return self._format_output(
                "ERROR",
                f"Medication '{medicine_id}' not found or update failed. FALLBACK: Verify the medication ID (e.g. using `list_my_medicines`) and ensure you are only updating editable fields.",
            )
        except Exception as e:
            return self._format_output(
                "ERROR",
                f"Update failed: {e}. If the ID format was wrong, verify it first.",
            )

    async def remove_medicine(self, medicine_id: str) -> str:
        """Deletes med from cabinet. **IMPORTANT:** Confirm final details with the user before calling this. **Use** for permanent removal. **Do NOT use** to hide items."""
        try:
            success = await tool_store.remove_cabinet_item(medicine_id, self.user_id)
            if success:
                return self._format_output(
                    "SUCCESS", f"Medication {medicine_id} permanently removed."
                )
            return self._format_output(
                "ERROR", f"Medication '{medicine_id}' not found. FALLBACK: Verify the ID with `list_my_medicines`."
            )
        except Exception as e:
            return self._format_output("ERROR", f"Removal failed: {e}.")

    async def mark_dose_taken(self, medicine_id: str) -> str:
        """Decrements med quantity and logs a dose event. **IMPORTANT:** Confirm with the user before calling this. **Use** on dose confirmation. **Do NOT use** for inventory audits."""
        try:
            result = await tool_store.mark_dose_taken(medicine_id, self.user_id, self.user_timezone)
            if result.get("success"):
                streak = result.get("currentStreak", 0)
                qty = result.get("currentQuantity", "?")
                done = result.get("isDoseDoneToday", False)
                completion_note = " All scheduled doses for today are now complete." if done else ""
                return self._format_output(
                    "SUCCESS",
                    f"Dose recorded. Stock remaining: {qty}.{completion_note} Streak: {streak} day(s).",
                )
            reason = result.get("reason", "unknown")
            if reason == "no_stock":
                return self._format_output(
                    "ERROR",
                    "Could not mark dose: medication is out of stock (currentQuantity = 0). FALLBACK: Use `update_medicine` to refill quantity first.",
                )
            return self._format_output(
                "ERROR",
                "Could not mark dose. FALLBACK: Verify the medication ID is correct and there is enough stock. If out of stock, use `update_medicine` to refill quantity.",
            )
        except Exception as e:
            return self._format_output("ERROR", f"Action failed: {e}.")

    async def undo_dose(self, medicine_id: str) -> str:
        """Reverts the last recorded dose for a medication. **IMPORTANT:** Confirm with the user before calling this. **Use** only when user explicitly asks to undo a recent dose log."""
        try:
            success = await tool_store.undo_dose(medicine_id, self.user_id, self.user_timezone)
            if success:
                return self._format_output(
                    "SUCCESS", "Last dose reverted. Inventory quantity restored."
                )
            return self._format_output(
                "ERROR",
                "Could not undo dose. FALLBACK: No recent dose log found or the medication ID is incorrect. Check ID with `list_my_medicines`.",
            )
        except Exception as e:
            return self._format_output("ERROR", f"Undo action failed: {e}.")

    async def add_reminder(
        self,
        medicine_id: str,
        time: str,
        meal_context: str = "no_preference",
        frequency_type: str = "daily",
        days_of_week: List[int] = None,
        interval: int = 1,
    ) -> str:
        """Adds a dose reminder schedule to a medication. **IMPORTANT:** Confirm time and frequency with user before calling. **Use** when user asks to set a reminder, alarm, or schedule. **Do NOT use** for inventory or dose logging."""
        try:
            success = await tool_store.add_reminder_to_cabinet_item(
                medicine_id,
                self.user_id,
                time=time,
                meal_context=meal_context,
                frequency_type=frequency_type,
                days_of_week=days_of_week or [],
                interval=interval,
            )
            if success:
                freq_label = {
                    "daily": "Daily",
                    "weekly": f"Weekly (days: {days_of_week})",
                    "interval_days": f"Every {interval} day(s)",
                    "interval_months": f"Every {interval} month(s)",
                }.get(frequency_type, frequency_type)
                return self._format_output(
                    "SUCCESS",
                    f"Reminder set for {time} ({freq_label}, {meal_context.replace('_', ' ')}).",
                )
            return self._format_output(
                "ERROR",
                f"Could not add reminder to medication '{medicine_id}'. Verify the medication ID is correct.",
            )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to add reminder: {e}.")

    async def remove_reminder(self, medicine_id: str, reminder_index: int) -> str:
        """Removes a specific reminder from a medication by its position index. **IMPORTANT:** Confirm which reminder to remove with user first. Use get_view_data to see the reminder list with indices. **Do NOT use** without user confirmation."""
        try:
            success = await tool_store.remove_reminder_from_cabinet_item(
                medicine_id, self.user_id, reminder_index
            )
            if success:
                return self._format_output(
                    "SUCCESS",
                    f"Reminder at position {reminder_index} removed successfully.",
                )
            return self._format_output(
                "ERROR",
                f"Could not remove reminder at index {reminder_index}. FALLBACK: Verify the index is correct (use `get_view_data` to see current reminders for the item).",
            )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to remove reminder: {e}.")

    async def list_prescriptions(self, skip: int = 0, limit: int = 10) -> str:
        """Lists docs with Proxy IDs. **Use** for file discovery. **Do NOT use** to read content."""
        try:
            await self.prescription_registry.build(skip=skip, limit=limit)
            records = list(self.prescription_registry.registry.values())

            # Since build appends to registry, we need to filter only the current range
            display_records = (
                records[skip : skip + limit] if skip < len(records) else []
            )

            if not display_records:
                return self._format_output(
                    "SUCCESS", "No prescription documents found in this range."
                )

            rows = [
                "| Document ID | Label | Doctor | Issued Date |",
                "| :--- | :--- | :--- | :--- |",
            ]
            for r in display_records:
                rows.append(
                    f"| [{r['index']}] | {r['label']} | {r['doctorName']} | {r['issuedDate']} |"
                )

            return self._format_output(
                "SUCCESS",
                f"Found {len(display_records)} documents. [Action: Use read_prescription [ID] to view content. Use skip={skip + limit} to see more.]",
                "\n".join(rows),
            )
        except Exception as e:
            return self._format_output(
                "ERROR", f"Failed to list prescriptions: {str(e)}"
            )

    async def read_prescription(
        self, doc_id: int, start_line: int = 1, end_line: int = 100
    ) -> str:
        """Digitize document by Document ID with line-level access. **Use** to read details. **Do NOT use** without Document ID."""
        await self.prescription_registry.build()
        doc = self.prescription_registry.get_by_id(doc_id)
        if not doc:
            return self._format_output(
                "ERROR",
                f"Document ID [{doc_id}] is invalid. FALLBACK: Run `list_prescriptions` first to see valid document index numbers.",
            )

        # Priority: On-demand fetch (since list_prescriptions excludes content)
        content = doc.get("content")
        if not content:
            # We fetch the full doc now using get_prescription for rich content
            full_doc = await tool_store.get_prescription(doc["real_id"], self.user_id)
            content = full_doc.get("content") if full_doc else None

        # Fallback: On-the-fly parsing from URL
        if not content:
            content = await fetch_and_parse(doc["url"], doc["label"])

        # Split by lines for line-level access
        lines = content.splitlines()
        total_lines = len(lines)

        # Safe slicing (1-based index to 0-based index)
        start_idx = max(0, start_line - 1)
        end_idx = min(total_lines, end_line)
        selected_lines = lines[start_idx:end_idx]

        formatted_content = "\n".join(
            f"{i + 1}: {line}" for i, line in enumerate(selected_lines, start=start_idx)
        )

        if total_lines > end_idx or start_idx > 0:
            formatted_content += f"\n\n[NOTE: Showing lines {start_idx + 1} to {end_idx} of {total_lines}. Use start_line and end_line parameters to paginate through the rest of the document.]"

        return self._format_output(
            "SUCCESS",
            f"Read content for Document [{doc_id}] ({doc['label']})",
            formatted_content,
        )

    async def search_prescriptions(
        self, query: str, include_content: bool = False
    ) -> str:
        """Global digitized content search. **Use** to find terms across files. Set include_content=True to see matching text. **Do NOT use** for summaries."""
        # Reliability Fix: Offload search to MongoDB rather than looping S3 in Python
        matches_data = await tool_store.search_prescriptions_content(
            self.user_id, query
        )

        if not matches_data:
            return self._format_output(
                "SUCCESS", f"No prescriptions contain the term '{query}'."
            )

        total_matches = len(matches_data)
        is_truncated = total_matches > 30

        matches = []
        for p in matches_data[:30]:
            db_id = str(p.get("id", p.get("_id")))
            proxy_id = None

            # Map DB ID to the existing proxy registry or create dynamically
            # to guarantee continuous alignment between DB search and read_prescription
            for pid, data in self.prescription_registry.registry.items():
                if data.get("real_id") == db_id:
                    proxy_id = pid
                    break

            if proxy_id is None:
                proxy_id = (
                    (max(self.prescription_registry.registry.keys()) + 1)
                    if self.prescription_registry.registry
                    else 1
                )
                self.prescription_registry.registry[proxy_id] = {
                    "index": proxy_id,
                    "real_id": db_id,
                    "label": p.get("label", "Untitled"),
                    "doctorName": p.get("doctorName", "Unknown"),
                    "issuedDate": p.get("issuedDate", "Unknown"),
                    "url": p.get("url", ""),
                    "content": p.get("content", None),
                }

            label = p.get("label", "Untitled")

            if include_content and p.get("content"):
                lines = p["content"].split("\n")
                query_lower = query.lower()
                chunk_found = False
                for i, line in enumerate(lines):
                    if query_lower in line.lower():
                        start_idx = max(0, i - 2)
                        end_idx = min(len(lines), i + 3)
                        context_block = "\n".join(lines[start_idx:end_idx])

                        chunk = (
                            f'<prescription id=[{proxy_id}] name="{label}">\n'
                            f"{context_block}\n"
                            f"</prescription>"
                        )
                        matches.append(chunk)
                        chunk_found = True
                        break  # Only show the first matching block per doc for conciseness

                if not chunk_found:
                    matches.append(f"- **{label}** (ID: [{proxy_id}])")
            else:
                matches.append(
                    f"- **{label}:** Found matches for '{query}' (ID: [{proxy_id}])"
                )

        footer = (
            "\n\n[NOTE: Use read_prescription with the listed IDs to view full text.]"
        )
        if is_truncated:
            footer += "\n[INSTRUCTION: More than 30 matches found. Showing only the first 30. Please formulate a more precise search query if you did not find what you were looking for.]"
        else:
            footer += "\n[INSTRUCTION: These are all the matches found for your query. No more matches exist.]"

        if include_content:
            msg = f"Content search matches for '{query}'"
            if is_truncated:
                msg += " (Showing first 30 max):"
            else:
                msg += ":"
            return self._format_output("SUCCESS", msg, "\n\n".join(matches) + footer)

        msg = f"Keyword matches found in {min(total_matches, 30)} document(s)"
        if is_truncated:
            msg += " (over 30 matches exist):"
        else:
            msg += ":"

        return self._format_output("SUCCESS", msg, "\n".join(matches) + footer)

    # --- Manufacturer Tools ---

    async def get_product_info(self, product_id: str) -> str:
        """SKU-level technical metadata. **Use** for specs. **Do NOT use** for scans."""
        product = await tool_store.get_product_by_id(product_id, self.user_id)
        if not product:
            return self._format_output(
                "ERROR", f"Product ID '{product_id}' not found. FALLBACK: Run `list_products` or `search_products` to find correct SKU."
            )
        return self._format_output(
            "SUCCESS", f"Metadata for {product_id}:", json.dumps(product, indent=2)
        )

    async def get_batch_details(self, batch_number: str) -> str:
        """Production run details/stats. **Use** for batch deep dives. **Do NOT use** for catalog edits."""
        batch = await tool_store.get_batch_details(batch_number, self.user_id)
        if not batch:
            return self._format_output(
                "ERROR", f"Batch Number '{batch_number}' not found. FALLBACK: Run `list_batches` or `search_batches` to find valid batch numbers."
            )
        return self._format_output(
            "SUCCESS", f"Summary for Batch {batch_number}:", json.dumps(batch, indent=2)
        )

    async def list_batches(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: BatchSortBy = BatchSortBy.CREATED_AT,
        order: SortOrder = SortOrder.DESC,
    ) -> str:
        """Paginated production history. **Use** for batch discovery. **Do NOT use** for product lists."""
        try:
            batches = await tool_store.list_batches(
                self.user_id, skip, limit, sort_by.value, order.value
            )
            if not batches:
                return self._format_output("SUCCESS", "No production batches enrolled.")

            rows = [
                "| Batch # | Product | Created | Scans | Status |",
                "| :--- | :--- | :--- | :--- | :--- |",
            ]
            for b in batches:
                status = "Recalled" if b.get("isRecalled") else "Active"
                rows.append(
                    f"| {b['batchNumber']} | {b['productName']} | {b['createdAt']} | {b.get('totalScans', 0)} | {status} |"
                )
            return self._format_output(
                "SUCCESS",
                f"Retrieved {len(batches)} batches. [Use skip={skip + limit} for more]",
                "\n".join(rows),
            )
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list batches: {str(e)}")

    async def search_batches(self, query: str) -> str:
        """Regex search across batches. **Use** for specific run lookup. **Do NOT use** for bulk list."""
        batches = await tool_store.search_batches(self.user_id, query)
        if not batches:
            return self._format_output(
                "SUCCESS", f"No batches found matching '{query}'."
            )

        rows = ["| Batch # | Product | Created |", "| :--- | :--- | :--- |"]

        # Anti-Data Dump Safeguard
        max_matches = 20
        total_batches = len(batches)
        display_batches = batches[:max_matches]

        for b in display_batches:
            rows.append(
                f"| {b['batchNumber']} | {b['productName']} | {b['createdAt']} |"
            )

        if total_batches > max_matches:
            rows.append(
                f"| ... | *Truncated* | *({total_batches - max_matches} more)* |"
            )
            return self._format_output(
                "SUCCESS",
                f"Found {total_batches} matches. Showing first {max_matches}. [NOTE: Please refine your query to see specific results.]",
                "\n".join(rows),
            )

        return self._format_output(
            "SUCCESS", f"Found {total_batches} matches.", "\n".join(rows)
        )

    async def list_products(
        self,
        skip: int = 0,
        limit: int = 10,
        sort_by: ProductSortBy = ProductSortBy.NAME,
        order: SortOrder = SortOrder.ASC,
    ) -> str:
        """Paginated SKU catalog list. **Use** for catalog discovery. **Do NOT use** for batch data."""
        products = await tool_store.list_products(
            self.user_id, skip, limit, sort_by.value, order.value
        )
        if not products:
            return self._format_output("SUCCESS", "Product catalog is empty.")

        rows = ["| Product Name | SKU | Batches |", "| :--- | :--- | :--- |"]
        for p in products:
            rows.append(
                f"| {p['name']} | {p['productId']} | {p.get('batchCount', 0)} |"
            )
        return self._format_output(
            "SUCCESS", f"Retrieved {len(products)} products.", "\n".join(rows)
        )

    async def search_products(self, query: str) -> str:
        """Regex search across catalog. **Use** for specific SKU lookup. **Do NOT use** for batch data."""
        products = await tool_store.search_products(self.user_id, query)
        if not products:
            return self._format_output(
                "SUCCESS", f"No products found for search '{query}'."
            )

        rows = ["| Product Name | SKU |", "| :--- | :--- |"]

        # Anti-Data Dump Safeguard
        max_matches = 20
        total_products = len(products)
        display_products = products[:max_matches]

        for p in display_products:
            rows.append(f"| {p['name']} | {p['productId']} |")

        if total_products > max_matches:
            rows.append(f"| ... | *Truncated ({total_products - max_matches} more)* |")
            return self._format_output(
                "SUCCESS",
                f"Found {total_products} matches. Showing first {max_matches}. [NOTE: Please refine your query to see specific results.]",
                "\n".join(rows),
            )

        return self._format_output(
            "SUCCESS", f"Found {total_products} matches.", "\n".join(rows)
        )

    async def get_scan_geography(
        self,
        from_date: str = None,
        to_date: str = None,
        product_id: str = None,
        batch_number: str = None,
    ) -> str:
        """Aggregated scan location data. **Use** for spatial analysis across date ranges or specific products. **Do NOT use** for individual unit alerts."""
        data = await tool_store.get_scan_geography(
            self.user_id, from_date, to_date, product_id, batch_number
        )
        if not data:
            return self._format_output(
                "SUCCESS",
                "No geographic data available for the specified range/filters.",
            )

        rows = ["| Country | City | Scan Count |", "| :--- | :--- | :--- |"]
        for d in data:
            rows.append(f"| {d['country']} | {d['city']} | {d['count']} |")
        return self._format_output(
            "SUCCESS", "Geographic scan distribution retrieved.", "\n".join(rows)
        )

    async def get_threat_intelligence(
        self,
        from_date: str = None,
        to_date: str = None,
        product_id: str = None,
        batch_number: str = None,
    ) -> str:
        """Identifies high-risk scans (counterfeit signals). **Use** for security deep-dives. **Do NOT use** for general volume stats."""
        data = await tool_store.get_threat_data(
            self.user_id, from_date, to_date, product_id, batch_number
        )
        if not data:
            return self._format_output(
                "SUCCESS",
                "No critical security threats identified for the specified range/filters.",
            )

        rows = [
            "| Batch # | Unit | Visitors | Total Scans |",
            "| :--- | :--- | :--- | :--- |",
        ]
        for d in data:
            rows.append(
                f"| {d['batchNumber']} | {d['unit']} | {d['visitorCount']} | {d['totalScans']} |"
            )
        return self._format_output(
            "SUCCESS", "Critical threat signals identified.", "\n".join(rows)
        )

    async def list_categories(self) -> str:
        """[Manufacturer Only] Retrieves all unique product categories defined by your company. **Use** to identify valid categories for new product enrollment."""
        try:
            data = await tool_store.get_categories_summary(self.user_id)
            return self._format_output("SUCCESS", "Product categories retrieved.", data)
        except Exception as e:
            return self._format_output("ERROR", f"Failed to list categories: {e}")

    # --- Integration ---

    def get_tools(self) -> List[StructuredTool]:
        base_tools = [
            StructuredTool.from_function(
                coroutine=self.get_user_profile,
                name="get_user_profile",
                description=self.get_user_profile.__doc__,
                args_schema=GetUserProfileArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.list_page_guides,
                name="list_page_guides",
                description=self.list_page_guides.__doc__,
                args_schema=GetPageGuidesListArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_page_guide,
                name="get_page_guide",
                description=self.get_page_guide.__doc__,
                args_schema=GetPageGuideArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.get_view_data,
                name="get_view_data",
                description=self.get_view_data.__doc__,
                args_schema=GetViewDataArgs,
            ),
            StructuredTool.from_function(
                coroutine=self.list_notifications,
                name="list_notifications",
                description=self.list_notifications.__doc__,
                args_schema=ListNotificationsArgs,
            ),
        ]

        if self.role == "manufacturer":
            base_tools.extend(
                [
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
                    StructuredTool.from_function(
                        coroutine=self.list_batches,
                        name="list_batches",
                        description=self.list_batches.__doc__,
                        args_schema=ListBatchesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_batches,
                        name="search_batches",
                        description=self.search_batches.__doc__,
                        args_schema=SearchBatchesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.list_products,
                        name="list_products",
                        description=self.list_products.__doc__,
                        args_schema=ListProductsArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_products,
                        name="search_products",
                        description=self.search_products.__doc__,
                        args_schema=SearchProductsArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.get_scan_geography,
                        name="get_scan_geography",
                        description=self.get_scan_geography.__doc__,
                        args_schema=GetScanGeographyArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.get_threat_intelligence,
                        name="get_threat_intelligence",
                        description=self.get_threat_intelligence.__doc__,
                        args_schema=GetThreatIntelligenceArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.list_categories,
                        name="list_categories",
                        description=self.list_categories.__doc__,
                        args_schema=ListCategoriesArgs,
                    ),
                ]
            )
        elif self.role == "customer":
            base_tools.extend(
                [
                    StructuredTool.from_function(
                        coroutine=self.list_my_medicines,
                        name="list_my_medicines",
                        description=self.list_my_medicines.__doc__,
                        args_schema=ListMyMedicinesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_my_medicines,
                        name="search_my_medicines",
                        description=self.search_my_medicines.__doc__,
                        args_schema=SearchMyMedicinesArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.add_medicine,
                        name="add_medicine",
                        description=self.add_medicine.__doc__,
                        args_schema=AddMedicineArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.update_medicine,
                        name="update_medicine",
                        description=self.update_medicine.__doc__,
                        args_schema=UpdateMedicineArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.remove_medicine,
                        name="remove_medicine",
                        description=self.remove_medicine.__doc__,
                        args_schema=RemoveMedicineArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.mark_dose_taken,
                        name="mark_dose_taken",
                        description=self.mark_dose_taken.__doc__,
                        args_schema=MarkDoseTakenArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.undo_dose,
                        name="undo_dose",
                        description=self.undo_dose.__doc__,
                        args_schema=UndoDoseArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.add_reminder,
                        name="add_reminder",
                        description=self.add_reminder.__doc__,
                        args_schema=AddReminderArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.remove_reminder,
                        name="remove_reminder",
                        description=self.remove_reminder.__doc__,
                        args_schema=RemoveReminderArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.list_prescriptions,
                        name="list_prescriptions",
                        description=self.list_prescriptions.__doc__,
                        args_schema=ListPrescriptionsArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.read_prescription,
                        name="read_prescription",
                        description=self.read_prescription.__doc__,
                        args_schema=ReadPrescriptionArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.search_prescriptions,
                        name="search_prescriptions",
                        description=self.search_prescriptions.__doc__,
                        args_schema=SearchPrescriptionsArgs,
                    ),
                    StructuredTool.from_function(
                        coroutine=self.list_upcoming_doses,
                        name="list_upcoming_doses",
                        description=self.list_upcoming_doses.__doc__,
                        args_schema=ListUpcomingDosesArgs,
                    ),
                ]
            )

        return base_tools
