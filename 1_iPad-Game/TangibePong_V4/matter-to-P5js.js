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

function Ball(x, y, r) {
	var ballOptions = {
		// frictionAir: 0,
		// density: 1
		restitution: 1
	}
	this.radius = r;
	this.randomDirection = createVector(random(0.5, 1), random(0.5, 1));
	this.body = Bodies.circle(x, y, this.radius, ballOptions);

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
	this.update = function() {
		//this.randomDirection
	}
}

function Puck(x, y, puckDiameter, team) {
	this.diameter = puckDiameter;
	this.team = team;
	this.relativeAngle;

	var puckOptions = {
		isStatic: true,
		restitution: 1
	}
	this.body = Bodies.circle(x, y, this.diameter / 2, puckOptions);

	World.add(myWorld, this.body);

	this.display = function() {
		var pos = this.body.position;

		push();
		translate(pos.x, pos.y);
		ellipseMode(CENTER);

		if (this.team === "LEFT") {
			fill(0, 0, 255);
		} else if (this.team === "RIGHT") {
			fill(255, 0, 0);
		} else {
			fill(255, 255, 255);
		}

		ellipse(0, 0, this.diameter, this.diameter);
		pop();

		// //indic
		// push();
		// print(radians(this.relativeAngle));
		// rotate(this.relativeAngle);
		// translate(pos.x + ellipseSize * 1.2, pos.y + ellipseSize * 1.2);
		// ellipseMode(CENTER);
		// ellipse(0, 0, 50, 50);
		// pop();
	}
	this.safelySetPosition = function(newX, newY) {
		Body.setPosition(this.body, {
			x: newX,
			y: newY
		});
	}
	this.setRelativeAngle = function(X1, Y1, X2, Y2) {
		print(degrees(atan(Y2 - Y1 / X2 - X1)));
		this.relativeAngle = atan(Y2 - Y1 / X2 - X1);
	}

	this.getRelativeAngle = function() {
		return this.relativeAngle;
	}
}