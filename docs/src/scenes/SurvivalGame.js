import Phaser from "phaser";

export class SurvivalGame extends Phaser.Scene {
    // 1. Construtor da classe
    constructor() {
        super("SurvivalGame");
        this.initialPlayerMaxHp = 5; // Vida máxima inicial do jogador
        this.playerMaxHp = this.initialPlayerMaxHp; // Vida máxima atual do personagem
        this.playerHp = this.playerMaxHp; // Vida inicial do personagem
        this.playerDamage = 1; // Dano base do jogador
        this.canRevive = false; // Flag para o perk de reviver
        this.revivedOnce = false; // Flag para controlar se o jogador já reviveu
        this.score = 0; // Pontuação do jogo
        this.round = 0; // Começa em 0, a função startNewRound irá para 1
        this.zombieBaseSpeed = 50; // Velocidade base dos zumbis
        this.zombieBaseHp = 3; // HP base dos zumbis
        this.invulnerable = false; // Flag de invulnerabilidade do jogador
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
        this.money = 0; // Dinheiro do jogador
        this.purchasedUpgrades = new Set(); // Armazena upgrades já comprados
        this.weapons = [
            {
                type: "pistol",
                damage: 1,
                fireRate: 500,
                spread: 0,
                bulletSpeed: 500,
            },
        ]; // Arma inicial
        this.currentWeaponIndex = 0; // Índice da arma atual equipada
        this.lastShotTime = 0; // Controla o tempo do último disparo
        this.playerBaseSpeed = 120; // Velocidade base do jogador
        this.playerCurrentSpeed = 120; // Velocidade atual do jogador
        this.startTime = 0; // Guarda quando a partida começou
        this.elapsedTime = 0; // Guarda o tempo total da partida

        // PROPRIEDADES PARA REGENERAÇÃO DE VIDA
        this.lastHitTime = 0;
        this.regenerationDelay = 5000;
        this.regenerationInterval = 500;
        this.regenerationAmount = 1;
        this.regenerationTimer = null;

        // Propriedades para o sistema de rounds por eliminação
        this.totalZombiesKilled = 0;
        this.zombiesToSpawnForRound = 0;
        this.zombiesKilledThisRound = 0;
        this.zombiesSpawnedThisRound = 0;
        this.roundZombieSpawner = null; // Timer para gerar os zumbis do round
    }

    // 2. Pré-carregamento de assets (Omitido)

