# backend/database.py

import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """
    Returns a MySQL database connection.
    """
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='root_6600',
            database='TriAttendanceDB',
            port=3306
        )
        return conn
    except Error as e:
        print("Error connecting to MySQL:", e)
        return None