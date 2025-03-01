import { Graphics } from "pixi.js";

export const FOOD_RADIUS = 20;

export enum FoodColor {
  Red = 0xff0000,
  Blue = 0x0000ff,
  Yellow = 0x00ff00,
}

const FOOD_COLORS = [FoodColor.Red, FoodColor.Blue, FoodColor.Yellow];

export class Food extends Graphics {
  constructor(x: number, y: number, color: FoodColor) {
    super()
    this.circle(x, y, FOOD_RADIUS);
    this.fill(color);
  }
}

export function generateRandomFood(amount: number, width: number, height: number): Food[] {
  let foodArray: Food[] = [];

  for (let i = 0; i < amount; i++) {
    let randomX = Math.floor(Math.random() * width);
    let randomY = Math.floor(Math.random() * height);
    let randomColor = Math.round(Math.random() * FOOD_COLORS.length-1);
    foodArray.push(new Food(randomX, randomY, FOOD_COLORS[randomColor]));
  }

  return foodArray;
}
