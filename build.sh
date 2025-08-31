#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

echo "Building database... (this may take a moment)"
python prepare_gtfs.py