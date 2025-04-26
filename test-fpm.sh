#!/bin/bash
# Test if PHP-FPM is responding
SCRIPT_NAME=/health.php SCRIPT_FILENAME=/app/public/health.php REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000