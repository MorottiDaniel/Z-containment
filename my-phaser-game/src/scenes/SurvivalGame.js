import Phaser from 'phaser';

export class SurvivalGame extends Phaser.Scene {
    constructor() {
        super('SurvivalGame'); // Nome da cena
    }

    create() {
        // Cria o jogador como um retângulo verde no centro da tela
        this.player = this.add.rectangle(512, 384, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player); // Ativa física no jogador
        this.player.body.setCollideWorldBounds(true); // Impede que o jogador saia da tela

        // Define as teclas de controle (setas e WASD)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // Grupo que armazenará os zumbis
        this.zombies = this.physics.add.group();

        // Gera um novo zumbi a cada 2 segundos
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });

        // Se um zumbi encostar no jogador → game over
        this.physics.add.overlap(this.zombies, this.player, () => {
            this.scene.start('GameOver');
        });
    }

    update() {
        // Atualiza o movimento do jogador
        this.handleMovement();

        // Faz cada zumbi seguir o jogador
        this.zombies.children.iterate((zombie) => {
            this.physics.moveToObject(zombie, this.player, 60); // velocidade 60
        });
    }

    handleMovement() {
        const speed = 200; // Velocidade do jogador
        const body = this.player.body;

        // Zera a velocidade antes de movimentar
        body.setVelocity(0);

        // Movimento horizontal
        if (this.cursors.left.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown) body.setVelocityX(speed);

        // Movimento vertical
        if (this.cursors.up.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    }

    spawnZombie() {
        // Define de qual lado da tela o zumbi vai aparecer
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        // Define a posição inicial do zumbi com base no lado
        switch (side) {
            case 0: x = Phaser.Math.Between(0, 1024); y = -20; break; // Topo
            case 1: x = Phaser.Math.Between(0, 1024); y = 788; break; // Base
            case 2: x = -20; y = Phaser.Math.Between(0, 768); break; // Esquerda
            case 3: x = 1044; y = Phaser.Math.Between(0, 768); break; // Direita
        }

        // Cria o zumbi como retângulo vermelho
        const zombie = this.add.rectangle(x, y, 30, 30, 0xff0000);
        this.physics.add.existing(zombie); // Ativa física
        this.zombies.add(zombie); // Adiciona ao grupo de zumbis
    }
}
