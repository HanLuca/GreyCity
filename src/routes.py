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
import time # 계정 정지 시간 계산을 위해 추가됨

gameBP = Blueprint('gameBP', __name__)
fbManager = FirebaseManager()
gameEngine = GameEngine()

@gameBP.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username'))

@gameBP.route('/api/send_code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "msg": "이메일을 입력하십시오."})

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
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    code = data.get('code')

    if not username or not password or not email or not code:
        return jsonify({"success": False, "msg": "모든 정보를 입력 및 인증하십시오."})

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
    data = request.json
    username = data.get('username')
    password = data.get('password')

    auth_data = fbManager.getAuthData(username)
    if not auth_data:
        return jsonify({"success": False, "msg": "존재하지 않는 생존자입니다."})

    userId = auth_data['userId']
    userData = fbManager.getUserData(userId)
    
    # 🚨 정지된 계정인지 확인 (로그인 차단)
    if userData and userData.get('banned_until', 0) > time.time():
        remain = int((userData['banned_until'] - time.time()) / 86400) + 1
        return jsonify({"success": False, "msg": f"<br>시스템 접근이 차단되었습니다. (정지 해제까지 약 {remain}일)"})

    if check_password_hash(auth_data['password'], password):
        # 로그인 성공 시 혹시 남아있는 강제 로그아웃 플래그 해제
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
        username = user_data['username']
        
        userData = fbManager.getUserData(userId)
        
        # 🚨 정지된 계정인지 확인 (디스코드 로그인 차단)
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
    
    # 🚨 플레이 도중 계정 정지 / 강제 로그아웃 당했는지 실시간 체크하여 세션 파기
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

    data = request.json
    userId = session['user_id']
    actionType = data.get('type')
    target = data.get('target')

    currentUserData = fbManager.getUserData(userId)
    
    # 🚨 액션(이동/버튼 클릭) 순간에도 차단 여부 실시간 체크
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
# 관리자(ADMIN) 전용 API
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
    fbManager.setUserData(user_id, new_data)
    return jsonify({"success": True, "msg": "유저 데이터가 업데이트되었습니다."})

@gameBP.route('/api/admin/user/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    success = fbManager.deleteUserComplete(user_id)
    return jsonify({"success": success})

# 💡 [신규] 사용자 강제 로그아웃 API
@gameBP.route('/api/admin/user/<user_id>/logout', methods=['POST'])
def admin_force_logout(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    userData = fbManager.getUserData(user_id)
    if userData:
        userData['force_logout'] = True
        fbManager.setUserData(user_id, userData)
    return jsonify({"success": True})

# 💡 [신규] 사용자 계정 정지 API
@gameBP.route('/api/admin/user/<user_id>/suspend', methods=['POST'])
def admin_suspend_user(user_id):
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 403
    days = request.json.get('days', 0)
    userData = fbManager.getUserData(user_id)
    if userData:
        if days > 0:
            userData['banned_until'] = time.time() + (days * 86400) # 일수 -> 초 단위 변환
            userData['force_logout'] = True # 정지 먹이면 즉시 접속도 끊기게 함
        else:
            userData['banned_until'] = 0 # 0일 입력 시 정지 해제
        fbManager.setUserData(user_id, userData)
    return jsonify({"success": True})