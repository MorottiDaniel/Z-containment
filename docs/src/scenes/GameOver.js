import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver"); // Nome da cena
    }

    init(data) {
        // Recebe os dados da cena SurvivalGame
        this.score = data.score || 0;
        this.round = data.round || 1;
        this.money = data.money || 0;
        this.timeSurvived = data.timeSurvived || 0;
    }

    create() {
        this.sound.play("gameOverMusic", { volume: 0.3 });

        // Formata o tempo em minutos e segundos
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = this.timeSurvived % 60;
        const formattedTime = `${minutes}m ${seconds}s`;

        // Fundo
        this.add
            .image(1920 / 2, 1080 / 2, "gover-background")
            .setDisplaySize(1920, 1080);

        // Botão Retry
        const retryButton = this.add
            .text(960, 750, "RESTAR", {
                fontSize: "28px",
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

        // Hover do botão Retry
        retryButton.on("pointerover", () => {
            retryButton.setStyle({ backgroundColor: "#aa0000" });
        });

        retryButton.on("pointerout", () => {
            retryButton.setStyle({ backgroundColor: "#800000" });
        });

        // Texto do rodape do botao retry
         this.add
            .text(960, 790, "Tente Novamente...", {
                fontSize: "17px",
                color: "#888",
            })
            .setOrigin(0.5);

        // Caixa das Estatisticas
        const statsBg = this.add.rectangle(960, 480, 500, 260, 0x000000, 0.6);
        statsBg.setStrokeStyle(4, 0x800000);

        // Estatisticas
        this.add
            .text(960, 380, `ESTATÍSTICAS`, {
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(960, 430, `Pontos: ${this.score}`, {
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(960, 480, `Rounds Sobrevividos: ${this.round}`, {
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.add
            .text(960, 520, `Tempo Sobrevivido: ${formattedTime}`, {
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5);


        // Clique no botão
        retryButton.on("pointerdown", () => {
            this.sound.stopAll();
            this.sound.play("clickButton", { volume: 0.1 });
            this.scene.stop("SurvivalGame");
            this.scene.start("SurvivalGame");
        });
    }
}
