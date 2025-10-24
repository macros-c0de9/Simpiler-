/**
 * CompilationService.js
 * Handles communication with the server for code compilation
 */

import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

class CompilationService {
  /**
   * Compile Arduino code for a specific board
   * 
   * @param {string} code - Arduino code to compile
   * @param {string} boardType - Board identifier (FQBN)
   * @param {string} projectId - Optional project ID
   * @param {Array} libraries - Optional array of libraries to include
   * @returns {Promise} - Promise resolving to compilation result
   */
  async compileCode(code, boardType, projectId = null, libraries = []) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/v1/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code,
          board_type: boardType,
          project_id: projectId,
          libraries
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Compilation failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Compilation error:', error);
      throw error;
    }
  }
  
  /**
   * Get compilation status
   * 
   * @param {string} compilationId - Compilation ID
   * @returns {Promise} - Promise resolving to compilation status
   */
  async getCompilationStatus(compilationId) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/v1/compile/${compilationId}`, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get compilation status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get compilation status error:', error);
      throw error;
    }
  }
  
  /**
   * Download compiled binary
   * 
   * @param {string} compilationId - Compilation ID
   * @param {string} fileName - File name to save the binary as
   * @returns {Promise} - Promise resolving to the local file URI
   */
  async downloadBinary(compilationId, fileName) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Create directory if it doesn't exist
      const binariesDir = `${FileSystem.documentDirectory}binaries`;
      const dirInfo = await FileSystem.getInfoAsync(binariesDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(binariesDir, { intermediates: true });
      }
      
      // Download the binary
      const fileUri = `${binariesDir}/${fileName}`;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_BASE_URL}/v1/binaries/${compilationId}`,
        fileUri,
        {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      // Save binary info to AsyncStorage
      const binariesJson = await AsyncStorage.getItem('compiled_binaries');
      const binaries = binariesJson ? JSON.parse(binariesJson) : [];
      
      binaries.push({
        id: compilationId,
        fileName,
        uri,
        timestamp: new Date().toISOString(),
        boardType: (await this.getCompilationStatus(compilationId)).board_type
      });
      
      await AsyncStorage.setItem('compiled_binaries', JSON.stringify(binaries));
      
      return uri;
    } catch (error) {
      console.error('Download binary error:', error);
      throw error;
    }
  }
  
  /**
   * Get list of supported boards
   * 
   * @returns {Promise} - Promise resolving to array of board information
   */
  async getSupportedBoards() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/v1/boards`, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get board list');
      }
      
      const data = await response.json();
      return data.boards;
    } catch (error) {
      console.error('Get boards error:', error);
      throw error;
    }
  }
  
  /**
   * Get board details
   * 
   * @param {string} boardId - Board identifier (FQBN)
   * @returns {Promise} - Promise resolving to board details
   */
  async getBoardDetails(boardId) {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/v1/boards/${boardId}`, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get board details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get board details error:', error);
      throw error;
    }
  }
}

export default new CompilationService();

