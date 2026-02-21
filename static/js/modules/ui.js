/**
 * 화면 렌더링을 담당하는 모듈
 */
export class UIManager {
    constructor() {
        this.els = {
            hpVal: document.getElementById('hpVal'),
            maxHpVal: document.getElementById('maxHpVal'),
            atkVal: document.getElementById('atkVal'),
            evaVal: document.getElementById('evaVal'),
            
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
            modalTopAccent: document.getElementById('modalTopAccent'),

            locationModal: document.getElementById('locationModal'),
            modalLocName: document.getElementById('modalLocName'),
            modalLocCoord: document.getElementById('modalLocCoord'),
            modalLocStatus: document.getElementById('modalLocStatus'),
            modalLocDesc: document.getElementById('modalLocDesc'),
            modalLocInfo: document.getElementById('modalLocInfo'),

            upgradeModal: document.getElementById('upgradeModal'),
            upgradeList: document.getElementById('upgradeList')
        };
    }

    update(data, actionCallback) {
        const { userData, stats, locationInfo, connectedLocations, allLocations, itemData, enemyData, archiveData } = data;

        if (userData.status === 'combat') {
             this.els.locName.innerHTML = `<span style="color:#ff2a2a">⚠ [ BATTLE ] ${userData.combatData.name}</span>`;
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

        const evdLvl = userData.upgrades ? (userData.upgrades.upgrades_evasion || 0) : 0;
        if(this.els.evaVal) this.els.evaVal.innerText = (evdLvl * 0.1).toFixed(1);

        this.els.levelVal.innerText = userData.level;
        this.els.expVal.innerText = userData.exp;
        this.els.maxExpVal.innerText = userData.maxExp;
        
        if (this.els.fragVal) {
            this.els.fragVal.innerText = userData.heart_fragments || 0;
        }

        const expPercent = Math.min((userData.exp / userData.maxExp) * 100, 100);
        this.els.expBar.style.width = `${expPercent}%`;

        this.els.gameLog.innerHTML = userData.logs.join('<br>');
        setTimeout(() => {
            this.els.gameLog.scrollTop = this.els.gameLog.scrollHeight;
        }, 10);

        this.drawMap(allLocations, userData.currentLocation, connectedLocations, enemyData, userData);
        this.renderButtons(userData, connectedLocations, locationInfo.searchable, actionCallback);
        this.renderInventory(userData, itemData, actionCallback);
        this.renderArchive(archiveData);
        this.renderUpgrade(userData, actionCallback);
    }

    renderUpgrade(userData, callback) {
        if (!this.els.upgradeList) return;
        
        const upg = userData.upgrades || {};
        const hpLvl = upg.upgrades_hp || 0;
        const atkLvl = upg.upgrades_atk || 0;
        const evaLvl = upg.upgrades_evasion || 0;
        
        const frags = userData.heart_fragments || 0;
        
        this.els.upgradeList.innerHTML = '';
        
        this.els.upgradeList.style.display = 'grid';
        this.els.upgradeList.style.gridTemplateColumns = 'repeat(3, 1fr)';
        this.els.upgradeList.style.gap = '15px';
        this.els.upgradeList.style.marginTop = '15px';

        const configs = [
            { key: 'upgrades_hp', name: '체력 개조', color: '#4caf50', current: `+${hpLvl * 5}`, next: `+${(hpLvl+1)*5}`, desc: '최대 체력이 5 증가합니다.', lvl: hpLvl },
            { key: 'upgrades_atk', name: '근력 개조', color: '#ff9e80', current: `+${atkLvl}`, next: `+${atkLvl+1}`, desc: '기본 공격력이 1 증가합니다.', lvl: atkLvl },
            { key: 'upgrades_evasion', name: '반사신경 개조', color: '#00e5ff', current: `${(evaLvl*0.1).toFixed(1)}%`, next: `${((evaLvl+1)*0.1).toFixed(1)}%`, desc: '전투 중 적의 공격을 무시할 확률이 0.1% 증가합니다.', lvl: evaLvl }
        ];

        configs.forEach(conf => {
            const cost = 5 + (conf.lvl * 2);
            const canBuy = frags >= cost;
            
            const card = document.createElement('div');
            card.style = "background:#161616; border:1px solid #333; padding:20px 15px; border-radius:6px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
            
            card.innerHTML = `
                <div style="width: 100%;">
                    <div style="color:${conf.color}; font-weight:bold; font-size:18px; text-shadow: 0 0 5px rgba(${this.hexToRgb(conf.color)}, 0.3); margin-bottom: 5px;">
                        ${conf.name}
                    </div>
                    <div style="font-size:13px; color:#888; font-weight:normal; margin-bottom: 15px; border-bottom: 1px dashed #333; padding-bottom: 10px;">
                        (Lv.${conf.lvl})
                    </div>
                    <div style="font-size:13px; color:#bbb; margin-bottom: 20px; line-height: 1.5; height: 38px; display: flex; align-items: center; justify-content: center;">
                        ${conf.desc}
                    </div>
                    <div style="font-size:13px; color:#888; margin-bottom:20px; background:#0f0f0f; padding:10px; border-radius:4px; border:1px solid #222;">
                        현재: <span style="color:#ddd;">${conf.current}</span> <br>
                        <div style="margin: 5px 0; color: #555;">▼</div>
                        다음: <span style="color:${conf.color}; font-weight:bold;">${conf.next}</span>
                    </div>
                </div>
                <button class="upg-btn" style="width:100%; height:45px; background:#222; border:1px solid ${canBuy ? conf.color : '#444'}; color:${canBuy ? conf.color : '#666'}; border-radius:4px; cursor:${canBuy ? 'pointer' : 'not-allowed'}; opacity:${canBuy ? '1' : '0.5'}; font-weight:bold; font-size:14px; transition:0.2s;">
                    [ 🫀 ${cost} 소모 ]
                </button>
            `;
            
            const btn = card.querySelector('.upg-btn');
            if(canBuy) {
                btn.onmouseover = () => { btn.style.background = conf.color; btn.style.color = "#000"; };
                btn.onmouseout = () => { btn.style.background = "#222"; btn.style.color = conf.color; };
                btn.onclick = () => callback('upgrade', conf.key);
            }
            this.els.upgradeList.appendChild(card);
        });
    }

    hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    }

