FROM python:3.11-slim

# Системные зависимости: wget и unzip для скачивания IfcConvert
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем IfcConvert — конвертер IFC → glTF/glb/obj/etc.
# Скачиваем zip, распаковываем, кладём бинарник в PATH.
# ВАЖНО: wget -O на zip-файл + chmod+x не работает — zip не является ELF-бинарником.
RUN wget -q "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-linux64.zip" \
    && unzip -q IfcConvert-v0.7.0-linux64.zip -d /tmp/ifcconvert \
    && mv /tmp/ifcconvert/IfcConvert /usr/local/bin/IfcConvert \
    && chmod +x /usr/local/bin/IfcConvert \
    && rm -rf IfcConvert-v0.7.0-linux64.zip /tmp/ifcconvert

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app
WORKDIR /app

ENV PORT=8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
