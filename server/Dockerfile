FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Arduino CLI
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Move Arduino CLI to /usr/local/bin
RUN mv ./bin/arduino-cli /usr/local/bin/arduino-cli

# Initialize Arduino CLI config
RUN arduino-cli config init

# Add ESP32 and ESP8266 board URLs to Arduino CLI config
RUN arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
RUN arduino-cli config add board_manager.additional_urls https://arduino.esp8266.com/stable/package_esp8266com_index.json

# Update index and install core platforms
RUN arduino-cli core update-index
RUN arduino-cli core install arduino:avr
RUN arduino-cli core install esp32:esp32
RUN arduino-cli core install esp8266:esp8266

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /tmp/simpiler/uploads /tmp/simpiler/binaries /tmp/simpiler/work

# Expose port
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ARDUINO_CLI_PATH=/usr/local/bin/arduino-cli
ENV UPLOAD_FOLDER=/tmp/simpiler/uploads
ENV BINARY_FOLDER=/tmp/simpiler/binaries
ENV ARDUINO_WORK_DIR=/tmp/simpiler/work

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]

