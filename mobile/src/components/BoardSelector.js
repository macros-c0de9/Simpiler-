import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const BoardSelector = ({ 
  boards = [], 
  onSelectBoard, 
  onRefresh,
  onAddEspDevice
}) => {
  const { colors } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddEspForm, setShowAddEspForm] = useState(false);
  const [espName, setEspName] = useState('');
  const [espIp, setEspIp] = useState('');
  const [espPort, setEspPort] = useState('8266');
  
  // Refresh boards list
  const refreshBoards = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing boards:', error);
      Alert.alert('Error', 'Failed to refresh boards list');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Add ESP device
  const handleAddEspDevice = () => {
    // Validate inputs
    if (!espName.trim()) {
      Alert.alert('Error', 'Please enter a name for the device');
      return;
    }
    
    if (!espIp.trim() || !/^(\d{1,3}\.){3}\d{1,3}$/.test(espIp)) {
      Alert.alert('Error', 'Please enter a valid IP address');
      return;
    }
    
    const port = parseInt(espPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      Alert.alert('Error', 'Please enter a valid port number (1-65535)');
      return;
    }
    
    // Add device
    onAddEspDevice({
      name: espName,
      ip: espIp,
      port
    });
    
    // Reset form
    setEspName('');
    setEspIp('');
    setEspPort('8266');
    setShowAddEspForm(false);
  };
  
  // Render board item
  const renderBoardItem = ({ item }) => {
    // Determine icon based on board type
    let icon = 'hardware-chip-outline';
    let color = colors.primary;
    
    if (item.type === 'usb') {
      icon = 'usb-outline';
      color = colors.success;
    } else if (item.type === 'ble') {
      icon = 'bluetooth-outline';
      color = colors.info;
    } else if (item.type === 'wifi') {
      icon = 'wifi-outline';
      color = colors.warning;
    }
    
    return (
      <TouchableOpacity
        style={[styles.boardItem, { backgroundColor: colors.cardBackground }]}
        onPress={() => onSelectBoard(item)}
      >
        <View style={[styles.boardIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#FFFFFF" />
        </View>
        
        <View style={styles.boardInfo}>
          <Text style={[styles.boardName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.boardType, { color: colors.textSecondary }]}>
            {item.type.toUpperCase()} - {item.id}
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };
  
  // Render ESP device form
  const renderEspDeviceForm = () => {
    if (!showAddEspForm) return null;
    
    return (
      <View style={[styles.formContainer, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Add ESP Device</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="Device Name (e.g. ESP32 Living Room)"
          placeholderTextColor={colors.textSecondary}
          value={espName}
          onChangeText={setEspName}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="IP Address (e.g. 192.168.1.100)"
          placeholderTextColor={colors.textSecondary}
          value={espIp}
          onChangeText={setEspIp}
          keyboardType="numeric"
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="Port (default: 8266)"
          placeholderTextColor={colors.textSecondary}
          value={espPort}
          onChangeText={setEspPort}
          keyboardType="numeric"
        />
        
        <View style={styles.formButtons}>
          <TouchableOpacity
            style={[styles.formButton, { backgroundColor: colors.buttonCancel }]}
            onPress={() => setShowAddEspForm(false)}
          >
            <Text style={styles.formButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.formButton, { backgroundColor: colors.primary }]}
            onPress={handleAddEspDevice}
          >
            <Text style={styles.formButtonText}>Add Device</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={refreshBoards}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.info }]}
          onPress={() => setShowAddEspForm(!showAddEspForm)}
        >
          <Ionicons name="add-outline" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Add ESP Device</Text>
        </TouchableOpacity>
      </View>
      
      {/* ESP device form */}
      {renderEspDeviceForm()}
      
      {/* Boards list */}
      {boards.length > 0 ? (
        <FlatList
          data={boards}
          renderItem={renderBoardItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.boardsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No boards found
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Connect a board via USB, Bluetooth, or add an ESP device
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  boardsList: {
    paddingBottom: 16,
  },
  boardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  boardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  boardInfo: {
    flex: 1,
  },
  boardName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  boardType: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  formContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  formButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  formButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default BoardSelector;

