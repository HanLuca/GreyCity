import { UIManager } from './modules/ui.js';

// 메인 게임 클래스
export class Main {
    constructor() {
        this.ui = new UIManager();
        this.init();
    }

    async init() {
        console.log("Game Client Initializing...");
        
        // 1. 게임 로드 (서버에서 데이터 가져오기)
        await this.loadGame();
    }

    // 서버에 게임 데이터 요청
    async loadGame() {
        try {
            const res = await fetch('/api/loadGame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                // 로그인 안되어있으면 로그인 페이지로 튕김
                if (res.status === 401) window.location.href = '/';
                throw new Error(`HTTP Error: ${res.status}`);
            }

            const data = await res.json();
            
            // UI 업데이트 및 액션 콜백 연결
            this.ui.update(data, (type, target) => this.handleAction(type, target));
            
        } catch (e) {
            console.error("Game Load Failed:", e);
            document.getElementById('locName').innerText = "Connection Error";
            document.getElementById('gameLog').innerHTML = "<span style='color:red'>서버와 연결할 수 없습니다.</span>";
        }
    }

    // 사용자 행동 처리 (이동, 공격, 아이템 사용 등)
    async handleAction(type, target) {
        try {
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, target })
            });

            const data = await res.json();
            
            // 행동 결과로 화면 갱신
            this.ui.update(data, (t, tgt) => this.handleAction(t, tgt));

        } catch (e) {
            console.error("Action Failed:", e);
        }
    }
}

// 페이지 로드 시 게임 시작
window.onload = () => {
    const game = new Main();
};