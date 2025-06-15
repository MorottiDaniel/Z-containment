import Phaser from "phaser";

export class SurvivalGame extends Phaser.Scene {

    // 1. Construtor da classe
    constructor() {
        super("SurvivalGame");
        this.initialPlayerMaxHp = 4; // Vida máxima inicial do jogador
        this.playerMaxHp = this.initialPlayerMaxHp; // Vida máxima atual do personagem
        this.playerHp = this.playerMaxHp; // Vida inicial do personagem
        this.playerDamage = 1; // Dano base do jogador
        this.canRevive = false; // Flag para o perk de reviver
        this.revivedOnce = false; // Flag para controlar se o jogador já reviveu
        this.score = 0; // Pontuação do jogo
        this.round = 1; // Rodada atual
        this.zombieBaseSpeed = 50; // Velocidade base dos zumbis
        this.zombieBaseHp = 3; // HP base dos zumbis
        this.invulnerable = false; // Flag de invulnerabilidade do jogador
        this.invulnerableTime = 1000; // Tempo de invulnerabilidade (1 segundo)
        this.money = 0; // Dinheiro do jogador
        this.purchasedUpgrades = new Set(); // Armazena upgrades já comprados
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }]; // Arma inicial
        this.currentWeaponIndex = 0; // Índice da arma atual equipada
        this.lastShotTime = 0; // Controla o tempo do último disparo
        this.playerBaseSpeed = 120; // Velocidade base do jogador
        this.playerCurrentSpeed = 120; // Velocidade atual do jogador

        // PROPRIEDADES PARA REGENERAÇÃO DE VIDA
        this.lastHitTime = 0; // Tempo em que o jogador tomou o último dano
        this.regenerationDelay = 5000; // 5 segundos sem tomar dano para iniciar a regeneração
        this.regenerationInterval = 500; // Regenera vida a cada 0.5 segundos
        this.regenerationAmount = 1; // Quantidade de vida regenerada por tick
        this.regenerationTimer = null; // Referência para o timer de regeneração
    }

    // 2. Pré-carregamento de assets


    // 3. Funções de Criação (todos os creates)

    // Função principal de criação da cena
    create() {
        this.sound.play("survivalMusic", { volume: 0.2, loop: true });
        // Resetar vida máxima para o valor inicial ao iniciar a cena
        this.playerMaxHp = this.initialPlayerMaxHp;

        // Zerando/Inicializando outros status ao iniciar a cena
        this.playerHp = this.playerMaxHp;
        this.invulnerable = false;
        this.score = 0;
        this.round = 1;
        this.zombieBaseSpeed = 50;
        this.zombieBaseHp = 3;
        this.money = 10000;
        this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
        this.currentWeaponIndex = 0;
        this.purchasedUpgrades = new Set();
        this.playerCurrentSpeed = this.playerBaseSpeed;

        // Inicialização para Regeneração de Vida
        this.lastHitTime = this.time.now;
        this.startHealthRegeneration();

        // Configuração do Tilemap
        const map = this.make.tilemap({ key: "map" });
        this.map = map;
        const tileset01 = map.addTilesetImage("Zombie_Tileset", "tilesRefe");
        const tileset02 = map.addTilesetImage("Perks", "tilesPeks");
        // ----- CORREÇÃO AQUI -----
        const tileset03 = map.addTilesetImage("armas_parede", "tilesArmas");

        // Encontrar ponto de spawn do jogador
        const spawnPoint = map.findObject("playe", obj => obj.name === "Spawn");

        // Criação das camadas do mapa
        const camdaLimite = map.createLayer("Limite", tileset01, 0, 0);
        camdaLimite.setCollisionByProperty({ colisao: true });
        this.camadaLimite = camdaLimite; // Armazena para uso posterior
        const camadaChao = map.createLayer("Chao", tileset01, 0, 0);
        const camadaObjetosScolider = map.createLayer("ObjetosScolider", tileset01, 0, 0);
        const camadaObjetosColider = map.createLayer("ObjetosColider", tileset01, 0, 0);
        camadaObjetosColider.setDepth(10);
        camadaObjetosColider.setCollisionByProperty({ colisao: true });
        camadaObjetosColider.setCollisionByProperty({ colisao_p: true });
        this.camadaObjetosColider = camadaObjetosColider; // Armazena para uso posterior

        const camadaPerks = map.createLayer("Perks", tileset02, 0, 0);
        camadaPerks.setCollisionByProperty({ colisao: true });
        this.camadaPerks = camadaPerks;
        camadaPerks.setDepth(10);

        // Usa o tileset correto (tileset03) para criar a camada de armas
        const camadaArmas = map.createLayer("Armas", tileset03, 0, 0);
        camadaArmas.setDepth(10);

        const camadaAcessorios = map.createLayer("Acessorios", tileset01, 0, 0);
        camadaAcessorios.setDepth(10);


        // Criação do jogador
        if (spawnPoint) {
            this.createPlayer(spawnPoint.x, spawnPoint.y);
        } else {
            console.warn("Ponto de spawn não encontrado! Usando posição padrão.");
            this.createPlayer(100, 100);
        }

        // Configuração de inputs, grupos e obstáculos
        this.createInputs();
        this.createGroups();
        this.createObstacles();
        this.createUI(); // Cria elementos da UI
        this.createUpgradeAreas(); // Cria áreas de perks
        this.createWeaponAreas(); // Cria áreas de armas
        this.createUpgradeInput(); // Escuta inputs para perks
        this.createWeaponInput(); // Escuta inputs para armas

        // Configuração de colisões
        this.setupCollisions();

        // Configuração de tiro com mouse
        this.setupMouseShoot();

        // Inicialização de timers de jogo
        this.startZombieSpawner();
        this.startRoundTimer();

        // Listener de scroll do mouse para troca de armas
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const numWeapons = this.weapons.length;
            if (numWeapons <= 1) return;

            if (deltaY > 0) { // Scroll para baixo (próxima arma)
                this.currentWeaponIndex = (this.currentWeaponIndex + 1) % numWeapons;
            } else if (deltaY < 0) { // Scroll para cima (arma anterior)
                this.currentWeaponIndex = (this.currentWeaponIndex - 1 + numWeapons) % numWeapons;
            }
        });

        // Configuração da câmera e limites do mundo
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(3.5);

        // Modificando cursor do mouse
        this.input.setDefaultCursor('url(assets/imagens/crosshair.png) 32 32, pointer');
    }

    createPlayer(x, y) {
        this.player = this.physics.add.sprite(x, y, 'player_parado_down');
        this.player.setDisplaySize(16, 16);
        this.player.setOrigin(0.5);
        this.player.body.setCollideWorldBounds(true);
        this.player.setDepth(5);

        // Controle de animação
        this.player.frameToggleTime = 0;
        this.player.frameToggleState = false;
        this.player.isTakingDamage = false;
        this.player.hitFrameToggle = false;
        this.player.hitFrameToggleTime = 0;

        // 🔥 Começa olhando pra baixo
        this.player.lastDirection = 'down';
    }

    createInputs() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D");
    }

    createGroups() {
        this.zombies = this.physics.add.group();
        this.bullets = this.physics.add.group();
    }

    createObstacles() {
        this.obstacles = this.physics.add.staticGroup();
        const positions = [
            { x: 800, y: 1000 },
            { x: 1200, y: 1100 },
            { x: 1600, y: 950 },
            { x: 1000, y: 1400 },
        ];
        positions.forEach((pos) => {
            const obs = this.obstacles.create(pos.x, pos.y, "obstacle");
            obs.setScale(0.5).refreshBody();
        });
    }

    createUI() {
        this.healthBarBg = this.add
            .rectangle(20, 20, 104, 14, 0x000000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.healthBar = this.add
            .rectangle(22, 22, 100, 10, 0xff0000)
            .setScrollFactor(0)
            .setOrigin(0);
        this.scoreText = this.add
            .text(20, 40, "Pontos: 0", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.roundText = this.add
            .text(20, 60, "Round: 1", { fontSize: "16px", fill: "#ffffff" })
            .setScrollFactor(0);
        this.moneyText = this.add
            .text(20, 80, 'Dinheiro: 0', { fontSize: '16px', fill: '#ffffff' })
            .setScrollFactor(0);
        this.weaponText = this.add
            .text(20, 100, 'Arma: Pistol', { fontSize: '16px', fill: '#ffffff' })
            .setScrollFactor(0);

        this.perkIcons = [];
        this.perkIconStartX = 20;
        this.perkIconStartY = this.scale.height - 40;

        const slotWidth = 140;
        const slotHeight = 40;
        const slotMargin = 10;
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        this.weaponSlot2Bg = this.add
            .rectangle(screenWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot2Text = this.add
            .text(this.weaponSlot2Bg.x - (slotWidth / 2), this.weaponSlot2Bg.y - (slotHeight / 2), '2: Empty', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);

        this.weaponSlot1Bg = this.add
            .rectangle(screenWidth - slotMargin - slotWidth - slotMargin, screenHeight - slotMargin, slotWidth, slotHeight, 0x333333)
            .setScrollFactor(0)
            .setOrigin(1, 1);
        this.weaponSlot1Text = this.add
            .text(this.weaponSlot1Bg.x - (slotWidth / 2), this.weaponSlot1Bg.y - (slotHeight / 2), '1: Pistol', { fontSize: '14px', fill: '#ffffff', align: 'center' })
            .setScrollFactor(0)
            .setOrigin(0.5);
    }

    createUpgradeAreas() {
        this.upgradeAreas = [];

        // Texto flutuante sobre o jogador
        this.upgradeText = this.add.text(0, 0, '', {
            fontSize: '10px',
            fill: '#ffff00',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(1).setVisible(false).setDepth(20);

        const perkPointReviver = this.map.findObject("perkPoint", obj => obj.name === "perk_reviver");
        if (!perkPointReviver) {
            console.error("ERRO: O objeto 'perk_reviver' não foi encontrado na camada 'perkPoint' do mapa.");
            // Se você não encontrou, não adianta continuar, então saímos da função.
            return;
        }
        const perkPointForca = this.map.findObject("perkPoint", obj => obj.name === "perk_forca");
        if (!perkPointForca) {
            console.error("ERRO: O objeto 'perk_forca' não foi encontrado na camada 'perkPoint' do mapa.");
            // Se você não encontrou, não adianta continuar, então saímos da função.
            return;
        }
        const perkPointResistencia = this.map.findObject("perkPoint", obj => obj.name === "perk_resistencia");
        if (!perkPointResistencia) {
            console.error("ERRO: O objeto 'perk_resistencia' não foi encontrado na camada 'perkPoint' do mapa.");
            // Se você não encontrou, não adianta continuar, então saímos da função.
            return;
        }
        const perkPointRecarga = this.map.findObject("perkPoint", obj => obj.name === "perk_recarga");
        if (!perkPointRecarga) {
            console.error("ERRO: O objeto 'perk_recarga' não foi encontrado na camada 'perkPoint' do mapa.");
            // Se você não encontrou, não adianta continuar, então saímos da função.
            return;
        }
        const areaData = [
            {
                x: perkPointForca.x,
                y: perkPointForca.y,
                width: perkPointForca.width,   // Usamos a largura do objeto do Tiled
                height: perkPointForca.height,
                cost: 2000,
                upgrade: 'forca'
            },
            {
                x: perkPointReviver.x,
                y: perkPointReviver.y,
                width: perkPointReviver.width,   // Usamos a largura do objeto do Tiled
                height: perkPointReviver.height, // Usamos a altura do objeto do Tiled
                cost: 1500,
                upgrade: 'reviver'
            },
            {
                x: perkPointResistencia.x,
                y: perkPointResistencia.y,
                width: perkPointResistencia.width,   // Usamos a largura do objeto do Tiled
                height: perkPointResistencia.height,
                cost: 2500,
                upgrade: 'resistencia'
            },

            {
                x: perkPointRecarga.x,
                y: perkPointRecarga.y,
                width: perkPointRecarga.width,   // Usamos a largura do objeto do Tiled
                height: perkPointRecarga.height,
                cost: 3000,
                upgrade: 'recarga'
            }
        ];

        // 4. Criamos os retângulos usando os dados do array
        areaData.forEach((data) => {
            // Usamos .setOrigin(0,0) para alinhar corretamente com a posição do Tiled
            const area = this.add.rectangle(data.x, data.y, data.width, data.height, 0xffffff, 0.2)
                .setOrigin(0, 0);

            this.physics.add.existing(area, true); // true para ser estático

            area.cost = data.cost;
            area.upgradeType = data.upgrade;
            area.upgradeName = {
                forca: 'double hit',
                reviver: 'quick resurrect',
                resistencia: 'juggermax',
                recarga: 'fast chug'
            }[data.upgrade];
            area.message = `pressione E para ${area.upgradeName} (${area.cost})`;
            this.upgradeAreas.push(area);
        });

        this.currentUpgradeArea = null;
    }

    createWeaponAreas() {
        this.weaponAreas = [];

        // 1. Definimos os dados de cada arma.
        //    O 'tiledName' deve ser EXATAMENTE igual ao nome do objeto no Tiled.
        //    O 'internalName' é o que usamos internamente no jogo (ex: para as estatísticas).
        const weaponDefinitions = [
            { tiledName: 'sniper', internalName: 'sniper', cost: 1500 },
            { tiledName: 'minigun', internalName: 'minigun', cost: 3000 },
            { tiledName: 'doze', internalName: 'shotgun', cost: 2500 }, // Mapeando 'doze' para 'shotgun'
            { tiledName: 'rifre', internalName: 'rifle', cost: 2000 }  // Mapeando 'rifre' para 'rifle'
        ];

        // 2. Iteramos sobre cada definição para criar sua área de compra.
        weaponDefinitions.forEach(def => {
            // 3. Encontramos o objeto correspondente no mapa Tiled.
            const weaponPoint = this.map.findObject("armaPoint", obj => obj.name === def.tiledName);

            // Uma verificação de segurança, caso o objeto não seja encontrado.
            if (!weaponPoint) {
                console.error(`ERRO: O objeto de arma '${def.tiledName}' não foi encontrado na camada 'armaPoint' do mapa.`);
                return; // Continua para a próxima arma na lista.
            }

            // 4. Criamos a área de trigger (um retângulo invisível) usando as coordenadas do Tiled.
            const area = this.add.rectangle(
                weaponPoint.x,
                weaponPoint.y,
                weaponPoint.width,
                weaponPoint.height,
                0x00ff00, // Cor verde para debug, pode remover a cor depois (deixar 0)
                0.2       // Alfa para debug, pode ser 0 para ficar invisível
            ).setOrigin(0, 0);

            this.physics.add.existing(area, true); // Adiciona física estática à área

            // 5. Anexamos as propriedades da arma à área, para usarmos na hora da compra.
            area.cost = def.cost;
            area.weaponType = def.internalName; // Usamos o nome interno consistente.
            area.message = `Pressione R para comprar ${area.weaponType} (${area.cost})`;

            // Adicionamos a área pronta ao nosso array de áreas de armas.
            this.weaponAreas.push(area);
        });

        this.currentWeaponArea = null;
    }

    createUpgradeInput() {
        this.input.keyboard.on('keydown-E', () => {
            if (this.currentUpgradeArea) {
                const area = this.currentUpgradeArea;
                if (this.purchasedUpgrades.has(area.upgradeType)) {
                    this.sound.play("error", { volume: 0.2 });
                    this.upgradeText.setText('Upgrade já comprado');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    return;
                }
                if (this.money >= area.cost) {
                    this.money -= area.cost;
                    this.sound.play("upgrade", { volume: 0.2 });
                    this.purchasedUpgrades.add(area.upgradeType);
                    switch (area.upgradeType) {
                        case 'forca':
                            this.playerDamage = 2;
                            this.weapons.forEach(weapon => weapon.damage *= 2);
                            break;
                        case 'reviver':
                            this.canRevive = true;
                            break;
                        case 'resistencia':
                            this.playerMaxHp += 2;
                            this.playerHp += 2;
                            break;
                        case 'velocidade':
                            this.playerCurrentSpeed = this.playerBaseSpeed * 1.3;
                            break;
                    }
                    this.addPerkIcon(area.upgradeType);
                    this.upgradeText.setText(`Upgrade de ${area.upgradeType} comprado!`);
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                } else {
                    this.sound.play("error", { volume: 0.2 });
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                }
            }
        });
    }

    createWeaponInput() {
        this.input.keyboard.on('keydown-R', () => {
            if (this.currentWeaponArea) {
                const area = this.currentWeaponArea;
                if (this.money >= area.cost) {
                    const weaponStats = {
                        minigun: { type: 'minigun', damage: 1.5, fireRate: 100, spread: 5, bulletSpeed: 600 },
                        shotgun: { type: 'shotgun', damage: 2, fireRate: 800, spread: 10, bulletSpeed: 400 },
                        rifle: { type: 'rifle', damage: 1.2, fireRate: 200, spread: 2, bulletSpeed: 700 },
                        sniper: { type: 'sniper', damage: 4, fireRate: 1500, spread: 0, bulletSpeed: 1000 }
                    }[area.weaponType];
                    if (this.weapons.length < 2) {
                        this.sound.play("gunload", { volume: 0.2 });
                        this.money -= area.cost;
                        this.weapons.push(weaponStats);
                        this.currentWeaponIndex = this.weapons.length - 1;
                        this.upgradeText.setText(`Arma ${area.weaponType} comprada e equipada!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    } else {
                        this.sound.play("gunload", { volume: 0.2 });
                        const oldWeaponType = this.weapons[this.currentWeaponIndex].type;
                        this.money -= area.cost;
                        this.weapons[this.currentWeaponIndex] = weaponStats;
                        this.upgradeText.setText(`Arma ${area.weaponType} substituiu ${oldWeaponType} no slot atual!`);
                        this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                        this.upgradeText.setVisible(true);
                        this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                    }
                } else {
                    this.sound.play("error", { volume: 0.2 });
                    this.upgradeText.setText('Dinheiro insuficiente');
                    this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                    this.upgradeText.setVisible(true);
                    this.time.delayedCall(1500, () => { this.upgradeText.setVisible(false); });
                }
            }
        });
    }

    // 4. Funções relacionadas ao Player (movimento, dano, tiro, game over, regeneração, perks)

    handlePlayerMovement() {
        const speed = this.playerCurrentSpeed;
        const body = this.player.body;
        body.setVelocity(0);

        const vx = (this.cursors.left.isDown || this.keys.A.isDown) ? -speed :
            (this.cursors.right.isDown || this.keys.D.isDown) ? speed : 0;

        const vy = (this.cursors.up.isDown || this.keys.W.isDown) ? -speed :
            (this.cursors.down.isDown || this.keys.S.isDown) ? speed : 0;

        body.setVelocityX(vx);
        body.setVelocityY(vy);

        if (this.player.isTakingDamage) {
            // 🔥 Se estiver tomando dano, ignora qualquer animação
            return;
        }

        if (vx !== 0 || vy !== 0) {
            this.simulatePlayerAnimation(this.player, 'player', vx, vy);

            if (Math.abs(vx) > Math.abs(vy)) {
                this.player.lastDirection = (vx > 0) ? 'right' : 'left';
            } else {
                this.player.lastDirection = (vy > 0) ? 'down' : 'up';
            }
        } else {
            this.player.setTexture(`player_parado_${this.player.lastDirection}`);
        }
    }

    //Animação de dano do Player
    playPlayerHitAnimation() {
        this.player.isTakingDamage = true;

        const toggleHitFrame = () => {
            if (!this.player.isTakingDamage) return;

            const now = this.time.now;
            if (now > (this.player.hitFrameToggleTime || 0)) {
                const frame = this.player.hitFrameToggle ? '2' : '1';
                this.player.setTexture(`player_hit_${this.player.lastDirection}${frame}`);
                this.player.hitFrameToggle = !this.player.hitFrameToggle;
                this.player.hitFrameToggleTime = now + 150; // velocidade da troca dos hits
            }

            this.hitTimer = this.time.delayedCall(150, toggleHitFrame);
        };

        toggleHitFrame();

        // 🔥 Após o tempo de invulnerabilidade, encerra o hit
        this.time.delayedCall(this.invulnerableTime, () => {
            this.player.isTakingDamage = false;
            this.player.setTexture(`player_parado_${this.player.lastDirection}`);
        });
    }

    //Animação do Player
    simulatePlayerAnimation(player, baseKey, vx, vy) {
        const now = this.time.now;

        if (Math.abs(vx) > Math.abs(vy)) {
            // Movimento horizontal
            if (vx > 0) {
                if (now > (player.frameToggleTime || 0)) {
                    const next = player.frameToggleState ? `${baseKey}_right2` : `${baseKey}_right`;
                    player.setTexture(next);
                    player.frameToggleState = !player.frameToggleState;
                    player.frameToggleTime = now + 300; // tempo entre os frames
                }
            } else if (vx < 0) {
                if (now > (player.frameToggleTime || 0)) {
                    const next = player.frameToggleState ? `${baseKey}_left2` : `${baseKey}_left`;
                    player.setTexture(next);
                    player.frameToggleState = !player.frameToggleState;
                    player.frameToggleTime = now + 300;
                }
            }
        } else {
            // Movimento vertical
            if (vy > 0) {
                if (now > (player.frameToggleTime || 0)) {
                    const next = player.frameToggleState ? `${baseKey}_down2` : `${baseKey}_down`;
                    player.setTexture(next);
                    player.frameToggleState = !player.frameToggleState;
                    player.frameToggleTime = now + 300;
                }
            } else if (vy < 0) {
                if (now > (player.frameToggleTime || 0)) {
                    const next = player.frameToggleState ? `${baseKey}_up2` : `${baseKey}_up`;
                    player.setTexture(next);
                    player.frameToggleState = !player.frameToggleState;
                    player.frameToggleTime = now + 300;
                }
            }
        }
    }

    handlePlayerHit(player, zombie) {
        if (this.invulnerable) return;

        this.playerHp -= 1;
        this.invulnerable = true;
        this.lastHitTime = this.time.now;

        // 🔥 Começa a animação de hit
        this.playPlayerHitAnimation();

        // 🔥 Tween piscando
        this.sound.play("ouch", { volume: 0.15 });

        this.tweens.add({
            targets: player,
            alpha: 0.5,
            duration: 100,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                this.player.setAlpha(1);
            },
        });

        this.time.delayedCall(this.invulnerableTime, () => {
            this.invulnerable = false;
        });

        if (this.playerHp <= 0) {
            this.gameOver();
        }
    }

    shootBullet() {
        const currentTime = this.time.now;
        const weapon = this.weapons[this.currentWeaponIndex];

        // Verifica tempo do último disparo (fireRate)
        if (currentTime < this.lastShotTime + weapon.fireRate) {
            return;
        }
        this.lastShotTime = currentTime;

        const pointer = this.input.activePointer;
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;

        // 🔊 Sons de disparo por tipo de arma
        const soundKey = {
            pistol: 'pistol_shot',
            minigun: 'minigun_shot',
            shotgun: 'shotgun_shot',
            rifle: 'rifle_shot',
            sniper: 'sniper_shot'
        }[weapon.type];

        if (soundKey) {
            this.sound.play(soundKey, { volume: 0.2 });
        }

        // 🔫 Se for shotgun, gera vários projéteis
        if (weapon.type === 'shotgun') {
            const numPellets = 5;
            for (let i = 0; i < numPellets; i++) {
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
                const angleVariation = (Math.random() - 0.5) * (weapon.spread / 100);
                const finalAngle = angle + angleVariation;

                const bullet = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0xffff00);
                this.physics.add.existing(bullet);
                this.bullets.add(bullet);

                bullet.body.setCollideWorldBounds(true);
                bullet.body.onWorldBounds = true;

                this.physics.velocityFromRotation(finalAngle, weapon.bulletSpeed, bullet.body.velocity);

                this.time.delayedCall(1000, () => bullet.destroy());
            }
        } else {
            // 🔫 Para armas normais
            const bullet = this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xffff00);
            this.physics.add.existing(bullet);
            this.bullets.add(bullet);

            bullet.body.setCollideWorldBounds(true);
            bullet.body.onWorldBounds = true;

            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
            this.physics.velocityFromRotation(angle, weapon.bulletSpeed, bullet.body.velocity);

            this.time.delayedCall(2000, () => bullet.destroy());
        }
    }


    gameOver() {
        if (this.canRevive && !this.revivedOnce) {
            this.revivedOnce = true;
            this.playerMaxHp = this.initialPlayerMaxHp; // Reseta a vida máxima para o valor base ao reviver
            this.playerHp = this.playerMaxHp; // Restaura a vida para a nova vida máxima
            this.money = Math.floor(this.money * 0.5); // Perde metade do dinheiro

            // Limpa perks visuais e reseta armas/upgrades
            this.perkIcons.forEach(icon => icon.destroy());
            this.perkIcons = [];
            this.weapons = [{ type: 'pistol', damage: 1, fireRate: 500, spread: 0, bulletSpeed: 500 }];
            this.currentWeaponIndex = 0;
            this.purchasedUpgrades = new Set();
            this.playerCurrentSpeed = this.playerBaseSpeed;

            // Reseta o tempo do último dano para que a regeneração possa começar após o delay
            this.lastHitTime = this.time.now;

            this.upgradeText.setText('Você reviveu!');
            this.upgradeText.setPosition(this.player.x - 60, this.player.y - 40);
            this.upgradeText.setVisible(true);
            this.time.delayedCall(2000, () => { this.upgradeText.setVisible(false); });
            return;
        }
        this.sound.stopAll();
        this.scene.start("GameOver");
    }

    regenerateHealth() {
        if (this.playerHp < this.playerMaxHp && (this.time.now - this.lastHitTime >= this.regenerationDelay)) {
            this.playerHp = Math.min(this.playerHp + this.regenerationAmount, this.playerMaxHp);
            // console.log("Vida regenerada para: " + this.playerHp); // Para depuração
        }
    }

    addPerkIcon(perkKey) {
        const iconKey = {
            forca: 'perk_forca',
            reviver: 'perk_reviver',
            resistencia: 'perk_resistencia',
            velocidade: 'perk_velocidade'
        }[perkKey];
        if (!iconKey) return;

        const iconX = this.perkIconStartX + this.perkIcons.length * 40;
        const icon = this.add.image(iconX, this.perkIconStartY, iconKey)
            .setScrollFactor(0)
            .setDisplaySize(32, 32);
        this.perkIcons.push(icon);
    }


    // 5. Funções de Atualização (todos os updates)

    // Função principal de atualização da cena
    update() {
        this.handlePlayerMovement();
        this.moveZombiesTowardsPlayer();
        this.updateUI(); // Atualiza elementos da UI
        this.checkUpgradeAreaOverlap(); // Verifica sobreposição com áreas de perk
        this.checkWeaponAreaOverlap(); // Verifica sobreposição com áreas de arma
    }

    updateUI() {
        this.healthBar.width = (this.playerHp / this.playerMaxHp) * 100;
        this.scoreText.setText("Pontos: " + this.score);
        this.roundText.setText("Round: " + this.round);
        this.moneyText.setText("Dinheiro: " + this.money);
        this.weaponText.setText(`Arma: ${this.weapons[this.currentWeaponIndex].type}`);

        const weapon1 = this.weapons[0];
        const weapon2 = this.weapons[1];
        this.weaponSlot1Text.setText(`1: ${weapon1 ? weapon1.type.charAt(0).toUpperCase() + weapon1.type.slice(1) : 'Empty'}`);
        this.weaponSlot2Text.setText(`2: ${weapon2 ? weapon2.type.charAt(0).toUpperCase() + weapon2.type.slice(1) : 'Empty'}`);

        const activeColor = 0x00ff00;
        const inactiveColor = 0x333333;
        this.weaponSlot1Bg.setFillStyle(this.currentWeaponIndex === 0 ? activeColor : inactiveColor);
        this.weaponSlot2Bg.setFillStyle(this.currentWeaponIndex === 1 ? activeColor : inactiveColor);
    }

    moveZombiesTowardsPlayer() {
        this.zombies.children.iterate((zombie) => {
            if (!zombie.active) return;

            // 🔥 Zumbi inteligente (smart) com desvio de obstáculos
            if (zombie.type === "smart") {
                const angleToPlayer = Phaser.Math.Angle.Between(zombie.x, zombie.y, this.player.x, this.player.y);
                const distanceToPlayer = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);

                const ray = new Phaser.Geom.Line(
                    zombie.x, zombie.y,
                    zombie.x + Math.cos(angleToPlayer) * distanceToPlayer,
                    zombie.y + Math.sin(angleToPlayer) * distanceToPlayer
                );

                let hit = false;
                this.obstacles.children.iterate((obstacle) => {
                    if (Phaser.Geom.Intersects.LineToRectangle(ray, obstacle.getBounds())) {
                        hit = true;
                        return false;
                    }
                });

                if (hit) {
                    const perpendicularAngle = angleToPlayer + Math.PI / 2;
                    this.physics.velocityFromRotation(perpendicularAngle, zombie.speed, zombie.body.velocity);
                } else {
                    this.physics.moveToObject(zombie, this.player, zombie.speed);
                }
            } else {
                // 🔥 Movimento padrão dos outros zumbis (tank, fast, boss)
                this.physics.moveToObject(zombie, this.player, zombie.speed);
            }

            // 🔥 Sistema de animação direcional para todos os tipos
            const vx = zombie.body.velocity.x;
            const vy = zombie.body.velocity.y;

            if (zombie.type === "tank") {
                this.simulateDirectionalAnimation(zombie, 'tank', vx, vy);
            } else if (zombie.type === "fast") {
                this.simulateDirectionalAnimation(zombie, 'fast', vx, vy);
            } else if (zombie.type === "smart") {
                this.simulateDirectionalAnimation(zombie, 'smart', vx, vy);
            } else if (zombie.type === "boss") {
                this.simulateDirectionalAnimation(zombie, 'boss', vx, vy);
            }
        });
    }

    checkUpgradeAreaOverlap() {
        let inArea = false;
        for (const area of this.upgradeAreas) {
            const boundsA = this.player.getBounds();
            const boundsB = area.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB)) {
                inArea = true;
                this.currentUpgradeArea = area;
                this.upgradeText.setText(area.message);
                this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                this.upgradeText.setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentUpgradeArea = null;
            if (!this.currentWeaponArea || !this.upgradeText.visible) {
                this.upgradeText.setVisible(false);
            }
        }
    }

    checkWeaponAreaOverlap() {
        let inArea = false;
        for (const area of this.weaponAreas) {
            const boundsA = this.player.getBounds();
            const boundsB = area.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB)) {
                inArea = true;
                this.currentWeaponArea = area;
                this.upgradeText.setText(area.message);
                this.upgradeText.setPosition(this.player.x - 90, this.player.y - 50);
                this.upgradeText.setVisible(true);
                break;
            }
        }
        if (!inArea) {
            this.currentWeaponArea = null;
            if (!this.currentUpgradeArea) {
                this.upgradeText.setVisible(false);
            }
        }
    }


    // 6. Funções relacionadas a Zumbis (spawn, hit, animação)

    spawnZombie() {
        const types = ["fast", "tank", "smart"];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        let zombieSpeed = this.zombieBaseSpeed;
        let zombieHp = this.zombieBaseHp;
        let zombie;

        // 🔥 Define posição nas bordas do mapa
        const edge = Phaser.Math.Between(0, 3);
        let x, y;

        if (edge === 0) { x = Phaser.Math.Between(0, this.physics.world.bounds.width); y = -50; }
        else if (edge === 1) { x = this.physics.world.bounds.width + 50; y = Phaser.Math.Between(0, this.physics.world.bounds.height); }
        else if (edge === 2) { x = Phaser.Math.Between(0, this.physics.world.bounds.width); y = this.physics.world.bounds.height + 50; }
        else { x = -50; y = Phaser.Math.Between(0, this.physics.world.bounds.height); }

        // 🔥 Criação de zumbis por tipo
        if (type === "fast") {
            zombieSpeed *= 1.5;
            zombieHp = 1;

            zombie = this.physics.add.sprite(x, y, 'fast_down');
            zombie.setDisplaySize(16, 16);
        } else if (type === "tank") {
            zombieSpeed *= 0.4;
            zombieHp = 8;

            zombie = this.physics.add.sprite(x, y, 'tank_down');
            zombie.setDisplaySize(32, 32);
        } else if (type === "smart") {
            zombieSpeed *= 1.2;
            zombieHp = 3;

            zombie = this.physics.add.sprite(x, y, 'smart_down');
            zombie.setDisplaySize(16, 20);
        }

        zombie.setOrigin(0.5);
        zombie.setDepth(5);

        // 🔥 Propriedades comuns
        zombie.hp = zombieHp;
        zombie.speed = zombieSpeed;
        zombie.type = type;

        // 🔥 Controle de animação e hit
        zombie.frameToggleTime = 0;
        zombie.frameToggleState = false;
        zombie.isTakingDamage = false;
        zombie.hitFrameToggle = false;

        // 🔥 Salva o tamanho original
        zombie.originalWidth = zombie.displayWidth;
        zombie.originalHeight = zombie.displayHeight;

        this.zombies.add(zombie);
    }

    spawnBossZombie() {
        const margin = 100;
        const worldWidth = 2000;
        const worldHeight = 2000;

        const side = Phaser.Math.Between(0, 3);
        let x, y;
        switch (side) {
            case 0: x = Phaser.Math.Between(0, worldWidth); y = -margin; break;
            case 1: x = Phaser.Math.Between(0, worldWidth); y = worldHeight + margin; break;
            case 2: x = -margin; y = Phaser.Math.Between(0, worldHeight); break;
            case 3: x = worldWidth + margin; y = Phaser.Math.Between(0, worldHeight); break;
        }

        const boss = this.physics.add.sprite(x, y, 'boss_down');
        boss.setDisplaySize(48, 48);
        boss.setOrigin(0.5);
        boss.setDepth(5);

        boss.hp = this.zombieBaseHp * 5;
        boss.speed = this.zombieBaseSpeed * 0.8;
        boss.type = "boss";


        boss.frameToggleTime = 0;
        boss.frameToggleState = false;
        boss.isTakingDamage = false;
        boss.hitFrameToggle = false;

        boss.originalWidth = boss.displayWidth;
        boss.originalHeight = boss.displayHeight;

        this.zombies.add(boss);
        boss.body.setCollideWorldBounds(true);
    }
    //Função que indentifica que o zumbie recebeu um hit

    hitZombie(bullet, zombie) {
        if (!zombie || !zombie.active) return;

        bullet.destroy();

        zombie.hp -= this.weapons[this.currentWeaponIndex].damage;
        this.money += 10;

        if (zombie.hp > 0) {
            // 🔥 Animação de hit (dinâmica)
            this.playZombieHitAnimation(zombie, zombie.type);

            this.tweens.add({
                targets: zombie,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
            });
        }

        if (zombie.hp <= 0) {
            this.killZombie(zombie);
            this.score += 100;
            this.money += 100;
        }
    }

    //Função auxiliar para fazer a troca de sangue
    killZombie(zombie) {
        if (zombie.body) {
            zombie.body.setVelocity(0, 0);
            zombie.body.enable = false;
        }

        const frames = ['blood_splash1', 'blood_splash2', 'blood_splash3'];
        const blood = this.add.image(zombie.x, zombie.y, frames[0]);
        blood.setDepth(1);
        blood.setAngle(Phaser.Math.Between(0, 360));
        blood.setScale(Phaser.Math.FloatBetween(0.8, 1.2));

        let frameIndex = 0;

        const splashAnimation = this.time.addEvent({
            delay: 250,
            repeat: frames.length - 2,
            callback: () => {
                frameIndex++;
                blood.setTexture(frames[frameIndex]);
            }
        });

        this.time.delayedCall(2000, () => {
            blood.destroy();
        });

        zombie.destroy();
    }

    //Função de animação do sangue quando os zumbies morrem
    spawnBloodEffect(x, y) {
        const tileSize = 16;
        const bloodX = Math.floor(x / tileSize) * tileSize + tileSize / 2;
        const bloodY = Math.floor(y / tileSize) * tileSize + tileSize / 2;

        const frames = ['blood_splash1', 'blood_splash2', 'blood_splash3'];
        const blood = this.add.image(bloodX, bloodY, frames[0]);
        blood.setOrigin(0.5, 0.5);
        blood.setScale(1);
        blood.setAlpha(1);
        blood.setDepth(-1);

        let frameIndex = 0;

        this.time.addEvent({
            delay: 100,
            repeat: frames.length - 1,
            callback: () => {
                frameIndex++;
                if (frameIndex < frames.length) {
                    blood.setTexture(frames[frameIndex]);
                }
            }
        });

        this.time.delayedCall(2000, () => {
            blood.destroy();
        });
    }

    //Função para dar animação do dano dependendo da posição do zumbie

    playZombieHitAnimation(zombie, baseKey) {
        if (!zombie || !zombie.active) return;

        zombie.isTakingDamage = true;

        const currentWidth = zombie.originalWidth;
        const currentHeight = zombie.originalHeight;

        // 🧠 Detecta direção
        let direction = '';
        const textureKey = zombie.texture.key;

        if (textureKey.includes('left')) direction = 'left';
        else if (textureKey.includes('right')) direction = 'right';
        else if (textureKey.includes('up')) direction = 'up';
        else direction = 'down';

        const next = zombie.hitFrameToggle
            ? `${baseKey}_${direction}_hit2`
            : `${baseKey}_${direction}_hit`;

        zombie.setTexture(next);
        zombie.setDisplaySize(currentWidth, currentHeight);
        zombie.hitFrameToggle = !zombie.hitFrameToggle;

        this.time.delayedCall(100, () => {
            if (!zombie || !zombie.active) return;

            const nextHit = zombie.hitFrameToggle
                ? `${baseKey}_${direction}_hit2`
                : `${baseKey}_${direction}_hit`;

            zombie.setTexture(nextHit);
            zombie.setDisplaySize(currentWidth, currentHeight);
            zombie.hitFrameToggle = !zombie.hitFrameToggle;
        });

        this.time.delayedCall(200, () => {
            if (zombie && zombie.active) {
                zombie.isTakingDamage = false;
            }
        });
    }

    fixSpriteScale(sprite) {
        sprite.setDisplaySize(sprite.displayWidth, sprite.displayHeight);
    }
    //Função para adicionar a troca de png dos zumbies

    simulateDirectionalAnimation(zombie, baseKey, vx, vy) {
        const now = this.time.now;

        const width = zombie.originalWidth;
        const height = zombie.originalHeight;

        if (Math.abs(vx) > Math.abs(vy)) {
            if (vx > 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_right2` : `${baseKey}_right`;
                    zombie.setTexture(next);
                    zombie.setDisplaySize(width, height);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            } else if (vx < 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_left2` : `${baseKey}_left`;
                    zombie.setTexture(next);
                    zombie.setDisplaySize(width, height);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            }
        } else {
            if (vy > 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_down2` : `${baseKey}_down`;
                    zombie.setTexture(next);
                    zombie.setDisplaySize(width, height);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            } else if (vy < 0) {
                if (now > zombie.frameToggleTime) {
                    const next = zombie.frameToggleState ? `${baseKey}_up2` : `${baseKey}_up`;
                    zombie.setTexture(next);
                    zombie.setDisplaySize(width, height);
                    zombie.frameToggleState = !zombie.frameToggleState;
                    zombie.frameToggleTime = now + 500;
                }
            }
        }
        if (zombie.isTakingDamage) return;
    }

    // 7. Funções de Timer e Spawners

    startZombieSpawner() {
        this.zombieTimer = this.time.addEvent({
            delay: 5000,
            callback: () => {
                const zombiesInWave = Phaser.Math.Between(3, 6);
                for (let i = 0; i < zombiesInWave; i++) {
                    this.spawnZombie();
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    startRoundTimer() {
        this.roundTimer = this.time.addEvent({
            delay: 30000, // 30 segundos por round
            callback: () => {
                this.round++;
                this.zombieBaseHp += 1;
                this.zombieBaseSpeed += 10;
                if (this.round % 3 === 0) {
                    this.spawnBossZombie();
                }
            },
            callbackScope: this,
            loop: true,
        });
    }

    startHealthRegeneration() {
        if (this.regenerationTimer) {
            this.regenerationTimer.destroy();
        }
        this.regenerationTimer = this.time.addEvent({
            delay: this.regenerationInterval,
            callback: this.regenerateHealth,
            callbackScope: this,
            loop: true
        });
    }

    // 8. Configurações de Colisões

    setupCollisions() {
        this.physics.add.collider(this.player, this.camadaObjetosColider);
        this.physics.add.collider(this.player, this.camadaLimite);

        this.physics.add.collider(this.zombies, this.camadaLimite);
        this.physics.add.collider(this.zombies, this.obstacles)

        this.physics.add.collider(
            this.zombies,
            this.camadaObjetosColider,
            null, // Nenhum callback de colisão (só queremos que eles parem)
            (zombie, tile) => {
                // Esta função é o FILTRO. Ela decide se a colisão deve acontecer.
                // Retorna 'true' para colidir, 'false' para ignorar.
                // Nós queremos que a colisão seja ignorada se o tile tiver a propriedade 'colisao_p'.
                return !tile.properties.colisao_p;
            },
            this
        );

        // Resto das colisões
        this.physics.add.overlap(this.zombies, this.player, this.handlePlayerHit, null, this);
        this.physics.add.overlap(this.bullets, this.zombies, this.hitZombie, null, this);
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.zombies, this.obstacles);
        this.physics.add.collider(this.bullets, this.obstacles, (bullet) => bullet.destroy());
        this.physics.add.collider(this.bullets, this.camadaObjetosColider, (bullet) => bullet.destroy());
    }

    // 9. Configuração de Tiro (mouse)

    setupMouseShoot() {
        this.input.on("pointerdown", () => { this.shootBullet(); });
    }
}