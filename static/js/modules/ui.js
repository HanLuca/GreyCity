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
            modalItemDropLoc: document.getElementById('modalItemDropLoc'),
            modalItemDropRate: document.getElementById('modalItemDropRate'),
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

        this.currentInvCategory = 'all';
        this.latestData = null;
        this.latestActionCallback = null;

        document.querySelectorAll('.inv-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.currentInvCategory = target.dataset.category;
                
                if (this.latestData) {
                    this.renderInventory(this.latestData.userData, this.latestData.itemData, this.latestActionCallback, this.latestData.allLocations);
                }
            });
        });
    }

    update(data, actionCallback) {
        this.latestData = data;
        this.latestActionCallback = actionCallback;

        const { userData, stats, locationInfo, connectedLocations, allLocations, itemData, enemyData, archiveData } = data;

        if (userData.status === 'combat') {
             this.els.locName.innerHTML = `<span class="status-combat-text">⚠ [ BATTLE ] ${userData.combatData.name}</span>`;
             this.els.hpVal.className = "text-danger";
        } else if (userData.status === 'dead') {
             this.els.locName.innerText = "⚠ SYSTEM CRITICAL (FAINTED)";
             this.els.hpVal.className = "text-muted";
        } else {
             this.els.locName.innerText = locationInfo.name;
             this.els.hpVal.className = "text-accent-red";
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

        this.els.gameLog.innerHTML = (userData.logs || []).join('<br>');
        setTimeout(() => {
            this.els.gameLog.scrollTop = this.els.gameLog.scrollHeight;
        }, 10);

        this.drawMap(allLocations, userData.currentLocation, connectedLocations, enemyData, userData);
        this.renderButtons(userData, connectedLocations, allLocations, locationInfo.searchable, actionCallback);
        this.renderInventory(userData, itemData, actionCallback, allLocations);
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

    renderButtons(userData, connectedLocations, allLocations, isSearchable, callback) {
        this.els.btnGroup.innerHTML = '';

        if (userData.status === 'dead') {
            const fragCost = (userData.level || 1) * 5;
            const inventory = userData.inventory || [];
            const hasKit = inventory.includes('first_aid_kit');
            const fragments = userData.heart_fragments || 0;

            const fragBtn = document.createElement('button');
            fragBtn.innerHTML = `<b>[ 🫀 심장 조각 소생 ]</b><br><span style="font-size:11px; color:#aaa; font-weight:normal;">🫀${fragCost} 개를 사용하여 소생</span>`;
            fragBtn.style.border = "1px solid #ff0080";
            fragBtn.style.color = "#ff0080";
            if (fragments < fragCost) {
                fragBtn.disabled = true;
                fragBtn.style.opacity = 0.5;
                fragBtn.innerHTML += " <span style='font-size:11px'>[부족]</span>";
            }
            fragBtn.onclick = () => callback('revive', 'fragment');

            const kitBtn = document.createElement('button');
            kitBtn.innerHTML = `<b>[ 💊 응급키트 소생 ]</b><br><span style="font-size:11px; color:#aaa; font-weight:normal;">구급약을 사용하여 소생</span>`;
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

            if (fragments < fragCost && !hasKit) {
                const resetBtn = document.createElement('button');
                resetBtn.innerHTML = `<b>[ ☠️ 완전 초기화 소생 ]</b><br><span style="font-size:11px; color:#aaa; font-weight:normal;">모든 것을 잃고 부활합니다.</span>`;
                resetBtn.style.border = "1px solid #ff2a2a";
                resetBtn.style.color = "#ff2a2a";
                resetBtn.style.marginTop = "10px";
                resetBtn.style.width = "100%";
                resetBtn.onclick = () => {
                    if(confirm("경고: 레벨, 스탯, 아이템, 진행 상황 등 모든 정보가 지워집니다.\n이 끔찍한 육체를 버리고 새롭게 시작하시겠습니까?")) {
                        callback('revive', 'reset');
                    }
                };
                this.els.btnGroup.appendChild(resetBtn);
            }
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
                
                const targetLocData = allLocations[loc.id];
                const isLocked = targetLocData && targetLocData.requiresKey && !(userData.unlocked_places || []).includes(loc.id);
                const displayName = isLocked ? "???" : loc.name;
                
                btn.innerText = `👣 ${displayName}`;
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

    renderInventory(userData, itemData, callback, allLocations) {
        this.els.invList.innerHTML = '';
        const allItems = [...userData.inventory];
        
        let filteredItems = [];
        let showEquipped = false;

        if (userData.equipment.weapon) {
            const wpnKey = userData.equipment.weapon;
            const baseKey = wpnKey.split(':')[0];
            const item = itemData[baseKey];
            if (item && (this.currentInvCategory === 'all' || this.currentInvCategory === 'weapon')) {
                showEquipped = true;
            }
        }

        allItems.forEach(itemKey => {
            const baseKey = itemKey.split(':')[0];
            const item = itemData[baseKey];
            if (item) {
                if (this.currentInvCategory === 'all' || item.type === this.currentInvCategory) {
                    filteredItems.push({ key: itemKey, data: item });
                }
            }
        });

        if (filteredItems.length === 0 && !showEquipped) {
            this.els.invList.innerHTML = '<div class="emptyMsg">해당 분류의 아이템이 없습니다.</div>';
            return;
        }

        if (showEquipped) {
            const wpnKey = userData.equipment.weapon;
            const baseKey = wpnKey.split(':')[0];
            const item = itemData[baseKey];
            const lvl = (userData.weapon_levels && userData.weapon_levels[wpnKey]) ? userData.weapon_levels[wpnKey] : 0;
            const lvlStr = lvl > 0 ? ` <span style="color:#ff2a2a; font-weight:bold;">+${lvl}</span>` : '';
            
            const el = document.createElement('div');
            el.className = 'invItem';
            el.innerHTML = `<span><span style="color:#ff9e80; font-size:10px; margin-right:6px;">■</span>${item.name}${lvlStr}</span> <span class="equipped" style="font-size:10px; padding:2px 5px; border:1px solid #ff9e80; color:#ff9e80; border-radius:3px;">EQUIPPED</span>`;
            el.onclick = () => this.openItemModal(item, wpnKey, callback, true, allLocations, userData, itemData); 
            this.els.invList.appendChild(el);
        }

        filteredItems.forEach(filtered => {
            const itemKey = filtered.key;
            const item = filtered.data;
            const el = document.createElement('div');
            el.className = 'invItem';
            
            let dotColor = '#555';
            let lvlStr = '';
            
            if (item.type === 'weapon') {
                dotColor = '#ff9e80';
                const lvl = (userData.weapon_levels && userData.weapon_levels[itemKey]) ? userData.weapon_levels[itemKey] : 0;
                if (lvl > 0) lvlStr = ` <span style="color:#ff2a2a; font-weight:bold;">+${lvl}</span>`;
            }
            else if (item.type === 'consumable') dotColor = '#4caf50';
            else if (item.type === 'currency') dotColor = '#ff0080';
            else if (item.type === 'important') dotColor = '#ffd700';
            else if (item.type === 'material') dotColor = '#b0bec5';

            el.innerHTML = `<span><span style="color:${dotColor}; font-size:10px; margin-right:6px;">■</span><span class="name">${item.name}${lvlStr}</span></span>`;
            
            el.onclick = () => this.openItemModal(item, itemKey, callback, false, allLocations, userData, itemData);
            this.els.invList.appendChild(el);
        });
    }

    openItemModal(item, itemKey, callback, isEquipped, allLocations, userData, itemData) {
        const modal = this.els.itemModal;
        
        this.els.modalItemDesc.innerText = item.description || "설명이 없습니다.";

        let percent = (item.dropRate || 0) * 100;
        let dropRateText = percent % 1 === 0 ? percent + "%" : percent.toFixed(1) + "%";
        if (item.dropRate === 0) dropRateText = "0% (특수 획득)";

        let dropLocText = "모든 곳";
        if (item.dropLocation && item.dropLocation.length > 0) {
            const locNames = item.dropLocation.map(id => {
                return allLocations && allLocations[id] ? allLocations[id].name : id;
            });
            dropLocText = locNames.join(", ");
        }

        if(this.els.modalItemDropLoc) this.els.modalItemDropLoc.innerText = dropLocText;
        if(this.els.modalItemDropRate) this.els.modalItemDropRate.innerText = dropRateText;

        let statHtml = '';
        let btnText = '사용하기';
        let btnDisabled = false;
        let typeText = 'ITEM';
        let typeColor = '#888';
        let displayName = item.name;

        if (item.type === 'weapon') {
            typeText = 'WEAPON';
            typeColor = '#ff9e80';
            const lvl = (userData.weapon_levels && userData.weapon_levels[itemKey]) ? userData.weapon_levels[itemKey] : 0;
            const bonus = lvl * 2;
            
            if (bonus > 0) {
                displayName += ` +${lvl}`;
                statHtml = `<span style="color:#ff9e80; font-weight:bold;">[ ATK +${item.power} <span style="color:#ff2a2a">(+${bonus})</span> ]</span>`;
            } else {
                statHtml = `<span style="color:#ff9e80; font-weight:bold;">[ ATK +${item.power} ]</span>`;
            }
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
        } else if (item.type === 'material') {
             typeText = 'MATERIAL';
             typeColor = '#b0bec5';
             statHtml = `<span style="color:#b0bec5; font-weight:bold;">[ 재료 아이템 ]</span>`;
             btnText = "사용 불가";
             btnDisabled = true;
        } else {
            statHtml = `<span style="color:#888; font-weight:bold;">[ 특수 효과 없음 ]</span>`;
        }

        this.els.modalItemName.innerText = displayName;
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
                    alert("장착 중인 장비는 버릴 수 없습니다. 먼저 장착을 해제해주세요.");
                } else {
                    if (confirm(`정말 [${item.name}] 장비를 폐기하시겠습니까?`)) {
                        callback('discardItem', itemKey);
                        window.closeModalAnimation(modal);
                    }
                }
            };
        }

        const upgradeContainer = document.getElementById('modalUpgradeSection');
        const btnDisassemble = document.getElementById('modalBtnDisassemble');

        if (item.type === 'weapon') {
            if(upgradeContainer) upgradeContainer.classList.remove('hidden');
            if(btnDisassemble) {
                btnDisassemble.classList.remove('hidden');
                btnDisassemble.onclick = () => {
                    if (isEquipped) {
                        alert("장착 중인 장비는 분해할 수 없습니다. 먼저 장착을 해제해주세요.");
                    } else {
                        if (confirm(`정말 [${item.name}] 장비를 분해하시겠습니까?\n랜덤한 재료 아이템을 획득합니다.`)) {
                            callback('disassembleWeapon', itemKey);
                            window.closeModalAnimation(modal);
                        }
                    }
                };
            }
            
            const lvl = (userData.weapon_levels && userData.weapon_levels[itemKey]) ? userData.weapon_levels[itemKey] : 0;
            const matNeeded = (lvl + 1) * 2;
            const fragNeeded = (lvl + 1) * 5;
            
            const matCount = userData.inventory.filter(i => {
                const bKey = i.split(':')[0];
                return itemData[bKey] && itemData[bKey].type === 'material';
            }).length;
            const fragCount = userData.heart_fragments || 0;
            const canUpgrade = matCount >= matNeeded && fragCount >= fragNeeded;
            
            const elMetalVal = document.getElementById('upgMetalVal');
            if(elMetalVal) {
                elMetalVal.innerText = `${matCount} / ${matNeeded}`;
                elMetalVal.style.color = matCount >= matNeeded ? '#4caf50' : '#ff5555';
            }
            
            const elFragVal = document.getElementById('upgFragVal');
            if(elFragVal) {
                elFragVal.innerText = `${fragCount} / ${fragNeeded}`;
                elFragVal.style.color = fragCount >= fragNeeded ? '#4caf50' : '#ff5555';
            }

            const btnUpgrade = document.getElementById('modalBtnUpgrade');
            if(btnUpgrade) {
                btnUpgrade.disabled = !canUpgrade;
                btnUpgrade.style.opacity = canUpgrade ? 1 : 0.5;
                btnUpgrade.style.cursor = canUpgrade ? 'pointer' : 'not-allowed';
                
                btnUpgrade.onmouseover = canUpgrade ? () => { btnUpgrade.style.background = 'rgba(255, 158, 128, 0.2)'; } : null;
                btnUpgrade.onmouseout = canUpgrade ? () => { btnUpgrade.style.background = 'rgba(255, 158, 128, 0.1)'; } : null;

                btnUpgrade.onclick = () => {
                    if(canUpgrade) {
                        callback('upgradeWeapon', itemKey);
                        window.closeModalAnimation(modal);
                    }
                };
            }
        } else {
            if(upgradeContainer) upgradeContainer.classList.add('hidden');
            if(btnDisassemble) btnDisassemble.classList.add('hidden');
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
        const isLocked = locationData.requiresKey && (!(userData.unlocked_places || []).includes(locId));

        this.els.modalLocName.innerText = isLocked ? "???" : locationData.name;
        this.els.modalLocCoord.innerText = `X:${locationData.coordinates.x} Y:${locationData.coordinates.y}`;
        
        const topAccent = document.getElementById('locModalTopAccent');
        let themeColor = '#555';

        if (isLocked) {
            themeColor = '#ffd700';
            this.els.modalLocStatus.innerHTML = `[ LOCKED ]`;
            this.els.modalLocStatus.className = 'status-badge badge-locked';
            this.els.modalLocDesc.innerText = "접근 권한이 없는 구역입니다.\n보안 해제가 필요합니다.";
            this.els.modalLocInfo.innerHTML = `
                <div class="locked-info-container">
                    <div class="locked-icon">🔒</div>
                    <div><b>[보안 등급 미달]</b></div>
                    <div class="locked-subtext">해당 구역의 데이터에 접근할 수 없습니다.</div>
                </div>
            `;
        } else {
            const level = locationData.dangerLevel || "NORMAL";
            
            if (level === "SAFE") {
                themeColor = '#4caf50';
                this.els.modalLocStatus.innerHTML = `[ SAFE ]`;
                this.els.modalLocStatus.className = 'status-badge badge-safe';
            } else if (level === "NORMAL") {
                themeColor = '#00e5ff';
                this.els.modalLocStatus.innerHTML = `[ NORMAL ]`;
                this.els.modalLocStatus.className = 'status-badge badge-normal';
            } else {
                themeColor = '#ff2a2a';
                this.els.modalLocStatus.innerHTML = `[ DANGER ]`;
                this.els.modalLocStatus.className = 'status-badge badge-danger';
            }

            this.els.modalLocDesc.innerText = locationData.description || "설명이 없는 지역입니다.";

            let html = "";
            if (level !== "SAFE" && locationData.spawnList && locationData.spawnList.length > 0 && enemyData) {
                html += `<div class="loc-section"><div class="loc-label">DETECTED THREATS</div><div class="threat-list">`;
                locationData.spawnList.forEach(enemyId => {
                    const enemy = enemyData[enemyId];
                    if (enemy) {
                        let gradeText = `Lv.${enemy.grade || 1}`;
                        let gradeClass = "grade-1";
                        if (enemy.grade === 2) gradeClass = "grade-2";
                        if (enemy.grade >= 3) gradeClass = "grade-3";
                        if (enemy.grade >= 4) gradeClass = "grade-4";
                        if (enemy.grade >= 5) gradeClass = "grade-5";

                        html += `<div class="threat-item ${gradeClass}">
                                    <span class="threat-grade">[ ${gradeText} ]</span> ${enemy.name}
                                 </div>`;
                    }
                });
                html += `</div></div>`;
            } else if (level !== "SAFE") {
                 html += `<div class="loc-section"><div class="loc-label">THREATS</div><div class="threat-empty">감지된 생명체가 없습니다.</div></div>`;
            }

            html += `<div class="loc-section"><div class="loc-label">SEARCH INTEL</div>`;
            if (locationData.itemChance > 0 && locationData.searchable) {
                const chance = Math.round(locationData.itemChance * 100);
                html += `<div class="loot-info"><span class="loot-label">아이템 발견 확률</span><span class="loot-rate">${chance}%</span></div>`;
            } else {
                html += `<div class="loot-empty">[ 탐색 불가능 지역 ]</div>`;
            }
            html += `</div>`;

            this.els.modalLocInfo.innerHTML = html;
        }

        if(topAccent) {
            topAccent.style.background = themeColor;
            topAccent.style.boxShadow = `0 0 10px ${themeColor}`;
        }
        modal.querySelector('.modal-content').style.borderColor = themeColor;

        window.openModalAnimation('locationModal');
    }

    renderArchive(archiveData) {
        if (!this.els.archiveList) return;
        this.els.archiveList.innerHTML = '';
        if (!archiveData || archiveData.length === 0) {
            this.els.archiveList.innerHTML = '<div class="archive-empty">수집된 기록이 없습니다.<br><br>탐색을 통해 단서를 찾아보세요.</div>';
            return;
        }

        [...archiveData].reverse().forEach(note => {
            const div = document.createElement('div');
            div.className = 'note-item';
            div.innerHTML = `
                <div class="note-title">
                    <span>📜 ${note.title}</span>
                    <small>ARCHIVED</small>
                </div>
                <div class="note-content">"${note.content}"</div>
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
                const isLocked = loc.requiresKey && (!(userData.unlocked_places || []).includes(key));
                
                const node = document.createElement('div');
                node.className = 'mapNode';
                node.style.gridColumn = loc.coordinates.x + 1;
                node.style.gridRow = loc.coordinates.y + 2; 
                node.innerText = isLocked ? "??" : loc.name.substring(0, 2);

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