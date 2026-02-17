/**
 * 서버와의 비동기 통신을 담당하는 모듈
 */
export class GameAPI {
    static async loadGame() {
        try {
            const response = await fetch('/api/loadGame', { method: 'POST' });
            return await response.json();
        } catch (error) {
            console.error("API Load Error:", error);
            return null;
        }
    }

    static async sendAction(type, target = null) {
        try {
            const payload = { type: type, target: target };
            const response = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error("API Action Error:", error);
            return null;
        }
    }
}