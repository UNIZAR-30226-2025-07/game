import { Application, Container, Graphics, Text, TextStyle} from "pixi.js";
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
            if (!network.isConnected) {
                console.warn("⏳ Esperando conexión...");
            } else {
                clearInterval(checkConnection);
                console.log("🟢 Conexión establecida");
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
            backgroundColor: 0xffffff
        });

        await app.init({ background: '#ffffff', resizeTo: window });
        document.body.appendChild(app.canvas);

        const world = new Container();
        app.stage.addChild(world);

        // 3. Debug visual del área de juego
        const worldBounds = new Graphics()
            .rect(0, 0, WORLD_SIZE.width, WORLD_SIZE.height)
            .stroke({ width: 4, color: 0xff0000 }); // Rojo para mejor visibilidad
        world.addChild(worldBounds);

        // Creamos el contenedor del jugador
        const playerContainer = new Container();

        const player = new Player(
            WORLD_SIZE,
            new Uint8Array([1, 2, 3]),
            WORLD_SIZE.width/2, 
            WORLD_SIZE.height/2,
            30,
            0x44bb44
        );
        playerContainer.addChild(player);
        //world.addChild(player);

         // 4. Mostrar nombre de usuario encima del jugador
         const username = getCookie("username") || "Desconocido";
         console.log("Nombre leído desde cookie:", username);

         const nameText = new Text(username, new TextStyle({
             fontSize: 16,
             fill: 0x000000,
             fontWeight: 'bold',
             stroke: 0xffffff,
             align: 'center',
         }));
 
         nameText.anchor.set(0.5);
         nameText.position.set(player.pos.x + 2, player.pos.y + player.radius + 15);
         nameText.style.fontSize = Math.max(16, Math.min(player.radius / 3, 50));
         playerContainer.addChild(nameText);
         

         // Skin desde cookie
         const skin = getCookie("skin");
        if (skin) {
            console.log("Cargando skin desde cookie:", skin);
            await player.updateSkin(skin);
        }

        // Agregamos el contenedor al mundo
        world.addChild(playerContainer);

        // 5. Conexión mejorada
        const network = await connectToServer(app, world, player);

        // 6. Game loop con protección
        app.ticker.add(() => {
            try {
                const pointer = app.renderer.events.pointer;
                
                // Solo enviar movimiento si está conectado
                if (network.isConnected) {
                    network.sendMovement(pointer.x, pointer.y);
                }

                // Actualizar posición de la skin

                // Suavizado de cámara
                const zoom = Math.max(0.1, Math.min(1, 30 / player.radius));
                world.scale.set(
                    lerp(world.scale.x, zoom, 0.05),
                    lerp(world.scale.y, zoom, 0.05)
                );

                world.position.set(
                    lerp(world.position.x, app.screen.width/2 - player.pos.x * world.scale.x, 0.05),
                    lerp(world.position.y, app.screen.height/2 - player.pos.y * world.scale.y, 0.05)
                );

                // Actualizar posición del nombre según el tamaño del jugador
                nameText.position.set(player.pos.x + 2, player.pos.y + player.radius + 15);
            } catch (error) {
                console.error("Error en game loop:", error);
            }
        });

        // 7. Manejo mejorado de cierre
        window.addEventListener('beforeunload', () => {
            if (network.isConnected) {
                network.close();
            }
        });

    } catch (error) {
        console.error("Error fatal:", error);
        alert("Error al iniciar el juego. Ver consola para detalles.");
    }
})();

function lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}