"""
Simpiler - Arduino Mobile Compiler Server
Main application entry point
"""

import os
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
import uuid
import json
from datetime import datetime

# Import compiler module
from compiler import ArduinoCompiler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', '/tmp/simpiler/uploads')
app.config['BINARY_FOLDER'] = os.environ.get('BINARY_FOLDER', '/tmp/simpiler/binaries')
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1MB max upload size

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['BINARY_FOLDER'], exist_ok=True)

# In-memory storage for compilation jobs (replace with database in production)
compilation_jobs = {}

# Initialize Arduino compiler
arduino_compiler = ArduinoCompiler()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/v1/boards', methods=['GET'])
def list_boards():
    """List all supported boards"""
    try:
        boards = arduino_compiler.get_supported_boards()
        return jsonify({'boards': boards})
    except Exception as e:
        logger.error(f"Error listing boards: {str(e)}")
        return jsonify({
            'error': 'server_error',
            'message': 'Failed to retrieve board list',
            'request_id': str(uuid.uuid4())
        }), 500

@app.route('/v1/boards/<board_id>', methods=['GET'])
def get_board_details(board_id):
    """Get details for a specific board"""
    try:
        board = arduino_compiler.get_board_details(board_id)
        if not board:
            return jsonify({
                'error': 'not_found',
                'message': f'Board {board_id} not found'
            }), 404
        return jsonify(board)
    except Exception as e:
        logger.error(f"Error getting board details: {str(e)}")
        return jsonify({
            'error': 'server_error',
            'message': 'Failed to retrieve board details',
            'request_id': str(uuid.uuid4())
        }), 500

@app.route('/v1/compile', methods=['POST'])
def compile_code():
    """Compile Arduino code for a specific board"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'error': 'bad_request',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        required_fields = ['board_type', 'code']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': 'bad_request',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create a unique compilation ID
        compilation_id = str(uuid.uuid4())
        
        # Store code in a temporary file
        code_file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{compilation_id}.ino")
        with open(code_file_path, 'w') as f:
            f.write(data['code'])
        
        # Create compilation job entry
        compilation_jobs[compilation_id] = {
            'compilation_id': compilation_id,
            'project_id': data.get('project_id'),
            'board_type': data['board_type'],
            'status': 'queued',
            'created_at': datetime.now().isoformat(),
            'code_file': code_file_path,
            'libraries': data.get('libraries', [])
        }
        
        # Queue compilation (in a real app, this would be handled by a task queue)
        # For simplicity, we'll compile synchronously here
        binary_path, messages = arduino_compiler.compile(
            code_file_path,
            data['board_type'],
            data.get('libraries', [])
        )
        
        # Update job status
        if binary_path:
            # Move binary to storage location
            final_binary_path = os.path.join(app.config['BINARY_FOLDER'], f"{compilation_id}.bin")
            os.rename(binary_path, final_binary_path)
            
            compilation_jobs[compilation_id].update({
                'status': 'completed',
                'completed_at': datetime.now().isoformat(),
                'binary_path': final_binary_path,
                'binary_url': f"/v1/binaries/{compilation_id}",
                'messages': messages
            })
        else:
            compilation_jobs[compilation_id].update({
                'status': 'failed',
                'completed_at': datetime.now().isoformat(),
                'messages': messages
            })
        
        # Return compilation job info
        return jsonify({
            'compilation_id': compilation_id,
            'status': compilation_jobs[compilation_id]['status'],
            'messages': messages
        })
    
    except Exception as e:
        logger.error(f"Error during compilation: {str(e)}")
        return jsonify({
            'error': 'server_error',
            'message': 'Compilation failed',
            'request_id': str(uuid.uuid4())
        }), 500

@app.route('/v1/compile/<compilation_id>', methods=['GET'])
def get_compilation_status(compilation_id):
    """Get status of a compilation job"""
    if compilation_id not in compilation_jobs:
        return jsonify({
            'error': 'not_found',
            'message': f'Compilation job {compilation_id} not found'
        }), 404
    
    return jsonify(compilation_jobs[compilation_id])

@app.route('/v1/binaries/<binary_id>', methods=['GET'])
def get_binary(binary_id):
    """Download a compiled binary"""
    if binary_id not in compilation_jobs:
        return jsonify({
            'error': 'not_found',
            'message': f'Binary {binary_id} not found'
        }), 404
    
    job = compilation_jobs[binary_id]
    if job['status'] != 'completed' or 'binary_path' not in job:
        return jsonify({
            'error': 'not_found',
            'message': 'Binary not available'
        }), 404
    
    try:
        return send_file(
            job['binary_path'],
            as_attachment=True,
            download_name=f"{job.get('project_id', 'arduino_project')}.bin",
            mimetype='application/octet-stream'
        )
    except Exception as e:
        logger.error(f"Error sending binary file: {str(e)}")
        return jsonify({
            'error': 'server_error',
            'message': 'Failed to retrieve binary',
            'request_id': str(uuid.uuid4())
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('DEBUG', 'False').lower() == 'true')

