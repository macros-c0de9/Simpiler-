import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Arduino code editor component with syntax highlighting
 */
const CodeEditor = ({ 
  code, 
  onChange, 
  readOnly = false,
  style = {},
  lineNumbers = true,
  highlightActiveLine = true,
  fontSize = 14,
  tabSize = 2
}) => {
  const { colors } = useTheme();
  const [lines, setLines] = useState([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  
  // Process code into lines with syntax highlighting
  useEffect(() => {
    if (!code) return;
    
    const codeLines = code.split('\n');
    const processedLines = codeLines.map(line => highlightSyntax(line));
    setLines(processedLines);
  }, [code]);
  
  // Handle text changes
  const handleChangeText = (text) => {
    if (readOnly) return;
    
    // Update active line index based on cursor position
    const lines = text.split('\n');
    const cursorPosition = inputRef.current?.selectionStart || 0;
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 for newline character
      if (cursorPosition < currentPos) {
        setActiveLineIndex(i);
        break;
      }
    }
    
    onChange(text);
  };
  
  // Handle tab key
  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Tab') {
      e.preventDefault();
      
      // Insert spaces for tab
      const spaces = ' '.repeat(tabSize);
      const newText = code.substring(0, inputRef.current.selectionStart) + 
                      spaces + 
                      code.substring(inputRef.current.selectionEnd);
      
      onChange(newText);
      
      // Move cursor after inserted tab
      setTimeout(() => {
        const newCursorPosition = inputRef.current.selectionStart + tabSize;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
      
      return false;
    }
    return true;
  };
  
  // Syntax highlighting function
  const highlightSyntax = (text) => {
    // Arduino keywords
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return',
      'setup', 'loop', 'switch', 'case', 'default', 'void', 'boolean',
      'char', 'byte', 'int', 'unsigned', 'long', 'float', 'double',
      'string', 'array', 'pinMode', 'digitalWrite', 'digitalRead',
      'analogRead', 'analogWrite', 'delay', 'delayMicroseconds',
      'millis', 'micros', 'true', 'false', 'HIGH', 'LOW', 'INPUT',
      'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'serial', 'Serial'
    ];
    
    // Simple tokenization for highlighting
    let result = [];
    let currentToken = '';
    let inString = false;
    let inComment = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1] || '';
      
      // Handle comments
      if (char === '/' && nextChar === '/' && !inString) {
        // Start of line comment
        if (currentToken) {
          result.push({ text: currentToken, type: 'normal' });
          currentToken = '';
        }
        result.push({ text: text.substring(i), type: 'comment' });
        break;
      }
      
      // Handle strings
      if (char === '"' && !inComment) {
        if (inString) {
          // End of string
          currentToken += char;
          result.push({ text: currentToken, type: 'string' });
          currentToken = '';
          inString = false;
        } else {
          // Start of string
          if (currentToken) {
            result.push({ text: currentToken, type: 'normal' });
            currentToken = '';
          }
          currentToken = char;
          inString = true;
        }
        continue;
      }
      
      // Inside string, just add character
      if (inString) {
        currentToken += char;
        continue;
      }
      
      // Handle word boundaries
      if (/[a-zA-Z0-9_]/.test(char)) {
        currentToken += char;
      } else {
        // End of word
        if (currentToken) {
          // Check if it's a keyword
          if (keywords.includes(currentToken)) {
            result.push({ text: currentToken, type: 'keyword' });
          } else if (/^\d+$/.test(currentToken)) {
            result.push({ text: currentToken, type: 'number' });
          } else {
            result.push({ text: currentToken, type: 'normal' });
          }
          currentToken = '';
        }
        
        // Add non-word character
        result.push({ text: char, type: 'normal' });
      }
    }
    
    // Add any remaining token
    if (currentToken) {
      if (keywords.includes(currentToken)) {
        result.push({ text: currentToken, type: 'keyword' });
      } else if (/^\d+$/.test(currentToken)) {
        result.push({ text: currentToken, type: 'number' });
      } else {
        result.push({ text: currentToken, type: 'normal' });
      }
    }
    
    return result;
  };
  
  // Render line with syntax highlighting
  const renderLine = (line, index) => {
    return (
      <View 
        key={index} 
        style={[
          styles.line,
          highlightActiveLine && index === activeLineIndex && styles.activeLine,
          highlightActiveLine && index === activeLineIndex && { backgroundColor: colors.activeLineBackground }
        ]}
      >
        {line.map((token, tokenIndex) => (
          <Text 
            key={tokenIndex} 
            style={[
              styles.token,
              { fontSize },
              token.type === 'keyword' && { color: colors.keyword },
              token.type === 'string' && { color: colors.string },
              token.type === 'number' && { color: colors.number },
              token.type === 'comment' && { color: colors.comment },
              token.type === 'normal' && { color: colors.text }
            ]}
          >
            {token.text}
          </Text>
        ))}
      </View>
    );
  };
  
  // Render line numbers
  const renderLineNumbers = () => {
    if (!lineNumbers) return null;
    
    return (
      <View style={[styles.lineNumbers, { backgroundColor: colors.lineNumberBackground }]}>
        {lines.map((_, index) => (
          <Text 
            key={index} 
            style={[
              styles.lineNumber, 
              { color: colors.lineNumber, fontSize },
              highlightActiveLine && index === activeLineIndex && { color: colors.activeLineNumber }
            ]}
          >
            {index + 1}
          </Text>
        ))}
      </View>
    );
  };
  
  return (
    <View style={[styles.container, style, { backgroundColor: colors.editorBackground }]}>
      <View style={styles.editorContainer}>
        {renderLineNumbers()}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.codeContainer}
          horizontal={true}
          showsHorizontalScrollIndicator={true}
        >
          <View style={styles.codeContent}>
            {lines.map(renderLine)}
          </View>
        </ScrollView>
      </View>
      
      <TextInput
        ref={inputRef}
        style={[
          styles.hiddenInput,
          { color: colors.text, fontSize }
        ]}
        multiline
        value={code}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        editable={!readOnly}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  editorContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  lineNumbers: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  lineNumber: {
    height: 20,
    textAlign: 'right',
  },
  codeContainer: {
    flex: 1,
  },
  codeContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 20,
  },
  activeLine: {
    borderRadius: 2,
  },
  token: {
    height: 20,
    fontFamily: 'monospace',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 1,
  },
});

export default CodeEditor;

