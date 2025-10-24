# Simpiler Server

This is the server component of the Simpiler Arduino Mobile Compiler system. It provides a RESTful API for code compilation, project management, and board information.

## Features

- RESTful API for code submission and binary retrieval
- Arduino toolchain integration
- Multi-board support (Arduino Uno, ESP32, ESP8266)
- Compilation queue management
- Error reporting and logging
- User authentication and project storage

## Technologies

- Python Flask for the API server
- Arduino CLI for compilation
- Docker for containerization and isolation
- Redis for queue management
- PostgreSQL for user and project data storage

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Arduino CLI (for local development)

### Installation

#### Using Docker (Recommended)

1. Clone the repository
2. Navigate to the root directory
3. Build and start the server:
   ```
   docker-compose up -d
   ```

#### Local Development

1. Clone the repository
2. Navigate to the server directory
3. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Install Arduino CLI:
   ```
   curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
   ```
6. Initialize Arduino CLI:
   ```
   arduino-cli config init
   arduino-cli core update-index
   arduino-cli core install arduino:avr
   arduino-cli core install esp32:esp32
   arduino-cli core install esp8266:esp8266
   ```
7. Start the server:
   ```
   python app.py
   ```

### Configuration

The server can be configured using environment variables:

- `FLASK_APP`: Flask application entry point (default: `app.py`)
- `FLASK_ENV`: Flask environment (default: `production`)
- `DEBUG`: Enable debug mode (default: `False`)
- `PORT`: Server port (default: `5000`)
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379/0`)
- `DATABASE_URL`: PostgreSQL connection URL (default: `postgresql://postgres:postgres@localhost:5432/simpiler`)
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `UPLOAD_FOLDER`: Folder for uploaded code files (default: `/tmp/simpiler/uploads`)
- `BINARY_FOLDER`: Folder for compiled binaries (default: `/tmp/simpiler/binaries`)
- `ARDUINO_WORK_DIR`: Working directory for Arduino compilation (default: `/tmp/simpiler/work`)
- `ARDUINO_CLI_PATH`: Path to Arduino CLI executable (default: `arduino-cli`)

## Project Structure

```
server/
├── api/              # API routes and controllers
│   ├── __init__.py
│   ├── auth.py       # Authentication routes
│   ├── boards.py     # Board information routes
│   ├── compile.py    # Compilation routes
│   ├── models.py     # Database models
│   └── projects.py   # Project management routes
├── compiler/         # Compilation service
│   ├── __init__.py
│   ├── boards.py     # Board-specific compilation
│   └── toolchain.py  # Arduino toolchain integration
├── tests/            # Unit and integration tests
├── app.py            # Main application entry point
├── compiler.py       # Compiler module
├── Dockerfile        # Docker configuration
└── requirements.txt  # Python dependencies
```

## API Documentation

See [API Specification](../docs/api_specification.md) for detailed API documentation.

## Testing

Run the tests using pytest:

```
pytest
```

## Deployment

The server can be deployed using Docker and Docker Compose:

```
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

For production deployment, make sure to:

1. Set secure values for all environment variables
2. Configure SSL certificates for HTTPS
3. Set up proper authentication and authorization
4. Configure monitoring and logging
5. Set up database backups

