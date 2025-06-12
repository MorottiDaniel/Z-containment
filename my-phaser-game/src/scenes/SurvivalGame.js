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
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }]; // Armas iniciais do jogador (apenas pistola)
        this.currentWeaponIndex = 0; // Índice da arma atual
        this.lastShotTime = 0; // Controla o tempo do último disparo
    }

    preload() {
        // ... outros loads prq no assets não deu
        this.load.image('perk_forca', 'assets/perks/doubletap.png');
        this.load.image('perk_reviver', 'assets/perks/revive.png');
        this.load.image('perk_resistencia', 'assets/perks/forca.png');
        this.load.image('perk_recarga', 'assets/perks/speed.png');
        // Não carrega imagens para armas, pois não estão disponíveis
    }

    create() {
        // Zerando status
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 50;
        this.zombieBaseHp = 3;
        this.money = 0;

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
        const camadaPerks04 = map.createLayer("Perks04", tileset01, 0, 0);
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

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.playerHp = this.playerMaxHp;
        this.purchasedUpgrades = new Set();
        this.cameras.main.setZoom(2);

        // Modificando cursor
        this.input.setDefaultCursor('url(assets/imagens/crosshair.png) 32 32, pointer');
    }

    update() {
        this.handlePlayerMovement();

        // Faz o retângulo visual seguir a posição do corpo de física

        this.moveZombiesTowardsPlayer();
        this.updateUI();
        this.checkUpgradeAreaOverlap();
        this.checkWeaponAreaOverlap();
    }

    createPlayer(x, y) {
        this.player = this.add.rectangle(x, y, 16, 16, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.playerHp = this.playerMaxHp; // Reseta a vida do personagem
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D,1,2");
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

        this.perkIcons = []; // Armazena os ícones ativos
        this.perkIconStartX = 20; // posição inicial X (canto inferior esquerdo)
        this.perkIconStartY = this.scale.height - 40; // Y fixo
    }

    updateUI() {
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;
        this.scoreText.setText("Pontos: " + this.score);
        this.roundText.setText("Round: " + this.round);
        this.moneyText.setText("Dinheiro: " + this.money);
        this.weaponText.setText(`Arma: ${this.weapons[this.currentWeaponIndex].type}`);
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
        const speed = 120;
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

        // Troca de armas com teclas 1 e 2
        if (this.keys['1'].isDown && this.weapons[0]) {
            this.currentWeaponIndex = 0;
        } else if (this.keys['2'].isDown && this.weapons[1]) {
            this.currentWeaponIndex = 1;
        }
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
            if (zombie.type === "tank") {
                const vx = zombie.body.velocity.x;
                const vy = zombie.body.velocity.y;

                this.simulateDirectionalAnimation(zombie, 'tank', vx, vy);
            }

        });
    }

    simulateDirectionalAnimation(zombie, baseKey, vx, vy) {
        const now = this.time.now;

        if (Math.abs(vx) > Math.abs(vy)) {
            // Movimento horizontal
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
            // Movimento vertical
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


    shootBullet() {
        const currentTime = this.time.now;
        const weapon = this.weapons[this.currentWeaponIndex];
        if (currentTime < this.lastShotTime + weapon.fireRate) return;

        this.lastShotTime = currentTime;

        if (weapon.type === 'shotgun') {
            // Shotgun dispara 5 projéteis com spread
            for (let i = 0; i < 5; i++) {
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

                const pointer = this.input.activePointer;
                const angle = Phaser.Math.Angle.Between(
                    this.player.x,
                    this.player.y,
                    pointer.worldX,
                    pointer.worldY
                );
                // Adiciona spread ao ângulo
                const spreadAngle = angle + Phaser.Math.DegToRad(Phaser.Math.Between(-weapon.spread, weapon.spread));
                this.physics.velocityFromRotation(spreadAngle, weapon.bulletSpeed, bullet.body.velocity);
                this.time.delayedCall(2000, () => bullet.destroy());
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

            const pointer = this.input.activePointer;
            const angle = Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                pointer.worldX,
                pointer.worldY
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
                    this.time.delayedCall(i * 500, this.spawnZombie, [], this);
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    spawnZombie() {
        const types = ["fast", "tank", "smart"];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        let zombieSpeed = this.zombieBaseSpeed;
        let zombieHp = this.zombieBaseHp;
        let zombie; // variável para o objeto zumbi

        // Define a posição do zumbi na borda do mapa
        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0:
                x = Phaser.Math.Between(0, worldWidth);
                y = -margin;
                break;
            case 1:
                x = Phaser.Math.Between(0, worldWidth);
                y = worldHeight + margin;
                break;
            case 2:
                x = -margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
            case 3:
                x = worldWidth + margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
        }

        // Criação do zumbi conforme o tipo
        if (type === "fast") {
            zombieSpeed *= 1.5;
            zombieHp = 1;
            const color = 0xffa500; // laranja
            zombie = this.add.rectangle(x, y, 16, 16, color);
            this.physics.add.existing(zombie);

        } else if (type === "tank") {
            zombieSpeed *= 0.4;
            zombieHp = 8;

            // Inicia com a imagem tank_down
            zombie = this.physics.add.sprite(x, y, 'tank_down');
            zombie.setDisplaySize(32, 32);

            // Controle de animação
            zombie.frameToggleTime = 0;
            zombie.frameToggleState = false; // para alternar os frames

        } else if (type === "smart") {
            zombieSpeed *= 1.2;
            zombieHp = 3;
            const color = 0x00ffff; // ciano
            zombie = this.add.rectangle(x, y, 16, 16, color);
            this.physics.add.existing(zombie);
        } else {
            zombie = this.add.rectangle(x, y, 16, 16, 0xff0000);
            this.physics.add.existing(zombie);
        }

        // Define propriedades comuns do zumbi
        zombie.hp = zombieHp;
        zombie.speed = zombieSpeed;
        zombie.type = type;

        // Adiciona ao grupo
        this.zombies.add(zombie);
    }


    spawnBossZombie() {
        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;

        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0:
                x = Phaser.Math.Between(0, worldWidth);
                y = -margin;
                break;
            case 1:
                x = Phaser.Math.Between(0, worldWidth);
                y = worldHeight + margin;
                break;
            case 2:
                x = -margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
            case 3:
                x = worldWidth + margin;
                y = Phaser.Math.Between(0, worldHeight);
                break;
        }

        const boss = this.add.rectangle(x, y, 20, 20, 0x0000ff); // Azul para o chefão
        this.physics.add.existing(boss);
        boss.hp = this.zombieBaseHp * 3; // 3x o HP base
        boss.speed = this.zombieBaseSpeed * 0.8; // 20% mais lento
        boss.type = "boss";
        this.zombies.add(boss);
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable || !this.scene.isActive()) return;

        this.playerHp--;

        this.invulnerable = true;

        // Efeito visual de dano
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.player.setAlpha(1);
            },
        });

        this.time.delayedCall(this.invulnerableTime, () => {
            this.invulnerable = false;
        });

        if (this.playerHp <= 0) {
            if (this.canRevive && !this.revivedOnce) {
                this.revivedOnce = true;

                // RESETA BUFFS (menos o revive) e armas
                this.playerMaxHp = 5;
                this.playerHp = this.playerMaxHp;
                this.playerDamage = 1;
                this.canRevive = false; // revive foi consumido
                this.purchasedUpgrades.clear(); // limpa upgrades comprados
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

            this.scene.start("GameOver");
        }
    }

    hitZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp -= this.weapons[this.currentWeaponIndex].damage;

        this.money += 10;

        this.tweens.add({
            targets: zombie,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
        });
        if (zombie.hp <= 0) {
            zombie.destroy();
            this.score += zombie.type === "boss" ? 50 : 10; // 50 pontos para chefão

            this.money += 100;
        }
    }

    startRoundTimer() {
        this.time.addEvent({
            delay: 15000, // A cada 15 segundos
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

        // Áreas e custos para armas
        const weaponData = [
            { x: 600, y: 600, cost: 3000, weapon: 'minigun', color: 0xff0000 },
            { x: 1400, y: 600, cost: 2000, weapon: 'shotgun', color: 0x00ff00 },
            { x: 600, y: 1400, cost: 2500, weapon: 'rifle', color: 0x0000ff }
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
                    this.upgradeText.setText(`Upgrade já comprado`);
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
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                } else {
                    this.upgradeText.setText(`Dinheiro insuficiente`);
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
                    this.money -= area.cost;

                    const weaponStats = {
                        minigun: { type: 'minigun', damage: 1.5, fireRate: 100, spread: 5, bulletSpeed: 600 },
                        shotgun: { type: 'shotgun', damage: 2, fireRate: 800, spread: 10, bulletSpeed: 400 },
                        rifle: { type: 'rifle', damage: 1.2, fireRate: 200, spread: 2, bulletSpeed: 700 }
                    }[area.weaponType];

                    if (this.weapons.length < 2) {
                        // Adiciona a nova arma se houver espaço
                        this.weapons.push(weaponStats);
                        this.currentWeaponIndex = this.weapons.length - 1;
                    } else {
                        // Escolher slot para substituir (1 ou 2)
                        this.upgradeText.setText('Pressione 1 ou 2 para substituir arma');
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);

                        const keyHandler = (event) => {
                            if (event.key === '1' || event.key === '2') {
                                const slot = event.key === '1' ? 0 : 1;
                                this.weapons[slot] = weaponStats;
                                this.currentWeaponIndex = slot;
                                this.upgradeText.setText(`Arma ${area.weaponType} equipada no slot ${event.key}`);
                                this.time.delayedCall(1500, () => {
                                    this.upgradeText.setVisible(false);
                                });
                                this.input.keyboard.off('keydown', keyHandler);
                            }
                        };

                        this.input.keyboard.on('keydown', keyHandler);
                    }

                    this.upgradeText.setText(`Arma ${area.weaponType} comprada!`);
                    this.time.delayedCall(1500, () => {
                        this.upgradeText.setVisible(false);
                    });
                } else {
                    this.upgradeText.setText(`Dinheiro insuficiente`);
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
            this.upgradeText.setVisible(false);
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