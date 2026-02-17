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

    # [기존] 유저 데이터 가져오기
    def getUserData(self, userId):
        ref = db.reference(f'users/{userId}')
        return ref.get()

    # [기존] 유저 데이터 업데이트
    def updateUserData(self, userId, data):
        ref = db.reference(f'users/{userId}')
        ref.update(data)

    # [기존] 유저 데이터 덮어쓰기
    def setUserData(self, userId, data):
        ref = db.reference(f'users/{userId}')
        ref.set(data)

    # --- [신규] 인증 관련 메서드 ---

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