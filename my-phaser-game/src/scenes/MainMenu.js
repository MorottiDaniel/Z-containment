import { Scene } from 'phaser';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu'); // Nome único da cena
    }

    create() {
        // Adiciona o título centralizado na tela
        this.add.text(512, 200, 'Z Containment', {
            fontSize: '48px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Cria o botão "Jogar"
        const playButton = this.add.text(512, 400, '▶ Jogar', {
            fontSize: '32px',
            backgroundColor: '#00aa00',
            color: '#ffffff',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive(); // Deixa o texto clicável

        // Quando o botão for clicado, inicia a cena do jogo
        playButton.on('pointerdown', () => {
            this.scene.start('SurvivalGame');
        });
        // this.sound.play('backgroundMusic', {
        //     loop: true,  // Loop da Musica
        //     volume: 0.5  // Volume entre 0 e 1
        // });
    }
}
