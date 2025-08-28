import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DEFAULT_THEME } from '../config';

// Create context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [themeName, setThemeName] = useState(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        
        if (savedTheme === 'system') {
          // Use system theme
          setThemeName(deviceTheme || DEFAULT_THEME);
        } else if (savedTheme && THEMES[savedTheme]) {
          // Use saved theme
          setThemeName(savedTheme);
        } else {
          // Use default theme
          setThemeName(DEFAULT_THEME);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setThemeName(DEFAULT_THEME);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTheme();
  }, [deviceTheme]);
  
  // Update theme when device theme changes
  useEffect(() => {
    const updateSystemTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        
        if (savedTheme === 'system' && deviceTheme) {
          setThemeName(deviceTheme);
        }
      } catch (error) {
        console.error('Error updating system theme:', error);
      }
    };
    
    updateSystemTheme();
  }, [deviceTheme]);
  
  // Set theme
  const setTheme = async (name) => {
    try {
      if (name === 'system') {
        // Use system theme
        await AsyncStorage.setItem('theme', 'system');
        setThemeName(deviceTheme || DEFAULT_THEME);
      } else if (THEMES[name]) {
        // Use specified theme
        await AsyncStorage.setItem('theme', name);
        setThemeName(name);
      } else {
        // Invalid theme name
        console.error(`Invalid theme name: ${name}`);
      }
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };
  
  // Get current theme
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];
  
  // Context value
  const value = {
    theme,
    themeName,
    setTheme,
    isLoading,
    colors: theme.colors,
    isDark: themeName === 'dark'
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

