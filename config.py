import os

class Config:
    # Flask 세션 암호화 키 (임의의 문자열)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'my_super_secret_key_for_session'
    
    # Firebase 키 파일 경로
    FIREBASE_KEY_PATH = 'serviceAccountKey.json'
    FIREBASE_DB_URL = 'https://plant-2e41f-default-rtdb.asia-southeast1.firebasedatabase.app/'

    # Discord OAuth2 설정 (개발자 포털에서 복사한 값 넣기)
    DISCORD_CLIENT_ID = '1473345135227174943'
    DISCORD_CLIENT_SECRET = 'UZjZBDPldIjdZrGCCEcic91jffpHrIrG'
    DISCORD_REDIRECT_URI = 'https://greycity-1.onrender.com/callback' # 'http://127.0.0.1:5000/callback'
    DISCORD_API_BASE_URL = 'https://discord.com/api'

    SMTP_EMAIL = 'devsion2025@gmail.com'
    SMTP_PASSWORD = 'ftgvvxgqehgdiqle'

    ADMIN_ACCOUNTS = ['admin-sion260225'] # ftgvvxgqehgdiqle260225$$

    def SendEmail(code):
        BODY = f"""
            <div style="background-color: #050505; color: #ccc; font-family: 'Courier New', Courier, monospace; padding: 40px 20px; text-align: center; width: 100%; box-sizing: border-box;">
                <div style="max-width: 450px; margin: 0 auto; border: 1px solid #333; background-color: #111; padding: 30px; box-shadow: 0 0 15px rgba(0, 229, 255, 0.15);">
                    
                    <div style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #00e5ff; margin: 0; font-size: 24px; letter-spacing: 2px;">GREY CITY</h1>
                        <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">ACCESS TERMINAL v2.0</p>
                    </div>

                    <p style="color: #bd00ff; font-weight: bold; font-size: 13px; margin-bottom: 25px; letter-spacing: 1px;">
                        [ SYSTEM NOTIFICATION : SECURITY VERIFICATION ]
                    </p>

                    <p style="font-size: 13px; line-height: 1.6; text-align: left; margin-bottom: 30px; color: #aaa;">
                        시스템 접근 요청이 감지되었습니다.<br>
                        신원 증명을 위해 아래의 보안 코드를 단말기에 입력하십시오.
                    </p>

                    <div style="background-color: rgba(0, 229, 255, 0.05); border: 1px solid #00e5ff; padding: 25px 10px; margin-bottom: 30px; border-radius: 4px;">
                        <p style="color: #888; font-size: 11px; margin: 0 0 10px 0; letter-spacing: 2px;">ACCESS CODE</p>
                        <p style="color: #00e5ff; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 0; text-shadow: 0 0 5px rgba(0, 229, 255, 0.5);">
                            {code}
                        </p>
                    </div>

                    <div style="font-size: 11px; color: #555; text-align: left; line-height: 1.6; border-top: 1px dashed #333; padding-top: 15px;">
                        > STATUS: WAITING FOR USER INPUT...<br>
                        > WARNING: 본 코드는 본인이 요청하지 않은 경우 즉시 폐기하십시오.<br>
                        > _END_OF_TRANSMISSION_
                    </div>

                </div>
            </div>
        """
        return BODY 