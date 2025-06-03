import { Scene } from 'phaser';

export class GameOver extends Scene {
    constructor() {
        super('GameOver'); // Nome da cena
    }

    create() {
        // Exibe a mensagem "Game Over"
        this.add.text(512, 250, 'Game Over', {
            fontSize: '48px',
            color: '#ff0000'
        }).setOrigin(0.5);

        // Botão para voltar ao menu
        const retryButton = this.add.text(512, 400, '↻ Tentar Novamente', {
            fontSize: '28px',
            backgroundColor: '#aa0000',
            color: '#ffffff',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        // Ao clicar no botão, volta para o menu principal
        retryButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
