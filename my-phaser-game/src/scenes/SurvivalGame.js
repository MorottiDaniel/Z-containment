import Phaser from 'phaser';

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super('SurvivalGame');
        this.playerMaxHp = 3;  // Máximo de hits (vidas)
        this.playerHp = this.playerMaxHp;  // Vida inicial do personagem
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 150;  // Velocidade base dos zumbis
        this.zombieBaseHp = 3;  // HP base dos zumbis
        this.invulnerable = false;  // Flag de invulnerabilidade
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
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
        this.playerHp = this.playerMaxHp;  // Reseta a vida do personagem
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
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;  
        this.scoreText.setText('Pontos: ' + this.score);
        this.roundText.setText('Round: ' + this.round);
    }

    setupCollisions() {
        this.physics.add.overlap(this.zombies, this.player, this.handlePlayerHit, null, this);
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
            if (zombie.type === 'smart') {
                // Pathfinding simples com raycasting
                const angleToPlayer = Phaser.Math.Angle.Between(zombie.x, zombie.y, this.player.x, this.player.y);
                const distanceToPlayer = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);
                
                // Cria um raycast para verificar obstáculos
                const ray = new Phaser.Geom.Line(
                    zombie.x, 
                    zombie.y, 
                    zombie.x + Math.cos(angleToPlayer) * distanceToPlayer, 
                    zombie.y + Math.sin(angleToPlayer) * distanceToPlayer
                );
                let hit = false;
                this.obstacles.children.iterate(obstacle => {
                    if (Phaser.Geom.Intersects.LineToRectangle(ray, obstacle.getBounds())) {
                        hit = true;
                        return false; // Para a iteração
                    }
                });

                if (hit) {
                    // Desvia movendo-se em uma direção perpendicular
                    const perpendicularAngle = angleToPlayer + Math.PI / 2;
                    this.physics.velocityFromRotation(perpendicularAngle, zombie.speed, zombie.body.velocity);
                } else {
                    this.physics.moveToObject(zombie, this.player, zombie.speed);
                }
            } else {
                this.physics.moveToObject(zombie, this.player, zombie.speed);
            }
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
            delay: 5000, // Intervalo maior para ondas
            callback: () => {
                const zombiesInWave = Phaser.Math.Between(3, 6); // 3 a 6 zumbis por onda
                for (let i = 0; i < zombiesInWave; i++) {
                    this.time.delayedCall(i * 500, this.spawnZombie, [], this);
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    spawnZombie() {
        const types = ['fast', 'tank', 'smart'];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        let zombieSpeed = this.zombieBaseSpeed;
        let zombieHp = this.zombieBaseHp;
        let color = 0xff0000; // Vermelho (padrão)

        if (type === 'fast') {
            zombieSpeed *= 1.5; // 50% mais rápido
            zombieHp = 1; // Menos resistente
            color = 0xffa500; // Laranja
        } else if (type === 'tank') {
            zombieSpeed *= 0.7; // 30% mais lento
            zombieHp = 5; // Mais resistente
            color = 0x800080; // Roxo
        } else if (type === 'smart') {
            zombieSpeed *= 1.2; // 20% mais rápido
            zombieHp = 3; // HP padrão
            color = 0x00ffff; // Ciano
        }

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

        const zombie = this.add.rectangle(x, y, 30, 30, color);
        this.physics.add.existing(zombie);
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

        const boss = this.add.rectangle(x, y, 50, 50, 0x0000ff); // Azul para o chefão
        this.physics.add.existing(boss);
        boss.hp = this.zombieBaseHp * 3; // 3x o HP base
        boss.speed = this.zombieBaseSpeed * 0.8; // 20% mais lento
        boss.type = 'boss';
        this.zombies.add(boss);
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable) return;

        this.playerHp--;
        this.invulnerable = true;
        this.time.delayedCall(this.invulnerableTime, () => {
            this.invulnerable = false;
        });

        if (this.playerHp <= 0) {
            this.scene.start('GameOver');
        }
    }

    hitZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp--;
        this.tweens.add({
            targets: zombie,
            alpha: 0.5,
            duration: 100,
            yoyo: true
        });
        if (zombie.hp <= 0) {
            zombie.destroy();
            this.score += zombie.type === 'boss' ? 50 : 10; // 50 pontos para chefão
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
            loop: true
        });
    }
}