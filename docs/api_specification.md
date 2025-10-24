# Simpiler API Specification

This document outlines the API endpoints for communication between the mobile application and the server-side compiler.

## Base URL

```
https://api.simpiler.com/v1
```

## Authentication

All API requests require authentication using a JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

## Endpoints

### User Management

#### Register User

```
POST /auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "name": "User Name",
  "token": "jwt_token_here"
}
```

#### Login

```
POST /auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "name": "User Name",
  "token": "jwt_token_here"
}
```

### Project Management

#### List Projects

```
GET /projects
```

**Response:**
```json
{
  "projects": [
    {
      "id": "proj123",
      "name": "Blink Example",
      "created_at": "2023-01-01T12:00:00Z",
      "updated_at": "2023-01-02T12:00:00Z",
      "board_type": "arduino:avr:uno"
    },
    {
      "id": "proj124",
      "name": "ESP32 WiFi",
      "created_at": "2023-01-03T12:00:00Z",
      "updated_at": "2023-01-03T12:00:00Z",
      "board_type": "esp32:esp32:esp32"
    }
  ]
}
```

#### Get Project

```
GET /projects/{project_id}
```

**Response:**
```json
{
  "id": "proj123",
  "name": "Blink Example",
  "created_at": "2023-01-01T12:00:00Z",
  "updated_at": "2023-01-02T12:00:00Z",
  "board_type": "arduino:avr:uno",
  "code": "void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}"
}
```

#### Create Project

```
POST /projects
```

**Request:**
```json
{
  "name": "New Project",
  "board_type": "arduino:avr:uno",
  "code": "void setup() {\n  // Setup code\n}\n\nvoid loop() {\n  // Loop code\n}"
}
```

**Response:**
```json
{
  "id": "proj125",
  "name": "New Project",
  "created_at": "2023-01-04T12:00:00Z",
  "updated_at": "2023-01-04T12:00:00Z",
  "board_type": "arduino:avr:uno"
}
```

#### Update Project

```
PUT /projects/{project_id}
```

**Request:**
```json
{
  "name": "Updated Project Name",
  "board_type": "arduino:avr:uno",
  "code": "void setup() {\n  // Updated setup code\n}\n\nvoid loop() {\n  // Updated loop code\n}"
}
```

**Response:**
```json
{
  "id": "proj123",
  "name": "Updated Project Name",
  "created_at": "2023-01-01T12:00:00Z",
  "updated_at": "2023-01-04T14:00:00Z",
  "board_type": "arduino:avr:uno"
}
```

#### Delete Project

```
DELETE /projects/{project_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Compilation

#### Compile Code

```
POST /compile
```

**Request:**
```json
{
  "project_id": "proj123",
  "board_type": "arduino:avr:uno",
  "code": "void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}",
  "libraries": [
    {
      "name": "ArduinoJson",
      "version": "6.19.4"
    }
  ]
}
```

**Response:**
```json
{
  "compilation_id": "comp123",
  "status": "queued",
  "estimated_time": 5
}
```

#### Get Compilation Status

```
GET /compile/{compilation_id}
```

**Response:**
```json
{
  "compilation_id": "comp123",
  "project_id": "proj123",
  "status": "completed",
  "started_at": "2023-01-04T15:00:00Z",
  "completed_at": "2023-01-04T15:00:10Z",
  "binary_url": "https://api.simpiler.com/v1/binaries/bin123",
  "size": 4096,
  "messages": [
    {
      "type": "info",
      "message": "Compilation successful"
    }
  ]
}
```

#### Get Compilation Binary

```
GET /binaries/{binary_id}
```

**Response:**
Binary file with appropriate headers:
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="project_name.bin"
```

### Board Management

#### List Supported Boards

```
GET /boards
```

**Response:**
```json
{
  "boards": [
    {
      "id": "arduino:avr:uno",
      "name": "Arduino Uno",
      "platform": "arduino:avr",
      "description": "Arduino Uno (ATmega328P)"
    },
    {
      "id": "esp32:esp32:esp32",
      "name": "ESP32 Dev Module",
      "platform": "esp32:esp32",
      "description": "ESP32 Development Module"
    },
    {
      "id": "esp8266:esp8266:generic",
      "name": "Generic ESP8266 Module",
      "platform": "esp8266:esp8266",
      "description": "Generic ESP8266 Module"
    }
  ]
}
```

#### Get Board Details

```
GET /boards/{board_id}
```

**Response:**
```json
{
  "id": "arduino:avr:uno",
  "name": "Arduino Uno",
  "platform": "arduino:avr",
  "description": "Arduino Uno (ATmega328P)",
  "cpu": "ATmega328P",
  "flash_size": 32768,
  "ram_size": 2048,
  "upload_protocols": ["serial"],
  "programming_protocols": ["avr109", "stk500v1", "arduino"],
  "documentation_url": "https://docs.arduino.cc/hardware/uno-rev3"
}
```

### Libraries

#### List Available Libraries

```
GET /libraries
```

**Response:**
```json
{
  "libraries": [
    {
      "name": "ArduinoJson",
      "versions": ["6.19.4", "6.18.5", "6.17.3"],
      "author": "Benoit Blanchon",
      "description": "JSON library for Arduino and embedded C++",
      "website": "https://arduinojson.org"
    },
    {
      "name": "WiFi",
      "versions": ["1.2.7", "1.2.6"],
      "author": "Arduino",
      "description": "Enables network connection (local and Internet) using the Arduino WiFi shield",
      "website": "http://www.arduino.cc/en/Reference/WiFi"
    }
  ]
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "bad_request",
  "message": "Invalid request parameters",
  "details": {
    "field": "error description"
  }
}
```

### 401 Unauthorized

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "rate_limited",
  "message": "Too many requests",
  "retry_after": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "server_error",
  "message": "An unexpected error occurred",
  "request_id": "req123"
}
```

