from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from src.firebaseManager import FirebaseManager
from src.gameEngine import GameEngine
from config import Config
import requests
import random

gameBP = Blueprint('gameBP', __name__)
fbManager = FirebaseManager()
gameEngine = GameEngine()

# --- [인증 및 세션 관리] ---

@gameBP.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username'))

# [신규] 자체 회원가입 API
@gameBP.route('/api/register', methods=['POST'])
def register_local():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"success": False, "msg": "아이디와 비밀번호를 입력하세요."})

    # 1. 중복 아이디 체크
    if fbManager.getAuthData(username):
        return jsonify({"success": False, "msg": "이미 존재하는 생존자 코드(ID)입니다."})

    # 2. 고유 ID 생성 (gc- + 18자리 숫자)
    # 10^17 ~ 10^18-1 범위의 랜덤 숫자
    random_num = random.randrange(10**17, 10**18)
    new_user_id = f"gc-{random_num}"

    # 3. 비밀번호 해싱 및 Auth 저장
    pw_hash = generate_password_hash(password)
    fbManager.registerUserAuth(username, pw_hash, new_user_id)

    # 4. 초기 게임 데이터 생성 및 저장
    userData = gameEngine.initNewPlayer()
    userData['username'] = username
    fbManager.setUserData(new_user_id, userData)

    return jsonify({"success": True, "msg": "등록 완료. 접근 승인."})

# [신규] 자체 로그인 API
@gameBP.route('/api/login_local', methods=['POST'])
def login_local():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # 1. Auth 데이터 조회
    auth_data = fbManager.getAuthData(username)
    
    if not auth_data:
        return jsonify({"success": False, "msg": "존재하지 않는 생존자입니다."})

    # 2. 비밀번호 검증
    if check_password_hash(auth_data['password'], password):
        # 로그인 성공 -> 세션 설정
        session['user_id'] = auth_data['userId']
        session['username'] = username
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "msg": "암호 코드가 일치하지 않습니다."})

# [기존] 디스코드 로그인 리다이렉트
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

# [기존] 디스코드 콜백
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
        
        # 디스코드는 숫자 ID를 그대로 사용
        session['user_id'] = user_data['id']
        session['username'] = user_data['username']

        return redirect(url_for('gameBP.index'))
    except Exception as e:
        return f"Login Error: {str(e)}"

@gameBP.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('gameBP.index'))


# --- [게임 로직 API] ---

@gameBP.route('/api/loadGame', methods=['POST'])
def loadGame():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    userId = session['user_id']
    userData = fbManager.getUserData(userId)
    
    if not userData:
        # (디스코드 유저의 경우 여기서 최초 생성될 수 있음)
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