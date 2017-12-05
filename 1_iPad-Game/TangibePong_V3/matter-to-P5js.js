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
	this.specialDisplay = function() {
		var pos = this.body.position;
		push();
		translate(pos.x, pos.y);
		ellipseMode(CENTER);
		fill(0, 255, 255);
		ellipse(0, 0, this.radius * 2, this.radius * 2);
		pop();
	}
}

function Puck(x, y, puckDiameter, team) {
	this.diameter = puckDiameter;
	this.team = team;
	var puckOptions = {
		isStatic: true
	}
	this.body = Bodies.circle(x, y, this.diameter/2, puckOptions);

	World.add(myWorld, this.body);

	this.display = function() {
		var pos = this.body.position;

		push();
		translate(pos.x, pos.y);
		ellipseMode(CENTER);
		
		if (this.team === "LEFT") {
			fill(0, 0, 255);
		} else if (this.team === "RIGHT") {
			fill(255, 0, 255);
		} else {
			fill(255, 255, 255);
		}

		ellipse(0, 0, this.diameter, this.diameter);
		pop();

	}
	this.safelySetPosition = function(newX, newY) {
		Body.setPosition(this.body, {
			x: newX,
			y: newY
		});

	}
}