#!/bin/bash
# Script to install zsign on Ubuntu/Debian VPS
echo "--- Installing dependencies ---"
sudo apt-get update
sudo apt-get install -y openssl libssl-dev g++ git

echo "--- Cloning zsign repository ---"
cd /tmp
git clone https://github.com/zhlynn/zsign.git
cd zsign

echo "--- Compiling zsign ---"
g++ *.cpp common/*.cpp -lcrypto -O3 -o zsign

echo "--- Installing to /usr/local/bin ---"
sudo cp zsign /usr/local/bin/
zsign --version

echo "--- Done! zsign is now installed ---"
