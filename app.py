from flask import Flask
from src.routes import gameBP
from config import Config
import os

# 템플릿/스태틱 폴더 절대경로 지정
template_dir = os.path.abspath('templates')
static_dir = os.path.abspath('static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# Config 적용 (Secret Key 등)
app.config.from_object(Config)

# Blueprint 등록
app.register_blueprint(gameBP)

if __name__ == '__main__':
    print(f"Server running at: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)