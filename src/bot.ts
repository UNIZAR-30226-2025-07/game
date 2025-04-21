import {
    Graphics,
    Rectangle,
  } from 'pixi.js';
import { Food, FOOD_RADIUS } from './food';
import { Player } from "./player";


/* Clase Bot:
 * Al igual que el jugador, tiene velocidad, radio, color
 * posición x e y y worldBounds
*/
export class Bot extends Graphics {
    private velocityMagnitude = 10;
    public radius: number;
    private color: number;
    public pos: {
      x: number,
      y: number,
    };
    private worldBounds: WorldBounds;

    // Constructor de Bot
    constructor(worldBounds: WorldBounds, x: number, y: number, radius: number, color: number){
        super();
        this.worldBounds = worldBounds;
        this.radius = radius;
        this.color = color;
        this.pos = {x, y};
        this.draw();
    }

    // Dibuja la bola del Bot, del mismo modo que en el jugador
    private draw() {
        this.clear();
        this.circle(this.pos.x, this.pos.y, this.radius);
        this.fill(this.color);
        this.stroke({
          width: 3,
          color: 0x0,
        })
    }

    // Al comerse un bot reajusta el radio
    public eatBot(botEaten: Bot) {
        this.radius = Math.sqrt(this.radius * this.radius + botEaten.radius * botEaten.radius);
        botEaten.destroy();
        this.draw();
    }

    // Al comerse un jugador reajusta el radio
    public eatPlayer(playerEaten: Player) {
        this.radius = Math.sqrt(this.radius * this.radius + playerEaten.radius * playerEaten.radius);
        playerEaten.destroy({context: false});
        this.draw();
    }
    
    // Al comerse "food" reajusta el radio
    public eatFood(foodEaten: Food) {
        // increase surface not radius
        this.radius = Math.sqrt(this.radius * this.radius + FOOD_RADIUS * FOOD_RADIUS) * 1.002;
        foodEaten.destroy();
        this.draw();
    }
    
    // Comprobar si se puede comer "food"
    public canEatFood(food: Food) {
        if (food.destroyed) return false;
    
        const botCenterX = this.pos.x;
        const botCenterY = this.pos.y;
        const foodCenterX = food.pos.x;
        const foodCenterY = food.pos.y;
    
        const dx = foodCenterX - botCenterX;
        const dy = foodCenterY - botCenterY;
    
        // Compare squared distances
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = this.radius * this.radius;
    
        return distanceSquared <= radiusSquared;
    }

    // Comprobar si se puede comer otro bot
    public canEatBot(otherBot: Bot): boolean {
        if (otherBot.destroyed) return false;
        
        const thisCenterX = this.pos.x;
        const thisCenterY = this.pos.y;
        const otherBotCenterX = otherBot.pos.x;
        const otherBotCenterY = otherBot.pos.y;
        
        const dx = otherBotCenterX - thisCenterX;
        const dy = otherBotCenterY - thisCenterY;
        
        // Comparar las distancias cuadradas
        const distanceSquared = dx * dx + dy * dy;
        const radiusSumSquared = (this.radius + otherBot.radius) * (this.radius + otherBot.radius);
        
        // El bot puede comer a otro bot si están lo suficientemente cerca y si su radio es mayor
        return distanceSquared <= radiusSumSquared && this.radius > otherBot.radius;
    }


    // Comprobar si se puede comer otro bot
    public canEatPlayer(player: Player): boolean {
        if (player.destroyed) return false;
        
        const thisCenterX = this.pos.x;
        const thisCenterY = this.pos.y;
        const playerCenterX = player.pos.x;
        const playerCenterY = player.pos.y;
        
        const dx = playerCenterX - thisCenterX;
        const dy = playerCenterY - thisCenterY;
        
        // Comparar las distancias cuadradas
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = this.radius * this.radius;
    
        // El bot puede comer al jugador si está dentro de su radio
        return distanceSquared <= radiusSquared && this.radius > player.radius;
    }

