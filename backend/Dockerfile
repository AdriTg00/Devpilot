FROM python:3.12-slim

RUN groupadd -r devpilot && useradd -r -g devpilot -m -d /app devpilot

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=devpilot:devpilot app/ app/

RUN mkdir -p .chroma .memory .settings && chown -R devpilot:devpilot .chroma .memory .settings

USER devpilot

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
