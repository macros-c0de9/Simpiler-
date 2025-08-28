# Simpiler - Arduino Mobile Compiler

Simpiler is a mobile-based Arduino development environment that allows users to write, compile, and upload Arduino code directly from their mobile devices.

## System Overview

The system consists of three main components:

1. **Mobile Application**: A code editor with project management capabilities
2. **Server-Side Compiler**: A service that compiles Arduino code for various boards
3. **Board Communication Module**: Handles uploading compiled binaries to Arduino boards

## Features

- Write Arduino code on your mobile device with syntax highlighting
- Compile code for various Arduino boards (Uno, Nano, Mega, ESP32, ESP8266)
- Upload compiled binaries to boards via USB OTG, Bluetooth, or WiFi
- Serial monitor for debugging
- Project management (save, load, share)
- Example projects for quick start

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Mobile App     │ ◄─────► │  Server          │         │  Arduino Board  │
│  - Code Editor  │   API   │  - Compilation   │         │  - Uno          │
│  - Project Mgmt │         │  - User Auth     │         │  - ESP32        │
│  - Board Comm   │ ─────── │  - Project Store │         │  - ESP8266      │
│                 │    │    │                  │         │                 │
└─────────────────┘    │    └──────────────────┘         └────────┬────────┘
                       │                                          │
                       │                                          │
                       └──────────────────────────────────────────┘
                            Binary Upload (USB/BT/WiFi)
```

## Components

### Mobile Application

- React Native for cross-platform mobile development
- Monaco Editor or CodeMirror for code editing
- AsyncStorage for local project storage
- React Navigation for app navigation

### Server-Side Compiler

- Python Flask for the API server
- Arduino CLI for compilation
- Docker for containerization and isolation
- Redis for queue management
- PostgreSQL for user and project data storage

### Board Communication Module

- USB OTG for direct connection
- Bluetooth for wireless connection to compatible boards
- WiFi for ESP32/ESP8266 OTA updates
- Board-specific libraries for communication

## Getting Started

### Server Setup

1. Install Docker and Docker Compose
2. Clone the repository
3. Navigate to the server directory
4. Build and start the server:
   ```
   docker-compose up -d
   ```

### Mobile App Setup

1. Install Node.js and npm
2. Install Expo CLI:
   ```
   npm install -g expo-cli
   ```
3. Navigate to the mobile directory
4. Install dependencies:
   ```
   npm install
   ```
5. Start the development server:
   ```
   expo start
   ```

## API Documentation

See [API Specification](docs/api_specification.md) for detailed API documentation.

## System Architecture

See [Architecture Documentation](docs/architecture.md) for detailed system architecture.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

