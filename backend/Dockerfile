FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# uploads klasörü (container içinde)
RUN mkdir -p /app/uploads
ENV PYTHONUNBUFFERED=1

EXPOSE 8000
