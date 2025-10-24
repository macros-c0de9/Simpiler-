"""
Tests for the Arduino compiler module
"""

import os
import pytest
import tempfile
from unittest.mock import patch, MagicMock

# Import the compiler module
from compiler import ArduinoCompiler

class TestArduinoCompiler:
    """Test cases for the ArduinoCompiler class"""
    
    @patch('subprocess.run')
    def test_init(self, mock_run):
        """Test compiler initialization"""
        # Mock subprocess.run to avoid actual command execution
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Arduino CLI Version: 0.21.1"
        )
        
        # Create compiler instance
        compiler = ArduinoCompiler()
        
        # Check that Arduino CLI was checked
        mock_run.assert_called()
        
        # Check that compiler was initialized
        assert compiler is not None
    
    @patch('subprocess.run')
    def test_get_supported_boards(self, mock_run):
        """Test getting supported boards"""
        # Mock subprocess.run to return sample board data
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="""
            {
                "boards": [
                    {
                        "name": "Arduino Uno",
                        "fqbn": "arduino:avr:uno"
                    },
                    {
                        "name": "ESP32 Dev Module",
                        "fqbn": "esp32:esp32:esp32"
                    },
                    {
                        "name": "Generic ESP8266 Module",
                        "fqbn": "esp8266:esp8266:generic"
                    },
                    {
                        "name": "Other Board",
                        "fqbn": "other:board:type"
                    }
                ]
            }
            """
        )
        
        # Create compiler instance
        compiler = ArduinoCompiler()
        
        # Get supported boards
        boards = compiler.get_supported_boards()
        
        # Check that only Arduino, ESP32, and ESP8266 boards are included
        assert len(boards) == 3
        assert boards[0]['id'] == 'arduino:avr:uno'
        assert boards[1]['id'] == 'esp32:esp32:esp32'
        assert boards[2]['id'] == 'esp8266:esp8266:generic'
    
    @patch('subprocess.run')
    def test_get_board_details(self, mock_run):
        """Test getting board details"""
        # Mock subprocess.run to return sample board data and details
        def mock_run_side_effect(*args, **kwargs):
            if 'board' in args[0] and 'listall' in args[0]:
                return MagicMock(
                    returncode=0,
                    stdout="""
                    {
                        "boards": [
                            {
                                "name": "Arduino Uno",
                                "fqbn": "arduino:avr:uno"
                            }
                        ]
                    }
                    """
                )
            elif 'board' in args[0] and 'details' in args[0]:
                return MagicMock(
                    returncode=0,
                    stdout="""
                    {
                        "fqbn": "arduino:avr:uno",
                        "name": "Arduino Uno",
                        "cpu": "ATmega328P",
                        "flash": {"size": 32768},
                        "ram": {"size": 2048},
                        "upload_protocols": ["serial"],
                        "programming_protocols": ["avr109", "stk500v1", "arduino"]
                    }
                    """
                )
            return MagicMock(returncode=0, stdout="")
        
        mock_run.side_effect = mock_run_side_effect
        
        # Create compiler instance
        compiler = ArduinoCompiler()
        
        # Get board details
        board = compiler.get_board_details('arduino:avr:uno')
        
        # Check board details
        assert board is not None
        assert board['id'] == 'arduino:avr:uno'
        assert board['name'] == 'Arduino Uno'
        assert board['cpu'] == 'ATmega328P'
        assert board['flash_size'] == 32768
        assert board['ram_size'] == 2048
        assert 'serial' in board['upload_protocols']
        assert 'avr109' in board['programming_protocols']
    
    @patch('subprocess.run')
    @patch('os.path.exists')
    @patch('os.path.getsize')
    @patch('shutil.copy2')
    def test_compile_success(self, mock_copy2, mock_getsize, mock_exists, mock_run):
        """Test successful compilation"""
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(suffix='.ino') as temp_file:
            # Write some Arduino code to the file
            temp_file.write(b"""
            void setup() {
              pinMode(LED_BUILTIN, OUTPUT);
            }
            
            void loop() {
              digitalWrite(LED_BUILTIN, HIGH);
              delay(1000);
              digitalWrite(LED_BUILTIN, LOW);
              delay(1000);
            }
            """)
            temp_file.flush()
            
            # Mock subprocess.run to simulate successful compilation
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout="Compilation successful",
                stderr=""
            )
            
            # Mock os.path.exists to simulate binary file creation
            mock_exists.return_value = True
            
            # Mock os.path.getsize to return a file size
            mock_getsize.return_value = 4096
            
            # Create compiler instance
            compiler = ArduinoCompiler()
            
            # Compile the code
            binary_path, messages = compiler.compile(
                temp_file.name,
                'arduino:avr:uno'
            )
            
            # Check that compilation was successful
            assert binary_path is not None
            assert len(messages) > 0
            assert messages[0]['type'] == 'info'
            assert 'Compilation successful' in messages[0]['message']
    
    @patch('subprocess.run')
    def test_compile_failure(self, mock_run):
        """Test compilation failure"""
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(suffix='.ino') as temp_file:
            # Write some invalid Arduino code to the file
            temp_file.write(b"""
            void setup() {
              pinMode(LED_BUILTIN, OUTPUT);
            
            void loop() {
              digitalWrite(LED_BUILTIN, HIGH);
              delay(1000);
              digitalWrite(LED_BUILTIN, LOW);
              delay(1000);
            }
            """)
            temp_file.flush()
            
            # Mock subprocess.run to simulate compilation failure
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout="",
                stderr="error: expected '}' at end of input"
            )
            
            # Create compiler instance
            compiler = ArduinoCompiler()
            
            # Compile the code
            binary_path, messages = compiler.compile(
                temp_file.name,
                'arduino:avr:uno'
            )
            
            # Check that compilation failed
            assert binary_path is None
            assert len(messages) > 0
            assert messages[0]['type'] == 'error'

