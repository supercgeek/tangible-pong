//  MATTER SETUP
var Engine = Matter.Engine;
var World = Matter.World;
var Bodies = Matter.Bodies;
var Body = Matter.Body;
var Constraint = Matter.Constraint;
var MouseConstraint = Matter.MouseConstraint;
var Mouse = Matter.Mouse;

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
var ellipseSize = 335;
var balls = [];
//var testShift = false;

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
	World.add(myWorld, [gameFloor, gameCeiling, leftWall, rightWall]);

	//  RUN
	Engine.run(myEngine);

	leftPuck = new Puck(0 + ellipseSize + random(-25, 25), windowHeight / 2, ellipseSize, "LEFT");
	rightPuck = new Puck(windowWidth - ellipseSize + random(-25, 25), windowHeight / 2, ellipseSize, "RIGHT");

	// gravity 
	myEngine.world.gravity.y = 0;
	myEngine.world.gravity.x = 0;

	balls.push(new Ball(windowWidth / 2, windowHeight / 2, 15));

}

function draw() {
	background(0);
	rectMode(CENTER);
	fill(200, 200, 200, 200);
	rect(windowWidth / 2, windowHeight / 2, 15, windowHeight);
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
			fill(255, 100, 100, 100);
			rect(windowWidth / 2 + windowWidth / 4, windowHeight / 2, windowWidth / 2, windowHeight);
		}

		if (balls[0].body.position.x < windowWidth / 2) {
			fill(100, 255, 100, 100);
			rect(0 + windowWidth / 4, windowHeight / 2, windowWidth / 2, windowHeight);
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
}

function mousePressed() {
	ellipse(mouseX, mouseY, 100, 100);
	ellipse(mouseX, windowHeight/2, 50,50);
	if (mouseX < windowWidth / 2) {
		testShift = 1; //left
	} else {
		testShift = 2; //right
	}
}