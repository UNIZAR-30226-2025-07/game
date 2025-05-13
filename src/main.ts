import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { Player } from "./player";
import { NetworkManager } from "../websockets/NetworkManager";
import './style.css';

const WORLD_SIZE = { width: 10000, height: 10000 };

function parseUuidToUint8Array(uuid: string): Uint8Array | null {
  // Regular expression to validate the UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    // The string does not match the UUID format
    return null;
  }

  // Remove hyphens for easier processing
  const hexString = uuid.replace(/-/g, '');

  // Create a Uint8Array of size 16 (a UUID is 16 bytes)
  const byteArray = new Uint8Array(16);

  // Iterate through the hex string, two characters at a time,
  // convert each pair to a byte and store in the array
  for (let i = 0; i < 32; i += 2) {
    const byteHex = hexString.substring(i, i + 2);
    byteArray[i / 2] = parseInt(byteHex, 16);
  }

  return byteArray;
}

// Función para obtener cookies
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 1. Función de conexión mejorada
async function connectToServer(world: Container, player: Player, gameId?: number) {
  let wsUrl;
  if (gameId) {
    // private
    wsUrl = `ws://${window.location.hostname}:4441/ws`;
  } else {
    // public
    wsUrl = `ws://${window.location.hostname}:4440/ws`;
  }

  console.log("🔗 Conectando a:", wsUrl);

  try {
    const network = new NetworkManager(world, player, wsUrl, gameId);

    // Verificación de conexión
    const checkConnection = setInterval(() => {
      if (!network.isConnected()) {
        console.warn("⏳ Esperando conexión...");
      } else {
        clearInterval(checkConnection);
        console.log("🟢 Conexión establecida");
        console.log("sending join")
        network.sendJoin();
      }
    }, 500);

    return network;
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    throw error;
  }
}


