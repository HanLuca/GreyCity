export class UIManager {
    constructor() {
        this.els = {
            hpVal: document.getElementById('hpVal'),
            maxHpVal: document.getElementById('maxHpVal'),
            atkVal: document.getElementById('atkVal'),
            levelVal: document.getElementById('levelVal'), // 레벨
            expVal: document.getElementById('expVal'),     // 현재 경험치
            maxExpVal: document.getElementById('maxExpVal'), // 최대 경험치
            expBar: document.getElementById('expBar'),     // 경험치 바
            locName: document.getElementById('locName'),
            gameLog: document.getElementById('gameLog'),
            btnGroup: document.getElementById('actionButtons'),
            miniMap: document.getElementById('miniMap'),
            invList: document.getElementById('inventoryList')
        };
    }

    update(data, actionCallback) {
        const { userData, stats, locationInfo, connectedLocations, allLocations, itemData } = data;

        // 1. 전투 상태 UI
        if (userData.status === 'combat') {
             this.els.locName.innerHTML = `<span style="color:#ff2a2a">⚠ BATTLE: ${userData.combatData.name}</span>`;
             this.els.hpVal.style.color = "#ff2a2a";
        } else if (userData.status === 'dead') {
             this.els.locName.innerText = "✝ YOU ARE DEAD ✝";
        } else {
             this.els.locName.innerText = locationInfo.name;
             this.els.hpVal.style.color = "var(--accent-red)";
        }
        
        // 2. 스탯 및 경험치 업데이트
        this.els.hpVal.innerText = userData.hp;
        this.els.maxHpVal.innerText = userData.maxHp;
        this.els.atkVal.innerText = stats.attack;

        this.els.levelVal.innerText = userData.level;
        this.els.expVal.innerText = userData.exp;
        this.els.maxExpVal.innerText = userData.maxExp;

        // 경험치 바 퍼센트 계산
        const expPercent = Math.min((userData.exp / userData.maxExp) * 100, 100);
        this.els.expBar.style.width = `${expPercent}%`;

        // 3. 로그 및 맵
        this.els.gameLog.innerHTML = userData.logs.join('<br>');
        this.els.gameLog.scrollTop = this.els.gameLog.scrollHeight;
        this.drawMap(allLocations, userData.currentLocation, connectedLocations);
        
        // 4. 버튼 및 인벤토리
        this.renderButtons(userData, connectedLocations, locationInfo.searchable, actionCallback);
        this.renderInventory(userData, itemData, actionCallback);
    }

    renderButtons(userData, connectedLocations, isSearchable, callback) {
        this.els.btnGroup.innerHTML = '';

        if (userData.status === 'dead') {
            const reviveBtn = document.createElement('button');
            reviveBtn.innerText = "👼 부활하기 (치트)";
            reviveBtn.style.width = "100%";
            reviveBtn.onclick = () => callback('revive');
            this.els.btnGroup.appendChild(reviveBtn);
            return;
        }

        if (userData.status === 'combat') {
            const combatRow = document.createElement('div');
            combatRow.className = 'moveRow';

            const atkBtn = document.createElement('button');
            atkBtn.innerHTML = `⚔ <b>공격</b>`;
            atkBtn.style.color = "#ff5555";
            atkBtn.style.borderColor = "#ff5555";
            atkBtn.onclick = () => callback('attack');
            
            const runBtn = document.createElement('button');
            runBtn.innerText = "🏃‍♂️ 도주";
            runBtn.onclick = () => callback('run');

            combatRow.appendChild(atkBtn);
            combatRow.appendChild(runBtn);
            this.els.btnGroup.appendChild(combatRow);
            return;
        }

        if (connectedLocations && connectedLocations.length > 0) {
            const moveRow = document.createElement('div');
            moveRow.className = 'moveRow';

            connectedLocations.forEach(loc => {
                const btn = document.createElement('button');
                btn.innerText = `👣 ${loc.name}`;
                btn.onclick = () => callback('move', loc.id);
                moveRow.appendChild(btn);
            });
            this.els.btnGroup.appendChild(moveRow);
        }

        if (isSearchable) {
            const actionRow = document.createElement('div');
            actionRow.className = 'actionRow';

            const searchBtn = document.createElement('button');
            searchBtn.innerText = "🔍 주변 탐색";
            searchBtn.style.color = "var(--accent-cyan)";
            searchBtn.onclick = () => callback('search');
            
            actionRow.appendChild(searchBtn);
            this.els.btnGroup.appendChild(actionRow);
        }
    }

    renderInventory(userData, itemData, callback) {
        this.els.invList.innerHTML = '';
        
        const allItems = [...userData.inventory];
        
        if (allItems.length === 0 && !userData.equipment.weapon) {
            this.els.invList.innerHTML = '<div class="emptyMsg">가방이 비었습니다.</div>';
            return;
        }

        if (userData.equipment.weapon) {
            const wpnKey = userData.equipment.weapon;
            const item = itemData[wpnKey];
            const el = document.createElement('div');
            el.className = 'invItem';
            el.innerHTML = `<span>⚔ ${item.name}</span> <span class="equipped">E</span>`;
            this.els.invList.appendChild(el);
        }

        allItems.forEach(itemKey => {
            const item = itemData[itemKey];
            const el = document.createElement('div');
            el.className = 'invItem';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.innerText = item.name;
            nameSpan.onclick = () => {
                if (confirm(`[${item.name}]을(를) 사용/장착 하시겠습니까?`)) {
                    callback('useItem', itemKey);
                }
            };

            const discardBtn = document.createElement('button');
            discardBtn.className = 'discardBtn';
            discardBtn.innerText = '🗑';
            discardBtn.title = "버리기";
            discardBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`정말로 [${item.name}]을(를) 버리시겠습니까?`)) {
                    callback('discardItem', itemKey);
                }
            };

            el.appendChild(nameSpan);
            el.appendChild(discardBtn);
            
            this.els.invList.appendChild(el);
        });
    }

    drawMap(allLocations, currentId, connectedLocs) {
        this.els.miniMap.innerHTML = '';
        const connectedIds = connectedLocs ? connectedLocs.map(l => l.id) : [];

        Object.keys(allLocations).forEach(key => {
            const loc = allLocations[key];
            if (loc.coordinates) {
                const node = document.createElement('div');
                node.className = 'mapNode';
                node.style.gridColumn = loc.coordinates.x + 1;
                node.style.gridRow = loc.coordinates.y + 1;
                node.innerText = loc.name.substring(0, 2);

                if (key === currentId) {
                    node.classList.add('current');
                    node.innerText = "ME";
                }
                if (connectedIds.includes(key)) {
                    node.classList.add('connected');
                }
                this.els.miniMap.appendChild(node);
            }
        });
    }
}