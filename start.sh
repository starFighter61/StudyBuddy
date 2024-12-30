#!/bin/bash
cd backend
pip install -r requirements.txt
python main.py &
cd ../frontend
npm install
npm start
