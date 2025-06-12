import { Scene } from "phaser";

export class Preloader extends Scene {
    constructor() {
        super("Preloader"); // Nome da cena de pré-carregamento
    }

    preload() {
        // Cor de fundo da cena de loading
        this.cameras.main.setBackgroundColor("#111");

        // Texto "Carregando..." centralizado
        this.add
            .text(960, 500, "Carregando...", {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Barra de fundo 
        this.add.rectangle(960, 540, 400, 30, 0x222222).setOrigin(0.5);

        // Barra de progresso 
        const progressBar = this.add
            .rectangle(760, 540, 0, 30, 0x00ff00)
            .setOrigin(0, 0.5);

        // Atualiza a largura da barra conforme o progresso
        this.load.on("progress", (value) => {
            progressBar.width = 400 * value;
        });

        // Define o caminho base para os arquivos carregados
        this.load.setPath("assets");

        // Carrega a imagem de fundo do menu principal
        this.load.image("menu-background", "imagens/menu-background.png");

        // Carrega a imagem de game over
        this.load.image("gover-background", "imagens/gover-background.png");

        // Carrega a imagem do cursor
        this.load.image("cursor", "imagens/crosshair.png");

        //Cerragar json mapa
        this.load.image("tilesRefe", "mapa/Zombie_Tileset_Reference.png");
        this.load.image("tilesPeks", "mapa/Perks.png");
        this.load.tilemapTiledJSON("map", "mapa/map01.json");

        //Imagens do Zombie Tank
        this.load.image('tank_right', '/zombies/tank_right.png');
        this.load.image('tank_right2', '/zombies/tank_right2.png');
        this.load.image('tank_left2', '/zombies/tank_left2.png');
        this.load.image('tank_left', '/zombies/tank_left.png');
        this.load.image('tank_up', '/zombies/tank_up.png');
        this.load.image('tank_up2', '/zombies/tank_up2.png');
        this.load.image('tank_down', '/zombies/tank_down.png');
        this.load.image('tank_down2', '/zombies/tank_down2.png');
        

        // Cutscenes
        this.load.image("cutscene1", "imagens/cutscene1.png");
        this.load.image("cutscene2", "imagens/cutscene2.png");
        this.load.image("cutscene3", "imagens/cutscene3.png");
        this.load.image("cutscene4", "imagens/cutscene4.png");

        // musica cutscene
        this.load.audio("cutsceneMusic", "audio/cutscene-theme.mp3");
        this.load.audio("gritinho", "audio/grito.mp3");
        this.load.audio("alarme", "audio/alarm.mp3");
        this.load.audio("zumbi", "audio/zombieSound.mp3");
    }

    create() {
        // Quando tudo estiver carregado, inicia o menu principal
        this.scene.start("Cutscene");
    }
}
