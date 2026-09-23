FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATABASE_PATH=/app/data/taskquest.db
WORKDIR /app
COPY backend/requirements*.txt ./backend/
RUN python -m pip install -r backend/requirements.txt \
    && groupadd --gid 10001 taskquest \
    && useradd --uid 10001 --gid taskquest --no-create-home taskquest \
    && mkdir -p /app/data \
    && chown taskquest:taskquest /app/data
COPY --chown=taskquest:taskquest backend/app ./backend/app
COPY --from=frontend --chown=taskquest:taskquest /build/frontend/dist ./frontend/dist
USER taskquest
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
