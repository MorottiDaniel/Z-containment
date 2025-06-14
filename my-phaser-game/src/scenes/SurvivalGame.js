import Phaser from "phaser";

export class SurvivalGame extends Phaser.Scene {

    // 1. Construtor da classe
    constructor() {
        super("SurvivalGame");
        this.initialPlayerMaxHp = 4; // Vida máxima inicial do jogador
        this.playerMaxHp = this.initialPlayerMaxHp; // Vida máxima atual do personagem
        this.playerHp = this.playerMaxHp; // Vida inicial do personagem
        this.playerDamage = 1; // Dano base do jogador
        this.canRevive = false; // Flag para o perk de reviver
        this.revivedOnce = false; // Flag para controlar se o jogador já reviveu
        this.score = 0; // Pontuação do jogo
        this.round = 1; // Rodada atual
        this.zombieBaseSpeed = 50; // Velocidade base dos zumbis
        this.zombieBaseHp = 3; // HP base dos zumbis
        this.invulnerable = false; // Flag de invulnerabilidade do jogador
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
        this.money = 0; // Dinheiro do jogador
        this.purchasedUpgrades = new Set(); // Armazena upgrades já comprados
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }]; // Arma inicial
        this.currentWeaponIndex = 0; // Índice da arma atual equipada
        this.lastShotTime = 0; // Controla o tempo do último disparo
        this.playerBaseSpeed = 120; // Velocidade base do jogador
        this.playerCurrentSpeed = 120; // Velocidade atual do jogador

        // PROPRIEDADES PARA REGENERAÇÃO DE VIDA
        this.lastHitTime = 0; // Tempo em que o jogador tomou o último dano
        this.regenerationDelay = 5000; // 5 segundos sem tomar dano para iniciar a regeneração
        this.regenerationInterval = 500; // Regenera vida a cada 0.5 segundos
        this.regenerationAmount = 1; // Quantidade de vida regenerada por tick
        this.regenerationTimer = null; // Referência para o timer de regeneração
    }

    // 2. Pré-carregamento de assets
    preload() {
        // Carregamento de Tilemap
        this.load.image("tilesRefe", "assets/tilemaps/refere.png");
        this.load.image("tilesPeks", "assets/perks/perks.png");
        this.load.tilemapTiledJSON("map", "assets/tilemaps/mapa.json");

        // Carregamento de Imagens de Obstáculos (exemplo)
        this.load.image("obstacle", "assets/tilemaps/obstacle.png");

        // Carregamento de ícones de perks
        this.load.image('perk_forca', 'assets/perks/doubletap.png');
        this.load.image('perk_reviver', 'assets/perks/revive.png');
        this.load.image('perk_resistencia', 'assets/perks/forca.png');
        this.load.image('perk_velocidade', 'assets/perks/speed.png');
    }

    // 3. Funções de Criação (todos os creates)

    // Função principal de criação da cena
    create() {
        // Resetar vida máxima para o valor inicial ao iniciar a cena
        this.playerMaxHp = this.initialPlayerMaxHp;

        // Zerando/Inicializando outros status ao iniciar a cena
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 50;
        this.zombieBaseHp = 3;
        this.money = 0;
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
        this.currentWeaponIndex = 0;
        this.purchasedUpgrades = new Set();
        this.playerCurrentSpeed = this.playerBaseSpeed;

        // Inicialização para Regeneração de Vida
        this.lastHitTime = this.time.now;
        this.startHealthRegeneration();

        // Configuração do Tilemap
        const map = this.make.tilemap({ key: "map" });
        const tileset01 = map.addTilesetImage("Zombie_Tileset", "tilesRefe");
        const tileset02 = map.addTilesetImage("Perks", "tilesPeks");

        // Encontrar ponto de spawn do jogador
        const spawnPoint = map.findObject("playe", obj => obj.name === "Spawn");

        // Criação das camadas do mapa
        const camdaLimite = map.createLayer("Limite", tileset01, 0, 0);
        camdaLimite.setCollisionByProperty({ colisao: true });
        this.camadaLimite = camdaLimite; // Armazena para uso posterior
        const camadaChao = map.createLayer("Chao", tileset01, 0, 0);
        const camadaObjetosColider = map.createLayer("ObjetosColider", tileset01, 0, 0);
        camadaObjetosColider.setCollisionByProperty({ colisao: true });
        this.camadaObjetosColider = camadaObjetosColider; // Armazena para uso posterior
        const camadaObjetosScolider = map.createLayer("ObjetosScolider", tileset01, 0, 0);
        const camadaPerks01 = map.createLayer("Perks01", tileset02, 0, 0);
        const camadaPerks02 = map.createLayer("Perks02", tileset02, 0, 0);
        const camadaPerks03 = map.createLayer("Perks03", tileset02, 0, 0);
        const camadaPerks04 = map.createLayer("Perks01", tileset02, 0, 0); // Verifique se isso não é um erro de digitação de camadaPerks04 para camadaPerks01
        const camadaPorta01 = map.createLayer("Porta01", tileset01, 0, 0);
        const camadaPorta02 = map.createLayer("Porta02", tileset01, 0, 0);
        const camadaPorta03 = map.createLayer("Porta03", tileset01, 0, 0);
        const camadaAcessorios = map.createLayer("Acessorios", tileset01, 0, 0);


        // Criação do jogador
        if (spawnPoint) {
            this.createPlayer(spawnPoint.x, spawnPoint.y);
        } else {
            console.warn("Ponto de spawn não encontrado! Usando posição padrão.");
            this.createPlayer(100, 100);
        }

        // Configuração de inputs, grupos e obstáculos
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI(); // Cria elementos da UI
        this.createUpgradeAreas(); // Cria áreas de perks
        this.createWeaponAreas(); // Cria áreas de armas
        this.createUpgradeInput(); // Escuta inputs para perks
        this.createWeaponInput(); // Escuta inputs para armas

        // Configuração de colisões
        this.setupCollisions();

        // Configuração de tiro com mouse
        this.setupMouseShoot();

        // Inicialização de timers de jogo
        this.startZombieSpawner();
        this.startRoundTimer();

        // Listener de scroll do mouse para troca de armas
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const numWeapons = this.weapons.length;
            if (numWeapons <= 1) return;

            if (deltaY > 0) { // Scroll para baixo (próxima arma)
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % numWeapons;
            } else if (deltaY < 0) { // Scroll para cima (arma anterior)
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + numWeapons) % numWeapons;
            }
        });

        // Configuração da câmera e limites do mundo
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);

        // Modificando cursor do mouse
        this.input.setDefaultCursor('url(assets/imagens/crosshair.png) 32 32, pointer');
    }

    createPlayer(x, y) {
        this.player = this.add.rectangle(x, y, 16, 16, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        // A vida do jogador já é resetada no método create() principal
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
            { x: 800, y: 1000 },
            { x: 1200, y: 1100 },
            { x: 1600, y: 950 },
            { x: 1000, y: 1400 },
        ];
        positions.forEach((pos) => {
            const obs = this.obstacles.create(pos.x, pos.y, "obstacle");
            obs.setScale(0.5).refreshBody();
        });
    }

    createUI() {
        this.healthBarBg = this.add
            .rectangle(20, 20, 104, 14, 0x000000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.healthBar = this.add
            .rectangle(22, 22, 100, 10, 0xff0000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.scoreText = this.add
            .text(20, 40, "Pontos: 0", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.roundText = this.add
            .text(20, 60, "Round: 1", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.moneyText = this.add
            .text(20, 80, 'Dinheiro: 0', { fontSize: '16px', fill: '#ffffff' })
            .setScrollFactor(0);
        this.weaponText = this.add
            .text(20, 100, 'Arma: Pistol', { fontSize: '16px', fill: '#ffffff' })
            .setScrollFactor(0);

        this.perkIcons = [];
        this.perkIconStartX = 20;
        this.perkIconStartY = this.scale.height - 40;

        const slotWidth = 140;
        const slotHeight = 40;
        const slotMargin = 10;
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        this.weaponSlot2Bg = this.add
            .rectangle(screenWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot2Text = this.add
            .text(this.weaponSlot2Bg.x - (slotWidth / 2), this.weaponSlot2Bg.y - (slotHeight / 2), '2: Empty', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);

        this.weaponSlot1Bg = this.add
            .rectangle(screenWidth - slotMargin - slotWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot1Text = this.add
            .text(this.weaponSlot1Bg.x - (slotWidth / 2), this.weaponSlot1Bg.y - (slotHeight / 2), '1: Pistol', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);
    }

    createUpgradeAreas() {
        this.upgradeAreas = [];
        this.upgradeText = this.add.text(0, 0, '', {
            fontSize: '18px',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(1).setVisible(false);

        const areaData = [
            { x: 500, y: 400, cost: 2000, upgrade: 'forca' },
            { x: 500, y: 500, cost: 1500, upgrade: 'reviver' },
            { x: 500, y: 600, cost: 2500, upgrade: 'resistencia' },
            { x: 500, y: 700, cost: 1000, upgrade: 'velocidade' }
        ];

        areaData.forEach((data) => {
            const area = this.add.rectangle(data.x, data.y, 100, 100, 0xffffff, 0.2);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.upgradeType = data.upgrade;
            area.upgradeName = {
                forca: 'double hit',
                reviver: 'quick resurrect',
                resistencia: 'juggermax',
                velocidade: 'speed chug'
            }[data.upgrade];
            area.message = `pressione E para ${area.upgradeName}, ${area.cost}`;
            this.upgradeAreas.push(area);
        });
        this.currentUpgradeArea = null;
    }

    createWeaponAreas() {
        this.weaponAreas = [];
        const weaponData = [
            { x: 700, y: 600, cost: 3000, weapon: 'minigun', color: 0xff0000 },
            { x: 600, y: 600, cost: 2500, weapon: 'shotgun', color: 0x00ff00 },
            { x: 900, y: 600, cost: 2000, weapon: 'rifle', color: 0x0000ff },
            { x: 1000, y: 600, cost: 1500, weapon: 'sniper', color: 0x800080 }
        ];
        weaponData.forEach((data) => {
            const area = this.add.rectangle(data.x, data.y, 100, 100, 0x00ff00, 0.2);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.weaponType = data.weapon;
            area.icon = this.add.rectangle(data.x, data.y, 64, 64, data.color).setAlpha(0.8);
            area.message = `pressione R para ${data.weapon}, ${data.cost}`;
            this.weaponAreas.push(area);
        });
        this.currentWeaponArea = null;
    }

    createUpgradeInput() {
        this.input.keyboard.on('keydown-E', () => {
            if (this.currentUpgradeArea) {
                const area = this.currentUpgradeArea;
                if (this.purchasedUpgrades.has(area.upgradeType)) {
                    this.upgradeText.setText('Upgrade já comprado');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    return;
                }
                if (this.money >= area.cost) {
                    this.money -= area.cost;
                    this.purchasedUpgrades.add(area.upgradeType);
                    switch (area.upgradeType) {
                        case 'forca':
                            this.playerDamage = 2;
                            this.weapons.forEach(weapon => weapon.damage *= 2);
                            break;
                        case 'reviver':
                            this.canRevive = true;
                            break;
                        case 'resistencia':
                            this.playerMaxHp += 2;
                            this.playerHp += 2;
                            break;
                        case 'velocidade':
                            this.playerCurrentSpeed = this.playerBaseSpeed * 1.3;
                            break;
                    }
                    this.addPerkIcon(area.upgradeType);
                    this.upgradeText.setText(`Upgrade de ${area.upgradeType} comprado!`);
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                } else {
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                }
            }
        });
    }

    createWeaponInput() {
        this.input.keyboard.on('keydown-R', () => {
            if (this.currentWeaponArea) {
                const area = this.currentWeaponArea;
                if (this.money >= area.cost) {
                    const weaponStats = {
                        minigun: { type: 'minigun', damage: 1.5, fireRate: 100, spread: 5, bulletSpeed: 600 },
                        shotgun: { type: 'shotgun', damage: 2, fireRate: 800, spread: 10, bulletSpeed: 400 },
                        rifle: { type: 'rifle', damage: 1.2, fireRate: 200, spread: 2, bulletSpeed: 700 },
                        sniper: { type: 'sniper', damage: 4, fireRate: 1500, spread: 0, bulletSpeed: 1000 }
                    }[area.weaponType];
                    if (this.weapons.length < 2) {
                        this.money -= area.cost;
                        this.weapons.push(weaponStats);
                        this.currentWeaponIndex = this.weapons.length - 1;
                        this.upgradeText.setText(`Arma ${area.weaponType} comprada e equipada!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    } else {
                        const oldWeaponType = this.weapons[this.currentWeaponIndex].type;
                        this.money -= area.cost;
                        this.weapons[this.currentWeaponIndex] = weaponStats;
                        this.upgradeText.setText(`Arma ${area.weaponType} substituiu ${oldWeaponType} no slot atual!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    }
                } else {
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                }
            }
        });
    }

    // 4. Funções relacionadas ao Player (movimento, dano, tiro, game over, regeneração, perks)

    handlePlayerMovement() {
        const speed = this.playerCurrentSpeed;
        const body = this.player.body;
        body.setVelocity(0);
        if (this.cursors.left.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown) body.setVelocityX(speed);
        if (this.cursors.up.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable) return;
        this.playerHp -= 1;
        this.invulnerable = true;
        this.lastHitTime = this.time.now; // Atualiza o tempo do último dano

        this.tweens.add({
            targets: player,
            alpha: 0.5,
            duration: 100,
            repeat: 5,
            yoyo: true,
            onComplete: () => { this.player.setAlpha(1); },
        });
        this.time.delayedCall(this.invulnerableTime, () => { this.invulnerable = false; });
        if (this.playerHp <= 0) { this.gameOver(); }
    }

    shootBullet() {
    const currentTime = this.time.now;
    const weapon = this.weapons[this.currentWeaponIndex];

    // Verifica tempo do último disparo (fireRate)
    if (currentTime < this.lastShotTime + weapon.fireRate) {
        return;
    }
    this.lastShotTime = currentTime;

    const pointer = this.input.activePointer;
    const targetX = pointer.worldX;
    const targetY = pointer.worldY;

    // 🔊 Sons de disparo por tipo de arma
    const soundKey = {
        pistol: 'pistol_shot',
        minigun: 'minigun_shot',
        shotgun: 'shotgun_shot',
        rifle: 'rifle_shot',
        sniper: 'sniper_shot'
    }[weapon.type];

    if (soundKey) {
        this.sound.play(soundKey, { volume: 0.2 });
    }

    // 🔫 Se for shotgun, gera vários projéteis
    if (weapon.type === 'shotgun') {
        const numPellets = 5;
        for (let i = 0; i < numPellets; i++) {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
            const angleVariation = (Math.random() - 0.5) * (weapon.spread / 100);
            const finalAngle = angle + angleVariation;

            const bullet = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0xffff00);
            this.physics.add.existing(bullet);
            this.bullets.add(bullet);

            bullet.body.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;

            this.physics.velocityFromRotation(finalAngle, weapon.bulletSpeed, bullet.body.velocity);

            this.time.delayedCall(1000, () => bullet.destroy());
        }
    } else {
        // 🔫 Para armas normais
        const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xffff00);
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);

        bullet.body.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
        this.physics.velocityFromRotation(angle, weapon.bulletSpeed, bullet.body.velocity);

        this.time.delayedCall(2000, () => bullet.destroy());
    }
}


    gameOver() {
        if (this.canRevive && !this.revivedOnce) {
            this.revivedOnce = true;
            this.playerMaxHp = this.initialPlayerMaxHp; // Reseta a vida máxima para o valor base ao reviver
            this.playerHp = this.playerMaxHp; // Restaura a vida para a nova vida máxima
            this.money = Math.floor(this.money * 0.5); // Perde metade do dinheiro

            // Limpa perks visuais e reseta armas/upgrades
            this.perkIcons.forEach(icon => icon.destroy());
            this.perkIcons = [];
            this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
            this.currentWeaponIndex = 0;
            this.purchasedUpgrades = new Set();
            this.playerCurrentSpeed = this.playerBaseSpeed;

            // Reseta o tempo do último dano para que a regeneração possa começar após o delay
            this.lastHitTime = this.time.now;

            this.upgradeText.setText('Você reviveu!');
            this.upgradeText.setPosition(this.player.x - 60, this.player.y - 40);
            this.upgradeText.setVisible(true);
            this.time.delayedCall(2000, () => { this.upgradeText.setVisible(false); });
            return;
        }
        this.scene.start("GameOver");
    }

    regenerateHealth() {
        if (this.playerHp < this.playerMaxHp && (this.time.now - this.lastHitTime >= this.regenerationDelay)) {
            this.playerHp = Math.min(this.playerHp + this.regenerationAmount, this.playerMaxHp);
            // console.log("Vida regenerada para: " + this.playerHp); // Para depuração
        }
    }

    addPerkIcon(perkKey) {
        const iconKey = {
            forca: 'perk_forca',
            reviver: 'perk_reviver',
            resistencia: 'perk_resistencia',
            velocidade: 'perk_velocidade'
        }[perkKey];
        if (!iconKey) return;

        const iconX = this.perkIconStartX + this.perkIcons.length * 40;
        const icon = this.add.image(iconX, this.perkIconStartY, iconKey)
            .setScrollFactor(0)
            .setDisplaySize(32, 32);
        this.perkIcons.push(icon);
    }


    // 5. Funções de Atualização (todos os updates)

    // Função principal de atualização da cena
    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI(); // Atualiza elementos da UI
        this.checkUpgradeAreaOverlap(); // Verifica sobreposição com áreas de perk
        this.checkWeaponAreaOverlap(); // Verifica sobreposição com áreas de arma
    }

    updateUI() {
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;
        this.scoreText.setText("Pontos: " + this.score);
        this.roundText.setText("Round: " + this.round);
        this.moneyText.setText("Dinheiro: " + this.money);
        this.weaponText.setText(`Arma: ${this.weapons[this.currentWeaponIndex].type}`);

        const weapon1 = this.weapons[0];
        const weapon2 = this.weapons[1];
        this.weaponSlot1Text.setText(`1: ${weapon1 ? weapon1.type.charAt(0).toUpperCase() + weapon1.type.slice(1) : 'Empty'}`);
        this.weaponSlot2Text.setText(`2: ${weapon2 ? weapon2.type.charAt(0).toUpperCase() + weapon2.type.slice(1) : 'Empty'}`);

        const activeColor = 0x00ff00;
        const inactiveColor = 0x333333;
        this.weaponSlot1Bg.setFillStyle(this.currentWeaponIndex === 0 ? activeColor : inactiveColor);
        this.weaponSlot2Bg.setFillStyle(this.currentWeaponIndex === 1 ? activeColor : inactiveColor);
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate((zombie) => {
            if (zombie.type === "smart") {
                const angleToPlayer = Phaser.Math.Angle.Between(zombie.x, zombie.y, this.player.x, this.player.y);
                const distanceToPlayer = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);
                const ray = new Phaser.Geom.Line(zombie.x, zombie.y, zombie.x + Math.cos(angleToPlayer) * distanceToPlayer, zombie.y + Math.sin(angleToPlayer) * distanceToPlayer);
                let hit = false;
                this.obstacles.children.iterate((obstacle) => {
                    if (Phaser.Geom.Intersects.LineToRectangle(ray, obstacle.getBounds())) {
                        hit = true;
                        return false;
                    }
                });
                if (hit) {
                    const perpendicularAngle = angleToPlayer + Math.PI / 2;
                    this.physics.velocityFromRotation(perpendicularAngle, zombie.speed, zombie.body.velocity);
                } else {
                    this.physics.moveToObject(zombie, this.player, zombie.speed);
                }
            } else {
                this.physics.moveToObject(zombie, this.player, zombie.speed);
            }
            if (zombie.type === "tank") {
                const vx = zombie.body.velocity.x;
                const vy = zombie.body.velocity.y;
                this.simulateDirectionalAnimation(zombie, 'tank', vx, vy);
            }
        });
    }

    checkUpgradeAreaOverlap() {
        let inArea = false;
        for (const area of this.upgradeAreas) {
            const boundsA = this.player.getBounds();
            const boundsB = area.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB)) {
                inArea = true;
                this.currentUpgradeArea = area;
                this.upgradeText.setText(area.message);
                this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                this.upgradeText.setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentUpgradeArea = null;
            if (!this.currentWeaponArea || !this.upgradeText.visible) {
                this.upgradeText.setVisible(false);
            }
        }
    }

    checkWeaponAreaOverlap() {
        let inArea = false;
        for (const area of this.weaponAreas) {
            const boundsA = this.player.getBounds();
            const boundsB = area.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB)) {
                inArea = true;
                this.currentWeaponArea = area;
                this.upgradeText.setText(area.message);
                this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                this.upgradeText.setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentWeaponArea = null;
            if (!this.currentUpgradeArea) {
                this.upgradeText.setVisible(false);
            }
        }
    }


    // 6. Funções relacionadas a Zumbis (spawn, hit, animação)

    spawnZombie() {
        const types = ["fast", "tank", "smart"];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        let zombieSpeed = this.zombieBaseSpeed;
        let zombieHp = this.zombieBaseHp;
        let zombie;

        // Define a posição do zumbi na borda do mapa
        const edge = Phaser.Math.Between(0, 3);
        let x, y;
        if (edge === 0) { x = Phaser.Math.Between(0, this.physics.world.bounds.width); y = -50; }
        else if (edge === 1) { x = this.physics.world.bounds.width + 50; y = Phaser.Math.Between(0, this.physics.world.bounds.height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, this.physics.world.bounds.width); y = this.physics.world.bounds.height + 50; }
        else { x = -50; y = Phaser.Math.Between(0, this.physics.world.bounds.height); }

        if (type === "fast") {
            zombieSpeed *= 1.5;
            zombieHp = 1;
            const color = 0xffa500;
            zombie = this.add.rectangle(x, y, 16, 16, color);
            this.physics.add.existing(zombie);
        } else if (type === "tank") {
            zombieSpeed *= 0.4;
            zombieHp = 8;
            zombie = this.physics.add.sprite(x, y, 'tank_down');
            zombie.setDisplaySize(32, 32);
            zombie.frameToggleTime = 0;
            zombie.frameToggleState = false;
        } else if (type === "smart") {
            zombieSpeed *= 1.2;
            zombieHp = 3;
            const color = 0x00ffff;
            zombie = this.add.rectangle(x, y, 16, 16, color);
            this.physics.add.existing(zombie);
        } else {
            zombie = this.add.rectangle(x, y, 16, 16, 0xff0000);
            this.physics.add.existing(zombie);
        }
        zombie.hp = zombieHp;
        zombie.speed = zombieSpeed;
        zombie.type = type;
        this.zombies.add(zombie);
    }

    spawnBossZombie() {
        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;

        const side = Phaser.Math.Between(0, 3);
        let x, y;
        switch (side) {
            case 0: x = Phaser.Math.Between(0, worldWidth); y = -margin; break;
            case 1: x = Phaser.Math.Between(0, worldWidth); y = worldHeight + margin; break;
            case 2: x = -margin; y = Phaser.Math.Between(0, worldHeight); break;
            case 3: x = worldWidth + margin; y = Phaser.Math.Between(0, worldHeight); break;
        }

        const boss = this.add.rectangle(this.physics.world.bounds.width / 2, this.physics.world.bounds.height / 2, 32, 32, 0x8b0000);
        this.physics.add.existing(boss);
        this.zombies.add(boss);
        boss.body.setCollideWorldBounds(true);

        boss.speed = this.zombieBaseSpeed * 0.8;
        boss.hp = this.zombieBaseHp * 5;
        boss.type = "smart";
        boss.setScale(2);
    }

    hitZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp -= this.weapons[this.currentWeaponIndex].damage;
        this.money += 10; // Valor de dinheiro ganho por zumbi, ajuste como desejar

        this.tweens.add({
            targets: zombie,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
        });
        if (zombie.hp <= 0) {
            zombie.destroy();
            this.score += 100;
            this.money += 100;
        }
    }

    simulateDirectionalAnimation(zombie, baseKey, vx, vy) {
        const now = this.time.now;
        if (Math.abs(vx) > Math.abs(vy)) {
            if (vx > 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_right2` : `${baseKey}_right`;
                    zombie.setTexture(next);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            } else if (vx < 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_left2` : `${baseKey}_left`;
                    zombie.setTexture(next);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            }
        } else {
            if (vy > 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_down2` : `${baseKey}_down`;
                    zombie.setTexture(next);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            } else if (vy < 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_up2` : `${baseKey}_up`;
                    zombie.setTexture(next);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            }
        }
    }

    // 7. Funções de Timer e Spawners

    startZombieSpawner() {
        this.zombieTimer = this.time.addEvent({
            delay: 5000,
            callback: () => {
                const zombiesInWave = Phaser.Math.Between(3, 6);
                for (let i = 0; i < zombiesInWave; i++) {
                    this.spawnZombie();
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    startRoundTimer() {
        this.roundTimer = this.time.addEvent({
            delay: 30000, // 30 segundos por round
            callback: () => {
                this.round++;
                this.zombieBaseHp += 1;
                this.zombieBaseSpeed += 10;
                if (this.round % 3 === 0) {
                    this.spawnBossZombie();
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    startHealthRegeneration() {
        if (this.regenerationTimer) {
            this.regenerationTimer.destroy();
        }
        this.regenerationTimer = this.time.addEvent({
            delay: this.regenerationInterval,
            callback: this.regenerateHealth,
            callbackScope: this,
            loop: true
        });
    }

    // 8. Configurações de Colisões

    setupCollisions() {
        this.physics.add.collider(this.player, this.camadaObjetosColider);
        this.physics.add.collider(this.player, this.camadaLimite);

        this.physics.add.overlap(this.zombies, this.player, this.handlePlayerHit, null, this);
        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) => bullet.destroy());
    }

    // 9. Configuração de Tiro (mouse)

    setupMouseShoot() {
        this.input.on("pointerdown", () => { this.shootBullet(); });
    }
}