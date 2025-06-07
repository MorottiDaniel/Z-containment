import { Scene } from "phaser";

export class Preloader extends Scene {
    constructor() {
        super("Preloader"); // Nome da cena de pré-carregamento
    }

    preload() {
        // Cor de fundo da cena de loading
        this.cameras.main.setBackgroundColor('#111');

        // Texto "Carregando..."
        this.add.text(512, 300, 'Carregando...', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Barra de fundo (cinza escuro)
        this.add.rectangle(512, 360, 400, 30, 0x222222).setOrigin(0.5);

        // Barra de progresso (verde)
        const progressBar = this.add.rectangle(312, 360, 0, 30, 0x00ff00).setOrigin(0, 0.5);

        // Atualiza a largura da barra conforme o progresso
        this.load.on('progress', (value) => {
            progressBar.width = 400 * value;
        });

        // Define o caminho base para os arquivos carregados
        this.load.setPath("assets");

        // Carrega a música de fundo do menu
        this.load.audio("backgroundMusic", "audio/mscMenu.mp3");

        // Carrega a imagem de fundo do menu principal
        this.load.image("menu-background", "imagens/menu-background.png");

        // Carrega a imagem de game over
        this.load.image("gover-background", "imagens/gover-background.png");

        // Carrega a imagem do cursor
        this.load.image('cursor', 'imagens/crosshair.png');
        
    }

    create() {
        // Quando tudo estiver carregado, inicia o menu principal
        this.scene.start("MainMenu");
    }
}
