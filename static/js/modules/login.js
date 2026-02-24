document.addEventListener('DOMContentLoaded', () => {
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const formTrack = document.getElementById('formTrack');
    const externalSection = document.getElementById('externalLoginSection');
    const msgEl = document.getElementById('statusMsg');

    const l_id = document.getElementById('l_id');
    const l_pw = document.getElementById('l_pw');
    const r_id = document.getElementById('r_id');
    const r_pw = document.getElementById('r_pw');
    const r_email = document.getElementById('r_email');
    const r_code = document.getElementById('r_code');
    const codeWrapper = document.getElementById('codeWrapper');
    const btnSendCode = document.getElementById('btnSendCode');

    setTimeout(() => updateSliderHeight('login'), 100);

    function updateSliderHeight(mode) {
        const slider = document.querySelector('.form-slider');
        const activeForm = document.getElementById(mode === 'login' ? 'loginForm' : 'registerForm');
        if(activeForm) {
            slider.style.height = activeForm.offsetHeight + 'px';
        }
    }

    function switchTab(mode) {
        tabLoginBtn.classList.remove('active');
        tabRegisterBtn.classList.remove('active');
        msgEl.innerText = '';
        
        if (mode === 'login') {
            tabLoginBtn.classList.add('active');
            formTrack.style.transform = 'translateX(0)';
            externalSection.style.display = 'block';
        } else {
            tabRegisterBtn.classList.add('active');
            formTrack.style.transform = 'translateX(-50%)';
            externalSection.style.display = 'none';
        }
        setTimeout(() => updateSliderHeight(mode), 10);
    }

    tabLoginBtn.addEventListener('click', () => switchTab('login'));
    tabRegisterBtn.addEventListener('click', () => switchTab('register'));

    // ==========================================
    // 로그인 처리
    // ==========================================
    document.getElementById('btnLoginSubmit').addEventListener('click', async () => {
        const id = l_id.value;
        const pw = l_pw.value;

        if (!id || !pw) {
            msgEl.innerText = "ID와 암호를 입력하십시오.";
            msgEl.className = "msg error";
            return;
        }

        // 통신 대기 중 출력할 로딩 메시지
        msgEl.innerText = "사용자 정보를 확인 중...";
        msgEl.className = "msg";

        try {
            const res = await fetch('/api/login_local', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: id, password: pw})
            });
            const data = await res.json();

            if (data.success) {
                msgEl.innerText = "접속 승인. 시스템 연결 중...";
                msgEl.className = "msg success";
                setTimeout(() => window.location.reload(), 1000);
            } else {
                msgEl.innerText = "접근 거부: " + data.msg;
                msgEl.className = "msg error";
            }
        } catch (e) {
            msgEl.innerText = "네트워크 통신 오류.";
            msgEl.className = "msg error";
        }
    });

    // ==========================================
    // 이메일 인증 코드 발송
    // ==========================================
    btnSendCode.addEventListener('click', async () => {
        const email = r_email.value.trim();

        if (!email) {
            msgEl.innerText = "이메일 주소를 입력하십시오.";
            msgEl.className = "msg error";
            return;
        }

        msgEl.innerText = "보안 서버와 통신 중... (코드 발송)";
        msgEl.className = "msg";
        btnSendCode.innerText = "[ WAITING ]";
        btnSendCode.style.pointerEvents = "none";

        try {
            const res = await fetch('/api/send_code', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: email})
            });
            const data = await res.json();

            btnSendCode.innerText = "[ RESEND ]";
            btnSendCode.style.pointerEvents = "auto";

            if (data.success) {
                msgEl.innerText = data.msg;
                msgEl.className = "msg success";
                
                if(codeWrapper.style.display === 'none' || codeWrapper.classList.contains('hidden')) {
                    codeWrapper.style.display = 'block';
                    codeWrapper.classList.remove('hidden');
                    codeWrapper.classList.add('fade-in-down');
                    setTimeout(() => updateSliderHeight('register'), 10);
                }
            } else {
                msgEl.innerText = data.msg;
                msgEl.className = "msg error";
            }
        } catch (e) {
            btnSendCode.innerText = "[ SEND ]";
            btnSendCode.style.pointerEvents = "auto";
            msgEl.innerText = "네트워크 통신 오류.";
            msgEl.className = "msg error";
        }
    });

    // ==========================================
    // 회원 가입 처리
    // ==========================================
    document.getElementById('btnRegisterSubmit').addEventListener('click', async () => {
        const id = r_id.value.trim();
        const pw = r_pw.value.trim();
        const email = r_email.value.trim();
        const code = r_code.value.trim();

        if (!id || !pw || !email) {
            msgEl.innerText = "모든 등록 정보를 입력하십시오.";
            msgEl.className = "msg error";
            return;
        }

        if (codeWrapper.style.display === 'block' && !code) {
            msgEl.innerText = "수신된 보안 코드를 정확히 입력하십시오.";
            msgEl.className = "msg error";
            return;
        }

        // 통신 대기 중 출력할 로딩 메시지
        msgEl.innerText = "시스템에 생존자 정보를 등록 중...";
        msgEl.className = "msg";

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: id, password: pw, email: email, code: code})
            });
            const data = await res.json();

            if (data.success) {
                msgEl.innerText = "등록 완료. 시스템 접근을 승인합니다.";
                msgEl.className = "msg success";
                
                r_id.value = ''; r_pw.value = ''; r_email.value = ''; r_code.value = '';
                codeWrapper.style.display = 'none';
                codeWrapper.classList.remove('fade-in-down');
                btnSendCode.innerText = "[ SEND ]";
                
                setTimeout(() => updateSliderHeight('register'), 10);
                setTimeout(() => switchTab('login'), 1500);
            } else {
                msgEl.innerText = "등록 거부됨: " + data.msg;
                msgEl.className = "msg error";
            }
        } catch (e) {
            msgEl.innerText = "네트워크 통신 오류.";
            msgEl.className = "msg error";
        }
    });

    document.getElementById('btnDiscordLogin').addEventListener('click', () => { window.location.href = '/login/discord'; });

    l_pw.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnLoginSubmit').click(); });
    r_pw.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnRegisterSubmit').click(); });
    r_code.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnRegisterSubmit').click(); });
});