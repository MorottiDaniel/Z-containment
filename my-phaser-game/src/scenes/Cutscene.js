import Phaser from "phaser";

export class Cutscene extends Phaser.Scene {
    constructor() {
        super("Cutscene");
        this.slides = [];
        this.texts = [];
        this.currentSlideIndex = 0;
    }

    preload() {
        this.load.image("cutscene1", "assets/imagens/cutscene1.png");
        this.load.image("cutscene2", "assets/imagens/cutscene2.png");
        this.load.image("cutscene3", "assets/imagens/cutscene3.png");
        this.load.image("cutscene4", "assets/imagens/cutscene4.png");
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const storyTexts = [
            "Em uma instalação subterrânea, o Professor Cid comandava um experimento com uma nova espécie de fungo: Hughos fumeris.\n\nO objetivo? Regeneração celular, fim da calvície, imunidade total e... paciência para assistir às aulas de Empreendedorismo e Mentalidade Criativa.",
            "Mas o impensável aconteceu. A cobaia saiu do controle e atacou os cientistas — começando, é claro, pelo Professor Cid... e os carecas.\n\nEsse dia ficou marcado na história como: o Dia Z.",
            "Com todos os calvos devorados, os zumbis ficaram sem alimento.\n\nE quando a fome bateu... eles partiram para cima das pessoas normais.",
            "Você é um dos últimos sobreviventes.\n\nAgora, não se trata mais de salvar o mundo... mas sim de sobreviver por mais um round.",
        ];

        const images = ["cutscene1", "cutscene2", "cutscene3", "cutscene4"];

        this.slides = images.map((key, i) =>
            this.add.image(centerX, centerY, key).setVisible(i === 0)
        );

        this.texts = storyTexts.map((text, i) =>
            this.add
                .text(this.scale.width / 2, this.scale.height - 50, text, {
                    fontSize: "32px",
                    color: "#ffffff",
                    wordWrap: { width: this.scale.width * 0.8 },
                    backgroundColor: "#000000cc",
                    padding: { x: 20, y: 20 },
                    align: "center",
                })
                .setOrigin(0.5, 1)
                .setVisible(i === 0)
        );

        this.input.on("pointerdown", () => this.nextSlide());

        // Botão "Pular >>" no canto inferior direito
        this.add
            .text(this.scale.width - 20, this.scale.height - 20, "Pular >>", {
                fontSize: "24px",
                fontFamily: "Arial",
                color: "#ffffff",
                backgroundColor: "#000000aa",
                padding: { x: 12, y: 6 },
            })
            .setOrigin(1) // âncora inferior direita
            .setInteractive()
            .on("pointerdown", () => this.scene.start("MainMenu"));
    }

    nextSlide() {
        this.slides[this.currentSlideIndex].setVisible(false);
        this.texts[this.currentSlideIndex].setVisible(false);
        this.currentSlideIndex++;

        if (this.currentSlideIndex >= this.slides.length) {
            this.scene.start("MainMenu");
        } else {
            this.slides[this.currentSlideIndex].setVisible(true);
            this.texts[this.currentSlideIndex].setVisible(true);
        }
    }
}
