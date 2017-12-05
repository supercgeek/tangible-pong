// module aliases
var Engine = Matter.Engine;
var World = Matter.World;
var Bodies = Matter.Bodies;

//mater
var myEngine;
var myWorld;
var myBox;
var myFloor;
var ellipseSize = 250;
var circs = [];

function setup() {
	createCanvas(windowWidth, windowHeight);
	document.ontouchmove = function(event) {
		event.preventDefault();
	}
	myEngine = Engine.create();
	myWorld = myEngine.world;
	myBox = Bodies.circle(100, 400, 20);

	var wallOptions = {
		isStatic: true
	}
	myFloor = Bodies.rectangle(windowWidth / 2, windowHeight - 40, windowWidth, 40, wallOptions);
	Engine.run(myEngine);
	World.add(myWorld, myBox);
	World.add(myWorld, myFloor);

	print(myBox);
}

function draw() {
	background(0);

	print(circs.length);

	for (var r = 0; r < circs.length; r++) {
		circs[r].display();
	}

	for (var i = 0; i < touches.length; i++) {
		var preX;
		var preY;
		var curX = touches[i].x;
		var curY = touches[i].y;

		if (i > 0) {
			preX = touches[i - 1].x;
			preY = touches[i - 1].y;
		}

		var midPoint_Left = getMidpoint(preX, preY, curX, curY, "LEFT");
		if (midPoint_Left !== false) {
			fill(255, 0, 255);
			ellipse(midPoint_Left.x, midPoint_Left.y, ellipseSize, ellipseSize);

		}

		var midPoint_Right = getMidpoint(preX, preY, curX, curY, "RIGHT");
		if (midPoint_Right !== false) {
			fill(0, 0, 255);
			ellipse(midPoint_Right.x, midPoint_Right.y, ellipseSize, ellipseSize);
			ellipse(circs.push(new Circle(midPoint_Right.x, midPoint_Right.y, ellipseSize/10, ellipseSize/5)));
		}
	}

}

function mousePressed() {
	circs.push(new Circle(mouseX, mouseY, 40, 40));

}

function paddleClass() {}

// function ballClass() {
// 	this.x = windowWidth / 2;
// 	this.y = windowHeight / 2;
// 	this.speed = random(1.0, 1.5);

// 	this.update = function() {
// 		this.
// 	}
// 	this.display = function() {}

// }}



// Jitter class
function Jitter() {
	this.x = random(width);
	this.y = random(height);
	this.diameter = random(10, 30);
	this.speed = 1;

	// this.move = function() {
	//   this.x += random(-this.speed, this.speed);
	//   this.y += random(-this.speed, this.speed);
	// };

	// this.display = function() {
	//   ellipse(this.x, this.y, this.diameter, this.diameter);
	// }
}

function getMidpoint(pX, pY, cX, cY, boardSide) {
	if (checkDistance(pX, pY, cX, cY, 255, 305) !== false && checkTeam(pX, pY, cX, cY) === boardSide) {
		var tempDeltaVector = checkDistance(pX, pY, cX, cY, 255, 305);
		var midPointX = pX + (tempDeltaVector.x / 2);
		var midPointY = pY + (tempDeltaVector.y / 2);
		return createVector(midPointX, midPointY);
	}
	return false;
}

function checkTeam(X1, Y1, X2, Y2) {
	if (X1 < windowWidth / 2) {
		if (X2 < windowWidth / 2) {
			//X1
			return "LEFT";
		} else {
			//X2 is crossing the center onto the right (opposite) side
			return false;
		}
	} else {
		if (X2 > windowWidth / 2) {
			//X2
			return "RIGHT";
		} else {
			//X1 is crossing the center onto the left (opposite) side
			return false;
		}
	}
	return false;
}

function checkDistance(X1, Y1, X2, Y2, lowerBound, upperBound) {
	var distance = dist(X1, Y1, X2, Y2);
	if (distance > lowerBound && distance < upperBound) {
		var deltaVector = createVector(X2 - X1, Y2 - Y1);
		return deltaVector;
	}
	return false;
}