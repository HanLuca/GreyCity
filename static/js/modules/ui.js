/**
 * 화면 렌더링을 담당하는 모듈
 */
export class UIManager {
    constructor() {
        this.els = {
            hpVal: document.getElementById('hpVal'),
            maxHpVal: document.getElementById('maxHpVal'),
            atkVal: document.getElementById('atkVal'),
            
            levelVal: document.getElementById('levelVal'),
            expVal: document.getElementById('expVal'),
            maxExpVal: document.getElementById('maxExpVal'),
            expBar: document.getElementById('expBar'),
            fragVal: document.getElementById('fragVal'),

            locName: document.getElementById('locName'),
            gameLog: document.getElementById('gameLog'),
            
            btnGroup: document.getElementById('actionButtons'),
            miniMap: document.getElementById('miniMap'),
            invList: document.getElementById('inventoryList'),
            archiveList: document.getElementById('archiveList'),

            itemModal: document.getElementById('itemModal'),
            modalItemName: document.getElementById('modalItemName'),
            modalItemType: document.getElementById('modalItemType'),
            modalItemDesc: document.getElementById('modalItemDesc'),
            modalItemStat: document.getElementById('modalItemStat'),
            modalBtnUse: document.getElementById('modalBtnUse'),
            modalBtnDiscard: document.getElementById('modalBtnDiscard'),

            locationModal: document.getElementById('locationModal'),
            modalLocName: document.getElementById('modalLocName'),
            modalLocCoord: document.getElementById('modalLocCoord'),
            modalLocStatus: document.getElementById('modalLocStatus'),
            modalLocDesc: document.getElementById('modalLocDesc'),
            modalLocInfo: document.getElementById('modalLocInfo')
        };
    }

    update(data, actionCallback) {
        const { userData, stats, locationInfo, connectedLocations, allLocations, itemData, enemyData, archiveData } = data;

        if (userData.status === 'combat') {
             this.els.locName.innerHTML = `<span style="color:#ff2a2a">⚠ BATTLE: ${userData.combatData.name}</span>`;
             this.els.hpVal.style.color = "#ff2a2a";
        } else if (userData.status === 'dead') {
             this.els.locName.innerText = "⚠ SYSTEM CRITICAL (FAINTED)";
             this.els.hpVal.style.color = "#888";
        } else {
             this.els.locName.innerText = locationInfo.name;
             this.els.hpVal.style.color = "var(--accent-red)";
        }
        
        this.els.hpVal.innerText = userData.hp;
        this.els.maxHpVal.innerText = userData.maxHp;
        this.els.atkVal.innerText = stats.attack;

        this.els.levelVal.innerText = userData.level;
        this.els.expVal.innerText = userData.exp;
        this.els.maxExpVal.innerText = userData.maxExp;
        
        if (this.els.fragVal) {
            this.els.fragVal.innerText = userData.heart_fragments || 0;
        }

        const expPercent = Math.min((userData.exp / userData.maxExp) * 100, 100);
        this.els.expBar.style.width = `${expPercent}%`;

        this.els.gameLog.innerHTML = userData.logs.join('<br>');
        this.els.gameLog.scrollTop = this.els.gameLog.scrollHeight;

        this.drawMap(allLocations, userData.currentLocation, connectedLocations, enemyData, userData);
        this.renderButtons(userData, connectedLocations, locationInfo.searchable, actionCallback);
        this.renderInventory(userData, itemData, actionCallback);
        this.renderArchive(archiveData);
    }

