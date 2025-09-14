#!/usr/bin/env bash

curl -N http://localhost:8000/runs \
    -H 'Content-Type: application/json' \
    -H 'Accept: text/event-stream' \
    -d '{"agent_name": "et-status-assistant", "mode": "sync", "input": [{"role":"user","parts":[{"content_type":"text/plain","content":"What are they currently working on?"}]}]}'
