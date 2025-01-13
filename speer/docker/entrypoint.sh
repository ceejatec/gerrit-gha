#!/bin/bash -e

# Create our own virtual env, since the one mounted from the host likely
# has absolute paths that won't work.
export UV_PROJECT_ENVIRONMENT=.docker-venv
uv run uvicorn --reload --host 0.0.0.0 --port 8000 speer.main:app
