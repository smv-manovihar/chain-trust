# Use Python 3.12 as the base image
FROM ghcr.io/astral-sh/uv:python3.12-alpine AS base

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy project files first for better caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the source code
COPY . .

# Install the project
RUN uv sync --frozen --no-dev

# Expose the API port
EXPOSE 8000

# Set environment to production
ENV PYTHONUNBUFFERED=1

# Start the application
CMD ["uv", "run", "fastapi", "run", "main.py", "--port", "8000", "--host", "0.0.0.0"]
