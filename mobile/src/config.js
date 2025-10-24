/**
 * Application configuration
 */

// API configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.simpiler.com';

// Theme configuration
export const THEMES = {
  light: {
    name: 'light',
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
      info: '#5AC8FA',
      background: '#F2F2F7',
      cardBackground: '#FFFFFF',
      text: '#000000',
      textSecondary: '#8E8E93',
      border: '#C7C7CC',
      inputBackground: '#E9E9EB',
      buttonCancel: '#8E8E93',
      
      // Editor colors
      editorBackground: '#FFFFFF',
      lineNumberBackground: '#F2F2F7',
      lineNumber: '#8E8E93',
      activeLineNumber: '#007AFF',
      activeLineBackground: '#E9E9EB',
      keyword: '#0000FF',
      string: '#008000',
      number: '#FF5500',
      comment: '#8E8E93',
    }
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#0A84FF',
      secondary: '#5E5CE6',
      success: '#30D158',
      warning: '#FF9F0A',
      danger: '#FF453A',
      info: '#64D2FF',
      background: '#1C1C1E',
      cardBackground: '#2C2C2E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      border: '#38383A',
      inputBackground: '#38383A',
      buttonCancel: '#8E8E93',
      
      // Editor colors
      editorBackground: '#1C1C1E',
      lineNumberBackground: '#2C2C2E',
      lineNumber: '#8E8E93',
      activeLineNumber: '#0A84FF',
      activeLineBackground: '#38383A',
      keyword: '#FF9F0A',
      string: '#30D158',
      number: '#FF453A',
      comment: '#8E8E93',
    }
  }
};

// Default theme
export const DEFAULT_THEME = 'light';

// Board types
export const BOARD_TYPES = [
  {
    id: 'arduino:avr:uno',
    name: 'Arduino Uno',
    platform: 'arduino:avr',
    description: 'Arduino Uno (ATmega328P)'
  },
  {
    id: 'arduino:avr:nano',
    name: 'Arduino Nano',
    platform: 'arduino:avr',
    description: 'Arduino Nano (ATmega328P)'
  },
  {
    id: 'arduino:avr:mega',
    name: 'Arduino Mega',
    platform: 'arduino:avr',
    description: 'Arduino Mega (ATmega2560)'
  },
  {
    id: 'esp32:esp32:esp32',
    name: 'ESP32 Dev Module',
    platform: 'esp32:esp32',
    description: 'ESP32 Development Module'
  },
  {
    id: 'esp8266:esp8266:generic',
    name: 'Generic ESP8266 Module',
    platform: 'esp8266:esp8266',
    description: 'Generic ESP8266 Module'
  }
];

// Example projects
export const EXAMPLE_PROJECTS = [
  {
    id: 'example_blink',
    name: 'Blink',
    board_type: 'arduino:avr:uno',
    description: 'Turns an LED on and off repeatedly',
    code: `// Blink Example
// Turns on an LED for one second, then off for one second, repeatedly.

void setup() {
  // Initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // Turn the LED on
  delay(1000);                       // Wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // Turn the LED off
  delay(1000);                       // Wait for a second
}
`
  },
  {
    id: 'example_button',
    name: 'Button',
    board_type: 'arduino:avr:uno',
    description: 'Reads a digital input and controls an LED',
    code: `// Button Example
// Turns on an LED when a button is pressed

const int buttonPin = 2;  // the number of the pushbutton pin
const int ledPin = 13;    // the number of the LED pin

// variables will change:
int buttonState = 0;      // variable for reading the pushbutton status

void setup() {
  // initialize the LED pin as an output:
  pinMode(ledPin, OUTPUT);
  // initialize the pushbutton pin as an input:
  pinMode(buttonPin, INPUT);
}

void loop() {
  // read the state of the pushbutton value:
  buttonState = digitalRead(buttonPin);

  // check if the pushbutton is pressed. If it is, the buttonState is HIGH:
  if (buttonState == HIGH) {
    // turn LED on:
    digitalWrite(ledPin, HIGH);
  } else {
    // turn LED off:
    digitalWrite(ledPin, LOW);
  }
}
`
  },
  {
    id: 'example_esp32_wifi',
    name: 'ESP32 WiFi Scan',
    board_type: 'esp32:esp32:esp32',
    description: 'Scans for WiFi networks and prints them to the serial monitor',
    code: `// ESP32 WiFi Scan Example
// Scans for WiFi networks and prints them to the serial monitor

#include "WiFi.h"

void setup() {
  Serial.begin(115200);

  // Set WiFi to station mode and disconnect from an AP if it was previously connected
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.println("Setup done");
}

void loop() {
  Serial.println("Scan start");

  // WiFi.scanNetworks will return the number of networks found
  int n = WiFi.scanNetworks();
  Serial.println("Scan done");
  
  if (n == 0) {
    Serial.println("No networks found");
  } else {
    Serial.print(n);
    Serial.println(" networks found");
    
    for (int i = 0; i < n; ++i) {
      // Print SSID and RSSI for each network found
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (");
      Serial.print(WiFi.RSSI(i));
      Serial.print(")");
      Serial.println((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? " " : "*");
      delay(10);
    }
  }
  
  Serial.println("");

  // Wait a bit before scanning again
  delay(5000);
}
`
  },
  {
    id: 'example_esp8266_webserver',
    name: 'ESP8266 Web Server',
    board_type: 'esp8266:esp8266:generic',
    description: 'Creates a simple web server to control an LED',
    code: `// ESP8266 Web Server Example
// Creates a simple web server to control an LED

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

// Replace with your network credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

ESP8266WebServer server(80);

const int ledPin = 2; // GPIO2 of ESP8266
bool ledState = false;

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Define server routes
  server.on("/", handleRoot);
  server.on("/toggle", handleToggle);
  
  // Start server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

void handleRoot() {
  String html = "<html><body>";
  html += "<h1>ESP8266 Web Server</h1>";
  html += "<p>LED is ";
  html += (ledState) ? "ON" : "OFF";
  html += "</p>";
  html += "<a href='/toggle'><button>Toggle LED</button></a>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleToggle() {
  ledState = !ledState;
  digitalWrite(ledPin, ledState);
  server.sendHeader("Location", "/");
  server.send(303);
}
`
  }
];

