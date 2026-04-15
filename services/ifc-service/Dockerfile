FROM python:3.11-slim

# DEBIAN_FRONTEND=noninteractive подавляет интерактивные запросы debconf при Docker-сборке.
# Без этого apt-get выдаёт предупреждения "debconf: unable to initialize frontend" — сборка
# продолжается, но логи засоряются. Устанавливать как ENV (не ARG) — нужно для всего образа.
ENV DEBIAN_FRONTEND=noninteractive

# Системные зависимости:
# - wget, unzip: скачивание и распаковка бинарника IfcConvert
# - libgomp1: OpenMP runtime, необходим IfcConvert для многопоточной обработки IFC-файлов
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    unzip \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python-зависимости — отдельный слой для кэширования.
# Этот слой не инвалидируется при изменениях кода приложения — только при изменении requirements.txt.
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# IfcConvert — официальный конвертер IFC → glTF/GLB из пакета IfcOpenShell.
# Версия 0.8.0 соответствует ifcopenshell==0.8.0 в requirements.txt — важно держать синхронизированными.
#
# История URL:
#   Старый (недоступен с ~2025): https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-linux64.zip
#   Новый: GitHub Releases — https://github.com/IfcOpenShell/IfcOpenShell/releases/download/v0.8.0/...
#
# Альтернатива без внешних зависимостей: загрузить бинарник в Timeweb S3 и передать URL через ARG.
# Пример: ARG IFCCONVERT_URL и wget "$IFCCONVERT_URL" — тогда сборка не зависит от GitHub.
RUN for attempt in 1 2 3 4 5; do \
      echo "==> IfcConvert download attempt $attempt/5" && \
      wget -q --timeout=60 \
        "https://github.com/IfcOpenShell/IfcOpenShell/releases/download/v0.8.0/IfcConvert-v0.8.0-linux64.zip" \
      && unzip -q IfcConvert-v0.8.0-linux64.zip -d /tmp/ifcconvert \
      && mv /tmp/ifcconvert/IfcConvert /usr/local/bin/IfcConvert \
      && chmod +x /usr/local/bin/IfcConvert \
      && rm -rf IfcConvert-v0.8.0-linux64.zip /tmp/ifcconvert \
      && break || { echo "Attempt $attempt failed, waiting 15s..."; sleep 15; }; \
    done \
    && test -x /usr/local/bin/IfcConvert

COPY . /app
WORKDIR /app

ENV PORT=8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
