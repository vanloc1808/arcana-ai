FROM python:3.12-slim-bookworm

# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    gcc \
    python3-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

# Set environment
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH=/app

# Set work directory
ADD . /app

WORKDIR /app

# Install dependencies
RUN uv sync

# Create avatar directory
RUN mkdir -p /avatar && chmod 755 /avatar

# Create startup script
RUN echo '#!/bin/bash\n\
    source .venv/bin/activate\n\
    # Wait for database to be ready\n\
    echo "Waiting for database..."\n\
    sleep 5\n\
    # Run migrations\n\
    alembic upgrade head\n\
    # Start the application\n\
    uvicorn app:app --host 0.0.0.0 --port 8000' > /app/start.sh && \
    chmod +x /app/start.sh

# Expose port and run server
EXPOSE 8000

CMD ["/app/start.sh"]
