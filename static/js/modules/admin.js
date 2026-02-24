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

        for (const [userId, data] of Object.entries(allUsers)) {
            const username = (data.username || 'Unknown').toLowerCase();
            const email = (data.email || 'No Email Registered').toLowerCase();
            const uid = userId.toLowerCase();

            if (username.includes(lowerFilter) || email.includes(lowerFilter) || uid.includes(lowerFilter)) {
                count++;
                const div = document.createElement('div');
                div.className = 'user-item';
                if (userId === currentUserId) div.classList.add('active');

                div.innerHTML = `
                    <div class="user-item-name">
                        <span>${data.username || 'Unknown'}</span>
                        <span style="font-size:10px; color:#555;">Lv.${data.level || 1}</span>
                    </div>
                    <div class="user-item-email">✉️ ${data.email || 'No Email'}</div>
                    <div class="user-item-stats">
                        ID: ${userId} <br>
                        HP: <span style="color:var(--neon-red)">${data.hp || 0}</span> / ${data.maxHp || 0} | 🫀: ${data.heart_fragments || 0}
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
        
        btnSave.disabled = false;
        btnDelete.disabled = false;
        statusMsg.innerText = "READY TO MODIFY";
        statusMsg.style.color = "var(--neon-cyan)";
    }

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
                statusMsg.style.color = "var(--neon-cyan)";
                allUsers[currentUserId] = newData; 
                renderUserList(searchInput.value); 
            }
        } catch(e) {
            statusMsg.innerText = "JSON FORMAT ERROR";
            statusMsg.style.color = "var(--neon-red)";
            alert("JSON 형식이 잘못되었습니다. 쉼표(,)나 괄호를 확인하세요.");
        }
    });

    btnDelete.addEventListener('click', async () => {
        if(!currentUserId) return;
        if(confirm("⚠️ 경고: 이 유저를 시스템에서 영구적으로 삭제하시겠습니까?\n이 작업은 즉시 실행되며 복구할 수 없습니다.")) {
            statusMsg.innerText = "PURGING USER...";
            statusMsg.style.color = "var(--neon-red)";

            const res = await fetch(`/api/admin/user/${currentUserId}`, { method: 'DELETE' });
            const result = await res.json();
            
            if(result.success) {
                alert("대상이 시스템에서 영구 삭제되었습니다.");
                jsonEditor.value = '';
                jsonEditor.disabled = true;
                btnSave.disabled = true;
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