    renderButtons(userData, connectedLocations, isSearchable, callback) {
        this.els.btnGroup.innerHTML = '';

        if (userData.status === 'dead') {
            const fragCost = userData.level * 5;
            const hasKit = userData.inventory.includes('first_aid_kit');

            const fragBtn = document.createElement('button');
            fragBtn.innerHTML = `🫀 <b>심장 조각 사용</b><br><span style="font-size:11px; color:#aaa;">(필요: ${fragCost}개)</span>`;
            fragBtn.style.border = "1px solid #ff0080";
            fragBtn.style.color = "#ff0080";
            if (userData.heart_fragments < fragCost) {
                fragBtn.disabled = true;
                fragBtn.style.opacity = 0.5;
                fragBtn.innerHTML += " [부족]";
            }
            fragBtn.onclick = () => callback('revive', 'fragment');

            const kitBtn = document.createElement('button');
            kitBtn.innerHTML = `💊 <b>구급약 사용</b><br><span style="font-size:11px; color:#aaa;">(소지: ${hasKit ? '있음' : '없음'})</span>`;
            kitBtn.style.border = "1px solid #fff";
            if (!hasKit) {
                kitBtn.disabled = true;
                kitBtn.style.opacity = 0.5;
            }
            kitBtn.onclick = () => callback('revive', 'kit');

            this.els.btnGroup.appendChild(fragBtn);
            this.els.btnGroup.appendChild(kitBtn);
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
            el.onclick = () => this.openItemModal(item, wpnKey, callback, true); 
            this.els.invList.appendChild(el);
        }

        allItems.forEach(itemKey => {
            const item = itemData[itemKey];
            const el = document.createElement('div');
            el.className = 'invItem';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.innerText = item.name;
            
            el.onclick = () => this.openItemModal(item, itemKey, callback, false);
            el.appendChild(nameSpan);
            this.els.invList.appendChild(el);
        });
    }

    openItemModal(item, itemKey, callback, isEquipped) {
        const modal = this.els.itemModal;
        
        this.els.modalItemName.innerText = item.name;
        this.els.modalItemType.innerText = item.type === 'weapon' ? 'WEAPON' : 'CONSUMABLE';
        this.els.modalItemDesc.innerText = item.description || "설명이 없습니다.";

        let statHtml = '';
        let btnText = '사용하기';
        let btnDisabled = false;

        if (item.type === 'weapon') {
            statHtml = `<span style="color:#ff9e80;">⚔ ATK +${item.power}</span>`;
            btnText = isEquipped ? "장착 중" : "장착하기";
        } else if (item.type === 'consumable') {
            statHtml = `<span style="color:#4caf50;">💊 HP +${item.heal}</span>`;
            btnText = "사용하기";
        } else if (item.type === 'currency') {
             statHtml = `<span style="color:#ff0080;">🫀 특수 재화</span>`;
             btnText = "사용 불가";
             btnDisabled = true;
        } else if (item.type === 'key') {
             statHtml = `<span style="color:#ffd700;">🔑 열쇠 아이템</span>`;
             btnText = "사용 불가 (자동)";
             btnDisabled = true;
        } else {
            statHtml = `<span style="color:#888;">특수 효과 없음</span>`;
        }

        this.els.modalItemStat.innerHTML = statHtml;
        this.els.modalBtnUse.innerText = btnText;
        this.els.modalBtnUse.disabled = btnDisabled;
        if (btnDisabled) this.els.modalBtnUse.style.opacity = 0.5;
        else this.els.modalBtnUse.style.opacity = 1;

        this.els.modalBtnUse.onclick = () => {
            if (isEquipped) {
                alert("이미 장착 중입니다.");
            } else if (!btnDisabled) {
                callback('useItem', itemKey);
                modal.style.display = 'none';
            }
        };

        this.els.modalBtnDiscard.onclick = () => {
            if (isEquipped) {
                alert("장착 중인 아이템은 버릴 수 없습니다.");
            } else {
                if (confirm(`정말 [${item.name}]을(를) 버리시겠습니까?`)) {
                    callback('discardItem', itemKey);
                    modal.style.display = 'none';
                }
            }
        };

        modal.style.display = "block";
    }

