import Phaser from 'phaser';

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super('SurvivalGame');
        this.playerHp = 100;
        this.score = 0;
        this.round = 1;
        this.zombieSpeed = 150;
        this.zombieHp = 3;
    }

    create() {
        this.createPlayer();
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI();
        this.setupCollisions();
        this.startZombieSpawner();
        this.setupMouseShoot();
        this.startRoundTimer();

        this.physics.world.setBounds(0, 0, 2000, 2000);
        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.cameras.main.startFollow(this.player);
    }

    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI();
    }

    createPlayer() {
        this.player = this.add.rectangle(1000, 1000, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.playerHp = 100;
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
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
            { x: 1000, y: 1400 }
        ];

        positions.forEach(pos => {
            const obs = this.obstacles.create(pos.x, pos.y, 'obstacle');
            obs.setScale(0.5).refreshBody();
        });
    }

    createUI() {
        this.healthBarBg = this.add.rectangle(20, 20, 104, 14, 0x000000).setScrollFactor(0).setOrigin(0);
        this.healthBar = this.add.rectangle(22, 22, 100, 10, 0xff0000).setScrollFactor(0).setOrigin(0);
        this.scoreText = this.add.text(20, 40, 'Pontos: 0', { fontSize: '16px', fill: '#ffffff' }).setScrollFactor(0);
        this.roundText = this.add.text(20, 60, 'Round: 1', { fontSize: '16px', fill: '#ffffff' }).setScrollFactor(0);
    }

    updateUI() {
        this.healthBar.width = Math.max(0, this.playerHp);
        this.scoreText.setText('Pontos: ' + this.score);
        this.roundText.setText('Round: ' + this.round);
    }

    setupCollisions() {
        this.physics.add.overlap(this.zombies, this.player, () => {
            this.playerHp -= 20;
            if (this.playerHp <= 0) {
                this.scene.start('GameOver');
            }
        });

        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) => bullet.destroy());
    }

    setupMouseShoot() {
        this.input.on('pointerdown', () => {
            this.shootBullet();
        });
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

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate(zombie => {
            this.physics.moveToObject(zombie, this.player, this.zombieSpeed);
        });
    }

    shootBullet() {
        const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xffff00);
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);

        bullet.body.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;

        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        const speed = 500;

        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);

        this.time.delayedCall(2000, () => bullet.destroy());
    }

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

    hitZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp--;
        if (zombie.hp <= 0) {
            zombie.destroy();
            this.score += 10;
        }
    }

    startRoundTimer() {
        this.time.addEvent({
            delay: 15000, // A cada 15 segundos
            callback: () => {
                this.round++;
                this.zombieHp += 1;
                this.zombieSpeed += 10;
            },
            callbackScope: this,
            loop: true
        });
    }
}
