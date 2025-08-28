/**
 * BoardCommunicationService.js
 * Handles communication with Arduino boards for uploading binaries
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import platform-specific modules
let UsbSerial = null;
let BleManager = null;
let EspOta = null;

// Initialize platform-specific modules
if (Platform.OS === 'android') {
  // USB Serial for Android
  UsbSerial = require('../native/UsbSerial').default;
} else if (Platform.OS === 'ios') {
  // BLE for iOS (since iOS doesn't support USB OTG directly)
  BleManager = require('../native/BleManager').default;
}

// ESP OTA module for both platforms
EspOta = require('../native/EspOta').default;

class BoardCommunicationService {
  constructor() {
    this.connectedDevice = null;
    this.connectionType = null; // 'usb', 'ble', 'wifi'
    this.serialMonitorCallbacks = [];
  }
  
  /**
   * Get list of available boards
   * 
   * @returns {Promise} - Promise resolving to array of available boards
   */
  async getAvailableBoards() {
    try {
      const boards = [];
      
      // Check USB devices (Android only)
      if (Platform.OS === 'android' && UsbSerial) {
        const usbDevices = await UsbSerial.getDeviceList();
        
        for (const device of usbDevices) {
          boards.push({
            id: device.deviceId,
            name: device.productName || `USB Device (${device.vendorId}:${device.productId})`,
            type: 'usb',
            details: device
          });
        }
      }
      
      // Check BLE devices (both platforms)
      if (BleManager) {
        const bleDevices = await BleManager.scanForPeripherals();
        
        for (const device of bleDevices) {
          // Filter for likely Arduino BLE devices
          if (device.name && (
              device.name.includes('Arduino') || 
              device.name.includes('ESP32') || 
              device.name.includes('ESP8266') ||
              device.name.includes('BLE')
          )) {
            boards.push({
              id: device.id,
              name: device.name || `BLE Device (${device.id})`,
              type: 'ble',
              details: device
            });
          }
        }
      }
      
      // Check WiFi devices (ESP OTA)
      if (EspOta) {
        const savedEspDevices = await AsyncStorage.getItem('esp_devices');
        const espDevices = savedEspDevices ? JSON.parse(savedEspDevices) : [];
        
        for (const device of espDevices) {
          boards.push({
            id: device.ip,
            name: device.name || `ESP Device (${device.ip})`,
            type: 'wifi',
            details: device
          });
        }
      }
      
      return boards;
    } catch (error) {
      console.error('Error getting available boards:', error);
      throw error;
    }
  }
  
  /**
   * Connect to a board
   * 
   * @param {Object} board - Board information
   * @returns {Promise} - Promise resolving when connected
   */
  async connectToBoard(board) {
    try {
      if (this.connectedDevice) {
        await this.disconnectFromBoard();
      }
      
      if (board.type === 'usb' && UsbSerial) {
        // Connect to USB device
        await UsbSerial.connectDevice(board.id);
        await UsbSerial.openDevice(board.id, { baudRate: 115200 });
        this.connectedDevice = board;
        this.connectionType = 'usb';
        
        // Set up serial monitor
        UsbSerial.setDataListener((data) => {
          this.serialMonitorCallbacks.forEach(callback => callback(data));
        });
      } else if (board.type === 'ble' && BleManager) {
        // Connect to BLE device
        await BleManager.connectToDevice(board.id);
        this.connectedDevice = board;
        this.connectionType = 'ble';
        
        // Set up notification listener for serial data
        await BleManager.startNotification(
          board.id,
          'FFE0', // Example service UUID for BLE UART
          'FFE1'  // Example characteristic UUID for BLE UART
        );
        
        BleManager.addListener(board.id, 'FFE1', (data) => {
          this.serialMonitorCallbacks.forEach(callback => callback(data));
        });
      } else if (board.type === 'wifi' && EspOta) {
        // For WiFi devices, just store the connection info
        // Actual connection happens during upload
        this.connectedDevice = board;
        this.connectionType = 'wifi';
      } else {
        throw new Error(`Unsupported board type: ${board.type}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error connecting to board:', error);
      this.connectedDevice = null;
      this.connectionType = null;
      throw error;
    }
  }
  
  /**
   * Disconnect from the current board
   * 
   * @returns {Promise} - Promise resolving when disconnected
   */
  async disconnectFromBoard() {
    try {
      if (!this.connectedDevice) {
        return true;
      }
      
      if (this.connectionType === 'usb' && UsbSerial) {
        await UsbSerial.closeDevice(this.connectedDevice.id);
        await UsbSerial.disconnectDevice(this.connectedDevice.id);
      } else if (this.connectionType === 'ble' && BleManager) {
        await BleManager.disconnectFromDevice(this.connectedDevice.id);
      }
      
      this.connectedDevice = null;
      this.connectionType = null;
      return true;
    } catch (error) {
      console.error('Error disconnecting from board:', error);
      throw error;
    }
  }
  
  /**
   * Upload binary to the connected board
   * 
   * @param {string} binaryPath - Path to the binary file
   * @param {Function} progressCallback - Callback for upload progress
   * @returns {Promise} - Promise resolving when upload is complete
   */
  async uploadBinary(binaryPath, progressCallback = () => {}) {
    try {
      if (!this.connectedDevice) {
        throw new Error('No board connected');
      }
      
      // Check if binary exists
      const fileInfo = await FileSystem.getInfoAsync(binaryPath);
      if (!fileInfo.exists) {
        throw new Error('Binary file not found');
      }
      
      if (this.connectionType === 'usb' && UsbSerial) {
        // For Arduino boards via USB
        // This is a simplified example - actual implementation would depend on the specific board
        
        // Put the board in bootloader mode
        await UsbSerial.setDTR(this.connectedDevice.id, false);
        await UsbSerial.setRTS(this.connectedDevice.id, true);
        await new Promise(resolve => setTimeout(resolve, 250));
        await UsbSerial.setDTR(this.connectedDevice.id, true);
        await new Promise(resolve => setTimeout(resolve, 50));
        await UsbSerial.setRTS(this.connectedDevice.id, false);
        
        // Read binary file
        const binary = await FileSystem.readAsStringAsync(binaryPath, { encoding: FileSystem.EncodingType.Base64 });
        
        // Upload binary in chunks
        const chunkSize = 128;
        const totalChunks = Math.ceil(binary.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = binary.substr(i * chunkSize, chunkSize);
          await UsbSerial.writeBase64(this.connectedDevice.id, chunk);
          
          // Report progress
          progressCallback((i + 1) / totalChunks);
          
          // Small delay to prevent buffer overflow
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Reset the board
        await UsbSerial.setDTR(this.connectedDevice.id, false);
        await new Promise(resolve => setTimeout(resolve, 250));
        await UsbSerial.setDTR(this.connectedDevice.id, true);
        
        return true;
      } else if (this.connectionType === 'ble' && BleManager) {
        // For BLE-capable boards
        // This is a simplified example - actual implementation would depend on the specific board
        
        // Read binary file
        const binary = await FileSystem.readAsStringAsync(binaryPath, { encoding: FileSystem.EncodingType.Base64 });
        
        // Upload binary in chunks
        const chunkSize = 20; // BLE has small MTU size
        const totalChunks = Math.ceil(binary.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = binary.substr(i * chunkSize, chunkSize);
          await BleManager.writeBase64(
            this.connectedDevice.id,
            'FFE0', // Example service UUID for BLE UART
            'FFE1', // Example characteristic UUID for BLE UART
            chunk
          );
          
          // Report progress
          progressCallback((i + 1) / totalChunks);
          
          // Small delay to prevent buffer overflow
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        return true;
      } else if (this.connectionType === 'wifi' && EspOta) {
        // For ESP32/ESP8266 OTA updates
        return await EspOta.uploadBinary(
          this.connectedDevice.details.ip,
          this.connectedDevice.details.port || 8266,
          binaryPath,
          progressCallback
        );
      } else {
        throw new Error(`Unsupported connection type: ${this.connectionType}`);
      }
    } catch (error) {
      console.error('Error uploading binary:', error);
      throw error;
    }
  }
  
  /**
   * Send data to the connected board
   * 
   * @param {string} data - Data to send
   * @returns {Promise} - Promise resolving when data is sent
   */
  async sendData(data) {
    try {
      if (!this.connectedDevice) {
        throw new Error('No board connected');
      }
      
      if (this.connectionType === 'usb' && UsbSerial) {
        await UsbSerial.write(this.connectedDevice.id, data);
      } else if (this.connectionType === 'ble' && BleManager) {
        await BleManager.write(
          this.connectedDevice.id,
          'FFE0', // Example service UUID for BLE UART
          'FFE1', // Example characteristic UUID for BLE UART
          data
        );
      } else {
        throw new Error(`Cannot send data over ${this.connectionType} connection`);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
      throw error;
    }
  }
  
  /**
   * Add a serial monitor callback
   * 
   * @param {Function} callback - Function to call when data is received
   */
  addSerialMonitorCallback(callback) {
    this.serialMonitorCallbacks.push(callback);
  }
  
  /**
   * Remove a serial monitor callback
   * 
   * @param {Function} callback - Callback to remove
   */
  removeSerialMonitorCallback(callback) {
    const index = this.serialMonitorCallbacks.indexOf(callback);
    if (index !== -1) {
      this.serialMonitorCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Add a new ESP device for OTA updates
   * 
   * @param {Object} device - Device information (name, ip, port)
   * @returns {Promise} - Promise resolving when device is added
   */
  async addEspDevice(device) {
    try {
      const savedEspDevices = await AsyncStorage.getItem('esp_devices');
      const espDevices = savedEspDevices ? JSON.parse(savedEspDevices) : [];
      
      // Check if device already exists
      const existingIndex = espDevices.findIndex(d => d.ip === device.ip);
      if (existingIndex !== -1) {
        espDevices[existingIndex] = { ...espDevices[existingIndex], ...device };
      } else {
        espDevices.push(device);
      }
      
      await AsyncStorage.setItem('esp_devices', JSON.stringify(espDevices));
      return true;
    } catch (error) {
      console.error('Error adding ESP device:', error);
      throw error;
    }
  }
  
  /**
   * Remove an ESP device
   * 
   * @param {string} ip - IP address of the device to remove
   * @returns {Promise} - Promise resolving when device is removed
   */
  async removeEspDevice(ip) {
    try {
      const savedEspDevices = await AsyncStorage.getItem('esp_devices');
      const espDevices = savedEspDevices ? JSON.parse(savedEspDevices) : [];
      
      const filteredDevices = espDevices.filter(d => d.ip !== ip);
      await AsyncStorage.setItem('esp_devices', JSON.stringify(filteredDevices));
      return true;
    } catch (error) {
      console.error('Error removing ESP device:', error);
      throw error;
    }
  }
}

export default new BoardCommunicationService();

