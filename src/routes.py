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
import time
import re
import html

gameBP = Blueprint('gameBP', __name__)
fbManager = FirebaseManager()
gameEngine = GameEngine()

# ==========================================
# SECURITY MODULE: 입력값 검증 로직
# ==========================================
def sanitize_input(data):
    # XSS 방지를 위한 HTML 특수문자 이스케이프
    if not isinstance(data, str): return ""
    return html.escape(data.strip())

def is_valid_username(username):
    # NoSQL Injection 및 Firebase 경로 조작 방지.
    # - 문자열 타입인지 확인 (Type Injection 방어)
    # - 영문 대소문자, 숫자, 언더스코어(_)만 허용 (경로 이탈 문자 '/' 및 Firebase 금지 문자 방어)
    # - 3자 이상 20자 이하 제한
    if not username or not isinstance(username, str):
        return False
    return bool(re.match(r"^[a-zA-Z0-9_]{3,20}$", username))

def is_valid_password(password):
    # 최소한의 비밀번호 정책 및 자료형 검사
    if not password or not isinstance(password, str):
        return False
    return len(password) >= 6

def is_valid_email(email):
    # 기본적인 이메일 형식 검사
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email))
# ==========================================

@gameBP.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username'))

@gameBP.route('/api/send_code', methods=['POST'])
def send_code():
    data = request.json or {}
    email = data.get('email')
    
    if not is_valid_email(email):
        return jsonify({"success": False, "msg": "유효하지 않은 이메일 형식입니다."})

    email = sanitize_input(email)
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    session['verification_code'] = code
    session['verification_email'] = email

    sender_email = getattr(Config, 'SMTP_EMAIL', None)
    sender_password = getattr(Config, 'SMTP_PASSWORD', None)

    if sender_email and sender_password:
        try:
            if callable(Config.SendEmail):
                html_content = Config.SendEmail(code)
            else:
                html_content = Config.SendEmail.format(code=code)

            msg = MIMEText(html_content, 'html', 'utf-8')
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
        print(f"\n======================================")
        print(f">>> [TEST MODE] {email} 로 발송된 코드: {code}")
        print(f"======================================\n")
        return jsonify({"success": True, "msg": "[TEST 모드] 서버 콘솔 창에서 보안 코드를 확인하십시오."})

@gameBP.route('/api/register', methods=['POST'])
def register_local():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    code = data.get('code')

    if not is_valid_username(username):
        return jsonify({"success": False, "msg": "ID는 3~20자의 영문, 숫자, 언더바(_)만 사용 가능합니다."})
    if not is_valid_password(password):
        return jsonify({"success": False, "msg": "암호 코드는 6자 이상이어야 합니다."})
    if not is_valid_email(email):
        return jsonify({"success": False, "msg": "유효하지 않은 이메일 형식입니다."})
    if not isinstance(code, str):
        return jsonify({"success": False, "msg": "보안 코드 형식이 잘못되었습니다."})

    username = sanitize_input(username)
    email = sanitize_input(email)
    code = sanitize_input(code)

    if session.get('verification_code') != code or session.get('verification_email') != email:
        return jsonify({"success": False, "msg": "보안 코드가 일치하지 않거나 만료되었습니다."})

    if fbManager.getAuthData(username):
        return jsonify({"success": False, "msg": "이미 존재하는 생존자 ID입니다."})

    random_num = random.randrange(10**17, 10**18)
    new_user_id = f"gc-{random_num}"

    pw_hash = generate_password_hash(password)
    fbManager.registerUserAuth(username, pw_hash, new_user_id)

    userData = gameEngine.initNewPlayer()
    userData['username'] = username
    userData['email'] = email 
    fbManager.setUserData(new_user_id, userData)

    session.pop('verification_code', None)
    session.pop('verification_email', None)

    return jsonify({"success": True, "msg": "등록 완료. 접근 승인."})

