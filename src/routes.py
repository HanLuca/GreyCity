from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from src.firebaseManager import FirebaseManager
from src.gameEngine import GameEngine
from config import Config
import requests
import random
import string
import smtplib
from email.mime.text import MIMEText

gameBP = Blueprint('gameBP', __name__)
fbManager = FirebaseManager()
gameEngine = GameEngine()

@gameBP.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username'))

# ==========================================
# 이메일 인증 코드 발송 API
# ==========================================
@gameBP.route('/api/send_code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "msg": "이메일을 입력하십시오."})

    # 6자리 영문+숫자 랜덤 코드 생성
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    session['verification_code'] = code
    session['verification_email'] = email

    sender_email = getattr(Config, 'SMTP_EMAIL', None)
    sender_password = getattr(Config, 'SMTP_PASSWORD', None)

    # SMTP 설정이 되어있는 경우 실제 이메일 발송
    if sender_email and sender_password:
        try:
            msg = MIMEText(Config.SendEmail(code), 'html', 'utf-8')
            msg['Subject'] = "GREY CITY: ACCESS CODE"
            msg['From'] = sender_email
            msg['To'] = email

            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, email, msg.as_string())
            server.quit()
            return jsonify({"success": True, "msg": "보안 코드가 전송되었습니다. 이메일을 확인하십시오."})
        except Exception as e:
            print(f"Email error: {e}")
            return jsonify({"success": False, "msg": "이메일 발송 실패. 시스템 관리자에게 문의하십시오."})
    else:
        # 이메일 설정이 없으면 터미널 콘솔에만 출력 (개발 테스트용)
        print(f"\n======================================")
        print(f">>> [TEST MODE] {email} 로 발송된 코드: {code}")
        print(f"======================================\n")
        return jsonify({"success": True, "msg": "[TEST 모드] 서버 콘솔 창에서 보안 코드를 확인하십시오."})

# ==========================================
# 회원가입 API (이메일 인증 체크 및 DB 저장)
# ==========================================
@gameBP.route('/api/register', methods=['POST'])
def register_local():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    code = data.get('code')

    if not username or not password or not email or not code:
        return jsonify({"success": False, "msg": "모든 정보를 입력 및 인증하십시오."})

    # 인증 코드 검증
    if session.get('verification_code') != code or session.get('verification_email') != email:
        return jsonify({"success": False, "msg": "보안 코드가 일치하지 않거나 만료되었습니다."})

    # 아이디 중복 검사
    if fbManager.getAuthData(username):
        return jsonify({"success": False, "msg": "이미 존재하는 생존자 ID입니다."})

    random_num = random.randrange(10**17, 10**18)
    new_user_id = f"gc-{random_num}"

    pw_hash = generate_password_hash(password)
    fbManager.registerUserAuth(username, pw_hash, new_user_id)

    userData = gameEngine.initNewPlayer()
    userData['username'] = username
    
    # [수정됨] 유저 데이터에 이메일 정보 추가 저장
    userData['email'] = email 
    
    fbManager.setUserData(new_user_id, userData)

    # 가입 성공 시 세션에서 코드 파기
    session.pop('verification_code', None)
    session.pop('verification_email', None)

    return jsonify({"success": True, "msg": "등록 완료. 접근 승인."})

@gameBP.route('/api/login_local', methods=['POST'])
def login_local():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    auth_data = fbManager.getAuthData(username)
    
    if not auth_data:
        return jsonify({"success": False, "msg": "존재하지 않는 생존자입니다."})

    if check_password_hash(auth_data['password'], password):
        session['user_id'] = auth_data['userId']
        session['username'] = username
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "msg": "암호 코드가 일치하지 않습니다."})

@gameBP.route('/login/discord')
def login_discord():
    discord_auth_url = (
        f"{Config.DISCORD_API_BASE_URL}/oauth2/authorize"
        f"?client_id={Config.DISCORD_CLIENT_ID}"
        f"&redirect_uri={Config.DISCORD_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=identify"
    )
    return redirect(discord_auth_url)

@gameBP.route('/callback')
def callback():
    code = request.args.get('code')
    if not code: return "Error: No code", 400

    token_data = {
        'client_id': Config.DISCORD_CLIENT_ID,
        'client_secret': Config.DISCORD_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': Config.DISCORD_REDIRECT_URI
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    try:
        token_res = requests.post(f"{Config.DISCORD_API_BASE_URL}/oauth2/token", data=token_data, headers=headers)
        token_json = token_res.json()
        access_token = token_json.get('access_token')

        user_res = requests.get(f"{Config.DISCORD_API_BASE_URL}/users/@me", headers={'Authorization': f"Bearer {access_token}"})
        user_data = user_res.json()
        
        session['user_id'] = user_data['id']
        session['username'] = user_data['username']

        return redirect(url_for('gameBP.index'))
    except Exception as e:
        return f"Login Error: {str(e)}"

@gameBP.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('gameBP.index'))

@gameBP.route('/api/loadGame', methods=['POST'])
def loadGame():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    userId = session['user_id']
    userData = fbManager.getUserData(userId)
    
    if not userData:
        userData = gameEngine.initNewPlayer()
        userData['username'] = session.get('username', 'Unknown')
        fbManager.setUserData(userId, userData)
    
    responsePayload = gameEngine.getGameResponse(userData)
    return jsonify(responsePayload)

@gameBP.route('/api/action', methods=['POST'])
def handleAction():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    userId = session['user_id']
    actionType = data.get('type')
    target = data.get('target')

    currentUserData = fbManager.getUserData(userId)
    responsePayload = gameEngine.processAction(currentUserData, actionType, target)
    
    fbManager.updateUserData(userId, responsePayload['userData'])
    return jsonify(responsePayload)

# ==========================================
# [신규] 관리자(ADMIN) 패널 전용 라우트
# ==========================================

def is_admin():
    """현재 세션 유저가 관리자인지 확인"""
    return session.get('username') in getattr(Config, 'ADMIN_ACCOUNTS', [])

@gameBP.route('/admin')
def admin_panel():
    if not is_admin():
        return "⚠️ ACCESS DENIED : SECURITY LEVEL OMEGA REQUIRED.", 403
    return render_template('admin.html', username=session.get('username'))

@gameBP.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(fbManager.getAllUsers())

@gameBP.route('/api/admin/user/<user_id>', methods=['POST'])
def admin_update_user(user_id):
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 403
    
    new_data = request.json
    # Firebase 데이터 덮어쓰기
    fbManager.setUserData(user_id, new_data)
    return jsonify({"success": True, "msg": "유저 데이터가 업데이트되었습니다."})

@gameBP.route('/api/admin/user/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 403
    
    success = fbManager.deleteUserComplete(user_id)
    return jsonify({"success": success})