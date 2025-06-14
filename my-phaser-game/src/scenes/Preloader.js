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

        this.load.image("tank_right", "/zombies/tank_right.png");
        this.load.image("tank_right2", "/zombies/tank_right2.png");
        this.load.image("tank_left2", "/zombies/tank_left2.png");
        this.load.image("tank_left", "/zombies/tank_left.png");
        this.load.image("tank_up", "/zombies/tank_up.png");
        this.load.image("tank_up2", "/zombies/tank_up2.png");
        this.load.image("tank_down", "/zombies/tank_down.png");
        this.load.image("tank_down2", "/zombies/tank_down2.png");
        // 👉 Carregar as imagens dos zumbis tank
        // 🔽 Down
        this.load.image('tank_down', '/zombies/tank_down.png');
        this.load.image('tank_down2', '/zombies/tank_down2.png');
        this.load.image('tank_down_hit', '/zombies/tank_down_hit.png');
        this.load.image('tank_down_hit2', '/zombies/tank_down_hit2.png');
        // 🔼 Up
        this.load.image('tank_up', '/zombies/tank_up.png');
        this.load.image('tank_up2', '/zombies/tank_up2.png');
        this.load.image('tank_up_hit', '/zombies/tank_up_hit.png');
        this.load.image('tank_up_hit2', '/zombies/tank_up_hit2.png');
        // ⬅️ Left
        this.load.image('tank_left', '/zombies/tank_left.png');
        this.load.image('tank_left2', '/zombies/tank_left2.png');
        this.load.image('tank_left_hit', '/zombies/tank_left_hit.png');
        this.load.image('tank_left_hit2', '/zombies/tank_left_hit2.png');
        // ➡️ Right
        this.load.image('tank_right', '/zombies/tank_right.png');
        this.load.image('tank_right2', '/zombies/tank_right2.png');
        this.load.image('tank_right_hit', '/zombies/tank_right_hit.png');
        this.load.image('tank_right_hit2', '/zombies/tank_right_hit2.png');

        //Imagens do Zombie fast
        // Carregar as imagens dos zumbis fast
        // Down
        this.load.image('fast_down', '/zombies/fast_down.png');
        this.load.image('fast_down2', '/zombies/fast_down2.png');
        this.load.image('fast_down_hit', '/zombies/fast_down_hit.png');
        this.load.image('fast_down_hit2', '/zombies/fast_down_hit2.png');
        // 🔼 Up
        this.load.image('fast_up', '/zombies/fast_up.png');
        this.load.image('fast_up2', '/zombies/fast_up2.png');
        this.load.image('fast_up_hit', '/zombies/fast_up_hit.png');
        this.load.image('fast_up_hit2', '/zombies/fast_up_hit2.png');
        // ⬅️ Left
        this.load.image('fast_left', '/zombies/fast_left.png');
        this.load.image('fast_left2', '/zombies/fast_left2.png');
        this.load.image('fast_left_hit', '/zombies/fast_left_hit.png');
        this.load.image('fast_left_hit2', '/zombies/fast_left_hit2.png');
        // ➡️ Right
        this.load.image('fast_right', '/zombies/fast_right.png');
        this.load.image('fast_right2', '/zombies/fast_right2.png');
        this.load.image('fast_right_hit', '/zombies/fast_right_hit.png');
        this.load.image('fast_right_hit2', '/zombies/fast_right_hit2.png');

        //Imagens do Zombie smart
        // 👉 Carregar as imagens dos zumbis smart
        // 🔽 Down
        this.load.image('smart_down', '/zombies/smart_down.png');
        this.load.image('smart_down2', '/zombies/smart_down2.png');
        this.load.image('smart_down_hit', '/zombies/smart_down_hit.png');
        this.load.image('smart_down_hit2', '/zombies/smart_down_hit2.png');
        // 🔼 Up
        this.load.image('smart_up', '/zombies/smart_up.png');
        this.load.image('smart_up2', '/zombies/smart_up2.png');
        this.load.image('smart_up_hit', '/zombies/smart_up_hit.png');
        this.load.image('smart_up_hit2', '/zombies/smart_up_hit2.png');
        // ⬅️ Left
        this.load.image('smart_left', '/zombies/smart_left.png');
        this.load.image('smart_left2', '/zombies/smart_left2.png');
        this.load.image('smart_left_hit', '/zombies/smart_left_hit.png');
        this.load.image('smart_left_hit2', '/zombies/smart_left_hit2.png');
        // ➡️ Right
        this.load.image('smart_right', '/zombies/smart_right.png');
        this.load.image('smart_right2', '/zombies/smart_right2.png');
        this.load.image('smart_right_hit', '/zombies/smart_right_hit.png');
        this.load.image('smart_right_hit2', '/zombies/smart_right_hit2.png');

        this.load.image('fastZombie', '/zombies/fast.png');
        this.load.image('smartZombie', '/zombies/smart.png');
        this.load.image('bossZombie', '/zombies/boss.png');

        //Imagem do sangue quando os zumbies morrem
        this.load.image('blood_splash1', '/effects/blood_splash1.png');
        this.load.image('blood_splash2', '/effects/blood_splash2.png');
        this.load.image('blood_splash3', '/effects/blood_splash3.png');


        // Cutscenes
        this.load.image("cutscene1", "imagens/cutscene1.png");
        this.load.image("cutscene2", "imagens/cutscene2.png");
        this.load.image("cutscene3", "imagens/cutscene3.png");
        this.load.image("cutscene4", "imagens/cutscene4.png");

        //Efeitos sonoros
        this.load.audio("cutsceneMusic", "audio/cutscene-theme.mp3");
        this.load.audio("gritinho", "audio/grito.mp3");
        this.load.audio("alarme", "audio/alarm.mp3");
        this.load.audio("zumbi", "audio/zombieSound.mp3");
        this.load.audio("pistol_shot", "audio/pistol.ogg");
        this.load.audio("minigun_shot", "audio/minigun.mp3");
        this.load.audio("shotgun_shot", "audio/shotgun.wav");
        this.load.audio("rifle_shot", "audio/rifle.wav");
        this.load.audio("sniper_shot", "audio/sniper.wav");
        this.load.audio("minigun_shot", "audio/minigun.wav");
        this.load.audio("survivalMusic", "audio/survival.mp3");
        this.load.audio("gameOverMusic", "audio/emorreu.mp3");
        this.load.audio("clickButton", "audio/button.wav");
        this.load.audio("ouch", "audio/ouch.mp3");
        this.load.audio("error", "audio/error.mp3");
        this.load.audio("gunload", "audio/gunload.mp3");
        this.load.audio("upgrade", "audio/upgrade.mp3");
    }

    create() {
        // Quando tudo estiver carregado, inicia o menu principal
        this.scene.start("Cutscene");
    }
}