    findTarget(food: Food[], bots: Bot[], players: Player[]){
        const MAX_RANGE = 2000; // Solo busca comida en un radio de 1500
        var targets: {radius: number, x: number, y: number}[] = [];  // vector de posiciones con los objetivos dentro del rango (comida, bots, jugadores)

        // Buscar comida dentro del rango y añadirlo al vector de objetivos
        let foodTarget = food.filter(f => f && !f.destroyed && f.pos.x !== undefined && f.pos.y !== undefined && Math.hypot(this.pos.x - f.pos.x, this.pos.y -f.pos.y) < MAX_RANGE);
        targets.push(...foodTarget.map(f => ({radius: FOOD_RADIUS, x: f.pos.x, y: f.pos.y})));
        
        // Buscar bots más pequeños dentro del rango y añadirlo al vector de objetivos
        let botTarget = bots.filter(b => b && !b.destroyed && b.pos.x !== undefined && b.pos.y !== undefined && b.radius < this.radius && Math.hypot(this.pos.x - b.pos.x, this.pos.y - b.pos.y) < MAX_RANGE);
        targets.push(...botTarget.map(b => ({radius: b.radius, x: b.pos.x, y: b.pos.y})));

        // Buscar jugador más pequeño dentro del rango y añadirlo al vector de objetivos
        let playerTarget = players.filter(p => p && !p.destroyed && p.pos.x !== undefined && p.pos.y !== undefined && p.radius < this.radius && Math.hypot(this.pos.x - p.pos.x, this.pos.y - p.pos.y) < MAX_RANGE);
        targets.push(...playerTarget.map(p => ({radius: p.radius, x: p.pos.x, y: p.pos.y})));

        // Si no hay objetivos, no hace nada
        if (targets.length == 0){
            return null;
        }

        // Buscar el objetivo más cercano de todos 
        let finalTarget = targets[0];        // Objetivo final al por el que irá el bot
        for (let i=1; i<targets.length; i++){
            // Marca el objetivo de mayor tamaño como objetivo final
            if (targets[i].radius > finalTarget.radius){
                finalTarget = targets[i];
            }
        }

        return finalTarget;

    }


    private calculateMaxDistance(screen: Rectangle): number {
        return Math.sqrt(
          (screen.width / 2) * (screen.width / 2) +
          (screen.height / 2) * (screen.height / 2)
        );
    }


    // Movimiento del bot. Similar al del jugador
    public moveTowards(screen: Rectangle, x: number, y: number) {
        const dx = x - this.pos.x;
        const dy = y - this.pos.y;
        const delta = Math.sqrt(dx * dx + dy * dy);
    
        const maxDistance = this.calculateMaxDistance(screen); 
        const normalizedDistance = Math.min((delta / maxDistance) * 2, 1);  // Normaliza la distancia
        //const velocity = (normalizedDistance * this.velocityMagnitude) / Math.sqrt(this.radius / 20);  // Calcula la velocidad
        const effectiveRadius = Math.max(this.radius, 40);
        const boost = Math.min((effectiveRadius - 80) / 300, 0.4); // hasta +40% si radius ≥ 200
        const velocity = (normalizedDistance * this.velocityMagnitude) * (1 + boost) / Math.pow(effectiveRadius / 80, 0.3);

    
        // Si la distancia es suficiente, mueve el bot hacia el objetivo
        if (delta > 3) {
            this.pos.x += (dx / delta) * velocity;
            this.pos.y += (dy / delta) * velocity;
    
            // Verifica los límites del mundo para evitar que el bot se salga
            this.pos.x = Math.max(0, Math.min(this.pos.x, this.worldBounds.width));
            this.pos.y = Math.max(0, Math.min(this.pos.y, this.worldBounds.height));
    
            console.log(this.pos.x, this.pos.y);
    
            // Dibuja nuevamente el bot en su nueva posición
            this.draw();
        }
    }
    

}