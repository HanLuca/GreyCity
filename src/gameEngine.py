import json
import os
import random

class GameEngine:
    def __init__(self):
        self.locations = self.loadJson('locations.json')
        self.items = self.loadJson('items.json')
        self.enemies = self.loadJson('enemies.json')
        self.systemMsgs = self.loadJson('system.json')
        self.lore = self.loadJson('lore.json')

    def loadJson(self, fileName):
        path = os.path.join('data', fileName)
        if not os.path.exists(path): return {}
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
            "heart_fragments": 0,
            "currentLocation": "janitor_room", 
            "inventory": [],
            "archive": [],
            "unlocked_places": [],
            "upgrades": {"atk": 0, "hp": 0, "evasion": 0},
            "equipment": {"weapon": None, "armor": None},
            "logs": [welcome_msg],
            "status": "normal",
            "combatData": None
        }

    def validateUserData(self, userData):
        if 'heart_fragments' not in userData: userData['heart_fragments'] = 0
        if 'unlocked_places' not in userData: userData['unlocked_places'] = []
        if 'archive' not in userData: userData['archive'] = []
        if 'upgrades' not in userData: userData['upgrades'] = {"atk": 0, "hp": 0, "evasion": 0}
            
        defaults = {
            "level": 1, "exp": 0, "maxExp": 100, "hp": 100, "maxHp": 100,
            "attack": 10, "defense": 0, "currentLocation": "janitor_room",
            "inventory": [], "archive": [], "unlocked_places": [],
            "upgrades": {"atk": 0, "hp": 0, "evasion": 0},
            "equipment": {"weapon": None, "armor": None}, "logs": [],
            "status": "normal", "combatData": None
        }
        for key, val in defaults.items():
            if key not in userData: userData[key] = val
        
        if userData['currentLocation'] not in self.locations:
             userData['currentLocation'] = "janitor_room"
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
        connectedInfo = [{"id": locId, "name": self.locations[locId]['name']} for locId in currentLocData.get('connectedTo', []) if locId in self.locations]
        
        archive_details = []
        for note_id in userData.get('archive', []):
            if note_id in self.lore:
                note = self.lore[note_id]
                archive_details.append({"id": note_id, "title": note['title'], "content": note['content']})

        return {
            "userData": userData, "stats": self.getTotalStats(userData),
            "locationInfo": currentLocData, "connectedLocations": connectedInfo,
            "allLocations": self.locations, "itemData": self.items,
            "enemyData": self.enemies, "archiveData": archive_details
        }

    def processAction(self, userData, actionType, target):
        userData = self.validateUserData(userData)
        if actionType == "useItem": return self.processItemUsage(userData, target)
        if actionType == "discardItem": return self.processItemDiscard(userData, target)

        if actionType == "upgrade":
            stat = target
            lvl = userData['upgrades'].get(stat, 0)
            cost = 5 + (lvl * 2) 
            
            if userData['heart_fragments'] >= cost:
                userData['heart_fragments'] -= cost
                userData['upgrades'][stat] = lvl + 1
                
                if stat == 'hp':
                    userData['maxHp'] += 5
                    userData['hp'] += 5
                    msg_stat = self.getMsg('info', 'upgrades_mhp')

                elif stat == 'atk':
                    userData['attack'] += 1
                    msg_stat = self.getMsg('info', 'upgrades_atk')

                elif stat == 'evasion':
                    msg_stat = self.getMsg('info', 'upgrades_ivd')
                    
                self.addLog(userData, self.getMsg('info', 'upgrade_success', stat=msg_stat))
                
            else:
                self.addLog(userData, self.getMsg('error', 'no_fragment', count=cost))
            return self.getGameResponse(userData)

        if userData['status'] == 'dead':
            if actionType == 'revive':
                required_fragments = userData['level'] * 5
                if target == 'fragment':
                    if userData['heart_fragments'] >= required_fragments:
                        userData['heart_fragments'] -= required_fragments
                        self.executeRevive(userData)
                    else: self.addLog(userData, self.getMsg('error', 'no_fragment', count=required_fragments))
                elif target == 'kit':
                    if 'first_aid_kit' in userData['inventory']:
                        userData['inventory'].remove('first_aid_kit')
                        self.executeRevive(userData)
                    else: self.addLog(userData, self.getMsg('error', 'no_kit'))
            return self.getGameResponse(userData)

        if userData['status'] == 'combat': return self.processCombat(userData, actionType, target)

        currentLocData = self.locations[userData['currentLocation']]
        message = ""

        if actionType == "move":
            if target in currentLocData['connectedTo']:
                newLoc = self.locations[target]
                can_enter = True
                requiredKey = newLoc.get('requiresKey')
                if requiredKey:
                    if target in userData['unlocked_places']: can_enter = True
                    else:
                        if requiredKey in userData['inventory']:
                            userData['unlocked_places'].append(target)
                            userData['inventory'].remove(requiredKey)
                            message += self.getMsg('info', 'unlock_door', keyName=self.items[requiredKey]['name'])
                            can_enter = True
                        else:
                            message = self.getMsg('error', 'locked', keyName=self.items[requiredKey]['name'])
                            can_enter = False

                if can_enter:
                    userData['currentLocation'] = target
                    message += self.getMsg('move', 'success', name=newLoc['name'])
                    if newLoc.get('dangerLevel') != 'SAFE' and 'spawnList' in newLoc:
                        if random.random() < newLoc.get('spawnRate', 0):
                            enemyId = random.choice(newLoc['spawnList'])
                            self.startCombat(userData, enemyId)
                            message += self.getMsg('warning', 'boss_appear', name=self.enemies[enemyId]['name']) if self.enemies[enemyId].get('grade', 1) >= 4 else self.getMsg('combat', 'spawn', name=self.enemies[enemyId]['name'])
            else: message = self.getMsg('move', 'fail')

        elif actionType == "search":
            if currentLocData.get('searchable', False):
                event_happened = False
                if not event_happened and random.random() < 0.01:
                    amount = random.randint(1, 3)
                    userData['heart_fragments'] += amount
                    message = self.getMsg('search', 'fragment_found', amount=amount)
                    event_happened = True
                if not event_happened and 'spawnList' in currentLocData and random.random() < 0.2:
                    enemyId = random.choice(currentLocData['spawnList'])
                    self.startCombat(userData, enemyId)
                    message = self.getMsg('search', 'enemy_found', name=self.enemies[enemyId]['name'])
                    event_happened = True
                if not event_happened:
                    for note_id, note in self.lore.items():
                        if note.get('dropLoc') == userData['currentLocation'] and note_id not in userData['archive']:
                            if random.random() < note.get('chance', 0):
                                userData['archive'].append(note_id)
                                message = self.getMsg('search', 'note_found', title=note['title'])
                                event_happened = True
                                break
                if not event_happened and random.random() < currentLocData.get('itemChance', 0):
                    valid_items = [k for k, v in self.items.items() if v['type'] != 'currency']
                    weights = [self.items[k].get('dropRate', 1.0) for k in valid_items]
                    foundItemKey = random.choices(valid_items, weights=weights, k=1)[0]
                    userData['inventory'].append(foundItemKey)
                    message = self.getMsg('search', 'item_found', name=self.items[foundItemKey]['name'])
                    event_happened = True
                if not event_happened: message = self.getMsg('search', 'empty')

        self.addLog(userData, message)
        return self.getGameResponse(userData)

    def processItemUsage(self, userData, itemKey):
        if itemKey not in userData['inventory']: return self.getGameResponse(userData)
        item, msg = self.items[itemKey], ""
        if itemKey == 'first_aid_kit':
             userData['hp'] = min(userData['hp'] + item.get('heal', 80), userData['maxHp'])
             userData['inventory'].remove(itemKey)
             msg = self.getMsg('item', 'use_first_aid', heal=item.get('heal', 80))
        elif item['type'] == 'consumable':
            userData['hp'] = min(userData['hp'] + item.get('heal', 0), userData['maxHp'])
            userData['inventory'].remove(itemKey)
            msg = self.getMsg('item', 'use_consumable', name=item['name'], heal=item.get('heal', 0))
        elif item['type'] == 'weapon':
            currentWeapon = userData['equipment']['weapon']
            if currentWeapon == itemKey: msg = self.getMsg('item', 'already_equipped')
            else:
                if currentWeapon: userData['inventory'].append(currentWeapon)
                userData['equipment']['weapon'], msg = itemKey, self.getMsg('item', 'equip_weapon', name=item['name'], power=item['power'])
                userData['inventory'].remove(itemKey)
        elif item['type'] == 'key': msg = self.getMsg('info', 'key_desc', name=item['name'])
        self.addLog(userData, msg)
        return self.getGameResponse(userData)

    def processItemDiscard(self, userData, itemKey):
        if itemKey in userData['inventory']:
            msg = self.getMsg('item', 'discard', name=self.items[itemKey]['name'])
            userData['inventory'].remove(itemKey)
            self.addLog(userData, msg)
        return self.getGameResponse(userData)

    def executeRevive(self, userData):
        userData['hp'], userData['status'] = int(userData['maxHp'] * 0.8), 'normal'
        self.addLog(userData, self.getMsg('info', 'revive_success', hp=userData['hp']))

    def startCombat(self, userData, enemyId):
        e = self.enemies[enemyId]
        userData['status'], userData['combatData'] = 'combat', {"id": enemyId, "name": e['name'], "hp": e['hp'], "maxHp": e['maxHp'], "attack": e['attack']}

    def processCombat(self, userData, actionType, target):
        enemy, message = userData['combatData'], ""
        if actionType == "attack":
            dmg = random.randint(int(self.getTotalStats(userData)['attack'] * 0.8), int(self.getTotalStats(userData)['attack'] * 1.2))
            enemy['hp'] -= dmg
            message = self.getMsg('combat', 'player_attack', name=enemy['name'], dmg=dmg, enemy_hp=max(0, enemy['hp']), enemy_max_hp=enemy['maxHp'])
            
            if enemy['hp'] <= 0:
                userData['status'], userData['combatData'] = 'normal', None
                exp = self.enemies[enemy['id']].get('exp', 0)
                userData['exp'] += exp
                frag = random.randint(1, 3) + (random.randint(2, 5) if self.enemies[enemy['id']].get('grade', 1) >= 3 else 0)
                userData['heart_fragments'] += frag
                message += self.getMsg('combat', 'enemy_dead', name=enemy['name'], exp=exp) + self.getMsg('combat', 'fragment_drop', count=frag)
                self.checkLevelUp(userData)
            else:
                evasion_rate = userData.get('upgrades', {}).get('evasion', 0) * 0.001
                if random.random() < evasion_rate:
                    message += self.getMsg('combat', 'player_evade')
                else:
                    e_dmg = random.randint(int(enemy['attack'] * 0.8), int(enemy['attack'] * 1.2))
                    userData['hp'] -= e_dmg
                    message += self.getMsg('combat', 'enemy_attack', name=enemy['name'], dmg=e_dmg)
                    
        elif actionType == "run":
            if random.random() > 0.4: userData['status'], userData['combatData'], message = 'normal', None, self.getMsg('combat', 'run_success')
            else:
                e_dmg = random.randint(5, 10)
                userData['hp'] -= e_dmg
                message = self.getMsg('combat', 'run_fail') + self.getMsg('combat', 'run_fail_dmg', dmg=e_dmg)
                
        if userData['hp'] <= 0: userData['hp'], userData['status'], message = 0, 'dead', message + self.getMsg('combat', 'player_dead')
        self.addLog(userData, message)
        return self.getGameResponse(userData)

    def addLog(self, userData, text):
        if text:
            userData.setdefault('logs', []).append(text)
            if len(userData['logs']) > 30: userData['logs'].pop(0)