@gameBP.route('/api/login_local', methods=['POST'])
def login_local():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')

    # 검증 실패 시 DB 접근 자체를 차단
    if not is_valid_username(username) or not is_valid_password(password):
        return jsonify({"success": False, "msg": "존재하지 않는 생존자이거나 자격 증명이 잘못되었습니다."})

    username = sanitize_input(username)
    
    auth_data = fbManager.getAuthData(username)
    if not auth_data:
        return jsonify({"success": False, "msg": "존재하지 않는 생존자입니다."})

    userId = auth_data.get('userId')
    userData = fbManager.getUserData(userId)
    
    if userData and userData.get('banned_until', 0) > time.time():
        remain = int((userData['banned_until'] - time.time()) / 86400) + 1
        return jsonify({"success": False, "msg": f"<br>시스템 접근이 차단되었습니다. (정지 해제까지 약 {remain}일)"})

    if check_password_hash(auth_data.get('password', ''), password):
        if userData and userData.get('force_logout'):
            userData['force_logout'] = False
            fbManager.setUserData(userId, userData)

        session['user_id'] = userId
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
        
        userId = user_data['id']
        username = sanitize_input(user_data['username'])
        
        userData = fbManager.getUserData(userId)
        
        if userData and userData.get('banned_until', 0) > time.time():
            remain = int((userData['banned_until'] - time.time()) / 86400) + 1
            return f"<script>alert('접근 차단: 계정이 정지되었습니다. (약 {remain}일 남음)'); window.location.href='/';</script>"

        if userData and userData.get('force_logout'):
            userData['force_logout'] = False
            fbManager.setUserData(userId, userData)

        session['user_id'] = userId
        session['username'] = username

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
    
    if userData.get('banned_until', 0) > time.time() or userData.get('force_logout'):
        if userData.get('force_logout'):
            userData['force_logout'] = False
            fbManager.setUserData(userId, userData)
        session.clear()
        return jsonify({"error": "Force Logout"}), 401

    responsePayload = gameEngine.getGameResponse(userData)
    return jsonify(responsePayload)

@gameBP.route('/api/action', methods=['POST'])
def handleAction():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    userId = session['user_id']
    
    actionType = data.get('type')
    target = data.get('target')
    if not isinstance(actionType, str) or (target is not None and not isinstance(target, str)):
        return jsonify({"error": "Invalid payload data type"}), 400

    currentUserData = fbManager.getUserData(userId)
    
    if currentUserData.get('banned_until', 0) > time.time() or currentUserData.get('force_logout'):
        if currentUserData.get('force_logout'):
            currentUserData['force_logout'] = False
            fbManager.setUserData(userId, currentUserData)
        session.clear()
        return jsonify({"error": "Force Logout"}), 401

    responsePayload = gameEngine.processAction(currentUserData, actionType, target)
    fbManager.updateUserData(userId, responsePayload['userData'])
    return jsonify(responsePayload)

# ==========================================
# ADMIN API
# ==========================================
def is_admin():
    return session.get('username') in getattr(Config, 'ADMIN_ACCOUNTS', [])

@gameBP.route('/admin')
def admin_panel():
    if not is_admin(): return "⚠️ ACCESS DENIED : SECURITY LEVEL OMEGA REQUIRED.", 403
    return render_template('admin.html')

@gameBP.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    return jsonify(fbManager.getAllUsers())

@gameBP.route('/api/admin/user/<user_id>', methods=['POST'])
def admin_update_user(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    new_data = request.json
    if not new_data or not isinstance(new_data, dict):
        return jsonify({"error": "Invalid payload"}), 400
    fbManager.setUserData(user_id, new_data)
    return jsonify({"success": True, "msg": "유저 데이터가 업데이트되었습니다."})

@gameBP.route('/api/admin/user/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    success = fbManager.deleteUserComplete(user_id)
    return jsonify({"success": success})

@gameBP.route('/api/admin/user/<user_id>/logout', methods=['POST'])
def admin_force_logout(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    userData = fbManager.getUserData(user_id)
    if userData:
        userData['force_logout'] = True
        fbManager.setUserData(user_id, userData)
    return jsonify({"success": True})

@gameBP.route('/api/admin/user/<user_id>/suspend', methods=['POST'])
def admin_suspend_user(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    days = request.json.get('days', 0)
    if not isinstance(days, int):
        return jsonify({"error": "Invalid data type"}), 400
        
    userData = fbManager.getUserData(user_id)
    if userData:
        if days > 0:
            userData['banned_until'] = time.time() + (days * 86400)
            userData['force_logout'] = True 
        else:
            userData['banned_until'] = 0 
        fbManager.setUserData(user_id, userData)
    return jsonify({"success": True})

# ==========================================
# COMMUNICATION API
# ==========================================

@gameBP.route('/api/notices', methods=['GET'])
def get_notices():
    return jsonify(fbManager.getGlobalNotices())

@gameBP.route('/api/messages', methods=['GET'])
def get_messages():
    if 'user_id' not in session: 
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(fbManager.getPrivateMessages(session['user_id']))

@gameBP.route('/api/admin/notice', methods=['POST'])
def admin_send_notice():
    if not is_admin(): 
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json or {}
    data['timestamp'] = int(time.time())
    fbManager.sendGlobalNotice(data)
    return jsonify({"success": True})

@gameBP.route('/api/admin/user/<user_id>/message', methods=['POST'])
def admin_send_message(user_id):
    if not is_admin(): 
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json or {}
    data['timestamp'] = int(time.time())
    fbManager.sendPrivateMessage(user_id, data)
    return jsonify({"success": True})