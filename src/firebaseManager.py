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

    # 유저 데이터 가져오기
    def getUserData(self, userId):
        ref = db.reference(f'users/{userId}')
        return ref.get()

    # 유저 데이터 업데이트
    def updateUserData(self, userId, data):
        ref = db.reference(f'users/{userId}')
        ref.update(data)

    # 유저 데이터 덮어쓰기
    def setUserData(self, userId, data):
        ref = db.reference(f'users/{userId}')
        ref.set(data)
        
    # 유저 게임 데이터 완전히 삭제
    def deleteUserData(self, userId):
        ref = db.reference(f'users/{userId}')
        ref.delete()

    # --- 인증 관련 메서드 ---

    # 아이디 중복 확인 및 비밀번호 검증을 위해 Auth 데이터 가져오기
    def getAuthData(self, username):
        # Firebase 키에는 . $ # [ ] / 문자를 쓸 수 없으므로 간단한 필터링 필요하지만
        # 여기서는 유저가 입력한 username을 그대로 키로 쓴다고 가정 (실무에선 인코딩 필요)
        ref = db.reference(f'user_auth/{username}')
        return ref.get()

    # 회원가입 (Auth 정보 저장)
    def registerUserAuth(self, username, passwordHash, userId):
        ref = db.reference(f'user_auth/{username}')
        ref.set({
            "password": passwordHash,
            "userId": userId
        })

    # 회원 탈퇴 시 Auth 계정 정보 완전 삭제
    def deleteAuthData(self, username):
        ref = db.reference(f'user_auth/{username}')
        ref.delete()

    # 모든 유저 데이터 가져오기
    def getAllUsers(self):
        try:
            users_ref = db.reference('users')
            return users_ref.get() or {}
        except Exception as e:
            print(f"GetAllUsers Error: {e}")
            return {}

    # 특정 유저 완전 삭제
    def deleteUserComplete(self, user_id):
        try:
            # 1. users 테이블에서 삭제
            db.reference(f'users/{user_id}').delete()
            
            # 2. auth 테이블에서 해당 user_id를 가진 계정 찾아 삭제
            auth_ref = db.reference('auth')
            all_auth = auth_ref.get() or {}
            for username, data in all_auth.items():
                if data.get('userId') == user_id:
                    db.reference(f'auth/{username}').delete()
                    break
            return True
        except Exception as e:
            print(f"Delete User Error: {e}")
            return False