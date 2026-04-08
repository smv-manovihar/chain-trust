import os
import hashlib
import time
import sys
from pathlib import Path
from collections import OrderedDict
from typing import Optional
from urllib.parse import urlparse

try:
    import boto3
except Exception:
    boto3 = None

try:
    import chardet
except Exception:
    chardet = None

try:
    import pandas as pd
except Exception:
    pd = None

try:
    import PyPDF2
except Exception:
    PyPDF2 = None

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    import docx  # python-docx
except Exception:
    docx = None

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import pytesseract
except Exception:
    pytesseract = None

from config import get_settings
from database import get_db

# --- Tesseract Auto-Download ---


async def ensure_tesseract_installed():
    """Configure Tesseract executable path."""
    if not pytesseract:
        return

    settings = get_settings()
    if settings.TESSERACT_CMD and os.path.exists(settings.TESSERACT_CMD):
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        return

    # Check if tesseract is already in PATH
    try:
        pytesseract.get_tesseract_version()
        return
    except Exception:
        pass
    pass

    return


# --- Runtime Cache Setup ---

MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB
CACHE_TTL_SECONDS = 1800  # 30 minutes

# LRU cache: URL hash → (parsed_content, timestamp, size_in_bytes)
_document_cache: OrderedDict[str, tuple[str, float, int]] = OrderedDict()
_current_cache_size = 0


