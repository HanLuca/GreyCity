document.addEventListener('DOMContentLoaded', () => {
    let allUsers = {};
    let currentUserId = null;

    const userListEl = document.getElementById('userList');
    const searchInput = document.getElementById('searchInput');
    const userCountInfo = document.getElementById('userCountInfo');
    const editorTitle = document.getElementById('editorTitle');
    const jsonEditor = document.getElementById('jsonEditor');
    const statusMsg = document.getElementById('statusMsg');
    
    // 버튼 4개
    const btnSave = document.getElementById('btnSave');
    const btnForceLogout = document.getElementById('btnForceLogout');
    const btnSuspend = document.getElementById('btnSuspend');
    const btnDelete = document.getElementById('btnDelete');

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            allUsers = await res.json();
            renderUserList();
        } catch(e) { 
            console.error(e); 
            userCountInfo.innerText = "Database connection failed.";
        }
    }

    function renderUserList(filterText = '') {
        userListEl.innerHTML = '';
        
        const lowerFilter = filterText.toLowerCase();
        let count = 0;
        const now = Date.now() / 1000; // 초 단위 현재 시간

        for (const [userId, data] of Object.entries(allUsers)) {
            const username = (data.username || 'Unknown').toLowerCase();
            const email = (data.email || 'No Email Registered').toLowerCase();
            const uid = userId.toLowerCase();

            if (username.includes(lowerFilter) || email.includes(lowerFilter) || uid.includes(lowerFilter)) {
                count++;
                const div = document.createElement('div');
                div.className = 'user-item';
                if (userId === currentUserId) div.classList.add('active');
                
                // 정지된 계정인지 표시
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

        userCountInfo.innerText = `TOTAL: ${count} USERS FOUND`;
        if (count === 0) {
            userListEl.innerHTML = `<div style="text-align:center; margin-top:30px; color:#555;">검색 결과가 없습니다.</div>`;
        }
    }

    searchInput.addEventListener('input', (e) => renderUserList(e.target.value));

    function selectUser(userId, el) {
        document.querySelectorAll('.user-item').forEach(d => d.classList.remove('active'));
        el.classList.add('active');
        
        currentUserId = userId;
        editorTitle.innerText = `TARGET : ${allUsers[userId].username}`;
        
        jsonEditor.value = JSON.stringify(allUsers[userId], null, 4);
        jsonEditor.disabled = false;
        
        // 버튼 4개 활성화
        btnSave.disabled = false;
        btnForceLogout.disabled = false;
        btnSuspend.disabled = false;
        btnDelete.disabled = false;

        statusMsg.innerText = "READY TO MODIFY";
        statusMsg.style.color = "#00e5ff";
    }

    // 1. 강제 덮어쓰기 로직
    btnSave.addEventListener('click', async () => {
        if(!currentUserId) return;
        try {
            const newData = JSON.parse(jsonEditor.value);
            statusMsg.innerText = "UPDATING...";
            statusMsg.style.color = "#fff";

            const res = await fetch(`/api/admin/user/${currentUserId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newData)
            });
            const result = await res.json();
            
            if(result.success) {
                statusMsg.innerText = "UPDATE SUCCESSFUL!";
                statusMsg.style.color = "#00e5ff";
                allUsers[currentUserId] = newData; 
                renderUserList(searchInput.value); 
            }
        } catch(e) {
            statusMsg.innerText = "JSON FORMAT ERROR";
            statusMsg.style.color = "#ff2a2a";
            alert("JSON 형식이 잘못되었습니다.");
        }
    });

    // 2. 즉시 로그아웃 로직 (신규)
    btnForceLogout.addEventListener('click', async () => {
        if(!currentUserId) return;
        if(confirm(`[ ${allUsers[currentUserId].username} ] 유저를 즉시 로그아웃 시키겠습니까?\n접속 중이라면 즉시 메인 화면으로 튕겨납니다.`)) {
            statusMsg.innerText = "FORCING LOGOUT...";
            statusMsg.style.color = "#ff9900";
            
            const res = await fetch(`/api/admin/user/${currentUserId}/logout`, { method: 'POST' });
            const result = await res.json();
            
            if(result.success) {
                statusMsg.innerText = "LOGOUT COMMAND SENT!";
                statusMsg.style.color = "#00e5ff";
            }
        }
    });

    // 3. 계정 정지 로직 (신규)
    btnSuspend.addEventListener('click', async () => {
        if(!currentUserId) return;
        let days = prompt(`[ ${allUsers[currentUserId].username} ] 유저를 며칠 동안 정지하시겠습니까? (숫자만 입력)\n※ 정지 해제를 원하시면 0 을 입력하세요.`);
        
        if (days !== null && !isNaN(days) && days.trim() !== "") {
            days = parseInt(days);
            statusMsg.innerText = "SUSPENDING USER...";
            statusMsg.style.color = "#ff9900";

            const res = await fetch(`/api/admin/user/${currentUserId}/suspend`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({days: days})
            });
            const result = await res.json();
            
            if(result.success) {
                alert(days > 0 ? `${days}일 계정 정지 처리가 완료되었습니다.` : "계정 정지가 해제되었습니다.");
                statusMsg.innerText = "SUSPENSION APPLIED!";
                statusMsg.style.color = "#00e5ff";
                fetchUsers(); // DB 최신화 및 리스트 새로고침
            }
        }
    });

    // 4. 영구 삭제 로직
    btnDelete.addEventListener('click', async () => {
        if(!currentUserId) return;
        if(confirm("⚠️ 경고: 이 유저를 시스템에서 영구적으로 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.")) {
            statusMsg.innerText = "PURGING USER...";
            statusMsg.style.color = "#ff2a2a";

            const res = await fetch(`/api/admin/user/${currentUserId}`, { method: 'DELETE' });
            const result = await res.json();
            
            if(result.success) {
                alert("대상이 영구 삭제되었습니다.");
                jsonEditor.value = '';
                jsonEditor.disabled = true;
                btnSave.disabled = true;
                btnForceLogout.disabled = true;
                btnSuspend.disabled = true;
                btnDelete.disabled = true;
                editorTitle.innerText = '대상을 선택하십시오.';
                statusMsg.innerText = "WAITING...";
                currentUserId = null;
                fetchUsers(); 
            } else {
                statusMsg.innerText = "PURGE FAILED";
            }
        }
    });

    document.getElementById('btnReturn').addEventListener('click', () => {
        window.location.href = '/';
    });

    fetchUsers();
});