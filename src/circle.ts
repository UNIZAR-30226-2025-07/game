import P5 from "p5";

export default class Circle {
	p5: P5;
	position: P5.Vector;
	radius: number;
	color: string;

	constructor(p5: P5, position: P5.Vector, radius: number, color: string) {
		this.p5 = p5;
		this.position = position;
		this.radius = radius;
		this.color = color;
	}

	draw() {
		const p5 = this.p5; // just for convenience

		p5.push();

		p5.translate(this.position);
		p5.noStroke();
		p5.fill(this.color);
		p5.ellipse(0, 0, this.radius);

		p5.pop();
	}
}