def _get_cache_key(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _evict_expired():
    global _current_cache_size
    now = time.time()
    expired = [
        k for k, (_, ts, _) in _document_cache.items() if now - ts > CACHE_TTL_SECONDS
    ]
    for k in expired:
        _, _, size = _document_cache.pop(k)
        _current_cache_size -= size


def _ensure_capacity(new_size: int):
    global _current_cache_size
    while _document_cache and _current_cache_size + new_size > MAX_CACHE_SIZE_BYTES:
        _, (_, _, size) = _document_cache.popitem(last=False)
        _current_cache_size -= size


_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        if not boto3:
            raise ImportError("boto3 not installed")

        settings = get_settings()
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
    return _s3_client


async def fetch_and_parse(url: str, display_name: str) -> str:
    """Download, parse and cache a document."""
    global _current_cache_size
    _evict_expired()

    key = _get_cache_key(url)
    if key in _document_cache:
        content, _, _ = _document_cache[key]
        _document_cache[key] = (content, time.time(), sys.getsizeof(content))
        _document_cache.move_to_end(key)
        return content

    # 2. Persistent Cache: Check MongoDB (Digitized content stored in prescriptions)
    try:
        db = get_db()
        # Find by URL in the prescriptions collection
        doc = await db.prescriptions.find_one({"url": url})
        if doc and doc.get("content"):
            content = doc["content"]
            
            # REPAIR BLOCK: If content is accidentally stored as raw bytes (BinData in Mongo),
            # convert it back to a string or clear it if it's garbage.
            if isinstance(content, bytes):
                try:
                    # Attempt UTF-8, if it fails, it's likely garbage binary from a previous failed run
                    content = content.decode("utf-8")
                except UnicodeDecodeError:
                    # If it's garbage, the cache is poisoned. Skip and trigger a re-parse.
                    content = None

            if content:
                # Populate in-memory cache for subsequent fast reads
                new_size = sys.getsizeof(content)
                if new_size <= MAX_CACHE_SIZE_BYTES:
                    _ensure_capacity(new_size)
                    _document_cache[key] = (content, time.time(), new_size)
                    _current_cache_size += new_size
                return str(content)
    except Exception:
        # Fallback to local parsing if DB is unavailable or schema differs
        pass

    # 3. Last Resort: Raw fetch and parse
    project_root = Path(__file__).resolve().parent.parent.parent
    tmp_dir = project_root / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    
    # CRITICAL: Resolve extension from the URL/S3 key, not the display label
    # Labels (e.g., "Doctor's Note") often lack extensions, leading to parsing failures.
    ext = os.path.splitext(urlparse(url).path)[1]
    if not ext:
        # Fallback to display name if URL lacks it (rare)
        ext = os.path.splitext(display_name)[1]
        
    temp_path = tmp_dir / f"download_{key}{ext}"

    try:
        s3 = _get_s3_client()
        settings = get_settings()

        # Handle backend's relative proxy URLs (strip /api/media prefix)
        if url.startswith("/api/media/"):
            object_key = url.replace("/api/media/", "", 1)
            bucket_name = settings.S3_BUCKET
        else:
            parsed_url = urlparse(url)
            if parsed_url.scheme == "s3":
                bucket_name = parsed_url.netloc
                object_key = parsed_url.path.lstrip("/")
            else:
                # Fallback for path-style or virtual-hosted URLs (heuristic)
                path_parts = parsed_url.path.strip("/").split("/", 1)
                if len(path_parts) > 1:
                    bucket_name = path_parts[0]
                    object_key = path_parts[1]
                else:
                    bucket_name = settings.S3_BUCKET
                    object_key = url.lstrip("/")

        # Download file
        s3.download_file(bucket_name, object_key, str(temp_path))

        await ensure_tesseract_installed()

        parsed = read_any_file(
            file_path=str(temp_path),
            display_filename=display_name,
            line_numbers=False,
            include_info=False,
        )

        content = str(parsed)
        new_size = sys.getsizeof(content)
        if new_size <= MAX_CACHE_SIZE_BYTES:
            _ensure_capacity(new_size)
            _document_cache[key] = (content, time.time(), new_size)
            _current_cache_size += new_size

        return content

    except Exception as e:
        return f"Failed to fetch or parse document: {str(e)}"
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass


# --- Parser Implementations ---


def _safe_read_bytes(path: str, max_bytes: Optional[int] = None):
    size = os.path.getsize(path)
    if max_bytes is not None and size > max_bytes:
        raise ValueError(f"File too large ({size} bytes). Max is {max_bytes}.")
    with open(path, "rb") as f:
        data = f.read()
    return data, size


def _decode_bytes(data: bytes):
    if chardet:
        try:
            guess = chardet.detect(data)
            enc = guess.get("encoding")
            if enc:
                return data.decode(enc), enc
        except Exception:
            pass
    for enc in ("utf-8", "utf-8-sig"):
        try:
            return data.decode(enc), enc
        except Exception:
            pass
    # If not UTF-8, it's likely a binary file. Returning raw base64 ensures it's a string,
    # but most parsers will prefer the clear error message below if used in text contexts.
    return "This file contains binary data and could not be decoded as text.", "binary"


def _extract_text_from_pdf(path: str):
    texts = []
    try:
        if not fitz:
            raise ImportError("PyMuPDF (fitz) not installed")

        doc = fitz.open(path)
        ocr_pages_done = 0
        for i, page in enumerate(doc):
            text = page.get_text().strip()
            if len(text) > 50:
                texts.append(text)
            else:
                if pytesseract and Image and ocr_pages_done < 50:
                    try:
                        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
                        mode = "RGBA" if pix.alpha else "RGB"
                        img = Image.frombytes(
                            mode, [pix.width, pix.height], pix.samples
                        )
                        ocr_text = pytesseract.image_to_string(img)
                        texts.append(ocr_text.strip())
                        ocr_pages_done += 1
                    except Exception:
                        pass
                elif ocr_pages_done >= 50:
                    texts.append("[NOTE: Image-heavy document truncated at 50 pages for performance.]")
                    break
        return "\n\n--- Page Break ---\n\n".join(texts).strip(), None
    except Exception as fitz_err:
        if not PyPDF2:
            return None, f"PyMuPDF failed ({fitz_err}) and PyPDF2 not installed"
        try:
            reader = PyPDF2.PdfReader(path)
            for p in reader.pages:
                texts.append(p.extract_text() or "")
            return "\n\n".join(texts).strip(), None
        except Exception as e:
            return None, str(e)


def _extract_text_from_docx(path: str):
    if not docx:
        return None, "python-docx not installed"
    try:
        d = docx.Document(path)
        return "\n".join([p.text for p in d.paragraphs]).strip(), None
    except Exception as e:
        return None, str(e)


def _extract_image_info(path: str):
    if not Image:
        return {"error": "Pillow not installed"}
    try:
        with Image.open(path) as im:
            info = {"format": im.format, "size": im.size}
            if pytesseract:
                try:
                    text = pytesseract.image_to_string(im)
                    info["ocr_text"] = text.strip()
                except Exception as e:
                    info["ocr_text_error"] = str(e)
            else:
                info["ocr_text_error"] = "pytesseract not available"
            return info
    except Exception as e:
        return {"error": str(e)}


def _truncate_if_needed(text: str, max_chars: Optional[int]):
    if max_chars is None or len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n...[truncated]\n"


def read_any_file(
    file_path: str,
    char_limit: int = 1000000,
    display_filename: str = None,
    include_info: bool = True,
    line_numbers: bool = False,
) -> str:
    """Reads content from various file types."""
    if not os.path.exists(file_path):
        return f"File not found: {file_path}"

    try:
        # File sizes (bytes) aren't 1:1 with char count (especially for PDFs or Images)
        # Cap max physical file size to 50 MB to allow processing of test.pdf
        data, size = _safe_read_bytes(file_path, max_bytes=1024 * 1024 * 50)
    except Exception as e:
        return f"Could not read file (max 50 MB): {e}"

    ext = os.path.splitext(file_path)[1].lower()
    text_extracted = None
    warnings = []

    if ext in (".txt", ".md", ".json", ".csv"):
        text, enc = _decode_bytes(data)
        text_extracted = text
    elif ext == ".pdf":
        txt, err = _extract_text_from_pdf(file_path)
        if err:
            text_extracted, _ = _decode_bytes(data)
        else:
            text_extracted = txt
    elif ext == ".docx":
        txt, err = _extract_text_from_docx(file_path)
        if err:
            text_extracted, _ = _decode_bytes(data)
        else:
            text_extracted = txt
    elif ext in (".png", ".jpg", ".jpeg", ".webp"):
        info = _extract_image_info(file_path)
        if "error" in info:
            warnings.append(f"Image error: {info['error']}")
        text_extracted = info.get("ocr_text", "")
    else:
        text_extracted, enc = _decode_bytes(data)

    if not text_extracted:
        text_extracted = "No text could be extracted from this document."

    content = _truncate_if_needed(text_extracted, char_limit)

    if line_numbers:
        lines = content.split("\n")
        content = "\n".join([f"{i + 1}: {line}" for i, line in enumerate(lines)])

    if include_info:
        return f"--- File: {display_filename or os.path.basename(file_path)} ---\n{content}"
    return content
