# backend/database.py

import mysql.connector
from mysql.connector import Error
import os
import time
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def require_env(var_name):
    value = os.getenv(var_name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value

def get_db_connection():
    """
    Returns a MySQL database connection with retry logic.
    """
    max_retries = 10
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(
                host=require_env('DB_HOST'),
                user=require_env('DB_USER'),
                password=require_env('DB_PASSWORD'),
                database=require_env('DB_NAME'),
                port=int(os.getenv('DB_PORT', '3306')),
                auth_plugin='mysql_native_password'
            )
            print(f"Database connection successful on attempt {attempt + 1}")
            return conn
        except Error as e:
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Could not connect to database.")
                return None