// Importa a classe Game do Phaser
import { Game } from 'phaser';

// Importa as cenas que serão usadas
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { SurvivalGame } from './scenes/SurvivalGame';
import { GameOver } from './scenes/GameOver';
import { Cutscene } from './scenes/Cutscene';

// Objeto de configuração do jogo
const config = {
    type: Phaser.AUTO, // Phaser escolhe automaticamente entre WebGL ou Canvas
    width: 1920,       // Largura da tela
    height: 1080,       // Altura da tela
    parent: 'game-container', // ID da div onde o jogo será renderizado
    backgroundColor: '#000000', // Cor de fundo do jogo
    scale: {
        mode: Phaser.Scale.FIT, // Faz o jogo se ajustar ao tamanho da tela
        autoCenter: Phaser.Scale.CENTER_BOTH // Centraliza o jogo horizontal e verticalmente
    },
    physics: {
        default: 'arcade', // Define o tipo de física usada
        arcade: {
            gravity: { y: 0 }, // Sem gravidade, pois o jogador se move livremente
            debug: true // Se true, mostra os contornos dos objetos físicos
        }
    },
    scene: [Boot, Preloader, MainMenu, SurvivalGame, GameOver, Cutscene]

};

// Cria e exporta a instância do jogo
export default new Game(config);
