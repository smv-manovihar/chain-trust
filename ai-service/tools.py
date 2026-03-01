from langchain.tools import tool

@tool
def get_product_info(product_id: str) -> str:
    """Get information about a verified pharmaceutical product by its ID."""
    return f"Product {product_id} is verified. It is an authentic pharmaceutical batch."

@tool
def search_medical_knowledge(query: str) -> str:
    """Search for general medical knowledge, side effects, or dosages."""
    return f"General medical advice for '{query}': Always consult your physician. Side effects may vary depending on the patient."

# Export a simple list of tools
tools_list = [get_product_info, search_medical_knowledge]