(async () => {

  // 2. Inicialización con manejo de errores
  try {
    const app = new Application({
      antialias: true,
      autoDensity: true,
      resolution: 2,
      backgroundColor: 0x000000
    });

    await app.init({ background: '#000000', resizeTo: window });
    document.body.appendChild(app.canvas);

    // Crear el panel de clasificación
    const leaderboardContainer = new Container();
    const leaderboardBg = new Graphics()
        .beginFill(0x000000, 0.5)
        .drawRoundedRect(0, 0, 200, 150, 10)
        .endFill();

    const leaderboardTitle = new Text("TOP 5 JUGADORES", {
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: 'bold'
    });
    leaderboardTitle.position.set(10, 5);

    // Array para los textos de los jugadores
    const playerScores: Text[] = [];
    for (let i = 0; i < 5; i++) {
        const scoreText = new Text("", {
            fontSize: 14,
            fill: 0xffffff
        });
        scoreText.position.set(10, 30 + i * 23);
        playerScores.push(scoreText);
        leaderboardContainer.addChild(scoreText);
    }

    leaderboardContainer.addChildAt(leaderboardBg, 0);
    leaderboardContainer.addChild(leaderboardTitle);
    leaderboardContainer.position.set(10, 10);

    // Añadir el leaderboard al stage
    app.stage.addChild(leaderboardContainer);

    // Crear el texto de ayuda para pausar
    const pauseHelpText = new Text("Pulsa P para pausar la partida", {
      fontSize: 16,
      fill: 0xffffff,
      fontWeight: 'bold',
      stroke: 0x000000,
    });

    // Posicionar el texto en la esquina superior derecha
    pauseHelpText.anchor.set(1, 0); // Ancla en la esquina superior derecha
    pauseHelpText.position.set(
      app.screen.width - 30, // 10 píxeles desde el borde derecho
      30 // 10 píxeles desde el borde superior
    );

    // Mantener el texto en la posición correcta cuando se redimensione la ventana
    app.renderer.on('resize', () => {
      pauseHelpText.position.set(
        app.screen.width - 10,
        10
      );

      // Mantener el leaderboard en la esquina superior izquierda
        leaderboardContainer.position.set(10, 10);
    });

    // Añadir el texto directamente al stage (no al world)
    app.stage.addChild(pauseHelpText);

    const world = new Container();
    // Para crear las estrellas del fondo
    const starContainer = new Container();
    app.stage.addChild(world);
    // Con esto conseguimos que queden por debajo de la vista del resto de los objetos
    world.addChildAt(starContainer, 0);

    // Generar estrellas en el fondo
    generateStars(starContainer, 400, WORLD_SIZE); // Genera 400 estrellas


    // 3. Debug visual del área de juego
    const worldBounds = new Graphics()
      .rect(0, 0, WORLD_SIZE.width, WORLD_SIZE.height)
      .stroke({ width: 4, color: 0xff0000 }); // Rojo para mejor visibilidad
    world.addChild(worldBounds);

    const playerContainer = new Container();

    // Obtener nombre de usuario y skin desde cookies
    let username = getCookie("username") ?? "Guest";
    if (username === "") {
      username = "Guest"
    }
    const skin = getCookie("skin") ?? "Aspecto Básico.png";
    const playerIDcookie = getCookie("PlayerID");
    const leaderID = getCookie("LeaderID");
    const gameIdStr = getCookie("gameId");
    const gameId = gameIdStr ? parseInt(gameIdStr, 10) : undefined;
    if (playerIDcookie == null) {
      console.log("playerID not specified");
      return
    }
    const playerID = parseUuidToUint8Array(playerIDcookie);
    if (playerID == null) {
      console.log("error parsing playerID: ", playerIDcookie);
      return
    }
    // Validar que gameId sea un número válido si existe
    if (gameIdStr && isNaN(gameId!)) {
      console.log("Error: gameId no es un número válido:", gameIdStr);
      return;
    }


    // Determinar si es una partida privada y si el jugador es líder
    const isLeader = playerIDcookie === leaderID;

    console.log("Nombre leído desde cookie:", username);
    console.log("PlayerID leído desde cookie:", playerID);

    // Crear jugador con su nombre
    const player = new Player(
      WORLD_SIZE,
      playerID,
      WORLD_SIZE.width / 2,
      WORLD_SIZE.height / 2,
      30,
      0x44bb44,
      skin,
      username,
      isLeader
    );

    // Agregamos el contenedor al mundo
    world.addChild(playerContainer);

    // Agregar jugador al mundo
    world.addChild(player);

    // 5. Conexión mejorada
    const network = await connectToServer(world, player, gameId);

    // 6. Game loop con protección
    app.ticker.add(() => {
      try {
        const pointer = app.renderer.events.pointer;

        // Solo enviar movimiento si está conectado
        if (network.isConnected()) {
          if (player.moveTowards(app.screen, pointer.x, pointer.y)) {
            network.sendMovement(player.pos.x, player.pos.y);
          };
        }

        network.foods.forEach(f => {
          if (player.canEatFood(f)) {
            player.eatFood(f);
            network.sendEatFood({ X: Math.floor(f.pos.x), Y: Math.floor(f.pos.y) }, Math.floor(player.radius));
          }
        });

        network.players.forEach(p => {
          if (player.canEatPlayer(p)) {
            if (p.id !== undefined) {
              network.sendEatPlayer(p.id, player.radius)
              player.eatPlayer(p);
            }
            p.destroy()
          }
        })


        // Actualizar clasificación
        const allPlayers = [player, ...network.players].filter(p => !p.destroyed);
        const sortedPlayers = allPlayers
            .sort((a, b) => b.radius - a.radius)
            .slice(0, 5);

        // Actualizar los textos de la clasificación
        sortedPlayers.forEach((p, index) => {
            const score = Math.floor(p.radius * 100);
            const isCurrentPlayer = p === player;
            playerScores[index].text = `${index + 1}. ${p.username}: ${score}`;
            playerScores[index].style.fill = isCurrentPlayer ? 0x00ff00 : 0xffffff;
        });

        // Limpiar los textos restantes
        for (let i = sortedPlayers.length; i < 5; i++) {
            playerScores[i].text = "";
        }

        // Suavizado de cámara
        let zoom = 1;
        if (player.radius < 80) {
          zoom = Math.max(0.1, Math.min(1, 50 / Math.log(player.radius)));
        } else {
          zoom = Math.max(0.1, Math.min(1, 100 / (player.radius - 80)));
        }

        world.scale.set(
          lerp(world.scale.x, zoom, 0.05),
          lerp(world.scale.y, zoom, 0.05)
        );

        world.position.set(
          lerp(world.position.x, app.screen.width / 2 - player.pos.x * world.scale.x, 0.05),
          lerp(world.position.y, app.screen.height / 2 - player.pos.y * world.scale.y, 0.05)
        );

      } catch (error) {
        console.log("Error en game loop:", error);
      }
    });

    // Añadir event listener para la tecla P
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'p') {
        if (network.isConnected()) {
          network.sendPause();
          console.log("🎮 Enviando evento de pausa al servidor");
        }
      }
    });


    // 7. Manejo mejorado de cierre
    window.addEventListener('beforeunload', () => {
      if (network.isConnected()) {
        network.sendLeave();
        network.close();
      }
    });

  } catch (error) {
    console.error("Error fatal:", error);
    alert("Error al iniciar el juego. Ver consola para detalles.");
  }
})();

// Con esto conseguimos que tengan forma de estrella y no de círculo
// distinguiendo de esta manera las estrellas del fondo con la comida de los jugadores
function drawStar(graphics: Graphics, x: number, y: number, radius: number, points: number, innerRadius: number, color: number) {
  const step = Math.PI / points;
  graphics.beginFill(color);

  graphics.moveTo(x + radius, y);
  for (let i = 0; i < 2 * points; i++) {
    const angle = i * step;
    const r = i % 2 === 0 ? radius : innerRadius;
    graphics.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
  }
  graphics.closePath();
  graphics.endFill();
}

// Función que genera las estrellas de fondo
// Las generamos de manera aleatoria y las añadimos al contenedor de estrellas
function generateStars(container: Container, numStars: number, worldSize: { width: number; height: number }) {
  for (let i = 0; i < numStars; i++) {
    const star = new Graphics();
    const x = Math.random() * worldSize.width;
    const y = Math.random() * worldSize.height;
    const radius = Math.random() * 5 + 3; // Tamaño aleatorio entre 3 y 8
    const innerRadius = radius / 2; // Radio interno más pequeño
    const points = 5; // Número de puntas de la estrella
    const color = 0xffffff; // Color blanco para las estrellas

    drawStar(star, 0, 0, radius, points, innerRadius, color);

    star.position.set(x, y);
    container.addChild(star);
  }
}

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}
