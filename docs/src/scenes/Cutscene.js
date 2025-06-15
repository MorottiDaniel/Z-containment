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
        // Música de fundo da cutscene
        this.cutsceneMusic = this.sound.add("cutsceneMusic", {
            loop: true,
            volume: 0.4,
        });
        this.cutsceneMusic.play();

        // Efeitos sonoros (criados no início para poder parar a qualquer momento)
        this.alarme = this.sound.add("alarme", { volume: 0.1 });
        this.gritinho = this.sound.add("gritinho", { volume: 0.2 });
        this.zumbi = this.sound.add("zumbi", { volume: 0.1 });

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const storyTexts = [
            "Em uma instalação subterrânea, o Professor Cid comandava um experimento com uma nova espécie de fungo: Hughos fumeris.\nO objetivo? Regeneração celular, fim da calvície, imunidade total e... paciência para assistir às aulas de Empreendedorismo e Mentalidade Criativa.",
            "Mas o impensável aconteceu. A cobaia saiu do controle e atacou os cientistas — começando, é claro, pelo Professor Cid... e os carecas.\nEsse dia ficou marcado na história como: o Dia Z.",
            "Com todos os carecas e calvos devorados, os zumbis ficaram sem alimento.\nE quando a fome bateu... eles partiram para cima das pessoas normais.",
            "Você é um dos últimos sobreviventes.\nAgora, não se trata mais de salvar o mundo... mas sim de sobreviver por mais um round.",
        ];

        const images = ["cutscene1", "cutscene2", "cutscene3", "cutscene4"];

        // Cria os slides e textos
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

        // Avançar slide com clique
        this.input.on("pointerdown", () => this.nextSlide());

        // Botão "Pular >>"
        this.add
            .text(this.scale.width - 20, this.scale.height - 20, "Pular >>", {
                fontSize: "24px",
                fontFamily: "Arial",
                color: "#ffffff",
                backgroundColor: "#000000aa",
                padding: { x: 12, y: 6 },
            })
            .setOrigin(1)
            .setInteractive()
            .on("pointerdown", () => {
                this.currentSlideIndex=4;
                this.stopAllEffects(); // Para apenas os efeitos sonoros
                this.sound.play("clickButton", {volume: 0.2});
                this.scene.start("MainMenu"); // Vai para o menu
            });
    }

    nextSlide() {
        this.slides[this.currentSlideIndex].setVisible(false);
        this.texts[this.currentSlideIndex].setVisible(false);
        this.currentSlideIndex++;

        if (this.currentSlideIndex >= this.slides.length) {
            this.stopAllEffects();
            this.scene.start("MainMenu");
        } else {
            this.slides[this.currentSlideIndex].setVisible(true);
            this.texts[this.currentSlideIndex].setVisible(true);

            // Ativa efeitos sonoros por slide
            if (this.currentSlideIndex === 1) {
                this.alarme.play();
                this.gritinho.play();
            }

            if (this.currentSlideIndex === 2) {
                this.zumbi.play();
            }
        }
    }

    // Função que para apenas os efeitos (não para a música da cutscene)
    stopAllEffects() {
        if (this.alarme && this.alarme.isPlaying) this.alarme.stop();
        if (this.gritinho && this.gritinho.isPlaying) this.gritinho.stop();
        if (this.zumbi && this.zumbi.isPlaying) this.zumbi.stop();
    }
}
