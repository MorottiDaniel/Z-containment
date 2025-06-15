import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver"); // Nome da cena
    }

    create() {
        this.sound.play("gameOverMusic", {volume: 0.3});

        // Centraliza a imagem de fundo em 1920x1080 e ajusta o tamanho para cobrir a tela
        this.add.image(1920 / 2, 1080 / 2, "gover-background").setDisplaySize(1920, 1080);

        // Botão retry centralizado na tela, um pouco abaixo do centro vertical
        const retryButton = this.add
            .text(1920 / 2, 1080 / 2 + 50, "↻ RETRY", {
                fontSize: "28px", // Mantém o tamanho da fonte
                fontFamily: "Pixellari",
                backgroundColor: "#800000",
                color: "#ffffff",
                padding: { x: 18, y: 12 },
                align: "center",
                fixedWidth: 180,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: "#000000",
                    blur: 1,
                    fill: true,
                },
            })
            .setOrigin(0.5)
            .setInteractive();

        // Hover com cor mais clara
        retryButton.on("pointerover", () => {
            retryButton.setStyle({ backgroundColor: "#aa0000" });
        });

        retryButton.on("pointerout", () => {
            retryButton.setStyle({ backgroundColor: "#800000" });
        });

        // Ao clicar no botão, volta para o menu principal
        retryButton.on("pointerdown", () => {
            this.sound.stopAll();
            this.sound.play("clickButton", {volume: 0.1});
            this.scene.stop("SurvivalGame");
            this.scene.start("SurvivalGame");
        });
    }
}
