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

//  PUCK
//var puckConstraint;

//  GLOBAL VARIABLES
var ellipseSize = 335;
var circs = [];
//var pucks = [];

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

	// PUCK
	// var puck = Mouse.create(canvas.elt);
	// puck.pixelRatio = pixelDensity();
	// //print(puck);
	// var puckOptions = {
	// 	mouse: puck

	// }
	// puckConstraint = MouseConstraint.create(myEngine, puckOptions);
	// World.add(myWorld, puckConstraint);

	// var puckOptions =

	// pucks.push(

	leftPuck = new Puck(0 + ellipseSize, windowHeight / 2, ellipseSize, "LEFT");
	rightPuck = new Puck(windowWidth - ellipseSize, windowHeight / 2, ellipseSize, "RIGHT");

	//circs.push(new Circle(mouseX, mouseY, 300, 300));
}

function draw() {
	background(0);
	// rightPuck.display();
	// leftPuck.display();
	// print(circs.length);

	for (var r = 0; r < circs.length; r++) {
		circs[r].display();
	}

	// for (var n = 0; n < pucks.length; n++) {
	// 	pucks[n].display();
	// 	textSize(12);
	// 	fill(255, 255, 255);
	// 	text(pucks[n].body.position.x + " / " + pucks[n].body.position.y, pucks[n].body.position.x, pucks[n].body.position.y);

	// }



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
			leftPuck.safelySetPosition(midPoint_Left.x, midPoint_Left.y);
			leftPuck.display();
			fill(255, 255, 255);
			ellipse(midPoint_Left.x, midPoint_Left.y, ellipseSize / 5, ellipseSize / 5);
		}

		var midPoint_Right = getMidpoint(preX, preY, curX, curY, "RIGHT");
		if (midPoint_Right !== false) {
			rightPuck.safelySetPosition(midPoint_Right.x, midPoint_Right.y);
			rightPuck.display();
			fill(255, 255, 255);
			ellipse(midPoint_Right.x, midPoint_Right.y, ellipseSize / 5, ellipseSize / 5);
		}
	}
}

function mousePressed() {
	circs.push(new Circle(mouseX, mouseY, 25, 25));
}
// 	//print(circs);
// 	print(pucks[0]);
// 	//pucks[0].body.force.x = pucks[0].body.force.x + mouseX;
// 	// pucks[0].body.position.x = mouseX;
// 	// pucks[0].body.position.y = mouseY;

// 	//pucks[0].Body.setVelocity(bodyA, { x: 0, y: py - bodyA.position.y });
// 	//pucks[0].Body.setPosition(bodyA, { x: mouseX, y: mouseY });

// 	Body.setPosition(pucks[0].body, {
// 		x: mouseX,
// 		y: mouseY
// 	});

// }