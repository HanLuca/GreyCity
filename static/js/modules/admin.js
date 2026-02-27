document.addEventListener('DOMContentLoaded', () => {
    let allUsers = {};
    let currentUserId = null;

    const userListEl = document.getElementById('userList');
    const searchInput = document.getElementById('searchInput');
    const userCountInfo = document.getElementById('userCountInfo');
    const editorTitle = document.getElementById('editorTitle');
    const jsonEditor = document.getElementById('jsonEditor');
    const statusMsg = document.getElementById('statusMsg');
    
    const btnSave = document.getElementById('btnSave');
    const btnForceLogout = document.getElementById('btnForceLogout');
    const btnSuspend = document.getElementById('btnSuspend');
    const btnDelete = document.getElementById('btnDelete');
    const btnSendMessage = document.getElementById('btnSendMessage');
    const btnGlobalNotice = document.getElementById('btnGlobalNotice');

    // 에디터 모달 요소
    const composeModal = document.getElementById('composeModal');
    const composeTitle = document.getElementById('composeTitle');
    const composeSubject = document.getElementById('composeSubject');
    const composeBody = document.getElementById('composeBody');
    const btnSendCompose = document.getElementById('btnSendCompose');
    const btnCancelCompose = document.getElementById('btnCancelCompose');
    const btnCloseCompose = document.getElementById('btnCloseCompose');
    
    let composeContext = { type: null, targetId: null };

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            allUsers = await res.json();
            renderUserList();
        } catch(e) { 
            console.error(e); 
            userCountInfo.innerText = "데이터베이스 연결 실패";
        }
    }

    function renderUserList(filterText = '') {
        userListEl.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();
        let count = 0;
        const now = Date.now() / 1000; 

        for (const [userId, data] of Object.entries(allUsers)) {
            const username = (data.username || 'Unknown').toLowerCase();
            const email = (data.email || 'No Email Registered').toLowerCase();
            const uid = userId.toLowerCase();

            if (username.includes(lowerFilter) || email.includes(lowerFilter) || uid.includes(lowerFilter)) {
                count++;
                const div = document.createElement('div');
                div.className = 'user-item';
                if (userId === currentUserId) div.classList.add('active');
                
                let banTag = "";
                if (data.banned_until && data.banned_until > now) {
                    let remainDays = Math.ceil((data.banned_until - now) / 86400);
                    banTag = `<span style="color:#ff9900; font-weight:bold; font-size:10px; border:1px solid #ff9900; padding:2px 4px; border-radius:3px; margin-left:5px;">[정지됨: ${remainDays}일 남음]</span>`;
                }

                div.innerHTML = `
                    <div class="user-item-name">
                        <span>${data.username || 'Unknown'} ${banTag}</span>
                        <span style="font-size:10px; color:#555;">Lv.${data.level || 1}</span>
                    </div>
                    <div class="user-item-email">✉️ ${data.email || 'No Email'}</div>
                    <div class="user-item-stats">
                        ID: ${userId} <br>
                        HP: <span style="color:#ff2a2a">${data.hp || 0}</span> / ${data.maxHp || 0} | 🫀: ${data.heart_fragments || 0}
                    </div>
                `;
                div.addEventListener('click', () => selectUser(userId, div));
                userListEl.appendChild(div);
            }
        }

        userCountInfo.innerText = `총 ${count}명의 생존자 발견`;
        if (count === 0) {
            userListEl.innerHTML = `<div style="text-align:center; margin-top:30px; color:#555;">검색 결과가 없습니다.</div>`;
        }
    }

    searchInput.addEventListener('input', (e) => renderUserList(e.target.value));

    function selectUser(userId, el) {
        document.querySelectorAll('.user-item').forEach(d => d.classList.remove('active'));
        el.classList.add('active');
        
        currentUserId = userId;
        editorTitle.innerText = `선택된 유저 : ${allUsers[userId].username}`;
        jsonEditor.value = JSON.stringify(allUsers[userId], null, 4);
        jsonEditor.disabled = false;
        
        btnSave.disabled = false;
        btnSendMessage.disabled = false;
        btnForceLogout.disabled = false;
        btnSuspend.disabled = false;
        btnDelete.disabled = false;

        statusMsg.innerText = "수정 가능";
        statusMsg.style.color = "#00e5ff";
    }

    // 모달 제어 함수
    function openComposeModal(type, targetId = null, targetName = '') {
        composeContext = { type, targetId };
        composeSubject.value = '';
        composeBody.value = '';
        
        const modalContent = composeModal.querySelector('.admin-modal-content');
        
        if (type === 'notice') {
            composeTitle.innerText = `📢 전체 공지 발송`;
            composeTitle.style.color = '#00e5ff';
            modalContent.style.borderColor = '#00e5ff';
            modalContent.style.boxShadow = '0 0 30px rgba(0,229,255,0.2)';
            btnSendCompose.className = 'panel-btn notice-btn';
        } else {
            composeTitle.innerText = `✉️ 메세지 전송 : [ ${targetName} ]`;
            composeTitle.style.color = '#00ff88';
            modalContent.style.borderColor = '#00ff88';
            modalContent.style.boxShadow = '0 0 30px rgba(0,255,136,0.2)';
            btnSendCompose.className = 'panel-btn';
            btnSendCompose.style.borderColor = '#00ff88';
            btnSendCompose.style.color = '#00ff88';
            btnSendCompose.style.background = 'rgba(0,255,136,0.05)';
        }
        composeModal.classList.add('active');
        composeSubject.focus();
    }

    function closeComposeModal() {
        composeModal.classList.remove('active');
    }

    btnCancelCompose.addEventListener('click', closeComposeModal);
    btnCloseCompose.addEventListener('click', closeComposeModal);

    btnSendCompose.addEventListener('click', async () => {
        const title = composeSubject.value.trim();
        const content = composeBody.value.trim();

        if (!title || !content) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        let endpoint = composeContext.type === 'notice' ? '/api/admin/notice' : `/api/admin/user/${composeContext.targetId}/message`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: title, content: content})
        });
        const result = await res.json();
        
        if (result.success) {
            closeComposeModal();
            alert(composeContext.type === 'notice' ? "전체 공지사항이 시스템에 등록되었습니다." : "메세지 전송이 완료되었습니다.");
        }
    });

    btnGlobalNotice.addEventListener('click', () => openComposeModal('notice'));
    
    btnSendMessage.addEventListener('click', () => {
        if(!currentUserId) return;
        openComposeModal('message', currentUserId, allUsers[currentUserId].username);
    });

    btnSave.addEventListener('click', async () => {
        if(!currentUserId) return;
        try {
            const newData = JSON.parse(jsonEditor.value);
            statusMsg.innerText = "업데이트 중...";
            statusMsg.style.color = "#fff";

            const res = await fetch(`/api/admin/user/${currentUserId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newData)
            });
            const result = await res.json();
            
            if(result.success) {
                statusMsg.innerText = "업데이트 완료!";
                statusMsg.style.color = "#00e5ff";
                allUsers[currentUserId] = newData; 
                renderUserList(searchInput.value); 
            }
        } catch(e) {
            statusMsg.innerText = "JSON 형식 오류";
            statusMsg.style.color = "#ff2a2a";
            alert("JSON 형식이 잘못되었습니다.");
        }
    });

    btnForceLogout.addEventListener('click', async () => {
        if(!currentUserId) return;
        if(confirm(`[ ${allUsers[currentUserId].username} ] 유저를 즉시 로그아웃 시키겠습니까?\n접속 중이라면 즉시 메인 화면으로 튕겨납니다.`)) {
            statusMsg.innerText = "로그아웃 처리 중...";
            statusMsg.style.color = "#ff9900";
            const res = await fetch(`/api/admin/user/${currentUserId}/logout`, { method: 'POST' });
            const result = await res.json();
            if(result.success) {
                statusMsg.innerText = "강제 로그아웃 명령 전송됨!";
                statusMsg.style.color = "#00e5ff";
            }
        }
    });

    btnSuspend.addEventListener('click', async () => {
        if(!currentUserId) return;
        let days = prompt(`[ ${allUsers[currentUserId].username} ] 유저를 며칠 동안 정지하시겠습니까? (숫자만 입력)\n※ 정지 해제를 원하시면 0 을 입력하세요.`);
        if (days !== null && !isNaN(days) && days.trim() !== "") {
            days = parseInt(days);
            statusMsg.innerText = "정지 처리 중...";
            statusMsg.style.color = "#ff9900";
            const res = await fetch(`/api/admin/user/${currentUserId}/suspend`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({days: days})
            });
            const result = await res.json();
            if(result.success) {
                alert(days > 0 ? `${days}일 계정 정지 처리가 완료되었습니다.` : "계정 정지가 해제되었습니다.");
                statusMsg.innerText = "계정 정지 적용됨!";
                statusMsg.style.color = "#00e5ff";
                fetchUsers(); 
            }
        }
    });

    btnDelete.addEventListener('click', async () => {
        if(!currentUserId) return;
        if(confirm("⚠️ 경고: 이 유저를 시스템에서 영구적으로 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.")) {
            statusMsg.innerText = "데이터 삭제 중...";
            statusMsg.style.color = "#ff2a2a";
            const res = await fetch(`/api/admin/user/${currentUserId}`, { method: 'DELETE' });
            const result = await res.json();
            if(result.success) {
                alert("대상이 영구 삭제되었습니다.");
                jsonEditor.value = '';
                jsonEditor.disabled = true;
                btnSave.disabled = true;
                btnSendMessage.disabled = true;
                btnForceLogout.disabled = true;
                btnSuspend.disabled = true;
                btnDelete.disabled = true;
                editorTitle.innerText = '대상을 선택하십시오.';
                statusMsg.innerText = "대기 중...";
                currentUserId = null;
                fetchUsers(); 
            } else {
                statusMsg.innerText = "삭제 실패";
            }
        }
    });

    document.getElementById('btnReturn').addEventListener('click', () => {
        window.location.href = '/';
    });

    fetchUsers();
});