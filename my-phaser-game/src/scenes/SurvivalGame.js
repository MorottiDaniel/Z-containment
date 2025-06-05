import Phaser from 'phaser';

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super('SurvivalGame');
        this.playerHp = 100;
        this.score = 0;
        this.round = 1;
        this.zombieSpeed = 150;
        this.zombieHp = 30;

        this.weapon = 'padrão';
        this.bulletDamage = 10;
        this.fireRate = 400;
        this.money = 0;
        this.shopOpen = false;
        this.inShopZone = false;
    }

    create() {
        this.createPlayer();
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI();
        this.setupCollisions();
        this.setupMouseShoot();
        this.startZombieSpawner();
        this.startRoundTimer();
        this.createShopZone();

        this.physics.world.setBounds(0, 0, 2000, 2000);
        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.cameras.main.startFollow(this.player);
    }

    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI();

        const inZone = Phaser.Geom.Intersects.RectangleToRectangle(
            this.player.getBounds(), this.shopArea.getBounds()
        );
        this.shopHint.setVisible(inZone);
        this.inShopZone = inZone;
    }

    // === Criação e Movimento ===

    createPlayer() {
        this.player = this.add.rectangle(1000, 1000, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
    }

    handlePlayerMovement() {
        const speed = 200;
        const body = this.player.body;
        body.setVelocity(0);

        if (this.cursors.left.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown) body.setVelocityX(speed);

        if (this.cursors.up.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    }

    // === UI ===

    createUI() {
        this.healthBarBg = this.add.rectangle(20, 20, 104, 14, 0x000000).setScrollFactor(0).setOrigin(0);
        this.healthBar = this.add.rectangle(22, 22, 100, 10, 0xff0000).setScrollFactor(0).setOrigin(0);
        this.scoreText = this.add.text(20, 40, 'Pontos: 0', { fontSize: '16px', fill: '#ffffff' }).setScrollFactor(0);
        this.roundText = this.add.text(20, 60, 'Round: 1', { fontSize: '16px', fill: '#ffffff' }).setScrollFactor(0);
        this.moneyText = this.add.text(20, 80, 'Dinheiro: 0', { fontSize: '16px', fill: '#ffffff' }).setScrollFactor(0);
    }

    updateUI() {
        this.healthBar.width = Math.max(0, this.playerHp);
        this.scoreText.setText('Pontos: ' + this.score);
        this.roundText.setText('Round: ' + this.round);
        this.moneyText.setText('Dinheiro: ' + this.money);
    }

    // === Grupos e Obstáculos ===

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
            { x: 1000, y: 1400 }
        ];

        positions.forEach(pos => {
            const obs = this.obstacles.create(pos.x, pos.y, 'obstacle');
            obs.setScale(0.5).refreshBody();
        });
    }

    // === Colisões ===

    setupCollisions() {
        this.physics.add.overlap(this.zombies, this.player, () => {
            this.playerHp -= 20;
            if (this.playerHp <= 0) this.scene.start('GameOver');
        });

        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) => bullet.destroy());
    }

    // === Tiro ===

    setupMouseShoot() {
        this.input.on('pointerdown', () => {
            this.shootBullet();
        });

        this.input.keyboard.on('keydown-E', () => {
            if (this.inShopZone && !this.shopOpen) {
                this.enterShop();
            }
        });
    }

    shootBullet() {
        const now = Date.now();
        if (!this.lastShotTime || now - this.lastShotTime > this.fireRate) {
            this.lastShotTime = now;

            const pointer = this.input.activePointer;
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
            const speed = 500;

            if (this.weapon === 'espingarda') {
                [-0.2, 0, 0.2].forEach(offset => {
                    this.createBullet(angle + offset, speed);
                });
            } else {
                this.createBullet(angle, speed);
            }
        }
    }

    createBullet(angle, speed) {
        const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xffff00);
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);
        bullet.body.setCollideWorldBounds(true);
        bullet.damage = this.bulletDamage;
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
        this.time.delayedCall(2000, () => bullet.destroy());
    }

    hitZombie(bullet, zombie) {
        bullet.destroy();

        this.money += 10;
        this.moneyText.setText('Dinheiro: ' + this.money);

        zombie.hp -= bullet.damage || 1;

        if (zombie.hp <= 0) {
            zombie.destroy();

            this.money += 100;
            this.moneyText.setText('Dinheiro: ' + this.money);
        }
    }

    // === Zumbis e Rounds ===

    startZombieSpawner() {
        this.zombieTimer = this.time.addEvent({
            delay: 2000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });
    }

    spawnZombie() {
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

        const zombie = this.add.rectangle(x, y, 30, 30, 0xff0000);
        this.physics.add.existing(zombie);
        zombie.hp = this.zombieHp;
        this.zombies.add(zombie);
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate(zombie => {
            this.physics.moveToObject(zombie, this.player, this.zombieSpeed);
        });
    }

    startRoundTimer() {
        this.time.addEvent({
            delay: 15000,
            callback: () => {
                this.round++;
                this.zombieHp += 30;
                this.zombieSpeed += 10;
            },
            callbackScope: this,
            loop: true
        });
    }

    // === Loja ===

    createShopZone() {
        this.shopArea = this.add.zone(900, 100, 100, 100).setOrigin(0.5);
        this.physics.world.enable(this.shopArea);
        this.shopArea.body.setAllowGravity(false);
        this.shopArea.body.setImmovable(true);

        this.add.rectangle(900, 100, 100, 100, 0x00ffff, 0.3).setOrigin(0.5);
        this.shopHint = this.add.text(820, 160, 'Pressione E para abrir a loja', {
            fontSize: '14px', fill: '#ffffff'
        }).setVisible(false);

        this.physics.add.overlap(this.player, this.shopArea, () => {
            this.inShopZone = true;
        }, null, this);
    }

    enterShop() {
        this.shopOpen = true;

        const shopItems = [
            {
                name: "ESPINGARDA",
                cost: 1500,
                description: "Atira múltiplos projéteis.",
                action: () => {
                    this.bulletDamage = 30;
                    this.fireRate = 800;
                    this.weapon = 'espingarda';
                }
            },
            {
                name: "RIFLE DE ASSALTO",
                cost: 3000,
                description: "Alta cadência, dano moderado.",
                action: () => {
                    this.bulletDamage = 35;
                    this.fireRate = 100;
                    this.weapon = 'rifle';
                }
            }
        ];

        const bg = this.add.rectangle(512, 384, 400, 300, 0x000000, 0.8).setDepth(10);
        const text = this.add.text(370, 250, 'LOJA DE ARMAS', { fontSize: '24px', fill: '#fff' }).setDepth(10);
        const optionTexts = [];

        shopItems.forEach((item, i) => {
            const y = 300 + i * 50;
            const itemText = this.add.text(360, y, `${item.name} - $${item.cost}`, {
                fontSize: '18px',
                fill: '#ffff00'
            }).setDepth(10).setInteractive();

            itemText.on('pointerdown', () => {
                if (this.money >= item.cost) {
                    this.money -= item.cost;
                    this.moneyText.setText('Dinheiro: ' + this.money);
                    item.action();
                    this.closeShop([bg, text, ...optionTexts]);
                } else {
                    itemText.setText(`${item.name} - Dinheiro insuficiente`);
                }
            });

            optionTexts.push(itemText);
        });

        this.input.once('pointerdown', () => this.closeShop([bg, text, ...optionTexts]), this);
    }

    closeShop(elements) {
        elements.forEach(e => e.destroy());
        this.shopOpen = false;
    }
}
