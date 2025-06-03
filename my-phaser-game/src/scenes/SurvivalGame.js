import Phaser from 'phaser';

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super('SurvivalGame');
    }

    create() {
        // Cria o jogador no centro
        this.player = this.add.rectangle(512, 384, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Teclas de movimentação
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

        // Grupo de zumbis
        this.zombies = this.physics.add.group();

        // Grupo de tiros
        this.bullets = this.physics.add.group();

        // Geração de zumbis a cada 2 segundos
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });

        // Colisão de zumbi com jogador → game over
        this.physics.add.overlap(this.zombies, this.player, () => {
            this.scene.start('GameOver');
        });

        // Colisão de tiros com zumbis
        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
    }

    update() {
        this.handleMovement();

        // Faz zumbis seguirem o jogador
        this.zombies.children.iterate((zombie) => {
            this.physics.moveToObject(zombie, this.player, 60);
        });

        // Atirar quando espaço for pressionado
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
            this.shootBullet();
        }
    }

    handleMovement() {
        const speed = 200;
        const body = this.player.body;
        body.setVelocity(0);

        if (this.cursors.left.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown) body.setVelocityX(speed);

        if (this.cursors.up.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    }

    shootBullet() {
        // Cria uma bala na posição do jogador
        const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xffff00);
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);

        bullet.body.setCollideWorldBounds(true);
        bullet.body.onWorldBounds = true;

        // Calcula direção do cursor
        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        const speed = 500;

        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);

        // Remove a bala após 2 segundos
        this.time.delayedCall(2000, () => bullet.destroy());
    }

    spawnZombie() {
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0: x = Phaser.Math.Between(0, 1024); y = -20; break;
            case 1: x = Phaser.Math.Between(0, 1024); y = 788; break;
            case 2: x = -20; y = Phaser.Math.Between(0, 768); break;
            case 3: x = 1044; y = Phaser.Math.Between(0, 768); break;
        }

        // Cria zumbi com 3 de vida
        const zombie = this.add.rectangle(x, y, 30, 30, 0xff0000);
        this.physics.add.existing(zombie);
        zombie.hp = 3; // Vida do zumbi
        this.zombies.add(zombie);
    }

    hitZombie(bullet, zombie) {
        bullet.destroy(); // Remove o tiro
        zombie.hp--;      // Zumbi toma dano

        // Se vida zerar, mata o zumbi
        if (zombie.hp <= 0) {
            zombie.destroy();
        }
    }
}