    openLocationModal(locationData, enemyData, userData, locId) {
        const modal = this.els.locationModal;
        const isLocked = locationData.requiresKey && (!userData.unlocked_places || !userData.unlocked_places.includes(locId));

        this.els.modalLocName.innerText = locationData.name;
        this.els.modalLocCoord.innerText = `X:${locationData.coordinates.x} Y:${locationData.coordinates.y}`;
        
        if (isLocked) {
            this.els.modalLocStatus.innerHTML = `🔒 LOCKED`;
            this.els.modalLocStatus.className = 'status-badge badge-danger';
            this.els.modalLocDesc.innerText = "이 구역에 대한 정보가 없습니다.\n접근 권한이 필요합니다.";
            this.els.modalLocInfo.innerHTML = `
                <div style="text-align:center; padding:30px; color:#666;">
                    <div style="font-size:40px; margin-bottom:10px;">🚫</div>
                    <div><b>[보안 등급 미달]</b></div>
                    <div style="font-size:12px; margin-top:5px;">해당 구역의 데이터에 접근할 수 없습니다.</div>
                </div>
            `;
        } else {
            const level = locationData.dangerLevel || "NORMAL";
            
            if (level === "SAFE") {
                this.els.modalLocStatus.innerHTML = `🛡 SAFE`;
                this.els.modalLocStatus.className = 'status-badge badge-safe';
            } else if (level === "NORMAL") {
                this.els.modalLocStatus.innerHTML = `⚠ NORMAL`;
                this.els.modalLocStatus.className = 'status-badge badge-normal';
            } else {
                this.els.modalLocStatus.innerHTML = `☠ DANGER`;
                this.els.modalLocStatus.className = 'status-badge badge-danger';
            }

            this.els.modalLocDesc.innerText = locationData.description || "설명이 없는 지역입니다.";

            let html = "";
            html += `<div class="loc-section">`;
            html += `<div class="loc-label">SAFETY STATUS</div>`;
            if (level === "SAFE") html += `<div class="status-box status-safe">🛡 안전 지역 (Safe Zone)</div>`;
            else if (level === "NORMAL") html += `<div class="status-box status-normal">⚠ 주의 지역 (Caution Zone)</div>`;
            else html += `<div class="status-box status-danger">☠ 위험 지역 (Danger Zone)</div>`;
            html += `</div>`;

            if (level !== "SAFE" && locationData.spawnList && locationData.spawnList.length > 0 && enemyData) {
                html += `<div class="loc-section"><div class="loc-label">DETECTED THREATS</div><div class="enemy-grid">`;
                locationData.spawnList.forEach(enemyId => {
                    const enemy = enemyData[enemyId];
                    if (enemy) {
                        let gradeClass = `enemy-grade-1`;
                        let icon = "Rat";
                        if (enemy.grade >= 3) { gradeClass = `enemy-grade-3`; icon = "🧟"; }
                        if (enemy.grade >= 4) { gradeClass = `enemy-grade-4`; icon = "☠"; }
                        html += `<div class="enemy-badge ${gradeClass}"><span>${icon}</span><span>${enemy.name}</span></div>`;
                    }
                });
                html += `</div></div>`;
            }

            html += `<div class="loc-section"><div class="loc-label">SEARCH INTEL</div>`;
            if (locationData.itemChance > 0 && locationData.searchable) {
                const chance = Math.round(locationData.itemChance * 100);
                html += `<div class="loot-info"><span style="color:#bbb; font-size:13px;">아이템 발견 확률</span><span class="loot-rate">✨ ${chance}%</span></div>`;
            } else {
                html += `<div style="color:#666; font-size:13px; padding:5px 0;">❌ 탐색 불가능한 지역입니다.</div>`;
            }
            html += `</div>`;

            this.els.modalLocInfo.innerHTML = html;
        }

        modal.style.display = "block";
    }

    renderArchive(archiveData) {
        if (!this.els.archiveList) return;
        this.els.archiveList.innerHTML = '';
        if (!archiveData || archiveData.length === 0) {
            this.els.archiveList.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">수집된 기록이 없습니다.<br><br>탐색을 통해 쪽지를 찾아보세요.</div>';
            return;
        }

        // 최신 수집 순으로 정렬하여 표시
        [...archiveData].reverse().forEach(note => {
            const div = document.createElement('div');
            div.className = 'note-item';
            div.style.borderLeft = "4px solid var(--accent-cyan)";
            div.innerHTML = `
                <div class="note-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>📜 ${note.title}</span>
                    <small style="font-size:10px; color:#555;">ARCHIVED</small>
                </div>
                <div class="note-content" style="margin-top:10px; color:#ccc; font-style: italic;">"${note.content}"</div>
            `;
            this.els.archiveList.appendChild(div);
        });
    }

    drawMap(allLocations, currentId, connectedLocs, enemyData, userData) {
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

                node.onclick = () => this.openLocationModal(loc, enemyData, userData, key);
                this.els.miniMap.appendChild(node);
            }
        });
    }
}