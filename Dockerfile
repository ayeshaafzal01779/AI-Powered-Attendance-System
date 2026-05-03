FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for dlib, face-recognition, opencv
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set timezone
RUN ln -sf /usr/share/zoneinfo/Asia/Karachi /etc/localtime && echo "Asia/Karachi" > /etc/timezone
ENV TZ=Asia/Karachi

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Expose Flask port
EXPOSE 5000

# Start Flask app
CMD ["python", "backend/app.py"]