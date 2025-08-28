import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import CodeEditor from '../editor/CodeEditor';
import CompilationService from '../services/CompilationService';
import BoardCommunicationService from '../services/BoardCommunicationService';
import BoardSelector from '../components/BoardSelector';
import SerialMonitor from '../components/SerialMonitor';
import { useTheme } from '../context/ThemeContext';

const EditorScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get project from route params or create a new one
  const projectParam = route.params?.project;
  
  // State
  const [project, setProject] = useState(projectParam || {
    id: null,
    name: 'New Project',
    code: '// Arduino code\n\nvoid setup() {\n  // Initialize components\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  // Main code\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}',
    board_type: 'arduino:avr:uno'
  });
  
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [availableBoards, setAvailableBoards] = useState([]);
  const [connectedBoard, setConnectedBoard] = useState(null);
  const [serialData, setSerialData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const serialMonitorRef = useRef(null);
  
  // Load available boards
  useEffect(() => {
    loadAvailableBoards();
    
    // Set up serial monitor callback
    const serialCallback = (data) => {
      setSerialData(prev => [...prev, { timestamp: new Date(), data }]);
      if (serialMonitorRef.current) {
        serialMonitorRef.current.scrollToEnd();
      }
    };
    
    BoardCommunicationService.addSerialMonitorCallback(serialCallback);
    
    return () => {
      // Clean up
      BoardCommunicationService.removeSerialMonitorCallback(serialCallback);
      BoardCommunicationService.disconnectFromBoard();
    };
  }, []);
  
  // Load available boards
  const loadAvailableBoards = async () => {
    try {
      const boards = await BoardCommunicationService.getAvailableBoards();
      setAvailableBoards(boards);
    } catch (error) {
      console.error('Error loading boards:', error);
      Alert.alert('Error', 'Failed to load available boards');
    }
  };
  
  // Handle code changes
  const handleCodeChange = (newCode) => {
    setProject(prev => ({ ...prev, code: newCode }));
  };
  
  // Save project
  const saveProject = async () => {
    try {
      setIsSaving(true);
      
      // Get existing projects
      const projectsJson = await AsyncStorage.getItem('projects');
      const projects = projectsJson ? JSON.parse(projectsJson) : [];
      
      // Check if project exists
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      if (existingIndex !== -1) {
        // Update existing project
        projects[existingIndex] = {
          ...projects[existingIndex],
          ...project,
          updated_at: new Date().toISOString()
        };
      } else {
        // Create new project
        const newProject = {
          ...project,
          id: `local_${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        projects.push(newProject);
        setProject(newProject);
      }
      
      // Save projects
      await AsyncStorage.setItem('projects', JSON.stringify(projects));
      
      Alert.alert('Success', 'Project saved successfully');
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Error', 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Compile code
  const compileCode = async () => {
    try {
      setIsCompiling(true);
      setCompilationResult(null);
      
      // Save project first
      await saveProject();
      
      // Compile code
      const result = await CompilationService.compileCode(
        project.code,
        project.board_type,
        project.id
      );
      
      // Check compilation status
      if (result.status === 'queued' || result.status === 'compiling') {
        // Poll for status
        const pollInterval = setInterval(async () => {
          const status = await CompilationService.getCompilationStatus(result.compilation_id);
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            setCompilationResult(status);
            setIsCompiling(false);
            
            if (status.status === 'completed') {
              // Download binary
              const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.bin`;
              await CompilationService.downloadBinary(result.compilation_id, fileName);
              
              Alert.alert('Success', 'Compilation successful! Binary downloaded and ready for upload.');
            } else {
              Alert.alert('Compilation Failed', status.messages?.[0]?.message || 'Unknown error');
            }
          }
        }, 2000);
      } else {
        // Immediate result
        setCompilationResult(result);
        setIsCompiling(false);
        
        if (result.status === 'completed') {
          // Download binary
          const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.bin`;
          await CompilationService.downloadBinary(result.compilation_id, fileName);
          
          Alert.alert('Success', 'Compilation successful! Binary downloaded and ready for upload.');
        } else {
          Alert.alert('Compilation Failed', result.messages?.[0]?.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Error compiling code:', error);
      Alert.alert('Error', `Compilation failed: ${error.message}`);
      setIsCompiling(false);
    }
  };
  
  // Connect to board
  const connectToBoard = async (board) => {
    try {
      await BoardCommunicationService.connectToBoard(board);
      setConnectedBoard(board);
      setShowBoardSelector(false);
      Alert.alert('Connected', `Connected to ${board.name}`);
    } catch (error) {
      console.error('Error connecting to board:', error);
      Alert.alert('Connection Error', `Failed to connect to ${board.name}: ${error.message}`);
    }
  };
  
  // Upload binary to board
  const uploadBinary = async () => {
    try {
      if (!connectedBoard) {
        Alert.alert('No Board Connected', 'Please connect to a board first');
        setShowBoardSelector(true);
        return;
      }
      
      if (!compilationResult || compilationResult.status !== 'completed') {
        Alert.alert('No Binary', 'Please compile your code first');
        return;
      }
      
      setIsUploading(true);
      setUploadProgress(0);
      
      // Get binary path
      const binariesJson = await AsyncStorage.getItem('compiled_binaries');
      const binaries = binariesJson ? JSON.parse(binariesJson) : [];
      
      const binary = binaries.find(b => b.id === compilationResult.compilation_id);
      
      if (!binary) {
        throw new Error('Binary not found');
      }
      
      // Upload binary
      await BoardCommunicationService.uploadBinary(
        binary.uri,
        (progress) => setUploadProgress(progress)
      );
      
      Alert.alert('Success', 'Binary uploaded successfully!');
    } catch (error) {
      console.error('Error uploading binary:', error);
      Alert.alert('Upload Error', `Failed to upload binary: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Send data to board
  const sendSerialData = async (data) => {
    try {
      if (!connectedBoard) {
        Alert.alert('No Board Connected', 'Please connect to a board first');
        return;
      }
      
      await BoardCommunicationService.sendData(data);
    } catch (error) {
      console.error('Error sending data:', error);
      Alert.alert('Error', `Failed to send data: ${error.message}`);
    }
  };
  
  // Clear serial monitor
  const clearSerialMonitor = () => {
    setSerialData([]);
  };
  
  // Render board selector modal
  const renderBoardSelector = () => {
    return (
      <Modal
        visible={showBoardSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBoardSelector(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Board</Text>
            
            <BoardSelector
              boards={availableBoards}
              onSelectBoard={connectToBoard}
              onRefresh={loadAvailableBoards}
              onAddEspDevice={(device) => {
                BoardCommunicationService.addEspDevice(device)
                  .then(loadAvailableBoards);
              }}
            />
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.buttonCancel }]}
              onPress={() => setShowBoardSelector(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render serial monitor modal
  const renderSerialMonitor = () => {
    return (
      <Modal
        visible={showSerialMonitor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSerialMonitor(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Serial Monitor</Text>
            
            <SerialMonitor
              ref={serialMonitorRef}
              data={serialData}
              onSend={sendSerialData}
              onClear={clearSerialMonitor}
            />
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.buttonCancel }]}
              onPress={() => setShowSerialMonitor(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {project.name}
          </Text>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={saveProject}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="save-outline" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Code Editor */}
        <View style={styles.editorContainer}>
          <CodeEditor
            code={project.code}
            onChange={handleCodeChange}
            style={styles.editor}
          />
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={compileCode}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="code-slash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Compile</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: connectedBoard ? colors.success : colors.secondary }
            ]}
            onPress={() => setShowBoardSelector(true)}
          >
            <Ionicons name="hardware-chip-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {connectedBoard ? 'Change Board' : 'Connect Board'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              { 
                backgroundColor: isUploading ? colors.warning : colors.primary,
                opacity: (!connectedBoard || !compilationResult || compilationResult.status !== 'completed') ? 0.5 : 1
              }
            ]}
            onPress={uploadBinary}
            disabled={isUploading || !connectedBoard || !compilationResult || compilationResult.status !== 'completed'}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{`${Math.round(uploadProgress * 100)}%`}</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              { 
                backgroundColor: colors.info,
                opacity: !connectedBoard ? 0.5 : 1
              }
            ]}
            onPress={() => setShowSerialMonitor(true)}
            disabled={!connectedBoard}
          >
            <Ionicons name="terminal-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Monitor</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {/* Modals */}
      {renderBoardSelector()}
      {renderSerialMonitor()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  editor: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default EditorScreen;

