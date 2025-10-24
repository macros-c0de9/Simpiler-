# Simpiler Mobile App

This is the mobile application component of the Simpiler Arduino Mobile Compiler system. It provides a code editor, project management, and board communication capabilities for Arduino development on mobile devices.

## Features

- Arduino code editor with syntax highlighting
- Project management (create, save, load, share)
- Board selection and configuration
- Compilation request handling
- Binary storage and board upload
- Serial monitor for debugging

## Technologies

- React Native for cross-platform mobile development
- Expo for development and building
- AsyncStorage for local project storage
- React Navigation for app navigation

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository
2. Navigate to the mobile directory
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

### Configuration

1. Create a `.env` file in the mobile directory with the following content:
   ```
   API_BASE_URL=https://api.simpiler.com
   ```
   Replace the URL with your actual API server URL.

### Running the App

1. Start the development server:
   ```
   expo start
   ```
2. Use the Expo Go app on your mobile device to scan the QR code, or run in an emulator/simulator.

### Building for Production

#### Android

1. Build the Android APK:
   ```
   expo build:android -t apk
   ```
   or build an Android App Bundle:
   ```
   expo build:android -t app-bundle
   ```

#### iOS

1. Build the iOS IPA:
   ```
   expo build:ios -t archive
   ```

## Project Structure

```
mobile/
├── assets/            # Static assets (images, fonts)
├── src/
│   ├── api/           # API client and services
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers
│   ├── editor/        # Code editor components
│   ├── native/        # Native module bridges
│   ├── screens/       # App screens
│   ├── services/      # Business logic services
│   ├── utils/         # Utility functions
│   ├── App.js         # Main app component
│   └── config.js      # App configuration
├── .env               # Environment variables
├── app.json           # Expo configuration
└── package.json       # Dependencies and scripts
```

## Native Modules

The app uses several native modules for board communication:

- **UsbSerial**: For USB OTG communication with Arduino boards (Android only)
- **BleManager**: For Bluetooth communication with compatible boards
- **EspOta**: For WiFi OTA updates to ESP32/ESP8266 boards

These modules need to be implemented as native modules or using existing libraries.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

