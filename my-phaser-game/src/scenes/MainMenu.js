import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    create() {
        
        this.add.image(512, 384, "menu-background").setDisplaySize(1024, 768);
        
        this.cameras.main.setBackgroundColor("#1a1a1a");

        // Botão Jogar
        const playButton = this.add
            .text(512, 680, "▶ START", {
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

        // Créditos ou rodapé
        this.add
            .text(512, 745, "Aperte para sobreviver...", {
                fontSize: "20px",
                color: "#888",
            })
            .setOrigin(0.5);
            playButton.on('pointerdown', () => {
            this.scene.start('SurvivalGame');
        });
    }
}
