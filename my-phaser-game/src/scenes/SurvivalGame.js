import Phaser from "phaser";

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super("SurvivalGame");
        this.playerMaxHp = 5; // Máximo de hits (vidas)
        this.playerHp = this.playerMaxHp; // Vida inicial do personagem
        this.playerDamage = 1;
        this.canRevive = false;
        this.revivedOnce = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 50; // Velocidade base dos zumbis
        this.zombieBaseHp = 3; // HP base dos zumbis
        this.invulnerable = false; // Flag de invulnerabilidade
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
        this.money = 0; // Quant. de dinheiro no começo do game
        this.purchasedUpgrades = new Set(); // Armazena upgrades já comprados
        // Arma inicial: apenas pistola, sem atributos de munição
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
        this.currentWeaponIndex = 0; // Índice da arma atual
        this.lastShotTime = 0; // Controla o tempo do último disparo
    }

    preload() {
        // Carregamento de Tilemap
        this.load.image("tilesRefe", "assets/tilemaps/refere.png");
        this.load.image("tilesPeks", "assets/perks/perks.png");
        this.load.tilemapTiledJSON("map", "assets/tilemaps/mapa.json");

        // Carregamento de Imagens de Obstáculos (se houver)
        this.load.image("obstacle", "assets/tilemaps/obstacle.png"); // Exemplo, ajuste o caminho

        // Carregamento de ícones de perks
        this.load.image('perk_forca', 'assets/perks/doubletap.png');
        this.load.image('perk_reviver', 'assets/perks/revive.png');
        this.load.image('perk_resistencia', 'assets/perks/forca.png');
        this.load.image('perk_recarga', 'assets/perks/speed.png');
        // Não carrega imagens para armas, pois não estão disponíveis
    }

    create() {
        // Zerando status ao iniciar a cena (incluindo o reset da arma para pistola)
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 50;
        this.zombieBaseHp = 3;
        this.money = 0;
        // Resetar as armas para a pistola inicial SEMPRE ao iniciar a cena
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
        this.currentWeaponIndex = 0;
        this.purchasedUpgrades = new Set(); // Garante que upgrades também sejam resetados

        const map = this.make.tilemap({ key: "map" });
        const tileset01 = map.addTilesetImage("Zombie_Tileset", "tilesRefe");
        const tileset02 = map.addTilesetImage("Perks", "tilesPeks");

        const spawnPoint = map.findObject("playe", obj => obj.name === "Spawn");
        const camdaLimite = map.createLayer("Limite", tileset01, 0, 0);
        camdaLimite.setCollisionByProperty({ colisao: true });
        this.camadaLimite = camdaLimite;
        const camadaChao = map.createLayer("Chao", tileset01, 0, 0);
        const camadaObjetosColider = map.createLayer("ObjetosColider", tileset01, 0, 0);

        camadaObjetosColider.setCollisionByProperty({ colisao: true });
        const camadaObjetosScolider = map.createLayer("ObjetosScolider", tileset01, 0, 0);
        const camadaPerks01 = map.createLayer("Perks01", tileset02, 0, 0);
        const camadaPerks02 = map.createLayer("Perks02", tileset02, 0, 0);
        const camadaPerks03 = map.createLayer("Perks03", tileset02, 0, 0);
        const camadaPerks04 = map.createLayer("Perks01", tileset02, 0, 0); // Correção de typo se for o caso, estava Perks04
        const camadaPorta01 = map.createLayer("Porta01", tileset01, 0, 0);
        const camadaPorta02 = map.createLayer("Porta02", tileset01, 0, 0);
        const camadaPorta03 = map.createLayer("Porta03", tileset01, 0, 0);
        const camadaAcessorios = map.createLayer("Acessorios", tileset01, 0, 0);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        if (spawnPoint) {
            this.createPlayer(spawnPoint.x, spawnPoint.y);
        } else {
            // Caso não encontre o ponto de spawn, cria o jogador em uma posição padrão
            console.warn("Ponto de spawn não encontrado! Usando posição padrão.");
            this.createPlayer(100, 100);
        }
        this.camadaObjetosColider = camadaObjetosColider;
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI();
        this.setupCollisions();
        this.setupMouseShoot();
        this.startZombieSpawner();
        this.startRoundTimer();
        this.createUpgradeAreas();
        this.createUpgradeInput();
        this.createWeaponAreas();
        this.createWeaponInput();

        // NOVO: Listener de scroll do mouse para troca de armas
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const numWeapons = this.weapons.length;

            if (numWeapons <= 1) { // Se só tiver uma arma ou nenhuma, não faz nada
                return;
            }

            if (deltaY > 0) { // Scroll para baixo (próxima arma)
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % numWeapons;
            } else if (deltaY < 0) { // Scroll para cima (arma anterior)
                // Garante que o resultado seja sempre positivo
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + numWeapons) % numWeapons;
            }
        });

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1);

        // Modificando cursor
        this.input.setDefaultCursor('url(assets/imagens/crosshair.png) 32 32, pointer');
    }

    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI();
        this.checkUpgradeAreaOverlap();
        this.checkWeaponAreaOverlap();
        // REMOVIDO: Nenhuma chamada para checkAmmoAreaOverlap()
    }

    createPlayer(x, y) {
        this.player = this.add.rectangle(x, y, 16, 16, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.playerHp = this.playerMaxHp; // Reseta a vida do personagem
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D"); // Removidas as teclas 1 e 2 daqui, agora só pelo scroll
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
        // REMOVIDO: Texto para exibir a munição (this.ammoText)

        this.perkIcons = []; // Armazena os ícones ativos
        this.perkIconStartX = 20; // posição inicial X (canto inferior esquerdo)
        this.perkIconStartY = this.scale.height - 40; // Y fixo

        // NOVOS ELEMENTOS PARA SLOTS DE ARMAS (já existentes e mantidos)
        const slotWidth = 140;
        const slotHeight = 40;
        const slotMargin = 10;
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        // Slot 2 (à direita)
        this.weaponSlot2Bg = this.add
            .rectangle(screenWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot2Text = this.add
            .text(this.weaponSlot2Bg.x - (slotWidth / 2), this.weaponSlot2Bg.y - (slotHeight / 2), '2: Empty', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);

        // Slot 1 (à esquerda do Slot 2)
        this.weaponSlot1Bg = this.add
            .rectangle(screenWidth - slotMargin - slotWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot1Text = this.add
            .text(this.weaponSlot1Bg.x - (slotWidth / 2), this.weaponSlot1Bg.y - (slotHeight / 2), '1: Pistol', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);
    }

    updateUI() {
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;
        this.scoreText.setText("Pontos: " + this.score);
        this.roundText.setText("Round: " + this.round);
        this.moneyText.setText("Dinheiro: " + this.money);
        this.weaponText.setText(`Arma: ${this.weapons[this.currentWeaponIndex].type}`);

        // REMOVIDO: Atualização do texto da munição (this.ammoText)

        // ATUALIZAÇÃO DOS SLOTS DE ARMAS (já existentes e mantidos)
        const weapon1 = this.weapons[0];
        const weapon2 = this.weapons[1];

        this.weaponSlot1Text.setText(`1: ${weapon1 ? weapon1.type.charAt(0).toUpperCase() + weapon1.type.slice(1) : 'Empty'}`);
        this.weaponSlot2Text.setText(`2: ${weapon2 ? weapon2.type.charAt(0).toUpperCase() + weapon2.type.slice(1) : 'Empty'}`);

        // Destaca a arma ativa
        const activeColor = 0x00ff00; // Verde para arma ativa
        const inactiveColor = 0x333333; // Cinza escuro para arma inativa

        this.weaponSlot1Bg.setFillStyle(this.currentWeaponIndex === 0 ? activeColor : inactiveColor);
        this.weaponSlot2Bg.setFillStyle(this.currentWeaponIndex === 1 ? activeColor : inactiveColor);
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.camadaObjetosColider);
        this.physics.add.collider(this.player, this.camadaLimite);

        this.physics.add.overlap(
            this.zombies,
            this.player,
            this.handlePlayerHit,
            null,
            this
        );
        this.physics.add.overlap(
            this.bullets,
            this.zombies,
            this.hitZombie,
            null,
            this
        );
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) =>
            bullet.destroy()
        );
    }

    setupMouseShoot() {
        this.input.on("pointerdown", () => {
            this.shootBullet();
        });
    }

    handlePlayerMovement() {
        const speed = 50;
        const body = this.player.body;
        body.setVelocity(0);

        if (this.cursors.left.isDown || this.keys.A.isDown)
            body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown)
            body.setVelocityX(speed);

        if (this.cursors.up.isDown || this.keys.W.isDown)
            body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown)
            body.setVelocityY(speed);

        // Teclas 1 e 2 foram removidas daqui para a troca de armas (agora usa scroll)
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate((zombie) => {
            if (zombie.type === "smart") {
                // Pathfinding simples com raycasting
                const angleToPlayer = Phaser.Math.Angle.Between(
                    zombie.x,
                    zombie.y,
                    this.player.x,
                    this.player.y
                );
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    zombie.x,
                    zombie.y,
                    this.player.x,
                    this.player.y
                );

                // Cria um raycast para verificar obstáculos
                const ray = new Phaser.Geom.Line(
                    zombie.x,
                    zombie.y,
                    zombie.x + Math.cos(angleToPlayer) * distanceToPlayer,
                    zombie.y + Math.sin(angleToPlayer) * distanceToPlayer
                );
                let hit = false;
                this.obstacles.children.iterate((obstacle) => {
                    if (
                        Phaser.Geom.Intersects.LineToRectangle(
                            ray,
                            obstacle.getBounds()
                        )
                    ) {
                        hit = true;
                        return false; // Para a iteração
                    }
                });

                if (hit) {
                    // Desvia movendo-se em uma direção perpendicular
                    const perpendicularAngle = angleToPlayer + Math.PI / 2;
                    this.physics.velocityFromRotation(
                        perpendicularAngle,
                        zombie.speed,
                        zombie.body.velocity
                    );
                } else {
                    this.physics.moveToObject(
                        zombie,
                        this.player,
                        zombie.speed
                    );
                }
            } else {
                this.physics.moveToObject(zombie, this.player, zombie.speed);
            }
        });
    }

    shootBullet() {
        const currentTime = this.time.now;
        const weapon = this.weapons[this.currentWeaponIndex];

        // REMOVIDO: Verificação de munição (if (weapon.type !== 'pistol' && weapon.currentAmmo <= 0))

        if (currentTime < this.lastShotTime + weapon.fireRate) {
            return;
        }

        this.lastShotTime = currentTime;

        // REMOVIDO: Decremento de munição (if (weapon.type !== 'pistol'))

        const pointer = this.input.activePointer;
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;

        if (weapon.type === 'shotgun') {
            // Dispara múltiplos projéteis para a shotgun
            const numPellets = 5;
            for (let i = 0; i < numPellets; i++) {
                const angle = Phaser.Math.Angle.Between(
                    this.player.x,
                    this.player.y,
                    targetX,
                    targetY
                );
                // Adiciona um pequeno desvio ao ângulo para simular o "spread"
                const angleVariation = (Math.random() - 0.5) * (weapon.spread / 100); // weapon.spread controla a dispersão
                const finalAngle = angle + angleVariation;

                const bullet = this.add.rectangle(
                    this.player.x,
                    this.player.y,
                    8, // Tamanho menor para os projéteis da shotgun
                    3,
                    0xffff00
                );
                this.physics.add.existing(bullet);
                this.bullets.add(bullet);
                bullet.body.setCollideWorldBounds(true);
                bullet.body.onWorldBounds = true;

                this.physics.velocityFromRotation(finalAngle, weapon.bulletSpeed, bullet.body.velocity);
                this.time.delayedCall(1000, () => bullet.destroy());
            }
        } else {
            // Outras armas disparam um único projétil
            const bullet = this.add.rectangle(
                this.player.x,
                this.player.y,
                10,
                5,
                0xffff00
            );
            this.physics.add.existing(bullet);
            this.bullets.add(bullet);
            bullet.body.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;

            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                targetX,
                targetY
            );
            this.physics.velocityFromRotation(angle, weapon.bulletSpeed, bullet.body.velocity);
            this.time.delayedCall(2000, () => bullet.destroy());
        }
    }

    startZombieSpawner() {
        this.zombieTimer = this.time.addEvent({
            delay: 5000, // Intervalo maior para ondas
            callback: () => {
                const zombiesInWave = Phaser.Math.Between(3, 6); // 3 a 6 zumbis por onda
                for (let i = 0; i < zombiesInWave; i++) {
                    this.spawnZombie();
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    spawnZombie() {
        let x, y;
        // Garante que o zumbi nasça fora da tela
        const edge = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left

        if (edge === 0) { // top
            x = Phaser.Math.Between(0, this.physics.world.bounds.width);
            y = -50;
        } else if (edge === 1) { // right
            x = this.physics.world.bounds.width + 50;
            y = Phaser.Math.Between(0, this.physics.world.bounds.height);
        } else if (edge === 2) { // bottom
            x = Phaser.Math.Between(0, this.physics.world.bounds.width);
            y = this.physics.world.bounds.height + 50;
        } else { // left
            x = -50;
            y = Phaser.Math.Between(0, this.physics.world.bounds.height);
        }

        const zombie = this.add.rectangle(x, y, 16, 16, 0xff00ff);
        this.physics.add.existing(zombie);
        this.zombies.add(zombie);
        zombie.body.setCollideWorldBounds(true);

        zombie.speed = this.zombieBaseSpeed + Phaser.Math.Between(-5, 5); // Variação de velocidade
        zombie.hp = this.zombieBaseHp;
        zombie.type = Phaser.Math.Between(0, 1) === 0 ? "basic" : "smart"; // Tipo de zumbi (básico ou inteligente)
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable) return; // Se invulnerável, não leva dano

        this.playerHp -= 1;
        this.invulnerable = true;

        // Efeito visual de piscar
        this.tweens.add({
            targets: player,
            alpha: 0.5,
            duration: 100,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                this.player.setAlpha(1);
            },
        });

        this.time.delayedCall(this.invulnerableTime, () => {
            this.invulnerable = false;
        });

        if (this.playerHp <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        if (this.canRevive && !this.revivedOnce) {
            this.revivedOnce = true;
            this.playerHp = this.playerMaxHp; // Restaura a vida
            this.money = Math.floor(this.money * 0.5); // Perde metade do dinheiro
            this.zombies.clear(true, true); // Remove todos os zumbis

            // Limpa perks visuais e reseta armas
            this.perkIcons.forEach(icon => icon.destroy());
            this.perkIcons = [];
            this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
            this.currentWeaponIndex = 0;

            this.upgradeText.setText('Você reviveu!');
            this.upgradeText.setPosition(this.player.x - 60, this.player.y - 40);
            this.upgradeText.setVisible(true);
            this.time.delayedCall(2000, () => {
                this.upgradeText.setVisible(false);
            });

            return;
        }
        // Transiciona para a cena de Game Over. Quando SurvivalGame for reiniciada,
        // o método create() garantirá o reset das armas.
        this.scene.start("GameOver");
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
        }
    }

    spawnBossZombie() {
        const boss = this.add.rectangle(
            this.physics.world.bounds.width / 2,
            this.physics.world.bounds.height / 2,
            32,
            32,
            0x8b0000 // Vermelho escuro para o chefão
        );
        this.physics.add.existing(boss);
        this.zombies.add(boss);
        boss.body.setCollideWorldBounds(true);

        boss.speed = this.zombieBaseSpeed * 0.8; // Chefão é mais lento
        boss.hp = this.zombieBaseHp * 5; // Chefão tem mais vida
        boss.type = "smart"; // Chefão é inteligente
        boss.setScale(2); // Chefão é maior
    }

    startRoundTimer() {
        this.roundTimer = this.time.addEvent({
            delay: 30000, // 30 segundos por round
            callback: () => {
                this.round++;
                this.zombieBaseHp += 1;
                this.zombieBaseSpeed += 10;
                if (this.round % 3 === 0) {
                    this.spawnBossZombie(); // Spawna chefão a cada 3 rounds
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    createUpgradeAreas() {
        this.upgradeAreas = [];

        // Texto flutuante sobre o jogador
        this.upgradeText = this.add.text(0, 0, '', {
            fontSize: '18px',
            fill: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(1).setVisible(false);

        // Áreas e custos
        const areaData = [
            { x: 500, y: 500, cost: 2000, upgrade: 'forca' },
            { x: 1500, y: 500, cost: 1500, upgrade: 'reviver' },
            { x: 500, y: 1500, cost: 2500, upgrade: 'resistencia' },
            { x: 1500, y: 1500, cost: 3000, upgrade: 'recarga' } // ainda não implementado
        ];

        areaData.forEach((data, index) => {
            const area = this.add.rectangle(data.x, data.y, 100, 100, 0xffffff, 0.2);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.upgradeType = data.upgrade;
            area.upgradeName = {
                forca: 'double hit',
                reviver: 'quick resurrect',
                resistencia: 'juggermax',
                recarga: 'fast chug'
            }[data.upgrade];
            area.message = `pressione E para ${area.upgradeName}, ${area.cost}`;
            this.upgradeAreas.push(area);
        });

        this.currentUpgradeArea = null;
    }

    createWeaponAreas() {
        this.weaponAreas = [];

        // Áreas e custos para armas (incluindo Sniper)
        const weaponData = [
            { x: 700, y: 600, cost: 3000, weapon: 'minigun', color: 0xff0000 },
            { x: 800, y: 600, cost: 2000, weapon: 'shotgun', color: 0x00ff00 },
            { x: 900, y: 600, cost: 2500, weapon: 'rifle', color: 0x0000ff },
            { x: 1000, y: 600, cost: 4000, weapon: 'sniper', color: 0x800080 } // Sniper
        ];

        weaponData.forEach((data) => {
            const area = this.add.rectangle(data.x, data.y, 100, 100, 0x00ff00, 0.2);
            this.physics.add.existing(area, true);
            area.cost = data.cost;
            area.weaponType = data.weapon;
            // Usa retângulo colorido como placeholder para o ícone
            area.icon = this.add.rectangle(data.x, data.y, 64, 64, data.color).setAlpha(0.8);
            area.message = `pressione F para ${data.weapon}, ${data.cost}`;
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
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                    return;
                }

                if (this.money >= area.cost) {
                    this.money -= area.cost;
                    this.purchasedUpgrades.add(area.upgradeType);

                    switch (area.upgradeType) {
                        case 'forca':
                            this.playerDamage = 2;
                            this.weapons.forEach(weapon => weapon.damage *= 2); // Dobra o dano de todas as armas
                            break;
                        case 'reviver':
                            this.canRevive = true;
                            break;
                        case 'resistencia':
                            this.playerMaxHp += 2;
                            this.playerHp += 2;
                            break;
                    }

                    this.addPerkIcon(area.upgradeType);

                    this.upgradeText.setText(`Upgrade de ${area.upgradeType} comprado!`);
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                } else {
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                }
            }
        });
    }

    createWeaponInput() {
        this.input.keyboard.on('keydown-F', () => {
            if (this.currentWeaponArea) {
                const area = this.currentWeaponArea;

                if (this.money >= area.cost) {
                    // Stats das armas (sem atributos de munição)
                    const weaponStats = {
                        minigun: { type: 'minigun', damage: 1.5, fireRate: 100, spread: 5, bulletSpeed: 600 },
                        shotgun: { type: 'shotgun', damage: 2, fireRate: 800, spread: 10, bulletSpeed: 400 },
                        rifle: { type: 'rifle', damage: 1.2, fireRate: 200, spread: 2, bulletSpeed: 700 },
                        sniper: { type: 'sniper', damage: 10, fireRate: 1500, spread: 0, bulletSpeed: 1000 } // Sniper
                    }[area.weaponType];

                    if (this.weapons.length < 2) {
                        // Caso 1: Menos de 2 armas, adiciona e gasta o dinheiro
                        this.money -= area.cost;
                        this.weapons.push(weaponStats);
                        this.currentWeaponIndex = this.weapons.length - 1; // Seleciona a nova arma
                        this.upgradeText.setText(`Arma ${area.weaponType} comprada e equipada!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => {
                            this.upgradeText.setVisible(false);
                        });
                    } else {
                        // NOVO COMPORTAMENTO: Já tem 2 armas, substitui a arma atual imediatamente
                        const oldWeaponType = this.weapons[this.currentWeaponIndex].type; // Pega o nome da arma que será substituída
                        this.money -= area.cost; // Dedução do dinheiro
                        this.weapons[this.currentWeaponIndex] = weaponStats; // Substitui a arma no slot atual

                        this.upgradeText.setText(`Arma ${area.weaponType} substituiu ${oldWeaponType} no slot atual!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => {
                            this.upgradeText.setVisible(false);
                        });
                    }
                } else {
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                }
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
            // Só esconde se não estiver em uma área de arma também
            if (!this.currentWeaponArea || !this.upgradeText.visible) { // Verifica se não está sobrepondo uma área de arma
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
            if (!this.currentUpgradeArea) { // Só esconde se não estiver em uma área de upgrade também
                this.upgradeText.setVisible(false);
            }
        }
    }

    addPerkIcon(perkKey) {
        const iconKey = {
            forca: 'perk_forca',
            reviver: 'perk_reviver',
            resistencia: 'perk_resistencia',
            recarga: 'perk_recarga'
        }[perkKey];

        if (!iconKey) return;

        const iconX = this.perkIconStartX + this.perkIcons.length * 40;
        const icon = this.add.image(iconX, this.perkIconStartY, iconKey)
            .setScrollFactor(0)
            .setDisplaySize(32, 32);

        this.perkIcons.push(icon);
    }
}