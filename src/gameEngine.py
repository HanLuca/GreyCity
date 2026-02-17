import json
import os
import random

class GameEngine:
    def __init__(self):
        self.locations = self.loadJson('locations.json')
        self.items = self.loadJson('items.json')
        self.enemies = self.loadJson('enemies.json')
        self.systemMsgs = self.loadJson('system.json')

    def loadJson(self, fileName):
        path = os.path.join('data', fileName)
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def getMsg(self, category, key, **kwargs):
        try:
            msg_list = self.systemMsgs.get(category, {}).get(key, [])
            if not msg_list: return str(key)
            template = random.choice(msg_list)
            return template.format(**kwargs)
        except Exception:
            return str(key)

    def initNewPlayer(self):
        welcome_msg = self.getMsg('system', 'welcome')
        return {
            "level": 1, "exp": 0, "maxExp": 100,
            "hp": 100, "maxHp": 100,
            "attack": 10, "defense": 0,
            "currentLocation": "shelter",
            "inventory": [], 
            "equipment": {"weapon": None, "armor": None},
            "logs": [welcome_msg],
            "status": "normal",
            "combatData": None
        }

    def validateUserData(self, userData):
        defaults = {
            "level": 1, "exp": 0, "maxExp": 100,
            "hp": 100, "maxHp": 100,
            "attack": 10, "defense": 0,
            "currentLocation": "shelter",
            "inventory": [],
            "equipment": {"weapon": None, "armor": None},
            "logs": [],
            "status": "normal",
            "combatData": None
        }
        for key, val in defaults.items():
            if key not in userData:
                userData[key] = val
        
        if userData['currentLocation'] not in self.locations:
             userData['currentLocation'] = "shelter"
             
        return userData

    def getTotalStats(self, userData):
        totalAtk = userData.get('attack', 10)
        weaponId = userData['equipment'].get('weapon')
        if weaponId and weaponId in self.items:
            totalAtk += self.items[weaponId].get('power', 0)
        return {"attack": totalAtk}

    def checkLevelUp(self, userData):
        leveled_up = False
        while userData['exp'] >= userData['maxExp']:
            userData['exp'] -= userData['maxExp']
            userData['level'] += 1
            userData['maxExp'] = int(userData['maxExp'] * 1.2)
            
            userData['maxHp'] += 10
            userData['hp'] = userData['maxHp']
            userData['attack'] += 2
            
            msg = self.getMsg('system', 'level_up', level=userData['level'])
            self.addLog(userData, msg)
            leveled_up = True
        return leveled_up

    def getGameResponse(self, userData):
        userData = self.validateUserData(userData)
        currentLocData = self.locations[userData['currentLocation']]
        
        connectedInfo = []
        for locId in currentLocData.get('connectedTo', []):
            if locId in self.locations:
                connectedInfo.append({
                    "id": locId,
                    "name": self.locations[locId]['name']
                })
        
        return {
            "userData": userData,
            "stats": self.getTotalStats(userData),
            "locationInfo": currentLocData,
            "connectedLocations": connectedInfo,
            "allLocations": self.locations,
            "itemData": self.items 
        }

    def processAction(self, userData, actionType, target):
        userData = self.validateUserData(userData)

        if actionType == "useItem":
            return self.processItemUsage(userData, target)
        
        if actionType == "discardItem":
            return self.processItemDiscard(userData, target)

        if userData['status'] == 'dead':
            if actionType == 'revive':
                userData['hp'] = 50
                userData['status'] = 'normal'
                userData['exp'] = 0
                msg = self.getMsg('system', 'revive')
                userData['logs'].append(msg)
            return self.getGameResponse(userData)

        if userData['status'] == 'combat':
            return self.processCombat(userData, actionType, target)

        currentLocData = self.locations[userData['currentLocation']]
        message = ""

        if actionType == "move":
            if target in currentLocData['connectedTo']:
                userData['currentLocation'] = target
                newLoc = self.locations[target]
                message = self.getMsg('move', 'success', name=newLoc['name'])
                
                if not newLoc.get('isSafe') and 'spawnList' in newLoc:
                    if random.random() < newLoc.get('spawnRate', 0):
                        enemyId = random.choice(newLoc['spawnList'])
                        self.startCombat(userData, enemyId)
                        message += self.getMsg('combat', 'spawn', name=self.enemies[enemyId]['name'])
            else:
                message = self.getMsg('move', 'fail')

        elif actionType == "search":
            if currentLocData.get('searchable', False):
                if 'spawnList' in currentLocData and random.random() < 0.2:
                    enemyId = random.choice(currentLocData['spawnList'])
                    self.startCombat(userData, enemyId)
                    message = self.getMsg('search', 'enemy_found', name=self.enemies[enemyId]['name'])
                
                elif random.random() < currentLocData.get('itemChance', 0):
                    all_item_keys = list(self.items.keys())
                    weights = [self.items[k].get('dropRate', 1.0) for k in all_item_keys]
                    foundItemKey = random.choices(all_item_keys, weights=weights, k=1)[0]
                    item = self.items[foundItemKey]
                    userData['inventory'].append(foundItemKey)
                    message = self.getMsg('search', 'item_found', name=item['name'])
                else:
                    message = self.getMsg('search', 'empty')

        self.addLog(userData, message)
        return self.getGameResponse(userData)

    def processItemUsage(self, userData, itemKey):
        if itemKey not in userData['inventory']:
            return self.getGameResponse(userData)

        item = self.items[itemKey]
        msg = ""

        if item['type'] == 'consumable':
            heal = item.get('heal', 0)
            userData['hp'] = min(userData['hp'] + heal, userData['maxHp'])
            userData['inventory'].remove(itemKey)
            msg = self.getMsg('item', 'use_consumable', name=item['name'], heal=heal)

        elif item['type'] == 'weapon':
            currentWeapon = userData['equipment']['weapon']
            if currentWeapon == itemKey:
                msg = self.getMsg('item', 'already_equipped')
            else:
                if currentWeapon: 
                    userData['inventory'].append(currentWeapon)
                
                userData['equipment']['weapon'] = itemKey
                userData['inventory'].remove(itemKey)
                msg = self.getMsg('item', 'equip_weapon', name=item['name'], power=item['power'])

        self.addLog(userData, msg)
        return self.getGameResponse(userData)

    def processItemDiscard(self, userData, itemKey):
        if itemKey not in userData['inventory']:
            return self.getGameResponse(userData)

        item = self.items[itemKey]
        userData['inventory'].remove(itemKey)
        msg = self.getMsg('item', 'discard', name=item['name'])
        
        self.addLog(userData, msg)
        return self.getGameResponse(userData)

    def startCombat(self, userData, enemyId):
        enemyTemplate = self.enemies[enemyId]
        userData['status'] = 'combat'
        userData['combatData'] = {
            "id": enemyId,
            "name": enemyTemplate['name'],
            "hp": enemyTemplate['hp'],
            "maxHp": enemyTemplate['maxHp'],
            "attack": enemyTemplate['attack']
        }

    # [수정] 전투 메시지에 enemy_hp, enemy_max_hp 전달
    def processCombat(self, userData, actionType, target):
        enemy = userData['combatData']
        message = ""

        if actionType == "attack":
            stats = self.getTotalStats(userData)
            atk = stats['attack']
            dmg = random.randint(int(atk * 0.8), int(atk * 1.2))
            
            # 데미지 적용
            enemy['hp'] -= dmg
            
            # 메시지 생성 (체력은 0 밑으로 내려가지 않게 표시용 변수 사용)
            display_hp = max(0, enemy['hp'])
            
            message = self.getMsg('combat', 'player_attack', 
                                  name=enemy['name'], 
                                  dmg=dmg,
                                  enemy_hp=display_hp,
                                  enemy_max_hp=enemy['maxHp'])

            if enemy['hp'] <= 0:
                userData['status'] = 'normal'
                userData['combatData'] = None
                exp = self.enemies[enemy['id']].get('exp', 0)
                userData['exp'] += exp
                message += self.getMsg('combat', 'enemy_dead', name=enemy['name'], exp=exp)
                
                self.checkLevelUp(userData)
                self.addLog(userData, message)
                return self.getGameResponse(userData)

            enemyAtk = enemy['attack']
            enemyDmg = random.randint(int(enemyAtk * 0.8), int(enemyAtk * 1.2))
            userData['hp'] -= enemyDmg
            message += self.getMsg('combat', 'enemy_attack', name=enemy['name'], dmg=enemyDmg)

        elif actionType == "run":
            if random.random() > 0.4:
                userData['status'] = 'normal'
                userData['combatData'] = None
                message = self.getMsg('combat', 'run_success')
            else:
                message = self.getMsg('combat', 'run_fail')
                enemyDmg = random.randint(5, 10)
                userData['hp'] -= enemyDmg
                message += self.getMsg('combat', 'run_fail_dmg', dmg=enemyDmg)

        if userData['hp'] <= 0:
            userData['hp'] = 0
            userData['status'] = 'dead'
            message += self.getMsg('combat', 'player_dead')

        self.addLog(userData, message)
        return self.getGameResponse(userData)

    def addLog(self, userData, text):
        if text:
            userData.setdefault('logs', []).append(text)
            if len(userData['logs']) > 30:
                userData['logs'].pop(0)