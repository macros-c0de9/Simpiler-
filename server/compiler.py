"""
Simpiler - Arduino Compiler Module
Handles the compilation of Arduino code for various boards
"""

import os
import subprocess
import tempfile
import shutil
import logging
import json
import time
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ArduinoCompiler:
    """
    Arduino code compiler using Arduino CLI
    """
    
    def __init__(self, arduino_cli_path=None, work_dir=None):
        """
        Initialize the Arduino compiler
        
        Args:
            arduino_cli_path (str): Path to the Arduino CLI executable
            work_dir (str): Working directory for compilation
        """
        self.arduino_cli_path = arduino_cli_path or os.environ.get('ARDUINO_CLI_PATH', 'arduino-cli')
        self.work_dir = work_dir or os.environ.get('ARDUINO_WORK_DIR', '/tmp/simpiler/work')
        
        # Ensure work directory exists
        os.makedirs(self.work_dir, exist_ok=True)
        
        # Check if Arduino CLI is available
        self._check_arduino_cli()
        
        # Initialize Arduino CLI
        self._init_arduino_cli()
        
        # Cache for board information
        self._boards_cache = None
    
    def _check_arduino_cli(self):
        """Check if Arduino CLI is available and working"""
        try:
            result = subprocess.run(
                [self.arduino_cli_path, 'version'],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Arduino CLI version: {result.stdout.strip()}")
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            logger.error(f"Arduino CLI not available: {str(e)}")
            raise RuntimeError("Arduino CLI not available. Please install it first.")
    
    def _init_arduino_cli(self):
        """Initialize Arduino CLI with required platforms and libraries"""
        try:
            # Update index
            logger.info("Updating Arduino CLI index...")
            subprocess.run(
                [self.arduino_cli_path, 'core', 'update-index'],
                check=True
            )
            
            # Install required platforms
            platforms = [
                'arduino:avr',        # For Arduino Uno
                'esp32:esp32',        # For ESP32
                'esp8266:esp8266'     # For ESP8266
            ]
            
            for platform in platforms:
                logger.info(f"Installing platform: {platform}")
                try:
                    subprocess.run(
                        [self.arduino_cli_path, 'core', 'install', platform],
                        check=True
                    )
                except subprocess.SubprocessError as e:
                    logger.warning(f"Failed to install platform {platform}: {str(e)}")
            
            logger.info("Arduino CLI initialization completed")
        
        except subprocess.SubprocessError as e:
            logger.error(f"Failed to initialize Arduino CLI: {str(e)}")
            raise RuntimeError(f"Failed to initialize Arduino CLI: {str(e)}")
    
    def get_supported_boards(self):
        """
        Get a list of supported boards
        
        Returns:
            list: List of board information dictionaries
        """
        if self._boards_cache is not None:
            return self._boards_cache
        
        try:
            result = subprocess.run(
                [self.arduino_cli_path, 'board', 'listall', '--format', 'json'],
                capture_output=True,
                text=True,
                check=True
            )
            
            boards_data = json.loads(result.stdout)
            
            # Filter and format board information
            supported_boards = []
            for board in boards_data.get('boards', []):
                # Only include Arduino, ESP32, and ESP8266 boards
                if any(platform in board.get('fqbn', '') for platform in ['arduino:avr', 'esp32:esp32', 'esp8266:esp8266']):
                    supported_boards.append({
                        'id': board.get('fqbn', ''),
                        'name': board.get('name', ''),
                        'platform': ':'.join(board.get('fqbn', '').split(':')[:2]) if board.get('fqbn') else '',
                        'description': f"{board.get('name', '')} ({board.get('fqbn', '')})"
                    })
            
            self._boards_cache = supported_boards
            return supported_boards
        
        except (subprocess.SubprocessError, json.JSONDecodeError) as e:
            logger.error(f"Failed to get board list: {str(e)}")
            return []
    
    def get_board_details(self, board_id):
        """
        Get detailed information for a specific board
        
        Args:
            board_id (str): Board identifier (FQBN)
            
        Returns:
            dict: Board details or None if not found
        """
        boards = self.get_supported_boards()
        
        # Find the board in the list
        for board in boards:
            if board['id'] == board_id:
                # Get additional details
                try:
                    result = subprocess.run(
                        [self.arduino_cli_path, 'board', 'details', '--format', 'json', board_id],
                        capture_output=True,
                        text=True,
                        check=False  # Don't raise exception on non-zero exit
                    )
                    
                    if result.returncode == 0:
                        details = json.loads(result.stdout)
                        
                        # Extract relevant information
                        board_details = board.copy()
                        
                        if 'cpu' in details:
                            board_details['cpu'] = details['cpu']
                        
                        if 'flash' in details:
                            board_details['flash_size'] = details.get('flash', {}).get('size', 0)
                        
                        if 'ram' in details:
                            board_details['ram_size'] = details.get('ram', {}).get('size', 0)
                        
                        # Add upload protocols
                        board_details['upload_protocols'] = details.get('upload_protocols', ['serial'])
                        
                        # Add programming protocols
                        board_details['programming_protocols'] = details.get('programming_protocols', [])
                        
                        # Add documentation URL
                        if 'arduino:avr:uno' in board_id:
                            board_details['documentation_url'] = 'https://docs.arduino.cc/hardware/uno-rev3'
                        elif 'esp32:esp32' in board_id:
                            board_details['documentation_url'] = 'https://docs.espressif.com/projects/esp-idf/en/latest/'
                        elif 'esp8266:esp8266' in board_id:
                            board_details['documentation_url'] = 'https://arduino-esp8266.readthedocs.io/en/latest/'
                        
                        return board_details
                
                except (subprocess.SubprocessError, json.JSONDecodeError) as e:
                    logger.error(f"Failed to get board details: {str(e)}")
                    # Return basic information if detailed info fails
                    return board
                
                # Return basic information if detailed info fails
                return board
        
        # Board not found
        return None
    
    def compile(self, sketch_path, board_type, libraries=None):
        """
        Compile Arduino code for a specific board
        
        Args:
            sketch_path (str): Path to the Arduino sketch file
            board_type (str): Board identifier (FQBN)
            libraries (list): List of libraries to include
            
        Returns:
            tuple: (binary_path, messages) - Path to compiled binary and compilation messages
        """
        logger.info(f"Compiling sketch: {sketch_path} for board: {board_type}")
        
        # Create a temporary directory for the sketch
        with tempfile.TemporaryDirectory(dir=self.work_dir) as temp_dir:
            try:
                # Copy the sketch to the temporary directory
                sketch_filename = os.path.basename(sketch_path)
                sketch_name = os.path.splitext(sketch_filename)[0]
                temp_sketch_dir = os.path.join(temp_dir, sketch_name)
                os.makedirs(temp_sketch_dir, exist_ok=True)
                
                temp_sketch_path = os.path.join(temp_sketch_dir, sketch_filename)
                shutil.copy2(sketch_path, temp_sketch_path)
                
                # Install required libraries
                if libraries:
                    for lib in libraries:
                        lib_name = lib.get('name')
                        lib_version = lib.get('version')
                        
                        if lib_name:
                            lib_install_cmd = [self.arduino_cli_path, 'lib', 'install']
                            
                            if lib_version:
                                lib_install_cmd.append(f"{lib_name}@{lib_version}")
                            else:
                                lib_install_cmd.append(lib_name)
                            
                            try:
                                subprocess.run(lib_install_cmd, check=True)
                                logger.info(f"Installed library: {lib_name}")
                            except subprocess.SubprocessError as e:
                                logger.warning(f"Failed to install library {lib_name}: {str(e)}")
                
                # Compile the sketch
                compile_cmd = [
                    self.arduino_cli_path,
                    'compile',
                    '--fqbn', board_type,
                    '--output-dir', temp_dir,
                    '--verbose',
                    temp_sketch_dir
                ]
                
                start_time = time.time()
                result = subprocess.run(
                    compile_cmd,
                    capture_output=True,
                    text=True,
                    check=False  # Don't raise exception on compilation error
                )
                compile_time = time.time() - start_time
                
                # Parse compilation output
                messages = []
                
                if result.returncode == 0:
                    messages.append({
                        'type': 'info',
                        'message': f'Compilation successful in {compile_time:.2f} seconds'
                    })
                    
                    # Find the compiled binary
                    binary_name = f"{sketch_name}.{self._get_binary_extension(board_type)}"
                    binary_path = os.path.join(temp_dir, binary_name)
                    
                    if os.path.exists(binary_path):
                        # Copy binary to a temporary location that won't be deleted
                        output_binary = tempfile.mktemp(suffix=f".{self._get_binary_extension(board_type)}")
                        shutil.copy2(binary_path, output_binary)
                        
                        # Get binary size
                        binary_size = os.path.getsize(output_binary)
                        messages.append({
                            'type': 'info',
                            'message': f'Binary size: {binary_size} bytes'
                        })
                        
                        return output_binary, messages
                    else:
                        messages.append({
                            'type': 'error',
                            'message': 'Binary file not found after compilation'
                        })
                        return None, messages
                else:
                    # Compilation failed
                    error_output = result.stderr or result.stdout
                    
                    # Parse error messages
                    for line in error_output.splitlines():
                        if 'error:' in line.lower():
                            messages.append({
                                'type': 'error',
                                'message': line.strip()
                            })
                    
                    if not messages:
                        messages.append({
                            'type': 'error',
                            'message': 'Compilation failed with unknown error'
                        })
                    
                    return None, messages
            
            except Exception as e:
                logger.error(f"Error during compilation: {str(e)}")
                return None, [{
                    'type': 'error',
                    'message': f'Compilation error: {str(e)}'
                }]
    
    def _get_binary_extension(self, board_type):
        """
        Get the appropriate binary extension for the board type
        
        Args:
            board_type (str): Board identifier (FQBN)
            
        Returns:
            str: Binary file extension
        """
        if 'arduino:avr' in board_type:
            return 'hex'
        elif 'esp32:esp32' in board_type or 'esp8266:esp8266' in board_type:
            return 'bin'
        else:
            return 'bin'  # Default extension

