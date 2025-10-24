import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SerialMonitor = forwardRef(({ data = [], onSend, onClear }, ref) => {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollViewRef = React.useRef(null);
  
  // Expose scrollToEnd method to parent component
  useImperativeHandle(ref, () => ({
    scrollToEnd: () => {
      if (autoscroll && scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }
  }));
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  // Send data
  const handleSend = () => {
    if (!input.trim()) return;
    
    onSend(input);
    setInput('');
  };
  
  // Toggle autoscroll
  const toggleAutoscroll = () => {
    setAutoscroll(!autoscroll);
  };
  
  // Render serial data item
  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.dataItem}>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          {formatTimestamp(item.timestamp)}
        </Text>
        <Text style={[styles.dataText, { color: colors.text }]}>
          {item.data}
        </Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Serial output */}
      <View style={[styles.outputContainer, { backgroundColor: colors.inputBackground }]}>
        {data.length > 0 ? (
          <FlatList
            ref={scrollViewRef}
            data={data}
            renderItem={renderItem}
            keyExtractor={(_, index) => `data-${index}`}
            onContentSizeChange={() => {
              if (autoscroll) {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }
            }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No data received yet
            </Text>
          </View>
        )}
      </View>
      
      {/* Control buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.buttonCancel }]}
          onPress={onClear}
        >
          <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          <Text style={styles.controlButtonText}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: autoscroll ? colors.success : colors.warning }
          ]}
          onPress={toggleAutoscroll}
        >
          <Ionicons
            name={autoscroll ? "arrow-down-circle-outline" : "arrow-down-circle-sharp"}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.controlButtonText}>
            {autoscroll ? "Autoscroll On" : "Autoscroll Off"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.inputBackground, color: colors.text }
          ]}
          placeholder="Enter data to send..."
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
        >
          <Ionicons name="send-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  outputContainer: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  dataItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    marginRight: 8,
  },
  dataText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SerialMonitor;

