import sqlite3
import os

db_path = "/Users/sushmithapopuri/workspace/visitor-management-system/backend/vms.db"

print(f"Checking database at {db_path}...")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute("PRAGMA table_info(users)")
    cols = [col[1] for col in cursor.fetchall()]
    print(f"Current columns in 'users': {cols}")
    
    for col_name, col_type in [("calendar_synced", "BOOLEAN DEFAULT 0"), ("calendar_url", "TEXT")]:
        if col_name not in cols:
            print(f"Adding column '{col_name}'...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
        else:
            print(f"Column '{col_name}' already exists.")
            
    conn.commit()
    conn.close()
    print("Database check/update complete.")
else:
    print(f"ERROR: Database file not found at {db_path}")
