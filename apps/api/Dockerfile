FROM python:3.12-slim

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Use non-root user
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Production start: no --reload, bind to $PORT (Render injects this)
# Migrations run automatically in app startup hook
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
