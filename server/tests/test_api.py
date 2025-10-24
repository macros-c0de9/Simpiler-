"""
Tests for the API endpoints
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock

# Import the Flask app
import app as flask_app

@pytest.fixture
def client():
    """Create a test client for the app"""
    flask_app.app.config['TESTING'] = True
    with flask_app.app.test_client() as client:
        yield client

class TestHealthEndpoint:
    """Test cases for the health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert 'timestamp' in data

class TestBoardsEndpoints:
    """Test cases for the boards endpoints"""
    
    @patch('compiler.ArduinoCompiler.get_supported_boards')
    def test_list_boards(self, mock_get_boards, client):
        """Test listing boards"""
        # Mock the get_supported_boards method
        mock_get_boards.return_value = [
            {
                'id': 'arduino:avr:uno',
                'name': 'Arduino Uno',
                'platform': 'arduino:avr',
                'description': 'Arduino Uno (ATmega328P)'
            },
            {
                'id': 'esp32:esp32:esp32',
                'name': 'ESP32 Dev Module',
                'platform': 'esp32:esp32',
                'description': 'ESP32 Development Module'
            }
        ]
        
        # Make the request
        response = client.get('/v1/boards')
        
        # Check the response
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'boards' in data
        assert len(data['boards']) == 2
        assert data['boards'][0]['id'] == 'arduino:avr:uno'
        assert data['boards'][1]['id'] == 'esp32:esp32:esp32'
    
    @patch('compiler.ArduinoCompiler.get_board_details')
    def test_get_board_details(self, mock_get_board_details, client):
        """Test getting board details"""
        # Mock the get_board_details method
        mock_get_board_details.return_value = {
            'id': 'arduino:avr:uno',
            'name': 'Arduino Uno',
            'platform': 'arduino:avr',
            'description': 'Arduino Uno (ATmega328P)',
            'cpu': 'ATmega328P',
            'flash_size': 32768,
            'ram_size': 2048,
            'upload_protocols': ['serial'],
            'programming_protocols': ['avr109', 'stk500v1', 'arduino'],
            'documentation_url': 'https://docs.arduino.cc/hardware/uno-rev3'
        }
        
        # Make the request
        response = client.get('/v1/boards/arduino:avr:uno')
        
        # Check the response
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['id'] == 'arduino:avr:uno'
        assert data['name'] == 'Arduino Uno'
        assert data['cpu'] == 'ATmega328P'
        assert data['flash_size'] == 32768
        assert data['ram_size'] == 2048
        assert 'serial' in data['upload_protocols']
        assert 'avr109' in data['programming_protocols']
    
    @patch('compiler.ArduinoCompiler.get_board_details')
    def test_get_board_details_not_found(self, mock_get_board_details, client):
        """Test getting board details for non-existent board"""
        # Mock the get_board_details method to return None
        mock_get_board_details.return_value = None
        
        # Make the request
        response = client.get('/v1/boards/nonexistent:board')
        
        # Check the response
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'not_found'

class TestCompileEndpoints:
    """Test cases for the compilation endpoints"""
    
    @patch('compiler.ArduinoCompiler.compile')
    def test_compile_code_success(self, mock_compile, client):
        """Test successful code compilation"""
        # Mock the compile method
        binary_path = '/tmp/test_binary.hex'
        messages = [
            {'type': 'info', 'message': 'Compilation successful in 2.5 seconds'},
            {'type': 'info', 'message': 'Binary size: 4096 bytes'}
        ]
        mock_compile.return_value = (binary_path, messages)
        
        # Make the request
        response = client.post('/v1/compile', json={
            'board_type': 'arduino:avr:uno',
            'code': 'void setup() {}\nvoid loop() {}'
        })
        
        # Check the response
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'compilation_id' in data
        assert data['status'] == 'completed'
        assert len(data['messages']) == 2
        assert data['messages'][0]['type'] == 'info'
        assert 'Compilation successful' in data['messages'][0]['message']
    
    @patch('compiler.ArduinoCompiler.compile')
    def test_compile_code_failure(self, mock_compile, client):
        """Test failed code compilation"""
        # Mock the compile method to return failure
        messages = [
            {'type': 'error', 'message': 'error: expected \'}\' at end of input'}
        ]
        mock_compile.return_value = (None, messages)
        
        # Make the request
        response = client.post('/v1/compile', json={
            'board_type': 'arduino:avr:uno',
            'code': 'void setup() {}\nvoid loop() {'
        })
        
        # Check the response
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'compilation_id' in data
        assert data['status'] == 'failed'
        assert len(data['messages']) == 1
        assert data['messages'][0]['type'] == 'error'
        assert 'error:' in data['messages'][0]['message']
    
    def test_compile_code_missing_fields(self, client):
        """Test compilation with missing fields"""
        # Make the request without required fields
        response = client.post('/v1/compile', json={
            'code': 'void setup() {}\nvoid loop() {}'
        })
        
        # Check the response
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['error'] == 'bad_request'
        assert 'Missing required field' in data['message']
    
    def test_get_compilation_status_not_found(self, client):
        """Test getting status for non-existent compilation"""
        # Make the request
        response = client.get('/v1/compile/nonexistent_id')
        
        # Check the response
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['error'] == 'not_found'

