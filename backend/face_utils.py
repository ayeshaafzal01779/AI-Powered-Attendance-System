import face_recognition
import os
import json
import numpy as np
import base64
import cv2
from io import BytesIO   
from PIL import Image
from database import get_db_connection

class FaceAI:
    def __init__(self):
        # Path setup
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.dataset_path = os.path.join(self.backend_dir, 'datasets')
        
        # Load eye cascade for fallback
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Ensure datasets folder exists
        if not os.path.exists(self.dataset_path):
            os.makedirs(self.dataset_path)

    def get_face_or_eyes_locations(self, image):
        """
        Tries to find face locations. If fails, tries to find eyes and estimate face box.
        Returns: (locations, detection_type)
        """
        # 1. Try normal face detection (HOG)
        face_locations = face_recognition.face_locations(image, model="hog")
        if face_locations:
            return face_locations, "face"
        
        # 2. Try with upsampling (better for small/distant faces)
        face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=2, model="hog")
        if face_locations:
            return face_locations, "face"

        # 3. Fallback: Multi-Cascade Eye Detection
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            # Enhance contrast for better detection
            gray = cv2.equalizeHist(gray)
            
            eye_cascades = [
                'haarcascade_eye.xml',
                'haarcascade_eye_tree_eyeglasses.xml',
                'haarcascade_lefteye_2splits.xml'
            ]
            
            all_eyes = []
            for cascade_name in eye_cascades:
                cascade = cv2.CascadeClassifier(cv2.data.haarcascades + cascade_name)
                eyes = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                if len(eyes) > 0:
                    all_eyes.extend(eyes)
            
            if len(all_eyes) >= 1:
                # Get the bounding area of all detected eye features
                min_x = min([e[0] for e in all_eyes])
                min_y = min([e[1] for e in all_eyes])
                max_x = max([e[0] + e[2] for e in all_eyes])
                max_y = max([e[1] + e[3] for e in all_eyes])
                
                eye_width = max_x - min_x
                
                # Estimate a face box based on eye width
                # In a standard face, width is about 2-2.5x eye-span
                # and height is about 3x eye-span
                center_x = (min_x + max_x) // 2
                center_y = (min_y + max_y) // 2
                
                box_width = int(eye_width * 2.5)
                box_height = int(eye_width * 3.0)
                
                top = max(0, center_y - int(box_height * 0.35))
                bottom = min(image.shape[0], top + box_height)
                left = max(0, center_x - int(box_width * 0.5))
                right = min(image.shape[1], left + box_width)
                
                return [(top, right, bottom, left)], "eyes_detected"
        except Exception as e:
            print(f"Eye detection fallback error: {e}")
            
        return [], None

    def preprocess_image(self, img_np):
        """
        Improves image quality for low-light conditions using CLAHE.
        """
        try:
            # Convert RGB to LAB color space
            lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)

            # Apply CLAHE to L-channel (Lightness)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            cl = clahe.apply(l)

            # Merge channels back and convert to RGB
            limg = cv2.merge((cl,a,b))
            enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
            return enhanced_img
        except Exception as e:
            print(f"Preprocessing error: {e}")
            return img_np  # Fallback to original image

    def sync_dataset_to_db(self):
        """
        Scans dataset folder and stores encodings in the database.
        Structure: backend/dataset/<reg_no>/[images]
        """
        results = []
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database connection failed"}
        
        try:
            cursor = conn.cursor()
            
            # Ensure facial_data table has the correct schema (Self-healing)
            try:
                # We'll use student_id and embedding as per schema.sql
                # If the table is missing columns, we'll try to add them
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS facial_data (
                        face_id INT AUTO_INCREMENT PRIMARY KEY,
                        student_id INT NOT NULL,
                        embedding LONGTEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_face_student FOREIGN KEY (student_id) REFERENCES users(user_id)
                    )
                """)
                # Check if we need to rename user_id to student_id or add embedding
                cursor.execute("DESCRIBE facial_data")
                columns = {col[0] for col in cursor.fetchall()}
                
                if 'user_id' in columns and 'student_id' not in columns:
                    cursor.execute("ALTER TABLE facial_data CHANGE user_id student_id INT NOT NULL")
                if 'embedding' not in columns:
                    # If somehow embedding is missing but it's called something else?
                    # We'll just add it.
                    cursor.execute("ALTER TABLE facial_data ADD COLUMN embedding LONGTEXT NULL")
                
                conn.commit()
            except Exception as e:
                print(f"Table healing failed: {e}")
                # Continue anyway, maybe it's fine
            
            # Get all registration numbers from folders
            for reg_no in os.listdir(self.dataset_path):
                student_folder = os.path.join(self.dataset_path, reg_no)
                
                if not os.path.isdir(student_folder):
                    continue
                
                # Find student user_id from registration_no
                cursor.execute("SELECT user_id FROM users WHERE registration_no = %s", (reg_no,))
                user_row = cursor.fetchone()
                
                if not user_row:
                    results.append(f"⚠️ Skipped {reg_no}: Not found in database.")
                    continue
                
                student_id = user_row[0]
                
                # Clear existing face data for this student
                cursor.execute("DELETE FROM facial_data WHERE student_id = %s", (student_id,))
                
                # Scan images in student folder
                for img_name in os.listdir(student_folder):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        img_path = os.path.join(student_folder, img_name)
                        
                        try:
                            # Load and encode
                            image = face_recognition.load_image_file(img_path)
                            
                            # Pre-processing: Resize if too large
                            img_pil = Image.fromarray(image)
                            if max(img_pil.size) > 1000:
                                img_pil.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
                                image = np.array(img_pil)
                            
                            # Enhance for low lighting
                            image = self.preprocess_image(image)

                            # Use fallback detection (Face -> Upsampled Face -> Eyes)
                            face_locations, det_type = self.get_face_or_eyes_locations(image)
                            
                            # model="large" is more accurate for embeddings (68 points)
                            # model="small" only needs 5 points (better for niqab)
                            encodings = face_recognition.face_encodings(image, known_face_locations=face_locations, num_jitters=15, model="large")
                            
                            if not encodings:
                                # Fallback to small model if large fails
                                encodings = face_recognition.face_encodings(image, known_face_locations=face_locations, num_jitters=15, model="small")
                            
                            if encodings:
                                encoding_json = json.dumps(encodings[0].tolist())
                                cursor.execute(
                                    "INSERT INTO facial_data (student_id, embedding) VALUES (%s, %s)",
                                    (student_id, encoding_json)
                                )
                                results.append(f"Synced {img_name} ({det_type}) for {reg_no}")
                            else:
                                results.append(f"No features detected in {img_name} ({reg_no})")
                        except Exception as e:
                            results.append(f"Error processing {img_name}: {str(e)}")
            
            conn.commit()
            return {"status": "success", "results": results}
            
        except Exception as e:
            if conn: conn.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    def match_face(self, user_id, image_data_base64):
        """
        Compares a base64 image against stored embeddings for a user.
        """
        try:
            # 1. Decode base64 image
            if ',' in image_data_base64:
                image_data_base64 = image_data_base64.split(',')[1]
            
            img_bytes = base64.b64decode(image_data_base64)
            img = Image.open(BytesIO(img_bytes)).convert('RGB')
            
            # Debug: Log image info
            print(f"DEBUG: Received image size: {img.size}")
            
            img_np = np.array(img)
            
            # Enhance for low lighting
            img_np = self.preprocess_image(img_np)

            # 2. Get encoding for the live image
            # Step A: Find face or eye locations (Face -> Eyes fallback)
            face_locations, det_type = self.get_face_or_eyes_locations(img_np)
            
            if not face_locations:
                return {"status": "error", "message": "No face or eyes detected. Please ensure your face is clearly visible or your eyes are visible if wearing a niqab."}
            
            # Step B: Get encodings for found locations
            # Using 5 jitters for better stability in low light
            live_encodings = face_recognition.face_encodings(img_np, known_face_locations=face_locations, num_jitters=5, model="large")
            
            if not live_encodings:
                # Fallback to small model
                live_encodings = face_recognition.face_encodings(img_np, known_face_locations=face_locations, num_jitters=5, model="small")
            
            if not live_encodings:
                return {"status": "error", "message": f"Could not extract features from detected {det_type}. Please try again."}
            
            live_encoding = live_encodings[0]

            # 3. Fetch stored embeddings from DB
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT embedding FROM facial_data WHERE student_id = %s", (user_id,))
            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            if not rows:
                return {"status": "error", "message": "No face data found for this student. Please contact Admin."}

            # 4. Compare faces
            stored_encodings = [np.array(json.loads(row[0])) for row in rows]
            
            # Get raw distances for debugging
            distances = face_recognition.face_distance(stored_encodings, live_encoding)
            min_distance = min(distances) if len(distances) > 0 else 1.0
            print(f"DEBUG: Face distance: {min_distance}")

            # Increased tolerance to 0.75 for better matching in varied conditions
            # Since we have anti-spoofing (blink/turn), we can slightly relax this
            matches = face_recognition.compare_faces(stored_encodings, live_encoding, tolerance=0.55)

            if True in matches:
                return {"status": "success", "message": "Face matched!"}
            else:
                return {"status": "error", "message": "Face verification failed. Please ensure you are the registered student and face the camera directly."}

        except Exception as e:
            return {"status": "error", "message": f"Recognition error: {str(e)}"}

# Export a single instance
face_ai = FaceAI()
