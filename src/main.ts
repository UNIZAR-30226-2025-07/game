import { Application, Container, Graphics } from "pixi.js";
import { Player } from "./player";
import { NetworkManager } from "../websockets/NetworkManager";
import './style.css';

const WORLD_SIZE = { width: 10000, height: 10000 };


// Función para obtener cookies
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 1. Función de conexión mejorada
async function connectToServer(app: Application, world: Container, player: Player) {
  const wsUrl = window.location.hostname === 'localhost'
    ? 'ws://localhost:8080/ws'
    : `wss://${window.location.host}/ws`;

  console.log("🔗 Conectando a:", wsUrl);

  try {
    const network = new NetworkManager(app, world, player, wsUrl);

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
    const username = getCookie("username") || "Desconocido";
    const skin = getCookie("skin") || "";
    console.log("Nombre leído desde cookie:", username);

    // Crear jugador con su nombre
    const player = new Player(
      WORLD_SIZE,
      new Uint8Array([1, 2, 3]),
      WORLD_SIZE.width / 2,
      WORLD_SIZE.height / 2,
      30,
      0x44bb44,
      skin,
      username
    );

    // Agregamos el contenedor al mundo
    world.addChild(playerContainer);

    // 5. Conexión mejorada
    const network = await connectToServer(app, world, player);

    // 6. Game loop con protección
    app.ticker.add(() => {
      try {
        const pointer = app.renderer.events.pointer;

        // Solo enviar movimiento si está conectado
        if (network.isConnected()) {
          player.moveTowards(app.screen, pointer.x, pointer.y);
          network.sendMovement(player.pos.x, player.pos.y);
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
        console.error("Error en game loop:", error);
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