    // 3. Funções de Criação
    create() {
        this.startTime = this.time.now;
        this.sound.play("survivalMusic", { volume: 0.2, loop: true });

        // Resetar estados
        this.playerMaxHp = this.initialPlayerMaxHp;
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.canRevive = false; // Resetando as flags de reviver
        this.revivedOnce = false;
        this.score = 0;
        this.round = 0;
        this.zombieBaseSpeed = 50;
        this.zombieBaseHp = 3;
        this.money = 0;
        this.weapons = [
            { type: "pistol", damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 },
        ];
        this.currentWeaponIndex = 0;
        this.purchasedUpgrades = new Set();
        this.playerCurrentSpeed = this.playerBaseSpeed;
        this.totalZombiesKilled = 0;

        this.lastHitTime = this.time.now;
        this.startHealthRegeneration();

        const map = this.make.tilemap({ key: "map" });
        this.map = map;
        const tileset01 = map.addTilesetImage("Zombie_Tileset", "tilesRefe");
        const tileset02 = map.addTilesetImage("Perks", "tilesPeks");
        const tileset03 = map.addTilesetImage("armas_parede", "tilesArmas");
        const spawnPoint = map.findObject("playe", (obj) => obj.name === "Spawn");

        const camdaLimite = map.createLayer("Limite", tileset01, 0, 0);
        camdaLimite.setCollisionByProperty({ colisao: true });
        this.camadaLimite = camdaLimite;
        map.createLayer("Chao", tileset01, 0, 0);
        map.createLayer("ObjetosScolider", tileset01, 0, 0);
        const camadaObjetosColider = map.createLayer("ObjetosColider", tileset01, 0, 0);
        camadaObjetosColider.setDepth(10);
        camadaObjetosColider.setCollisionByProperty({ colisao: true });
        camadaObjetosColider.setCollisionByProperty({ colisao_p: true });
        this.camadaObjetosColider = camadaObjetosColider;
        const camadaPerks = map.createLayer("Perks", tileset02, 0, 0);
        camadaPerks.setCollisionByProperty({ colisao: true });
        this.camadaPerks = camadaPerks;
        camadaPerks.setDepth(10);
        map.createLayer("Armas", tileset03, 0, 0).setDepth(10);
        map.createLayer("Acessorios", tileset01, 0, 0).setDepth(10);

        if (spawnPoint) {
            this.createPlayer(spawnPoint.x, spawnPoint.y);
        } else {
            console.warn("Ponto de spawn não encontrado! Usando posição padrão.");
            this.createPlayer(100, 100);
        }

        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUpgradeAreas();
        this.createWeaponAreas();
        this.createUpgradeInput();
        this.createWeaponInput();
        this.createUI();

        this.setupCollisions();
        this.setupMouseShoot();
        this.startNewRound();

        this.physics.world.on('worldbounds', (body) => {
            if (this.bullets.contains(body.gameObject)) {
                body.gameObject.destroy();
            }
        });

        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const numWeapons = this.weapons.length;
            if (numWeapons <= 1) return;
            if (deltaY > 0) {
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % numWeapons;
            } else if (deltaY < 0) {
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + numWeapons) % numWeapons;
            }
        });

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(3.5);
        this.input.setDefaultCursor("url(assets/imagens/crosshair.png) 32 32, pointer");
    }

    createPlayer(x, y) {
        this.player = this.physics.add.sprite(x, y, "player_parado_down");
        this.player.setDisplaySize(16, 16).setOrigin(0.5).setDepth(5);
        this.player.body.setCollideWorldBounds(true);
        this.player.frameToggleTime = 0;
        this.player.frameToggleState = false;
        this.player.isTakingDamage = false;
        this.player.hitFrameToggle = false;
        this.player.hitFrameToggleTime = 0;
        this.player.lastDirection = "down";
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D");
    }

    createGroups() {
        this.zombies = this.physics.add.group();
        this.bullets = this.physics.add.group();
    }

    createObstacles() {
        this.obstacles = this.physics.add.staticGroup();
        const positions = [
            { x: 800, y: 1000 }, { x: 1200, y: 1100 },
            { x: 1600, y: 950 }, { x: 1000, y: 1400 },
        ];
        positions.forEach((pos) => {
            const obs = this.obstacles.create(pos.x, pos.y, "obstacle");
            obs.setScale(0.5).refreshBody();
        });
    }

    createUI() {
        this.uiBg = this.add.rectangle(0, 0, 150, 75, 0x000000, 0.8)
            .setOrigin(0, 0).setDepth(1000).setStrokeStyle(2, 0x800000);

        const textStyle = { fontSize: "12px", fontFamily: "Arial", color: "#ffffff", stroke: "#000000", strokeThickness: 2 };

        this.roundText = this.add.text(0, 0, ``, textStyle).setOrigin(0, 0).setDepth(1000);
        this.scoreText = this.add.text(0, 0, ``, textStyle).setOrigin(0, 0).setDepth(1000);
        this.moneyText = this.add.text(0, 0, ``, { ...textStyle, color: "#ffff00" }).setOrigin(0, 0).setDepth(1000);

        this.healthBarBg = this.add.rectangle(100, 120, 54, 12, 0x000000).setOrigin(0, 0).setDepth(1000);
        this.healthBar = this.add.rectangle(0, 0, 52, 10, 0xff0000).setOrigin(0, 0).setDepth(1000);

        this.updateUIPosition();

        this.perkIcons = [];
        this.perkIconStartX = 20;
        this.perkIconStartY = this.scale.height - 40;

        const slotWidth = 140, slotHeight = 40, slotMargin = 10;
        const screenWidth = this.scale.width, screenHeight = this.scale.height;

        this.weaponSlot2Bg = this.add.rectangle(screenWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333).setScrollFactor(0).setOrigin(1, 1);
        this.weaponSlot2Text = this.add.text(this.weaponSlot2Bg.x - slotWidth / 2, this.weaponSlot2Bg.y - slotHeight / 2, "2: Empty", { fontSize: "14px", fill: "#ffffff", align: "center" }).setScrollFactor(0).setOrigin(0.5);
        this.weaponSlot1Bg = this.add.rectangle(screenWidth - slotMargin - slotWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333).setScrollFactor(0).setOrigin(1, 1);
        this.weaponSlot1Text = this.add.text(this.weaponSlot1Bg.x - slotWidth / 2, this.weaponSlot1Bg.y - slotHeight / 2, "1: Pistol", { fontSize: "14px", fill: "#ffffff", align: "center" }).setScrollFactor(0).setOrigin(0.5);
    }

    updateUIPosition() {
        const cam = this.cameras.main, zoom = 3.5;
        const offsetX = cam.midPoint.x - cam.displayWidth / 2 + 10;
        const offsetY = cam.midPoint.y - cam.displayHeight / 2 + 10;

        this.uiBg.setPosition(offsetX, offsetY);
        this.roundText.setPosition(offsetX + 8, offsetY + 6);
        this.scoreText.setPosition(offsetX + 8, offsetY + 22);
        this.moneyText.setPosition(offsetX + 8, offsetY + 38);

        const barWidth = 150 / zoom, barHeight = 20 / zoom;
        this.healthBarBg.setPosition(offsetX + 39 / zoom, offsetY + 210 / zoom).setSize(barWidth + 2 / zoom, barHeight + 2 / zoom);
        this.healthBar.setPosition(offsetX + 40 / zoom, offsetY + 211 / zoom).setSize(barWidth * (this.playerHp / this.playerMaxHp), barHeight);
    }

    createUpgradeAreas() {
        this.upgradeAreas = [];
        this.upgradeText = this.add.text(0, 0, "", { fontSize: "10px", fill: "#ffff00", backgroundColor: "rgba(0,0,0,0.1)", padding: { x: 10, y: 5 } }).setScrollFactor(1).setVisible(false).setDepth(20);

        const perkPointReviver = this.map.findObject("perkPoint", obj => obj.name === "perk_reviver");
        const perkPointForca = this.map.findObject("perkPoint", obj => obj.name === "perk_forca");
        const perkPointResistencia = this.map.findObject("perkPoint", obj => obj.name === "perk_resistencia");
        const perkPointRecarga = this.map.findObject("perkPoint", obj => obj.name === "perk_recarga");

        const areaData = [
            { point: perkPointForca, cost: 2000, upgrade: "forca" }, { point: perkPointReviver, cost: 1500, upgrade: "reviver" },
            { point: perkPointResistencia, cost: 2500, upgrade: "resistencia" }, { point: perkPointRecarga, cost: 3000, upgrade: "recarga" }
        ];

        areaData.forEach(data => {
            if (!data.point) { console.error(`ERRO: Objeto de perk '${data.upgrade}' não encontrado.`); return; }
            const area = this.add.rectangle(data.point.x, data.point.y, data.point.width, data.point.height, 0xffffff, 0.2).setOrigin(0, 0);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.upgradeType = data.upgrade;
            area.upgradeName = { forca: "Tiro Duplo", reviver: "Ressurgimento", resistencia: "Vida Máxima", recarga: "Aumento de velocidade" }[data.upgrade];
            area.message = `Pressione E para ${area.upgradeName} (${area.cost})`;
            this.upgradeAreas.push(area);
        });
        this.currentUpgradeArea = null;
    }

    createWeaponAreas() {
        this.weaponAreas = [];
        const weaponDefinitions = [
            { tiledName: "sniper", internalName: "sniper", cost: 1500 }, { tiledName: "minigun", internalName: "minigun", cost: 3000 },
            { tiledName: "doze", internalName: "shotgun", cost: 2500 }, { tiledName: "rifre", internalName: "rifle", cost: 2000 }
        ];

        weaponDefinitions.forEach(def => {
            const weaponPoint = this.map.findObject("armaPoint", obj => obj.name === def.tiledName);
            if (!weaponPoint) { console.error(`ERRO: Objeto de arma '${def.tiledName}' não encontrado.`); return; }
            const area = this.add.rectangle(weaponPoint.x, weaponPoint.y, weaponPoint.width, weaponPoint.height, 0x00ff00, 0.2).setOrigin(0, 0);
            this.physics.add.existing(area, true);
            area.cost = def.cost;
            area.weaponType = def.internalName;
            area.message = `Pressione R para comprar ${area.weaponType} (${area.cost})`;
            this.weaponAreas.push(area);
        });
        this.currentWeaponArea = null;
    }

    // =================================================================
    // FUNÇÃO CORRIGIDA (createUpgradeInput)
    // =================================================================
    createUpgradeInput() {
        this.input.keyboard.on("keydown-E", () => {
            if (this.currentUpgradeArea) {
                const area = this.currentUpgradeArea;

                // CORREÇÃO: Verificação para impedir a recompra do reviver
                if (area.upgradeType === 'reviver' && this.revivedOnce) {
                    this.showTemporaryMessage("Ressurgimento só pode ser usado uma vez.", "error");
                    return; // Impede a compra
                }

                if (this.purchasedUpgrades.has(area.upgradeType)) {
                    this.showTemporaryMessage("Upgrade já comprado", "error");
                    return;
                }

                if (this.money >= area.cost) {
                    this.money -= area.cost;
                    this.sound.play("upgrade", { volume: 0.2 });
                    this.purchasedUpgrades.add(area.upgradeType);
                    switch (area.upgradeType) {
                        case "forca": this.weapons.forEach(weapon => (weapon.damage *= 2)); break;
                        case "reviver": this.canRevive = true; break;
                        case "resistencia": this.playerMaxHp += 2; this.playerHp += 2; break;
                        case "recarga": this.playerCurrentSpeed = this.playerBaseSpeed * 1.3; break;
                    }
                    // CORREÇÃO: Mapeia o nome do upgrade 'recarga' para a chave do ícone 'velocidade'
                    const iconKey = area.upgradeType === 'recarga' ? 'velocidade' : area.upgradeType;
                    this.addPerkIcon(iconKey);
                    this.showTemporaryMessage(`Upgrade de ${area.upgradeName} comprado!`);
                } else {
                    this.showTemporaryMessage("Dinheiro insuficiente", "error");
                }
            }
        });
    }

    createWeaponInput() {
        this.input.keyboard.on("keydown-R", () => {
            if (this.currentWeaponArea) {
                const area = this.currentWeaponArea;
                if (this.money >= area.cost) {
                    const weaponStats = {
                        minigun: { type: "minigun", damage: 1.5, fireRate: 100, spread: 5, bulletSpeed: 600 },
                        shotgun: { type: "shotgun", damage: 2, fireRate: 800, spread: 10, bulletSpeed: 400 },
                        rifle: { type: "rifle", damage: 1.2, fireRate: 200, spread: 2, bulletSpeed: 700 },
                        sniper: { type: "sniper", damage: 4, fireRate: 1500, spread: 0, bulletSpeed: 1000 },
                    }[area.weaponType];
                    this.sound.play("gunload", { volume: 0.2 });
                    this.money -= area.cost;
                    if (this.weapons.length < 2) {
                        this.weapons.push(weaponStats);
                        this.currentWeaponIndex = this.weapons.length - 1;
                        this.showTemporaryMessage(`Arma ${area.weaponType} comprada e equipada!`);
                    } else {
                        const oldWeaponType = this.weapons[this.currentWeaponIndex].type;
                        this.weapons[this.currentWeaponIndex] = weaponStats;
                        this.showTemporaryMessage(`Arma ${area.weaponType} substituiu ${oldWeaponType}!`);
                    }
                } else { this.showTemporaryMessage("Dinheiro insuficiente", "error"); }
            }
        });
    }

    showTemporaryMessage(text, soundType = "default") {
        if (soundType === "error") { this.sound.play("error", { volume: 0.2 }); }
        this.upgradeText.setText(text).setPosition(this.player.x - 90, this.player.y - 50).setVisible(true);
        this.time.delayedCall(1500, () => this.upgradeText.setVisible(false));
    }

    // 4. Funções relacionadas ao Player
    handlePlayerMovement() {
        const speed = this.playerCurrentSpeed;
        this.player.body.setVelocity(0);
        const vx = (this.cursors.left.isDown || this.keys.A.isDown) ? -speed : (this.cursors.right.isDown || this.keys.D.isDown) ? speed : 0;
        const vy = (this.cursors.up.isDown || this.keys.W.isDown) ? -speed : (this.cursors.down.isDown || this.keys.S.isDown) ? speed : 0;
        this.player.body.setVelocity(vx, vy);

        if (this.player.isTakingDamage) return;
        if (vx !== 0 || vy !== 0) {
            this.simulatePlayerAnimation(this.player, "player", vx, vy);
            this.player.lastDirection = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : (vy > 0 ? "down" : "up");
        } else { this.player.setTexture(`player_parado_${this.player.lastDirection}`); }
    }

    playPlayerHitAnimation() {
        this.player.isTakingDamage = true;
        const toggleHitFrame = () => {
            if (!this.player.isTakingDamage) return;
            const now = this.time.now;
            if (now > (this.player.hitFrameToggleTime || 0)) {
                const frame = this.player.hitFrameToggle ? "2" : "1";
                this.player.setTexture(`player_hit_${this.player.lastDirection}${frame}`);
                this.player.hitFrameToggle = !this.player.hitFrameToggle;
                this.player.hitFrameToggleTime = now + 150;
            }
            this.time.delayedCall(150, toggleHitFrame);
        };
        toggleHitFrame();
        this.time.delayedCall(this.invulnerableTime, () => {
            this.player.isTakingDamage = false;
            this.player.setTexture(`player_parado_${this.player.lastDirection}`);
        });
    }

    simulatePlayerAnimation(player, baseKey, vx, vy) {
        const now = this.time.now;
        const direction = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : (vy > 0 ? "down" : "up");
        if (now > (player.frameToggleTime || 0)) {
            const frame = player.frameToggleState ? "2" : "";
            player.setTexture(`${baseKey}_${direction}${frame}`);
            player.frameToggleState = !player.frameToggleState;
            player.frameToggleTime = now + 300;
        }
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable) return;
        this.playerHp -= 1;
        this.invulnerable = true;
        this.lastHitTime = this.time.now;
        this.playPlayerHitAnimation();
        this.sound.play("ouch", { volume: 0.15 });
        this.tweens.add({ targets: player, alpha: 0.5, duration: 100, repeat: 5, yoyo: true, onComplete: () => this.player.setAlpha(1) });
        this.time.delayedCall(this.invulnerableTime, () => { this.invulnerable = false; });
        if (this.playerHp <= 0) this.gameOver();
    }

    shootBullet() {
        const currentTime = this.time.now;
        const weapon = this.weapons[this.currentWeaponIndex];
        if (currentTime < this.lastShotTime + weapon.fireRate) { return; }
        this.lastShotTime = currentTime;

        const pointer = this.input.activePointer;
        const soundKey = { pistol: "pistol_shot", minigun: "minigun_shot", shotgun: "shotgun_shot", rifle: "rifle_shot", sniper: "sniper_shot" }[weapon.type];
        if (soundKey) { this.sound.play(soundKey, { volume: 0.2 }); }

        const createBullet = (angle) => {
            const bullet = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0xffff00);
            this.physics.add.existing(bullet);
            this.bullets.add(bullet);
            bullet.body.setCollideWorldBounds(true).onWorldBounds = true;
            this.physics.velocityFromRotation(angle, weapon.bulletSpeed, bullet.body.velocity);
            this.time.delayedCall(2000, () => bullet && bullet.destroy());
        };

        const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        if (weapon.type === "shotgun") {
            const numPellets = 5;
            for (let i = 0; i < numPellets; i++) {
                createBullet(baseAngle + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-weapon.spread, weapon.spread)));
            }
        } else { createBullet(baseAngle); }
    }

  
    gameOver() {
        if (this.canRevive && !this.revivedOnce) {
            this.revivedOnce = true;
            this.canRevive = false; // <-- CORREÇÃO: Consome o perk de reviver.

            this.playerHp = this.initialPlayerMaxHp; // Restaura a vida para o máximo inicial
            this.money = Math.floor(this.money * 0.5);

            // Remove o ícone específico do reviver
            const reviveIconIndex = this.perkIcons.findIndex(icon => icon.texture.key === 'perk_reviver');
            if (reviveIconIndex > -1) {
                this.perkIcons[reviveIconIndex].destroy();
                this.perkIcons.splice(reviveIconIndex, 1);
            }

            // Remove apenas o reviver dos upgrades comprados para que o set não o liste mais
            this.purchasedUpgrades.delete('reviver');

            this.lastHitTime = this.time.now;
            this.showTemporaryMessage("Você reviveu, mas perdeu o perk!");
            return;
        }

        // Se não puder reviver, o jogo acaba normalmente.
        this.sound.stopAll();
        if (this.roundZombieSpawner) this.roundZombieSpawner.destroy();
        this.scene.start("GameOver", { score: this.score, round: this.round, money: this.money, timeSurvived: this.elapsedTime, zombiesKilled: this.totalZombiesKilled });
    }

    regenerateHealth() {
        if (this.playerHp < this.playerMaxHp && this.time.now - this.lastHitTime >= this.regenerationDelay) {
            this.playerHp = Math.min(this.playerHp + this.regenerationAmount, this.playerMaxHp);
        }
    }

    addPerkIcon(perkKey) {
        const iconKey = { forca: "perk_forca", reviver: "perk_reviver", resistencia: "perk_resistencia", velocidade: "perk_velocidade" }[perkKey];
        if (!iconKey) return;
        const icon = this.add.image(this.perkIconStartX + this.perkIcons.length * 40, this.perkIconStartY, iconKey).setScrollFactor(0).setDisplaySize(32, 32);
        this.perkIcons.push(icon);
    }

    // 5. Funções de Atualização
    update(time, delta) {
        if (!this.player.active) return;
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.handleZombieStuckDetection(delta);
        this.updateUI();
        this.updateUIPosition();
        this.checkUpgradeAreaOverlap();
        this.checkWeaponAreaOverlap();
        this.elapsedTime = Math.floor((this.time.now - this.startTime) / 1000);
    }

    updateUI() {
        const remainingZombies = Math.max(0, this.zombiesToSpawnForRound - this.zombiesKilledThisRound);
        this.roundText.setText(`Round: ${this.round} | Faltam: ${remainingZombies}`);
        this.scoreText.setText(`Pontos: ${this.score}`);
        this.moneyText.setText(`Ouro: ${this.money}`);

        const weapon1 = this.weapons[0], weapon2 = this.weapons[1];
        const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Empty");
        this.weaponSlot1Text.setText(`1: ${capitalize(weapon1?.type)}`);
        this.weaponSlot2Text.setText(`2: ${capitalize(weapon2?.type)}`);
        this.weaponSlot1Bg.setFillStyle(this.currentWeaponIndex === 0 ? 0x00ff00 : 0x333333);
        this.weaponSlot2Bg.setFillStyle(this.currentWeaponIndex === 1 ? 0x00ff00 : 0x333333);
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate((zombie) => {
            if (!zombie.active) return;
            this.physics.moveToObject(zombie, this.player, zombie.speed);
            this.simulateDirectionalAnimation(zombie, zombie.type, zombie.body.velocity.x, zombie.body.velocity.y);
        });
    }

    checkUpgradeAreaOverlap() {
        let inArea = false;
        for (const area of this.upgradeAreas) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), area.getBounds())) {
                inArea = true;
                this.currentUpgradeArea = area;
                this.upgradeText.setText(area.message).setPosition(this.player.x - 90, this.player.y - 50).setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentUpgradeArea = null;
            if (!this.currentWeaponArea) this.upgradeText.setVisible(false);
        }
    }

    checkWeaponAreaOverlap() {
        let inArea = false;
        for (const area of this.weaponAreas) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), area.getBounds())) {
                inArea = true;
                this.currentWeaponArea = area;
                this.upgradeText.setText(area.message).setPosition(this.player.x - 90, this.player.y - 50).setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentWeaponArea = null;
            if (!this.currentUpgradeArea) this.upgradeText.setVisible(false);
        }
    }

    // 6. Funções relacionadas a Zumbis
    spawnZombie() {
        const type = Phaser.Math.RND.pick(["fast", "tank", "smart"]);
        let zombieSpeed = this.zombieBaseSpeed, zombieHp = this.zombieBaseHp, spriteKey, size;

        if (type === "fast") { zombieSpeed *= 1.5; zombieHp = 2; spriteKey = "fast_down"; size = { w: 16, h: 16 }; }
        else if (type === "tank") { zombieSpeed *= 0.4; zombieHp = 16; spriteKey = "tank_down"; size = { w: 32, h: 32 }; }
        else { zombieSpeed *= 1.2; zombieHp = 6; spriteKey = "smart_down"; size = { w: 16, h: 20 }; }

        const edge = Phaser.Math.Between(0, 3), bounds = this.physics.world.bounds;
        let x, y;
        if (edge === 0) { x = Phaser.Math.Between(0, bounds.width); y = -50; }
        else if (edge === 1) { x = bounds.width + 50; y = Phaser.Math.Between(0, bounds.height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, bounds.width); y = bounds.height + 50; }
        else { x = -50; y = Phaser.Math.Between(0, bounds.height); }

        const zombie = this.physics.add.sprite(x, y, spriteKey).setDisplaySize(size.w, size.h).setOrigin(0.5).setDepth(5);
        Object.assign(zombie, { hp: zombieHp, speed: zombieSpeed, type, frameToggleTime: 0, frameToggleState: false, isTakingDamage: false, hitFrameToggle: false, originalWidth: zombie.displayWidth, originalHeight: zombie.displayHeight });
        this.zombies.add(zombie);

        zombie.stuckData = {
            stuckTime: 0, isPhasing: false, phasingCooldown: 0,
            lastCheckTime: this.time.now,
            positionAtLastCheck: new Phaser.Math.Vector2(zombie.x, zombie.y)
        };
    }

    spawnBossZombie() {
        const bounds = this.physics.world.bounds, edge = Phaser.Math.Between(0, 3);
        let x, y;
        if (edge === 0) { x = Phaser.Math.Between(0, bounds.width); y = -100; }
        else if (edge === 1) { x = bounds.width + 100; y = Phaser.Math.Between(0, bounds.height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, bounds.width); y = bounds.height + 100; }
        else { x = -100; y = Phaser.Math.Between(0, bounds.height); }

        const boss = this.physics.add.sprite(x, y, "boss_down").setDisplaySize(48, 48).setOrigin(0.5).setDepth(5);
        Object.assign(boss, { hp: this.zombieBaseHp * 10, speed: this.zombieBaseSpeed * 0.8, type: "boss", frameToggleTime: 0, frameToggleState: false, isTakingDamage: false, hitFrameToggle: false, originalWidth: boss.displayWidth, originalHeight: boss.displayHeight });
        this.zombies.add(boss);
        boss.body.setCollideWorldBounds(true);

        boss.stuckData = {
            stuckTime: 0, isPhasing: false, phasingCooldown: 0,
            lastCheckTime: this.time.now,
            positionAtLastCheck: new Phaser.Math.Vector2(boss.x, boss.y)
        };
    }

    handleZombieStuckDetection(delta) {
        const STUCK_THRESHOLD = 10000;
        const PHASING_DURATION = 3000;
        const PHASING_COOLDOWN = 5000;
        const CHECK_INTERVAL = 250;
        const MINIMUM_PROGRESS_DISTANCE = 5;

        const now = this.time.now;

        this.zombies.children.iterate((zombie) => {
            if (!zombie || !zombie.active || !zombie.stuckData) return;
            const data = zombie.stuckData;
            if (data.phasingCooldown > now || data.isPhasing) return;

            if (now > data.lastCheckTime + CHECK_INTERVAL) {
                const distanceMoved = Phaser.Math.Distance.Between(zombie.x, zombie.y, data.positionAtLastCheck.x, data.positionAtLastCheck.y);
                data.stuckTime = (distanceMoved < MINIMUM_PROGRESS_DISTANCE) ? data.stuckTime + CHECK_INTERVAL : 0;

                data.lastCheckTime = now;
                data.positionAtLastCheck.setTo(zombie.x, zombie.y);

                if (data.stuckTime >= STUCK_THRESHOLD) {
                    data.isPhasing = true;
                    data.stuckTime = 0;
                    zombie.setAlpha(0.5);

                    this.time.delayedCall(PHASING_DURATION, () => {
                        if (zombie && zombie.active) {
                            data.isPhasing = false;
                            zombie.setAlpha(1.0);
                            data.phasingCooldown = this.time.now + PHASING_COOLDOWN;
                        }
                    }, [], this);
                }
            }
        });
    }

    hitZombie(bullet, zombie) {
        if (!zombie || !zombie.active) return;
        bullet.destroy();
        zombie.hp -= this.weapons[this.currentWeaponIndex].damage;
        this.money += 5;
        if (zombie.hp > 0) {
            this.playZombieHitAnimation(zombie, zombie.type);
            this.tweens.add({ targets: zombie, alpha: 0.5, duration: 100, yoyo: true });
        } else {
            this.killZombie(zombie, zombie.type);
            this.score += 100;
            this.money += 100;
        }
    }

    killZombie(zombie, zombieType) {
        if (!zombie || !zombie.active) return;
        if (zombie.body) zombie.body.enable = false;

        this.totalZombiesKilled++;

        this.spawnBloodEffect(zombie.x, zombie.y);
        zombie.destroy();

        if (zombieType !== 'boss') {
            this.zombiesKilledThisRound++;
        }

        if (this.zombiesKilledThisRound >= this.zombiesToSpawnForRound) {
            this.time.delayedCall(3000, this.startNewRound, [], this);
        }
    }

    spawnBloodEffect(x, y) {
        const frames = ["blood_splash1", "blood_splash2", "blood_splash3"];
        const blood = this.add.image(x, y, frames[0]).setDepth(1).setAngle(Phaser.Math.Between(0, 360)).setScale(Phaser.Math.FloatBetween(0.8, 1.2));
        let frameIndex = 0;
        this.time.addEvent({ delay: 250, repeat: frames.length - 2, callback: () => blood.setTexture(frames[++frameIndex]) });
        this.time.delayedCall(2000, () => blood.destroy());
    }

    playZombieHitAnimation(zombie, baseKey) {
        this.tweens.add({ targets: zombie, tint: 0xff0000, duration: 100, yoyo: true });
    }

    simulateDirectionalAnimation(zombie, baseKey, vx, vy) {
        if (zombie.isTakingDamage) return;
        const now = this.time.now;
        const direction = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : (vy > 0 ? "down" : "up");
        if (now > zombie.frameToggleTime) {
            const frame = zombie.frameToggleState ? "2" : "";
            zombie.setTexture(`${baseKey}_${direction}${frame}`).setDisplaySize(zombie.originalWidth, zombie.originalHeight);
            zombie.frameToggleState = !zombie.frameToggleState;
            zombie.frameToggleTime = now + 500;
        }
    }

    // 7. Funções de Timer e Spawners
    startNewRound() {
        if (this.roundZombieSpawner) this.roundZombieSpawner.destroy();
        this.round++;
        console.log(`Iniciando Round ${this.round}`);
        if (this.round > 1) { this.zombieBaseHp += 1; this.zombieBaseSpeed += 1; }
        this.zombiesKilledThisRound = 0;
        this.zombiesSpawnedThisRound = 0;
        this.zombiesToSpawnForRound = 12 * Math.pow(2, this.round - 1);
        if (this.round > 1 && this.round % 3 === 0) this.spawnBossZombie();
        this.roundZombieSpawner = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.zombiesSpawnedThisRound < this.zombiesToSpawnForRound) {
                    this.spawnZombie();
                    this.zombiesSpawnedThisRound++;
                } else {
                    if (this.roundZombieSpawner) this.roundZombieSpawner.destroy();
                    this.roundZombieSpawner = null;
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    startHealthRegeneration() {
        if (this.regenerationTimer) this.regenerationTimer.destroy();
        this.regenerationTimer = this.time.addEvent({ delay: this.regenerationInterval, callback: this.regenerateHealth, callbackScope: this, loop: true });
    }

    // 8. Configurações de Colisões
    setupCollisions() {
        this.physics.add.collider(this.player, this.camadaObjetosColider);
        this.physics.add.collider(this.player, this.camadaLimite);
        this.physics.add.collider(this.player, this.obstacles);

        const zombieWallCollisionProcess = (zombie, wallObject) => {
            if (zombie.stuckData && zombie.stuckData.isPhasing) return false;
            if (wallObject.properties && wallObject.properties.colisao_p) return false;
            return true;
        };

        this.physics.add.collider(this.zombies, this.camadaLimite, null, zombieWallCollisionProcess, this);
        this.physics.add.collider(this.zombies, this.obstacles, null, zombieWallCollisionProcess, this);
        this.physics.add.collider(this.zombies, this.camadaObjetosColider, null, zombieWallCollisionProcess, this);

        this.physics.add.overlap(this.zombies, this.player, this.handlePlayerHit, null, this);
        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) => bullet.destroy());
        this.physics.add.collider(this.bullets, this.camadaObjetosColider, (bullet) => bullet.destroy(), (bullet, tile) => !tile.properties.colisao_p, this);
    }

    // 9. Configuração de Tiro (mouse)
    setupMouseShoot() {
        this.input.on("pointerdown", pointer => { if (pointer.leftButtonDown()) this.isShooting = true; });
        this.input.on("pointerup", () => { this.isShooting = false; });
        this.time.addEvent({ delay: 50, callback: () => { if (this.isShooting) this.shootBullet(); }, loop: true });
    }
}