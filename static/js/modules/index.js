import { UIManager } from './ui.js';

export class Main {
    constructor() {
        this.ui = new UIManager();
        this.init();
        this.bindGlobalEvents(); // 계정 초기화 등 글로벌 이벤트 리스너 바인딩
    }

    async init() {
        console.log("Game Client Initializing...");
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
                if (res.status === 401) window.location.href = '/';
                throw new Error(`HTTP Error: ${res.status}`);
            }

            const data = await res.json();
            this.ui.update(data, (type, target) => this.handleAction(type, target));
            
        } catch (e) {
            console.error("Game Load Failed:", e);
            document.getElementById('locName').innerText = "Connection Error";
            document.getElementById('gameLog').innerHTML = "<span style='color:red'>서버와 연결할 수 없습니다.</span>";
        }
    }

    // 사용자 행동 처리
    async handleAction(type, target) {
        try {
            const res = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, target })
            });

            const data = await res.json();
            this.ui.update(data, (t, tgt) => this.handleAction(t, tgt));

        } catch (e) {
            console.error("Action Failed:", e);
        }
    }

// HTML에 흩어져있던 버튼 이벤트들을 자바스크립트로 통합 관리
    bindGlobalEvents() {
        // [기존] 데이터 완전 초기화 로직
        const btnReset = document.getElementById('btnResetAccount');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm("⚠️ 경고\n이 작업은 되돌릴 수 없습니다.\n계정의 레벨, 스탯, 아이템 등 모든 게임 진행 상황이 처음으로 초기화됩니다.\n\n정말 초기화하시겠습니까?")) {
                    let checkText = prompt("초기화를 진행하려면 아래 입력창에 '초기화 확인' 이라고 정확히 입력해주세요.");
                    if (checkText === "초기화 확인") {
                        fetch('/api/reset_account', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                            if(data.success) {
                                alert("데이터가 완전히 초기화되었습니다.\n게임을 재시작합니다.");
                                window.location.reload();
                            } else {
                                alert("초기화 실패: " + (data.error || "알 수 없는 오류"));
                            }
                        })
                        .catch(e => alert("서버 통신 오류가 발생했습니다."));
                    } else if (checkText !== null) {
                        alert("입력한 문구가 일치하지 않아 취소되었습니다.");
                    }
                }
            });
        }

        const btnDelete = document.getElementById('btnDeleteAccount');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                if (confirm("⚠️ 심각한 경고\n이 작업은 즉시 계정을 영구적으로 삭제하며, 어떤 방법으로도 복구할 수 없습니다.\n\n정말 계정을 삭제하시겠습니까?")) {
                    let checkText = prompt("계정을 영구 삭제하려면 아래 입력창에 '영구 삭제 확인' 이라고 정확히 입력해주세요.");
                    if (checkText === "영구 삭제 확인") {
                        fetch('/api/delete_account', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                            if(data.success) {
                                alert("계정이 영구적으로 삭제되었습니다.\n그동안 플레이해주셔서 감사합니다.");
                                window.location.href = '/';
                            } else {
                                alert("삭제 실패: " + (data.error || "알 수 없는 오류"));
                            }
                        })
                        .catch(e => alert("서버 통신 오류가 발생했습니다."));
                    } else if (checkText !== null) {
                        alert("입력한 문구가 일치하지 않아 취소되었습니다.");
                    }
                }
            });
        }

        // 사이드 패널 네비게이션 모달 열기 이벤트 바인딩
        const btnSettings = document.getElementById('navBtnSettings');
        if(btnSettings) btnSettings.addEventListener('click', () => window.openModalAnimation('settingsModal'));

        const btnArchive = document.getElementById('navBtnArchive');
        if(btnArchive) btnArchive.addEventListener('click', () => window.openModalAnimation('archiveModal'));

        const btnUpgrade = document.getElementById('navBtnUpgrade');
        if(btnUpgrade) btnUpgrade.addEventListener('click', () => window.openModalAnimation('upgradeModal'));
    }
}

// DOM이 완전히 로드된 후 게임 엔진 객체 생성
document.addEventListener('DOMContentLoaded', () => {
    const game = new Main();
});