    renderButtons(userData, connectedLocations, isSearchable, callback) {
        this.els.btnGroup.innerHTML = '';

        if (userData.status === 'dead') {
            const fragCost = userData.level * 5;
            const hasKit = userData.inventory.includes('first_aid_kit');

            const fragBtn = document.createElement('button');
            fragBtn.innerHTML = `<b>[ 🫀 조각 소생 ]</b><br><span style="font-size:11px; color:#aaa; font-weight:normal;">필요 조각: ${fragCost}</span>`;
            fragBtn.style.border = "1px solid #ff0080";
            fragBtn.style.color = "#ff0080";
            if (userData.heart_fragments < fragCost) {
                fragBtn.disabled = true;
                fragBtn.style.opacity = 0.5;
                fragBtn.innerHTML += " <span style='font-size:11px'>[부족]</span>";
            }
            fragBtn.onclick = () => callback('revive', 'fragment');

            const kitBtn = document.createElement('button');
            kitBtn.innerHTML = `<b>[ 💊 키트 소생 ]</b><br><span style="font-size:11px; color:#aaa; font-weight:normal;">구급약 사용</span>`;
            kitBtn.style.border = "1px solid #4caf50";
            kitBtn.style.color = "#4caf50";
            if (!hasKit) {
                kitBtn.disabled = true;
                kitBtn.style.opacity = 0.5;
                kitBtn.style.border = "1px solid #555";
                kitBtn.style.color = "#888";
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
            atkBtn.innerHTML = `<b>[ ⚔️ 공격 ]</b>`;
            atkBtn.style.color = "#ff5555";
            atkBtn.style.borderColor = "#ff5555";
            atkBtn.onclick = () => callback('attack');
            
            const runBtn = document.createElement('button');
            runBtn.innerHTML = `<b>[ 💨 도주 ]</b>`;
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
                // [수정됨] [ 이동 ] 텍스트 대신 다시 👣 이모지 적용
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
            searchBtn.innerText = "[ 🔍 주변 탐색 ]";
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
            el.innerHTML = `<span><span style="color:#ff9e80; font-size:10px; margin-right:6px;">■</span>${item.name}</span> <span class="equipped" style="font-size:10px; padding:2px 5px; border:1px solid #ff9e80; color:#ff9e80; border-radius:3px;">EQUIPPED</span>`;
            el.onclick = () => this.openItemModal(item, wpnKey, callback, true); 
            this.els.invList.appendChild(el);
        }

        allItems.forEach(itemKey => {
            const item = itemData[itemKey];
            const el = document.createElement('div');
            el.className = 'invItem';
            
            let dotColor = '#555';
            if (item.type === 'weapon') dotColor = '#ff9e80';
            else if (item.type === 'consumable') dotColor = '#4caf50';
            else if (item.type === 'currency') dotColor = '#ff0080';
            else if (item.type === 'important') dotColor = '#ffd700';

            el.innerHTML = `<span><span style="color:${dotColor}; font-size:10px; margin-right:6px;">■</span><span class="name">${item.name}</span></span>`;
            
            el.onclick = () => this.openItemModal(item, itemKey, callback, false);
            this.els.invList.appendChild(el);
        });
    }

    openItemModal(item, itemKey, callback, isEquipped) {
        const modal = this.els.itemModal;
        
        this.els.modalItemName.innerText = item.name;
        this.els.modalItemDesc.innerText = item.description || "설명이 없습니다.";

        let statHtml = '';
        let btnText = '사용하기';
        let btnDisabled = false;
        let typeText = 'ITEM';
        let typeColor = '#888';

        if (item.type === 'weapon') {
            typeText = 'WEAPON';
            typeColor = '#ff9e80';
            statHtml = `<span style="color:#ff9e80; font-weight:bold;">[ ATK +${item.power} ]</span>`;
            btnText = isEquipped ? "장착 해제" : "장착하기";
        } else if (item.type === 'consumable') {
            typeText = 'CONSUMABLE';
            typeColor = '#4caf50';
            statHtml = `<span style="color:#4caf50; font-weight:bold;">[ HP +${item.heal} ]</span>`;
            btnText = "사용하기";
        } else if (item.type === 'currency') {
             typeText = 'CURRENCY';
             typeColor = '#ff0080';
             statHtml = `<span style="color:#ff0080; font-weight:bold;">[ 특수 재화 ]</span>`;
             btnText = "사용 불가";
             btnDisabled = true;
        } else if (item.type === 'important') {
             typeText = 'IMPORTANT';
             typeColor = '#ffd700';
             statHtml = `<span style="color:#ffd700; font-weight:bold;">[ 중요 아이템 ]</span>`;
             btnText = "사용 불가 (자동)";
             btnDisabled = true;
        } else {
            statHtml = `<span style="color:#888; font-weight:bold;">[ 특수 효과 없음 ]</span>`;
        }

        this.els.modalItemType.innerText = typeText;
        this.els.modalItemType.style.color = typeColor;
        this.els.modalItemType.style.borderColor = typeColor;
        
        if (this.els.modalTopAccent) {
            this.els.modalTopAccent.style.background = typeColor;
            this.els.modalTopAccent.style.boxShadow = `0 0 10px ${typeColor}`;
        }

        this.els.modalItemStat.innerHTML = statHtml;
        this.els.modalBtnUse.innerText = btnText;
        this.els.modalBtnUse.disabled = btnDisabled;
        
        if (btnDisabled) {
            this.els.modalBtnUse.style.opacity = 0.5;
            this.els.modalBtnUse.style.background = '#222';
            this.els.modalBtnUse.style.color = '#666';
            this.els.modalBtnUse.style.borderColor = '#444';
            this.els.modalBtnUse.style.cursor = 'not-allowed';
            this.els.modalBtnUse.onmouseover = null;
            this.els.modalBtnUse.onmouseout = null;
        } else {
            this.els.modalBtnUse.style.opacity = 1;
            this.els.modalBtnUse.style.cursor = 'pointer';
            
            if (isEquipped) {
                this.els.modalBtnUse.style.background = 'rgba(255, 158, 128, 0.1)';
                this.els.modalBtnUse.style.color = '#ff9e80';
                this.els.modalBtnUse.style.borderColor = '#ff9e80';
                this.els.modalBtnUse.onmouseover = () => { this.els.modalBtnUse.style.background = 'rgba(255, 158, 128, 0.2)'; };
                this.els.modalBtnUse.onmouseout = () => { this.els.modalBtnUse.style.background = 'rgba(255, 158, 128, 0.1)'; };
            } else {
                this.els.modalBtnUse.style.background = 'rgba(0, 229, 255, 0.1)';
                this.els.modalBtnUse.style.color = 'var(--accent-cyan)';
                this.els.modalBtnUse.style.borderColor = 'var(--accent-cyan)';
                this.els.modalBtnUse.onmouseover = () => { this.els.modalBtnUse.style.background = 'rgba(0, 229, 255, 0.2)'; };
                this.els.modalBtnUse.onmouseout = () => { this.els.modalBtnUse.style.background = 'rgba(0, 229, 255, 0.1)'; };
            }
        }

        if (item.type === 'important') {
            this.els.modalBtnDiscard.style.opacity = 0.5;
            this.els.modalBtnDiscard.style.background = '#222';
            this.els.modalBtnDiscard.style.color = '#666';
            this.els.modalBtnDiscard.style.borderColor = '#444';
            this.els.modalBtnDiscard.style.cursor = 'not-allowed';
            this.els.modalBtnDiscard.onmouseover = null;
            this.els.modalBtnDiscard.onmouseout = null;
            this.els.modalBtnDiscard.onclick = () => {
                alert("중요 아이템은 버릴 수 없습니다.");
            };
        } else {
            this.els.modalBtnDiscard.style.opacity = 1;
            this.els.modalBtnDiscard.style.background = 'rgba(255, 85, 85, 0.05)';
            this.els.modalBtnDiscard.style.color = '#ff5555';
            this.els.modalBtnDiscard.style.borderColor = 'rgba(255, 85, 85, 0.3)';
            this.els.modalBtnDiscard.style.cursor = 'pointer';
            this.els.modalBtnDiscard.onmouseover = () => { this.els.modalBtnDiscard.style.background = 'rgba(255, 85, 85, 0.2)'; };
            this.els.modalBtnDiscard.onmouseout = () => { this.els.modalBtnDiscard.style.background = 'rgba(255, 85, 85, 0.05)'; };
            this.els.modalBtnDiscard.onclick = () => {
                if (isEquipped) {
                    alert("장착 중인 무기는 버릴 수 없습니다. 먼저 장착을 해제해주세요.");
                } else {
                    if (confirm(`정말 [${item.name}]을(를) 폐기하시겠습니까?`)) {
                        callback('discardItem', itemKey);
                        window.closeModalAnimation(modal);
                    }
                }
            };
        }

        this.els.modalBtnUse.onclick = () => {
            if (!btnDisabled) {
                if (isEquipped) {
                    callback('unequipItem', itemKey);
                } else {
                    callback('useItem', itemKey);
                }
                window.closeModalAnimation(modal);
            }
        };

        window.openModalAnimation('itemModal');
    }

    openLocationModal(locationData, enemyData, userData, locId) {
        const modal = this.els.locationModal;
        const isLocked = locationData.requiresKey && (!userData.unlocked_places || !userData.unlocked_places.includes(locId));

        this.els.modalLocName.innerText = locationData.name;
        this.els.modalLocCoord.innerText = `X:${locationData.coordinates.x} Y:${locationData.coordinates.y}`;
        
        if (isLocked) {
            this.els.modalLocStatus.innerHTML = `[ LOCKED ]`;
            this.els.modalLocStatus.className = 'status-badge badge-danger';
            this.els.modalLocDesc.innerText = "접근 권한이 없는 구역입니다. 보안 해제가 필요합니다.";
            this.els.modalLocInfo.innerHTML = `
                <div style="text-align:center; padding:30px; color:#666;">
                    <div style="font-size:40px; margin-bottom:10px;">🔒</div>
                    <div><b>[보안 등급 미달]</b></div>
                    <div style="font-size:12px; margin-top:5px;">해당 구역의 데이터에 접근할 수 없습니다.</div>
                </div>
            `;
        } else {
            const level = locationData.dangerLevel || "NORMAL";
            
            if (level === "SAFE") {
                this.els.modalLocStatus.innerHTML = `[ SAFE ]`;
                this.els.modalLocStatus.className = 'status-badge badge-safe';
            } else if (level === "NORMAL") {
                this.els.modalLocStatus.innerHTML = `[ NORMAL ]`;
                this.els.modalLocStatus.className = 'status-badge badge-normal';
            } else {
                this.els.modalLocStatus.innerHTML = `[ DANGER ]`;
                this.els.modalLocStatus.className = 'status-badge badge-danger';
            }

            this.els.modalLocDesc.innerText = locationData.description || "설명이 없는 지역입니다.";

            let html = "";
            if (level !== "SAFE" && locationData.spawnList && locationData.spawnList.length > 0 && enemyData) {
                html += `<div class="loc-section"><div class="loc-label">DETECTED THREATS</div><div style="display:flex; flex-wrap:wrap; gap:8px;">`;
                locationData.spawnList.forEach(enemyId => {
                    const enemy = enemyData[enemyId];
                    if (enemy) {
                        let gradeText = `Lv.${enemy.grade || 1}`;
                        let gradeColor = "#aaa";
                        if (enemy.grade >= 3) gradeColor = "#ff9e80";
                        if (enemy.grade >= 4) { gradeText = "BOSS"; gradeColor = "#ff5555"; }
                        if (enemy.grade >= 5) { gradeText = "ABYSS"; gradeColor = "#bd00ff"; }

                        html += `<div style="border: 1px solid ${gradeColor}; background: rgba(0,0,0,0.3); color: #ddd; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    <span style="color: ${gradeColor}; margin-right: 4px;">[ ${gradeText} ]</span> ${enemy.name}
                                 </div>`;
                    }
                });
                html += `</div></div>`;
            } else if (level !== "SAFE") {
                 html += `<div class="loc-section"><div class="loc-label">THREATS</div><div style="color:#666; font-size:13px;">감지된 생명체가 없습니다.</div></div>`;
            }

            html += `<div class="loc-section"><div class="loc-label">SEARCH INTEL</div>`;
            if (locationData.itemChance > 0 && locationData.searchable) {
                const chance = Math.round(locationData.itemChance * 100);
                html += `<div class="loot-info"><span style="color:#bbb; font-size:13px;">아이템 발견 확률</span><span class="loot-rate" style="color:#00e5ff; font-weight:bold;">${chance}%</span></div>`;
            } else {
                html += `<div style="color:#666; font-size:13px; padding:5px 0;">[ 탐색 불가능 지역 ]</div>`;
            }
            html += `</div>`;

            this.els.modalLocInfo.innerHTML = html;
        }

        window.openModalAnimation('locationModal');
    }

    renderArchive(archiveData) {
        if (!this.els.archiveList) return;
        this.els.archiveList.innerHTML = '';
        if (!archiveData || archiveData.length === 0) {
            this.els.archiveList.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">수집된 기록이 없습니다.<br><br>탐색을 통해 단서를 찾아보세요.</div>';
            return;
        }

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

        let currentNodeEl = null;

        Object.keys(allLocations).forEach(key => {
            const loc = allLocations[key];
            if (loc.coordinates) {
                const node = document.createElement('div');
                node.className = 'mapNode';
                node.style.gridColumn = loc.coordinates.x + 1;
                node.style.gridRow = loc.coordinates.y + 2; 
                node.innerText = loc.name.substring(0, 2);

                if (key === currentId) {
                    node.classList.add('current');
                    node.innerText = "ME";
                    currentNodeEl = node;
                }
                if (connectedIds.includes(key)) {
                    node.classList.add('connected');
                }

                node.onclick = () => this.openLocationModal(loc, enemyData, userData, key);
                this.els.miniMap.appendChild(node);
            }
        });

        if (currentNodeEl) {
            setTimeout(() => {
                const wrapper = this.els.miniMap.parentElement;
                const scrollX = currentNodeEl.offsetLeft - (wrapper.clientWidth / 2) + (currentNodeEl.clientWidth / 2);
                const scrollY = currentNodeEl.offsetTop - (wrapper.clientHeight / 2) + (currentNodeEl.clientHeight / 2);
                
                wrapper.scrollTo({
                    left: scrollX,
                    top: scrollY,
                    behavior: 'smooth'
                });
            }, 50);
        }
    }
}