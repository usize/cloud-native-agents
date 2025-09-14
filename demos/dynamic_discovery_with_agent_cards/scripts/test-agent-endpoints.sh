#!/bin/bash

# Test script for A2A agent endpoints
# Usage: ./scripts/test-agent-endpoints.sh [HOST] [PORT]

HOST=${1:-localhost}
PORT=${2:-8000}
BASE_URL="http://${HOST}:${PORT}"

echo "Testing A2A Agent at ${BASE_URL}"
echo "================================="

# Test agent card endpoint
echo -e "\n1. Testing Agent Card Endpoint:"
echo "GET ${BASE_URL}/.well-known/agent-card.json"
echo "---"
curl -s "${BASE_URL}/.well-known/agent-card.json" | jq . || {
    echo "Error: Failed to fetch agent card or jq not available"
    curl -s "${BASE_URL}/.well-known/agent-card.json"
}

# Test A2A JSON-RPC endpoint with a simple message
echo -e "\n\n2. Testing A2A JSON-RPC Endpoint:"
echo "POST ${BASE_URL}/"
echo "---"

# JSON-RPC request payload
REQUEST_PAYLOAD='{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "user",
      "parts": [
        {
          "text": "What maintenance was completed recently?"
        }
      ]
    }
  },
  "id": "test-123"
}'

echo "Request payload:"
echo "$REQUEST_PAYLOAD" | jq .

echo -e "\nResponse:"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_PAYLOAD" \
  "${BASE_URL}/" | jq . || {
    echo "Error: Failed to call A2A endpoint or jq not available"
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "$REQUEST_PAYLOAD" \
      "${BASE_URL}/"
}

echo -e "\n\n3. Testing with another query:"
echo "---"

REQUEST_PAYLOAD2='{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-002",
      "role": "user",
      "parts": [
        {
          "text": "Tell me about authentication issues"
        }
      ]
    }
  },
  "id": "test-456"
}'

echo "Request payload:"
echo "$REQUEST_PAYLOAD2" | jq .

echo -e "\nResponse:"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_PAYLOAD2" \
  "${BASE_URL}/" | jq . || {
    echo "Error: Failed to call A2A endpoint or jq not available"
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -d "$REQUEST_PAYLOAD2" \
      "${BASE_URL}/"
}

echo -e "\n\nTest completed!"