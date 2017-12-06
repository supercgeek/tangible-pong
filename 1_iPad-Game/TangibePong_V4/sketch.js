//  MATTER SETUP
var Engine = Matter.Engine;
var World = Matter.World;
var Bodies = Matter.Bodies;
var Body = Matter.Body;
var Constraint = Matter.Constraint;
var MouseConstraint = Matter.MouseConstraint;
var Mouse = Matter.Mouse;
var Events = Matter.Events;

//  MATTER
var myEngine;
var myWorld;

//  WALLS
var gameFloor;
var gameCeiling;

// GRIIPS/PUCKS
var leftPuck;
var rightPuck;

//  GLOBAL VARIABLES
var ellipseSize = 300;
var balls = [];
//var testShift = false;
var leftPlayerScore = 0;
var rightPlayerScore = 0;
var puckSize = 45;
// function getTestShift() {
// 	return testShift;
// }

function setup() {

	var canvas = createCanvas(windowWidth, windowHeight);

	document.ontouchmove = function(event) {
		event.preventDefault();
	}

	myEngine = Engine.create();
	myWorld = myEngine.world;

	//  WALLS
	var wallOptions = {
		isStatic: true
	}
	var wallWidth = 40;

	gameFloor = Bodies.rectangle(windowWidth / 2, windowHeight + wallWidth / 2, windowWidth, wallWidth, wallOptions);
	gameCeiling = Bodies.rectangle(windowWidth / 2, 0 - wallWidth / 2, windowWidth, wallWidth, wallOptions);
	leftWall = Bodies.rectangle(0 - wallWidth / 2, windowHeight / 2, wallWidth, windowWidth, wallOptions);
	rightWall = Bodies.rectangle(windowWidth + wallWidth / 2, windowHeight / 2, wallWidth, windowWidth, wallOptions);
	World.add(myWorld, [gameFloor, gameCeiling]);

	//  RUN
	Engine.run(myEngine);

	leftPuck = new Puck(0 + ellipseSize + random(-25, 25), windowHeight / 2, ellipseSize, "LEFT");
	rightPuck = new Puck(windowWidth - ellipseSize + random(-25, 25), windowHeight / 2, ellipseSize, "RIGHT");

	// gravity 
	myEngine.world.gravity.y = 0;
	myEngine.world.gravity.x = 0;

	balls.push(new Ball(windowWidth / 2, windowHeight / 2, puckSize));

}

function draw() {
	background(0);
	
	offEdge();
	// rightPuck.display();
	// leftPuck.display();


	for (var r = 0; r < balls.length; r++) {
		balls[r].display();
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
		leftPuck.safelySetPosition(2000, 2000);
		var midPoint_Right = getMidpoint(preX, preY, curX, curY, "RIGHT");
		rightPuck.safelySetPosition(-2000, -2000);

		if (balls[0].body.position.x > windowWidth / 2) {
			fill(100, 100, 255, 25);
			rect(windowWidth / 2 + windowWidth / 4, windowHeight / 2, 0 + windowWidth / 2, windowHeight);
		}

		if (balls[0].body.position.x < windowWidth / 2) {
			fill(100, 255, 100, 25);
			rect(0 + windowWidth / 4, windowHeight / 2, 0 + windowWidth / 2, windowHeight);
		}

		if (midPoint_Left !== false && balls[0].body.position.x < windowWidth / 2) {
			leftPuck.safelySetPosition(midPoint_Left.x, midPoint_Left.y);
			leftPuck.display();
		}

		if (midPoint_Right !== false && balls[0].body.position.x > windowWidth / 2) {
			rightPuck.safelySetPosition(midPoint_Right.x, midPoint_Right.y);
			rightPuck.display();
		}
	}
	checkCollisions();
	rectMode(CENTER);
	fill(255, 255, 240, 200);
	rect(windowWidth / 2, windowHeight / 2, 15, windowHeight);
	
}

function offEdge() {
	textSize(25);
	text(leftPlayerScore, 25, 45);
	text(rightPlayerScore, windowWidth - 45, 45);
	if (balls[0].body.position.x < 0) {
		rightPlayerScore++;
		balls.pop();
		balls.push(new Ball(windowWidth / 2, windowHeight / 2, puckSize));

	}
	if (balls[0].body.position.x > windowWidth) {
		leftPlayerScore++
		balls.pop();
		balls.push(new Ball(windowWidth / 2, windowHeight / 2, puckSize));
	}
}

function checkCollisions() {
	if (balls[0].body.position.x < windowWidth / 2) {

		// A
		var xA = balls[0].body.position.x;
		var yA = balls[0].body.position.y;
		var rA = balls[0].radius;

		//B
		var xB = leftPuck.body.position.x;
		var yB = leftPuck.body.position.y;
		var rB = leftPuck.diameter / 2;

		var d = dist(xA, yA, xB, yB);
		//var deltaForce = createVector(xA - xB, yA - yB);
		if (d < rA + rB) {
			// Body.applyForce(balls[0], {
			// 	x: 0,
			// 	y: 0
			// }, deltaForce);
			testShift = 1; //left
		}

	} else {

		// A
		var xA = balls[0].body.position.x;
		var yA = balls[0].body.position.y;
		var rA = balls[0].radius;

		//B
		var xB = rightPuck.body.position.x;
		var yB = rightPuck.body.position.y;
		var rB = rightPuck.diameter / 2;

		var d = dist(xA, yA, xB, yB);
		if (d < rA + rB) {
			testShift = 2; //right
		}
	}
}



// function mousePressed() {
// 	ellipse(mouseX, mouseY, 100, 100);
// 	ellipse(mouseX, windowHeight / 2, 50, 50);
// 	if (balls[0].body.position.x < windowWidth / 2) {

// 		leftPuck.body.position.x
// 		leftPuck.body.position.y
// 		leftPuck.diameter

// 		testShift = 1; //left
// 	} else {
// 		testShift = 2; //right
// 	}
// }