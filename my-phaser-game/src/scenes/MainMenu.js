import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    create() {
        // Imagem de fundo centralizada em 1920x1080 e redimensionada para cobrir a tela
        this.add
            .image(1920 / 2, 1080 / 2, "menu-background")
            .setDisplaySize(1920, 1080);

        this.cameras.main.setBackgroundColor("#1a1a1a");

        // Botão Jogar centralizado horizontalmente e posicionado na parte inferior da tela
        const playButton = this.add
            .text(1920 / 2, 1080 - 100, "▶ START", {
                fontSize: "48px",
                fontFamily: "Pixellari",
                backgroundColor: "#007700",
                color: "#fff",
                padding: { x: 30, y: 20 },
                align: "center",
                fixedWidth: 400,
            })
            .setOrigin(0.5)
            .setInteractive();

        // Efeitos de hover
        playButton.on("pointerover", () => {
            playButton.setStyle({ backgroundColor: "#00aa00" }); // Verde claro no hover
        });

        playButton.on("pointerout", () => {
            playButton.setStyle({ backgroundColor: "#007700" }); // Volta pro verde original
        });

        // Texto de rodapé centralizado horizontalmente e próximo ao rodapé
        this.add
            .text(1920 / 2, 1080 - 40, "Aperte para sobreviver...", {
                fontSize: "20px",
                color: "#888",
            })
            .setOrigin(0.5);

        playButton.on("pointerdown", () => {
            this.sound.stopAll(); // Para toda música e efeitos
            this.scene.start("SurvivalGame");
        });
    }
}
