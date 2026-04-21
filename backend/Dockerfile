FROM python:3.11-slim

# Azure Cognitive Services Speech SDK requires these system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl-dev \
    libasound2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
