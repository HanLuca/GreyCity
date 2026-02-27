import firebase_admin
from firebase_admin import credentials, db
from config import Config

class FirebaseManager:
    def __init__(self):
        self.initializeFirebase()

    def initializeFirebase(self):
        if not firebase_admin._apps:
            cred = credentials.Certificate(Config.FIREBASE_KEY_PATH)
            firebase_admin.initialize_app(cred, {
                'databaseURL': Config.FIREBASE_DB_URL
            })
            print(">>> Firebase Connected")

    def getUserData(self, userId):
        try:
            ref = db.reference(f'users/{userId}')
            return ref.get()
        except Exception as e:
            print(f"Firebase GET Error (User: {userId}): {e}")
            return None

    def updateUserData(self, userId, data):
        try:
            ref = db.reference(f'users/{userId}')
            ref.update(data)
        except Exception as e:
            print(f"Firebase UPDATE Error (User: {userId}): {e}")

    def setUserData(self, userId, data):
        try:
            ref = db.reference(f'users/{userId}')
            ref.set(data)
        except Exception as e:
            print(f"Firebase SET Error (User: {userId}): {e}")
        
    def deleteUserData(self, userId):
        try:
            ref = db.reference(f'users/{userId}')
            ref.delete()
        except Exception as e:
            print(f"Firebase DELETE Error (User: {userId}): {e}")

    # --- 인증 관련 메서드 ---

    def getAuthData(self, username):
        try:
            # 안전성을 위해 str 캐스팅 및 예외 처리
            safe_username = str(username)
            ref = db.reference(f'user_auth/{safe_username}')
            return ref.get()
        except Exception as e:
            # Firebase 허용되지 않은 키(. $ # [ ] /) 등이 강제 주입될 경우 크래시 방지
            print(f"Firebase Auth GET Error: Invalid key accessed.")
            return None

    def registerUserAuth(self, username, passwordHash, userId):
        try:
            safe_username = str(username)
            ref = db.reference(f'user_auth/{safe_username}')
            ref.set({
                "password": passwordHash,
                "userId": userId
            })
        except Exception as e:
            print(f"Firebase Auth SET Error: {e}")

    def deleteAuthData(self, username):
        try:
            safe_username = str(username)
            ref = db.reference(f'user_auth/{safe_username}')
            ref.delete()
        except Exception as e:
            print(f"Firebase Auth DELETE Error: {e}")

    def getAllUsers(self):
        try:
            users_ref = db.reference('users')
            return users_ref.get() or {}
        except Exception as e:
            print(f"GetAllUsers Error: {e}")
            return {}

    def deleteUserComplete(self, user_id):
        try:
            db.reference(f'users/{user_id}').delete()
            
            auth_ref = db.reference('auth')
            all_auth = auth_ref.get() or {}
            for username, data in all_auth.items():
                if data.get('userId') == user_id:
                    db.reference(f'auth/{username}').delete()
                    break
            return True
        except Exception as e:
            print(f"Delete User Complete Error: {e}")
            return False
        
    def sendGlobalNotice(self, data):
            try:
                db.reference('notices').push(data)
            except Exception as e:
                print(f"Firebase Notice Error: {e}")

    def getGlobalNotices(self):
        try:
            return db.reference('notices').get() or {}
        except Exception:
            return {}

    def sendPrivateMessage(self, userId, data):
        try:
            db.reference(f'messages/{userId}').push(data)
        except Exception as e:
            print(f"Firebase Message Error: {e}")

    def getPrivateMessages(self, userId):
        try:
            return db.reference(f'messages/{userId}').get() or {}
        except Exception:
            return {}