function Circle(x, y, w, h) {
	this.radius = w / 2; // h is ignored for now
	this.body = Bodies.circle(x, y, this.radius);
	World.add(myWorld, this.body);

	this.display = function() {
		var pos = this.body.position;


		push();
		translate(pos.x, pos.y);
		ellipseMode(CENTER);
		fill(0, 0, 255);
		ellipse(0, 0, this.radius * 2, this.radius * 2);
		pop();

	}



}