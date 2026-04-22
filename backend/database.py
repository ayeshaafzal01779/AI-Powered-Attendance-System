# backend/database.py

import mysql.connector
from mysql.connector import Error
import os
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
    Returns a MySQL database connection.
    """
    try:
        conn = mysql.connector.connect(
            host=require_env('DB_HOST'),
            user=require_env('DB_USER'),
            password=require_env('DB_PASSWORD'),
            database=require_env('DB_NAME'),
            port=int(os.getenv('DB_PORT', '3306'))
        )
        return conn
    except Error as e:
        print("Error connecting to MySQL:", e)
        return None