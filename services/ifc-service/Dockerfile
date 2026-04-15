FROM python:3.11-slim

# DEBIAN_FRONTEND=noninteractive подавляет интерактивные запросы debconf при Docker-сборке.
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
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# IfcConvert — конвертер IFC → GLB из пакета IfcOpenShell.
# Версия бинарника обязана совпадать с ifcopenshell==0.8.5 из requirements.txt.
#
# Стратегия поиска (в порядке):
#   1. В pip-пакете ifcopenshell — в сборках 0.8.x IfcConvert может быть bundled в site-packages.
#   2. Скачивание по IFCCONVERT_URL (передаётся через build-arg или docker-compose).
#      Рекомендуется загрузить бинарник в собственный Timeweb S3 для надёжности.
#      Пример: IFCCONVERT_URL=https://<s3-endpoint>/<bucket>/tools/ifcconvert-0.8.5-linux64.zip
#
# История:
#   S3 (умер ~2025): https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-linux64.zip
#   GitHub Releases: https://github.com/IfcOpenShell/IfcOpenShell/releases/download/...
ARG IFCCONVERT_URL

# find ищет оба варианта имени: IfcConvert (старые сборки) и ifcconvert (новые, строчные)
RUN SITE=$(python3 -c "import site; print(site.getsitepackages()[0])") \
    && PIP_BIN="$SITE/ifcopenshell/IfcConvert" \
    && if [ -f "$PIP_BIN" ]; then \
         echo "IfcConvert found in pip package at $PIP_BIN" && \
         chmod +x "$PIP_BIN" && ln -sf "$PIP_BIN" /usr/local/bin/IfcConvert; \
       elif [ -n "$IFCCONVERT_URL" ]; then \
         for attempt in 1 2 3 4 5; do \
           echo "==> IfcConvert download attempt $attempt/5 from $IFCCONVERT_URL" && \
           wget -q --timeout=120 "$IFCCONVERT_URL" -O /tmp/ifcconvert.zip \
           && unzip -q /tmp/ifcconvert.zip -d /tmp/ifcconvert \
           && find /tmp/ifcconvert \( -name 'IfcConvert' -o -name 'ifcconvert' \) \
                -exec mv {} /usr/local/bin/IfcConvert \; \
           && chmod +x /usr/local/bin/IfcConvert \
           && rm -rf /tmp/ifcconvert.zip /tmp/ifcconvert \
           && break || { echo "Attempt $attempt failed, waiting 15s..."; sleep 15; }; \
         done; \
       else \
         echo "ERROR: IfcConvert не найден в pip-пакете и IFCCONVERT_URL не задан." >&2 && \
         echo "Загрузите ifcconvert-0.8.5-linux64.zip в Timeweb S3 и передайте URL:" >&2 && \
         echo "  docker compose build --build-arg IFCCONVERT_URL=https://<s3>/tools/ifcconvert-0.8.5-linux64.zip" >&2 && \
         echo "  или задайте IFCCONVERT_URL в .env" >&2 && \
         exit 1; \
       fi \
    && test -x /usr/local/bin/IfcConvert

COPY . /app
WORKDIR /app

ENV PORT=8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
