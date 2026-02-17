import { GameAPI } from './modules/api.js';
import { UIManager } from './modules/ui.js';

// 게임 상태 및 UI 매니저 초기화
const ui = new UIManager();

// 메인 실행 함수
async function main() {
    // 초기 데이터 로드
    const data = await GameAPI.loadGame();
    if (data) {
        ui.update(data, handleUserAction);
    }
}

// 유저 행동 처리 핸들러 (UI 모듈에 콜백으로 전달됨)
async function handleUserAction(type, target) {
    const data = await GameAPI.sendAction(type, target);
    if (data) {
        ui.update(data, handleUserAction);
    }
}

// DOM 로드 완료 시 실행
document.addEventListener("DOMContentLoaded", main);