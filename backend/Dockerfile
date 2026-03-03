FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    gcc \
    python3-dev \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

ADD https://astral.sh/uv/install.sh /uv-installer.sh

RUN sh /uv-installer.sh && rm /uv-installer.sh

ENV PATH="/root/.local/bin/:$PATH"

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

ADD . /app

WORKDIR /app

RUN uv sync

RUN mkdir -p /avatar && chmod 755 /avatar

RUN chmod +x /app/wait-for-it.sh

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

EXPOSE 8000

CMD ["/app/start.sh"]
